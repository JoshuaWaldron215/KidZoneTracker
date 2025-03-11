import { useQuery } from "@tanstack/react-query";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";
import type { Room } from "@shared/schema";

export default function Public() {
  const isStaffLoggedIn = !!localStorage.getItem("token");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  // Initialize WebSocket connection
  useWebSocket();

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    // Reduced polling interval since we have WebSocket now
    refetchInterval: 1000 * 60 * 15, // 15 minutes as backup
  });

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
      console.log('Current notification permission:', Notification.permission);
    }
  }, []);

  const enableNotifications = async () => {
    try {
      if (!("Notification" in window)) {
        toast({
          title: "Notifications Not Available",
          description: "Your browser doesn't support notifications. Updates will show in the app.",
          variant: "destructive",
        });
        return;
      }

      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);

      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "You'll receive alerts when room status changes",
        });

        // Test notification
        new Notification("KidZone Notifications Active", {
          body: "You will now receive alerts about room availability",
          icon: "/favicon.ico"
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "Please enable notifications in your browser settings to receive alerts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

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

        {"Notification" in window && (
          <div className="mb-8">
            <Button 
              onClick={enableNotifications}
              disabled={notificationsEnabled}
              variant="outline"
            >
              {notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}
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