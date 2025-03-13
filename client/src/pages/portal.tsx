import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import type { Room } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
    refetchInterval: 1000 * 60, // Refresh every minute
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
    return <div>Loading room availability...</div>;
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
                            <FormMessage />
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
                          Create Account
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
            <Card key={room.id}>
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
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