import { logger } from './logger';
import { supabase } from './supabaseClient';

// Client Side Google Service (Integrated with Supabase Auth)

export const initAndAuth = async () => {
   // Legacy method stub. 
   console.warn("Auth is handled via Supabase.");
   return null;
};

// --- INCREMENTAL AUTH ---
// Вызывает повторную авторизацию с запросом расширенных прав (Tasks, Calendar)
// Это нужно вызывать по кнопке в настройках, только для тех, кто хочет синхронизацию.
export const connectGoogleServices = async () => {
  const redirectUrl = window.location.origin;
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      // Запрашиваем права только здесь, внутри приложения
      scopes: 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline', // Чтобы получить refresh token
        prompt: 'consent', // Принудительно показать экран согласия
      },
    },
  });

  if (error) {
    logger.log('Google', 'Auth upgrade failed', 'error', error.message);
    throw error;
  }
};

// --- DATA TYPES ---
export interface GoogleUserProfile {
  name: string;
  email: string;
  picture: string;
}

export const checkSignInStatus = (): boolean => {
    return true; 
};

// Updated: Now accepts the accessToken explicitly
export const createGoogleTask = async (accessToken: string, title: string, notes: string = '', dueDate?: string) => {
  if (!accessToken) {
      // Silent warning to avoid spam if user hasn't connected services
      return;
  }

  try {
    const taskResource: any = { title: title, notes };
    if (dueDate) {
        taskResource.due = dueDate;
    }

    const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskResource)
    });

    if (response.ok) {
        logger.log('Task', 'Synced to Google Tasks', 'success');
    } else {
        const err = await response.json();
        console.error(err);
        // Don't log as error if it's just a permissions issue (friend's account)
        if (err.error?.code === 401 || err.error?.code === 403) {
            logger.log('Google', 'Sync skipped (No permission)', 'warning');
        } else {
            logger.log('Task', 'Google API Error', 'error', err.error?.message);
        }
    }
  } catch (e: any) {
    logger.log('Task', 'Google Task Sync Failed', 'error', e.message);
  }
};

export const createCalendarEvent = async (accessToken: string, title: string, startTime: string, endTime: string, description: string = '') => {
  if (!accessToken) return;

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
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'popup', minutes: 0 },
        ],
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });

    if (response.ok) {
        logger.log('Calendar', 'Event synced to Google Calendar', 'success');
    } else {
        logger.log('Calendar', 'Google API Error', 'error');
    }
  } catch (e: any) {
    logger.log('Calendar', 'Calendar Sync Failed', 'error', e.message);
  }
};