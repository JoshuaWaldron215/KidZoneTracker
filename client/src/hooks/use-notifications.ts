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
          const rooms = JSON.parse(savedRooms);
          console.log('Loaded saved room subscriptions:', rooms);
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
      console.log('Requesting notification permission...');
      const permissionResult = await Notification.requestPermission();
      console.log('Permission result:', permissionResult);

      if (permissionResult === 'granted') {
        const token = await requestNotificationPermission();
        if (token) {
          console.log('Setting FCM token:', token);
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
      toast({
        title: "Error",
        description: "Failed to enable notifications",
        variant: "destructive",
      });
      return false;
    }
  };

  const subscribeToRoom = async (roomId: number) => {
    console.log('Attempting to subscribe to room:', roomId);
    console.log('Current state - Enabled:', isEnabled, 'Token:', fcmToken);

    if (!fcmToken || !isEnabled) {
      console.error('Cannot subscribe - Token or notifications not enabled');
      return false;
    }

    try {
      await apiRequest('POST', '/api/notifications/subscribe', {
        roomId,
        token: fcmToken,
      });

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
      toast({
        title: "Error",
        description: "Failed to subscribe to room",
        variant: "destructive",
      });
      return false;
    }
  };

  const unsubscribeFromRoom = async (roomId: number) => {
    console.log('Attempting to unsubscribe from room:', roomId);

    if (!fcmToken || !isEnabled) {
      console.error('Cannot unsubscribe - Token or notifications not enabled');
      return false;
    }

    try {
      await apiRequest('POST', '/api/notifications/unsubscribe', {
        roomId,
        token: fcmToken,
      });

      const newSubscriptions = subscribedRooms.filter(id => id !== roomId);
      console.log('Updating subscriptions to:', newSubscriptions);
      setSubscribedRooms(newSubscriptions);
      localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

      toast({
        title: "Room Unsubscribed",
        description: `You won't receive notifications for room ${roomId} anymore`,
      });
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast({
        title: "Error",
        description: "Failed to unsubscribe from room",
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