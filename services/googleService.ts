import { logger } from './logger';

// Client Side Google Service (Integrated with Clerk)

export const initAndAuth = async () => {
   // Legacy method stub. Now auth is handled by Clerk in the React layer.
   console.warn("Auth is now handled by Clerk. Use the token provided by the React hook.");
   return null;
};

// --- DATA TYPES ---
export interface GoogleUserProfile {
  name: string;
  email: string;
  picture: string;
}

export const checkSignInStatus = (): boolean => {
    // We assume if the app is calling these functions, the token has been passed or verified
    // This function is less relevant with the new architecture, but we keep it for safety
    return true; 
};

// Updated: Now accepts the accessToken explicitly
export const createGoogleTask = async (accessToken: string, title: string, notes: string = '', dueDate?: string) => {
  if (!accessToken) {
      logger.log('Task', 'No Google Token', 'warning');
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
        logger.log('Task', 'Google API Error', 'error', err.error?.message);
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