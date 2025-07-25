import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Star, Camera, DollarSign, Edit, Save, X, MessageCircle, Trash2, Receipt, CreditCard, Smartphone, Banknote } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isPhoneVerificationError, getPhoneVerificationMessage } from "@/lib/authUtils";
import { z } from "zod";
import type { Client, AppointmentWithRelations, GalleryPhoto, Message } from "@shared/schema";

// Create client form schema for editing
const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional().nullable(),
  preferredStyle: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  loyaltyStatus: z.enum(["regular", "vip"]).default("regular"),
});

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id || "0");
  const [isEditing, setIsEditing] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedInvoiceServices, setSelectedInvoiceServices] = useState<any[]>([]);
  const [invoiceServicesLoading, setInvoiceServicesLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments"],
    select: (data) => data?.filter(apt => apt.clientId === clientId) || [],
    enabled: !!clientId,
  });

  const { data: photos, isLoading: photosLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    select: (data) => data?.filter(photo => photo.clientId === clientId) || [],
    enabled: !!clientId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    select: (data) => data?.filter(message => message.clientId === clientId) || [],
    enabled: !!clientId,
  });

  const { data: clientInvoices, isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: [`/api/clients/${clientId}/invoices`],
    enabled: !!clientId,
  });

  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      preferredStyle: "",
      notes: "",
      loyaltyStatus: "regular",
    },
  });

  // Update form when client data loads
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        preferredStyle: client.preferredStyle || "",
        notes: client.notes || "",
        loyaltyStatus: (client.loyaltyStatus as "regular" | "vip") || "regular",
      });
    }
  }, [client, form]);

  // Mark invoice as paid (cash payments)
  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/mark-paid`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/invoices`] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      // Update the selected invoice in the modal
      if (selectedInvoice) {
        setSelectedInvoice({ ...selectedInvoice, paymentStatus: "paid" });
      }
      toast({
        title: "Payment Recorded",
        description: "Invoice marked as paid successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark invoice as paid",
        variant: "destructive",
      });
    },
  });

  // Undo cash payment
  const undoPaymentMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/undo-payment`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/invoices`] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      // Update the selected invoice in the modal
      if (selectedInvoice) {
        setSelectedInvoice({ ...selectedInvoice, paymentStatus: "pending" });
      }
      toast({
        title: "Payment Undone",
        description: "Payment status reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to undo payment",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientFormSchema>) => {
      try {
        console.log('🚀 Making API request to update client:', clientId, data);
        const result = await apiRequest("PUT", `/api/clients/${clientId}`, data);
        console.log('✅ API request successful:', result);
        return result;
      } catch (error) {
        console.error('❌ API request failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ Mutation success callback called:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Updated",
        description: "Client details have been updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      console.error('❌ Client update error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error constructor:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Check if this is a phone verification error
      if (isPhoneVerificationError(error)) {
        console.log('📱 Phone verification error detected');
        toast({
          title: "Phone Verification Required",
          description: getPhoneVerificationMessage(error),
          variant: "destructive",
        });
        // Navigate to settings after a delay
        setTimeout(() => {
          setIsEditing(false);
          navigate('/settings');
        }, 2000);
        return;
      }
      
      console.log('💥 Generic error - showing toast');
      // Try to get a meaningful error message
      const errorMessage = error?.message || 
                          error?.error || 
                          (typeof error === 'string' ? error : '') ||
                          "Failed to update client";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Deleted",
        description: "Client has been deleted successfully",
      });
      navigate("/clients");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: any) => {
    console.log('🔄 Client save initiated:', data);
    console.log('📝 Form state:', form.formState);
    console.log('🔍 Form errors:', form.formState.errors);
    
    if (Object.keys(form.formState.errors).length > 0) {
      console.error('❌ Form validation errors found:', form.formState.errors);
      toast({
        title: "Validation Error",
        description: "Please fix the form errors before saving",
        variant: "destructive",
      });
      return;
    }
    
    updateClientMutation.mutate(data);
  };

  const handleCancel = () => {
    if (client) {
      form.reset({
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        preferredStyle: client.preferredStyle || "",
        notes: client.notes || "",
        loyaltyStatus: client.loyaltyStatus || "regular",
      });
    }
    setIsEditing(false);
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-dark-bg text-white p-4">
        <div className="text-center py-8">
          <h1 className="text-xl font-bold mb-2">Client Not Found</h1>
          <Link href="/clients">
            <Button variant="link" className="text-gold">
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalSpent = appointments?.reduce((sum, apt) => sum + parseFloat(apt.price || '0'), 0) || 0;
  const upcomingAppointments = appointments?.filter(apt => 
    new Date(apt.scheduledAt) > new Date() && apt.status === 'scheduled'
  ).length || 0;

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/clients">
              <Button variant="ghost" size="sm" className="text-steel hover:text-white p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">{client.name}</h1>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button 
                  size="sm" 
                  className="gradient-gold text-charcoal tap-feedback"
                  onClick={form.handleSubmit(handleSave)}
                  disabled={updateClientMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-steel hover:text-white"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-400 hover:text-red-300"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
                      deleteClientMutation.mutate();
                    }
                  }}
                  disabled={deleteClientMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-steel/40 text-white hover:bg-steel/20"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Link href={`/appointments/new?clientId=${client.id}`}>
                  <Button size="sm" className="gradient-gold text-charcoal tap-feedback">
                    Book
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-steel hover:text-white">
                  <Phone className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Client Info */}
        <Card className="bg-dark-card border-steel/20">
          <CardContent className="p-6">
            {isEditing ? (
              <Form {...form}>
                <form className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={client.photoUrl || undefined} 
                        alt={client.name} 
                      />
                      <AvatarFallback className="bg-steel text-white text-xl">
                        {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-charcoal border-steel/40 text-white"
                                placeholder="Client name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value || ""}
                                  className="bg-charcoal border-steel/40 text-white"
                                  placeholder="Phone number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Email</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value || ""}
                                  type="email"
                                  className="bg-charcoal border-steel/40 text-white"
                                  placeholder="Email address"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Address</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""}
                                className="bg-charcoal border-steel/40 text-white"
                                placeholder="Address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="preferredStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Preferred Style</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value || ""}
                                  className="bg-charcoal border-steel/40 text-white"
                                  placeholder="Preferred style"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="loyaltyStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Loyalty Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-charcoal border-steel/40 text-white">
                                  <SelectItem value="regular" className="text-white hover:bg-steel/20">Regular</SelectItem>
                                  <SelectItem value="vip" className="text-white hover:bg-steel/20">VIP</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                className="bg-charcoal border-steel/40 text-white min-h-[80px]"
                                placeholder="Additional notes about the client"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </form>
              </Form>
            ) : (
              <>
                <div className="flex items-start space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={client.photoUrl || undefined} 
                      alt={client.name} 
                    />
                    <AvatarFallback className="bg-steel text-white text-xl">
                      {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h2 className="text-xl font-bold text-white">{client.name}</h2>
                      {client.loyaltyStatus === 'vip' && (
                        <Badge className="bg-gold text-charcoal">
                          <Star className="w-3 h-3 mr-1" />
                          VIP
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {client.phone && (
                        <div className="flex items-center text-sm text-steel">
                          <Phone className="w-4 h-4 mr-2" />
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center text-sm text-steel">
                          <Mail className="w-4 h-4 mr-2" />
                          {client.email}
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center text-sm text-steel">
                          <MapPin className="w-4 h-4 mr-2" />
                          {client.address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {client.preferredStyle && (
                  <div className="mt-4 p-3 bg-charcoal rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-1">Preferred Style</h4>
                    <p className="text-sm text-steel">{client.preferredStyle}</p>
                  </div>
                )}

                {client.notes && (
                  <div className="mt-4 p-3 bg-charcoal rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-1">Notes</h4>
                    <p className="text-sm text-steel">{client.notes}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {client.totalVisits || 0}
              </div>
              <div className="text-xs text-steel">Total Visits</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                ${totalSpent.toFixed(0)}
              </div>
              <div className="text-xs text-steel">Total Spent</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {upcomingAppointments}
              </div>
              <div className="text-xs text-steel">Upcoming</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Appointments */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                  .slice(0, 5)
                  .map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-charcoal rounded-lg">
                      <div>
                        <div className="font-medium text-white">{appointment.service.name}</div>
                        <div className="text-sm text-steel">
                          {format(new Date(appointment.scheduledAt), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gold font-medium">${appointment.price}</div>
                        <Badge 
                          variant={appointment.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No appointments yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message History */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Message History ({messages?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                {messages
                  .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                  .slice(0, showAllMessages ? messages.length : 5)
                  .map((message) => (
                    <Dialog key={message.id}>
                      <DialogTrigger asChild>
                        <div className="p-4 bg-charcoal rounded-lg cursor-pointer hover:bg-steel/20 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-white">{message.subject}</h4>
                              <p className="text-sm text-steel">
                                From: {message.customerName} • {format(new Date(message.createdAt!), 'MMM d, yyyy • h:mm a')}
                              </p>
                            </div>
                            <Badge 
                              variant={message.status === 'unread' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {message.status}
                            </Badge>
                          </div>
                          {message.serviceRequested && (
                            <div className="text-xs text-gold">
                              Service Requested: {message.serviceRequested}
                            </div>
                          )}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="bg-dark-card border-steel/20 text-white max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-white">{message.subject}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="text-sm text-steel">
                            <p>From: {message.customerName}</p>
                            <p>Date: {format(new Date(message.createdAt!), 'MMM d, yyyy • h:mm a')}</p>
                            {message.customerPhone && <p>Phone: {message.customerPhone}</p>}
                            {message.customerEmail && <p>Email: {message.customerEmail}</p>}
                            {message.serviceRequested && (
                              <p className="text-gold">Service Requested: {message.serviceRequested}</p>
                            )}
                          </div>
                          <div className="p-4 bg-charcoal rounded-lg">
                            <p className="text-white whitespace-pre-wrap">{message.message}</p>
                          </div>
                          <div className="flex justify-end">
                            <Badge 
                              variant={message.status === 'unread' ? 'destructive' : 'secondary'}
                            >
                              {message.status}
                            </Badge>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                
                {/* Show expand/collapse button if there are more than 5 messages */}
                {messages.length > 5 && (
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="link"
                      onClick={() => setShowAllMessages(!showAllMessages)}
                      className="text-gold text-sm p-0 h-auto"
                    >
                      {showAllMessages ? `Show recent 5` : `Show all ${messages.length} messages`}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Photo Gallery ({photos?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photosLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : photos && photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="polaroid card-shadow">
                    <img 
                      src={photo.photoUrl} 
                      alt={photo.description || "Client photo"} 
                      className="w-full h-32 object-cover rounded" 
                    />
                    <div className="text-xs text-center mt-2 text-steel">
                      {photo.description || format(new Date(photo.createdAt!), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No photos uploaded yet</p>
                <Link href="/gallery">
                  <Button variant="link" className="text-gold text-sm mt-2 p-0 h-auto">
                    Add photos
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice History */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Invoice History ({clientInvoices?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : clientInvoices && clientInvoices.length > 0 ? (
              <div className="space-y-3">
                {clientInvoices.map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="flex items-center justify-between p-3 bg-charcoal rounded-lg cursor-pointer hover:bg-charcoal/80 transition-colors"
                    onClick={async () => {
                      setSelectedInvoice(invoice);
                      setIsInvoiceDetailsOpen(true);

                      // Fetch services for this invoice
                      setInvoiceServicesLoading(true);
                      try {
                        const invoiceWithServices = await apiRequest(
                          "GET",
                          `/api/invoices/${invoice.id}`,
                        );
                        setSelectedInvoiceServices(
                          invoiceWithServices.services || [],
                        );
                      } catch (error) {
                        console.error(
                          "Failed to fetch invoice services:",
                          error,
                        );
                        setSelectedInvoiceServices([]);
                      } finally {
                        setInvoiceServicesLoading(false);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-steel/20 rounded-full flex items-center justify-center">
                        {invoice.paymentMethod === "stripe" && (
                          <CreditCard className="w-4 h-4 text-gold" />
                        )}
                        {invoice.paymentMethod === "apple_pay" && (
                          <Smartphone className="w-4 h-4 text-gold" />
                        )}
                        {invoice.paymentMethod === "cash" && (
                          <Banknote className="w-4 h-4 text-gold" />
                        )}
                        {!invoice.paymentMethod && (
                          <Receipt className="w-4 h-4 text-gold" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">Invoice #{invoice.id}</div>
                        <div className="text-sm text-steel">
                          {format(new Date(invoice.createdAt), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-gold font-medium">
                        ${invoice.total}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              invoice.paymentStatus === "paid"
                                ? "default"
                                : invoice.paymentStatus === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              invoice.paymentStatus === "paid"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : invoice.paymentStatus === "pending"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                            }
                          >
                            {invoice.paymentStatus || "pending"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs text-steel border-steel/30"
                          >
                            {invoice.paymentMethod ? 
                              (invoice.paymentMethod === "apple_pay" ? "Apple Pay" : 
                               invoice.paymentMethod === "stripe" ? "Card" : 
                               invoice.paymentMethod.toUpperCase()) 
                              : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No invoices yet</p>
                <Link href="/invoice">
                  <Button variant="link" className="text-gold text-sm mt-2 p-0 h-auto">
                    Create first invoice
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details Modal */}
        <Dialog
          open={isInvoiceDetailsOpen}
          onOpenChange={setIsInvoiceDetailsOpen}
        >
          <DialogContent className="bg-dark-card border-steel/20 text-white max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle className="text-white">Invoice Details</DialogTitle>
              <div className="text-steel">
                Invoice #{selectedInvoice?.id}
              </div>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                {/* Client Info */}
                <div className="p-4 bg-charcoal rounded-lg">
                  <h3 className="text-white font-medium mb-2">Client</h3>
                  <p className="text-steel">
                    {client?.name || "Unknown Client"}
                  </p>
                </div>

                {/* Services */}
                <div className="p-4 bg-charcoal rounded-lg">
                  <h3 className="text-white font-medium mb-2">Services</h3>
                  {invoiceServicesLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin w-5 h-5 border-2 border-gold border-t-transparent rounded-full" />
                    </div>
                  ) : selectedInvoiceServices && selectedInvoiceServices.length > 0 ? (
                    <div className="space-y-2">
                      {selectedInvoiceServices.map((service, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex-1">
                            <span className="text-white">{service.serviceName}</span>
                            {service.quantity > 1 && (
                              <span className="text-steel ml-2">x{service.quantity}</span>
                            )}
                          </div>
                          <span className="text-gold">
                            ${((parseFloat(service.price) || 0) * (service.quantity || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-steel">No services found</p>
                  )}
                </div>

                {/* Invoice Details */}
                <div className="p-4 bg-charcoal rounded-lg">
                  <h3 className="text-white font-medium mb-2">Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-steel">Subtotal:</span>
                      <span className="text-white">
                        ${selectedInvoice.subtotal}
                      </span>
                    </div>
                    {selectedInvoice.tip &&
                      parseFloat(selectedInvoice.tip) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-steel">Tip:</span>
                          <span className="text-white">
                            ${selectedInvoice.tip}
                          </span>
                        </div>
                      )}
                    <div className="flex justify-between text-base font-medium">
                      <span className="text-white">Total:</span>
                      <span className="text-gold">${selectedInvoice.total}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="p-4 bg-charcoal rounded-lg">
                  <h3 className="text-white font-medium mb-2">Payment Method</h3>
                  <div className="flex items-center space-x-2">
                    {selectedInvoice.paymentMethod === "stripe" && (
                      <>
                        <CreditCard className="w-4 h-4 text-gold" />
                        <span className="text-steel">Card Payment</span>
                      </>
                    )}
                    {selectedInvoice.paymentMethod === "apple_pay" && (
                      <>
                        <Smartphone className="w-4 h-4 text-gold" />
                        <span className="text-steel">Apple Pay</span>
                      </>
                    )}
                    {selectedInvoice.paymentMethod === "cash" && (
                      <>
                        <Banknote className="w-4 h-4 text-gold" />
                        <span className="text-steel">Cash</span>
                      </>
                    )}
                    {!selectedInvoice.paymentMethod && (
                      <>
                        <Receipt className="w-4 h-4 text-gold" />
                        <span className="text-steel">Pending</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="p-4 bg-charcoal rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium">Payment Status</h3>
                    {/* Toggle button for cash payments only */}
                    {selectedInvoice.paymentMethod === "cash" && (
                      <Button
                        size="sm"
                        variant={
                          selectedInvoice.paymentStatus === "paid"
                            ? "destructive"
                            : "default"
                        }
                        className={`text-xs px-3 py-1 h-7 ${
                          selectedInvoice.paymentStatus === "paid"
                            ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                            : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                        }`}
                        onClick={() => {
                          if (selectedInvoice.paymentStatus === "paid") {
                            // Undo payment
                            undoPaymentMutation.mutate(selectedInvoice.id);
                          } else {
                            // Mark as paid
                            markAsPaidMutation.mutate(selectedInvoice.id);
                          }
                        }}
                        disabled={
                          markAsPaidMutation.isPending ||
                          undoPaymentMutation.isPending
                        }
                      >
                        {markAsPaidMutation.isPending ||
                        undoPaymentMutation.isPending
                          ? "..."
                          : selectedInvoice.paymentStatus === "paid"
                            ? "Mark Unpaid"
                            : "Mark Paid"}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        selectedInvoice.paymentStatus === "paid"
                          ? "default"
                          : selectedInvoice.paymentStatus === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className={
                        selectedInvoice.paymentStatus === "paid"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : selectedInvoice.paymentStatus === "pending"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {selectedInvoice.paymentStatus || "pending"}
                    </Badge>
                  </div>
                </div>

                {/* Created Date */}
                <div className="p-4 bg-charcoal rounded-lg">
                  <h3 className="text-white font-medium mb-2">Created</h3>
                  <p className="text-steel">
                    {format(new Date(selectedInvoice.createdAt), 'MMMM d, yyyy • h:mm a')}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
