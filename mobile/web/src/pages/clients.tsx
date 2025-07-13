import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  DollarSign,
  Edit3,
  Trash2,
  User,
  Crown,
  X,
  Camera,
  Heart,
  Star
} from 'lucide-react';

interface ClientWithRelations {
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
  totalVisits?: number;
  lastVisit?: string;
  totalSpent?: string;
  photoUrl?: string;
}

interface Service {
  id: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  isActive: boolean;
}

export default function MobileClients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithRelations | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithRelations | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredStyle: '',
    notes: '',
    loyaltyStatus: 'regular'
  });

  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients = [], isLoading } = useQuery<ClientWithRelations[]>({
    queryKey: ['/api/clients'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch services for client profile
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setShowAddModal(false);
      resetForm();
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setEditingClient(null);
      resetForm();
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      if (!response.ok) throw new Error('Failed to delete client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setSelectedClient(null);
    },
  });

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Phone number formatting
  const formatPhoneNumber = (value: string): string => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      preferredStyle: '',
      notes: '',
      loyaltyStatus: 'regular'
    });
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateClientMutation.mutate({
        id: editingClient.id,
        data: formData
      });
    } else {
      addClientMutation.mutate(formData);
    }
  };

  // Open edit modal
  const handleEdit = (client: ClientWithRelations) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      preferredStyle: client.preferredStyle || '',
      notes: client.notes || '',
      loyaltyStatus: client.loyaltyStatus || 'regular'
    });
  };

  // Get loyalty badge
  const getLoyaltyBadge = (status?: string) => {
    switch (status) {
      case 'vip':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'favorite':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'premium':
        return <Star className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Clients</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600"
        >
          <Plus className="w-4 h-4 mr-2 inline" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Clients List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              {searchTerm ? 'No clients found matching your search.' : 'No clients added yet.'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Your First Client
            </button>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition-colors"
              onClick={() => setSelectedClient(client)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center relative">
                  {client.photoUrl ? (
                    <img
                      src={client.photoUrl}
                      alt={client.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                  {getLoyaltyBadge(client.loyaltyStatus) && (
                    <div className="absolute -top-1 -right-1 bg-gray-800 p-1 rounded-full">
                      {getLoyaltyBadge(client.loyaltyStatus)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">{client.name}</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client);
                        }}
                        className="text-gray-400 hover:text-white p-1"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this client?')) {
                            deleteClientMutation.mutate(client.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-gray-400 text-sm flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {client.phone}
                    </span>
                    {client.email && (
                      <span className="text-gray-400 text-sm flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {client.email}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-gray-400 text-sm flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {client.totalVisits || 0} visits
                    </span>
                    <span className="text-gray-400 text-sm flex items-center">
                      <DollarSign className="w-3 h-3 mr-1" />
                      ${client.totalSpent || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingClient) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingClient(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Client's full name"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Preferred Style</label>
                <input
                  type="text"
                  value={formData.preferredStyle}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredStyle: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Fade, buzz cut, etc."
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Loyalty Status</label>
                <select
                  value={formData.loyaltyStatus}
                  onChange={(e) => setFormData(prev => ({ ...prev, loyaltyStatus: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="regular">Regular</option>
                  <option value="favorite">Favorite</option>
                  <option value="vip">VIP</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="text-white text-sm font-medium">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Any special notes about this client..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingClient(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addClientMutation.isPending || updateClientMutation.isPending}
                  className="flex-1 bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {addClientMutation.isPending || updateClientMutation.isPending 
                    ? 'Saving...' 
                    : editingClient ? 'Update Client' : 'Add Client'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Client Details</h3>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Client Info */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center relative">
                  {selectedClient.photoUrl ? (
                    <img
                      src={selectedClient.photoUrl}
                      alt={selectedClient.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                  {getLoyaltyBadge(selectedClient.loyaltyStatus) && (
                    <div className="absolute -top-1 -right-1 bg-gray-800 p-1 rounded-full">
                      {getLoyaltyBadge(selectedClient.loyaltyStatus)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-white font-medium text-lg">{selectedClient.name}</h4>
                  <p className="text-gray-400 text-sm capitalize">{selectedClient.loyaltyStatus} Client</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-white">{selectedClient.phone}</span>
                </div>
                {selectedClient.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{selectedClient.email}</span>
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{selectedClient.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{selectedClient.totalVisits || 0}</p>
                  <p className="text-gray-400 text-sm">Total Visits</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">${selectedClient.totalSpent || '0.00'}</p>
                  <p className="text-gray-400 text-sm">Total Spent</p>
                </div>
              </div>

              {/* Preferences */}
              {selectedClient.preferredStyle && (
                <div>
                  <h5 className="text-white font-medium mb-2">Preferred Style</h5>
                  <p className="text-gray-400">{selectedClient.preferredStyle}</p>
                </div>
              )}

              {/* Notes */}
              {selectedClient.notes && (
                <div>
                  <h5 className="text-white font-medium mb-2">Notes</h5>
                  <p className="text-gray-400">{selectedClient.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleEdit(selectedClient)}
                  className="flex-1 bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600"
                >
                  Edit Client
                </button>
                <button
                  onClick={() => {
                    // Navigate to new appointment with this client
                    setSelectedClient(null);
                  }}
                  className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}