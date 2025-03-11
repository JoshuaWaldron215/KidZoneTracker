import { useQuery } from "@tanstack/react-query";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Room } from "@shared/schema";

export default function Public() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const isStaffLoggedIn = !!localStorage.getItem("token");

  // Initialize WebSocket connection
  useWebSocket();

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    // Reduced polling interval since we have WebSocket now
    refetchInterval: 1000 * 60 * 15, // 15 minutes as backup
  });

  const handleNotificationSignup = async (room: Room) => {
    try {
      await apiRequest("POST", "/api/notifications", {
        email,
        roomId: room.id,
        type: room.currentOccupancy >= room.maxCapacity ? "AVAILABLE" : "FULL",
      });

      toast({
        title: "Notification Preferences Saved",
        description: `We'll show you notifications for ${room.name} status changes`,
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">YMCA KidZone Status</h1>
          {isStaffLoggedIn ? (
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline">Staff Login</Button>
            </Link>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id} className="space-y-4">
              <RoomStatus room={room} />

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email for notifications"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button onClick={() => handleNotificationSignup(room)}>
                  Save Preferences
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}