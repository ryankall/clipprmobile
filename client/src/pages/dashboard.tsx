import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { QuickActions } from "@/components/quick-actions";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, Slice, Bell, Plus, Calendar, Users, Camera, Settings, X } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { DashboardStats, AppointmentWithRelations, GalleryPhoto } from "@shared/schema";

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

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

  const unreadCount = unreadData?.count || 0;

  // Mock notifications data - in real app this would come from API
  const notifications = [
    {
      id: 1,
      title: "Upcoming Appointment",
      message: "steve the job - 2:00 PM today",
      time: "5 min ago",
      type: "appointment"
    },
    {
      id: 2,
      title: "Payment Received",
      message: "bob the builder paid $25.00",
      time: "1 hour ago",
      type: "payment"
    },
    {
      id: 3,
      title: "New Client Inquiry",
      message: "Someone messaged about services",
      time: "2 hours ago",
      type: "message"
    }
  ];

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
            <Link href="/messages">
              <Button
                variant="ghost"
                size="sm"
                className="relative touch-target p-2"
              >
                <Bell className="w-5 h-5 text-steel" />
                {unreadCount > 0 && (
                  <div className="notification-badge">{unreadCount}</div>
                )}
              </Button>
            </Link>
            <Link href="/settings" className="touch-target">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.photoUrl || undefined} alt={`${user?.firstName} ${user?.lastName}`} />
                <AvatarFallback className="bg-gold text-charcoal text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Notifications Panel */}
      {showNotifications && (
        <div ref={notificationRef} className="absolute top-16 right-4 w-80 bg-charcoal border border-steel/20 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-steel/20 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 hover:bg-steel/10 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-medium text-white">{notification.title}</h4>
                    <span className="text-xs text-steel">{notification.time}</span>
                  </div>
                  <p className="text-sm text-steel">{notification.message}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-steel">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No new notifications</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <AppointmentCard key={appointment.id} appointment={appointment} />
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

        {/* Quick Invoice */}
        <Card className="bg-dark-card border-steel/20 card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick Invoice</h3>
              <Link href="/invoice">
                <Button variant="link" className="text-gold text-sm font-medium p-0 h-auto">
                  History
                </Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/invoice?service=haircut">
                  <Button variant="outline" className="bg-charcoal border-steel/40 h-auto p-3 text-center touch-target flex flex-col items-center space-y-2 w-full tap-feedback hover:bg-charcoal/80">
                    <Slice className="w-5 h-5 text-gold" />
                    <div className="text-sm font-medium">Haircut</div>
                    <div className="text-xs text-steel">$45</div>
                  </Button>
                </Link>
                <Link href="/invoice?service=combo">
                  <Button variant="outline" className="bg-charcoal border-steel/40 h-auto p-3 text-center touch-target flex flex-col items-center space-y-2 w-full tap-feedback hover:bg-charcoal/80">
                    <Scissors className="w-5 h-5 text-gold" />
                    <div className="text-sm font-medium">Combo</div>
                    <div className="text-xs text-steel">$65</div>
                  </Button>
                </Link>
              </div>
              
              <Link href="/invoice">
                <Button className="w-full gradient-gold text-charcoal font-semibold touch-target tap-feedback">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom Invoice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions for Mobile */}
        <QuickActions />
      </main>

      <BottomNavigation currentPath="/" />
    </div>
  );
}
