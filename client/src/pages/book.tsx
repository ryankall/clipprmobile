import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Phone, Mail, User as UserIcon, Scissors, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType, Service } from "@shared/schema";
import { format, addDays, startOfDay, parseISO, isToday, isTomorrow, isYesterday } from "date-fns";

interface BookingRequest {
  barberPhone: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  selectedDate: string;
  selectedTime: string;
  selectedServices: string[];
  customService?: string;
  message?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookingPage() {
  const { barberInfo } = useParams<{ barberInfo: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');
  const [showCustomService, setShowCustomService] = useState(false);
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [needsTravel, setNeedsTravel] = useState<boolean | null>(null);
  const [clientAddress, setClientAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingClient, setExistingClient] = useState<any>(null);
  const { toast } = useToast();

  // Parse barber info from URL (format: phone-barbername)
  const barberPhone = barberInfo?.split('-')[0] || '';
  const barberSlug = barberInfo?.split('-').slice(1).join('-') || '';

  // Fetch barber profile data
  const { data: barber, isLoading: barberLoading } = useQuery<UserType>({
    queryKey: [`/api/public/barber/${barberPhone}`],
    enabled: !!barberPhone,
  });

  // Fetch barber services
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: [`/api/public/barber/${barberPhone}/services`],
    enabled: !!barberPhone,
  });

