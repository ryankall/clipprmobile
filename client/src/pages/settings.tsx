import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Settings as SettingsIcon, User, Clock, Palette, Bell, Shield, HelpCircle, LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const workingHoursSchema = z.object({
  monday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
  tuesday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
  wednesday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
  thursday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
  friday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
  saturday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
  sunday: z.object({ start: z.string(), end: z.string(), enabled: z.boolean() }),
});

const profileFormSchema = z.object({
  businessName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  travelTimeBuffer: z.number().min(5).max(60),
});

export default function Settings() {
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const { toast } = useToast();

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('pushNotifications');
    const savedSounds = localStorage.getItem('soundEffects');
    
    if (savedNotifications !== null) {
      setPushNotifications(JSON.parse(savedNotifications));
    }
    if (savedSounds !== null) {
      setSoundEffects(JSON.parse(savedSounds));
    }
  }, []);

  // Sound effect function
  const playSound = () => {
    if (soundEffects) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  // Handle preference changes
  const handleNotificationToggle = (checked: boolean) => {
    setPushNotifications(checked);
    localStorage.setItem('pushNotifications', JSON.stringify(checked));
    playSound();
    
    if (checked) {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            toast({
              title: "Notifications Enabled",
              description: "You'll receive appointment reminders and updates",
            });
          }
        });
      } else {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive appointment reminders and updates",
        });
      }
    } else {
      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications",
      });
    }
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEffects(checked);
    localStorage.setItem('soundEffects', JSON.stringify(checked));
    
    // Play sound to demonstrate if enabling
    if (checked) {
      playSound();
      toast({
        title: "Sound Effects Enabled",
        description: "You'll hear sounds for app interactions",
      });
    } else {
      toast({
        title: "Sound Effects Disabled",
        description: "App interactions will be silent",
      });
    }
  };

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      businessName: "",
      phone: "",
      email: "",
      address: "",
      travelTimeBuffer: 15,
    },
  });

  const workingHoursForm = useForm<z.infer<typeof workingHoursSchema>>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      monday: { start: "09:00", end: "17:00", enabled: true },
      tuesday: { start: "09:00", end: "17:00", enabled: true },
      wednesday: { start: "09:00", end: "17:00", enabled: true },
      thursday: { start: "09:00", end: "17:00", enabled: true },
      friday: { start: "09:00", end: "17:00", enabled: true },
      saturday: { start: "09:00", end: "15:00", enabled: true },
      sunday: { start: "10:00", end: "14:00", enabled: false },
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      return apiRequest("PATCH", "/api/user/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
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

  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (data: z.infer<typeof workingHoursSchema>) => {
      return apiRequest("PATCH", "/api/user/working-hours", { workingHours: data });
    },
    onSuccess: () => {
      toast({
        title: "Working Hours Updated",
        description: "Your working hours have been updated successfully",
      });
      setIsWorkingHoursOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update working hours",
        variant: "destructive",
      });
    },
  });

  const seedServicesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/seed-services", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Services Added",
        description: "Default services have been added to your account",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add default services",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const onWorkingHoursSubmit = (data: z.infer<typeof workingHoursSchema>) => {
    updateWorkingHoursMutation.mutate(data);
  };

  const daysOfWeek = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ] as const;

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
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
            <CardTitle className="text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile & Business Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4">
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
                        />
                      </FormControl>
                      <FormMessage />
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
                            placeholder="Phone number"
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
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Business Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="bg-charcoal border-steel/40 text-white"
                          placeholder="Your business address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="travelTimeBuffer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Travel Time Buffer (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="5"
                          max="60"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-charcoal border-steel/40 text-white"
                          placeholder="15"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full gradient-gold text-charcoal tap-feedback"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Working Hours
              </div>
              <Dialog open={isWorkingHoursOpen} onOpenChange={setIsWorkingHoursOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-steel/40 text-white hover:bg-charcoal/80">
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-dark-card border-steel/20 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Working Hours</DialogTitle>
                  </DialogHeader>
                  <Form {...workingHoursForm}>
                    <form onSubmit={workingHoursForm.handleSubmit(onWorkingHoursSubmit)} className="space-y-4">
                      {daysOfWeek.map((day) => (
                        <div key={day} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-white capitalize">{day}</Label>
                            <FormField
                              control={workingHoursForm.control}
                              name={`${day}.enabled`}
                              render={({ field }) => (
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              )}
                            />
                          </div>
                          {workingHoursForm.watch(`${day}.enabled`) && (
                            <div className="grid grid-cols-2 gap-2">
                              <FormField
                                control={workingHoursForm.control}
                                name={`${day}.start`}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    type="time"
                                    className="bg-charcoal border-steel/40 text-white"
                                  />
                                )}
                              />
                              <FormField
                                control={workingHoursForm.control}
                                name={`${day}.end`}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    type="time"
                                    className="bg-charcoal border-steel/40 text-white"
                                  />
                                )}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-steel/40 text-white hover:bg-charcoal/80"
                          onClick={() => setIsWorkingHoursOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 gradient-gold text-charcoal"
                          disabled={updateWorkingHoursMutation.isPending}
                        >
                          {updateWorkingHoursMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-steel">
              Set your available working hours for each day of the week. This helps with appointment scheduling and client expectations.
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Dark Mode</Label>
                <p className="text-sm text-steel">Optimized for working in dim environments</p>
              </div>
              <Switch checked={true} disabled />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Push Notifications</Label>
                <p className="text-sm text-steel">Get notified about appointments and reminders</p>
              </div>
              <Switch 
                checked={pushNotifications} 
                onCheckedChange={handleNotificationToggle}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Sound Effects</Label>
                <p className="text-sm text-steel">Play sounds for interactions and notifications</p>
              </div>
              <Switch 
                checked={soundEffects} 
                onCheckedChange={handleSoundToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Services */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Quick Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Add Default Services</Label>
              <p className="text-sm text-steel mb-3">
                Quickly add common barber services (Haircut, Beard Trim, Combo, Skin Fade) to get started.
              </p>
              <Button
                onClick={() => seedServicesMutation.mutate()}
                className="gradient-gold text-charcoal tap-feedback"
                disabled={seedServicesMutation.isPending}
              >
                {seedServicesMutation.isPending ? "Adding Services..." : "Add Default Services"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="ghost" className="w-full justify-start text-white hover:bg-charcoal/80">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help Center
            </Button>
            <Button variant="ghost" className="w-full justify-start text-white hover:bg-charcoal/80">
              <Bell className="w-4 h-4 mr-3" />
              Contact Support
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="bg-dark-card border-steel/20">
          <CardContent className="p-4 text-center">
            <h3 className="text-gold font-bold text-lg">Clippr</h3>
            <p className="text-steel text-sm">Mobile Barber & Stylist App</p>
            <p className="text-steel text-xs mt-2">Version 1.0.0</p>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation currentPath="/settings" />
    </div>
  );
}
