import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { QuickActions } from "@/components/quick-actions";
import { Scissors, Slice, Bell, Plus, Calendar, Users, Camera, Settings } from "lucide-react";
import { Link } from "wouter";
import type { DashboardStats, AppointmentWithRelations, GalleryPhoto } from "@shared/schema";

export default function Dashboard() {
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
            <div className="relative touch-target">
              <Bell className="w-5 h-5 text-steel" />
              <div className="notification-badge">3</div>
            </div>
            <div className="w-8 h-8 bg-steel rounded-full" />
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
