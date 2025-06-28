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
import { ArrowLeft, Calendar, Clock, User, Scissors, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Service } from "@shared/schema";

// Appointment form schema
const appointmentFormSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  serviceId: z.number().min(1, "Service is required"),
  scheduledAt: z.string().min(1, "Date and time is required").refine(
    (dateStr) => {
      const selectedDate = new Date(dateStr);
      const now = new Date();
      return selectedDate > now;
    },
    {
      message: "Please select a future date and time"
    }
  ),
  notes: z.string().optional(),
  address: z.string().optional(),
});

export default function AppointmentNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [scheduleValidation, setScheduleValidation] = useState<{
    isValidating: boolean;
    isValid?: boolean;
    message?: string;
    travelInfo?: string;
  }>({ isValidating: false });
  
  // Get clientId from URL params if provided
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get('clientId');

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm<z.infer<typeof appointmentFormSchema>>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientId: preselectedClientId ? parseInt(preselectedClientId) : 0,
      serviceId: 0,
      scheduledAt: "",
      notes: "",
      address: "",
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof appointmentFormSchema>) => {
      return apiRequest("POST", "/api/appointments", data);
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
  const validateScheduling = async (scheduledAt: string, clientId: number, serviceId: number) => {
    if (!scheduledAt || !clientId || !serviceId) return;

    const selectedClient = clients?.find(c => c.id === clientId);
    const selectedService = services?.find(s => s.id === serviceId);
    
    if (!selectedClient?.address || !selectedService) return;

    setScheduleValidation({ isValidating: true });

    try {
      const scheduledDate = new Date(scheduledAt);
      const serviceDuration = selectedService.duration || 60;
      const endTime = new Date(scheduledDate.getTime() + serviceDuration * 60 * 1000);

      const response = await apiRequest('/api/appointments/validate-scheduling', {
        method: 'POST',
        body: JSON.stringify({
          proposedStart: scheduledDate.toISOString(),
          proposedEnd: endTime.toISOString(),
          clientAddress: selectedClient.address
        }),
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

  // Generate default datetime (1 hour from now, rounded to next hour)
  useEffect(() => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const defaultDateTime = format(nextHour, "yyyy-MM-dd'T'HH:mm");
    form.setValue("scheduledAt", defaultDateTime);
  }, [form]);

  // Watch form values and validate scheduling
  const watchedValues = form.watch();
  useEffect(() => {
    const { scheduledAt, clientId, serviceId } = watchedValues;
    if (scheduledAt && clientId && serviceId) {
      const timer = setTimeout(() => {
        validateScheduling(scheduledAt, clientId, serviceId);
      }, 500); // Debounce validation
      return () => clearTimeout(timer);
    } else {
      setScheduleValidation({ isValidating: false });
    }
  }, [watchedValues.scheduledAt, watchedValues.clientId, watchedValues.serviceId]);

  const selectedClient = clients?.find(c => c.id === form.watch("clientId"));

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

                {/* Service Selection */}
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center">
                        <Scissors className="w-4 h-4 mr-2" />
                        Service
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-charcoal border-steel/40 text-white">
                          {services?.map((service) => (
                            <SelectItem 
                              key={service.id} 
                              value={service.id.toString()}
                              className="text-white hover:bg-steel/20"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span>{service.name}</span>
                                <span className="text-steel ml-2">${service.price}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          placeholder={selectedClient?.address || "Enter appointment address"}
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