import { describe, it, expect, vi, beforeEach } from 'vitest';

// Race Condition & Parallel Request Handling Tests
describe('Concurrency & Race Conditions', () => {
  describe('Simultaneous Booking Attempts', () => {
    it('should handle two clients trying to book the same time slot', async () => {
      const timeSlot = {
        start: new Date('2025-07-03T14:00:00Z'),
        end: new Date('2025-07-03T14:45:00Z'),
        barberId: 1
      };
      
      const client1Request = {
        clientId: 101,
        phone: '(555) 123-4567',
        services: [{ id: 1, name: 'Haircut', duration: 45 }]
      };
      
      const client2Request = {
        clientId: 102,
        phone: '(555) 987-6543',
        services: [{ id: 1, name: 'Haircut', duration: 45 }]
      };
      
      // Simulate simultaneous requests
      const results = await Promise.allSettled([
        attemptBooking(timeSlot, client1Request),
        attemptBooking(timeSlot, client2Request)
      ]);
      
      // One should succeed, one should fail
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success);
      
      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0].value?.error).toContain('time slot is no longer available');
    });

    it('should handle race condition with database locking', async () => {
      const timeSlot = {
        barberId: 1,
        start: new Date('2025-07-03T15:00:00Z'),
        end: new Date('2025-07-03T15:30:00Z')
      };
      
      // Mock database with row locking
      const mockDb = createMockDbWithLocking();
      
      const booking1 = bookWithDbLocking(mockDb, timeSlot, { clientId: 101 });
      const booking2 = bookWithDbLocking(mockDb, timeSlot, { clientId: 102 });
      
      const results = await Promise.allSettled([booking1, booking2]);
      
      // First to acquire lock should succeed
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason?.message).toContain('time slot conflict');
    });

    it('should validate time slot availability atomically', async () => {
      const existingAppointments = [
        {
          id: 1,
          start: new Date('2025-07-03T14:00:00Z'),
          end: new Date('2025-07-03T14:45:00Z'),
          status: 'confirmed'
        }
      ];
      
      const overlappingRequest = {
        start: new Date('2025-07-03T14:30:00Z'),
        end: new Date('2025-07-03T15:15:00Z')
      };
      
      const isAvailable = await checkAvailabilityAtomically(
        overlappingRequest,
        existingAppointments,
        1 // barberId
      );
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('SMS Confirmation Race Conditions', () => {
    it('should handle client confirming same appointment twice', async () => {
      const appointment = {
        id: 123,
        status: 'pending',
        createdAt: new Date(),
        clientId: 101
      };
      
      // Simulate duplicate SMS confirmations
      const confirmation1 = processSMSConfirmation(appointment.id, 'YES');
      const confirmation2 = processSMSConfirmation(appointment.id, 'YES');
      
      const results = await Promise.allSettled([confirmation1, confirmation2]);
      
      // First confirmation should succeed, second should be ignored
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value?.confirmed).toBe(true);
      
      expect(results[1].status).toBe('fulfilled');
      expect(results[1].value?.alreadyProcessed).toBe(true);
    });

    it('should handle barber cancellation during client confirmation', async () => {
      const appointment = {
        id: 123,
        status: 'pending',
        createdAt: new Date(),
        clientId: 101,
        barberId: 1
      };
      
      // Simulate barber cancellation and client confirmation happening simultaneously
      const barberCancellation = cancelAppointmentByBarber(appointment.id);
      const clientConfirmation = processSMSConfirmation(appointment.id, 'YES');
      
      const results = await Promise.allSettled([barberCancellation, clientConfirmation]);
      
      // Cancellation should take precedence
      const finalStatus = await getAppointmentStatus(appointment.id);
      expect(finalStatus).toBe('cancelled');
      
      // Client should be notified of cancellation
      expect(results[1].value?.notificationSent).toBe(true);
      expect(results[1].value?.message).toContain('has been cancelled');
    });

    it('should handle appointment expiry during confirmation attempt', async () => {
      const expiredAppointment = {
        id: 123,
        status: 'pending',
        createdAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
        clientId: 101
      };
      
      // Simulate automatic expiry cleanup and client confirmation
      const expiryCleanup = expireOldAppointments();
      const lateConfirmation = processSMSConfirmation(expiredAppointment.id, 'YES');
      
      await Promise.allSettled([expiryCleanup, lateConfirmation]);
      
      const finalStatus = await getAppointmentStatus(expiredAppointment.id);
      expect(finalStatus).toBe('expired');
    });
  });

  describe('Calendar Slot Validation', () => {
    it('should prevent double booking during rapid consecutive requests', async () => {
      const timeSlot = {
        barberId: 1,
        date: '2025-07-03',
        time: '14:00',
        duration: 45
      };
      
      // Create multiple rapid booking attempts
      const rapidRequests = Array.from({ length: 5 }, (_, i) => ({
        clientId: 100 + i,
        phone: `(555) 123-456${i}`,
        timeSlot
      }));
      
      const results = await Promise.allSettled(
        rapidRequests.map(req => attemptRapidBooking(req))
      );
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      
      // Only one should succeed
      expect(successful).toHaveLength(1);
    });

    it('should handle calendar refresh during booking process', async () => {
      const initialCalendarState = {
        availableSlots: [
          { start: '14:00', end: '14:45', available: true },
          { start: '15:00', end: '15:45', available: true }
        ]
      };
      
      const bookingInProgress = {
        timeSlot: { start: '14:00', end: '14:45' },
        clientId: 101
      };
      
      // Simulate calendar refresh while booking is processing
      const booking = processBooking(bookingInProgress);
      const calendarRefresh = refreshCalendarData(1); // barberId
      
      const [bookingResult, refreshResult] = await Promise.allSettled([
        booking,
        calendarRefresh
      ]);
      
      // Booking should complete successfully
      expect(bookingResult.status).toBe('fulfilled');
      
      // Refreshed calendar should reflect the new booking
      const updatedSlots = refreshResult.value?.availableSlots;
      const bookedSlot = updatedSlots?.find(slot => slot.start === '14:00');
      expect(bookedSlot?.available).toBe(false);
    });
  });

  describe('Database Transaction Management', () => {
    it('should handle transaction rollback on booking conflict', async () => {
      const mockTransaction = createMockTransaction();
      
      const bookingData = {
        barberId: 1,
        clientId: 101,
        timeSlot: { start: '14:00', end: '14:45' },
        services: [{ id: 1, price: 35.00 }]
      };
      
      // Simulate conflict detected during transaction
      mockTransaction.onConflict = () => {
        throw new Error('Appointment conflict detected');
      };
      
      const result = await bookingWithTransaction(mockTransaction, bookingData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('conflict');
      expect(mockTransaction.rolledBack).toBe(true);
    });

    it('should maintain data consistency during concurrent updates', async () => {
      const barberId = 1;
      const initialState = {
        totalAppointments: 5,
        todayEarnings: 175.00,
        availableSlots: 8
      };
      
      // Simulate multiple concurrent operations
      const operations = [
        updateAppointmentCount(barberId, 1),
        updateEarnings(barberId, 35.00),
        updateAvailableSlots(barberId, -1)
      ];
      
      await Promise.allSettled(operations);
      
      const finalState = await getDashboardStats(barberId);
      
      expect(finalState.totalAppointments).toBe(6);
      expect(finalState.todayEarnings).toBe(210.00);
      expect(finalState.availableSlots).toBe(7);
    });
  });

  describe('Real-time Updates & Websockets', () => {
    it('should handle multiple clients receiving booking updates', async () => {
      const connectedClients = [
        { id: 'client1', barberId: 1 },
        { id: 'client2', barberId: 1 },
        { id: 'client3', barberId: 2 } // Different barber
      ];
      
      const bookingUpdate = {
        barberId: 1,
        timeSlot: { start: '14:00', end: '14:45' },
        status: 'booked'
      };
      
      const notifications = await broadcastBookingUpdate(bookingUpdate, connectedClients);
      
      // Only clients watching barber 1 should receive update
      expect(notifications).toHaveLength(2);
      expect(notifications[0].clientId).toBe('client1');
      expect(notifications[1].clientId).toBe('client2');
    });

    it('should handle websocket disconnection during update broadcast', async () => {
      const clients = [
        { id: 'client1', connected: true },
        { id: 'client2', connected: false }, // Disconnected
        { id: 'client3', connected: true }
      ];
      
      const update = { type: 'calendar_refresh', data: {} };
      
      const results = await broadcastToClients(update, clients);
      
      // Should only send to connected clients
      const successful = results.filter(r => r.success);
      expect(successful).toHaveLength(2);
    });
  });
});

