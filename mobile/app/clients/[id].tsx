// [DEBUG] Audit: All hooks in this file are called at the top level of function components. No hook usage violations found.
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

import { colors } from '../../lib/theme';
import { utcToLocal } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
export default function ClientProfile() {
  // FIX: Call useAuth at the very top, before any conditional returns
  const { user } = useAuth();
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
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // --- Invoice State ---
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoiceServices, setInvoiceServices] = useState<any[]>([]);
  const [invoiceServicesLoading, setInvoiceServicesLoading] = useState(false);
  const [invoiceServicesError, setInvoiceServicesError] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

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

  // Fetch invoices
  useEffect(() => {
    let mounted = true;
    async function fetchInvoices() {
      setInvoicesLoading(true);
      setInvoicesError(null);
      try {
        const data = await apiRequest<any[]>('GET', `/api/clients/${clientId}/invoices`);
        if (mounted) setInvoices(data);
      } catch (e) {
        setInvoices([]);
        setInvoicesError('Failed to load invoices');
      }
      setInvoicesLoading(false);
    }
    if (clientId) fetchInvoices();
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
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }
  if (!client) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 12 }}>Client Not Found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/clients')}>
          <Ionicons name="arrow-back" size={20} color={colors.gold} />
          <Text style={{ color: colors.gold, fontWeight: '600', marginLeft: 6 }}>Back to Clients</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Stats
  const totalSpent = parseFloat(client.totalSpent || '0');
  const totalVisits = client.totalVisits || 0;
  // useAuth is now called at the top of the component (see above)
  const lastVisit = client.lastVisit
    ? utcToLocal(
        typeof client.lastVisit === "string"
          ? client.lastVisit
          : "",
        user?.timezone
      ).toLocaleDateString()
    : '--';
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
          <Ionicons name="arrow-back" size={22} color={colors.gold} />
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
                <Ionicons name="close" size={22} color={colors.gold} />
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
                <Ionicons name="create-outline" size={22} color={colors.gold} />
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
                <Ionicons name="call-outline" size={22} color={colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push({ pathname: '/calendar', params: { clientId: client.id.toString() } })}
                accessibilityLabel="Book appointment"
              >
                <Ionicons name="calendar-outline" size={22} color={colors.gold} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Client Info */}
      <View style={styles.card}>
        {editMode ? (
          <View>
            {/* Summary error message */}
            {Object.keys(editErrors).length > 0 && (
              <Text style={styles.summaryErrorText}>
                Please correct the highlighted fields below.
              </Text>
            )}
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
              style={[styles.input, editErrors.address && styles.inputError]}
              placeholder="Address"
              placeholderTextColor="#666"
              value={editFields.address}
              onChangeText={text => handleEditChange('address', text)}
              accessibilityLabel="Edit address"
            />
            {editErrors.address ? <Text style={styles.errorText}>{editErrors.address}</Text> : null}
            <TextInput
              style={[styles.input, editErrors.preferredStyle && styles.inputError]}
              placeholder="Preferred Style"
              placeholderTextColor="#666"
              value={editFields.preferredStyle}
              onChangeText={text => handleEditChange('preferredStyle', text)}
              accessibilityLabel="Edit preferred style"
            />
            {editErrors.preferredStyle ? <Text style={styles.errorText}>{editErrors.preferredStyle}</Text> : null}
            <TextInput
              style={[styles.input, editErrors.notes && styles.inputError]}
              placeholder="Notes"
              placeholderTextColor="#666"
              value={editFields.notes}
              onChangeText={text => handleEditChange('notes', text)}
              multiline
              accessibilityLabel="Edit notes"
            />
            {editErrors.notes ? <Text style={styles.errorText}>{editErrors.notes}</Text> : null}
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity
                style={[
                  styles.loyaltyButton,
                  editFields.loyaltyStatus === 'regular' && { backgroundColor: '#22C55E' },
                  editErrors.loyaltyStatus && styles.inputError,
                ]}
                onPress={() => handleEditChange('loyaltyStatus', 'regular')}
                accessibilityLabel="Set loyalty status to regular"
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Regular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.loyaltyButton,
                  editFields.loyaltyStatus === 'vip' && { backgroundColor: colors.gold },
                  editErrors.loyaltyStatus && styles.inputError,
                ]}
                onPress={() => handleEditChange('loyaltyStatus', 'vip')}
                accessibilityLabel="Set loyalty status to VIP"
              >
                <Text style={{ color: editFields.loyaltyStatus === 'vip' ? '#18181B' : '#fff', fontWeight: '600' }}>VIP</Text>
              </TouchableOpacity>
            </View>
            {editErrors.loyaltyStatus ? <Text style={styles.errorText}>{editErrors.loyaltyStatus}</Text> : null}
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
          <Ionicons name="calendar-outline" size={18} color={colors.gold} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Recent Appointments</Text>
        </View>
        {appointmentsLoading ? (
          <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 12 }} />
        ) : appointments.length > 0 ? (
          appointments
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .slice(0, 5)
            .map((apt) => (
              <View key={apt.id} style={styles.appointmentRow}>
                <View>
                  <Text style={styles.appointmentService}>{apt.service?.name}</Text>
                  <Text style={styles.appointmentDate}>
                    {utcToLocal(
                      typeof apt.scheduledAt === "string"
                        ? apt.scheduledAt
                        : "",
                      user?.timezone
                    ).toLocaleString()}
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
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.gold} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Message History ({messages.length})</Text>
        </View>
        {messagesLoading ? (
          <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 12 }} />
        ) : messages.length > 0 ? (
          <>
            {messages
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, showAllMessages ? messages.length : 5)
              .map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.messageRow}
                  onPress={() => {
                    // Navigate to messages tab and open modal for this message
                    router.push({
                      pathname: '/messages',
                      params: { messageId: msg.id.toString() }
                    });
                  }}
                  accessibilityLabel="View message details"
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.messageSubject,
                        !msg.read && { fontWeight: 'bold', color: colors.gold }
                      ]}
                    >
                      {msg.services?.join(', ') || msg.message?.slice(0, 20) || 'Message'}
                    </Text>
                    <Text style={styles.messageMeta}>
                      From: {msg.customerName} • {utcToLocal(
                        typeof msg.createdAt === "string"
                          ? msg.createdAt
                          : "",
                        user?.timezone
                      ).toLocaleString()}
                    </Text>
                  </View>
                  {msg.read ? (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: '#374151', alignSelf: 'flex-start' }
                    ]}>
                      <Text style={[styles.statusBadgeText, { color: '#9CA3AF' }]}>Read</Text>
                    </View>
                  ) : (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: colors.yellow, alignSelf: 'flex-start' }
                    ]}>
                      <Text style={[styles.statusBadgeText, { color: '#18181B' }]}>Unread</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            {messages.length > 5 && (
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: 8 }}
                onPress={() => setShowAllMessages(!showAllMessages)}
                accessibilityLabel="Show all messages"
              >
                <Text style={{ color: colors.gold, fontSize: 14 }}>
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
                <Text style={styles.modalMeta}>Date: {utcToLocal(
                  typeof messageModal.createdAt === "string"
                    ? messageModal.createdAt
                    : "",
                  user?.timezone
                ).toLocaleString()}</Text>
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
                  <Ionicons name="close" size={22} color={colors.gold} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Photo Gallery */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="images-outline" size={18} color={colors.gold} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Photo Gallery ({photos.length})</Text>
        </View>
        {photosLoading ? (
          <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 12 }} />
        ) : photos.length > 0 ? (
          <>
            <View style={styles.galleryGrid}>
              {photos
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, showAllPhotos ? photos.length : 5)
                .map((photo) => (
                  <View key={photo.id} style={styles.galleryItem}>
                    <Image
                      source={{ uri: photo.filename }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                      accessibilityLabel="Gallery photo"
                    />
                    <Text style={styles.galleryCaption}>
                      {photo.originalName ||
                        utcToLocal(
                          typeof photo.createdAt === "string"
                            ? photo.createdAt
                            : "",
                          user?.timezone
                        ).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
            </View>
            {photos.length > 5 && (
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: 8 }}
                onPress={() => setShowAllPhotos(!showAllPhotos)}
                accessibilityLabel="Show all photos"
              >
                <Text style={{ color: colors.gold, fontSize: 14 }}>
                  {showAllPhotos ? `Show recent 5` : `Show all ${photos.length} photos`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyBlock}>
            <Ionicons name="images-outline" size={32} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyBlockText}>No photos uploaded yet</Text>
          </View>
        )}
      </View>

      {/* Invoice History */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={18} color={colors.gold} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Invoice History ({invoices.length})</Text>
        </View>
        {invoicesLoading ? (
          <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 12 }} />
        ) : invoicesError ? (
          <Text style={{ color: '#F87171', marginBottom: 8 }}>{invoicesError}</Text>
        ) : invoices.length > 0 ? (
          <>
            {invoices
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, showAllInvoices ? invoices.length : 5)
              .map((invoice) => {
                let statusColor = '#F59E0B';
                let statusBg = '#232323';
                if (invoice.paymentStatus === 'paid') {
                  statusColor = '#22C55E';
                  statusBg = '#193a2f';
                } else if (invoice.paymentStatus === 'unpaid') {
                  statusColor = '#F59E0B';
                  statusBg = '#2d230f';
                }
                let iconName: any = 'receipt-outline';
                if (invoice.paymentMethod === 'stripe') iconName = 'card-outline';
                else if (invoice.paymentMethod === 'apple_pay') iconName = 'phone-portrait-outline';
                else if (invoice.paymentMethod === 'cash') iconName = 'cash-outline';

                const localDate = utcToLocal(
                  typeof invoice.createdAt === "string"
                    ? invoice.createdAt
                    : "",
                  user?.timezone
                );
                const dateStr = `${localDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${localDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

                return (
                  <TouchableOpacity
                    key={invoice.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#232323',
                      backgroundColor: '#1A1A1A',
                    }}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedInvoice(invoice);
                      setShowInvoiceModal(true);
                    }}
                    accessibilityLabel="View invoice details"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{
                        width: 34, height: 34, borderRadius: 17, backgroundColor: '#232323',
                        alignItems: 'center', justifyContent: 'center', marginRight: 10
                      }}>
                        <Ionicons name={iconName} size={18} color="#f59e0b" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                          Invoice #{invoice.id}
                        </Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                          {dateStr}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                      <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 15 }}>
                        ${invoice.total}
                      </Text>
                      <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                        <View style={{
                          backgroundColor: statusBg,
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          marginBottom: 2,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                          <Text style={{ color: statusColor, fontWeight: '600', fontSize: 10 }}>
                            {invoice.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
                          </Text>
                        </View>
                        {invoice.paymentMethod && (
                          <View style={{
                            backgroundColor: '#232323',
                            borderRadius: 4,
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                            marginBottom: 2,
                          }}>
                            <Text style={{ color: '#9CA3AF', fontWeight: '500', fontSize: 9 }}>
                              {invoice.paymentMethod === 'cash' ? 'Cash' :
                                invoice.paymentMethod === 'stripe' ? 'Card' :
                                  invoice.paymentMethod === 'apple_pay' ? 'Apple Pay' :
                                    invoice.paymentMethod}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            {invoices.length > 5 && (
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: 8 }}
                onPress={() => setShowAllInvoices(!showAllInvoices)}
                accessibilityLabel="Show all invoices"
              >
                <Text style={{ color: colors.gold, fontSize: 14 }}>
                  {showAllInvoices ? `Show recent 5` : `Show all ${invoices.length} invoices`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyBlock}>
            <Ionicons name="receipt-outline" size={32} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyBlockText}>No invoices yet</Text>
          </View>
        )}
      </View>

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        visible={showInvoiceModal && !!selectedInvoice}
        invoice={selectedInvoice}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedInvoice(null);
        }}
        client={client}
        onDelete={(invoiceId: number) => {
          setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
        }}
      />
    </ScrollView>
  );
}

// --- Invoice Details Modal ---
function InvoiceDetailsModal({
  visible,
  invoice,
  onClose,
  client,
  onDelete, // new prop
}: {
  visible: boolean;
  invoice: any;
  onClose: () => void;
  client: any;
  onDelete?: (invoiceId: number) => void;
}) {
  console.log('[InvoiceDetailsModal] useAuth called at top level');
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setLoading(true);
    setError(null);
    apiRequest<any>('GET', `/api/invoices/${invoice.id}`)
      .then((data) => {
        // Debug: log the full invoice data
        console.log('[ClientProfile/InvoiceDetailsModal] Loaded invoice data:', data);

        // Check all possible service arrays
        let found = null;
        if (Array.isArray(data.services) && data.services.length > 0) {
          found = data.services;
          console.log('[ClientProfile/InvoiceDetailsModal] Using data.services');
        } else if (Array.isArray(data.invoiceServices) && data.invoiceServices.length > 0) {
          found = data.invoiceServices;
          console.log('[ClientProfile/InvoiceDetailsModal] Using data.invoiceServices');
        } else if (Array.isArray(data.items) && data.items.length > 0) {
          found = data.items;
          console.log('[ClientProfile/InvoiceDetailsModal] Using data.items');
        } else {
          // Try to find any array property with service-like objects
          const possible = Object.entries(data).find(
            ([k, v]) =>
              Array.isArray(v) &&
              v.length > 0 &&
              typeof v[0] === 'object' &&
              (v[0].name || v[0].serviceName)
          );
          if (possible) {
            found = possible[1];
            console.log(`[ClientProfile/InvoiceDetailsModal] Using data.${possible[0]} (guessed)`);
          }
        }
        if (!found || found.length === 0) {
          console.warn('[ClientProfile/InvoiceDetailsModal] No service array found in invoice data', data);
        }
        setServices(found || []);
      })
      .catch((err) => {
        setError('Failed to load services');
        console.error('[ClientProfile/InvoiceDetailsModal] Error loading invoice:', err);
      })
      .finally(() => setLoading(false));
  }, [invoice]);

  // Mark as paid/unpaid (cash)
  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      await apiRequest('POST', `/api/invoices/${invoice.id}/mark-paid`);
      onClose();
      Alert.alert('Success', 'Invoice marked as paid');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to mark as paid');
    }
    setMarking(false);
  };
  const handleUndoPayment = async () => {
    setMarking(true);
    try {
      await apiRequest('POST', `/api/invoices/${invoice.id}/undo-payment`);
      onClose();
      Alert.alert('Success', 'Payment status reset');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to undo payment');
    }
    setMarking(false);
  };

  // Send SMS/Email
  const handleSendSMS = async () => {
    setSendingSMS(true);
    try {
      await apiRequest('POST', `/api/invoices/${invoice.id}/send-sms`);
      Alert.alert('Success', 'Invoice sent via SMS');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send SMS');
    }
    setSendingSMS(false);
  };
  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await apiRequest('POST', `/api/invoices/${invoice.id}/send-email`);
      Alert.alert('Success', 'Invoice sent via email');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send email');
    }
    setSendingEmail(false);
  };

  // Delete invoice
  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiRequest('DELETE', `/api/invoices/${invoice.id}`);
              if (onDelete) onDelete(invoice.id);
              onClose();
              Alert.alert('Deleted', 'Invoice deleted successfully.');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete invoice');
            }
            setDeleting(false);
          },
        },
      ]
    );
  };

  // Null check for invoice
  if (!invoice) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 440, alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={colors.gold} style={{ marginVertical: 16 }} />
            <Text style={{ color: '#fff', fontSize: 16, marginTop: 12 }}>No invoice selected</Text>
            <TouchableOpacity
              style={[styles.iconButton, { alignSelf: 'center', marginTop: 18 }]}
              onPress={onClose}
              accessibilityLabel="Close invoice modal"
            >
              <Ionicons name="close" size={22} color={colors.gold} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxWidth: 440 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invoice Details</Text>
            <TouchableOpacity
              style={[styles.iconButton, { alignSelf: 'flex-end', marginTop: 2 }]}
              onPress={onClose}
              accessibilityLabel="Close invoice modal"
            >
              <Ionicons name="close" size={22} color={colors.gold} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalMeta}>Invoice #{invoice?.id}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 12 }} />
          ) : error ? (
            <Text style={{ color: '#F87171', marginBottom: 8 }}>{error}</Text>
          ) : (
            <>
              {/* Client Info */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Client</Text>
                <Text style={styles.infoBlockText}>{client?.name || 'Unknown Client'}</Text>
                {client?.phone ? (
                  <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }}>{client.phone}</Text>
                ) : null}
                {client?.email ? (
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>{client.email}</Text>
                ) : null}
              </View>
              {/* Services */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Services</Text>
                {services.length === 0 ? (
                  <Text style={styles.infoBlockText}>
                    No services found for this invoice.
                    {'\n'}
                    (Check console for details. If this is unexpected, the invoice may be missing service data.)
                  </Text>
                ) : (
                  <View>
                    {services.map((svc, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                          borderBottomWidth: idx !== services.length - 1 ? 1 : 0,
                          borderBottomColor: '#232323',
                          paddingBottom: 4,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                            {svc.service?.name || svc.name || svc.serviceName || 'Unnamed Service'}
                          </Text>
                          {(svc.service?.description || svc.description) ? (
                            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                              {svc.service?.description || svc.description}
                            </Text>
                          ) : null}
                          {svc.quantity && svc.quantity > 1 ? (
                            <Text style={{ color: colors.gold, fontSize: 12 }}>x{svc.quantity}</Text>
                          ) : null}
                        </View>
                        <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 15 }}>
                          ${((parseFloat(svc.price) || 0) * (svc.quantity || 1)).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {/* Details */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Details</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.infoBlockText}>Subtotal:</Text>
                  <Text style={styles.infoBlockText}>${invoice.subtotal}</Text>
                </View>
                {invoice.tip && parseFloat(invoice.tip) > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.infoBlockText}>Tip:</Text>
                    <Text style={styles.infoBlockText}>${invoice.tip}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.infoBlockText, { fontWeight: 'bold', color: colors.gold }]}>Total:</Text>
                  <Text style={[styles.infoBlockText, { fontWeight: 'bold', color: colors.gold }]}>${invoice.total}</Text>
                </View>
              </View>
              {/* Payment Method */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Payment Method</Text>
                <Text style={styles.infoBlockText}>
                  {invoice.paymentMethod === 'stripe'
                    ? 'Card'
                    : invoice.paymentMethod === 'apple_pay'
                    ? 'Apple Pay'
                    : invoice.paymentMethod === 'cash'
                    ? 'Cash'
                    : 'Pending'}
                </Text>
              </View>
              {/* Payment Status */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Payment Status</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[
                    styles.infoBlockText,
                    invoice.paymentStatus === 'paid'
                      ? { color: '#22C55E', fontWeight: 'bold' }
                      : { color: '#FFD700', fontWeight: 'bold' }
                  ]}>
                    {invoice.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </Text>
                  {invoice.paymentMethod === 'cash' && (
                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        invoice.paymentStatus === 'paid'
                          ? { backgroundColor: '#F87171' }
                          : { backgroundColor: '#22C55E' },
                        { marginLeft: 8 }
                      ]}
                      onPress={invoice.paymentStatus === 'paid' ? handleUndoPayment : handleMarkPaid}
                      disabled={marking}
                    >
                      <Text style={{ color: '#18181B', fontWeight: 'bold' }}>
                        {marking
                          ? '...'
                          : invoice.paymentStatus === 'paid'
                          ? 'Mark Unpaid'
                          : 'Mark Paid'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {/* Created Date */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Created</Text>
                <Text style={styles.infoBlockText}>
                  {invoice.createdAt
                    ? utcToLocal(
                        typeof invoice.createdAt === "string"
                          ? invoice.createdAt
                          : "",
                        user?.timezone
                      ).toLocaleString()
                    : 'Unknown'}
                </Text>
              </View>
              {/* Send Invoice Actions */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Send Invoice</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={[
                      styles.iconButton,
                      { backgroundColor: '#2563EB', marginRight: 8, flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
                    ]}
                    onPress={handleSendSMS}
                    disabled={sendingSMS}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{sendingSMS ? '...' : 'Send SMS'}</Text>
                  </TouchableOpacity>
                  {client?.email && (
                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        { backgroundColor: '#22C55E', flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
                      ]}
                      onPress={handleSendEmail}
                      disabled={sendingEmail}
                    >
                      <Ionicons name="mail-outline" size={18} color="#18181B" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#18181B', fontWeight: 'bold' }}>{sendingEmail ? '...' : 'Send Email'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {/* Trash Can Button */}
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    { backgroundColor: '#F87171', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 160 }
                  ]}
                  onPress={handleDeleteInvoice}
                  disabled={deleting}
                  accessibilityLabel="Delete invoice"
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    {deleting ? 'Deleting...' : 'Delete Invoice'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Hide the default navigation header/title
export const screenOptions = {
  headerShown: false,
};

const styles = StyleSheet.create({
  summaryErrorText: {
    color: '#F87171',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 50 : 50,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 20,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.gold,
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
    color: colors.white,
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
    color: colors.gold,
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
    color: colors.gold,
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
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  modalPlaceholderText: {
    color: '#737b89', // steel
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});