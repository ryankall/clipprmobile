import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  ShieldOff,
  HelpCircle,
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
  ExternalLink,
  Home,
  MapPin,
  Clock,
  Car,
  Star,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

const phoneRegex = /^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

const formatPhoneNumber = (value: string): string => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, "");
  if (phoneNumber.length < 4) return phoneNumber;
  if (phoneNumber.length < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

const profileSchema = z.object({
  businessName: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string().optional().refine((val) => !val || phoneRegex.test(val), {
    message: "Please enter a valid phone number (e.g., (555) 123-4567)",
  }),
  serviceArea: z.string().optional(),
  about: z.string().optional(),
  photoUrl: z.string().optional(),
  timezone: z.string().optional(),
  homeBaseAddress: z.string().optional(),
  defaultGraceTime: z.number().min(0).max(60).optional(),
  transportationMode: z.enum(["driving", "walking", "cycling", "transit"]).optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function MobileSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    newBookingRequests: true,
    appointmentConfirmations: true,
    appointmentCancellations: true,
    upcomingReminders: true,
    soundEffects: true,
  });
  const [showNotificationCard, setShowNotificationCard] = useState(false);
  const [showPaymentSettingsCard, setShowPaymentSettingsCard] = useState(false);
  const [showQuickActionCard, setShowQuickActionCard] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user/profile"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: stripeStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/stripe/status"],
  });

  const { data: blockedClients = [] } = useQuery<any[]>({
    queryKey: ["/api/anti-spam/blocked-clients"],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const { data: pushSubscriptionData } = useQuery<{ subscribed: boolean }>({
    queryKey: ["/api/push/subscription"],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const { data: subscription, refetch: refetchSubscription } = useQuery<any>({
    queryKey: ["/api/stripe/subscription"],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
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
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      passwordForm.reset();
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Phone verification mutations
  const sendVerificationCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to send verification code");
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsCodeSent(true);
      setCountdown(60);
      
      const description = data?.developerNote 
        ? `Development mode: ${data.developerNote}`
        : "Please check your phone for the verification code.";
      
      toast({
        title: "Verification Code Sent",
        description: description,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyPhoneCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error("Invalid verification code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setIsVerifyingPhone(false);
      setVerificationCode("");
      setIsCodeSent(false);
      toast({
        title: "Phone Verified",
        description: "Your phone number has been successfully verified!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // Unblock client mutation
  const unblockClientMutation = useMutation({
    mutationFn: async ({ phoneNumber }: { phoneNumber: string }) => {
      const response = await fetch("/api/anti-spam/unblock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!response.ok) throw new Error("Failed to unblock client");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Unblocked",
        description: "This phone number can now send booking requests again.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/anti-spam/blocked-clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock client",
        variant: "destructive",
      });
    },
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      form.reset({
        businessName: user.businessName || "",
        email: user.email || "",
        phone: user.phone || "",
        serviceArea: user.serviceArea || "",
        about: user.about || "",
        photoUrl: user.profileImageUrl || "",
        homeBaseAddress: user.homeBaseAddress || "",
        timezone: "America/New_York",
        defaultGraceTime: 5,
        transportationMode: "driving",
      });
    }
  }, [user, form]);

  // Initialize notification settings from localStorage
  useEffect(() => {
    const savedSoundEffects = localStorage.getItem("soundEffects");
    const savedNewBookingRequests = localStorage.getItem("notification_newBookingRequests");
    const savedAppointmentConfirmations = localStorage.getItem("notification_appointmentConfirmations");
    const savedAppointmentCancellations = localStorage.getItem("notification_appointmentCancellations");
    const savedUpcomingReminders = localStorage.getItem("notification_upcomingReminders");

    const settings = {
      newBookingRequests: savedNewBookingRequests !== null ? savedNewBookingRequests === "true" : true,
      appointmentConfirmations: savedAppointmentConfirmations !== null ? savedAppointmentConfirmations === "true" : true,
      appointmentCancellations: savedAppointmentCancellations !== null ? savedAppointmentCancellations === "true" : true,
      upcomingReminders: savedUpcomingReminders !== null ? savedUpcomingReminders === "true" : true,
      soundEffects: savedSoundEffects !== null ? savedSoundEffects === "true" : true,
    };

    setNotificationSettings(settings);
    setSoundEffects(settings.soundEffects);
  }, []);

  // Countdown timer for phone verification
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

      if (file.type === 'image/heic' || file.type === 'image/heif') {
        toast({
          title: "Unsupported Format",
          description: "HEIC files are not supported. Please use JPEG, PNG, or WEBP format.",
          variant: "destructive",
        });
        return;
      }

      if (!SUPPORTED_TYPES.includes(file.type)) {
        toast({
          title: "Unsupported Format",
          description: "Please upload a JPEG, PNG, or WEBP image.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  const clearPhoto = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyBookingUrl = () => {
    const bookingUrl = `${window.location.origin}/book/${user?.phone?.replace(/\D/g, '')}-${user?.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNotificationTypeToggle = (type: keyof typeof notificationSettings, checked: boolean) => {
    setNotificationSettings((prev) => ({ ...prev, [type]: checked }));
    localStorage.setItem(`notification_${type}`, checked.toString());

    toast({
      title: checked ? "Notification Enabled" : "Notification Disabled",
      description: `${type.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} notifications ${checked ? "enabled" : "disabled"}`,
    });
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEffects(checked);
    setNotificationSettings((prev) => ({ ...prev, soundEffects: checked }));
    localStorage.setItem("soundEffects", checked.toString());
  };

  const onSubmit = async (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = async (data: PasswordChangeFormData) => {
    changePasswordMutation.mutate(data);
  };

  const signOut = () => {
    localStorage.removeItem('token');
    queryClient.clear();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white pb-20 flex items-center justify-center">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-32 overflow-y-auto">
      {/* Header */}
      <header className="bg-gray-800 p-4 sticky top-0 z-50 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-6 h-6 text-yellow-500" />
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "bg-yellow-500 text-gray-900"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("blocked")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "blocked"
                ? "bg-yellow-500 text-gray-900"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
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
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Profile & Business Info
                  </CardTitle>
                  <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-yellow-500 hover:bg-yellow-500/10">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white">Edit Profile</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                  className="absolute -top-2 -right-2 bg-black/50 hover:bg-red-600 text-white rounded-full w-6 h-6 p-0"
                                  onClick={clearPhoto}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                                <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-gray-400 text-sm mb-3">Add a profile photo</p>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-600 text-gray-900 bg-white hover:bg-gray-100 flex-1"
                                    onClick={handleCameraCapture}
                                  >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Take Photo
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-600 text-gray-900 bg-white hover:bg-gray-100 flex-1"
                                    onClick={handleUpload}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          <FormField
                            control={form.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Business Name</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="bg-gray-700 border-gray-600 text-white"
                                    placeholder="Your barbershop name"
                                    maxLength={60}
                                  />
                                </FormControl>
                                <div className="flex justify-between items-center">
                                  <FormMessage />
                                  <span className="text-gray-400 text-xs">
                                    {field.value?.length || 0}/60
                                  </span>
                                </div>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Phone</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="bg-gray-700 border-gray-600 text-white"
                                      placeholder="(555) 123-4567"
                                      onChange={(e) => {
                                        const formatted = formatPhoneNumber(e.target.value);
                                        field.onChange(formatted);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Email</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="email"
                                      className="bg-gray-700 border-gray-600 text-white"
                                      placeholder="Email address"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="serviceArea"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Service Area</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="bg-gray-700 border-gray-600 text-white"
                                    placeholder="Your service area"
                                    maxLength={100}
                                  />
                                </FormControl>
                                <div className="flex justify-between items-center">
                                  <FormMessage />
                                  <span className="text-gray-400 text-xs">
                                    {field.value?.length || 0}/100
                                  </span>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="about"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">About</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    className="bg-gray-700 border-gray-600 text-white"
                                    placeholder="Tell clients about your services"
                                    maxLength={300}
                                    rows={4}
                                  />
                                </FormControl>
                                <div className="flex justify-between items-center">
                                  <FormMessage />
                                  <span className="text-gray-400 text-xs">
                                    {field.value?.length || 0}/300
                                  </span>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Scheduling Settings */}
                          <div className="space-y-4 pt-4 border-t border-gray-700">
                            <h4 className="text-white font-medium">Smart Scheduling Settings</h4>

                            <FormField
                              control={form.control}
                              name="homeBaseAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Home Base Address</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="bg-gray-700 border-gray-600 text-white"
                                      placeholder="Start typing your address..."
                                      autoComplete="off"
                                    />
                                  </FormControl>
                                  <p className="text-gray-400 text-xs">
                                    Starting point for calculating travel time to your first appointment.
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="timezone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Timezone</FormLabel>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="w-full p-2 bg-gray-700 border border-gray-600 text-white rounded-md"
                                    >
                                      <option value="America/New_York">Eastern Time (ET)</option>
                                      <option value="America/Chicago">Central Time (CT)</option>
                                      <option value="America/Denver">Mountain Time (MT)</option>
                                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                      <option value="America/Anchorage">Alaska Time (AKT)</option>
                                      <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="defaultGraceTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Grace Time Buffer (minutes)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      max="60"
                                      className="bg-gray-700 border-gray-600 text-white"
                                      placeholder="5"
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <p className="text-gray-400 text-xs">
                                    Extra time added to travel estimates for parking, elevators, etc.
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="transportationMode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Transportation Mode</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                        <SelectValue placeholder="Select transportation mode" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-gray-700 border-gray-600">
                                      <SelectItem value="driving" className="text-white hover:bg-gray-600">
                                        🚗 Driving
                                      </SelectItem>
                                      <SelectItem value="walking" className="text-white hover:bg-gray-600">
                                        🚶 Walking
                                      </SelectItem>
                                      <SelectItem value="cycling" className="text-white hover:bg-gray-600">
                                        🚴 Cycling
                                      </SelectItem>
                                      <SelectItem value="transit" className="text-white hover:bg-gray-600">
                                        🚌 Transit
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-end space-x-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsEditingProfile(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                              disabled={updateProfileMutation.isPending}
                            >
                              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
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
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                    {user?.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{user?.businessName || "Business Name"}</h3>
                    <p className="text-gray-400">{user?.email}</p>
                    <p className="text-gray-400">{user?.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Service Area</p>
                    <p className="text-white">{user?.serviceArea || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Phone Status</p>
                    <div className="flex items-center space-x-2">
                      {user?.phoneVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={user?.phoneVerified ? "text-green-500" : "text-red-500"}>
                        {user?.phoneVerified ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phone Verification */}
            {user?.phone && !user?.phoneVerified && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Phone Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-400">
                    Verify your phone number to receive SMS notifications and confirmations.
                  </p>
                  
                  {!isVerifyingPhone ? (
                    <Button
                      onClick={() => setIsVerifyingPhone(true)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                    >
                      Verify Phone Number
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      {!isCodeSent ? (
                        <div className="space-y-4">
                          <p className="text-white">Click to send verification code to {user.phone}</p>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => sendVerificationCodeMutation.mutate()}
                              disabled={sendVerificationCodeMutation.isPending}
                              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                            >
                              {sendVerificationCodeMutation.isPending ? "Sending..." : "Send Code"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsVerifyingPhone(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-white">Enter the 6-digit code sent to {user.phone}</p>
                          <Input
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="123456"
                            maxLength={6}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => verifyPhoneCodeMutation.mutate(verificationCode)}
                              disabled={verifyPhoneCodeMutation.isPending || verificationCode.length !== 6}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {verifyPhoneCodeMutation.isPending ? "Verifying..." : "Verify Code"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => sendVerificationCodeMutation.mutate()}
                              disabled={countdown > 0 || sendVerificationCodeMutation.isPending}
                            >
                              {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsVerifyingPhone(false);
                                setIsCodeSent(false);
                                setVerificationCode("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Password Change */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700">
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
                                  {...field}
                                  type="password"
                                  className="bg-gray-700 border-gray-600 text-white"
                                  placeholder="Enter current password"
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
                                  {...field}
                                  type="password"
                                  className="bg-gray-700 border-gray-600 text-white"
                                  placeholder="Enter new password"
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
                                  {...field}
                                  type="password"
                                  className="bg-gray-700 border-gray-600 text-white"
                                  placeholder="Confirm new password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsChangingPassword(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                            disabled={changePasswordMutation.isPending}
                          >
                            {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notification Settings
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotificationCard(!showNotificationCard)}
                  >
                    {showNotificationCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showNotificationCard && (
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Push Notifications</p>
                        <p className="text-gray-400 text-sm">Get notified about new bookings and updates</p>
                      </div>
                      <Switch
                        checked={pushSubscriptionData?.subscribed || false}
                        onCheckedChange={(checked) => setPushNotifications(checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Sound Effects</p>
                        <p className="text-gray-400 text-sm">Play sounds for notifications</p>
                      </div>
                      <Switch
                        checked={notificationSettings.soundEffects}
                        onCheckedChange={handleSoundToggle}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white">New Booking Requests</p>
                        <p className="text-gray-400 text-sm">Get notified when clients request appointments</p>
                      </div>
                      <Switch
                        checked={notificationSettings.newBookingRequests}
                        onCheckedChange={(checked) => handleNotificationTypeToggle("newBookingRequests", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Appointment Confirmations</p>
                        <p className="text-gray-400 text-sm">Get notified when appointments are confirmed</p>
                      </div>
                      <Switch
                        checked={notificationSettings.appointmentConfirmations}
                        onCheckedChange={(checked) => handleNotificationTypeToggle("appointmentConfirmations", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Appointment Cancellations</p>
                        <p className="text-gray-400 text-sm">Get notified when appointments are cancelled</p>
                      </div>
                      <Switch
                        checked={notificationSettings.appointmentCancellations}
                        onCheckedChange={(checked) => handleNotificationTypeToggle("appointmentCancellations", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white">Upcoming Reminders</p>
                        <p className="text-gray-400 text-sm">Get reminded about upcoming appointments</p>
                      </div>
                      <Switch
                        checked={notificationSettings.upcomingReminders}
                        onCheckedChange={(checked) => handleNotificationTypeToggle("upcomingReminders", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Booking URL */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Share className="w-5 h-5 mr-2" />
                  Public Booking Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400">
                  Share this link with clients so they can book appointments directly
                </p>
                <div className="flex items-center space-x-2">
                  <Input
                    value={`${window.location.origin}/book/${user?.phone?.replace(/\D/g, '')}-${user?.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`}
                    readOnly
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    onClick={copyBookingUrl}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Settings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Settings
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPaymentSettingsCard(!showPaymentSettingsCard)}
                  >
                    {showPaymentSettingsCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showPaymentSettingsCard && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Stripe Connect</p>
                      <p className="text-gray-400 text-sm">
                        {stripeStatus?.connected ? "Connected and ready to receive payments" : "Connect to accept card payments"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {stripeStatus?.connected ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={stripeStatus?.connected}
                        onClick={() => setIsConnectingStripe(true)}
                      >
                        {stripeStatus?.connected ? "Connected" : "Connect"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Quick Action Settings
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickActionCard(!showQuickActionCard)}
                  >
                    {showQuickActionCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showQuickActionCard && (
                <CardContent className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Quick actions help you send common messages to clients with just a tap from your dashboard.
                  </p>
                  <div className="space-y-3">
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <p className="text-white font-medium">On My Way</p>
                      <p className="text-gray-400 text-sm">
                        "Hi {`{clientName}`}, I'm on my way to your appointment at {`{appointmentTime}`}. See you soon!"
                      </p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <p className="text-white font-medium">Running Late</p>
                      <p className="text-gray-400 text-sm">
                        "Hi {`{clientName}`}, I'm running about 10 minutes late for your {`{appointmentTime}`} appointment. Thanks for your patience!"
                      </p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded-lg">
                      <p className="text-white font-medium">Appointment Confirmation</p>
                      <p className="text-gray-400 text-sm">
                        "Hi {`{clientName}`}, your appointment for {`{service}`} is confirmed for {`{appointmentTime}`}. Looking forward to seeing you!"
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Sign Out */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <Button
                  onClick={signOut}
                  variant="outline"
                  className="w-full text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Blocked Clients Tab */}
        {activeTab === "blocked" && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <ShieldOff className="w-5 h-5 mr-2" />
                Blocked Clients ({blockedClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockedClients.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No blocked clients</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Clients you block will appear here and won't be able to send booking requests.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {blockedClients.map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{client.phoneNumber}</p>
                        {client.reason && (
                          <p className="text-gray-400 text-sm">Reason: {client.reason}</p>
                        )}
                        <p className="text-gray-500 text-xs">
                          Blocked on {new Date(client.blockedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => unblockClientMutation.mutate({ phoneNumber: client.phoneNumber })}
                        variant="outline"
                        size="sm"
                        disabled={unblockClientMutation.isPending}
                      >
                        {unblockClientMutation.isPending ? "Unblocking..." : "Unblock"}
                      </Button>
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