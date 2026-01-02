import { Task } from '../types';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendNotification = (title: string, body: string) => {
  if (Notification.permission !== 'granted') return;

  // Prefer Service Worker notification (Required for Android background/lock screen)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body,
        icon: 'https://img.icons8.com/fluency/512/artificial-intelligence.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'serafim-alert',
        renotify: true,
        data: { url: '/' }
      } as any);
    });
  } else {
    // Fallback
    new Notification(title, {
      body,
      icon: 'https://img.icons8.com/fluency/512/artificial-intelligence.png',
      vibrate: [200, 100, 200],
    } as any);
  }
};

// Deprecated scheduled triggering in favor of Main Thread Audio Loop
export const scheduleSystemNotification = (task: Task) => {
  // Logic moved to App.tsx interval
};