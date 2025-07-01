import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { AppointmentPreview } from "@/components/appointment-preview-simple";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
import { PendingReservations } from "@/components/pending-reservations";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, Slice, Bell, Plus, Calendar, Users, Camera, Settings, X, MessageSquare, CreditCard, User as UserIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import type { DashboardStats, AppointmentWithRelations, GalleryPhoto, User } from "@shared/schema";
import type { Service } from "@/lib/types";

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: stripeStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/stripe/status"],
  });

  const unreadCount = unreadData?.count || 0;

  // Get quick action messages (mock for now - should come from settings)
  const quickActionMessages = {
    onMyWay: "Hi {client_name}, I'm on my way to your {appointment_time} appointment for {service}. See you soon!",
    runningLate: "Hi {client_name}, I'm running a few minutes late for your {appointment_time} appointment. Will be there shortly!",
    confirmation: "Hi {client_name}, confirming your appointment for {appointment_time} at {address} for {service}."
  };

  // Find next and current appointments
  const now = new Date();
  
  // Current appointment is happening now (from 30 minutes before to end time)
  const currentAppointment = todayAppointments?.find(apt => {
    const startTime = new Date(apt.scheduledAt);
    const endTime = new Date(startTime.getTime() + (apt.duration * 60 * 1000));
    const timeDiff = now.getTime() - startTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    // Show as current if we're within 30 minutes before start time through the end time
    return minutesDiff >= -30 && now <= endTime;
  }) || null;

  // Next appointment is the soonest future appointment (excludes current appointment)
  const upcomingAppointments = todayAppointments?.filter(apt => {
    const startTime = new Date(apt.scheduledAt);
    // Don't show appointments that are current
    if (currentAppointment && apt.id === currentAppointment.id) {
      return false;
    }
    // Show all future appointments
    return startTime > now;
  }) || [];
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  // Generate smart notifications based on user data
  const generateNotifications = () => {
    const notifications = [];

    // Unread messages notification
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

    // Profile setup reminder
    if (!user?.businessName || !user?.serviceArea || !user?.about) {
      notifications.push({
        id: 'profile',
        title: 'Complete Your Profile',
        message: 'Set up your business name, service area, and bio',
        icon: UserIcon,
        action: () => {
          setShowNotifications(false);
          navigate('/settings');
        },
        type: 'profile'
      });
    }

    // Stripe account setup
    if (!stripeStatus?.connected) {
      notifications.push({
        id: 'stripe',
        title: 'Configure Payment Account',
        message: 'Set up Stripe to receive payments from clients',
        icon: CreditCard,
        action: () => {
          setShowNotifications(false);
          navigate('/settings');
          // Scroll to payment section after navigation
          setTimeout(() => {
            const paymentSection = document.querySelector('[data-section="payment"]');
            if (paymentSection) {
              paymentSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        },
        type: 'payment'
      });
    }

    return notifications;
  };

  const notifications = generateNotifications().filter(notification => 
    !dismissedNotifications.includes(notification.id)
  );

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
              <Scissors className="w-5 h-5 text-charcoal" />
            </div>
            <h1 className="text-xl font-bold text-gold">Clippr</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="relative touch-target p-2"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-steel" />
                {notifications.length > 0 && (
                  <div className="notification-badge">{notifications.length}</div>
                )}
              </Button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div 
                  ref={notificationRef}
                  className="absolute right-0 top-full mt-2 w-80 bg-charcoal border border-steel/20 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                >
                  <div className="p-3 border-b border-steel/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Notifications</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNotifications(false)}
                        className="h-6 w-6 p-0 text-steel hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-steel text-sm">
                        All caught up! No new notifications.
                      </div>
                    ) : (
                      notifications.map((notification, index) => {
                        const IconComponent = notification.icon;
                        return (
                          <div
                            key={notification.id}
                            style={{
                              touchAction: 'pan-x',
                            }}
                            onTouchStart={(e) => {
                              console.log('Touch start detected');
                              const target = e.currentTarget;
                              const startX = e.touches[0].clientX;
                              let currentX = startX;
                              let isDragging = false;
                              
                              const onTouchMove = (e: TouchEvent) => {
                                currentX = e.touches[0].clientX;
                                const deltaX = currentX - startX;
                                
                                if (Math.abs(deltaX) > 10) {
                                  isDragging = true;
                                  e.preventDefault();
                                  console.log('Swiping, deltaX:', deltaX);
                                  
                                  if (deltaX < 0) {
                                    // Swiping left - show red background and translate
                                    const translateX = Math.max(deltaX, -100);
                                    target.style.transform = `translateX(${translateX}px)`;
                                    target.style.backgroundColor = deltaX < -50 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)';
                                  }
                                }
                              };
                              
                              const onTouchEnd = (e: TouchEvent) => {
                                const deltaX = currentX - startX;
                                console.log('Touch end, deltaX:', deltaX, 'isDragging:', isDragging);
                                
                                if (isDragging && deltaX < -50) {
                                  // Remove notification if swiped far enough
                                  console.log('Dismissing notification:', notification.id);
                                  target.style.transform = 'translateX(-100%)';
                                  setTimeout(() => {
                                    setDismissedNotifications(prev => [...prev, notification.id]);
                                  }, 200);
                                } else {
                                  // Snap back
                                  target.style.transform = 'translateX(0)';
                                  target.style.backgroundColor = '';
                                  
                                  // If it was a tap (not a drag), trigger the action
                                  if (!isDragging) {
                                    notification.action?.();
                                  }
                                }
                                
                                document.removeEventListener('touchmove', onTouchMove);
                                document.removeEventListener('touchend', onTouchEnd);
                              };
                              
                              document.addEventListener('touchmove', onTouchMove, { passive: false });
                              document.addEventListener('touchend', onTouchEnd);
                            }}
                            onMouseDown={(e) => {
                              // Fallback for desktop testing
                              console.log('Mouse down detected');
                              const target = e.currentTarget;
                              const startX = e.clientX;
                              let currentX = startX;
                              let isDragging = false;
                              
                              const onMouseMove = (e: MouseEvent) => {
                                currentX = e.clientX;
                                const deltaX = currentX - startX;
                                
                                if (Math.abs(deltaX) > 10) {
                                  isDragging = true;
                                  e.preventDefault();
                                  console.log('Mouse dragging, deltaX:', deltaX);
                                  
                                  if (deltaX < 0) {
                                    // Swiping left - show red background and translate
                                    const translateX = Math.max(deltaX, -100);
                                    target.style.transform = `translateX(${translateX}px)`;
                                    target.style.backgroundColor = deltaX < -50 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)';
                                  }
                                }
                              };
                              
                              const onMouseUp = (e: MouseEvent) => {
                                const deltaX = currentX - startX;
                                console.log('Mouse up, deltaX:', deltaX, 'isDragging:', isDragging);
                                
                                if (isDragging && deltaX < -50) {
                                  // Remove notification if swiped far enough
                                  console.log('Dismissing notification:', notification.id);
                                  target.style.transform = 'translateX(-100%)';
                                  setTimeout(() => {
                                    setDismissedNotifications(prev => [...prev, notification.id]);
                                  }, 200);
                                } else {
                                  // Snap back
                                  target.style.transform = 'translateX(0)';
                                  target.style.backgroundColor = '';
                                  
                                  // If it was a tap (not a drag), trigger the action
                                  if (!isDragging) {
                                    notification.action?.();
                                  }
                                }
                                
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                              };
                              
                              document.addEventListener('mousemove', onMouseMove);
                              document.addEventListener('mouseup', onMouseUp);
                            }}
                            className="relative overflow-hidden border-b border-steel/10 last:border-b-0 p-3 hover:bg-steel/10 cursor-pointer transition-all duration-200"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <IconComponent className="w-4 h-4 text-gold" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-steel mt-1">
                                  {notification.message}
                                </p>
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
            <Link href="/settings" className="touch-target">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.photoUrl || undefined} alt={`${user?.firstName} ${user?.lastName}` || user?.email || "User"} />
                <AvatarFallback className="bg-gold text-charcoal text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>



      <main className="p-4 space-y-6">
        {/* Daily Summary Card */}
        <Card className="bg-dark-card border-steel/20 card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Today's Summary</h2>
              <span className="text-sm text-steel">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gold mb-1">
                  ${stats?.dailyEarnings || '0'}
                </div>
                <div className="text-sm text-steel">Earnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {stats?.appointmentCount || 0}
                </div>
                <div className="text-sm text-steel">Appointments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/clients">
            <Button className="gradient-gold text-charcoal h-auto p-4 card-shadow touch-target flex flex-col items-center space-y-2 font-semibold w-full tap-feedback">
              <Plus className="w-5 h-5" />
              <span>New Client</span>
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="bg-dark-card text-white border-steel/40 h-auto p-4 card-shadow touch-target flex flex-col items-center space-y-2 font-semibold w-full tap-feedback hover:bg-dark-card/80">
              <Calendar className="w-5 h-5 text-gold" />
              <span>Schedule</span>
            </Button>
          </Link>
        </div>

        {/* Next Appointment Preview */}
        {nextAppointment && (
          <AppointmentPreview
            appointment={nextAppointment}
            type="next"
            services={services}
            quickActionMessages={quickActionMessages}
            onDetailsClick={() => {
              setSelectedAppointment(nextAppointment);
              setIsDetailsDialogOpen(true);
            }}
          />
        )}

        {/* Current Appointment Preview */}
        {currentAppointment && (
          <AppointmentPreview
            appointment={currentAppointment}
            type="current"
            services={services}
            onDetailsClick={() => {
              setSelectedAppointment(currentAppointment);
              setIsDetailsDialogOpen(true);
            }}
          />
        )}

        {/* Today's Appointments */}
        <Card className="bg-dark-card border-steel/20 card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Today's Appointments</h3>
              <Link href="/calendar">
                <Button variant="link" className="text-gold text-sm font-medium p-0 h-auto">
                  View All
                </Button>
              </Link>
            </div>
            
            <div className="space-y-3">
              {appointmentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
                </div>
              ) : todayAppointments?.length ? (
                todayAppointments.map((appointment) => (
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
                <div className="text-center py-8 text-steel">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No appointments scheduled for today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Reservations */}
        <PendingReservations 
          onReservationClick={(reservation) => {
            // Convert reservation to appointment-like structure for display
            const tempAppointment = {
              id: reservation.id,
              userId: reservation.userId,
              clientId: 0, // No client ID for reservations
              serviceId: 0, // No service ID for reservations
              scheduledAt: new Date(reservation.scheduledAt),
              duration: reservation.duration,
              price: "0.00",
              status: "pending" as const,
              address: reservation.address || null,
              notes: reservation.notes || null,
              reminderSent: false,
              createdAt: new Date(reservation.createdAt),
              updatedAt: new Date(reservation.updatedAt),
              client: {
                id: 0,
                userId: reservation.userId,
                name: reservation.customerName,
                phone: reservation.customerPhone,
                email: reservation.customerEmail || null,
                address: reservation.address || null,
                photoUrl: null,
                preferredStyle: null,
                notes: reservation.notes || null,
                loyaltyStatus: null,
                lastVisit: null,
                totalVisits: null,
                createdAt: new Date(reservation.createdAt),
                updatedAt: new Date(reservation.updatedAt),
              },
              service: {
                id: 0,
                userId: reservation.userId,
                name: reservation.services.join(", "),
                price: "0.00",
                duration: reservation.duration,
                description: null,
                category: "other" as const,
                isActive: true,
                createdAt: new Date(reservation.createdAt),
                updatedAt: new Date(reservation.updatedAt),
              }
            };
            setSelectedAppointment(tempAppointment);
            setIsDetailsDialogOpen(true);
          }}
        />

        {/* Recent Work Gallery */}
        <Card className="bg-dark-card border-steel/20 card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Work</h3>
              <Link href="/gallery">
                <Button variant="link" className="text-gold text-sm font-medium p-0 h-auto">
                  Gallery
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {photosLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="polaroid card-shadow">
                      <div className="w-full h-20 bg-steel/20 rounded animate-pulse" />
                      <div className="text-xs text-center mt-1 text-steel">Loading...</div>
                    </div>
                  ))}
                </>
              ) : recentPhotos?.length ? (
                recentPhotos.map((photo) => (
                  <div key={photo.id} className="polaroid card-shadow">
                    <img 
                      src={photo.photoUrl} 
                      alt={photo.description || "Portfolio work"} 
                      className="w-full h-20 object-cover rounded" 
                    />
                    <div className="text-xs text-center mt-1 text-steel">
                      {photo.description || 'Styling'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-steel">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No photos uploaded yet</p>
                  <Link href="/gallery">
                    <Button variant="link" className="text-gold text-sm mt-2 p-0 h-auto">
                      Add your first photo
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>



      </main>

      <BottomNavigation currentPath="/" />
      
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
