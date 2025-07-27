import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { globalEventEmitter } from '../../lib/utils';
import { AppointmentWithRelations } from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';




// --- Working hours types (copied from working-hours.tsx) ---
type BreakTime = {
  start: string;
  end: string;
  label: string;
};

type DayHours = {
  start: string;
  end: string;
  enabled: boolean;
  breaks?: BreakTime[];
};

type WorkingHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

const defaultWorkingHours: WorkingHours = {
  monday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  tuesday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  wednesday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  thursday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  friday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  saturday: { start: '10:00', end: '16:00', enabled: true, breaks: [] },
  sunday: { start: '10:00', end: '16:00', enabled: false, breaks: [] },
};

/**
 * Working hours types (copied from working-hours.tsx)
 */

export default function Calendar() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const { isAuthenticated } = useAuth();

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setLoading(true);
    await loadAppointments();
    setLoading(false);
  };

  // --- Working hours state ---
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    }
  }, [isAuthenticated, selectedDate]);

  // Refetch appointments when screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadAppointments();
      }
    }, [isAuthenticated, selectedDate])
  );

  // Fetch working hours on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        setWorkingHoursLoading(true);
        const profile = await apiRequest<any>('GET', '/api/user/profile');
        if (profile && profile.workingHours) {
          setWorkingHours({ ...defaultWorkingHours, ...profile.workingHours });
        } else {
          setWorkingHours(defaultWorkingHours);
        }
      } catch (e) {
        setWorkingHours(defaultWorkingHours);
      } finally {
        setWorkingHoursLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const loadAppointments = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await apiRequest<AppointmentWithRelations[]>('GET', `/api/appointments?date=${dateStr}`);
      setAppointments(data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // Listen for global appointment updates (from dashboard)
  useEffect(() => {
    const handler = () => {
      loadAppointments();
    };
    globalEventEmitter.on('appointmentsUpdated', handler);
    return () => {
      globalEventEmitter.off('appointmentsUpdated', handler);
    };
  }, [selectedDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#22C55E';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  // Get service-based color for appointments (matching web version)
  const getServiceColor = (serviceName?: string): string => {
    if (!serviceName) return '#6B7280'; // gray
    const name = serviceName.toLowerCase();
    
    if (name.includes('haircut') || name.includes('cut')) return '#F59E0B'; // amber
    if (name.includes('beard') || name.includes('trim')) return '#10B981'; // emerald
    if (name.includes('shave')) return '#3B82F6'; // blue
    if (name.includes('styling') || name.includes('wash')) return '#8B5CF6'; // purple
    if (name.includes('color') || name.includes('dye')) return '#EC4899'; // pink
    return '#6B7280'; // gray default
  };

  // --- Overlap grouping and positioning logic adapted from web ---
  // Refactored: Match web's grouping/positioning for overlapping appointments
  function calculateAppointmentPositions(
    appointments: AppointmentWithRelations[],
    startHour: number,
    slotHeight: number,
    timelineWidth: number
  ) {
    // Sort by start time
    const sorted = [...appointments].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    // Group overlapping appointments
    const groups: AppointmentWithRelations[][] = [];
    sorted.forEach((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
      let foundGroup = false;
      for (const group of groups) {
        const hasOverlap = group.some((existing) => {
          const exStart = new Date(existing.scheduledAt);
          const exEnd = new Date(exStart.getTime() + existing.duration * 60000);
          return aptStart < exEnd && aptEnd > exStart;
        });
        if (hasOverlap) {
          group.push(apt);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) groups.push([apt]);
    });
    // Assign positions using percentages (like web)
    const positions: {
      appointment: AppointmentWithRelations;
      top: number;
      height: number;
      left: number;
      width: number;
      zIndex: number;
    }[] = [];
    groups.forEach((group) => {
      const groupLen = group.length;
      const groupWidthPct = 1 / groupLen;
      group.forEach((apt, idx) => {
        const startTime = new Date(apt.scheduledAt);
        const hour = startTime.getHours();
        const min = startTime.getMinutes();
        const top = (hour - startHour) * slotHeight + (min * slotHeight) / 60;
        const height = Math.max((apt.duration * slotHeight) / 60, 40);
        // Use percentage for left/width, but convert to px for RN
        const left = idx * groupWidthPct * timelineWidth;
        const width = Math.max(groupWidthPct * timelineWidth - 8, 60); // min width 60px, gap 8px
        positions.push({
          appointment: apt,
          top,
          height,
          left,
          width,
          zIndex: 10 + idx,
        });
      });
    });
    return positions;
  }

  // Generate timeline view with time indicators
  const renderTimelineView = () => {
    // Filter appointments to only those for the selected date
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledAt);
      return (
        aptDate.toDateString() === selectedDate.toDateString() &&
        apt.status !== 'cancelled'
      );
    });

    const timeSlots = [];
    const startHour = 8;
    const endHour = 22;
    const slotHeight = 80;

    // Get current time for indicator
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentTimePosition = isToday ?
      (currentHour - startHour) * slotHeight + (currentMinutes * slotHeight) / 60 : -1;

    // Generate time slots
    for (let hour = startHour; hour <= endHour; hour++) {
      const timeString = hour === 12 ? '12 PM' :
        hour === 0 ? '12 AM' :
        hour < 12 ? `${hour} AM` : `${hour - 12} PM`;

      // Find appointments for this hour
      const hourAppointments = filteredAppointments.filter(apt => {
        const aptTime = new Date(apt.scheduledAt);
        const aptHour = aptTime.getHours();
        const endTime = new Date(aptTime.getTime() + apt.duration * 60000);
        const endHour = endTime.getHours();

        // Appointment spans this hour if it starts in or continues through this hour
        return aptHour <= hour && (endHour > hour || (endHour === hour && endTime.getMinutes() > 0));
      });

      timeSlots.push({
        hour,
        timeString,
        appointments: hourAppointments,
        isWorkingHour: hour >= 9 && hour <= 18 // Basic working hours
      });
    }

    // --- Calculate positions for all appointments for the day ---
    // Timeline width: screen width - left label (68) - right margin (16)
    const screenWidth = Dimensions.get('window').width;
    const timelineWidth = Math.max(screenWidth - 68 - 16, 60); // fallback min width

    const appointmentPositions = calculateAppointmentPositions(filteredAppointments, startHour, slotHeight, timelineWidth);

    return (
      <ScrollView
        style={styles.timelineContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor="#22C55E"
            colors={['#22C55E']}
          />
        }
      >
        <View style={[styles.timeline, { height: (endHour - startHour + 1) * slotHeight }]}>
          {/* Time slots */}
          {timeSlots.map((slot, index) => (
            <View key={slot.hour} style={[styles.timeSlot, { height: slotHeight }]}>
              {/* Time label */}
              <View style={styles.timeLabel}>
                <Text style={styles.timeLabelText}>{slot.timeString}</Text>
              </View>

              {/* Working hours background */}
              <View style={[
                styles.timeSlotContent,
                { backgroundColor: slot.isWorkingHour ? '#1F2937' : '#111827' }
              ]}>
                {!slot.isWorkingHour && (
                  <Text style={styles.outsideHoursText}>Outside working hours</Text>
                )}

                {/* Half-hour line */}
                <View style={styles.halfHourLine} />
              </View>
            </View>
          ))}

          {/* Appointment blocks (side-by-side for overlaps) */}
          {appointmentPositions.map((pos, idx) => {
            const appointment = pos.appointment;
            const color = getServiceColor(appointment.service?.name);
            // When an appointment is pressed, navigate to details with the correct ID
            return (
              <TouchableOpacity
                key={appointment.id + '-' + idx}
                testID={`appointment-block-${appointment.id}`}
                style={[
                  styles.appointmentBlock,
                  {
                    top: pos.top,
                    height: pos.height,
                    left: 68 + pos.left,
                    width: pos.width,
                    backgroundColor: color + '20',
                    borderLeftColor: color,
                    zIndex: pos.zIndex,
                  }
                ]}
                // Always pass the correct appointment ID in the query param
                onPress={() => router.push(`/appointment-details?id=${appointment.id}`)}
              >
                <Text style={[styles.appointmentTitle, { color }]} numberOfLines={1}>
                  {appointment.service?.name || 'Service'}
                </Text>
                <Text style={styles.appointmentClient} numberOfLines={1}>
                  {appointment.client?.name}
                </Text>
                <View style={styles.appointmentMeta}>
                  <Text style={styles.appointmentDuration}>{appointment.duration}m</Text>
                  <Text style={styles.appointmentPrice}>${appointment.price}</Text>
                  {appointment.travelRequired && (
                    <Ionicons name="car" size={12} color={color} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Current time indicator */}
          {isToday && currentTimePosition >= 0 && (
            <View style={[styles.currentTimeIndicator, { top: currentTimePosition }]}>
              <View style={styles.currentTimeCircle} />
              <View style={styles.currentTimeLine} />
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderAppointment = (appointment: AppointmentWithRelations) => {
    const startTime = new Date(appointment.scheduledAt);
    const endTime = new Date(startTime.getTime() + appointment.duration * 60000);
    
    return (
      // When an appointment is pressed, navigate to details with the correct ID
      <TouchableOpacity
        key={appointment.id}
        testID={`appointment-card-${appointment.id}`}
        style={styles.appointmentCard}
        // Always pass the correct appointment ID in the query param
        onPress={() => router.push(`/appointment-details?id=${appointment.id}`)}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentTime}>
            <Text style={styles.timeText}>
              {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              {' - '}
              {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.clientName}>{appointment.client?.name}</Text>
        <Text style={styles.serviceName}>{appointment.service?.name}</Text>
        
        <View style={styles.appointmentFooter}>
          <Text style={styles.price}>${appointment.price}</Text>
          {appointment.travelRequired && (
            <View style={styles.travelBadge}>
              <Ionicons name="car" size={12} color="#3B82F6" />
              <Text style={styles.travelText}>Travel</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const generateDateButtons = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = -3; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authPromptText}>Please sign in to access your calendar</Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.headerActions}>
          
          <TouchableOpacity
            style={styles.hoursButton}
            testID="working-hours-btn"
            onPress={() => router.push('/working-hours')}
          >
            <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
            <Text style={styles.hoursButtonText}>Hours</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            testID="add-appointment-btn"
            onPress={() => router.push('/appointments/new')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollView}>
          {generateDateButtons().map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateButton,
                  isSelected && styles.selectedDateButton,
                  isToday && styles.todayDateButton
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText
                ]}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[
                  styles.dateText,
                  isSelected && styles.selectedDateText
                ]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.viewModeSelector}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'timeline' && styles.activeViewMode]}
              onPress={() => setViewMode('timeline')}
            >
              <Ionicons name="time-outline" size={16} color={viewMode === 'timeline' ? '#F59E0B' : '#9CA3AF'} />
              <Text style={[styles.viewModeText, viewMode === 'timeline' && styles.activeViewModeText]}>Timeline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#F59E0B' : '#9CA3AF'} />
              <Text style={[styles.viewModeText, viewMode === 'list' && styles.activeViewModeText]}>List</Text>
            </TouchableOpacity>
      </View>
      {/* Content based on view mode */}
      {viewMode === 'timeline' ? (
        renderTimelineView()
      ) : (
        <ScrollView
          style={styles.appointmentsList}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor="#22C55E"
              colors={['#22C55E']}
            />
          }
        >
          <Text style={styles.sectionTitle}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          
          {/* Only show appointments for the selected date */}
          {appointments.filter(apt => {
            const aptDate = new Date(apt.scheduledAt);
            return (
              aptDate.toDateString() === selectedDate.toDateString() &&
              apt.status !== 'cancelled'
            );
          }).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No appointments</Text>
              <Text style={styles.emptySubtext}>
                You have no appointments scheduled for this day
              </Text>
            </View>
          ) : (
            appointments
              .filter(apt => {
                const aptDate = new Date(apt.scheduledAt);
                return (
                  aptDate.toDateString() === selectedDate.toDateString() &&
                  apt.status !== 'cancelled'
                );
              })
              .map(renderAppointment)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    marginRight: 0,
    gap: 4,
  },
  hoursButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewModeSelector: {
    flexDirection: 'row',
    alignItems: "stretch",
    backgroundColor: '#0F0F0F',
    borderRadius: 8,
    padding: 10,
    paddingBottom: 10,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  activeViewMode: {
    backgroundColor: '#F59E0B',
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeViewModeText: {
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#22C55E',
    borderRadius: 20,
    padding: 10,
  },
  dateSelector: {
    paddingVertical: 16,
  },
  dateScrollView: {
    paddingHorizontal: 16,
  },
  dateButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    minWidth: 60,
  },
  selectedDateButton: {
    backgroundColor: '#22C55E',
  },
  todayDateButton: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  dayText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  selectedDateText: {
    color: '#FFFFFF',
  },
  appointmentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appointmentTime: {},
  timeText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  appointmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  travelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F620',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  travelText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authPromptText: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Timeline view styles
  timelineContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  timeline: {
    position: 'relative',
    minHeight: 1200,
  },
  timeSlot: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  timeLabel: {
    width: 64,
    height: 80,
    backgroundColor: '#1F2937',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  timeSlotContent: {
    flex: 1,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outsideHoursText: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  halfHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 40,
    height: 1,
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  appointmentBlock: {
    position: 'absolute',
    // left and width will be set dynamically for overlap logic
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 60,
    maxWidth: 240,
  },
  appointmentTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  appointmentClient: {
    fontSize: 10,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentDuration: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  appointmentPrice: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 50,
  },
  currentTimeCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginLeft: 4,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#EF4444',
  },
});