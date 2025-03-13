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

      // Load saved subscriptions first
      const savedRooms = localStorage.getItem('subscribedRooms');
      if (savedRooms) {
        setSubscribedRooms(JSON.parse(savedRooms));
      }

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
        description: "Your browser doesn't support notifications. Please try using a modern browser.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const token = await requestNotificationPermission();
      if (token) {
        setFcmToken(token);
        setIsEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "You can now subscribe to room updates",
          duration: 3000,
        });
        return true;
      }

      toast({
        title: "Notifications Disabled",
        description: "Please enable notifications in your browser settings to receive updates",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const subscribeToRoom = async (roomId: number) => {
    if (!fcmToken || !isEnabled) {
      return false;
    }

    try {
      await apiRequest('POST', '/api/notifications/subscribe', {
        roomId,
        token: fcmToken,
      });

      const newSubscriptions = [...subscribedRooms, roomId];
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Subscribed Successfully",
        description: "You'll receive notifications for this room",
        duration: 3000,
      });
      return true;
    } catch (error) {
      console.error('Failed to subscribe to room:', error);
      return false;
    }
  };

  const unsubscribeFromRoom = async (roomId: number) => {
    if (!fcmToken || !isEnabled) {
      return false;
    }

    try {
      await apiRequest('POST', '/api/notifications/unsubscribe', {
        roomId,
        token: fcmToken,
      });

      const newSubscriptions = subscribedRooms.filter(id => id !== roomId);
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Unsubscribed Successfully",
        description: "You won't receive notifications for this room anymore",
        duration: 3000,
      });
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from room:', error);
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