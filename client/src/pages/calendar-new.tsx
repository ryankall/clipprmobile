import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Settings, Grid, List, Eye, EyeOff } from "lucide-react";
import { WorkingHoursDialog } from "@/components/working-hours-dialog";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
import { TimelineCalendar } from "@/components/timeline-calendar";
import { format, addDays, subDays, startOfWeek, endOfWeek, isToday, isSameDay } from "date-fns";
import { Link, useLocation } from "wouter";
import type { AppointmentWithRelations } from "@shared/schema";

export default function CalendarNew() {
  console.log('Calendar-new component rendering...');
  
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [showExpired, setShowExpired] = useState(false);
  const [showWorkingHoursDialog, setShowWorkingHoursDialog] = useState(false);
  
  console.log('Selected date:', selectedDate.toISOString().split('T')[0]);
  
  // Check for pending booking from messages
  useEffect(() => {
    const pendingBooking = localStorage.getItem('pendingBooking');
    if (pendingBooking) {
      try {
        const bookingInfo = JSON.parse(pendingBooking);
        localStorage.removeItem('pendingBooking');
        
        const params = new URLSearchParams();
        if (bookingInfo.clientId) {
          params.set('clientId', bookingInfo.clientId.toString());
        } else {
          params.set('clientName', bookingInfo.clientName);
          params.set('phone', bookingInfo.clientPhone);
          if (bookingInfo.clientEmail) {
            params.set('email', bookingInfo.clientEmail);
          }
        }
        if (bookingInfo.services && bookingInfo.services.length > 0) {
          params.set('services', bookingInfo.services.join(','));
        }
        if (bookingInfo.address) {
          params.set('address', bookingInfo.address);
        }
        if (bookingInfo.notes) {
          params.set('notes', bookingInfo.notes);
        }
        if (bookingInfo.selectedDate && bookingInfo.selectedTime) {
          const scheduledAt = new Date(`${bookingInfo.selectedDate}T${bookingInfo.selectedTime}:00`);
          params.set('scheduledAt', scheduledAt.toISOString());
        }
        
        navigate(`/appointments/new?${params.toString()}`);
      } catch (error) {
        console.error('Error parsing pending booking data:', error);
        localStorage.removeItem('pendingBooking');
      }
    }
  }, [navigate]);
  
  const startDate = startOfWeek(selectedDate);
  const endDate = endOfWeek(selectedDate);

  const { data: appointments, isLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments", startDate.toISOString(), endDate.toISOString()],
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
  });

  console.log('Total appointments loaded:', appointments?.length || null);

  // Filter appointments for selected date
  const selectedDateAppointments = appointments?.filter(apt => {
    const aptDate = format(new Date(apt.scheduledAt), 'yyyy-MM-dd');
    const selDate = format(selectedDate, 'yyyy-MM-dd');
    return aptDate === selDate;
  }) || [];

  // Filter by status
  const visibleAppointments = selectedDateAppointments.filter(apt => {
    if (showExpired) return true;
    return apt.status === 'confirmed' || apt.status === 'pending';
  });

  console.log('Appointments for selected date:', selectedDateAppointments.length);

  // Debug log appointment details
  if (selectedDateAppointments.length > 0) {
    console.log('📅 DETAILED APPOINTMENT ANALYSIS:');
    selectedDateAppointments.forEach((apt, index) => {
      const startTime = new Date(apt.scheduledAt);
      const endTime = new Date(startTime.getTime() + apt.duration * 60000);
      
      console.log(`${index + 1}. ${apt.client.name} - ${apt.service?.name || 'Unknown Service'}`);
      
      if (apt.status !== 'confirmed') {
        console.log(`   Status: ${apt.status}`);
      }
      
      console.log(`   Time: ${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`);
      console.log(`   Duration: ${apt.duration} minutes`);
      console.log(`   Start Hour: ${startTime.getHours()}, End Hour: ${endTime.getHours()}`);
      
      if (index < selectedDateAppointments.length - 1) {
        console.log('---');
      }
    });
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  // Get working hours for selected date (mock working hours for now)
  const workingHours = {
    enabled: true,
    start: '09:00',
    end: '18:00'
  };

  // Handle appointment click
  const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDialog(true);
  };

  // Count appointments by status
  const appointmentCounts = {
    confirmed: selectedDateAppointments.filter(apt => apt.status === 'confirmed').length,
    pending: selectedDateAppointments.filter(apt => apt.status === 'pending').length,
    expired: selectedDateAppointments.filter(apt => apt.status === 'expired').length,
    cancelled: selectedDateAppointments.filter(apt => apt.status === 'cancelled').length,
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">Enhanced Calendar</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              onClick={() => setViewMode('timeline')}
              className="bg-charcoal border-steel/40 text-gold"
            >
              <Grid className="w-4 h-4 mr-1" />
              Timeline
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="bg-charcoal border-steel/40 text-gold"
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowWorkingHoursDialog(true)}
              className="bg-charcoal border-steel/40 text-steel hover:text-gold"
            >
              <Settings className="w-4 h-4 mr-1" />
              Hours
            </Button>
            <Link href="/appointments/new">
              <Button size="sm" className="gradient-gold text-charcoal tap-feedback">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Week Navigation */}
        <Card className="bg-dark-card border-steel/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-steel hover:text-white tap-feedback"
                onClick={() => setSelectedDate(subDays(selectedDate, 7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="font-semibold text-white">
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </h2>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-steel hover:text-white tap-feedback"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const dayAppointments = appointments?.filter(apt => 
                  isSameDay(new Date(apt.scheduledAt), day)
                ) || [];

                return (
                  <Button
                    key={day.toISOString()}
                    variant={isSelected ? "default" : "ghost"}
                    className={`h-14 flex flex-col items-center justify-center p-1 tap-feedback ${
                      isSelected 
                        ? "bg-gold text-charcoal" 
                        : isTodayDate 
                          ? "text-gold border border-gold/30" 
                          : "text-steel hover:text-white"
                    }`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="text-xs leading-none">{format(day, 'EEE')}</div>
                    <div className="text-sm font-medium leading-none">{format(day, 'd')}</div>
                    {dayAppointments.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="w-1 h-1 bg-current rounded-full" />
                        <span className="text-xs">{dayAppointments.length}</span>
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Appointment Status Summary */}
        {selectedDateAppointments.length > 0 && (
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExpired(!showExpired)}
                  className="text-steel hover:text-white"
                >
                  {showExpired ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {showExpired ? 'Hide' : 'Show'} All
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {appointmentCounts.confirmed > 0 && (
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {appointmentCounts.confirmed} Confirmed
                  </Badge>
                )}
                {appointmentCounts.pending > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {appointmentCounts.pending} Pending
                  </Badge>
                )}
                {appointmentCounts.expired > 0 && (
                  <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
                    {appointmentCounts.expired} Expired
                  </Badge>
                )}
                {appointmentCounts.cancelled > 0 && (
                  <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                    {appointmentCounts.cancelled} Cancelled
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}



        {/* Timeline Calendar View */}
        {viewMode === 'timeline' && (
          <TimelineCalendar
            appointments={visibleAppointments}
            selectedDate={selectedDate}
            workingHours={workingHours}
            onAppointmentClick={handleAppointmentClick}
          />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white">
                {format(selectedDate, 'EEEE, MMMM d')} - Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
                </div>
              ) : visibleAppointments.length > 0 ? (
                <div className="space-y-3">
                  {visibleAppointments
                    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                    .map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-4 bg-charcoal rounded-lg cursor-pointer hover:bg-steel/20 transition-colors"
                        onClick={() => handleAppointmentClick(appointment)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-semibold text-white">
                              {format(new Date(appointment.scheduledAt), 'h:mm a')}
                            </div>
                            <Badge 
                              variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                              className={
                                appointment.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                                appointment.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                appointment.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                          <div className="text-gold font-semibold">
                            ${appointment.price}
                          </div>
                        </div>
                        <div className="text-white font-medium mb-1">
                          {appointment.client.name}
                        </div>
                        <div className="text-steel text-sm">
                          {appointment.service?.name || 'Service'} • {appointment.duration} min
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-steel">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No appointments scheduled</p>
                  <Link href="/appointments/new">
                    <Button variant="link" className="text-gold text-sm mt-2 p-0 h-auto">
                      Schedule an appointment
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={showAppointmentDialog}
        onClose={() => setShowAppointmentDialog(false)}
      />

      {/* Working Hours Dialog */}
      <WorkingHoursDialog
        open={showWorkingHoursDialog}
        onClose={() => setShowWorkingHoursDialog(false)}
        workingHours={workingHours}
      />

      <BottomNavigation currentPath="/calendar" />
    </div>
  );
}