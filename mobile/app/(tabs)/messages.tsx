import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { Client, Message as ApiMessage } from '../../lib/types';
import { Alert } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useRouter } from 'expo-router';
import { Message } from '../../lib/types';
import { FILTERS, getPriorityColor } from '../../lib/utils';
import {
  useMarkAsReadMutation,
  useArchiveMutation,
  useRepliedMutation,
  useCreateClientMutation,
  useBlockClientMutation,
  useUnblockClientMutation
} from '../../hooks/message';


function getStatusIcon(status: string, color: string) {
  switch (status) {
    case 'unread':
      return <Ionicons name="mail-unread-outline" size={18} color={color} />;
    case 'read':
      return <Ionicons name="mail-open-outline" size={18} color={color} />;
    case 'replied':
      return <Ionicons name="checkmark-done-outline" size={18} color={color} />;
    case 'archived':
      return <Ionicons name="archive-outline" size={18} color={color} />;
    default:
      return <Ionicons name="mail-outline" size={18} color={color} />;
  }
}

// Function to format date in a reader-friendly way with timezone support
const formatCreatedAt = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    // If it's within the last 24 hours, show relative time
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // If it's within the current year, show month and day with time
    if (date.getFullYear() === now.getFullYear()) {
      return formatInTimeZone(date, Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMM d, h:mm a');
    }
    
    // If it's a different year, show full date with time
    return formatInTimeZone(date, Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMM d, yyyy, h:mm a');
  } catch (error) {
    // Fallback to original string if formatting fails
    return dateString;
  }
};



