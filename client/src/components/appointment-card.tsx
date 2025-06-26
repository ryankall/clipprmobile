import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigation, MapPin } from "lucide-react";
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@shared/schema";

interface AppointmentCardProps {
  appointment: AppointmentWithRelations;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const handleNavigate = () => {
    if (appointment.address) {
      // In production, integrate with maps application
      const encodedAddress = encodeURIComponent(appointment.address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      window.open(mapsUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center p-3 bg-charcoal rounded-lg border border-steel/20">
      <Avatar className="h-12 w-12 mr-3">
        <AvatarImage 
          src={appointment.client.photoUrl || undefined} 
          alt={appointment.client.name} 
        />
        <AvatarFallback className="bg-steel text-white">
          {appointment.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white">{appointment.client.name}</h4>
          <span className="text-sm text-gold font-medium">
            {format(new Date(appointment.scheduledAt), 'h:mm a')}
          </span>
        </div>
        <p className="text-sm text-steel">{appointment.service.name}</p>
        {appointment.address && (
          <div className="flex items-center mt-1">
            <MapPin className="w-3 h-3 text-steel mr-1" />
            <span className="text-xs text-steel">{appointment.address}</span>
          </div>
        )}
      </div>
      
      {appointment.address && (
        <Button
          variant="ghost"
          size="sm"
          className="text-gold touch-target ml-2 tap-feedback"
          onClick={handleNavigate}
        >
          <Navigation className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
