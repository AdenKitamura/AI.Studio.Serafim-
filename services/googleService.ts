
// Serafim Google Services
// Handles Auth, Drive Sync, Tasks, and Calendar interactions

// STRICTLY accessing via process.env properties for Vercel/CRA compatibility.
// No dynamic lookups to satisfy security scanners.

const getClientId = () => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_GOOGLE_CLIENT_ID) return process.env.REACT_APP_GOOGLE_CLIENT_ID;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }
  return '';
};

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

const CLIENT_ID = getClientId();
const API_KEY = getApiKey();

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
      if (count > 200) { 
        clearInterval(interval);
        console.warn("GAPI script load timed out");
        resolve(); 
      }
    }, 50);
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
      if (count > 200) {
          clearInterval(interval);
          resolve();
      }
    }, 50);
  });
};

// Initialize GAPI (for API calls)
export const initGapiClient = async () => {
  if (typeof window === 'undefined') return;
  if (!API_KEY) {
      console.error("[GoogleService] GAPI Init Error: API Key missing.");
      return;
  }

  await waitForGapi();

  return new Promise<void>((resolve, reject) => {
    if (!(window as any).gapi) return reject("GAPI script not loaded");
    
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

// Handle OAuth Redirect Callback (Robust parsing)
export const handleRedirectCallback = async (): Promise<GoogleUserProfile | null> => {
    // 1. Try to get token from URL (Hash or Query)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    let accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    
    if (accessToken) {
        // Clear URL immediately to look clean, but keep token in memory
        window.history.replaceState(null, '', window.location.pathname);
        alert('Токен получен! Инициализация сессии...');
    } else {
        return null;
    }

    console.log('[GoogleService] Token found. Initializing GAPI...');

    // 2. Ensure GAPI is ready (Important: Load scripts if not loaded)
    await waitForGapi();
    if(!(window as any).gapi?.client) {
         await initGapiClient();
    }

    // 3. Set Token
    if ((window as any).gapi?.client) {
        (window as any).gapi.client.setToken({ access_token: accessToken });
        localStorage.setItem('sb_google_token_exists', 'true');
        
        // 4. Fetch Profile
        return await getUserProfile();
    }
    return null;
};

// Initialize GIS (for Auth)
export const initGisClient = async () => {
  if (typeof window === 'undefined') return;
  if (tokenClient) return;

  if (!CLIENT_ID) return;

  await waitForGIS();

  try {
      if (!(window as any).google) throw new Error("Google GIS script not loaded");
      
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        ux_mode: 'redirect', 
        redirect_uri: window.location.origin, // Matches Vercel deployment
        callback: (resp: any) => {
            if (resp.error) console.error(resp);
        },
      });
      
      gisInited = true;
      console.log('GIS initialized (Redirect Mode)');
  } catch (e) {
      console.error("Error initializing GIS client", e);
  }
};

export const signIn = () => {
  if (!CLIENT_ID) {
      alert("Ошибка: CLIENT_ID не найден.");
      return;
  }
  
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    initGisClient().then(() => {
        if(tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
        else alert('Не удалось инициализировать Google Sign-In.');
    });
  }
};

export const signOut = () => {
  if (!(window as any).gapi?.client) return;
  const token = (window as any).gapi.client.getToken();
  if (token !== null) {
    if ((window as any).google && (window as any).google.accounts) {
        (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
          (window as any).gapi.client.setToken('');
          localStorage.removeItem('sb_google_token_exists');
          window.location.reload(); 
        });
    } else {
        localStorage.removeItem('sb_google_token_exists');
        window.location.reload();
    }
  } else {
      localStorage.removeItem('sb_google_token_exists');
      window.location.reload();
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
