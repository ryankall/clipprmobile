import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { AppointmentWithRelations } from '../../lib/types';


export default function Calendar() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    }
  }, [isAuthenticated, selectedDate]);

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

  // Generate timeline view with time indicators
  const renderTimelineView = () => {
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
      const hourAppointments = appointments.filter(apt => {
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
    
    return (
      <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
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
          
          {/* Appointment blocks */}
          {appointments.map((appointment) => {
            const startTime = new Date(appointment.scheduledAt);
            const startHour = startTime.getHours();
            const startMinutes = startTime.getMinutes();
            const duration = appointment.duration;
            
            // Calculate position
            const topPosition = (startHour - 8) * slotHeight + (startMinutes * slotHeight) / 60;
            const height = Math.max((duration * slotHeight) / 60, 40);
            const color = getServiceColor(appointment.service?.name);
            
            return (
              <TouchableOpacity
                key={appointment.id}
                style={[
                  styles.appointmentBlock,
                  {
                    top: topPosition,
                    height: height,
                    backgroundColor: color + '20',
                    borderLeftColor: color,
                  }
                ]}
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
      <TouchableOpacity
        key={appointment.id}
        style={styles.appointmentCard}
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
          <TouchableOpacity 
            style={styles.addButton}
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

      {/* Content based on view mode */}
      {viewMode === 'timeline' ? (
        renderTimelineView()
      ) : (
        <ScrollView style={styles.appointmentsList}>
          <Text style={styles.sectionTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No appointments</Text>
              <Text style={styles.emptySubtext}>
                You have no appointments scheduled for this day
              </Text>
            </View>
          ) : (
            appointments.map(renderAppointment)
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
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 2,
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
    left: 68,
    right: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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