  // Fetch available time slots for selected date
  const { data: timeSlots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/public/barber/${barberPhone}/availability`, selectedDate],
    enabled: !!barberPhone && !!selectedDate && currentStep === 2,
  });

  // Client lookup by phone
  const checkClientMutation = useMutation({
    mutationFn: async (phone: string) => {
      return apiRequest("GET", `/api/public/barber/${barberPhone}/client-lookup?phone=${encodeURIComponent(phone)}`);
    },
    onSuccess: (data) => {
      if (data && data.name) {
        setExistingClient(data);
        setClientName(data.name);
        setClientEmail(data.email || '');
        toast({
          title: "Welcome back!",
          description: `Found your information: ${data.name}`,
        });
      } else {
        setExistingClient(null);
      }
    },
  });

  // Check for existing client when phone number changes
  useEffect(() => {
    if (clientPhone.length >= 10 && currentStep === 4) {
      checkClientMutation.mutate(clientPhone);
    }
  }, [clientPhone, currentStep]);

  const submitBookingMutation = useMutation({
    mutationFn: async (data: BookingRequest) => {
      return apiRequest("POST", "/api/public/booking-request", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Booking Request Sent!",
        description: `Your request has been sent to ${barber?.businessName || barber?.firstName}. You'll receive a confirmation soon.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send booking request",
        variant: "destructive",
      });
    },
  });

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = () => {
    if (!clientName.trim() || !clientPhone.trim() || !selectedTime || selectedServices.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name, phone, select a time slot, and choose at least one service.",
        variant: "destructive",
      });
      return;
    }

    const bookingData: BookingRequest = {
      barberPhone,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      selectedDate,
      selectedTime,
      selectedServices,
      customService: showCustomService ? customService.trim() : undefined,
      message: message.trim() || undefined,
    };

    submitBookingMutation.mutate(bookingData);
  };

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: format(date, i === 0 ? "'Today'" : i === 1 ? "'Tomorrow'" : 'EEE, MMM d'),
    };
  });

  if (barberLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Barber Not Found</h1>
          <p className="text-steel">The booking link you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Time Slot Reserved!</h1>
          <p className="text-steel mb-4">
            This time slot is being held for you for 30 minutes. You'll receive an SMS shortly asking you to confirm by replying "YES" to keep it. If you don't respond within 30 minutes, the slot will be released for others to book.
          </p>
          <div className="bg-charcoal p-4 rounded-lg">
            <p className="text-sm text-steel">Requested Services:</p>
            <p className="text-white font-medium">
              {selectedServices.map(serviceId => 
                services?.find(s => s.id.toString() === serviceId)?.name
              ).join(', ')}
              {showCustomService && customService && `, ${customService}`}
            </p>
            <p className="text-sm text-steel mt-2">Date & Time:</p>
            <p className="text-white font-medium">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')} at {selectedTime}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="text-center py-8 px-4">
        <h1 className="text-3xl font-bold text-white mb-2">
          {barber.businessName || `${barber.firstName} ${barber.lastName}`}
        </h1>
        <p className="text-steel text-lg">Book your next cut or style</p>
        
        {barber.serviceArea && (
          <div className="flex items-center justify-center mt-2 text-steel">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="text-sm">{barber.serviceArea}</span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
        {/* Date Selection */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-gold" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {availableDates.map(({ date, display }) => (
                <Button
                  key={date}
                  variant={selectedDate === date ? "default" : "outline"}
                  className={`p-3 h-auto ${selectedDate === date 
                    ? "bg-gold text-charcoal hover:bg-gold/90" 
                    : "bg-charcoal border-steel/40 text-white hover:bg-charcoal/80"
                  }`}
                  onClick={() => setSelectedDate(date)}
                >
                  {display}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        {selectedDate && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gold" />
                Available Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
                </div>
              ) : timeSlots && timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.filter(slot => slot.available).map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      className={`p-2 h-auto ${selectedTime === slot.time
                        ? "bg-gold text-charcoal hover:bg-gold/90"
                        : "bg-charcoal border-steel/40 text-white hover:bg-charcoal/80"
                      }`}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-steel text-center py-4">No available times for this date</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Client Information */}
        {selectedTime && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-gold" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Name *
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="bg-charcoal border-steel/40 text-white"
                  placeholder="Your full name"
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="bg-charcoal border-steel/40 text-white"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="bg-charcoal border-steel/40 text-white"
                  placeholder="your.email@example.com"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Selection */}
        {selectedTime && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Scissors className="w-5 h-5 mr-2 text-gold" />
                Select Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {services?.map((service) => (
                    <div key={service.id} className="flex items-center space-x-3 p-3 bg-charcoal rounded-lg">
                      <Checkbox
                        checked={selectedServices.includes(service.id.toString())}
                        onCheckedChange={() => handleServiceToggle(service.id.toString())}
                        className="border-steel/40"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{service.name}</span>
                          <Badge variant="outline" className="text-gold border-gold/40">
                            ${service.price}
                          </Badge>
                        </div>
                        {service.description && (
                          <p className="text-steel text-sm mt-1">{service.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Custom Service Option */}
                  <div className="flex items-center space-x-3 p-3 bg-charcoal rounded-lg">
                    <Checkbox
                      checked={showCustomService}
                      onCheckedChange={(checked) => setShowCustomService(checked === true)}
                      className="border-steel/40"
                    />
                    <span className="text-white font-medium">Custom Service</span>
                  </div>
                  
                  {showCustomService && (
                    <Input
                      value={customService}
                      onChange={(e) => setCustomService(e.target.value)}
                      className="bg-charcoal border-steel/40 text-white"
                      placeholder="Describe your custom service request..."
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Optional Message */}
        {selectedTime && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white">Additional Message (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= 300) {
                    setMessage(e.target.value);
                  }
                }}
                className="bg-charcoal border-steel/40 text-white scrollbar-hide"
                placeholder="Tell us anything you'd like us to know..."
                rows={3}
              />
              <div className="text-right text-sm text-steel">
                {message.length}/300 characters
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {selectedTime && (
          <Button
            onClick={handleSubmit}
            disabled={submitBookingMutation.isPending || !clientName.trim() || !clientPhone.trim() || selectedServices.length === 0}
            className="w-full gradient-gold text-charcoal font-semibold py-4 text-lg"
          >
            {submitBookingMutation.isPending ? "Sending Request..." : "Request Appointment"}
          </Button>
        )}
      </div>
    </div>
  );
}