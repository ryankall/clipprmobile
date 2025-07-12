import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin,
  User,
  ShieldOff,
  CheckCircle,
  AlertCircle,
  X,
  Reply,
  Archive,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: number;
  userId: number;
  customerName: string;
  customerPhone: string;
  message: string;
  services: string[];
  selectedDate: string;
  selectedTime: string;
  travelRequired: boolean;
  address?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

export default function MobileMessages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 30000, // 30 seconds
  });

  // Mark message as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      if (!response.ok) throw new Error('Failed to mark message as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
  });

  // Archive message
  const archiveMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messages/${messageId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      if (!response.ok) throw new Error('Failed to archive message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setSelectedMessage(null);
    },
  });

  // Delete message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      if (!response.ok) throw new Error('Failed to delete message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setSelectedMessage(null);
    },
  });

  // Block client
  const blockClientMutation = useMutation({
    mutationFn: async ({ phoneNumber, reason }: { phoneNumber: string; reason?: string }) => {
      const response = await fetch('/api/anti-spam/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phoneNumber, reason }),
      });
      if (!response.ok) throw new Error('Failed to block client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setShowBlockModal(false);
      setBlockReason('');
      setSelectedMessage(null);
    },
  });

  // Create appointment from message
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(appointmentData),
      });
      if (!response.ok) throw new Error('Failed to create appointment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowBookingModal(false);
      setSelectedMessage(null);
    },
  });

  // Filter messages
  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.customerPhone.includes(searchTerm) ||
                         message.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'unread' && !message.isRead) ||
                         (statusFilter === 'read' && message.isRead);
    
    return matchesSearch && matchesStatus && !message.isArchived;
  });

  // Get unread count
  const unreadCount = messages.filter(m => !m.isRead && !m.isArchived).length;

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Handle message selection
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markAsReadMutation.mutate(message.id);
    }
  };

  // Handle booking appointment
  const handleBookAppointment = () => {
    if (!selectedMessage) return;
    
    const appointmentData = {
      customerName: selectedMessage.customerName,
      customerPhone: selectedMessage.customerPhone,
      services: selectedMessage.services,
      scheduledAt: `${selectedMessage.selectedDate}T${selectedMessage.selectedTime}`,
      travelRequired: selectedMessage.travelRequired,
      address: selectedMessage.address,
      message: selectedMessage.message,
      status: 'pending'
    };
    
    createAppointmentMutation.mutate(appointmentData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Messages</h1>
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">All Messages</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'No messages found matching your criteria.' 
                : 'No messages yet. Your booking requests will appear here.'
              }
            </p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`bg-gray-800 border border-gray-700 rounded-xl p-4 cursor-pointer hover:bg-gray-750 transition-colors ${
                !message.isRead ? 'border-amber-500/50' : ''
              }`}
              onClick={() => handleMessageSelect(message)}
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-medium">{message.customerName}</h3>
                      {!message.isRead && (
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">{formatDate(message.createdAt)}</span>
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-1">{message.customerPhone}</p>
                  
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-amber-500 text-sm flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(new Date(message.selectedDate), 'MMM d')}
                    </span>
                    <span className="text-gray-400 text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {message.selectedTime}
                    </span>
                    {message.travelRequired && (
                      <span className="text-blue-400 text-sm flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Travel
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-300 text-sm mt-2 line-clamp-2">{message.message}</p>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    {message.services.map((service, index) => (
                      <span
                        key={index}
                        className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full text-xs"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Booking Request</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Info */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">{selectedMessage.customerName}</h4>
                  <p className="text-gray-400 text-sm">{selectedMessage.customerPhone}</p>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Date & Time</span>
                  <span className="text-white">
                    {format(new Date(selectedMessage.selectedDate), 'MMM d, yyyy')} at {selectedMessage.selectedTime}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Services</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedMessage.services.map((service, index) => (
                      <span
                        key={index}
                        className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
                
                {selectedMessage.travelRequired && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Travel Required</span>
                    <span className="text-blue-400">Yes</span>
                  </div>
                )}
                
                {selectedMessage.address && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Address</span>
                    <span className="text-white text-sm">{selectedMessage.address}</span>
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <h5 className="text-white font-medium mb-2">Message</h5>
                <p className="text-gray-300 text-sm bg-gray-700 rounded-lg p-3">
                  {selectedMessage.message}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="w-full bg-amber-500 text-gray-900 py-3 rounded-lg font-medium hover:bg-amber-600"
                >
                  Book Appointment
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => archiveMessageMutation.mutate(selectedMessage.id)}
                    disabled={archiveMessageMutation.isPending}
                    className="bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
                  >
                    {archiveMessageMutation.isPending ? 'Archiving...' : 'Archive'}
                  </button>
                  <button
                    onClick={() => setShowBlockModal(true)}
                    className="bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                  >
                    Block Client
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this message?')) {
                      deleteMessageMutation.mutate(selectedMessage.id);
                    }
                  }}
                  className="w-full text-red-400 py-2 hover:text-red-300"
                >
                  Delete Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {showBookingModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Confirm Booking</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to book this appointment for {selectedMessage.customerName}?
              </p>
              
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date & Time</span>
                  <span className="text-white">
                    {format(new Date(selectedMessage.selectedDate), 'MMM d')} at {selectedMessage.selectedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Services</span>
                  <span className="text-white">{selectedMessage.services.join(', ')}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookAppointment}
                  disabled={createAppointmentMutation.isPending}
                  className="flex-1 bg-amber-500 text-gray-900 py-2 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {createAppointmentMutation.isPending ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Client Modal */}
      {showBlockModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Block Client</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to block {selectedMessage.customerName} ({selectedMessage.customerPhone})? 
                They will no longer be able to book appointments with you.
              </p>
              
              <div>
                <label className="text-white text-sm font-medium">Reason (optional)</label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Why are you blocking this client?"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => blockClientMutation.mutate({
                    phoneNumber: selectedMessage.customerPhone,
                    reason: blockReason
                  })}
                  disabled={blockClientMutation.isPending}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {blockClientMutation.isPending ? 'Blocking...' : 'Block Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}