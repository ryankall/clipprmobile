import { describe, it, expect, beforeEach } from 'vitest';

// Types for mobile travel functionality
interface MobileClient {
  id: number;
  name: string;
  phone: string;
  address?: string;
  preferredLocation?: string;
}

interface MobileAppointment {
  id: number;
  clientId: number;
  scheduledAt: string;
  services: string[];
  travelRequired: boolean;
  address?: string;
  travelTime?: number;
  mobileOptimized: boolean;
}

interface MobileTravelSettings {
  defaultTravelTime: number;
  maxTravelDistance: number;
  travelFee: number;
  mobileServiceArea: string[];
}

interface MobileTravelCalculation {
  distance: number;
  duration: number;
  fee: number;
  isWithinServiceArea: boolean;
  mobileAccessible: boolean;
}

// Mock mobile travel service
class MockMobileTravelService {
  private clients: MobileClient[] = [];
  private appointments: MobileAppointment[] = [];
  private travelSettings: MobileTravelSettings;
  private nextId = 1;

  constructor() {
    this.travelSettings = {
      defaultTravelTime: 15,
      maxTravelDistance: 25,
      travelFee: 10,
      mobileServiceArea: ['Downtown', 'Midtown', 'Uptown', 'Mobile District']
    };
    this.setupMockData();
  }

  private setupMockData(): void {
    this.clients = [
      {
        id: 1,
        name: 'Mobile Client A',
        phone: '(555) 111-1111',
        address: '123 Mobile St, Downtown',
        preferredLocation: 'Home'
      },
      {
        id: 2,
        name: 'Mobile Client B',
        phone: '(555) 222-2222',
        address: '456 App Ave, Midtown'
      },
      {
        id: 3,
        name: 'Mobile Client C',
        phone: '(555) 333-3333'
      }
    ];
    this.nextId = 4;
  }

  async createMobileAppointment(appointmentData: {
    clientId: number;
    scheduledAt: string;
    services: string[];
    travelRequired: boolean;
    address?: string;
  }): Promise<MobileAppointment> {
    const client = this.clients.find(c => c.id === appointmentData.clientId);
    let finalAddress = appointmentData.address;
    let travelTime = 0;

    // Auto-fill address from client data if travel is required but no address provided
    if (appointmentData.travelRequired && !appointmentData.address && client?.address) {
      finalAddress = client.address;
    }

    // Calculate travel time if travel is required
    if (appointmentData.travelRequired && finalAddress) {
      const travelCalc = await this.calculateMobileTravel(finalAddress);
      travelTime = travelCalc.duration;
    }

    const appointment: MobileAppointment = {
      id: this.nextId++,
      clientId: appointmentData.clientId,
      scheduledAt: appointmentData.scheduledAt,
      services: appointmentData.services,
      travelRequired: appointmentData.travelRequired,
      address: finalAddress,
      travelTime,
      mobileOptimized: true
    };

    this.appointments.push(appointment);
    return appointment;
  }

  async calculateMobileTravel(address: string): Promise<MobileTravelCalculation> {
    // Simulate mobile-optimized travel calculation
    const isInServiceArea = this.travelSettings.mobileServiceArea.some(area => 
      address.toLowerCase().includes(area.toLowerCase())
    );

    // Mock calculation based on service area
    let distance = isInServiceArea ? Math.random() * 15 + 5 : Math.random() * 10 + 20;
    let duration = Math.ceil(distance * 2); // Simplified: 2 minutes per unit distance
    let fee = distance > 10 ? this.travelSettings.travelFee + ((distance - 10) * 2) : this.travelSettings.travelFee;

    // Mobile accessibility check
    const mobileAccessible = distance <= this.travelSettings.maxTravelDistance && isInServiceArea;

    return {
      distance: Math.round(distance * 10) / 10,
      duration,
      fee: Math.round(fee * 100) / 100,
      isWithinServiceArea: isInServiceArea,
      mobileAccessible
    };
  }

  async toggleTravelForAppointment(appointmentId: number, travelEnabled: boolean, address?: string): Promise<MobileAppointment | null> {
    const appointment = this.appointments.find(a => a.id === appointmentId);
    if (!appointment) return null;

    appointment.travelRequired = travelEnabled;
    
    if (travelEnabled) {
      if (address) {
        appointment.address = address;
      } else {
        // Auto-fill from client data
        const client = this.clients.find(c => c.id === appointment.clientId);
        if (client?.address) {
          appointment.address = client.address;
        }
      }
      
      if (appointment.address) {
        const travelCalc = await this.calculateMobileTravel(appointment.address);
        appointment.travelTime = travelCalc.duration;
      }
    } else {
      appointment.address = undefined;
      appointment.travelTime = undefined;
    }

    return appointment;
  }

