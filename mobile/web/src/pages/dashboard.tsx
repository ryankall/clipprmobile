import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare,
  Bell,
  ArrowRight,
  User,
  Camera,
  Plus,
  TrendingUp,
  Activity
} from 'lucide-react';

// Types
interface DashboardStats {
  dailyEarnings: string;
  appointmentCount: number;
  totalEarnings: string;
  clientCount: number;
  averageService: string;
}

interface AppointmentWithRelations {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'expired';
  duration: number;
  client?: { name: string; phone: string };
  service?: { name: string; price: string };
  price: string;
}

interface GalleryPhoto {
  id: number;
  userId: number;
  clientId: number;
  photoUrl: string;
  description?: string;
}

interface ClientWithRelations {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
}

interface Service {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  isActive: boolean;
}

interface UnreadCount {
  count: number;
}

export default function MobileDashboard() {
  // Fetch dashboard data
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: todaysAppointments = [] } = useQuery<AppointmentWithRelations[]>({
    queryKey: ['/api/appointments/today'],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const { data: galleryPhotos = [] } = useQuery<GalleryPhoto[]>({
    queryKey: ['/api/gallery'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: clients = [] } = useQuery<ClientWithRelations[]>({
    queryKey: ['/api/clients'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: unreadCount } = useQuery<UnreadCount>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 30000, // 30 seconds
  });

  // Get current and next appointments
  const now = new Date();
  const currentAppointments = todaysAppointments.filter(apt => {
    const appointmentTime = new Date(apt.scheduledAt);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff >= -10 && minutesDiff <= 60 && apt.status === 'confirmed';
  });

  const nextAppointments = todaysAppointments.filter(apt => {
    const appointmentTime = new Date(apt.scheduledAt);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff > 60 && apt.status === 'confirmed';
  }).slice(0, 2);

  const pendingAppointments = todaysAppointments.filter(apt => apt.status === 'pending');

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl p-6 text-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-gray-800 mt-1">Ready to make today great?</p>
          </div>
          <div className="bg-white/20 p-3 rounded-xl">
            <Home className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Today's Earnings</p>
              <p className="text-2xl font-bold text-amber-500">${stats?.dailyEarnings || '0.00'}</p>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Appointments</p>
              <p className="text-2xl font-bold text-white">{stats?.appointmentCount || 0}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Clients</p>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <Users className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Services</p>
              <p className="text-2xl font-bold text-white">{services.filter(s => s.isActive).length}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Current Appointment */}
      {currentAppointments.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Current Appointment</h3>
            <div className="bg-green-500/10 px-3 py-1 rounded-full">
              <span className="text-green-500 text-sm font-medium">In Progress</span>
            </div>
          </div>
          
          {currentAppointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{appointment.client?.name}</p>
                <p className="text-gray-400 text-sm">{appointment.service?.name}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-amber-500 text-sm flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTime(appointment.scheduledAt)}
                  </span>
                  <span className="text-gray-400 text-sm">{appointment.duration} min</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">${appointment.price}</p>
                <button className="text-amber-500 text-sm hover:text-amber-400 mt-1">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Appointments */}
      {nextAppointments.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Next Up</h3>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {nextAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{appointment.client?.name}</p>
                  <p className="text-gray-400 text-sm">{appointment.service?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-500 text-sm">{formatTime(appointment.scheduledAt)}</p>
                  <p className="text-gray-400 text-sm">${appointment.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Confirmations */}
      {pendingAppointments.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Pending Confirmations</h3>
            <div className="bg-amber-500/10 px-3 py-1 rounded-full">
              <span className="text-amber-500 text-sm font-medium">{pendingAppointments.length}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {pendingAppointments.slice(0, 3).map((appointment) => (
              <div key={appointment.id} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{appointment.client?.name}</p>
                  <p className="text-gray-400 text-sm">{appointment.service?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-500 text-sm">{formatTime(appointment.scheduledAt)}</p>
                  <button className="text-amber-500 text-sm hover:text-amber-400">
                    Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-amber-500 text-gray-900 p-4 rounded-xl font-medium hover:bg-amber-600 transition-colors">
            <Calendar className="w-5 h-5 mx-auto mb-2" />
            <span className="text-sm">New Appointment</span>
          </button>
          <button className="bg-gray-700 text-white p-4 rounded-xl font-medium hover:bg-gray-600 transition-colors">
            <Users className="w-5 h-5 mx-auto mb-2" />
            <span className="text-sm">Add Client</span>
          </button>
          <button className="bg-gray-700 text-white p-4 rounded-xl font-medium hover:bg-gray-600 transition-colors">
            <Camera className="w-5 h-5 mx-auto mb-2" />
            <span className="text-sm">Add Photo</span>
          </button>
          <button className="bg-gray-700 text-white p-4 rounded-xl font-medium hover:bg-gray-600 transition-colors">
            <MessageSquare className="w-5 h-5 mx-auto mb-2" />
            <span className="text-sm">Messages</span>
            {unreadCount && unreadCount.count > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {unreadCount.count}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Recent Gallery */}
      {galleryPhotos.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Recent Work</h3>
            <button className="text-amber-500 text-sm hover:text-amber-400">
              View All
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {galleryPhotos.slice(0, 6).map((photo) => (
              <div key={photo.id} className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
                <img 
                  src={photo.photoUrl} 
                  alt={photo.description}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}