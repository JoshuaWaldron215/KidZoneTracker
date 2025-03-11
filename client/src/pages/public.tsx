import { useQuery } from "@tanstack/react-query";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { Link } from "wouter";
import type { Room } from "@shared/schema";

export default function Public() {
  const { toast } = useToast();
  const isStaffLoggedIn = !!localStorage.getItem("token");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Initialize WebSocket connection
  useWebSocket();

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    // Reduced polling interval since we have WebSocket now
    refetchInterval: 1000 * 60 * 15, // 15 minutes as backup
  });

  useEffect(() => {
    // Check if browser notifications are supported
    if (!("Notification" in window)) {
      console.log("Browser notifications not supported");
      return;
    }

    // Check if we already have permission
    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  const enableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "You'll receive notifications when room status changes",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "Please enable notifications in your browser settings to receive alerts",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable notifications",
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

        <div className="mb-8">
          <Button 
            onClick={enableNotifications}
            disabled={notificationsEnabled}
            variant="outline"
          >
            {notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Enable browser notifications to get alerts when room status changes
          </p>
        </div>

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