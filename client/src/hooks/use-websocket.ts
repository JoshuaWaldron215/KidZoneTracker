import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Room } from '@shared/schema';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isBackgrounded, setIsBackgrounded] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);

    let reconnectTimer: NodeJS.Timeout;
    let ws: WebSocket;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Show connection status on mobile
        if (isMobile) {
          toast({
            title: "Connected",
            description: "You'll receive real-time updates",
            duration: 2000,
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          console.log('WebSocket message received:', event.data);
          const data = JSON.parse(event.data);

          if (data.type === 'ROOMS_UPDATE') {
            // Get previous rooms data
            const previousRooms = queryClient.getQueryData<Room[]>(['/api/rooms']) || [];

            // Update the rooms data in the cache
            queryClient.setQueryData(['/api/rooms'], data.rooms);

            // Only show notifications if app is not backgrounded on mobile
            if (!isBackgrounded || !isMobile) {
              // Compare previous and new room states
              data.rooms.forEach((newRoom: Room) => {
                const prevRoom = previousRooms.find(r => r.id === newRoom.id);
                if (prevRoom && prevRoom.currentOccupancy !== newRoom.currentOccupancy) {
                  // Calculate remaining spots
                  const spotsRemaining = newRoom.maxCapacity - newRoom.currentOccupancy;
                  const message = newRoom.currentOccupancy >= newRoom.maxCapacity 
                    ? `${newRoom.name} is now FULL`
                    : `${newRoom.name}: ${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining`;

                  // Show toast notification
                  toast({
                    title: "Room Status Update",
                    description: message,
                    variant: newRoom.currentOccupancy >= newRoom.maxCapacity ? "destructive" : "default",
                    duration: isMobile ? 3000 : 5000, // Shorter duration on mobile
                  });

                  // Try browser notification
                  if ("Notification" in window && Notification.permission === "granted") {
                    const notification = new Notification("KidZone Status Update", {
                      body: message,
                      icon: "/favicon.ico",
                      tag: newRoom.id.toString(),
                      requireInteraction: !isMobile, // Don't require interaction on mobile
                    });

                    // On mobile, add vibration and auto-close
                    if (isMobile) {
                      navigator.vibrate?.(200);
                      setTimeout(() => notification.close(), 3000);
                    }
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error('Failed to process WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (isMobile) {
          toast({
            title: "Connection Error",
            description: "Trying to reconnect...",
            variant: "destructive",
          });
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        // Try to reconnect unless page is backgrounded on mobile
        if (!isBackgrounded || !isMobile) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    // Handle page visibility for mobile
    const handleVisibilityChange = () => {
      setIsBackgrounded(document.hidden);
      if (!document.hidden && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        // Reconnect when page becomes visible
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [queryClient, toast, isMobile, isBackgrounded]);

  return wsRef.current;
}