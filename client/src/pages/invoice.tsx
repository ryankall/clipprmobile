import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/bottom-navigation";
import {
  Receipt,
  Plus,
  ArrowLeft,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  Scissors,
  Trash2,
  Edit,
} from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertInvoiceSchema,
  type Invoice,
  type Client,
  type Service,
  type AppointmentWithRelations,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";

const invoiceItemSchema = z.object({
  serviceId: z.number(),
  serviceName: z.string(),
  price: z.number(),
  quantity: z.number().min(1),
});

const invoiceFormSchema = insertInvoiceSchema.extend({
  userId: z.number().optional(),
  tipPercentage: z.number().optional(),
  items: z.array(invoiceItemSchema).optional(),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
});

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required").max(60, "Service name must be 60 characters or less"),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
  price: z.string().min(1, "Price is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 99999999.99;
  }, "Price must be between $0.00 and $99,999,999.99"),
  duration: z.string().min(1, "Duration is required").refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 10080; // max 1 week in minutes
  }, "Duration must be between 1 and 10,080 minutes (1 week)"),
  category: z.string().min(1, "Category is required"),
});

const serviceCreateSchema = z.object({
  name: z.string().min(1, "Service name is required").max(60, "Service name must be 60 characters or less"),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
  price: z.string().min(1, "Price is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 99999999.99;
  }, "Price must be between $0.00 and $99,999,999.99"),
  duration: z.string().min(1, "Duration is required").refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 10080; // max 1 week in minutes
  }, "Duration must be between 1 and 10,080 minutes (1 week)"),
  category: z.string().min(1, "Category is required"),
});

