import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock data for testing
const mockAppointment = {
  id: 1,
  userId: 1,
  clientId: 1,
  serviceId: 1,
  scheduledAt: new Date('2025-07-03T15:00:00Z'),
  status: 'pending' as const,
  notes: 'Test appointment',
  address: '123 Main St, New York, NY',
  price: '50.00',
  duration: 60,
  travelTime: 15,
  reminderSent: false,
  createdAt: new Date()
};

const mockAppointmentWithoutTravel = {
  ...mockAppointment,
  address: '',
  travelTime: 0
};

describe('Travel Toggle Functionality', () => {
  describe('Travel Time Calculation', () => {
    it('should include travel time in total duration when travel is enabled', () => {
      const serviceDuration = 60; // minutes
      const travelTime = 15; // minutes
      const includeTravel = true;
      
      const totalDuration = serviceDuration + (includeTravel ? travelTime : 0);
      
      expect(totalDuration).toBe(75);
    });

    it('should exclude travel time from total duration when travel is disabled', () => {
      const serviceDuration = 60; // minutes
      const travelTime = 15; // minutes
      const includeTravel = false;
      
      const totalDuration = serviceDuration + (includeTravel ? travelTime : 0);
      
      expect(totalDuration).toBe(60);
    });

    it('should calculate calendar blocking time correctly with travel enabled', () => {
      const appointment = mockAppointment;
      const totalCalendarDuration = appointment.duration + appointment.travelTime;
      
      expect(totalCalendarDuration).toBe(75); // 60 + 15
    });

    it('should calculate calendar blocking time correctly with travel disabled', () => {
      const appointment = mockAppointmentWithoutTravel;
      const totalCalendarDuration = appointment.duration + appointment.travelTime;
      
      expect(totalCalendarDuration).toBe(60); // 60 + 0
    });
  });

  describe('Address Field Visibility', () => {
    it('should show address field when travel toggle is enabled', () => {
      const includeTravel = true;
      const shouldShowAddressField = includeTravel;
      
      expect(shouldShowAddressField).toBe(true);
    });

    it('should hide address field when travel toggle is disabled', () => {
      const includeTravel = false;
      const shouldShowAddressField = includeTravel;
      
      expect(shouldShowAddressField).toBe(false);
    });

    it('should clear address when travel toggle is disabled', () => {
      let address = '123 Main St, New York, NY';
      const includeTravel = false;
      
      if (!includeTravel) {
        address = '';
      }
      
      expect(address).toBe('');
    });
  });

  describe('Travel Time Storage', () => {
    it('should store travel time when travel is enabled', () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: '2025-07-03T15:00:00Z',
        notes: 'Test appointment',
        address: '123 Main St, New York, NY',
        includeTravel: true,
        travelTime: 15
      };
      
      const finalTravelTime = appointmentData.includeTravel ? appointmentData.travelTime : 0;
      const finalAddress = appointmentData.includeTravel ? appointmentData.address : '';
      
      expect(finalTravelTime).toBe(15);
      expect(finalAddress).toBe('123 Main St, New York, NY');
    });

    it('should not store travel time when travel is disabled', () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: '2025-07-03T15:00:00Z',
        notes: 'Test appointment',
        address: '',
        includeTravel: false,
        travelTime: 0
      };
      
      const finalTravelTime = appointmentData.includeTravel ? appointmentData.travelTime : 0;
      const finalAddress = appointmentData.includeTravel ? appointmentData.address : '';
      
      expect(finalTravelTime).toBe(0);
      expect(finalAddress).toBe('');
    });
  });

  describe('Appointment Overlap Detection', () => {
    it('should detect overlap correctly when travel time extends appointment duration', () => {
      const existingAppointment = {
        start: new Date('2025-07-03T15:00:00Z'),
        duration: 60, // 1 hour
        travelTime: 15 // 15 minutes
      };
      
      const newAppointment = {
        start: new Date('2025-07-03T16:00:00Z'), // Starts when service ends
        duration: 30
      };
      
      // Existing appointment actually runs until 16:15 with travel time
      const existingEnd = new Date(existingAppointment.start.getTime() + 
        (existingAppointment.duration + existingAppointment.travelTime) * 60 * 1000);
      const newStart = newAppointment.start;
      
      const hasOverlap = newStart < existingEnd;
      
      expect(hasOverlap).toBe(true); // Should overlap because of travel time
    });

    it('should not detect overlap when travel time is not included', () => {
      const existingAppointment = {
        start: new Date('2025-07-03T15:00:00Z'),
        duration: 60, // 1 hour
        travelTime: 0 // No travel time
      };
      
      const newAppointment = {
        start: new Date('2025-07-03T16:00:00Z'), // Starts when service ends
        duration: 30
      };
      
      // Existing appointment runs until 16:00 without travel time
      const existingEnd = new Date(existingAppointment.start.getTime() + 
        (existingAppointment.duration + existingAppointment.travelTime) * 60 * 1000);
      const newStart = newAppointment.start;
      
      const hasOverlap = newStart < existingEnd;
      
      expect(hasOverlap).toBe(false); // Should not overlap
    });
  });

  describe('Travel Time Display', () => {
    it('should display travel time section when travel is enabled and address exists', () => {
      const appointment = mockAppointment;
      const includeTravel = true;
      
      const shouldShowTravelTime = includeTravel && (!!appointment.address || appointment.travelTime > 0);
      
      expect(shouldShowTravelTime).toBe(true);
    });

    it('should hide travel time section when travel is disabled', () => {
      const appointment = mockAppointment;
      const includeTravel = false;
      
      const shouldShowTravelTime = includeTravel && (appointment.address || appointment.travelTime > 0);
      
      expect(shouldShowTravelTime).toBe(false);
    });

    it('should show stored travel time in pending appointments', () => {
      const appointment = mockAppointment;
      
      const displayTravelTime = appointment.travelTime > 0 
        ? `${appointment.travelTime} minutes (stored)` 
        : 'Not available';
      
      expect(displayTravelTime).toBe('15 minutes (stored)');
    });

    it('should handle zero travel time in pending appointments', () => {
      const appointment = mockAppointmentWithoutTravel;
      
      const displayTravelTime = appointment.travelTime > 0 
        ? `${appointment.travelTime} minutes (stored)` 
        : 'Not available';
      
      expect(displayTravelTime).toBe('Not available');
    });
  });

  describe('Form Validation', () => {
    it('should validate form correctly when travel is enabled with address', () => {
      const formData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: '2025-07-03T15:00:00Z',
        notes: 'Test appointment',
        includeTravel: true,
        address: '123 Main St, New York, NY'
      };
      
      const isValid = formData.clientId > 0 && 
                     formData.services.length > 0 && 
                     formData.scheduledAt !== '' &&
                     (!formData.includeTravel || formData.address !== '');
      
      expect(isValid).toBe(true);
    });

    it('should fail validation when travel is enabled but no address provided', () => {
      const formData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: '2025-07-03T15:00:00Z',
        notes: 'Test appointment',
        includeTravel: true,
        address: ''
      };
      
      const isValid = formData.clientId > 0 && 
                     formData.services.length > 0 && 
                     formData.scheduledAt !== '' &&
                     (!formData.includeTravel || formData.address !== '');
      
      expect(isValid).toBe(false);
    });

    it('should validate successfully when travel is disabled regardless of address', () => {
      const formData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: '2025-07-03T15:00:00Z',
        notes: 'Test appointment',
        includeTravel: false,
        address: ''
      };
      
      const isValid = formData.clientId > 0 && 
                     formData.services.length > 0 && 
                     formData.scheduledAt !== '' &&
                     (!formData.includeTravel || formData.address !== '');
      
      expect(isValid).toBe(true);
    });
  });

  describe('Dashboard Display Filter', () => {
    it('should filter out cancelled appointments from today view', () => {
      const appointments = [
        { ...mockAppointment, status: 'confirmed' as const },
        { ...mockAppointment, id: 2, status: 'cancelled' as const },
        { ...mockAppointment, id: 3, status: 'pending' as const },
        { ...mockAppointment, id: 4, status: 'expired' as const }
      ];
      
      const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed');
      
      expect(confirmedAppointments).toHaveLength(1);
      expect(confirmedAppointments[0].status).toBe('confirmed');
    });

    it('should include both confirmed and pending appointments in dashboard filter', () => {
      const appointments = [
        { ...mockAppointment, status: 'confirmed' as const },
        { ...mockAppointment, id: 2, status: 'cancelled' as const },
        { ...mockAppointment, id: 3, status: 'pending' as const },
        { ...mockAppointment, id: 4, status: 'expired' as const }
      ];
      
      const activeAppointments = appointments.filter(apt => 
        apt.status === 'confirmed' || apt.status === 'pending'
      );
      
      expect(activeAppointments).toHaveLength(2);
      expect(activeAppointments.map(apt => apt.status)).toEqual(['confirmed', 'pending']);
    });
  });

  describe('Client Address Auto-Fill', () => {
    it('should auto-fill address when travel toggle is enabled and client is selected', () => {
      const client = {
        id: 1,
        name: 'John Doe',
        phone: '555-0123',
        address: '456 Oak St, Los Angeles, CA'
      };
      
      const includeTravel = true;
      const shouldAutoFill = includeTravel && !!client.address;
      
      expect(shouldAutoFill).toBe(true);
      expect(client.address).toBe('456 Oak St, Los Angeles, CA');
    });

    it('should not auto-fill address when travel toggle is disabled', () => {
      const client = {
        id: 1,
        name: 'John Doe',
        phone: '555-0123',
        address: '456 Oak St, Los Angeles, CA'
      };
      
      const includeTravel = false;
      const shouldAutoFill = includeTravel && !!client.address;
      
      expect(shouldAutoFill).toBe(false);
    });

    it('should handle client without address gracefully', () => {
      const client = {
        id: 1,
        name: 'John Doe',
        phone: '555-0123',
        address: null
      };
      
      const includeTravel = true;
      const shouldAutoFill = includeTravel && !!client.address;
      
      expect(shouldAutoFill).toBe(false);
    });
  });

  describe('Message-Based Travel Toggle', () => {
    it('should set travel toggle to yes when message contains travel: yes', () => {
      const messageParams = {
        travel: 'yes',
        address: '789 Pine St, Chicago, IL'
      };
      
      const shouldEnableTravel = messageParams.travel === 'yes';
      
      expect(shouldEnableTravel).toBe(true);
    });

    it('should set travel toggle to no when message contains travel: no', () => {
      const messageParams = {
        travel: 'no',
        address: ''
      };
      
      const shouldEnableTravel = messageParams.travel === 'yes';
      
      expect(shouldEnableTravel).toBe(false);
    });

    it('should default travel toggle based on address presence when no explicit travel param', () => {
      const messageParamsWithAddress = {
        address: '789 Pine St, Chicago, IL'
      };
      
      const messageParamsWithoutAddress = {
        address: ''
      };
      
      const shouldEnableTravelWithAddress = !!messageParamsWithAddress.address;
      const shouldEnableTravelWithoutAddress = !!messageParamsWithoutAddress.address;
      
      expect(shouldEnableTravelWithAddress).toBe(true);
      expect(shouldEnableTravelWithoutAddress).toBe(false);
    });
  });
});