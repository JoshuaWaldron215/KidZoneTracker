import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Room } from '@shared/schema';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOMS_UPDATE') {
          // Get previous rooms data
          const previousRooms = queryClient.getQueryData<Room[]>(['/api/rooms']) || [];

          // Update the rooms data in the cache
          queryClient.setQueryData(['/api/rooms'], data.rooms);

          // Compare previous and new room states
          data.rooms.forEach((newRoom: Room) => {
            const prevRoom = previousRooms.find(r => r.id === newRoom.id);
            if (prevRoom && prevRoom.currentOccupancy !== newRoom.currentOccupancy) {
              console.log('Room occupancy changed via WebSocket:', {
                room: newRoom.name,
                previous: prevRoom.currentOccupancy,
                current: newRoom.currentOccupancy
              });

              // Calculate remaining spots
              const spotsRemaining = newRoom.maxCapacity - newRoom.currentOccupancy;
              const message = newRoom.currentOccupancy >= newRoom.maxCapacity 
                ? `${newRoom.name} is now FULL`
                : `${newRoom.name}: ${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining`;

              // Always show toast
              toast({
                title: newRoom.name,
                description: message,
                variant: newRoom.currentOccupancy >= newRoom.maxCapacity ? "destructive" : "default",
              });

              // Try browser notification if supported and enabled
              try {
                if ("Notification" in window && Notification.permission === "granted") {
                  const notification = new Notification("KidZone Status Update", {
                    body: message,
                    icon: "/favicon.ico",
                    tag: newRoom.id.toString(), // Prevent duplicate notifications
                    vibrate: isMobile ? [200, 100, 200] : undefined // Vibrate on mobile
                  });

                  // Clear notification after 5 seconds on mobile
                  if (isMobile) {
                    setTimeout(() => notification.close(), 5000);
                  }
                }
              } catch (error) {
                console.error('Failed to show browser notification:', error);
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [queryClient, toast, isMobile]);

  return wsRef.current;
}