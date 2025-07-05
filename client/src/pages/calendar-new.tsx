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

// Helper function to generate timeline structure for day view
function generateTimelineStructure(appointments: AppointmentWithRelations[], workingHours?: any) {
  const HOUR_HEIGHT = 80; // Base height for each hour in pixels
  
  // Determine time range - default to working hours, expand for appointments outside range
  let startHour = 8; // Start earlier for better coverage
  let endHour = 22;   // End later for better coverage
  
  // Get working hours for current day
  if (workingHours) {
    const today = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[today];
    const dayHours = workingHours[dayName];
    
    if (dayHours && dayHours.enabled) {
      startHour = Math.max(6, parseInt(dayHours.start.split(':')[0]) - 1); // Start 1 hour earlier
      endHour = Math.min(23, parseInt(dayHours.end.split(':')[0]) + 1); // End 1 hour later
    }
  }

  // Expand time range for appointments outside working hours
  appointments.forEach((appointment) => {
    const startTime = new Date(appointment.scheduledAt);
    const duration = appointment.duration || 60;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    const startHourTime = startTime.getHours();
    const endHourTime = endTime.getHours();
    
    if (startHourTime < startHour) {
      startHour = Math.max(0, startHourTime);
    }
    if (endHourTime > endHour) {
      endHour = Math.min(23, endHourTime);
    }
  });

  // Process appointments to calculate positions
  const processedAppointments = appointments.map(apt => {
    const appointmentStart = new Date(apt.scheduledAt);
    const duration = apt.duration || 60;
    const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60 * 1000);
    
    // Calculate position from the very start of the timeline
    const timelineStart = new Date();
    timelineStart.setHours(startHour, 0, 0, 0);
    
    const minutesFromStart = (appointmentStart.getTime() - timelineStart.getTime()) / (1000 * 60);
    const topOffset = (minutesFromStart / 60) * HOUR_HEIGHT;
    const height = Math.max(30, (duration / 60) * HOUR_HEIGHT);
    
    return {
      ...apt,
      topOffset,
      height,
      startHour: appointmentStart.getHours(),
      endHour: appointmentEnd.getHours(),
      zIndex: 1,
      leftOffset: 0,
      width: 100
    };
  });

  // Generate hour blocks
  const hourBlocks = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    // Check if this hour is within working hours
    const isWithinHours = workingHours && isWithinWorkingHours(hour, workingHours);

    hourBlocks.push({
      hour,
      timeLabel: format(new Date().setHours(hour, 0, 0, 0), 'h a'),
      height: HOUR_HEIGHT,
      isCurrentHour: new Date().getHours() === hour,
      isWithinWorkingHours: isWithinHours,
    });
  }

  return { hourBlocks, processedAppointments };
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

