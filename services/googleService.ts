import { logger } from './logger';

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
        logger.log('Google', 'GAPI script load timed out', 'warning');
        resolve(); 
      }
    }, 50);
  });
};

// --- CORE AUTH LOGIC ---

export const initAndAuth = async (): Promise<GoogleUserProfile | null> => {
    logger.log('Google', 'Starting Auth Flow...');
    
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
        logger.log('Google', 'Fetching token from /api/auth');
        const response = await fetch('/api/auth');
        const data = await response.json();

        // 3. Check for Logic Errors (handled 200 OK with error payload)
        if (data.error) {
            logger.log('Google', `OAuth Error: ${data.error}`, 'error', data);
            throw new Error(`Google Error: ${data.error} - ${data.error_description || ''}`);
        }
        
        if (data.access_token) {
            // 4. Inject the token directly into GAPI
            (window as any).gapi.client.setToken({ 
                access_token: data.access_token,
                expires_in: data.expires_in
            });
            logger.log('Google', 'Token injected successfully', 'success');
            
            // 5. Get User Profile to confirm identity
            const profile = await getUserProfile();
            if (profile) return profile;
            
            // Fallback profile if scopes prevent userinfo fetching but token is valid
            return {
                name: 'System User',
                email: 'connected@server',
                picture: ''
            };
        } else {
            logger.log('Google', 'No access_token returned', 'error');
            throw new Error('No access_token returned');
        }

    } catch (e: any) {
        logger.log('Google', 'Auth Critical Error', 'error', e.message);
        throw e; // Propagate error to UI
    }
};

// Debug function for UI
export const testConnection = async (): Promise<any> => {
    try {
        const response = await fetch('/api/auth');
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return { error: 'Invalid JSON from server', raw: text };
        }
    } catch (e) {
        return { error: 'Network Fetch Failed', details: String(e) };
    }
};

export const signOut = () => {
    if ((window as any).gapi?.client) {
        (window as any).gapi.client.setToken(null);
    }
    logger.log('Google', 'User signed out', 'info');
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
      try {
        await initAndAuth();
      } catch (e) {
        return false;
      }
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
    logger.log('Sync', 'Backup synced to Drive', 'success');
    return true;
  } catch (e: any) {
    logger.log('Sync', 'Drive Sync Error', 'error', e.message);
    throw e;
  }
};

export const restoreFromDrive = async (): Promise<any | null> => {
  if (!checkSignInStatus()) {
      try { await initAndAuth(); } catch(e) { return null; }
  }
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

    logger.log('Sync', 'Data restored from Drive', 'success');
    return result.result; 
  } catch (e: any) {
    logger.log('Sync', 'Drive Restore Error', 'error', e.message);
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
    logger.log('Task', 'Synced to Google Tasks', 'success');
  } catch (e: any) {
    logger.log('Task', 'Google Task Sync Failed', 'error', e.message);
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
    logger.log('Calendar', 'Event synced to Google Calendar', 'success');
  } catch (e: any) {
    logger.log('Calendar', 'Calendar Sync Failed', 'error', e.message);
  }
};