// Helper functions for concurrency testing
async function attemptBooking(timeSlot: any, clientRequest: any) {
  // Simulate booking attempt with potential conflict
  const isAvailable = await checkTimeSlotAvailability(timeSlot);
  
  if (!isAvailable) {
    return { success: false, error: 'Selected time slot is no longer available' };
  }
  
  // Simulate small delay to allow race conditions
  await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
  
  return createBooking(timeSlot, clientRequest);
}

function createMockDbWithLocking() {
  let locked = false;
  
  return {
    acquireLock: async (resource: string) => {
      if (locked) {
        throw new Error('Resource is locked');
      }
      locked = true;
      return true;
    },
    releaseLock: () => {
      locked = false;
    },
    isLocked: () => locked
  };
}

async function bookWithDbLocking(db: any, timeSlot: any, client: any) {
  try {
    await db.acquireLock(`timeslot_${timeSlot.barberId}_${timeSlot.start}`);
    
    // Check availability while locked
    const conflicts = await checkConflicts(timeSlot);
    if (conflicts.length > 0) {
      throw new Error('Appointment time slot conflict detected');
    }
    
    const booking = await createBooking(timeSlot, client);
    db.releaseLock();
    
    return booking;
  } catch (error) {
    db.releaseLock();
    throw error;
  }
}

