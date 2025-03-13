import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Bell, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Room, Member } from "@shared/schema";

export default function MemberPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: false,
    capacity: 80
  });

  // Get member data
  const { data: member } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  // Get rooms data with real-time updates
  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 1000 * 60, // Refresh every minute
  });

  // Get favorite rooms
  const { data: favorites = [] } = useQuery<number[]>({
    queryKey: ["/api/members/favorites"],
  });

  const toggleFavorite = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await apiRequest(
        favorites.includes(roomId) ? "DELETE" : "POST",
        `/api/members/favorites/${roomId}`,
        undefined,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("memberToken")}`,
          },
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members/favorites"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite rooms",
        variant: "destructive",
      });
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: typeof notificationPrefs) => {
      const response = await apiRequest(
        "POST",
        "/api/members/preferences",
        prefs,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("memberToken")}`,
          },
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification preferences updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!localStorage.getItem("memberToken")) {
      setLocation("/portal");
    }
  }, [setLocation]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Welcome, {member?.name}</h1>
            <p className="text-muted-foreground">View and manage your KidZone preferences</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem("memberToken");
              setLocation("/portal");
            }}
          >
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Room Status Cards */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Room Availability</h2>
            {rooms.filter(room => room.isOpen).map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{room.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite.mutate(room.id)}
                    >
                      <Heart 
                        className={`h-5 w-5 ${
                          favorites.includes(room.id) ? 'fill-current text-red-500' : ''
                        }`}
                      />
                    </Button>
                  </CardTitle>
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

          {/* Notification Preferences */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="font-medium">Email Notifications</label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about room availability
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.email}
                      onCheckedChange={(checked) => {
                        const newPrefs = { ...notificationPrefs, email: checked };
                        setNotificationPrefs(newPrefs);
                        updatePreferences.mutate(newPrefs);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="font-medium">SMS Notifications</label>
                      <p className="text-sm text-muted-foreground">
                        Get text messages for important updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.sms}
                      onCheckedChange={(checked) => {
                        const newPrefs = { ...notificationPrefs, sms: checked };
                        setNotificationPrefs(newPrefs);
                        updatePreferences.mutate(newPrefs);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-medium">Capacity Threshold</label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Notify me when room capacity is below:
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={notificationPrefs.capacity}
                        onChange={(e) => {
                          const newPrefs = { 
                            ...notificationPrefs, 
                            capacity: parseInt(e.target.value) 
                          };
                          setNotificationPrefs(newPrefs);
                          updatePreferences.mutate(newPrefs);
                        }}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Favorite Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click the heart icon on any room card to add it to your favorites.
                  You'll receive priority notifications for your favorite rooms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
