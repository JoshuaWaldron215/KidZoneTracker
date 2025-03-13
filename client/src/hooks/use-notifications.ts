import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

export function useNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [subscribedRooms, setSubscribedRooms] = useState<number[]>([]);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { toast } = useToast();

  const isSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator;
  };

  useEffect(() => {
    const initNotifications = async () => {
      if (!isSupported()) return;

      // Load saved subscriptions
      const savedRooms = localStorage.getItem('subscribedRooms');
      if (savedRooms) {
        try {
          const rooms = JSON.parse(savedRooms);
          setSubscribedRooms(rooms);
        } catch (e) {
          localStorage.removeItem('subscribedRooms');
        }
      }

      // If permission is already granted, try to get token
      if (Notification.permission === 'granted') {
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          setIsEnabled(true);
        }
      }
    };

    initNotifications();
  }, []);

  const requestPermission = async () => {
    if (!isSupported()) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      });
      return false;
    }

    // Check if permission is already denied
    if (Notification.permission === 'denied') {
      toast({
        title: "Permission Required",
        description: "Please enable notifications in your browser settings and refresh the page",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Request permission only if not already granted
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setIsEnabled(false);
          return false;
        }
      }

      // Get FCM token
      const token = await requestNotificationPermission();
      if (token) {
        setFcmToken(token);
        setIsEnabled(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      setIsEnabled(false);
      return false;
    }
  };

  const subscribeToRoom = async (roomId: number) => {
    if (!fcmToken || !isEnabled) return false;

    try {
      await apiRequest('POST', '/api/notifications/subscribe', {
        roomId,
        token: fcmToken,
      });

      setSubscribedRooms(prev => {
        const newSubscriptions = [...prev, roomId];
        localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));
        return newSubscriptions;
      });

      return true;
    } catch (error) {
      console.error('Subscription failed:', error);
      return false;
    }
  };

  const unsubscribeFromRoom = async (roomId: number) => {
    if (!fcmToken || !isEnabled) return false;

    try {
      await apiRequest('POST', '/api/notifications/unsubscribe', {
        roomId,
        token: fcmToken,
      });

      setSubscribedRooms(prev => {
        const newSubscriptions = prev.filter(id => id !== roomId);
        localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));
        return newSubscriptions;
      });

      return true;
    } catch (error) {
      console.error('Unsubscription failed:', error);
      return false;
    }
  };

  return {
    isSupported: isSupported(),
    isEnabled,
    subscribedRooms,
    requestPermission,
    subscribeToRoom,
    unsubscribeFromRoom,
  };
}