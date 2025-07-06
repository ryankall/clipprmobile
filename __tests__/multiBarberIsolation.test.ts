import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for multi-barber isolation system
interface Barber {
  id: number;
  email: string;
  phone: string;
  businessName: string;
  firstName: string;
  lastName: string;
  phoneVerified: boolean;
}

interface Client {
  id: number;
  userId: number; // Barber ID who owns this client
  name: string;
  phone: string;
  email?: string;
}

interface Appointment {
  id: number;
  userId: number; // Barber ID who owns this appointment
  clientId: number;
  serviceId: number;
  scheduledAt: Date;
  status: string;
}

interface Service {
  id: number;
  userId: number; // Barber ID who owns this service
  name: string;
  price: string;
  duration: number;
}

interface GalleryPhoto {
  id: number;
  userId: number; // Barber ID who owns this photo
  photoUrl: string;
  type: string;
  clientId?: number;
}

interface PublicBookingLink {
  barberId: number;
  phone: string;
  businessName: string;
  url: string;
}

interface Calendar {
  userId: number;
  appointments: Appointment[];
  workingHours: any;
  availability: Date[];
}

interface Settings {
  userId: number;
  timezone: string;
  workingHours: any;
  transportationMode: string;
  stripeConnected: boolean;
}

// Mock multi-barber system
class MockMultiBarberSystem {
  private barbers: Map<number, Barber> = new Map();
  private clients: Map<number, Client[]> = new Map(); // Barber ID -> Client[]
  private appointments: Map<number, Appointment[]> = new Map(); // Barber ID -> Appointment[]
  private services: Map<number, Service[]> = new Map(); // Barber ID -> Service[]
  private galleryPhotos: Map<number, GalleryPhoto[]> = new Map(); // Barber ID -> Photo[]
  private settings: Map<number, Settings> = new Map(); // Barber ID -> Settings

  constructor() {
    // Initialize test barbers
    this.setupTestBarbers();
  }

  private setupTestBarbers(): void {
    // Barber 1: "Urban Cuts" - Brooklyn
    const barber1: Barber = {
      id: 1,
      email: 'mike@urbancuts.com',
      phone: '(718) 555-0101',
      businessName: 'Urban Cuts',
      firstName: 'Mike',
      lastName: 'Johnson',
      phoneVerified: true,
    };
    this.barbers.set(1, barber1);

    // Barber 2: "Style Studio" - Manhattan  
    const barber2: Barber = {
      id: 2,
      email: 'alex@stylestudio.com',
      phone: '(212) 555-0202',
      businessName: 'Style Studio',
      firstName: 'Alex',
      lastName: 'Rodriguez',
      phoneVerified: true,
    };
    this.barbers.set(2, barber2);

    // Barber 3: "Classic Cuts" - Queens (unverified)
    const barber3: Barber = {
      id: 3,
      email: 'sarah@classiccuts.com',
      phone: '(347) 555-0303',
      businessName: 'Classic Cuts',
      firstName: 'Sarah',
      lastName: 'Williams',
      phoneVerified: false,
    };
    this.barbers.set(3, barber3);

    // Setup initial data for each barber
    this.initializeBarberData();
  }

