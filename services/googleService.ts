
// Serafim Google Services
// Handles Auth, Drive Sync, Tasks, and Calendar interactions

// Helper to safely get env vars across different build tools (Vite, CRA, Next.js)
// Bundlers often replace process.env.KEY statically, so we must be explicit.
const getEnvVar = (key: string) => {
  // 1. Try standard process.env (CRA/Node/Webpack)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[`REACT_APP_${key}`]) return process.env[`REACT_APP_${key}`];
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    if (process.env[`NEXT_PUBLIC_${key}`]) return process.env[`NEXT_PUBLIC_${key}`];
    if (process.env[key]) return process.env[key];
  }
  
  // 2. Try import.meta.env (Vite native)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    // @ts-ignore
    if (import.meta.env[key]) return import.meta.env[key];
  }

  return '';
};

const CLIENT_ID = getEnvVar('GOOGLE_CLIENT_ID').trim();
const API_KEY = getEnvVar('GOOGLE_API_KEY').trim();

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
];

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.events openid email profile';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

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
      if (count > 100) { // 10 seconds timeout
        clearInterval(interval);
        console.warn("GAPI script load timed out or blocked");
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
      if (count > 100) {
          clearInterval(interval);
          console.warn("GIS script load timed out or blocked");
          resolve();
      }
    }, 100);
  });
};

// Initialize GAPI (for API calls)
export const initGapiClient = async () => {
  if (typeof window === 'undefined') return;
  
  if (!API_KEY) {
      console.error("GAPI Init Error: API_KEY is missing. Check REACT_APP_GOOGLE_API_KEY or VITE_GOOGLE_API_KEY.");
      return;
  }

  await waitForGapi();

  return new Promise<void>((resolve, reject) => {
    if (!(window as any).gapi) {
        // If script blocked, reject gracefully
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
  if (tokenClient) return; // Idempotent if success

  if (!CLIENT_ID) {
      console.error("GIS Init Error: CLIENT_ID is missing. Check REACT_APP_GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID.");
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
  // Debug info for user
  if (!CLIENT_ID) {
      alert("Ошибка конфигурации: Не найден Google Client ID (REACT_APP_GOOGLE_CLIENT_ID или VITE_GOOGLE_CLIENT_ID).");
      return;
  }
  
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Retry initialization
    console.log("TokenClient missing, retrying initialization...");
    initGisClient().then(() => {
        if(tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            alert('Не удалось инициализировать Google Sign-In. Проверьте консоль и блокировщики рекламы.');
        }
    }).catch(e => {
        alert('Ошибка инициализации: ' + e);
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
      window.location.reload(); 
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
    await new Promise(r => setTimeout(r, 500));
    
    if (!checkSignInStatus()) {
        console.log('User profile fetch skipped: Not signed in');
        return null;
    }
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

// --- DRIVE SYNC (AppDataFolder) ---

const BACKUP_FILENAME = 'serafim_backup.json';

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
