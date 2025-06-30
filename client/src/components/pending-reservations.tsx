import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Reservation {
  id: number;
  userId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  scheduledAt: string;
  duration: number;
  services: string[];
  address?: string;
  notes?: string;
  expiresAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function PendingReservations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['/api/reservations/pending'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const confirmReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      return apiRequest('POST', `/api/reservations/${reservationId}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/today'] });
      toast({
        title: "Reservation Confirmed",
        description: "The reservation has been converted to a confirmed appointment.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm reservation",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-dark-card border-steel/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gold" />
            Pending Reservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-steel">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!reservations || reservations.length === 0) {
    return (
      <Card className="bg-dark-card border-steel/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gold" />
            Pending Reservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-steel">No pending reservations</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-card border-steel/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gold" />
            Pending Reservations
          </div>
          <Badge variant="secondary" className="bg-gold/20 text-gold">
            {reservations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reservations.map((reservation: Reservation) => {
          const scheduledDate = new Date(reservation.scheduledAt);
          const expiresDate = new Date(reservation.expiresAt);
          const isExpiringSoon = expiresDate.getTime() - Date.now() < 10 * 60 * 1000; // Less than 10 minutes
          
          return (
            <div
              key={reservation.id}
              className="bg-charcoal rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-steel" />
                  <span className="text-white font-medium">
                    {reservation.customerName}
                  </span>
                  {isExpiringSoon && (
                    <Badge variant="destructive" className="text-xs">
                      Expiring Soon
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-steel" />
                  <span className="text-steel text-sm">
                    {reservation.customerPhone}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-steel">Date & Time:</span>
                  <div className="text-white">
                    {format(scheduledDate, 'MMM d, yyyy')}
                  </div>
                  <div className="text-white">
                    {format(scheduledDate, 'h:mm a')}
                  </div>
                </div>
                <div>
                  <span className="text-steel">Expires:</span>
                  <div className={`font-medium ${isExpiringSoon ? 'text-red-400' : 'text-white'}`}>
                    {format(expiresDate, 'h:mm a')}
                  </div>
                  <div className="text-steel text-xs">
                    ({Math.max(0, Math.floor((expiresDate.getTime() - Date.now()) / 60000))} min left)
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-steel text-sm">Duration:</span>
                  <span className="text-white text-sm ml-2">
                    {reservation.duration} minutes
                  </span>
                </div>
                {reservation.address && (
                  <div>
                    <span className="text-steel text-sm">Address:</span>
                    <div className="text-white text-sm">
                      {reservation.address}
                    </div>
                  </div>
                )}
                {reservation.notes && (
                  <div>
                    <span className="text-steel text-sm">Notes:</span>
                    <div className="text-white text-sm">
                      {reservation.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => confirmReservationMutation.mutate(reservation.id)}
                  disabled={confirmReservationMutation.isPending}
                  className="bg-gold hover:bg-gold/80 text-dark-bg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {confirmReservationMutation.isPending ? 'Confirming...' : 'Confirm Appointment'}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}