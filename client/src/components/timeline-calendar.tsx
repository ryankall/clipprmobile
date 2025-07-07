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
  breakLabel?: string | null; // Label for break time (e.g., "Lunch Break")
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
  timeSlots: TimeSlot[],
  rowHeight: number = 80,
): AppointmentPosition[] {
  const positions: AppointmentPosition[] = [];

  if (timeSlots.length === 0) return positions;

  const startHour = timeSlots[0].hour; // Get the first hour from time slots

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

      // Calculate top position based on time relative to the first time slot
      const firstSlotHour = timeSlots[0]?.hour || 9; // Default to 9 AM if no slots
      const relativeHour = startHour - firstSlotHour;
      const top = relativeHour * rowHeight + (startMinutes * rowHeight) / 60;

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
  workingHours?: any, // Accept full working hours object with day-specific settings
  selectedDate?: Date, // Add selected date for day-specific logic
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const confirmedAppointments = appointments.filter(
    (apt) => apt.status === "confirmed",
  );

  // Get current date or use selected date for day-specific working hours
  const targetDate = selectedDate || new Date();
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = dayNames[dayOfWeek];

  // Dynamic time range expansion logic
  let startHour = 9; // Default start
  let endHour = 20; // Default end (8 PM)
  let dayIsEnabled = true;

  // Check day-specific working hours
  if (workingHours && typeof workingHours === "object") {
    // New format: day-specific working hours
    if (workingHours[dayName]) {
      const dayHours = workingHours[dayName];
      dayIsEnabled = dayHours.enabled || false;

      if (dayIsEnabled && dayHours.start && dayHours.end) {
        startHour = parseInt(dayHours.start.split(":")[0]);
        endHour = parseInt(dayHours.end.split(":")[0]);
      }
    }
    // Legacy format: single working hours object
    else if (workingHours.enabled !== undefined) {
      dayIsEnabled = workingHours.enabled || false;
      if (dayIsEnabled && workingHours.start && workingHours.end) {
        startHour = parseInt(workingHours.start.split(":")[0]);
        endHour = parseInt(workingHours.end.split(":")[0]);
      }
    }
  }

  // If day is disabled (like Sunday), use default range but mark all as blocked
  if (!dayIsEnabled) {
    startHour = 9;
    endHour = 20;
  }

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

    // Expand range but preserve default bounds - allow late appointments to show
    startHour = Math.max(Math.min(startHour, earliestStart), 7); // Don't go earlier than 7 AM
    endHour = Math.max(endHour, latestEnd); // Show all appointments, including late ones
  }

  // Handle midnight crossover appointments (23:00 to 01:00)
  if (confirmedAppointments.length > 0) {
    const midnightCrossover = confirmedAppointments.some((apt) => {
      const start = new Date(apt.scheduledAt);
      const end = addMinutes(start, apt.duration);
      return start.getHours() >= 23 && end.getDate() > start.getDate();
    });

    if (midnightCrossover) {
      endHour = Math.max(endHour, 25); // Extend to 1 AM (hour 25 = 1 AM next day)
    }
  }

  // Generate slots for each hour
  for (let hour = startHour; hour <= endHour; hour++) {
    const displayHour = hour > 24 ? hour - 24 : hour; // Handle 25 (1 AM) -> 1
    const timeStr =
      displayHour === 0
        ? "12 AM"
        : displayHour === 12
          ? "12 PM"
          : displayHour < 12
            ? `${displayHour} AM`
            : `${displayHour - 12} PM`;

    // Check if within working hours - if day is disabled, all hours are blocked
    let isWithinWorkingHours = false;
    let breakLabel = null; // Track break label for this hour

    if (dayIsEnabled && workingHours) {
      if (workingHours[dayName]) {
        // Day-specific working hours
        const dayHours = workingHours[dayName];
        if (dayHours.enabled && dayHours.start && dayHours.end) {
          const workStart = parseInt(dayHours.start.split(":")[0]);
          const workEnd = parseInt(dayHours.end.split(":")[0]);
          isWithinWorkingHours = hour >= workStart && hour <= workEnd;

          // Check if this hour is blocked by break times
          if (
            isWithinWorkingHours &&
            dayHours.breaks &&
            dayHours.breaks.length > 0
          ) {
            for (const breakTime of dayHours.breaks) {
              const breakStart = parseInt(breakTime.start.split(":")[0]);
              const breakEnd = parseInt(breakTime.end.split(":")[0]);
              // If current hour falls within break time, block it and store label
              if (hour >= breakStart && hour < breakEnd) {
                isWithinWorkingHours = false;
                breakLabel = breakTime.label || "Break";
                break;
              }
            }
          }
        }
      } else if (workingHours.enabled) {
        // Legacy single working hours
        const workStart = parseInt(workingHours.start.split(":")[0]);
        const workEnd = parseInt(workingHours.end.split(":")[0]);
        isWithinWorkingHours = hour >= workStart && hour <= workEnd;
      }
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
      breakLabel, // Add break label to slot data
    });
  }

  return slots;
}

