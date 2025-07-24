import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { Service } from '../../lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Invoice and Client Types ---
type InvoiceStatus = 'pending' | 'paid' | 'cancelled';
type PaymentMethod = 'stripe' | 'apple_pay' | 'cash' | undefined;

interface Invoice {
  id: number;
  clientId: number;
  subtotal: string;
  tip: string;
  total: string;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  // ...other fields as needed
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

// --- CreateInvoiceModalContent Component ---
interface CreateInvoiceModalContentProps {
  clients: { id: number; name: string; phone: string; email?: string }[];
  services: Service[];
  selectedTemplate: any;
  onCancel: () => void;
  onCreate: (invoiceData: any) => void;
}

const paymentMethods = [
  { key: 'stripe', label: 'Card Payment', icon: 'card-outline' },
  { key: 'apple_pay', label: 'Apple Pay', icon: 'phone-portrait-outline' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
];

const CreateInvoiceModalContent: React.FC<CreateInvoiceModalContentProps> = ({
  clients,
  services,
  selectedTemplate,
  onCancel,
  onCreate,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    selectedTemplate?.clientId ?? null
  );
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch) ||
      (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const [selectedServices, setSelectedServices] = useState<{ id: number; quantity: number }[]>(
    selectedTemplate?.services?.length
      ? selectedTemplate.services.map((s: any) => ({ id: s.id, quantity: 1 }))
      : []
  );
  const [tip, setTip] = useState<string>(selectedTemplate?.tip ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(undefined);
  const [notifyClient, setNotifyClient] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill support for amount if template has amount
  const prefillAmount = selectedTemplate?.amount
    ? parseFloat(selectedTemplate.amount)
    : undefined;

  // Calculate subtotal
  const subtotal = selectedServices.reduce((sum, sel) => {
    const svc = services.find((s) => s.id === sel.id);
    return svc ? sum + parseFloat(svc.price) * sel.quantity : sum;
  }, 0);

  // Calculate total
  const tipValue = parseFloat(tip) || 0;
  const total = prefillAmount !== undefined ? prefillAmount + tipValue : subtotal + tipValue;

  // Service selection handler
  const toggleService = (id: number) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, quantity: 1 }]
    );
  };

  // Quantity handler
  const setServiceQuantity = (id: number, quantity: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, quantity } : s))
    );
  };

  // Validation
  const validate = () => {
    if (!selectedClientId) {
      setError('Please select a client.');
      return false;
    }
    if (!selectedServices.length && prefillAmount === undefined) {
      setError('Please select at least one service.');
      return false;
    }
    if (selectedServices.some((s) => s.quantity < 1)) {
      setError('Service quantity must be at least 1.');
      return false;
    }
    if (!paymentMethod) {
      setError('Please select a payment method.');
      return false;
    }
    setError(null);
    return true;
  };

  // Handle create
  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      onCreate({
        clientId: selectedClientId,
        services: selectedServices,
        tip: tipValue.toFixed(2),
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        paymentMethod,
        notifyClient,
        templateId: selectedTemplate?.id,
      });
    } catch (e) {
      setError('Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      {/* Client Selection */}
      <Text style={[styles.modalPlaceholderText, { alignSelf: 'flex-start', marginBottom: 4 }]}>Client</Text>
      {/* Client Selection Field */}
      <TouchableOpacity
        style={[
          styles.input,
          { width: '100%', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
        ]}
        onPress={() => setShowClientModal(true)}
        activeOpacity={0.8}
      >
        <Text style={{ color: selectedClientId ? '#fff' : '#9CA3AF', fontSize: 16 }}>
          {selectedClientId
            ? clients.find((c) => c.id === selectedClientId)?.name || 'Unknown Client'
            : 'Select client...'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Client Search Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClientModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity
                onPress={() => setShowClientModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="Search clients..."
                placeholderTextColor="#9CA3AF"
                value={clientSearch}
                onChangeText={setClientSearch}
                autoFocus
              />
              <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id.toString()}
                style={{ maxHeight: 220, width: '100%' }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.serviceSelectItem,
                      selectedClientId === item.id && styles.serviceSelectItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedClientId(item.id);
                      setShowClientModal(false);
                      setClientSearch('');
                    }}
                  >
                    <Text style={{ color: '#fff', flex: 1 }}>{item.name}</Text>
                    <Text style={{ color: '#9CA3AF', marginLeft: 8, fontSize: 13 }}>{item.phone}</Text>
                    {selectedClientId === item.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>No clients found</Text>
                }
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Service Selection */}
      <Text style={[styles.modalPlaceholderText, { alignSelf: 'flex-start', marginBottom: 4 }]}>Services</Text>
      <View style={{ width: '100%', marginBottom: 12, maxHeight: 120 }}>
        {services.length === 0 ? (
          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No services available</Text>
        ) : (
          <ScrollView style={{ width: '100%' }}>
            {services.map((item) => {
              const selected = selectedServices.find((s) => s.id === item.id);
              return (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <TouchableOpacity
                    style={[
                      styles.serviceSelectItem,
                      selected && styles.serviceSelectItemSelected,
                      { flex: 1 },
                    ]}
                    onPress={() => toggleService(item.id)}
                  >
                    <Text style={{ color: '#fff', flex: 1 }}>{item.name}</Text>
                    <Text style={{ color: '#F59E0B', marginLeft: 8 }}>${item.price}</Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                  {selected && (
                    <TextInput
                      style={[
                        styles.input,
                        { width: 60, marginLeft: 8, marginBottom: 0, paddingVertical: 4, fontSize: 15 },
                      ]}
                      value={selected.quantity.toString()}
                      onChangeText={(val) => {
                        const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 1;
                        setServiceQuantity(item.id, num);
                      }}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Tip Input */}
      <Text style={[styles.modalPlaceholderText, { alignSelf: 'flex-start', marginBottom: 4 }]}>Tip</Text>
      <TextInput
        style={[styles.input, { width: '100%', marginBottom: 12 }]}
        placeholder="Tip (optional)"
        placeholderTextColor="#9CA3AF"
        value={tip}
        onChangeText={setTip}
        keyboardType="numeric"
        maxLength={8}
      />

      {/* Payment Method */}
      <Text style={[styles.modalPlaceholderText, { alignSelf: 'flex-start', marginBottom: 4 }]}>Payment Method</Text>
      <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
        {paymentMethods.map((pm) => (
          <TouchableOpacity
            key={pm.key}
            style={[
              styles.categoryChip,
              paymentMethod === pm.key && styles.categoryChipSelected,
              { marginRight: 8 },
            ]}
            onPress={() => setPaymentMethod(pm.key as PaymentMethod)}
          >
            <Ionicons name={pm.icon as any} size={18} color={paymentMethod === pm.key ? '#1e1e1e' : '#fff'} style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.categoryChipText,
                paymentMethod === pm.key && styles.categoryChipTextSelected,
              ]}
            >
              {pm.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notification Preference */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '100%' }}>
        <TouchableOpacity
          onPress={() => setNotifyClient((v) => !v)}
          style={[
            styles.categoryChip,
            notifyClient && styles.categoryChipSelected,
            { marginRight: 8 },
          ]}
        >
          <Ionicons name="notifications-outline" size={18} color={notifyClient ? '#1e1e1e' : '#fff'} style={{ marginRight: 4 }} />
          <Text
            style={[
              styles.categoryChipText,
              notifyClient && styles.categoryChipTextSelected,
            ]}
          >
            Notify Client
          </Text>
        </TouchableOpacity>
      </View>

      {/* Total */}
      <View style={{ width: '100%', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Total:</Text>
        <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 18 }}>${total.toFixed(2)}</Text>
      </View>

      {/* Error/Feedback */}
      {error && (
        <Text style={{ color: '#EF4444', marginBottom: 8, fontWeight: '600' }}>{error}</Text>
      )}

      {/* Buttons */}
      <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: '#232323', flex: 1, marginRight: 8 }]}
          onPress={onCancel}
          disabled={submitting}
        >
          <Text style={[styles.createButtonText, { color: '#fff' }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createButton, { flex: 1, marginLeft: 8, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={submitting}
        >
          <Text style={styles.createButtonText}>{submitting ? 'Creating...' : 'Create'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default function Invoice() {
  // --- Service Modal State (MOVED UP) ---
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'recentInvoice' | 'export' | 'blocked' | 'services' | 'stats' >('stats');

  // --- Recent Invoices State ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Modal state for Create Invoice
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Service Template Management Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Custom Templates State
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateAmount, setTemplateAmount] = useState('');
  const [templateServiceIds, setTemplateServiceIds] = useState<number[]>([]);

  // Load custom templates from AsyncStorage
  useEffect(() => {
    if (isAuthenticated) {
      loadServices();
      loadCustomTemplates();
      loadInvoicesAndClients();
    }
  }, [isAuthenticated]);

  // Fetch invoices and clients
  const loadInvoicesAndClients = async () => {
    setInvoicesLoading(true);
    try {
      const [invoicesData, clientsData] = await Promise.all([
        apiRequest<Invoice[]>('GET', '/api/invoices'),
        apiRequest<Client[]>('GET', '/api/clients'),
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
    } catch (error) {
      setInvoices([]);
      setClients([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const loadCustomTemplates = async () => {
    try {
      const data = await AsyncStorage.getItem('invoiceCustomTemplates');
      if (data) {
        setCustomTemplates(JSON.parse(data));
      } else {
        setCustomTemplates([]);
      }
    } catch (e) {
      setCustomTemplates([]);
    }
  };

  const saveCustomTemplates = async (templates: any[]) => {
    setCustomTemplates(templates);
    await AsyncStorage.setItem('invoiceCustomTemplates', JSON.stringify(templates));
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateAmount.trim() || templateServiceIds.length === 0) {
      Alert.alert('All fields are required');
      return;
    }
    const newTemplate = {
      id: Date.now(),
      name: templateName.trim(),
      amount: templateAmount.trim(),
      serviceIds: templateServiceIds,
      createdAt: new Date().toISOString(),
    };
    const updated = [...customTemplates, newTemplate];
    await saveCustomTemplates(updated);
    setShowTemplateModal(false);
    setTemplateName('');
    setTemplateAmount('');
    setTemplateServiceIds([]);
  };

  const handleServiceSelect = (id: number) => {
    setTemplateServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

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
          <Text style={styles.authPromptText}>Please sign in to access your invoices</Text>
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

  // --- Service Modal Submit Handler ---
  const handleCreateService = async () => {
    if (
      !serviceName.trim() ||
      !servicePrice.trim() ||
      !serviceDuration.trim() ||
      !serviceCategory.trim()
    ) {
      Alert.alert('All fields except description are required');
      return;
    }
    setServiceSubmitting(true);
    try {
      const payload = {
        name: serviceName.trim(),
        description: serviceDescription.trim(),
        price: servicePrice.trim(),
        duration: parseInt(serviceDuration.trim(), 10),
        category: serviceCategory.trim(),
      };
      if (editingService) {
        // Edit mode
        await apiRequest('PATCH', `/api/services/${editingService.id}`, payload);
      } else {
        // Create mode
        await apiRequest('POST', '/api/services', payload);
      }
      await loadServices();
      setShowServiceModal(false);
      setServiceName('');
      setServiceDescription('');
      setServicePrice('');
      setServiceDuration('');
      setServiceCategory('');
      setEditingService(null);
    } catch (error) {
      Alert.alert('Error', editingService ? 'Failed to update service' : 'Failed to create service');
    } finally {
      setServiceSubmitting(false);
    }
  };

  const renderTabButton = (tab: 'recentInvoice' | 'export' | 'services' | 'stats', title: string, icon: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons name={icon as any} size={16} color={activeTab === tab ? '#1F2937' : '#6B7280'} />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );

  const renderRecentInvoiceTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* --- Recent Invoices Section --- */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.title}>
            Recent Invoices
          </Text>
          <View style={{ backgroundColor: '#1A1A1A', borderRadius: 12, padding: 0, borderWidth: 1, borderColor: '#232323' }}>
            {invoicesLoading ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <ActivityIndicator size="small" color="#F59E0B" />
              </View>
            ) : invoices.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Ionicons name="receipt-outline" size={32} color="#737b89" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No invoices created yet</Text>
              </View>
            ) : (
              invoices
                .slice(0, 10)
                .map((invoice) => {
                  const client = clients.find((c) => c.id === invoice.clientId);
                  let statusColor = '#F59E0B';
                  let statusBg = '#232323';
                  if (invoice.status === 'paid') {
                    statusColor = '#22C55E';
                    statusBg = '#193a2f';
                  } else if (invoice.status === 'pending') {
                    statusColor = '#F59E0B';
                    statusBg = '#2d230f';
                  } else if (invoice.status === 'cancelled') {
                    statusColor = '#EF4444';
                    statusBg = '#3a1919';
                  }
                  let iconName: any = 'receipt-outline';
                  if (invoice.paymentMethod === 'stripe') iconName = 'card-outline';
                  else if (invoice.paymentMethod === 'apple_pay') iconName = 'phone-portrait-outline';
                  else if (invoice.paymentMethod === 'cash') iconName = 'cash-outline';

                  // Format date
                  const date = new Date(invoice.createdAt);
                  const dateStr = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <TouchableOpacity
                      key={invoice.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#232323',
                        backgroundColor: '#1A1A1A',
                      }}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedInvoice(invoice);
                        setShowInvoiceModal(true);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                          width: 38, height: 38, borderRadius: 19, backgroundColor: '#232323',
                          alignItems: 'center', justifyContent: 'center', marginRight: 12
                        }}>
                          <Ionicons name={iconName} size={20} color="#f59e0b" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                            {client?.name || 'Unknown Client'}
                          </Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }}>
                            {dateStr}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', minWidth: 90 }}>
                        <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 16 }}>
                          ${invoice.total}
                        </Text>
                        <View style={{
                          marginTop: 4,
                          alignSelf: 'flex-end',
                          backgroundColor: statusBg,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}>
                          <Text style={{ color: statusColor, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }}>
                            {invoice.status}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </View>
        </View>

    </ScrollView>
  );

  const renderExportTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* --- Export Invoices Section --- */}
        <View style={{
          backgroundColor: '#1A1A1A',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#232323',
          padding: 20,
          marginBottom: 24,
          alignItems: 'center',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '100%', justifyContent: 'space-between' }}>
            <Text style={styles.title}>Export Invoices</Text>
            <Ionicons name="mail-outline" size={22} color="#f59e0b" />
          </View>
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 18, width: '100%' }}>
            Export all invoices to your email as a CSV file.
          </Text>
          <TouchableOpacity
            style={[
              styles.createButton,
              { width: '100%', justifyContent: 'center', opacity: invoices.length === 0 ? 0.5 : 1 }
            ]}
            onPress={async () => {
              if (invoices.length === 0) {
                Alert.alert('No invoices to export', 'Create invoices first to enable export.');
                return;
              }
              try {
                await apiRequest('POST', '/api/invoices/export');
                Alert.alert('Export Sent', 'Invoice export sent to your email successfully');
              } catch (error: any) {
                Alert.alert('Export Failed', error.message || 'Failed to export invoices');
              }
            }}
            disabled={invoices.length === 0}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="mail-outline" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={styles.createButtonText}>
                {invoices.length === 0 ? 'No Invoices to Export' : 'Email CSV'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
    </ScrollView>
  );
  
  const renderServicesTab = () => (
    <ScrollView style={styles.tabContent}>
       {/* Add Service Button */}
        <TouchableOpacity
          style={styles.addServiceButton}
          onPress={() => setShowServiceModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={styles.addServiceButtonText}>Add Service</Text>
        </TouchableOpacity>

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
              <Text style={styles.categoryCount}>{categoryServices.length} invoices</Text>
            </View>

            {categoryServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  !service.isActive && styles.inactiveServiceCard
                ]}
                onPress={() => {
                  setEditingService(service);
                  setServiceName(service.name);
                  setServiceDescription(service.description || '');
                  setServicePrice(service.price.toString());
                  setServiceDuration(service.duration.toString());
                  setServiceCategory(service.category);
                  setShowServiceModal(true);
                }}
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
                      size={22}
                      color={service.isActive ? "#22C55E" : "#EF4444"}
                    />
                  </TouchableOpacity>
                  {/* Delete button */}
                  <TouchableOpacity
                    style={{ marginLeft: 12, padding: 4 }}
                    onPress={() => {
                      Alert.alert(
                        'Delete Service',
                        'Are you sure you want to delete this service? This action cannot be undone.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await apiRequest('DELETE', `/api/services/${service.id}`);
                                await loadServices();
                              } catch (error) {
                                Alert.alert('Error', 'Failed to delete service');
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
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
            <Ionicons name="construct-outline" size={36} color="#737b89" />
            <Text style={styles.emptyText}>No invoices added yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first invoice to get started
            </Text>
          </View>
        )}
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Overview Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{services.length}</Text>
          <Text style={styles.statLabel}>Total Invoices</Text>
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
    </ScrollView>
  );
  return (
    <SafeAreaView style={styles.container}>
      {/* Service Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowServiceModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingService ? 'Edit Service' : 'Add Service'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowServiceModal(false);
                  setEditingService(null);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Service Name"
                placeholderTextColor="#9CA3AF"
                value={serviceName}
                onChangeText={setServiceName}
                maxLength={60}
              />
              <TextInput
                style={styles.input}
                placeholder="Description (optional)"
                placeholderTextColor="#9CA3AF"
                value={serviceDescription}
                onChangeText={setServiceDescription}
                maxLength={200}
              />
              <TextInput
                style={styles.input}
                placeholder="Price (e.g. 45)"
                placeholderTextColor="#9CA3AF"
                value={servicePrice}
                onChangeText={setServicePrice}
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="Duration (minutes)"
                placeholderTextColor="#9CA3AF"
                value={serviceDuration}
                onChangeText={setServiceDuration}
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={[styles.modalPlaceholderText, { marginTop: 8, marginBottom: 4 }]}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {['Haircuts', 'Beard Services', 'Combinations', 'Special Services'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      serviceCategory === cat && styles.categoryChipSelected,
                    ]}
                    onPress={() => setServiceCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        serviceCategory === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.createButton, { width: '100%', justifyContent: 'center', marginTop: 8 }]}
                onPress={handleCreateService}
                disabled={serviceSubmitting}
              >
                <Text style={styles.createButtonText}>
                  {serviceSubmitting
                    ? (editingService ? 'Updating...' : 'Creating...')
                    : (editingService ? 'Update Service' : 'Create Service')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      <View style={styles.header}>
        <Text style={styles.title}>Invoice</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Invoice Templates */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickTemplatesScroll}
        contentContainerStyle={styles.quickTemplatesContainer}
      >
        {/* Default Templates */}
        <TouchableOpacity
          style={[
            styles.quickTemplateCard,
            { backgroundColor: '#1A1A1A', borderColor: '#F59E0B' }
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedTemplate({
              type: 'default',
              name: 'Haircut',
              amount: '45',
              services: [],
            });
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="cut" size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
          <Text style={styles.quickTemplateName}>Haircut</Text>
          <Text style={styles.quickTemplatePrice}>$45</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickTemplateCard,
            { backgroundColor: '#1A1A1A', borderColor: '#F59E0B' }
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedTemplate({
              type: 'default',
              name: 'Beard',
              amount: '25',
              services: [],
            });
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="man" size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
          <Text style={styles.quickTemplateName}>Beard</Text>
          <Text style={styles.quickTemplatePrice}>$25</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickTemplateCard,
            { backgroundColor: '#1A1A1A', borderColor: '#F59E0B' }
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedTemplate({
              type: 'default',
              name: 'Combo',
              amount: '65',
              services: [],
            });
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="construct" size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
          <Text style={styles.quickTemplateName}>Combo</Text>
          <Text style={styles.quickTemplatePrice}>$65</Text>
        </TouchableOpacity>
        {/* Custom Templates */}
        {customTemplates.map((tpl) => (
          <TouchableOpacity
            key={tpl.id}
            style={[styles.quickTemplateCard, { backgroundColor: '#232323', borderColor: '#F59E0B' }]}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedTemplate({
                type: 'custom',
                ...tpl,
                services: tpl.serviceIds.map((id: number) => services.find(s => s.id === id)).filter(Boolean),
              });
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="star" size={22} color="#f59e0b" style={{ marginBottom: 6 }} />
            <Text style={styles.quickTemplateName} numberOfLines={1}>{tpl.name}</Text>
            <Text style={styles.quickTemplatePrice}>${tpl.amount}</Text>
          </TouchableOpacity>
        ))}
        {/* Add Template Button */}
        <TouchableOpacity
          style={[styles.quickTemplateCard, styles.addTemplateCard]}
          activeOpacity={0.7}
          onPress={() => setShowTemplateModal(true)}
        >
          <Ionicons name="add" size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
          <Text style={[styles.quickTemplateName, { color: '#F59E0B' }]}>New</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* New Template Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Template</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Template Name"
                placeholderTextColor="#9CA3AF"
                value={templateName}
                onChangeText={setTemplateName}
                maxLength={60}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount (e.g. 45)"
                placeholderTextColor="#9CA3AF"
                value={templateAmount}
                onChangeText={setTemplateAmount}
                keyboardType="numeric"
              />
              <Text style={[styles.modalPlaceholderText, { marginTop: 12, marginBottom: 4 }]}>Select Services</Text>
              <FlatList
                data={services}
                keyExtractor={(item) => item.id.toString()}
                style={{ maxHeight: 120, width: '100%' }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.serviceSelectItem,
                      templateServiceIds.includes(item.id) && styles.serviceSelectItemSelected
                    ]}
                    onPress={() => handleServiceSelect(item.id)}
                  >
                    <Text style={{ color: '#fff', flex: 1 }}>{item.name}</Text>
                    <Text style={{ color: '#F59E0B', marginLeft: 8 }}>${item.price}</Text>
                    {templateServiceIds.includes(item.id) && (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>No services available</Text>
                }
              />
              <TouchableOpacity
                style={[styles.createButton, { marginTop: 18, width: '100%', justifyContent: 'center' }]}
                onPress={handleCreateTemplate}
              >
                <Text style={styles.createButtonText}>Create Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('recentInvoice', 'Recent Invoice', 'receipt')}
        {renderTabButton('export', 'Export Invoices', 'folder')}
        {renderTabButton('services', 'Services', 'cut')}
        {renderTabButton('stats', 'Stats', 'calculator')}
      </View>

      {/* Tab Content */}
      {activeTab === 'recentInvoice' && renderRecentInvoiceTab()}
      {activeTab === 'export' && renderExportTab()}
      {activeTab === 'services' && renderServicesTab()}
      {activeTab === 'stats' && renderStatsTab()}
      
    {/* Create Invoice Modal */}
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCreateModal(false)}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContentBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Invoice</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setSelectedTemplate(null);
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {/* Placeholder content */}
          <View style={styles.modalBody}>
            {/* --- Create Invoice Form --- */}
            <CreateInvoiceModalContent
              clients={clients}
              services={services}
              selectedTemplate={selectedTemplate}
              onCancel={() => {
                setShowCreateModal(false);
                setSelectedTemplate(null);
              }}
              onCreate={(invoiceData: any) => {
                // Placeholder: API call would go here
                Alert.alert('Invoice Created', 'Invoice creation logic is not implemented yet.');
                setShowCreateModal(false);
                setSelectedTemplate(null);
              }}
            />
          </View>
        </View>
      </SafeAreaView>
{/* Invoice Details Modal */}
    <Modal
      visible={showInvoiceModal && !!selectedInvoice}
      animationType="slide"
      transparent
      onRequestClose={() => setShowInvoiceModal(false)}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContentBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invoice Details</Text>
            <TouchableOpacity
              onPress={() => setShowInvoiceModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {selectedInvoice && (
              <View style={{ width: '100%' }}>
                {/* Client Info */}
                <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 2 }}>Client</Text>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 17, marginBottom: 10 }}>
                  {clients.find((c) => c.id === selectedInvoice.clientId)?.name || 'Unknown Client'}
                </Text>
                {/* Invoice Details */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 2 }}>Details</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ color: '#9CA3AF' }}>Subtotal:</Text>
                    <Text style={{ color: '#fff' }}>${selectedInvoice.subtotal}</Text>
                  </View>
                  {selectedInvoice.tip && parseFloat(selectedInvoice.tip) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: '#9CA3AF' }}>Tip:</Text>
                      <Text style={{ color: '#fff' }}>${selectedInvoice.tip}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Total:</Text>
                    <Text style={{ color: '#F59E0B', fontWeight: '700' }}>${selectedInvoice.total}</Text>
                  </View>
                </View>
                {/* Payment Method */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 2 }}>Payment Method</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {selectedInvoice.paymentMethod === 'stripe' && (
                      <>
                        <Ionicons name="card-outline" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#9CA3AF' }}>Card Payment</Text>
                      </>
                    )}
                    {selectedInvoice.paymentMethod === 'apple_pay' && (
                      <>
                        <Ionicons name="phone-portrait-outline" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#9CA3AF' }}>Apple Pay</Text>
                      </>
                    )}
                    {selectedInvoice.paymentMethod === 'cash' && (
                      <>
                        <Ionicons name="cash-outline" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#9CA3AF' }}>Cash</Text>
                      </>
                    )}
                    {!selectedInvoice.paymentMethod && (
                      <>
                        <Ionicons name="receipt-outline" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#9CA3AF' }}>N/A</Text>
                      </>
                    )}
                  </View>
                </View>
                {/* Status */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 2 }}>Status</Text>
                  <View style={{
                    alignSelf: 'flex-start',
                    backgroundColor:
                      selectedInvoice.status === 'paid'
                        ? '#193a2f'
                        : selectedInvoice.status === 'pending'
                        ? '#2d230f'
                        : '#3a1919',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}>
                    <Text style={{
                      color:
                        selectedInvoice.status === 'paid'
                          ? '#22C55E'
                          : selectedInvoice.status === 'pending'
                          ? '#F59E0B'
                          : '#EF4444',
                      fontWeight: '700',
                      fontSize: 13,
                      textTransform: 'capitalize',
                    }}>
                      {selectedInvoice.status}
                    </Text>
                  </View>
                </View>
                {/* Created Date */}
                <View style={{ marginBottom: 2 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 2 }}>Created</Text>
                  <Text style={{ color: '#fff' }}>
                    {selectedInvoice.createdAt
                      ? (() => {
                          const date = new Date(selectedInvoice.createdAt);
                          return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                        })()
                      : 'Unknown'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
    </Modal>
    </SafeAreaView>
  );
}

// --- Service Template Modal Implementation ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // dark-bg
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
        fontSize: 24, // match web section header
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.1,
        marginBottom: 2,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f59e0b', // gold
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 18,
        shadowColor: '#f59e0b', // gold
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    createButtonText: {
        color: '#1e1e1e', // charcoal (for contrast on gold)
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.1,
    },
    addServiceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f59e0b', // gold
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 18,
        alignSelf: 'flex-end',
        marginBottom: 12,
        marginRight: 16,
        shadowColor: '#f59e0b', // gold
        shadowOpacity: 0.18,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    addServiceButtonText: {
        color: '#1e1e1e', // charcoal
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.1,
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
    backgroundColor: '#2e2e2e', // dark-card
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flex: 1,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: {
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.1,
    fontSize: 18,
  },
  statLabel: {
    fontSize: 12,
    color: '#737b89', // steel
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  categorySection: {
    marginBottom: 28,
    paddingTop: 4,
    paddingBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  categoryCount: {
    color: '#737b89', // steel
    fontWeight: '500',
    letterSpacing: 0.1,
    fontSize: 13,
  },
  serviceCard: {
    backgroundColor: '#2e2e2e', // dark-card
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    color: '#fff',
    flex: 1,
  },
  inactiveServiceName: {
    color: '#737b89', // steel
  },
  statusToggle: {
    padding: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#737b89', // steel
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
    color: '#737b89', // steel
  },
  serviceDuration: {
    fontSize: 14,
    color: '#737b89', // steel
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
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    letterSpacing: 0.1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#737b89', // steel
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.95)', // charcoal overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentBox: {
    backgroundColor: '#2e2e2e', // dark-card
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 22,
    width: '92%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#737b89', // steel
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 2,
    fontSize: 22,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  modalPlaceholderText: {
    color: '#737b89', // steel
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authPromptText: {
    fontSize: 18,
    color: '#737b89', // steel
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickTemplatesScroll: {
    maxHeight: 120,
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 16,
  },
  quickTemplatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  quickTemplateCard: {
    width: 110,
    height: 100,
    marginRight: 14,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: '#1e1e1e', // charcoal
    borderColor: '#f59e0b', // gold
    shadowColor: '#f59e0b', // gold
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 8,
  },
  quickTemplateName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  quickTemplatePrice: {
    color: '#f59e0b', // gold
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.1,
  },
  addTemplateCard: {
    backgroundColor: '#181818',
    borderStyle: 'dashed',
    borderColor: '#f59e0b', // gold
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    width: '100%',
    backgroundColor: '#1e1e1e', // charcoal
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#737b89', // steel
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  serviceSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1e1e1e', // charcoal
    marginBottom: 6,
  },
  serviceSelectItemSelected: {
    backgroundColor: '#2e2e2e', // dark-card
    borderColor: '#22C55E',
    borderWidth: 1,
  },
// Category chip styles for service modal
  categoryChip: {
    backgroundColor: '#1e1e1e', // charcoal
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#737b89', // steel
  },
  categoryChipSelected: {
    backgroundColor: '#f59e0b', // gold
    borderColor: '#f59e0b', // gold
  },
  categoryChipText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  categoryChipTextSelected: {
    color: '#1e1e1e', // charcoal
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
    gap: 6,
    flex: 1,
    minWidth: '30%',
  },
  activeTab: {
    backgroundColor: '#F59E0B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#1F2937',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
});