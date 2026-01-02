
import { Task } from '../types';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: 'https://img.icons8.com/fluency/512/artificial-intelligence.png',
          vibrate: [200, 100, 200],
          tag: 'serafim-task-now',
          data: { url: '/' }
        } as any);
      });
    } else {
      new Notification(title, {
        body,
        icon: 'https://img.icons8.com/fluency/512/artificial-intelligence.png',
      });
    }
  }
};

// --- NEW: SYSTEM LEVEL SCHEDULING ---
export const scheduleSystemNotification = (task: Task) => {
  if (!task.dueDate || task.isCompleted) return;
  
  const targetTime = new Date(task.dueDate).getTime();
  const now = Date.now();
  
  // Only schedule if it's in the future
  if (targetTime > now) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_TASK',
        payload: {
          id: task.id,
          title: task.title,
          timestamp: targetTime
        }
      });
    }
  }
};
