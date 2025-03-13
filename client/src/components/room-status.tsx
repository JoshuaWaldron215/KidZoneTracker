import { AlertCircle, Users, Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
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
  const [isAnimating, setIsAnimating] = useState(false);
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
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);

      // If already subscribed, just unsubscribe
      if (isSubscribed) {
        const success = await unsubscribeFromRoom(room.id);
        if (!success) {
          toast({
            title: "Error",
            description: "Failed to unsubscribe from notifications",
            variant: "destructive",
          });
        }
        return;
      }

      // If not enabled, request permission first
      if (!isEnabled) {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          return; // Error toast already shown by requestPermission
        }
      }

      // Try to subscribe
      const success = await subscribeToRoom(room.id);
      if (!success) {
        toast({
          title: "Error",
          description: "Failed to subscribe to notifications",
          variant: "destructive",
        });
      }
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
    if (isSubscribed && isEnabled && prevOccupancyRef.current !== room.currentOccupancy) {
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
              className={`ml-2 transition-transform duration-300 ${
                isAnimating ? 'animate-bell-ring' : ''
              } hover:scale-110 active:scale-95`}
              onClick={handleNotificationToggle}
              title={isSubscribed ? "Unsubscribe from notifications" : "Subscribe to notifications"}
            >
              {isSubscribed ? (
                <Bell className={`h-4 w-4 text-primary ${
                  isAnimating ? 'animate-bell-ring' : ''
                }`} />
              ) : (
                <BellOff className={`h-4 w-4 text-muted-foreground ${
                  isAnimating ? 'animate-bell-ring' : ''
                }`} />
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