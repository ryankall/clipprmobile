import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Clock, XCircle, Receipt, MessageSquare, Scissors } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getServiceNamesDisplay } from "@/lib/appointmentUtils";
import { replaceMessageTemplate } from "@shared/utils";
import type { AppointmentWithRelations, Service } from "@shared/schema";

interface AppointmentPreviewProps {
  appointment?: AppointmentWithRelations;
  type: "next" | "current";
  services?: Service[];
  quickActionMessages?: {
    onMyWay?: string;
    runningLate?: string;
    confirmation?: string;
  };
  sendQuickActionMessage?: (messageType: "onMyWay" | "runningLate" | "confirmation", appointment: AppointmentWithRelations) => Promise<void>;
  onDetailsClick?: () => void;
}

export function AppointmentPreview({ 
  appointment, 
  type, 
  services = [], 
  quickActionMessages,
  sendQuickActionMessage,
  onDetailsClick 
}: AppointmentPreviewProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const markNoShowMutation = useMutation({
    mutationFn: () => {
      if (!appointment) throw new Error("No appointment to update");
      return apiRequest("PATCH", `/api/appointments/${appointment.id}`, {
        status: "no_show"
      });
    },
    onSuccess: () => {
      toast({
        title: "Appointment Updated",
        description: "Appointment marked as no-show",
      });
      // Invalidate all appointment-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const calculateETA = () => {
    if (type !== "next" || !appointment) return null;
    
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledAt);
    const minutesUntil = differenceInMinutes(appointmentTime, now);
    
    if (minutesUntil <= 0) return "Now";
    if (minutesUntil < 60) return `${minutesUntil}m`;
    
    const hours = Math.floor(minutesUntil / 60);
    const minutes = minutesUntil % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const handlePhoneCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (appointment?.client.phone) {
      window.open(`tel:${appointment.client.phone}`, '_self');
    }
  };

  const handleQuickActionMessage = (messageType: 'onMyWay' | 'runningLate' | 'confirmation') => {
    if (!sendQuickActionMessage || !appointment) return;
    
    // Use the passed function if available, otherwise fall back to SMS
    if (sendQuickActionMessage) {
      sendQuickActionMessage(messageType, appointment);
    } else {
      // Fallback SMS method
      const message = quickActionMessages?.[messageType];
      if (!message || !appointment?.client.phone) return;

      const personalizedMessage = replaceMessageTemplate(message, appointment);
      const smsUrl = `sms:${appointment.client.phone}?body=${encodeURIComponent(personalizedMessage)}`;
      window.open(smsUrl, '_blank');
    }
  };

  const eta = calculateETA();

  // Handle empty state when no appointment
  if (!appointment) {
    return (
      <Card className="bg-charcoal border-steel">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-gold border-gold">
              {type === "next" ? "Next" : "Current"}
            </Badge>
          </div>
          <div className="text-center py-6">
            <Scissors className="w-8 h-8 text-steel/50 mx-auto mb-3" />
            <p className="text-steel">
              {type === "current" ? "No appointment at this time" : "No upcoming appointment"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="bg-charcoal border-steel cursor-pointer hover:bg-charcoal/80 transition-colors"
      onClick={onDetailsClick}
    >
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
            <span>{getServiceNamesDisplay(appointment, 40)}</span>
          </div>
          
          {appointment.address && (
            <div className="flex items-center gap-2 text-steel">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{appointment.address}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Call button always first */}
          <Button 
            size="sm" 
            variant="outline"
            onClick={handlePhoneCall}
            className="text-xs bg-blue-700 hover:bg-blue-500 text-white"
          >
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>

          {type === "next" && quickActionMessages && (
            <>
              {quickActionMessages.onMyWay && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickActionMessage('onMyWay');
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickActionMessage('runningLate');
                  }}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Running Late
                </Button>
              )}
              {quickActionMessages.confirmation && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickActionMessage('confirmation');
                  }}
                  className="text-xs"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Confirm
                </Button>
              )}
            </>
          )}

          {type === "current" && (
            <>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  markNoShowMutation.mutate();
                }}
                disabled={markNoShowMutation.isPending}
                className="text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" />
                No Show
              </Button>

              <Button 
                size="sm" 
                className="text-xs bg-gold text-charcoal hover:bg-gold/90"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to invoice page with prefilled appointment data
                  const invoiceData = {
                    clientId: appointment.client.id,
                    clientName: appointment.client.name,
                    appointmentId: appointment.id,
                    scheduledAt: appointment.scheduledAt,
                    serviceName: getServiceNamesDisplay(appointment, 200),
                    servicePrice: appointment.price,
                    duration: appointment.duration
                  };
                  const queryParams = new URLSearchParams({
                    prefill: JSON.stringify(invoiceData)
                  });
                  setLocation(`/invoice?${queryParams.toString()}`);
                }}
              >
                <Receipt className="h-3 w-3 mr-1" />
                Create Invoice
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}