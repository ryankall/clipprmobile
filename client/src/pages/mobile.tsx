import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  Plus,
  Clock,
  DollarSign,
  TrendingUp,
  Phone,
  MapPin,
  Star,
  User,
  Bell,
  Shield,
  ShieldOff,
  Edit,
  Camera,
  Upload,
  X,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  Lock,
  CreditCard,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface AppointmentWithRelations {
  id: number;
  scheduledAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  duration: number;
  client: {
    id: number;
    name: string;
    phone: string;
  };
  services: Array<{
    id: number;
    name: string;
    price: string;
  }>;
  price: string;
}

interface DashboardStats {
  todayEarnings: number;
  todayAppointments: number;
  totalClients: number;
  monthlyEarnings: number;
}

interface NotificationSettings {
  newBookingRequests: boolean;
  appointmentConfirmations: boolean;
  appointmentCancellations: boolean;
  upcomingReminders: boolean;
  soundEffects: boolean;
}

interface BlockedClient {
  id: number;
  phoneNumber: string;
  blockedAt: string;
  reason?: string;
}

interface UserProfile {
  id: number;
  businessName?: string;
  email?: string;
  phone?: string;
  serviceArea?: string;
  about?: string;
  photoUrl?: string;
  timezone?: string;
}

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'clients' | 'services' | 'settings'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'profile' | 'notifications' | 'blocked' | 'payment' | 'subscription' | 'help'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [blockedClients, setBlockedClients] = useState<BlockedClient[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    newBookingRequests: true,
    appointmentConfirmations: true,
    appointmentCancellations: true,
    upcomingReminders: true,
    soundEffects: true,
  });
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [profileForm, setProfileForm] = useState({
    businessName: '',
    email: '',
    phone: '',
    serviceArea: '',
    about: '',
    photoUrl: '',
    timezone: 'America/New_York',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  
  const { toast } = useToast();

  // Check authentication status without triggering redirects
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
  
  // Get current user with proper error handling for mobile
  const { data: user, isLoading: isLoadingUser, error: authError } = useQuery<UserProfile>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: hasToken,
    onError: (error: any) => {
      // Don't redirect on mobile interface - handle authentication inline
      if (error?.message?.includes('401') || error?.message?.includes('Authentication')) {
        localStorage.removeItem("token");
        queryClient.clear();
      }
    },
  });

  const isAuthenticated = !!user && !authError && hasToken;

  // Fetch dashboard data - only when authenticated
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: todayAppointments } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/today"],
    enabled: isAuthenticated,
  });

  const { data: nextAppointment } = useQuery<AppointmentWithRelations>({
    queryKey: ["/api/appointments/next"],
    enabled: isAuthenticated,
  });

  // Payment and subscription data
  const { data: stripeStatus } = useQuery<any>({
    queryKey: ["/api/stripe/status"],
    enabled: isAuthenticated,
  });

  const { data: subscriptionStatus } = useQuery<any>({
    queryKey: ["/api/stripe/subscription-status"],
    enabled: isAuthenticated,
  });

  const { data: bookingUrl } = useQuery({
    queryKey: ["/api/booking-url"],
    enabled: isAuthenticated,
  });

  // Load settings data
  useEffect(() => {
    if (user) {
      setProfileForm({
        businessName: user.businessName || '',
        email: user.email || '',
        phone: user.phone || '',
        serviceArea: user.serviceArea || '',
        about: user.about || '',
        photoUrl: user.photoUrl || '',
        timezone: user.timezone || 'America/New_York',
      });
    }
  }, [user]);

  // Load blocked clients
  useEffect(() => {
    if (isAuthenticated && activeTab === 'settings' && settingsTab === 'blocked') {
      loadBlockedClients();
    }
  }, [isAuthenticated, activeTab, settingsTab]);

  // Load notification settings
  useEffect(() => {
    if (isAuthenticated && activeTab === 'settings' && settingsTab === 'notifications') {
      loadNotificationSettings();
    }
  }, [isAuthenticated, activeTab, settingsTab]);

  const loadBlockedClients = async () => {
    try {
      const data = await apiRequest<BlockedClient[]>('GET', '/api/anti-spam/blocked-clients');
      setBlockedClients(data);
    } catch (error) {
      console.error('Failed to load blocked clients:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      // Load from localStorage or API
      const settings = {
        newBookingRequests: localStorage.getItem('notification_newBookingRequests') !== 'false',
        appointmentConfirmations: localStorage.getItem('notification_appointmentConfirmations') !== 'false',
        appointmentCancellations: localStorage.getItem('notification_appointmentCancellations') !== 'false',
        upcomingReminders: localStorage.getItem('notification_upcomingReminders') !== 'false',
        soundEffects: localStorage.getItem('notification_soundEffects') !== 'false',
      };
      setNotificationSettings(settings);
      
      // Check push notification status
      try {
        const pushStatus = await apiRequest<{subscribed: boolean}>('GET', '/api/push/subscription');
        setPushNotificationsEnabled(pushStatus.subscribed);
      } catch (error) {
        console.error('Failed to check push notification status:', error);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const profileUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setIsEditingProfile(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/auth/change-password', data);
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleProfileSave = () => {
    profileUpdateMutation.mutate(profileForm);
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    passwordChangeMutation.mutate(passwordForm);
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await apiRequest('POST', '/api/push/subscribe', {});
      } else {
        await apiRequest('POST', '/api/push/unsubscribe', {});
      }
      setPushNotificationsEnabled(enabled);
      toast({
        title: "Success",
        description: `Push notifications ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    }
  };

  const handleNotificationTypeToggle = (type: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [type]: value }));
    localStorage.setItem(`notification_${type}`, value.toString());
  };

  const handleUnblockClient = async (phoneNumber: string) => {
    try {
      await apiRequest('POST', '/api/anti-spam/unblock', { phoneNumber });
      loadBlockedClients();
      toast({
        title: "Success",
        description: "Client unblocked successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock client",
        variant: "destructive",
      });
    }
  };

  const copyBookingLink = () => {
    if (bookingUrl?.fullUrl) {
      navigator.clipboard.writeText(bookingUrl.fullUrl);
      toast({
        title: "Copied",
        description: "Booking link copied to clipboard",
      });
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    queryClient.clear();
    // Stay in mobile interface after sign out
    window.location.href = '/mobile';
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest('POST', '/api/auth/signin', credentials);
    },
    onSuccess: (response: any) => {
      if (response.token) {
        localStorage.setItem('token', response.token);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({
          title: "Success",
          description: "Signed in successfully",
        });
        // Refresh to load authenticated data
        window.location.reload();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginForm);
  };

  // Stripe connection mutation
  const connectStripeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/stripe/connect');
    },
    onSuccess: (data: any) => {
      if (data.accountLinkUrl) {
        window.location.href = data.accountLinkUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to connect Stripe account",
        variant: "destructive",
      });
    },
  });

  // Stripe checkout mutation
  const stripeCheckoutMutation = useMutation({
    mutationFn: async (interval: 'monthly' | 'yearly') => {
      return await apiRequest('POST', '/api/stripe/create-checkout', { interval });
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/stripe/cancel-subscription');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. Premium access continues until the end of your billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  // Request refund mutation
  const requestRefundMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/stripe/request-refund');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
      toast({
        title: "Refund Processed",
        description: "Your refund has been processed. You've been downgraded to the Basic plan.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  const handleConnectStripe = () => {
    setIsConnectingStripe(true);
    connectStripeMutation.mutate();
  };

  const handleStripeCheckout = (interval: 'monthly' | 'yearly') => {
    stripeCheckoutMutation.mutate(interval);
  };

  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome back!</h1>
        <p className="text-gray-400">Here's your business overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Today</p>
                <p className="text-lg font-bold text-white">${stats?.todayEarnings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Appointments</p>
                <p className="text-lg font-bold text-white">{stats?.todayAppointments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Clients</p>
                <p className="text-lg font-bold text-white">{stats?.totalClients || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Monthly</p>
                <p className="text-lg font-bold text-white">${stats?.monthlyEarnings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Appointment */}
      {nextAppointment && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Next Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{nextAppointment.client.name}</p>
                <p className="text-sm text-gray-400">{nextAppointment.services.map(s => s.name).join(", ")}</p>
              </div>
              <Badge variant="outline" className="text-amber-500 border-amber-500">
                {nextAppointment.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(nextAppointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>{nextAppointment.client.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Today's Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments && todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{appointment.client.name}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">${appointment.price}</p>
                    <Badge variant="outline" className="text-xs">
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">No appointments today</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => setActiveTab('calendar')}
          className="bg-amber-500 hover:bg-amber-600 text-gray-900 p-6"
        >
          <Calendar className="w-5 h-5 mr-2" />
          View Calendar
        </Button>
        <Button 
          onClick={() => setActiveTab('clients')}
          className="bg-gray-700 hover:bg-gray-600 text-white p-6"
        >
          <Users className="w-5 h-5 mr-2" />
          Manage Clients
        </Button>
      </div>
    </div>
  );

  // Calendar Content
  const renderCalendar = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Calendar</h2>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Mobile calendar interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Clients Content
  const renderClients = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Clients</h2>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Mobile clients interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Services Content
  const renderServices = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Services</h2>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Mobile services interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Settings Content
  const renderSettings = () => (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold text-white">Settings</h2>
      
      {/* Settings Tab Navigation */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setSettingsTab('profile')}
          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            settingsTab === 'profile' 
              ? 'bg-amber-500 text-gray-900' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <User className="w-4 h-4 inline mr-1" />
          Profile
        </button>
        <button
          onClick={() => setSettingsTab('notifications')}
          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            settingsTab === 'notifications' 
              ? 'bg-amber-500 text-gray-900' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-1" />
          Notifications
        </button>
        <button
          onClick={() => setSettingsTab('blocked')}
          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            settingsTab === 'blocked' 
              ? 'bg-amber-500 text-gray-900' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-1" />
          Blocked
        </button>
        <button
          onClick={() => setSettingsTab('payment')}
          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            settingsTab === 'payment' 
              ? 'bg-amber-500 text-gray-900' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-1" />
          Payment
        </button>
        <button
          onClick={() => setSettingsTab('subscription')}
          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            settingsTab === 'subscription' 
              ? 'bg-amber-500 text-gray-900' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-1" />
          Subscription
        </button>
        <button
          onClick={() => setSettingsTab('help')}
          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            settingsTab === 'help' 
              ? 'bg-amber-500 text-gray-900' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <HelpCircle className="w-4 h-4 inline mr-1" />
          Help
        </button>
      </div>

      {/* Settings Tab Content */}
      {settingsTab === 'profile' && (
        <div className="space-y-4">
          {/* Profile Section */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Profile & Business Info</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="text-amber-500 hover:text-amber-400"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{user?.businessName || 'Business Name'}</p>
                  <p className="text-gray-400 text-sm">{user?.email || 'No email set'}</p>
                  <p className="text-gray-400 text-sm">{user?.phone || 'No phone set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Link Section */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Public Booking Link</CardTitle>
            </CardHeader>
            <CardContent>
              {bookingUrl?.fullUrl ? (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">
                    Share this link with clients to let them book appointments
                  </p>
                  <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3">
                    <code className="flex-1 text-white text-xs break-all">
                      {bookingUrl.fullUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyBookingLink}
                      className="text-amber-500 hover:text-amber-400"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-green-500 text-xs flex items-center justify-center">
                    <Check className="w-3 h-3 mr-1" />
                    Your booking URL is active and ready to accept appointments
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500 mx-auto mb-2"></div>
                  <p className="text-gray-400">Creating your booking URL...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Password</p>
                  <p className="text-gray-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                  className="text-amber-500 hover:text-amber-400"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}

      {settingsTab === 'notifications' && (
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Push Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-gray-400 text-sm">Receive notifications from this device</p>
                </div>
                <Switch
                  checked={pushNotificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                />
              </div>

              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {key === 'newBookingRequests' && 'When clients request appointments'}
                      {key === 'appointmentConfirmations' && 'When clients confirm appointments'}
                      {key === 'appointmentCancellations' && 'When clients cancel appointments'}
                      {key === 'upcomingReminders' && 'Reminders for upcoming appointments'}
                      {key === 'soundEffects' && 'Sound effects for notifications'}
                    </p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => handleNotificationTypeToggle(key as keyof NotificationSettings, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {settingsTab === 'blocked' && (
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Blocked Clients</CardTitle>
            </CardHeader>
            <CardContent>
              {blockedClients.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-white font-medium mb-2">No Blocked Clients</p>
                  <p className="text-gray-400 text-sm">
                    You haven't blocked any clients yet. When you block a client, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                          <ShieldOff className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{client.phoneNumber}</p>
                          <p className="text-gray-400 text-sm">
                            Blocked {new Date(client.blockedAt).toLocaleDateString()}
                          </p>
                          {client.reason && (
                            <p className="text-gray-400 text-xs">Reason: {client.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockClient(client.phoneNumber)}
                        className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Settings Tab */}
      {settingsTab === 'payment' && (
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Payment Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {stripeStatus?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white font-medium">Stripe Connected</p>
                        <p className="text-green-300 text-sm">Ready to receive payments</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(stripeStatus?.dashboardUrl, '_blank')}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      View Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleConnectStripe}
                      disabled={isConnectingStripe}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      Update Settings
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-white font-medium">Payment Setup Required</p>
                        <p className="text-amber-300 text-sm">Connect Stripe to receive payments</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-gray-300 text-sm mb-2">
                      Connect your Stripe account to start accepting credit card payments from clients.
                    </p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Secure credit card processing</li>
                      <li>• Automatic payment tracking</li>
                      <li>• Direct deposits to your bank</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={isConnectingStripe}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900"
                  >
                    {isConnectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Settings Tab */}
      {settingsTab === 'subscription' && (
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-gray-900" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Basic Plan</p>
                    <p className="text-gray-400 text-sm">Currently Active</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">Free</p>
                  <p className="text-gray-400 text-sm">Forever</p>
                </div>
              </div>
              
              {subscriptionStatus?.status === 'basic' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 p-4 rounded-lg border border-amber-500/30">
                    <h4 className="text-white font-bold mb-2">Upgrade to Premium</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-amber-500 font-bold text-lg">$19.99</div>
                            <div className="text-amber-400 text-sm">/month</div>
                          </div>
                          <Button
                            onClick={() => handleStripeCheckout('monthly')}
                            className="bg-amber-500 hover:bg-amber-600 text-gray-900"
                          >
                            Choose Monthly
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gray-800 p-3 rounded-lg border border-emerald-500/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-emerald-400 font-bold text-lg">$199.99</div>
                            <div className="text-emerald-400 text-sm">/year - Save 16%</div>
                          </div>
                          <Button
                            onClick={() => handleStripeCheckout('yearly')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            Choose Yearly
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-amber-500 font-bold text-lg">∞</div>
                      <div className="text-white text-sm">Appointments</div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-amber-500 font-bold text-lg">1GB</div>
                      <div className="text-white text-sm">Photo Storage</div>
                    </div>
                  </div>
                </div>
              )}
              
              {subscriptionStatus?.status === 'premium' && (
                <div className="space-y-4">
                  <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
                    <h4 className="text-white font-semibold mb-2">Premium Plan Active</h4>
                    <p className="text-gray-400 text-sm">
                      Next billing: {subscriptionStatus.endDate ? new Date(subscriptionStatus.endDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => cancelSubscriptionMutation.mutate()}
                      disabled={cancelSubscriptionMutation.isPending}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      {cancelSubscriptionMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>
                    
                    {subscriptionStatus.isEligibleForRefund && (
                      <Button
                        variant="outline"
                        onClick={() => requestRefundMutation.mutate()}
                        disabled={requestRefundMutation.isPending}
                        className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-900/20"
                      >
                        {requestRefundMutation.isPending ? 'Processing...' : 'Request Refund'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Help & Support Tab */}
      {settingsTab === 'help' && (
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Help & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 p-4 rounded-lg border border-amber-500/30">
                <h4 className="text-white font-bold mb-2">Need Help?</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Get quick answers to common questions or contact our support team.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => window.open('mailto:support@clippr.com', '_blank')}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    <Mail className="w-4 h-4 inline mr-2" />
                    Contact Support
                  </button>
                  <button
                    onClick={() => window.open('https://docs.clippr.com', '_blank')}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 inline mr-2" />
                    Documentation
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-white font-medium">Common Questions</h4>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === 'billing' ? null : 'billing')}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-left p-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Billing & Subscriptions</span>
                      <span className="text-gray-400">{expandedFAQ === 'billing' ? '−' : '+'}</span>
                    </div>
                  </button>
                  {expandedFAQ === 'billing' && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-gray-300 text-sm">
                        Premium plans include unlimited appointments, 1GB photo storage, and priority support. 
                        You can cancel anytime and get a full refund within 30 days.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === 'appointments' ? null : 'appointments')}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-left p-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Managing Appointments</span>
                      <span className="text-gray-400">{expandedFAQ === 'appointments' ? '−' : '+'}</span>
                    </div>
                  </button>
                  {expandedFAQ === 'appointments' && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-gray-300 text-sm">
                        Use the Calendar tab to view and manage appointments. You can create new appointments, 
                        modify existing ones, and track client information all in one place.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === 'clients' ? null : 'clients')}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-left p-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Client Management</span>
                      <span className="text-gray-400">{expandedFAQ === 'clients' ? '−' : '+'}</span>
                    </div>
                  </button>
                  {expandedFAQ === 'clients' && (
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-gray-300 text-sm">
                        The Clients tab lets you store contact information, service history, and preferences 
                        for each client. You can also block clients from booking if needed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Edit Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={profileForm.businessName}
                onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                className="bg-gray-800 border-gray-600"
                placeholder="e.g., ClipCutMan Barber Shop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="bg-gray-800 border-gray-600"
                placeholder="your.email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="bg-gray-800 border-gray-600"
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceArea">Service Area</Label>
              <Input
                id="serviceArea"
                value={profileForm.serviceArea}
                onChange={(e) => setProfileForm({ ...profileForm, serviceArea: e.target.value })}
                className="bg-gray-800 border-gray-600"
                placeholder="e.g., Downtown Manhattan, Brooklyn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="about">About You</Label>
              <Textarea
                id="about"
                value={profileForm.about}
                onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                className="bg-gray-800 border-gray-600"
                placeholder="Tell clients about your experience, specialties, and what makes you unique..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsEditingProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleProfileSave} disabled={profileUpdateMutation.isPending}>
              {profileUpdateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="bg-gray-800 border-gray-600 pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="bg-gray-800 border-gray-600 pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="bg-gray-800 border-gray-600 pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsChangingPassword(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={passwordChangeMutation.isPending}>
              {passwordChangeMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'calendar':
        return renderCalendar();
      case 'clients':
        return renderClients();
      case 'services':
        return renderServices();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  // Show loading state
  if (isLoadingUser && hasToken) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-amber-500 mb-2">Clippr</h1>
            <p className="text-gray-400">Mobile Business Management</p>
          </div>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-center">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="bg-gray-800 border-gray-600 text-white pl-10"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="bg-gray-800 border-gray-600 text-white pl-10 pr-10"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
          <h1 className="text-xl font-bold text-amber-500">Clippr</h1>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-900" />
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="pb-20">
          {renderContent()}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700">
          <div className="max-w-md mx-auto flex items-center justify-around p-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'dashboard' 
                  ? 'text-amber-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Dashboard</span>
            </button>
            
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'calendar' 
                  ? 'text-amber-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Calendar</span>
            </button>
            
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'clients' 
                  ? 'text-amber-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-xs">Clients</span>
            </button>
            
            <button
              onClick={() => setActiveTab('services')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'services' 
                  ? 'text-amber-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Star className="w-5 h-5" />
              <span className="text-xs">Services</span>
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === 'settings' 
                  ? 'text-amber-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}