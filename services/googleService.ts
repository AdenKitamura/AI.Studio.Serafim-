
// Serafim Google Services
// Handles Auth, Drive Sync, Tasks, and Calendar interactions

// Accessing environment variables. 
// Ensure REACT_APP_GOOGLE_CLIENT_ID and REACT_APP_GOOGLE_API_KEY are set in your Vercel/Environment config.
const CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
const API_KEY = (process.env.REACT_APP_GOOGLE_API_KEY || '').trim();

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
];
// Added openid email profile to scopes
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.events openid email profile';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Helper to wait for GAPI script
const waitForGapi = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).gapi && (window as any).gapi.client) return resolve();
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if ((window as any).gapi && (window as any).gapi.client) {
        clearInterval(interval);
        resolve();
      }
      if (count > 50) { // 5 seconds timeout
        clearInterval(interval);
        // Don't reject, just resolve to allow race condition check later to fail gracefully
        console.warn("GAPI script load timed out");
        resolve(); 
      }
    }, 100);
  });
};

// Helper to wait for Google Identity Services script
const waitForGIS = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).google && (window as any).google.accounts) return resolve();
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if ((window as any).google && (window as any).google.accounts) {
        clearInterval(interval);
        resolve();
      }
      if (count > 50) {
          clearInterval(interval);
          console.warn("GIS script load timed out");
          resolve();
      }
    }, 100);
  });
};

// Initialize GAPI (for API calls)
export const initGapiClient = async () => {
  if (typeof window === 'undefined') return;
  
  if (!API_KEY) {
      console.error("GAPI Init Error: API_KEY is missing from environment variables.");
      return;
  }

  await waitForGapi();

  return new Promise<void>((resolve, reject) => {
    if (!(window as any).gapi) {
        console.error("GAPI script not loaded");
        return reject("GAPI script not loaded");
    }
    (window as any).gapi.load('client', async () => {
      try {
        await (window as any).gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        console.log('GAPI initialized');
        resolve();
      } catch (err) {
        console.error('GAPI init error', JSON.stringify(err));
        reject(err);
      }
    });
  });
};

// Initialize GIS (for Auth)
export const initGisClient = async (onTokenReceived?: (tokenResponse: any) => void) => {
  if (typeof window === 'undefined') return;
  if (tokenClient) return; // Idempotent

  if (!CLIENT_ID) {
      console.error("GIS Init Error: CLIENT_ID is missing from environment variables.");
      return;
  }

  await waitForGIS();

  try {
      if (!(window as any).google) {
          throw new Error("Google GIS script not loaded");
      }
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error !== undefined) {
            console.error('GIS Auth Error:', resp);
            alert(`Ошибка авторизации Google: ${JSON.stringify(resp.error)}`);
            throw (resp);
          }
          console.log('GIS Token Received');
          
          // Ensure GAPI is ready before setting token
          // If GAPI failed to init, we just log it, but Auth succeeded so we can at least know who the user is.
          if ((window as any).gapi && (window as any).gapi.client) {
              (window as any).gapi.client.setToken(resp);
              console.log('GAPI Token Set Successfully');
          } else {
              console.warn('GAPI client not found. Token valid but API calls may fail.');
          }

          localStorage.setItem('sb_google_token_exists', 'true');
          
          if (onTokenReceived) onTokenReceived(resp);
        },
      });
      gisInited = true;
      console.log('GIS initialized');
  } catch (e) {
      console.error("Error initializing GIS client", e);
  }
};

export const signIn = () => {
  // Check configurations first
  if (!CLIENT_ID) {
      alert("Ошибка конфигурации: Не найден Google Client ID. Убедитесь, что переменная REACT_APP_GOOGLE_CLIENT_ID добавлена в Vercel и сделан Redeploy.");
      return;
  }
  
  // Debug info for user
  console.log("Attempting Sign In. CLIENT_ID present:", !!CLIENT_ID);
  console.log("TokenClient present:", !!tokenClient);

  if (tokenClient) {
    // Force prompt to ensure user selects account and consents permissions
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Try to init immediately if missed
    initGisClient().then(() => {
        if(tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            alert('Сервисы Google не удалось инициализировать. Проверьте консоль и блокировщики рекламы.');
        }
    }).catch(e => {
        alert('Ошибка инициализации Google Services: ' + e);
    });
  }
};

export const signOut = () => {
  if (!(window as any).gapi?.client) return;
  const token = (window as any).gapi.client.getToken();
  if (token !== null) {
    (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
      (window as any).gapi.client.setToken('');
      localStorage.removeItem('sb_google_token_exists');
      window.location.reload(); // Simple refresh to clear state
    });
  }
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
    // Wait slightly to ensure token is set in GAPI client
    await new Promise(r => setTimeout(r, 500));
    
    if (!checkSignInStatus()) {
        console.log('User profile fetch skipped: Not signed in');
        return null;
    }
    try {
        // Use the access token to fetch userinfo
        const accessToken = (window as any).gapi.client.getToken().access_token;
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if(response.ok) {
            const data = await response.json();
            console.log('User profile fetched:', data);
            return data;
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch profile", e);
        return null;
    }
}

// --- DRIVE SYNC (AppDataFolder) ---

const BACKUP_FILENAME = 'serafim_backup.json';

// Upload (Create or Update)
export const syncToDrive = async (data: any) => {
  if (!checkSignInStatus()) {
      console.warn("Skipping sync: Not signed in");
      return false;
  }

  try {
    const fileContent = JSON.stringify(data);
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
      parents: ['appDataFolder']
    };

    // 1. Check if file exists
    const response = await (window as any).gapi.client.drive.files.list({
      q: `name='${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed=false`,
      fields: 'files(id)',
      spaces: 'appDataFolder'
    });

    const existingFile = response.result.files[0];

    const accessToken = (window as any).gapi.client.getToken().access_token;

    if (existingFile) {
      // Update
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`, {
        method: 'PATCH',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: constructMultipartBody(null, file) // Metadata null for update unless renaming
      });
    } else {
      // Create
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

// Restore
export const restoreFromDrive = async (): Promise<any | null> => {
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

    return result.result; // GAPI returns parsed JSON for alt=media usually
  } catch (e) {
    console.error('Drive Restore Error', e);
    return null;
  }
};

// Helper for Multipart upload
function constructMultipartBody(metadata: any, file: Blob) {
  const formData = new FormData();
  if (metadata) {
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  }
  formData.append('file', file);
  return formData;
}


// --- GOOGLE TASKS ---

export const createGoogleTask = async (title: string, notes: string = '', dueDate?: string) => {
  if (!checkSignInStatus()) return;

  try {
    const taskResource: any = { title, notes };
    if (dueDate) {
        // Google Tasks 'due' is strict RFC3339.
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

// --- GOOGLE CALENDAR ---

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
