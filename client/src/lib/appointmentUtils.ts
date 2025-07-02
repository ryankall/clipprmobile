import type { AppointmentWithRelations } from "@shared/schema";

/**
 * Gets a formatted string of all services for an appointment
 * Shows multiple services like "Buzz Cut, Beard Trim + Line Up..."
 * Falls back to primary service if appointment services aren't loaded
 */
export function getServiceNamesDisplay(appointment: AppointmentWithRelations, maxLength = 60): string {
  // If appointment services are loaded and available, use them
  if (appointment.appointmentServices && appointment.appointmentServices.length > 0) {
    const serviceNames = appointment.appointmentServices.map(as => as.service.name);
    const joined = serviceNames.join(", ");
    
    // If it fits within max length, return as is
    if (joined.length <= maxLength) {
      return joined;
    }
    
    // Otherwise, truncate and add ellipsis
    return joined.substring(0, maxLength - 3) + "...";
  }
  
  // Fallback to primary service if appointment services aren't loaded
  return appointment.service.name;
}

/**
 * Gets the total price from appointment services if available, 
 * otherwise falls back to appointment price
 */
export function getTotalPrice(appointment: AppointmentWithRelations): string {
  if (appointment.appointmentServices && appointment.appointmentServices.length > 0) {
    const total = appointment.appointmentServices.reduce((sum, as) => 
      sum + (parseFloat(as.price) * as.quantity), 0
    );
    return total.toFixed(2);
  }
  
  return appointment.price;
}

/**
 * Gets the total duration from appointment services if available,
 * otherwise falls back to appointment duration
 */
export function getTotalDuration(appointment: AppointmentWithRelations): number {
  if (appointment.appointmentServices && appointment.appointmentServices.length > 0) {
    return appointment.appointmentServices.reduce((sum, as) => 
      sum + (as.service.duration * as.quantity), 0
    );
  }
  
  return appointment.duration;
}