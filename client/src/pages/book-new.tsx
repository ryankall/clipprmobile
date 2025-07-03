import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Phone, Mail, User as UserIcon, Scissors, CheckCircle, ChevronLeft, ChevronRight, ArrowLeft, User, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType, Service } from "@shared/schema";
import { format, addDays, startOfDay, parseISO, isToday, isTomorrow } from "date-fns";

// Utility function to format phone numbers
function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return value;
}

interface BookingRequest {
  barberPhone: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  selectedDate: string;
  selectedTime: string;
  selectedServices: string[];
  customService?: string;
  needsTravel: boolean;
  clientAddress?: string;
  message?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function EnhancedBookingPage() {
  const { barberInfo } = useParams<{ barberInfo: string }>();
  const [currentStep, setCurrentStep] = useState(1); // Start with phone entry
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [needsTravel, setNeedsTravel] = useState<boolean | null>(null);
  const [clientAddress, setClientAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingClient, setExistingClient] = useState<any>(null);
  const { toast } = useToast();

  // Format time from 24-hour to 12-hour format
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Parse barber info from URL (format: phone-barbername)
  const barberPhone = barberInfo?.split('-')[0] || '';
  const barberSlug = barberInfo?.split('-').slice(1).join('-') || '';

  // Fetch barber profile data
  const { data: barber, isLoading: barberLoading } = useQuery<UserType>({
    queryKey: [`/api/public/barber/${barberPhone}`],
    enabled: !!barberPhone,
  });

  // Fetch barber services (always available)
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: [`/api/public/barber/${barberPhone}/services`],
    enabled: !!barberPhone,
  });

  // Fetch available time slots for selected date (for step 5)
  const { data: timeSlots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/public/barber/${barberPhone}/availability?date=${selectedDate}`],
    enabled: !!barberPhone && !!selectedDate && currentStep === 5,
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
        if (data.address) {
          setClientAddress(data.address);
        }
        toast({
          title: "Welcome back!",
          description: `Found your information: ${data.name}`,
        });
      } else {
        setExistingClient(null);
      }
    },
  });

  // Submit booking request
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

  // Check for existing client when phone number changes
  useEffect(() => {
    if (clientPhone.length >= 10 && currentStep === 4) {
      checkClientMutation.mutate(clientPhone);
    }
  }, [clientPhone, currentStep]);

  // Generate next 7 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      display: isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEE, MMM d'),
      full: format(date, 'EEEE, MMMM d, yyyy')
    };
  });

  const handleNext = () => {
    // Only validate when trying to complete the final booking
    if (currentStep === 6) {
      if (!clientPhone) {
        toast({ title: "Please enter your phone number", variant: "destructive" });
        setCurrentStep(1);
        return;
      }
      if (!clientName || needsTravel === null) {
        toast({ title: "Please complete all required fields", variant: "destructive" });
        setCurrentStep(2);
        return;
      }
      if (needsTravel && !clientAddress) {
        toast({ title: "Please enter your address for travel service", variant: "destructive" });
        setCurrentStep(2);
        return;
      }
      if (!selectedDate) {
        toast({ title: "Please select a date", variant: "destructive" });
        setCurrentStep(3);
        return;
      }
      if (!selectedTime) {
        toast({ title: "Please select a time", variant: "destructive" });
        setCurrentStep(4);
        return;
      }
      if (selectedServices.length === 0 && !customService) {
        toast({ title: "Please select at least one service", variant: "destructive" });
        setCurrentStep(5);
        return;
      }
      // Submit the booking if all validations pass
      handleSubmit();
      return;
    }

    // Allow navigation between steps without validation
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const bookingData: BookingRequest = {
      barberPhone,
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      selectedDate,
      selectedTime,
      selectedServices: selectedServices.filter(Boolean),
      customService: customService || undefined,
      needsTravel: needsTravel || false,
      clientAddress: needsTravel ? clientAddress : undefined,
      message: message || undefined,
    };

    submitBookingMutation.mutate(bookingData);
  };

  if (barberLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-steel">Loading barber profile...</p>
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <Card className="bg-dark-card border-steel/20 p-8 text-center">
          <h1 className="text-xl font-bold text-white mb-4">Barber not found</h1>
          <p className="text-steel">The booking link you're looking for doesn't exist.</p>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <Card className="bg-dark-card border-steel/20 max-w-md w-full text-center">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Request Sent!</h1>
            <p className="text-steel mb-6">
              Your booking request has been sent to {barber.businessName || barber.firstName}.
              An SMS will be sent to confirm your appointment once the barber reviews your request.
            </p>
            <div className="space-y-2 text-sm text-steel text-left bg-charcoal rounded-lg p-4">
              <div><strong className="text-white">Date:</strong> {selectedDate}</div>
              <div><strong className="text-white">Time:</strong> {selectedTime}</div>
              <div><strong className="text-white">Services:</strong> {selectedServices.join(', ')}{customService && `, ${customService}`}</div>
              <div><strong className="text-white">Travel:</strong> {needsTravel ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {barber.photoUrl && (
              <img 
                src={barber.photoUrl} 
                alt={barber.firstName}
                className="w-10 h-10 rounded-full object-cover border-2 border-gold"
              />
            )}
            <div>
              <h1 className="font-bold text-white">
                {barber.businessName || `${barber.firstName} ${barber.lastName}`}
              </h1>
              <p className="text-steel text-sm">{barber.serviceArea}</p>
            </div>
          </div>
          <div className="text-gold font-bold">{currentStep}/6</div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Step Navigation */}
        <div className="flex justify-center space-x-2 py-4">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`
                w-3 h-3 rounded-full transition-colors
                ${currentStep === step
                  ? 'bg-gold' 
                  : currentStep > step
                  ? 'bg-steel/60'
                  : 'bg-steel/20'
                }
              `}
            />
          ))}
        </div>

        {/* Step 1: Phone Number Entry */}
        {currentStep === 1 && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Phone className="w-5 h-5 mr-2 text-gold" />
                Enter Your Phone Number
              </CardTitle>
              <p className="text-steel text-sm">
                We'll use this to send you appointment confirmations
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(formatPhoneNumber(e.target.value))}
                  className="bg-charcoal border-steel/40 text-white"
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
              </div>
              {clientPhone && (
                <Button onClick={handleNext} className="w-full gradient-gold text-charcoal">
                  Continue to Personal Info
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Client Information */}
        {currentStep === 2 && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-gold" />
                  Client Information
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-steel hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-white">Name (required)</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="bg-charcoal border-steel/40 text-white"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-white">Phone (required)</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(formatPhoneNumber(e.target.value))}
                  className="bg-charcoal border-steel/40 text-white"
                  placeholder="(888) 888-8888"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-white">Email (optional)</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="bg-charcoal border-steel/40 text-white"
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">Do you wish for ryan to travel to you? (required)</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="travelOption"
                      value="yes"
                      checked={needsTravel === true}
                      onChange={() => setNeedsTravel(true)}
                      className="w-4 h-4 text-gold"
                    />
                    <span className="text-white">Yes, travel to me</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="travelOption"
                      value="no"
                      checked={needsTravel === false}
                      onChange={() => setNeedsTravel(false)}
                      className="w-4 h-4 text-gold"
                    />
                    <span className="text-white">No, I'll come to ryan</span>
                  </label>
                </div>
              </div>

              {needsTravel && (
                <div className="space-y-2">
                  <Label htmlFor="clientAddress" className="text-white">Your Address *</Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="bg-charcoal border-steel/40 text-white"
                    placeholder="123 Main St, City, State"
                  />
                </div>
              )}

              {clientName && clientPhone && needsTravel !== null && (!needsTravel || clientAddress) && (
                <Button onClick={handleNext} className="w-full gradient-gold text-charcoal">
                  Continue to Services
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Services */}
        {currentStep === 3 && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Scissors className="w-5 h-5 mr-2 text-gold" />
                  Select Services
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-steel hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </CardTitle>
              <p className="text-steel text-sm">Choose one or more services</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {servicesLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-steel">Loading services...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {services?.map((service) => (
                      <div
                        key={service.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedServices.includes(service.name)
                            ? 'border-gold bg-gold/10'
                            : 'border-steel/40 bg-charcoal hover:border-gold/50'
                        }`}
                        onClick={() => {
                          if (selectedServices.includes(service.name)) {
                            setSelectedServices(prev => prev.filter(s => s !== service.name));
                          } else {
                            setSelectedServices(prev => [...prev, service.name]);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox 
                              checked={selectedServices.includes(service.name)}
                              className="data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                            />
                            <div>
                              <div className="font-medium text-white">{service.name}</div>
                              {service.description && (
                                <div className="text-sm text-steel">{service.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-gold font-bold">${service.price}</div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Custom Service Option */}
                    <div
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedServices.includes('Custom')
                          ? 'border-gold bg-gold/10'
                          : 'border-steel/40 bg-charcoal hover:border-gold/50'
                      }`}
                      onClick={() => {
                        if (selectedServices.includes('Custom')) {
                          setSelectedServices(prev => prev.filter(s => s !== 'Custom'));
                          setCustomService('');
                        } else {
                          setSelectedServices(prev => [...prev, 'Custom']);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          checked={selectedServices.includes('Custom')}
                          className="data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                        />
                        <div className="font-medium text-white">Custom Service</div>
                      </div>
                      {selectedServices.includes('Custom') && (
                        <Input
                          placeholder="Describe your custom service..."
                          value={customService}
                          onChange={(e) => setCustomService(e.target.value)}
                          className="mt-2 bg-dark-card border-steel/40 text-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </div>
                  
                  {(selectedServices.length > 0 || customService) && (
                    <Button onClick={handleNext} className="w-full gradient-gold text-charcoal">
                      Continue to Available Time
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Date Selection */}
        {currentStep === 4 && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-gold" />
                  Select Date
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-steel hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 14 }, (_, i) => {
                  const date = addDays(startOfDay(new Date()), i);
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const displayStr = isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEE MMM d');
                  
                  return (
                    <Button
                      key={dateStr}
                      variant={selectedDate === dateStr ? "default" : "outline"}
                      className={
                        selectedDate === dateStr
                          ? 'bg-gold text-charcoal h-16 flex flex-col'
                          : 'bg-charcoal border-steel/40 text-white hover:border-gold/50 h-16 flex flex-col'
                      }
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      <span className="text-xs">{displayStr}</span>
                      <span className="text-xs opacity-70">{format(date, 'yyyy-MM-dd')}</span>
                    </Button>
                  );
                })}
              </div>
              
              {selectedDate && (
                <Button onClick={handleNext} className="w-full gradient-gold text-charcoal">
                  Continue to Time Selection
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Time Selection */}
        {currentStep === 5 && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gold" />
                  Select Available Time
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-steel hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDate ? (
                <>
                  <p className="text-steel text-sm">
                    Available times for {selectedDate}
                  </p>
                  {timeSlots && timeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          disabled={!slot.available}
                          className={
                            selectedTime === slot.time
                              ? 'bg-gold text-charcoal'
                              : slot.available
                              ? 'bg-charcoal border-steel/40 text-white hover:border-gold/50'
                              : 'bg-steel/10 border-steel/20 text-steel/50 cursor-not-allowed'
                          }
                          onClick={() => setSelectedTime(slot.time)}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-steel">Loading available times...</p>
                    </div>
                  )}
                  {selectedTime && (
                    <Button onClick={handleNext} className="w-full gradient-gold text-charcoal">
                      Continue to Review
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-steel">Please select a date first to see available times.</p>
                  <Button onClick={() => setCurrentStep(4)} className="mt-4 gradient-gold text-charcoal">
                    Go to Date Selection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 6: Message and Confirmation */}
        {currentStep === 6 && (
          <Card className="bg-dark-card border-steel/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-gold" />
                  Optional Message
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-steel hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Tell us anything you'd like us to know"
                  value={message}
                  onChange={(e) => {
                    if (e.target.value.length <= 300) {
                      setMessage(e.target.value);
                    }
                  }}
                  className="bg-dark-card border-steel/40 text-white min-h-[100px] scrollbar-hide"
                />
                <div className="text-right text-sm text-steel">
                  {message.length}/300 characters
                </div>
              </div>
              
              <div className="bg-charcoal rounded-lg p-4 space-y-2 text-sm">
                <h3 className="text-white font-medium">Booking Summary</h3>
                <div className="space-y-1 text-steel">
                  <div><strong className="text-white">Date:</strong> {availableDates.find(d => d.date === selectedDate)?.full}</div>
                  <div><strong className="text-white">Time:</strong> {selectedTime}</div>
                  <div><strong className="text-white">Services:</strong> {selectedServices.filter(s => s !== 'Custom').join(', ')}{customService && `, ${customService}`}</div>
                  <div><strong className="text-white">Client:</strong> {clientName}</div>
                  <div><strong className="text-white">Phone:</strong> {clientPhone}</div>
                  {clientEmail && <div><strong className="text-white">Email:</strong> {clientEmail}</div>}
                  <div><strong className="text-white">Travel:</strong> {needsTravel ? `Yes - ${clientAddress}` : 'No'}</div>
                </div>
              </div>
              
              <Button 
                onClick={handleSubmit} 
                disabled={submitBookingMutation.isPending}
                className="w-full gradient-gold text-charcoal font-bold py-3"
              >
                {submitBookingMutation.isPending ? "Sending Request..." : "Send Booking Request"}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}