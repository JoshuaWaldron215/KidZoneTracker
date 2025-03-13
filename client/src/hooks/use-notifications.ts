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

  // Initialize notifications status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (!isSupported()) return;

      // If we already have permission, try to get token
      if (Notification.permission === 'granted') {
        try {
          const token = await requestNotificationPermission();
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
          setIsEnabled(false);
        }
      } else {
        setIsEnabled(false);
      }
    };

    checkNotificationStatus();
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
      // Request browser permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          setIsEnabled(true);
          toast({
            title: "Notifications Enabled",
            description: "You'll receive updates about room capacity changes",
            duration: 3000,
          });
          return true;
        }
      }

      setIsEnabled(false);
      toast({
        title: "Notifications Disabled",
        description: "Please enable notifications in your browser settings to receive updates",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setIsEnabled(false);
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
      console.error('No FCM token available or notifications not enabled');
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
        title: "Subscribed",
        description: "You'll receive notifications when this room's capacity changes",
        duration: 3000,
      });
      return true;
    } catch (error) {
      console.error('Failed to subscribe to room:', error);
      toast({
        title: "Error",
        description: "Failed to subscribe to notifications. Please try again.",
        variant: "destructive",
      });
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
        title: "Unsubscribed",
        description: "You won't receive notifications for this room anymore",
        duration: 3000,
      });
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from room:', error);
      toast({
        title: "Error",
        description: "Failed to unsubscribe from notifications. Please try again.",
        variant: "destructive",
      });
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