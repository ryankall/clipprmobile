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

//
// Date/Time UTC <-> Timezone Conversion Utilities
//

/**
 * Converts a local Date object to a UTC ISO string (for API sending).
 * @param date Local Date object (in user's timezone)
 * @returns UTC ISO string (e.g., "2025-08-02T17:13:59.314Z")
 */
export function localToUTC(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return date.toISOString();
}

/**
 * Converts a UTC ISO string to a Date object in the user's timezone.
 * Optionally, a specific IANA timezone can be provided (e.g., "America/New_York").
 * @param utcString UTC ISO string (e.g., "2025-08-02T17:13:59.314Z")
 * @param timeZone Optional IANA timezone string. Defaults to system/user timezone.
 * @returns Date object representing the same wall time in the target timezone.
 */
export function utcToLocal(utcString: string, timeZone?: string): Date {
  if (!utcString) return new Date(NaN);
  const utcDate = new Date(utcString);
  if (isNaN(utcDate.getTime())) return new Date(NaN);

  // If no timezone specified, return local system time
  if (!timeZone) return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
    utcDate.getUTCMilliseconds()
  );

  // For a specific timezone, use Intl.DateTimeFormat to get the local time parts
  // and reconstruct a Date object in the target timezone.
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(utcDate);

    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    // Note: month is 1-based in formatToParts, 0-based in Date constructor
    return new Date(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second')
    );
  } catch {
    // Fallback: return as local system time
    return new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      utcDate.getUTCSeconds(),
      utcDate.getUTCMilliseconds()
    );
  }
}

// utils.ts
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhoneNumber(phone: string): boolean {
  // Allows 10-15 digits, optional leading +
  return /^\+?\d{10,15}$/.test(phone);
}

function isMinLength(text: string, min: number): boolean {
  return typeof text === 'string' && text.length >= min;
}

function isMaxLength(text: string, max: number): boolean {
  return typeof text === 'string' && text.length <= max;
}

function isNumeric(text: string): boolean {
  return /^\d+$/.test(text);
}

function isFloat(text: string): boolean {
  return /^(\d+)?(\.\d+)?$/.test(text);
}

function allowedMaxCharacter(text: string, max: number) {
  return typeof text === 'string' && text.length <= max;
}

function isRequired(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function formatCurrencyInput(text: string): string {
  const numeric = text.replace(/[^\d]/g, '');
  if (numeric.length === 0) return '0.00';
  const cents = numeric.padStart(3, '0');
  const dollars = cents.slice(0, -2);
  const decimal = cents.slice(-2);
  return `${parseInt(dollars)}.${decimal}`;
}

export const validators = {
  isValidEmail,
  isValidPhoneNumber,
  isMinLength,
  isNumeric,
  isFloat,
  isMaxLength,
  allowedMaxCharacter,
  isRequired,
  formatCurrencyInput
};


export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'replied', label: 'Replied' },
  { key: 'archived', label: 'Archived' },
];

// API integration: remove static messages

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return '#EF4444'; // red-500
    case 'high':
      return '#F59E0B'; // gold
    case 'normal':
      return '#3B82F6'; // blue-500
    case 'low':
      return '#9CA3AF'; // gray-500
    default:
      return '#3B82F6';
  }
}