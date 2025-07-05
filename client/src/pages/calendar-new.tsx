import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  MapPin,
} from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { AppointmentDetailsDialog } from "@/components/appointment-details-dialog";
import { WorkingHoursDialog } from "@/components/working-hours-dialog";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameDay,
} from "date-fns";
import { Link } from "wouter";
import type { AppointmentWithRelations } from "@shared/schema";

// Helper function to generate time slots for calendar view
function generateTimeSlots(appointments: AppointmentWithRelations[], workingHours?: any) {
  const slots = [];
  const sortedAppointments = [...appointments].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  // Determine time range - default to working hours, expand for appointments outside range
  let startHour = 9; // fallback if no working hours
  let endHour = 20;   // fallback if no working hours
  
  // Get working hours for current day
  if (workingHours) {
    const today = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[today];
    const dayHours = workingHours[dayName];
    
    if (dayHours && dayHours.enabled) {
      startHour = parseInt(dayHours.start.split(':')[0]);
      endHour = parseInt(dayHours.end.split(':')[0]);
    }
  }
  
  // Check if any appointments are outside the working hours range
  // Also consider appointment end times for proper calendar expansion
  for (const apt of sortedAppointments) {
    const aptStart = new Date(apt.scheduledAt);
    const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
    
    const aptStartHour = aptStart.getHours();
    const aptEndHour = aptEnd.getHours();
    const aptEndMinutes = aptEnd.getMinutes();
    
    if (aptStartHour < startHour) startHour = aptStartHour;
    // For end hours, include the hour that contains the end time
    if (aptEndHour > endHour || (aptEndHour === endHour && aptEndMinutes > 0)) {
      endHour = aptEndHour;
    }
  }

  // Generate time slots
  for (let hour = startHour; hour <= endHour; hour++) {
    const timeStr =
      hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;

    // Check if there's an appointment that starts at this hour OR overlaps this hour
    const appointment = sortedAppointments.find((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
      
      const aptStartHour = aptStart.getHours();
      const aptEndHour = aptEnd.getHours();
      
      // Appointment spans into this hour if it starts at or before this hour
      // and ends after this hour starts
      return aptStartHour <= hour && hour < aptEndHour;
    });

    // Check if this hour is blocked by working hours
    const isBlocked = workingHours && !isWithinWorkingHours(hour, workingHours);

    slots.push({
      time: timeStr,
      hour: hour,
      appointment: appointment || null,
      isBlocked: isBlocked,
    });
  }

  return slots;
}

// Helper function to check if hour is within working hours
function isWithinWorkingHours(hour: number, workingHours: any): boolean {
  if (!workingHours) return true;
  
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[today];
  
  const dayHours = workingHours[dayName];
  if (!dayHours || !dayHours.enabled) return false;
  
  const startHour = parseInt(dayHours.start.split(':')[0]);
  const endHour = parseInt(dayHours.end.split(':')[0]);
  
  return hour >= startHour && hour <= endHour;
}

// Helper function to get current time position
function getCurrentTimePosition(): { hour: number; minutes: number; shouldShow: boolean } {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  
  // Only show current time line if it's today
  const today = new Date();
  const shouldShow = now.toDateString() === today.toDateString();
  
  return { hour, minutes, shouldShow };
}

// Helper function to get appointment color based on service type
function getAppointmentColor(appointment: AppointmentWithRelations) {
  const serviceName = appointment.service?.name?.toLowerCase() || "";

  // Color scheme based on service type
  if (serviceName.includes("haircut") || serviceName.includes("cut")) {
    return "bg-amber-100 border-l-amber-400"; // Warm amber for haircuts
  } else if (serviceName.includes("beard") || serviceName.includes("trim")) {
    return "bg-emerald-100 border-l-emerald-400"; // Green for beard services
  } else if (serviceName.includes("shave")) {
    return "bg-blue-100 border-l-blue-400"; // Blue for shave services
  } else if (serviceName.includes("wash") || serviceName.includes("styling")) {
    return "bg-purple-100 border-l-purple-400"; // Purple for styling
  } else if (serviceName.includes("color") || serviceName.includes("dye")) {
    return "bg-pink-100 border-l-pink-400"; // Pink for color services
  } else {
    return "bg-gray-100 border-l-gray-400"; // Default gray
  }
}

