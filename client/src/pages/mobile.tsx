import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AppointmentCard } from "@/components/appointment-card";
import { AppointmentPreview } from "@/components/appointment-preview-simple";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
import { PendingAppointments } from "@/components/pending-appointments";
import { Link, useLocation } from "wouter";
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
  X,
  CreditCard
} from "lucide-react";
import type { DashboardStats, AppointmentWithRelations, GalleryPhoto, User as UserType } from "@shared/schema";
import type { Service } from "@/lib/types";

export default function MobileApp() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'clients' | 'services' | 'settings'>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
    enabled: isAuthenticated,
  });

  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/today"],
    enabled: isAuthenticated,
  });

  const { data: recentPhotos, isLoading: photosLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    select: (data) => data?.slice(0, 3) || [],
    enabled: isAuthenticated,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: isAuthenticated,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: isAuthenticated,
  });

  const { data: stripeStatus } = useQuery({
    queryKey: ["/api/stripe/status"],
    enabled: isAuthenticated,
  });

  const unreadCount = unreadData?.count || 0;

  // Find current and next appointments (same logic as web)
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
        action: () => {
          setShowNotifications(false);
          navigate('/messages');
        },
        type: 'messages'
      });
    }

    if (!user?.businessName || !user?.serviceArea || !user?.about) {
      notifications.push({
        id: 'profile',
        title: 'Complete Your Profile',
        message: 'Set up your business name, service area, and bio',
        icon: User,
        action: () => {
          setShowNotifications(false);
          navigate('/settings');
        },
        type: 'profile'
      });
    }

    if (!stripeStatus?.connected) {
      notifications.push({
        id: 'stripe',
        title: 'Configure Payment Account',
        message: 'Set up Stripe to receive payments from clients',
        icon: CreditCard,
        action: () => {
          setShowNotifications(false);
          navigate('/settings');
        },
        type: 'payment'
      });
    }

    return notifications;
  };

  const notifications = generateNotifications().filter(notification => 
    !dismissedNotifications.includes(notification.id)
  );

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

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header - matching web version */}
      <header className="bg-gray-800 p-4 sticky top-0 z-50 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <Scissors className="w-5 h-5 text-gray-900" />
            </div>
            <h1 className="text-xl font-bold text-amber-500">Clippr</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-gray-400" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                    {notifications.length}
                  </div>
                )}
              </Button>

              {/* Mobile-optimized notification dropdown */}
              {showNotifications && (
                <div 
                  ref={notificationRef}
                  className="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                >
                  <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Notifications</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNotifications(false)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        All caught up! No new notifications.
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const IconComponent = notification.icon;
                        return (
                          <div
                            key={notification.id}
                            onClick={() => notification.action?.()}
                            className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-start space-x-3">
                              <IconComponent className="w-5 h-5 text-amber-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">{notification.title}</p>
                                <p className="text-xs text-gray-400">{notification.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Link href="/settings">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user?.photoUrl} />
                <AvatarFallback className="bg-amber-500 text-gray-900 text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6 pb-24">
        {/* Daily Summary Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Today's Summary</h2>
              <span className="text-sm text-gray-400">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
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
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/clients">
            <Button className="bg-amber-500 hover:bg-amber-600 text-gray-900 h-auto p-4 font-semibold w-full flex flex-col items-center space-y-2">
              <Plus className="w-5 h-5" />
              <span>New Client</span>
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="bg-gray-800 text-white border-gray-600 h-auto p-4 font-semibold w-full flex flex-col items-center space-y-2 hover:bg-gray-700">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span>Schedule</span>
            </Button>
          </Link>
        </div>

        {/* Current Appointment Preview */}
        <AppointmentPreview
          appointment={currentAppointment || undefined}
          type="current"
          services={services}
          onDetailsClick={() => {
            if (currentAppointment) {
              setSelectedAppointment(currentAppointment);
              setIsDetailsDialogOpen(true);
            }
          }}
        />

        {/* Next Appointment Preview */}
        <AppointmentPreview
          appointment={nextAppointment || undefined}
          type="next"
          services={services}
          onDetailsClick={() => {
            if (nextAppointment) {
              setSelectedAppointment(nextAppointment);
              setIsDetailsDialogOpen(true);
            }
          }}
        />

        {/* Today's Appointments */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Today's Appointments</h3>
              <Link href="/calendar">
                <Button variant="link" className="text-amber-500 text-sm font-medium p-0 h-auto">
                  View All
                </Button>
              </Link>
            </div>
            
            <div className="space-y-3">
              {appointmentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : confirmedAppointments?.length ? (
                confirmedAppointments.map((appointment) => (
                  <AppointmentCard 
                    key={appointment.id} 
                    appointment={appointment}
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setIsDetailsDialogOpen(true);
                    }}
                    showClickable={true}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No confirmed appointments scheduled for today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Appointments */}
        <PendingAppointments />

        {/* Recent Work Gallery */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Work</h3>
              <Link href="/gallery">
                <Button variant="link" className="text-amber-500 text-sm font-medium p-0 h-auto">
                  Gallery
                </Button>
              </Link>
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
                  <Link href="/gallery">
                    <Button variant="link" className="text-amber-500 text-sm mt-2 p-0 h-auto">
                      Add your first photo
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around py-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard', href: '/mobile' },
            { id: 'calendar', icon: Calendar, label: 'Calendar', href: '/calendar' },
            { id: 'clients', icon: Users, label: 'Clients', href: '/clients' },
            { id: 'services', icon: Scissors, label: 'Services', href: '/services' },
            { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
          ].map(({ id, icon: Icon, label, href }) => (
            <Link key={id} href={href}>
              <button
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  id === 'dashboard'
                    ? 'text-amber-500 bg-amber-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{label}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false);
          setSelectedAppointment(null);
        }}
      />
    </div>
  );
}