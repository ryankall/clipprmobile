import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Receipt, 
  Plus, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Search,
  Filter,
  Send,
  Download,
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Invoice, Client, Service } from "@/types";
import { z } from "zod";
import { format } from "date-fns";

const invoiceFormSchema = z.object({
  clientId: z.number(),
  subtotal: z.string(),
  tipAmount: z.string(),
  total: z.string(),
  status: z.enum(['pending', 'paid', 'overdue']),
  paymentMethod: z.enum(['cash', 'stripe', 'apple_pay']),
  notes: z.string().optional(),
  userId: z.number().optional(),
  tipPercentage: z.number().optional(),
  items: z.array(z.object({
    serviceId: z.number(),
    serviceName: z.string(),
    price: z.number(),
    quantity: z.number().min(1),
  })).optional(),
  sendEmail: z.boolean().default(false),
  sendSMS: z.boolean().default(false),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required").max(60, "Template name must be 60 characters or less"),
  services: z.array(z.number()).min(1, "At least one service is required"),
});

export default function MobileInvoice() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [tipPercentage, setTipPercentage] = useState(0);
  const { toast } = useToast();

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/invoices/templates"],
  });

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: undefined,
      paymentMethod: "cash",
      status: "pending",
      tipPercentage: 0,
      sendEmail: false,
      sendSMS: false,
    },
  });

  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      services: [],
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      const selectedServiceData = services?.filter(s => selectedServices.includes(s.id)) || [];
      const subtotal = selectedServiceData.reduce((sum, service) => sum + parseFloat(service.price), 0);
      const tipAmount = subtotal * (tipPercentage / 100);
      const total = subtotal + tipAmount;

      const invoiceData = {
        ...data,
        subtotal: subtotal.toFixed(2),
        tipAmount: tipAmount.toFixed(2),
        total: total.toFixed(2),
        items: selectedServiceData.map(service => ({
          serviceId: service.id,
          serviceName: service.name,
          price: parseFloat(service.price),
          quantity: 1,
        })),
      };

      await apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify(invoiceData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      form.reset();
      setSelectedServices([]);
      setTipPercentage(0);
      setIsCreateInvoiceOpen(false);
      toast({
        title: "Invoice created",
        description: "The invoice has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      await apiRequest("/api/invoices/templates", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/templates"] });
      templateForm.reset();
      setIsCreateTemplateOpen(false);
      toast({
        title: "Template created",
        description: "The invoice template has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/invoices/${id}/mark-paid`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice updated",
        description: "The invoice has been marked as paid.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = invoice.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    if (selectedServices.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one service",
        variant: "destructive",
      });
      return;
    }
    createInvoiceMutation.mutate(data);
  };

  const handleTemplateSubmit = (data: z.infer<typeof templateFormSchema>) => {
    createTemplateMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'overdue':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
        return <CreditCard className="w-4 h-4" />;
      case 'apple_pay':
        return <Smartphone className="w-4 h-4" />;
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const calculateSelectedTotal = () => {
    const selectedServiceData = services?.filter(s => selectedServices.includes(s.id)) || [];
    const subtotal = selectedServiceData.reduce((sum, service) => sum + parseFloat(service.price), 0);
    const tipAmount = subtotal * (tipPercentage / 100);
    return subtotal + tipAmount;
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="bg-dark-card border-b border-steel/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Invoices</h1>
            <p className="text-sm text-steel">Manage your billing and payments</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsCreateTemplateOpen(true)}
              variant="outline"
              size="sm"
              className="border-steel/20 text-steel hover:text-white"
            >
              Template
            </Button>
            <Button
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="bg-gold text-dark-bg hover:bg-gold/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Filter */}
        <div className="flex space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-steel" />
            <Input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-dark-card border-steel/20 text-white placeholder-steel"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const nextFilter = statusFilter === "all" ? "pending" : 
                                statusFilter === "pending" ? "paid" : 
                                statusFilter === "paid" ? "overdue" : "all";
              setStatusFilter(nextFilter);
            }}
            className="border-steel/20 text-steel hover:text-white"
          >
            <Filter className="w-4 h-4 mr-2" />
            {statusFilter === "all" ? "All" : statusFilter}
          </Button>
        </div>

        {/* Invoice Stats */}
        <div className="grid grid-cols-3 gap-4">
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
              <div className="text-2xl font-bold text-yellow-400">
                {invoices?.filter(i => i.status === 'pending').length || 0}
              </div>
              <div className="text-xs text-steel">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {invoices?.filter(i => i.status === 'overdue').length || 0}
              </div>
              <div className="text-xs text-steel">Overdue</div>
            </CardContent>
          </Card>
        </div>

        {/* Templates */}
        {templates && templates.length > 0 && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Quick Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {templates.slice(0, 4).map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="border-steel/20 text-steel hover:text-white text-sm"
                    onClick={() => {
                      // Auto-select template services
                      setSelectedServices(template.services || []);
                      setIsCreateInvoiceOpen(true);
                    }}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices List */}
        <div className="space-y-3">
          {invoicesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
            </div>
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="bg-dark-card border-steel/20 cursor-pointer tap-feedback"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
                        {getPaymentMethodIcon(invoice.paymentMethod)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-white">#{invoice.id}</p>
                          <Badge className={getStatusColor(invoice.status)}>
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1 capitalize">{invoice.status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-steel">{invoice.client?.name}</p>
                        <p className="text-xs text-steel">
                          {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gold">${invoice.total}</p>
                      <p className="text-xs text-steel capitalize">{invoice.paymentMethod}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-steel">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No invoices found</p>
              <p className="text-sm">Create your first invoice to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Invoice Dialog */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg border border-steel/20 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-steel/20 flex justify-between items-center">
              <h3 className="text-white font-semibold">Create Invoice</h3>
              <Button
                variant="ghost"
                onClick={() => setIsCreateInvoiceOpen(false)}
                className="text-steel hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-4">
              <div>
                <Label className="text-white">Client *</Label>
                <select
                  {...form.register("clientId", { 
                    required: "Please select a client",
                    valueAsNumber: true
                  })}
                  className="w-full p-2 bg-dark-bg border border-steel/20 rounded-md text-white"
                >
                  <option value="">Select a client</option>
                  {clients?.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.phone}
                    </option>
                  ))}
                </select>
                {form.formState.errors.clientId && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.clientId.message}</p>
                )}
              </div>

              <div>
                <Label className="text-white">Services *</Label>
                <div className="max-h-40 overflow-y-auto border border-steel/20 rounded-md p-2 bg-dark-bg">
                  {services?.map(service => (
                    <div key={service.id} className="flex items-center space-x-2 p-2 hover:bg-dark-card rounded">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, service.id]);
                          } else {
                            setSelectedServices(selectedServices.filter(id => id !== service.id));
                          }
                        }}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <p className="text-white text-sm">{service.name}</p>
                        <p className="text-steel text-xs">${service.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedServices.length === 0 && (
                  <p className="text-red-400 text-sm mt-1">Please select at least one service</p>
                )}
              </div>

              <div>
                <Label className="text-white">Payment Method</Label>
                <select
                  {...form.register("paymentMethod")}
                  className="w-full p-2 bg-dark-bg border border-steel/20 rounded-md text-white"
                >
                  <option value="cash">Cash</option>
                  <option value="stripe">Card</option>
                  <option value="apple_pay">Apple Pay</option>
                </select>
              </div>

              <div>
                <Label className="text-white">Tip Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={tipPercentage}
                  onChange={(e) => setTipPercentage(Number(e.target.value))}
                  className="bg-dark-bg border-steel/20 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Notes</Label>
                <Textarea
                  {...form.register("notes")}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              {/* Total Display */}
              <div className="p-3 bg-dark-bg rounded-lg border border-steel/20">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total:</span>
                  <span className="text-gold text-xl font-bold">
                    ${calculateSelectedTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="flex-1 border-steel/20 text-steel hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="flex-1 bg-gold text-dark-bg hover:bg-gold/90"
                >
                  {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg border border-steel/20 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-steel/20 flex justify-between items-center">
              <h3 className="text-white font-semibold">Invoice #{selectedInvoice.id}</h3>
              <Button
                variant="ghost"
                onClick={() => setSelectedInvoice(null)}
                className="text-steel hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{selectedInvoice.client?.name}</p>
                  <p className="text-steel text-sm">{selectedInvoice.client?.phone}</p>
                </div>
                <Badge className={getStatusColor(selectedInvoice.status)}>
                  {getStatusIcon(selectedInvoice.status)}
                  <span className="ml-1 capitalize">{selectedInvoice.status}</span>
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-dark-bg rounded-lg">
                  <p className="text-steel text-xs">Date</p>
                  <p className="text-white text-sm">{format(new Date(selectedInvoice.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div className="p-3 bg-dark-bg rounded-lg">
                  <p className="text-steel text-xs">Payment Method</p>
                  <p className="text-white text-sm capitalize">{selectedInvoice.paymentMethod}</p>
                </div>
              </div>

              <div className="p-3 bg-dark-bg rounded-lg">
                <p className="text-steel text-xs mb-2">Services</p>
                <div className="space-y-1">
                  {/* Services would be displayed here if available */}
                  <p className="text-white text-sm">Service details</p>
                </div>
              </div>

              <div className="p-3 bg-dark-bg rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-steel text-xs">Subtotal:</p>
                  <p className="text-white text-sm">${selectedInvoice.subtotal}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-steel text-xs">Tip:</p>
                  <p className="text-white text-sm">${selectedInvoice.tipAmount}</p>
                </div>
                <div className="border-t border-steel/20 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <p className="text-white font-medium">Total:</p>
                    <p className="text-gold text-xl font-bold">${selectedInvoice.total}</p>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-3 bg-dark-bg rounded-lg">
                  <p className="text-steel text-xs mb-1">Notes</p>
                  <p className="text-white text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-steel/20 space-y-3">
              {selectedInvoice.status === 'pending' && (
                <Button
                  onClick={() => markAsPaidMutation.mutate(selectedInvoice.id)}
                  disabled={markAsPaidMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {markAsPaidMutation.isPending ? 'Updating...' : 'Mark as Paid'}
                </Button>
              )}
              <Button
                onClick={() => setSelectedInvoice(null)}
                variant="outline"
                className="w-full border-steel/20 text-steel hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}