  getClientAutoFillData(clientId: number): { address?: string; preferredLocation?: string } {
    const client = this.clients.find(c => c.id === clientId);
    return {
      address: client?.address,
      preferredLocation: client?.preferredLocation
    };
  }

  getMobileAppointments(): MobileAppointment[] {
    return this.appointments.filter(apt => apt.mobileOptimized);
  }

  updateMobileTravelSettings(settings: Partial<MobileTravelSettings>): void {
    this.travelSettings = { ...this.travelSettings, ...settings };
  }

  // Test helper methods
  clearAppointments(): void {
    this.appointments = [];
    this.nextId = 1;
  }

  addTestClient(client: Omit<MobileClient, 'id'>): MobileClient {
    const newClient: MobileClient = {
      id: this.nextId++,
      ...client
    };
    this.clients.push(newClient);
    return newClient;
  }
}

describe('Mobile Travel Toggle System', () => {
  let mobileTravelService: MockMobileTravelService;

  beforeEach(() => {
    mobileTravelService = new MockMobileTravelService();
    mobileTravelService.clearAppointments();
  });

  describe('Mobile Travel Toggle Functionality', () => {
    it('should create mobile appointment with travel enabled', async () => {
      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 1,
        scheduledAt: '2025-07-16T14:00:00',
        services: ['Mobile Cut', 'Mobile Beard Trim'],
        travelRequired: true,
        address: '123 Mobile St, Downtown'
      });

      expect(appointment.travelRequired).toBe(true);
      expect(appointment.address).toBe('123 Mobile St, Downtown');
      expect(appointment.travelTime).toBeGreaterThan(0);
      expect(appointment.mobileOptimized).toBe(true);
    });

    it('should create mobile appointment without travel', async () => {
      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 1,
        scheduledAt: '2025-07-16T15:00:00',
        services: ['In-Shop Cut'],
        travelRequired: false
      });

      expect(appointment.travelRequired).toBe(false);
      expect(appointment.address).toBeUndefined();
      expect(appointment.travelTime).toBe(0);
      expect(appointment.mobileOptimized).toBe(true);
    });

    it('should auto-fill address from client data when travel enabled', async () => {
      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 1, // This client has address: '123 Mobile St, Downtown'
        scheduledAt: '2025-07-16T16:00:00',
        services: ['Mobile Service'],
        travelRequired: true
        // No address provided - should auto-fill
      });

      expect(appointment.travelRequired).toBe(true);
      expect(appointment.address).toBe('123 Mobile St, Downtown');
      expect(appointment.travelTime).toBeGreaterThan(0);
    });

    it('should toggle travel on existing mobile appointment', async () => {
      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 2,
        scheduledAt: '2025-07-16T17:00:00',
        services: ['Styling'],
        travelRequired: false
      });

      const updatedAppointment = await mobileTravelService.toggleTravelForAppointment(
        appointment.id,
        true,
        '456 App Ave, Midtown'
      );

      expect(updatedAppointment?.travelRequired).toBe(true);
      expect(updatedAppointment?.address).toBe('456 App Ave, Midtown');
      expect(updatedAppointment?.travelTime).toBeGreaterThan(0);
    });

    it('should toggle travel off and clear travel data', async () => {
      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 1,
        scheduledAt: '2025-07-16T18:00:00',
        services: ['Mobile Cut'],
        travelRequired: true,
        address: '123 Mobile St, Downtown'
      });

      const updatedAppointment = await mobileTravelService.toggleTravelForAppointment(
        appointment.id,
        false
      );

      expect(updatedAppointment?.travelRequired).toBe(false);
      expect(updatedAppointment?.address).toBeUndefined();
      expect(updatedAppointment?.travelTime).toBeUndefined();
    });
  });

  describe('Mobile Address Auto-Fill', () => {
    it('should provide client auto-fill data for mobile form', () => {
      const autoFillData = mobileTravelService.getClientAutoFillData(1);
      
      expect(autoFillData.address).toBe('123 Mobile St, Downtown');
      expect(autoFillData.preferredLocation).toBe('Home');
    });

    it('should handle client without address data', () => {
      const autoFillData = mobileTravelService.getClientAutoFillData(3);
      
      expect(autoFillData.address).toBeUndefined();
      expect(autoFillData.preferredLocation).toBeUndefined();
    });

    it('should auto-fill address when toggling travel on without explicit address', async () => {
      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 2,
        scheduledAt: '2025-07-16T19:00:00',
        services: ['Mobile Style'],
        travelRequired: false
      });

      // Toggle travel on without providing address - should auto-fill from client
      const updatedAppointment = await mobileTravelService.toggleTravelForAppointment(
        appointment.id,
        true
      );

      expect(updatedAppointment?.address).toBe('456 App Ave, Midtown');
      expect(updatedAppointment?.travelTime).toBeGreaterThan(0);
    });
  });

  describe('Mobile Travel Calculation', () => {
    it('should calculate travel for mobile service within service area', async () => {
      const travelCalc = await mobileTravelService.calculateMobileTravel('123 Downtown Plaza');

      expect(travelCalc.isWithinServiceArea).toBe(true);
      expect(travelCalc.mobileAccessible).toBe(true);
      expect(travelCalc.distance).toBeGreaterThan(0);
      expect(travelCalc.duration).toBeGreaterThan(0);
      expect(travelCalc.fee).toBeGreaterThanOrEqual(10); // Base fee
    });

    it('should handle travel calculation outside mobile service area', async () => {
      const travelCalc = await mobileTravelService.calculateMobileTravel('999 Far Away Blvd, Distant City');

      expect(travelCalc.isWithinServiceArea).toBe(false);
      expect(travelCalc.distance).toBeGreaterThan(15); // Should be longer distance
      expect(travelCalc.fee).toBeGreaterThan(10); // Should include distance surcharge
    });

    it('should calculate mobile accessibility based on distance and service area', async () => {
      // Update settings to test boundary conditions
      mobileTravelService.updateMobileTravelSettings({
        maxTravelDistance: 10
      });

      const nearbyTravel = await mobileTravelService.calculateMobileTravel('123 Downtown Plaza');
      const farTravel = await mobileTravelService.calculateMobileTravel('999 Far Away Blvd');

      expect(nearbyTravel.mobileAccessible).toBe(true);
      expect(farTravel.mobileAccessible).toBe(false);
    });
  });

  describe('Mobile Service Area Management', () => {
    it('should recognize addresses within mobile service areas', async () => {
      const downtownCalc = await mobileTravelService.calculateMobileTravel('123 Downtown Street');
      const midtownCalc = await mobileTravelService.calculateMobileTravel('456 Midtown Avenue');
      const uptownCalc = await mobileTravelService.calculateMobileTravel('789 Uptown Road');

      expect(downtownCalc.isWithinServiceArea).toBe(true);
      expect(midtownCalc.isWithinServiceArea).toBe(true);
      expect(uptownCalc.isWithinServiceArea).toBe(true);
    });

    it('should update mobile service areas', async () => {
      mobileTravelService.updateMobileTravelSettings({
        mobileServiceArea: ['New Mobile Zone', 'Updated Area']
      });

      const newAreaCalc = await mobileTravelService.calculateMobileTravel('123 New Mobile Zone');
      const oldAreaCalc = await mobileTravelService.calculateMobileTravel('123 Downtown Street');

      expect(newAreaCalc.isWithinServiceArea).toBe(true);
      expect(oldAreaCalc.isWithinServiceArea).toBe(false);
    });
  });

  describe('Mobile Travel Settings', () => {
    it('should use configurable mobile travel settings', async () => {
      mobileTravelService.updateMobileTravelSettings({
        defaultTravelTime: 25,
        travelFee: 15,
        maxTravelDistance: 30
      });

      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 1,
        scheduledAt: '2025-07-16T20:00:00',
        services: ['Premium Mobile Service'],
        travelRequired: true,
        address: '123 Mobile St, Downtown'
      });

      expect(appointment.travelTime).toBeGreaterThan(0);
      
      const travelCalc = await mobileTravelService.calculateMobileTravel('123 Mobile St, Downtown');
      expect(travelCalc.fee).toBeGreaterThanOrEqual(15); // Updated base fee
    });
  });

  describe('Mobile Integration Scenarios', () => {
    it('should handle complex mobile appointment with multiple services and travel', async () => {
      const client = mobileTravelService.addTestClient({
        name: 'Mobile VIP Client',
        phone: '(555) 999-8888',
        address: '789 Mobile District, Premium Area',
        preferredLocation: 'Executive Office'
      });

      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: client.id,
        scheduledAt: '2025-07-16T21:00:00',
        services: ['Executive Cut', 'Beard Styling', 'Hot Towel Treatment'],
        travelRequired: true
      });

      expect(appointment.travelRequired).toBe(true);
      expect(appointment.address).toBe('789 Mobile District, Premium Area');
      expect(appointment.services.length).toBe(3);
      expect(appointment.mobileOptimized).toBe(true);
    });

    it('should filter mobile-optimized appointments', () => {
      // All appointments created through this service should be mobile-optimized
      const appointments = mobileTravelService.getMobileAppointments();
      expect(appointments.every(apt => apt.mobileOptimized)).toBe(true);
    });

    it('should handle mobile appointment with no client address', async () => {
      const appointment = await mobileTravelService.createMobileAppointment({
        clientId: 3, // Client with no address
        scheduledAt: '2025-07-16T22:00:00',
        services: ['Basic Cut'],
        travelRequired: true,
        address: 'Manually entered mobile address'
      });

      expect(appointment.travelRequired).toBe(true);
      expect(appointment.address).toBe('Manually entered mobile address');
      expect(appointment.travelTime).toBeGreaterThan(0);
    });
  });
});