import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  Calendar, 
  Users, 
  Scissors, 
  Settings,
  MessageSquare,
  Camera,
  Bell,
  Eye,
  EyeOff
} from "lucide-react";

// Import mobile page components
import MobileDashboard from "./pages/dashboard";
import MobileCalendar from "./pages/calendar";
import MobileClients from "./pages/clients";
import MobileServices from "./pages/services";
import MobileMessages from "./pages/messages";
import MobileGallery from "./pages/gallery";

// Type definitions
interface UnreadCount {
  count: number;
}

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  phoneVerified?: boolean;
  photoUrl?: string;
}

// Main Mobile App Component
export default function MobileApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch unread message count for notifications
  const { data: unreadCount } = useQuery<UnreadCount>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 30000, // 30 seconds
  });

  // Fetch user data for authentication check
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Authentication loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication screen
  if (!user) {
    return <MobileAuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Main Content */}
      <main className="pb-20 px-4 pt-6 max-w-md mx-auto">
        {/* Dashboard */}
        {activeTab === 'dashboard' && <MobileDashboard />}

        {/* Calendar */}
        {activeTab === 'calendar' && <MobileCalendar />}

        {/* Clients */}
        {activeTab === 'clients' && <MobileClients />}

        {/* Services */}
        {activeTab === 'services' && <MobileServices />}

        {/* Messages */}
        {activeTab === 'messages' && <MobileMessages />}

        {/* Gallery */}
        {activeTab === 'gallery' && <MobileGallery />}

        {/* Settings */}
        {activeTab === 'settings' && <MobileSettingsPage />}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around py-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'clients', icon: Users, label: 'Clients' },
            { id: 'messages', icon: MessageSquare, label: 'Messages', badge: unreadCount?.count },
            { id: 'services', icon: Scissors, label: 'Services' },
            { id: 'gallery', icon: Camera, label: 'Gallery' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center p-2 min-w-0 flex-1 ${
                  isActive ? 'text-amber-500' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 truncate">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Mobile Authentication Screen Component
function MobileAuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    businessName: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || 'Authentication failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const formatPhoneNumber = (value: string): string => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Scissors className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-3xl font-bold text-white">Clippr</h1>
          <p className="text-gray-400 mt-2">Professional barber & stylist management</p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isSignUp ? 'Start managing your business today' : 'Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Business name"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
                  required
                />

                <input
                  type="tel"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
                  required
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 py-3 rounded-lg font-semibold transition-colors"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-500 hover:text-amber-400 text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Create one"
              }
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-500 text-xs">
            Simplifying the business side of your style game.
          </p>
        </div>
      </div>
    </div>
  );
}

// Mobile Settings Page Component
function MobileSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showNotificationCard, setShowNotificationCard] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState({
    newBookingRequests: true,
    appointmentConfirmations: true,
    appointmentCancellations: true,
    upcomingReminders: true,
    soundEffects: true,
  });
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    serviceArea: '',
    about: '',
    timezone: 'America/New_York'
  });

  // Fetch user profile data
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/user/profile"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch blocked clients
  const { data: blockedClients = [] } = useQuery<any[]>({
    queryKey: ["/api/anti-spam/blocked-clients"],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        businessName: user.businessName || '',
        email: user.email || '',
        phone: user.phone || '',
        serviceArea: user.serviceArea || '',
        about: user.about || '',
        timezone: user.timezone || 'America/New_York'
      });
    }
  }, [user]);

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Profile Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border border-gray-600"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-white font-medium">{user?.businessName || "No business name"}</h4>
            <p className="text-gray-400 text-sm">{user?.email || "No email"}</p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-gray-400 text-sm">{user?.phone || "No phone"}</p>
              {user?.phoneVerified && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:bg-gray-750 transition-colors">
          <Bell className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-white font-medium">Notifications</p>
          <p className="text-gray-400 text-sm">Manage alerts</p>
        </button>
        
        <button className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:bg-gray-750 transition-colors">
          <Users className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-white font-medium">Account</p>
          <p className="text-gray-400 text-sm">Profile settings</p>
        </button>
      </div>

      {/* Sign Out */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <button
          onClick={handleSignOut}
          className="flex items-center text-red-400 hover:text-red-300 w-full"
        >
          <Settings className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}