// Helper function to get appointment color based on service type and status
function getAppointmentColor(appointment: AppointmentWithRelations) {
  const serviceName = appointment.service?.name?.toLowerCase() || "";
  const status = appointment.status;

  // Base color based on service type
  let baseColor = "";
  if (serviceName.includes("haircut") || serviceName.includes("cut")) {
    baseColor = "amber"; // Warm amber for haircuts
  } else if (serviceName.includes("beard") || serviceName.includes("trim")) {
    baseColor = "emerald"; // Green for beard services
  } else if (serviceName.includes("shave")) {
    baseColor = "blue"; // Blue for shave services
  } else if (serviceName.includes("wash") || serviceName.includes("styling")) {
    baseColor = "purple"; // Purple for styling
  } else if (serviceName.includes("color") || serviceName.includes("dye")) {
    baseColor = "pink"; // Pink for color services
  } else {
    baseColor = "gray"; // Default gray
  }

  // Adjust opacity and styling based on status
  switch (status) {
    case "confirmed":
      return `bg-${baseColor}-100 border-l-${baseColor}-400`;
    case "pending":
      return `bg-${baseColor}-50 border-l-${baseColor}-300 opacity-75`;
    case "expired":
      return `bg-${baseColor}-50 border-l-${baseColor}-300 opacity-60`;
    case "cancelled":
      return `bg-gray-100 border-l-gray-300 opacity-50`;
    default:
      return `bg-${baseColor}-100 border-l-${baseColor}-400`;
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
        isSameDay(new Date(apt.scheduledAt), selectedDate)
    ) || [];

  // Get current time position for today indicator
  const currentTime = getCurrentTimePosition();
  const isSelectedDateToday = isToday(selectedDate);

  console.log("Selected date:", format(selectedDate, "yyyy-MM-dd"));
  console.log("Total appointments loaded:", appointments?.length);
  console.log("Appointments for selected date:", selectedDateAppointments.length);
  
  // Detailed logging for appointments
  if (selectedDateAppointments.length > 0) {
    console.log("📅 DETAILED APPOINTMENT ANALYSIS:");
    selectedDateAppointments.forEach((apt, index) => {
      const start = new Date(apt.scheduledAt);
      const end = new Date(start.getTime() + (apt.duration || 0) * 60 * 1000);
      console.log(`${index + 1}. ${apt.client.name} - ${apt.service?.name}`);
      console.log(`   Status: ${apt.status}`);
      console.log(`   Time: ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`);
      console.log(`   Duration: ${apt.duration} minutes`);
      console.log(`   Start Hour: ${start.getHours()}, End Hour: ${end.getHours()}`);
      console.log("---");
    });
  }

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
            <WorkingHoursDialog currentHours={(userProfile as any)?.workingHours || {}} />
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
                {/* Timeline Day View - Hourly Column Layout */}
                <div className="relative">
                  {(() => {
                    const timelineData = generateTimelineStructure(selectedDateAppointments, (userProfile as any)?.workingHours || {});
                    const { hourBlocks, processedAppointments } = timelineData;
                    
                    return (
                      <>
                        {/* Hour blocks */}
                        {hourBlocks.map((hourBlock) => (
                          <div
                            key={hourBlock.hour}
                            data-testid={`hour-${hourBlock.hour}`}
                            className="flex border-b border-gray-100 last:border-b-0 relative"
                            style={{ minHeight: `${hourBlock.height}px` }}
                          >
                            {/* Time label */}
                            <div className={`w-20 p-3 text-sm font-medium border-r border-gray-100 flex items-start ${
                              hourBlock.isCurrentHour ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'
                            }`}>
                              {hourBlock.timeLabel}
                            </div>
                            
                            {/* Content area */}
                            <div className="flex-1 relative" style={{ minHeight: `${hourBlock.height}px` }}>
                              {!hourBlock.isWithinWorkingHours ? (
                                <div className="absolute inset-0 bg-gray-100 opacity-30 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">Outside working hours</span>
                                </div>
                              ) : null}
                              
                              {/* Current time indicator */}
                              {isSelectedDateToday && currentTime.shouldShow && currentTime.hour === hourBlock.hour && (
                                <div 
                                  className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                                  style={{
                                    top: `${(currentTime.minutes / 60) * hourBlock.height}px`,
                                  }}
                                >
                                  <div className="absolute left-0 w-3 h-3 bg-red-500 rounded-full -mt-1.5 -ml-1.5"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Floating appointment cards positioned absolutely */}
                        {processedAppointments.map((appointment: any, aptIndex: number) => {
                          const aptStart = new Date(appointment.scheduledAt);
                          const aptEnd = new Date(aptStart.getTime() + (appointment.duration || 60) * 60 * 1000);
                          
                          return (
                            <div
                              key={`${appointment.id}-floating`}
                              data-testid="appointment-card"
                              className={`absolute rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg ${getAppointmentColor(appointment)} border-l-4 mx-1`}
                              style={{ 
                                top: `${appointment.topOffset}px`,
                                height: `${appointment.height}px`,
                                left: `84px`, // Start after time column (80px + 4px margin)
                                right: `8px`,
                                zIndex: 5 // Lower z-index to stay below navigation bar
                              }}
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowAppointmentDialog(true);
                              }}
                            >
                              <div className="p-3 h-full overflow-hidden">
                                <div className="font-semibold text-gray-800 text-sm truncate">
                                  {appointment.service?.name || "Service"}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {appointment.client.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {format(aptStart, 'h:mm a')} - {format(aptEnd, 'h:mm a')}
                                </div>
                                {appointment.status && (
                                  <Badge
                                    variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                                    className={`text-xs px-1 py-0 h-4 mt-1 ${
                                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      appointment.status === 'expired' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {appointment.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
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
