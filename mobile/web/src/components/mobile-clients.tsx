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
  Users, 
  Plus, 
  Search, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Calendar,
  TrendingUp,
  ChevronDown,
  User,
  X,
  Edit
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ClientWithStats } from "@/types";
import { z } from "zod";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  preferredStyle: z.string().optional(),
  notes: z.string().optional(),
  userId: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    const phoneRegex = /^[\+]?[1-9]?[\(\)\-\s\d]{10,18}$/;
    return phoneRegex.test(val.replace(/\s/g, ''));
  }, {
    message: "Please enter a valid phone number",
  }),
  email: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  }, {
    message: "Please enter a valid email address",
  }),
  address: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    const addressRegex = /^.{5,}$/;
    return addressRegex.test(val.trim());
  }, {
    message: "Please enter a valid address (minimum 5 characters)",
  }),
}).refine((data) => {
  return (data.phone && data.phone.trim() !== "") || (data.email && data.email.trim() !== "");
}, {
  message: "Please provide either a phone number or email address",
  path: ["phone"],
});

function ClientStatsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: clientStats, isLoading: statsLoading } = useQuery<{
    bigSpenders: Array<{ name: string; totalSpent: string; appointmentCount: number }>;
    mostVisited: Array<{ name: string; totalVisits: number; lastVisit: Date | null }>;
    biggestTippers: Array<{ name: string; totalTips: string; tipPercentage: number }>;
  }>({
    queryKey: ["/api/clients/stats"],
  });

  if (statsLoading) {
    return (
      <Card className="bg-dark-card border-steel/20">
        <CardHeader 
          className="cursor-pointer tap-feedback"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              Top 10 Client Analytics
            </div>
            <ChevronDown className={`w-5 h-5 text-steel transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent className="p-4">
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  const hasData = clientStats && (
    clientStats.bigSpenders.length > 0 || 
    clientStats.mostVisited.length > 0 || 
    clientStats.biggestTippers.length > 0
  );

  return (
    <Card className="bg-dark-card border-steel/20">
      <CardHeader 
        className="cursor-pointer tap-feedback"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            Top 10 Client Analytics
          </div>
          <ChevronDown className={`w-5 h-5 text-steel transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4">
          {hasData ? (
            <div className="space-y-6">
              {clientStats.bigSpenders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gold mb-3">💰 Big Spenders</h4>
                  <div className="space-y-2">
                    {clientStats.bigSpenders.map((client, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-dark-bg rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                            <span className="text-dark-bg text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{client.name}</p>
                            <p className="text-steel text-xs">{client.appointmentCount} appointments</p>
                          </div>
                        </div>
                        <p className="text-gold font-medium">{client.totalSpent}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientStats.mostVisited.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gold mb-3">🔥 Most Visited</h4>
                  <div className="space-y-2">
                    {clientStats.mostVisited.map((client, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-dark-bg rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                            <span className="text-dark-bg text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{client.name}</p>
                            <p className="text-steel text-xs">
                              {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'No visits yet'}
                            </p>
                          </div>
                        </div>
                        <p className="text-gold font-medium">{client.totalVisits} visits</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientStats.biggestTippers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gold mb-3">💫 Best Tippers</h4>
                  <div className="space-y-2">
                    {clientStats.biggestTippers.map((client, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-dark-bg rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                            <span className="text-dark-bg text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{client.name}</p>
                            <p className="text-steel text-xs">{client.tipPercentage}% avg tip</p>
                          </div>
                        </div>
                        <p className="text-gold font-medium">{client.totalTips}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-steel py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-steel/50" />
              <p>No client data available yet</p>
              <p className="text-sm">Stats will appear after appointments and invoices</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function MobileClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<ClientWithStats[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      preferredStyle: "",
      notes: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientFormSchema>) => {
      await apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/stats"] });
      form.reset();
      setIsAddClientOpen(false);
      toast({
        title: "Client added",
        description: "The client has been successfully added.",
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

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = (data: z.infer<typeof clientFormSchema>) => {
    createClientMutation.mutate(data);
  };

  const getClientInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getClientBadge = (client: ClientWithStats) => {
    if (client.loyaltyStatus === 'vip') {
      return <Badge className="bg-gold text-dark-bg">VIP</Badge>;
    }
    if (client.totalVisits && client.totalVisits > 5) {
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Regular</Badge>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="bg-dark-card border-b border-steel/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Clients</h1>
            <p className="text-sm text-steel">Manage your client relationships</p>
          </div>
          <Button
            onClick={() => setIsAddClientOpen(true)}
            className="bg-gold text-dark-bg hover:bg-gold/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Client Stats Overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">{clients?.length || 0}</div>
              <div className="text-xs text-steel">Total Clients</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {clients?.filter(c => c.loyaltyStatus === 'vip').length || 0}
              </div>
              <div className="text-xs text-steel">VIP Clients</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {clients?.filter(c => c.totalVisits && c.totalVisits > 0).length || 0}
              </div>
              <div className="text-xs text-steel">Active</div>
            </CardContent>
          </Card>
        </div>

        {/* Top 10 Analytics */}
        <ClientStatsCard />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-steel" />
          <Input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-dark-card border-steel/20 text-white placeholder-steel"
          />
        </div>

        {/* Clients List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
            </div>
          ) : filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <Card
                key={client.id}
                className="bg-dark-card border-steel/20 cursor-pointer tap-feedback"
                onClick={() => setSelectedClient(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center">
                        <span className="text-dark-bg font-medium text-sm">
                          {getClientInitials(client.name)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-white">{client.name}</p>
                          {getClientBadge(client)}
                        </div>
                        <p className="text-sm text-steel">{client.phone}</p>
                        {client.email && (
                          <p className="text-xs text-steel">{client.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gold">
                        {client.totalVisits || 0} visits
                      </p>
                      <p className="text-xs text-steel">
                        ${client.totalSpent || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-steel">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No clients found</p>
              <p className="text-sm">Add your first client to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Dialog */}
      {isAddClientOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg border border-steel/20 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-steel/20 flex justify-between items-center">
              <h3 className="text-white font-semibold">Add New Client</h3>
              <Button
                variant="ghost"
                onClick={() => setIsAddClientOpen(false)}
                className="text-steel hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-4">
              <div>
                <Label className="text-white">Name *</Label>
                <Input
                  {...form.register("name")}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="Client name"
                />
                {form.formState.errors.name && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label className="text-white">Phone</Label>
                <Input
                  {...form.register("phone")}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="(555) 123-4567"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label className="text-white">Email</Label>
                <Input
                  {...form.register("email")}
                  type="email"
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="client@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <Label className="text-white">Address</Label>
                <Input
                  {...form.register("address")}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="123 Main St, City, State"
                />
                {form.formState.errors.address && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div>
                <Label className="text-white">Preferred Style</Label>
                <Input
                  {...form.register("preferredStyle")}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="e.g., Fade, Buzz cut, etc."
                />
              </div>

              <div>
                <Label className="text-white">Notes</Label>
                <Textarea
                  {...form.register("notes")}
                  className="bg-dark-bg border-steel/20 text-white placeholder-steel"
                  placeholder="Additional notes about the client..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddClientOpen(false)}
                  className="flex-1 border-steel/20 text-steel hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createClientMutation.isPending}
                  className="flex-1 bg-gold text-dark-bg hover:bg-gold/90"
                >
                  {createClientMutation.isPending ? 'Adding...' : 'Add Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Dialog */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg border border-steel/20 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-steel/20 flex justify-between items-center">
              <h3 className="text-white font-semibold">Client Details</h3>
              <Button
                variant="ghost"
                onClick={() => setSelectedClient(null)}
                className="text-steel hover:text-white p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center">
                  <span className="text-dark-bg font-bold text-lg">
                    {getClientInitials(selectedClient.name)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-white font-semibold text-lg">{selectedClient.name}</h4>
                    {getClientBadge(selectedClient)}
                  </div>
                  <p className="text-steel text-sm">Client since {new Date(selectedClient.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-dark-bg rounded-lg">
                  <div className="text-xl font-bold text-gold">{selectedClient.totalVisits || 0}</div>
                  <div className="text-xs text-steel">Total Visits</div>
                </div>
                <div className="text-center p-3 bg-dark-bg rounded-lg">
                  <div className="text-xl font-bold text-gold">${selectedClient.totalSpent || '0'}</div>
                  <div className="text-xs text-steel">Total Spent</div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedClient.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-dark-bg rounded-lg">
                    <Phone className="w-5 h-5 text-gold" />
                    <div>
                      <p className="text-white text-sm">{selectedClient.phone}</p>
                      <p className="text-steel text-xs">Phone</p>
                    </div>
                  </div>
                )}

                {selectedClient.email && (
                  <div className="flex items-center space-x-3 p-3 bg-dark-bg rounded-lg">
                    <Mail className="w-5 h-5 text-gold" />
                    <div>
                      <p className="text-white text-sm">{selectedClient.email}</p>
                      <p className="text-steel text-xs">Email</p>
                    </div>
                  </div>
                )}

                {selectedClient.address && (
                  <div className="flex items-center space-x-3 p-3 bg-dark-bg rounded-lg">
                    <MapPin className="w-5 h-5 text-gold" />
                    <div>
                      <p className="text-white text-sm">{selectedClient.address}</p>
                      <p className="text-steel text-xs">Address</p>
                    </div>
                  </div>
                )}

                {selectedClient.preferredStyle && (
                  <div className="p-3 bg-dark-bg rounded-lg">
                    <p className="text-steel text-xs mb-1">Preferred Style</p>
                    <p className="text-white text-sm">{selectedClient.preferredStyle}</p>
                  </div>
                )}

                {selectedClient.notes && (
                  <div className="p-3 bg-dark-bg rounded-lg">
                    <p className="text-steel text-xs mb-1">Notes</p>
                    <p className="text-white text-sm">{selectedClient.notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-steel/20">
              <Button
                onClick={() => setSelectedClient(null)}
                className="w-full bg-gold text-dark-bg hover:bg-gold/90"
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