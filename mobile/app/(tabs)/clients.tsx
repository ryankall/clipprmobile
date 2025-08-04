import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, Image } from 'react-native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { utcToLocal } from '../../lib/utils';
import { apiRequest } from '../../lib/api';
import { ClientWithStats } from '../../lib/types';
import { ClientAnalytics } from '../../lib/types';
import { clientFormSchema } from '../../lib/clientSchema';
import { theme, colors } from '../../lib/theme';
import { z } from 'zod';
import ValidatedRequiredTextInput from '../components/InputValidations'

/** Centralized color palette for consistent theming across tabs */
const COLORS = {
  background: '#0F0F0F',
  card: '#18181B',
  cardAlt: '#1A1A1A',
  cardDeep: '#23232A',
  cardDeeper: '#2e2e2e',
  border: '#374151',
  borderAlt: '#37415155',
  steel: '#9CA3AF',
  steelAlt: '#737b89',
  white: '#FFFFFF',
  gold: '#F59E0B',
  goldBg: '#F59E0B22',
  green: '#22C55E',
  blue: '#3B82F6',
  purple: '#A78BFA',
  red: '#EF4444',
  charcoal: '#1e1e1e',
  black: '#18181B',
  vip: '#FFD700',
};

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  // Collapsible analytics state
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);

  const toggleAnalytics = () => {
    const next = !analyticsExpanded;
    setAnalyticsExpanded(next);
    console.log('[Analytics] Toggling analyticsExpanded:', next);
  };
  // Add Client Modal State (top-level)
  // (Removed duplicate imports for clientFormSchema and z)

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addLoyaltyStatus, setAddLoyaltyStatus] = useState<'regular' | 'vip'>('regular');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addFieldErrors, setAddFieldErrors] = useState<{ [key: string]: string }>({});
// --- Add Client Modal State ---

  // --- Edit Client Modal State ---
  const [editClient, setEditClient] = useState<ClientWithStats | null>(null);
  const [detailClient, setDetailClient] = useState<ClientWithStats | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoyaltyStatus, setEditLoyaltyStatus] = useState<'regular' | 'vip'>('regular');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<{ [key: string]: string }>({});

  // --- Appointments Modal State ---
  const [appointmentsClient, setAppointmentsClient] = useState<ClientWithStats | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // --- Messages Modal State ---
  const [messagesClient, setMessagesClient] = useState<ClientWithStats | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // --- Gallery Modal State ---
  const [galleryClient, setGalleryClient] = useState<ClientWithStats | null>(null);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const openEditModal = (client: ClientWithStats) => {
    setEditClient(client);
    setEditName(client.name);
    setEditPhone(client.phone || '');
    setEditEmail(client.email || '');
    setEditAddress(client.address || '');
    setEditNotes(client.notes || '');
    setEditLoyaltyStatus(client.loyaltyStatus === 'vip' ? 'vip' : 'regular');
    setEditError(null);
    setEditFieldErrors({});
  };

  const closeEditModal = () => {
    setEditClient(null);
    setEditName('');
    setEditPhone('');
    setEditEmail('');
    setEditAddress('');
    setEditNotes('');
    setEditLoyaltyStatus('regular');
    setEditError(null);
    setEditFieldErrors({});
    setEditLoading(false);
  };

  const handleEditSave = async () => {
    if (!editClient) return;
    setEditLoading(true);
    setEditError(null);
    setEditFieldErrors({});
    // Validate with zod
    const result = clientFormSchema.safeParse({
      name: editName,
      phone: editPhone,
      email: editEmail,
      address: editAddress,
      notes: editNotes,
      loyaltyStatus: editLoyaltyStatus,
    });
    if (!result.success) {
      // Set field errors
      const fieldErrors: { [key: string]: string } = {};
      for (const err of result.error.issues) {
        if (err.path && err.path[0] && typeof err.path[0] === "string") {
          fieldErrors[err.path[0]] = err.message;
        }
      }
      setEditFieldErrors(fieldErrors);
      setEditLoading(false);
      return;
    }
    try {
      const updated = {
        ...editClient,
        name: editName,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        notes: editNotes,
        loyaltyStatus: editLoyaltyStatus,
      };
      await apiRequest('PUT', `/api/clients/${editClient.id}`, updated);
      setClients(clients =>
        clients.map(c => (c.id === editClient.id ? { ...c, ...updated } : c))
      );
      closeEditModal();
    } catch (error) {
      setEditError('Failed to update client');
      setEditLoading(false);
    }
  };

  // --- Appointments Modal Logic ---
  const openAppointmentsModal = async (client: ClientWithStats) => {
    setAppointmentsClient(client);
    setAppointmentsLoading(true);
    try {
      const data = await apiRequest<any[]>('GET', `/api/clients/${client.id}/appointments?limit=10`);
      setAppointments(data);
    } catch (error) {
      setAppointments([]);
    }
    setAppointmentsLoading(false);
  };

  const closeAppointmentsModal = () => {
    setAppointmentsClient(null);
    setAppointments([]);
    setAppointmentsLoading(false);
  };

  // --- Messages Modal Logic ---
  const openMessagesModal = async (client: ClientWithStats) => {
    setMessagesClient(client);
    setMessagesLoading(true);
    try {
      const data = await apiRequest<any[]>('GET', `/api/clients/${client.id}/messages?limit=20`);
      setMessages(data);
    } catch (error) {
      setMessages([]);
    }
    setMessagesLoading(false);
  };

  const closeMessagesModal = () => {
    setMessagesClient(null);
    setMessages([]);
    setMessagesLoading(false);
  };

  // --- Gallery Modal Logic ---
  const openGalleryModal = async (client: ClientWithStats) => {
    setGalleryClient(client);
    setGalleryLoading(true);
    try {
      const data = await apiRequest<any[]>('GET', `/api/clients/${client.id}/gallery`);
      setGalleryImages(data);
    } catch (error) {
      setGalleryImages([]);
    }
    setGalleryLoading(false);
  };

  const closeGalleryModal = () => {
    setGalleryClient(null);
    setGalleryImages([]);
    setGalleryLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadClients();
      loadAnalytics();
    }
  }, [isAuthenticated]);

  const loadClients = async () => {
    try {
      const data = await apiRequest<ClientWithStats[]>('GET', '/api/clients');
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const data = await apiRequest<any>('GET', '/api/clients/stats');
      //console.log('[Analytics] Raw API response:', data);
      // Normalize keys to camelCase if needed
      const normalized: ClientAnalytics = {
        bigSpenders: Array.isArray(data.bigSpenders)
          ? data.bigSpenders
          : Array.isArray(data.big_spenders)
            ? data.big_spenders
            : [],
        mostVisited: Array.isArray(data.mostVisited)
          ? data.mostVisited
          : Array.isArray(data.most_visited)
            ? data.most_visited
            : [],
        biggestTippers: Array.isArray(data.biggestTippers)
          ? data.biggestTippers
          : Array.isArray(data.biggest_tippers)
            ? data.biggest_tippers
            : [],
      };

      // Log if any key was missing or mapped from snake_case
      if (!Array.isArray(data.bigSpenders) && Array.isArray(data.big_spenders)) {
        console.log('[Analytics] Mapped big_spenders to bigSpenders');
      }
      if (!Array.isArray(data.mostVisited) && Array.isArray(data.most_visited)) {
        console.log('[Analytics] Mapped most_visited to mostVisited');
      }
      if (!Array.isArray(data.biggestTippers) && Array.isArray(data.biggest_tippers)) {
        console.log('[Analytics] Mapped biggest_tippers to biggestTippers');
      }
      if (
        !Array.isArray(normalized.bigSpenders) ||
        !Array.isArray(normalized.mostVisited) ||
        !Array.isArray(normalized.biggestTippers)
      ) {
        console.warn('[Analytics] One or more analytics keys missing or not arrays', normalized);
      }
      setAnalytics(normalized);
    } catch (error) {
      console.error('[Analytics] Error loading analytics:', error);
      setAnalyticsError('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientBadge = (client: ClientWithStats) => {
    const totalSpent = parseFloat(client.totalSpent || '0');
    if (totalSpent >= 500) return { label: 'VIP', color: COLORS.gold };
    if (totalSpent >= 200) return { label: 'Gold', color: COLORS.green };
    if (client.totalVisits >= 10) return { label: 'Regular', color: COLORS.blue };
    return { label: 'New', color: COLORS.steel };
  };

  const renderClient = ({ item, user }: { item: ClientWithStats, user: any }) => {
    const badge = getClientBadge(item);
    const lastVisit = item.lastVisit
      ? utcToLocal(
          typeof item.lastVisit === "string"
            ? item.lastVisit
            : (typeof item.lastVisit === "object" && item.lastVisit !== null && "toISOString" in item.lastVisit)
              ? (item.lastVisit as Date).toISOString()
              : "",
          user?.timezone
        ).toLocaleDateString()
      : null;
    const initials = item.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const isVIP = badge.label === 'VIP';

    return (
      <TouchableOpacity
        style={theme.clientCard}
        onPress={() => router.push({ pathname: '/clients/[id]', params: { id: item.id.toString() } })}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={styles.clientName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
              {isVIP && (
                <View style={styles.vipBadge}>
                  <Ionicons name="star" size={14} color={colors.blue} style={{ marginRight: 2 }} />
                  <Text style={styles.badgeText}>VIP</Text>
                </View>
              )}
            </View>
            {item.phone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Ionicons name="call-outline" size={14} color={COLORS.steel} style={{ marginRight: 4 }} />
                <Text style={styles.clientPhone}>{item.phone}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              {item.totalVisits > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.blue} style={{ marginRight: 2 }} />
                  <Text style={styles.statText}>{item.totalVisits} visit{item.totalVisits !== 1 ? 's' : ''}</Text>
                </View>
              )}
              {parseFloat(item.totalSpent || '0') > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="cash-outline" size={14} color={colors.green} style={{ marginRight: 2 }} />
                  <Text style={[styles.statText, { color: colors.gold }]}>${parseFloat(item.totalSpent).toFixed(2)}</Text>
                </View>
              )}
              {lastVisit && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={14} color={COLORS.steel} style={{ marginRight: 2 }} />
                  <Text style={styles.statText}>Last: {lastVisit}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.steel} style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authPromptText}>Please sign in to access your clients</Text>
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
      {/* Add Client Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
          }}>
            {/* ...modal content unchanged... */}
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' }}>
              Add New Client
            </Text>
            <ValidatedRequiredTextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="Name"
              placeholderTextColor="#666"
              value={addName}
              onTextChange={setAddName}
              required={true}
              autoFocus
              accessibilityLabel="Add client name"
              maxLength={30}
            />
            <ValidatedRequiredTextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="Phone"
              placeholderTextColor="#666"
              value={addPhone}
              onTextChange={setAddPhone}
              required={true}
              type='phone'
              keyboardType="phone-pad"
              accessibilityLabel="Add client phone"
            />
            <ValidatedRequiredTextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="Email"
              placeholderTextColor="#666"
              value={addEmail}
              onTextChange={setAddEmail}
              type='email'
              maxLength={60}
              keyboardType="email-address"
              accessibilityLabel="Add client email"
            />
            <TextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="Address"
              placeholderTextColor="#666"
              value={addAddress}
              onChangeText={text => {
                setAddAddress(text);
                setAddFieldErrors(prev => ({ ...prev, address: '' }));
              }}
              accessibilityLabel="Add client address"
            />
            {addFieldErrors.address ? (
              <Text style={{ color: '#F87171', marginBottom: 4 }}>{addFieldErrors.address}</Text>
            ) : null}
            <TextInput
              style={[styles.searchInput, { marginBottom: 12, minHeight: 40 }]}
              placeholder="Notes"
              placeholderTextColor="#666"
              value={addNotes}
              onChangeText={setAddNotes}
              multiline
              accessibilityLabel="Add client notes"
              maxLength={200}
            />
            {/* Loyalty Status Picker */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#fff', marginBottom: 4 }}>Loyalty Status</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: addLoyaltyStatus === 'regular' ? '#22C55E' : '#374151',
                      flex: 1,
                      marginRight: 8,
                    },
                  ]}
                  onPress={() => setAddLoyaltyStatus('regular')}
                  accessibilityLabel="Set loyalty status to regular"
                >
                  <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Regular</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: addLoyaltyStatus === 'vip' ? '#FFD700' : '#374151',
                      flex: 1,
                    },
                  ]}
                  onPress={() => setAddLoyaltyStatus('vip')}
                  accessibilityLabel="Set loyalty status to VIP"
                >
                  <Text style={{ color: addLoyaltyStatus === 'vip' ? '#18181B' : '#fff', fontWeight: '600', textAlign: 'center' }}>VIP</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: '#374151', flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setAddModalVisible(false);
                  setAddName('');
                  setAddPhone('');
                  setAddEmail('');
                  setAddAddress('');
                  setAddNotes('');
                  setAddLoyaltyStatus('regular');
                  setAddError(null);
                  setAddFieldErrors({});
                  setAddLoading(false);
                }}
                accessibilityLabel="Cancel add client"
              >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { flex: 1, opacity: addLoading ? 0.7 : 1 }]}
                onPress={async () => {
                  if (addLoading) return;
                  setAddLoading(true);
                  setAddError(null);
                  setAddFieldErrors({});
                  // Validate with zod
                  const result = clientFormSchema.safeParse({
                    name: addName,
                    phone: addPhone,
                    email: addEmail,
                    address: addAddress,
                    notes: addNotes,
                    loyaltyStatus: addLoyaltyStatus,
                  });
                  if (!result.success) {
                    // Set field errors
                    const fieldErrors: { [key: string]: string } = {};
                    for (const err of result.error.issues) {
                      if (err.path && err.path[0]) {
                        if (typeof err.path[0] === "string") {
                          fieldErrors[err.path[0]] = err.message;
                        }
                      }
                    }
                    setAddFieldErrors(fieldErrors);
                    setAddLoading(false);
                    return;
                  }
                  try {
                    // Optionally call API to create client, but for now just update local state
                    // You may want to POST to /api/clients here
                    const newClient: ClientWithStats = {
                      id: Date.now(), // Temporary ID; in real app, use API response
                      userId: 0,
                      name: addName.trim(),
                      phone: addPhone.trim(),
                      email: addEmail.trim(),
                      address: addAddress.trim(),
                      notes: addNotes.trim(),
                      loyaltyStatus: addLoyaltyStatus,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      totalSpent: '0',
                      totalVisits: 0,
                      lastVisit: null,
                    };
                    setClients(prev => [newClient, ...prev]);
                    setAddModalVisible(false);
                    setAddName('');
                    setAddPhone('');
                    setAddEmail('');
                    setAddAddress('');
                    setAddNotes('');
                    setAddLoyaltyStatus('regular');
                    setAddError(null);
                    setAddFieldErrors({});
                  } catch (e) {
                    setAddError('Failed to add client');
                  }
                  setAddLoading(false);
                }}
                accessibilityLabel="Confirm add client"
              >
                <Text style={{ color: colors.black, fontWeight: '600', textAlign: 'center' }}>
                  {addLoading ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End Add Client Modal */}

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 32 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* --- Analytics Section --- */}
        <View style={{ marginBottom: 24, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryValue}>{clients.length}</Text>
              <Text style={styles.summaryLabel}>Total Clients</Text>
            </View>
            <View style={[styles.summaryCard, { flex: 1 }]}>
              <Text style={styles.summaryValue}>
                {clients.filter(c => c.loyaltyStatus === 'vip').length}
              </Text>
              <Text style={styles.summaryLabel}>VIP Clients</Text>
            </View>
          </View>
          <View style={styles.analyticsCard}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: analyticsExpanded ? 8 : 0 }}
              onPress={() => {
                console.log('[Analytics] Analytics card header pressed');
                toggleAnalytics();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={analyticsExpanded ? "Collapse analytics" : "Expand analytics"}
            >
              <Text style={styles.analyticsTitle}>Top 10 Client Analytics</Text>
              <View
                style={{
                  transform: [
                    {
                      rotate: analyticsExpanded ? '0deg' : '180deg',
                    },
                  ],
                }}
              >
                <Ionicons name="chevron-down" size={24} color={colors.white} />
              </View>
            </TouchableOpacity>
            {analyticsExpanded && (
              <>
                {analyticsLoading ? (
                  <View style={{ alignItems: 'center', padding: 24 }}>
                    <Ionicons name="trending-up" size={32} color={COLORS.vip} style={{ marginBottom: 8 }} />
                    <Text style={{ color: COLORS.steel }}>Loading analytics...</Text>
                  </View>
                ) : analyticsError ? (
                  <View style={{ alignItems: 'center', padding: 24 }}>
                    <Ionicons name="alert-circle-outline" size={32} color={COLORS.red} style={{ marginBottom: 8 }} />
                    <Text style={{ color: COLORS.red }}>{analyticsError}</Text>
                  </View>
                ) : analytics && (
                  (() => {
                    const hasBigSpenders = Array.isArray(analytics.bigSpenders) && analytics.bigSpenders.length > 0;
                    const hasMostVisited = Array.isArray(analytics.mostVisited) && analytics.mostVisited.length > 0;
                    const hasBiggestTippers = Array.isArray(analytics.biggestTippers) && analytics.biggestTippers.length > 0;
                    if (!hasBigSpenders && !hasMostVisited && !hasBiggestTippers) {
                      return (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                          <Ionicons name="bar-chart-outline" size={32} color={COLORS.steel} style={{ marginBottom: 8 }} />
                          <Text style={{ color: COLORS.steel, fontSize: 15, textAlign: 'center' }}>
                            No analytics data available yet.
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View>
                        {/* Big Spenders */}
                        {hasBigSpenders && (
                          <>
                            <View style={styles.analyticsSectionHeader}>
                              <Ionicons name="cash-outline" size={20} color={COLORS.green} style={{ marginRight: 6 }} />
                              <Text style={styles.analyticsSectionTitle}>Big Spenders</Text>
                            </View>
                            {analytics.bigSpenders.slice(0, 5).map((client, idx) => (
                              <View key={client.name + idx} style={styles.analyticsRowWeb}>
                                <View style={styles.analyticsRankCircleWeb}>
                                  <Text style={styles.analyticsRankTextWeb}>{idx + 1}</Text>
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text style={styles.analyticsClientNameWeb} numberOfLines={1} ellipsizeMode="tail">{client.name}</Text>
                                  <Text style={styles.analyticsSubLabelWeb}>{client.appointmentCount} appointments</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={styles.analyticsValueWeb}>${client.totalSpent}</Text>
                                </View>
                              </View>
                            ))}
                          </>
                        )}

                        {/* Most Visited */}
                        {hasMostVisited && (
                          <>
                            <View style={styles.analyticsSectionHeader}>
                              <Ionicons name="calendar-outline" size={20} color={COLORS.blue} style={{ marginRight: 6 }} />
                              <Text style={styles.analyticsSectionTitle}>Most Visited</Text>
                            </View>
                            {analytics.mostVisited.slice(0, 5).map((client, idx) => (
                              <View key={client.name + idx} style={styles.analyticsRowWeb}>
                                <View style={styles.analyticsRankCircleWeb}>
                                  <Text style={styles.analyticsRankTextWeb}>{idx + 1}</Text>
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text style={styles.analyticsClientNameWeb} numberOfLines={1} ellipsizeMode="tail">{client.name}</Text>
                                  <Text style={styles.analyticsSubLabelWeb}>
                                    {client.lastVisit
                                      ? `Last: ${
                                          utcToLocal(
                                            typeof client.lastVisit === "string"
                                              ? client.lastVisit
                                              : (typeof client.lastVisit === "object" && client.lastVisit !== null && "toISOString" in client.lastVisit)
                                                ? (client.lastVisit as Date).toISOString()
                                                : "",
                                            user?.timezone
                                          ).toLocaleDateString()
                                        }`
                                      : ''}
                                  </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={styles.analyticsValueWebVisits}>{client.totalVisits} visits</Text>
                                </View>
                              </View>
                            ))}
                          </>
                        )}

                        {/* Biggest Tippers */}
                        {hasBiggestTippers && (
                          <>
                            <View style={styles.analyticsSectionHeader}>
                              <Ionicons name="star-outline" size={20} color={COLORS.vip} style={{ marginRight: 6 }} />
                              <Text style={styles.analyticsSectionTitle}>Biggest Tippers</Text>
                            </View>
                            {analytics.biggestTippers.slice(0, 5).map((client, idx) => (
                              <View key={client.name + idx} style={styles.analyticsRowWeb}>
                                <View style={styles.analyticsRankCircleWeb}>
                                  <Text style={styles.analyticsRankTextWeb}>{idx + 1}</Text>
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text style={styles.analyticsClientNameWeb} numberOfLines={1} ellipsizeMode="tail">{client.name}</Text>
                                  <Text style={styles.analyticsSubLabelWeb}>{client.tipPercentage}% average</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={styles.analyticsValueWebTips}>${client.totalTips}</Text>
                                </View>
                              </View>
                            ))}
                          </>
                        )}
                      </View>
                    );
                  })()
                )}
              </>
            )}
          </View>
        </View>
        {/* --- End Analytics Section --- */}

        {/* Header, Search, List Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Clients</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
            accessibilityLabel="Open add client modal"
          >
            <Ionicons name="add" size={24} color={colors.black} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            All Clients ({clients.length})
          </Text>
        </View>

        {/* Client List or Empty State */}
        {filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={COLORS.steel} />
            <Text style={styles.emptyText}>No clients found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first client to get started'}
            </Text>
          </View>
        ) : (
          filteredClients.map((item) => (
            <React.Fragment key={item.id}>
              {renderClient({ item, user })}
            </React.Fragment>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  addButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    padding: 12
  },
  searchContainer: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: COLORS.cardDeeper,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 16,
  },
  listContainer: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 12,
    padding: 16,
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 20,
  },
  clientCard: {
    backgroundColor: COLORS.cardDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.border,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: COLORS.cardDeep,
    overflow: 'hidden',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  clientInfo: {
    flex: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.goldBg,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: 0.2,
  },
  clientPhone: {
    fontSize: 14,
    color: COLORS.steel,
    marginBottom: 4,
  },
  clientStats: {
    gap: 2,
  },
  statText: {
    fontSize: 14,
    color: COLORS.steel,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.steel,
    textAlign: 'center',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  vipBadgeText: {
    color: colors.green,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authPromptText: {
    fontSize: 18,
    color: COLORS.steel,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // --- Analytics and Summary Styles ---
  summaryCard: {
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 14,
    borderWidth: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gold,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.steel,
  },
  analyticsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,

    marginBottom: 0,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardDeep,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.cardDeep,
  },
  analyticsRankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  analyticsRankText: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 14,
  },
  analyticsClientName: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
    marginRight: 8,
    maxWidth: 100,
  },
  analyticsValue: {
    color: COLORS.green,
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 8,
  },
  analyticsSubValue: {
    color: COLORS.steel,
    fontSize: 12,
    marginLeft: 2,
  },
  analyticsEmpty: {
    color: COLORS.steel,
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 4,
    textAlign: 'center',
  },
  // --- End Analytics and Summary Styles ---
  analyticsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
    gap: 4,
  },
  analyticsSectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 0.1,
  },
  analyticsRowWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardDeep,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D2D36',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  analyticsRankCircleWeb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  analyticsRankTextWeb: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 15,
  },
  analyticsClientNameWeb: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
    maxWidth: 120,
  },
  analyticsValueWeb: {
    color: COLORS.green,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  analyticsValueWebVisits: {
    color: COLORS.blue,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  analyticsValueWebTips: {
    color: COLORS.vip,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  analyticsSubLabelWeb: {
    color: COLORS.steel,
    fontSize: 12,
    marginTop: -2,
    marginBottom: 0,
  }
});