export default function InvoicePage() {
  const { id } = useParams<{ id?: string }>();
  const [location] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isServiceEditOpen, setIsServiceEditOpen] = useState(false);
  const [isServiceCreateOpen, setIsServiceCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [hiddenTemplates, setHiddenTemplates] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<Array<{
    serviceId: number;
    serviceName: string;
    price: number;
    quantity: number;
  }>>([]);
  const { toast } = useToast();

  // Parse query params for pre-filled service
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const prefilledService = urlParams.get("service");

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

  const serviceCreateForm = useForm<z.infer<typeof serviceCreateSchema>>({
    resolver: zodResolver(serviceCreateSchema),
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
      if (invoice.paymentMethod === "stripe") {
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
      const existingTemplates = JSON.parse(
        localStorage.getItem("invoiceTemplates") || "[]",
      );
      const newTemplate = {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      };
      existingTemplates.push(newTemplate);
      localStorage.setItem(
        "invoiceTemplates",
        JSON.stringify(existingTemplates),
      );
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
    const templates = JSON.parse(
      localStorage.getItem("invoiceTemplates") || "[]",
    );
    setSavedTemplates(templates);
  };

  const loadHiddenTemplates = () => {
    const hidden = JSON.parse(localStorage.getItem('hiddenDefaultTemplates') || '[]');
    setHiddenTemplates(hidden);
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    loadHiddenTemplates();
  }, []);

  // Calculate totals when selected services or tip change
  useEffect(() => {
    const subtotal = selectedServices.reduce((sum, service) => sum + (service.price * service.quantity), 0);
    const tipPercentage = form.watch("tipPercentage") || 0;
    const manualTip = parseFloat(form.watch("tip") || "0");
    
    // Calculate tip based on percentage if set
    const calculatedTip = tipPercentage > 0 ? (subtotal * tipPercentage / 100) : manualTip;
    const total = subtotal + calculatedTip;
    
    form.setValue("subtotal", subtotal.toFixed(2));
    if (tipPercentage > 0) {
      form.setValue("tip", calculatedTip.toFixed(2));
    }
    form.setValue("total", total.toFixed(2));
  }, [selectedServices, form.watch("tip"), form.watch("tipPercentage")]);

  // Service edit mutation
  const editServiceMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      service: z.infer<typeof serviceFormSchema>;
    }) => {
      return apiRequest("PATCH", `/api/services/${data.id}`, {
        ...data.service,
        duration: parseInt(data.service.duration),
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

  // Service create mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceCreateSchema>) => {
      const payload = {
        ...data,
        duration: parseInt(data.duration),
      };
      console.log("Sending service data:", payload);
      try {
        const result = await apiRequest("POST", "/api/services", payload);
        console.log("Service creation response:", result);
        return result;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Service Created",
        description: "Service has been created successfully",
      });
      setIsServiceCreateOpen(false);
      serviceCreateForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: (error: any) => {
      console.error("Service creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create service",
        variant: "destructive",
      });
    },
  });

  // Service delete mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest("DELETE", `/api/services/${serviceId}`);
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
    return appointments?.some((apt) => apt.serviceId === serviceId) || false;
  };

  // Handle service edit
  const handleEditService = (service: Service) => {
    if (isServiceInUse(service.id)) {
      toast({
        title: "Cannot Edit Service",
        description:
          "This service is referenced in existing appointments. Please complete or cancel those appointments first.",
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
        description:
          "This service is referenced in existing appointments. Please complete or cancel those appointments first.",
        variant: "destructive",
      });
      return;
    }

    if (
      confirm(
        "Are you sure you want to delete this service? This action cannot be undone.",
      )
    ) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  // Service form submit
  const onServiceSubmit = (data: z.infer<typeof serviceFormSchema>) => {
    if (editingService) {
      editServiceMutation.mutate({ id: editingService.id, service: data });
    }
  };

  // Service create form submit
  const onServiceCreateSubmit = (data: z.infer<typeof serviceCreateSchema>) => {
    createServiceMutation.mutate(data);
  };

  // Handle template deletion
  const handleDeleteTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      const updatedTemplates = savedTemplates.filter(template => template.id !== templateId);
      setSavedTemplates(updatedTemplates);
      localStorage.setItem('invoiceTemplates', JSON.stringify(updatedTemplates));
      
      toast({
        title: "Template Deleted",
        description: "Invoice template has been deleted successfully",
      });
    }
  };

  // Handle default template deletion
  const handleDeleteDefaultTemplate = (templateType: string) => {
    if (confirm("Are you sure you want to hide this default template? This action cannot be undone.")) {
      const hiddenTemplates = JSON.parse(localStorage.getItem('hiddenDefaultTemplates') || '[]');
      hiddenTemplates.push(templateType);
      localStorage.setItem('hiddenDefaultTemplates', JSON.stringify(hiddenTemplates));
      
      toast({
        title: "Template Hidden",
        description: "Default template has been hidden from quick access",
      });
      
      // Update state instead of reloading
      setHiddenTemplates(hiddenTemplates);
    }
  };

  // Add service to invoice
  const addServiceToInvoice = (service: Service) => {
    const existingService = selectedServices.find(s => s.serviceId === service.id);
    const servicePrice = parseFloat(service.price);
    
    if (existingService) {
      // Increase quantity if service already exists
      setSelectedServices(prev =>
        prev.map(s =>
          s.serviceId === service.id
            ? { ...s, quantity: s.quantity + 1 }
            : s
        )
      );
    } else {
      // Add new service
      setSelectedServices(prev => [
        ...prev,
        {
          serviceId: service.id,
          serviceName: service.name,
          price: servicePrice,
          quantity: 1,
        }
      ]);
    }

    // Update subtotal by recalculating from current state
    setTimeout(() => {
      const currentServices = existingService 
        ? selectedServices.map(s => s.serviceId === service.id ? { ...s, quantity: s.quantity + 1 } : s)
        : [...selectedServices, { serviceId: service.id, serviceName: service.name, price: servicePrice, quantity: 1 }];
      
      const newSubtotal = currentServices.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      form.setValue("subtotal", newSubtotal.toFixed(2));
    }, 0);
  };

  // Remove service from invoice
  const removeServiceFromInvoice = (serviceId: number) => {
    setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
    
    // Update subtotal
    const newSubtotal = selectedServices
      .filter(s => s.serviceId !== serviceId)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    form.setValue("subtotal", newSubtotal.toFixed(2));
  };

  // Update service quantity
  const updateServiceQuantity = (serviceId: number, quantity: number) => {
    if (quantity <= 0) {
      removeServiceFromInvoice(serviceId);
      return;
    }

    setSelectedServices(prev =>
      prev.map(s =>
        s.serviceId === serviceId
          ? { ...s, quantity }
          : s
      )
    );

    // Update subtotal
    const newSubtotal = selectedServices
      .map(s => s.serviceId === serviceId ? { ...s, quantity } : s)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    form.setValue("subtotal", newSubtotal.toFixed(2));
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
      const service = services.find(
        (s) =>
          s.category === prefilledService ||
          s.name.toLowerCase().includes(prefilledService.toLowerCase()),
      );

      if (service) {
        form.setValue("subtotal", service.price);
      }
    }
  }, [prefilledService, services, form]);

  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    // Include selected services in the invoice data
    const invoiceData = {
      ...data,
      items: selectedServices,
      description: selectedServices.length > 0 
        ? selectedServices.map(item => `${item.serviceName} (${item.quantity}x)`).join(', ')
        : data.description || '',
    };
    createInvoiceMutation.mutate(invoiceData);
  };

  const onTemplateSubmit = (data: z.infer<typeof templateFormSchema>) => {
    createTemplateMutation.mutate(data);
  };

  const handleQuickInvoice = (serviceType: string, price: string) => {
    form.setValue("subtotal", price);
    const service = services?.find((s) => s.category === serviceType);
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-steel hover:text-white p-2"
                >
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
              <Button
                size="sm"
                className="gradient-gold text-charcoal tap-feedback"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-dark-card border-steel/20 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create Invoice</DialogTitle>
                <DialogDescription className="text-steel">
                  Create a new invoice for your client with itemized services
                  and payment options.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Client</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                              <SelectValue placeholder="Select client" />
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

                  {/* Services Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-white">Services</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-charcoal border-steel/40 text-gold hover:bg-steel/20"
                        onClick={() => {
                          const servicesList = document.getElementById('services-list');
                          servicesList?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Service
                      </Button>
                    </div>

                    {/* Selected Services */}
                    {selectedServices.length > 0 && (
                      <div className="bg-charcoal rounded-lg border border-steel/40 p-3 space-y-2">
                        {selectedServices.map((item) => (
                          <div
                            key={item.serviceId}
                            className="flex items-center justify-between py-2 border-b border-steel/20 last:border-b-0"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white">
                                {item.serviceName}
                              </div>
                              <div className="text-xs text-steel">
                                ${item.price} × {item.quantity}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-steel hover:text-white"
                                  onClick={() =>
                                    updateServiceQuantity(item.serviceId, item.quantity - 1)
                                  }
                                >
                                  -
                                </Button>
                                <span className="text-sm text-white w-8 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-steel hover:text-white"
                                  onClick={() =>
                                    updateServiceQuantity(item.serviceId, item.quantity + 1)
                                  }
                                >
                                  +
                                </Button>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-400 hover:bg-red-400/10"
                                onClick={() => removeServiceFromInvoice(item.serviceId)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedServices.length === 0 && (
                      <div className="bg-charcoal rounded-lg border border-steel/40 p-4 text-center">
                        <div className="text-steel text-sm">
                          No services selected. Add services from the templates below.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Services Summary */}
                  <div className="bg-charcoal/50 rounded-lg p-4 border border-steel/20">
                    <h4 className="text-white text-sm font-medium mb-2">Services Summary</h4>
                    {selectedServices.length > 0 ? (
                      <div className="space-y-2">
                        {selectedServices.map((service, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-steel">
                              {service.serviceName} {service.quantity > 1 && `(${service.quantity}x)`}
                            </span>
                            <span className="text-white">
                              ${(service.price * service.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-steel/20 pt-2 mt-2">
                          <div className="flex justify-between text-sm font-medium">
                            <span className="text-white">Subtotal</span>
                            <span className="text-gold">
                              ${selectedServices.reduce((sum, service) => sum + (service.price * service.quantity), 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-steel text-sm">No services selected</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Tip (%)</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                          >
                            <FormControl>
                              <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                <SelectValue placeholder="Tip %" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-charcoal border-steel/40 text-white">
                              <SelectItem
                                value="0"
                                className="text-white hover:bg-steel/20"
                              >
                                No tip
                              </SelectItem>
                              <SelectItem
                                value="15"
                                className="text-white hover:bg-steel/20"
                              >
                                15%
                              </SelectItem>
                              <SelectItem
                                value="18"
                                className="text-white hover:bg-steel/20"
                              >
                                18%
                              </SelectItem>
                              <SelectItem
                                value="20"
                                className="text-white hover:bg-steel/20"
                              >
                                20%
                              </SelectItem>
                              <SelectItem
                                value="25"
                                className="text-white hover:bg-steel/20"
                              >
                                25%
                              </SelectItem>
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
                          <FormLabel className="text-white">
                            Tip Amount ($)
                          </FormLabel>
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
                        <FormLabel className="text-white">
                          Total Amount ($)
                        </FormLabel>
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
                        <FormLabel className="text-white">
                          Payment Method
                        </FormLabel>
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-charcoal border-steel/40 text-white">
                            <SelectItem
                              value="stripe"
                              className="text-white hover:bg-steel/20"
                            >
                              Card Payment
                            </SelectItem>
                            <SelectItem
                              value="apple_pay"
                              className="text-white hover:bg-steel/20"
                            >
                              Apple Pay
                            </SelectItem>
                            <SelectItem
                              value="cash"
                              className="text-white hover:bg-steel/20"
                            >
                              Cash
                            </SelectItem>
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
                      {createInvoiceMutation.isPending
                        ? "Creating..."
                        : "Create Invoice"}
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
            <CardTitle className="text-white">
              Quick Invoice Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {/* Default Templates */}
              {!hiddenTemplates.includes("haircut") && (
                <div
                  className="relative bg-charcoal border border-steel/40 rounded-lg p-4 text-center touch-target hover:bg-charcoal/80 cursor-pointer"
                  onClick={() => handleQuickInvoice("haircut", "45.00")}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDefaultTemplate("haircut");
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <div className="flex flex-col items-center space-y-2">
                    <Receipt className="w-5 h-5 text-gold" />
                    <div className="text-sm font-medium text-white">Haircut</div>
                    <div className="text-xs text-steel">$45</div>
                  </div>
                </div>
              )}
              {!hiddenTemplates.includes("beard") && (
                <div
                  className="relative bg-charcoal border border-steel/40 rounded-lg p-4 text-center touch-target hover:bg-charcoal/80 cursor-pointer"
                  onClick={() => handleQuickInvoice("beard", "25.00")}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDefaultTemplate("beard");
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <div className="flex flex-col items-center space-y-2">
                    <Receipt className="w-5 h-5 text-gold" />
                    <div className="text-sm font-medium text-white">Beard Trim</div>
                    <div className="text-xs text-steel">$25</div>
                  </div>
                </div>
              )}
              {!hiddenTemplates.includes("combo") && (
                <div
                  className="relative bg-charcoal border border-steel/40 rounded-lg p-4 text-center touch-target hover:bg-charcoal/80 cursor-pointer"
                  onClick={() => handleQuickInvoice("combo", "65.00")}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDefaultTemplate("combo");
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <div className="flex flex-col items-center space-y-2">
                    <Receipt className="w-5 h-5 text-gold" />
                    <div className="text-sm font-medium text-white">Combo</div>
                    <div className="text-xs text-steel">$65</div>
                  </div>
                </div>
              )}

              {/* Saved Templates */}
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="relative bg-charcoal border border-steel/40 rounded-lg p-4 text-center touch-target hover:bg-charcoal/80 cursor-pointer"
                  onClick={() => handleQuickInvoice(template.category, template.amount)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 text-red-400 hover:bg-red-400/10 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <div className="flex flex-col items-center space-y-2">
                    <Receipt className="w-5 h-5 text-gold" />
                    <div className="text-sm font-medium text-white">{template.name}</div>
                    <div className="text-xs text-steel">${template.amount}</div>
                  </div>
                </div>
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
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-gold">
                {invoices?.length || 0}
              </div>
              <div className="text-xs text-steel">Total Invoices</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-gold">
                {invoices?.filter((i) => i.status === "paid").length || 0}
              </div>
              <div className="text-xs text-steel">Paid</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20 col-span-2">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gold">
                $
                {invoices
                  ?.filter((i) => i.status === "paid")
                  .reduce((sum, i) => sum + parseFloat(i.total), 0)
                  .toFixed(2) || "0.00"}
              </div>
              <div className="text-sm text-steel">Revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Service Templates for Quick Access */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Service Templates</CardTitle>
            <Button
              onClick={() => setIsServiceCreateOpen(true)}
              variant="outline"
              size="sm"
              className="bg-charcoal border-steel/40 text-gold hover:bg-charcoal/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-steel text-sm mb-4">
              Quick access to your services for easy invoice creation. Use these templates to speed up your billing process.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {services?.slice(0, 6).map((service) => (
                <Button
                  key={service.id}
                  variant="outline"
                  onClick={() => {
                    const newService = {
                      serviceId: service.id,
                      serviceName: service.name,
                      price: parseFloat(service.price),
                      quantity: 1,
                    };
                    setSelectedServices([...selectedServices, newService]);
                    toast({
                      title: "Service Added",
                      description: `${service.name} added to invoice`,
                    });
                  }}
                  className="h-16 p-3 bg-charcoal border-steel/40 text-white hover:bg-steel/20 text-left flex flex-col justify-center items-start"
                >
                  <div className="font-medium text-sm truncate w-full">
                    {service.name}
                  </div>
                  <div className="text-gold text-xs">
                    ${parseFloat(service.price).toFixed(2)}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Services Management */}
        <Card className="bg-dark-card border-steel/20" id="services-list">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Service Templates</CardTitle>
            <Button
              onClick={() => setIsServiceCreateOpen(true)}
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
                          ? "border-amber-500/40 cursor-not-allowed"
                          : "border-steel/20 cursor-pointer hover:border-gold/50"
                      }`}
                      onClick={() => handleEditService(service)}
                    >
                      <div className="flex-1">
                        {serviceInUse && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10"
                          >
                            In Use
                          </Badge>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">
                              {service.name}
                            </h3>
                          </div>
                          <span className="text-gold font-bold">
                            ${service.price}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-sm text-steel mt-1">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="text-xs border-steel/40 text-steel"
                          >
                            {service.category}
                          </Badge>
                          <span className="text-xs text-steel">
                            {service.duration} min
                          </span>
                        </div>
                        {serviceInUse && (
                          <p className="text-xs text-amber-400 mt-1">
                            Referenced in existing appointments - cannot edit or
                            delete
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${
                            serviceInUse
                              ? "text-gray-500 cursor-not-allowed"
                              : "text-red-400 hover:bg-red-400/10"
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
                  onClick={() => setIsServiceCreateOpen(true)}
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
                  const client = clients?.find(
                    (c) => c.id === invoice.clientId,
                  );
                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-charcoal rounded-lg"
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
                          <div className="font-medium text-white">
                            {client?.name || "Unknown Client"}
                          </div>
                          <div className="text-sm text-steel">
                            {format(
                              new Date(invoice.createdAt!),
                              "MMM d, yyyy • h:mm a",
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gold font-medium">
                          ${invoice.total}
                        </div>
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
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

      {/* Service Create Modal */}
      <Dialog open={isServiceCreateOpen} onOpenChange={setIsServiceCreateOpen}>
        <DialogContent className="bg-dark-card border-steel/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Create Service</DialogTitle>
            <DialogDescription className="text-steel">
              Create a new service with basic details.
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceCreateForm}>
            <form
              onSubmit={serviceCreateForm.handleSubmit(onServiceCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={serviceCreateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Service Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={60}
                        className="bg-charcoal border-steel/40 text-white"
                        placeholder="e.g., Men's Haircut"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={serviceCreateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        maxLength={200}
                        className="bg-charcoal border-steel/40 text-white"
                        placeholder="Service description..."
                      />
                    </FormControl>
                    <div className="text-right text-xs text-steel mt-1">
                      {(field.value || "").length}/200
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceCreateForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Price ($)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          max="99999999.99"
                          className="bg-charcoal border-steel/40 text-white"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={serviceCreateForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="10080"
                          className="bg-charcoal border-steel/40 text-white"
                          placeholder="45"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={serviceCreateForm.control}
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
                        <SelectItem
                          value="Haircuts"
                          className="text-white hover:bg-steel/20"
                        >
                          Haircuts
                        </SelectItem>
                        <SelectItem
                          value="Beard Services"
                          className="text-white hover:bg-steel/20"
                        >
                          Beard Services
                        </SelectItem>
                        <SelectItem
                          value="Combinations"
                          className="text-white hover:bg-steel/20"
                        >
                          Combinations
                        </SelectItem>
                        <SelectItem
                          value="Special Services"
                          className="text-white hover:bg-steel/20"
                        >
                          Special Services
                        </SelectItem>
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
                  onClick={() => setIsServiceCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gradient-gold text-charcoal font-semibold"
                  disabled={createServiceMutation.isPending}
                >
                  {createServiceMutation.isPending
                    ? "Creating..."
                    : "Create Service"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
            <form
              onSubmit={serviceForm.handleSubmit(onServiceSubmit)}
              className="space-y-4"
            >
              <FormField
                control={serviceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Service Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={60}
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
                    <FormLabel className="text-white">
                      Description (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        maxLength={200}
                        className="bg-charcoal border-steel/40 text-white"
                        placeholder="Service description..."
                      />
                    </FormControl>
                    <div className="text-right text-xs text-steel mt-1">
                      {(field.value || "").length}/200
                    </div>
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
                          max="99999999.99"
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
                      <FormLabel className="text-white">
                        Duration (minutes)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="10080"
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
                        <SelectItem
                          value="Haircuts"
                          className="text-white hover:bg-steel/20"
                        >
                          Haircuts
                        </SelectItem>
                        <SelectItem
                          value="Beard Services"
                          className="text-white hover:bg-steel/20"
                        >
                          Beard Services
                        </SelectItem>
                        <SelectItem
                          value="Combinations"
                          className="text-white hover:bg-steel/20"
                        >
                          Combinations
                        </SelectItem>
                        <SelectItem
                          value="Special"
                          className="text-white hover:bg-steel/20"
                        >
                          Special Services
                        </SelectItem>
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
                  {editServiceMutation.isPending
                    ? "Updating..."
                    : "Update Service"}
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
