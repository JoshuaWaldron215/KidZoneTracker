import { AlertCircle, Users, Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/use-notifications";
import type { Room } from "@shared/schema";

interface RoomStatusProps {
  room: Room;
}

export function RoomStatus({ room }: RoomStatusProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { 
    isSupported, 
    isEnabled, 
    subscribedRooms, 
    requestPermission, 
    subscribeToRoom, 
    unsubscribeFromRoom 
  } = useNotifications();
  const prevOccupancyRef = useRef(room.currentOccupancy);
  const occupancyPercentage = (room.currentOccupancy / room.maxCapacity) * 100;
  const isSubscribed = subscribedRooms.includes(room.id);

  let statusColor = "bg-green-500";
  if (occupancyPercentage >= 90) {
    statusColor = "bg-red-500";
  } else if (occupancyPercentage >= 75) {
    statusColor = "bg-yellow-500";
  }

  const handleNotificationToggle = async () => {
    try {
      // If already subscribed, just unsubscribe
      if (isSubscribed) {
        await unsubscribeFromRoom(room.id);
        return;
      }

      // If notifications aren't enabled yet, request permission
      if (!isEnabled) {
        const enabled = await requestPermission();
        if (enabled) {
          await subscribeToRoom(room.id);
        }
        return;
      }

      // If enabled but not subscribed, subscribe
      await subscribeToRoom(room.id);
    } catch (error) {
      console.error('Error handling notification toggle:', error);
      toast({
        title: "Error",
        description: "Failed to manage notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Only show notifications if room is subscribed AND notifications are enabled
    if (isSubscribed && isEnabled && prevOccupancyRef.current !== room.currentOccupancy) {
      // Calculate spots remaining
      const spotsRemaining = room.maxCapacity - room.currentOccupancy;
      const message = room.currentOccupancy >= room.maxCapacity 
        ? `${room.name} is now FULL`
        : `${room.name}: ${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining`;

      toast({
        title: room.name,
        description: message,
        variant: room.currentOccupancy >= room.maxCapacity ? "destructive" : "default",
      });

      prevOccupancyRef.current = room.currentOccupancy;
    }
  }, [room.currentOccupancy, room.maxCapacity, room.name, isSubscribed, isEnabled, toast]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {room.name}
          {isSupported && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={handleNotificationToggle}
              title={isSubscribed ? "Unsubscribe from notifications" : "Subscribe to notifications"}
            >
              {isSubscribed ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {isSubscribed ? "Unsubscribe from notifications" : "Subscribe to notifications"}
              </span>
            </Button>
          )}
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
          className={`mt-3 ${statusColor} transition-all duration-500`}
        />
      </CardContent>
    </Card>
  );
}