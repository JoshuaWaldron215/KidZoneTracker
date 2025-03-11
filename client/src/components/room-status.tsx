import { AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import type { Room } from "@shared/schema";

interface RoomStatusProps {
  room: Room;
}

export function RoomStatus({ room }: RoomStatusProps) {
  const { showNotification } = useNotifications();
  const prevOccupancyRef = useRef(room.currentOccupancy);
  const occupancyPercentage = (room.currentOccupancy / room.maxCapacity) * 100;

  let statusColor = "bg-green-500";
  if (occupancyPercentage >= 90) {
    statusColor = "bg-red-500";
  } else if (occupancyPercentage >= 75) {
    statusColor = "bg-yellow-500";
  }

  useEffect(() => {
    // Show notifications when occupancy changes significantly
    if (prevOccupancyRef.current !== room.currentOccupancy) {
      const wasNearlyFull = prevOccupancyRef.current >= room.maxCapacity * 0.9;
      const isNearlyFull = room.currentOccupancy >= room.maxCapacity * 0.9;

      if (!wasNearlyFull && isNearlyFull) {
        // Room is becoming full
        showNotification(
          "KidZone Alert",
          {
            body: `${room.name} Almost Full - Only ${room.maxCapacity - room.currentOccupancy} spots remaining`,
            tag: "warning",
            icon: "/favicon.ico"
          }
        );
      } else if (wasNearlyFull && !isNearlyFull) {
        // Room has opened up
        showNotification(
          "KidZone Alert",
          {
            body: `${room.name} Has Space - ${room.maxCapacity - room.currentOccupancy} spots now available`,
            icon: "/favicon.ico"
          }
        );
      }

      prevOccupancyRef.current = room.currentOccupancy;
    }
  }, [room.currentOccupancy, room.maxCapacity, room.name, showNotification]);

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
          className="mt-3"
          indicatorColor={statusColor}
        />
      </CardContent>
    </Card>
  );
}