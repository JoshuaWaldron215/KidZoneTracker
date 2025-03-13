import { AlertCircle, Users, Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import type { Room } from "@shared/schema";

interface RoomStatusProps {
  room: Room;
}

export function RoomStatus({ room }: RoomStatusProps) {
  const { toast } = useToast();
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
      // Start animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);

      // If already subscribed, unsubscribe
      if (isSubscribed) {
        const success = await unsubscribeFromRoom(room.id);
        if (success) {
          toast({
            title: "Notifications Disabled",
            description: `You won't receive updates for ${room.name}`,
          });
        }
        return;
      }

      // If notifications aren't enabled, request permission
      if (!isEnabled) {
        const granted = await requestPermission();
        if (!granted) return;
      }

      // Subscribe to room
      const success = await subscribeToRoom(room.id);
      if (success) {
        toast({
          title: "Notifications Enabled",
          description: `You'll receive updates for ${room.name}`,
        });
      }
    } catch (error) {
      console.error('Notification toggle failed:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    }
  };

  // Monitor occupancy changes
  useEffect(() => {
    if (isSubscribed && prevOccupancyRef.current !== room.currentOccupancy) {
      const spotsRemaining = room.maxCapacity - room.currentOccupancy;
      const message = room.currentOccupancy >= room.maxCapacity 
        ? `${room.name} is now FULL`
        : `${room.name}: ${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining`;

      toast({
        title: "Room Update",
        description: message,
        variant: room.currentOccupancy >= room.maxCapacity ? "destructive" : "default",
      });

      prevOccupancyRef.current = room.currentOccupancy;
    }
  }, [room.currentOccupancy, room.maxCapacity, room.name, isSubscribed, toast]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {room.name}
          {isSupported && (
            <Button
              variant="ghost"
              size="sm"
              className={`transition-transform duration-300 ${
                isAnimating ? 'animate-bell-ring' : ''
              }`}
              onClick={handleNotificationToggle}
              title={isSubscribed ? "Disable notifications" : "Enable notifications"}
            >
              {isSubscribed ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {isSubscribed ? "Disable notifications" : "Enable notifications"}
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