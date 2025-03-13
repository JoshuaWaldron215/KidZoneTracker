import { Router, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Portal from "@/pages/portal";
import Login from "@/pages/login";
import StaffManagement from "@/pages/staff-management";
import MemberPortal from "@/pages/member-portal";
import { ErrorBoundary } from "@/components/error-boundary";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Portal} />
      <Route path="/portal" component={Portal} />
      <Route path="/member" component={MemberPortal} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/staff" component={StaffManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <AppRoutes />
        </Router>
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;