import { AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Room } from "@shared/schema";

interface RoomStatusProps {
  room: Room;
}

export function RoomStatus({ room }: RoomStatusProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const prevOccupancyRef = useRef(room.currentOccupancy);
  const occupancyPercentage = (room.currentOccupancy / room.maxCapacity) * 100;

  let statusColor = "bg-green-500";
  if (occupancyPercentage >= 90) {
    statusColor = "bg-red-500";
  } else if (occupancyPercentage >= 75) {
    statusColor = "bg-yellow-500";
  }

  useEffect(() => {
    // Show notifications when occupancy changes
    if (prevOccupancyRef.current !== room.currentOccupancy) {
      console.log('Occupancy changed:', {
        room: room.name,
        previous: prevOccupancyRef.current,
        current: room.currentOccupancy,
        maxCapacity: room.maxCapacity,
        isMobile
      });

      // Always show toast notification for any change
      const spotsRemaining = room.maxCapacity - room.currentOccupancy;
      const message = room.currentOccupancy >= room.maxCapacity 
        ? `${room.name} is now FULL`
        : `${room.name}: ${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining`;

      console.log('Showing notification:', message);

      // Always show toast
      toast({
        title: room.name,
        description: message,
        variant: room.currentOccupancy >= room.maxCapacity ? "destructive" : "default",
      });

      // Try browser notification if supported and enabled
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          const notification = new Notification("KidZone Status Update", {
            body: message,
            icon: "/favicon.ico",
            tag: room.id.toString(), // Prevent duplicate notifications
            vibrate: isMobile ? [200, 100, 200] : undefined // Vibrate on mobile
          });

          // Clear notification after 5 seconds on mobile
          if (isMobile) {
            setTimeout(() => notification.close(), 5000);
          }

          console.log('Browser notification sent');
        }
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }

      prevOccupancyRef.current = room.currentOccupancy;
    }
  }, [room.currentOccupancy, room.maxCapacity, room.name, room.id, toast, isMobile]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {room.name}
        </CardTitle>
        {!room.isOpen && (
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-2xl font-bold">
            {room.currentOccupancy}/{room.maxCapacity}
          </span>
        </div>
        <Progress 
          value={occupancyPercentage} 
          className={`mt-3 ${statusColor}`}
        />
      </CardContent>
    </Card>
  );
}