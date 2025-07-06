import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addMinutes } from "date-fns";
import {
  Clock,
  ChevronUp,
  ChevronDown,
  MapPin,
  Phone,
  DollarSign,
} from "lucide-react";
import type { AppointmentWithRelations } from "@shared/schema";

interface TimelineCalendarProps {
  appointments: AppointmentWithRelations[];
  selectedDate: Date;
  workingHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  onAppointmentClick: (appointment: AppointmentWithRelations) => void;
}

interface TimeSlot {
  hour: number;
  time: string;
  appointments: AppointmentWithRelations[];
  isBlocked: boolean;
  isWithinWorkingHours: boolean;
}

interface AppointmentPosition {
  appointment: AppointmentWithRelations;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

// Calculate position for appointments within time slots
function calculateAppointmentPositions(
  appointments: AppointmentWithRelations[],
  rowHeight: number = 80,
): AppointmentPosition[] {
  const positions: AppointmentPosition[] = [];

  // Group appointments by overlapping time periods
  const groups: AppointmentWithRelations[][] = [];

  appointments.forEach((appointment) => {
    const startTime = new Date(appointment.scheduledAt);
    const endTime = addMinutes(startTime, appointment.duration);

    // Find existing group that overlaps with this appointment
    let foundGroup = false;
    for (let group of groups) {
      const hasOverlap = group.some((existing) => {
        const existingStart = new Date(existing.scheduledAt);
        const existingEnd = addMinutes(existingStart, existing.duration);

        // Check if times overlap
        return startTime < existingEnd && endTime > existingStart;
      });

      if (hasOverlap) {
        group.push(appointment);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push([appointment]);
    }
  });

  // Calculate positions for each group
  groups.forEach((group) => {
    const groupWidth = 100 / group.length;

    group.forEach((appointment, index) => {
      const startTime = new Date(appointment.scheduledAt);
      const startHour = startTime.getHours();
      const startMinutes = startTime.getMinutes();

      // Calculate top position based on time
      const top = startHour * rowHeight + (startMinutes * rowHeight) / 60;

      // Calculate height based on duration
      const height = (appointment.duration * rowHeight) / 60;

      // Calculate left position for overlapping appointments
      const left = index * groupWidth;
      const width = groupWidth - 1; // Small gap between overlapping appointments

      positions.push({
        appointment,
        top,
        height,
        left,
        width,
        zIndex: 10 + index,
      });
    });
  });

  return positions;
}

// Generate time slots with robust calendar logic from tests
function generateTimeSlots(
  appointments: AppointmentWithRelations[],
  workingHours?: { enabled: boolean; start: string; end: string },
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const confirmedAppointments = appointments.filter(
    (apt) => apt.status === "confirmed",
  );

  // Dynamic time range expansion logic
  let startHour = 9; // Default start
  let endHour = 20; // Default end (8 PM)

  // Expand range to include all appointments
  if (confirmedAppointments.length > 0) {
    const appointmentHours = confirmedAppointments.map((apt) => {
      const start = new Date(apt.scheduledAt);
      const end = addMinutes(start, apt.duration);
      return {
        startHour: start.getHours(),
        endHour: end.getHours() + (end.getMinutes() > 0 ? 1 : 0),
      };
    });

    const earliestStart = Math.min(...appointmentHours.map((h) => h.startHour));
    const latestEnd = Math.max(...appointmentHours.map((h) => h.endHour));

    // Expand range but preserve default bounds - limit expansion to avoid too many empty slots
    startHour = Math.max(Math.min(startHour, earliestStart), 7); // Don't go earlier than 7 AM
    endHour = Math.min(Math.max(endHour, latestEnd), 20); // Don't go later than 8 PM
  }

  // Generate slots for each hour
  for (let hour = startHour; hour <= endHour; hour++) {
    const timeStr =
      hour === 0
        ? "12 AM"
        : hour === 12
          ? "12 PM"
          : hour < 12
            ? `${hour} AM`
            : `${hour - 12} PM`;

    // Check if within working hours
    let isWithinWorkingHours = true;
    if (workingHours?.enabled) {
      const workStart = parseInt(workingHours.start.split(":")[0]);
      const workEnd = parseInt(workingHours.end.split(":")[0]);
      isWithinWorkingHours = hour >= workStart && hour <= workEnd;
    }

    // Find appointments for this hour
    const hourAppointments = confirmedAppointments.filter((apt) => {
      const startTime = new Date(apt.scheduledAt);
      const endTime = addMinutes(startTime, apt.duration);
      const startHour = startTime.getHours();
      const endHour = endTime.getHours();

      // Appointment spans this hour if it starts in this hour or continues into it
      return (
        startHour <= hour &&
        (endHour > hour || (endHour === hour && endTime.getMinutes() > 0))
      );
    });

    slots.push({
      hour,
      time: timeStr,
      appointments: hourAppointments,
      isBlocked: !isWithinWorkingHours,
      isWithinWorkingHours,
    });
  }

  return slots;
}

// Get appointment color based on service type
function getAppointmentColor(appointment: AppointmentWithRelations): string {
  const serviceName = appointment.service?.name?.toLowerCase() || "";

  if (serviceName.includes("haircut") || serviceName.includes("cut")) {
    return "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-200";
  } else if (serviceName.includes("beard") || serviceName.includes("trim")) {
    return "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-200";
  } else if (serviceName.includes("shave")) {
    return "bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-blue-200";
  } else if (serviceName.includes("styling") || serviceName.includes("wash")) {
    return "bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-purple-200";
  } else if (serviceName.includes("color") || serviceName.includes("dye")) {
    return "bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-pink-200";
  } else {
    return "bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-gray-200";
  }
}

// Get service names display with proper truncation
function getServiceNamesDisplay(appointment: AppointmentWithRelations): string {
  const serviceName = appointment.service?.name;
  if (!serviceName) return "Service";

  // If service name is too long, truncate it
  return serviceName.length > 20
    ? serviceName.slice(0, 20) + "..."
    : serviceName;
}

// Current time indicator
function getCurrentTimePosition(rowHeight: number = 80): {
  top: number;
  shouldShow: boolean;
} {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  // Only show if it's today
  const today = new Date();
  const shouldShow = now.toDateString() === today.toDateString();

  // Calculate position from start of day
  const top = hour * rowHeight + (minutes * rowHeight) / 60;

  return { top, shouldShow };
}

export function TimelineCalendar({
  appointments,
  selectedDate,
  workingHours,
  onAppointmentClick,
}: TimelineCalendarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 80;

  // Filter appointments for selected date
  const dayAppointments = appointments.filter((apt) => {
    const aptDate = format(new Date(apt.scheduledAt), "yyyy-MM-dd");
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    return aptDate === selectedDateStr;
  });

  const timeSlots = generateTimeSlots(dayAppointments, workingHours);
  const appointmentPositions = calculateAppointmentPositions(
    dayAppointments,
    ROW_HEIGHT,
  );
  const currentTimePos = getCurrentTimePosition(ROW_HEIGHT);

  // Scroll to current time on mount
  useEffect(() => {
    if (currentTimePos.shouldShow && containerRef.current) {
      const scrollTop = Math.max(0, currentTimePos.top - 200);
      containerRef.current.scrollTop = scrollTop;
    }
  }, [currentTimePos]);

  // Handle appointment click
  const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
    onAppointmentClick(appointment);
  };

  return (
    <Card className="bg-dark-card border-steel/20 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b border-steel/20">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gold" />
            <h3 className="text-lg font-semibold text-white">
              {format(selectedDate, "EEEE, MMMM d")}
            </h3>
            {dayAppointments.length > 0 && (
              <span className="text-sm text-steel">
                ({dayAppointments.length} appointment
                {dayAppointments.length !== 1 ? "s" : ""})
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-steel hover:text-white"
          >
            {collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
        </div>

        {!collapsed && (
          <div
            ref={containerRef}
            className="relative overflow-y-auto max-h-[600px] bg-gray-50 dark:bg-gray-900"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Time grid */}
            <div className="relative">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.hour}
                  data-testid={`hour-${slot.hour}`}
                  className={`
                    relative min-h-[80px] border-b border-gray-200 dark:border-gray-700 last:border-b-0
                    ${slot.isBlocked ? "timeline-blocked-hours bg-gray-100 dark:bg-gray-800" : "timeline-working-hours bg-white dark:bg-gray-900"}
                    ${!slot.isWithinWorkingHours ? "opacity-50" : ""}
                  `}
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  {/* Time label */}
                  <div className="absolute left-0 top-0 w-16 h-full flex items-start justify-center pt-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {slot.time}
                    </span>
                  </div>

                  {/* Working hours indicator */}
                  {slot.isBlocked && (
                    <div className="absolute left-16 top-0 right-0 h-full flex items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Outside working hours
                      </span>
                    </div>
                  )}

                  {/* Half-hour line */}
                  <div className="absolute left-16 top-10 right-0 h-px timeline-hour-line" />
                </div>
              ))}

              {/* Appointment blocks */}
              {appointmentPositions.map((pos, index) => (
                <div
                  key={`${pos.appointment.id}-${index}`}
                  data-testid="appointment-card"
                  className={`
                    timeline-appointment absolute left-16 cursor-pointer
                    rounded-lg shadow-md border border-white/20
                    ${getAppointmentColor(pos.appointment)}
                  `}
                  style={{
                    top: `${pos.top}px`,
                    height: `${Math.max(pos.height, 40)}px`,
                    left: `${64 + pos.left * 3}px`, // 64px for time label + offset
                    width: `${Math.max(pos.width * 3, 200)}px`, // Min width for readability
                    zIndex: pos.zIndex,
                  }}
                  onClick={() => handleAppointmentClick(pos.appointment)}
                >
                  <div className="p-3 h-full flex flex-col justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-tight mb-1 truncate">
                        {getServiceNamesDisplay(pos.appointment)}
                      </div>
                      <div className="text-xs opacity-90 mb-1 truncate">
                        {pos.appointment.client.name}
                      </div>
                      <div className="text-xs opacity-75 flex items-center space-x-2">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {pos.appointment.duration}m
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {pos.appointment.price}
                        </span>
                      </div>
                    </div>

                    {/* Travel indicator */}
                    {pos.appointment.address && (
                      <div className="mt-2 flex items-center text-xs opacity-75">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate">Travel</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Current time indicator */}
              {currentTimePos.shouldShow && (
                <div
                  className="timeline-current-time absolute left-0 right-0 z-50 pointer-events-none"
                  style={{ top: `${currentTimePos.top}px` }}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-6 bg-red-500 rounded-r-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Empty state */}
            {dayAppointments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                <div className="text-center text-gray-500 p-8">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    No appointments scheduled
                  </p>
                  <p className="text-sm">This day is free for new bookings</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
