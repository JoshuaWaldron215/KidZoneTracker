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
    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        console.log('WebSocket message received:', event.data);
        const data = JSON.parse(event.data);

        if (data.type === 'ROOMS_UPDATE') {
          // Get previous rooms data
          const previousRooms = queryClient.getQueryData<Room[]>(['/api/rooms']) || [];
          console.log('Previous rooms:', previousRooms);
          console.log('New rooms:', data.rooms);

          // Update the rooms data in the cache
          queryClient.setQueryData(['/api/rooms'], data.rooms);

          // Compare previous and new room states
          data.rooms.forEach((newRoom: Room) => {
            const prevRoom = previousRooms.find(r => r.id === newRoom.id);
            if (prevRoom && prevRoom.currentOccupancy !== newRoom.currentOccupancy) {
              console.log('Room occupancy changed:', {
                room: newRoom.name,
                previous: prevRoom.currentOccupancy,
                current: newRoom.currentOccupancy,
                maxCapacity: newRoom.maxCapacity
              });

              // Calculate remaining spots
              const spotsRemaining = newRoom.maxCapacity - newRoom.currentOccupancy;
              const message = newRoom.currentOccupancy >= newRoom.maxCapacity 
                ? `${newRoom.name} is now FULL`
                : `${newRoom.name}: ${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining`;

              // Show toast notification with higher duration
              toast({
                title: "Room Status Update",
                description: message,
                variant: newRoom.currentOccupancy >= newRoom.maxCapacity ? "destructive" : "default",
                duration: 5000, // Show for 5 seconds
              });

              // Try browser notification
              if ("Notification" in window && Notification.permission === "granted") {
                console.log('Sending browser notification');
                const notification = new Notification("KidZone Status Update", {
                  body: message,
                  icon: "/favicon.ico",
                  tag: newRoom.id.toString(),
                  requireInteraction: true, // Keep notification visible until user dismisses it
                });

                // On mobile, add vibration and auto-close
                if (isMobile) {
                  navigator.vibrate?.(200);
                  setTimeout(() => notification.close(), 5000);
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to process WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [queryClient, toast, isMobile]);

  return wsRef.current;
}