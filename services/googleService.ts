
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

// --- TOKEN STORAGE HELPERS ---
const STORAGE_KEY_TOKEN = 'serafim_google_token';
const STORAGE_KEY_EXPIRY = 'serafim_token_expiry';

const saveTokenToStorage = (token: string, expiresInSeconds: number) => {
    const expiryTime = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_EXPIRY, expiryTime.toString());
};

const getTokenFromStorage = (): string | null => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
    
    if (!token || !expiry) return null;
    
    // Check if expired (leave 5 min buffer)
    if (Date.now() > parseInt(expiry) - 5 * 60 * 1000) {
        console.log('[GoogleService] Stored token expired');
        clearTokenStorage();
        return null;
    }
    return token;
};

const clearTokenStorage = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    localStorage.removeItem('sb_google_token_exists');
};

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
        
        // AUTO-RESTORE TOKEN FROM STORAGE IF AVAILABLE
        const storedToken = getTokenFromStorage();
        if (storedToken) {
            console.log('[GoogleService] Restoring token from LocalStorage');
            (window as any).gapi.client.setToken({ access_token: storedToken });
            localStorage.setItem('sb_google_token_exists', 'true');
        }

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
    let expiresIn = hashParams.get('expires_in') || queryParams.get('expires_in') || '3599'; // Default 1 hour
    
    if (accessToken) {
        // SAVE TOKEN IMMEDIATELY
        saveTokenToStorage(accessToken, parseInt(expiresIn));
        
        // Clear URL immediately to look clean
        window.history.replaceState(null, '', window.location.pathname);
    } else {
        // If no token in URL, check storage
        accessToken = getTokenFromStorage();
        if (!accessToken) return null;
    }

    console.log('[GoogleService] Token available. Ensuring GAPI ready...');

    // 2. Ensure GAPI is ready 
    await waitForGapi();
    if(!(window as any).gapi?.client) {
         await initGapiClient();
    }

    // 3. Set Token in GAPI
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
        redirect_uri: window.location.origin, 
        callback: (resp: any) => {
            if (resp.error) console.error(resp);
            // Note: In redirect mode, this callback is rarely hit, logic happens on reload
        },
      });
      
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
  clearTokenStorage();
  if (!(window as any).gapi?.client) {
      window.location.reload();
      return;
  }
  const token = (window as any).gapi.client.getToken();
  if (token !== null) {
    if ((window as any).google && (window as any).google.accounts) {
        (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
          (window as any).gapi.client.setToken('');
          window.location.reload(); 
        });
    } else {
        window.location.reload();
    }
  } else {
      window.location.reload();
  }
};

export const checkSignInStatus = (): boolean => {
    // Check GAPI memory OR LocalStorage
    const gapiToken = (window as any).gapi?.client?.getToken();
    return !!gapiToken || !!getTokenFromStorage();
};

export interface GoogleUserProfile {
  name: string;
  email: string;
  picture: string;
}

export const getUserProfile = async (): Promise<GoogleUserProfile | null> => {
    // Retry logic if called too early
    for (let i = 0; i < 3; i++) {
        if ((window as any).gapi?.client?.getToken()) break;
        await new Promise(r => setTimeout(r, 500));
    }
    
    if (!checkSignInStatus()) {
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
        // If profile fetch fails (e.g. 401), the token might be bad. Clear it.
        clearTokenStorage();
        return null;
    }
}

const BACKUP_FILENAME = 'serafim_backup.json';

export const syncToDrive = async (data: any) => {
  if (!checkSignInStatus()) {
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
    // If sync fails with 401/403, consider clearing token
    if ((e as any).status === 401) {
        clearTokenStorage();
    }
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
