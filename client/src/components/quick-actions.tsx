import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Car, Clock, MessageSquare, Phone, Edit3, MapPin } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@shared/schema";

interface NextAppointmentInfo {
  appointment?: AppointmentWithRelations;
  eta?: string;
  isRunningLate?: boolean;
  travelTime?: number;
}

export function QuickActions() {
  const { toast } = useToast();
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [messageType, setMessageType] = useState<"on_my_way" | "running_late">("running_late");

  // Get today's appointments
  const { data: todayAppointments } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/today"],
  });

  // Calculate next appointment intelligently
  const [nextAppointmentInfo, setNextAppointmentInfo] = useState<NextAppointmentInfo>({});

  useEffect(() => {
    if (!todayAppointments?.length) {
      setNextAppointmentInfo({});
      return;
    }

    const now = new Date();
    const currentTime = now.getTime();

    // Find next appointment within 1 hour or current appointment
    const relevantAppointment = todayAppointments
      .filter(apt => {
        const aptTime = new Date(apt.scheduledAt).getTime();
        const timeDiff = aptTime - currentTime;
        
        // Include if appointment is:
        // 1. Within next hour
        // 2. Currently happening (up to appointment duration)
        // 3. Recently started (within 30 minutes)
        return timeDiff <= 60 * 60 * 1000 && timeDiff >= -30 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

    if (relevantAppointment) {
      const aptTime = new Date(relevantAppointment.scheduledAt);
      const timeDiff = aptTime.getTime() - currentTime;
      const isRunningLate = timeDiff < 0; // Appointment time has passed
      
      // Calculate ETA (mock for now - would use real travel time)
      const estimatedTravelTime = 15; // minutes
      const eta = new Date(currentTime + estimatedTravelTime * 60 * 1000);
      
      setNextAppointmentInfo({
        appointment: relevantAppointment,
        eta: format(eta, "h:mm a"),
        isRunningLate,
        travelTime: estimatedTravelTime,
      });
    } else {
      setNextAppointmentInfo({});
    }
  }, [todayAppointments]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { appointmentId: number; message: string; method: 'sms' | 'email' }) => {
      return apiRequest("/api/communications/send-message", {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Message Sent",
        description: response.method === 'sms' ? "SMS sent successfully" : "Email sent successfully",
      });
      setIsMessageDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Message could not be sent",
        variant: "destructive",
      });
    },
  });

  const handleQuickMessage = (templateMessage: string, type: "on_my_way" | "running_late") => {
    if (!nextAppointmentInfo.appointment) {
      toast({
        title: "No Upcoming Appointment",
        description: "No appointment found within the next hour",
        variant: "destructive",
      });
      return;
    }

    const clientName = nextAppointmentInfo.appointment.client.name;
    const personalizedMessage = templateMessage.replace("[ClientName]", clientName);
    
    setCustomMessage(personalizedMessage);
    setMessageType(type);
    setIsMessageDialogOpen(true);
  };

  const sendMessage = () => {
    if (!nextAppointmentInfo.appointment) return;

    // Prefer SMS, fallback to email
    const method = nextAppointmentInfo.appointment.client.phone ? 'sms' : 'email';
    
    sendMessageMutation.mutate({
      appointmentId: nextAppointmentInfo.appointment.id,
      message: customMessage,
      method,
    });
  };

  const hasNextAppointment = !!nextAppointmentInfo.appointment;
  const appointment = nextAppointmentInfo.appointment;

  return (
    <Card className="bg-dark-card border-steel/20 card-shadow">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Smart Quick Actions</h3>
        
        {hasNextAppointment ? (
          <div className="space-y-4">
            {/* Next Appointment Info */}
            <div className="bg-charcoal/50 rounded-lg p-3 border border-steel/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gold rounded-full"></div>
                  <span className="text-white font-medium">Next: {appointment?.client.name}</span>
                </div>
                <span className="text-steel text-sm">
                  {format(new Date(appointment?.scheduledAt || new Date()), "h:mm a")}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-steel" />
                  <span className="text-steel">
                    ETA: {nextAppointmentInfo.eta} ({nextAppointmentInfo.travelTime} min drive)
                  </span>
                </div>
                {nextAppointmentInfo.isRunningLate && (
                  <span className="text-amber-400 text-xs">⚠️ Running late</span>
                )}
              </div>
            </div>

            {/* Quick Message Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 h-auto p-3 text-center touch-target flex flex-col items-center space-y-1 tap-feedback hover:bg-charcoal/80"
                onClick={() => handleQuickMessage("Hey [ClientName], I'm on my way! See you in ~15 minutes.", "on_my_way")}
              >
                <Car className="w-4 h-4 text-gold" />
                <span className="text-xs">On My Way</span>
              </Button>
              
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 h-auto p-3 text-center touch-target flex flex-col items-center space-y-1 tap-feedback hover:bg-charcoal/80"
                onClick={() => handleQuickMessage("Hi [ClientName], I'm running a little late — I'll be there in ~15 mins. Thanks for your patience!", "running_late")}
              >
                <Clock className="w-4 h-4 text-gold" />
                <span className="text-xs">Running Late</span>
              </Button>
              
              <Button
                variant="outline"
                className="bg-charcoal border-steel/40 h-auto p-3 text-center touch-target flex flex-col items-center space-y-1 tap-feedback hover:bg-charcoal/80 col-span-2"
                onClick={() => {
                  if (appointment?.client.phone) {
                    window.location.href = `tel:${appointment.client.phone}`;
                  } else {
                    toast({
                      title: "No Phone Number",
                      description: "This client doesn't have a phone number on file",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Phone className="w-4 h-4 text-gold" />
                <span className="text-xs">Call {appointment?.client.name}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <MessageSquare className="w-8 h-8 text-steel mx-auto mb-2" />
            <p className="text-steel text-sm">No upcoming appointments within the next hour</p>
            <p className="text-steel/70 text-xs mt-1">Quick actions will appear when you have appointments coming up</p>
          </div>
        )}

        {/* Message Customization Dialog */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent className="bg-dark-card border-steel/20">
            <DialogHeader>
              <DialogTitle className="text-white">
                {messageType === "on_my_way" ? "On My Way Message" : "Running Late Message"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium">Message to {appointment?.client.name}:</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="bg-charcoal border-steel/40 text-white mt-2"
                  rows={4}
                  placeholder="Customize your message..."
                />
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                  {appointment?.client.phone ? (
                    <>
                      <MessageSquare className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Will send via SMS</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400">Will send via Email</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={sendMessage}
                  disabled={sendMessageMutation.isPending || !customMessage.trim()}
                  className="flex-1 gradient-gold text-charcoal"
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsMessageDialogOpen(false)}
                  className="border-steel/40 text-white hover:bg-steel/20"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit More
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
