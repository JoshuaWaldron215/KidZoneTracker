import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { UserCircle2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });
      const data = await response.json();

      if (data.isStaff) {
        setAuth(data.token, data.role, data.isStaff);
        setLocation("/dashboard");
        toast({
          title: "Welcome",
          description: `Logged in as ${data.role}`,
        });
      } else {
        toast({
          title: "Error",
          description: "You don't have staff access",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-[1200px] grid gap-8 md:grid-cols-2">
        {/* Staff Login Form */}
        <Card className="w-full">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCircle2 className="w-8 h-8 text-primary" />
              <CardTitle>Staff Login</CardTitle>
            </div>
            <CardDescription>
              Access the staff dashboard to manage rooms and occupancy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login to Staff Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Parent Portal Info */}
        <Card className="w-full bg-primary/5 border-primary/20">
          <CardHeader className="space-y-2">
            <CardTitle>Parent Portal</CardTitle>
            <CardDescription>
              Access real-time room availability and manage your preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Features for Parents:</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Real-time room availability
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Favorite room tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Capacity notifications
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Customizable alerts
                </li>
              </ul>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/portal")}
            >
              Go to Parent Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}