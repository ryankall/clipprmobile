import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Calendar, Clock, User, Scissors, AlertTriangle, CheckCircle, Plus, Minus, MapPin, Car } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Service } from "@shared/schema";

// Service selection interface
interface ServiceSelection {
  serviceId: number;
  quantity: number;
}

// Appointment form schema
const appointmentFormSchema = z.object({
  clientId: z.number().min(0, "Client is required"),
  services: z.array(z.object({
    serviceId: z.number(),
    quantity: z.number().min(1)
  })).min(1, "At least one service is required"),
  scheduledAt: z.string().min(1, "Date and time is required").refine(
    (dateStr) => {
      const selectedDate = new Date(dateStr);
      const now = new Date();
      // Add a 10-minute buffer to avoid timing issues
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
      return selectedDate >= tenMinutesFromNow;
    },
    {
      message: "Please select a time at least 10 minutes from now"
    }
  ),
  notes: z.string().optional(),
  address: z.string().optional(),
});

export default function AppointmentNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [serviceSelections, setServiceSelections] = useState<ServiceSelection[]>([]);
  const [scheduleValidation, setScheduleValidation] = useState<{
    isValidating: boolean;
    isValid?: boolean;
    message?: string;
    travelInfo?: string;
  }>({ isValidating: false });
  const [travelTime, setTravelTime] = useState<number>(0);
  const [travelTimeLoading, setTravelTimeLoading] = useState(false);
  
  // Calculate travel time for appointments with addresses
  const calculateTravelTime = async (address: string, scheduledAt: string) => {
    if (!address || !scheduledAt) {
      setTravelTime(0);
      return;
    }
    
    setTravelTimeLoading(true);
    try {
      const response = await apiRequest('POST', '/api/travel-time/calculate', {
        clientAddress: address,
        appointmentTime: scheduledAt,
      });
      
      if (response.success && response.travelTime) {
        setTravelTime(response.travelTime);
      } else {
        setTravelTime(0);
      }
    } catch (error) {
      console.error('Failed to calculate travel time:', error);
      setTravelTime(0);
    } finally {
      setTravelTimeLoading(false);
    }
  };
  
  // Get parameters from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get('clientId');
  const clientName = urlParams.get('clientName');
  const clientPhone = urlParams.get('phone');
  const clientEmail = urlParams.get('email');
  const prefilledServices = urlParams.get('services');
  const prefilledAddress = urlParams.get('address');
  const prefilledNotes = urlParams.get('notes');
  const prefilledScheduledAt = urlParams.get('scheduledAt');

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Find client by ID or phone number
  const foundClient = clients?.find(client => 
    preselectedClientId ? client.id === parseInt(preselectedClientId) :
    clientPhone ? client.phone === clientPhone : false
  );

  // Parse all services from URL parameter
  const parseServicesFromUrl = (servicesParam: string | null): ServiceSelection[] => {
    if (!servicesParam || !services) return [];
    
    const serviceNames = servicesParam.split(',').map(s => s.trim());
    const matchedServices: ServiceSelection[] = [];
    
    serviceNames.forEach(serviceName => {
      const matchedService = services.find(service => 
        service.name.toLowerCase().includes(serviceName.toLowerCase()) ||
        serviceName.toLowerCase().includes(service.name.toLowerCase())
      );
      
      if (matchedService) {
        // Check if service already exists in matched services
        const existingIndex = matchedServices.findIndex(s => s.serviceId === matchedService.id);
        if (existingIndex >= 0) {
          matchedServices[existingIndex].quantity += 1;
        } else {
          matchedServices.push({ serviceId: matchedService.id, quantity: 1 });
        }
      }
    });
    
    return matchedServices;
  };

  const preselectedServices = parseServicesFromUrl(prefilledServices);

  const form = useForm<z.infer<typeof appointmentFormSchema>>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientId: foundClient?.id || 0,
      services: preselectedServices,
      scheduledAt: prefilledScheduledAt || "",
      notes: prefilledNotes || "",
      address: prefilledAddress || "",
    },
  });

  // Update form when client data becomes available
  useEffect(() => {
    if (foundClient) {
      form.setValue("clientId", foundClient.id);
    } else if (clientName && !preselectedClientId) {
      // If we have client name but no existing client, show client selection dropdown
      form.setValue("clientId", 0);
    }
  }, [foundClient, clientName, preselectedClientId, form]);

  // Format and set the scheduled date/time
  useEffect(() => {
    if (prefilledScheduledAt) {
      try {
        const date = new Date(prefilledScheduledAt);
        // Convert to local time and format for datetime-local input
        const localDateTime = format(date, "yyyy-MM-dd'T'HH:mm");
        form.setValue("scheduledAt", localDateTime);
      } catch (error) {
        console.error("Error parsing scheduled date:", error);
      }
    }
  }, [prefilledScheduledAt, form]);

  // Initialize service selections from form default values
  useEffect(() => {
    if (preselectedServices.length > 0 && serviceSelections.length === 0) {
      setServiceSelections(preselectedServices);
    }
  }, [preselectedServices, serviceSelections.length]);

  // Sync serviceSelections with form values
  useEffect(() => {
    form.setValue("services", serviceSelections);
  }, [serviceSelections, form]);

  // Calculate travel time when address or scheduled time changes
  useEffect(() => {
    const address = form.watch("address");
    const scheduledAt = form.watch("scheduledAt");
    
    if (address && scheduledAt) {
      calculateTravelTime(address, scheduledAt);
    } else {
      setTravelTime(0);
    }
  }, [form.watch("address"), form.watch("scheduledAt")]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof appointmentFormSchema>) => {
      // Convert local time to UTC for backend storage
      const localDateTime = new Date(data.scheduledAt);
      const utcDateTime = localDateTime.toISOString();
      
      let finalClientId = data.clientId;
      
      // If clientId is 0, create a new client first
      if (data.clientId === 0 && clientName) {
        const newClientData = {
          name: clientName,
          phone: clientPhone || "",
          email: clientEmail || "",
        };
        
        const clientResponse = await apiRequest("POST", "/api/clients", newClientData);
        const newClient = await clientResponse.json();
        finalClientId = newClient.id;
      }
      
      // Send the full services array to the backend
      const appointmentData = {
        clientId: finalClientId,
        services: data.services, // Send full services array
        scheduledAt: utcDateTime,
        notes: data.notes,
        address: data.address
      };
      
      return apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      navigate("/calendar");
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to create appointment";
      
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If parsing fails, use default message
        }
      }
      
      toast({
        title: "Unable to Schedule",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Travel time validation function
  const validateScheduling = async (scheduledAt: string, clientId: number, selectedServices: ServiceSelection[]) => {
    if (!scheduledAt || !clientId || !selectedServices.length) return;

    const validationClient = clients?.find(c => c.id === clientId);
    const primaryService = services?.find(s => s.id === selectedServices[0].serviceId);
    
    if (!validationClient?.address || !primaryService) return;

    setScheduleValidation({ isValidating: true });

    try {
      const scheduledDate = new Date(scheduledAt);
      const serviceDuration = primaryService.duration || 60;
      const endTime = new Date(scheduledDate.getTime() + serviceDuration * 60 * 1000);

      const response = await apiRequest('POST', '/api/appointments/validate-scheduling', {
        proposedStart: scheduledDate.toISOString(),
        proposedEnd: endTime.toISOString(),
        clientAddress: validationClient.address
      });

      setScheduleValidation({
        isValidating: false,
        isValid: response.isValid,
        message: response.conflictMessage,
        travelInfo: response.travelBuffers?.length > 0 ? `Travel time calculated for ${response.travelBuffers.length} appointments` : undefined
      });
    } catch (error: any) {
      setScheduleValidation({
        isValidating: false,
        isValid: false,
        message: "Unable to validate scheduling - please check manually"
      });
    }
  };

  const handleSubmit = (data: z.infer<typeof appointmentFormSchema>) => {
    createAppointmentMutation.mutate(data);
  };

  // Generate default datetime (1 hour from now, rounded to next hour) only if no prefilled value
  useEffect(() => {
    if (!prefilledScheduledAt) {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const defaultDateTime = format(nextHour, "yyyy-MM-dd'T'HH:mm");
      form.setValue("scheduledAt", defaultDateTime);
    }
  }, [form, prefilledScheduledAt]);

  // Watch form values and validate scheduling
  const watchedValues = form.watch();
  useEffect(() => {
    const { scheduledAt, clientId, services } = watchedValues;
    if (scheduledAt && clientId && services && services.length > 0) {
      const timer = setTimeout(() => {
        validateScheduling(scheduledAt, clientId, services);
      }, 500); // Debounce validation
      return () => clearTimeout(timer);
    } else {
      setScheduleValidation({ isValidating: false });
    }
  }, [watchedValues.scheduledAt, watchedValues.clientId, watchedValues.services]);

  const currentClient = clients?.find(c => c.id === form.watch("clientId"));

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-steel hover:text-white p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">New Appointment</h1>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-gold" />
              Schedule Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Client Selection */}
                {clientName && !foundClient ? (
                  <div className="space-y-2">
                    <FormLabel className="text-white flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Client
                    </FormLabel>
                    <div className="bg-charcoal border border-steel/40 rounded-md p-3 text-white">
                      <div className="font-medium">{clientName}</div>
                      {clientPhone && <div className="text-sm text-steel">{clientPhone}</div>}
                      {clientEmail && <div className="text-sm text-steel">{clientEmail}</div>}
                      <div className="text-xs text-gold mt-1">New client - will be created with appointment</div>
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Client
                        </FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-charcoal border-steel/40 text-white">
                            {clients?.map((client) => (
                              <SelectItem 
                                key={client.id} 
                                value={client.id.toString()}
                                className="text-white hover:bg-steel/20"
                              >
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Service Selection */}
                <div className="space-y-4">
                  <FormLabel className="text-white flex items-center">
                    <Scissors className="w-4 h-4 mr-2" />
                    Services
                  </FormLabel>
                  
                  {/* Add Service Dropdown */}
                  <Select onValueChange={(value) => {
                    const serviceId = parseInt(value);
                    const existingIndex = serviceSelections.findIndex(s => s.serviceId === serviceId);
                    
                    if (existingIndex >= 0) {
                      // Increase quantity if service already selected
                      const newSelections = [...serviceSelections];
                      newSelections[existingIndex].quantity += 1;
                      setServiceSelections(newSelections);
                    } else {
                      // Add new service
                      const newSelections = [...serviceSelections, { serviceId, quantity: 1 }];
                      setServiceSelections(newSelections);
                    }
                    
                    // Update form
                    form.setValue("services", serviceSelections.length > 0 ? serviceSelections : [{ serviceId, quantity: 1 }]);
                  }}>
                    <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                      <SelectValue placeholder="Add a service" />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-steel/40 text-white">
                      {services?.map((service) => (
                        <SelectItem 
                          key={service.id} 
                          value={service.id.toString()}
                          className="text-white hover:bg-steel/20"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span>{service.name}</span>
                            <span className="text-steel ml-2">{service.duration}min</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected Services List */}
                  {serviceSelections.length > 0 && (
                    <div className="space-y-2">
                      {serviceSelections.map((selection, index) => {
                        const service = services?.find(s => s.id === selection.serviceId);
                        if (!service) return null;
                        
                        return (
                          <div key={selection.serviceId} className="flex items-center justify-between bg-charcoal/50 rounded p-3">
                            <div className="flex-1">
                              <div className="text-white font-medium">{service.name}</div>
                              <div className="text-steel text-sm">{service.duration}min each</div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-steel/40 hover:bg-steel/20"
                                onClick={() => {
                                  const newSelections = [...serviceSelections];
                                  if (newSelections[index].quantity > 1) {
                                    newSelections[index].quantity -= 1;
                                  } else {
                                    newSelections.splice(index, 1);
                                  }
                                  setServiceSelections(newSelections);
                                  form.setValue("services", newSelections);
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              
                              <span className="text-white w-8 text-center">{selection.quantity}</span>
                              
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-steel/40 hover:bg-steel/20"
                                onClick={() => {
                                  const newSelections = [...serviceSelections];
                                  newSelections[index].quantity += 1;
                                  setServiceSelections(newSelections);
                                  form.setValue("services", newSelections);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total Duration Display */}
                      <div className="bg-blue-900/20 border-blue-700/30 rounded p-3">
                        <div className="space-y-2">
                          {/* Service Duration */}
                          <div className="flex items-center justify-between text-blue-200">
                            <span className="flex items-center">
                              <Scissors className="w-4 h-4 mr-2" />
                              Service Duration
                            </span>
                            <span className="font-semibold">
                              {serviceSelections.reduce((total, selection) => {
                                const service = services?.find(s => s.id === selection.serviceId);
                                return total + (service?.duration || 0) * selection.quantity;
                              }, 0)}min
                            </span>
                          </div>
                          
                          {/* Travel Time */}
                          {(form.watch("address") || travelTime > 0) && (
                            <div className="flex items-center justify-between text-blue-200">
                              <span className="flex items-center">
                                <Car className="w-4 h-4 mr-2" />
                                Travel Time
                              </span>
                              <span className="font-semibold">
                                {travelTimeLoading ? "Calculating..." : `${travelTime}min`}
                              </span>
                            </div>
                          )}
                          
                          {/* Total Duration */}
                          <div className="flex items-center justify-between text-blue-200 pt-2 border-t border-blue-700/30">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              Total Duration
                            </span>
                            <span className="font-semibold">
                              {serviceSelections.reduce((total, selection) => {
                                const service = services?.find(s => s.id === selection.serviceId);
                                return total + (service?.duration || 0) * selection.quantity;
                              }, 0) + travelTime}min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date and Time */}
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Date & Time
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          className="bg-charcoal border-steel/40 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address (optional) */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Address (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          className="bg-charcoal border-steel/40 text-white"
                          placeholder={currentClient?.address || "Enter appointment address"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Schedule Validation Feedback */}
                {(scheduleValidation.isValidating || scheduleValidation.isValid !== undefined) && (
                  <div className="space-y-2">
                    {scheduleValidation.isValidating ? (
                      <Alert className="bg-blue-900/20 border-blue-700/30">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <AlertDescription className="text-blue-200">
                          Calculating travel time and checking for conflicts...
                        </AlertDescription>
                      </Alert>
                    ) : scheduleValidation.isValid === false ? (
                      <Alert className="bg-red-900/20 border-red-700/30">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-200">
                          {scheduleValidation.message || "Scheduling conflict detected"}
                        </AlertDescription>
                      </Alert>
                    ) : scheduleValidation.isValid === true ? (
                      <Alert className="bg-green-900/20 border-green-700/30">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <AlertDescription className="text-green-200">
                          ✓ Appointment time is available
                          {scheduleValidation.travelInfo && (
                            <div className="text-green-300 text-xs mt-1">
                              {scheduleValidation.travelInfo}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                )}

                {/* Notes (optional) */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ""}
                          className="bg-charcoal border-steel/40 text-white min-h-[80px]"
                          placeholder="Any special notes for this appointment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 gradient-gold text-charcoal tap-feedback"
                    disabled={createAppointmentMutation.isPending}
                  >
                    {createAppointmentMutation.isPending ? "Creating..." : "Create Appointment"}
                  </Button>
                  <Link href="/calendar">
                    <Button variant="outline" className="border-steel/40 text-white hover:bg-steel/20">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}