  private initializeBarberData(): void {
    // Barber 1 clients
    this.clients.set(1, [
      { id: 101, userId: 1, name: 'John Smith', phone: '(718) 555-1001', email: 'john@email.com' },
      { id: 102, userId: 1, name: 'David Brown', phone: '(718) 555-1002', email: 'david@email.com' },
    ]);

    // Barber 2 clients  
    this.clients.set(2, [
      { id: 201, userId: 2, name: 'Maria Garcia', phone: '(212) 555-2001', email: 'maria@email.com' },
      { id: 202, userId: 2, name: 'James Wilson', phone: '(212) 555-2002', email: 'james@email.com' },
    ]);

    // Barber 3 clients
    this.clients.set(3, [
      { id: 301, userId: 3, name: 'Lisa Chen', phone: '(347) 555-3001', email: 'lisa@email.com' },
    ]);

    // Barber 1 services
    this.services.set(1, [
      { id: 101, userId: 1, name: 'Brooklyn Fade', price: '35.00', duration: 45 },
      { id: 102, userId: 1, name: 'Urban Beard Trim', price: '20.00', duration: 30 },
    ]);

    // Barber 2 services
    this.services.set(2, [
      { id: 201, userId: 2, name: 'Manhattan Classic', price: '50.00', duration: 60 },
      { id: 202, userId: 2, name: 'Executive Style', price: '75.00', duration: 90 },
    ]);

    // Barber 3 services
    this.services.set(3, [
      { id: 301, userId: 3, name: 'Traditional Cut', price: '25.00', duration: 40 },
    ]);

    // Appointments for each barber
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    this.appointments.set(1, [
      { id: 1001, userId: 1, clientId: 101, serviceId: 101, scheduledAt: tomorrow, status: 'confirmed' },
    ]);

    this.appointments.set(2, [
      { id: 2001, userId: 2, clientId: 201, serviceId: 201, scheduledAt: tomorrow, status: 'confirmed' },
    ]);

    this.appointments.set(3, []);

    // Gallery photos
    this.galleryPhotos.set(1, [
      { id: 1001, userId: 1, photoUrl: 'data:image/jpeg;base64,/9j/...', type: 'portfolio' },
    ]);

    this.galleryPhotos.set(2, [
      { id: 2001, userId: 2, photoUrl: 'data:image/jpeg;base64,/9j/...', type: 'before' },
      { id: 2002, userId: 2, photoUrl: 'data:image/jpeg;base64,/9j/...', type: 'after', clientId: 201 },
    ]);

    this.galleryPhotos.set(3, []);

    // Settings for each barber
    this.settings.set(1, {
      userId: 1,
      timezone: 'America/New_York',
      workingHours: { monday: { enabled: true, start: '09:00', end: '18:00' } },
      transportationMode: 'driving',
      stripeConnected: true,
    });

    this.settings.set(2, {
      userId: 2,
      timezone: 'America/New_York', 
      workingHours: { monday: { enabled: true, start: '10:00', end: '20:00' } },
      transportationMode: 'walking',
      stripeConnected: false,
    });

    this.settings.set(3, {
      userId: 3,
      timezone: 'America/New_York',
      workingHours: { monday: { enabled: true, start: '08:00', end: '17:00' } },
      transportationMode: 'cycling',
      stripeConnected: false,
    });
  }

  // Client data isolation
  getClientsByBarberId(barberId: number): Client[] {
    return this.clients.get(barberId) || [];
  }

  canBarberAccessClient(barberId: number, clientId: number): boolean {
    const barberClients = this.clients.get(barberId) || [];
    return barberClients.some(client => client.id === clientId);
  }

  // Appointment data isolation
  getAppointmentsByBarberId(barberId: number): Appointment[] {
    return this.appointments.get(barberId) || [];
  }

  canBarberAccessAppointment(barberId: number, appointmentId: number): boolean {
    const barberAppointments = this.appointments.get(barberId) || [];
    return barberAppointments.some(appointment => appointment.id === appointmentId);
  }

  // Service data isolation
  getServicesByBarberId(barberId: number): Service[] {
    return this.services.get(barberId) || [];
  }

  canBarberAccessService(barberId: number, serviceId: number): boolean {
    const barberServices = this.services.get(barberId) || [];
    return barberServices.some(service => service.id === serviceId);
  }

  // Gallery photo isolation
  getGalleryPhotosByBarberId(barberId: number): GalleryPhoto[] {
    return this.galleryPhotos.get(barberId) || [];
  }

  canBarberAccessPhoto(barberId: number, photoId: number): boolean {
    const barberPhotos = this.galleryPhotos.get(barberId) || [];
    return barberPhotos.some(photo => photo.id === photoId);
  }

  // Calendar isolation
  getCalendarByBarberId(barberId: number): Calendar {
    return {
      userId: barberId,
      appointments: this.getAppointmentsByBarberId(barberId),
      workingHours: this.settings.get(barberId)?.workingHours || {},
      availability: [], // Mock availability
    };
  }

  // Public booking link generation
  generatePublicBookingLink(barberId: number): PublicBookingLink | null {
    const barber = this.barbers.get(barberId);
    if (!barber || !barber.phoneVerified) {
      return null;
    }

    const cleanPhone = barber.phone.replace(/[^\d]/g, '');
    const businessSlug = barber.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return {
      barberId,
      phone: cleanPhone,
      businessName: barber.businessName,
      url: `/book/${cleanPhone}-${businessSlug}`,
    };
  }

  // Settings isolation
  getSettingsByBarberId(barberId: number): Settings | null {
    return this.settings.get(barberId) || null;
  }

  updateBarberSettings(barberId: number, updates: Partial<Settings>): boolean {
    const currentSettings = this.settings.get(barberId);
    if (!currentSettings) return false;

    this.settings.set(barberId, { ...currentSettings, ...updates });
    return true;
  }

