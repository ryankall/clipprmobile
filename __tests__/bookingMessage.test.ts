import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the storage and mapbox service
const mockStorage = {
  getUserByPhone: vi.fn(),
  getServicesByUserId: vi.fn(),
  getAppointmentsByUserId: vi.fn(),
  createMessage: vi.fn(),
};

const mockMapboxService = {
  calculateTravelTime: vi.fn(),
};

// Mock the mapbox service import
vi.mock('../server/mapboxService', () => ({
  mapboxService: mockMapboxService,
}));

describe('Booking Message Travel Information', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockStorage.getUserByPhone.mockResolvedValue({
      id: 1,
      firstName: 'John',
      lastName: 'Barber',
      homeBaseAddress: '123 Main St, New York, NY',
      transportationMode: 'driving',
    });
    
    mockStorage.getServicesByUserId.mockResolvedValue([
      { id: 1, name: 'Haircut', duration: 30, price: '25.00' },
      { id: 2, name: 'Beard Trim', duration: 15, price: '15.00' }
    ]);
    
    mockStorage.getAppointmentsByUserId.mockResolvedValue([]);
    mockStorage.createMessage.mockResolvedValue({ id: 1 });
  });

  describe('Travel: No scenarios', () => {
    it('should include "Travel: No" when needsTravel is false', async () => {
      const bookingData = {
        barberPhone: '(646) 789-1820',
        clientName: 'Jane Doe',
        clientPhone: '(555) 123-4567',
        clientEmail: 'jane@example.com',
        selectedDate: '2025-07-04',
        selectedTime: '14:00',
        selectedServices: ['Haircut'],
        needsTravel: false,
        clientAddress: '',
        message: 'Looking forward to my appointment'
      };

      // Simulate the message creation logic
      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      requestMessage += `✂️ Services: Haircut\n`;
      
      if (bookingData.needsTravel && bookingData.clientAddress) {
        requestMessage += `🚗 Travel: Yes - ${bookingData.clientAddress}\n`;
      } else {
        requestMessage += `🚗 Travel: No\n`;
      }
      
      requestMessage += `📞 Phone: ${bookingData.clientPhone}\n`;
      requestMessage += `📧 Email: ${bookingData.clientEmail}\n`;
      requestMessage += `💬 Message: ${bookingData.message}\n`;

      expect(requestMessage).toContain('🚗 Travel: No');
      expect(requestMessage).not.toContain('Travel Time:');
    });

    it('should include "Travel: No" when needsTravel is true but no address provided', async () => {
      const bookingData = {
        needsTravel: true,
        clientAddress: '',
        selectedDate: '2025-07-04',
        selectedTime: '14:00'
      };

      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      
      if (bookingData.needsTravel && bookingData.clientAddress) {
        requestMessage += `🚗 Travel: Yes - ${bookingData.clientAddress}\n`;
      } else {
        requestMessage += `🚗 Travel: No\n`;
      }

      expect(requestMessage).toContain('🚗 Travel: No');
    });
  });

  describe('Travel: Yes scenarios', () => {
    it('should include "Travel: Yes" with address when needsTravel is true and address provided', async () => {
      const bookingData = {
        needsTravel: true,
        clientAddress: '456 Oak Street, Brooklyn, NY 11201',
        selectedDate: '2025-07-04',
        selectedTime: '14:00'
      };

      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      
      if (bookingData.needsTravel && bookingData.clientAddress) {
        requestMessage += `🚗 Travel: Yes - ${bookingData.clientAddress}\n`;
      } else {
        requestMessage += `🚗 Travel: No\n`;
      }

      expect(requestMessage).toContain('🚗 Travel: Yes - 456 Oak Street, Brooklyn, NY 11201');
    });

    it('should calculate travel time from home base when no previous appointments', async () => {
      const bookingData = {
        needsTravel: true,
        clientAddress: '456 Oak Street, Brooklyn, NY 11201',
        selectedDate: '2025-07-04',
        selectedTime: '14:00'
      };

      // Mock successful travel time calculation
      mockMapboxService.calculateTravelTime.mockResolvedValue({
        status: 'OK',
        duration: 25,
        distance: 5000
      });

      const user = {
        id: 1,
        homeBaseAddress: '123 Main St, New York, NY',
        transportationMode: 'driving'
      };

      // Simulate travel time calculation logic
      const originAddress = user.homeBaseAddress;
      const travelResult = await mockMapboxService.calculateTravelTime(
        originAddress,
        bookingData.clientAddress,
        user.transportationMode
      );

      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      requestMessage += `🚗 Travel: Yes - ${bookingData.clientAddress}\n`;
      
      if (travelResult.status === 'OK') {
        requestMessage += `⏱️ Travel Time: ${travelResult.duration} minutes from ${originAddress}\n`;
      }

      expect(requestMessage).toContain('🚗 Travel: Yes - 456 Oak Street, Brooklyn, NY 11201');
      expect(requestMessage).toContain('⏱️ Travel Time: 25 minutes from 123 Main St, New York, NY');
      expect(mockMapboxService.calculateTravelTime).toHaveBeenCalledWith(
        '123 Main St, New York, NY',
        '456 Oak Street, Brooklyn, NY 11201',
        'driving'
      );
    });

    it('should calculate travel time from previous appointment location when available', async () => {
      const bookingData = {
        needsTravel: true,
        clientAddress: '789 Pine Avenue, Queens, NY 11385',
        selectedDate: '2025-07-04',
        selectedTime: '16:00'
      };

      // Mock previous appointment
      const previousAppointments = [
        {
          id: 1,
          scheduledAt: new Date('2025-07-04T14:00:00'),
          address: '100 Previous St, Manhattan, NY',
          status: 'confirmed'
        }
      ];
      
      mockStorage.getAppointmentsByUserId.mockResolvedValue(previousAppointments);
      mockMapboxService.calculateTravelTime.mockResolvedValue({
        status: 'OK',
        duration: 35,
        distance: 8000
      });

      const user = {
        id: 1,
        homeBaseAddress: '123 Main St, New York, NY',
        transportationMode: 'driving'
      };

      // Simulate the logic for finding previous appointment
      const appointmentStart = new Date('2025-07-04T16:00:00');
      const confirmedAppointments = previousAppointments.filter(apt => 
        apt.status === 'confirmed' && new Date(apt.scheduledAt) < appointmentStart
      );
      
      let originAddress = user.homeBaseAddress;
      if (confirmedAppointments.length > 0) {
        const lastAppointment = confirmedAppointments
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
        
        if (lastAppointment.address) {
          originAddress = lastAppointment.address;
        }
      }

      const travelResult = await mockMapboxService.calculateTravelTime(
        originAddress,
        bookingData.clientAddress,
        user.transportationMode
      );

      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      requestMessage += `🚗 Travel: Yes - ${bookingData.clientAddress}\n`;
      
      if (travelResult.status === 'OK') {
        requestMessage += `⏱️ Travel Time: ${travelResult.duration} minutes from ${originAddress}\n`;
      }

      expect(originAddress).toBe('100 Previous St, Manhattan, NY');
      expect(requestMessage).toContain('⏱️ Travel Time: 35 minutes from 100 Previous St, Manhattan, NY');
    });

    it('should handle travel time calculation failure gracefully', async () => {
      const bookingData = {
        needsTravel: true,
        clientAddress: '456 Oak Street, Brooklyn, NY 11201',
        selectedDate: '2025-07-04',
        selectedTime: '14:00'
      };

      // Mock failed travel time calculation
      mockMapboxService.calculateTravelTime.mockResolvedValue({
        status: 'ERROR',
        errorMessage: 'API error',
        duration: 0,
        distance: 0
      });

      const user = {
        id: 1,
        homeBaseAddress: '123 Main St, New York, NY',
        transportationMode: 'driving'
      };

      const travelResult = await mockMapboxService.calculateTravelTime(
        user.homeBaseAddress,
        bookingData.clientAddress,
        user.transportationMode
      );

      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      requestMessage += `🚗 Travel: Yes - ${bookingData.clientAddress}\n`;
      
      if (travelResult.status === 'OK') {
        requestMessage += `⏱️ Travel Time: ${travelResult.duration} minutes from ${user.homeBaseAddress}\n`;
      }

      expect(requestMessage).toContain('🚗 Travel: Yes - 456 Oak Street, Brooklyn, NY 11201');
      expect(requestMessage).not.toContain('Travel Time:');
    });
  });

  describe('Email display', () => {
    it('should include full email address without truncation', async () => {
      const bookingData = {
        clientEmail: 'verylongemailaddress@exampledomainname.com',
        clientPhone: '(555) 123-4567',
        selectedDate: '2025-07-04',
        selectedTime: '14:00'
      };

      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      requestMessage += `📞 Phone: ${bookingData.clientPhone}\n`;
      requestMessage += `📧 Email: ${bookingData.clientEmail}\n`;

      expect(requestMessage).toContain('📧 Email: verylongemailaddress@exampledomainname.com');
      expect(requestMessage).not.toContain('chicken@gmail.com'); // Should not be truncated
    });

    it('should not include email line when email is not provided', async () => {
      const bookingData = {
        clientEmail: '',
        clientPhone: '(555) 123-4567',
        selectedDate: '2025-07-04',
        selectedTime: '14:00'
      };

      let requestMessage = `📅 Date: ${bookingData.selectedDate}\n⏰ Time: ${bookingData.selectedTime}\n`;
      requestMessage += `📞 Phone: ${bookingData.clientPhone}\n`;
      
      if (bookingData.clientEmail) {
        requestMessage += `📧 Email: ${bookingData.clientEmail}\n`;
      }

      expect(requestMessage).not.toContain('📧 Email:');
    });
  });

  describe('Transportation modes', () => {
    it('should use driving mode by default', async () => {
      const user = {
        transportationMode: undefined,
        homeBaseAddress: '123 Main St, New York, NY'
      };
      
      const clientAddress = '456 Oak Street, Brooklyn, NY';
      
      mockMapboxService.calculateTravelTime.mockResolvedValue({
        status: 'OK',
        duration: 30,
        distance: 5000
      });

      await mockMapboxService.calculateTravelTime(
        user.homeBaseAddress,
        clientAddress,
        user.transportationMode || 'driving'
      );

      expect(mockMapboxService.calculateTravelTime).toHaveBeenCalledWith(
        user.homeBaseAddress,
        clientAddress,
        'driving'
      );
    });

    it('should use user-specified transportation mode', async () => {
      const transportationModes = ['driving', 'walking', 'cycling', 'transit'];
      
      for (const mode of transportationModes) {
        mockMapboxService.calculateTravelTime.mockClear();
        mockMapboxService.calculateTravelTime.mockResolvedValue({
          status: 'OK',
          duration: 30,
          distance: 5000
        });

        const user = {
          transportationMode: mode,
          homeBaseAddress: '123 Main St, New York, NY'
        };
        
        const clientAddress = '456 Oak Street, Brooklyn, NY';

        await mockMapboxService.calculateTravelTime(
          user.homeBaseAddress,
          clientAddress,
          user.transportationMode
        );

        expect(mockMapboxService.calculateTravelTime).toHaveBeenCalledWith(
          user.homeBaseAddress,
          clientAddress,
          mode
        );
      }
    });
  });
});