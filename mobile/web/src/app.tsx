import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Minus,
  X,
  CreditCard,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  EyeOff,
  Heart,
  Car
} from "lucide-react";

// Custom hook for authentication
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if user is authenticated and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('token');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  return { isAuthenticated, user, isLoading };
};

// Type definitions
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

interface ClientWithRelations {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
}

interface Service {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  isActive: boolean;
}

export default function MobileApp() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'clients' | 'services' | 'settings' | 'appointment-new'>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mobile Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [showExpired, setShowExpired] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
  
  // Mobile Appointment Creation State
  const [appointmentForm, setAppointmentForm] = useState({
    clientId: '',
    services: [] as { serviceId: number; quantity: number }[],
    scheduledAt: '',
    notes: '',
    address: '',
    includeTravel: false
  });

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
    enabled: activeTab === 'dashboard',
  });

  const { data: todayAppointments, isLoading: todayLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/today"],
    enabled: activeTab === 'dashboard',
  });

  const { data: recentPhotos, isLoading: photosLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    enabled: activeTab === 'dashboard',
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<ClientWithRelations[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments"],
    enabled: activeTab === 'calendar',
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: activeTab === 'calendar',
  });

  // Current and next appointments for dashboard
  const confirmedAppointments = todayAppointments?.filter(apt => apt.status === 'confirmed') || [];
  const currentAppointment = confirmedAppointments[0] || null;
  const nextAppointment = confirmedAppointments[1] || null;

  // Calendar appointments for selected date
  const calendarAppointmentsForDate = appointments?.filter(apt => {
    const aptDate = new Date(apt.scheduledAt);
    return (
      aptDate.getFullYear() === calendarDate.getFullYear() &&
      aptDate.getMonth() === calendarDate.getMonth() &&
      aptDate.getDate() === calendarDate.getDate()
    );
  }) || [];

  // Filter clients by search term
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) || [];

  // Handle clicks outside notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Mock notifications data
  const notifications = [
    { id: '1', type: 'appointment', message: 'New appointment request from John Doe', time: '2 minutes ago', read: false },
    { id: '2', type: 'payment', message: 'Payment received for haircut service', time: '1 hour ago', read: false },
    { id: '3', type: 'reminder', message: 'Appointment with Mike starting in 15 minutes', time: '2 hours ago', read: true },
  ];

  const unreadNotifications = notifications.filter(
    notification => !notification.read && 
    !dismissedNotifications.includes(notification.id)
  );

  // Mobile Appointment Creation Functions
  const resetAppointmentForm = () => {
    setAppointmentForm({
      clientId: '',
      services: [],
      scheduledAt: '',
      notes: '',
      address: '',
      includeTravel: false
    });
  };

  const createAppointment = async () => {
    if (!appointmentForm.clientId || appointmentForm.services.length === 0 || !appointmentForm.scheduledAt) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          clientId: parseInt(appointmentForm.clientId),
          services: appointmentForm.services,
          scheduledAt: appointmentForm.scheduledAt,
          notes: appointmentForm.notes,
          address: appointmentForm.address,
          includeTravel: appointmentForm.includeTravel
        })
      });

      if (response.ok) {
        alert('Appointment created successfully!');
        resetAppointmentForm();
        setActiveTab('calendar');
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create appointment'}`);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const generateMobileTimeSlots = () => {
    const workingHours = (userProfile as any)?.workingHours || {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: true, start: '10:00', end: '16:00' },
      sunday: { enabled: false, start: '10:00', end: '16:00' }
    };

    const slots = [];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[calendarDate.getDay()];
    const dayConfig = workingHours[currentDay];

    // Check if it's Sunday - if so, block all hours
    const isSunday = calendarDate.getDay() === 0;

    for (let hour = 8; hour <= 22; hour++) {
      const time = new Date();
      time.setHours(hour, 0, 0, 0);
      
      // Find appointments for this hour
      const appointmentsForHour = calendarAppointmentsForDate.filter(apt => {
        const aptTime = new Date(apt.scheduledAt);
        return aptTime.getHours() === hour;
      });

      let isBlocked = false;
      
      if (isSunday) {
        // Always block on Sunday
        isBlocked = true;
      } else if (dayConfig?.enabled) {
        const startHour = parseInt(dayConfig.start.split(':')[0]);
        const endHour = parseInt(dayConfig.end.split(':')[0]);
        isBlocked = hour < startHour || hour >= endHour;
      } else {
        // Day is disabled
        isBlocked = true;
      }

      slots.push({
        hour,
        time: time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          hour12: true 
        }),
        appointments: showExpired ? appointmentsForHour : appointmentsForHour.filter(apt => apt.status !== 'expired'),
        isBlocked
      });
    }

    return slots;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Clippr Mobile</h1>
          <p className="text-gray-400 mb-6">Please sign in to continue</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Main Content */}
      <main className="p-4">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Welcome Back!</h1>
                  <p className="text-gray-400 text-sm">Your mobile workspace</p>
                </div>
              </div>
              
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative text-gray-400 hover:text-white p-2"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="font-semibold text-white">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {unreadNotifications.length > 0 ? (
                        unreadNotifications.map((notification) => (
                          <div key={notification.id} className="p-4 border-b border-gray-700 hover:bg-gray-700">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm text-white">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                              </div>
                              <button
                                onClick={() => setDismissedNotifications(prev => [...prev, notification.id])}
                                className="text-gray-400 hover:text-white p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                <DollarSign className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : `$${stats?.dailyEarnings || '0'}`}
                </p>
                <p className="text-sm text-gray-400">Today's Earnings</p>
              </div>
              
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                <Calendar className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.appointmentCount || '0'}
                </p>
                <p className="text-sm text-gray-400">Appointments</p>
              </div>
            </div>

            {/* Quick Messages */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold text-white">Messages</h3>
                  {unreadCount?.count > 0 && (
                    <span className="bg-amber-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                      {unreadCount.count}
                    </span>
                  )}
                </div>
                <button className="text-amber-500 text-sm">View All</button>
              </div>
              <p className="text-sm text-gray-400">
                {unreadCount?.count > 0 
                  ? `${unreadCount.count} new message${unreadCount.count > 1 ? 's' : ''} waiting`
                  : 'No new messages'
                }
              </p>
            </div>

            {/* Today's Appointments */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Today's Appointments</h3>
                <button 
                  onClick={() => setActiveTab('calendar')}
                  className="text-amber-500 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              
              <div className="space-y-3">
                {todayLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : confirmedAppointments?.length ? (
                  confirmedAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-3 bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">{appointment.client?.name}</p>
                          <p className="text-sm text-gray-400">{appointment.service?.name}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-amber-500">{appointment.price}</p>
                          <p className="text-xs text-gray-400">{appointment.duration}min</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No confirmed appointments scheduled for today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Work Gallery */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Work</h3>
                <button className="text-amber-500 text-sm font-medium">Gallery</button>
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
                    <button className="text-amber-500 text-sm mt-2">
                      Add your first photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {/* Date Navigation */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setCalendarDate(newDate);
                  }}
                  className="bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-2 px-4 rounded-lg"
                >
                  ←
                </button>
                
                <div className="text-center">
                  <h2 className="text-lg font-bold text-white">
                    {calendarDate.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  <div className="text-sm text-gray-400">
                    {calendarAppointmentsForDate.filter(apt => apt.status === 'confirmed').length} confirmed
                  </div>
                </div>

                <button
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setCalendarDate(newDate);
                  }}
                  className="bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-2 px-4 rounded-lg"
                >
                  →
                </button>
              </div>
              
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-2 px-4 rounded-lg"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Timeline/List/Add Controls */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`py-2 px-4 rounded-lg ${
                      viewMode === 'timeline' 
                        ? 'bg-amber-500 text-gray-900' 
                        : 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`py-2 px-4 rounded-lg ${
                      viewMode === 'list' 
                        ? 'bg-amber-500 text-gray-900' 
                        : 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    List
                  </button>
                </div>
                <button 
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium"
                  onClick={() => setActiveTab('appointment-new')}
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Appt.
                </button>
              </div>
            </div>

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg">
                {appointmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="space-y-0">
                      {generateMobileTimeSlots().map((slot) => {
                        const now = new Date();
                        const currentHour = now.getHours();
                        const currentMinutes = now.getMinutes();
                        const isToday = calendarDate.toDateString() === now.toDateString();
                        const isCurrentHour = isToday && slot.hour === currentHour;
                        
                        // Get service-based color for appointments
                        const getServiceColor = (serviceName?: string): string => {
                          if (!serviceName) return '#6B7280';
                          const name = serviceName.toLowerCase();
                          
                          if (name.includes('haircut') || name.includes('cut')) return '#F59E0B';
                          if (name.includes('beard') || name.includes('trim')) return '#10B981';
                          if (name.includes('shave')) return '#3B82F6';
                          if (name.includes('styling') || name.includes('wash')) return '#8B5CF6';
                          if (name.includes('color') || name.includes('dye')) return '#EC4899';
                          
                          return '#6B7280';
                        };
                        
                        return (
                          <div
                            key={slot.hour}
                            className={`relative flex items-start border-b border-gray-700 ${
                              slot.isBlocked
                                ? 'bg-gray-900/50'
                                : 'bg-gray-800'
                            }`}
                            style={{ minHeight: '80px' }}
                          >
                            {/* Time Label */}
                            <div className="w-20 p-4 text-sm font-medium text-gray-300 flex-shrink-0 border-r border-gray-700">
                              {slot.time}
                            </div>
                            
                            {/* Content Area */}
                            <div className="flex-1 relative p-4">
                              {slot.appointments.length > 0 ? (
                                <div className="space-y-2">
                                  {slot.appointments.map((appointment) => {
                                    const startTime = new Date(appointment.scheduledAt);
                                    const appointmentMinutes = startTime.getMinutes();
                                    const serviceColor = getServiceColor(appointment.service?.name);
                                    
                                    return (
                                      <div
                                        key={appointment.id}
                                        onClick={() => {
                                          setSelectedAppointment(appointment);
                                          setIsDetailsDialogOpen(true);
                                        }}
                                        className="p-3 rounded-lg cursor-pointer text-sm border-l-4 shadow-sm hover:shadow-md transition-shadow"
                                        style={{ 
                                          backgroundColor: `${serviceColor}20`,
                                          borderLeftColor: serviceColor,
                                          color: serviceColor
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-semibold text-white">
                                              {appointment.client?.name || 'Unknown Client'}
                                            </div>
                                            <div className="text-xs opacity-75 mt-1 text-gray-300">
                                              {appointment.service?.name || 'No service'} • {appointment.duration}min
                                            </div>
                                            {appointmentMinutes > 0 && (
                                              <div className="text-xs opacity-60 mt-1 text-gray-400">
                                                {startTime.toLocaleTimeString('en-US', {
                                                  hour: 'numeric',
                                                  minute: '2-digit',
                                                  hour12: true
                                                })}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: serviceColor, color: 'white' }}>
                                            {appointment.status.toUpperCase()}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 py-2">
                                  {slot.isBlocked ? 'Outside working hours' : 'Available'}
                                </div>
                              )}
                            </div>
                            
                            {/* Current Time Indicator */}
                            {isCurrentHour && (
                              <div
                                className="absolute left-0 right-0 z-50 pointer-events-none"
                                style={{ 
                                  top: `${(currentMinutes / 60) * 80}px`,
                                  height: '2px'
                                }}
                              >
                                <div className="flex items-center">
                                  <div className="w-20 h-6 bg-red-500 rounded-r-full flex items-center justify-center">
                                    <div className="w-3 h-3 bg-white rounded-full" />
                                  </div>
                                  <div className="flex-1 h-0.5 bg-red-500" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                {appointmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : calendarAppointmentsForDate.length > 0 ? (
                  <div className="space-y-3">
                    {calendarAppointmentsForDate.map((appointment) => (
                      <div key={appointment.id} className="p-3 bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{appointment.client?.name}</p>
                            <p className="text-sm text-gray-400">{appointment.service?.name}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-amber-500">{appointment.price}</p>
                            <p className="text-xs text-gray-400">{appointment.duration}min</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No appointments scheduled for this day</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Appointment Creation */}
        {activeTab === 'appointment-new' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">New Appointment</h2>
              </div>
            </div>

            {/* Client Selection */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Select Client</h3>
              <select
                value={appointmentForm.clientId}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
              >
                <option value="">Choose a client...</option>
                {clients?.map(client => (
                  <option key={client.id} value={client.id.toString()}>
                    {client.name} - {client.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Selection */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Select Services</h3>
              <div className="space-y-3">
                {services?.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-white">{service.name}</div>
                      <div className="text-sm text-gray-400">${service.price} • {service.duration}min</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const existing = appointmentForm.services.find(s => s.serviceId === service.id);
                          if (existing) {
                            setAppointmentForm(prev => ({
                              ...prev,
                              services: prev.services.map(s => 
                                s.serviceId === service.id ? { ...s, quantity: Math.max(0, s.quantity - 1) } : s
                              ).filter(s => s.quantity > 0)
                            }));
                          }
                        }}
                        className="w-8 h-8 bg-gray-600 text-white border border-gray-500 rounded-lg hover:bg-gray-500 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white w-8 text-center">
                        {appointmentForm.services.find(s => s.serviceId === service.id)?.quantity || 0}
                      </span>
                      <button
                        onClick={() => {
                          const existing = appointmentForm.services.find(s => s.serviceId === service.id);
                          if (existing) {
                            setAppointmentForm(prev => ({
                              ...prev,
                              services: prev.services.map(s => 
                                s.serviceId === service.id ? { ...s, quantity: s.quantity + 1 } : s
                              )
                            }));
                          } else {
                            setAppointmentForm(prev => ({
                              ...prev,
                              services: [...prev.services, { serviceId: service.id, quantity: 1 }]
                            }));
                          }
                        }}
                        className="w-8 h-8 bg-gray-600 text-white border border-gray-500 rounded-lg hover:bg-gray-500 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Date & Time</h3>
              <input
                type="datetime-local"
                value={appointmentForm.scheduledAt}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Travel Option */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Travel Service</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeTravel"
                    checked={appointmentForm.includeTravel}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, includeTravel: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="includeTravel" className="text-white">
                    Include travel to client location
                  </label>
                </div>
                {appointmentForm.includeTravel && (
                  <textarea
                    placeholder="Client address..."
                    value={appointmentForm.address}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                    rows={2}
                  />
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-white text-lg font-semibold mb-3">Notes (Optional)</h3>
              <textarea
                placeholder="Additional notes..."
                value={appointmentForm.notes}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  resetAppointmentForm();
                  setActiveTab('calendar');
                }}
                className="flex-1 bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 py-3 px-4 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createAppointment}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-gray-900 py-3 px-4 rounded-lg font-medium"
              >
                Create Appointment
              </button>
            </div>
          </div>
        )}

        {/* Clients */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Clients</h2>
              <button className="bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium">
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Client
              </button>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-center">Mobile clients interface coming soon...</p>
            </div>
          </div>
        )}

        {/* Services */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Services</h2>
              <button className="bg-amber-500 hover:bg-amber-600 text-gray-900 py-2 px-4 rounded-lg font-medium">
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Service
              </button>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-center">Mobile services interface coming soon...</p>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-center">Mobile settings interface coming soon...</p>
            </div>
          </div>
        )}
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
    </div>
  );
}