export default function Messages() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();
  // --- Mutations for message actions ---
  const markAsReadMutation = useMarkAsReadMutation();
  const archiveMutation = useArchiveMutation();
  const repliedMutation = useRepliedMutation();
  const createClientMutation = useCreateClientMutation();
  const blockClientMutation = useBlockClientMutation();
  const unblockClientMutation = useUnblockClientMutation();

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      setSelectedMessage(null);
      Alert.alert('Deleted', 'Message deleted');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete message');
    },
  });



  // Fetch messages
  const { data: rawMessages = [], isLoading: messagesLoading, error: messagesError } = useQuery<any[]>({
    queryKey: ['/api/messages'],
    queryFn: () => apiRequest<any[]>('GET', '/api/messages'),
    refetchInterval: 10000,
  });

  // Map API response to expected Message shape
  const messages: Message[] = rawMessages.map((msg: any) => ({
    id: msg.id,
    clientId: msg.clientId,
    customerName: msg.customerName,
    customerPhone: msg.customerPhone,
    customerEmail: msg.customerEmail,
    subject: msg.subject,
    message: msg.message,
    status: msg.status,
    priority: msg.priority,
    serviceRequested: msg.serviceRequested,
    serviceIds: msg.serviceIds,
    preferredDate: msg.preferredDate,
    notes: msg.notes,
    createdAt: msg.createdAt,
    readAt: msg.readAt,
    repliedAt: msg.repliedAt,
  }));

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest<Client[]>('GET', '/api/clients'),
  });

  // Fetch blocked clients
  const { data: blockedClients = [], isLoading: blockedLoading } = useQuery<any[]>({
    queryKey: ['/api/anti-spam/blocked-clients'],
    queryFn: () => apiRequest<any[]>('GET', '/api/anti-spam/blocked-clients'),
  });

  // Filter messages by status
  const filteredMessages =
    filter === 'all'
      ? messages
      : messages.filter((msg) => msg.status === filter);

  // Action handlers using mutations
  const handleMarkAsReplied = (message: Message) => {
    if (repliedMutation && repliedMutation.mutate) {
      repliedMutation.mutate(message.id);
    } else {
      Alert.alert('Error', 'Reply mutation is not available.');
    }
    setSelectedMessage(null);
  };
  const handleArchive = (message: Message) => {
    if (archiveMutation && archiveMutation.mutate) {
      archiveMutation.mutate(message.id);
    } else {
      Alert.alert('Error', 'Archive mutation is not available.');
    }
    setSelectedMessage(null);
  };
  const handleCreateClient = (message: Message) => {
    if (createClientMutation && createClientMutation.mutate) {
      createClientMutation.mutate(message);
    } else {
      Alert.alert('Error', 'Create client mutation is not available.');
    }
    setSelectedMessage(null);
  };
  const handleBookAppointment = (message: Message) => {
    // Extract appointment details from message
    const dateMatch = message.message.match(/📅 Date: (\d{4}-\d{2}-\d{2})/);
    const timeMatch = message.message.match(/⏰ Time: (\d{1,2}:\d{2})/);
    const servicesMatch = message.message.match(/✂️ Services: (.+?)(?:\n|$)/);
    const addressMatch = message.message.match(/🚗 Travel: Yes - (.+?)(?:\n|$)/);
    const travelNoMatch = message.message.match(/🚗 Travel: No(?:\n|$)/);
    const customServiceMatch = message.message.match(/✂️ Custom Service: (.+?)(?:\n|$)/);
    const messageNotesMatch = message.message.match(/💬 Message: (.+?)(?:\n|$)/);

    if (!dateMatch || !timeMatch) {
      Alert.alert('Error', 'Could not extract date and time from the booking request.');
      setSelectedMessage(null);
      return;
    }

    const selectedDate = dateMatch[1];
    const selectedTime = timeMatch[1];
    const services = servicesMatch ? servicesMatch[1].split(', ') : [];
    const address = addressMatch ? addressMatch[1] : '';
    const customService = customServiceMatch ? customServiceMatch[1] : '';
    const notes = messageNotesMatch ? messageNotesMatch[1] : '';
    const hasTravel = !!addressMatch;
    const travelNo = !!travelNoMatch;

    // Compose params for navigation
    const params: Record<string, any> = {
      clientId: message.clientId,
      clientName: message.customerName,
      phone: message.customerPhone,
      email: message.customerEmail,
      date: selectedDate,
      time: selectedTime,
      services: services,
      serviceIds: message.serviceIds,
      customService: customService,
      address: address,
      notes: notes,
      travel: hasTravel ? 'yes' : travelNo ? 'no' : undefined,
    };
    setSelectedMessage(null);

    // Navigate to the new appointment screen with params
    router.push({
      pathname: '/appointments/new',
      params,
    });
  };
  const handleBlockUnblock = (message: Message, blocked: boolean) => {
    if (!message.customerPhone) return;
    if (blocked) {
      if (unblockClientMutation && unblockClientMutation.mutate) {
        unblockClientMutation.mutate({ phoneNumber: message.customerPhone });
      } else {
        Alert.alert('Error', 'Unblock mutation is not available.');
      }
    } else {
      if (blockClientMutation && blockClientMutation.mutate) {
        blockClientMutation.mutate({ phoneNumber: message.customerPhone, reason: 'Blocked from messages' });
      } else {
        Alert.alert('Error', 'Block mutation is not available.');
      }
    }
    setSelectedMessage(null);
  };
  const handleDelete = (message: Message) => {
    deleteMutation.mutate(message.id);
    // setModalVisible(false) handled in mutation onSuccess
  };

  // Check if a phone number is blocked
  const isPhoneBlocked = (phone: string) => {
    return blockedClients.some((client: any) => client.phoneNumber === phone);
  };

  // Check if client exists in database/cache
  const clientExists = (phone: string) => {
    return clients.some((client: Client) => client.phone === phone);
  };

