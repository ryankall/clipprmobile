import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Modal, 
  TextInput, 
  FlatList, 
  ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { utcToLocal } from '../../lib/utils';
import { apiRequest } from '../../lib/api';
import { Service } from '../../lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, theme } from '../../lib/theme';
import { Parser } from 'date-fns/parse/_lib/Parser';
import { validators } from '../../lib/utils';
import ValidatedRequiredTextInput from '../components/InputValidations'


// --- Safe ISO String Helper ---
function toISOStringSafe(value: Date): string {
  if (value instanceof Date && typeof value.toISOString === 'function') {
    return value.toISOString();
  }
  if (typeof value === 'string' && !isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

// --- Invoice and Client Types ---
type PaymentStatus = 'paid' | 'unpaid';
type PaymentMethod = 'stripe' | 'apple_pay' | 'cash' | undefined;

interface Invoice {
  id: number;
  clientId: number;
  subtotal: string;
  tip: string;
  total: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  paidBy?: string;
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
  const [addFieldErrors, setAddFieldErrors] = useState<{ [key: string]: string }>({});

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
      <View style={{ width: '100%', marginBottom: 12, maxHeight: 200 }}>
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
                    <Text style={{ color: colors.gold, marginLeft: 8 }}>${item.price}</Text>
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
        onChangeText={text => {
          const formatted = validators.formatCurrencyInput(text);
          setTip(formatted);
        }}
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
        <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 18 }}>${total.toFixed(2)}</Text>
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
  const [addFieldErrors, setAddFieldErrors] = useState<{ [key: string]: string }>({});

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'recentInvoice' | 'export' | 'blocked' | 'services' | 'stats' >('stats');

  // --- Recent Invoices State ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceServices, setSelectedInvoiceServices] = useState<Service[] | null>(null);
  const [invoiceServicesLoading, setInvoiceServicesLoading] = useState(false);
  const [invoiceServicesError, setInvoiceServicesError] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Modal state for Create Invoice
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  // Track if modal has been opened from params to prevent reopening after close
  const [hasOpenedFromParams, setHasOpenedFromParams] = useState(false);

  // Default Templates State (fetched from server)
  const [defaultTemplates, setDefaultTemplates] = useState<any[]>([]);
  const [defaultTemplatesLoading, setDefaultTemplatesLoading] = useState(false);

  // Fetch and cache default templates
  const getDefaultTemplates = async () => {
    setDefaultTemplatesLoading(true);
    try {
      // Try to get from AsyncStorage first
      const cached = await AsyncStorage.getItem('invoiceDefaultTemplates');
      if (cached) {
        setDefaultTemplates(JSON.parse(cached));
        setDefaultTemplatesLoading(false);
        return;
      }
      // If not in cache, fetch from server
      const data = await apiRequest<any[]>('GET', '/api/invoice/templates');
      setDefaultTemplates(data);
      await AsyncStorage.setItem('invoiceDefaultTemplates', JSON.stringify(data));
    } catch (e) {
      setDefaultTemplates([]);
    } finally {
      setDefaultTemplatesLoading(false);
    }
  };

  // Service Template Management Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Custom Templates State
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateAmount, setTemplateAmount] = useState('');
  const [templateServiceIds, setTemplateServiceIds] = useState<number[]>([]);
  // Template operation loading/error state
  const [templateOpLoading, setTemplateOpLoading] = useState(false);
  const [templateOpError, setTemplateOpError] = useState<string | null>(null);
  
  // --- Reset Template Form Helper ---
  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateAmount('');
    setTemplateServiceIds([]);
    setTemplateOpError(null);
  };

  const resetAddServiceForm = () => {
    setServiceName('');
    setServiceDescription('');
    setServicePrice('');
    setServiceDuration('');
  }

  // --- Prefill from navigation params ---
  const params = useLocalSearchParams();

  // Track last seen prefill params to detect changes
  const [lastPrefill, setLastPrefill] = useState<{clientId?: string|number, services?: string}>({});

  useEffect(() => {
    // Normalize params for comparison
    const clientId = params.prefillClientId ? String(params.prefillClientId) : undefined;
    const servicesStr = params.prefillServices
      ? (typeof params.prefillServices === 'string'
          ? params.prefillServices
          : JSON.stringify(params.prefillServices))
      : undefined;

    const paramsChanged =
      clientId !== lastPrefill.clientId ||
      servicesStr !== lastPrefill.services;

    // Only open modal if params are present and have changed since last open
    if ((clientId || servicesStr) && paramsChanged) {
      // Find client
      let prefillClient = undefined;
      if (clientId && clients.length > 0) {
        const cid = parseInt(clientId, 10);
        prefillClient = clients.find(c => c.id === cid);
      }
      // Find services
      let prefillServiceObjs: Service[] = [];
      if (servicesStr && services.length > 0) {
        let ids: number[] = [];
        try {
          ids = JSON.parse(servicesStr);
        } catch {}
        prefillServiceObjs = services.filter(s => ids.includes(s.id));
      }
      setSelectedTemplate({
        clientId: prefillClient?.id,
        services: prefillServiceObjs,
      });
      setShowCreateModal(true);
      setLastPrefill({ clientId, services: servicesStr });
    }

    // If params are cleared, reset lastPrefill so future param changes can trigger modal again
    if (!clientId && !servicesStr && (lastPrefill.clientId || lastPrefill.services)) {
      setLastPrefill({});
    }
    // Only run when params, clients, or services change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, clients, services]);

  // Load custom templates from AsyncStorage
  useEffect(() => {
    if (isAuthenticated) {
      loadServices();
      loadCustomTemplates();
      loadInvoicesAndClients();
      getDefaultTemplates();
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
  
  /**
   * Update a custom invoice template both on the server and in local storage.
   * @param {object} updatedTemplate - The updated template object (must include id).
   */
  const handleUpdateTemplate = async (updatedTemplate: any) => {
    if (!updatedTemplate?.id) {
      setTemplateOpError('Template ID is required for update.');
      return;
    }
    setTemplateOpLoading(true);
    setTemplateOpError(null);
    try {
      // 1. Call the server API to update the template
      const serverTemplate = await apiRequest(
        "PATCH",
        `/api/invoice/templates/${updatedTemplate.id}`,
        updatedTemplate
      );
  
      // 2. Use the server's returned template (with id, etc) for local storage
      const newTemplate = {
        ...updatedTemplate,
        ...serverTemplate, // server may return updated fields
      };
  
      // 3. Update local storage
      const updatedTemplates = customTemplates.map((tpl) =>
        tpl.id === newTemplate.id ? newTemplate : tpl
      );
      await saveCustomTemplates(updatedTemplates);
      await loadCustomTemplates(); // Always reload from storage
      setTemplateOpError(null);
      Alert.alert('Success', 'Template updated successfully.');
    } catch (error: any) {
      setTemplateOpError(error?.message || "Failed to update template. Please try again.");
      Alert.alert(
        "Error",
        error?.message || "Failed to update template. Please try again."
      );
    } finally {
      setTemplateOpLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || templateServiceIds.length === 0) {
      setTemplateOpError('All fields are required');
      return;
    }
    setTemplateOpLoading(true);
    setTemplateOpError(null);
    // Prepare template data for API
    const templatePayload = {
      name: templateName.trim(),
      amount: services
        .filter((x) => templateServiceIds.includes(x.id))
        .reduce(
          (accumulator, currentValue) =>
            accumulator + parseFloat(currentValue.price.replace("$", "")),
          0
        ),
      serviceIds: templateServiceIds
    };
  
    try {
      // 1. Call the server API to add the template
      const serverTemplate = await apiRequest(
        "POST",
        "/api/invoice/templates",
        {
          name: templatePayload.name,
          totalPrice: templatePayload.amount,
          serviceIds: templatePayload.serviceIds,
        }
      );
  
      // 2. Use the server's returned template (with id, etc) for local storage
      const newTemplate = {
        ...templatePayload,
        id: serverTemplate?.id || Date.now(), // fallback to Date.now() if no id
      };
  
      const updated = [...customTemplates, newTemplate];
      await saveCustomTemplates(updated);
      await loadCustomTemplates(); // Always reload from storage
      setShowTemplateModal(false);
      resetTemplateForm();
    } catch (error: any) {
      setTemplateOpError(error?.message || "Failed to add template. Please try again.");
      Alert.alert(
        "Error",
        error?.message || "Failed to add template. Please try again."
      );
    } finally {
      setTemplateOpLoading(false);
    }
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
      case 'beard': return colors.gold;
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
      resetAddServiceForm();
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
      style={[theme.tabButton, activeTab === tab && theme.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons name={icon as any} size={16} color={activeTab === tab ? '#1F2937' : '#6B7280'} />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );

  const renderRecentInvoiceTab = () => (
    <ScrollView style={theme.tabContent}>
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
                  let statusColor = colors.gold;
                  let statusBg = '#232323';
                  if (invoice.paymentStatus === 'paid') {
                    statusColor = '#22C55E';
                    statusBg = '#193a2f';
                  } else if (invoice.paymentStatus === 'unpaid') {
                    statusColor = colors.gold;
                    statusBg = '#2d230f';
                  }
                  let iconName: any = 'receipt-outline';
                  let iconColor: any = '#fff'
                  if (invoice.paymentMethod === 'stripe')
                  {
                    iconName = 'card-outline';
                    iconColor = '#306ff5ff'
                  } 
                  else if (invoice.paymentMethod === 'apple_pay') 
                    {
                      iconName = 'phone-portrait-outline';
                      iconColor = '#c6c6c6ff'
                    }
                  else if (invoice.paymentMethod === 'cash')
                  {
                    iconName = 'cash-outline';
                    iconColor = '#068f38ff'
                  } 

                  // Format date
                  const { user } = useAuth();
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
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#232323',
                        backgroundColor: '#1A1A1A',
                      }}
                      activeOpacity={0.85}
                      onPress={async () => {
                        setSelectedInvoice(invoice);
                        setShowInvoiceModal(true);
                        setInvoiceServicesLoading(true);
                        setInvoiceServicesError(null);
                        setSelectedInvoiceServices(null);
                        try {
                          // Try to fetch invoice details (including services)
                          const data = await apiRequest<any>('GET', `/api/invoices/${invoice.id}`);
                          if (data && Array.isArray(data.services)) {
                            setSelectedInvoiceServices(data.services);
                          } else {
                            setSelectedInvoiceServices([]);
                          }
                        } catch (err: any) {
                          setInvoiceServicesError('Failed to load services for this invoice.');
                          setSelectedInvoiceServices([]);
                        } finally {
                          setInvoiceServicesLoading(false);
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                          width: 38, height: 38, borderRadius: 19, backgroundColor: '#232323',
                          alignItems: 'center', justifyContent: 'center', marginRight: 12
                        }}>
                          <Ionicons name={iconName} size={20} color={iconColor} />
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
                        <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 16 }}>
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
                          {invoice.paymentMethod === 'cash' && invoice.paymentStatus === 'unpaid' && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#22C55E20',
                                borderRadius: 4,
                                paddingHorizontal: 4,
                                paddingVertical: 2,
                                borderWidth: 1,
                                borderColor: '#22C55E40',
                              }}
                              onPress={(e) => {
                                e.stopPropagation();
                                Alert.alert(
                                  'Mark as Paid',
                                  'Confirm that this invoice was paid in cash?',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { 
                                      text: 'Mark Paid', 
                                      onPress: async () => {
                                        try {
                                          await apiRequest('POST', `/api/invoices/${invoice.id}/mark-paid`);
                                          await loadInvoicesAndClients();
                                          Alert.alert('Success', 'Invoice marked as paid');
                                        } catch (error: any) {
                                          Alert.alert('Error', error.message || 'Failed to mark invoice as paid');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 8 }}>
                                Mark Paid
                              </Text>
                            </TouchableOpacity>
                          )}
                          {invoice.paymentMethod === 'cash' && invoice.paymentStatus === 'paid' && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#EF444420',
                                borderRadius: 4,
                                paddingHorizontal: 4,
                                paddingVertical: 2,
                                borderWidth: 1,
                                borderColor: '#EF444440',
                              }}
                              onPress={(e) => {
                                e.stopPropagation();
                                Alert.alert(
                                  'Undo Payment',
                                  'Undo this cash payment? This will mark the invoice as unpaid.',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { 
                                      text: 'Undo', 
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          await apiRequest('POST', `/api/invoices/${invoice.id}/undo-payment`);
                                          await loadInvoicesAndClients();
                                          Alert.alert('Success', 'Payment status reset');
                                        } catch (error: any) {
                                          Alert.alert('Error', error.message || 'Failed to undo payment');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 8 }}>
                                Undo Payment
                              </Text>
                            </TouchableOpacity>
                          )}
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
    <ScrollView style={theme.tabContent}>
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
    <ScrollView style={theme.tabContent}>
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
                  resetAddServiceForm();
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ValidatedRequiredTextInput
                style={styles.input}
                placeholder="Service Name"
                placeholderTextColor="#9CA3AF"
                required={true}
                value={serviceName}
                onTextChange={setServiceName}
                maxLength={30}
              />
              <TextInput
                style={styles.input}
                placeholder="Description (optional)"
                placeholderTextColor="#9CA3AF"
                value={serviceDescription}
                onChangeText={setServiceDescription}
                maxLength={200}
              />
              <ValidatedRequiredTextInput
                style={styles.input}
                placeholder="Price (e.g. 45)"
                placeholderTextColor="#9CA3AF"
                value={servicePrice}
                required={true}
                onTextChange={setServicePrice}
                type={'currency'}
                maxLength={10}
              />
              <ValidatedRequiredTextInput
                style={styles.input}
                placeholder="Duration (minutes)"
                placeholderTextColor="#9CA3AF"
                value={serviceDuration}
                required={true}
                onTextChange={setServiceDuration}
                type={'number'}
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
  
        {/* Add Template Button */}
        <TouchableOpacity
          style={[styles.quickTemplateCard, styles.addTemplateCard]}
          activeOpacity={0.7}
          onPress={() => {
            setShowTemplateModal(true);
            resetTemplateForm();
          }}
        >
          <Ionicons name="add" size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
          <Text style={[styles.quickTemplateName, { color: colors.gold }]}>New</Text>
        </TouchableOpacity>            
        {/* Custom Templates */}
        {customTemplates.map((tpl) => (
          <View
            key={tpl.id}
            style={[
              styles.quickTemplateCard,
              { backgroundColor: '#232323', borderColor: colors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }
            ]}
          >
            <TouchableOpacity
              style={{  flex: 1, alignItems: 'center', minWidth: 0 }}
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
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                padding: 4,
                zIndex: 1, // make sure it stays on top
              }}
              onPress={async () => {
                setTemplateOpLoading(true);
                setTemplateOpError(null);
                Alert.alert(
                  'Delete Template',
                  'Are you sure you want to delete this template? This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await apiRequest('DELETE', `/api/invoice/templates/${tpl.id}`);
                          const updated = customTemplates.filter(t => t.id !== tpl.id);
                          await saveCustomTemplates(updated);
                          await loadCustomTemplates();
                          setTemplateOpError(null);
                        } catch (error) {
                          const msg =
                            (error && typeof error === 'object' && 'message' in error)
                              ? (error as any).message
                              : String(error) || 'Failed to delete template. Please try again.';
                          setTemplateOpError(msg);
                          Alert.alert('Error', msg);
                        } finally {
                          setTemplateOpLoading(false);
                        }
                      },
                    },
                  ]
                );
              }}
              accessibilityLabel="Delete template"
            >
  <Ionicons name="close" size={16} color="#EF4444" />
            </TouchableOpacity>

          </View>
        ))}

      </ScrollView>
      {/* New Template Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowTemplateModal(false);
          resetTemplateForm();
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Template</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
                }}
                style={styles.modalCloseButton}
              >
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
                editable={!templateOpLoading}
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
                    onPress={() => !templateOpLoading && handleServiceSelect(item.id)}
                    disabled={templateOpLoading}
                  >
                    <Text style={{ color: '#fff', flex: 1 }}>{item.name}</Text>
                    <Text style={{ color: colors.gold, marginLeft: 8 }}>${item.price}</Text>
                    {templateServiceIds.includes(item.id) && (
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>No services available</Text>
                }
              />
              {templateOpError && (
                <Text style={{ color: '#EF4444', marginTop: 8, fontWeight: '600', textAlign: 'center' }}>
                  {templateOpError}
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  { marginTop: 18, width: '100%', justifyContent: 'center', opacity: templateOpLoading ? 0.7 : 1 }
                ]}
                onPress={handleCreateTemplate}
                disabled={templateOpLoading}
              >
                {templateOpLoading ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : (
                  <Text style={styles.createButtonText}>Create Template</Text>
                )}
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
                // Do not clear hasOpenedFromParams here; let effect handle it only when params actually change
                router.setParams({ prefillClientId: undefined, prefillServices: undefined });
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <CreateInvoiceModalContent
              clients={clients}
              services={services}
              selectedTemplate={selectedTemplate}
              onCancel={() => {
                setShowCreateModal(false);
                setSelectedTemplate(null);
                // Do not clear hasOpenedFromParams here; let effect handle it only when params actually change
                router.setParams({ prefillClientId: undefined, prefillServices: undefined });
              }}
              onCreate={async (invoiceData: any) => {
                try {
                  // 1. Create the invoice and get the result (should include id, paymentMethod, clientId, etc)
                  const createdInvoice = await apiRequest('POST', '/api/invoices', invoiceData);

                  setShowCreateModal(false);
                  setSelectedTemplate(null);
                  // Do not clear hasOpenedFromParams here; let effect handle it only when params actually change
                  router.setParams({ prefillClientId: undefined, prefillServices: undefined });
                  await loadInvoicesAndClients();

                  // 2. If payment method is "stripe", try to send the Stripe link via SMS or email
                  if (
                    createdInvoice &&
                    (createdInvoice.paymentMethod === 'stripe' || invoiceData.paymentMethod === 'stripe')
                  ) {
                    // Find the client object
                    const clientId = createdInvoice.clientId || invoiceData.clientId;
                    const clientObj = clients.find((c) => c.id === clientId);

                    let sent = false;
                    let sendError = null;

                    // Prefer SMS if phone exists, else email
                    if (clientObj?.phone) {
                      try {
                        await apiRequest('POST', `/api/invoices/${createdInvoice.id}/send-sms`);
                        sent = true;
                        Alert.alert('Success', 'Stripe payment link sent to client via SMS.');
                      } catch (err: any) {
                        sendError = err?.message || 'Failed to send SMS with Stripe link.';
                        // Try email if phone failed and email exists
                        if (clientObj?.email) {
                          try {
                            await apiRequest('POST', `/api/invoices/${createdInvoice.id}/send-email`);
                            sent = true;
                            Alert.alert('Success', 'Stripe payment link sent to client via email.');
                          } catch (err2: any) {
                            sendError += '\n' + (err2?.message || 'Failed to send email with Stripe link.');
                          }
                        }
                      }
                    } else if (clientObj?.email) {
                      try {
                        await apiRequest('POST', `/api/invoices/${createdInvoice.id}/send-email`);
                        sent = true;
                        Alert.alert('Success', 'Stripe payment link sent to client via email.');
                      } catch (err: any) {
                        sendError = err?.message || 'Failed to send email with Stripe link.';
                      }
                    } else {
                      sendError = 'Client has no phone or email to send Stripe link.';
                    }

                    if (!sent && sendError) {
                      Alert.alert('Notice', sendError);
                    }
                  } else {
                    Alert.alert('Success', 'Invoice created successfully.');
                  }
                } catch (error: any) {
                  Alert.alert('Error', error?.message || 'Failed to create invoice.');
                }
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
    {/* Invoice Details Modal */}
    <InvoiceDetailsModal
      visible={showInvoiceModal && !!selectedInvoice}
      invoice={selectedInvoice}
      onClose={() => setShowInvoiceModal(false)}
      client={clients.find((c) => c.id === selectedInvoice?.clientId)}
      reloadInvoices={loadInvoicesAndClients}
    />
    </SafeAreaView>
  );
}

