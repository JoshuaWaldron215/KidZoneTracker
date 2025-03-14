import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import type { Member } from "@shared/schema";
import { ArrowLeft, CheckCircle, XCircle, Phone, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MemberManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  // Get all members
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    },
  });

  // Toggle verification status mutation
  const toggleVerification = useMutation({
    mutationFn: async ({ memberId, isVerified }: { memberId: number; isVerified: boolean }) => {
      const response = await apiRequest(
        "POST",
        `/api/members/${memberId}/verify`,
        { isVerified },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Success",
        description: "Member verification status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update member verification",
        variant: "destructive",
      });
    },
  });

  if (!hasPermission(["admin", "supervisor"])) {
    setLocation("/dashboard");
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Member Management</h1>
            <p className="text-muted-foreground">View and manage member accounts</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid gap-6">
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {member.name}
                    {member.isVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant={member.isVerified ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleVerification.mutate({
                        memberId: member.id,
                        isVerified: !member.isVerified
                      })}
                      disabled={toggleVerification.isPending}
                    >
                      {member.isVerified ? "Revoke Verification" : "Verify Member"}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{member.email}</span>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {member.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{member.phone || "Not provided"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Account Created:</span>
                      <p>{new Date(member.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span>
                      <p>{new Date(member.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Notification Preferences</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email Notifications:</span>
                        <p>{member.notificationPreferences?.email ? "Enabled" : "Disabled"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SMS Notifications:</span>
                        <p>{member.notificationPreferences?.sms ? "Enabled" : "Disabled"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Capacity Alert:</span>
                        <p>{member.notificationPreferences?.capacity}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}