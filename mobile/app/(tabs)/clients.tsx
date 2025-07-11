import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { ClientWithStats } from '../../lib/types';

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadClients();
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
    const lastVisit = item.lastVisit ? new Date(item.lastVisit).toLocaleDateString() : 'Never';
    const initials = item.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    return (
      <TouchableOpacity 
        style={styles.clientCard}
        onPress={() => router.push(`/client-profile?id=${item.id}`)}
      >
        <View style={styles.clientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          
          <View style={styles.clientInfo}>
            <View style={styles.clientHeader}>
              <Text style={styles.clientName}>{item.name}</Text>
              <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>
            
            {item.phone && (
              <Text style={styles.clientPhone}>{item.phone}</Text>
            )}
            
            <View style={styles.clientStats}>
              <Text style={styles.statText}>
                {item.totalVisits || 0} visits • ${item.totalSpent || '0.00'} spent
              </Text>
              <Text style={styles.statText}>
                Last visit: {lastVisit}
              </Text>
            </View>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color="#666" />
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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Clients</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/clients/add')}
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

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            All Clients ({clients.length})
          </Text>
          
          <FlatList
            data={filteredClients}
            renderItem={renderClient}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: '#22C55E',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
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
});