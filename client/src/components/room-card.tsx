import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Room } from "@shared/schema";

interface RoomCardProps {
  room: Room;
}

export function RoomCard({ room }: RoomCardProps) {
  const [occupancy, setOccupancy] = useState(room.currentOccupancy.toString());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateOccupancy = useMutation({
    mutationFn: async (newOccupancy: number) => {
      await apiRequest("POST", `/api/rooms/${room.id}/occupancy`, {
        occupancy: newOccupancy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room occupancy updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update room occupancy",
        variant: "destructive",
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (isOpen: boolean) => {
      await apiRequest("POST", `/api/rooms/${room.id}/status`, { isOpen });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room status updated",
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
    const newOccupancy = parseInt(occupancy);
    if (isNaN(newOccupancy) || newOccupancy < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number",
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
          <Switch
            checked={room.isOpen}
            onCheckedChange={(checked) => updateStatus.mutate(checked)}
          />
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
