import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Progress } from "@/components/ui/progress";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

export default function Portal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showLogin, setShowLogin] = useState(false);

  // Get initial room data
  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    refetchInterval: 1000 * 60, // Refresh every minute as backup
  });

  // Setup WebSocket for real-time updates
  useWebSocket({
    onMessage: (data) => {
      if (data.type === 'ROOMS_UPDATE') {
        // Update the rooms data in React Query cache
        queryClient.setQueryData(["/api/rooms"], data.rooms);
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const response = await apiRequest(
        "POST",
        "/api/members/login",
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("memberToken", data.token);
      setLocation("/member");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      const response = await apiRequest(
        "POST",
        "/api/members/register",
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("memberToken", data.token);
      setLocation("/member");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading room availability...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">KidZone Parent Portal</h1>
            <p className="text-muted-foreground">Real-time room availability tracking</p>
          </div>
          <div className="flex gap-4 items-center">
            <Button variant="outline" onClick={() => setLocation("/login")}>
              Staff Login
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Member Login</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{showLogin ? "Login" : "Create Account"}</DialogTitle>
                </DialogHeader>
                {showLogin ? (
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(data => loginMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-col gap-4">
                        <Button type="submit" disabled={loginMutation.isPending}>
                          Login
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowLogin(false)}
                        >
                          Need an account? Register
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(data => registerMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage className="text-destructive">
                              {registerMutation.error?.message === "Email already in use" &&
                                "This email is already registered. Please login instead."}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-col gap-4">
                        <Button type="submit" disabled={registerMutation.isPending}>
                          {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowLogin(true)}
                        >
                          Already have an account? Login
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.filter(room => room.isOpen).map((room) => (
            <Card key={room.id} className={`
              transition-all duration-300
              ${room.currentOccupancy >= room.maxCapacity ? 'border-destructive/50' : 'border-primary/50'}
            `}>
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Current Capacity</span>
                      <span className="text-sm font-medium">
                        {room.currentOccupancy} / {room.maxCapacity}
                      </span>
                    </div>
                    <Progress
                      value={(room.currentOccupancy / room.maxCapacity) * 100}
                      className={`h-2.5 ${
                        room.currentOccupancy >= room.maxCapacity
                          ? 'bg-destructive/20'
                          : room.currentOccupancy >= room.maxCapacity * 0.8
                            ? 'bg-yellow-200'
                            : 'bg-primary/20'
                      }`}
                      indicatorClassName={`${
                        room.currentOccupancy >= room.maxCapacity
                          ? 'bg-destructive'
                          : room.currentOccupancy >= room.maxCapacity * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-primary'
                      }`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span>Available Spots</span>
                    <span className={`font-medium ${
                      room.currentOccupancy >= room.maxCapacity
                        ? 'text-destructive'
                        : 'text-primary'
                    }`}>
                      {room.maxCapacity - room.currentOccupancy}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span>Status</span>
                    <span className={`font-medium ${
                      room.currentOccupancy >= room.maxCapacity
                        ? 'text-destructive'
                        : 'text-primary'
                    }`}>
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