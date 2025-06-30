import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Scissors, 
  DollarSign,
  CheckCircle,
  Trash2,
  Navigation
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AppointmentWithRelations } from "@shared/schema";

interface AppointmentDetailsDialogProps {
  appointment: AppointmentWithRelations | null;
  open: boolean;
  onClose: () => void;
}

export function AppointmentDetailsDialog({ 
  appointment, 
  open, 
  onClose 
}: AppointmentDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest("PATCH", `/api/appointments/${appointmentId}`, {
        status: "confirmed"
      });
    },
    onSuccess: () => {
      toast({
        title: "Appointment Confirmed",
        description: "The appointment has been confirmed and is now unavailable for booking.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Confirmation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return apiRequest("DELETE", `/api/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been deleted and the time slot is now available.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNavigate = () => {
    if (appointment?.address) {
      const encodedAddress = encodeURIComponent(appointment.address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const handleConfirm = () => {
    if (appointment) {
      confirmAppointmentMutation.mutate(appointment.id);
    }
  };

  const handleDelete = () => {
    if (appointment) {
      deleteAppointmentMutation.mutate(appointment.id);
    }
  };

  if (!appointment) return null;

  const appointmentDate = new Date(appointment.scheduledAt);
  const isConfirmed = appointment.status === "confirmed";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-charcoal border-steel/40 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            Appointment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Information */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={appointment.client.photoUrl || undefined} 
                alt={appointment.client.name} 
              />
              <AvatarFallback className="bg-steel text-white text-lg">
                {appointment.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-white">{appointment.client.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={isConfirmed ? "default" : "secondary"} className={
                  isConfirmed ? "bg-green-700 text-white" : "bg-yellow-700 text-white"
                }>
                  {isConfirmed ? "Confirmed" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-steel/30" />

          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gold" />
              <div>
                <p className="font-medium text-white">
                  {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gold" />
              <div>
                <p className="font-medium text-white">
                  {format(appointmentDate, 'h:mm a')}
                </p>
                <p className="text-sm text-steel">
                  Approx. completion: {format(new Date(appointmentDate.getTime() + appointment.service.duration * 60000), 'h:mm a')}
                </p>
              </div>
            </div>

            {/* Services Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Scissors className="w-5 h-5 text-gold" />
                <div className="flex-1">
                  <p className="font-medium text-white">Services</p>
                  {appointment.appointmentServices && appointment.appointmentServices.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {appointment.appointmentServices.map((appointmentService, index) => (
                        <div key={index} className="bg-charcoal/50 rounded-md p-2 border border-steel/20">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{appointmentService.service.name}</p>
                              <p className="text-xs text-steel">{appointmentService.service.duration} minutes</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-white">${appointmentService.price}</p>
                              {appointmentService.quantity > 1 && (
                                <p className="text-xs text-steel">Qty: {appointmentService.quantity}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t border-steel/20">
                        <p className="text-sm font-medium text-white">Total Duration:</p>
                        <p className="text-sm font-medium text-white">
                          {appointment.appointmentServices.reduce((total, service) => 
                            total + (service.service.duration * service.quantity), 0
                          )} minutes
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-white">Total Price:</p>
                        <p className="text-sm font-medium text-gold">
                          ${appointment.appointmentServices.reduce((total, service) => 
                            total + (parseFloat(service.price) * service.quantity), 0
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-white">{appointment.service.name}</p>
                      <p className="text-xs text-steel">{appointment.service.duration} minutes • ${appointment.service.price}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {appointment.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gold mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-white">Location</p>
                  <p className="text-sm text-steel">{appointment.address}</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-gold p-0 h-auto mt-1 text-sm"
                    onClick={handleNavigate}
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Get Directions
                  </Button>
                </div>
              </div>
            )}

            {appointment.client.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gold" />
                <div>
                  <p className="font-medium text-white">Phone</p>
                  <p className="text-sm text-steel">{appointment.client.phone}</p>
                </div>
              </div>
            )}

            {appointment.client.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gold" />
                <div>
                  <p className="font-medium text-white">Email</p>
                  <p className="text-sm text-steel">{appointment.client.email}</p>
                </div>
              </div>
            )}

            {appointment.notes && (
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gold mt-0.5" />
                <div>
                  <p className="font-medium text-white">Notes</p>
                  <p className="text-sm text-steel">{appointment.notes}</p>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-steel/30" />

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!isConfirmed ? (
              <Button
                onClick={handleConfirm}
                disabled={confirmAppointmentMutation.isPending}
                className="flex-1 gradient-gold text-charcoal"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {confirmAppointmentMutation.isPending ? "Confirming..." : "Confirm Appointment"}
              </Button>
            ) : (
              <div className="flex-1 text-center py-2">
                <p className="text-sm text-green-400">✓ Appointment Confirmed</p>
              </div>
            )}
            
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteAppointmentMutation.isPending}
              className="px-4"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-white mb-3">
                Are you sure you want to delete this appointment? This will free up the time slot for new bookings.
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteAppointmentMutation.isPending}
                >
                  {deleteAppointmentMutation.isPending ? "Deleting..." : "Yes, Delete"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-charcoal border-steel/40 text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}