// Mutation for updating client info from message content
  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, updateData }: { clientId: number; updateData: any }) => {
      return await apiRequest('PUT', `/api/clients/${clientId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    },
    onError: (error: any) => {
      // Silently ignore phone verification errors for automatic updates
      if (error.message && error.message.includes('Phone verification')) {
        return;
      }
      // Log other errors
      console.error('Error updating client info:', error);
    },
  });
// Sync client info from message content when a message is selected
  React.useEffect(() => {
    if (selectedMessage && selectedMessage.customerPhone && clients.length > 0) {
      const existingClient = clients.find(
        (client) => client.phone === selectedMessage.customerPhone
      );
      if (existingClient) {
        // Extract address from message content if present
        let extractedAddress = '';
        if (
          selectedMessage.message &&
          selectedMessage.message.includes('🚗 Travel: Yes')
        ) {
          const travelMatch = selectedMessage.message.match(/🚗 Travel: Yes - (.+?)(?:\n|$)/);
          if (travelMatch) {
            extractedAddress = travelMatch[1].trim();
          }
        }
        // Prepare update data
        const updateData: any = {};
        if (
          selectedMessage.customerName &&
          selectedMessage.customerName !== existingClient.name
        ) {
          updateData.name = selectedMessage.customerName;
        }
        if (
          selectedMessage.customerEmail &&
          selectedMessage.customerEmail !== existingClient.email
        ) {
          updateData.email = selectedMessage.customerEmail;
        }
        if (extractedAddress && extractedAddress !== existingClient.address) {
          updateData.address = extractedAddress;
        }
        if (Object.keys(updateData).length > 0) {
          // Use the mutation to update client info
          updateClientMutation.mutate({ clientId: existingClient.id, updateData });
        }
        // Mark as read if unread
        if (selectedMessage.status === 'unread') {
          if (markAsReadMutation && markAsReadMutation.mutate) {
            markAsReadMutation.mutate(selectedMessage.id);
          } else {
            Alert.alert('Error', 'Mark as read mutation is not available.');
          }
        }
      } else if (selectedMessage.status === 'unread') {
        // Mark as read if no client found
        if (markAsReadMutation && markAsReadMutation.mutate) {
          markAsReadMutation.mutate(selectedMessage.id);
        } else {
          Alert.alert('Error', 'Mark as read mutation is not available.');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMessage, clients]);

// handle open modal

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#F59E0B" />
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {messages.filter((m) => m.status === 'unread').length} unread
          </Text>
        </View>
      </View>
 
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === f.key && styles.filterButtonTextActive,
              ]}
            >
              {f.label}
            </Text>
            {f.key !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {messages.filter((m) => m.status === f.key).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
 
      {/* Loading/Error States */}
      {(messagesLoading || clientsLoading || blockedLoading) && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      )}
      {messagesError && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#EF4444', fontSize: 16, marginTop: 20 }}>
            Failed to load messages.
          </Text>
        </View>
      )}
 
      {/* Messages List */}
      {!messagesLoading && !messagesError && (
        <FlatList
          data={filteredMessages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No messages found</Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? "You haven't received any customer messages yet."
                  : `No ${filter} messages at the moment.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setSelectedMessage(item);
              }}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.messageCard,
                  item.status === 'unread' && styles.messageCardUnread,
                ]}
              >
                <View style={styles.messageRow}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: getPriorityColor(item.priority),
                      marginRight: 6,
                    }}
                  />
                  {getStatusIcon(item.status, item.status === 'unread' ? '#F59E0B' : '#9CA3AF')}
                  <Text
                    style={[
                      styles.customerName,
                      item.status === 'unread' ? styles.textWhite : styles.textSteel,
                      { marginRight: 8 },
                    ]}
                    numberOfLines={1}
                  >
                    {item.customerName}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.timeAgo}>
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.subject,
                    item.status === 'unread' ? styles.textWhite : styles.textSteel,
                  ]}
                  numberOfLines={1}
                >
                  {item.subject}
                </Text>
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {item.message}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
 
      {/* Message Detail Modal */}
      {selectedMessage && (
        <Modal
          visible={!!selectedMessage}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedMessage(null)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.modalContainer}>
              {/* Header */}
              <View style={modalStyles.modalHeader}>
                <Text style={modalStyles.modalTitle} numberOfLines={2}>
                  {selectedMessage.subject}
                </Text>
                <TouchableOpacity onPress={() => setSelectedMessage(null)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              {/* Status & Priority */}
              <View style={modalStyles.statusRow}>
                <View style={[modalStyles.statusBadge]}>
                  <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 14, textTransform: 'capitalize' }}>
                    {selectedMessage.status}
                  </Text>
                </View>
                <View style={[modalStyles.statusBadge]}>
                  <Text style={{ color: getPriorityColor(selectedMessage.priority), fontWeight: '700', fontSize: 14, textTransform: 'capitalize' }}>
                    {selectedMessage.priority}
                  </Text>
                </View>
              </View>
              {/* Customer Info */}
              <View style={modalStyles.infoSection}>
                <View style={modalStyles.infoRow}>
                  <Ionicons name="person-outline" size={18} color="#F59E0B" />
                  <Text style={modalStyles.infoText}>{selectedMessage.customerName}</Text>
                </View>
                {selectedMessage.customerPhone && (
                  <View style={modalStyles.infoRow}>
                    <Ionicons name="call-outline" size={18} color="#F59E0B" />
                    <Text style={modalStyles.infoText}>{selectedMessage.customerPhone}</Text>
                  </View>
                )}
                {selectedMessage.customerEmail && (
                  <View style={modalStyles.infoRow}>
                    <Ionicons name="mail-outline" size={18} color="#F59E0B" />
                    <Text style={modalStyles.infoText}>{selectedMessage.customerEmail}</Text>
                  </View>
                )}
                <View style={modalStyles.infoRow}>
                  <Ionicons name="time-outline" size={18} color="#F59E0B" />
                  <Text style={modalStyles.infoText}>{formatCreatedAt(selectedMessage.createdAt)}</Text>
                </View>
              </View>
              {/* Message Content */}
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Message:</Text>
                <View style={modalStyles.messageBox}>
                  <Text style={modalStyles.messageText}>{selectedMessage.message}</Text>
                </View>
              </View>
              {/* Actions */}
              <View style={modalStyles.actionsRow}>
                <TouchableOpacity
                  style={[modalStyles.actionButton, { borderColor: '#22C55E' }]}
                  onPress={() => handleMarkAsReplied(selectedMessage)}
                >
                  <Ionicons name="checkmark-done-outline" size={18} color="#22C55E" />
                  <Text style={[modalStyles.actionText, { color: '#22C55E' }]}>Mark as Replied</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.actionButton, { borderColor: '#3B82F6' }]}
                  onPress={() => handleArchive(selectedMessage)}
                >
                  <Ionicons name="archive-outline" size={18} color="#3B82F6" />
                  <Text style={[modalStyles.actionText, { color: '#3B82F6' }]}>Archive</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    modalStyles.actionButton,
                    {
                      borderColor: '#A78BFA',
                      opacity: selectedMessage.customerPhone && clientExists(selectedMessage.customerPhone) ? 0.5 : 1
                    }
                  ]}
                  onPress={() => {
                    if (!(selectedMessage.customerPhone && clientExists(selectedMessage.customerPhone))) {
                      handleCreateClient(selectedMessage);
                    }
                  }}
                  disabled={!!(selectedMessage.customerPhone && clientExists(selectedMessage.customerPhone))}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={selectedMessage.customerPhone && clientExists(selectedMessage.customerPhone) ? '#6B7280' : '#A78BFA'}
                  />
                  <Text style={[
                    modalStyles.actionText,
                    {
                      color: selectedMessage.customerPhone && clientExists(selectedMessage.customerPhone) ? '#6B7280' : '#A78BFA'
                    }
                  ]}>Create Client</Text>
                </TouchableOpacity>
                { selectedMessage.subject === 'New Booking Request' ? (
                  <TouchableOpacity
                        style={[
                          modalStyles.actionButton,
                          {
                            borderColor: '#F59E0B',
                            opacity: selectedMessage.customerPhone && !clientExists(selectedMessage.customerPhone) ? 0.5 : 1
                          }
                        ]}
                        onPress={() => {
                          if (!(selectedMessage.customerPhone && !clientExists(selectedMessage.customerPhone))) {
                            handleBookAppointment(selectedMessage);
                          }
                        }}
                        disabled={!!(selectedMessage.customerPhone && !clientExists(selectedMessage.customerPhone))}
                      >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={selectedMessage.customerPhone && !clientExists(selectedMessage.customerPhone) ? '#6B7280' : '#F59E0B'}
                    />
                    <Text style={[
                      modalStyles.actionText,
                      {
                        color: selectedMessage.customerPhone && !clientExists(selectedMessage.customerPhone) ? '#6B7280' : '#F59E0B'
                      }
                    ]}>Book Appointment</Text>
                  </TouchableOpacity>
                ) : null
                }

                {selectedMessage.customerPhone && (
                  <TouchableOpacity
                    style={[
                      modalStyles.actionButton,
                      { borderColor: isPhoneBlocked(selectedMessage.customerPhone || "") ? '#22C55E' : '#F59E0B' }
                    ]}
                    onPress={() => handleBlockUnblock(selectedMessage, isPhoneBlocked(selectedMessage.customerPhone || ""))}
                  >
                    <Ionicons
                      name={"shield-outline"}
                      size={18}
                      color={isPhoneBlocked(selectedMessage.customerPhone || "") ? "#22C55E" : "#F59E0B"}
                    />
                    <Text
                      style={[
                        modalStyles.actionText,
                        { color: isPhoneBlocked(selectedMessage.customerPhone || "") ? "#22C55E" : "#F59E0B" }
                      ]}
                    >
                      {isPhoneBlocked(selectedMessage.customerPhone || "") ? "Unblock" : "Block"}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[modalStyles.actionButton, { borderColor: '#EF4444' }]}
                  onPress={() => handleDelete(selectedMessage)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={[modalStyles.actionText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingTop: 0,
  },
  header: {
    backgroundColor: '#18181B', // closer to web charcoal
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#37415133',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20, // web is text-xl
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
    letterSpacing: 0.1,
  },
  unreadBadge: {
    backgroundColor: '#F59E0B22', // lighter gold bg
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  unreadBadgeText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  filterTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#0F0F0F',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999, // pill shape
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginRight: 4,
    marginBottom: 4,
  },
  filterButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  filterButtonTextActive: {
    color: '#18181B',
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  messageCard: {
    backgroundColor: '#18181B', // match web dark-card
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#37415155', // subtle steel
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    maxWidth: 140,
    letterSpacing: 0.1,
  },
  subject: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: 0.05,
  },
  messagePreview: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 0,
    letterSpacing: 0.05,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textSteel: {
    color: '#9CA3AF',
  },
  timeAgo: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#37415155',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    marginTop: 48,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: 0.05,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,15,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    backgroundColor: '#18181B',
    borderRadius: 18,
    padding: 22,
    maxHeight: '88%',
    borderWidth: 1.5,
    borderColor: '#37415155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
    letterSpacing: 0.1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#23232A',
    marginRight: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  infoSection: {
    backgroundColor: '#23232A',
    borderRadius: 10,
    padding: 13,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  infoText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 9,
    fontWeight: '500',
    letterSpacing: 0.05,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 5,
    fontSize: 15,
    letterSpacing: 0.05,
  },
  messageBox: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 12,
    maxHeight: 140,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    letterSpacing: 0.05,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 8,
    marginTop: 2,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 6,
    letterSpacing: 0.05,
  },
});