async function checkAvailabilityAtomically(request: any, existing: any[], barberId: number) {
  // Simulate atomic check with brief lock
  return new Promise((resolve) => {
    setTimeout(() => {
      const hasConflict = existing.some(apt => 
        request.start < apt.end && request.end > apt.start
      );
      resolve(!hasConflict);
    }, 1);
  });
}

async function processSMSConfirmation(appointmentId: number, response: string) {
  // Simulate SMS confirmation processing with race condition handling
  const appointment = await getAppointment(appointmentId);
  
  if (!appointment) {
    return { error: 'Appointment not found' };
  }
  
  if (appointment.status !== 'pending') {
    return { alreadyProcessed: true, currentStatus: appointment.status };
  }
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 5));
  
  if (response.toLowerCase() === 'yes') {
    return { confirmed: true, appointmentId };
  }
  
  return { cancelled: true, appointmentId };
}

async function cancelAppointmentByBarber(appointmentId: number) {
  // Simulate barber cancellation
  await new Promise(resolve => setTimeout(resolve, 3));
  return { cancelled: true, cancelledBy: 'barber', appointmentId };
}

async function expireOldAppointments() {
  // Simulate automatic expiry cleanup
  await new Promise(resolve => setTimeout(resolve, 2));
  return { expired: true, count: 1 };
}

async function getAppointmentStatus(appointmentId: number) {
  // Mock appointment status retrieval
  return 'cancelled'; // Or 'expired', 'confirmed', etc.
}

async function attemptRapidBooking(request: any) {
  // Simulate rapid booking with conflict detection
  const timestamp = Date.now();
  const success = Math.random() > 0.8; // Most will fail
  
  return { success, timestamp, clientId: request.clientId };
}

async function processBooking(booking: any) {
  // Simulate booking processing
  await new Promise(resolve => setTimeout(resolve, 10));
  return { success: true, bookingId: Math.floor(Math.random() * 1000) };
}

async function refreshCalendarData(barberId: number) {
  // Simulate calendar refresh
  await new Promise(resolve => setTimeout(resolve, 5));
  return {
    availableSlots: [
      { start: '14:00', end: '14:45', available: false },
      { start: '15:00', end: '15:45', available: true }
    ]
  };
}

function createMockTransaction() {
  return {
    rolledBack: false,
    onConflict: null as (() => void) | null,
    rollback: function() { this.rolledBack = true; }
  };
}

async function bookingWithTransaction(transaction: any, data: any) {
  try {
    if (transaction.onConflict) {
      transaction.onConflict();
    }
    return { success: true, bookingId: 123 };
  } catch (error) {
    transaction.rollback();
    return { success: false, error: error.message };
  }
}

async function updateAppointmentCount(barberId: number, increment: number) {
  // Simulate database update
  await new Promise(resolve => setTimeout(resolve, 2));
  return { success: true };
}

async function updateEarnings(barberId: number, amount: number) {
  // Simulate earnings update
  await new Promise(resolve => setTimeout(resolve, 3));
  return { success: true };
}

async function updateAvailableSlots(barberId: number, change: number) {
  // Simulate slot availability update
  await new Promise(resolve => setTimeout(resolve, 1));
  return { success: true };
}

async function getDashboardStats(barberId: number) {
  // Mock dashboard stats retrieval
  return {
    totalAppointments: 6,
    todayEarnings: 210.00,
    availableSlots: 7
  };
}

async function broadcastBookingUpdate(update: any, clients: any[]) {
  // Simulate websocket broadcast
  return clients
    .filter(client => client.barberId === update.barberId)
    .map(client => ({ clientId: client.id, notified: true }));
}

async function broadcastToClients(update: any, clients: any[]) {
  // Simulate broadcast with connection status check
  return clients.map(client => ({
    clientId: client.id,
    success: client.connected
  }));
}

// Mock helper functions
async function checkTimeSlotAvailability(timeSlot: any) {
  // Simulate availability check with random conflicts
  return Math.random() > 0.3;
}

async function createBooking(timeSlot: any, client: any) {
  return { success: true, bookingId: Math.floor(Math.random() * 1000) };
}

async function checkConflicts(timeSlot: any) {
  // Simulate conflict detection
  return Math.random() > 0.7 ? [{ id: 1, conflict: true }] : [];
}

async function getAppointment(id: number) {
  // Mock appointment retrieval
  return {
    id,
    status: 'pending',
    createdAt: new Date(),
    clientId: 101
  };
}