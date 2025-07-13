import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Home, 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  DollarSign,
  User,
  Bell,
  Camera,
  Plus,
  X,
  Search,
  Eye,
  EyeOff,
  LogOut,
  ChevronDown,
  ChevronUp,
  Receipt
} from "lucide-react";

// Type definitions
interface DashboardStats {
  dailyEarnings: string;
  appointmentCount: number;
}

interface AppointmentWithRelations {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'expired';
  duration: number;
  client?: { name: string; phone: string };
  service?: { name: string; price: string };
  price: string;
}

interface GalleryPhoto {
  id: number;
  userId: number;
  clientId: number;
  photoUrl: string;
  description?: string;
}

interface ClientWithRelations {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalVisits?: number;
  totalSpent?: number;
  loyaltyStatus?: string;
  createdAt: string;
}

interface Service {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  description?: string;
  isActive: boolean;
}

interface Invoice {
  id: number;
  userId: number;
  clientId: number;
  total: string;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  items: Array<{
    serviceName: string;
    quantity: number;
    price: string;
  }>;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  profilePhotoUrl?: string;
}

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
      // Store token in localStorage
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
      // Store token in localStorage
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">Clippr</h1>
          <p className="text-gray-400">Mobile Barber Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Business Name (Optional)
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="Your Barber Shop"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={signInMutation.isPending || signUpMutation.isPending}
            className="w-full bg-amber-500 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signInMutation.isPending || signUpMutation.isPending 
              ? 'Please wait...' 
              : isSignUp 
                ? 'Create Account' 
                : 'Sign In'
            }
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-500 hover:text-amber-400 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Settings page component
function MobileSettingsPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
    queryFn: () => makeAuthenticatedRequest('/api/user/profile'),
    enabled: isAuthenticated,
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      await fetch('/api/auth/signout', { 
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
    },
    onSuccess: () => {
      // Clear token from localStorage
      localStorage.removeItem('token');
      queryClient.clear();
      window.location.reload();
    },
  });

  return (
    <div className="space-y-6 pb-4">
      {/* Profile Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4 mt-4">
        <div className="p-6 text-center">
          <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            {user?.profilePhotoUrl ? (
              <img 
                src={user.profilePhotoUrl} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className="w-8 h-8 text-gray-900" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-gray-400">{user?.email}</p>
          {user?.businessName && (
            <p className="text-amber-500 text-sm mt-1">{user.businessName}</p>
          )}
        </div>
      </div>

      {/* Settings Sections */}
      <div className="mx-4 space-y-4">
        {/* Account Settings */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <button
            onClick={() => setShowAccountSettings(!showAccountSettings)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-amber-500" />
              <span className="text-white font-medium">Account Settings</span>
            </div>
            {showAccountSettings ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {showAccountSettings && (
            <div className="border-t border-gray-700 p-4 space-y-3">
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Edit Profile
              </button>
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Change Password
              </button>
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Phone Verification
              </button>
            </div>
          )}
        </div>

        {/* Business Settings */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <button
            onClick={() => setShowBusinessSettings(!showBusinessSettings)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <Scissors className="w-5 h-5 text-amber-500" />
              <span className="text-white font-medium">Business Settings</span>
            </div>
            {showBusinessSettings ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {showBusinessSettings && (
            <div className="border-t border-gray-700 p-4 space-y-3">
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Working Hours
              </button>
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Service Management
              </button>
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Booking Settings
              </button>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <button
            onClick={() => setShowNotificationSettings(!showNotificationSettings)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-amber-500" />
              <span className="text-white font-medium">Notifications</span>
            </div>
            {showNotificationSettings ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {showNotificationSettings && (
            <div className="border-t border-gray-700 p-4 space-y-3">
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Push Notifications
              </button>
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                Email Alerts
              </button>
              <button className="w-full text-left p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                SMS Notifications
              </button>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <button
            onClick={() => signOutMutation.mutate()}
            disabled={signOutMutation.isPending}
            className="w-full p-4 flex items-center space-x-3 text-left text-red-400 hover:bg-gray-700 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">
              {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function for authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` })
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Main Mobile App Component
export default function MobileApp() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Mobile app states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'clients' | 'services' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Form states
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Refs for dropdowns
  const notificationRef = useRef<HTMLDivElement>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Clear invalid token
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Click outside handler for notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Data queries
  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard'],
    queryFn: () => makeAuthenticatedRequest('/api/dashboard'),
    enabled: isAuthenticated,
  });

  const { data: todaysAppointments } = useQuery<AppointmentWithRelations[]>({
    queryKey: ['/api/appointments/today'],
    queryFn: () => makeAuthenticatedRequest('/api/appointments/today'),
    enabled: isAuthenticated,
  });

  const { data: clients } = useQuery<ClientWithRelations[]>({
    queryKey: ['/api/clients'],
    queryFn: () => makeAuthenticatedRequest('/api/clients'),
    enabled: isAuthenticated,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: () => makeAuthenticatedRequest('/api/services'),
    enabled: isAuthenticated,
  });

  const { data: recentPhotos } = useQuery<GalleryPhoto[]>({
    queryKey: ['/api/gallery'],
    queryFn: () => makeAuthenticatedRequest('/api/gallery'),
    enabled: isAuthenticated,
  });

  // Handle client form changes
  const handleClientFormChange = (field: keyof typeof clientForm, value: string) => {
    setClientForm(prev => ({ ...prev, [field]: value }));
  };

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: typeof clientForm) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error('Failed to create client');
      return response.json();
    },
    onSuccess: () => {
      setIsClientDialogOpen(false);
      setClientForm({ name: '', phone: '', email: '', address: '', notes: '' });
      // Refresh clients list
      window.location.reload();
    },
  });

  // Filter clients based on search term
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) || [];

  // Mock notifications
  const unreadNotifications = [
    { id: 1, message: 'New appointment request from John Doe', time: '2 min ago' },
    { id: 2, message: 'Payment received for Invoice #123', time: '1 hour ago' },
    { id: 3, message: 'Client review submitted', time: '3 hours ago' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <MobileAuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Main Content */}
      <main className="p-4">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 pb-4">
            {/* Header with Notifications */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4 mt-4">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-gray-900" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-amber-500">Clippr</h1>
                    <p className="text-sm text-gray-400">Mobile Barber Dashboard</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative" ref={notificationRef}>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative text-gray-400 hover:text-white p-2"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadNotifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadNotifications.length}
                        </span>
                      )}
                    </button>
                    
                    {/* Notifications Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                        <div className="p-4 border-b border-gray-700">
                          <h3 className="font-semibold text-white">Notifications</h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {unreadNotifications.map((notification) => (
                            <div key={notification.id} className="p-3 border-b border-gray-700 hover:bg-gray-700">
                              <p className="text-white text-sm">{notification.message}</p>
                              <p className="text-gray-400 text-xs mt-1">{notification.time}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mx-4">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Today's Earnings</p>
                    <p className="text-2xl font-bold text-amber-500">
                      ${dashboardStats?.dailyEarnings || '0.00'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Appointments</p>
                    <p className="text-2xl font-bold text-amber-500">
                      {dashboardStats?.appointmentCount || 0}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Today's Appointments */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Today's Appointments</h3>
              </div>
              <div className="p-4">
                {todaysAppointments && todaysAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {todaysAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-3 bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{appointment.client?.name}</p>
                            <p className="text-sm text-gray-400">{appointment.service?.name}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-amber-500">{appointment.price}</p>
                            <p className="text-xs text-gray-400">{appointment.duration}min</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No appointments today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Gallery Photos */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Recent Work</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {recentPhotos && recentPhotos.length > 0 ? (
                    recentPhotos.slice(0, 6).map((photo) => (
                      <div key={photo.id} className="bg-gray-700 rounded-lg p-2">
                        <img 
                          src={photo.photoUrl} 
                          alt={photo.description || "Portfolio work"} 
                          className="w-full h-20 object-cover rounded" 
                        />
                        <div className="text-xs text-center mt-1 text-gray-400">
                          {photo.description || 'Styling'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-8 text-gray-400">
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No photos uploaded yet</p>
                      <button className="text-amber-500 text-sm mt-2">
                        Add your first photo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 pb-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4 mt-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Calendar</h3>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Calendar view coming soon</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clients */}
        {activeTab === 'clients' && (
          <div className="space-y-6 pb-4">
            {/* Client Stats */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4 mt-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Client Analytics</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">{clients?.length || 0}</div>
                    <div className="text-xs text-gray-400">Total Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {clients?.filter(c => c.loyaltyStatus === 'vip').length || 0}
                    </div>
                    <div className="text-xs text-gray-400">VIP Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {clients?.filter(c => c.totalVisits && c.totalVisits > 0).length || 0}
                    </div>
                    <div className="text-xs text-gray-400">Active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Add Client */}
            <div className="mx-4 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
                  />
                </div>
                <button
                  onClick={() => setIsClientDialogOpen(true)}
                  className="bg-amber-500 text-gray-900 p-2 rounded-lg hover:bg-amber-600"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Clients List */}
              <div className="space-y-3">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div key={client.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                            <span className="text-gray-900 font-medium text-sm">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{client.name}</p>
                            <p className="text-sm text-gray-400">{client.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-amber-500">
                            {client.totalVisits || 0} visits
                          </p>
                          <p className="text-xs text-gray-400">
                            ${client.totalSpent || '0'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No clients found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Services (Invoices) */}
        {activeTab === 'services' && (
          <div className="space-y-6 pb-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4 mt-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Invoices</h3>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-gray-400">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices yet</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <MobileSettingsPage isAuthenticated={isAuthenticated} />
        )}
      </main>

      {/* Add Client Dialog */}
      {isClientDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-white font-semibold">Add New Client</h3>
              <button
                onClick={() => setIsClientDialogOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Name *</label>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={(e) => handleClientFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="Client's full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Phone</label>
                <input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => handleClientFormChange('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="Phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Email</label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => handleClientFormChange('email', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="Email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Address</label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={(e) => handleClientFormChange('address', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="Client's address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Notes</label>
                <textarea
                  value={clientForm.notes}
                  onChange={(e) => handleClientFormChange('notes', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="Any special notes about the client"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsClientDialogOpen(false)}
                  className="flex-1 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-3 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createClientMutation.mutate(clientForm)}
                  disabled={createClientMutation.isPending || !clientForm.name}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-900 py-3 px-4 rounded-lg font-medium disabled:opacity-50"
                >
                  {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around py-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'clients', icon: Users, label: 'Clients' },
            { id: 'services', icon: Receipt, label: 'Invoices' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                activeTab === id
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}