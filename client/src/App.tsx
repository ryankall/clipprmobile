import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import Clients from "@/pages/clients";
import ClientProfile from "@/pages/client-profile";
import Gallery from "@/pages/gallery";
import Settings from "@/pages/settings";
import Invoice from "@/pages/invoice";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:id" component={ClientProfile} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/settings" component={Settings} />
      <Route path="/invoice/:id?" component={Invoice} />
      <Route path="/checkout/:invoiceId" component={Checkout} />
      <Route component={NotFound} />
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
