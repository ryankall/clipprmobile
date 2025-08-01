import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  MessageSquare,
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
  sendEmail: z.boolean().default(false),
  sendSMS: z.boolean().default(false),
  paymentStatus: z.enum(["paid", "unpaid"]).default("unpaid"),
});

const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(60, "Template name must be 60 characters or less"),
  services: z.array(z.number()).min(1, "At least one service is required"),
});

const serviceFormSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(60, "Service name must be 60 characters or less"),
  description: z
    .string()
    .max(200, "Description must be 200 characters or less")
    .optional(),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 99999999.99;
    }, "Price must be between $0.00 and $99,999,999.99"),
  duration: z
    .string()
    .min(1, "Duration is required")
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1 && num <= 10080; // max 1 week in minutes
    }, "Duration must be between 1 and 10,080 minutes (1 week)"),
  category: z.string().min(1, "Category is required"),
});

const serviceCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Service name is required")
    .max(60, "Service name must be 60 characters or less"),
  description: z
    .string()
    .max(200, "Description must be 200 characters or less")
    .optional(),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 99999999.99;
    }, "Price must be between $0.00 and $99,999,999.99"),
  duration: z
    .string()
    .min(1, "Duration is required")
    .refine((val) => {
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
  const [isServiceSelectOpen, setIsServiceSelectOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [hiddenTemplates, setHiddenTemplates] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<
    Array<{
      serviceId: number;
      serviceName: string;
      price: number;
      quantity: number;
    }>
  >([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceServices, setSelectedInvoiceServices] = useState<
    Array<{ id: number; quantity: number; price: string; service: Service }>
  >([]);
  const [invoiceServicesLoading, setInvoiceServicesLoading] = useState(false);
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [showRecentInvoices, setShowRecentInvoices] = useState(false); // Default to hidden
  const [showExportCard, setShowExportCard] = useState(false); // Default to hidden
  const { toast } = useToast();

  // Parse query params for pre-filled service and appointment data
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const prefilledService = urlParams.get("service");
  const prefilledAppointment = urlParams.get("prefill");

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

  const { data: invoiceTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/invoice/templates"],
  });

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      subtotal: "0",
      tip: "0",
      total: "0",
      status: "pending",
      paymentMethod: undefined,
      paymentStatus: "unpaid",
      sendEmail: false,
      sendSMS: false,
    },
  });

  // Handle prefilled appointment data from URL parameters
  useEffect(() => {
    if (prefilledAppointment && clients && services) {
      try {
        const appointmentData = JSON.parse(prefilledAppointment);

        // Find the matching client
        const client = clients.find((c) => c.id === appointmentData.clientId);
        if (client) {
          form.setValue("clientId", client.id);
        }

        // Find or create a matching service for the invoice
        const matchingService = services.find(
          (s) => s.name === appointmentData.serviceName,
        );
        if (matchingService) {
          setSelectedServices([
            {
              serviceId: matchingService.id,
              serviceName: matchingService.name,
              price: parseFloat(matchingService.price),
              quantity: 1,
            },
          ]);

          // Set the invoice amounts
          const servicePrice = parseFloat(matchingService.price);
          form.setValue("subtotal", servicePrice.toFixed(2));
          form.setValue("total", servicePrice.toFixed(2));
        }

        // Auto-open the create invoice dialog
        setIsDialogOpen(true);

        // Clear the URL parameter to prevent re-triggering
        window.history.replaceState({}, document.title, "/invoice");
      } catch (error) {
        console.error("Error parsing prefilled appointment data:", error);
      }
    }
  }, [prefilledAppointment, clients, services, form]);

  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      services: [],
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return await apiRequest("/api/invoice/templates", {
        method: "POST",
        body: templateData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice/templates"] });
      toast({
        title: "Template created",
        description: "Invoice template has been saved successfully.",
      });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return await apiRequest(`/api/invoice/templates/${templateId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice/templates"] });
      toast({
        title: "Template deleted",
        description: "Invoice template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
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
      setSelectedServices([]);

      // Don't auto-redirect to checkout - let user decide when to process payment
      // The response is the invoice object directly, not wrapped in .data
      const invoice = response;
      console.log('Invoice created successfully:', invoice);
      
      // Optionally show a toast with payment action if Stripe is selected
      if (invoice?.paymentMethod === "stripe") {
        toast({
          title: "Invoice Created",
          description: "Click 'View Details' to process Stripe payment",
          duration: 5000,
        });
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



  const exportInvoicesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/invoices/export");
    },
    onSuccess: (response) => {
      toast({
        title: "Export Sent",
        description: `Invoice export with ${response.invoiceCount} invoices sent to your email successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export invoices",
        variant: "destructive",
      });
    },
  });

  // Mark invoice as paid (for cash payments)
  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/mark-paid`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
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

  // Send invoice via SMS
  const sendSMSMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/send-sms`);
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Invoice sent via SMS successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  // Send invoice via Email
  const sendEmailMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/send-email`);
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Invoice sent via email successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
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
    const hidden = JSON.parse(
      localStorage.getItem("hiddenDefaultTemplates") || "[]",
    );
    setHiddenTemplates(hidden);
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    loadHiddenTemplates();
  }, []);

  // Calculate totals when selected services or tip change
  useEffect(() => {
    const subtotal = selectedServices.reduce(
      (sum, service) => sum + service.price * service.quantity,
      0,
    );
    const tipPercentage = form.watch("tipPercentage");
    const manualTip = parseFloat(form.watch("tip") || "0");

    // Calculate tip based on percentage if set, otherwise use manual tip
    let calculatedTip;
    if (tipPercentage !== undefined && tipPercentage !== null) {
      if (tipPercentage > 0) {
        calculatedTip = (subtotal * tipPercentage) / 100;
        form.setValue("tip", calculatedTip.toFixed(2));
      } else {
        // When "No tip" (0%) is selected, reset tip to 0
        calculatedTip = 0;
        form.setValue("tip", "0.00");
      }
    } else {
      // Use manual tip amount when no percentage is set
      calculatedTip = manualTip;
    }

    const total = subtotal + calculatedTip;

    form.setValue("subtotal", subtotal.toFixed(2));
    form.setValue("total", total.toFixed(2));
  }, [selectedServices, form.watch("tip"), form.watch("tipPercentage")]);

  // Set paymentStatus to "unpaid" when cash is selected
  useEffect(() => {
    const paymentMethod = form.watch("paymentMethod");
    if (paymentMethod === "cash") {
      form.setValue("paymentStatus", "unpaid");
    }
  }, [form.watch("paymentMethod")]);

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
  const handleDeleteTemplate = (templateId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this template? This action cannot be undone.",
      )
    ) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  // Handle template selection for invoice creation
  const handleTemplateSelect = (template: any) => {
    // Calculate total from service IDs
    const templateServices = services?.filter((service) => 
      template.serviceIds.includes(service.id)
    ) || [];
    
    const templateTotal = templateServices.reduce((sum, service) => 
      sum + parseFloat(service.price), 0
    );

    // Set selected services
    setSelectedServices(
      templateServices.map((service) => ({
        serviceId: service.id,
        serviceName: service.name,
        price: parseFloat(service.price),
        quantity: 1,
      }))
    );

    // Update form values
    form.setValue("subtotal", templateTotal.toFixed(2));
    form.setValue("total", templateTotal.toFixed(2));
    
    // Open create invoice dialog
    setIsDialogOpen(true);
  };

  // Template form submit
  const onTemplateSubmit = (data: z.infer<typeof templateFormSchema>) => {
    if (!services) return;

    const selectedServiceObjects = services.filter((service) =>
      data.services.includes(service.id)
    );
    
    const totalPrice = selectedServiceObjects.reduce(
      (sum, service) => sum + parseFloat(service.price),
      0
    );

    const templateData = {
      name: data.name,
      description: `Template with ${selectedServiceObjects.map(s => s.name).join(", ")}`,
      serviceIds: data.services,
      totalPrice: totalPrice.toFixed(2),
    };

    createTemplateMutation.mutate(templateData);
  };

  // Handle default template deletion
  const handleDeleteDefaultTemplate = (templateType: string) => {
    if (
      confirm(
        "Are you sure you want to hide this default template? This action cannot be undone.",
      )
    ) {
      const hiddenTemplates = JSON.parse(
        localStorage.getItem("hiddenDefaultTemplates") || "[]",
      );
      hiddenTemplates.push(templateType);
      localStorage.setItem(
        "hiddenDefaultTemplates",
        JSON.stringify(hiddenTemplates),
      );

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
    const existingService = selectedServices.find(
      (s) => s.serviceId === service.id,
    );
    const servicePrice = parseFloat(service.price);

    if (existingService) {
      // Increase quantity if service already exists
      setSelectedServices((prev) =>
        prev.map((s) =>
          s.serviceId === service.id ? { ...s, quantity: s.quantity + 1 } : s,
        ),
      );
    } else {
      // Add new service
      setSelectedServices((prev) => [
        ...prev,
        {
          serviceId: service.id,
          serviceName: service.name,
          price: servicePrice,
          quantity: 1,
        },
      ]);
    }

    // Update subtotal by recalculating from current state
    setTimeout(() => {
      const currentServices = existingService
        ? selectedServices.map((s) =>
            s.serviceId === service.id ? { ...s, quantity: s.quantity + 1 } : s,
          )
        : [
            ...selectedServices,
            {
              serviceId: service.id,
              serviceName: service.name,
              price: servicePrice,
              quantity: 1,
            },
          ];

      const newSubtotal = currentServices.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      form.setValue("subtotal", newSubtotal.toFixed(2));
    }, 0);
  };

  // Remove service from invoice
  const removeServiceFromInvoice = (serviceId: number) => {
    setSelectedServices((prev) => {
      const newServices = prev.filter((s) => s.serviceId !== serviceId);

      // Update subtotal with the new filtered services
      const newSubtotal = newServices.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      form.setValue("subtotal", newSubtotal.toFixed(2));

      return newServices;
    });
  };

  // Update service quantity
  const updateServiceQuantity = (serviceId: number, quantity: number) => {
    if (quantity <= 0) {
      removeServiceFromInvoice(serviceId);
      return;
    }

    setSelectedServices((prev) => {
      const newServices = prev.map((s) =>
        s.serviceId === serviceId ? { ...s, quantity } : s,
      );

      // Update subtotal with the new services
      const newSubtotal = newServices.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      form.setValue("subtotal", newSubtotal.toFixed(2));

      return newServices;
    });
  };

  // Auto-calculate total when subtotal or tip changes
  const watchedSubtotal = form.watch("subtotal");
  const watchedTip = form.watch("tip");
  const watchedTipPercentage = form.watch("tipPercentage");

  useEffect(() => {
    const subtotal = parseFloat(watchedSubtotal || "0") || 0;
    let tip = parseFloat((watchedTip || "0").toString()) || 0;

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
    console.log('=== FRONTEND INVOICE SUBMISSION DEBUG ===');
    console.log('Form data:', data);
    console.log('Selected services:', selectedServices);
    console.log('Selected services length:', selectedServices.length);
    console.log('Selected services structure:', JSON.stringify(selectedServices, null, 2));
    
    // Include selected services in the invoice data
    const invoiceData = {
      ...data,
      items: selectedServices,
    };
    
    console.log('Final invoice data being sent:', JSON.stringify(invoiceData, null, 2));
    console.log('=== END FRONTEND DEBUG ===');
    
    createInvoiceMutation.mutate(invoiceData);
  };



  const handleQuickInvoice = (
    serviceType: string,
    price: string,
    template?: any,
  ) => {
    form.setValue("subtotal", price);
    form.setValue("total", price);

    if (template) {
      // Handle template-based invoice
      const templateServices = template.description?.split(", ") || [];
      const matchedServices =
        services?.filter((s) => templateServices.includes(s.name)) || [];

      if (matchedServices.length > 0) {
        const serviceItems = matchedServices.map((service) => ({
          serviceId: service.id,
          serviceName: service.name,
          price: parseFloat(service.price || "0"),
          quantity: 1,
        }));
        setSelectedServices(serviceItems);
      }
    } else {
      // Handle category-based quick invoice (legacy)
      const service = services?.find((s) => s.category === serviceType);
      if (service) {
        setSelectedServices([
          {
            serviceId: service.id,
            serviceName: service.name,
            price: parseFloat(service.price || "0"),
            quantity: 1,
          },
        ]);
      }
    }

    if (clients?.[0]) {
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
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                // Clear selected services when dialog closes
                setSelectedServices([]);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gradient-gold text-charcoal tap-feedback"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-dark-card border-steel/20 text-white max-h-[90vh] overflow-y-auto scrollbar-hide">
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
                          setIsServiceSelectOpen(true);
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
                                    updateServiceQuantity(
                                      item.serviceId,
                                      item.quantity - 1,
                                    )
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
                                    updateServiceQuantity(
                                      item.serviceId,
                                      item.quantity + 1,
                                    )
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
                                onClick={() =>
                                  removeServiceFromInvoice(item.serviceId)
                                }
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
                          No services selected. Add services from the templates
                          below.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Services Summary */}
                  <div className="bg-charcoal/50 rounded-lg p-4 border border-steel/20">
                    <h4 className="text-white text-sm font-medium mb-2">
                      Services Summary
                    </h4>
                    {selectedServices.length > 0 ? (
                      <div className="space-y-2">
                        {selectedServices.map((service, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-steel">
                              {service.serviceName}{" "}
                              {service.quantity > 1 && `(${service.quantity}x)`}
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
                              $
                              {selectedServices
                                .reduce(
                                  (sum, service) =>
                                    sum + service.price * service.quantity,
                                  0,
                                )
                                .toFixed(2)}
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
                            value={field.value?.toString() || ""}
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
                              min="0"
                              max="999999"
                              className="bg-charcoal border-steel/40 text-white"
                              placeholder="0.00"
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Validate the input to prevent overflow
                                if (
                                  value === "" ||
                                  (!isNaN(parseFloat(value)) &&
                                    parseFloat(value) >= 0 &&
                                    parseFloat(value) <= 999999)
                                ) {
                                  field.onChange(value);
                                }
                              }}
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

                  {/* Notification Preferences */}
                  <div className="space-y-3">
                    <FormLabel className="text-white">
                      Send Invoice To
                    </FormLabel>
                    {(() => {
                      const selectedClient = clients?.find(
                        (c) => c.id === form.watch("clientId"),
                      );
                      const hasEmail = selectedClient?.email;
                      const hasPhone = selectedClient?.phone;

                      if (!hasEmail && !hasPhone) {
                        return (
                          <p className="text-steel text-sm">
                            Please select a client with email or phone number
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {hasEmail && (
                            <FormField
                              control={form.control}
                              name="sendEmail"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border border-steel/40 p-3 bg-charcoal/50">
                                  <div
                                    className={`space-y-0.5 ${!field.value ? "opacity-50" : ""}`}
                                  >
                                    <FormLabel className="text-white font-normal">
                                      Email
                                    </FormLabel>
                                    <div className="text-sm text-steel">
                                      {selectedClient?.email}
                                    </div>
                                  </div>
                                  <FormControl>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        className="sr-only peer"
                                      />
                                      <div className="w-11 h-6 bg-steel/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                                    </label>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                          {hasPhone && (
                            <FormField
                              control={form.control}
                              name="sendSMS"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border border-steel/40 p-3 bg-charcoal/50">
                                  <div
                                    className={`space-y-0.5 ${!field.value ? "opacity-50" : ""}`}
                                  >
                                    <FormLabel className="text-white font-normal">
                                      SMS
                                    </FormLabel>
                                    <div className="text-sm text-steel">
                                      {selectedClient?.phone}
                                    </div>
                                  </div>
                                  <FormControl>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        className="sr-only peer"
                                      />
                                      <div className="w-11 h-6 bg-steel/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                                    </label>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>

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

                  {/* Cash Payment Status - Only show if cash is selected */}
                  {form.watch("paymentMethod") === "cash" && (
                    <FormField
                      control={form.control}
                      name="paymentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">
                            Payment Status
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue="unpaid"
                          >
                            <FormControl>
                              <SelectTrigger className="bg-charcoal border-steel/40 text-white">
                                <SelectValue placeholder="Select payment status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-charcoal border-steel/40 text-white">
                              <SelectItem
                                value="unpaid"
                                className="text-white hover:bg-steel/20"
                              >
                                Unpaid
                              </SelectItem>
                              <SelectItem
                                value="paid"
                                className="text-white hover:bg-steel/20"
                              >
                                Paid
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
              {/* Invoice Templates */}
              {templatesLoading ? (
                <div className="col-span-2 text-center text-steel">
                  Loading templates...
                </div>
              ) : invoiceTemplates && invoiceTemplates.length > 0 ? (
                invoiceTemplates.map((template: any) => (
                  <div
                    key={template.id}
                    className="relative bg-charcoal border border-steel/40 rounded-lg p-4 text-center touch-target hover:bg-charcoal/80 cursor-pointer"
                    onClick={() => handleTemplateSelect(template)}
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
                      <div className="text-sm font-medium text-white">
                        {template.name}
                      </div>
                      <div className="text-xs text-steel">${template.totalPrice}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-steel text-sm">
                  No templates saved yet. Create your first template below.
                </div>
              )}

              {/* Saved Templates */}
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="relative bg-charcoal border border-steel/40 rounded-lg p-4 text-center touch-target hover:bg-charcoal/80 cursor-pointer"
                  onClick={() =>
                    handleQuickInvoice(
                      template.category,
                      template.amount,
                      template,
                    )
                  }
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
                    <div className="text-sm font-medium text-white">
                      {template.name}
                    </div>
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

        {/* Quick Invoice Templates Creator */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Create Quick Templates</CardTitle>
            <Dialog
              open={isTemplateDialogOpen}
              onOpenChange={setIsTemplateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-charcoal border-steel/40 text-gold hover:bg-charcoal/80"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-dark-card border-steel/40 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Create Invoice Template
                  </DialogTitle>
                  <DialogDescription className="text-steel">
                    Create a reusable template for quick invoice generation with
                    consistent pricing.
                  </DialogDescription>
                </DialogHeader>
                <Form {...templateForm}>
                  <form
                    onSubmit={templateForm.handleSubmit(onTemplateSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={templateForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">
                            Template Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-charcoal border-steel/40 text-white"
                              placeholder="e.g., Premium Haircut"
                              maxLength={60}
                            />
                          </FormControl>
                          <div className="text-xs text-steel text-right">
                            {field.value?.length || 0}/60 characters
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="services"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Services</FormLabel>
                          <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto border border-steel/20 rounded-lg p-3 bg-charcoal/50">
                            {services?.map((service) => (
                              <div
                                key={service.id}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  id={`template-service-${service.id}`}
                                  checked={
                                    field.value?.includes(service.id) || false
                                  }
                                  onChange={(e) => {
                                    const currentServices = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([
                                        ...currentServices,
                                        service.id,
                                      ]);
                                    } else {
                                      field.onChange(
                                        currentServices.filter(
                                          (id) => id !== service.id,
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 text-gold bg-charcoal border-steel/40 rounded focus:ring-gold"
                                />
                                <label
                                  htmlFor={`template-service-${service.id}`}
                                  className="flex-1 text-sm text-white cursor-pointer"
                                >
                                  <div className="flex justify-between items-center">
                                    <span>{service.name}</span>
                                    <span className="text-gold font-medium">
                                      ${service.price}
                                    </span>
                                  </div>
                                  {service.description && (
                                    <div className="text-xs text-steel mt-1">
                                      {service.description}
                                    </div>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
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
                        {createTemplateMutation.isPending
                          ? "Creating..."
                          : "Create Template"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <p className="text-steel text-sm">
              Create custom invoice templates for frequently used services.
              Templates can be quickly selected when creating new invoices,
              saving you time and ensuring consistent pricing.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-charcoal rounded-lg p-3 border border-steel/20">
                <div className="text-sm font-medium text-white">
                  Quick Access
                </div>
                <div className="text-xs text-steel">One-tap invoicing</div>
              </div>
              <div className="bg-charcoal rounded-lg p-3 border border-steel/20">
                <div className="text-sm font-medium text-white">
                  Consistent Pricing
                </div>
                <div className="text-xs text-steel">Standardized rates</div>
              </div>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Recent Invoices</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecentInvoices(!showRecentInvoices)}
                className="text-steel hover:text-white"
              >
                {showRecentInvoices ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 py-0">
            {invoicesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : showRecentInvoices && invoices && invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.slice(0, 10).map((invoice) => {
                  const client = clients?.find(
                    (c) => c.id === invoice.clientId,
                  );
                  return (
                    <div
                      key={invoice.id}
                      onClick={async () => {
                        setSelectedInvoice(invoice);
                        setIsInvoiceDetailsOpen(true);

                        // Fetch services for this invoice
                        setInvoiceServicesLoading(true);
                        try {
                          console.log(`=== FETCHING INVOICE ${invoice.id} SERVICES ===`);
                          const invoiceWithServices = await apiRequest(
                            "GET",
                            `/api/invoices/${invoice.id}`,
                          );
                          console.log('Invoice with services response:', invoiceWithServices);
                          console.log('Services found:', invoiceWithServices.services);
                          console.log('Services count:', invoiceWithServices.services?.length || 0);
                          setSelectedInvoiceServices(
                            invoiceWithServices.services || [],
                          );
                          console.log('=== END INVOICE SERVICES FETCH ===');
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
                      className="flex items-center justify-between p-3 bg-charcoal rounded-lg cursor-pointer hover:bg-charcoal/80 transition-colors"
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
                                  : "secondary"
                              }
                              className={`text-xs ${
                                invoice.paymentStatus === "paid"
                                  ? "bg-green-600 text-white"
                                  : "bg-yellow-600 text-white"
                              }`}
                            >
                              {invoice.paymentStatus === "paid"
                                ? " Paid"
                                : " Unpaid"}
                            </Badge>
                            {invoice.paymentMethod && (
                              <Badge
                                variant="outline"
                                className="text-xs border-steel/40 text-steel"
                              >
                                {invoice.paymentMethod === "cash"
                                  ? "Cash"
                                  : invoice.paymentMethod === "stripe"
                                    ? "Card"
                                    : invoice.paymentMethod === "apple_pay"
                                      ? "Apple Pay"
                                      : invoice.paymentMethod}
                              </Badge>
                            )}
                          </div>
                          {invoice.paymentMethod === "cash" &&
                            invoice.paymentStatus === "unpaid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs bg-green-600/10 border-green-600/40 text-green-400 hover:bg-green-600/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      "Confirm that this invoice was paid in cash?",
                                    )
                                  ) {
                                    markAsPaidMutation.mutate(invoice.id);
                                  }
                                }}
                                disabled={markAsPaidMutation.isPending}
                              >
                                {markAsPaidMutation.isPending
                                  ? "..."
                                  : "Mark as Paid"}
                              </Button>
                            )}
                          {invoice.paymentMethod === "cash" &&
                            invoice.paymentStatus === "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs bg-red-600/10 border-red-600/40 text-red-400 hover:bg-red-600/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      "Undo this cash payment? This will mark the invoice as unpaid.",
                                    )
                                  ) {
                                    undoPaymentMutation.mutate(invoice.id);
                                  }
                                }}
                                disabled={undoPaymentMutation.isPending}
                              >
                                {undoPaymentMutation.isPending
                                  ? "..."
                                  : "Undo Payment"}
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (invoices && invoices.length <= 0) || !invoices ? (
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
            ) : null}
          </CardContent>
        </Card>

        {/* Export Invoices */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Export Invoices</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportCard(!showExportCard)}
                className="text-steel hover:text-white"
              >
                {showExportCard ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 py-0">
            {showExportCard && (!invoices || invoices.length === 0) ? (
              <div className="text-center py-8 text-steel">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No invoices to export</p>
                <p className="text-xs mt-1">
                  Create invoices first to enable export
                </p>
              </div>
            ) : showExportCard ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-charcoal rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-steel/20 rounded-full flex items-center justify-center">
                      <Download className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="font-medium text-white">CSV Export</div>
                      <div className="text-xs text-steel">
                        Export {invoices?.length} invoices to email as CSV file
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => exportInvoicesMutation.mutate()}
                    disabled={exportInvoicesMutation.isPending}
                    size="sm"
                    className="gradient-gold text-charcoal font-semibold"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {exportInvoicesMutation.isPending
                      ? "Sending..."
                      : "Email CSV"}
                  </Button>
                </div>
              </div>
            ) : null}
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

      {/* Service Selection Dialog */}
      <Dialog open={isServiceSelectOpen} onOpenChange={setIsServiceSelectOpen}>
        <DialogContent className="bg-dark-card border-steel/20 text-white max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="text-white">Select Services</DialogTitle>
            <DialogDescription className="text-steel">
              Choose services to add to your invoice
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {services?.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 bg-charcoal rounded-lg border border-steel/40 hover:border-gold/50 cursor-pointer"
                onClick={() => {
                  addServiceToInvoice(service);
                  setIsServiceSelectOpen(false);
                }}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">
                      {service.name}
                    </span>
                    <span className="text-gold font-medium">
                      ${service.price}
                    </span>
                  </div>
                  {service.description && (
                    <div className="text-xs text-steel mt-1">
                      {service.description}
                    </div>
                  )}
                </div>
                <Plus className="w-4 h-4 text-gold ml-2" />
              </div>
            ))}
            {(!services || services.length === 0) && (
              <div className="text-center text-steel py-8">
                No services available. Create services first to add them to
                invoices.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog
        open={isInvoiceDetailsOpen}
        onOpenChange={setIsInvoiceDetailsOpen}
      >
        <DialogContent className="bg-dark-card border-steel/20 text-white max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="text-white">Invoice Details</DialogTitle>
            <DialogDescription className="text-steel">
              Invoice #{selectedInvoice?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {/* Client Info */}
              <div className="p-4 bg-charcoal rounded-lg">
                <h3 className="text-white font-medium mb-2">Client</h3>
                <p className="text-steel">
                  {clients?.find((c) => c.id === selectedInvoice.clientId)
                    ?.name || "Unknown Client"}
                </p>
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
                      <DollarSign className="w-4 h-4 text-gold" />
                      <span className="text-steel">Cash</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="p-4 bg-charcoal rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium">Status</h3>
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
                <Badge
                  variant={
                    selectedInvoice.paymentStatus === "paid"
                      ? "default"
                      : "destructive"
                  }
                  className={
                    selectedInvoice.paymentStatus === "paid"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {selectedInvoice.paymentStatus === "paid"
                    ? `✅ Paid (${selectedInvoice.paymentMethod === "cash" ? "Cash" : "Card"})`
                    : "Unpaid"}
                  {selectedInvoice.paidAt && (
                    <span className="ml-2 text-xs opacity-70">
                      {format(
                        new Date(selectedInvoice.paidAt),
                        "MMM d, h:mm a",
                      )}
                    </span>
                  )}
                </Badge>
              </div>

              {/* Services Provided */}
              <div className="p-4 bg-charcoal rounded-lg">
                <h3 className="text-white font-medium mb-2">
                  Services Provided
                </h3>
                <div className="space-y-2">
                  {invoiceServicesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin w-4 h-4 border-2 border-gold border-t-transparent rounded-full" />
                      <span className="ml-2 text-steel text-sm">
                        Loading services...
                      </span>
                    </div>
                  ) : selectedInvoiceServices.length > 0 ? (
                    selectedInvoiceServices.map((invoiceService, index) => {
                      console.log('Rendering service:', invoiceService);
                      return (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-steel/20 last:border-b-0"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {invoiceService.service.name}
                            {invoiceService.quantity > 1 && (
                              <span className="text-steel text-xs ml-2">
                                x{invoiceService.quantity}
                              </span>
                            )}
                          </div>
                          {invoiceService.service.description && (
                            <div className="text-steel text-xs">
                              {invoiceService.service.description}
                            </div>
                          )}
                        </div>
                        <div className="text-gold font-medium">
                          ${invoiceService.price}
                        </div>
                      </div>
                      );
                    })
                  ) : (
                    <div className="text-steel text-sm">
                      No services recorded for this invoice
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="p-4 bg-charcoal rounded-lg">
                <h3 className="text-white font-medium mb-2">Created</h3>
                <p className="text-steel">
                  {selectedInvoice.createdAt
                    ? format(
                        new Date(selectedInvoice.createdAt),
                        "MMM d, yyyy h:mm a",
                      )
                    : "Unknown"}
                </p>
              </div>

              {/* Send Invoice Actions */}
              <div className="p-4 bg-charcoal rounded-lg">
                <h3 className="text-white font-medium mb-3">Send Invoice</h3>
                <div className="flex gap-3">
                  {/* SMS Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                    onClick={() => sendSMSMutation.mutate(selectedInvoice.id)}
                    disabled={sendSMSMutation.isPending}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {sendSMSMutation.isPending ? "..." : "Send SMS"}
                  </Button>

                  {/* Email Button - only show if client has email */}
                  {clients?.find(c => c.id === selectedInvoice.clientId)?.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                      onClick={() => sendEmailMutation.mutate(selectedInvoice.id)}
                      disabled={sendEmailMutation.isPending}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {sendEmailMutation.isPending ? "..." : "Send Email"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation currentPath="/invoice" />
    </div>
  );
}
