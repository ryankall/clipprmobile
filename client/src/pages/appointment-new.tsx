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
import { ArrowLeft, Calendar, Clock, User, Scissors } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Service } from "@shared/schema";

// Appointment form schema
const appointmentFormSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  serviceId: z.number().min(1, "Service is required"),
  scheduledAt: z.string().min(1, "Date and time is required"),
  notes: z.string().optional(),
  address: z.string().optional(),
});

export default function AppointmentNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
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
      return apiRequest("POST", "/api/appointments", {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      navigate("/calendar");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive",
      });
    },
  });

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