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

  // Initialize state based on current permissions
  useEffect(() => {
    const initNotifications = async () => {
      if (!isSupported()) return;

      // Load saved subscriptions
      const savedRooms = localStorage.getItem('subscribedRooms');
      if (savedRooms) {
        try {
          const rooms = JSON.parse(savedRooms);
          console.log('Loading saved room subscriptions:', rooms);
          setSubscribedRooms(rooms);
        } catch (e) {
          console.error('Error parsing saved rooms:', e);
          localStorage.removeItem('subscribedRooms');
        }
      }

      // Check existing permission
      if (Notification.permission === 'granted') {
        console.log('Permission already granted, getting token...');
        const token = await requestNotificationPermission();
        if (token) {
          console.log('Got FCM token:', token);
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
      const permission = await Notification.requestPermission();
      console.log('Permission request result:', permission);

      if (permission === 'granted') {
        const token = await requestNotificationPermission();
        if (token) {
          console.log('Got new FCM token:', token);
          setFcmToken(token);
          setIsEnabled(true);
          toast({
            title: "Notifications Enabled",
            description: "You can now subscribe to room updates",
          });
          return true;
        }
      }

      setIsEnabled(false);
      toast({
        title: "Notifications Disabled",
        description: "Please enable notifications in your browser settings",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setIsEnabled(false);
      return false;
    }
  };

  const subscribeToRoom = async (roomId: number) => {
    console.log('Subscribing to room:', roomId, 'Current state:', {
      isEnabled,
      fcmToken,
      subscribedRooms
    });

    if (!fcmToken || !isEnabled) {
      console.error('Cannot subscribe - missing token or notifications disabled');
      return false;
    }

    try {
      await apiRequest('POST', '/api/notifications/subscribe', {
        roomId,
        token: fcmToken,
      });

      // Update state immediately
      const newSubscriptions = [...subscribedRooms, roomId];
      console.log('Updating subscriptions to:', newSubscriptions);
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Room Subscribed",
        description: `You'll receive notifications for room ${roomId}`,
      });
      return true;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return false;
    }
  };

  const unsubscribeFromRoom = async (roomId: number) => {
    console.log('Unsubscribing from room:', roomId, 'Current state:', {
      isEnabled,
      fcmToken,
      subscribedRooms
    });

    if (!fcmToken || !isEnabled) {
      console.error('Cannot unsubscribe - missing token or notifications disabled');
      return false;
    }

    try {
      await apiRequest('POST', '/api/notifications/unsubscribe', {
        roomId,
        token: fcmToken,
      });

      // Update state immediately
      const newSubscriptions = subscribedRooms.filter(id => id !== roomId);
      console.log('Updating subscriptions to:', newSubscriptions);
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Room Unsubscribed",
        description: `You won't receive notifications for room ${roomId}`,
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