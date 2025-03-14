import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Bell, Heart, RefreshCcw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Room, Member, PhoneStatus } from "@shared/schema";

export default function MemberPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: false,
    capacity: 80,
    notifyOnFavorites: true
  });

  // Get member data
  const { data: member } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  // Get rooms data with real-time updates
  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 1000 * 60, // Refresh every minute as backup
  });

  // Get favorite rooms with proper loading state and error handling
  const { 
    data: favorites = [], 
    isLoading: favoritesLoading,
    error: favoritesError 
  } = useQuery<number[]>({
    queryKey: ["/api/members/favorites"],
    enabled: !!localStorage.getItem("memberToken"), // Only fetch if logged in
    onError: (error) => {
      console.error('Failed to fetch favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorite rooms",
        variant: "destructive",
      });
    }
  });

  // Add phone status query
  const { data: phoneStatus } = useQuery<PhoneStatus>({
    queryKey: ["/api/members/phone-status"],
    enabled: notificationPrefs.sms && !!member?.phone,
  });

  // Sort rooms to show favorites first (safely handle undefined favorites)
  const sortedRooms = [...rooms].sort((a, b) => {
    const favList = favorites || [];
    const aIsFavorite = favList.includes(a.id);
    const bIsFavorite = favList.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });

  // Setup WebSocket for real-time updates
  useWebSocket({
    onMessage: (data) => {
      if (data.type === 'ROOMS_UPDATE') {
        queryClient.setQueryData(["/api/rooms"], data.rooms);

        // Show toast notification for favorite rooms
        if (data.rooms && favorites.includes(data.rooms[0]?.id)) {
          const room = data.rooms[0];
          if (room.currentOccupancy < room.maxCapacity) {
            toast({
              title: "Favorite Room Available",
              description: `${room.name} now has space available!`,
            });
          }
        }
      }
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (roomId: number) => {
      const method = favorites.includes(roomId) ? "DELETE" : "POST";
      const response = await apiRequest(
        method,
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
      toast({
        title: "Success",
        description: favorites.includes(roomId) ? 
          "Room removed from favorites" : 
          "Room added to favorites",
      });
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
      console.log('Sending preferences update:', prefs);
      const response = await apiRequest(
        "POST",
        "/api/members/preferences",
        prefs,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("memberToken")}`,
            'Content-Type': 'application/json'
          },
        }
      );
      const data = await response.json();

      // If phone verification required, show message
      if (data.requiresVerification) {
        toast({
          title: "Phone Verification Required",
          description: "Your phone number needs to be verified before enabling SMS notifications. Please contact support to verify your number.",
          variant: "destructive",
        });
        // Revert SMS toggle
        return { ...prefs, sms: false };
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification preferences updated",
      });
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  const testSMS = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/members/test-sms",
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
      toast({
        title: "Test SMS Sent",
        description: "Check your phone for a test message",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send test SMS. Please verify your phone number.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!localStorage.getItem("memberToken")) {
      setLocation("/portal");
    }
  }, [setLocation]);

  if (roomsLoading || favoritesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If there's an error with favorites, show rooms without favorite functionality
  const showFavorites = !favoritesError && Array.isArray(favorites);

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
            {sortedRooms.filter(room => room.isOpen).map((room) => (
              <Card 
                key={room.id}
                className={`
                  transition-all duration-300 hover:shadow-lg relative
                  ${room.currentOccupancy >= room.maxCapacity ? 'border-destructive/50' : 'border-primary/50'}
                  ${showFavorites && favorites.includes(room.id) ? 'bg-primary/5' : ''}
                `}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {showFavorites && favorites.includes(room.id) && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Favorite
                        </span>
                      )}
                      {room.name}
                    </span>
                    {showFavorites && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite.mutate(room.id)}
                        className={`
                          transition-transform hover:scale-110
                          ${toggleFavorite.isPending ? 'opacity-50' : ''}
                        `}
                        disabled={toggleFavorite.isPending}
                      >
                        <Heart 
                          className={`
                            h-5 w-5 transition-all duration-300
                            ${favorites.includes(room.id) ? 'fill-current text-red-500 scale-110' : 'scale-100'}
                          `}
                        />
                      </Button>
                    )}
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
                        {phoneStatus && !phoneStatus.verified && (
                          <span className="block text-destructive">
                            * Phone number needs verification
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={notificationPrefs.sms}
                        onCheckedChange={(checked) => {
                          const newPrefs = { ...notificationPrefs, sms: checked };
                          setNotificationPrefs(newPrefs);
                          updatePreferences.mutate(newPrefs);
                        }}
                      />
                      {notificationPrefs.sms && member?.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testSMS.mutate()}
                          disabled={testSMS.isPending || (phoneStatus && !phoneStatus.verified)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Test SMS
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="font-medium">Favorite Room Alerts</label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when favorite rooms have availability
                      </p>
                    </div>
                    <Switch
                      checked={notificationPrefs.notifyOnFavorites}
                      onCheckedChange={(checked) => {
                        const newPrefs = { ...notificationPrefs, notifyOnFavorites: checked };
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
          </div>
        </div>
      </div>
    </div>
  );
}