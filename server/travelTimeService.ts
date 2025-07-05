import { storage } from "./storage";

interface TravelTimeResult {
  duration: number; // in minutes
  distance: number; // in meters
  status: 'OK' | 'ERROR';
  errorMessage?: string;
}

interface AppointmentTravelBuffer {
  appointmentId: number;
  travelTime: number; // in minutes
  graceTime: number; // in minutes
  totalBuffer: number; // in minutes
  origin: string;
  destination: string;
}

export class TravelTimeService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!this.apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not found - travel time calculations will be disabled');
    }
  }

  /**
   * Calculate travel time between two addresses using Google Maps Distance Matrix API
   */
  async calculateTravelTime(origin: string, destination: string): Promise<TravelTimeResult> {
    if (!this.apiKey) {
      return {
        duration: 15, // Default 15-minute travel time
        distance: 0,
        status: 'ERROR',
        errorMessage: 'Google Maps API key not configured'
      };
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
      url.searchParams.append('origins', origin);
      url.searchParams.append('destinations', destination);
      url.searchParams.append('mode', 'driving');
      url.searchParams.append('traffic_model', 'best_guess');
      url.searchParams.append('departure_time', 'now');
      url.searchParams.append('key', this.apiKey!);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          duration: 15, // Default fallback
          distance: 0,
          status: 'ERROR',
          errorMessage: data.error_message || 'Failed to calculate travel time'
        };
      }

      const element = data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        return {
          duration: 15, // Default fallback
          distance: 0,
          status: 'ERROR',
          errorMessage: 'No route found between the addresses'
        };
      }

      // Use duration_in_traffic if available (requires traffic data), otherwise use duration
      const duration = element.duration_in_traffic?.value || element.duration?.value || 0;
      const distance = element.distance?.value || 0;

      return {
        duration: Math.ceil(duration / 60), // convert seconds to minutes and round up
        distance,
        status: 'OK'
      };
    } catch (error) {
      console.error('Travel time calculation error:', error);
      return {
        duration: 15, // Default fallback
        distance: 0,
        status: 'ERROR',
        errorMessage: 'Failed to connect to mapping service'
      };
    }
  }

  /**
   * Calculate smart travel buffers for all appointments in a day
   */
  async calculateDayTravelBuffers(userId: number, appointmentDate: Date): Promise<AppointmentTravelBuffer[]> {
    try {
      // Get user's home base address and grace time settings
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const homeBaseAddress = user.homeBaseAddress || user.address;
      const graceTime = user.defaultGraceTime || 5;

      if (!homeBaseAddress) {
        console.warn('No home base address configured for user', userId);
        // Fall back to fixed buffer
        return [];
      }

      // Get all appointments for the day, sorted by time
      const startOfDay = new Date(appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await storage.getAppointmentsByUserId(userId, startOfDay, endOfDay);
      
      if (appointments.length === 0) {
        return [];
      }

      // Sort appointments by scheduled time
      appointments.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      const travelBuffers: AppointmentTravelBuffer[] = [];
      
      for (let i = 0; i < appointments.length; i++) {
        const appointment = appointments[i];
        const clientAddress = appointment.client.address;

        if (!clientAddress) {
          // No address for this client, use fallback buffer
          travelBuffers.push({
            appointmentId: appointment.id,
            travelTime: user.travelTimeBuffer || 15,
            graceTime: 0,
            totalBuffer: user.travelTimeBuffer || 15,
            origin: 'Unknown',
            destination: 'Unknown'
          });
          continue;
        }

        let origin: string;
        
        if (i === 0) {
          // First appointment of the day - start from home base
          origin = homeBaseAddress;
        } else {
          // Use previous appointment's address as origin
          const prevAppointment = appointments[i - 1];
          origin = prevAppointment.client.address || homeBaseAddress;
        }

        // Calculate travel time
        const travelResult = await this.calculateTravelTime(origin, clientAddress);
        
        let travelTime: number;
        if (travelResult.status === 'OK') {
          travelTime = travelResult.duration;
        } else {
          console.warn(`Travel time calculation failed for appointment ${appointment.id}:`, travelResult.errorMessage);
          // Fall back to user's default buffer
          travelTime = user.travelTimeBuffer || 15;
        }

        travelBuffers.push({
          appointmentId: appointment.id,
          travelTime,
          graceTime,
          totalBuffer: travelTime + graceTime,
          origin,
          destination: clientAddress
        });

        // Add a small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return travelBuffers;
    } catch (error) {
      console.error('Error calculating day travel buffers:', error);
      return [];
    }
  }

  /**
   * Get available time slots for a given date, considering travel times
   */
  async getAvailableTimeSlots(
    userId: number, 
    date: Date, 
    newClientAddress: string,
    serviceDuration: number = 60
  ): Promise<{ startTime: Date; endTime: Date; travelInfo?: string }[]> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return [];
      }

      const workingHours = user.workingHours as any || {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '09:00', end: '17:00', enabled: true },
        sunday: { start: '09:00', end: '17:00', enabled: false }
      };

      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = workingHours[dayName];

      if (!daySchedule || !daySchedule.enabled) {
        return [];
      }

      // Get existing appointments for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await storage.getAppointmentsByUserId(userId, startOfDay, endOfDay);
      
      // Calculate travel buffers for existing appointments
      const travelBuffers = await this.calculateDayTravelBuffers(userId, date);

      // Parse working hours
      const startTime = this.parseTime(date, daySchedule.start);
      const endTime = this.parseTime(date, daySchedule.end);

      const availableSlots: { startTime: Date; endTime: Date; travelInfo?: string }[] = [];
      const slotDuration = 30; // 30-minute slots

      // Generate all possible slots
      let currentSlot = new Date(startTime);
      while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot.getTime() + serviceDuration * 60 * 1000);
        
        if (slotEnd <= endTime) {
          // Check if this slot conflicts with existing appointments + travel buffers
          const hasConflict = await this.hasSchedulingConflict(
            currentSlot, 
            slotEnd, 
            existingAppointments, 
            travelBuffers,
            newClientAddress,
            user
          );

          if (!hasConflict) {
            availableSlots.push({
              startTime: new Date(currentSlot),
              endTime: new Date(slotEnd)
            });
          }
        }

        currentSlot = new Date(currentSlot.getTime() + slotDuration * 60 * 1000);
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      return [];
    }
  }

  private parseTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private async hasSchedulingConflict(
    proposedStart: Date,
    proposedEnd: Date,
    existingAppointments: any[],
    travelBuffers: AppointmentTravelBuffer[],
    newClientAddress: string,
    user: any
  ): Promise<boolean> {
    for (const appointment of existingAppointments) {
      const appointmentStart = new Date(appointment.scheduledAt);
      const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.service.duration || 60) * 60 * 1000);
      
      // Find travel buffer for this appointment
      const buffer = travelBuffers.find(b => b.appointmentId === appointment.id);
      const bufferTime = buffer?.totalBuffer || user.travelTimeBuffer || 15;

      // Check if proposed appointment conflicts with existing appointment + buffer
      const bufferStart = new Date(appointmentStart.getTime() - bufferTime * 60 * 1000);
      const bufferEnd = new Date(appointmentEnd.getTime() + bufferTime * 60 * 1000);

      if (
        (proposedStart >= bufferStart && proposedStart < bufferEnd) ||
        (proposedEnd > bufferStart && proposedEnd <= bufferEnd) ||
        (proposedStart < bufferStart && proposedEnd > bufferEnd)
      ) {
        return true; // Conflict found
      }
    }

    return false; // No conflicts
  }
}

export const travelTimeService = new TravelTimeService();