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

  // Check if notifications are supported
  const isSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator;
  };

  // Request notification permissions and FCM token
  const requestPermission = async () => {
    try {
      if (!isSupported()) {
        toast({
          title: "Notifications Not Supported",
          description: "Your device doesn't support notifications. We'll show updates in the app instead.",
          variant: "destructive",
        });
        return false;
      }

      const token = await requestNotificationPermission();

      if (token) {
        setFcmToken(token);
        setIsEnabled(true);
        // Load subscribed rooms from localStorage
        const savedRooms = localStorage.getItem('subscribedRooms');
        if (savedRooms) {
          setSubscribedRooms(JSON.parse(savedRooms));
        }
        return true;
      } else {
        toast({
          title: "Notifications Disabled",
          description: "Please enable notifications to receive updates about room capacity",
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
      // Send subscription to backend
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

  // Unsubscribe from a room's notifications
  const unsubscribeFromRoom = async (roomId: number) => {
    if (!fcmToken) {
      console.error('No FCM token available');
      return;
    }

    try {
      // Send unsubscription to backend
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