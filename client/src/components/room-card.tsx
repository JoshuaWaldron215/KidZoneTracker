import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { Room } from "@shared/schema";

interface RoomCardProps {
  room: Room;
}

export function RoomCard({ room }: RoomCardProps) {
  const [occupancy, setOccupancy] = useState(room.currentOccupancy.toString());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { role } = useAuth();

  const canManageStatus = ['admin', 'supervisor'].includes(role || '');

  const updateOccupancy = useMutation({
    mutationFn: async (newOccupancy: number) => {
      console.log('Updating occupancy:', {
        room: room.name,
        current: room.currentOccupancy,
        new: newOccupancy
      });

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const response = await apiRequest(
        "POST", 
        `/api/rooms/${room.id}/occupancy`,
        { occupancy: newOccupancy },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.json();
    },
    onSuccess: (updatedRoom) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });

      // Show immediate feedback based on room status
      const isFull = updatedRoom.currentOccupancy >= updatedRoom.maxCapacity;
      const wasFull = room.currentOccupancy >= room.maxCapacity;

      if (!wasFull && isFull) {
        // Room just became full
        toast({
          title: "Room Full Alert",
          description: `${room.name} is now at full capacity`,
          variant: "destructive",
          duration: 5000,
        });

        // Show browser notification if enabled
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("KidZone Room Full", {
            body: `${room.name} has reached full capacity`,
            icon: "/favicon.ico",
            requireInteraction: true
          });
        }
      } else if (wasFull && !isFull) {
        // Room just opened up
        toast({
          title: "Space Available",
          description: `${room.name} now has spots available`,
          variant: "default",
          duration: 5000,
        });

        // Show browser notification if enabled
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("KidZone Space Available", {
            body: `${room.name} now has spots available`,
            icon: "/favicon.ico",
            requireInteraction: true
          });
        }
      } else {
        // Regular update
        toast({
          title: "Update Successful",
          description: `${room.name} occupancy updated to ${updatedRoom.currentOccupancy}/${updatedRoom.maxCapacity}`,
          duration: 3000,
        });
      }
    },
    onError: (error) => {
      console.error('Failed to update occupancy:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update room occupancy",
        variant: "destructive",
      });
      // Reset the input to the current occupancy on error
      setOccupancy(room.currentOccupancy.toString());
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (isOpen: boolean) => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      await apiRequest(
        "POST", 
        `/api/rooms/${room.id}/status`,
        { isOpen },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: `${room.name} is now ${room.isOpen ? 'closed' : 'open'}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update room status",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOccupancy = parseInt(occupancy, 10);

    if (isNaN(newOccupancy)) {
      toast({
        title: "Error",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    if (newOccupancy < 0) {
      toast({
        title: "Error",
        description: "Occupancy cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (newOccupancy > room.maxCapacity) {
      toast({
        title: "Error",
        description: `Occupancy cannot exceed maximum capacity of ${room.maxCapacity}`,
        variant: "destructive",
      });
      return;
    }

    updateOccupancy.mutate(newOccupancy);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{room.name}</span>
          {canManageStatus && (
            <Switch
              checked={room.isOpen}
              onCheckedChange={(checked) => updateStatus.mutate(checked)}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="number"
            min="0"
            max={room.maxCapacity}
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value)}
          />
          <Button type="submit" disabled={updateOccupancy.isPending}>
            Update
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}