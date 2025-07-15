import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  ShieldOff,
  LogOut,
  Edit3,
  Camera,
  Upload,
  X,
  CreditCard,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Share,
  Copy,
  Calendar,
  MessageSquare,
  Phone,
  Smartphone,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Home,
  Users,
  BookOpen,
  Menu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Phone number validation regex (US format)
const phoneRegex =
  /^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

// Phone number formatting function
const formatPhoneNumber = (value: string): string => {
  if (!value) return value;
  
  // Remove all non-digits
  const phoneNumber = value.replace(/[^\d]/g, "");
  
  // Don't format if number is too short
  if (phoneNumber.length < 4) return phoneNumber;
  
  // Format as (XXX) XXX-XXXX
  if (phoneNumber.length < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

// Form schema for profile updates
const profileSchema = z.object({
  businessName: z.string().optional(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || phoneRegex.test(val), {
      message: "Please enter a valid phone number (e.g., (555) 123-4567)",
    }),
  serviceArea: z.string().optional(),
  about: z.string().optional(),
  photoUrl: z.string().optional(),
  homeBaseAddress: z.string().optional(),
  timezone: z.string().optional(),
  defaultGraceTime: z.number().min(0).max(60).optional(),
  transportationMode: z
    .enum(["driving", "walking", "cycling", "transit"])
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Password change schema
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

// User type from database
interface User {
  id: number;
  username: string;
  email?: string | null;
  businessName?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  address?: string | null;
  photoUrl?: string | null;
  serviceArea?: string | null;
  about?: string | null;
  workingHours?: any;
  travelTimeBuffer?: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: string;
}

export default function MobileSettings() {
  const [notificationSettings, setNotificationSettings] = useState({
    newBookingRequests: true,
    appointmentConfirmations: true,
    appointmentCancellations: true,
    upcomingReminders: true,
    soundEffects: true,
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showNotificationCard, setShowNotificationCard] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { signOut } = useAuth();

  // Supported file types for photo upload
  const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  // Form setup
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: "",
      email: "",
      phone: "",
      serviceArea: "",
      about: "",
      photoUrl: "",
      homeBaseAddress: "",
      timezone: "America/New_York",
      defaultGraceTime: 5,
      transportationMode: "driving",
    },
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Fetch user profile data
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user/profile"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch blocked clients
  const { data: blockedClients = [] } = useQuery<any[]>({
    queryKey: ["/api/anti-spam/blocked-clients"],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setIsEditingProfile(false);
      setPreviewUrl(null);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormData) => {
      return await apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      passwordForm.reset();
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully",
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

  // Unblock client mutation
  const unblockClientMutation = useMutation({
    mutationFn: async ({ phoneNumber }: { phoneNumber: string }) => {
      return await apiRequest("POST", "/api/anti-spam/unblock", {
        phoneNumber,
      });
    },
    onSuccess: () => {
      toast({
        title: "Client Unblocked",
        description: "This phone number can now send booking requests again.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/anti-spam/blocked-clients"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock client",
        variant: "destructive",
      });
    },
  });

  // Push notification subscription status
  const { data: pushSubscriptionStatus, refetch: refetchPushSubscription } =
    useQuery({
      queryKey: ["/api/push/subscription"],
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

  // Get subscription status
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/stripe/subscription-status"],
    retry: false,
  });

  // Push notification handlers
  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      // Enable push notifications
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
          });

          await apiRequest("POST", "/api/push/subscribe", { subscription });
          refetchPushSubscription();
          toast({
            title: "Push Notifications Enabled",
            description: "You'll now receive notifications for new bookings and appointments.",
          });
        } catch (error) {
          console.error("Error subscribing to push notifications:", error);
          toast({
            title: "Permission Required",
            description: "Please allow notifications in your browser settings.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Not Supported",
          description: "Push notifications are not supported in this browser.",
          variant: "destructive",
        });
      }
    } else {
      // Disable push notifications
      await apiRequest("POST", "/api/push/unsubscribe");
      refetchPushSubscription();
      toast({
        title: "Push Notifications Disabled",
        description: "You'll no longer receive push notifications.",
      });
    }
  };

  const handleNotificationTypeToggle = (
    type: keyof typeof notificationSettings,
    checked: boolean,
  ) => {
    setNotificationSettings((prev) => ({ ...prev, [type]: checked }));
    // Store in localStorage for persistence
    localStorage.setItem(`notification_${type}`, checked.toString());

    toast({
      title: checked ? "Notification Enabled" : "Notification Disabled",
      description: `${type.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} notifications ${checked ? "enabled" : "disabled"}`,
    });
  };

  // Initialize notification settings from localStorage
  useEffect(() => {
    const savedSettings = Object.keys(notificationSettings).reduce((acc, key) => {
      const saved = localStorage.getItem(`notification_${key}`);
      acc[key as keyof typeof notificationSettings] = saved !== null ? saved === "true" : true;
      return acc;
    }, {} as typeof notificationSettings);

    setNotificationSettings(savedSettings);
  }, []);

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        businessName: user.businessName || "",
        email: user.email || "",
        phone: user.phone || "",
        serviceArea: user.serviceArea || "",
        about: user.about || "",
        photoUrl: user.photoUrl || "",
        homeBaseAddress: (user as any).homeBaseAddress || "",
        timezone: (user as any).timezone || "America/New_York",
        defaultGraceTime: (user as any).defaultGraceTime || 5,
        transportationMode: (user as any).transportationMode || "driving",
      });
      if (user.photoUrl && previewUrl !== null) {
        setPreviewUrl(user.photoUrl);
      }
    }
  }, [user, form]);

  const handleFileSelect = (file: File) => {
    // Check file type
    if (!SUPPORTED_TYPES.includes(file.type.toLowerCase())) {
      toast({
        title: "Unsupported File Format",
        description: "Please upload JPEG, PNG, or WEBP images only. HEIC files are not supported.",
        variant: "destructive",
      });
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast({
        title: "File Too Large",
        description: `File size is ${sizeMB}MB. Please choose an image under 10MB.`,
        variant: "destructive",
      });
      return;
    }

    // File is valid, convert to base64 for persistent storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      form.setValue("photoUrl", base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordChangeFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const copyBookingLink = () => {
    if (user?.phone) {
      const bookingUrl = `${window.location.origin}/book/${user.phone.replace(/\D/g, '')}-${user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`;
      navigator.clipboard.writeText(bookingUrl);
      toast({
        title: "Link Copied",
        description: "Booking link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Mobile Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SettingsIcon className="w-6 h-6 text-amber-500 mr-3" />
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "bg-amber-500 text-gray-900"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("blocked")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "blocked"
                ? "bg-amber-500 text-gray-900"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Blocked Clients
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <>
            {/* Profile Settings */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Profile & Business Info
                  </CardTitle>
                  <Dialog
                    open={isEditingProfile}
                    onOpenChange={setIsEditingProfile}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-500 hover:bg-amber-500/10"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto scrollbar-hide w-[calc(100vw-2rem)] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          Edit Profile
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-4"
                        >
                          {/* Photo Upload */}
                          <div className="space-y-4">
                            <Label className="text-white">Profile Photo</Label>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={handleFileChange}
                              className="hidden"
                            />

                            {previewUrl ? (
                              <div className="relative">
                                <img
                                  src={previewUrl}
                                  alt="Profile preview"
                                  className="w-24 h-24 object-cover rounded-full border border-gray-600"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-8 w-8 bg-red-500 hover:bg-red-600 text-white rounded-full p-0"
                                  onClick={() => {
                                    setPreviewUrl(null);
                                    form.setValue("photoUrl", "");
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border border-gray-600">
                                <User className="w-8 h-8 text-gray-400" />
                              </div>
                            )}

                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.setAttribute("capture", "environment");
                                    fileInputRef.current.click();
                                  }
                                }}
                                className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                              >
                                <Camera className="w-4 h-4 mr-2" />
                                Camera
                              </Button>
                            </div>
                          </div>

                          {/* Business Name */}
                          <FormField
                            control={form.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">
                                  Business Name
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g., ClipCutMan Barber Shop"
                                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-amber-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Email */}
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">
                                  Email Address
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="your.email@example.com"
                                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-amber-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Phone */}
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">
                                  Phone Number
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="(555) 123-4567"
                                    onChange={(e) => {
                                      const formatted = formatPhoneNumber(e.target.value);
                                      field.onChange(formatted);
                                    }}
                                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-amber-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Service Area */}
                          <FormField
                            control={form.control}
                            name="serviceArea"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">
                                  Service Area
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g., Downtown Manhattan, Brooklyn"
                                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-amber-500"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* About */}
                          <FormField
                            control={form.control}
                            name="about"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">
                                  About You
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Tell clients about your experience, specialties, and what makes you unique..."
                                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-amber-500 resize-none scrollbar-hide"
                                    rows={4}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Timezone */}
                          <FormField
                            control={form.control}
                            name="timezone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">
                                  Timezone
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                                      <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-gray-800 border-gray-600">
                                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                                    <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                                    <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsEditingProfile(false)}
                              className="border-gray-600 text-white hover:bg-gray-800"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-amber-500 text-gray-900 hover:bg-amber-600"
                              disabled={updateProfileMutation.isPending}
                            >
                              {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    {user?.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt="Profile"
                        className="w-16 h-16 object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate">
                      {user?.businessName || "Business Name"}
                    </h3>
                    <p className="text-gray-400 text-sm truncate">
                      {user?.email || "No email set"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="min-w-0">
                    <Label className="text-gray-400">Phone</Label>
                    <p className="text-white truncate">
                      {user?.phone || "Not set"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-gray-400">Service Area</Label>
                    <p className="text-white truncate">
                      {user?.serviceArea || "Not set"}
                    </p>
                  </div>
                </div>

                {user?.about && (
                  <div className="min-w-0">
                    <Label className="text-gray-400">About</Label>
                    <p className="text-white text-sm break-words">
                      {user.about}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Link */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Share className="w-5 h-5 mr-2" />
                  Public Booking Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.phone ? (
                  <div className="space-y-3">
                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <p className="text-gray-400 text-sm mb-2">
                        Share this link with clients to let them book appointments:
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-mono truncate">
                            {`${window.location.origin}/book/${user.phone.replace(/\D/g, '')}-${user.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyBookingLink}
                          className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 flex-shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
                        <Calendar className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <div className="text-xs font-medium text-white">
                          Real-time Calendar
                        </div>
                        <div className="text-xs text-gray-400">
                          Shows your availability
                        </div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
                        <MessageSquare className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <div className="text-xs font-medium text-white">
                          Direct Booking
                        </div>
                        <div className="text-xs text-gray-400">
                          Requests sent to inbox
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
                    <p className="text-gray-400 text-sm">
                      Add your phone number to profile to generate your booking link
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notifications
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotificationCard(!showNotificationCard)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showNotificationCard ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showNotificationCard && (
                <CardContent className="space-y-4">
                  {/* Push Notifications Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Push Notifications</Label>
                      <p className="text-xs text-gray-400">
                        Receive notifications from this device
                      </p>
                    </div>
                    <Switch
                      checked={!!pushSubscriptionStatus?.subscribed}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>

                  {/* Individual Notification Types */}
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </Label>
                        <p className="text-xs text-gray-400">
                          {key === 'newBookingRequests' && 'When clients request appointments'}
                          {key === 'appointmentConfirmations' && 'When clients confirm appointments'}
                          {key === 'appointmentCancellations' && 'When clients cancel appointments'}
                          {key === 'upcomingReminders' && 'Reminders for upcoming appointments'}
                          {key === 'soundEffects' && 'Sound effects for notifications'}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          handleNotificationTypeToggle(key as keyof typeof notificationSettings, checked)
                        }
                      />
                    </div>
                  ))}

                  {/* Test Notification */}
                  {pushSubscriptionStatus?.subscribed && (
                    <div className="pt-2 border-t border-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => apiRequest("POST", "/api/push/test").then(() => {
                          toast({
                            title: "Test Notification Sent",
                            description: "Check your device for the test notification.",
                          });
                        })}
                        className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Send Test Notification
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Security */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Password</Label>
                    <p className="text-gray-400 text-sm">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-white hover:bg-gray-800"
                      >
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700 w-[calc(100vw-2rem)] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-white">Change Password</DialogTitle>
                      </DialogHeader>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Current Password</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    {...field}
                                    className="bg-gray-800 border-gray-600 text-white"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">New Password</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    {...field}
                                    className="bg-gray-800 border-gray-600 text-white"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    {...field}
                                    className="bg-gray-800 border-gray-600 text-white"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsChangingPassword(false)}
                              className="border-gray-600 text-white hover:bg-gray-800"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-amber-500 text-gray-900 hover:bg-amber-600"
                              disabled={changePasswordMutation.isPending}
                            >
                              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Blocked Clients Tab */}
        {activeTab === "blocked" && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Blocked Clients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {blockedClients.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-white font-medium mb-2">
                    No Blocked Clients
                  </h3>
                  <p className="text-gray-400 text-sm">
                    You haven't blocked any clients yet. When you block a client, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedClients.map((client) => (
                    <div
                      key={client.id}
                      className="bg-gray-800 p-4 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {client.phoneNumber}
                            </div>
                            <div className="text-gray-400 text-sm">
                              Blocked{" "}
                              {new Date(client.blockedAt).toLocaleDateString()}
                            </div>
                            {client.reason && (
                              <div className="text-gray-400 text-xs mt-1">
                                Reason: {client.reason}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            unblockClientMutation.mutate({
                              phoneNumber: client.phoneNumber,
                            })
                          }
                          disabled={unblockClientMutation.isPending}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <ShieldOff className="w-4 h-4 mr-2" />
                          Unblock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}