import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Switch } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiRequest } from "../../lib/api";
import type { Client } from "../../lib/types";

export default function NewAppointment() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // State for clients and selection/creation
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [newClientFields, setNewClientFields] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [creatingClient, setCreatingClient] = useState(false);
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
  
  // Date/time input
  const [date, setDate] = useState("");
  
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
        } else if (prefillName) {
          setSelectedClientId(null);
          setNewClientFields({
            name: prefillName,
            phone: prefillPhone || "",
            email: prefillEmail || "",
            address: "",
          });
        }
      } catch (e: any) {
        setClients([]);
        setClientsLoading(false);
        setClientError("Failed to load clients");
      }
    }
    fetchClients();
  }, [params]);

  // Handler for selecting an existing client
  const handleSelectClient = (id: number) => {
    setSelectedClientId(id);
    setNewClientFields({
      name: "",
      phone: "",
      email: "",
      address: "",
    });
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
  }, [includeTravel, selectedClientId, clients, address]);

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

  // Handler for new client field changes
  const handleNewClientField = (field: keyof typeof newClientFields, value: string) => {
    setNewClientFields(prev => ({ ...prev, [field]: value }));
    setSelectedClientId(null);
    setClientError(null);
  };

  // Calculate total duration from selected services
  function getTotalDuration() {
    if (!services || services.length === 0 || serviceSelections.length === 0) return 0;
    return serviceSelections.reduce((total, selection) => {
      const svc = services.find(s => s.id === selection.serviceId);
      return total + (svc?.duration || 0) * selection.quantity;
    }, 0);
  }

  // Schedule conflict validation
  useEffect(() => {
    async function validateScheduling() {
      if (!date || !selectedClientId || serviceSelections.length === 0) {
        setScheduleValidation({ isValidating: false });
        return;
      }
      setScheduleValidation({ isValidating: true });
      try {
        const scheduledDate = new Date(date);
        const duration = getTotalDuration();
        const endTime = new Date(scheduledDate.getTime() + duration * 60000);
        const client = clients.find(c => c.id === selectedClientId);
        const response = await apiRequest<any>("POST", "/api/appointments/validate-scheduling", {
          proposedStart: scheduledDate.toISOString(),
          proposedEnd: endTime.toISOString(),
          clientAddress: includeTravel ? (address || client?.address || "") : "",
        });
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
  
  // Handler for creating a new client
  const handleCreateClient = async () => {
    setCreatingClient(true);
    setClientError(null);
    try {
      if (!newClientFields.name || !newClientFields.phone) {
        setClientError("Name and phone are required");
        setCreatingClient(false);
        return;
      }
      const created = await apiRequest<Client>("POST", "/api/clients", newClientFields);
      setClients(prev => [...prev, created]);
      setSelectedClientId(created.id);
      setNewClientFields({ name: "", phone: "", email: "", address: "" });
    } catch (e: any) {
      setClientError(e?.message || "Failed to create client");
    }
    setCreatingClient(false);
  };

  // UI
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Create Appointment</Text>
      {/* Client Selection */}
      <Text style={styles.label}>Client</Text>
      {clientsLoading ? (
        <ActivityIndicator size="small" color="#FFD700" style={{ marginVertical: 12 }} />
      ) : (
        <>
          {clients.length > 0 && (
            <View style={styles.clientList}>
              {clients.map(client => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientItem,
                    selectedClientId === client.id && styles.clientItemSelected,
                  ]}
                  onPress={() => handleSelectClient(client.id)}
                >
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Text style={styles.clientPhone}>{client.phone}</Text>
                  {client.email ? <Text style={styles.clientEmail}>{client.email}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.label}>Or add new client</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={newClientFields.name}
            onChangeText={text => handleNewClientField("name", text)}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={newClientFields.phone}
            onChangeText={text => handleNewClientField("phone", text)}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={newClientFields.email}
            onChangeText={text => handleNewClientField("email", text)}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={newClientFields.address}
            onChangeText={text => handleNewClientField("address", text)}
          />
          <Button
            title={creatingClient ? "Creating..." : "Create Client"}
            onPress={handleCreateClient}
            disabled={creatingClient || !newClientFields.name || !newClientFields.phone}
          />
          {clientError ? <Text style={styles.error}>{clientError}</Text> : null}
        </>
      )}
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
      <Text style={styles.label}>Date & Time (YYYY-MM-DDTHH:mm)</Text>
      <TextInput
        style={styles.input}
        placeholder="2025-07-24T14:00"
        value={date}
        onChangeText={setDate}
      />

      {/* Schedule Validation Feedback */}
      {scheduleValidation.isValidating ? (
        <Text style={[styles.error, { color: "#0074D9" }]}>Checking for conflicts...</Text>
      ) : scheduleValidation.isValid === false ? (
        <Text style={[styles.error, { color: "#F87171" }]}>
          {scheduleValidation.message || "Scheduling conflict detected"}
        </Text>
      ) : scheduleValidation.isValid === true ? (
        <Text style={{ color: "#22C55E", fontWeight: "bold", marginBottom: 8 }}>
          ✓ Appointment time is available
        </Text>
      ) : null}

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
          if (scheduleValidation.isValid === false) {
            Alert.alert("Error", scheduleValidation.message || "Scheduling conflict detected.");
            return;
          }
          // Prepare data
          const appointmentData = {
            clientId: selectedClientId,
            services: serviceSelections,
            scheduledAt: date,
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
        color="#FFD700"
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
    backgroundColor: "#fff",
    justifyContent: "flex-start",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  clientList: {
    marginBottom: 8,
  },
  clientItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: "#f9f9f9",
  },
  clientItemSelected: {
    borderColor: "#FFD700",
    backgroundColor: "#FFFBEA",
  },
  clientName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  clientPhone: {
    color: "#555",
    fontSize: 14,
  },
  clientEmail: {
    color: "#888",
    fontSize: 13,
  },
  error: {
    color: "#F87171",
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
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#f6f6f6",
  },
  serviceName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  serviceDetails: {
    color: "#555",
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
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  serviceButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#18181B",
  },
  serviceQty: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 24,
    textAlign: "center",
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
    color: "#555",
    marginBottom: 8,
    marginLeft: 2,
  },
});