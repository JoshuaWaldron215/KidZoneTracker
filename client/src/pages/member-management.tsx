import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import type { Member } from "@shared/schema";
import { ArrowLeft } from "lucide-react";

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
                  {member.name}
                  <span className="text-sm font-normal text-muted-foreground">
                    {member.email}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Phone:</span>
                    <span>{member.phone || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Account Created:</span>
                    <span>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Verified:</span>
                    <span>{member.isVerified ? "Yes" : "No"}</span>
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
