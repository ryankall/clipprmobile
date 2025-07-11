import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { Service } from '../../lib/types';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadServices();
    }
  }, [isAuthenticated]);

  const loadServices = async () => {
    try {
      const data = await apiRequest<Service[]>('GET', '/api/services');
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceStatus = async (serviceId: number, isActive: boolean) => {
    try {
      await apiRequest('PATCH', `/api/services/${serviceId}`, {
        isActive: !isActive
      });
      
      setServices(services.map(service => 
        service.id === serviceId 
          ? { ...service, isActive: !isActive }
          : service
      ));
    } catch (error) {
      console.error('Failed to update service:', error);
      Alert.alert('Error', 'Failed to update service');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'haircut': return 'cut';
      case 'beard': return 'man';
      case 'styling': return 'brush';
      case 'color': return 'color-palette';
      case 'treatment': return 'medical';
      default: return 'construct';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'haircut': return '#22C55E';
      case 'beard': return '#F59E0B';
      case 'styling': return '#8B5CF6';
      case 'color': return '#EF4444';
      case 'treatment': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authPromptText}>Please sign in to access your services</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/services/add')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Overview Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{services.length}</Text>
            <Text style={styles.statLabel}>Total Services</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{services.filter(s => s.isActive).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${services.reduce((sum, s) => sum + parseFloat(s.price), 0) / services.length || 0}
            </Text>
            <Text style={styles.statLabel}>Avg Price</Text>
          </View>
        </View>

        {/* Services by Category */}
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleContainer}>
                <Ionicons 
                  name={getCategoryIcon(category) as any} 
                  size={20} 
                  color={getCategoryColor(category)} 
                />
                <Text style={styles.categoryTitle}>{category}</Text>
              </View>
              <Text style={styles.categoryCount}>{categoryServices.length} services</Text>
            </View>

            {categoryServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  !service.isActive && styles.inactiveServiceCard
                ]}
                onPress={() => router.push(`/services/edit?id=${service.id}`)}
              >
                <View style={styles.serviceHeader}>
                  <Text style={[
                    styles.serviceName,
                    !service.isActive && styles.inactiveServiceName
                  ]}>
                    {service.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.statusToggle}
                    onPress={() => toggleServiceStatus(service.id, service.isActive)}
                  >
                    <Ionicons 
                      name={service.isActive ? "checkmark-circle" : "close-circle"} 
                      size={24} 
                      color={service.isActive ? "#22C55E" : "#EF4444"} 
                    />
                  </TouchableOpacity>
                </View>

                {service.description && (
                  <Text style={[
                    styles.serviceDescription,
                    !service.isActive && styles.inactiveServiceDescription
                  ]}>
                    {service.description}
                  </Text>
                )}

                <View style={styles.serviceFooter}>
                  <View style={styles.priceContainer}>
                    <Text style={[
                      styles.servicePrice,
                      !service.isActive && styles.inactiveServicePrice
                    ]}>
                      ${service.price}
                    </Text>
                  </View>
                  <Text style={[
                    styles.serviceDuration,
                    !service.isActive && styles.inactiveServiceDuration
                  ]}>
                    {service.duration} min
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {services.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No services added yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first service to get started
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#22C55E',
    borderRadius: 20,
    padding: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  categoryCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  serviceCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  inactiveServiceCard: {
    opacity: 0.6,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  inactiveServiceName: {
    color: '#9CA3AF',
  },
  statusToggle: {
    padding: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  inactiveServiceDescription: {
    color: '#6B7280',
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {},
  servicePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22C55E',
  },
  inactiveServicePrice: {
    color: '#9CA3AF',
  },
  serviceDuration: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  inactiveServiceDuration: {
    color: '#6B7280',
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