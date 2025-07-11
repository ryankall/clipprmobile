import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Plus
} from "lucide-react";

interface DashboardData {
  dailyEarnings: string;
  appointmentCount: number;
  clientCount: number;
  serviceCount: number;
  currentAppointment?: {
    id: number;
    client: { name: string; phone: string };
    scheduledAt: string;
    service: { name: string; price: string };
    duration: number;
  };
  nextAppointment?: {
    id: number;
    client: { name: string; phone: string };
    scheduledAt: string;
    service: { name: string; price: string };
    duration: number;
  };
}

export default function MobileApp() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'clients' | 'services' | 'settings'>('dashboard');

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated,
  });

  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments/today'],
    enabled: isAuthenticated,
  });

  const { data: services } = useQuery({
    queryKey: ['/api/services'],
    enabled: isAuthenticated,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['/api/messages/unread-count'],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                <Scissors className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Clippr</h1>
            </div>
            <CardTitle className="text-white">Welcome back</CardTitle>
            <CardDescription className="text-gray-300">
              Please sign in to access your mobile dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-400">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.photoUrl} />
          <AvatarFallback className="bg-amber-500 text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Today's Earnings</p>
                <p className="text-2xl font-bold text-white">
                  ${dashboardData?.dailyEarnings || '0.00'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Appointments</p>
                <p className="text-2xl font-bold text-white">
                  {dashboardData?.appointmentCount || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Appointment */}
      {dashboardData?.currentAppointment && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              Current Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-white">
                  {dashboardData.currentAppointment.client.name}
                </p>
                <Badge className="bg-green-500 text-white">
                  {formatTime(dashboardData.currentAppointment.scheduledAt)}
                </Badge>
              </div>
              <p className="text-sm text-gray-400">
                {dashboardData.currentAppointment.service.name}
              </p>
              <p className="text-sm text-green-400">
                {formatPrice(dashboardData.currentAppointment.service.price)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Appointment */}
      {dashboardData?.nextAppointment && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Next Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-white">
                  {dashboardData.nextAppointment.client.name}
                </p>
                <Badge className="bg-amber-500 text-white">
                  {formatTime(dashboardData.nextAppointment.scheduledAt)}
                </Badge>
              </div>
              <p className="text-sm text-gray-400">
                {dashboardData.nextAppointment.service.name}
              </p>
              <p className="text-sm text-green-400">
                {formatPrice(dashboardData.nextAppointment.service.price)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
              onClick={() => setActiveTab('calendar')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book
            </Button>
            <Button 
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
              onClick={() => setActiveTab('clients')}
            >
              <Users className="h-4 w-4 mr-2" />
              Clients
            </Button>
            <Button 
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
              {unreadCount?.count > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">
                  {unreadCount.count}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-700"
              onClick={() => setActiveTab('services')}
            >
              <Scissors className="h-4 w-4 mr-2" />
              Services
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Settings</h2>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.photoUrl} />
              <AvatarFallback className="bg-amber-500 text-white text-xl">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-400">{user?.email}</p>
              <p className="text-gray-400">{user?.phone}</p>
            </div>
          </div>
          
          <Separator className="bg-gray-700" />
          
          <div className="space-y-3">
            <Button 
              variant="outline"
              className="w-full justify-start border-gray-600 text-white hover:bg-gray-700"
              onClick={() => window.location.href = '/settings'}
            >
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-start border-gray-600 text-white hover:bg-gray-700"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-start border-gray-600 text-white hover:bg-gray-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Portfolio
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button 
        variant="outline"
        className="w-full border-red-600 text-red-400 hover:bg-red-950"
        onClick={() => window.location.href = '/api/auth/signout'}
      >
        Sign Out
      </Button>
    </div>
  );

  const renderComingSoon = (title: string) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-400">Mobile optimized version coming soon!</p>
      <Button 
        className="mt-4 bg-amber-500 hover:bg-amber-600"
        onClick={() => window.location.href = '/'}
      >
        Use Full Version
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Main Content */}
      <div className="pb-20 px-4 pt-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'calendar' && renderComingSoon('Calendar')}
        {activeTab === 'clients' && renderComingSoon('Clients')}
        {activeTab === 'services' && renderComingSoon('Services')}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around py-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'clients', icon: Users, label: 'Clients' },
            { id: 'services', icon: Scissors, label: 'Services' },
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