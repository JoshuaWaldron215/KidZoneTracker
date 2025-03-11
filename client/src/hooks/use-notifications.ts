import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export function useNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
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
            await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY
            });
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
          : "Please enable notifications in your browser settings to receive updates",
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

  // Show a notification
  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isEnabled) return;

    if (isMobile) {
      // Always show toast on mobile for better visibility
      toast({
        title,
        description: options?.body,
        variant: options?.tag === 'warning' ? 'destructive' : 'default',
      });
    }

    // If notifications are supported and enabled, show native notification
    if (isSupported() && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  };

  return {
    isSupported: isSupported(),
    isEnabled,
    requestPermission,
    showNotification
  };
}
