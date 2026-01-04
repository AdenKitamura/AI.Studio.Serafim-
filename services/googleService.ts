
// Serafim Google Services - Server-Side Refresh Token Strategy
// No user interaction required. Auth is fully automated.

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_GOOGLE_API_KEY) return process.env.REACT_APP_GOOGLE_API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  return '';
};

const API_KEY = getApiKey();

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
];

// Helper to wait for GAPI script
const waitForGapi = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).gapi && (window as any).gapi.client) return resolve();
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if ((window as any).gapi && (window as any).gapi.client) {
        clearInterval(interval);
        resolve();
      }
      if (count > 200) { 
        clearInterval(interval);
        console.warn("GAPI script load timed out");
        resolve(); 
      }
    }, 50);
  });
};

// --- CORE AUTH LOGIC ---

export const initAndAuth = async (): Promise<GoogleUserProfile | null> => {
    console.log('[GoogleService] Starting Server-Side Auth Flow...');
    
    try {
        // 1. Initialize GAPI client structure (loads scripts)
        await waitForGapi();
        
        await new Promise<void>((resolve, reject) => {
            (window as any).gapi.load('client', async () => {
                try {
                    await (window as any).gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });

        // 2. Fetch Access Token from our Serverless Function
        // This keeps the Refresh Token secure on the server
        const response = await fetch('/api/auth');
        
        if (!response.ok) {
            console.warn('[GoogleService] Server auth endpoint failed. Offline mode.');
            return null;
        }

        const data = await response.json();
        
        if (data.access_token) {
            // 3. Inject the token directly into GAPI
            (window as any).gapi.client.setToken({ 
                access_token: data.access_token,
                expires_in: data.expires_in
            });
            console.log('[GoogleService] Auth Successful. Token injected.');
            
            // 4. Get User Profile to confirm identity
            return await getUserProfile();
        } else {
            console.error('[GoogleService] No access token returned from server.');
            return null;
        }

    } catch (e) {
        console.error('[GoogleService] Auth Flow Error:', e);
        return null;
    }
};

// No longer needed, but kept for compatibility
export const signIn = () => {
    alert("Авторизация происходит автоматически через сервер.");
    window.location.reload();
};

export const signOut = () => {
    if ((window as any).gapi?.client) {
        (window as any).gapi.client.setToken(null);
    }
    window.location.reload();
};

export const checkSignInStatus = (): boolean => {
    return !!(window as any).gapi?.client?.getToken();
};

export interface GoogleUserProfile {
  name: string;
  email: string;
  picture: string;
}

export const getUserProfile = async (): Promise<GoogleUserProfile | null> => {
    if (!checkSignInStatus()) return null;

    try {
        const accessToken = (window as any).gapi.client.getToken().access_token;
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if(response.ok) {
            const data = await response.json();
            return data;
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch profile", e);
        return null;
    }
}

const BACKUP_FILENAME = 'serafim_backup.json';

export const syncToDrive = async (data: any) => {
  if (!checkSignInStatus()) {
      // Try to re-auth silently if token is missing
      await initAndAuth();
      if (!checkSignInStatus()) return false;
  }

  try {
    const fileContent = JSON.stringify(data);
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
      parents: ['appDataFolder']
    };

    const response = await (window as any).gapi.client.drive.files.list({
      q: `name='${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed=false`,
      fields: 'files(id)',
      spaces: 'appDataFolder'
    });

    const existingFile = response.result.files[0];
    const accessToken = (window as any).gapi.client.getToken().access_token;

    if (existingFile) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`, {
        method: 'PATCH',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: constructMultipartBody(null, file)
      });
    } else {
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: constructMultipartBody(metadata, file)
      });
    }
    console.log('Sync successful');
    return true;
  } catch (e) {
    console.error('Drive Sync Error', e);
    throw e;
  }
};

export const restoreFromDrive = async (): Promise<any | null> => {
  if (!checkSignInStatus()) await initAndAuth();
  if (!checkSignInStatus()) return null;

  try {
    const response = await (window as any).gapi.client.drive.files.list({
      q: `name='${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed=false`,
      fields: 'files(id)',
      spaces: 'appDataFolder'
    });

    const fileId = response.result.files[0]?.id;
    if (!fileId) return null;

    const result = await (window as any).gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });

    return result.result; 
  } catch (e) {
    console.error('Drive Restore Error', e);
    return null;
  }
};

function constructMultipartBody(metadata: any, file: Blob) {
  const formData = new FormData();
  if (metadata) {
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  }
  formData.append('file', file);
  return formData;
}

export const createGoogleTask = async (title: string, notes: string = '', dueDate?: string) => {
  if (!checkSignInStatus()) return;

  try {
    const taskResource: any = { title, notes };
    if (dueDate) {
        taskResource.due = dueDate;
    }

    await (window as any).gapi.client.tasks.tasks.insert({
      tasklist: '@default',
      resource: taskResource
    });
  } catch (e) {
    console.error('Google Tasks API Error', e);
  }
};

export const createCalendarEvent = async (title: string, startTime: string, endTime: string, description: string = '') => {
  if (!checkSignInStatus()) return;

  try {
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    await (window as any).gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });
  } catch (e) {
    console.error('Calendar API Error', e);
  }
};
