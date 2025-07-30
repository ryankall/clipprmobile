import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Switch, Modal, FlatList, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiRequest } from "../../lib/api";
import type { Client } from "../../lib/types";
import { toZonedTime, format } from "date-fns-tz";
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../lib/theme';
export default function NewAppointment() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // State for clients and selection/creation
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Modal and search state for client selection
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  
  // Travel toggle, address, and travel time
  const [includeTravel, setIncludeTravel] = useState(false);
  const [address, setAddress] = useState("");
  const [travelTime, setTravelTime] = useState<number>(0);
  const [travelTimeLoading, setTravelTimeLoading] = useState(false);
  
  // Service selection (lifted from ServiceSelector)
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceSelections, setServiceSelections] = useState<{ serviceId: number; quantity: number }[]>([]);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Notes field for prefill
  const [notes, setNotes] = useState<string>("");

  // Date/time input
  const [date, setDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper to display date in readable format
  function getDisplayDate() {
    if (!date) return "Select date & time";
    try {
      const d = new Date(date);
      return d.toLocaleString();
    } catch {
      return date;
    }
  }
  
  // Schedule validation
  const [scheduleValidation, setScheduleValidation] = useState<{
    isValidating: boolean;
    isValid?: boolean;
    message?: string;
  }>({ isValidating: false });

  // Prefill from navigation params
  useEffect(() => {
    async function fetchClients() {
      setClientsLoading(true);
      try {
        const data = await apiRequest<Client[]>("GET", "/api/clients");
        setClients(data);
        setClientsLoading(false);

        // Prefill logic
        const prefillId = params.clientId ? parseInt(params.clientId as string, 10) : null;
        const prefillPhone = params.phone as string | undefined;
        const prefillName = params.clientName as string | undefined;
        const prefillEmail = params.email as string | undefined;

        let found: Client | undefined;
        if (prefillId) {
          found = data.find(c => c.id === prefillId);
        } else if (prefillPhone) {
          found = data.find(c => c.phone === prefillPhone);
        }

        if (found) {
          setSelectedClientId(found.id);
        }
      } catch (e: any) {
        setClients([]);
        setClientsLoading(false);
        setClientError("Failed to load clients");
      }
    }
    fetchClients();
  // Only depend on the specific param values, not the whole params object, to avoid unnecessary re-fetches
  }, [
    params.clientId,
    params.phone,
    params.clientName,
    params.email
  ]);

  // Prefill date, address, notes, travel, and combine date/time if present
  useEffect(() => {
    // Prefill address
    if (params.address && typeof params.address === "string") {
      setAddress(params.address);
    }
    // Prefill notes
    if (params.notes && typeof params.notes === "string") {
      setNotes(params.notes);
    }
    // Prefill travel
    if (params.travel && (params.travel === "yes" || params.travel === "true")) {
      setIncludeTravel(true);
    }
    // Prefill date/time
    if (params.date && params.time) {
      // Combine date and time into ISO string
      const iso = new Date(`${params.date}T${params.time}`).toISOString();
      setDate(iso);
    } else if (params.date) {
      setDate(params.date as string);
    }
  }, [params.address, params.notes, params.travel, params.date, params.time]);

  // Handler for selecting an existing client
  const handleSelectClient = (id: number) => {
    setSelectedClientId(id);
    setClientError(null);
  };

  // Autofill address from client when travel is enabled and client is selected
  useEffect(() => {
    if (includeTravel && selectedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client && client.address && !address) {
        setAddress(client.address);
      }
    }
  }, [includeTravel, selectedClientId, clients]);

  // Travel time calculation
  const calculateTravelTime = async (addr: string, dateStr: string) => {
    if (!addr || !dateStr) {
      setTravelTime(0);
      return;
    }
    setTravelTimeLoading(true);
    try {
      const now = new Date();
      // Use current time as placeholder, will be replaced with date/time field later
      const response = await apiRequest<any>("POST", "/api/travel-time/calculate", {
        clientAddress: addr,
        appointmentTime: now.toISOString(),
      });
      if (response.success && response.travelTime) {
        setTravelTime(response.travelTime);
      } else {
        setTravelTime(0);
      }
    } catch (e) {
      setTravelTime(0);
    }
    setTravelTimeLoading(false);
  };

  // Recalculate travel time when address or travel toggle changes
  useEffect(() => {
    if (includeTravel && address) {
      calculateTravelTime(address, new Date().toISOString());
    } else {
      setTravelTime(0);
    }
  }, [includeTravel, address]);


  // Calculate total duration from selected services
  function getTotalDuration() {
    if (!services || services.length === 0 || serviceSelections.length === 0) return 0;
    return serviceSelections.reduce((total, selection) => {
      const svc = services.find(s => s.id === selection.serviceId);
      return total + (svc?.duration || 0) * selection.quantity;
    }, 0);
  }

  // Prefill services from params after services are loaded
  useEffect(() => {
    if (
      !servicesLoading &&
      services.length > 0 &&
      params.services &&
      Array.isArray(params.services)
    ) {
      // params.services is an array of service names
      const serviceNames: string[] = params.services as string[];
      const selections: { serviceId: number; quantity: number }[] = [];
      serviceNames.forEach((name) => {
        const svc = services.find((s) => s.name === name);
        if (svc) {
          // If already in selections, increment quantity
          const idx = selections.findIndex(sel => sel.serviceId === svc.id);
          if (idx >= 0) {
            selections[idx].quantity += 1;
          } else {
            selections.push({ serviceId: svc.id, quantity: 1 });
          }
        }
      });
      // Handle customService param as a special service if needed
      if (params.customService && typeof params.customService === "string") {
        // Optionally, add as a custom service entry if your system supports it
        // For now, just add to notes
        setNotes((prev) => prev ? prev + "\nCustom Service: " + params.customService : "Custom Service: " + params.customService);
      }
      setServiceSelections(selections);
    }
  }, [servicesLoading, services, params.services, params.customService]);

  // Schedule conflict validation
  useEffect(() => {
    // Only validate scheduling if travel is enabled, matching web logic
    if (!includeTravel) {
      setScheduleValidation({ isValidating: false });
      return;
    }
    async function validateScheduling() {
      // Guards: require all fields, including address if travel is enabled
      if (
        !date ||
        !selectedClientId ||
        serviceSelections.length === 0 ||
        (includeTravel && !address)
      ) {
        setScheduleValidation({ isValidating: false });
        return;
      }
      setScheduleValidation({ isValidating: true });
      try {
        const scheduledDate = new Date(date);
        const duration = getTotalDuration();
        const endTime = new Date(scheduledDate.getTime() + duration * 60000);
        const client = clients.find(c => c.id === selectedClientId);
        // Only include clientAddress if travel is enabled
        const payload: Record<string, any> = {
          proposedStart: scheduledDate.toISOString(),
          proposedEnd: endTime.toISOString(),
        };

        if (includeTravel) {
          payload.clientAddress = address;
        }

        const response = await apiRequest<any>("POST", "/api/appointments/validate-scheduling", payload);
        setScheduleValidation({
          isValidating: false,
          isValid: response.isValid,
          message: response.conflictMessage,
        });
      } catch (e: any) {
        setScheduleValidation({
          isValidating: false,
          isValid: false,
          message: "Unable to validate scheduling - please check manually",
        });
      }
    }
    validateScheduling();
  }, [date, selectedClientId, serviceSelections, address, includeTravel]);
  

  // UI
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          >
          <Ionicons name="arrow-back" size={22} color={colors.gold} />
        </TouchableOpacity>
        <Text style={styles.heading}>Create Appointment</Text>
      </View>
      {/* Client Selection */}
      <Text style={styles.label}>Client</Text>
      {clientsLoading ? (
        <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 12 }} />
      ) : (
        <>
          <TouchableOpacity
            style={[
              styles.input,
              { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
            ]}
            onPress={() => setClientModalVisible(true)}
          >
            <Text style={{ fontSize: 16, color: selectedClientId ? "#18181B" : "#888" }}>
              {selectedClientId
                ? clients.find(c => c.id === selectedClientId)?.name || "Select client..."
                : "Select client..."}
            </Text>
          </TouchableOpacity>
          <Modal
            visible={clientModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setClientModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={[styles.label, { marginTop: 0 }]}>Select Client</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  autoFocus
                />
                <FlatList
                  data={clients.filter(
                    c =>
                      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                      c.phone.toLowerCase().includes(clientSearch.toLowerCase()) ||
                      (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
                  )}
                  keyExtractor={item => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.clientItem,
                        selectedClientId === item.id && styles.clientItemSelected,
                      ]}
                      onPress={() => {
                        handleSelectClient(item.id);
                        setClientModalVisible(false);
                        setClientSearch("");
                      }}
                    >
                      <Text style={styles.clientName}>{item.name}</Text>
                      <Text style={styles.clientPhone}>{item.phone}</Text>
                      {item.email ? <Text style={styles.clientEmail}>{item.email}</Text> : null}
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 300, marginBottom: 12 }}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", color: "#888", marginVertical: 16 }}>
                      No clients found.
                    </Text>
                  }
                  keyboardShouldPersistTaps="handled"
                />
                <Button title="Close" onPress={() => setClientModalVisible(false)} />
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Notes input (prefilled from params if present) */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={styles.input}
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      {/* Service Selection */}
      <Text style={styles.label}>Services</Text>
      <ServiceSelector
        services={services}
        setServices={setServices}
        servicesLoading={servicesLoading}
        setServicesLoading={setServicesLoading}
        serviceSelections={serviceSelections}
        setServiceSelections={setServiceSelections}
        serviceError={serviceError}
        setServiceError={setServiceError}
      />

      {/* Travel Toggle */}
      <View style={styles.travelRow}>
        <Text style={styles.label}>Travel to client location?</Text>
        <Switch
          value={includeTravel}
          onValueChange={setIncludeTravel}
        />
      </View>
      {/* Address input (shown if travel is enabled) */}
      {includeTravel && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Client Address"
            value={address}
            onChangeText={setAddress}
          />
          <Text style={styles.travelTimeLabel}>
            Travel Time: {travelTimeLoading ? "Calculating..." : `${travelTime} min`}
          </Text>
        </>
      )}

      {/* Date/Time Input */}
      <Text style={styles.label}>Date & Time</Text>
      <TouchableOpacity
        style={[styles.input, { justifyContent: "center" }]}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16, color: date ? "#18181B" : "#888" }}>
          {getDisplayDate()}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode="datetime"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(
            event: import("@react-native-community/datetimepicker").DateTimePickerEvent,
            selectedDate?: Date | undefined
          ) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selectedDate) {
              setDate(selectedDate.toISOString());
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Schedule Validation Feedback */}
      {/* Only show schedule validation feedback if travel is enabled */}
      {includeTravel && (
        scheduleValidation.isValidating ? (
          <Text style={[styles.error, { color: "#0074D9" }]}>Checking for conflicts...</Text>
        ) : scheduleValidation.isValid === false ? (
          <Text style={[styles.error, { color: "#F87171" }]}>
            {scheduleValidation.message || "Scheduling conflict detected"}
          </Text>
        ) : scheduleValidation.isValid === true ? (
          <Text style={{ color: "#22C55E", fontWeight: "bold", marginBottom: 8 }}>
            ✓ Appointment time is available
          </Text>
        ) : null
      )}

      {/* Submit Button */}
      <Button
        title="Create Appointment"
        onPress={async () => {
          // Validation
          if (!selectedClientId) {
            Alert.alert("Error", "Please select or create a client.");
            return;
          }
          if (serviceSelections.length === 0) {
            Alert.alert("Error", "Please select at least one service.");
            return;
          }
          if (!date) {
            Alert.alert("Error", "Please enter a date and time.");
            return;
          }
          if (includeTravel && !address) {
            Alert.alert("Error", "Please enter the client address for travel.");
            return;
          }
          if (includeTravel && scheduleValidation.isValid === false) {
            Alert.alert("Error", scheduleValidation.message || "Scheduling conflict detected.");
            return;
          }
          // Prepare data
          // Convert selected date/time to America/New_York before sending to backend
          let scheduledAtET = date;
          try {
            const userDate = new Date(date);
            const zoned = toZonedTime(userDate, "America/New_York");
            scheduledAtET = format(zoned, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: "America/New_York" });
          } catch (e) {
            // fallback to original date if conversion fails
            scheduledAtET = date;
          }
          const appointmentData = {
            clientId: selectedClientId,
            services: serviceSelections,
            scheduledAt: scheduledAtET,
            address: includeTravel ? address : "",
            travelTime: includeTravel ? travelTime : 0,
          };
          try {
            await apiRequest("POST", "/api/appointments", appointmentData);
            Alert.alert("Success", "Appointment created successfully");
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to create appointment");
          }
        }}
        color={colors.gold}
      />
    </ScrollView>
  );
}

