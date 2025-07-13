import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Home, 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  Phone, 
  Clock, 
  DollarSign,
  MapPin,
  MessageSquare,
  User,
  Bell,
  Camera,
  Plus,
  Minus,
  X,
  CreditCard,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  EyeOff,
  Heart,
  Car,
  Shield,
  ShieldOff,
  HelpCircle,
  LogOut,
  Edit3,
  Upload,
  CheckCircle,
  AlertCircle,
  Share,
  Copy,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Receipt,
  Trash2,
  Banknote,
  MessageCircle
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
}

interface Service {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  isActive: boolean;
  description?: string;
}

interface Invoice {
  id: number;
  clientId: number;
  total: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod?: 'stripe' | 'cash' | 'apple_pay';
  createdAt: string;
  services?: Array<{ name: string; price: string; quantity: number }>;
}

interface InvoiceTemplate {
  id: number;
  name: string;
  amount: string;
  category: string;
  services: number[];
}

// Mobile Authentication Component
function MobileAuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    businessName: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        window.location.reload();
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  const handleAppleSignIn = () => {
    window.location.href = '/api/auth/apple';
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Clippr Mobile</h1>
          <p className="text-gray-400">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Business Name"
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
                required
              />
            </>
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-gray-900 py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            
            <button
              onClick={handleAppleSignIn}
              className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.017 0C9.396 0 8.924 1.51 8.924 1.51L8.924 4.739C8.924 4.739 9.396 4.292 10.503 4.292C11.61 4.292 12.017 4.865 12.017 4.865L12.017 8.543C12.017 8.543 11.61 8.066 10.503 8.066C9.396 8.066 8.924 8.543 8.924 8.543L8.924 12.221C8.924 12.221 9.396 11.744 10.503 11.744C11.61 11.744 12.017 12.317 12.017 12.317L12.017 15.995C12.017 15.995 11.61 15.518 10.503 15.518C9.396 15.518 8.924 15.995 8.924 15.995L8.924 19.673C8.924 19.673 9.396 19.196 10.503 19.196C11.61 19.196 12.017 19.769 12.017 19.769L12.017 23.447C12.017 23.447 11.61 22.97 10.503 22.97C9.396 22.97 8.924 23.447 8.924 23.447L8.924 24C8.924 24 9.396 24 12.017 24C14.639 24 15.11 22.49 15.11 22.49L15.11 19.261C15.11 19.261 14.639 19.708 13.532 19.708C12.425 19.708 12.017 19.135 12.017 19.135L12.017 15.457C12.017 15.457 12.425 15.934 13.532 15.934C14.639 15.934 15.11 15.457 15.11 15.457L15.11 11.779C15.11 11.779 14.639 12.256 13.532 12.256C12.425 12.256 12.017 11.683 12.017 11.683L12.017 8.005C12.017 8.005 12.425 8.482 13.532 8.482C14.639 8.482 15.11 8.005 15.11 8.005L15.11 4.327C15.11 4.327 14.639 4.804 13.532 4.804C12.425 4.804 12.017 4.231 12.017 4.231L12.017 0.553C12.017 0.553 12.425 1.03 13.532 1.03C14.639 1.03 15.11 0.553 15.11 0.553L15.11 0Z"/>
              </svg>
              Apple
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-amber-500 hover:text-amber-400 text-sm"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Mobile Settings Page Component
function MobileSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showNotificationCard, setShowNotificationCard] = useState(false);
  const [showPaymentSettingsCard, setShowPaymentSettingsCard] = useState(false);
  const [showQuickActionCard, setShowQuickActionCard] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
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
    homeBaseAddress: '',
    timezone: 'America/New_York',
    defaultGraceTime: 5,
    transportationMode: 'driving'
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FAQ data
  const faqData = [
    {
      id: "premium-guarantee",
      question: "What is the Premium Guarantee?",
      answer: "Try Clippr Pro risk-free for 30 days. If you're not satisfied, request a full refund — no hassle. You can also cancel your subscription anytime directly from the Settings page.",
      category: "Premium & Billing",
      icon: "🛡️",
    },
    {
      id: "cancel-subscription",
      question: "How do I cancel my subscription?",
      answer: "You can cancel your Premium subscription anytime from Settings → Subscription Management. Your premium access will continue until the end of your current billing period.",
      category: "Premium & Billing",
      icon: "💳",
    },
    {
      id: "appointment-limits",
      question: "What are the appointment limits?",
      answer: "Basic plan allows 15 appointments per month. Premium plan offers unlimited appointments. The counter resets on the first day of each month.",
      category: "Features",
      icon: "📅",
    },
    {
      id: "client-management",
      question: "How do I manage my clients?",
      answer: "Go to the Clients page to add, edit, and track your client information. You can store contact details, service history, and notes for each client.",
      category: "Features",
      icon: "👥",
    },
    {
      id: "data-security",
      question: "Is my data secure?",
      answer: "Yes, we use industry-standard encryption and security measures. Your client data and payment information are protected with bank-level security.",
      category: "Security",
      icon: "🔒",
    },
  ];

  const categories = ["All", "Premium & Billing", "Features", "Security"];
  const filteredFAQs = selectedCategory === "All" ? faqData : faqData.filter((faq) => faq.category === selectedCategory);

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

  // Get Stripe account status
  const { data: stripeStatus } = useQuery<any>({
    queryKey: ["/api/stripe/status"],
    retry: false,
  });

  const { data: subscriptionStatus } = useQuery<any>({
    queryKey: ["/api/stripe/subscription-status"],
    retry: false,
  });

  // Push notification subscription status
  const { data: pushSubscriptionStatus } = useQuery<any>({
    queryKey: ["/api/push/subscription"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      setPreviewUrl(null);
      // Show success message
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      alert("Password changed successfully!");
    },
    onError: (error: any) => {
      alert(error.message || "Failed to change password");
    },
  });

  // Unblock client mutation
  const unblockClientMutation = useMutation({
    mutationFn: async ({ phoneNumber }: { phoneNumber: string }) => {
      const response = await fetch("/api/anti-spam/unblock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!response.ok) throw new Error("Failed to unblock client");
      return response.json();
    },
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
        homeBaseAddress: user.homeBaseAddress || '',
        timezone: user.timezone || 'America/New_York',
        defaultGraceTime: user.defaultGraceTime || 5,
        transportationMode: user.transportationMode || 'driving'
      });
    }
  }, [user]);

  // Phone number formatting
  const formatPhoneNumber = (value: string): string => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, "");
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload logic here
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle FAQ toggle
  const handleFAQToggle = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  // Handle support form submission
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSupport(true);

    try {
      // Create mailto link for now (can be replaced with actual email service)
      const mailtoLink = `mailto:support@clippr.com?subject=${encodeURIComponent(supportForm.subject)}&body=${encodeURIComponent(
        `Name: ${supportForm.name}\nEmail: ${supportForm.email}\n\nMessage:\n${supportForm.message}`,
      )}`;

      window.open(mailtoLink, "_blank");

      alert("Your email client has been opened. Please send the email to complete your support request.");

      // Reset form
      setSupportForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      alert("Failed to open email client. Please email us directly at support@clippr.com");
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // Handle change password
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      alert("New passwords do not match");
      return;
    }
    
    if (passwordFormData.newPassword.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordFormData.currentPassword,
      newPassword: passwordFormData.newPassword,
    });
  };

  // Handle profile update
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

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

      {/* Tab Navigation */}
      <div className="flex space-x-1">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "profile"
              ? "bg-amber-500 text-gray-900"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("blocked")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "blocked"
              ? "bg-amber-500 text-gray-900"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          Blocked Clients
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-amber-500" />
                  <h3 className="text-white font-medium">Profile & Business Info</h3>
                </div>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="text-amber-500 hover:text-amber-400 p-2"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Profile Display */}
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-4">
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border border-gray-600"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <h4 className="text-white font-medium">{user?.businessName || "No business name"}</h4>
                  <p className="text-gray-400 text-sm">{user?.email || "No email"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Phone</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-white">{user?.phone || "Not set"}</p>
                    {user?.phoneVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Service Area</label>
                  <p className="text-white">{user?.serviceArea || "Not set"}</p>
                </div>
              </div>

              {user?.about && (
                <div>
                  <label className="text-gray-400 text-sm">About</label>
                  <p className="text-white">{user.about}</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Edit Modal */}
          {isEditingProfile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">Edit Profile</h3>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {/* Photo Upload */}
                  <div>
                    <label className="text-white text-sm font-medium">Profile Photo</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {previewUrl ? (
                      <div className="relative mt-2">
                        <img
                          src={previewUrl}
                          alt="Profile preview"
                          className="w-24 h-24 object-cover rounded-full border border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(null)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center mt-2">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-400 text-sm mb-3">Add a profile photo</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 bg-gray-700 text-white py-2 px-3 rounded text-sm hover:bg-gray-600"
                          >
                            <Upload className="w-4 h-4 mr-1 inline" />
                            Upload
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="text-white text-sm font-medium">Business Name</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="Your barbershop name"
                      maxLength={60}
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                      {formData.businessName.length}/60
                    </div>
                  </div>

                  {/* Phone and Email */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white text-sm font-medium">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                        className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="Email address"
                      />
                    </div>
                  </div>

                  {/* Service Area */}
                  <div>
                    <label className="text-white text-sm font-medium">Service Area</label>
                    <input
                      type="text"
                      value={formData.serviceArea}
                      onChange={(e) => setFormData(prev => ({ ...prev, serviceArea: e.target.value }))}
                      className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="Your service area"
                      maxLength={100}
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                      {formData.serviceArea.length}/100
                    </div>
                  </div>

                  {/* About */}
                  <div>
                    <label className="text-white text-sm font-medium">About</label>
                    <textarea
                      value={formData.about}
                      onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                      className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="Tell clients about your services"
                      maxLength={300}
                      rows={4}
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">
                      {formData.about.length}/300
                    </div>
                  </div>

                  {/* Scheduling Settings */}
                  <div className="space-y-4 pt-4 border-t border-gray-600">
                    <h4 className="text-white font-medium">Smart Scheduling Settings</h4>

                    {/* Home Base Address */}
                    <div>
                      <label className="text-white text-sm font-medium">Home Base Address</label>
                      <input
                        type="text"
                        value={formData.homeBaseAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, homeBaseAddress: e.target.value }))}
                        className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="Start typing your address..."
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        Starting point for calculating travel time to your first appointment
                      </p>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="text-white text-sm font-medium">Timezone</label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      </select>
                      <p className="text-gray-400 text-xs mt-1">
                        Your local timezone for appointment scheduling
                      </p>
                    </div>

                    {/* Grace Time Buffer */}
                    <div>
                      <label className="text-white text-sm font-medium">Grace Time Buffer (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={formData.defaultGraceTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, defaultGraceTime: parseInt(e.target.value) || 0 }))}
                        className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="5"
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        Extra time added to travel estimates for parking, elevators, etc.
                      </p>
                    </div>

                    {/* Transportation Mode */}
                    <div>
                      <label className="text-white text-sm font-medium">Transportation Mode</label>
                      <select
                        value={formData.transportationMode}
                        onChange={(e) => setFormData(prev => ({ ...prev, transportationMode: e.target.value }))}
                        className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="driving">🚗 Driving</option>
                        <option value="walking">🚶 Walking</option>
                        <option value="cycling">🚴 Cycling</option>
                        <option value="transit">🚌 Public Transit</option>
                      </select>
                      <p className="text-gray-400 text-xs mt-1">
                        Your preferred transportation method for calculating travel times
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Phone Verification */}
          {user?.phone && !user?.phoneVerified && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="w-5 h-5 mr-2 text-amber-500" />
                  <h3 className="text-white font-medium">Phone Verification</h3>
                </div>
                <button
                  onClick={() => setIsVerifyingPhone(true)}
                  className="bg-amber-500 text-gray-900 px-3 py-1 rounded text-sm hover:bg-amber-600"
                >
                  Verify Phone
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Verify your phone number to receive SMS confirmations and enable all features.
              </p>
            </div>
          )}

          {/* Subscription Plan */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-amber-500" />
                <h3 className="text-white font-medium">Subscription Plan</h3>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Current Plan Display */}
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
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
                  <p className="text-gray-400 text-xs">Forever</p>
                </div>
              </div>

              {/* Basic Plan Features */}
              <div className="bg-gray-700 p-3 rounded-lg">
                <h4 className="text-white font-medium text-sm mb-2">Basic Plan includes:</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• 15 appointments per month</li>
                  <li>• 3 active services</li>
                  <li>• 15 SMS messages per month</li>
                  <li>• 50MB photo storage</li>
                  <li>• Basic calendar features</li>
                </ul>
              </div>

              {/* Premium Plan Offer */}
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/10 border-2 border-amber-500/30 p-4 rounded-lg">
                <div className="mb-3">
                  <h4 className="text-white font-bold text-lg">Premium Plan</h4>
                </div>

                {/* Monthly Option */}
                <div className="bg-gray-700 p-3 rounded-lg border border-amber-500/20 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-amber-500 font-bold text-lg">$19.99</div>
                        <div className="text-amber-500 text-sm">/month</div>
                      </div>
                      <div className="text-gray-400 text-sm">Monthly billing</div>
                    </div>
                    <button className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium text-sm">
                      Choose Monthly
                    </button>
                  </div>
                </div>

                {/* Yearly Option */}
                <div className="bg-gray-700 p-3 rounded-lg border border-green-500/30 relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      SAVE 16%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-gray-400 text-xs line-through">$239.88/year</div>
                        <div className="text-green-400 font-bold text-lg">$199.99</div>
                        <div className="text-green-400 text-sm">/year</div>
                      </div>
                      <div className="text-gray-400 text-sm">Annual billing</div>
                    </div>
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium text-sm">
                      Choose Yearly
                    </button>
                  </div>
                </div>

                {/* Premium Features Grid */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-gray-700 p-2 rounded border border-amber-500/20">
                    <div className="text-amber-500 font-bold text-sm">∞</div>
                    <div className="text-white text-xs">Appointments</div>
                  </div>
                  <div className="bg-gray-700 p-2 rounded border border-amber-500/20">
                    <div className="text-amber-500 font-bold text-sm">1GB</div>
                    <div className="text-white text-xs">Photo Storage</div>
                  </div>
                  <div className="bg-gray-700 p-2 rounded border border-amber-500/20">
                    <div className="text-amber-500 font-bold text-sm">∞</div>
                    <div className="text-white text-xs">Services</div>
                  </div>
                  <div className="bg-gray-700 p-2 rounded border border-amber-500/20">
                    <div className="text-amber-500 font-bold text-sm">∞</div>
                    <div className="text-white text-xs">SMS Messages</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Public Booking Link */}
          {user?.phone && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Share className="w-5 h-5 mr-2 text-amber-500" />
                  <h3 className="text-white font-medium">Public Booking Link</h3>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Share this link with clients so they can book appointments directly.
              </p>
              
              <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                <div className="flex items-center space-x-2">
                  <code className="text-amber-500 text-sm flex-1 break-all">
                    {window.location.origin}/book/{user.phone?.replace(/\D/g, "") || ""}-clipcutman
                  </code>
                  <button
                    onClick={() => {
                      if (user?.phone) {
                        const cleanPhone = user.phone.replace(/\D/g, "");
                        const bookingUrl = `${window.location.origin}/book/${cleanPhone}-clipcutman`;
                        navigator.clipboard.writeText(bookingUrl);
                      }
                    }}
                    className="bg-gray-600 text-white p-2 rounded hover:bg-gray-500"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-amber-500" />
                  <h3 className="text-white font-medium">Notifications</h3>
                </div>
                <button
                  onClick={() => setShowNotificationCard(!showNotificationCard)}
                  className="text-gray-400 hover:text-white"
                >
                  {showNotificationCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {showNotificationCard && (
              <div className="p-4 space-y-4">
                {/* Push Notifications Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Push Notifications</p>
                    <p className="text-xs text-gray-400">Enable browser notifications</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
                    pushSubscriptionStatus?.subscribed ? 'bg-amber-500' : 'bg-gray-600'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      pushSubscriptionStatus?.subscribed ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>

                {/* Individual notification types */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">New Booking Requests</p>
                      <p className="text-xs text-gray-400">When clients request appointments</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
                      notificationSettings.newBookingRequests ? 'bg-amber-500' : 'bg-gray-600'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        notificationSettings.newBookingRequests ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Appointment Confirmations</p>
                      <p className="text-xs text-gray-400">When clients confirm appointments</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
                      notificationSettings.appointmentConfirmations ? 'bg-amber-500' : 'bg-gray-600'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        notificationSettings.appointmentConfirmations ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Sound Effects</p>
                      <p className="text-xs text-gray-400">Play sounds for app interactions</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
                      notificationSettings.soundEffects ? 'bg-amber-500' : 'bg-gray-600'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        notificationSettings.soundEffects ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Settings */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-amber-500" />
                  <h3 className="text-white font-medium">Quick Action Messages</h3>
                </div>
                <button
                  onClick={() => setShowQuickActionCard(!showQuickActionCard)}
                  className="text-gray-400 hover:text-white"
                >
                  {showQuickActionCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {showQuickActionCard && (
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-white text-sm font-medium">Default Messages</h4>
                  <p className="text-gray-400 text-xs">Pre-built messages for common situations</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">On My Way</span>
                      <span className="text-gray-400 text-xs">Default</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      "Hi [Client Name], I'm on my way to your appointment at [Time]. See you soon!"
                    </p>
                  </div>

                  <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">Running Late</span>
                      <span className="text-gray-400 text-xs">Default</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      "Hi [Client Name], I'm running about [Minutes] minutes late for your [Time] appointment. Sorry for the delay!"
                    </p>
                  </div>
                </div>

                <button className="w-full bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 border border-gray-600">
                  <Bell className="w-4 h-4 mr-2 inline" />
                  Create Custom Message
                </button>

                <div className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg">
                  <h4 className="text-blue-300 font-medium text-sm mb-1">How Quick Actions Work</h4>
                  <p className="text-blue-200 text-xs">
                    Quick actions appear on your dashboard when you have appointments coming up within the next hour. 
                    Tap a message to instantly send it to your client via SMS or email.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Settings */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-amber-500" />
                  <h3 className="text-white font-medium">Payment Settings</h3>
                </div>
                <button
                  onClick={() => setShowPaymentSettingsCard(!showPaymentSettingsCard)}
                  className="text-gray-400 hover:text-white"
                >
                  {showPaymentSettingsCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {showPaymentSettingsCard && (
              <div className="p-4 space-y-4">
                {stripeStatus && stripeStatus.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-white font-medium">Stripe Connected</p>
                          <p className="text-green-300 text-sm">Ready to receive payments</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Account Status</p>
                        <p className="text-white capitalize">{stripeStatus?.status || "Active"}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Country</p>
                        <p className="text-white">{stripeStatus?.country || "US"}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 border border-gray-600">
                        <DollarSign className="w-4 h-4 mr-2 inline" />
                        View Dashboard
                      </button>
                      <button className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 border border-gray-600">
                        Update Settings
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <div>
                          <p className="text-white font-medium">Stripe Not Connected</p>
                          <p className="text-amber-300 text-sm">Connect to accept payments</p>
                        </div>
                      </div>
                    </div>

                    <button className="w-full bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600 font-medium">
                      Connect Stripe Account
                    </button>

                    <div className="bg-gray-700 p-3 rounded-lg">
                      <h4 className="text-white font-medium text-sm mb-2">Why Connect Stripe?</h4>
                      <ul className="text-gray-400 text-sm space-y-1">
                        <li>• Accept credit card payments</li>
                        <li>• Automatic invoice processing</li>
                        <li>• Secure payment handling</li>
                        <li>• Direct deposits to your bank</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Security */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-amber-500" />
                <h3 className="text-white font-medium">Security</h3>
              </div>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="text-amber-500 hover:text-amber-400 text-sm"
              >
                Change Password
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Keep your account secure with a strong password.
            </p>
          </div>

          {/* Help & Support */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <button
              onClick={() => setShowHelpSupport(true)}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors mb-3"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Help & Support</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <button
              onClick={handleSignOut}
              className="flex items-center text-red-400 hover:text-red-300"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Blocked Clients Tab */}
      {activeTab === "blocked" && (
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center">
                <ShieldOff className="w-5 h-5 mr-2 text-red-400" />
                <h3 className="text-white font-medium">Blocked Clients</h3>
              </div>
            </div>
            
            <div className="p-4">
              {blockedClients.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No blocked clients. You can block clients from booking by going to Messages and clicking "Block Client".
                </p>
              ) : (
                <div className="space-y-3">
                  {blockedClients.map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{client.phoneNumber}</p>
                        <p className="text-gray-400 text-sm">
                          Blocked {new Date(client.blockedAt).toLocaleDateString()}
                        </p>
                        {client.reason && (
                          <p className="text-gray-400 text-sm">Reason: {client.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => unblockClientMutation.mutate({ phoneNumber: client.phoneNumber })}
                        disabled={unblockClientMutation.isPending}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {unblockClientMutation.isPending ? "Unblocking..." : "Unblock"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {showHelpSupport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Help & Support</h2>
                <button
                  onClick={() => setShowHelpSupport(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Premium Guarantee */}
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-500/20 rounded-full p-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-amber-500 font-bold text-lg mb-2">Premium Guarantee</h3>
                    <p className="text-white text-sm leading-relaxed">
                      Try Clippr Pro risk-free for 30 days. If you're not satisfied, request a full refund — no hassle.
                    </p>
                    <div className="flex items-center mt-2 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span>30-day money-back guarantee</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Categories */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategory === category
                          ? "bg-amber-500 text-gray-900"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ List */}
              <div className="space-y-3">
                {filteredFAQs.map((faq) => (
                  <div key={faq.id} className="border border-gray-600 rounded-lg">
                    <button
                      onClick={() => handleFAQToggle(faq.id)}
                      className="w-full p-3 text-left hover:bg-gray-700 transition-colors rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{faq.icon}</span>
                          <span className="text-white font-medium text-sm">{faq.question}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedFAQ === faq.id ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="px-3 pb-3 border-t border-gray-600">
                        <p className="text-gray-300 text-sm leading-relaxed mt-2">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Contact Support Form */}
              <div className="border border-gray-600 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Contact Support</h3>
                <form onSubmit={handleSupportSubmit} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={supportForm.name}
                      onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Your Email"
                      value={supportForm.email}
                      onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Subject"
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Describe your issue..."
                      value={supportForm.message}
                      onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm h-20 resize-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingSupport}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded font-medium transition-colors disabled:opacity-50"
                  >
                    {isSubmittingSupport ? "Sending..." : "Send Support Request"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Change Password</h2>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordFormData.currentPassword}
                    onChange={(e) => setPasswordFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordFormData.newPassword}
                    onChange={(e) => setPasswordFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
                    minLength={8}
                    required
                  />
                  <p className="text-gray-400 text-xs mt-1">Must be at least 8 characters</p>
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordFormData.confirmPassword}
                    onChange={(e) => setPasswordFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
                    required
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded font-medium transition-colors disabled:opacity-50"
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom hook for authentication
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if user is authenticated and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('token');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  return { isAuthenticated, user, isLoading };
};

export default function MobileApp() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'clients' | 'services' | 'settings' | 'appointment-new'>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mobile Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [showExpired, setShowExpired] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
  
  // Mobile Client State
  const [showClientStats, setShowClientStats] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    preferredStyle: "",
    notes: "",
    loyaltyStatus: "regular",
  });

  // Client Mutations
  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) {
        throw new Error("Failed to create client");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch clients
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsClientDialogOpen(false);
      setClientForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        preferredStyle: "",
        notes: "",
        loyaltyStatus: "regular",
      });
    },
    onError: (error) => {
      console.error("Failed to create client:", error);
    },
  });

  // Client filters
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Client form handlers
  const handleCreateClient = () => {
    if (!clientForm.name) return;
    createClientMutation.mutate(clientForm);
  };

  const handleClientFormChange = (field: string, value: string) => {
    setClientForm(prev => ({ ...prev, [field]: value }));
  };
  
  // Mobile Appointment Creation State
  const [appointmentForm, setAppointmentForm] = useState({
    clientId: '',
    services: [] as { serviceId: number; quantity: number }[],
    scheduledAt: '',
    notes: '',
    address: '',
    includeTravel: false
  });

  // Invoice State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isServiceCreateOpen, setIsServiceCreateOpen] = useState(false);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showRecentInvoices, setShowRecentInvoices] = useState(false);
  const [showExportCard, setShowExportCard] = useState(false);
  const [hiddenTemplates, setHiddenTemplates] = useState<string[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedServices, setSelectedServices] = useState<Array<{
    serviceName: string;
    price: number;
    quantity: number;
  }>>([]);

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
    enabled: activeTab === 'dashboard',
  });

  const { data: todayAppointments, isLoading: todayLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/today"],
    enabled: activeTab === 'dashboard',
  });

  const { data: recentPhotos, isLoading: photosLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    enabled: activeTab === 'dashboard',
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<ClientWithRelations[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments"],
    enabled: activeTab === 'calendar',
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: activeTab === 'calendar',
  });

  // Invoice Queries
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: activeTab === 'services',
  });

  const { data: invoiceTemplates, isLoading: templatesLoading } = useQuery<InvoiceTemplate[]>({
    queryKey: ["/api/invoice-templates"],
    enabled: activeTab === 'services',
  });

  // Current and next appointments for dashboard
  const confirmedAppointments = todayAppointments?.filter(apt => apt.status === 'confirmed') || [];
  const currentAppointment = confirmedAppointments[0] || null;
  const nextAppointment = confirmedAppointments[1] || null;

  // Calendar appointments for selected date
  const calendarAppointmentsForDate = appointments?.filter(apt => {
    const aptDate = new Date(apt.scheduledAt);
    return (
      aptDate.getFullYear() === calendarDate.getFullYear() &&
      aptDate.getMonth() === calendarDate.getMonth() &&
      aptDate.getDate() === calendarDate.getDate()
    );
  }) || [];

  // Filter clients by search term
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) || [];

  // Handle clicks outside notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Mock notifications data
  const notifications = [
    { id: '1', type: 'appointment', message: 'New appointment request from John Doe', time: '2 minutes ago', read: false },
    { id: '2', type: 'payment', message: 'Payment received for haircut service', time: '1 hour ago', read: false },
    { id: '3', type: 'reminder', message: 'Appointment with Mike starting in 15 minutes', time: '2 hours ago', read: true },
  ];

  const unreadNotifications = notifications.filter(
    notification => !notification.read && 
    !dismissedNotifications.includes(notification.id)
  );

  // Mobile Appointment Creation Functions
  const resetAppointmentForm = () => {
    setAppointmentForm({
      clientId: '',
      services: [],
      scheduledAt: '',
      notes: '',
      address: '',
      includeTravel: false
    });
  };

  const createAppointment = async () => {
    if (!appointmentForm.clientId || appointmentForm.services.length === 0 || !appointmentForm.scheduledAt) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          clientId: parseInt(appointmentForm.clientId),
          services: appointmentForm.services,
          scheduledAt: appointmentForm.scheduledAt,
          notes: appointmentForm.notes,
          address: appointmentForm.address,
          includeTravel: appointmentForm.includeTravel
        })
      });

      if (response.ok) {
        alert('Appointment created successfully!');
        resetAppointmentForm();
        setActiveTab('calendar');
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create appointment'}`);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const generateMobileTimeSlots = () => {
    const workingHours = (userProfile as any)?.workingHours || {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: true, start: '10:00', end: '16:00' },
      sunday: { enabled: false, start: '10:00', end: '16:00' }
    };

    const slots = [];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[calendarDate.getDay()];
    const dayConfig = workingHours[currentDay];

    // Check if it's Sunday - if so, block all hours
    const isSunday = calendarDate.getDay() === 0;

    for (let hour = 8; hour <= 22; hour++) {
      const time = new Date();
      time.setHours(hour, 0, 0, 0);
      
      // Find appointments for this hour
      const appointmentsForHour = calendarAppointmentsForDate.filter(apt => {
        const aptTime = new Date(apt.scheduledAt);
        return aptTime.getHours() === hour;
      });

      let isBlocked = false;
      
      if (isSunday) {
        // Always block on Sunday
        isBlocked = true;
      } else if (dayConfig?.enabled) {
        const startHour = parseInt(dayConfig.start.split(':')[0]);
        const endHour = parseInt(dayConfig.end.split(':')[0]);
        isBlocked = hour < startHour || hour >= endHour;
      } else {
        // Day is disabled
        isBlocked = true;
      }

      slots.push({
        hour,
        time: time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          hour12: true 
        }),
        appointments: showExpired ? appointmentsForHour : appointmentsForHour.filter(apt => apt.status !== 'expired'),
        isBlocked
      });
    }

    return slots;
  };

  // Invoice Functions
  const handleQuickInvoice = async (serviceName: string, amount: string, template?: InvoiceTemplate) => {
    if (!clients?.length) {
      alert('Please add clients first');
      return;
    }
    
    // Pre-populate form with template data if provided
    if (template) {
      const templateServices = template.services
        .map(serviceId => services?.find(s => s.id === serviceId))
        .filter(Boolean)
        .map(service => ({
          serviceName: service!.name,
          price: parseFloat(service!.price),
          quantity: 1
        }));
      
      setSelectedServices(templateServices);
    } else {
      setSelectedServices([{
        serviceName,
        price: parseFloat(amount),
        quantity: 1
      }]);
    }
    
    setIsDialogOpen(true);
  };

  const handleDeleteDefaultTemplate = (templateName: string) => {
    const updatedHidden = [...hiddenTemplates, templateName];
    setHiddenTemplates(updatedHidden);
    localStorage.setItem('hiddenDefaultTemplates', JSON.stringify(updatedHidden));
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await fetch(`/api/invoice-templates/${templateId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        setSavedTemplates(prev => prev.filter(t => t.id !== templateId));
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template');
      }
    }
  };

  const handleEditService = (service: Service) => {
    // TODO: Implement service editing
    console.log('Edit service:', service);
  };

  const handleDeleteService = async (serviceId: number) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await fetch(`/api/services/${serviceId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        window.location.reload();
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('Failed to delete service');
      }
    }
  };

  const isServiceInUse = (serviceId: number): boolean => {
    return false; // TODO: Implement service usage check
  };

  // Invoice Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/invoice-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsTemplateDialogOpen(false);
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Error creating template:', error);
      alert('Failed to create template');
    }
  });

  const exportInvoicesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/invoices/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export invoices');
      }
      
      return response.json();
    },
    onSuccess: () => {
      alert('Invoice export sent to your email!');
    },
    onError: (error: any) => {
      console.error('Error exporting invoices:', error);
      alert('Failed to export invoices');
    }
  });

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
                      <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                        <div className="p-4 border-b border-gray-700">
                          <h3 className="font-semibold text-white">Notifications</h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {unreadNotifications.length > 0 ? (
                            unreadNotifications.map((notification) => (
                              <div key={notification.id} className="p-4 border-b border-gray-700 hover:bg-gray-700">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm text-white">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                  </div>
                                  <button
                                    onClick={() => setDismissedNotifications(prev => [...prev, notification.id])}
                                    className="text-gray-400 hover:text-white p-1"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-gray-400">
                              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No new notifications</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Today's Summary</h3>
                <p className="text-sm text-gray-400">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500 mb-1">
                      ${stats?.dailyEarnings || '0'}
                    </div>
                    <div className="text-sm text-gray-400">Earnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {stats?.appointmentCount || 0}
                    </div>
                    <div className="text-sm text-gray-400">Appointments</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mx-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('clients')}
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900 p-4 rounded-lg font-medium flex flex-col items-center space-y-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Client</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 p-4 rounded-lg font-medium flex flex-col items-center space-y-2"
                >
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <span>Schedule</span>
                </button>
              </div>
            </div>

            {/* Current/Next Appointments */}
            <div className="mx-4 space-y-4">
              {currentAppointment && (
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <div className="p-4">
                    <h3 className="text-amber-500 font-medium mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Current Appointment
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                          <span className="text-gray-900 font-medium text-sm">
                            {currentAppointment.client?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-white">{currentAppointment.client?.name}</div>
                          <div className="text-sm text-gray-400">{currentAppointment.service?.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {new Date(currentAppointment.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-xs text-amber-500">In Progress</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {nextAppointment && (
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      Next Appointment
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {nextAppointment.client?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-white">{nextAppointment.client?.name}</div>
                          <div className="text-sm text-gray-400">{nextAppointment.service?.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {new Date(nextAppointment.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-xs text-gray-500">Upcoming</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!currentAppointment && !nextAppointment && (
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <div className="p-4 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-400">No appointments scheduled for today</p>
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="text-amber-500 text-sm mt-2 hover:text-amber-400"
                    >
                      Schedule an appointment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-white">Messages</h3>
                    {unreadCount?.count > 0 && (
                      <span className="bg-amber-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                        {unreadCount.count}
                      </span>
                    )}
                  </div>
                  <button className="text-amber-500 text-sm">View All</button>
                </div>
                <p className="text-sm text-gray-400">
                  {unreadCount?.count > 0 
                    ? `${unreadCount.count} new message${unreadCount.count > 1 ? 's' : ''} waiting`
                    : 'No new messages'
                  }
                </p>
              </div>
            </div>

            {/* Recent Gallery */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Recent Work</h3>
              </div>
              <div className="p-4">
                {recentPhotos && recentPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {recentPhotos.map((photo) => (
                      <div key={photo.id} className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
                        <img 
                          src={photo.photoUrl} 
                          alt="Recent work" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recent photos</p>
                    <p className="text-xs mt-1">Upload photos to showcase your work</p>
                  </div>
                )}
              </div>
            </div>

            {/* Business Stats */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Business Overview</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-500">{clients?.length || 0}</div>
                    <div className="text-xs text-gray-400">Total Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-500">{services?.length || 0}</div>
                    <div className="text-xs text-gray-400">Active Services</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-500">{unreadCount?.count || 0}</div>
                    <div className="text-xs text-gray-400">Unread Messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-500">{recentPhotos?.length || 0}</div>
                    <div className="text-xs text-gray-400">Portfolio Photos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No confirmed appointments scheduled for today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Work Gallery */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Work</h3>
                <button className="text-amber-500 text-sm font-medium">Gallery</button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {photosLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-700 rounded-lg p-2">
                        <div className="w-full h-20 bg-gray-600 rounded animate-pulse" />
                        <div className="text-xs text-center mt-1 text-gray-400">Loading...</div>
                      </div>
                    ))}
                  </>
                ) : recentPhotos?.length ? (
                  recentPhotos.map((photo) => (
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
        )}

        {/* Calendar */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {/* Date Navigation */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setCalendarDate(newDate);
                  }}
                  className="bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-2 px-4 rounded-lg"
                >
                  ←
                </button>
                
                <div className="text-center">
                  <h2 className="text-lg font-bold text-white">
                    {calendarDate.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <div className="text-sm text-gray-400">
                    {calendarAppointmentsForDate.filter(apt => apt.status === 'confirmed').length} confirmed
                  </div>
                </div>

                <button
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setCalendarDate(newDate);
                  }}
                  className="bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-2 px-4 rounded-lg"
                >
                  →
                </button>
              </div>
              
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-2 px-4 rounded-lg"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Timeline/List/Add Controls */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`py-2 px-4 rounded-lg ${
                      viewMode === 'timeline' 
                        ? 'bg-amber-500 text-gray-900' 
                        : 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`py-2 px-4 rounded-lg ${
                      viewMode === 'list' 
                        ? 'bg-amber-500 text-gray-900' 
                        : 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    List
                  </button>
                </div>
                <button 
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium"
                  onClick={() => setActiveTab('appointment-new')}
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Appt.
                </button>
              </div>
            </div>

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg">
                {appointmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="space-y-0">
                      {generateMobileTimeSlots().map((slot) => {
                        const now = new Date();
                        const currentHour = now.getHours();
                        const currentMinutes = now.getMinutes();
                        const isToday = calendarDate.toDateString() === now.toDateString();
                        const isCurrentHour = isToday && slot.hour === currentHour;
                        
                        // Get service-based color for appointments
                        const getServiceColor = (serviceName?: string): string => {
                          if (!serviceName) return '#6B7280';
                          const name = serviceName.toLowerCase();
                          
                          if (name.includes('haircut') || name.includes('cut')) return '#F59E0B';
                          if (name.includes('beard') || name.includes('trim')) return '#10B981';
                          if (name.includes('shave')) return '#3B82F6';
                          if (name.includes('styling') || name.includes('wash')) return '#8B5CF6';
                          if (name.includes('color') || name.includes('dye')) return '#EC4899';
                          
                          return '#6B7280';
                        };
                        
                        return (
                          <div
                            key={slot.hour}
                            className={`relative flex items-start border-b border-gray-700 ${
                              slot.isBlocked
                                ? 'bg-gray-900/50'
                                : 'bg-gray-800'
                            }`}
                            style={{ minHeight: '80px' }}
                          >
                            {/* Time Label */}
                            <div className="w-20 p-4 text-sm font-medium text-gray-300 flex-shrink-0 border-r border-gray-700">
                              {slot.time}
                            </div>
                            
                            {/* Content Area */}
                            <div className="flex-1 relative p-4">
                              {slot.appointments.length > 0 ? (
                                <div className="space-y-2">
                                  {slot.appointments.map((appointment) => {
                                    const startTime = new Date(appointment.scheduledAt);
                                    const appointmentMinutes = startTime.getMinutes();
                                    const serviceColor = getServiceColor(appointment.service?.name);
                                    
                                    return (
                                      <div
                                        key={appointment.id}
                                        onClick={() => {
                                          setSelectedAppointment(appointment);
                                          setIsDetailsDialogOpen(true);
                                        }}
                                        className="p-3 rounded-lg cursor-pointer text-sm border-l-4 shadow-sm hover:shadow-md transition-shadow"
                                        style={{ 
                                          backgroundColor: `${serviceColor}20`,
                                          borderLeftColor: serviceColor,
                                          color: serviceColor
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-semibold text-white">
                                              {appointment.client?.name || 'Unknown Client'}
                                            </div>
                                            <div className="text-xs opacity-75 mt-1 text-gray-300">
                                              {appointment.service?.name || 'No service'} • {appointment.duration}min
                                            </div>
                                            {appointmentMinutes > 0 && (
                                              <div className="text-xs opacity-60 mt-1 text-gray-400">
                                                {startTime.toLocaleTimeString('en-US', {
                                                  hour: 'numeric',
                                                  minute: '2-digit',
                                                  hour12: true
                                                })}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: serviceColor, color: 'white' }}>
                                            {appointment.status.toUpperCase()}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 py-2">
                                  {slot.isBlocked ? 'Outside working hours' : 'Available'}
                                </div>
                              )}
                            </div>
                            
                            {/* Current Time Indicator */}
                            {isCurrentHour && (
                              <div
                                className="absolute left-0 right-0 z-50 pointer-events-none"
                                style={{ 
                                  top: `${(currentMinutes / 60) * 80}px`,
                                  height: '2px'
                                }}
                              >
                                <div className="flex items-center">
                                  <div className="w-20 h-6 bg-red-500 rounded-r-full flex items-center justify-center">
                                    <div className="w-3 h-3 bg-white rounded-full" />
                                  </div>
                                  <div className="flex-1 h-0.5 bg-red-500" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                {appointmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : calendarAppointmentsForDate.length > 0 ? (
                  <div className="space-y-3">
                    {calendarAppointmentsForDate.map((appointment) => (
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
                    <p>No appointments scheduled for this day</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Appointment Creation */}
        {activeTab === 'appointment-new' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">New Appointment</h2>
              </div>
            </div>

            {/* Client Selection */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Select Client</h3>
              <select
                value={appointmentForm.clientId}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Choose a client...</option>
                {clients?.map(client => (
                  <option key={client.id} value={client.id.toString()}>
                    {client.name} - {client.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Selection */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Select Services</h3>
              <div className="space-y-3">
                {services?.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-white">{service.name}</div>
                      <div className="text-sm text-gray-400">${service.price} • {service.duration}min</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const existing = appointmentForm.services.find(s => s.serviceId === service.id);
                          if (existing) {
                            setAppointmentForm(prev => ({
                              ...prev,
                              services: prev.services.map(s => 
                                s.serviceId === service.id ? { ...s, quantity: Math.max(0, s.quantity - 1) } : s
                              ).filter(s => s.quantity > 0)
                            }));
                          }
                        }}
                        className="w-8 h-8 bg-gray-600 text-white border border-gray-500 rounded-lg hover:bg-gray-500 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white w-8 text-center">
                        {appointmentForm.services.find(s => s.serviceId === service.id)?.quantity || 0}
                      </span>
                      <button
                        onClick={() => {
                          const existing = appointmentForm.services.find(s => s.serviceId === service.id);
                          if (existing) {
                            setAppointmentForm(prev => ({
                              ...prev,
                              services: prev.services.map(s => 
                                s.serviceId === service.id ? { ...s, quantity: s.quantity + 1 } : s
                              )
                            }));
                          } else {
                            setAppointmentForm(prev => ({
                              ...prev,
                              services: [...prev.services, { serviceId: service.id, quantity: 1 }]
                            }));
                          }
                        }}
                        className="w-8 h-8 bg-gray-600 text-white border border-gray-500 rounded-lg hover:bg-gray-500 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Date & Time</h3>
              <input
                type="datetime-local"
                value={appointmentForm.scheduledAt}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Travel Option */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Travel Service</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeTravel"
                    checked={appointmentForm.includeTravel}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, includeTravel: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="includeTravel" className="text-white">
                    Include travel to client location
                  </label>
                </div>
                {appointmentForm.includeTravel && (
                  <textarea
                    placeholder="Client address..."
                    value={appointmentForm.address}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                    rows={2}
                  />
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Notes (Optional)</h3>
              <textarea
                placeholder="Additional notes..."
                value={appointmentForm.notes}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  resetAppointmentForm();
                  setActiveTab('calendar');
                }}
                className="flex-1 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-3 px-4 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createAppointment}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-900 py-3 px-4 rounded-lg font-medium"
              >
                Create Appointment
              </button>
            </div>
          </div>
        )}

        {/* Clients */}
        {activeTab === 'clients' && (
          <div className="space-y-6 pb-4">
            {/* Client Stats Card */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4 mt-4">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-semibold">Client Analytics</h3>
                <button
                  className="text-gray-400 hover:text-white p-1"
                  onClick={() => setShowClientStats(!showClientStats)}
                >
                  {showClientStats ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showClientStats && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4 mb-6">
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
                  
                  {/* Top Clients */}
                  {clients && clients.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-white">Top Clients</h4>
                      {clients
                        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
                        .slice(0, 3)
                        .map((client, index) => (
                          <div key={client.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-gray-900">
                                {index + 1}
                              </div>
                              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                                <span className="text-gray-900 font-medium text-xs">
                                  {client.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-white text-sm">{client.name}</div>
                                <div className="text-xs text-gray-400">{client.totalVisits || 0} visits</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-amber-500 font-medium text-sm">${client.totalSpent || '0'}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
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
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium flex items-center space-x-2"
                  onClick={() => setIsClientDialogOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
            
            {/* Client List */}
            <div className="mx-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg">
                {clientsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : filteredClients.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {filteredClients.map((client) => (
                      <div key={client.id} className="p-4 hover:bg-gray-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                              <span className="text-gray-900 font-medium text-sm">
                                {client.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <div className="font-medium text-white">{client.name}</div>
                                {client.loyaltyStatus === 'vip' && (
                                  <div className="bg-amber-500 text-gray-900 px-2 py-1 rounded text-xs font-medium">
                                    VIP
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">{client.phone}</div>
                              {client.email && (
                                <div className="text-xs text-gray-500">{client.email}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-amber-500 font-medium">
                              ${client.totalSpent || '0'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {client.totalVisits || 0} visits
                            </div>
                            {client.lastVisit && (
                              <div className="text-xs text-gray-500">
                                Last: {new Date(client.lastVisit).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Client Actions */}
                        <div className="flex items-center space-x-2 mt-3">
                          <button className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white">
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </button>
                          <button className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white">
                            <MessageSquare className="w-3 h-3" />
                            <span>Message</span>
                          </button>
                          <button className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white">
                            <Plus className="w-3 h-3" />
                            <span>Book</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No clients found</p>
                    <button 
                      className="text-amber-500 text-sm mt-2 hover:text-amber-400"
                      onClick={() => setIsClientDialogOpen(true)}
                    >
                      Add your first client
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoices */}
        {activeTab === 'services' && (
          <div className="space-y-6 pb-4">
            {/* Quick Invoice Templates */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4 mt-4">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Quick Invoice Templates</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Default Templates */}
                  {!hiddenTemplates.includes("haircut") && (
                    <div
                      className="relative bg-gray-700 border border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handleQuickInvoice("haircut", "45.00")}
                    >
                      <button
                        className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDefaultTemplate("haircut");
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="flex flex-col items-center space-y-2">
                        <Receipt className="w-5 h-5 text-amber-500" />
                        <div className="text-sm font-medium text-white">Haircut</div>
                        <div className="text-xs text-gray-400">$45</div>
                      </div>
                    </div>
                  )}
                  {!hiddenTemplates.includes("beard") && (
                    <div
                      className="relative bg-gray-700 border border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handleQuickInvoice("beard", "25.00")}
                    >
                      <button
                        className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDefaultTemplate("beard");
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="flex flex-col items-center space-y-2">
                        <Receipt className="w-5 h-5 text-amber-500" />
                        <div className="text-sm font-medium text-white">Beard Trim</div>
                        <div className="text-xs text-gray-400">$25</div>
                      </div>
                    </div>
                  )}
                  {!hiddenTemplates.includes("combo") && (
                    <div
                      className="relative bg-gray-700 border border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handleQuickInvoice("combo", "65.00")}
                    >
                      <button
                        className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDefaultTemplate("combo");
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="flex flex-col items-center space-y-2">
                        <Receipt className="w-5 h-5 text-amber-500" />
                        <div className="text-sm font-medium text-white">Combo</div>
                        <div className="text-xs text-gray-400">$65</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Saved Templates */}
                  {savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="relative bg-gray-700 border border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handleQuickInvoice(template.category, template.amount, template)}
                    >
                      <button
                        className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="flex flex-col items-center space-y-2">
                        <Receipt className="w-5 h-5 text-amber-500" />
                        <div className="text-sm font-medium text-white">{template.name}</div>
                        <div className="text-xs text-gray-400">${template.amount}</div>
                      </div>
                    </div>
                  ))}

                  {/* Custom Invoice Button */}
                  <button
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-600 transition-colors flex flex-col items-center space-y-2"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Plus className="w-5 h-5 text-amber-500" />
                    <div className="text-sm font-medium text-white">Custom</div>
                    <div className="text-xs text-gray-400">Any amount</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Invoice Stats */}
            <div className="grid grid-cols-4 gap-4 mx-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-500">
                  {invoices?.length || 0}
                </div>
                <div className="text-xs text-gray-400">Total Invoices</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-500">
                  {invoices?.filter((i) => i.status === "paid").length || 0}
                </div>
                <div className="text-xs text-gray-400">Paid</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center col-span-2">
                <div className="text-3xl font-bold text-amber-500">
                  $
                  {invoices
                    ?.filter((i) => i.status === "paid")
                    .reduce((sum, i) => sum + parseFloat(i.total), 0)
                    .toFixed(2) || "0.00"}
                </div>
                <div className="text-sm text-gray-400">Revenue</div>
              </div>
            </div>

            {/* Quick Invoice Templates Creator */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-semibold">Create Quick Templates</h3>
                <button
                  className="bg-gray-700 border border-gray-600 text-amber-500 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                  onClick={() => setIsTemplateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1 inline" />
                  New Template
                </button>
              </div>
              <div className="p-4">
                <p className="text-gray-400 text-sm mb-4">
                  Create custom invoice templates for frequently used services.
                  Templates can be quickly selected when creating new invoices,
                  saving you time and ensuring consistent pricing.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div className="text-sm font-medium text-white">Quick Access</div>
                    <div className="text-xs text-gray-400">One-tap invoicing</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div className="text-sm font-medium text-white">Consistent Pricing</div>
                    <div className="text-xs text-gray-400">Standardized rates</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Management */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-semibold">Service Templates</h3>
                <button
                  className="bg-gray-700 border border-gray-600 text-amber-500 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                  onClick={() => setIsServiceCreateOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1 inline" />
                  Add Service
                </button>
              </div>
              <div className="p-4">
                {services && services.length > 0 ? (
                  <div className="space-y-3">
                    {services.map((service) => {
                      const serviceInUse = isServiceInUse(service.id);
                      return (
                        <div
                          key={service.id}
                          className={`flex items-center justify-between p-3 bg-gray-700 rounded-lg border transition-colors ${
                            serviceInUse
                              ? "border-amber-500/40 cursor-not-allowed"
                              : "border-gray-600 cursor-pointer hover:border-amber-500/50"
                          }`}
                          onClick={() => handleEditService(service)}
                        >
                          <div className="flex-1">
                            {serviceInUse && (
                              <div className="text-xs border border-amber-500/40 text-amber-400 bg-amber-500/10 rounded px-2 py-1 mb-2 inline-block">
                                In Use
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-white">{service.name}</h3>
                              </div>
                              <span className="text-amber-500 font-bold">${service.price}</span>
                            </div>
                            {service.description && (
                              <p className="text-sm text-gray-400 mt-1">{service.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="text-xs border border-gray-600 text-gray-400 rounded px-2 py-1">
                                {service.category}
                              </div>
                              <span className="text-xs text-gray-400">{service.duration} min</span>
                            </div>
                            {serviceInUse && (
                              <p className="text-xs text-amber-400 mt-1">
                                Referenced in existing appointments - cannot edit or delete
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              className={`${
                                serviceInUse
                                  ? "text-gray-500 cursor-not-allowed"
                                  : "text-red-400 hover:bg-red-400/10"
                              } p-1 rounded`}
                              disabled={serviceInUse}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteService(service.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Scissors className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No services created yet</p>
                    <button
                      onClick={() => setIsServiceCreateOpen(true)}
                      className="text-amber-500 text-sm mt-2 p-0 h-auto"
                    >
                      Add your first service
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-semibold">Recent Invoices</h3>
                <button
                  className="text-gray-400 hover:text-white p-1"
                  onClick={() => setShowRecentInvoices(!showRecentInvoices)}
                >
                  {showRecentInvoices ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="p-4">
                {invoicesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : showRecentInvoices && invoices && invoices.length > 0 ? (
                  <div className="space-y-3">
                    {invoices.slice(0, 10).map((invoice) => {
                      const client = clients?.find((c) => c.id === invoice.clientId);
                      return (
                        <div
                          key={invoice.id}
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsInvoiceDetailsOpen(true);
                          }}
                          className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                              {invoice.paymentMethod === "stripe" && (
                                <CreditCard className="w-4 h-4 text-amber-500" />
                              )}
                              {invoice.paymentMethod === "apple_pay" && (
                                <Smartphone className="w-4 h-4 text-amber-500" />
                              )}
                              {invoice.paymentMethod === "cash" && (
                                <Banknote className="w-4 h-4 text-amber-500" />
                              )}
                              {!invoice.paymentMethod && (
                                <Receipt className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">
                                {client?.name || "Unknown Client"}
                              </div>
                              <div className="text-sm text-gray-400">
                                {new Date(invoice.createdAt!).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-amber-500 font-medium">${invoice.total}</div>
                            <div
                              className={`text-xs px-2 py-1 rounded ${
                                invoice.status === "paid"
                                  ? "bg-green-500/20 text-green-400"
                                  : invoice.status === "pending"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {invoice.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (invoices && invoices.length <= 0) || !invoices ? (
                  <div className="text-center py-8 text-gray-400">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No invoices created yet</p>
                    <button
                      onClick={() => setIsDialogOpen(true)}
                      className="text-amber-500 text-sm mt-2 p-0 h-auto"
                    >
                      Create your first invoice
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Export Invoices */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mx-4">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-semibold">Export Invoices</h3>
                <button
                  className="text-gray-400 hover:text-white p-1"
                  onClick={() => setShowExportCard(!showExportCard)}
                >
                  {showExportCard ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="p-4">
                {showExportCard && (!invoices || invoices.length === 0) ? (
                  <div className="text-center py-8 text-gray-400">
                    <Share className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No invoices to export</p>
                    <p className="text-xs mt-1">Create invoices first to enable export</p>
                  </div>
                ) : showExportCard && invoices && invoices.length > 0 ? (
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <Share className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <div className="font-medium text-white">CSV Export</div>
                          <div className="text-xs text-gray-400">
                            Export {invoices?.length} invoices to email as CSV file
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => exportInvoicesMutation.mutate()}
                        disabled={exportInvoicesMutation.isPending}
                        className="bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded text-sm hover:bg-amber-400 disabled:opacity-50"
                      >
                        {exportInvoicesMutation.isPending ? "Sending..." : "Email CSV"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <MobileSettingsPage />
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
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Email</label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => handleClientFormChange('email', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="client@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Address</label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={(e) => handleClientFormChange('address', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="123 Main St, City, State"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Preferred Style</label>
                <input
                  type="text"
                  value={clientForm.preferredStyle}
                  onChange={(e) => handleClientFormChange('preferredStyle', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  placeholder="e.g., Fade, Buzz cut, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Notes</label>
                <textarea
                  value={clientForm.notes}
                  onChange={(e) => handleClientFormChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Any special notes about this client..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Loyalty Status</label>
                <select
                  value={clientForm.loyaltyStatus}
                  onChange={(e) => handleClientFormChange('loyaltyStatus', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={() => setIsClientDialogOpen(false)}
                  className="flex-1 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateClient}
                  disabled={!clientForm.name || createClientMutation.isPending}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                >
                  {createClientMutation.isPending ? 'Adding...' : 'Add Client'}
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