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
    // First, check if service worker is already registered
    let swRegistration;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const existingRegistration = registrations.find(reg => reg.scope.includes('/'));

    if (existingRegistration) {
      console.log('Using existing service worker registration');
      swRegistration = existingRegistration;
    } else {
      console.log('Registering new service worker');
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
    }

    // Now request notification permission
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Notification permission result:', permission);

    if (permission === 'granted') {
      try {
        console.log('Getting FCM token with registration:', swRegistration);
        const currentToken = await getToken(messaging, {
          vapidKey: "BJYXgI6RsrKYze6d3QZh9-Oc8X0RB-yL_wSehAKXtfm4tBZxyqWm4jTvYk9CHn5dx4LuGHd5_C6k0YP3y4Ge0Ug",
          serviceWorkerRegistration: swRegistration
        });

        if (currentToken) {
          console.log('Successfully obtained FCM token');
          return currentToken;
        } else {
          console.error('Failed to obtain FCM token');
          return null;
        }
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error in requestNotificationPermission:', error);
    return null;
  }
}

export { messaging };