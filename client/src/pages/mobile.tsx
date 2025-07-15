import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  Plus,
  Clock,
  DollarSign,
  TrendingUp,
  Phone,
  MapPin,
  Star
} from 'lucide-react';

interface AppointmentWithRelations {
  id: number;
  scheduledAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  duration: number;
  client: {
    id: number;
    name: string;
    phone: string;
  };
  services: Array<{
    id: number;
    name: string;
    price: string;
  }>;
  price: string;
}

interface DashboardStats {
  todayEarnings: number;
  todayAppointments: number;
  totalClients: number;
  monthlyEarnings: number;
}

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'clients' | 'services' | 'settings'>('dashboard');

  // Fetch dashboard data
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: todayAppointments } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["/api/appointments/today"],
  });

  const { data: nextAppointment } = useQuery<AppointmentWithRelations>({
    queryKey: ["/api/appointments/next"],
  });

  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome back!</h1>
        <p className="text-gray-400">Here's your business overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Today</p>
                <p className="text-lg font-bold text-white">${stats?.todayEarnings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Appointments</p>
                <p className="text-lg font-bold text-white">{stats?.todayAppointments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Clients</p>
                <p className="text-lg font-bold text-white">{stats?.totalClients || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Monthly</p>
                <p className="text-lg font-bold text-white">${stats?.monthlyEarnings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Appointment */}
      {nextAppointment && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Next Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{nextAppointment.client.name}</p>
                <p className="text-sm text-gray-400">{nextAppointment.services.map(s => s.name).join(", ")}</p>
              </div>
              <Badge variant="outline" className="text-amber-500 border-amber-500">
                {nextAppointment.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(nextAppointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>{nextAppointment.client.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Today's Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments && todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{appointment.client.name}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">${appointment.price}</p>
                    <Badge variant="outline" className="text-xs">
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">No appointments today</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => setActiveTab('calendar')}
          className="bg-amber-500 hover:bg-amber-600 text-gray-900 p-6"
        >
          <Calendar className="w-5 h-5 mr-2" />
          View Calendar
        </Button>
        <Button 
          onClick={() => setActiveTab('clients')}
          className="bg-gray-700 hover:bg-gray-600 text-white p-6"
        >
          <Users className="w-5 h-5 mr-2" />
          Manage Clients
        </Button>
      </div>
    </div>
  );

  // Calendar Content
  const renderCalendar = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Calendar</h2>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Mobile calendar interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Clients Content
  const renderClients = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Clients</h2>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Mobile clients interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Services Content
  const renderServices = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Services</h2>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Mobile services interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Settings Content
  const renderSettings = () => (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold text-white">Settings</h2>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Mobile settings interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'calendar':
        return renderCalendar();
      case 'clients':
        return renderClients();
      case 'services':
        return renderServices();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Main Content */}
      <div className="pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700">
        <div className="flex items-center justify-around p-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'dashboard' 
                ? 'text-amber-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'calendar' 
                ? 'text-amber-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Calendar</span>
          </button>
          
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'clients' 
                ? 'text-amber-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs">Clients</span>
          </button>
          
          <button
            onClick={() => setActiveTab('services')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'services' 
                ? 'text-amber-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Star className="w-5 h-5" />
            <span className="text-xs">Services</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'settings' 
                ? 'text-amber-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}