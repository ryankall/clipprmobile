import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '../lib/api';
import { AppointmentWithRelations } from '../lib/types';

export default function AppointmentDetails() {
  const { id } = useLocalSearchParams();
  const appointmentId = typeof id === 'string' ? parseInt(id, 10) : 0;
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchAppointment() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<AppointmentWithRelations>('GET', `/api/appointments/${appointmentId}`);
        if (mounted) setAppointment(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load appointment');
        setAppointment(null);
      }
      setLoading(false);
    }
    if (appointmentId) fetchAppointment();
    else {
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
        <Text style={styles.sectionTitle}>Service</Text>
        <Text style={styles.valueText}>{appointment.service?.name || 'N/A'}</Text>
        <Text style={styles.sectionTitle}>Client</Text>
        <Text style={styles.valueText}>{appointment.client?.name || 'N/A'}</Text>
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <Text style={styles.valueText}>
          {startTime.toLocaleDateString()} {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.valueText}>{appointment.status}</Text>
        <Text style={styles.sectionTitle}>Price</Text>
        <Text style={styles.valueText}>${appointment.price}</Text>
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
      </View>
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
});