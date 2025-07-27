import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '../lib/api';
import { AppointmentWithRelations } from '../lib/types';

export default function AppointmentDetails() {
  const { id } = useLocalSearchParams();
  // Ensure appointmentId is a valid positive integer
  const appointmentId = typeof id === 'string' && /^\d+$/.test(id) ? parseInt(id, 10) : 0;
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Action button state ---
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchAppointment() {
      setLoading(true);
      setError(null);
      const url = `/api/appointments/${appointmentId}`;
      // Logging for debugging
      console.log('[AppointmentDetails] Fetching appointment', { appointmentId, url });
      try {
        const data = await apiRequest<AppointmentWithRelations>('GET', url);
        if (mounted) setAppointment(data);
      } catch (e: any) {
        // Handle non-JSON/HTML or parsing errors with a user-friendly message
        let userMessage = 'Failed to load appointment';
        // Try to detect HTML or non-JSON responses
        if (e?.message) {
          if (
            e.message.includes('Unexpected HTML response') ||
            e.message.includes('Failed to parse JSON') ||
            e.message.includes('Unexpected token') ||
            e.message.includes('JSON')
          ) {
            userMessage = 'Unexpected server response. Please try again later.';
          } else {
            userMessage = e.message;
          }
        }
        // If the error object has a 'response' with text/html, show a friendly message
        if (e?.response && typeof e.response.text === 'function') {
          try {
            const text = await e.response.text();
            if (text && text.trim().startsWith('<!DOCTYPE html')) {
              userMessage = 'Unexpected server response. Please try again later.';
            }
          } catch {}
        }
        setError(userMessage);
        setAppointment(null);
      }
      setLoading(false);
    }
    if (appointmentId > 0) {
      fetchAppointment();
    } else {
      setError('Invalid appointment ID');
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [appointmentId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (error || !appointment) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 12 }}>
          {error || 'Appointment Not Found'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFD700" />
          <Text style={{ color: '#FFD700', fontWeight: '600', marginLeft: 6 }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startTime = new Date(appointment.scheduledAt);
  const endTime = new Date(startTime.getTime() + appointment.duration * 60000);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Appointment Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Services</Text>
        {/* Multi-service breakdown */}
        {Array.isArray(appointment.appointmentServices) && appointment.appointmentServices.length > 0 ? (
          <>
            {appointment.appointmentServices.map((as, idx) => (
              <View key={idx} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valueText}>{as.service?.name || 'N/A'}</Text>
                  <Text style={styles.serviceMeta}>
                    {as.service?.duration} min{as.quantity > 1 ? ` × ${as.quantity}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.valueText}>${parseFloat(as.price).toFixed(2)}</Text>
                  {as.quantity > 1 && (
                    <Text style={styles.serviceMeta}>Qty: {as.quantity}</Text>
                  )}
                </View>
              </View>
            ))}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Duration:</Text>
              <Text style={styles.totalsValue}>
                {appointment.appointmentServices.reduce(
                  (sum, as) => sum + (as.service?.duration || 0) * (as.quantity || 1),
                  0
                )} min
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Price:</Text>
              <Text style={[styles.totalsValue, { color: '#FFD700' }]}>
                $
                {appointment.appointmentServices
                  .reduce(
                    (sum, as) => sum + parseFloat(as.price) * (as.quantity || 1),
                    0
                  )
                  .toFixed(2)}
              </Text>
            </View>
          </>
        ) : (
          // Single service fallback
          <>
            <Text style={styles.valueText}>{appointment.service?.name || 'N/A'}</Text>
            <Text style={styles.serviceMeta}>
              {appointment.service?.duration} min • ${appointment.service?.price}
            </Text>
          </>
        )}
        <Text style={styles.sectionTitle}>Client</Text>
        <Text style={styles.valueText}>{appointment.client?.name || 'N/A'}</Text>
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          appointment.status === 'confirmed'
            ? styles.statusBadgeConfirmed
            : styles.statusBadgePending
        ]}>
          <Text style={styles.statusBadgeText}>
            {appointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
        {/* Show phone and email if available */}
        {appointment.client?.phone ? (
          <Text style={styles.valueText}>
            📞 {appointment.client.phone}
          </Text>
        ) : null}
        {appointment.client?.email ? (
          <Text style={styles.valueText}>
            ✉️ {appointment.client.email}
          </Text>
        ) : null}
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <Text style={styles.valueText}>
          {startTime.toLocaleDateString()} {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.valueText}>{appointment.status}</Text>
        {/* Only show price if not using multi-service breakdown */}
        {!(Array.isArray(appointment.appointmentServices) && appointment.appointmentServices.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Price</Text>
            <Text style={styles.valueText}>${appointment.price}</Text>
          </>
        )}
        {appointment.travelRequired && (
          <>
            <Text style={styles.sectionTitle}>Travel Required</Text>
            <Text style={styles.valueText}>Yes</Text>
            {appointment.address ? (
              <>
                <Text style={styles.sectionTitle}>Address</Text>
                <Text style={styles.valueText}>{appointment.address}</Text>
              </>
            ) : null}
          </>
        )}
        {/* Notes Section */}
        {appointment.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.valueText}>{appointment.notes}</Text>
          </>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Confirm Appointment Button */}
        {appointment.status !== 'confirmed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => {
              Alert.alert(
                'Confirm Appointment',
                'Are you sure you want to confirm this appointment?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    style: 'default',
                    onPress: async () => {
                      setConfirming(true);
                      setActionError(null);
                      try {
                        await apiRequest('PATCH', `/api/appointments/${appointment.id}`, { status: 'confirmed' });
                        setConfirming(false);
                        Alert.alert('Success', 'Appointment confirmed.', [
                          { text: 'OK', onPress: () => router.back() }
                        ]);
                      } catch (e: any) {
                        setConfirming(false);
                        setActionError(e?.message || 'Failed to confirm appointment');
                        Alert.alert('Error', e?.message || 'Failed to confirm appointment');
                      }
                    }
                  }
                ]
              );
            }}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Confirm Appointment</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            Alert.alert(
              'Delete Appointment',
              'Are you sure you want to delete this appointment? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    setActionError(null);
                    try {
                      await apiRequest('DELETE', `/api/appointments/${appointment.id}`);
                      setDeleting(false);
                      Alert.alert('Deleted', 'Appointment deleted.', [
                        { text: 'OK', onPress: () => router.back() }
                      ]);
                    } catch (e: any) {
                      setDeleting(false);
                      setActionError(e?.message || 'Failed to delete appointment');
                      Alert.alert('Error', e?.message || 'Failed to delete appointment');
                    }
                  }
                }
              ]
            );
          }}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
        {/* Error feedback (inline, if needed) */}
        {actionError ? (
          <Text style={styles.errorText}>{actionError}</Text>
        ) : null}
      </View>
      {/* Get Directions Button */}
      {appointment.address ? (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.directionsButton]}
            onPress={() => {
              const encoded = encodeURIComponent(appointment.address!);
              const url = `https://maps.google.com/?q=${encoded}`;
              Linking.openURL(url).catch(() =>
                Alert.alert('Error', 'Unable to open maps application.')
              );
            }}
            accessibilityLabel="Get Directions"
          >
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 12,
    paddingTop: 50,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 20,
    justifyContent: 'space-between',
    backgroundColor: '#0F0F0F',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    marginRight: 8,
    textAlign: 'center',
  },
  iconButton: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 10,
  },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
  },
  valueText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#23232A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    marginTop: 4,
  },
  serviceMeta: {
    color: '#B0B0B0',
    fontSize: 13,
    marginTop: 2,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalsLabel: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 15,
  },
  totalsValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmButton: {
    backgroundColor: '#FFD700',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
  actionButtonText: {
    color: '#18181B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  directionsButton: {
    backgroundColor: '#2563EB', // Distinct blue
    borderRadius: 8,
    marginBottom: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    marginTop: 6,
    fontSize: 15,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  statusBadgeConfirmed: {
    backgroundColor: '#2ecc40', // Green
  },
  statusBadgePending: {
    backgroundColor: '#FFD700', // Yellow
  },
  statusBadgeText: {
    color: '#18181B',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});