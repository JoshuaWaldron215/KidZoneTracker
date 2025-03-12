import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAfkIc-VUrydI_tZk02SoWVRJHyAInBshs",
  authDomain: "kidzone-update.firebaseapp.com",
  projectId: "kidzone-update",
  storageBucket: "kidzone-update.firebasestorage.app",
  messagingSenderId: "205435728737",
  appId: "1:205435728737:web:2059dfa09dc56b6f33cb20",
  measurementId: "G-5D9GNGPX1C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle foreground messages
onMessage(messaging, (payload) => {
  console.log('Received foreground message:', payload);
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
    // Check browser support
    if (!("Notification" in window)) {
      console.error('Browser does not support notifications');
      return null;
    }

    // Request permission directly first
    const permissionResult = await Notification.requestPermission();
    console.log('Permission request result:', permissionResult);

    if (permissionResult !== 'granted') {
      console.log('Permission not granted');
      return null;
    }

    // Only proceed with service worker registration if permission granted
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker not supported');
      return null;
    }

    // Register or get existing service worker
    let swRegistration;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      swRegistration = registrations.find(reg => reg.scope.includes('/'));

      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('New service worker registered');
      } else {
        console.log('Using existing service worker');
      }

      // Get FCM token with the service worker
      const currentToken = await getToken(messaging, {
        vapidKey: "BJYXgI6RsrKYze6d3QZh9-Oc8X0RB-yL_wSehAKXtfm4tBZxyqWm4jTvYk9CHn5dx4LuGHd5_C6k0YP3y4Ge0Ug",
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        console.log('FCM token obtained');
        return currentToken;
      } else {
        console.error('No FCM token received');
        return null;
      }
    } catch (error) {
      console.error('Error during service worker registration:', error);
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

export { messaging };