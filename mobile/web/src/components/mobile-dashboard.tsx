import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Scissors, 
  Bell, 
  Plus, 
  Calendar, 
  Users, 
  Camera, 
  Settings, 
  X, 
  MessageSquare, 
  CreditCard, 
  User as UserIcon 
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  profilePhotoUrl?: string;
}

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

export default function MobileDashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/today"],
  });

  const { data: recentPhotos, isLoading: photosLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    select: (data) => data?.slice(0, 3) || [],
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  // Find next and current appointments
  const now = new Date();
  const confirmedAppointments = todayAppointments?.filter(apt => apt.status === 'confirmed') || [];
  
  const currentAppointment = confirmedAppointments.find(apt => {
    const startTime = new Date(apt.scheduledAt);
    const endTime = new Date(startTime.getTime() + (apt.duration * 60 * 1000));
    const timeDiff = now.getTime() - startTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    return minutesDiff >= -10 && now <= endTime;
  }) || null;

  const upcomingAppointments = confirmedAppointments.filter(apt => {
    const startTime = new Date(apt.scheduledAt);
    if (currentAppointment && apt.id === currentAppointment.id) {
      return false;
    }
    return startTime > now;
  }) || [];
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  // Generate smart notifications
  const generateNotifications = () => {
    const notifications = [];

    if (unreadCount > 0) {
      notifications.push({
        id: 'messages',
        title: 'Unread Messages',
        message: `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
        icon: MessageSquare,
        action: () => setShowNotifications(false),
      });
    }

    return notifications.filter(n => !dismissedNotifications.includes(n.id));
  };

  const notifications = generateNotifications();

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="bg-dark-card border-b border-steel/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
              <Scissors className="w-5 h-5 text-dark-bg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Dashboard</h1>
              <p className="text-sm text-steel">Welcome back, {user?.firstName || 'Barber'}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-steel hover:text-white"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center text-[10px] font-bold text-dark-bg">
                    {notifications.length}
                  </span>
                )}
              </Button>
              
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-dark-card border border-steel/20 rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-steel/20">
                    <h3 className="font-semibold text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-steel">
                        <Bell className="w-12 h-12 mx-auto mb-2 text-steel/50" />
                        <p>No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 border-b border-steel/20 hover:bg-dark-bg/50 cursor-pointer"
                          onClick={notification.action}
                        >
                          <div className="flex items-start gap-3">
                            <notification.icon className="w-5 h-5 text-gold mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-white">{notification.title}</h4>
                              <p className="text-sm text-steel">{notification.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.profilePhotoUrl} />
              <AvatarFallback className="bg-gold text-dark-bg font-semibold">
                {user?.firstName?.[0] || 'B'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-steel">Today's Earnings</p>
                  <p className="text-2xl font-bold text-gold">
                    ${statsLoading ? '...' : stats?.dailyEarnings || '0.00'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-steel">Appointments</p>
                  <p className="text-2xl font-bold text-gold">
                    {statsLoading ? '...' : stats?.appointmentCount || 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Appointment */}
        {currentAppointment && (
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Current Appointment</h3>
                <Badge className="bg-gold text-dark-bg">NOW</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-steel">Client</p>
                  <p className="text-white font-medium">{currentAppointment.client?.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-steel">Service</p>
                  <p className="text-white">{currentAppointment.service?.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-steel">Time</p>
                  <p className="text-white">{format(new Date(currentAppointment.scheduledAt), 'h:mm a')}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-steel">Duration</p>
                  <p className="text-white">{currentAppointment.duration} minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Appointment */}
        {nextAppointment && (
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Next Appointment</h3>
                <Badge variant="outline" className="text-gold border-gold">
                  {format(new Date(nextAppointment.scheduledAt), 'h:mm a')}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-steel">Client</p>
                  <p className="text-white font-medium">{nextAppointment.client?.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-steel">Service</p>
                  <p className="text-white">{nextAppointment.service?.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-steel">Duration</p>
                  <p className="text-white">{nextAppointment.duration} minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Photos */}
        {recentPhotos && recentPhotos.length > 0 && (
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Recent Work</h3>
                <Button variant="ghost" size="sm" className="text-gold hover:text-gold/80">
                  View All
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {recentPhotos.map((photo) => (
                  <div key={photo.id} className="aspect-square bg-dark-bg rounded-lg overflow-hidden">
                    <img
                      src={photo.photoUrl}
                      alt={photo.description || 'Gallery photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="bg-gold text-dark-bg hover:bg-gold/90 h-16">
            <Plus className="w-5 h-5 mr-2" />
            New Appointment
          </Button>
          <Button variant="outline" className="border-steel/20 text-white hover:bg-steel/10 h-16">
            <MessageSquare className="w-5 h-5 mr-2" />
            Messages
          </Button>
        </div>
      </div>
    </div>
  );
}