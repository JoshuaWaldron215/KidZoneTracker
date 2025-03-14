import { AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Room } from "@shared/schema";

interface RoomStatusProps {
  room: Room;
}

export function RoomStatus({ room }: RoomStatusProps) {
  const { toast } = useToast();
  const prevOccupancyRef = useRef(room.currentOccupancy);

  const occupancyPercentage = (room.currentOccupancy / room.maxCapacity) * 100;

  let statusColor = "bg-green-500";
  if (occupancyPercentage >= 90) {
    statusColor = "bg-red-500";
  } else if (occupancyPercentage >= 75) {
    statusColor = "bg-yellow-500";
  }

  // Monitor occupancy changes
  useEffect(() => {
    if (prevOccupancyRef.current !== room.currentOccupancy) {
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
  }, [room.currentOccupancy, room.maxCapacity, room.name, toast]);

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
          className={`mt-3 ${statusColor} transition-all duration-500`}
        />
      </CardContent>
    </Card>
  );
}