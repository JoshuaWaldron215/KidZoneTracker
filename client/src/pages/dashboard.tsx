import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { RoomCard } from "@/components/room-card";
import { Button } from "@/components/ui/button";
import type { Room } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLocation("/login");
    }
  }, [setLocation]);

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    setLocation("/login");
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">KidZone Dashboard</h1>
          <div className="flex gap-4">
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