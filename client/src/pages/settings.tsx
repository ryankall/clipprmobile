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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Settings as SettingsIcon, User, Bell, Shield, HelpCircle, LogOut, Edit3, Camera, Upload, X, CreditCard, DollarSign, CheckCircle, AlertCircle, Share, Copy, Calendar, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Phone number validation regex (US format)
const phoneRegex = /^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

// Phone number formatting function
const formatPhoneNumber = (value: string): string => {
  if (!value) return value;
  
  // Remove all non-digits
  const phoneNumber = value.replace(/[^\d]/g, '');
  
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
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
    const data = await response.json();
    return data.status === "OK" && data.results.length > 0;
  } catch {
    return false;
  }
};

// Form schema for profile updates
const profileSchema = z.object({
  businessName: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z.string()
    .optional()
    .refine((val) => !val || phoneRegex.test(val), {
      message: "Please enter a valid phone number (e.g., (555) 123-4567)",
    }),
  serviceArea: z.string().optional(),
  about: z.string().optional(),
  photoUrl: z.string().optional(),
  homeBaseAddress: z.string().optional(),
  defaultGraceTime: z.number().min(0).max(60).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const { toast } = useToast();
  const { signOut } = useAuth();

  // Supported file types for photo upload
  const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  // Fetch user profile data
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/user/profile'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
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
      return await apiRequest('POST', '/api/stripe/connect');
    },
    onSuccess: (data: any) => {
      if (data.url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      const errorData = JSON.parse(error.message.replace('400: ', '').replace('500: ', ''));
      
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

  // Get Stripe account status
  const { data: stripeStatus } = useQuery<StripeStatus>({
    queryKey: ['/api/stripe/status'],
    retry: false,
  });

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
      defaultGraceTime: 5,
    },
  });



  // Setup Google Maps API with Places library
  useEffect(() => {
    const setupGoogleMapsAPI = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not found');
        return;
      }

      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('Google Maps API already loaded');
        setIsGoogleMapsLoaded(true);
        return;
      }

      // Clean up any existing scripts to prevent conflicts
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      const existingLoaders = document.querySelectorAll('gmpx-api-loader');
      
      existingScripts.forEach(script => script.remove());
      existingLoaders.forEach(loader => loader.remove());

      // Create a unique callback name to avoid conflicts
      const callbackName = `initGoogleMaps_${Date.now()}`;
      
      (window as any)[callbackName] = () => {
        console.log('Google Maps API loaded successfully');
        setIsGoogleMapsLoaded(true);
        delete (window as any)[callbackName]; // Clean up callback
      };

      // Load Google Maps API with Places library
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        delete (window as any)[callbackName];
      };
      
      document.head.appendChild(script);
    };

    setupGoogleMapsAPI();
  }, []);

  // Initialize autocomplete when Google Maps is loaded and input is available
  useEffect(() => {
    if (isGoogleMapsLoaded && isEditingProfile) {
      console.log('Auto-init check:', {
        googleMapsLoaded: isGoogleMapsLoaded,
        editingProfile: isEditingProfile,
        inputRef: !!addressInputRef.current,
        autocompleteRef: !!autocompleteRef.current
      });

      // Multiple retry attempts with different delays
      const retryDelays = [100, 300, 500, 1000];
      
      retryDelays.forEach((delay, index) => {
        setTimeout(() => {
          if (addressInputRef.current && !autocompleteRef.current) {
            const inputElement = addressInputRef.current;
            const isVisible = inputElement.offsetParent !== null;
            
            console.log(`Auto-init attempt ${index + 1}:`, {
              inputExists: !!inputElement,
              isVisible,
              hasAutocomplete: !!autocompleteRef.current
            });
            
            if (isVisible) {
              initializeAutocompleteInstance();
            }
          }
        }, delay);
      });
    }

    const initializeAutocompleteInstance = () => {
      if (!addressInputRef.current || autocompleteRef.current) {
        console.log('Skipping init - no input or already exists');
        return;
      }
      
      try {
        console.log('Auto-initializing Google Places Autocomplete...');
        
        const autocomplete = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'US' },
            fields: ['formatted_address', 'address_components', 'geometry']
          }
        );

        // Fix z-index with delay to ensure dropdown is created
        setTimeout(() => {
          const pacContainers = document.querySelectorAll('.pac-container');
          pacContainers.forEach(container => {
            (container as HTMLElement).style.zIndex = '10000';
            (container as HTMLElement).style.position = 'absolute';
          });
        }, 100);

        // Listen for when new pac-containers are created
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && (node as Element).classList.contains('pac-container')) {
                (node as HTMLElement).style.zIndex = '10000';
                (node as HTMLElement).style.position = 'absolute';
              }
            });
          });
        });
        observer.observe(document.body, { childList: true });
        (autocomplete as any).observer = observer;

        // Add multiple event listeners to catch place selection
        autocomplete.addListener('place_changed', () => {
          console.log('=== PLACE_CHANGED EVENT FIRED ===');
          const place = autocomplete.getPlace();
          console.log('Place object:', place);
          console.log('Place name:', place.name);
          console.log('Formatted address:', place.formatted_address);
          
          if (place.formatted_address && addressInputRef.current) {
            console.log('Updating form and input with:', place.formatted_address);
            
            // Update the input element directly first
            addressInputRef.current.value = place.formatted_address;
            
            // Dispatch input event to ensure React Hook Form detects the change
            const event = new Event('input', { bubbles: true });
            addressInputRef.current.dispatchEvent(event);
            
            // Update the form value
            form.setValue('homeBaseAddress', place.formatted_address, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true
            });
            
            // Trigger form validation
            form.trigger('homeBaseAddress');
            
            console.log('Form value after update:', form.getValues('homeBaseAddress'));
          } else {
            console.log('No formatted address or input ref missing');
          }
        });

        // Add debug listener for when dropdown items are selected
        const inputElement = addressInputRef.current;
        inputElement.addEventListener('focus', () => {
          console.log('Input focused - autocomplete should be active');
        });
        
        inputElement.addEventListener('blur', () => {
          console.log('Input blurred');
        });
        
        inputElement.addEventListener('keydown', (e) => {
          console.log('Key pressed:', e.key);
          if (e.key === 'Enter') {
            console.log('Enter pressed - checking if place was selected');
            setTimeout(() => {
              console.log('Current input value after Enter:', inputElement.value);
            }, 100);
          }
        });

        autocompleteRef.current = autocomplete;
        console.log('Auto-initialization successful!');
      } catch (error) {
        console.error('Auto-initialization error:', error);
      }
    };

    return () => {
      if (autocompleteRef.current) {
        try {
          if ((autocompleteRef.current as any).observer) {
            (autocompleteRef.current as any).observer.disconnect();
          }
          window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        } catch (error) {
          console.error('Error cleaning up autocomplete:', error);
        }
      }
    };
  }, [isGoogleMapsLoaded, isEditingProfile, form]);

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
        defaultGraceTime: (user as any).defaultGraceTime || 5,
      });
      // Only set previewUrl if user has a photo URL and it's not already set
      if (user.photoUrl && !previewUrl) {
        setPreviewUrl(user.photoUrl);
      }
    }
  }, [user, form, previewUrl]);

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

    // File is valid, process it
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    form.setValue('photoUrl', url);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const clearPhoto = () => {
    setPreviewUrl(null);
    form.setValue('photoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    setPushNotifications(checked);
    localStorage.setItem('pushNotifications', JSON.stringify(checked));
    
    toast({
      title: checked ? "Notifications Enabled" : "Notifications Disabled",
      description: checked ? "You'll receive appointment reminders" : "Push notifications turned off",
    });
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEffects(checked);
    localStorage.setItem('soundEffects', JSON.stringify(checked));
    
    toast({
      title: checked ? "Sound Effects Enabled" : "Sound Effects Disabled",
      description: checked ? "App sounds are now on" : "App sounds are now off",
    });
  };

  const handleLogout = () => {
    signOut();
  };

  const handleConnectStripe = () => {
    setIsConnectingStripe(true);
    connectStripeMutation.mutate();
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
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Settings */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile & Business Info
              </CardTitle>
              <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
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
                            <p className="text-steel text-sm mb-3">Add a profile photo</p>
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
                            <FormLabel className="text-white">Business Name</FormLabel>
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
                              <FormLabel className="text-white">Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  className="bg-charcoal border-steel/40 text-white"
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
                            <FormLabel className="text-white">Service Area</FormLabel>
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
                            <FormLabel className="text-white">About</FormLabel>
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
                                  ref={addressInputRef}
                                  className="bg-charcoal border-steel/40 text-white"
                                  placeholder="Start typing your address..."
                                  autoComplete="off"
                                />
                              </FormControl>
                              <p className="text-steel text-xs">
                                Starting point for calculating travel time to your first appointment. Enter your full address including city and state.
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
                              <FormLabel className="text-white">Grace Time Buffer (minutes)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="number"
                                  min="0"
                                  max="60"
                                  className="bg-charcoal border-steel/40 text-white"
                                  placeholder="5"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <p className="text-steel text-xs">
                                Extra time added to travel estimates for parking, elevators, etc.
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
                          {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
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
              <div>
                <h3 className="text-white font-semibold">
                  {user?.businessName || "Business Name"}
                </h3>
                <p className="text-steel text-sm">
                  {user?.email || "No email set"}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-steel">Phone</Label>
                <p className="text-white">{user?.phone || "Not set"}</p>
              </div>
              <div>
                <Label className="text-steel">Service Area</Label>
                <p className="text-white">{user?.serviceArea || "Not set"}</p>
              </div>
            </div>
            
            {user?.about && (
              <div>
                <Label className="text-steel">About</Label>
                <p className="text-white text-sm">{user.about}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
              Share this link with clients so they can book appointments directly with you from anywhere.
            </p>
            
            {user?.phone ? (
              <div className="space-y-3">
                <div className="bg-charcoal rounded-lg p-3 border border-steel/20">
                  <Label className="text-steel text-xs">Your Booking URL</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-gold text-sm bg-charcoal/50 px-2 py-1 rounded flex-1 break-all">
                      {window.location.origin}/book/{user.phone?.replace(/\D/g, '') || ''}-clipcutman
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-charcoal border-steel/40 text-gold hover:bg-charcoal/80 px-3"
                      onClick={() => {
                        if (user?.phone) {
                          const cleanPhone = user.phone.replace(/\D/g, '');
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
                    <div className="text-xs font-medium text-white">Real-time Calendar</div>
                    <div className="text-xs text-steel">Shows your availability</div>
                  </div>
                  <div className="bg-charcoal rounded-lg p-3 border border-steel/20 text-center">
                    <MessageSquare className="w-5 h-5 text-gold mx-auto mb-1" />
                    <div className="text-xs font-medium text-white">Direct Booking</div>
                    <div className="text-xs text-steel">Requests sent to inbox</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-charcoal rounded-lg p-4 border border-steel/20 text-center">
                <p className="text-steel text-sm">
                  Add your phone number to profile to generate your booking link
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Push Notifications</Label>
                <p className="text-sm text-steel">Get notified about new appointments</p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={handleNotificationToggle}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Sound Effects</Label>
                <p className="text-sm text-steel">Play sounds for app interactions</p>
              </div>
              <Switch
                checked={soundEffects}
                onCheckedChange={handleSoundToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Settings */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Quick Action Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-white text-sm font-medium">Default Messages</Label>
                <p className="text-steel text-xs">Pre-built messages for common situations</p>
              </div>
              
              <div className="space-y-2">
                <div className="bg-charcoal/50 p-3 rounded-lg border border-steel/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">On My Way</span>
                    <span className="text-steel text-xs">Default</span>
                  </div>
                  <p className="text-steel text-xs">
                    "Hi [Client Name], I'm on my way to your appointment at [Time]. See you soon!"
                  </p>
                </div>
                
                <div className="bg-charcoal/50 p-3 rounded-lg border border-steel/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">Running Late</span>
                    <span className="text-steel text-xs">Default</span>
                  </div>
                  <p className="text-steel text-xs">
                    "Hi [Client Name], I'm running about [Minutes] minutes late for your [Time] appointment. Sorry for the delay!"
                  </p>
                </div>
                
                <div className="bg-charcoal/50 p-3 rounded-lg border border-steel/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">Appointment Confirmation</span>
                    <span className="text-steel text-xs">Default</span>
                  </div>
                  <p className="text-steel text-xs">
                    "Hi [Client Name], confirming your [Service] appointment on [Date] at [Time]. Looking forward to seeing you!"
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
                      description: "Custom quick action messages will be available in a future update.",
                    });
                  }}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Create Custom Message
                </Button>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg">
                <h4 className="text-blue-300 font-medium text-sm mb-1">How Quick Actions Work</h4>
                <p className="text-blue-200 text-xs">
                  Quick actions appear on your dashboard when you have appointments coming up within the next hour. 
                  Tap a message to instantly send it to your client via SMS or email.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="bg-dark-card border-steel/20" data-section="payment">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    <Label className="text-steel">Account Status</Label>
                    <p className="text-white capitalize">{stripeStatus?.status || 'Active'}</p>
                  </div>
                  <div>
                    <Label className="text-steel">Country</Label>
                    <p className="text-white">{stripeStatus?.country || 'US'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-steel/40 text-white hover:bg-steel/20 flex-1"
                    onClick={() => window.open(stripeStatus?.dashboardUrl, '_blank')}
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
                      <p className="text-white font-medium">Payment Setup Required</p>
                      <p className="text-amber-300 text-sm">Connect Stripe to receive payments</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-steel text-sm">
                    Connect your Stripe account to start accepting credit card payments from clients. 
                    Stripe handles all payment processing securely.
                  </p>
                  
                  <div className="bg-charcoal/50 p-3 rounded-lg">
                    <h4 className="text-white font-medium text-sm mb-2">What you'll get:</h4>
                    <ul className="text-steel text-sm space-y-1">
                      <li>• Secure credit card processing</li>
                      <li>• Automatic payment tracking</li>
                      <li>• Direct deposits to your bank</li>
                      <li>• Transaction history and reports</li>
                    </ul>
                  </div>

                  <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-lg">
                    <h4 className="text-amber-300 font-medium text-sm mb-2">Setup Required:</h4>
                    <p className="text-amber-200 text-xs mb-2">
                      Before connecting, you need to enable Stripe Connect in your Stripe dashboard:
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
                      onClick={() => window.open('https://dashboard.stripe.com/connect/overview', '_blank')}
                    >
                      Open Stripe Connect Setup →
                    </Button>
                  </div>
                  
                  <Button
                    className="w-full gradient-gold text-charcoal font-semibold"
                    onClick={handleConnectStripe}
                    disabled={isConnectingStripe || connectStripeMutation.isPending}
                  >
                    {isConnectingStripe || connectStripeMutation.isPending ? (
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
            <Button
              variant="outline"
              className="w-full border-steel/40 text-white hover:bg-steel/20"
            >
              Change Password
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-steel/40 text-white hover:bg-steel/20"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help & Support
            </Button>
            
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
      </main>

      <BottomNavigation currentPath={location} />
    </div>
  );
}