// --- ServiceSelector component ---
import type { Service } from "../../lib/types";
function ServiceSelector({
  services,
  setServices,
  servicesLoading,
  setServicesLoading,
  serviceSelections,
  setServiceSelections,
  serviceError,
  setServiceError,
}: {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  servicesLoading: boolean;
  setServicesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  serviceSelections: { serviceId: number; quantity: number }[];
  setServiceSelections: React.Dispatch<React.SetStateAction<{ serviceId: number; quantity: number }[]>>;
  serviceError: string | null;
  setServiceError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  useEffect(() => {
    async function fetchServices() {
      setServicesLoading(true);
      try {
        const data = await apiRequest<Service[]>("GET", "/api/services");
        setServices(data);
        setServicesLoading(false);
      } catch (e: any) {
        setServices([]);
        setServicesLoading(false);
        setServiceError("Failed to load services");
      }
    }
    if (services.length === 0) fetchServices();
  }, []);

  const handleAddService = (serviceId: number) => {
    setServiceSelections(prev => {
      const idx = prev.findIndex(s => s.serviceId === serviceId);
      if (idx >= 0) {
        // Increase quantity
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      } else {
        // Add new
        return [...prev, { serviceId, quantity: 1 }];
      }
    });
    setServiceError(null);
  };

  const handleRemoveService = (serviceId: number) => {
    setServiceSelections(prev => {
      const idx = prev.findIndex(s => s.serviceId === serviceId);
      if (idx >= 0) {
        const updated = [...prev];
        if (updated[idx].quantity > 1) {
          updated[idx].quantity -= 1;
        } else {
          updated.splice(idx, 1);
        }
        return updated;
      }
      return prev;
    });
    setServiceError(null);
  };

  return (
    <View>
      {servicesLoading ? (
        <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 12 }} />
      ) : (
        <>
          {services.length > 0 ? (
            <View>
              {services.map(service => {
                const selection = serviceSelections.find(s => s.serviceId === service.id);
                return (
                  <View key={service.id} style={styles.serviceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceDetails}>{service.duration} min • ${service.price}</Text>
                    </View>
                    <View style={styles.serviceActions}>
                      <TouchableOpacity
                        style={styles.serviceButton}
                        onPress={() => handleRemoveService(service.id)}
                        disabled={!selection}
                      >
                        <Text style={styles.serviceButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.serviceQty}>{selection ? selection.quantity : 0}</Text>
                      <TouchableOpacity
                        style={styles.serviceButton}
                        onPress={() => handleAddService(service.id)}
                      >
                        <Text style={styles.serviceButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.error}>No services available</Text>
          )}
          {serviceError ? <Text style={styles.error}>{serviceError}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: "flex-start",
    paddingTop: Platform.OS === 'android' ? 50 : 50,
  },
  heading: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: colors.backgroundCard,
    color: colors.text,
  },
  clientList: {
    marginBottom: 8,
  },
  clientItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: colors.backgroundCardAlt,
  },
  clientItemSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldLight,
  },
  clientName: {
    fontWeight: "bold",
    fontSize: 16,
    color: colors.text,
  },
  clientPhone: {
    color: colors.textSteel,
    fontSize: 14,
  },
  clientEmail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  error: {
    color: colors.red,
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    textAlign: "center",
  },
  // --- Service selection styles ---
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.backgroundCardAlt,
  },
  serviceName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
    color: colors.text,
  },
  serviceDetails: {
    color: colors.textSteel,
    fontSize: 14,
  },
  serviceActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  serviceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  serviceButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textCharcoal,
  },
  serviceQty: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 24,
    textAlign: "center",
    color: colors.text,
  },
  iconButton: {
    backgroundColor: colors.backgroundCardAlt,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCardAlt,
    borderRadius: 8,
    padding: 10,
  },
  travelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  travelTimeLabel: {
    fontSize: 15,
    color: colors.textSteel,
    marginBottom: 8,
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backgroundOverlayAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});