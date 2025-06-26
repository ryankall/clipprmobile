import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Star, Camera, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Client, AppointmentWithRelations, GalleryPhoto } from "@shared/schema";

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id || "0");

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments"],
    select: (data) => data?.filter(apt => apt.clientId === clientId) || [],
    enabled: !!clientId,
  });

  const { data: photos, isLoading: photosLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
    select: (data) => data?.filter(photo => photo.clientId === clientId) || [],
    enabled: !!clientId,
  });

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-dark-bg text-white p-4">
        <div className="text-center py-8">
          <h1 className="text-xl font-bold mb-2">Client Not Found</h1>
          <Link href="/clients">
            <Button variant="link" className="text-gold">
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalSpent = appointments?.reduce((sum, apt) => sum + parseFloat(apt.price || '0'), 0) || 0;
  const upcomingAppointments = appointments?.filter(apt => 
    new Date(apt.scheduledAt) > new Date() && apt.status === 'scheduled'
  ).length || 0;

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-20">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/clients">
              <Button variant="ghost" size="sm" className="text-steel hover:text-white p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">{client.name}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link href={`/appointments/new?clientId=${client.id}`}>
              <Button size="sm" className="gradient-gold text-charcoal tap-feedback">
                Book
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-steel hover:text-white">
              <Phone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Client Info */}
        <Card className="bg-dark-card border-steel/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={client.photoUrl || undefined} 
                  alt={client.name} 
                />
                <AvatarFallback className="bg-steel text-white text-xl">
                  {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="text-xl font-bold text-white">{client.name}</h2>
                  {client.loyaltyStatus === 'vip' && (
                    <Badge className="bg-gold text-charcoal">
                      <Star className="w-3 h-3 mr-1" />
                      VIP
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  {client.phone && (
                    <div className="flex items-center text-sm text-steel">
                      <Phone className="w-4 h-4 mr-2" />
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center text-sm text-steel">
                      <Mail className="w-4 h-4 mr-2" />
                      {client.email}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center text-sm text-steel">
                      <MapPin className="w-4 h-4 mr-2" />
                      {client.address}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {client.preferredStyle && (
              <div className="mt-4 p-3 bg-charcoal rounded-lg">
                <h4 className="text-sm font-medium text-white mb-1">Preferred Style</h4>
                <p className="text-sm text-steel">{client.preferredStyle}</p>
              </div>
            )}

            {client.notes && (
              <div className="mt-4 p-3 bg-charcoal rounded-lg">
                <h4 className="text-sm font-medium text-white mb-1">Notes</h4>
                <p className="text-sm text-steel">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {client.totalVisits || 0}
              </div>
              <div className="text-xs text-steel">Total Visits</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                ${totalSpent.toFixed(0)}
              </div>
              <div className="text-xs text-steel">Total Spent</div>
            </CardContent>
          </Card>
          <Card className="bg-dark-card border-steel/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gold">
                {upcomingAppointments}
              </div>
              <div className="text-xs text-steel">Upcoming</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Appointments */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                  .slice(0, 5)
                  .map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-charcoal rounded-lg">
                      <div>
                        <div className="font-medium text-white">{appointment.service.name}</div>
                        <div className="text-sm text-steel">
                          {format(new Date(appointment.scheduledAt), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gold font-medium">${appointment.price}</div>
                        <Badge 
                          variant={appointment.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No appointments yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Photo Gallery ({photos?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photosLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            ) : photos && photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="polaroid card-shadow">
                    <img 
                      src={photo.photoUrl} 
                      alt={photo.description || "Client photo"} 
                      className="w-full h-32 object-cover rounded" 
                    />
                    <div className="text-xs text-center mt-2 text-steel">
                      {photo.description || format(new Date(photo.createdAt!), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-steel">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No photos uploaded yet</p>
                <Link href="/gallery">
                  <Button variant="link" className="text-gold text-sm mt-2 p-0 h-auto">
                    Add photos
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
