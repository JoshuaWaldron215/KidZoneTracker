import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export function useNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [subscribedRooms, setSubscribedRooms] = useState<number[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Check if notifications are supported
  const isSupported = () => {
    return 'Notification' in window || 'serviceWorker' in navigator;
  };

  // Request notification permissions
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

      let permission: NotificationPermission;

      if (isMobile) {
        // For mobile, we'll use a combination of methods
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Load subscribed rooms from localStorage
            const savedRooms = localStorage.getItem('subscribedRooms');
            if (savedRooms) {
              setSubscribedRooms(JSON.parse(savedRooms));
            }
          }
        } else {
          permission = await Notification.requestPermission();
        }
      } else {
        // Desktop notification flow
        permission = await Notification.requestPermission();
      }

      const enabled = permission === 'granted';
      setIsEnabled(enabled);

      toast({
        title: enabled ? "Notifications Enabled" : "Notifications Disabled",
        description: enabled 
          ? "You'll receive updates about room availability" 
          : "Please enable notifications to receive updates about room capacity",
        variant: enabled ? "default" : "destructive",
      });

      return enabled;
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
  const subscribeToRoom = (roomId: number) => {
    const newSubscriptions = [...subscribedRooms, roomId];
    setSubscribedRooms(newSubscriptions);
    localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

    toast({
      title: "Subscribed",
      description: "You'll receive notifications when this room's capacity changes",
      duration: 3000,
    });
  };

  // Unsubscribe from a room's notifications
  const unsubscribeFromRoom = (roomId: number) => {
    const newSubscriptions = subscribedRooms.filter(id => id !== roomId);
    setSubscribedRooms(newSubscriptions);
    localStorage.setItem('subscribedRooms', JSON.stringify(newSubscriptions));

    toast({
      title: "Unsubscribed",
      description: "You won't receive notifications for this room anymore",
      duration: 3000,
    });
  };

  // Show a notification
  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isEnabled) return;

    if (isMobile) {
      // Show toast on mobile for immediate feedback
      toast({
        title,
        description: options?.body,
        variant: options?.tag === 'warning' ? 'destructive' : 'default',
      });
    }

    // If notifications are supported and enabled, show native notification
    if (isSupported() && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        ...options,
        requireInteraction: !isMobile, // Don't require interaction on mobile
        icon: "/icon-192.png",
      });

      // Auto-close on mobile after 3 seconds
      if (isMobile) {
        setTimeout(() => notification.close(), 3000);
      }
    }
  };

  return {
    isSupported: isSupported(),
    isEnabled,
    subscribedRooms,
    requestPermission,
    subscribeToRoom,
    unsubscribeFromRoom,
    showNotification
  };
}