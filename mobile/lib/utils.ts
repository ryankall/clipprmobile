// Template replacement utility function
export function replaceMessageTemplate(
  template: string,
  appointment: {
    client?: { name?: string };
    service?: { name?: string };
    scheduledAt: string | Date;
    address?: string;
  }
): string {
  if (!template) return "";

  const scheduledDate = new Date(appointment.scheduledAt);
  const timeString = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dateString = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return template
    .replace(/{client_name}/g, appointment.client?.name || "Client")
    .replace(/{service}/g, appointment.service?.name || "appointment")
    .replace(/{appointment_time}/g, `${dateString} at ${timeString}`)
    .replace(/{address}/g, appointment.address || "your location");
}

// Default quick action messages
export const DEFAULT_QUICK_ACTION_MESSAGES = {
  onMyWay: "Hi {client_name}, I'm on my way to your {appointment_time} appointment for {service}. See you soon!",
  runningLate: "Hi {client_name}, I'm running a few minutes late for your {appointment_time} appointment. Will be there shortly!",
  confirmation: "Hi {client_name}, confirming your appointment for {appointment_time} at {address} for {service}."
};

//
// Minimal EventEmitter for cross-tab communication
//
type Listener = (...args: any[]) => void;
class SimpleEventEmitter {
  private events: { [event: string]: Listener[] } = {};
  on(event: string, listener: Listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }
  off(event: string, listener: Listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}
export const globalEventEmitter = new SimpleEventEmitter();

export function toISOStringSafe(date: Date): string {
  return date instanceof Date && !isNaN(date.getTime())
    ? date.toISOString()
    : '';
}