export default function Calendar() {
  console.log("Calendar-new component rendering...");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

  const startDate = startOfWeek(selectedDate);
  const endDate = endOfWeek(selectedDate);

  // Fetch appointments for the week
  const { data: appointments, isLoading } = useQuery<
    AppointmentWithRelations[]
  >({
    queryKey: [
      "/api/appointments",
      startDate.toISOString(),
      endDate.toISOString(),
    ],
  });

  // Fetch user profile to pass working hours to dialog
  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
  });

  const selectedDateAppointments =
    appointments?.filter(
      (apt) =>
        isSameDay(new Date(apt.scheduledAt), selectedDate) &&
        apt.status === "confirmed",
    ) || [];

  // Get current time position for today indicator
  const currentTime = getCurrentTimePosition();
  const isSelectedDateToday = isToday(selectedDate);

  console.log("Selected date:", format(selectedDate, "yyyy-MM-dd"));
  console.log("Total appointments loaded:", appointments?.length);
  console.log(
    "Appointments for selected date:",
    selectedDateAppointments.length,
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const getAppointmentCount = (date: Date) => {
    return (
      appointments?.filter((apt) => isSameDay(new Date(apt.scheduledAt), date))
        .length || 0
    );
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
            <p className="text-steel text-sm">
              {format(selectedDate, "MMMM yyyy")}
            </p>
          </div>
          <div className="flex space-x-2">
            <WorkingHoursDialog currentHours={userProfile?.workingHours} />
            <Link href="/settings">
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 text-white hover:border-gold/50"
              >
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
            {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
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
                        ? "bg-gold text-charcoal"
                        : isCurrentDay
                          ? "bg-charcoal border border-gold text-white"
                          : "text-steel hover:text-white hover:bg-charcoal"
                    }`}
                  >
                    <div className="text-xs font-medium">
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={`text-lg font-bold ${isSelected ? "text-charcoal" : ""}`}
                    >
                      {format(day, "d")}
                    </div>
                    {appointmentCount > 0 && (
                      <div
                        className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                          isSelected
                            ? "bg-charcoal text-gold"
                            : "bg-gold text-charcoal"
                        }`}
                      >
                        {appointmentCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
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
                {isToday(selectedDate) ? "Today" : "Selected Day"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Appointments */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-gold" />
                {isToday(selectedDate)
                  ? "Today"
                  : format(selectedDate, "EEEE, MMMM d")}
              </CardTitle>
              <Link
                href={`/appointments/new?date=${format(selectedDate, "yyyy-MM-dd")}`}
              >
                <Button size="sm" className="gradient-gold text-charcoal">
                  <Plus className="w-4 h-4 mr-1" />
                  Book
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {selectedDateAppointments.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-steel/50 mx-auto mb-3" />
                <p className="text-steel">
                  No confirmed appointments scheduled
                </p>
                <p className="text-steel/70 text-sm">
                  Tap the Book button to add one
                </p>
              </div>
            ) : (
              <div className="bg-white text-black">
                {/* Calendar Day View - Time-based Layout */}
                <div className="space-y-0">
                  {generateTimeSlots(selectedDateAppointments, userProfile?.workingHours).map(
                    (slot, index) => (
                      <div
                        key={index}
                        className="flex min-h-[60px] border-b border-gray-100 last:border-b-0"
                      >
                        {/* Time label */}
                        <div className="w-20 p-3 text-sm text-gray-500 font-medium bg-gray-50 border-r border-gray-100 flex items-start">
                          {slot.time}
                        </div>
                        {/* Content area */}
                        <div className="flex-1 p-2 relative">
                          {slot.isBlocked ? (
                            <div className="h-full bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-500 text-sm">Blocked</span>
                            </div>
                          ) : slot.appointment ? (
                            (() => {
                              const aptStart = new Date(slot.appointment.scheduledAt);
                              const aptEnd = new Date(aptStart.getTime() + (slot.appointment.duration || 0) * 60 * 1000);
                              const aptStartHour = aptStart.getHours();
                              const aptEndHour = aptEnd.getHours();
                              const aptStartMinutes = aptStart.getMinutes();
                              const aptEndMinutes = aptEnd.getMinutes();
                              
                              // Calculate if this is the primary slot (where appointment starts)
                              const isPrimarySlot = aptStartHour === slot.hour;
                              
                              // Calculate height based on duration
                              const durationInHours = (slot.appointment.duration || 0) / 60;
                              const baseHeight = 52; // base height for 1 hour slot
                              const appointmentHeight = Math.max(baseHeight, baseHeight * durationInHours);
                              
                              // Only show full appointment info in the primary slot
                              if (isPrimarySlot) {
                                return (
                                  <div
                                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${getAppointmentColor(slot.appointment)} border-l-4`}
                                    style={{ 
                                      height: `${appointmentHeight}px`,
                                      zIndex: 10
                                    }}
                                    onClick={() => {
                                      setSelectedAppointment(slot.appointment);
                                      setShowAppointmentDialog(true);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-semibold text-gray-800 mb-1">
                                          {slot.appointment.service?.name || "Service"}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {slot.appointment.client.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {format(aptStart, 'h:mm a')} - {format(aptEnd, 'h:mm a')}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium text-gray-700">
                                          {slot.appointment.duration}m
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          ${slot.appointment.price || "0"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                // For continuation slots, show a lighter version
                                return (
                                  <div
                                    className={`p-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${getAppointmentColor(slot.appointment)} border-l-4 opacity-60`}
                                    onClick={() => {
                                      setSelectedAppointment(slot.appointment);
                                      setShowAppointmentDialog(true);
                                    }}
                                  >
                                    <div className="text-sm text-gray-600">
                                      ... continues
                                    </div>
                                  </div>
                                );
                              }
                            })()
                          ) : null}
                          
                          {/* Current time indicator */}
                          {isSelectedDateToday && currentTime.shouldShow && currentTime.hour === slot.hour && (
                            <div 
                              className="absolute left-0 right-0 border-t-2 border-black z-10 pointer-events-none"
                              style={{
                                top: `${(currentTime.minutes / 60) * 100}%`,
                              }}
                            >
                              <div className="absolute left-0 w-2 h-2 bg-black rounded-full -mt-1"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={showAppointmentDialog}
        onClose={() => {
          console.log("Appointment dialog closed");
          setShowAppointmentDialog(false);
          setSelectedAppointment(null);
        }}
      />

      <BottomNavigation currentPath="/calendar" />
    </div>
  );
}