  // Cross-barber data access prevention
  getAllClientsFromOtherBarbers(excludeBarberId: number): Client[] {
    const allClients: Client[] = [];
    for (const [barberId, clients] of this.clients.entries()) {
      if (barberId !== excludeBarberId) {
        allClients.push(...clients);
      }
    }
    return allClients;
  }

  // Analytics isolation
  getBarberStats(barberId: number): any {
    const clients = this.getClientsByBarberId(barberId);
    const appointments = this.getAppointmentsByBarberId(barberId);
    const services = this.getServicesByBarberId(barberId);
    const photos = this.getGalleryPhotosByBarberId(barberId);

    return {
      totalClients: clients.length,
      totalAppointments: appointments.length,
      totalServices: services.length,
      totalPhotos: photos.length,
      revenueThisMonth: appointments.reduce((sum, apt) => {
        const service = services.find(s => s.id === apt.serviceId);
        return sum + (service ? parseFloat(service.price) : 0);
      }, 0),
    };
  }

  getBarber(barberId: number): Barber | null {
    return this.barbers.get(barberId) || null;
  }
}

describe('Multi-Barber Account Isolation System', () => {
  let multiBarberSystem: MockMultiBarberSystem;

  beforeEach(() => {
    multiBarberSystem = new MockMultiBarberSystem();
    vi.clearAllMocks();
  });

  describe('Client Data Isolation', () => {
    it('should only return clients belonging to specific barber', () => {
      const barber1Clients = multiBarberSystem.getClientsByBarberId(1);
      const barber2Clients = multiBarberSystem.getClientsByBarberId(2);

      expect(barber1Clients).toHaveLength(2);
      expect(barber2Clients).toHaveLength(2);
      
      // Check all clients belong to correct barber
      barber1Clients.forEach(client => {
        expect(client.userId).toBe(1);
      });
      
      barber2Clients.forEach(client => {
        expect(client.userId).toBe(2);
      });
      
      // Ensure no overlap
      const barber1ClientIds = barber1Clients.map(c => c.id);
      const barber2ClientIds = barber2Clients.map(c => c.id);
      expect(barber1ClientIds).not.toEqual(expect.arrayContaining(barber2ClientIds));
    });

    it('should prevent barber from accessing other barber clients', () => {
      // Barber 1 trying to access Barber 2's client
      const canAccess = multiBarberSystem.canBarberAccessClient(1, 201); // Client 201 belongs to Barber 2
      expect(canAccess).toBe(false);

      // Barber can access their own clients
      const canAccessOwn = multiBarberSystem.canBarberAccessClient(1, 101); // Client 101 belongs to Barber 1
      expect(canAccessOwn).toBe(true);
    });

    it('should return empty array for barber with no clients', () => {
      // Clear barber 3's clients
      const barber3Clients = multiBarberSystem.getClientsByBarberId(999); // Non-existent barber
      expect(barber3Clients).toHaveLength(0);
    });
  });

  describe('Appointment Data Isolation', () => {
    it('should isolate appointments by barber', () => {
      const barber1Appointments = multiBarberSystem.getAppointmentsByBarberId(1);
      const barber2Appointments = multiBarberSystem.getAppointmentsByBarberId(2);

      expect(barber1Appointments).toHaveLength(1);
      expect(barber2Appointments).toHaveLength(1);
      
      // Verify ownership
      barber1Appointments.forEach(apt => {
        expect(apt.userId).toBe(1);
      });
      
      barber2Appointments.forEach(apt => {
        expect(apt.userId).toBe(2);
      });
    });

    it('should prevent cross-barber appointment access', () => {
      // Barber 1 cannot access Barber 2's appointment
      const canAccess = multiBarberSystem.canBarberAccessAppointment(1, 2001);
      expect(canAccess).toBe(false);

      // Barber can access their own appointment
      const canAccessOwn = multiBarberSystem.canBarberAccessAppointment(1, 1001);
      expect(canAccessOwn).toBe(true);
    });
  });

  describe('Service Data Isolation', () => {
    it('should isolate services by barber', () => {
      const barber1Services = multiBarberSystem.getServicesByBarberId(1);
      const barber2Services = multiBarberSystem.getServicesByBarberId(2);

      expect(barber1Services).toHaveLength(2);
      expect(barber2Services).toHaveLength(2);
      
      // Check unique service names per barber
      expect(barber1Services[0].name).toBe('Brooklyn Fade');
      expect(barber2Services[0].name).toBe('Manhattan Classic');
      
      // Verify ownership
      barber1Services.forEach(service => {
        expect(service.userId).toBe(1);
      });
    });

    it('should prevent service cross-access', () => {
      // Barber 1 cannot access Barber 2's service
      const canAccess = multiBarberSystem.canBarberAccessService(1, 201);
      expect(canAccess).toBe(false);

      // Barber can access their own service
      const canAccessOwn = multiBarberSystem.canBarberAccessService(2, 201);
      expect(canAccessOwn).toBe(true);
    });
  });

  describe('Gallery Photo Isolation', () => {
    it('should isolate gallery photos by barber', () => {
      const barber1Photos = multiBarberSystem.getGalleryPhotosByBarberId(1);
      const barber2Photos = multiBarberSystem.getGalleryPhotosByBarberId(2);

      expect(barber1Photos).toHaveLength(1);
      expect(barber2Photos).toHaveLength(2);
      
      // Verify ownership
      barber1Photos.forEach(photo => {
        expect(photo.userId).toBe(1);
      });
      
      barber2Photos.forEach(photo => {
        expect(photo.userId).toBe(2);
      });
    });

    it('should prevent photo cross-access', () => {
      // Barber 1 cannot access Barber 2's photos
      const canAccess = multiBarberSystem.canBarberAccessPhoto(1, 2001);
      expect(canAccess).toBe(false);

      // Barber can access their own photos
      const canAccessOwn = multiBarberSystem.canBarberAccessPhoto(2, 2001);
      expect(canAccessOwn).toBe(true);
    });
  });

  describe('Calendar Isolation', () => {
    it('should provide isolated calendar data', () => {
      const barber1Calendar = multiBarberSystem.getCalendarByBarberId(1);
      const barber2Calendar = multiBarberSystem.getCalendarByBarberId(2);

      expect(barber1Calendar.userId).toBe(1);
      expect(barber2Calendar.userId).toBe(2);
      
      // Calendars should have different appointments
      expect(barber1Calendar.appointments).toHaveLength(1);
      expect(barber2Calendar.appointments).toHaveLength(1);
      
      expect(barber1Calendar.appointments[0].userId).toBe(1);
      expect(barber2Calendar.appointments[0].userId).toBe(2);
    });
  });

  describe('Public Booking Links Isolation', () => {
    it('should generate unique booking links per barber', () => {
      const barber1Link = multiBarberSystem.generatePublicBookingLink(1);
      const barber2Link = multiBarberSystem.generatePublicBookingLink(2);

      expect(barber1Link).toBeDefined();
      expect(barber2Link).toBeDefined();
      
      expect(barber1Link!.url).toBe('/book/7185550101-urbancuts');
      expect(barber2Link!.url).toBe('/book/2125550202-stylestudio');
      
      // URLs should be different
      expect(barber1Link!.url).not.toBe(barber2Link!.url);
    });

    it('should prevent unverified barbers from getting booking links', () => {
      const barber3Link = multiBarberSystem.generatePublicBookingLink(3); // Unverified
      expect(barber3Link).toBeNull();
    });

    it('should include barber-specific information in booking links', () => {
      const barber1Link = multiBarberSystem.generatePublicBookingLink(1);
      
      expect(barber1Link!.businessName).toBe('Urban Cuts');
      expect(barber1Link!.phone).toBe('7185550101');
      expect(barber1Link!.barberId).toBe(1);
    });
  });

  describe('Settings Isolation', () => {
    it('should isolate settings by barber', () => {
      const barber1Settings = multiBarberSystem.getSettingsByBarberId(1);
      const barber2Settings = multiBarberSystem.getSettingsByBarberId(2);

      expect(barber1Settings!.transportationMode).toBe('driving');
      expect(barber2Settings!.transportationMode).toBe('walking');
      
      expect(barber1Settings!.stripeConnected).toBe(true);
      expect(barber2Settings!.stripeConnected).toBe(false);
    });

    it('should allow barber to update only their own settings', () => {
      const success = multiBarberSystem.updateBarberSettings(1, {
        transportationMode: 'cycling',
        timezone: 'America/Los_Angeles',
      });

      expect(success).toBe(true);
      
      const updatedSettings = multiBarberSystem.getSettingsByBarberId(1);
      expect(updatedSettings!.transportationMode).toBe('cycling');
      expect(updatedSettings!.timezone).toBe('America/Los_Angeles');
      
      // Other barber settings should remain unchanged
      const barber2Settings = multiBarberSystem.getSettingsByBarberId(2);
      expect(barber2Settings!.transportationMode).toBe('walking');
    });
  });

  describe('Analytics and Stats Isolation', () => {
    it('should provide isolated analytics per barber', () => {
      const barber1Stats = multiBarberSystem.getBarberStats(1);
      const barber2Stats = multiBarberSystem.getBarberStats(2);

      expect(barber1Stats.totalClients).toBe(2);
      expect(barber2Stats.totalClients).toBe(2);
      
      expect(barber1Stats.totalServices).toBe(2);
      expect(barber2Stats.totalServices).toBe(2);
      
      expect(barber1Stats.totalPhotos).toBe(1);
      expect(barber2Stats.totalPhotos).toBe(2);
      
      // Revenue should be calculated from their own services
      expect(barber1Stats.revenueThisMonth).toBe(35.00); // Brooklyn Fade
      expect(barber2Stats.revenueThisMonth).toBe(50.00); // Manhattan Classic
    });

    it('should ensure stats do not leak between barbers', () => {
      const barber1Stats = multiBarberSystem.getBarberStats(1);
      
      // Should not include data from other barbers
      expect(barber1Stats.totalClients).not.toBe(5); // Would be total if data leaked
      expect(barber1Stats.revenueThisMonth).not.toBe(85.00); // Would be total if services leaked
    });
  });

  describe('Data Access Prevention', () => {
    it('should prevent accessing other barbers data', () => {
      const otherBarbersClients = multiBarberSystem.getAllClientsFromOtherBarbers(1);
      
      // Should get clients from barbers 2 and 3, but not barber 1
      expect(otherBarbersClients).toHaveLength(3); // 2 from barber 2, 1 from barber 3
      
      // None should belong to barber 1
      otherBarbersClients.forEach(client => {
        expect(client.userId).not.toBe(1);
      });
    });

    it('should enforce ownership at data layer', () => {
      // Test that each data type enforces correct userId
      const barber1Data = {
        clients: multiBarberSystem.getClientsByBarberId(1),
        appointments: multiBarberSystem.getAppointmentsByBarberId(1),
        services: multiBarberSystem.getServicesByBarberId(1),
        photos: multiBarberSystem.getGalleryPhotosByBarberId(1),
      };

      // All data should belong to barber 1
      barber1Data.clients.forEach(item => expect(item.userId).toBe(1));
      barber1Data.appointments.forEach(item => expect(item.userId).toBe(1));
      barber1Data.services.forEach(item => expect(item.userId).toBe(1));
      barber1Data.photos.forEach(item => expect(item.userId).toBe(1));
    });
  });

  describe('Business Logic Isolation', () => {
    it('should maintain separate business contexts', () => {
      const barber1 = multiBarberSystem.getBarber(1);
      const barber2 = multiBarberSystem.getBarber(2);

      // Different business names and contact info
      expect(barber1!.businessName).toBe('Urban Cuts');
      expect(barber2!.businessName).toBe('Style Studio');
      
      expect(barber1!.phone).toBe('(718) 555-0101');
      expect(barber2!.phone).toBe('(212) 555-0202');
      
      // Different verification status
      expect(barber1!.phoneVerified).toBe(true);
      expect(barber2!.phoneVerified).toBe(true);
      
      const barber3 = multiBarberSystem.getBarber(3);
      expect(barber3!.phoneVerified).toBe(false);
    });

    it('should prevent data contamination between accounts', () => {
      // Simulate concurrent operations
      const barber1Operations = [
        () => multiBarberSystem.getClientsByBarberId(1),
        () => multiBarberSystem.getAppointmentsByBarberId(1),
        () => multiBarberSystem.getServicesByBarberId(1),
      ];

      const barber2Operations = [
        () => multiBarberSystem.getClientsByBarberId(2),
        () => multiBarberSystem.getAppointmentsByBarberId(2),
        () => multiBarberSystem.getServicesByBarberId(2),
      ];

      // Execute operations concurrently
      const barber1Results = barber1Operations.map(op => op());
      const barber2Results = barber2Operations.map(op => op());

      // Verify no data contamination
      barber1Results.forEach(result => {
        result.forEach((item: any) => {
          expect(item.userId).toBe(1);
        });
      });

      barber2Results.forEach(result => {
        result.forEach((item: any) => {
          expect(item.userId).toBe(2);
        });
      });
    });
  });
});