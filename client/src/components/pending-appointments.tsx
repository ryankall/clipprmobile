import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Phone, MapPin, User, Car, Navigation, AlertCircle } from "lucide-react";
import { format, subMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getServiceNamesDisplay } from "@/lib/appointmentUtils";
import type { AppointmentWithRelations, User as UserType } from "@shared/schema";

interface PendingAppointmentsProps {
  className?: string;
}

interface TravelTimeInfo {
  appointmentId: number;
  travelTime: number; // in minutes
  departureTime: Date;
  distance: string;
  travelMode: string;
}

export function PendingAppointments({ className }: PendingAppointmentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [travelTimeData, setTravelTimeData] = useState<TravelTimeInfo[]>([]);
  const [loadingTravelTime, setLoadingTravelTime] = useState(false);

  const { data: pendingAppointments, isLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/pending"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: userProfile } = useQuery<UserType>({
    queryKey: ["/api/user/profile"],
  });

  // Calculate travel time for appointments with addresses
  useEffect(() => {
    if (!pendingAppointments || !userProfile?.address) return;

    const appointmentsWithAddresses = pendingAppointments.filter(apt => apt.address);
    if (appointmentsWithAddresses.length === 0) return;

    const calculateTravelTimes = async () => {
      setLoadingTravelTime(true);
      try {
        const travelPromises = appointmentsWithAddresses.map(async (appointment) => {
          try {
            const response = await apiRequest("POST", "/api/travel-time", {
              origin: userProfile.address,
              destination: appointment.address,
              transportationMode: userProfile.transportationMode || 'driving',
              appointmentTime: appointment.scheduledAt
            });
            
            if (response.success) {
              const travelTime = response.travelTime;
              const departureTime = subMinutes(new Date(appointment.scheduledAt), travelTime + 5); // Add 5min buffer
              
              return {
                appointmentId: appointment.id,
                travelTime: travelTime,
                departureTime: departureTime,
                distance: response.distance || 'N/A',
                travelMode: userProfile.transportationMode || 'driving'
              };
            }
          } catch (error) {
            console.error(`Failed to calculate travel time for appointment ${appointment.id}:`, error);
          }
          return null;
        });

        const travelResults = await Promise.all(travelPromises);
        setTravelTimeData(travelResults.filter(Boolean) as TravelTimeInfo[]);
      } catch (error) {
        console.error('Error calculating travel times:', error);
      } finally {
        setLoadingTravelTime(false);
      }
    };

    calculateTravelTimes();
  }, [pendingAppointments, userProfile?.address, userProfile?.transportationMode]);

  // Helper function to get travel time info for an appointment
  const getTravelTimeInfo = (appointmentId: number) => {
    return travelTimeData.find(info => info.appointmentId === appointmentId);
  };

  // Helper function to get transportation mode icon
  const getTransportIcon = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'driving': return <Car className="h-4 w-4" />;
      case 'walking': return <Navigation className="h-4 w-4" />;
      case 'cycling': return <Navigation className="h-4 w-4" />;
      case 'transit': return <Navigation className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

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
        {pendingAppointments.map((appointment) => {
          const travelInfo = getTravelTimeInfo(appointment.id);
          const now = new Date();
          const appointmentTime = new Date(appointment.scheduledAt);
          const shouldShowTravelWarning = travelInfo && travelInfo.departureTime <= now;

          return (
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
                    {shouldShowTravelWarning && (
                      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Departure Time!
                      </Badge>
                    )}
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
                  {/* Travel Time Information */}
                  {(travelInfo || (appointment as any).travelTime > 0) && appointment.address && (
                    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 mt-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-2">
                        {getTransportIcon(travelInfo?.travelMode || 'driving')}
                        Travel Information
                      </div>
                      <div className="space-y-1 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>Travel Time:</span>
                          <span className="font-medium">
                            {(appointment as any).travelTime > 0 
                              ? `${(appointment as any).travelTime} minutes (stored)` 
                              : `${travelInfo?.travelTime} minutes (calculated)`
                            }
                          </span>
                        </div>
                        {travelInfo && (
                          <>
                            <div className="flex justify-between">
                              <span>Distance:</span>
                              <span className="font-medium">{travelInfo.distance}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Departure Time:</span>
                              <span className={`font-medium ${shouldShowTravelWarning ? 'text-red-600' : ''}`}>
                                {format(travelInfo.departureTime, "h:mm a")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Mode:</span>
                              <span className="font-medium capitalize">{travelInfo.travelMode}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Loading indicator for travel time calculation */}
                  {loadingTravelTime && appointment.address && !travelInfo && (
                    <div className="bg-gray-50/50 border border-gray-200 rounded-lg p-3 mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        Calculating travel time...
                      </div>
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
          );
        })}
      </CardContent>
    </Card>
  );
}