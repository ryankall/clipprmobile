import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Users, Plus, Search, Star, Phone, Mail, MapPin, ChevronRight, DollarSign, Calendar, TrendingUp, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientWithStats } from "@shared/schema";
import { z } from "zod";

const clientFormSchema = insertClientSchema.extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    // Validate phone number format - accepts various formats like (123) 456-7890, 123-456-7890, 1234567890
    const phoneRegex = /^[\+]?[1-9]?[\(\)\-\s\d]{10,18}$/;
    return phoneRegex.test(val.replace(/\s/g, ''));
  }, {
    message: "Please enter a valid phone number",
  }),
  email: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  }, {
    message: "Please enter a valid email address",
  }),
  address: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    // Basic address validation - should contain at least a number and some text
    const addressRegex = /^.{5,}$/; // At least 5 characters for a valid address
    return addressRegex.test(val.trim());
  }, {
    message: "Please enter a valid address (minimum 5 characters)",
  }),
}).refine((data) => {
  // Require either phone or email
  return (data.phone && data.phone.trim() !== "") || (data.email && data.email.trim() !== "");
}, {
  message: "Please provide either a phone number or email address",
  path: ["phone"], // This will show the error on the phone field
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

  if (!hasData) {
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
            <div className="text-center text-steel py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-steel/50" />
              <p>No client data available yet</p>
              <p className="text-sm">Stats will appear after appointments and invoices</p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

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
        <CardContent className="space-y-6">
        {/* Big Spenders */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Big Spenders
          </h3>
          {clientStats?.bigSpenders.length > 0 ? (
            <div className="space-y-2">
              {clientStats.bigSpenders.slice(0, 5).map((client, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-charcoal rounded border border-steel/20">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gold text-charcoal text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{client.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">${client.totalSpent}</div>
                    <div className="text-xs text-steel">{client.appointmentCount} appointments</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-steel text-sm">No appointment data available</p>
          )}
        </div>

        {/* Most Visited */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Most Visited
          </h3>
          {clientStats?.mostVisited.length > 0 ? (
            <div className="space-y-2">
              {clientStats.mostVisited.slice(0, 5).map((client, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-charcoal rounded border border-steel/20">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gold text-charcoal text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{client.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 font-bold">{client.totalVisits} visits</div>
                    {client.lastVisit && (
                      <div className="text-xs text-steel">
                        Last: {new Date(client.lastVisit).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-steel text-sm">No visit data available</p>
          )}
        </div>

        {/* Biggest Tippers */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Biggest Tippers
          </h3>
          {clientStats?.biggestTippers.length > 0 ? (
            <div className="space-y-2">
              {clientStats.biggestTippers.slice(0, 5).map((client, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-charcoal rounded border border-steel/20">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gold text-charcoal text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{client.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">${client.totalTips}</div>
                    <div className="text-xs text-steel">{client.tipPercentage}% average</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-steel text-sm">No tip data available</p>
          )}
        </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      loyaltyStatus: "regular",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientFormSchema>) => {
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Added",
        description: "New client has been added successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: async (error: any) => {
      let errorMessage = "Failed to add client";
      
      if (error.response && error.response.status === 409) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.message || "Client with this phone number already exists";
        } catch {
          errorMessage = "Client with this phone number already exists";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Client Already Exists",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const onSubmit = (data: z.infer<typeof clientFormSchema>) => {
    createClientMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">Clients</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-gold text-charcoal tap-feedback">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-dark-card border-steel/20 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Client</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Name *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-charcoal border-steel/40 text-white"
                            placeholder="Client's full name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Phone</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="tel"
                            className="bg-charcoal border-steel/40 text-white"
                            placeholder="(555) 123-4567"
                            onInput={(e) => {
                              // Allow only numbers, spaces, parentheses, hyphens, and plus sign
                              const target = e.target as HTMLInputElement;
                              let value = target.value.replace(/[^0-9\s\(\)\-\+]/g, '');
                              
                              // Auto-format phone number as (XXX) XXX-XXXX
                              const numbers = value.replace(/\D/g, '');
                              if (numbers.length <= 10) {
                                if (numbers.length >= 6) {
                                  value = `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
                                } else if (numbers.length >= 3) {
                                  value = `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
                                } else if (numbers.length > 0) {
                                  value = numbers;
                                }
                              } else {
                                // For numbers longer than 10 digits (international)
                                value = numbers;
                              }
                              
                              target.value = value;
                              field.onChange(value);
                            }}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              // Trigger validation immediately
                              form.trigger('phone');
                            }}
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
                            type="email"
                            className="bg-charcoal border-steel/40 text-white"
                            placeholder="client@example.com"
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              // Trigger validation immediately
                              form.trigger('email');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Contact requirement message */}
                  <div className="text-sm text-steel/60 italic">
                    * Please provide either a phone number or email address
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
                            className="bg-charcoal border-steel/40 text-white"
                            placeholder="123 Main St, City, State 12345"
                            onChange={(e) => {
                              // Capitalize first letter of each word for proper address formatting
                              const value = e.target.value.replace(/\b\w/g, (char) => char.toUpperCase());
                              field.onChange(value);
                              // Trigger validation immediately
                              form.trigger('address');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preferredStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Preferred Style</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-charcoal border-steel/40 text-white"
                            placeholder="e.g., Fade with hard part"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            className="bg-charcoal border-steel/40 text-white"
                            placeholder="Any special notes or preferences"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-steel/40 text-steel bg-transparent hover:bg-steel/10 hover:text-white tap-feedback"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gradient-gold text-charcoal tap-feedback"
                      disabled={createClientMutation.isPending}
                    >
                      {createClientMutation.isPending ? "Adding..." : "Add Client"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-steel" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="pl-10 bg-dark-card border-steel/40 text-white"
          />
        </div>

        {/* Client Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {clients?.length || 0}
              </div>
              <div className="text-sm text-steel">Total Clients</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {clients?.filter(c => c.loyaltyStatus === 'vip').length || 0}
              </div>
              <div className="text-sm text-steel">VIP Clients</div>
            </CardContent>
          </Card>
        </div>

        {/* Top 10 Client Analytics */}
        <ClientStatsCard />

        {/* Clients List */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white">
              Clients ({filteredClients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center justify-between p-3 bg-charcoal rounded-lg border border-steel/20 hover:bg-charcoal/80 transition-colors tap-feedback">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={client.photoUrl || undefined} 
                          alt={client.name} 
                        />
                        <AvatarFallback className="bg-steel text-white">
                          {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-white">{client.name}</h4>
                          {client.loyaltyStatus === 'vip' && (
                            <Badge className="bg-gold text-charcoal text-xs px-2 py-0">
                              <Star className="w-3 h-3 mr-1" />
                              VIP
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          {client.phone && (
                            <div className="flex items-center text-xs text-steel">
                              <Phone className="w-3 h-3 mr-1" />
                              {client.phone}
                            </div>
                          )}
                          {(client.totalVisits || 0) > 0 && (
                            <div className="text-xs text-steel">
                              {client.totalVisits || 0} visit{(client.totalVisits || 0) !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        {parseFloat(client.totalSpent || '0') > 0 && (
                          <div className="text-xs text-gold mt-1">
                            Total spent: ${parseFloat(client.totalSpent || '0').toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-steel" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-steel">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {searchQuery ? "No clients found matching your search" : "No clients added yet"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    variant="link"
                    className="text-gold text-sm mt-2 p-0 h-auto"
                  >
                    Add your first client
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNavigation currentPath="/clients" />
    </div>
  );
}