// Get appointment color based on service type - using darker backgrounds for better text contrast
function getAppointmentColor(appointment: AppointmentWithRelations): string {
  const serviceName = appointment.service?.name?.toLowerCase() || "";

  if (serviceName.includes("haircut") || serviceName.includes("cut")) {
    return "bg-gradient-to-br from-amber-700 to-amber-800 text-white shadow-amber-300";
  } else if (serviceName.includes("beard") || serviceName.includes("trim")) {
    return "bg-gradient-to-br from-emerald-700 to-emerald-800 text-white shadow-emerald-300";
  } else if (serviceName.includes("shave")) {
    return "bg-gradient-to-br from-blue-700 to-blue-800 text-white shadow-blue-300";
  } else if (serviceName.includes("styling") || serviceName.includes("wash")) {
    return "bg-gradient-to-br from-purple-700 to-purple-800 text-white shadow-purple-300";
  } else if (serviceName.includes("color") || serviceName.includes("dye")) {
    return "bg-gradient-to-br from-pink-700 to-pink-800 text-white shadow-pink-300";
  } else {
    return "bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-gray-300";
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
function getCurrentTimePosition(
  timeSlots: TimeSlot[],
  rowHeight: number = 80,
  selectedDate?: Date,
): {
  top: number;
  shouldShow: boolean;
} {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  // Only show if we're viewing today's date
  const today = new Date();
  const shouldShow = selectedDate
    ? selectedDate.toDateString() === today.toDateString()
    : false;

  // Calculate relative position based on first time slot
  const firstSlotHour = timeSlots.length > 0 ? timeSlots[0].hour : 9;
  const relativeHour = hour - firstSlotHour;
  const top = relativeHour * rowHeight + (minutes * rowHeight) / 60;

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

  const timeSlots = generateTimeSlots(
    dayAppointments,
    workingHours,
    selectedDate,
  );
  const appointmentPositions = calculateAppointmentPositions(
    dayAppointments,
    timeSlots,
    ROW_HEIGHT,
  );
  const currentTimePos = getCurrentTimePosition(
    timeSlots,
    ROW_HEIGHT,
    selectedDate,
  );

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
      <CardContent className="p-1">
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
                  <div className="absolute left-0 top-0 w-16 h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {slot.time}
                    </span>
                  </div>

                  {/* Working hours indicator */}
                  {slot.isBlocked && (
                    <div className="absolute left-16 top-0 right-0 h-full flex items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {slot.breakLabel || "Outside working hours"}
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
                    left: `${68 + pos.left * 3}px`, // 68px for time label + offset
                    width: `${Math.max(pos.width * 3, 180)}px`, // Min width for readability
                    zIndex: pos.zIndex,
                  }}
                  onClick={() => handleAppointmentClick(pos.appointment)}
                >
                  <div className="p-2 h-full flex flex-col justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm leading-tight mb-1 truncate text-white">
                        {getServiceNamesDisplay(pos.appointment)}
                      </div>
                      <div className="text-xs mb-1 truncate text-white/90 font-medium">
                        {pos.appointment.client.name}
                      </div>
                      <div className="text-xs text-white/80 flex items-center space-x-2">
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
                      <div className="mt-1 flex items-center text-xs text-white/70">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
