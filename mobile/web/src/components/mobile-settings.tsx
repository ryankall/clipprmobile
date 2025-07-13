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
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  profilePhotoUrl?: string;
  serviceArea?: string;
  about?: string;
  timezone?: string;
  homeBaseAddress?: string;
  phoneVerified?: boolean;
}

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
});

export default function MobileSettings() {
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);
  const [showWorkingHours, setShowWorkingHours] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [showSubscriptionSettings, setShowSubscriptionSettings] = useState(false);
  const [showBookingSettings, setShowBookingSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showSupportSettings, setShowSupportSettings] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: "",
      email: "",
      phone: "",
      serviceArea: "",
      about: "",
      photoUrl: "",
      timezone: "",
      homeBaseAddress: "",
    },
  });

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user/profile"],
  });

  const { data: stripeStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/stripe/status"],
  });

  const { data: subscription } = useQuery<{ 
    isActive: boolean; 
    plan: string; 
    billingCycle: string; 
    nextBillingDate: string; 
    status: string; 
    refundEligible: boolean; 
    refundDeadline: string; 
    startDate: string; 
    cancelAtPeriodEnd: boolean; 
  }>({
    queryKey: ["/api/subscription/status"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setShowProfileDialog(false);
      setPhotoFile(null);
      setPhotoUrl("");
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
    },
    onSuccess: () => {
      localStorage.removeItem('token');
      queryClient.clear();
      window.location.reload();
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        businessName: user.businessName || "",
        email: user.email || "",
        phone: user.phone || "",
        serviceArea: user.serviceArea || "",
        about: user.about || "",
        photoUrl: user.profilePhotoUrl || "",
        timezone: user.timezone || "America/New_York",
        homeBaseAddress: user.homeBaseAddress || "",
      });
      setSelectedTimezone(user.timezone || "America/New_York");
    }
  }, [user, form]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        alert('HEIC files are not supported. Please use JPEG, PNG, or WEBP format.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyBookingUrl = () => {
    const bookingUrl = `${window.location.origin}/book/${user?.phone?.replace(/\D/g, '')}-${user?.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="bg-dark-card border-b border-steel/20 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-dark-bg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-sm text-steel">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="p-4 space-y-4">
        {/* Profile Section */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-gold" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center overflow-hidden">
                {user?.profilePhotoUrl ? (
                  <img 
                    src={user.profilePhotoUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-dark-bg">
                    {user?.firstName?.[0] || 'B'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-sm text-steel">{user?.email}</p>
                <p className="text-sm text-steel">{user?.businessName || 'No business name'}</p>
              </div>
              <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-steel/20 text-white hover:bg-steel/10">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-dark-card border-steel/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Edit Profile</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {/* Photo Upload */}
                      <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg">
                        <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center overflow-hidden">
                          {photoUrl || user?.profilePhotoUrl ? (
                            <img 
                              src={photoUrl || user?.profilePhotoUrl} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-dark-bg">
                              {user?.firstName?.[0] || 'B'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-steel/20 text-white hover:bg-steel/10"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Photo
                          </Button>
                          <p className="text-xs text-steel mt-1">
                            JPEG, PNG, or WEBP. Max 10MB.
                          </p>
                        </div>
                      </div>

                      {/* Form Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Business Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="bg-dark-bg border-steel/20 text-white"
                                  placeholder="Your Business Name"
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
                                  className="bg-dark-bg border-steel/20 text-white"
                                  placeholder="your@email.com"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="tel"
                                className="bg-dark-bg border-steel/20 text-white"
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
                        name="serviceArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Service Area</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-dark-bg border-steel/20 text-white"
                                placeholder="e.g., New York, NY"
                              />
                            </FormControl>
                            <FormMessage />
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
                                className="bg-dark-bg border-steel/20 text-white resize-none"
                                placeholder="Tell clients about yourself..."
                                rows={3}
                              />
                            </FormControl>
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
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-dark-bg border-steel/20 text-white">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-dark-card border-steel/20 text-white">
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

                      <FormField
                        control={form.control}
                        name="homeBaseAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Home Base Address</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-dark-bg border-steel/20 text-white"
                                placeholder="Your main location address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowProfileDialog(false)}
                          className="border-steel/20 text-white hover:bg-steel/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          className="bg-gold text-dark-bg hover:bg-gold/90"
                        >
                          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader 
            className="cursor-pointer tap-feedback"
            onClick={() => setShowNotificationSettings(!showNotificationSettings)}
          >
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gold" />
                Notifications
              </div>
              <ChevronDown className={`w-5 h-5 text-steel transition-transform ${showNotificationSettings ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
          {showNotificationSettings && (
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-sm text-steel">Receive notifications for new bookings</p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-sm text-steel">Get email alerts for appointments</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Sound Effects</p>
                  <p className="text-sm text-steel">Play sounds for notifications</p>
                </div>
                <Switch
                  checked={soundEffects}
                  onCheckedChange={setSoundEffects}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Booking Settings */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader 
            className="cursor-pointer tap-feedback"
            onClick={() => setShowBookingSettings(!showBookingSettings)}
          >
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold" />
                Booking Settings
              </div>
              <ChevronDown className={`w-5 h-5 text-steel transition-transform ${showBookingSettings ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
          {showBookingSettings && (
            <CardContent className="space-y-4">
              <div className="p-4 bg-dark-bg rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Share className="w-4 h-4 text-gold" />
                    <span className="text-white font-medium">Booking URL</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyBookingUrl}
                    className="border-steel/20 text-white hover:bg-steel/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-sm text-steel break-all">
                  {`${window.location.origin}/book/${user?.phone?.replace(/\D/g, '')}-${user?.businessName?.toLowerCase().replace(/\s+/g, '') || 'clipcutman'}`}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Payment Settings */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader 
            className="cursor-pointer tap-feedback"
            onClick={() => setShowPaymentSettings(!showPaymentSettings)}
          >
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gold" />
                Payment Settings
              </div>
              <ChevronDown className={`w-5 h-5 text-steel transition-transform ${showPaymentSettings ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
          {showPaymentSettings && (
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Stripe Connect</p>
                  <p className="text-sm text-steel">
                    {stripeStatus?.connected ? 'Connected and ready to receive payments' : 'Not connected'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {stripeStatus?.connected ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gold" />
                  )}
                </div>
              </div>
              {!stripeStatus?.connected && (
                <Button className="w-full bg-gold text-dark-bg hover:bg-gold/90">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect Stripe Account
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Account Actions */}
        <Card className="bg-dark-card border-steel/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-steel/20 text-white hover:bg-steel/10"
                onClick={() => setShowPasswordDialog(true)}
              >
                <Shield className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {signOutMutation.isPending ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}