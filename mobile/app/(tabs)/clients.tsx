import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal, Image, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { ClientWithStats } from '../../lib/types';
import { ClientAnalytics } from '../../lib/types';
import { clientFormSchema } from '../../lib/clientSchema';
import { z } from 'zod';

/**
 * AnimatedAnalyticsContent: Animates height between 0 and measured content height.
 */
function AnimatedAnalyticsContent({
  expanded,
  animation,
  children,
}: {
  expanded: boolean;
  animation: Animated.AnimatedInterpolation<string | number>;
  children: React.ReactNode;
}) {
  const [contentHeight, setContentHeight] = React.useState(0);
  const containerRef = React.useRef(null);

  // Animate to 0 or contentHeight
  const animatedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  return (
    <Animated.View style={{ overflow: 'hidden', height: animatedHeight, opacity: animation }}>
      <View
        ref={containerRef}
        onLayout={e => {
          if (e.nativeEvent.layout.height !== contentHeight) {
            setContentHeight(e.nativeEvent.layout.height);
          }
        }}
        style={expanded ? undefined : { position: 'absolute', opacity: 0, zIndex: -1, height: 0 }}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        {children}
      </View>
    </Animated.View>
  );
}
export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Collapsible analytics state
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const analyticsAnim = useRef(new Animated.Value(1)).current; // 1 = expanded, 0 = collapsed

  const toggleAnalytics = () => {
    setAnalyticsExpanded((prev) => {
      Animated.timing(analyticsAnim, {
        toValue: prev ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return !prev;
    });
 
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
      const data = await apiRequest<ClientAnalytics>('GET', '/api/clients/stats');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
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
    if (totalSpent >= 500) return { label: 'VIP', color: '#F59E0B' };
    if (totalSpent >= 200) return { label: 'Gold', color: '#22C55E' };
    if (client.totalVisits >= 10) return { label: 'Regular', color: '#3B82F6' };
    return { label: 'New', color: '#9CA3AF' };
  };

  const renderClient = ({ item }: { item: ClientWithStats }) => {
    const badge = getClientBadge(item);
    const lastVisit = item.lastVisit ? new Date(item.lastVisit).toLocaleDateString() : null;
    const initials = item.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const isVIP = badge.label === 'VIP';

    return (
      <TouchableOpacity
        style={styles.clientCard}
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
                  <Ionicons name="star" size={14} color="#18181B" style={{ marginRight: 2 }} />
                  <Text style={styles.badgeText}>VIP</Text>
                </View>
              )}
            </View>
            {item.phone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Ionicons name="call-outline" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={styles.clientPhone}>{item.phone}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              {item.totalVisits > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="calendar-outline" size={14} color="#3B82F6" style={{ marginRight: 2 }} />
                  <Text style={styles.statText}>{item.totalVisits} visit{item.totalVisits !== 1 ? 's' : ''}</Text>
                </View>
              )}
              {parseFloat(item.totalSpent || '0') > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="cash-outline" size={14} color="#FFD700" style={{ marginRight: 2 }} />
                  <Text style={[styles.statText, { color: '#FFD700' }]}>${parseFloat(item.totalSpent).toFixed(2)}</Text>
                </View>
              )}
              {lastVisit && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" style={{ marginRight: 2 }} />
                  <Text style={styles.statText}>Last: {lastVisit}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#9CA3AF" style={{ marginLeft: 8 }} />
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
            backgroundColor: '#18181B',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' }}>
              Add New Client
            </Text>
            <TextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="Name"
              placeholderTextColor="#666"
              value={addName}
              onChangeText={text => {
                setAddName(text);
                setAddFieldErrors(prev => ({ ...prev, name: '' }));
              }}
              autoFocus
              accessibilityLabel="Add client name"
            />
            {addFieldErrors.name ? (
              <Text style={{ color: '#F87171', marginBottom: 4 }}>{addFieldErrors.name}</Text>
            ) : null}
            <TextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="Phone"
              placeholderTextColor="#666"
              value={addPhone}
              onChangeText={text => {
                setAddPhone(text);
                setAddFieldErrors(prev => ({ ...prev, phone: '' }));
              }}
              keyboardType="phone-pad"
              accessibilityLabel="Add client phone"
            />
            {addFieldErrors.phone ? (
              <Text style={{ color: '#F87171', marginBottom: 4 }}>{addFieldErrors.phone}</Text>
            ) : null}
            <TextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="Email"
              placeholderTextColor="#666"
              value={addEmail}
              onChangeText={text => {
                setAddEmail(text);
                setAddFieldErrors(prev => ({ ...prev, email: '' }));
              }}
              keyboardType="email-address"
              accessibilityLabel="Add client email"
            />
            {addFieldErrors.email ? (
              <Text style={{ color: '#F87171', marginBottom: 4 }}>{addFieldErrors.email}</Text>
            ) : null}
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
            {addError ? (
              <Text style={{ color: '#F87171', marginBottom: 8, textAlign: 'center' }}>{addError}</Text>
            ) : null}
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
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
                  {addLoading ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End Add Client Modal */}
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, styles.list]}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Clients</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setAddModalVisible(true)}
                accessibilityLabel="Open add client modal"
              >
                <Ionicons name="add" size={24} color="white" />
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

            {/* --- Analytics Section --- */}
            <View style={{ marginBottom: 24 }}>
              {/* Summary Cards */}
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
              {/* Analytics Cards */}
              <View style={styles.analyticsCard}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: analyticsExpanded ? 8 : 0 }}
                  onPress={toggleAnalytics}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={analyticsExpanded ? "Collapse analytics" : "Expand analytics"}
                >
                  <Text style={styles.analyticsTitle}>Top 10 Client Analytics</Text>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: analyticsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['180deg', '0deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons name="chevron-down" size={24} color="#FFD700" />
                  </Animated.View>
                </TouchableOpacity>
                <AnimatedAnalyticsContent
                  expanded={analyticsExpanded}
                  animation={analyticsAnim}
                >
                  {analyticsLoading ? (
                    <View style={{ alignItems: 'center', padding: 24 }}>
                      <Ionicons name="trending-up" size={32} color="#FFD700" style={{ marginBottom: 8 }} />
                      <Text style={{ color: '#9CA3AF' }}>Loading analytics...</Text>
                    </View>
                  ) : analyticsError ? (
                    <View style={{ alignItems: 'center', padding: 24 }}>
                      <Ionicons name="alert-circle-outline" size={32} color="#F87171" style={{ marginBottom: 8 }} />
                      <Text style={{ color: '#F87171' }}>{analyticsError}</Text>
                    </View>
                  ) : analytics && (
                    <View>
                      {/* Big Spenders */}
                      <Text style={styles.analyticsSectionTitle}>
                        <Ionicons name="cash-outline" size={18} color="#22C55E" /> Big Spenders
                      </Text>
                      {analytics.bigSpenders.length > 0 ? (
                        analytics.bigSpenders.slice(0, 5).map((client, idx) => (
                          <View key={client.name + idx} style={styles.analyticsRow}>
                            <View style={styles.analyticsRankCircle}>
                              <Text style={styles.analyticsRankText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.analyticsClientName}>{client.name}</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={styles.analyticsValue}>${client.totalSpent}</Text>
                            <Text style={styles.analyticsSubValue}>{client.appointmentCount} appt</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.analyticsEmpty}>No appointment data available</Text>
                      )}

                      {/* Most Visited */}
                      <Text style={styles.analyticsSectionTitle}>
                        <Ionicons name="calendar-outline" size={18} color="#3B82F6" /> Most Visited
                      </Text>
                      {analytics.mostVisited.length > 0 ? (
                        analytics.mostVisited.slice(0, 5).map((client, idx) => (
                          <View key={client.name + idx} style={styles.analyticsRow}>
                            <View style={styles.analyticsRankCircle}>
                              <Text style={styles.analyticsRankText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.analyticsClientName}>{client.name}</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={[styles.analyticsValue, { color: '#3B82F6' }]}>{client.totalVisits} visits</Text>
                            <Text style={styles.analyticsSubValue}>
                              {client.lastVisit ? `Last: ${new Date(client.lastVisit).toLocaleDateString()}` : ''}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.analyticsEmpty}>No visit data available</Text>
                      )}

                      {/* Biggest Tippers */}
                      <Text style={styles.analyticsSectionTitle}>
                        <Ionicons name="star-outline" size={18} color="#FFD700" /> Biggest Tippers
                      </Text>
                      {analytics.biggestTippers.length > 0 ? (
                        analytics.biggestTippers.slice(0, 5).map((client, idx) => (
                          <View key={client.name + idx} style={styles.analyticsRow}>
                            <View style={styles.analyticsRankCircle}>
                              <Text style={styles.analyticsRankText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.analyticsClientName}>{client.name}</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={[styles.analyticsValue, { color: '#FFD700' }]}>${client.totalTips}</Text>
                            <Text style={styles.analyticsSubValue}>{client.tipPercentage}% avg</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.analyticsEmpty}>No tip data available</Text>
                      )}
                    </View>
                  )}
                </AnimatedAnalyticsContent>
              </View>
            </View>
            {/* --- End Analytics Section --- */}

            <View style={styles.listContainer}>
              <Text style={styles.listTitle}>
                All Clients ({clients.length})
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No clients found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first client to get started'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles: any = StyleSheet.create({
  // @ts-ignore
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    flex: 1,
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
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 12,
  },
  searchContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  listContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 20,
  },
  clientCard: {
    backgroundColor: '#23232A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
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
    backgroundColor: '#374151',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#23232A',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FFD70020',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.2,
  },
  clientPhone: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  clientStats: {
    gap: 2,
  },
  statText: {
    fontSize: 14,
    color: '#9CA3AF',
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
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  vipBadgeText: {
    color: '#18181B',
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

  // --- Analytics and Summary Styles ---
  summaryCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    marginHorizontal: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  analyticsCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 0,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232A',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#23232A',
  },
  analyticsRankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  analyticsRankText: {
    color: '#18181B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  analyticsClientName: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 8,
    maxWidth: 100,
  },
  analyticsValue: {
    color: '#22C55E',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 8,
  },
  analyticsSubValue: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 2,
  },
  analyticsEmpty: {
    color: '#9CA3AF',
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 4,
    textAlign: 'center',
  },
  // --- End Analytics and Summary Styles ---
});