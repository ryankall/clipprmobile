import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { DashboardStats, AppointmentWithRelations, User } from '../../lib/types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithRelations[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      const [statsData, appointmentsData, messagesData] = await Promise.all([
        apiRequest<DashboardStats>('GET', '/api/dashboard'),
        apiRequest<AppointmentWithRelations[]>('GET', '/api/appointments/today'),
        apiRequest<{ count: number }>('GET', '/api/messages/unread-count'),
      ]);

      setStats(statsData);
      setTodayAppointments(appointmentsData);
      setUnreadMessages(messagesData.count);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      label: 'New Appointment', 
      icon: 'add-circle', 
      color: '#22C55E', 
      onPress: () => router.push('/appointment-new')
    },
    { 
      label: 'View Calendar', 
      icon: 'calendar-outline', 
      color: '#3B82F6', 
      onPress: () => router.push('/(tabs)/calendar')
    },
    { 
      label: 'Client List', 
      icon: 'people-outline', 
      color: '#F59E0B', 
      onPress: () => router.push('/(tabs)/clients')
    },
    { 
      label: 'Messages', 
      icon: 'chatbubbles-outline', 
      color: '#8B5CF6', 
      onPress: () => router.push('/messages')
    },
  ];

  const currentTime = new Date();
  const currentAppointment = todayAppointments.find(apt => {
    const aptTime = new Date(apt.scheduledAt);
    const timeDiff = (aptTime.getTime() - currentTime.getTime()) / (1000 * 60);
    return timeDiff >= -10 && timeDiff <= 30; // Current if within 10 min past or 30 min future
  });

  const nextAppointment = todayAppointments.find(apt => {
    const aptTime = new Date(apt.scheduledAt);
    return aptTime.getTime() > currentTime.getTime() && apt !== currentAppointment;
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authPromptText}>Please sign in to access your dashboard</Text>
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.firstName || 'Barber'}!
          </Text>
          <Text style={styles.subGreeting}>
            Here's your business overview for today
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                ${stats?.dailyEarnings || '0.00'}
              </Text>
              <Text style={styles.statLabel}>Today's Earnings</Text>
            </View>
            <Ionicons name="cash" size={24} color="#22C55E" />
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {stats?.appointmentCount || 0}
              </Text>
              <Text style={styles.statLabel}>Appointments</Text>
            </View>
            <Ionicons name="calendar" size={24} color="#3B82F6" />
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {stats?.clientCount || 0}
              </Text>
              <Text style={styles.statLabel}>Total Clients</Text>
            </View>
            <Ionicons name="people" size={24} color="#F59E0B" />
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {unreadMessages}
              </Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <Ionicons name="chatbubbles" size={24} color="#8B5CF6" />
          </View>
        </View>

        {/* Current/Next Appointment */}
        {(currentAppointment || nextAppointment) && (
          <View style={styles.appointmentSection}>
            <Text style={styles.sectionTitle}>
              {currentAppointment ? 'Current Appointment' : 'Next Appointment'}
            </Text>
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentClient}>
                  {(currentAppointment || nextAppointment)?.client?.name}
                </Text>
                <Text style={styles.appointmentTime}>
                  {new Date((currentAppointment || nextAppointment)?.scheduledAt || '').toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </View>
              <Text style={styles.appointmentService}>
                {(currentAppointment || nextAppointment)?.service?.name}
              </Text>
              <Text style={styles.appointmentPrice}>
                ${(currentAppointment || nextAppointment)?.price}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionCard}
                onPress={action.onPress}
              >
                <View style={styles.quickActionContent}>
                  <Ionicons 
                    name={action.icon as any} 
                    size={32} 
                    color={action.color} 
                  />
                  <Text style={styles.quickActionLabel}>
                    {action.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Appointments */}
        {todayAppointments.length > 0 && (
          <View style={styles.appointmentsSection}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
            {todayAppointments.map((appointment, index) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentListItem}
                onPress={() => {
                  // Navigate to appointment details
                }}
              >
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentClientName}>
                    {appointment.client?.name}
                  </Text>
                  <Text style={styles.appointmentDetails}>
                    {appointment.service?.name} • ${appointment.price}
                  </Text>
                </View>
                <Text style={styles.appointmentTimeSmall}>
                  {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Match web version dark background
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#2A2A2A', // Match web version card background
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '47%',
    flex: 1,
    borderWidth: 1,
    borderColor: '#374151', // Add subtle border
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  appointmentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  appointmentCard: {
    backgroundColor: '#2A2A2A', // Match web version card background
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151', // Add subtle border
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentClient: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appointmentTime: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '500',
  },
  appointmentService: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  appointmentPrice: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '600',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#2A2A2A', // Match web version card background
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151', // Add subtle border
    minWidth: '47%',
    flex: 1,
  },
  quickActionContent: {
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  appointmentsSection: {
    marginBottom: 24,
  },
  appointmentListItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentClientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appointmentDetails: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  appointmentTimeSmall: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
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
});