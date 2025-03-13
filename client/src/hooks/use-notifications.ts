import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { requestNotificationPermission } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

export function useNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [subscribedRooms, setSubscribedRooms] = useState<number[]>([]);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isSupported = () => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported - no Notification API');
      return false;
    }
    if (!('serviceWorker' in navigator)) {
      console.log('Notifications not supported - no Service Worker support');
      return false;
    }
    return true;
  };

  // Initialize state based on current permissions
  useEffect(() => {
    const initNotifications = async () => {
      if (!isSupported()) return;

      // Load saved subscriptions
      const savedRooms = localStorage.getItem('subscribedRooms');
      if (savedRooms) {
        try {
          setSubscribedRooms(JSON.parse(savedRooms));
        } catch (e) {
          console.error('Error parsing saved rooms:', e);
          localStorage.removeItem('subscribedRooms');
        }
      }

      // Check if we already have permission
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
        title: "Notifications Not Supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      });
      return false;
    }

    try {
      // First request browser permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          setIsEnabled(true);
          return true;
        }
      }

      toast({
        title: "Notifications Disabled",
        description: "Please enable notifications in your browser settings",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications",
        variant: "destructive",
      });
      return false;
    }
  };

  const subscribeToRoom = async (roomId: number) => {
    if (!fcmToken || !isEnabled) {
      console.error('No FCM token available or notifications not enabled');
      return false;
    }

    try {
      await apiRequest('POST', '/api/notifications/subscribe', {
        roomId,
        token: fcmToken,
      });

      // Update local state
      const newSubscriptions = [...subscribedRooms, roomId];
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Room Subscribed",
        description: "You'll receive notifications for this room",
      });
      return true;
    } catch (error) {
      console.error('Failed to subscribe:', error);
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

      // Update local state
      const newSubscriptions = subscribedRooms.filter(id => id !== roomId);
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Room Unsubscribed",
        description: "You won't receive notifications for this room anymore",
      });
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
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