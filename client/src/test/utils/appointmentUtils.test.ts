import { describe, it, expect } from 'vitest';
import { getServiceNamesDisplay } from '@/lib/appointmentUtils';
import type { AppointmentWithRelations } from '@shared/schema';

const mockAppointment: AppointmentWithRelations = {
  id: 1,
  userId: 1,
  clientId: 1,
  serviceId: 1,
  scheduledAt: new Date('2025-07-03T14:00:00Z'),
  status: 'confirmed',
  notes: '',
  address: '',
  price: '35.00',
  duration: 45,
  reminderSent: false,
  createdAt: new Date('2025-07-01'),
  client: {
    id: 1,
    userId: 1,
    name: 'John Doe',
    phone: '(555) 123-4567',
    email: 'john@example.com',
    address: '123 Main St',
    photoUrl: null,
    preferredStyle: 'Fade cut',
    notes: 'Regular customer',
    loyaltyStatus: 'gold',
    lastVisit: new Date('2025-07-01'),
    totalVisits: 10,
    createdAt: new Date('2024-01-01'),
  },
  service: {
    id: 1,
    userId: 1,
    name: 'Haircut',
    description: 'Classic haircut',
    price: '35.00',
    duration: 45,
    category: 'Haircuts',
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
  appointmentServices: [],
};

describe('appointmentUtils', () => {
  describe('getServiceNamesDisplay', () => {
    it('returns single service name when only one service', () => {
      const result = getServiceNamesDisplay(mockAppointment, 50);
      expect(result).toBe('Haircut');
    });

    it('returns multiple service names when appointment has multiple services', () => {
      const appointmentWithMultipleServices = {
        ...mockAppointment,
        appointmentServices: [
          {
            id: 1,
            appointmentId: 1,
            serviceId: 1,
            quantity: 1,
            price: '35.00',
            createdAt: new Date(),
            service: {
              id: 1,
              userId: 1,
              name: 'Haircut',
              description: 'Classic haircut',
              price: '35.00',
              duration: 45,
              category: 'Haircuts',
              isActive: true,
              createdAt: new Date(),
            },
          },
          {
            id: 2,
            appointmentId: 1,
            serviceId: 2,
            quantity: 1,
            price: '20.00',
            createdAt: new Date(),
            service: {
              id: 2,
              userId: 1,
              name: 'Beard Trim',
              description: 'Professional beard trimming',
              price: '20.00',
              duration: 20,
              category: 'Beard Services',
              isActive: true,
              createdAt: new Date(),
            },
          },
        ],
      };

      const result = getServiceNamesDisplay(appointmentWithMultipleServices, 50);
      expect(result).toBe('Haircut, Beard Trim');
    });

    it('truncates service names when exceeding character limit', () => {
      const appointmentWithLongServices = {
        ...mockAppointment,
        appointmentServices: [
          {
            id: 1,
            appointmentId: 1,
            serviceId: 1,
            quantity: 1,
            price: '35.00',
            createdAt: new Date(),
            service: {
              id: 1,
              userId: 1,
              name: 'Very Long Service Name That Should Be Truncated',
              description: 'Description',
              price: '35.00',
              duration: 45,
              category: 'Haircuts',
              isActive: true,
              createdAt: new Date(),
            },
          },
          {
            id: 2,
            appointmentId: 1,
            serviceId: 2,
            quantity: 1,
            price: '20.00',
            createdAt: new Date(),
            service: {
              id: 2,
              userId: 1,
              name: 'Another Very Long Service Name',
              description: 'Description',
              price: '20.00',
              duration: 20,
              category: 'Beard Services',
              isActive: true,
              createdAt: new Date(),
            },
          },
        ],
      };

      const result = getServiceNamesDisplay(appointmentWithLongServices, 30);
      expect(result).toMatch(/\.\.\.$/); // Should end with "..."
      expect(result.length).toBeLessThanOrEqual(33); // 30 + "..."
    });

    it('handles empty appointment services array', () => {
      const appointmentWithEmptyServices = {
        ...mockAppointment,
        appointmentServices: [],
      };

      const result = getServiceNamesDisplay(appointmentWithEmptyServices, 50);
      expect(result).toBe('Haircut'); // Falls back to primary service
    });
  });
});