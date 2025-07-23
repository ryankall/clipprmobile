import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '../../lib/api';
import { ClientWithStats, AppointmentWithRelations, GalleryPhoto, Message } from '../../lib/types';
import { clientFormSchema } from '../../lib/clientSchema';
import { z } from 'zod';

export default function ClientProfile() {
  const { id } = useLocalSearchParams();
  const clientId = typeof id === 'string' ? parseInt(id, 10) : 0;
  const router = useRouter();

  // State
  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredStyle: '',
    notes: '',
    loyaltyStatus: 'regular',
  });
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({});
  const [editLoading, setEditLoading] = useState(false);

  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [messageModal, setMessageModal] = useState<Message | null>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);

  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch client data
  useEffect(() => {
    let mounted = true;
    async function fetchClient() {
      setLoading(true);
      try {
        const data = await apiRequest<ClientWithStats>('GET', `/api/clients/${clientId}`);
        if (mounted) {
          setClient(data);
          setEditFields({
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            preferredStyle: data.preferredStyle || '',
            notes: data.notes || '',
            loyaltyStatus: data.loyaltyStatus === 'vip' ? 'vip' : 'regular',
          });
        }
      } catch (e) {
        setClient(null);
      }
      setLoading(false);
    }
    if (clientId) fetchClient();
    return () => { mounted = false; };
  }, [clientId]);

  // Fetch appointments
  useEffect(() => {
    let mounted = true;
    async function fetchAppointments() {
      setAppointmentsLoading(true);
      try {
        const data = await apiRequest<AppointmentWithRelations[]>('GET', `/api/clients/${clientId}/appointments?limit=10`);
        if (mounted) setAppointments(data);
      } catch (e) {
        setAppointments([]);
      }
      setAppointmentsLoading(false);
    }
    if (clientId) fetchAppointments();
    return () => { mounted = false; };
  }, [clientId]);

  // Fetch messages
  useEffect(() => {
    let mounted = true;
    async function fetchMessages() {
      setMessagesLoading(true);
      try {
        const data = await apiRequest<Message[]>('GET', `/api/clients/${clientId}/messages?limit=20`);
        if (mounted) setMessages(data);
      } catch (e) {
        setMessages([]);
      }
      setMessagesLoading(false);
    }
    if (clientId) fetchMessages();
    return () => { mounted = false; };
  }, [clientId]);

  // Fetch gallery photos
  useEffect(() => {
    let mounted = true;
    async function fetchPhotos() {
      setPhotosLoading(true);
      try {
        const data = await apiRequest<GalleryPhoto[]>('GET', `/api/clients/${clientId}/gallery`);
        if (mounted) setPhotos(data);
      } catch (e) {
        setPhotos([]);
      }
      setPhotosLoading(false);
    }
    if (clientId) fetchPhotos();
    return () => { mounted = false; };
  }, [clientId]);

  // Edit handlers
  const handleEditChange = (field: string, value: string) => {
    setEditFields((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditErrors({});
    // Validate
    const result = clientFormSchema.safeParse(editFields);
    if (!result.success) {
      const fieldErrors: { [key: string]: string } = {};
      for (const err of result.error.issues) {
        if (err.path && err.path[0] && typeof err.path[0] === "string") {
          fieldErrors[err.path[0]] = err.message;
        }
      }
      setEditErrors(fieldErrors);
      setEditLoading(false);
      return;
    }
    try {
      const updated = { ...client, ...editFields };
      await apiRequest('PUT', `/api/clients/${clientId}`, updated);
      setClient((prev) => prev ? { ...prev, ...editFields } : null);
      setEditMode(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update client');
    }
    setEditLoading(false);
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setDeleteLoading(true);
            try {
              await apiRequest('DELETE', `/api/clients/${clientId}`);
              router.replace('/clients');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete client');
            }
            setDeleteLoading(false);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }
  if (!client) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 12 }}>Client Not Found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/clients')}>
          <Ionicons name="arrow-back" size={20} color="#FFD700" />
          <Text style={{ color: '#FFD700', fontWeight: '600', marginLeft: 6 }}>Back to Clients</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Stats
  const totalSpent = parseFloat(client.totalSpent || '0');
  const totalVisits = client.totalVisits || 0;
  const lastVisit = client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : '--';
  const upcomingAppointments = appointments.filter(a =>
    new Date(a.scheduledAt) > new Date() && a.status === 'confirmed'
  ).length;

  // Render
  return (
    
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{client.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {editMode ? (
            <>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: '#22C55E' }]}
                onPress={handleEditSave}
                disabled={editLoading}
                accessibilityLabel="Save client"
              >
                <Ionicons name="save-outline" size={22} color="#18181B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  setEditMode(false);
                  setEditFields({
                    name: client.name || '',
                    phone: client.phone || '',
                    email: client.email || '',
                    address: client.address || '',
                    preferredStyle: client.preferredStyle || '',
                    notes: client.notes || '',
                    loyaltyStatus: client.loyaltyStatus === 'vip' ? 'vip' : 'regular',
                  });
                  setEditErrors({});
                }}
                accessibilityLabel="Cancel edit"
              >
                <Ionicons name="close" size={22} color="#FFD700" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: '#F87171' }]}
                onPress={handleDelete}
                disabled={deleteLoading}
                accessibilityLabel="Delete client"
              >
                <Ionicons name="trash-outline" size={22} color="#18181B" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setEditMode(true)}
                accessibilityLabel="Edit client"
              >
                <Ionicons name="create-outline" size={22} color="#FFD700" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  if (client.phone) {
                    const url = `tel:${client.phone}`;
                    Linking.openURL(url);
                  }
                }}
                accessibilityLabel="Call client"
              >
                <Ionicons name="call-outline" size={22} color="#FFD700" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push({ pathname: '/calendar', params: { clientId: client.id.toString() } })}
                accessibilityLabel="Book appointment"
              >
                <Ionicons name="calendar-outline" size={22} color="#FFD700" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Client Info */}
      <View style={styles.card}>
        {editMode ? (
          <View>
            <TextInput
              style={[styles.input, editErrors.name && styles.inputError]}
              placeholder="Name"
              placeholderTextColor="#666"
              value={editFields.name}
              onChangeText={text => handleEditChange('name', text)}
              accessibilityLabel="Edit name"
            />
            {editErrors.name ? <Text style={styles.errorText}>{editErrors.name}</Text> : null}
            <TextInput
              style={[styles.input, editErrors.phone && styles.inputError]}
              placeholder="Phone"
              placeholderTextColor="#666"
              value={editFields.phone}
              onChangeText={text => handleEditChange('phone', text)}
              keyboardType="phone-pad"
              accessibilityLabel="Edit phone"
            />
            {editErrors.phone ? <Text style={styles.errorText}>{editErrors.phone}</Text> : null}
            <TextInput
              style={[styles.input, editErrors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor="#666"
              value={editFields.email}
              onChangeText={text => handleEditChange('email', text)}
              keyboardType="email-address"
              accessibilityLabel="Edit email"
            />
            {editErrors.email ? <Text style={styles.errorText}>{editErrors.email}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Address"
              placeholderTextColor="#666"
              value={editFields.address}
              onChangeText={text => handleEditChange('address', text)}
              accessibilityLabel="Edit address"
            />
            <TextInput
              style={styles.input}
              placeholder="Preferred Style"
              placeholderTextColor="#666"
              value={editFields.preferredStyle}
              onChangeText={text => handleEditChange('preferredStyle', text)}
              accessibilityLabel="Edit preferred style"
            />
            <TextInput
              style={styles.input}
              placeholder="Notes"
              placeholderTextColor="#666"
              value={editFields.notes}
              onChangeText={text => handleEditChange('notes', text)}
              multiline
              accessibilityLabel="Edit notes"
            />
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity
                style={[
                  styles.loyaltyButton,
                  editFields.loyaltyStatus === 'regular' && { backgroundColor: '#22C55E' },
                ]}
                onPress={() => handleEditChange('loyaltyStatus', 'regular')}
                accessibilityLabel="Set loyalty status to regular"
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Regular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.loyaltyButton,
                  editFields.loyaltyStatus === 'vip' && { backgroundColor: '#FFD700' },
                ]}
                onPress={() => handleEditChange('loyaltyStatus', 'vip')}
                accessibilityLabel="Set loyalty status to VIP"
              >
                <Text style={{ color: editFields.loyaltyStatus === 'vip' ? '#18181B' : '#fff', fontWeight: '600' }}>VIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.loyaltyStatus === 'vip' && (
              <View style={styles.vipBadge}>
                <Ionicons name="star" size={16} color="#18181B" style={{ marginRight: 2 }} />
                <Text style={styles.vipBadgeText}>VIP</Text>
              </View>
            )}
            {client.phone ? (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={styles.infoText}>{client.phone}</Text>
              </View>
            ) : null}
            {client.email ? (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={styles.infoText}>{client.email}</Text>
              </View>
            ) : null}
            {client.address ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={styles.infoText}>{client.address}</Text>
              </View>
            ) : null}
            {client.preferredStyle ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Preferred Style</Text>
                <Text style={styles.infoBlockText}>{client.preferredStyle}</Text>
              </View>
            ) : null}
            {client.notes ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Notes</Text>
                <Text style={styles.infoBlockText}>{client.notes}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>{totalVisits}</Text>
          <Text style={styles.statsLabel}>Visits</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>${totalSpent.toFixed(0)}</Text>
          <Text style={styles.statsLabel}>Spent</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>{upcomingAppointments}</Text>
          <Text style={styles.statsLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Recent Appointments */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color="#FFD700" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Recent Appointments</Text>
        </View>
        {appointmentsLoading ? (
          <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 12 }} />
        ) : appointments.length > 0 ? (
          appointments
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .slice(0, 5)
            .map((apt) => (
              <View key={apt.id} style={styles.appointmentRow}>
                <View>
                  <Text style={styles.appointmentService}>{apt.service?.name}</Text>
                  <Text style={styles.appointmentDate}>
                    {new Date(apt.scheduledAt).toLocaleString()}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.appointmentPrice}>${apt.price}</Text>
                  <View style={[
                    styles.statusBadge,
                    apt.status === 'confirmed'
                      ? { backgroundColor: '#22C55E' }
                      : { backgroundColor: '#374151' }
                  ]}>
                    <Text style={styles.statusBadgeText}>{apt.status}</Text>
                  </View>
                </View>
              </View>
            ))
        ) : (
          <View style={styles.emptyBlock}>
            <Ionicons name="calendar-outline" size={32} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyBlockText}>No appointments yet</Text>
          </View>
        )}
      </View>

      {/* Message History */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFD700" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Message History ({messages.length})</Text>
        </View>
        {messagesLoading ? (
          <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 12 }} />
        ) : messages.length > 0 ? (
          <>
            {messages
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, showAllMessages ? messages.length : 5)
              .map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.messageRow}
                  onPress={() => setMessageModal(msg)}
                  accessibilityLabel="View message details"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.messageSubject}>{msg.services?.join(', ') || msg.message?.slice(0, 20) || 'Message'}</Text>
                    <Text style={styles.messageMeta}>
                      From: {msg.customerName} • {new Date(msg.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: '#FFD700', alignSelf: 'flex-start' }
                  ]}>
                    <Text style={[styles.statusBadgeText, { color: '#18181B' }]}>Unread</Text>
                  </View>
                </TouchableOpacity>
              ))}
            {messages.length > 5 && (
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: 8 }}
                onPress={() => setShowAllMessages(!showAllMessages)}
                accessibilityLabel="Show all messages"
              >
                <Text style={{ color: '#FFD700', fontSize: 14 }}>
                  {showAllMessages ? `Show recent 5` : `Show all ${messages.length} messages`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyBlock}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyBlockText}>No messages yet</Text>
          </View>
        )}
      </View>
      {/* Message Modal */}
      <Modal
        visible={!!messageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setMessageModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {messageModal && (
              <>
                <Text style={styles.modalTitle}>{messageModal.services?.join(', ') || 'Message'}</Text>
                <Text style={styles.modalMeta}>From: {messageModal.customerName}</Text>
                <Text style={styles.modalMeta}>Date: {new Date(messageModal.createdAt).toLocaleString()}</Text>
                {messageModal.customerPhone ? <Text style={styles.modalMeta}>Phone: {messageModal.customerPhone}</Text> : null}
                {/* Email field not present in Message type, so skip */}
                <View style={styles.modalBlock}>
                  <Text style={styles.modalMessage}>{messageModal.message}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.iconButton, { alignSelf: 'flex-end', marginTop: 12 }]}
                  onPress={() => setMessageModal(null)}
                  accessibilityLabel="Close message modal"
                >
                  <Ionicons name="close" size={22} color="#FFD700" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Photo Gallery */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="images-outline" size={18} color="#FFD700" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Photo Gallery ({photos.length})</Text>
        </View>
        {photosLoading ? (
          <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 12 }} />
        ) : photos.length > 0 ? (
          <View style={styles.galleryGrid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.galleryItem}>
                <Image
                  source={{ uri: photo.filename }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                  accessibilityLabel="Gallery photo"
                />
                <Text style={styles.galleryCaption}>
                  {photo.originalName || new Date(photo.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBlock}>
            <Ionicons name="images-outline" size={32} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyBlockText}>No photos uploaded yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Hide the default navigation header/title
export const screenOptions = {
  headerShown: false,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 50 : 50,
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
  },
  iconButton: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 2,
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
  clientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  vipBadgeText: {
    color: '#18181B',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  infoBlock: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  infoBlockLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoBlockText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#F87171',
  },
  errorText: {
    color: '#F87171',
    marginBottom: 4,
    fontSize: 13,
  },
  loyaltyButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#23232A',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 4,
  },
  statsValue: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 2,
  },
  statsLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  appointmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  appointmentService: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  appointmentDate: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  appointmentPrice: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyBlockText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  messageSubject: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  messageMeta: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryItem: {
    width: '48%',
    marginBottom: 12,
    backgroundColor: '#23232A',
    borderRadius: 8,
    alignItems: 'center',
    padding: 6,
  },
  galleryImage: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    marginBottom: 4,
  },
  galleryCaption: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  modalMeta: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 2,
  },
  modalBlock: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  modalMessage: {
    color: '#fff',
    fontSize: 15,
  },
});