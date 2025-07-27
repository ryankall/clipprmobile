import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, API_BASE_URL } from '../../lib/api';
import { DashboardStats, AppointmentWithRelations, User, GalleryPhoto } from '../../lib/types';
import { replaceMessageTemplate, DEFAULT_QUICK_ACTION_MESSAGES, globalEventEmitter } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';

export default function Dashboard() {
  // Confirm/cancel handlers for pending appointments
  const [noShowProcessing, setNoShowProcessing] = useState(false);

  const handleNoShowCurrent = async () => {
    if (!currentAppointment) return;
    setNoShowProcessing(true);
    try {
      await apiRequest('PATCH', `/api/appointments/${currentAppointment.id}`, { status: 'no_show' });
      await loadDashboardData();
      Alert.alert('Marked as No Show', 'Appointment marked as no-show');
      globalEventEmitter.emit('appointmentsUpdated');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to mark as no-show');
    } finally {
      setNoShowProcessing(false);
    }
  };

  const handleConfirmPending = async (appointmentId: number) => {
    setPendingProcessingId(appointmentId);
    try {
      await apiRequest('PATCH', `/api/appointments/${appointmentId}`, { status: 'confirmed' });
      await loadPendingAppointments();
      await loadDashboardData();
      Alert.alert('Success', 'Appointment confirmed successfully');
      globalEventEmitter.emit('appointmentsUpdated');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to confirm appointment');
    } finally {
      setPendingProcessingId(null);
    }
  };

  const handleCancelPending = async (appointmentId: number) => {
    setPendingProcessingId(appointmentId);
    try {
      await apiRequest('PATCH', `/api/appointments/${appointmentId}`, { status: 'cancelled' });
      await loadPendingAppointments();
      await loadDashboardData();
      Alert.alert('Success', 'Appointment cancelled successfully');
      globalEventEmitter.emit('appointmentsUpdated');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to cancel appointment');
    } finally {
      setPendingProcessingId(null);
    }
  };
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithRelations[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const { user, isAuthenticated } = useAuth();

    // Pending appointments state
    const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithRelations[]>([]);
    const [pendingLoading, setPendingLoading] = useState(true);
    const [pendingProcessingId, setPendingProcessingId] = useState<number | null>(null);
  
    // Travel time state for pending appointments
    const [pendingTravelTimes, setPendingTravelTimes] = useState<{ [id: number]: { travelTime: number, distance: string, departureTime: string, travelMode: string } }>({});
    const [pendingTravelLoading, setPendingTravelLoading] = useState(false);

  // Gallery photos via React Query
  const { data: galleryPhotos = [], isLoading: galleryLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ['/api/gallery'],
    queryFn: () => apiRequest<GalleryPhoto[]>('GET', '/api/gallery'),
    enabled: isAuthenticated,
    select: (photos) => photos?.slice(0, 5) || [],
  });

  // Fetch pending appointments
  const loadPendingAppointments = async () => {
    if (!isAuthenticated) return;
    setPendingLoading(true);
    try {
      const appointmentsRaw = await apiRequest<AppointmentWithRelations[]>('GET', '/api/appointments/pending');
      // Defensive: ensure array and filter out invalid IDs before any further processing
      const appointments = Array.isArray(appointmentsRaw)
      ? appointmentsRaw.filter((a) => typeof a.id === 'number' && a.id > 0)
      : [];
      setPendingAppointments(appointments);
    } catch (err) {
      console.error('Failed to load pending appointments:', err);
      setPendingAppointments([]);
    } finally {
      setPendingLoading(false);
    }
  };
  
    // Calculate travel times for pending appointments
    useEffect(() => {
      const fetchTravelTimes = async () => {
        if (!userProfile?.homeBaseAddress || pendingAppointments.length === 0) return;
        setPendingTravelLoading(true);
        const travelTimes: { [id: number]: { travelTime: number, distance: string, departureTime: string, travelMode: string } } = {};
        await Promise.all(
          pendingAppointments
            .filter((apt) => apt.address)
            .map(async (apt) => {
              try {
                const response = await apiRequest('POST', '/api/travel-time', {
                  origin: userProfile.homeBaseAddress,
                  destination: apt.address,
                  transportationMode: userProfile.transportationMode || 'driving',
                  appointmentTime: apt.scheduledAt,
                });
                if (response.success) {
                  // Calculate departure time (appointment time - travelTime - 5min buffer)
                  const aptTime = new Date(apt.scheduledAt);
                  const departure = new Date(aptTime.getTime() - (response.travelTime + 5) * 60000);
                  travelTimes[apt.id] = {
                    travelTime: response.travelTime,
                    distance: response.distance || 'N/A',
                    departureTime: departure.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                    travelMode: userProfile.transportationMode || 'driving',
                  };
                }
              } catch (err) {
                // Ignore travel time errors for individual appointments
              }
            })
        );
        setPendingTravelTimes(travelTimes);
        setPendingTravelLoading(false);
      };
        // Confirm/cancel handlers for pending appointments
        const handleConfirmPending = async (appointmentId: number) => {
          setPendingProcessingId(appointmentId);
          try {
            await apiRequest('PATCH', `/api/appointments/${appointmentId}`, { status: 'confirmed' });
            await loadPendingAppointments();
            await loadDashboardData();
            Alert.alert('Success', 'Appointment confirmed successfully');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to confirm appointment');
          } finally {
            setPendingProcessingId(null);
          }
        };
      
        const handleCancelPending = async (appointmentId: number) => {
          setPendingProcessingId(appointmentId);
          try {
            await apiRequest('PATCH', `/api/appointments/${appointmentId}`, { status: 'cancelled' });
            await loadPendingAppointments();
            await loadDashboardData();
            Alert.alert('Success', 'Appointment cancelled successfully');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to cancel appointment');
          } finally {
            setPendingProcessingId(null);
          }
        };
      fetchTravelTimes();
    }, [pendingAppointments, userProfile?.homeBaseAddress, userProfile?.transportationMode]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPendingAppointments();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      const [statsData, appointmentsData, messagesData, profileData] = await Promise.all([
        apiRequest<DashboardStats>('GET', '/api/dashboard'),
        apiRequest<AppointmentWithRelations[]>('GET', '/api/appointments/today'),
        apiRequest<{ count: number }>('GET', '/api/messages/unread-count'),
        apiRequest<User>('GET', '/api/user/profile'),
      ]);

      setStats(statsData);
      // Filter out appointments with invalid, non-positive, or non-numeric IDs
      setTodayAppointments(
        (appointmentsData || []).filter(
          (a) => typeof a.id === 'number' && a.id > 0
        )
      );
      setUnreadMessages(messagesData.count);
      setUserProfile(profileData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Refetch dashboard and pending appointments on tab focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadDashboardData();
        loadPendingAppointments();
      }
    }, [isAuthenticated])
  );

  const quickActions = [
    { 
      label: 'New Appointment', 
      icon: 'add-circle', 
      color: '#22C55E', 
      onPress: () => router.push('/appointments/new')
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

  // Get quick action messages from user settings or use defaults
  const quickActionMessages = DEFAULT_QUICK_ACTION_MESSAGES;

  // Send quick action message function
  const sendQuickActionMessage = async (messageType: keyof typeof quickActionMessages, appointment: AppointmentWithRelations) => {
    try {
      const template = quickActionMessages[messageType];
      if (!template) return;

      const message = replaceMessageTemplate(template, appointment);
      
      // Send the message via API
      await apiRequest('POST', '/api/communications/send-message', {
        clientId: appointment.client.id,
        message,
        type: messageType
      });

      Alert.alert('Message Sent', `Sent ${String(messageType)} message to ${appointment.client.name}`);
    } catch (error) {
      console.error(`Failed to send ${String(messageType)} message:`, error);
      Alert.alert('Error', `Failed to send ${String(messageType)} message`);
    }
  };

  // Only confirmed appointments for all cards
  const confirmedAppointments = todayAppointments.filter(apt => apt.status === 'confirmed');

  const currentTime = new Date();
  const currentAppointment = confirmedAppointments.find(apt => {
    const aptTime = new Date(apt.scheduledAt);
    const endTime = new Date(aptTime.getTime() + (apt.duration * 60 * 1000));
    const timeDiff = (currentTime.getTime() - aptTime.getTime()) / (1000 * 60);
    // Current if within 10 min before start to end time
    return timeDiff >= -10 && currentTime <= endTime;
  });

  // Compose service names for current appointment
  let currentAppointmentServiceNames = '';
  if (
    currentAppointment &&
    Array.isArray(currentAppointment.appointmentServices) &&
    currentAppointment.appointmentServices.length > 0
  ) {
    currentAppointmentServiceNames = currentAppointment.appointmentServices
      .map(as => as.service?.name)
      .filter(Boolean)
      .join(', ');
  } else if (
    currentAppointment &&
    Array.isArray(currentAppointment.services) &&
    currentAppointment.services.length > 0
  ) {
    currentAppointmentServiceNames = currentAppointment.services
      .map(s => s.name)
      .filter(Boolean)
      .join(', ');
  } else if (currentAppointment && currentAppointment.service?.name) {
    currentAppointmentServiceNames = currentAppointment.service.name;
  }

  const nextAppointment = confirmedAppointments.find(apt => {
    const aptTime = new Date(apt.scheduledAt);
    if (currentAppointment && apt.id === currentAppointment.id) return false;
    return aptTime.getTime() > currentTime.getTime();
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={loading || pendingLoading}
            onRefresh={async () => {
              setLoading(true);
              await Promise.all([loadDashboardData(), loadPendingAppointments()]);
              setLoading(false);
            }}
            tintColor="#22C55E"
            colors={['#22C55E']}
          />
        }
      >
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

        {/* Current Appointment Card */}
        <View style={styles.appointmentSection}>
          <Text style={styles.sectionTitle}>Current Appointment</Text>
          <View style={styles.appointmentCard}>
            {currentAppointment ? (
              <>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentClient}>
                    {currentAppointment.client?.name}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    {new Date(currentAppointment.scheduledAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                </View>
                <Text style={styles.appointmentService}>
                  {currentAppointmentServiceNames}
                </Text>
                <Text style={styles.appointmentPrice}>
                  ${currentAppointment.price}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                  {currentAppointment.client?.phone && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => {
                        // Call client
                        if (currentAppointment.client?.phone) {
                          // @ts-ignore
                          Linking.openURL(`tel:${currentAppointment.client.phone}`);
                        }
                      }}
                    >
                      <Ionicons name="call" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Call</Text>
                    </TouchableOpacity>
                  )}
                  {currentAppointment.address && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => {
                        // Navigate to address
                        const encoded = encodeURIComponent(currentAppointment.address || "");
                        // @ts-ignore
                        Linking.openURL(`https://maps.google.com/?q=${encoded}`);
                      }}
                    >
                      <Ionicons name="navigate" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Navigate</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: '#EF4444', opacity: noShowProcessing ? 0.7 : 1 }
                    ]}
                    onPress={handleNoShowCurrent}
                    disabled={noShowProcessing}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>No Show</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => {
                      // Navigate to invoice tab and pre-fill with client and services
                      if (currentAppointment) {
                        const client = currentAppointment.client;
                        // Prefer appointmentServices, fallback to services, fallback to service
                        const services: any[] = [];
                        if (
                          Array.isArray(currentAppointment.appointmentServices) &&
                          currentAppointment.appointmentServices.length > 0
                        ) {
                          services.push(
                            ...currentAppointment.appointmentServices
                              .map(as => as.service)
                              .filter(Boolean)
                          );
                        } else if (
                          Array.isArray(currentAppointment.services) &&
                          currentAppointment.services.length > 0
                        ) {
                          services.push(...currentAppointment.services);
                        } else if (currentAppointment.service) {
                          services.push(currentAppointment.service);
                        }
                        // Always use router.push to update params and trigger effect
                        router.push({
                          pathname: '/(tabs)/invoice',
                          params: {
                            prefillClientId: client?.id,
                            prefillServices: JSON.stringify(services.map(s => s.id)),
                          },
                        });
                      }
                    }}
                  >
                    <Ionicons name="document-text" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Invoice</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={{ color: '#9CA3AF', fontSize: 16, textAlign: 'center' }}>
                No current appointment
              </Text>
            )}
          </View>
        </View>

        {/* Next Appointment Card */}
        <View style={styles.appointmentSection}>
          <Text style={styles.sectionTitle}>Next Appointment</Text>
          <View style={styles.appointmentCard}>
            {nextAppointment ? (
              <>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentClient}>
                    {nextAppointment.client?.name}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    {new Date(nextAppointment.scheduledAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                </View>
                <Text style={styles.appointmentService}>
                  {nextAppointment.service?.name}
                </Text>
                <Text style={styles.appointmentPrice}>
                  ${nextAppointment.price}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
                  {nextAppointment.client?.phone && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
                      onPress={() => {
                        // Call client
                        if (nextAppointment.client?.phone) {
                          // @ts-ignore
                          Linking.openURL(`tel:${nextAppointment.client.phone}`);
                        }
                      }}
                    >
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Call</Text>
                    </TouchableOpacity>
                  )}
                  {nextAppointment.address && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => {
                        // Navigate to address
                        const encoded = encodeURIComponent(nextAppointment.address || "");
                        // @ts-ignore
                        Linking.openURL(`https://maps.google.com/?q=${encoded}`);
                      }}
                    >
                      <Ionicons name="navigate" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Navigate</Text>
                    </TouchableOpacity>
                  )}
                  {quickActionMessages.onMyWay && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                      onPress={() => sendQuickActionMessage('onMyWay', nextAppointment)}
                    >
                      <Ionicons name="car" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>On My Way</Text>
                    </TouchableOpacity>
                  )}
                  {quickActionMessages.runningLate && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                      onPress={() => sendQuickActionMessage('runningLate', nextAppointment)}
                    >
                      <Ionicons name="time" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Running Late</Text>
                    </TouchableOpacity>
                  )}
                  {quickActionMessages.confirmation && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                      onPress={() => sendQuickActionMessage('confirmation', nextAppointment)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <Text style={{ color: '#9CA3AF', fontSize: 16, textAlign: 'center' }}>
                No next appointment
              </Text>
            )}
          </View>
        </View>

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

        {/* Pending Appointments Section */}
        <View style={styles.appointmentsSection}>
          <Text style={styles.sectionTitle}>Pending Appointments</Text>
          {pendingLoading || pendingTravelLoading ? (
            <Text style={{ color: '#9CA3AF', fontSize: 16, textAlign: 'center' }}>
              Loading...
            </Text>
          ) : pendingAppointments.length > 0 ? (
            pendingAppointments.map((appointment) => {
              const travelInfo = pendingTravelTimes[appointment.id];
              const now = new Date();
              let expiresAt: Date | null = null;
              if ((appointment as any).expiresAt) {
                expiresAt = new Date((appointment as any).expiresAt);
              }
              // Travel warning if departure time is in the past
              const showTravelWarning =
                travelInfo &&
                travelInfo.departureTime &&
                (() => {
                  // Parse departure time as today
                  const [depHour, depMin] = travelInfo.departureTime
                    .replace(/[^0-9:]/g, '')
                    .split(':')
                    .map(Number);
                  const dep = new Date(now);
                  dep.setHours(depHour, depMin, 0, 0);
                  return dep < now;
                })();

              // Truncate service name if too long
              const serviceName =
                appointment.service?.name && appointment.service.name.length > 32
                  ? appointment.service.name.slice(0, 29) + '...'
                  : appointment.service?.name;

              return (
                <View key={appointment.id} style={styles.appointmentListItem}>
                  <View style={styles.appointmentInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ backgroundColor: '#FDE68A', color: '#B45309', fontWeight: 'bold', fontSize: 12, borderRadius: 4, paddingHorizontal: 6, marginRight: 6 }}>
                        Pending
                      </Text>
                      {showTravelWarning && (
                        <Text style={{ backgroundColor: '#FCA5A5', color: '#991B1B', fontWeight: 'bold', fontSize: 12, borderRadius: 4, paddingHorizontal: 6 }}>
                          Departure Time!
                        </Text>
                      )}
                    </View>
                    <Text style={styles.appointmentClientName}>
                      {appointment.client?.name}
                    </Text>
                    <Text style={styles.appointmentDetails}>
                      {Array.isArray(appointment.appointmentServices) && appointment.appointmentServices.length > 0
                        ? appointment.appointmentServices.map(as => as.service?.name || '').filter(Boolean).join(', ')
                        : Array.isArray(appointment.services) && appointment.services.length > 0
                        ? appointment.services.map(s => s.name).join(', ')
                        : serviceName} • ${appointment.price}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                      {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                    {expiresAt && (
                      <Text style={{ color: '#F59E0B', fontSize: 13 }}>
                        Expires: {expiresAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </Text>
                    )}
                    <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                      Duration: {appointment.duration} min
                    </Text>
                    {appointment.notes && (
                      <Text style={{ color: '#F59E0B', fontSize: 13 }}>
                        Notes: {appointment.notes}
                      </Text>
                    )}
                    {appointment.address && (
                      travelInfo ? (
                        <View style={{ marginTop: 4 }}>
                          <Text style={{ color: '#3B82F6', fontSize: 13 }}>
                            Travel: {travelInfo.travelTime} min, {travelInfo.distance}
                          </Text>
                          <Text style={{ color: '#F59E0B', fontSize: 13 }}>
                            Departure: {travelInfo.departureTime} ({travelInfo.travelMode})
                          </Text>
                        </View>
                      ) : (
                        <View style={{ marginTop: 4 }}>
                          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                            Calculating travel time...
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                   <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%' }}>
                     {appointment.client?.phone && (
                       <TouchableOpacity
                         style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                         onPress={() => {
                           // @ts-ignore
                           Linking.openURL(`tel:${appointment.client.phone}`);
                         }}
                       >
                         <Ionicons name="call" size={16} color="#fff" />
                         <Text style={styles.actionButtonText}>Call</Text>
                       </TouchableOpacity>
                     )}
                     <TouchableOpacity
                       style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
                       onPress={() => handleConfirmPending(appointment.id)}
                       disabled={pendingProcessingId === appointment.id}
                     >
                       <Ionicons name="checkmark-circle" size={16} color="#fff" />
                       <Text style={styles.actionButtonText}>Confirm</Text>
                     </TouchableOpacity>
                     <View style={{ flex: 1 }} />
                     <TouchableOpacity
                       style={[styles.actionCancelButton, { backgroundColor: '#EF4444', alignSelf: 'flex-end' }]}
                       onPress={() => handleCancelPending(appointment.id)}
                       disabled={pendingProcessingId === appointment.id}
                     >
                       <Ionicons name="close-circle" size={16} color="#fff" />
                       <Text style={styles.actionButtonText}>Cancel</Text>
                     </TouchableOpacity>
                   </View>
                </View>
                
              );
            })
          ) : (
            <Text style={{ color: '#9CA3AF', fontSize: 16, textAlign: 'center' }}>
              No pending appointments
            </Text>
          )}
        </View>

        {/* Today's Appointments */}
        {confirmedAppointments.length > 0 && (
          <View style={styles.appointmentsSection}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
            {confirmedAppointments.map((appointment) => (
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

        {/* Recent Work Section (Gallery) */}
        <View style={styles.recentSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Recent Work</Text>
            <TouchableOpacity onPress={() => router.push('/gallery/gallery')}>
              <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 16 }}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {galleryLoading ? (
            <Text style={{ color: '#9CA3AF', marginBottom: 12 }}>Loading...</Text>
          ) : galleryPhotos.length === 0 ? (
            <Text style={{ color: '#9CA3AF', marginBottom: 12 }}>No photos uploaded yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
              {galleryPhotos.map((photo: any) => (
                <View key={photo.id} style={styles.recentCard}>
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 120, height: 120, backgroundColor: '#222', borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
                      <Image
                        source={{
                          uri: photo.photoUrl
                            ? photo.photoUrl
                            : (typeof photo.filename === 'string' && photo.filename.startsWith('http')
                                ? photo.filename
                                : `${API_BASE_URL}/uploads/${photo.filename}`),
                        }}
                        style={{ width: '100%', height: '100%', borderRadius: 8 }}
                        resizeMode="cover"
                        accessibilityLabel={photo.originalName || "Portfolio work"}
                      />
                    </View>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center' }}>
                      {photo.originalName || 'Styling'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
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
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-start',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 4,
    marginBottom: 4,
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
    actionCancelButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 4,
    marginBottom: 4,
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 24,
  },
  recentScroll: {
    flexDirection: 'row',
  },
  recentCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 16,
    width: 220,
    minHeight: 140,
    justifyContent: 'space-between',
  },
});