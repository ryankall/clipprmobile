import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar-new";
import Clients from "@/pages/clients";
import ClientProfile from "@/pages/client-profile";
import AppointmentNew from "@/pages/appointment-new";
import Gallery from "@/pages/gallery";
import Messages from "@/pages/messages";
import Settings from "@/pages/settings";
import HelpSupport from "@/pages/help-support";
import Invoice from "@/pages/invoice";
import Checkout from "@/pages/checkout";
import EnhancedBookingPage from "@/pages/book-new";
import MobileApp from "@/pages/mobile";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Handle URL token from OAuth redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    
    if (token) {
      localStorage.setItem("token", token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Force refresh to load user data
      window.location.reload();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-charcoal dark:to-steel/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-steel dark:text-steel/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public booking page - accessible without authentication */}
      <Route path="/book/:barberInfo" component={EnhancedBookingPage} />
      
      {/* Mobile interface - accessible without authentication */}
      <Route path="/mobile" component={MobileApp} />
      
      {/* Show auth page when not authenticated */}
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Auth} />
          <Route component={Auth} />
        </>
      ) : (
        <>
          {/* Protected routes - require authentication */}
          <Route path="/" component={Dashboard} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/:id" component={ClientProfile} />
          <Route path="/appointments/new" component={AppointmentNew} />
          <Route path="/gallery" component={Gallery} />
          <Route path="/messages" component={Messages} />
          <Route path="/settings" component={Settings} />
          <Route path="/help" component={HelpSupport} />
          <Route path="/invoice/:id?" component={Invoice} />
          <Route path="/checkout/:invoiceId" component={Checkout} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="app-container dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
