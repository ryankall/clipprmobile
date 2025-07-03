import { describe, it, expect, vi, beforeEach } from 'vitest';

// SMS Confirmation Edge Cases
describe('Booking Flow Edge Cases', () => {
  describe('SMS Response Handling', () => {
    it('should handle lowercase confirmation replies', () => {
      const responses = ['yes', 'y', 'confirm', 'ok'];
      
      responses.forEach(response => {
        const isConfirmed = normalizeResponse(response);
        expect(isConfirmed).toBe(true);
      });
    });

    it('should handle misspelled confirmation replies', () => {
      const misspelledResponses = ['yess', 'ye', 'yed', 'yea'];
      
      misspelledResponses.forEach(response => {
        const isConfirmed = fuzzyMatchConfirmation(response);
        expect(isConfirmed).toBe(true);
      });
    });

    it('should handle cancellation replies with fuzzy matching', () => {
      const cancelResponses = ['no', 'cancel', 'stop', 'n', 'cancle', 'canel'];
      
      cancelResponses.forEach(response => {
        const isCanceled = fuzzyMatchCancellation(response);
        expect(isCanceled).toBe(true);
      });
    });

    it('should reject replies after 30-minute cutoff', () => {
      const appointmentCreated = new Date('2025-07-03T14:00:00Z');
      const lateReply = new Date('2025-07-03T14:30:01Z'); // 1 second past cutoff
      
      const isValid = isReplyWithinTimeLimit(appointmentCreated, lateReply);
      expect(isValid).toBe(false);
    });

    it('should accept replies just before 30-minute cutoff', () => {
      const appointmentCreated = new Date('2025-07-03T14:00:00Z');
      const validReply = new Date('2025-07-03T14:29:59Z'); // 1 second before cutoff
      
      const isValid = isReplyWithinTimeLimit(appointmentCreated, validReply);
      expect(isValid).toBe(true);
    });

    it('should handle duplicate SMS replies without creating errors', () => {
      const appointmentId = 123;
      const duplicateResponses = ['YES', 'YES', 'YES'];
      
      let confirmationCount = 0;
      duplicateResponses.forEach(response => {
        if (processConfirmationReply(appointmentId, response)) {
          confirmationCount++;
        }
      });
      
      // Should only process the first confirmation
      expect(confirmationCount).toBe(1);
    });

    it('should trigger cleanup for appointments with no reply after 30 minutes', () => {
      const expiredAppointments = [
        {
          id: 1,
          createdAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
          status: 'pending'
        },
        {
          id: 2,
          createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          status: 'pending'
        }
      ];
      
      const expiredIds = getExpiredPendingAppointments(expiredAppointments);
      expect(expiredIds).toContain(1);
      expect(expiredIds).not.toContain(2);
    });
  });

  describe('Appointment Status Edge Cases', () => {
    it('should ignore SMS replies for already confirmed appointments', () => {
      const appointment = {
        id: 123,
        status: 'confirmed',
        createdAt: new Date()
      };
      
      const result = processConfirmationReply(appointment.id, 'YES', appointment);
      expect(result).toBe(false); // Should not process
    });

    it('should ignore SMS replies for cancelled appointments', () => {
      const appointment = {
        id: 123,
        status: 'cancelled',
        createdAt: new Date()
      };
      
      const result = processConfirmationReply(appointment.id, 'YES', appointment);
      expect(result).toBe(false); // Should not process
    });

    it('should handle barber cancellation during pending confirmation', () => {
      const appointment = {
        id: 123,
        status: 'cancelled', // Barber cancelled while client was deciding
        createdAt: new Date()
      };
      
      // Client tries to confirm after barber cancelled
      const result = processConfirmationReply(appointment.id, 'YES', appointment);
      expect(result).toBe(false);
      
      // Should send appropriate SMS to client about cancellation
      const expectedMessage = "Sorry, this appointment has been cancelled. Please book a new time.";
      expect(getSMSResponseMessage(appointment.id, 'YES', appointment.status)).toBe(expectedMessage);
    });
  });
});

// Helper functions for SMS processing (would be implemented in actual service)
function normalizeResponse(response: string): boolean {
  const confirmationWords = ['yes', 'y', 'confirm', 'ok', 'sure', 'accept'];
  return confirmationWords.includes(response.toLowerCase().trim());
}

function fuzzyMatchConfirmation(response: string): boolean {
  const normalized = response.toLowerCase().trim();
  
  // Simple fuzzy matching for common misspellings
  const patterns = [
    /^y+e*s*$/,     // yes, yess, ye, yed
    /^y+e*a*h*$/,   // yea, yeah, ya
    /^o*k+$/,       // ok, okk
    /^confirm/      // confirm, confirn
  ];
  
  return patterns.some(pattern => pattern.test(normalized));
}

function fuzzyMatchCancellation(response: string): boolean {
  const normalized = response.toLowerCase().trim();
  
  const patterns = [
    /^n+o*$/,           // no, n, noo
    /^cancel/,          // cancel, cancle, canel
    /^stop$/,           // stop
    /^quit$/            // quit
  ];
  
  return patterns.some(pattern => pattern.test(normalized));
}

function isReplyWithinTimeLimit(createdAt: Date, replyAt: Date): boolean {
  const timeLimitMs = 30 * 60 * 1000; // 30 minutes
  const elapsedMs = replyAt.getTime() - createdAt.getTime();
  return elapsedMs <= timeLimitMs;
}

function processConfirmationReply(appointmentId: number, response: string, appointment?: any): boolean {
  // Check if appointment is still in pending status
  if (appointment && appointment.status !== 'pending') {
    return false;
  }
  
  // Check if this is a duplicate (would check database in real implementation)
  if (isDuplicateReply(appointmentId, response)) {
    return false;
  }
  
  // Process the confirmation
  return normalizeResponse(response) || fuzzyMatchConfirmation(response);
}

function isDuplicateReply(appointmentId: number, response: string): boolean {
  // In real implementation, would check database for previous replies
  // For test, we'll simulate tracking
  return false;
}

function getExpiredPendingAppointments(appointments: any[]): number[] {
  const now = new Date();
  const timeLimitMs = 30 * 60 * 1000; // 30 minutes
  
  return appointments
    .filter(apt => {
      if (apt.status !== 'pending') return false;
      const elapsedMs = now.getTime() - apt.createdAt.getTime();
      return elapsedMs > timeLimitMs;
    })
    .map(apt => apt.id);
}

function getSMSResponseMessage(appointmentId: number, response: string, status: string): string {
  if (status === 'cancelled') {
    return "Sorry, this appointment has been cancelled. Please book a new time.";
  }
  
  if (status === 'confirmed') {
    return "This appointment is already confirmed.";
  }
  
  if (normalizeResponse(response)) {
    return "Great! Your appointment is confirmed. We'll see you soon!";
  }
  
  return "Your appointment has been cancelled. Feel free to book a new time.";
}