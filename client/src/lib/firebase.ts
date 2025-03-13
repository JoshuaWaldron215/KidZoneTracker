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
    // Basic browser support check
    if (!("Notification" in window)) {
      console.error('This browser does not support notifications');
      return null;
    }

    if (!('serviceWorker' in navigator)) {
      console.error('This browser does not support service workers');
      return null;
    }

    // First request notification permission
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);

    if (permission !== 'granted') {
      console.log('Permission not granted');
      return null;
    }

    // Register service worker
    console.log('Registering service worker...');
    let swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await swRegistration.update();
      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Failed to register service worker:', error);
      return null;
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('Service worker is ready');

    // Get FCM token
    try {
      console.log('Getting FCM token...');
      const currentToken = await getToken(messaging, {
        vapidKey: "BJYXgI6RsrKYze6d3QZh9-Oc8X0RB-yL_wSehAKXtfm4tBZxyqWm4jTvYk9CHn5dx4LuGHd5_C6k0YP3y4Ge0Ug",
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        console.log('FCM token obtained successfully');
        return currentToken;
      } else {
        console.error('No FCM token received');
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