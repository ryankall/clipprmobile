import { useState, useRef, useEffect, useCallback } from "react";

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}
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
import { BottomNavigation } from "@/components/bottom-navigation";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
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

// Address validation function
const validateAddress = async (address: string): Promise<boolean> => {
  if (!address || address.trim().length < 10) return false;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`,
    );
    const data = await response.json();
    return data.status === "OK" && data.results.length > 0;
  } catch {
    return false;
  }
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

// Stripe status type
interface StripeStatus {
  connected: boolean;
  status?: string;
  country?: string;
  dashboardUrl?: string;
  capabilities?: any;
}

// User type from database
interface User {
  id: number;
  username: string;
  email?: string | null;
  businessName?: string | null;
  phone?: string | null;
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

export default function Settings() {
  const [location, setLocation] = useLocation();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    newBookingRequests: true,
    appointmentConfirmations: true,
    appointmentCancellations: true,
    upcomingReminders: true,
    soundEffects: true,
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPaymentSettingsCard, setShowPaymentSettingsCard] = useState(false); // Default to hidden
  const [showQuickActionCard, setShowQuickActionCard] = useState(false); // Default to hidden
  const [showNotificationCard, setShowNotificationCard] = useState(false); // Default to hidden
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
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

  // Stripe Connect mutation
  const connectStripeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/stripe/connect");
    },
    onSuccess: (data: any) => {
      if (data.url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      const errorData = JSON.parse(
        error.message.replace("400: ", "").replace("500: ", ""),
      );

      if (errorData.setupRequired) {
        toast({
          title: "Stripe Connect Setup Required",
          description: "Please enable Stripe Connect in your dashboard first",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: errorData.message || "Failed to connect to Stripe",
          variant: "destructive",
        });
      }
      setIsConnectingStripe(false);
    },
  });

  // Subscription cancellation mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/stripe/cancel-subscription");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Subscription Cancelled",
        description: `Your premium access will continue until ${new Date(data.accessUntil).toLocaleDateString()}`,
      });
      refetchSubscription();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  // Refund request mutation
  const requestRefundMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/stripe/request-refund");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Refund Processed",
        description: `Refund of $${data.amount} has been processed. You've been downgraded to Basic plan.`,
      });
      refetchSubscription();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  // Get Stripe account status
  const { data: stripeStatus } = useQuery<StripeStatus>({
    queryKey: ["/api/stripe/status"],
    retry: false,
  });

  const { data: subscriptionStatus, refetch: refetchSubscription } = useQuery({
    queryKey: ["/api/stripe/subscription-status"],
    retry: false,
  });

  // Push notification subscription status
  const { data: pushSubscriptionStatus, refetch: refetchPushSubscription } =
    useQuery({
      queryKey: ["/api/push/subscription"],
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

  // Push notification subscription mutation
  const subscribeToNotificationsMutation = useMutation({
    mutationFn: async (subscription: any) => {
      return await apiRequest("POST", "/api/push/subscribe", { subscription });
    },
    onSuccess: () => {
      refetchPushSubscription();
      toast({
        title: "Push Notifications Enabled",
        description:
          "You'll now receive notifications for new bookings and appointments.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enable push notifications",
        variant: "destructive",
      });
    },
  });

  // Push notification unsubscribe mutation
  const unsubscribeFromNotificationsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/push/unsubscribe");
    },
    onSuccess: () => {
      refetchPushSubscription();
      toast({
        title: "Push Notifications Disabled",
        description: "You'll no longer receive push notifications.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable push notifications",
        variant: "destructive",
      });
    },
  });

  // Test push notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/push/test");
    },
    onSuccess: () => {
      toast({
        title: "Test Notification Sent",
        description: "Check your device for the test notification.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test notification",
        variant: "destructive",
      });
    },
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

          await subscribeToNotificationsMutation.mutateAsync(subscription);
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
      await unsubscribeFromNotificationsMutation.mutateAsync();
    }
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEffects(checked);
    setNotificationSettings((prev) => ({ ...prev, soundEffects: checked }));
    // Store in localStorage for persistence
    localStorage.setItem("soundEffects", checked.toString());
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
    const savedSoundEffects = localStorage.getItem("soundEffects");
    const savedNewBookingRequests = localStorage.getItem(
      "notification_newBookingRequests",
    );
    const savedAppointmentConfirmations = localStorage.getItem(
      "notification_appointmentConfirmations",
    );
    const savedAppointmentCancellations = localStorage.getItem(
      "notification_appointmentCancellations",
    );
    const savedUpcomingReminders = localStorage.getItem(
      "notification_upcomingReminders",
    );

    const settings = {
      newBookingRequests:
        savedNewBookingRequests !== null
          ? savedNewBookingRequests === "true"
          : true,
      appointmentConfirmations:
        savedAppointmentConfirmations !== null
          ? savedAppointmentConfirmations === "true"
          : true,
      appointmentCancellations:
        savedAppointmentCancellations !== null
          ? savedAppointmentCancellations === "true"
          : true,
      upcomingReminders:
        savedUpcomingReminders !== null
          ? savedUpcomingReminders === "true"
          : true,
      soundEffects:
        savedSoundEffects !== null ? savedSoundEffects === "true" : true,
    };

    setNotificationSettings(settings);
    setSoundEffects(settings.soundEffects);
  }, []);

  // Phone verification mutations
  const sendVerificationCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/send-verification-code");
    },
    onSuccess: (data: any) => {
      setIsCodeSent(true);
      setCountdown(60);
      
      // Show development code in toast for testing
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
      return await apiRequest("POST", "/api/auth/verify-phone", { code });
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

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormData) => {
      return await apiRequest("POST", "/api/auth/change-password", data);
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

  // Countdown timer for resend code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Form setup with current user data
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
    },
  });

  // Password change form setup
  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Global click handler to manage autocomplete behavior
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is on Google autocomplete elements
      if (
        target.closest(".pac-container") ||
        target.closest(".pac-item") ||
        target.classList.contains("pac-item")
      ) {
        console.log("🛡️ Blocking Google autocomplete click from closing modal");
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }

      // If click is elsewhere and autocomplete is open, close suggestions
      const isAddressInput =
        target.tagName === "INPUT" &&
        target
          .getAttribute("placeholder")
          ?.includes("Start typing your address");
      const isPacElement =
        target.closest(".pac-container") || target.closest(".pac-item");

      if (isAutocompleteOpen && !isAddressInput && !isPacElement) {
        console.log("📴 Closing autocomplete suggestions - clicked elsewhere");
        const containers = document.querySelectorAll(".pac-container");
        containers.forEach((container) => {
          container.remove();
        });
        setIsAutocompleteOpen(false);
      }
    };

    if (isEditingProfile) {
      document.addEventListener("click", handleGlobalClick, true);
      return () => {
        document.removeEventListener("click", handleGlobalClick, true);
      };
    }
  }, [isEditingProfile, isAutocompleteOpen]);

  // Setup Google Maps API with Places library
  useEffect(() => {
    const setupGoogleMapsAPI = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn("Google Maps API key not found");
        return;
      }

      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log("Google Maps API already loaded");
        setIsGoogleMapsLoaded(true);
        return;
      }

      // Clean up any existing scripts to prevent conflicts
      const existingScripts = document.querySelectorAll(
        'script[src*="maps.googleapis.com"]',
      );
      const existingLoaders = document.querySelectorAll("gmpx-api-loader");

      existingScripts.forEach((script) => script.remove());
      existingLoaders.forEach((loader) => loader.remove());

      // Create a unique callback name to avoid conflicts
      const callbackName = `initGoogleMaps_${Date.now()}`;

      (window as any)[callbackName] = () => {
        console.log("Google Maps API loaded successfully");
        setIsGoogleMapsLoaded(true);
        delete (window as any)[callbackName]; // Clean up callback
      };

      // Load Google Maps API with Places library
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error("Failed to load Google Maps API");
        delete (window as any)[callbackName];
      };

      document.head.appendChild(script);
    };

    setupGoogleMapsAPI();
  }, []);

  // Web Component autocomplete initialization
  useEffect(() => {
    if (!isEditingProfile) return;

    let attempts = 0;
    const maxAttempts = 10;

    const initWebComponent = () => {
      attempts++;
      console.log(
        `🔍 Web Component Attempt ${attempts} - Looking for address input...`,
      );

      // Look for the address input
      const addressInput = document.querySelector(
        'input[name="homeBaseAddress"]',
      ) as HTMLInputElement;

      if (!addressInput && attempts < maxAttempts) {
        console.log(`⏳ Retrying in 300ms...`);
        setTimeout(initWebComponent, 300);
        return;
      }

      if (!addressInput) {
        console.log("❌ Could not find address input after all attempts");
        return;
      }

      console.log("✅ Found address input, replacing with Web Component");

      const parentElement = addressInput.parentNode;
      if (!parentElement) {
        console.error("❌ No parent element found");
        return;
      }

      try {
        console.log(
          "🔄 Reverting to legacy Autocomplete API with better styling...",
        );

        // Use the legacy API but with proper styling fixes
        const autocomplete = new window.google.maps.places.Autocomplete(
          addressInput,
          {
            types: ["address"],
            componentRestrictions: { country: "us" },
          },
        );

        console.log("✅ Legacy Autocomplete created");

        // Add comprehensive debugging
        addressInput.addEventListener("click", () => {
          console.log("🖱️ Input clicked successfully!");
        });

        addressInput.addEventListener("focus", () => {
          console.log("🎯 Input focused!");
        });

        addressInput.addEventListener("input", (event: any) => {
          console.log("⌨️ Input event:", {
            value: event.target.value,
            length: event.target.value?.length,
          });

          // Force PAC container styling after typing
          setTimeout(() => {
            const pacContainers = document.querySelectorAll(".pac-container");
            console.log(`🔍 PAC containers found: ${pacContainers.length}`);

            pacContainers.forEach((container, index) => {
              const element = container as HTMLElement;
              console.log(`PAC container ${index}:`, {
                display: element.style.display,
                visibility: element.style.visibility,
                zIndex: element.style.zIndex,
                position: element.style.position,
                children: element.children.length,
              });

              // Force visibility and proper positioning with highest z-index
              element.style.display = "block !important";
              element.style.visibility = "visible !important";
              element.style.opacity = "1 !important";
              element.style.zIndex = "999999 !important";
              element.style.position = "fixed !important";
              element.style.backgroundColor = "#2D2D2D !important";
              element.style.border = "1px solid #6B7280 !important";
              element.style.borderRadius = "6px !important";
              element.style.pointerEvents = "auto !important";
              element.style.isolation = "isolate !important";

              // Track autocomplete state
              setIsAutocompleteOpen(true);

              // Add click listener to PAC items for manual selection
              const pacItems = element.querySelectorAll(".pac-item");
              pacItems.forEach((item) => {
                item.addEventListener(
                  "click",
                  (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    const suggestionText = item.textContent?.trim();
                    if (suggestionText) {
                      console.log(
                        "✅ Address selected via manual click:",
                        suggestionText,
                      );

                      // Update the input field
                      addressInput.value = suggestionText;
                      addressInput.dispatchEvent(
                        new Event("input", { bubbles: true }),
                      );

                      // Update React Hook Form
                      form.setValue("homeBaseAddress", suggestionText);
                      form.trigger("homeBaseAddress");

                      // Remove suggestions and reset state
                      element.remove();
                      setIsAutocompleteOpen(false);
                    }

                    return false;
                  },
                  true,
                );
              });

              // Style the suggestion items and add click handlers
              const items = element.querySelectorAll(".pac-item");
              items.forEach((item, itemIndex) => {
                const htmlItem = item as HTMLElement;
                htmlItem.style.color = "white !important";
                htmlItem.style.backgroundColor = "#2D2D2D !important";
                htmlItem.style.padding = "8px 12px !important";
                htmlItem.style.cursor = "pointer !important";

                // Add hover effect
                htmlItem.addEventListener("mouseenter", () => {
                  htmlItem.style.backgroundColor = "#4A4A4A !important";
                });

                htmlItem.addEventListener("mouseleave", () => {
                  htmlItem.style.backgroundColor = "#2D2D2D !important";
                });

                // Add click handler with proper event handling
                htmlItem.addEventListener(
                  "click",
                  (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    console.log(
                      `🖱️ Suggestion ${itemIndex} clicked:`,
                      htmlItem.textContent,
                    );

                    // Get the suggestion text
                    const suggestionText = htmlItem.textContent?.trim();
                    if (suggestionText) {
                      console.log(
                        "✅ Setting address from suggestion:",
                        suggestionText,
                      );

                      // Update the input value
                      addressInput.value = suggestionText;

                      // Trigger events to update React Hook Form
                      addressInput.dispatchEvent(
                        new Event("input", { bubbles: true }),
                      );
                      addressInput.dispatchEvent(
                        new Event("change", { bubbles: true }),
                      );

                      // Update form directly
                      form.setValue("homeBaseAddress", suggestionText);
                      form.trigger("homeBaseAddress");

                      // Hide the suggestions
                      element.style.display = "none";

                      console.log("✅ Address set from clicked suggestion");
                    }

                    return false;
                  },
                  true,
                ); // Use capture phase
              });

              console.log(
                "🎨 Applied dark theme styling and click handlers to PAC container",
              );
            });
          }, 200);
        });

        addressInput.addEventListener("keydown", (event: any) => {
          console.log("🔑 Keydown:", {
            key: event.key,
            value: addressInput.value,
          });

          // Handle Enter and Tab key for suggestion selection
          if (event.key === "Enter" || event.key === "Tab") {
            const pacContainers = document.querySelectorAll(".pac-container");
            pacContainers.forEach((container) => {
              const selectedItem = container.querySelector(
                ".pac-item-selected, .pac-item:first-child",
              );
              if (selectedItem) {
                event.preventDefault();
                event.stopPropagation();

                const suggestionText = selectedItem.textContent?.trim();
                if (suggestionText) {
                  console.log(
                    "✅ Address selected via keyboard:",
                    suggestionText,
                  );

                  addressInput.value = suggestionText;
                  addressInput.dispatchEvent(
                    new Event("input", { bubbles: true }),
                  );

                  form.setValue("homeBaseAddress", suggestionText);
                  form.trigger("homeBaseAddress");

                  // Hide suggestions
                  (container as HTMLElement).style.display = "none";
                }
              }
            });
          }
        });

        // Listen for place selection using Google's native event
        autocomplete.addListener("place_changed", () => {
          console.log("🎯 Place changed event fired!");
          const place = autocomplete.getPlace();
          console.log("📍 Place object:", place);

          if (place.formatted_address) {
            console.log(
              "✅ Address selected via Google API:",
              place.formatted_address,
            );

            addressInput.value = place.formatted_address;
            addressInput.dispatchEvent(new Event("input", { bubbles: true }));

            // Update React Hook Form
            form.setValue("homeBaseAddress", place.formatted_address);
            form.trigger("homeBaseAddress");

            // Remove suggestions after selection and reset autocomplete state
            setTimeout(() => {
              const containers = document.querySelectorAll(".pac-container");
              containers.forEach((container) => {
                container.remove();
              });
              setIsAutocompleteOpen(false);
            }, 200);
          }
        });

        autocompleteRef.current = autocomplete;
        console.log("✅ Legacy autocomplete setup complete");
      } catch (error) {
        console.error("❌ Web Component error:", error);
      }
    };

    // Small delay to ensure form is rendered
    setTimeout(initWebComponent, 100);

    return () => {
      // Cleanup autocomplete and PAC containers
      if (autocompleteRef.current) {
        console.log("🧹 Cleaning up autocomplete");
        window.google?.maps?.event?.clearInstanceListeners(
          autocompleteRef.current,
        );
        autocompleteRef.current = null;
      }

      // Remove any lingering PAC containers
      const pacContainers = document.querySelectorAll(".pac-container");
      pacContainers.forEach((container) => {
        container.remove();
        console.log("🗑️ Removed PAC container");
      });
    };
  }, [isEditingProfile, form]);

  // Additional cleanup when modal closes
  useEffect(() => {
    if (!isEditingProfile) {
      // Modal is closing or closed, clean up PAC containers
      setTimeout(() => {
        const pacContainers = document.querySelectorAll(".pac-container");
        pacContainers.forEach((container) => {
          container.remove();
          console.log("🗑️ Removed PAC container on modal close");
        });
      }, 100);
    }
  }, [isEditingProfile]);

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
      // Only set previewUrl if user has a photo URL and previewUrl is not manually cleared
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
        description:
          "Please upload JPEG, PNG, or WEBP images only. HEIC files are not supported.",
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

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  const clearPhoto = () => {
    console.log("🗑️ Clearing photo");
    setPreviewUrl(null);
    form.setValue("photoUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Force form to recognize the change
    form.trigger("photoUrl");
  };

  // Note: handleNotificationToggle is now defined earlier with push notification functionality
  // handleSoundToggle is now defined earlier with push notification functionality

  const handleLogout = () => {
    signOut();
  };

  const handleConnectStripe = () => {
    setIsConnectingStripe(true);
    connectStripeMutation.mutate();
  };

  const handleStripeCheckout = async (interval: "monthly" | "yearly") => {
    try {
      const priceId = interval === "yearly" ? "price_yearly" : "price_monthly";

      const response = await apiRequest("POST", "/api/stripe/create-checkout", {
        priceId,
      });

      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);

      // Check if the error is related to missing price IDs
      if (
        error.message.includes("resource_missing") ||
        error.message.includes("No such price")
      ) {
        toast({
          title: "Stripe Configuration Required",
          description:
            "Please set up your Stripe pricing products first. Contact support for help setting up monthly ($19.99) and yearly ($199.99) subscription prices.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to start checkout process. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white pb-20 flex items-center justify-center">
        <div className="text-steel">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-32 overflow-y-auto">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "bg-gold text-charcoal"
                : "text-steel hover:text-white hover:bg-steel/20"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("blocked")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "blocked"
                ? "bg-gold text-charcoal"
                : "text-steel hover:text-white hover:bg-steel/20"
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
            <Card className="bg-dark-card border-steel/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Profile & Business Info
                  </CardTitle>
                  <Dialog
                    open={isEditingProfile}
                    onOpenChange={(open) => {
                      // Always prevent closing if autocomplete has suggestions visible
                      if (!open) {
                        const pacContainers =
                          document.querySelectorAll(".pac-container");
                        const hasVisibleSuggestions = Array.from(
                          pacContainers,
                        ).some((container) => {
                          const element = container as HTMLElement;
                          return (
                            element.style.display !== "none" &&
                            element.children.length > 0 &&
                            element.offsetHeight > 0
                          );
                        });

                        if (hasVisibleSuggestions || isAutocompleteOpen) {
                          console.log(
                            "🛡️ Preventing modal close - Google autocomplete active",
                          );
                          return;
                        }
                      }

                      setIsEditingProfile(open);
                      if (!open) {
                        setIsAutocompleteOpen(false);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gold hover:bg-gold/10"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-dark-card border-steel/20 max-h-[90vh] overflow-y-auto scrollbar-hide">
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
                                  className="w-24 h-24 object-cover rounded-full border border-steel/40"
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
                              <div className="border-2 border-dashed border-steel/40 rounded-lg p-4 text-center">
                                <Camera className="w-8 h-8 mx-auto mb-2 text-steel" />
                                <p className="text-steel text-sm mb-3">
                                  Add a profile photo
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-steel/40 text-charcoal bg-white hover:bg-steel/10 hover:text-charcoal tap-feedback flex-1"
                                    onClick={handleCameraCapture}
                                  >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Take Photo
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-steel/40 text-charcoal bg-white hover:bg-steel/10 hover:text-charcoal tap-feedback flex-1"
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
                                <FormLabel className="text-white">
                                  Business Name
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="bg-charcoal border-steel/40 text-white"
                                    placeholder="Your barbershop name"
                                    maxLength={60}
                                  />
                                </FormControl>
                                <div className="flex justify-between items-center">
                                  <FormMessage />
                                  <span className="text-steel text-xs">
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
                                  <FormLabel className="text-white">
                                    Phone
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="bg-charcoal border-steel/40 text-white"
                                      placeholder="(555) 123-4567"
                                      onChange={(e) => {
                                        const formatted = formatPhoneNumber(
                                          e.target.value,
                                        );
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
                                  <FormLabel className="text-white">
                                    Email
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="email"
                                      className="bg-charcoal border-steel/40 text-white"
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
                                <FormLabel className="text-white">
                                  Service Area
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="bg-charcoal border-steel/40 text-white"
                                    placeholder="Your service area"
                                    maxLength={100}
                                  />
                                </FormControl>
                                <div className="flex justify-between items-center">
                                  <FormMessage />
                                  <span className="text-steel text-xs">
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
                                <FormLabel className="text-white">
                                  About
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    className="bg-charcoal border-steel/40 text-white scrollbar-hide"
                                    placeholder="Tell clients about your services"
                                    maxLength={300}
                                    rows={4}
                                  />
                                </FormControl>
                                <div className="flex justify-between items-center">
                                  <FormMessage />
                                  <span className="text-steel text-xs">
                                    {field.value?.length || 0}/300
                                  </span>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Scheduling Settings */}
                          <div className="space-y-4 pt-4 border-t border-steel/20">
                            <h4 className="text-white font-medium">
                              Smart Scheduling Settings
                            </h4>

                            <FormField
                              control={form.control}
                              name="homeBaseAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">
                                    Home Base Address
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      ref={field.ref}
                                      className="bg-charcoal border-steel/40 text-white"
                                      placeholder="Start typing your address..."
                                      autoComplete="off"
                                    />
                                  </FormControl>
                                  <p className="text-steel text-xs">
                                    Starting point for calculating travel time
                                    to your first appointment. Enter your full
                                    address including city and state.
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
                                  <FormLabel className="text-white">
                                    Timezone
                                  </FormLabel>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="w-full p-2 bg-charcoal border border-steel/40 text-white rounded-md"
                                    >
                                      <option value="America/New_York">
                                        Eastern Time (ET)
                                      </option>
                                      <option value="America/Chicago">
                                        Central Time (CT)
                                      </option>
                                      <option value="America/Denver">
                                        Mountain Time (MT)
                                      </option>
                                      <option value="America/Los_Angeles">
                                        Pacific Time (PT)
                                      </option>
                                      <option value="America/Anchorage">
                                        Alaska Time (AKT)
                                      </option>
                                      <option value="Pacific/Honolulu">
                                        Hawaii Time (HST)
                                      </option>
                                    </select>
                                  </FormControl>
                                  <p className="text-steel text-xs">
                                    Your local timezone for appointment
                                    scheduling and display
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="defaultGraceTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">
                                    Grace Time Buffer (minutes)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      max="60"
                                      className="bg-charcoal border-steel/40 text-white"
                                      placeholder="5"
                                      onChange={(e) =>
                                        field.onChange(
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <p className="text-steel text-xs">
                                    Extra time added to travel estimates for
                                    parking, elevators, etc.
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
                                  <FormLabel className="text-white">
                                    Transportation Mode
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                        <SelectValue placeholder="Select transportation mode" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-charcoal border-steel/40">
                                      <SelectItem
                                        value="driving"
                                        className="text-white hover:bg-steel/20"
                                      >
                                        🚗 Driving
                                      </SelectItem>
                                      <SelectItem
                                        value="walking"
                                        className="text-white hover:bg-steel/20"
                                      >
                                        🚶 Walking
                                      </SelectItem>
                                      <SelectItem
                                        value="cycling"
                                        className="text-white hover:bg-steel/20"
                                      >
                                        🚴 Cycling
                                      </SelectItem>
                                      <SelectItem
                                        value="transit"
                                        className="text-white hover:bg-steel/20"
                                      >
                                        🚌 Public Transit
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-steel text-xs">
                                    Your preferred transportation method for
                                    calculating travel times between
                                    appointments
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-steel/40 text-charcoal bg-white hover:bg-steel/10 hover:text-charcoal flex-1"
                              onClick={() => setIsEditingProfile(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={updateProfileMutation.isPending}
                              className="gradient-gold text-charcoal font-semibold flex-1"
                            >
                              {updateProfileMutation.isPending
                                ? "Updating..."
                                : "Update Profile"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display current profile info */}
                <div className="flex items-center space-x-4">
                  {user?.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt="Profile"
                      className="w-16 h-16 object-cover rounded-full border border-steel/40"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-charcoal rounded-full border border-steel/40 flex items-center justify-center">
                      <User className="w-8 h-8 text-steel" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">
                      {user?.businessName || "Business Name"}
                    </h3>
                    <p className="text-steel text-sm truncate">
                      {user?.email || "No email set"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="min-w-0">
                    <Label className="text-steel">Phone</Label>
                    <p className="text-white truncate">
                      {user?.phone || "Not set"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <Label className="text-steel">Service Area</Label>
                    <p className="text-white truncate">
                      {user?.serviceArea || "Not set"}
                    </p>
                  </div>
                </div>

                {user?.about && (
                  <div className="min-w-0">
                    <Label className="text-steel">About</Label>
                    <p className="text-white text-sm break-words">
                      {user.about}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Plan */}
            <Card className="bg-dark-card border-steel/20" id="plan-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Subscription Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-charcoal/50 border border-steel/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-charcoal" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Basic Plan</p>
                      <p className="text-steel text-sm">Currently Active</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">Free</p>
                    <p className="text-steel text-xs">Forever</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-charcoal/50 p-3 rounded-lg">
                    <h4 className="text-white font-medium text-sm mb-2">
                      Basic Plan includes:
                    </h4>
                    <ul className="text-steel text-sm space-y-1">
                      <li>• 15 appointments per month</li>
                      <li>• 3 active services</li>
                      <li>• 15 SMS messages per month</li>
                      <li>• 50MB photo storage</li>
                      <li>• Basic calendar features</li>
                    </ul>
                  </div>

                  <div className="relative bg-gradient-to-br from-gold/20 to-gold/10 border-2 border-gold/30 p-6 rounded-xl overflow-hidden">
                    {/* Premium Badge */}

                    <div className="mb-4">
                      <div className="flex items-baseline space-x-2 mb-2">
                        <h4 className="text-white font-bold text-lg">
                          Premium Plan
                        </h4>
                      </div>

                      {/* Pricing Options */}
                      <div className="mb-4 space-y-3">
                        {/* Monthly Option - Horizontal */}
                        <div className="bg-charcoal/50 p-4 rounded-lg border border-gold/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <div className="text-gold font-bold text-xl">
                                  $19.99
                                </div>
                                <div className="text-gold text-sm">/month</div>
                              </div>
                              <div className="text-steel text-sm px-2">
                                Monthly billing
                              </div>
                            </div>
                            <Button
                              className="bg-gradient-to-r from-gold to-amber-400 hover:from-gold/90 hover:to-amber-400/90 text-charcoal font-bold text-sm py-2 px-6 rounded-lg transition-all duration-200"
                              onClick={() => handleStripeCheckout("monthly")}
                              data-testid="monthly-upgrade-button"
                            >
                              Choose Monthly
                            </Button>
                          </div>
                        </div>

                        {/* Yearly Option - Below Monthly */}
                        <div className="bg-charcoal/50 p-4 rounded-lg border border-emerald-500/30 relative">
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              SAVE 16%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <div className="text-steel text-xs line-through">
                                  $239.88/year
                                </div>
                                <div className="text-emerald-400 font-bold text-xl">
                                  $199.99
                                </div>
                                <div className="text-emerald-400 text-sm">
                                  /year
                                </div>
                              </div>
                              <div className="text-steel text-sm px-2">
                                {" "}
                                Annual billing
                              </div>
                            </div>
                            <Button
                              className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-500/90 hover:to-emerald-400/90 text-white font-bold text-sm py-2 px-6 rounded-lg transition-all duration-200"
                              onClick={() => handleStripeCheckout("yearly")}
                              data-testid="yearly-upgrade-button"
                            >
                              Choose Yearly
                            </Button>
                          </div>
                          <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                            MOST POPULAR
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-charcoal/50 p-3 rounded-lg border border-gold/20">
                        <div className="text-gold font-bold text-lg">∞</div>
                        <div className="text-white text-sm font-medium">
                          Appointments
                        </div>
                        <div className="text-steel text-xs">
                          No monthly limits
                        </div>
                      </div>
                      <div className="bg-charcoal/50 p-3 rounded-lg border border-gold/20">
                        <div className="text-gold font-bold text-lg">1GB</div>
                        <div className="text-white text-sm font-medium">
                          Photo Storage
                        </div>
                        <div className="text-steel text-xs">20x more space</div>
                      </div>
                      <div className="bg-charcoal/50 p-3 rounded-lg border border-gold/20">
                        <div className="text-gold font-bold text-lg">∞</div>
                        <div className="text-white text-sm font-medium">
                          Services
                        </div>
                        <div className="text-steel text-xs">
                          Unlimited catalog
                        </div>
                      </div>
                      <div className="bg-charcoal/50 p-3 rounded-lg border border-gold/20">
                        <div className="text-gold font-bold text-lg">∞</div>
                        <div className="text-white text-sm font-medium">
                          SMS Messages
                        </div>
                        <div className="text-steel text-xs">Stay connected</div>
                      </div>
                    </div>

                    <div className="bg-charcoal/70 p-3 rounded-lg border border-gold/20 mb-4">
                      <h5 className="text-white font-medium text-sm mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
                        Premium Features
                      </h5>
                      <ul className="text-steel text-sm space-y-1">
                        <li className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-emerald-400 mr-2" />
                          Advanced calendar with custom working hours
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-emerald-400 mr-2" />
                          Client analytics and business insights
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-emerald-400 mr-2" />
                          Priority customer support
                        </li>
                      </ul>
                    </div>

                    <div className="text-center mt-3">
                      <p className="text-steel text-xs">
                        ✨ 30-day money-back guarantee • Cancel anytime
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Management */}
            {subscriptionStatus &&
              (subscriptionStatus.status === "premium" ||
                subscriptionStatus.status === "cancelled") && (
                <Card className="bg-dark-card border-steel/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Subscription Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-charcoal rounded-lg p-4 border border-steel/20">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-semibold">
                            Plan:{" "}
                            {subscriptionStatus.status === "cancelled"
                              ? "Premium (Cancelled)"
                              : "Premium"}
                          </h4>
                          <p className="text-steel text-sm">
                            {subscriptionStatus.interval === "yearly"
                              ? "Annual"
                              : "Monthly"}{" "}
                            subscription
                          </p>
                        </div>
                        {subscriptionStatus.status === "premium" && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-medium">
                            Active
                          </span>
                        )}
                        {subscriptionStatus.status === "cancelled" && (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs font-medium">
                            Cancelled
                          </span>
                        )}
                      </div>

                      {subscriptionStatus.endDate && (
                        <p className="text-steel text-sm mb-3">
                          {subscriptionStatus.status === "cancelled"
                            ? `Access until: ${new Date(subscriptionStatus.endDate).toLocaleDateString()}`
                            : `Next billing: ${new Date(subscriptionStatus.endDate).toLocaleDateString()}`}
                        </p>
                      )}

                      {subscriptionStatus.isEligibleForRefund &&
                        subscriptionStatus.refundDeadline && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
                            <div className="flex items-center mb-2">
                              <AlertCircle className="w-4 h-4 text-blue-400 mr-2" />
                              <span className="text-blue-400 font-medium text-sm">
                                30-Day Money-Back Guarantee
                              </span>
                            </div>
                            <p className="text-steel text-xs">
                              You're eligible for a full refund until{" "}
                              {new Date(
                                subscriptionStatus.refundDeadline,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                      <div className="flex gap-2">
                        {subscriptionStatus.status === "premium" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelSubscriptionMutation.mutate()}
                            disabled={cancelSubscriptionMutation.isPending}
                            className="flex-1 border-steel/20 text-steel hover:text-white hover:bg-steel/10"
                          >
                            {cancelSubscriptionMutation.isPending ? (
                              <div className="flex items-center">
                                <div className="w-3 h-3 border border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                                Cancelling...
                              </div>
                            ) : (
                              "Cancel Subscription"
                            )}
                          </Button>
                        )}

                        {subscriptionStatus.isEligibleForRefund && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => requestRefundMutation.mutate()}
                            disabled={requestRefundMutation.isPending}
                            className="flex-1 border-blue-500/20 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            {requestRefundMutation.isPending ? (
                              <div className="flex items-center">
                                <div className="w-3 h-3 border border-t-transparent border-blue-400 rounded-full animate-spin mr-2"></div>
                                Processing...
                              </div>
                            ) : (
                              "Request Full Refund"
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-steel/20">
                        <p className="text-steel text-xs">
                          {subscriptionStatus.status === "premium"
                            ? "Cancel anytime. Your premium access will remain active until the end of your current billing period."
                            : "Your subscription has been cancelled. Premium access continues until the end date shown above."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Public Booking Link */}
            <Card className="bg-dark-card border-steel/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Share className="w-5 h-5 mr-2" />
                  Public Booking Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-steel text-sm">
                  Share this link with clients so they can book appointments
                  directly with you from anywhere.
                </p>

                {user?.phone ? (
                  <div className="space-y-3">
                    <div className="bg-charcoal rounded-lg p-3 border border-steel/20">
                      <Label className="text-steel text-xs">
                        Your Booking URL
                      </Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="text-gold text-sm bg-charcoal/50 px-2 py-1 rounded flex-1 break-all">
                          {window.location.origin}/book/
                          {user.phone?.replace(/\D/g, "") || ""}-clipcutman
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-charcoal border-steel/40 text-gold hover:bg-charcoal/80 px-3"
                          onClick={() => {
                            if (user?.phone) {
                              const cleanPhone = user.phone.replace(/\D/g, "");
                              const bookingUrl = `${window.location.origin}/book/${cleanPhone}-clipcutman`;
                              navigator.clipboard.writeText(bookingUrl);
                              toast({
                                title: "Copied!",
                                description: "Booking link copied to clipboard",
                              });
                            }
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-charcoal rounded-lg p-3 border border-steel/20 text-center">
                        <Calendar className="w-5 h-5 text-gold mx-auto mb-1" />
                        <div className="text-xs font-medium text-white">
                          Real-time Calendar
                        </div>
                        <div className="text-xs text-steel">
                          Shows your availability
                        </div>
                      </div>
                      <div className="bg-charcoal rounded-lg p-3 border border-steel/20 text-center">
                        <MessageSquare className="w-5 h-5 text-gold mx-auto mb-1" />
                        <div className="text-xs font-medium text-white">
                          Direct Booking
                        </div>
                        <div className="text-xs text-steel">
                          Requests sent to inbox
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-charcoal rounded-lg p-4 border border-steel/20 text-center">
                    <p className="text-steel text-sm">
                      Add your phone number to profile to generate your booking
                      link
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-dark-card border-steel/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <Bell className="w-5 h-5 mr-2" />
                  Notifications
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setShowNotificationCard(!showNotificationCard)
                    }
                    className="text-steel hover:text-white"
                  >
                    {showNotificationCard ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showNotificationCard ? (
                <CardContent className="space-y-4">
                  {/* Individual Notification Type Toggles - Always Show All 5 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          New Booking Requests
                        </Label>
                        <p className="text-xs text-steel">
                          When clients request appointments
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.newBookingRequests}
                        onCheckedChange={(checked) =>
                          handleNotificationTypeToggle(
                            "newBookingRequests",
                            checked,
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          Appointment Confirmations
                        </Label>
                        <p className="text-xs text-steel">
                          When clients confirm appointments
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.appointmentConfirmations}
                        onCheckedChange={(checked) =>
                          handleNotificationTypeToggle(
                            "appointmentConfirmations",
                            checked,
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          Appointment Cancellations
                        </Label>
                        <p className="text-xs text-steel">
                          When clients cancel appointments
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.appointmentCancellations}
                        onCheckedChange={(checked) =>
                          handleNotificationTypeToggle(
                            "appointmentCancellations",
                            checked,
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Upcoming Reminders</Label>
                        <p className="text-xs text-steel">
                          30-minute reminders before appointments
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.upcomingReminders}
                        onCheckedChange={(checked) =>
                          handleNotificationTypeToggle(
                            "upcomingReminders",
                            checked,
                          )
                        }
                      />
                    </div>

                    {/* Sound Effects Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-steel/20">
                      <div>
                        <Label className="text-white">Sound Effects</Label>
                        <p className="text-xs text-steel">
                          Play sounds for app interactions
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.soundEffects}
                        onCheckedChange={handleSoundToggle}
                      />
                    </div>
                  </div>

                  {/* Test Notification Button */}
                  {pushSubscriptionStatus?.subscribed && (
                    <div className="pt-4 border-t border-steel/20">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testNotificationMutation.mutate()}
                        disabled={testNotificationMutation.isPending}
                        className="w-full border-steel/20 text-steel hover:text-white hover:bg-steel/10"
                      >
                        {testNotificationMutation.isPending ? (
                          <div className="flex items-center">
                            <div className="w-3 h-3 border border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                            Sending...
                          </div>
                        ) : (
                          "Send Test Notification"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              ) : null}
            </Card>

            {/* Quick Action Settings */}
            <Card className="bg-dark-card border-steel/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <Bell className="w-5 h-5 mr-2" />
                  Quick Action Messages
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuickActionCard(!showQuickActionCard)}
                    className="text-steel hover:text-white"
                  >
                    {showQuickActionCard ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showQuickActionCard ? (
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-white text-sm font-medium">
                        Default Messages
                      </Label>
                      <p className="text-steel text-xs">
                        Pre-built messages for common situations
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-charcoal/50 p-3 rounded-lg border border-steel/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">
                            On My Way
                          </span>
                          <span className="text-steel text-xs">Default</span>
                        </div>
                        <p className="text-steel text-xs">
                          "Hi [Client Name], I'm on my way to your appointment
                          at [Time]. See you soon!"
                        </p>
                      </div>

                      <div className="bg-charcoal/50 p-3 rounded-lg border border-steel/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">
                            Running Late
                          </span>
                          <span className="text-steel text-xs">Default</span>
                        </div>
                        <p className="text-steel text-xs">
                          "Hi [Client Name], I'm running about [Minutes] minutes
                          late for your [Time] appointment. Sorry for the
                          delay!"
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-steel/20">
                      <Button
                        variant="outline"
                        className="w-full border-steel/40 text-white hover:bg-steel/20"
                        onClick={() => {
                          toast({
                            title: "Feature Coming Soon",
                            description:
                              "Custom quick action messages will be available in a future update.",
                          });
                        }}
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Create Custom Message
                      </Button>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg">
                      <h4 className="text-blue-300 font-medium text-sm mb-1">
                        How Quick Actions Work
                      </h4>
                      <p className="text-blue-200 text-xs">
                        Quick actions appear on your dashboard when you have
                        appointments coming up within the next hour. Tap a
                        message to instantly send it to your client via SMS or
                        email.
                      </p>
                    </div>
                  </div>
                </CardContent>
              ) : null}
            </Card>

            {/* Payment Settings */}
            <Card
              className="bg-dark-card border-steel/20"
              data-section="payment"
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Settings
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setShowPaymentSettingsCard(!showPaymentSettingsCard)
                    }
                    className="text-steel hover:text-white"
                  >
                    {showPaymentSettingsCard ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showPaymentSettingsCard ? (
                <CardContent className="space-y-4">
                  {stripeStatus && stripeStatus.connected ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-white font-medium">
                              Stripe Connected
                            </p>
                            <p className="text-green-300 text-sm">
                              Ready to receive payments
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-steel">Account Status</Label>
                          <p className="text-white capitalize">
                            {stripeStatus?.status || "Active"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-steel">Country</Label>
                          <p className="text-white">
                            {stripeStatus?.country || "US"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="border-steel/40 text-white hover:bg-steel/20 flex-1"
                          onClick={() =>
                            window.open(stripeStatus?.dashboardUrl, "_blank")
                          }
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          View Dashboard
                        </Button>
                        <Button
                          variant="outline"
                          className="border-steel/40 text-white hover:bg-steel/20 flex-1"
                          onClick={handleConnectStripe}
                          disabled={isConnectingStripe}
                        >
                          Update Settings
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertCircle className="w-5 h-5 text-amber-400" />
                          <div>
                            <p className="text-white font-medium">
                              Payment Setup Required
                            </p>
                            <p className="text-amber-300 text-sm">
                              Connect Stripe to receive payments
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-steel text-sm">
                          Connect your Stripe account to start accepting credit
                          card payments from clients. Stripe handles all payment
                          processing securely.
                        </p>

                        <div className="bg-charcoal/50 p-3 rounded-lg">
                          <h4 className="text-white font-medium text-sm mb-2">
                            What you'll get:
                          </h4>
                          <ul className="text-steel text-sm space-y-1">
                            <li>• Secure credit card processing</li>
                            <li>• Automatic payment tracking</li>
                            <li>• Direct deposits to your bank</li>
                            <li>• Transaction history and reports</li>
                          </ul>
                        </div>

                        <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-lg">
                          <h4 className="text-amber-300 font-medium text-sm mb-2">
                            Setup Required:
                          </h4>
                          <p className="text-amber-200 text-xs mb-2">
                            Before connecting, you need to enable Stripe Connect
                            in your Stripe dashboard:
                          </p>
                          <ol className="text-amber-200 text-xs space-y-1 ml-4">
                            <li>1. Go to your Stripe Dashboard</li>
                            <li>2. Navigate to Connect → Overview</li>
                            <li>3. Complete the Connect setup process</li>
                            <li>4. Return here to connect your account</li>
                          </ol>
                          <Button
                            variant="link"
                            className="text-amber-300 p-0 h-auto text-xs mt-2"
                            onClick={() =>
                              window.open(
                                "https://dashboard.stripe.com/connect/overview",
                                "_blank",
                              )
                            }
                          >
                            Open Stripe Connect Setup →
                          </Button>
                        </div>

                        <Button
                          className="w-full gradient-gold text-charcoal font-semibold"
                          onClick={handleConnectStripe}
                          disabled={
                            isConnectingStripe ||
                            connectStripeMutation.isPending
                          }
                        >
                          {isConnectingStripe ||
                          connectStripeMutation.isPending ? (
                            "Connecting..."
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Connect Stripe Account
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              ) : null}
            </Card>

            {/* Account Settings */}
            <Card className="bg-dark-card border-steel/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Account & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone Verification Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-gold" />
                      <span className="text-white">Phone Verification</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user?.phone_verified ? (
                        <div className="flex items-center space-x-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Not Verified</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!user?.phone_verified && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div className="text-sm text-amber-200">
                          <p className="font-medium">
                            Phone verification required
                          </p>
                          <p className="text-amber-300/80">
                            You cannot make appointments until your phone number
                            is verified.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                        onClick={() => setIsVerifyingPhone(true)}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Verify Phone
                      </Button>
                    </div>
                  )}
                </div>

                <Dialog
                  open={isChangingPassword}
                  onOpenChange={setIsChangingPassword}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-steel/40 text-white hover:bg-steel/20"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-dark-card border-steel/20 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white">
                        Change Password
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...passwordForm}>
                      <form
                        onSubmit={passwordForm.handleSubmit((data) =>
                          changePasswordMutation.mutate(data),
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">
                                Current Password
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Enter current password"
                                  className="bg-charcoal border-steel/20 text-white"
                                  {...field}
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
                              <FormLabel className="text-white">
                                New Password
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Enter new password (min 8 characters)"
                                  className="bg-charcoal border-steel/20 text-white"
                                  {...field}
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
                              <FormLabel className="text-white">
                                Confirm New Password
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Confirm new password"
                                  className="bg-charcoal border-steel/20 text-white"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsChangingPassword(false)}
                            className="flex-1 border-steel/40 text-white hover:bg-steel/20"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={changePasswordMutation.isPending}
                            className="flex-1 bg-gold text-charcoal hover:bg-gold/90"
                          >
                            {changePasswordMutation.isPending
                              ? "Changing..."
                              : "Change Password"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Link href="/help">
                  <Button
                    variant="outline"
                    className="w-full border-blue-500/20 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 mb-3"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help & Support
                  </Button>
                </Link>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Phone Verification Dialog */}
            <Dialog open={isVerifyingPhone} onOpenChange={setIsVerifyingPhone}>
              <DialogContent className="bg-dark-card border-steel/20">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Verify Phone Number
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm text-steel">
                    We'll send a verification code to:{" "}
                    <span className="text-white font-medium">
                      {user?.phone}
                    </span>
                  </div>

                  {!isCodeSent ? (
                    <Button
                      onClick={() => sendVerificationCodeMutation.mutate()}
                      disabled={sendVerificationCodeMutation.isPending}
                      className="w-full bg-gold hover:bg-gold/90 text-charcoal"
                    >
                      {sendVerificationCodeMutation.isPending
                        ? "Sending..."
                        : "Send Verification Code"}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="verification-code"
                          className="text-white"
                        >
                          Enter Verification Code
                        </Label>
                        <Input
                          id="verification-code"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="bg-charcoal border-steel/40 text-white"
                          maxLength={6}
                        />
                      </div>

                      <Button
                        onClick={() =>
                          verifyPhoneCodeMutation.mutate(verificationCode)
                        }
                        disabled={
                          verifyPhoneCodeMutation.isPending ||
                          verificationCode.length !== 6
                        }
                        className="w-full bg-gold hover:bg-gold/90 text-charcoal"
                      >
                        {verifyPhoneCodeMutation.isPending
                          ? "Verifying..."
                          : "Verify Code"}
                      </Button>

                      <div className="flex justify-center">
                        {countdown > 0 ? (
                          <span className="text-sm text-steel">
                            Resend code in {countdown}s
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              sendVerificationCodeMutation.mutate()
                            }
                            disabled={sendVerificationCodeMutation.isPending}
                            className="text-gold hover:bg-gold/10"
                          >
                            Resend Code
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Blocked Clients Tab */}
        {activeTab === "blocked" && (
          <Card className="bg-dark-card border-steel/20">
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
                  <p className="text-steel text-sm">
                    You haven't blocked any clients yet. When you block a
                    client, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedClients.map((client) => (
                    <div
                      key={client.id}
                      className="bg-charcoal p-4 rounded-lg border border-steel/20"
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
                            <div className="text-steel text-sm">
                              Blocked{" "}
                              {new Date(client.blockedAt).toLocaleDateString()}
                            </div>
                            {client.reason && (
                              <div className="text-steel text-xs mt-1">
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

      <BottomNavigation currentPath={location} />
    </div>
  );
}
