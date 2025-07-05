import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
// import { WorkingHoursDialog } from "@/components/working-hours-dialog";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Link, useLocation } from "wouter";
import type { AppointmentWithRelations } from "@shared/schema";

// Helper function to generate time slots for calendar view
function generateTimeSlots(appointments: AppointmentWithRelations[]) {
  const slots = [];
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  
  // Generate time slots from 9 AM to 8 PM
  for (let hour = 9; hour <= 20; hour++) {
    const timeStr = hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
    
    // Check if there's an appointment at this time
    const appointment = sortedAppointments.find(apt => {
      const aptTime = new Date(apt.scheduledAt);
      return aptTime.getHours() === hour;
    });
    
    slots.push({
      time: timeStr,
      appointment: appointment || null
    });
  }
  
  return slots;
}

// Helper function to get appointment color based on service type
function getAppointmentColor(appointment: AppointmentWithRelations) {
  const serviceName = appointment.service?.name?.toLowerCase() || '';
  
  // Color scheme based on service type
  if (serviceName.includes('haircut') || serviceName.includes('cut')) {
    return 'bg-amber-100 border-amber-200'; // Warm amber for haircuts
  } else if (serviceName.includes('beard') || serviceName.includes('trim')) {
    return 'bg-emerald-100 border-emerald-200'; // Green for beard services
  } else if (serviceName.includes('shave')) {
    return 'bg-blue-100 border-blue-200'; // Blue for shave services
  } else if (serviceName.includes('wash') || serviceName.includes('styling')) {
    return 'bg-purple-100 border-purple-200'; // Purple for styling
  } else if (serviceName.includes('color') || serviceName.includes('dye')) {
    return 'bg-pink-100 border-pink-200'; // Pink for color services
  } else {
    return 'bg-gray-100 border-gray-200'; // Default gray
  }
}

export default function Calendar() {
  console.log('Calendar component rendering...');
  
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  
  // Check for pending booking from messages
  useEffect(() => {
    const pendingBooking = localStorage.getItem('pendingBooking');
    if (pendingBooking) {
      try {
        const bookingInfo = JSON.parse(pendingBooking);
        console.log('Found pending booking:', bookingInfo);
        
        // Clear the pending booking data
        localStorage.removeItem('pendingBooking');
        
        // Build URL parameters for the appointment page
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
        
        // Navigate to appointment creation page with prefilled data
        navigate(`/appointments/new?${params.toString()}`);
      } catch (error) {
        console.error('Error parsing pending booking data:', error);
        localStorage.removeItem('pendingBooking'); // Clear invalid data
      }
    }
  }, [navigate]);
  
  console.log('Selected date state:', selectedDate);
  
  const startDate = startOfWeek(selectedDate);
  const endDate = endOfWeek(selectedDate);
  
  console.log('Week range:', startDate, 'to', endDate);

  const { data: appointments, isLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments", startDate.toISOString(), endDate.toISOString()],
  });

  console.log('Appointments query - isLoading:', isLoading, 'data:', appointments);

  // Fetch user profile to pass working hours to dialog
  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
  });

  const selectedDateAppointments = appointments?.filter(apt => {
    const aptDate = format(new Date(apt.scheduledAt), 'yyyy-MM-dd');
    const selDate = format(selectedDate, 'yyyy-MM-dd');
    console.log('Appointment:', apt.client.name, 'Date:', aptDate, 'Selected:', selDate, 'Match:', aptDate === selDate);
    return aptDate === selDate;
  }) || [];
  
  console.log('Total appointments:', appointments?.length);
  console.log('Selected date:', format(selectedDate, 'yyyy-MM-dd'));
  console.log('Filtered appointments for selected date:', selectedDateAppointments.length);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* DEBUG - This should always show if component renders */}
      <div style={{position: 'fixed', top: '10px', left: '10px', background: 'red', color: 'white', padding: '5px', zIndex: 9999}}>
        CALENDAR LOADED - {selectedDate.toISOString().split('T')[0]}
      </div>
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">Calendar</h1>
          </div>
          <div className="flex items-center space-x-2">
            {/* TODO: Fix working hours integration */}
            <Button size="sm" variant="outline" className="bg-charcoal border-steel/40 text-gold">
              <CalendarIcon className="w-4 h-4 mr-1" />
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
                onClick={() => {
                  console.log('Previous week clicked');
                  setSelectedDate(subDays(selectedDate, 7));
                }}
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
                onClick={() => {
                  console.log('Next week clicked');
                  setSelectedDate(addDays(selectedDate, 7));
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const dayAppointments = appointments?.filter(apt => 
                  format(new Date(apt.scheduledAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                ) || [];

                return (
                  <Button
                    key={day.toISOString()}
                    variant={isSelected ? "default" : "ghost"}
                    className={`h-12 flex flex-col items-center justify-center p-1 tap-feedback ${
                      isSelected 
                        ? "bg-gold text-charcoal" 
                        : isToday 
                          ? "text-gold border border-gold/30" 
                          : "text-steel hover:text-white"
                    }`}
                    onClick={() => {
                      console.log('Day clicked:', format(day, 'yyyy-MM-dd'), 'Appointments on this day:', dayAppointments.length);
                      setSelectedDate(day);
                    }}
                  >
                    <div className="text-xs leading-none">{format(day, 'EEE')}</div>
                    <div className="text-sm font-medium leading-none flex items-center justify-center min-h-[1.25rem]">{format(day, 'd')}</div>
                    {dayAppointments.length > 0 && (
                      <div className="w-1 h-1 bg-current rounded-full mt-1" />
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule - Time-based Layout */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white">
              {format(selectedDate, 'EEEE, MMMM d')}
              {selectedDateAppointments.length > 0 && (
                <span className="text-sm font-normal text-steel ml-2">
                  ({selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : selectedDateAppointments.length > 0 ? (
              <div className="relative">
                {/* Time-based schedule view */}
                <div className="space-y-0">
                  {generateTimeSlots(selectedDateAppointments).map((slot, index) => (
                    <div key={index} className="flex border-b border-steel/10 last:border-b-0">
                      {/* Time label */}
                      <div className="w-16 p-4 text-sm text-steel font-medium bg-dark-card/50 border-r border-steel/10">
                        {slot.time}
                      </div>
                      {/* Appointment or empty slot */}
                      <div className="flex-1 min-h-16">
                        {slot.appointment ? (
                          <div 
                            className={`m-2 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] ${getAppointmentColor(slot.appointment)}`}
                            onClick={() => {
                              setSelectedAppointment(slot.appointment);
                              setShowAppointmentDialog(true);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800 mb-1">
                                  {slot.appointment.client.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {slot.appointment.service?.name || 'Service'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-700">
                                  {slot.appointment.duration}m
                                </div>
                                <div className="text-xs text-gray-500">
                                  ${slot.appointment.price || '0'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-16"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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

        {/* Week Overview */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white">Week Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weekDays.map((day) => {
                const dayAppointments = appointments?.filter(apt => 
                  format(new Date(apt.scheduledAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                ) || [];

                return (
                  <div key={day.toISOString()} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-white w-16">
                        {format(day, 'EEE d')}
                      </div>
                      <div className="text-xs text-steel">
                        {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-sm text-gold">
                      ${dayAppointments.reduce((sum, apt) => sum + parseFloat(apt.price || '0'), 0).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={showAppointmentDialog}
        onClose={() => {
          setShowAppointmentDialog(false);
          setSelectedAppointment(null);
        }}
      />

      <BottomNavigation currentPath="/calendar" />
    </div>
  );
}
