import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
import { WorkingHoursDialog } from "@/components/working-hours-dialog";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "wouter";
import type { AppointmentWithRelations } from "@shared/schema";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  
  const startDate = startOfWeek(selectedDate);
  const endDate = endOfWeek(selectedDate);

  const { data: appointments, isLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments", startDate.toISOString(), endDate.toISOString()],
  });

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
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">Calendar</h1>
          </div>
          <div className="flex items-center space-x-2">
            <WorkingHoursDialog currentHours={userProfile?.workingHours} />
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
                    onClick={() => setSelectedDate(day)}
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

        {/* Selected Date Appointments */}
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
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : selectedDateAppointments.length > 0 ? (
              selectedDateAppointments
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map((appointment) => {
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
                })
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
