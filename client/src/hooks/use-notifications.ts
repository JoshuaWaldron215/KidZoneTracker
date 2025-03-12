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

  // Initialize notifications status
  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (!isSupported()) return;

      console.log('Checking notification status...');
      console.log('Current permission:', Notification.permission);

      if (Notification.permission === 'granted') {
        try {
          const token = await requestNotificationPermission();
          console.log('Got FCM token:', !!token);
          if (token) {
            setFcmToken(token);
            setIsEnabled(true);
            const savedRooms = localStorage.getItem('subscribedRooms');
            if (savedRooms) {
              setSubscribedRooms(JSON.parse(savedRooms));
            }
          }
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }
      }
    };

    checkNotificationStatus();
  }, []);

  const requestPermission = async () => {
    try {
      if (!isSupported()) {
        toast({
          title: "Notifications Not Supported",
          description: "Your browser doesn't support notifications. Please try using a modern browser.",
          variant: "destructive",
        });
        return false;
      }

      // First reset the state
      setIsEnabled(false);
      setFcmToken(null);

      // Request permission and get token
      const token = await requestNotificationPermission();
      console.log('Permission request result:', !!token);

      if (token) {
        setFcmToken(token);
        setIsEnabled(true);

        // Load saved subscriptions
        const savedRooms = localStorage.getItem('subscribedRooms');
        if (savedRooms) {
          setSubscribedRooms(JSON.parse(savedRooms));
        }

        toast({
          title: "Notifications Enabled",
          description: "You'll receive updates about room capacity changes",
          duration: 3000,
        });
        return true;
      } else {
        toast({
          title: "Notifications Disabled",
          description: "Please enable notifications in your browser settings to receive updates",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Subscribe to a room's notifications
  const subscribeToRoom = async (roomId: number) => {
    if (!fcmToken) {
      console.error('No FCM token available');
      return;
    }

    try {
      console.log('Subscribing to room:', roomId);
      await apiRequest('POST', '/api/notifications/subscribe', {
        roomId,
        token: fcmToken,
      });

      const newSubscriptions = [...subscribedRooms, roomId];
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Subscribed",
        description: "You'll receive notifications when this room's capacity changes",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to subscribe to room:', error);
      toast({
        title: "Error",
        description: "Failed to subscribe to notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const unsubscribeFromRoom = async (roomId: number) => {
    if (!fcmToken) {
      console.error('No FCM token available');
      return;
    }

    try {
      console.log('Unsubscribing from room:', roomId);
      await apiRequest('POST', '/api/notifications/unsubscribe', {
        roomId,
        token: fcmToken,
      });

      const newSubscriptions = subscribedRooms.filter(id => id !== roomId);
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Unsubscribed",
        description: "You won't receive notifications for this room anymore",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to unsubscribe from room:', error);
      toast({
        title: "Error",
        description: "Failed to unsubscribe from notifications. Please try again.",
        variant: "destructive",
      });
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