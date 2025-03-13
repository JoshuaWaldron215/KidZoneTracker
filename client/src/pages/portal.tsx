import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Room } from "@shared/schema";

export default function Portal() {
  const { toast } = useToast();
  const [showLogin, setShowLogin] = useState(false);

  // Get initial room data
  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 1000 * 60, // Refresh every minute
  });

  // Setup WebSocket for real-time updates
  useWebSocket({
    onMessage: (data) => {
      if (data.type === 'ROOMS_UPDATE') {
        // React Query will automatically update the UI
        queryClient.setQueryData(["/api/rooms"], data.rooms);
      }
    },
  });

  if (isLoading) {
    return <div>Loading room availability...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">KidZone Availability</h1>
            <p className="text-muted-foreground">Real-time room status</p>
          </div>
          <Button onClick={() => setShowLogin(true)}>Member Login</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.filter(room => room.isOpen).map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Current Occupancy:</span>
                    <span className="font-medium">{room.currentOccupancy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Available Spots:</span>
                    <span className="font-medium">
                      {room.maxCapacity - room.currentOccupancy}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <span 
                      className={`font-medium ${
                        room.currentOccupancy >= room.maxCapacity 
                          ? 'text-destructive' 
                          : 'text-primary'
                      }`}
                    >
                      {room.currentOccupancy >= room.maxCapacity ? 'FULL' : 'AVAILABLE'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-6 border rounded-lg bg-muted/50">
          <h2 className="text-2xl font-semibold mb-4">Member Benefits</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              Real-time notifications when space becomes available
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              Save favorite rooms for quick access
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              Customize notification preferences
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              View historical occupancy patterns
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
