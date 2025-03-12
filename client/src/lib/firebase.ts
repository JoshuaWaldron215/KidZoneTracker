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
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: "BJYXgI6RsrKYze6d3QZh9-Oc8X0RB-yL_wSehAKXtfm4tBZxyqWm4jTvYk9CHn5dx4LuGHd5_C6k0YP3y4Ge0Ug" // Replace with your VAPID key
      });
      
      console.log('FCM Token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

export { messaging };
