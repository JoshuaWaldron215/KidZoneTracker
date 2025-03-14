import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { User } from "@shared/schema";

export default function StaffManagement() {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("staff");
  const [notifyOnFull, setNotifyOnFull] = useState(true);
  const [notifyOnAvailable, setNotifyOnAvailable] = useState(true);
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: staffMembers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: hasPermission(["admin"]),
  });

  const createStaff = useMutation({
    mutationFn: async () => {
      const staffData = {
        username: newUsername,
        password: newPassword,
        isStaff: true,
        role: selectedRole,
        email,
        notifyOnFull,
        notifyOnAvailable,
      };

      console.log('Sending staff creation request:', {
        ...staffData,
        password: '[REDACTED]'
      });

      const response = await apiRequest(
        "POST",
        "/api/users",
        staffData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/json'
          },
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setNewUsername("");
      setNewPassword("");
      setEmail("");
      setSelectedRole("staff");
      setNotifyOnFull(true);
      setNotifyOnAvailable(true);
      toast({
        title: "Success",
        description: "Staff member created successfully",
      });
    },
    onError: (error) => {
      console.error('Staff creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create staff member",
        variant: "destructive",
      });
    },
  });

  const deleteStaff = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest(
        "DELETE",
        `/api/users/${userId}`,
        undefined,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete staff member",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createStaff.mutate();
  };

  const handleDelete = (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete ${username}?`)) {
      deleteStaff.mutate(userId);
    }
  };

  if (!hasPermission(["admin"])) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Staff Management</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button variant="secondary" onClick={() => setLocation("/")}>
              View Public Page
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* New Staff Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Staff Member</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    placeholder="Username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email for notifications"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="notify-full"
                      checked={notifyOnFull}
                      onCheckedChange={setNotifyOnFull}
                    />
                    <label htmlFor="notify-full">
                      Notify when rooms reach capacity
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="notify-available"
                      checked={notifyOnAvailable}
                      onCheckedChange={setNotifyOnAvailable}
                    />
                    <label htmlFor="notify-available">
                      Notify when rooms become available
                    </label>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createStaff.isPending}>
                  {createStaff.isPending ? "Creating..." : "Create Staff Member"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Staff List */}
          <Card>
            <CardHeader>
              <CardTitle>Current Staff Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffMembers.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{staff.username}</p>
                      <p className="text-sm text-muted-foreground capitalize">{staff.role}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(staff.id, staff.username)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}