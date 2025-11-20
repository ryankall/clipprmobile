import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { apiRequest } from '../lib/api';

export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/messages/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to mark as read');
    },
  });
}

export function useArchiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/messages/${id}`, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      Alert.alert('Archived', 'Message archived');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to archive message');
    },
  });
}

export function useRepliedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/messages/${id}`, { status: 'replied' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      Alert.alert('Marked as Replied', 'Message marked as replied');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to mark as replied');
    },
  });
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: { customerName: string; customerPhone?: string; customerEmail?: string }) =>
      apiRequest('POST', '/api/clients', {
        name: message.customerName,
        phone: message.customerPhone || undefined,
        email: message.customerEmail || undefined,
        notes: '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      Alert.alert('Client Created', 'New client has been added and linked to this message');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create client');
    },
  });
}

export function useBlockClientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ phoneNumber, reason }: { phoneNumber: string; reason?: string }) =>
      apiRequest('POST', '/api/anti-spam/block', { phoneNumber, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anti-spam/blocked-clients'] });
      Alert.alert('Blocked', 'Client has been blocked');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to block client');
    },
  });
}

export function useUnblockClientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ phoneNumber }: { phoneNumber: string }) =>
      apiRequest('POST', '/api/anti-spam/unblock', { phoneNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anti-spam/blocked-clients'] });
      Alert.alert('Unblocked', 'Client has been unblocked');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to unblock client');
    },
  });
}
