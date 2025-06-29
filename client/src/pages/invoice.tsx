import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Receipt, Plus, ArrowLeft, DollarSign, CreditCard, Smartphone, Banknote, Scissors, Trash2, Edit } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema, type Invoice, type Client, type Service, type AppointmentWithRelations } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";

const invoiceFormSchema = insertInvoiceSchema.extend({
  userId: z.number().optional(),
  tipPercentage: z.number().optional(),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
});

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  duration: z.string().min(1, "Duration is required"),
  category: z.string().min(1, "Category is required"),
});

export default function InvoicePage() {
  const { id } = useParams<{ id?: string }>();
  const [location] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isServiceEditOpen, setIsServiceEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const { toast } = useToast();

  // Parse query params for pre-filled service
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const prefilledService = urlParams.get('service');

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments"],
  });

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      subtotal: "0",
      tip: "0",
      total: "0",
      status: "pending",
      paymentMethod: undefined,
    },
  });

  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      category: "",
    },
  });

  const serviceForm = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      duration: "",
      category: "",
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      return apiRequest("POST", "/api/invoices", data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice Created",
        description: "Invoice has been created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      
      // Navigate to checkout if payment is required
      const invoice = response.data;
      if (invoice.paymentMethod === 'stripe') {
        window.location.href = `/checkout/${invoice.id}`;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      // For now, we'll save templates to localStorage since there's no template table
      // In production, this would save to a database table
      const existingTemplates = JSON.parse(localStorage.getItem('invoiceTemplates') || '[]');
      const newTemplate = {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      };
      existingTemplates.push(newTemplate);
      localStorage.setItem('invoiceTemplates', JSON.stringify(existingTemplates));
      return newTemplate;
    },
    onSuccess: () => {
      toast({
        title: "Template Created", 
        description: "Invoice template saved successfully",
      });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      // Refresh templates list
      loadTemplates();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Load templates from localStorage
  const loadTemplates = () => {
    const templates = JSON.parse(localStorage.getItem('invoiceTemplates') || '[]');
    setSavedTemplates(templates);
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Service edit mutation
  const editServiceMutation = useMutation({
    mutationFn: async (data: { id: number; service: z.infer<typeof serviceFormSchema> }) => {
      return apiRequest(`/api/services/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...data.service,
          price: parseFloat(data.service.price),
          duration: parseInt(data.service.duration),
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Service Updated",
        description: "Service has been updated successfully",
      });
      setIsServiceEditOpen(false);
      setEditingService(null);
      serviceForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  // Service delete mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest(`/api/services/${serviceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Service Deleted",
        description: "Service has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  // Check if service is used in appointments
  const isServiceInUse = (serviceId: number) => {
    return appointments?.some(apt => apt.serviceId === serviceId) || false;
  };

  // Handle service edit
  const handleEditService = (service: Service) => {
    if (isServiceInUse(service.id)) {
      toast({
        title: "Cannot Edit Service",
        description: "This service is referenced in existing appointments. Please complete or cancel those appointments first.",
        variant: "destructive",
      });
      return;
    }

    setEditingService(service);
    serviceForm.reset({
      name: service.name,
      description: service.description || "",
      price: service.price.toString(),
      duration: service.duration.toString(),
      category: service.category,
    });
    setIsServiceEditOpen(true);
  };

  // Handle service delete
  const handleDeleteService = (serviceId: number) => {
    if (isServiceInUse(serviceId)) {
      toast({
        title: "Cannot Delete Service",
        description: "This service is referenced in existing appointments. Please complete or cancel those appointments first.",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Are you sure you want to delete this service? This action cannot be undone.")) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  // Service form submit
  const onServiceSubmit = (data: z.infer<typeof serviceFormSchema>) => {
    if (editingService) {
      editServiceMutation.mutate({ id: editingService.id, service: data });
    }
  };

  // Auto-calculate total when subtotal or tip changes
  const watchedSubtotal = form.watch("subtotal");
  const watchedTip = form.watch("tip");
  const watchedTipPercentage = form.watch("tipPercentage");

  useEffect(() => {
    const subtotal = parseFloat(watchedSubtotal) || 0;
    let tip = parseFloat(watchedTip) || 0;
    
    // Calculate tip from percentage if provided
    if (watchedTipPercentage && watchedTipPercentage > 0) {
      tip = subtotal * (watchedTipPercentage / 100);
      form.setValue("tip", tip.toFixed(2));
    }
    
    const total = subtotal + tip;
    form.setValue("total", total.toFixed(2));
  }, [watchedSubtotal, watchedTip, watchedTipPercentage, form]);

  // Pre-fill form based on service selection
  useEffect(() => {
    if (prefilledService && services) {
      const service = services.find(s => 
        s.category === prefilledService || 
        s.name.toLowerCase().includes(prefilledService.toLowerCase())
      );
      
      if (service) {
        form.setValue("subtotal", service.price);
      }
    }
  }, [prefilledService, services, form]);

  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    createInvoiceMutation.mutate(data);
  };

  const onTemplateSubmit = (data: z.infer<typeof templateFormSchema>) => {
    createTemplateMutation.mutate(data);
  };

  const handleQuickInvoice = (serviceType: string, price: string) => {
    form.setValue("subtotal", price);
    const service = services?.find(s => s.category === serviceType);
    if (service && clients?.[0]) {
      form.setValue("clientId", clients[0].id);
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {id ? (
              <Link href="/invoice">
                <Button variant="ghost" size="sm" className="text-steel hover:text-white p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            ) : null}
            <Receipt className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">
              {id ? "Invoice Details" : "Invoices"}
            </h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-gold text-charcoal tap-feedback">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-dark-card border-steel/20 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create Invoice</DialogTitle>
                <DialogDescription className="text-steel">
                  Create a new invoice for your client with itemized services and payment options.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Client</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-charcoal border-steel/40 text-white">
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()} className="text-white hover:bg-steel/20">
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subtotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Service Amount ($)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01"
                            className="bg-charcoal border-steel/40 text-white"
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Tip (%)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                <SelectValue placeholder="Tip %" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-charcoal border-steel/40 text-white">
                              <SelectItem value="0" className="text-white hover:bg-steel/20">No tip</SelectItem>
                              <SelectItem value="15" className="text-white hover:bg-steel/20">15%</SelectItem>
                              <SelectItem value="18" className="text-white hover:bg-steel/20">18%</SelectItem>
                              <SelectItem value="20" className="text-white hover:bg-steel/20">20%</SelectItem>
                              <SelectItem value="25" className="text-white hover:bg-steel/20">25%</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Tip Amount ($)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              step="0.01"
                              className="bg-charcoal border-steel/40 text-white"
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Total Amount ($)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01"
                            className="bg-charcoal border-steel/40 text-white font-bold text-gold"
                            placeholder="0.00"
                            readOnly
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
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-charcoal border-steel/40 text-white">
                            <SelectItem value="stripe" className="text-white hover:bg-steel/20">Card Payment</SelectItem>
                            <SelectItem value="apple_pay" className="text-white hover:bg-steel/20">Apple Pay</SelectItem>
                            <SelectItem value="cash" className="text-white hover:bg-steel/20">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-steel/40 text-steel hover:text-steel hover:bg-steel/10 hover:border-steel tap-feedback"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gradient-gold text-charcoal tap-feedback"
                      disabled={createInvoiceMutation.isPending}
                    >
                      {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Quick Invoice Templates */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white">Quick Invoice Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {/* Default Templates */}
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 h-auto p-4 text-center touch-target flex flex-col items-center space-y-2 tap-feedback hover:bg-charcoal/80"
                onClick={() => handleQuickInvoice("haircut", "45.00")}
              >
                <Receipt className="w-5 h-5 text-gold" />
                <div className="text-sm font-medium">Haircut</div>
                <div className="text-xs text-steel">$45</div>
              </Button>
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 h-auto p-4 text-center touch-target flex flex-col items-center space-y-2 tap-feedback hover:bg-charcoal/80"
                onClick={() => handleQuickInvoice("beard", "25.00")}
              >
                <Receipt className="w-5 h-5 text-gold" />
                <div className="text-sm font-medium">Beard Trim</div>
                <div className="text-xs text-steel">$25</div>
              </Button>
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 h-auto p-4 text-center touch-target flex flex-col items-center space-y-2 tap-feedback hover:bg-charcoal/80"
                onClick={() => handleQuickInvoice("combo", "65.00")}
              >
                <Receipt className="w-5 h-5 text-gold" />
                <div className="text-sm font-medium">Combo</div>
                <div className="text-xs text-steel">$65</div>
              </Button>

              {/* Saved Templates */}
              {savedTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  className="bg-charcoal border-steel/40 h-auto p-4 text-center touch-target flex flex-col items-center space-y-2 tap-feedback hover:bg-charcoal/80"
                  onClick={() => handleQuickInvoice(template.category, template.amount)}
                >
                  <Receipt className="w-5 h-5 text-gold" />
                  <div className="text-sm font-medium">{template.name}</div>
                  <div className="text-xs text-steel">${template.amount}</div>
                </Button>
              ))}

              {/* Custom Invoice Button */}
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 h-auto p-4 text-center touch-target flex flex-col items-center space-y-2 tap-feedback hover:bg-charcoal/80"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-5 h-5 text-gold" />
                <div className="text-sm font-medium">Custom</div>
                <div className="text-xs text-steel">Any amount</div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {invoices?.length || 0}
              </div>
              <div className="text-xs text-steel">Total Invoices</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {invoices?.filter(i => i.status === 'paid').length || 0}
              </div>
              <div className="text-xs text-steel">Paid</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                ${invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total), 0).toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-steel">Revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Invoice Templates Creator */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Create Quick Templates</CardTitle>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-charcoal border-steel/40 text-gold hover:bg-charcoal/80">
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-dark-card border-steel/40 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Invoice Template</DialogTitle>
                  <DialogDescription className="text-steel">
                    Create a reusable template for quick invoice generation with consistent pricing.
                  </DialogDescription>
                </DialogHeader>
                <Form {...templateForm}>
                  <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                    <FormField
                      control={templateForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Template Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-charcoal border-steel/40 text-white"
                              placeholder="e.g., Premium Haircut"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Category</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-charcoal border-steel/40 text-white">
                              <SelectItem value="haircut" className="text-white hover:bg-steel/20">Haircut</SelectItem>
                              <SelectItem value="beard" className="text-white hover:bg-steel/20">Beard Services</SelectItem>
                              <SelectItem value="combo" className="text-white hover:bg-steel/20">Combo Package</SelectItem>
                              <SelectItem value="special" className="text-white hover:bg-steel/20">Special Service</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Default Amount ($)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              step="0.01"
                              className="bg-charcoal border-steel/40 text-white"
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              className="bg-charcoal border-steel/40 text-white"
                              placeholder="Brief description of the service..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1 bg-charcoal border-steel/40 text-white hover:bg-steel/20"
                        onClick={() => setIsTemplateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 gradient-gold text-charcoal font-semibold"
                        disabled={createTemplateMutation.isPending}
                      >
                        {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <p className="text-steel text-sm">
              Create custom invoice templates for frequently used services. Templates can be quickly selected when creating new invoices, saving you time and ensuring consistent pricing.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-charcoal rounded-lg p-3 border border-steel/20">
                <div className="text-sm font-medium text-white">Quick Access</div>
                <div className="text-xs text-steel">One-tap invoicing</div>
              </div>
              <div className="bg-charcoal rounded-lg p-3 border border-steel/20">
                <div className="text-sm font-medium text-white">Consistent Pricing</div>
                <div className="text-xs text-steel">Standardized rates</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Management */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Service Templates</CardTitle>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              variant="outline" 
              size="sm" 
              className="bg-charcoal border-steel/40 text-gold hover:bg-charcoal/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </CardHeader>
          <CardContent>
            {services && services.length > 0 ? (
              <div className="space-y-3">
                {services.map((service) => {
                  const serviceInUse = isServiceInUse(service.id);
                  return (
                    <div 
                      key={service.id} 
                      className={`flex items-center justify-between p-3 bg-charcoal rounded-lg border transition-colors ${
                        serviceInUse 
                          ? 'border-amber-500/40 cursor-not-allowed' 
                          : 'border-steel/20 cursor-pointer hover:border-gold/50'
                      }`}
                      onClick={() => handleEditService(service)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">{service.name}</h3>
                            {serviceInUse && (
                              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">
                                In Use
                              </Badge>
                            )}
                          </div>
                          <span className="text-gold font-bold">${service.price}</span>
                        </div>
                        {service.description && (
                          <p className="text-sm text-steel mt-1">{service.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs border-steel/40 text-steel">
                            {service.category}
                          </Badge>
                          <span className="text-xs text-steel">{service.duration} min</span>
                        </div>
                        {serviceInUse && (
                          <p className="text-xs text-amber-400 mt-1">
                            Referenced in existing appointments - cannot edit or delete
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${
                            serviceInUse 
                              ? 'text-gray-500 cursor-not-allowed' 
                              : 'text-red-400 hover:bg-red-400/10'
                          }`}
                          disabled={serviceInUse}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteService(service.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <Scissors className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No services created yet</p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="link"
                  className="text-gold text-sm mt-2 p-0 h-auto"
                >
                  Add your first service
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.slice(0, 10).map((invoice) => {
                  const client = clients?.find(c => c.id === invoice.clientId);
                  return (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-charcoal rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-steel/20 rounded-full flex items-center justify-center">
                          {invoice.paymentMethod === 'stripe' && <CreditCard className="w-4 h-4 text-gold" />}
                          {invoice.paymentMethod === 'apple_pay' && <Smartphone className="w-4 h-4 text-gold" />}
                          {invoice.paymentMethod === 'cash' && <Banknote className="w-4 h-4 text-gold" />}
                          {!invoice.paymentMethod && <Receipt className="w-4 h-4 text-gold" />}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {client?.name || 'Unknown Client'}
                          </div>
                          <div className="text-sm text-steel">
                            {format(new Date(invoice.createdAt!), 'MMM d, yyyy • h:mm a')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gold font-medium">${invoice.total}</div>
                        <Badge 
                          variant={invoice.status === 'paid' ? 'default' : invoice.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No invoices created yet</p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="link"
                  className="text-gold text-sm mt-2 p-0 h-auto"
                >
                  Create your first invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Service Edit Modal */}
      <Dialog open={isServiceEditOpen} onOpenChange={setIsServiceEditOpen}>
        <DialogContent className="bg-dark-card border-steel/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Service</DialogTitle>
            <DialogDescription className="text-steel">
              Update service details including pricing and duration.
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4">
              <FormField
                control={serviceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Service Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-charcoal border-steel/40 text-white"
                        placeholder="e.g., Men's Haircut"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={serviceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="bg-charcoal border-steel/40 text-white"
                        placeholder="Service description..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          step="0.01"
                          className="bg-charcoal border-steel/40 text-white"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={serviceForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          className="bg-charcoal border-steel/40 text-white"
                          placeholder="30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={serviceForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-charcoal border-steel/40 text-white">
                        <SelectItem value="Haircuts" className="text-white hover:bg-steel/20">Haircuts</SelectItem>
                        <SelectItem value="Beard Services" className="text-white hover:bg-steel/20">Beard Services</SelectItem>
                        <SelectItem value="Combinations" className="text-white hover:bg-steel/20">Combinations</SelectItem>
                        <SelectItem value="Special" className="text-white hover:bg-steel/20">Special Services</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 bg-charcoal border-steel/40 text-white hover:bg-steel/20"
                  onClick={() => setIsServiceEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 gradient-gold text-charcoal font-semibold"
                  disabled={editServiceMutation.isPending}
                >
                  {editServiceMutation.isPending ? "Updating..." : "Update Service"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BottomNavigation currentPath="/invoice" />
    </div>
  );
}
