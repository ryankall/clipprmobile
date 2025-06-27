import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Star, Calendar, DollarSign, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { ClientWithStats } from "@shared/schema";

interface ClientCardProps {
  client: ClientWithStats;
  showActions?: boolean;
  compact?: boolean;
}

export function ClientCard({ client, showActions = true, compact = false }: ClientCardProps) {
  return (
    <div className={`bg-charcoal rounded-lg border border-steel/20 hover:bg-charcoal/80 transition-colors ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center space-x-3">
        <Avatar className={compact ? "h-10 w-10" : "h-12 w-12"}>
          <AvatarImage 
            src={client.photoUrl || undefined} 
            alt={client.name} 
          />
          <AvatarFallback className="bg-steel text-white">
            {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className={`font-medium text-white truncate ${compact ? 'text-sm' : ''}`}>
              {client.name}
            </h4>
            {client.loyaltyStatus === 'vip' && (
              <Badge className="bg-gold text-charcoal text-xs px-2 py-0 flex items-center">
                <Star className="w-3 h-3 mr-1" />
                VIP
              </Badge>
            )}
          </div>
          
          {!compact && (
            <div className="space-y-1">
              {client.phone && (
                <div className="flex items-center text-xs text-steel">
                  <Phone className="w-3 h-3 mr-1" />
                  <span className="truncate">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center text-xs text-steel">
                  <Mail className="w-3 h-3 mr-1" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center text-xs text-steel">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="truncate">{client.address}</span>
                </div>
              )}
            </div>
          )}
          
          <div className={`flex items-center justify-between mt-2 ${compact ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center space-x-4">
              {client.totalVisits && client.totalVisits > 0 && (
                <div className="flex items-center text-steel">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{client.totalVisits} visit{client.totalVisits !== 1 ? 's' : ''}</span>
                </div>
              )}
              {client.totalSpent && parseFloat(client.totalSpent) > 0 && (
                <div className="flex items-center text-gold">
                  <DollarSign className="w-3 h-3 mr-1" />
                  <span>${parseFloat(client.totalSpent).toFixed(2)}</span>
                </div>
              )}
            </div>
            
            {client.lastVisit && (
              <div className={`text-steel ${compact ? 'text-xs' : 'text-sm'}`}>
                Last: {format(new Date(client.lastVisit), 'MMM d')}
              </div>
            )}
          </div>
          
          {client.preferredStyle && !compact && (
            <div className="mt-2 p-2 bg-dark-bg rounded text-xs">
              <span className="text-steel">Preferred: </span>
              <span className="text-white">{client.preferredStyle}</span>
            </div>
          )}
          
          {client.notes && !compact && (
            <div className="mt-2 p-2 bg-dark-bg rounded text-xs">
              <span className="text-steel">Notes: </span>
              <span className="text-white line-clamp-2">{client.notes}</span>
            </div>
          )}
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-2">
            {!compact && client.phone && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gold hover:bg-gold/10 touch-target"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `tel:${client.phone}`;
                }}
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
            
            <Link href={`/clients/${client.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-steel hover:text-white touch-target"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      {client.upcomingAppointments && client.upcomingAppointments > 0 && !compact && (
        <div className="mt-3 pt-3 border-t border-steel/20">
          <div className="flex items-center text-sm text-gold">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{client.upcomingAppointments} upcoming appointment{client.upcomingAppointments !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
