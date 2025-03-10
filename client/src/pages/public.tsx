import { useQuery } from "@tanstack/react-query";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Room } from "@shared/schema";

export default function Public() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });

  const handleNotificationSignup = async (room: Room) => {
    try {
      await apiRequest("POST", "/api/notifications", {
        email,
        roomId: room.id,
        type: room.currentOccupancy >= room.maxCapacity ? "AVAILABLE" : "FULL",
      });

      toast({
        title: "Success",
        description: "You'll be notified when the room status changes",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign up for notifications",
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
          <Link href="/login">
            <Button variant="outline">Staff Login</Button>
          </Link>
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
                  Notify Me
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}