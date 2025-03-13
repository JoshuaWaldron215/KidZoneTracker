import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAfkIc-VUrydI_tZk02SoWVRJHyAInBshs",
  authDomain: "kidzone-update.firebaseapp.com",
  projectId: "kidzone-update",
  storageBucket: "kidzone-update.firebasestorage.app",
  messagingSenderId: "205435728737",
  appId: "1:205435728737:web:2059dfa09dc56b6f33cb20"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle foreground messages
onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
  if (!("Notification" in window)) return;

  const notificationTitle = payload.notification?.title || "KidZone Update";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.data?.roomId,
  };

  new Notification(notificationTitle, notificationOptions);
});

export async function requestNotificationPermission() {
  try {
    // First check if notifications are supported
    if (!("Notification" in window)) {
      console.error('Browser does not support notifications');
      return null;
    }

    // Then check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker not supported');
      return null;
    }

    // Check current permission status
    const currentPermission = Notification.permission;
    if (currentPermission === 'denied') {
      console.log('Notifications are blocked by browser');
      return null;
    }

    // Request permission if not granted
    if (currentPermission !== 'granted') {
      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== 'granted') {
        console.log('Permission not granted');
        return null;
      }
    }

    // Get service worker registration
    let swRegistration;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      swRegistration = registrations.find(reg => reg.scope.includes('/'));

      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await swRegistration.active;
      }
    } catch (error) {
      console.error('Failed to register service worker:', error);
      return null;
    }

    // Try to get FCM token
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: "BJYXgI6RsrKYze6d3QZh9-Oc8X0RB-yL_wSehAKXtfm4tBZxyqWm4jTvYk9CHn5dx4LuGHd5_C6k0YP3y4Ge0Ug",
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        console.log('FCM token obtained successfully');
        return currentToken;
      } else {
        console.error('Failed to obtain FCM token');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in notification setup:', error);
    return null;
  }
}

export { messaging };