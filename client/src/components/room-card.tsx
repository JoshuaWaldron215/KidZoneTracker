import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { ChartBar } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { RoomAnalytics } from "@/components/room-analytics";
import type { Room } from "@shared/schema";

interface RoomCardProps {
  room: Room;
}

export function RoomCard({ room }: RoomCardProps) {
  const [occupancy, setOccupancy] = useState(room.currentOccupancy.toString());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { role } = useAuth();

  const canManageStatus = ['admin', 'supervisor'].includes(role || '');

  const updateOccupancy = useMutation({
    mutationFn: async (newOccupancy: number) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: `Updated ${room.name} occupancy`,
        duration: 3000,
      });
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

  const isFull = room.currentOccupancy >= room.maxCapacity;
  const spotsRemaining = room.maxCapacity - room.currentOccupancy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{room.name}</span>
          <div className="flex items-center gap-2">
            {canManageStatus && (
              <Switch
                checked={room.isOpen}
                onCheckedChange={(checked) => updateStatus.mutate(checked)}
              />
            )}
            <Drawer>
              <DrawerTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowAnalytics(true)}
                >
                  <ChartBar className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                  <RoomAnalytics room={room} />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className={`text-sm font-medium ${isFull ? 'text-destructive' : 'text-primary'}`}>
            {isFull ? 'FULL' : `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
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