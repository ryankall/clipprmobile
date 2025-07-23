// Types matching the web app's shared schema
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneVerified?: boolean;
  businessName?: string;
  // --- Added for profile modal compatibility ---
  photoUrl?: string; // base64 or url
  serviceArea?: string;
  about?: string;
  homeBaseAddress?: string;
  timezone?: string;
  defaultGraceTime?: number;
  transportationMode?: string;
  // --------------------------------------------
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

export interface ClientAnalytics {
  bigSpenders: Array<{ name: string; totalSpent: string; appointmentCount: number }>;
  mostVisited: Array<{ name: string; totalVisits: number; lastVisit: string | null }>;
  biggestTippers: Array<{ name: string; totalTips: string; tipPercentage: number }>;
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