/**
 * InvoiceDetailsModal - Detailed modal for invoice info and actions
 * Modeled after the modal in mobile/app/clients/[id].tsx
 */
function InvoiceDetailsModal({
  visible,
  invoice,
  onClose,
  client,
  reloadInvoices,
}: {
  visible: boolean;
  invoice: any;
  onClose: () => void;
  client: any;
  reloadInvoices: () => void;
}) {
  const [services, setServices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [marking, setMarking] = React.useState(false);
  const [sendingSMS, setSendingSMS] = React.useState(false);
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Always fetch the latest invoice by ID when modal opens
  React.useEffect(() => {
    if (!invoice) return;
    setLoading(true);
    setError(null);
    apiRequest<any>('GET', `/api/invoices/${invoice.id}`)
      .then((data) => {
        // Always use the latest services array from backend, matching web
        let found = Array.isArray(data.services) ? data.services : [];
        // Minimal fallback for legacy support
        if ((!found || found.length === 0) && data.service && typeof data.service === 'object') {
          found = [data.service];
        }
        setServices(found);
      })
      .catch((err) => {
        setError('Failed to load services');
        setServices([]);
      })
      .finally(() => setLoading(false));
  }, [invoice]);

  // Mark as paid/unpaid (cash)
  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      await apiRequest('POST', `/api/invoices/${invoice.id}/mark-paid`);
      onClose();
      await reloadInvoices();
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
      await reloadInvoices();
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
              await reloadInvoices();
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

  if (!invoice) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContentBox, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginVertical: 16 }} />
            <Text style={{ color: '#fff', fontSize: 16, marginTop: 12 }}>No invoice selected</Text>
            <TouchableOpacity
              style={[styles.createButton, { alignSelf: 'center', marginTop: 18 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Format date
  const date = invoice.createdAt ? new Date(invoice.createdAt) : null;
  const { user } = useAuth();
  const localDate = invoice.createdAt
    ? utcToLocal(
        typeof invoice.createdAt === "string"
          ? invoice.createdAt
          : "",
        user?.timezone
      )
    : null;
  const dateStr = localDate
    ? `${localDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${localDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : 'Unknown';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContentBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invoice Details</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 16 }}>
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
              {loading ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Loading services...</Text>
                </View>
              ) : error ? (
                <Text style={{ color: '#EF4444', textAlign: 'center', marginVertical: 8 }}>{error}</Text>
              ) : services.length > 0 ? (
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
                        {(svc.service?.duration || svc.duration) ? (
                          <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                            {(svc.service?.duration || svc.duration)} min
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
                  {/* Totals Section */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTopWidth: 1,
                      borderTopColor: '#232323',
                      marginTop: 8,
                      paddingTop: 6,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      Total Duration:
                    </Text>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      {services.reduce(
                        (total, svc) =>
                          total +
                          ((svc.service?.duration
                            ? parseInt(svc.service.duration, 10)
                            : svc.duration
                            ? parseInt(svc.duration, 10)
                            : 0) * (svc.quantity || 1)),
                        0
                      )}{' '}
                      min
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      Total Price:
                    </Text>
                    <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 15 }}>
                      $
                      {services
                        .reduce(
                          (total, svc) =>
                            total +
                            ((parseFloat(svc.price) || 0) * (svc.quantity || 1)),
                          0
                        )
                        .toFixed(2)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.infoBlockText}>
                  No services found for this invoice.
                  {'\n'}
                  (If this is unexpected, the invoice may be missing service data.)
                </Text>
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
                      : { color: colors.gold, fontWeight: 'bold' }
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
                    styles.createButton,
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
                      styles.createButton,
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
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
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
        backgroundColor: colors.gold, // gold
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 18,
        shadowColor: colors.gold, // gold
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
        backgroundColor: colors.gold, // gold
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 18,
        alignSelf: 'flex-end',
        marginBottom: 12,
        marginRight: 16,
        shadowColor: colors.gold, // gold
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
    backgroundColor: 'rgba(0,0,0,0.7)', // charcoal overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentBox: {
    backgroundColor: '#18181B', // dark-card
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
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
  iconButton: {
    backgroundColor: '#23232A',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: colors.gold, // gold
    shadowColor: colors.gold, // gold
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
    color: colors.gold, // gold
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.1,
  },
  addTemplateCard: {
    backgroundColor: '#181818',
    borderStyle: 'dashed',
    borderColor: colors.gold, // gold
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
    backgroundColor: colors.gold, // gold
    borderColor: colors.gold, // gold
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
    backgroundColor: colors.gold,
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