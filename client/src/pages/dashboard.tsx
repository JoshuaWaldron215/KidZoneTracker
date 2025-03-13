import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RoomCard } from "@/components/room-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";
import type { Room } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { clearAuth, role, hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLocation("/login");
    }
  }, [setLocation]);

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });

  const resetData = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/rooms/reset",
        undefined,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Data Reset",
        description: "All room data has been reset for the new day",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset room data",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    clearAuth();
    setLocation("/login");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all room data for the new day?")) {
      resetData.mutate();
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">KidZone Dashboard</h1>
            <p className="text-muted-foreground">Logged in as {role}</p>
          </div>
          <div className="flex gap-4">
            {hasPermission(["admin", "supervisor"]) && (
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={resetData.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${resetData.isPending ? 'animate-spin' : ''}`} />
                Reset Data
              </Button>
            )}
            {hasPermission(["admin"]) && (
              <Button variant="outline" onClick={() => setLocation("/staff")}>
                Manage Staff
              </Button>
            )}
            <Button variant="secondary" onClick={() => setLocation("/")}>
              View Public Page
            </Button>
            <Button onClick={handleLogout}>Logout</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </div>
    </div>
  );
}