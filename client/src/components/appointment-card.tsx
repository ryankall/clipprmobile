import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin } from "lucide-react";
import { format } from "date-fns";
import { getServiceNamesDisplay } from "@/lib/appointmentUtils";
import type { AppointmentWithRelations } from "@shared/schema";

interface AppointmentCardProps {
  appointment: AppointmentWithRelations;
  onClick?: () => void;
  showClickable?: boolean;
}

export function AppointmentCard({ 
  appointment, 
  onClick, 
  showClickable = false 
}: AppointmentCardProps) {
  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick when clicking navigate button
    if (appointment.address) {
      const encodedAddress = encodeURIComponent(appointment.address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const isConfirmed = appointment.status === "confirmed";
  const cardClasses = `flex items-center p-3 bg-charcoal rounded-lg border border-steel/20 ${
    showClickable ? 'cursor-pointer hover:bg-charcoal/80 transition-colors' : ''
  }`;

  return (
    <div 
      className={cardClasses}
      onClick={showClickable ? onClick : undefined}
    >
      <Avatar className="h-12 w-12 mr-3">
        <AvatarImage 
          src={appointment.client.photoUrl || undefined} 
          alt={appointment.client.name} 
        />
        <AvatarFallback className="bg-steel text-white">
          {appointment.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-white truncate mr-2">{appointment.client.name}</h4>
          <span className="text-sm text-gold font-medium whitespace-nowrap">
            {format(new Date(appointment.scheduledAt), 'h:mm a')}
          </span>
        </div>
        <p className="text-sm text-steel mb-1 truncate">{getServiceNamesDisplay(appointment, 35)}</p>
        {appointment.address && (
          <div className="flex items-center mb-2">
            <MapPin className="w-3 h-3 text-steel mr-1 flex-shrink-0" />
            <span className="text-xs text-steel truncate">{appointment.address}</span>
          </div>
        )}
        <div className="flex justify-start">
          <Badge variant={isConfirmed ? "default" : "secondary"} className={`text-xs ${
            isConfirmed ? "bg-green-700 text-white" : "bg-yellow-700 text-white"
          }`}>
            {isConfirmed ? "Confirmed" : "Pending"}
          </Badge>
        </div>
      </div>
      
      {appointment.address && (
        <Button
          variant="ghost"
          size="sm"
          className="text-gold touch-target tap-feedback flex-shrink-0"
          onClick={handleNavigate}
        >
          <Navigation className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
