import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Phone, MapPin, Clock, XCircle, Receipt, MessageSquare, Scissors } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { AppointmentWithRelations, Service } from "@shared/schema";

interface AppointmentPreviewProps {
  appointment: AppointmentWithRelations;
  type: "next" | "current";
  services?: Service[];
  quickActionMessages?: {
    onMyWay?: string;
    runningLate?: string;
    confirmation?: string;
  };
}

const invoiceFormSchema = insertInvoiceSchema.extend({
  userId: z.number().optional(),
  services: z.array(z.object({
    serviceId: z.number(),
    quantity: z.number().min(1),
  })).min(1, "At least one service is required"),
  paymentMethod: z.enum(["cash", "card"]),
});

export function AppointmentPreview({ appointment, type, services = [], quickActionMessages }: AppointmentPreviewProps) {
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      services: [],
      tip: "0",
      paymentMethod: "cash",
    },
  });

  // Calculate ETA for next appointment
  const calculateETA = () => {
    if (type !== "next") return null;
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledAt);
    const minutesUntil = differenceInMinutes(appointmentTime, now);
    
    if (minutesUntil <= 0) return "Now";
    if (minutesUntil < 60) return `${minutesUntil} min`;
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    return `${hours}h ${mins}m`;
  };

  const markNoShowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/appointments/${appointment.id}`, {
        status: "no_show"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Marked as No Show",
        description: "Appointment has been marked as no show and time slot freed up",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as no show",
        variant: "destructive",
      });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      // Calculate totals
      let subtotal = 0;
      const selectedServices = data.services.map(serviceData => {
        const service = services.find(s => s.id === serviceData.serviceId);
        const serviceTotal = service ? parseFloat(service.price) * serviceData.quantity : 0;
        subtotal += serviceTotal;
        return {
          ...serviceData,
          price: service?.price || "0",
          name: service?.name || "Unknown Service"
        };
      });

      const tipAmount = parseFloat(data.tip || "0");
      const total = subtotal + tipAmount;

      const invoiceData = {
        clientId: appointment.clientId,
        appointmentId: appointment.id,
        subtotal: subtotal.toFixed(2),
        tip: tipAmount.toFixed(2),
        total: total.toFixed(2),
        status: data.paymentMethod === "cash" ? "paid" : "pending",
        paymentMethod: data.paymentMethod,
      };

      if (data.paymentMethod === "card") {
        // Create Stripe payment link and send SMS
        const stripeResponse = await apiRequest("POST", "/api/create-payment-link", {
          invoiceData,
          services: selectedServices,
          clientPhone: appointment.client.phone,
        });
        return stripeResponse;
      } else {
        // Cash payment - mark as paid immediately
        return apiRequest("POST", "/api/invoices", invoiceData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsInvoiceDialogOpen(false);
      form.reset();
      toast({
        title: "Invoice Created",
        description: "Invoice has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const sendQuickActionMessage = (messageType: 'onMyWay' | 'runningLate' | 'confirmation') => {
    const message = quickActionMessages?.[messageType];
    if (!message || !appointment.client.phone) return;

    // Replace placeholder variables
    const personalizedMessage = message
      .replace('{client_name}', appointment.client.name)
      .replace('{appointment_time}', format(new Date(appointment.scheduledAt), 'h:mm a'))
      .replace('{service}', appointment.service.name)
      .replace('{address}', appointment.address || '');

    // Open SMS app with pre-filled message
    const smsUrl = `sms:${appointment.client.phone}?body=${encodeURIComponent(personalizedMessage)}`;
    window.open(smsUrl, '_blank');
  };

  const handlePhoneCall = () => {
    if (appointment.client.phone) {
      window.open(`tel:${appointment.client.phone}`, '_self');
    }
  };

  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    createInvoiceMutation.mutate(data);
  };

  const eta = calculateETA();

  return (
    <Card className="bg-charcoal border-steel">
      <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-gold border-gold">
                {type === "next" ? "Next" : "Current"}
              </Badge>
              <span className="text-white font-medium">
                {format(new Date(appointment.scheduledAt), 'h:mm a')} – {appointment.client.name}
              </span>
            </div>
            {eta && (
              <Badge variant="secondary" className="bg-gold text-charcoal">
                ETA: {eta}
              </Badge>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-steel">
              <Scissors className="h-4 w-4" />
              <span>{appointment.service.name}</span>
            </div>
            
            {appointment.address && (
              <div className="flex items-center gap-2 text-steel">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{appointment.address}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
          {type === "next" && quickActionMessages && (
            <>
              {quickActionMessages.onMyWay && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendQuickActionMessage('onMyWay')}
                  className="text-xs"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  On My Way
                </Button>
              )}
              {quickActionMessages.runningLate && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendQuickActionMessage('runningLate')}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Running Late
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={handlePhoneCall}
                className="text-xs"
              >
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
            </>
          )}

          {type === "current" && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handlePhoneCall}
                className="text-xs"
              >
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
              
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => markNoShowMutation.mutate()}
                disabled={markNoShowMutation.isPending}
                className="text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" />
                No Show
              </Button>

              <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="text-xs bg-gold text-charcoal hover:bg-gold/90">
                    <Receipt className="h-3 w-3 mr-1" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-charcoal border-steel max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create Invoice</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-white font-medium">Select Services</h4>
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center justify-between">
                            <div>
                              <span className="text-white text-sm">{service.name}</span>
                              <span className="text-steel text-xs ml-2">${service.price}</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentServices = form.getValues('services');
                                const existing = currentServices.find(s => s.serviceId === service.id);
                                if (existing) {
                                  form.setValue('services', currentServices.filter(s => s.serviceId !== service.id));
                                } else {
                                  form.setValue('services', [...currentServices, { serviceId: service.id, quantity: 1 }]);
                                }
                              }}
                              className="text-xs"
                            >
                              {form.watch('services').find(s => s.serviceId === service.id) ? 'Remove' : 'Add'}
                            </Button>
                          </div>
                        ))}
                      </div>

                      <FormField
                        control={form.control}
                        name="tip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Tip ($)</FormLabel>
                            <FormControl>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-slate-800 border border-steel rounded-md text-white"
                                value={field.value || ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                name={field.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Cash (Mark as Paid)</SelectItem>
                                <SelectItem value="card">Card (Send Stripe Link)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsInvoiceDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createInvoiceMutation.isPending}
                          className="flex-1 bg-gold text-charcoal hover:bg-gold/90"
                        >
                          {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </>
          )}
          </div>
        </CardContent>
      </Card>
  );
}