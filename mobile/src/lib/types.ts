import type { 
  User, 
  Client, 
  Service, 
  Appointment, 
  Invoice, 
  GalleryPhoto,
  AppointmentWithRelations,
  ClientWithStats,
  DashboardStats
} from "@shared/schema";

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Form types
export interface AppointmentFormData {
  clientId: number;
  serviceId: number;
  scheduledAt: Date;
  notes?: string;
  address?: string;
}

export interface ClientFormData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  preferredStyle?: string;
  notes?: string;
  loyaltyStatus?: 'regular' | 'vip';
}

export interface ServiceFormData {
  name: string;
  description?: string;
  price: string;
  duration: number;
  category: 'haircut' | 'beard' | 'combo' | 'custom';
}

export interface InvoiceFormData {
  clientId: number;
  appointmentId?: number;
  subtotal: string;
  tip: string;
  total: string;
  paymentMethod?: 'stripe' | 'apple_pay' | 'cash';
}

export interface GalleryPhotoFormData {
  clientId?: number;
  appointmentId?: number;
  photoUrl: string;
  type: 'before' | 'after' | 'portfolio';
  description?: string;
  isPublic?: boolean;
}

// UI State types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Stripe types
export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId?: string;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret: string;
}

// Working hours type
export interface WorkingHours {
  [key: string]: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

// Calendar types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'appointment' | 'break' | 'travel';
  appointment?: AppointmentWithRelations;
}

// Filter and sort types
export interface ClientFilters {
  search?: string;
  loyaltyStatus?: 'all' | 'regular' | 'vip';
  hasUpcomingAppointments?: boolean;
  sortBy?: 'name' | 'lastVisit' | 'totalSpent' | 'totalVisits';
  sortOrder?: 'asc' | 'desc';
}

export interface AppointmentFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: number;
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  serviceId?: number;
}

export interface InvoiceFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: number;
  status?: 'pending' | 'paid' | 'cancelled';
  paymentMethod?: 'stripe' | 'apple_pay' | 'cash';
}

export interface GalleryFilters {
  clientId?: number;
  type?: 'before' | 'after' | 'portfolio';
  isPublic?: boolean;
  startDate?: Date;
  endDate?: Date;
}

// Navigation types
export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    reminders: boolean;
  };
  workingHours: WorkingHours;
  travelTimeBuffer: number;
  defaultTipPercentage: number;
  currency: string;
  timezone: string;
}

// Quick action types
export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

// Statistics types
export interface RevenueStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  growth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface ClientStats {
  total: number;
  new: number;
  returning: number;
  vip: number;
  averageSpent: number;
  retentionRate: number;
}

export interface ServiceStats {
  mostPopular: Service[];
  revenue: { [serviceId: number]: number };
  bookings: { [serviceId: number]: number };
}

// Export commonly used types from shared schema
export type {
  User,
  Client,
  Service,
  Appointment,
  Invoice,
  GalleryPhoto,
  AppointmentWithRelations,
  ClientWithStats,
  DashboardStats,
};
