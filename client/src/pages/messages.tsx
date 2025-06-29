import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BottomNavigation } from "@/components/bottom-navigation";
import { 
  MessageCircle, 
  Mail, 
  MailOpen, 
  Clock, 
  User, 
  Phone, 
  Calendar,
  Trash2,
  CheckCircle,
  AlertCircle,
  Archive,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";

interface Message {
  id: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied" | "archived";
  priority: "low" | "normal" | "high" | "urgent";
  serviceRequested?: string;
  preferredDate?: string;
  notes?: string;
  createdAt: string;
  readAt?: string;
  repliedAt?: string;
}

export default function Messages() {
  const [location, setLocation] = useLocation();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/messages/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/messages/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setSelectedMessage(null);
      toast({
        title: "Message Deleted",
        description: "The message has been removed from your inbox",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/messages/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });



  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (message.status === "unread") {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleDeleteMessage = (id: number) => {
    deleteMessageMutation.mutate(id);
  };

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
    if (selectedMessage && selectedMessage.id === id) {
      setSelectedMessage({ ...selectedMessage, status: status as any });
    }
  };

  const handleCreateClient = async (message: Message) => {
    const clientData = {
      name: message.customerName,
      phone: message.customerPhone || undefined,
      email: message.customerEmail || undefined,
      notes: '', // Keep notes empty for user input
    };
    
    try {
      const response = await apiRequest("POST", "/api/clients", clientData);
      const clientResponse = await response.json();
      const newClient = clientResponse;
      
      // Update the message to link it to the new client
      await apiRequest("PATCH", `/api/messages/${message.id}`, {
        clientId: newClient.id
      });
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      
      toast({
        title: "Client Created",
        description: "New client has been added and linked to this message",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canCreateClient = (message: Message) => {
    return message.customerName && (message.customerPhone || message.customerEmail);
  };

  const getCreateClientTooltip = (message: Message) => {
    if (!message.customerName) {
      return "Missing customer name";
    }
    if (!message.customerPhone && !message.customerEmail) {
      return "Need either phone number or email address";
    }
    return "Create new client from this message";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "normal": return "bg-blue-500";
      case "low": return "bg-gray-500";
      default: return "bg-blue-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "unread": return <Mail className="w-4 h-4" />;
      case "read": return <MailOpen className="w-4 h-4" />;
      case "replied": return <CheckCircle className="w-4 h-4" />;
      case "archived": return <Archive className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const filteredMessages = messages.filter(message => {
    if (filter === "all") return true;
    return message.status === filter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white pb-20 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-white">Messages</h1>
          </div>
          <Badge variant="secondary" className="bg-gold/20 text-gold">
            {messages.filter(m => m.status === "unread").length} unread
          </Badge>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {["all", "unread", "read", "replied", "archived"].map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(status)}
              className={`flex-shrink-0 ${filter === status ? "gradient-gold text-charcoal" : "text-white hover:bg-charcoal/50"}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== "all" && (
                <Badge variant="secondary" className="ml-2 bg-charcoal/50 text-white">
                  {messages.filter(m => m.status === status).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-steel mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No messages found</h3>
              <p className="text-steel">
                {filter === "all" 
                  ? "You haven't received any customer messages yet."
                  : `No ${filter} messages at the moment.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <Card 
                key={message.id} 
                className={`bg-dark-card border-steel/20 cursor-pointer transition-all hover:border-gold/30 ${
                  message.status === "unread" ? "border-l-4 border-l-gold" : ""
                }`}
                onClick={() => handleMessageClick(message)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(message.priority)}`} />
                      {getStatusIcon(message.status)}
                      <h3 className={`font-semibold ${message.status === "unread" ? "text-white" : "text-steel"}`}>
                        {message.customerName}
                      </h3>
                    </div>
                    <span className="text-xs text-steel">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <h4 className={`font-medium mb-1 ${message.status === "unread" ? "text-white" : "text-steel"}`}>
                    {message.subject}
                  </h4>
                  
                  <p className="text-sm text-steel line-clamp-2 mb-2">
                    {message.message}
                  </p>

                  {message.serviceRequested && (
                    <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                      Service: {message.serviceRequested}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Message Detail Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="bg-dark-card border-steel/20 text-white max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-hide">
            {selectedMessage && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-white flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedMessage.priority)}`} />
                      <span>{selectedMessage.subject}</span>
                    </DialogTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="border-gold/30 text-gold">
                        {selectedMessage.status}
                      </Badge>
                      <Badge variant="outline" className="border-steel/30 text-steel">
                        {selectedMessage.priority}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Customer Info */}
                  <div className="bg-charcoal p-4 rounded-lg space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gold" />
                      <span className="font-medium">{selectedMessage.customerName}</span>
                    </div>
                    
                    {selectedMessage.customerPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gold" />
                        <span className="text-sm">{selectedMessage.customerPhone}</span>
                      </div>
                    )}
                    
                    {selectedMessage.customerEmail && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gold" />
                        <span className="text-sm">{selectedMessage.customerEmail}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gold" />
                      <span className="text-sm">
                        {format(new Date(selectedMessage.createdAt), "PPP 'at' p")}
                      </span>
                    </div>

                    {selectedMessage.preferredDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gold" />
                        <span className="text-sm">
                          Preferred: {format(new Date(selectedMessage.preferredDate), "PPP")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div>
                    <h4 className="font-semibold mb-2">Message:</h4>
                    <div className="bg-charcoal p-4 rounded-lg max-h-[300px] overflow-y-auto scrollbar-hide">
                      <p className="whitespace-pre-wrap break-words">{selectedMessage.message}</p>
                    </div>
                  </div>

                  {selectedMessage.serviceRequested && (
                    <div>
                      <h4 className="font-semibold mb-2">Service Requested:</h4>
                      <Badge variant="outline" className="border-gold/30 text-gold">
                        {selectedMessage.serviceRequested}
                      </Badge>
                    </div>
                  )}

                  <Separator className="bg-steel/20" />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedMessage.id, "replied")}
                      disabled={selectedMessage.status === "replied"}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Replied
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedMessage.id, "archived")}
                      disabled={selectedMessage.status === "archived"}
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateClient(selectedMessage)}
                          disabled={!canCreateClient(selectedMessage)}
                          className={`${
                            canCreateClient(selectedMessage)
                              ? "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                              : "border-gray-500/30 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create Client
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getCreateClientTooltip(selectedMessage)}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLocation(`/appointments/new?clientName=${encodeURIComponent(selectedMessage.customerName)}&phone=${encodeURIComponent(selectedMessage.customerPhone || "")}&email=${encodeURIComponent(selectedMessage.customerEmail || "")}`);
                      }}
                      className="border-gold/30 text-gold hover:bg-gold/10"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <BottomNavigation currentPath={location} />
    </div>
  );
}