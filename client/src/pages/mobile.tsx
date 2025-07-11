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
import { WorkingHoursDialog } from "@/components/working-hours-dialog";
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
  CreditCard,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  EyeOff,
  Heart
} from "lucide-react";
import type { DashboardStats, AppointmentWithRelations, GalleryPhoto, User as UserType, ClientWithRelations } from "@shared/schema";
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
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mobile Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [showExpired, setShowExpired] = useState(false);
  const [showWorkingHours, setShowWorkingHours] = useState(false);

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

  const { data: clients } = useQuery<ClientWithRelations[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const { data: allAppointments } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments"],
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

  // Filter clients by search term
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) || [];

  // Mobile Calendar Queries
  const { data: calendarAppointments, isLoading: calendarLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments", calendarDate.toISOString().split('T')[0]],
    enabled: activeTab === 'calendar',
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: activeTab === 'calendar',
  });

  // Mobile Calendar Screen
  const renderCalendar = () => {
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [showExpired, setShowExpired] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

    const workingHours = (userProfile as any)?.workingHours || {
      monday: { enabled: true, start: "09:00", end: "17:00" },
      tuesday: { enabled: true, start: "09:00", end: "17:00" },
      wednesday: { enabled: true, start: "09:00", end: "17:00" },
      thursday: { enabled: true, start: "09:00", end: "17:00" },
      friday: { enabled: true, start: "09:00", end: "17:00" },
      saturday: { enabled: true, start: "10:00", end: "16:00" },
      sunday: { enabled: false, start: "09:00", end: "17:00" },
    };

    const selectedDateAppointments = calendarAppointments?.filter((apt) => {
      const aptDate = new Date(apt.scheduledAt).toISOString().split('T')[0];
      const selDate = calendarDate.toISOString().split('T')[0];
      return aptDate === selDate;
    }) || [];

    const visibleAppointments = selectedDateAppointments.filter((apt) => {
      if (showExpired) return true;
      return apt.status === "confirmed" || apt.status === "pending";
    });

    const appointmentCounts = {
      confirmed: selectedDateAppointments.filter(apt => apt.status === "confirmed").length,
      pending: selectedDateAppointments.filter(apt => apt.status === "pending").length,
      expired: selectedDateAppointments.filter(apt => apt.status === "expired").length,
      cancelled: selectedDateAppointments.filter(apt => apt.status === "cancelled").length,
    };

    const generateMobileTimeSlots = () => {
      const slots = [];
      const dayName = calendarDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayHours = workingHours[dayName as keyof typeof workingHours] || workingHours.monday;
      
      for (let hour = 8; hour <= 22; hour++) {
        const time = hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
        const isWithinWorkingHours = dayHours.enabled && 
          hour >= parseInt(dayHours.start.split(':')[0]) && 
          hour < parseInt(dayHours.end.split(':')[0]);
        
        const hourAppointments = visibleAppointments.filter(apt => {
          const aptHour = new Date(apt.scheduledAt).getHours();
          return aptHour === hour;
        });

        slots.push({
          hour,
          time,
          appointments: hourAppointments,
          isBlocked: !isWithinWorkingHours,
          isWithinWorkingHours
        });
      }
      return slots;
    };

    return (
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Calendar</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWorkingHoursOpen(true)}
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            Hours
          </Button>
        </div>

        {/* Week Navigation */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setDate(calendarDate.getDate() - 7);
                  setCalendarDate(newDate);
                }}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold text-white">
                {(() => {
                  const startOfWeek = new Date(calendarDate);
                  startOfWeek.setDate(calendarDate.getDate() - calendarDate.getDay());
                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(startOfWeek.getDate() + 6);
                  return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                })()}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setDate(calendarDate.getDate() + 7);
                  setCalendarDate(newDate);
                }}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
            
            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const startOfWeek = new Date(calendarDate);
                startOfWeek.setDate(calendarDate.getDate() - calendarDate.getDay());
                const dates = [];
                for (let i = 0; i < 7; i++) {
                  const date = new Date(startOfWeek);
                  date.setDate(startOfWeek.getDate() + i);
                  dates.push(date);
                }
                return dates;
              })().map((date, index) => {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const isSelected = date.toISOString().split('T')[0] === calendarDate.toISOString().split('T')[0];
                const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                
                return (
                  <Button
                    key={index}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCalendarDate(date)}
                    className={`flex flex-col p-2 h-auto ${
                      isSelected 
                        ? 'bg-amber-500 hover:bg-amber-600 text-gray-900' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-xs">{dayNames[index]}</span>
                    <span className={`text-lg font-semibold ${isToday && !isSelected ? 'text-amber-500' : ''}`}>
                      {date.getDate()}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Timeline/List/Add Controls */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Timeline
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  List
                </Button>
              </div>
              <Link href="/appointments/new">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appt.
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Header */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                {calendarDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpired(!showExpired)}
                className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
              >
                {showExpired ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              {calendarLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-1">
                  {generateMobileTimeSlots().map((slot) => (
                    <div
                      key={slot.hour}
                      className={`flex items-start p-3 rounded-lg border ${
                        slot.isBlocked
                          ? 'bg-gray-700/50 border-gray-600'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="w-20 text-sm font-medium text-gray-300 flex-shrink-0">
                        {slot.time}
                      </div>
                      <div className="flex-1 ml-4">
                        {slot.appointments.length > 0 ? (
                          <div className="space-y-2">
                            {slot.appointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setIsDetailsDialogOpen(true);
                                }}
                                className={`p-3 rounded cursor-pointer text-sm border ${
                                  appointment.status === 'confirmed'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : appointment.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : appointment.status === 'expired'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {appointment.client?.name || 'Unknown Client'}
                                    </div>
                                    <div className="text-xs opacity-75 mt-1">
                                      {appointment.services || 'No services'} • {appointment.duration}min
                                    </div>
                                  </div>
                                  <div className="text-xs">
                                    {appointment.status.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {slot.isBlocked ? 'Outside working hours' : 'Available'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="space-y-3">
                {visibleAppointments.length > 0 ? (
                  visibleAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setIsDetailsDialogOpen(true);
                      }}
                      className={`p-4 rounded-lg cursor-pointer border ${
                        appointment.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : appointment.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : appointment.status === 'expired'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-lg">
                            {appointment.client?.name || 'Unknown Client'}
                          </div>
                          <div className="text-sm opacity-75 mt-1">
                            {appointment.services || 'No services'}
                          </div>
                          <div className="text-xs opacity-60 mt-1">
                            {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })} • {appointment.duration}min
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${
                            appointment.status === 'confirmed' ? 'bg-green-500' :
                            appointment.status === 'pending' ? 'bg-yellow-500' :
                            appointment.status === 'expired' ? 'bg-red-500' :
                            'bg-gray-500'
                          } text-white`}>
                            {appointment.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No appointments for {calendarDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Working Hours Dialog */}
        <WorkingHoursDialog
          open={isWorkingHoursOpen}
          onOpenChange={setIsWorkingHoursOpen}
          workingHours={workingHours}
          onSave={(hours) => {
            setIsWorkingHoursOpen(false);
          }}
        />

        {/* Appointment Details Dialog */}
        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          onEdit={(appointment) => {
            setIsDetailsDialogOpen(false);
            setSelectedAppointment(null);
          }}
          onDelete={(appointment) => {
            setIsDetailsDialogOpen(false);
            setSelectedAppointment(null);
          }}
        />
      </div>
    );
  };

  // Mobile Clients Screen
  const renderClients = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Clients</h2>
        <Link href="/clients">
          <Button variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
            Manage Clients
          </Button>
        </Link>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
        />
      </div>
      
      <div className="space-y-2">
        {filteredClients?.length ? (
          filteredClients.map((client) => (
            <Card key={client.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{client.name}</p>
                    <p className="text-sm text-gray-400">{client.phone}</p>
                    {client.email && <p className="text-sm text-gray-400">{client.email}</p>}
                  </div>
                  <div className="text-right">
                    <Badge className="bg-amber-500 text-gray-900">
                      {client.appointments?.length || 0} visits
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-gray-400 text-center py-8">
            {searchTerm ? "No clients match your search" : "No clients yet"}
          </p>
        )}
      </div>
    </div>
  );

  // Mobile Services Screen
  const renderServices = () => {
    const groupedServices = (services || []).reduce((acc, service) => {
      const category = service.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, Service[]>);

    const getCategoryColor = (category: string) => {
      switch (category.toLowerCase()) {
        case 'haircut': return 'bg-green-500';
        case 'beard': return 'bg-amber-500';
        case 'styling': return 'bg-purple-500';
        case 'color': return 'bg-red-500';
        case 'treatment': return 'bg-blue-500';
        default: return 'bg-gray-500';
      }
    };

    const activeServices = services?.filter(s => s.isActive) || [];
    const inactiveServices = services?.filter(s => !s.isActive) || [];

    return (
      <div className="space-y-4">
        {/* Services Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Services</h2>
          <Link href="/settings">
            <Button variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
              Manage Services
            </Button>
          </Link>
        </div>

        {/* Services Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{activeServices.length}</div>
              <div className="text-sm text-gray-400">Active Services</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">
                ${activeServices.reduce((sum, s) => sum + parseFloat(s.price), 0).toFixed(0)}
              </div>
              <div className="text-sm text-gray-400">Total Revenue Potential</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Services by Category */}
        {Object.entries(groupedServices).map(([category, categoryServices]) => {
          const activeInCategory = categoryServices.filter(s => s.isActive);
          if (activeInCategory.length === 0) return null;

          return (
            <Card key={category} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`${getCategoryColor(category)} p-2 rounded-full text-white`}>
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{category}</h3>
                      <p className="text-sm text-gray-400">{activeInCategory.length} services</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      Avg: ${(activeInCategory.reduce((sum, s) => sum + parseFloat(s.price), 0) / activeInCategory.length).toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {activeInCategory.map((service) => (
                    <div key={service.id} className="bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-white">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-gray-400 mt-1">{service.description}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-amber-500">${service.price}</p>
                          <p className="text-sm text-gray-400">{service.duration}min</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* No Services State */}
        {!services || services.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <Scissors className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 mb-4">No services created yet</p>
              <Link href="/settings">
                <Button className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                  Create Your First Service
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  };

  // Mobile Settings Screen
  const renderSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <Link href="/settings">
          <Button variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
            Full Settings
          </Button>
        </Link>
      </div>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.photoUrl} />
              <AvatarFallback className="bg-amber-500 text-gray-900">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Link href="/settings">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-700">
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
            <Link href="/gallery">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-700">
                <Camera className="h-4 w-4 mr-2" />
                Portfolio Gallery
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-700">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
                {unreadCount > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
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
        {activeTab === 'dashboard' && (
          <>
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
              <Button 
                onClick={() => setActiveTab('clients')}
                className="bg-amber-500 hover:bg-amber-600 text-gray-900 h-auto p-4 font-semibold w-full flex flex-col items-center space-y-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Client</span>
              </Button>
              <Button 
                onClick={() => setActiveTab('calendar')}
                variant="outline" 
                className="bg-gray-800 text-white border-gray-600 h-auto p-4 font-semibold w-full flex flex-col items-center space-y-2 hover:bg-gray-700"
              >
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>Schedule</span>
              </Button>
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
                  <Button 
                    onClick={() => setActiveTab('calendar')}
                    variant="link" 
                    className="text-amber-500 text-sm font-medium p-0 h-auto"
                  >
                    View All
                  </Button>
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
          </>
        )}

        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'clients' && renderClients()}
        {activeTab === 'services' && renderServices()}
        {activeTab === 'settings' && renderSettings()}
      </main>

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

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false);
          setSelectedAppointment(null);
        }}
      />

      {/* Working Hours Dialog */}
      <WorkingHoursDialog
        open={showWorkingHours}
        onClose={() => setShowWorkingHours(false)}
      />
    </div>
  );
}