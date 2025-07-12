import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  User, 
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  Grid,
  Settings
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

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
  travelRequired?: boolean;
  address?: string;
}

export default function MobileCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [showWorkingHours, setShowWorkingHours] = useState(false);

  // Fetch appointments for the selected date range
  const { data: appointments = [] } = useQuery<AppointmentWithRelations[]>({
    queryKey: ['/api/appointments', format(selectedDate, 'yyyy-MM-dd')],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Get week dates
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter appointments by status
  const filteredAppointments = appointments.filter(apt => {
    if (statusFilter === 'all') return true;
    return apt.status === statusFilter;
  });

  // Get appointments for specific date
  const getAppointmentsForDate = (date: Date) => {
    return filteredAppointments.filter(apt => 
      isSameDay(new Date(apt.scheduledAt), date)
    );
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-amber-500';
      case 'cancelled': return 'bg-red-500';
      case 'expired': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'week' ? 7 : 1;
    setSelectedDate(prev => 
      direction === 'next' 
        ? addDays(prev, days)
        : addDays(prev, -days)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Calendar</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWorkingHours(true)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600">
            <Plus className="w-4 h-4 mr-2 inline" />
            Add
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-white font-semibold">
              {viewMode === 'week' 
                ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
                : format(selectedDate, 'MMMM d, yyyy')
              }
            </h2>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 text-gray-400 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'week' 
                  ? 'bg-amber-500 text-gray-900' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'day' 
                  ? 'bg-amber-500 text-gray-900' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Day
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600"
          >
            <option value="all">All Appointments</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
                  isSameDay(day, selectedDate)
                    ? 'bg-amber-500 text-gray-900'
                    : isToday(day)
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-xs">{format(day, 'EEE')}</div>
                <div className="text-sm font-medium">{format(day, 'd')}</div>
                <div className="flex justify-center mt-1">
                  {getAppointmentsForDate(day).length > 0 && (
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-4">
        {viewMode === 'week' ? (
          // Week view - show selected day appointments
          getAppointmentsForDate(selectedDate).length > 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
              <div className="space-y-3">
                {getAppointmentsForDate(selectedDate).map((appointment) => (
                  <div key={appointment.id} className="flex items-center space-x-4 p-3 bg-gray-700 rounded-lg">
                    <div className={`w-1 h-12 rounded-full ${getStatusColor(appointment.status)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{appointment.client?.name}</p>
                        <span className="text-amber-500 text-sm font-medium">
                          {formatTime(appointment.scheduledAt)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{appointment.service?.name}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-gray-400 text-sm flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {appointment.duration} min
                        </span>
                        <span className="text-gray-400 text-sm">${appointment.price}</span>
                        {appointment.travelRequired && (
                          <span className="text-amber-500 text-sm flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            Travel
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      appointment.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      appointment.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      appointment.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {appointment.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No appointments for {format(selectedDate, 'MMMM d')}</p>
              <button className="mt-4 bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Appointment
              </button>
            </div>
          )
        ) : (
          // Day view - show all appointments for selected day
          getAppointmentsForDate(selectedDate).length > 0 ? (
            <div className="space-y-3">
              {getAppointmentsForDate(selectedDate).map((appointment) => (
                <div key={appointment.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{appointment.client?.name}</p>
                        <p className="text-gray-400 text-sm">{appointment.service?.name}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      appointment.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      appointment.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      appointment.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {appointment.status}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatTime(appointment.scheduledAt)} ({appointment.duration} min)
                    </div>
                    <div className="flex items-center text-gray-400">
                      <DollarSign className="w-4 h-4 mr-2" />
                      ${appointment.price}
                    </div>
                    {appointment.client?.phone && (
                      <div className="flex items-center text-gray-400">
                        <Phone className="w-4 h-4 mr-2" />
                        {appointment.client.phone}
                      </div>
                    )}
                    {appointment.travelRequired && appointment.address && (
                      <div className="flex items-center text-gray-400">
                        <MapPin className="w-4 h-4 mr-2" />
                        Travel Required
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <div className="flex space-x-2">
                      <button className="text-amber-500 text-sm hover:text-amber-400">
                        Edit
                      </button>
                      <button className="text-gray-400 text-sm hover:text-white">
                        Call
                      </button>
                    </div>
                    {appointment.status === 'pending' && (
                      <button className="bg-amber-500 text-gray-900 px-3 py-1 rounded text-sm font-medium hover:bg-amber-600">
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No appointments for {format(selectedDate, 'MMMM d')}</p>
              <button className="mt-4 bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Appointment
              </button>
            </div>
          )
        )}
      </div>

      {/* Working Hours Modal */}
      {showWorkingHours && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Working Hours</h3>
              <button
                onClick={() => setShowWorkingHours(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-white font-medium">{day}</span>
                  <div className="flex items-center space-x-2">
                    <select className="bg-gray-700 text-white rounded px-2 py-1 text-sm">
                      <option>9:00 AM</option>
                      <option>10:00 AM</option>
                    </select>
                    <span className="text-gray-400">-</span>
                    <select className="bg-gray-700 text-white rounded px-2 py-1 text-sm">
                      <option>5:00 PM</option>
                      <option>6:00 PM</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWorkingHours(false)}
                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button className="flex-1 bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}