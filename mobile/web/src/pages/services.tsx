import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Scissors, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  DollarSign,
  X,
  Eye,
  EyeOff,
  Tag,
  Search,
  Filter
} from 'lucide-react';

interface Service {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const serviceCategories = [
  'Haircuts',
  'Beard Services',
  'Styling',
  'Treatments',
  'Combos',
  'Other'
];

export default function MobileServices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: 30,
    category: 'Haircuts',
    description: '',
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch services
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add service mutation
  const addServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setShowAddModal(false);
      resetForm();
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setEditingService(null);
      resetForm();
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      if (!response.ok) throw new Error('Failed to delete service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    },
  });

  // Toggle service active status
  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to update service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    },
  });

  // Filter services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group services by category
  const servicesByCategory = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      duration: 30,
      category: 'Haircuts',
      description: '',
      isActive: true
    });
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateServiceMutation.mutate({
        id: editingService.id,
        data: formData
      });
    } else {
      addServiceMutation.mutate(formData);
    }
  };

  // Open edit modal
  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: service.price,
      duration: service.duration,
      category: service.category,
      description: service.description || '',
      isActive: service.isActive
    });
  };

  // Format price for display
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Scissors className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Services</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600"
        >
          <Plus className="w-4 h-4 mr-2 inline" />
          Add Service
        </button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">All Categories</option>
            {serviceCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{services.length}</p>
          <p className="text-gray-400 text-sm">Total Services</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{services.filter(s => s.isActive).length}</p>
          <p className="text-gray-400 text-sm">Active</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{services.filter(s => !s.isActive).length}</p>
          <p className="text-gray-400 text-sm">Inactive</p>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-6">
        {filteredServices.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              {searchTerm || categoryFilter !== 'all' 
                ? 'No services found matching your criteria.' 
                : 'No services added yet.'
              }
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Your First Service
            </button>
          </div>
        ) : (
          Object.entries(servicesByCategory).map(([category, categoryServices]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-white font-semibold text-lg">{category}</h3>
              <div className="space-y-3">
                {categoryServices.map((service) => (
                  <div
                    key={service.id}
                    className={`bg-gray-800 border border-gray-700 rounded-xl p-4 transition-opacity ${
                      !service.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-white font-medium">{service.name}</h4>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleServiceMutation.mutate({
                                id: service.id,
                                isActive: !service.isActive
                              })}
                              className="text-gray-400 hover:text-white"
                            >
                              {service.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              service.isActive 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {service.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        
                        {service.description && (
                          <p className="text-gray-400 text-sm mt-1">{service.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-amber-500 font-medium flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {formatPrice(service.price)}
                          </span>
                          <span className="text-gray-400 text-sm flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {service.duration} min
                          </span>
                          <span className="text-gray-400 text-sm flex items-center">
                            <Tag className="w-4 h-4 mr-1" />
                            {service.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(service)}
                          className="text-gray-400 hover:text-white p-2"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this service?')) {
                              deleteServiceMutation.mutate(service.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-400 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingService) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingService(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium">Service Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="e.g., Buzz Cut, Beard Trim"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium">Price *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    placeholder="25.00"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium">Duration (min) *</label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                    className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    placeholder="30"
                  />
                </div>
              </div>

              <div>
                <label className="text-white text-sm font-medium">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {serviceCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Optional description of the service..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                />
                <label htmlFor="isActive" className="text-white text-sm font-medium">
                  Active (visible to clients)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingService(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addServiceMutation.isPending || updateServiceMutation.isPending}
                  className="flex-1 bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {addServiceMutation.isPending || updateServiceMutation.isPending 
                    ? 'Saving...' 
                    : editingService ? 'Update Service' : 'Add Service'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}