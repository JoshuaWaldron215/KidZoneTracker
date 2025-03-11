import { useQuery } from "@tanstack/react-query";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useNotifications } from "@/hooks/use-notifications";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Room } from "@shared/schema";

export default function Public() {
  const isStaffLoggedIn = !!localStorage.getItem("token");
  const { isSupported, isEnabled, requestPermission } = useNotifications();

  // Initialize WebSocket connection
  useWebSocket();

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    // Reduced polling interval since we have WebSocket now
    refetchInterval: 1000 * 60 * 15, // 15 minutes as backup
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10 px-4">
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

        {isSupported && (
          <div className="mb-8">
            <Button 
              onClick={requestPermission}
              disabled={isEnabled}
              variant="outline"
            >
              {isEnabled ? "Notifications Enabled" : "Enable Notifications"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Get instant alerts when room status changes
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id}>
              <RoomStatus room={room} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}