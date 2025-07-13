export interface AppointmentWithRelations {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  duration: number;
  price: string;
  createdAt: string;
  client?: {
    name: string;
    phone?: string;
    email?: string;
  };
  service?: {
    name: string;
    price: string;
    duration: number;
  };
}

export interface ClientWithStats {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  preferredStyle?: string;
  notes?: string;
  loyaltyStatus?: 'vip' | 'regular';
  totalVisits?: number;
  totalSpent?: string;
  createdAt: string;
}

export interface Client {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  preferredStyle?: string;
  notes?: string;
  createdAt: string;
}

export interface Service {
  id: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  description?: string;
  isActive: boolean;
}

export interface Invoice {
  id: number;
  userId: number;
  clientId: number;
  subtotal: string;
  tipAmount: string;
  total: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod: 'cash' | 'stripe' | 'apple_pay';
  notes?: string;
  createdAt: string;
  client?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface DashboardStats {
  totalClients: number;
  totalAppointments: number;
  todayEarnings: string;
  weeklyEarnings: string;
  monthlyEarnings: string;
  pendingAppointments: number;
}

export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName?: string;
  profilePhoto?: string;
  homeBaseAddress?: string;
  serviceArea?: string;
  about?: string;
}

export interface GalleryPhoto {
  id: number;
  userId: number;
  url: string;
  caption?: string;
  type: 'portfolio' | 'before_after' | 'client_work';
  isPublic: boolean;
  createdAt: string;
}

export const insertClientSchema = {
  name: '',
  phone: '',
  email: '',
  address: '',
  preferredStyle: '',
  notes: '',
};

export const insertInvoiceSchema = {
  clientId: 0,
  subtotal: '',
  tipAmount: '',
  total: '',
  status: 'pending' as const,
  paymentMethod: 'cash' as const,
  notes: '',
};