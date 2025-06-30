import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Settings, MapPin } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
import { WorkingHoursDialog } from "@/components/working-hours-dialog";
import { format, addDays, subDays, startOfWeek, endOfWeek, isToday, isSameDay } from "date-fns";
import { Link } from "wouter";
import type { AppointmentWithRelations } from "@shared/schema";

export default function Calendar() {
  console.log('Calendar-new component rendering...');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  
  const startDate = startOfWeek(selectedDate);
  const endDate = endOfWeek(selectedDate);

  // Fetch appointments for the week
  const { data: appointments, isLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments", startDate.toISOString(), endDate.toISOString()],
  });

  // Fetch user profile to pass working hours to dialog
  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
  });

  const selectedDateAppointments = appointments?.filter(apt => 
    isSameDay(new Date(apt.scheduledAt), selectedDate)
  ) || [];

  console.log('Selected date:', format(selectedDate, 'yyyy-MM-dd'));
  console.log('Total appointments loaded:', appointments?.length);
  console.log('Appointments for selected date:', selectedDateAppointments.length);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  const getAppointmentCount = (date: Date) => {
    return appointments?.filter(apt => isSameDay(new Date(apt.scheduledAt), date)).length || 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-40 border-b border-steel/20">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-bold text-white">Calendar</h1>
            <p className="text-steel text-sm">{format(selectedDate, 'MMMM yyyy')}</p>
          </div>
          <div className="flex space-x-2">
            <WorkingHoursDialog currentHours={userProfile?.workingHours} />
            <Link href="/settings">
              <Button variant="outline" className="bg-charcoal border-steel/40 text-white hover:border-gold/50">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(subDays(selectedDate, 7))}
            className="text-steel hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-white font-medium">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="text-steel hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Week View */}
        <Card className="bg-dark-card border-steel/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const appointmentCount = getAppointmentCount(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`p-2 rounded-lg text-center transition-colors relative ${
                      isSelected
                        ? 'bg-gold text-charcoal'
                        : isCurrentDay
                        ? 'bg-charcoal border border-gold text-white'
                        : 'text-steel hover:text-white hover:bg-charcoal'
                    }`}
                  >
                    <div className="text-xs font-medium">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-lg font-bold ${isSelected ? 'text-charcoal' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    {appointmentCount > 0 && (
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                        isSelected ? 'bg-charcoal text-gold' : 'bg-gold text-charcoal'
                      }`}>
                        {appointmentCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Appointments */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-gold" />
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
              </CardTitle>
              <Link 
                href={`/appointments/new?date=${format(selectedDate, 'yyyy-MM-dd')}`}
              >
                <Button size="sm" className="gradient-gold text-charcoal">
                  <Plus className="w-4 h-4 mr-1" />
                  Book
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDateAppointments.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-steel/50 mx-auto mb-3" />
                <p className="text-steel">No appointments scheduled</p>
                <p className="text-steel/70 text-sm">Tap the Book button to add one</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments.map((appointment) => {
                  console.log('Rendering appointment:', appointment.client.name, 'ID:', appointment.id);
                  return (
                    <AppointmentCard 
                      key={appointment.id} 
                      appointment={appointment}
                      showClickable={true}
                      onClick={() => {
                        console.log('Appointment clicked:', appointment.client.name);
                        setSelectedAppointment(appointment);
                        setShowAppointmentDialog(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {appointments?.length || 0}
              </div>
              <div className="text-steel text-sm">This Week</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {selectedDateAppointments.length}
              </div>
              <div className="text-steel text-sm">
                {isToday(selectedDate) ? 'Today' : 'Selected Day'}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={showAppointmentDialog}
        onClose={() => {
          console.log('Appointment dialog closed');
          setShowAppointmentDialog(false);
          setSelectedAppointment(null);
        }}
      />

      <BottomNavigation currentPath="/calendar" />
    </div>
  );
}