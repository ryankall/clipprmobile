import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  LogOut, 
  Camera, 
  Edit3,
  X,
  Upload,
  Users,
  Phone,
  Mail,
  MapPin,
  Globe,
  Eye,
  EyeOff,
  ShieldOff,
  ChevronRight
} from 'lucide-react';

interface MobileUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  phoneVerified?: boolean;
  photoUrl?: string;
  serviceArea?: string;
  about?: string;
  timezone?: string;
}

interface MobileNotificationSettings {
  newBookingRequests: boolean;
  appointmentConfirmations: boolean;
  appointmentCancellations: boolean;
  upcomingReminders: boolean;
  soundEffects: boolean;
}

interface MobileBlockedClient {
  id: number;
  phoneNumber: string;
  reason?: string;
  blockedAt: string;
}

export default function MobileSettings() {
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security' | 'blocked'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    serviceArea: '',
    about: '',
    timezone: 'America/New_York'
  });
  const [notificationSettings, setNotificationSettings] = useState<MobileNotificationSettings>({
    newBookingRequests: true,
    appointmentConfirmations: true,
    appointmentCancellations: true,
    upcomingReminders: true,
    soundEffects: true,
  });

  const queryClient = useQueryClient();

  // Fetch user profile data
  const { data: user, isLoading } = useQuery<MobileUser>({
    queryKey: ["/api/user/profile"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch blocked clients
  const { data: blockedClients = [] } = useQuery<MobileBlockedClient[]>({
    queryKey: ["/api/anti-spam/blocked-clients"],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      setIsEditingProfile(false);
    },
  });

  // Unblock client mutation
  const unblockClientMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await fetch('/api/anti-spam/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!response.ok) throw new Error('Failed to unblock client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anti-spam/blocked-clients'] });
    },
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setProfileFormData({
        businessName: user.businessName || '',
        email: user.email || '',
        phone: user.phone || '',
        serviceArea: user.serviceArea || '',
        about: user.about || '',
        timezone: user.timezone || 'America/New_York'
      });
    }
  }, [user]);

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  // Handle profile update
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileFormData);
  };

  // Format phone number
  const formatPhoneNumber = (value: string): string => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border border-gray-600"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-amber-500 p-1 rounded-full">
              <Camera className="w-3 h-3 text-gray-900" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg">{user?.businessName || "Business Name"}</h3>
            <p className="text-gray-400">{user?.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-gray-400 text-sm">{user?.phone || "No phone"}</p>
              {user?.phoneVerified && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setIsEditingProfile(true)}
            className="text-amber-500 hover:text-amber-400 p-2"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-3">
        {/* Profile Settings */}
        <button
          onClick={() => setActiveSection('profile')}
          className={`w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-left hover:bg-gray-750 transition-colors ${
            activeSection === 'profile' ? 'border-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-white font-medium">Profile & Business</p>
                <p className="text-gray-400 text-sm">Manage your business information</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        {/* Notification Settings */}
        <button
          onClick={() => setActiveSection('notifications')}
          className={`w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-left hover:bg-gray-750 transition-colors ${
            activeSection === 'notifications' ? 'border-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-white font-medium">Notifications</p>
                <p className="text-gray-400 text-sm">Configure alert preferences</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        {/* Security Settings */}
        <button
          onClick={() => setActiveSection('security')}
          className={`w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-left hover:bg-gray-750 transition-colors ${
            activeSection === 'security' ? 'border-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-white font-medium">Security</p>
                <p className="text-gray-400 text-sm">Password and account security</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        {/* Blocked Clients */}
        <button
          onClick={() => setActiveSection('blocked')}
          className={`w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-left hover:bg-gray-750 transition-colors ${
            activeSection === 'blocked' ? 'border-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldOff className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-white font-medium">Blocked Clients</p>
                <p className="text-gray-400 text-sm">{blockedClients.length} blocked numbers</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>
      </div>

      {/* Active Section Content */}
      {activeSection === 'notifications' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {Object.entries(notificationSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {key === 'newBookingRequests' && 'Get notified when clients request appointments'}
                    {key === 'appointmentConfirmations' && 'Notifications when appointments are confirmed'}
                    {key === 'appointmentCancellations' && 'Alerts for cancelled appointments'}
                    {key === 'upcomingReminders' && 'Reminders for upcoming appointments'}
                    {key === 'soundEffects' && 'Play sounds with notifications'}
                  </p>
                </div>
                <button
                  onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-amber-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'blocked' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Blocked Clients</h3>
          {blockedClients.length === 0 ? (
            <div className="text-center py-8">
              <ShieldOff className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No blocked clients</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{client.phoneNumber}</p>
                    {client.reason && (
                      <p className="text-gray-400 text-sm">{client.reason}</p>
                    )}
                    <p className="text-gray-500 text-xs">
                      Blocked {new Date(client.blockedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => unblockClientMutation.mutate(client.phoneNumber)}
                    disabled={unblockClientMutation.isPending}
                    className="text-amber-500 hover:text-amber-400 text-sm disabled:opacity-50"
                  >
                    {unblockClientMutation.isPending ? 'Unblocking...' : 'Unblock'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign Out */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <button
          onClick={handleSignOut}
          className="flex items-center text-red-400 hover:text-red-300 w-full"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Edit Profile</h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium">Business Name</label>
                <input
                  type="text"
                  value={profileFormData.businessName}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Your business name"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={profileFormData.email}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Phone</label>
                <input
                  type="tel"
                  value={profileFormData.phone}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Service Area</label>
                <input
                  type="text"
                  value={profileFormData.serviceArea}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, serviceArea: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Downtown, Midtown, etc."
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">About</label>
                <textarea
                  value={profileFormData.about}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, about: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Tell clients about your business..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Timezone</label>
                <select
                  value={profileFormData.timezone}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}