import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  Receipt,
  Scissors,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MobileDashboard from "./components/mobile-dashboard";
import MobileSettings from "./components/mobile-settings";
import MobileCalendar from "./components/mobile-calendar";
import MobileClients from "./components/mobile-clients";
import MobileInvoice from "./components/mobile-invoice";

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Configure fetcher function
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// Set up the default query function
queryClient.setQueryDefaults(['*'], {
  queryFn: ({ queryKey }) => {
    const [url] = queryKey as [string];
    return makeAuthenticatedRequest(url);
  },
});

// Authentication screen component
function MobileAuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');

  const signInMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      window.location.reload();
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (userData: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string; 
      phone: string; 
      businessName?: string; 
    }) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      window.location.reload();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      signUpMutation.mutate({ 
        email, 
        password, 
        firstName, 
        lastName, 
        phone, 
        businessName 
      });
    } else {
      signInMutation.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-card rounded-lg border border-steel/20 p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-8 h-8 text-dark-bg" />
          </div>
          <h1 className="text-2xl font-bold text-white">Clippr</h1>
          <p className="text-steel">Simplifying the business side of your style game.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white">First Name</Label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Last Name</Label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-white">Phone Number</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div>
                <Label className="text-white">Business Name (Optional)</Label>
                <Input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="Your Barber Shop"
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-white">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-dark-bg border-steel/20 text-white placeholder-steel"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <Label className="text-white">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-dark-bg border-steel/20 text-white placeholder-steel pr-10"
                placeholder="Enter your password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3 py-2 text-steel hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={signInMutation.isPending || signUpMutation.isPending}
            className="w-full bg-gold text-dark-bg font-medium hover:bg-gold/90 disabled:opacity-50"
          >
            {signInMutation.isPending || signUpMutation.isPending 
              ? 'Please wait...' 
              : isSignUp 
                ? 'Create Account' 
                : 'Sign In'
            }
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-gold hover:text-gold/80 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main mobile app component
function MobileApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <MobileAuthScreen />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Main Content */}
      <div className="pb-16"> {/* Bottom margin for navigation */}
        {currentPage === 'dashboard' && <MobileDashboard />}
        {currentPage === 'calendar' && <MobileCalendar />}
        {currentPage === 'clients' && <MobileClients />}
        {currentPage === 'invoice' && <MobileInvoice />}
        {currentPage === 'settings' && <MobileSettings />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-card border-t border-steel/20">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-around items-center py-2">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors tap-feedback ${
                currentPage === 'dashboard' 
                  ? 'text-gold bg-gold/10' 
                  : 'text-steel hover:text-white'
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs mt-1">Home</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('calendar')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors tap-feedback ${
                currentPage === 'calendar' 
                  ? 'text-gold bg-gold/10' 
                  : 'text-steel hover:text-white'
              }`}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs mt-1">Calendar</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('clients')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors tap-feedback ${
                currentPage === 'clients' 
                  ? 'text-gold bg-gold/10' 
                  : 'text-steel hover:text-white'
              }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs mt-1">Clients</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('invoice')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors tap-feedback ${
                currentPage === 'invoice' 
                  ? 'text-gold bg-gold/10' 
                  : 'text-steel hover:text-white'
              }`}
            >
              <Receipt className="w-6 h-6" />
              <span className="text-xs mt-1">Invoice</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('settings')}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors tap-feedback ${
                currentPage === 'settings' 
                  ? 'text-gold bg-gold/10' 
                  : 'text-steel hover:text-white'
              }`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-xs mt-1">Settings</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

// Root App component with QueryClient provider
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileApp />
    </QueryClientProvider>
  );
}