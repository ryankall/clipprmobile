import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Phone, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getServiceNamesDisplay } from "@/lib/appointmentUtils";
import type { AppointmentWithRelations } from "@shared/schema";

interface PendingAppointmentsProps {
  className?: string;
}

export function PendingAppointments({ className }: PendingAppointmentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: pendingAppointments, isLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/pending"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Debug logging
  console.log('PendingAppointments component:', {
    isLoading,
    pendingAppointments,
    count: pendingAppointments?.length || 0
  });

  const confirmMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest("PATCH", `/api/appointments/${appointmentId}`, {
        status: "confirmed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Appointment confirmed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm appointment",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest("PATCH", `/api/appointments/${appointmentId}`, {
        status: "cancelled"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const handleConfirm = async (appointment: AppointmentWithRelations) => {
    setProcessingId(appointment.id);
    confirmMutation.mutate(appointment.id);
  };

  const handleCancel = async (appointment: AppointmentWithRelations) => {
    setProcessingId(appointment.id);
    cancelMutation.mutate(appointment.id);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Confirmations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded-lg"></div>
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingAppointments || pendingAppointments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Confirmations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No appointments awaiting confirmation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Confirmations
          <Badge variant="secondary" className="ml-auto">
            {pendingAppointments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border rounded-lg p-4 space-y-3 bg-amber-50/20 border-amber-200"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{appointment.client.name}</span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    Pending
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(appointment.scheduledAt), "MMM d, h:mm a")}
                </div>
                {appointment.client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {appointment.client.phone}
                  </div>
                )}
                {appointment.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {appointment.address}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Service:</span> {getServiceNamesDisplay(appointment, 50)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Duration:</span> {appointment.duration} minutes
              </div>
              <div className="text-sm">
                <span className="font-medium">Price:</span> ${appointment.price}
              </div>
              {appointment.notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span> {appointment.notes}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleConfirm(appointment)}
                disabled={processingId === appointment.id}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleCancel(appointment)}
                disabled={processingId === appointment.id}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}