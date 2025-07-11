// Types matching the web app's shared schema
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  preferredStyle?: string;
  notes?: string;
  loyaltyStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWithStats extends Client {
  totalSpent: string;
  totalVisits: number;
  lastVisit: Date | null;
  vipStatus?: string;
}

export interface Service {
  id: number;
  userId: number;
  name: string;
  description?: string;
  price: string;
  duration: number;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: Date;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'no_show';
  travelRequired: boolean;
  address?: string;
  price: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithRelations extends Appointment {
  client: Client;
  service: Service;
  services: Service[];
}

export interface DashboardStats {
  dailyEarnings: string;
  appointmentCount: number;
  clientCount: number;
  popularService: string;
  totalRevenue: string;
  avgAppointmentValue: string;
}

export interface GalleryPhoto {
  id: number;
  userId: number;
  clientId?: number;
  appointmentId?: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: 'before' | 'after' | 'portfolio';
  isPublic: boolean;
  createdAt: string;
}

export interface Message {
  id: number;
  barberId: string;
  customerName: string;
  customerPhone: string;
  selectedDate: string;
  selectedTime: string;
  services: string[];
  message?: string;
  isTravel: boolean;
  address?: string;
  createdAt: string;
}