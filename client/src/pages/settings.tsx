import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Settings as SettingsIcon, User, Bell, Shield, HelpCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Settings() {
  const [location, setLocation] = useLocation();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const { toast } = useToast();

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
    toast({
      title: "Logged Out",
      description: "You've been signed out successfully",
    });
    setLocation("/");
  };

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
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Business Name</Label>
              <Input 
                className="bg-charcoal border-steel/40 text-white mt-1"
                placeholder="Your barbershop name"
                defaultValue="Clippr Mobile Cuts"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Phone</Label>
                <Input 
                  className="bg-charcoal border-steel/40 text-white mt-1"
                  placeholder="Phone number"
                  defaultValue="(555) 123-4567"
                />
              </div>
              <div>
                <Label className="text-white">Email</Label>
                <Input 
                  type="email"
                  className="bg-charcoal border-steel/40 text-white mt-1"
                  placeholder="Email address"
                  defaultValue="clippr@example.com"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white">Service Area</Label>
              <Input 
                className="bg-charcoal border-steel/40 text-white mt-1"
                placeholder="Your service area"
                defaultValue="Mobile Service - Greater LA Area"
              />
            </div>
            
            <div>
              <Label className="text-white">About</Label>
              <Textarea 
                className="bg-charcoal border-steel/40 text-white mt-1"
                placeholder="Tell clients about your services"
                defaultValue="Professional mobile barber with 8+ years experience. Specializing in modern cuts and classic styles."
              />
            </div>
            
            <Button className="gradient-gold text-charcoal font-semibold">
              Update Profile
            </Button>
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