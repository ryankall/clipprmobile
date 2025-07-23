import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Message = {
  id: number;
  customerName: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  customerPhone?: string;
  customerEmail?: string;
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'replied', label: 'Replied' },
  { key: 'archived', label: 'Archived' },
];

// Example static messages for layout preview
const STATIC_MESSAGES: Message[] = [
  {
    id: 1,
    customerName: 'Jane Doe',
    subject: 'Booking Inquiry',
    message: 'Hi, I would like to book a haircut for next week.',
    status: 'unread',
    priority: 'high',
    createdAt: '2025-07-19T14:00:00Z',
  },
  {
    id: 2,
    customerName: 'John Smith',
    subject: 'Service Question',
    message: 'Do you offer beard trims?',
    status: 'read',
    priority: 'normal',
    createdAt: '2025-07-18T10:30:00Z',
  },
];

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return '#EF4444'; // red-500
    case 'high':
      return '#F59E0B'; // gold
    case 'normal':
      return '#3B82F6'; // blue-500
    case 'low':
      return '#9CA3AF'; // gray-500
    default:
      return '#3B82F6';
  }
}

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

export default function Messages() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // For static UI, filter the static messages
  const filteredMessages =
    filter === 'all'
      ? STATIC_MESSAGES
      : STATIC_MESSAGES.filter((msg) => msg.status === filter);

  // Action handlers (stubbed for now)
  const handleMarkAsReplied = (message: Message) => {
    // TODO: Integrate with API
    alert('Mark as Replied (stub)');
    setModalVisible(false);
  };
  const handleArchive = (message: Message) => {
    // TODO: Integrate with API
    alert('Archive (stub)');
    setModalVisible(false);
  };
  const handleCreateClient = (message: Message) => {
    // TODO: Integrate with API
    alert('Create Client (stub)');
    setModalVisible(false);
  };
  const handleBookAppointment = (message: Message) => {
    // TODO: Integrate with API
    alert('Book Appointment (stub)');
    setModalVisible(false);
  };
  const handleBlockUnblock = (message: Message, blocked: boolean) => {
    // TODO: Integrate with API
    alert(blocked ? 'Unblock (stub)' : 'Block (stub)');
    setModalVisible(false);
  };
  const handleDelete = (message: Message) => {
    // TODO: Integrate with API
    alert('Delete (stub)');
    setModalVisible(false);
  };

  // For static demo, assume phone is not blocked
  const isPhoneBlocked = (phone: string) => false;

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
            {STATIC_MESSAGES.filter((m) => m.status === 'unread').length} unread
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
                  {STATIC_MESSAGES.filter((m) => m.status === f.key).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages List */}
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
              setModalVisible(true);
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
                <Text style={styles.timeAgo}>1d ago</Text>
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

      {/* Message Detail Modal */}
      {selectedMessage && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.modalContainer}>
              {/* Header */}
              <View style={modalStyles.modalHeader}>
                <Text style={modalStyles.modalTitle} numberOfLines={2}>
                  {selectedMessage.subject}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                  <Text style={modalStyles.infoText}>{selectedMessage.createdAt}</Text>
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
                  style={[modalStyles.actionButton, { borderColor: '#A78BFA' }]}
                  onPress={() => handleCreateClient(selectedMessage)}
                >
                  <Ionicons name="person-add-outline" size={18} color="#A78BFA" />
                  <Text style={[modalStyles.actionText, { color: '#A78BFA' }]}>Create Client</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.actionButton, { borderColor: '#F59E0B' }]}
                  onPress={() => handleBookAppointment(selectedMessage)}
                >
                  <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
                  <Text style={[modalStyles.actionText, { color: '#F59E0B' }]}>Book Appointment</Text>
                </TouchableOpacity>
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