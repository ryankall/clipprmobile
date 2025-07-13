import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, DollarSign } from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AppointmentWithRelations } from "@/types";

// Helper function to generate time slots for mobile timeline view
function generateTimeSlots(appointments: AppointmentWithRelations[], selectedDate: Date) {
  const slots = [];
  const dayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduledAt);
    return aptDate.toDateString() === selectedDate.toDateString();
  });

  // Generate time slots from 9 AM to 8 PM
  for (let hour = 9; hour <= 20; hour++) {
    const timeStr = hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
    
    // Find appointment at this time
    const appointment = dayAppointments.find(apt => {
      const aptTime = new Date(apt.scheduledAt);
      return aptTime.getHours() === hour;
    });
    
    slots.push({
      time: timeStr,
      hour: hour,
      appointment: appointment || null,
      isAvailable: !appointment
    });
  }
  
  return slots;
}

// Helper function to get appointment color based on service type
function getAppointmentColor(appointment: AppointmentWithRelations) {
  const serviceName = appointment.service?.name?.toLowerCase() || '';
  
  if (serviceName.includes('haircut') || serviceName.includes('cut')) {
    return 'bg-amber-500/20 border-amber-500/50';
  } else if (serviceName.includes('beard') || serviceName.includes('trim')) {
    return 'bg-emerald-500/20 border-emerald-500/50';
  } else if (serviceName.includes('shave')) {
    return 'bg-blue-500/20 border-blue-500/50';
  } else if (serviceName.includes('wash') || serviceName.includes('styling')) {
    return 'bg-purple-500/20 border-purple-500/50';
  } else if (serviceName.includes('color') || serviceName.includes('dye')) {
    return 'bg-pink-500/20 border-pink-500/50';
  } else {
    return 'bg-gray-500/20 border-gray-500/50';
  }
}

export default function MobileCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const { toast } = useToast();

  const startDate = startOfWeek(selectedDate);
  const endDate = endOfWeek(selectedDate);

  const { data: appointments, isLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments", startDate.toISOString(), endDate.toISOString()],
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/appointments/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Appointment deleted",
        description: "The appointment has been successfully removed.",
      });
      setSelectedAppointment(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const timeSlots = generateTimeSlots(appointments || [], selectedDate);
  const todayAppointments = appointments?.filter(apt => {
    const aptDate = new Date(apt.scheduledAt);
    return aptDate.toDateString() === selectedDate.toDateString();
  }) || [];

  const handlePrevDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment);
  };

  const handleDeleteAppointment = () => {
    if (selectedAppointment) {
      deleteAppointmentMutation.mutate(selectedAppointment.id);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="bg-dark-card border-b border-steel/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Calendar</h1>
            <p className="text-sm text-steel">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <Button
            size="sm"
            className="bg-gold text-dark-bg hover:bg-gold/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-card border-b border-steel/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevDay}
          className="text-steel hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => setSelectedDate(new Date())}
          className="text-white hover:text-gold"
        >
          Today
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextDay}
          className="text-steel hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-center p-4">
        <div className="flex bg-dark-card border border-steel/20 rounded-lg p-1">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            className={viewMode === 'timeline' ? 'bg-gold text-dark-bg' : 'text-steel hover:text-white'}
          >
            Timeline
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-gold text-dark-bg' : 'text-steel hover:text-white'}
          >
            List
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
          </div>
        ) : viewMode === 'timeline' ? (
          /* Timeline View */
          <div className="space-y-2">
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className={`flex items-center p-3 rounded-lg border ${
                  slot.appointment
                    ? getAppointmentColor(slot.appointment)
                    : 'bg-dark-card border-steel/20'
                }`}
              >
                <div className="w-16 text-sm text-steel font-medium">
                  {slot.time}
                </div>
                
                {slot.appointment ? (
                  <div
                    onClick={() => handleAppointmentClick(slot.appointment!)}
                    className="flex-1 cursor-pointer tap-feedback"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{slot.appointment.client?.name}</p>
                        <p className="text-sm text-steel">{slot.appointment.service?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gold">{slot.appointment.price}</p>
                        <p className="text-xs text-steel">{slot.appointment.duration}min</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-center text-steel">
                    <span className="text-sm">Available</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className={`cursor-pointer tap-feedback ${getAppointmentColor(appointment)}`}
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-dark-bg" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{appointment.client?.name}</p>
                          <p className="text-sm text-steel">{appointment.service?.name}</p>
                          <p className="text-xs text-steel">
                            {format(new Date(appointment.scheduledAt), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gold">{appointment.price}</p>
                        <p className="text-xs text-steel">{appointment.duration}min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-steel">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No appointments today</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appointment Details Dialog */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg border border-steel/20 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-steel/20">
              <h3 className="text-white font-semibold">Appointment Details</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-dark-bg" />
                </div>
                <div>
                  <p className="font-medium text-white">{selectedAppointment.client?.name}</p>
                  <p className="text-sm text-steel">{selectedAppointment.client?.phone}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gold" />
                  <span className="text-white">{format(new Date(selectedAppointment.scheduledAt), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gold" />
                  <span className="text-white">{format(new Date(selectedAppointment.scheduledAt), 'h:mm a')}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gold" />
                  <span className="text-white">{selectedAppointment.price} • {selectedAppointment.duration} min</span>
                </div>
              </div>
              
              <div className="p-3 bg-dark-bg rounded-lg">
                <p className="text-sm text-steel mb-1">Service</p>
                <p className="text-white">{selectedAppointment.service?.name}</p>
              </div>
              
              <div className="p-3 bg-dark-bg rounded-lg">
                <p className="text-sm text-steel mb-1">Status</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  selectedAppointment.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                  selectedAppointment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {selectedAppointment.status}
                </span>
              </div>
            </div>
            
            <div className="p-4 border-t border-steel/20 flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setSelectedAppointment(null)}
                className="flex-1 border-steel/20 text-steel hover:text-white"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAppointment}
                disabled={deleteAppointmentMutation.isPending}
                className="flex-1"
              >
                {deleteAppointmentMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}