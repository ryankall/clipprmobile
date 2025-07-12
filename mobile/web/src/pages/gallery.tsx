import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Camera, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  X,
  Upload,
  Grid,
  List,
  Search,
  Filter,
  Heart,
  Star,
  Share2,
  Download
} from 'lucide-react';

interface GalleryPhoto {
  id: number;
  userId: number;
  clientId: number;
  photoUrl: string;
  description?: string;
  isPublic: boolean;
  category: string;
  createdAt: string;
  client?: {
    id: number;
    name: string;
    phone: string;
  };
}

interface ClientWithRelations {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

const photoCategories = [
  'Before & After',
  'Haircuts',
  'Beard Work',
  'Styling',
  'Color',
  'Special Occasions',
  'Portfolio',
  'Other'
];

export default function MobileGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    category: 'Portfolio',
    isPublic: true,
    clientId: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // Fetch gallery photos
  const { data: photos = [], isLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ['/api/gallery'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch clients for selection
  const { data: clients = [] } = useQuery<ClientWithRelations[]>({
    queryKey: ['/api/clients'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: data,
      });
      if (!response.ok) throw new Error('Failed to add photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setShowAddModal(false);
      resetForm();
    },
  });

  // Update photo mutation
  const updatePhotoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/gallery/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setEditingPhoto(null);
      resetForm();
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/gallery/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      if (!response.ok) throw new Error('Failed to delete photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setSelectedPhoto(null);
    },
  });

  // Toggle photo visibility
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: number; isPublic: boolean }) => {
      const response = await fetch(`/api/gallery/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) throw new Error('Failed to update photo visibility');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
    },
  });

  // Filter photos
  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || photo.category === categoryFilter;
    const matchesVisibility = visibilityFilter === 'all' || 
                             (visibilityFilter === 'public' && photo.isPublic) ||
                             (visibilityFilter === 'private' && !photo.isPublic);
    
    return matchesSearch && matchesCategory && matchesVisibility;
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      description: '',
      category: 'Portfolio',
      isPublic: true,
      clientId: ''
    });
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPhoto) {
      updatePhotoMutation.mutate({
        id: editingPhoto.id,
        data: formData
      });
    } else {
      const fileInput = fileInputRef.current;
      const file = fileInput?.files?.[0];
      
      if (!file) {
        alert('Please select a photo to upload');
        return;
      }
      
      const formDataToSend = new FormData();
      formDataToSend.append('photo', file);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('isPublic', formData.isPublic.toString());
      if (formData.clientId) {
        formDataToSend.append('clientId', formData.clientId);
      }
      
      addPhotoMutation.mutate(formDataToSend);
    }
  };

  // Open edit modal
  const handleEdit = (photo: GalleryPhoto) => {
    setEditingPhoto(photo);
    setFormData({
      description: photo.description || '',
      category: photo.category,
      isPublic: photo.isPublic,
      clientId: photo.clientId?.toString() || ''
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading gallery...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Camera className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Gallery</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600"
        >
          <Plus className="w-4 h-4 mr-2 inline" />
          Add Photo
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search photos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Categories</option>
              {photoCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">All Photos</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-amber-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-amber-500 text-gray-900' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{photos.length}</p>
          <p className="text-gray-400 text-sm">Total Photos</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{photos.filter(p => p.isPublic).length}</p>
          <p className="text-gray-400 text-sm">Public</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{photos.filter(p => !p.isPublic).length}</p>
          <p className="text-gray-400 text-sm">Private</p>
        </div>
      </div>

      {/* Photos Gallery */}
      <div className="space-y-4">
        {filteredPhotos.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              {searchTerm || categoryFilter !== 'all' || visibilityFilter !== 'all'
                ? 'No photos found matching your criteria.'
                : 'No photos in your gallery yet.'
              }
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Your First Photo
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-750 transition-colors"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-square relative">
                  <img
                    src={photo.photoUrl}
                    alt={photo.description}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    {photo.isPublic ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white font-medium text-sm line-clamp-2">
                    {photo.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-amber-500 text-xs">{photo.category}</span>
                    <span className="text-gray-400 text-xs">{formatDate(photo.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition-colors"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={photo.photoUrl}
                    alt={photo.description}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">
                        {photo.description || 'No description'}
                      </p>
                      <div className="flex items-center space-x-2">
                        {photo.isPublic ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(photo);
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-amber-500 text-sm">{photo.category}</span>
                      {photo.client && (
                        <span className="text-gray-400 text-sm">{photo.client.name}</span>
                      )}
                      <span className="text-gray-400 text-sm">{formatDate(photo.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingPhoto) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editingPhoto ? 'Edit Photo' : 'Add New Photo'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPhoto(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingPhoto && (
                <div>
                  <label className="text-white text-sm font-medium">Photo *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {previewUrl ? (
                    <div className="relative mt-2">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center mt-2">
                      <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400 mb-4">Upload a photo</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-amber-600"
                      >
                        <Upload className="w-4 h-4 mr-2 inline" />
                        Choose Photo
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-white text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="Describe this photo..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {photoCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white text-sm font-medium">Client (optional)</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  className="w-full mt-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                />
                <label htmlFor="isPublic" className="text-white text-sm font-medium">
                  Make this photo public (visible to clients)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPhoto(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPhotoMutation.isPending || updatePhotoMutation.isPending}
                  className="flex-1 bg-amber-500 text-gray-900 py-2 px-4 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {addPhotoMutation.isPending || updatePhotoMutation.isPending 
                    ? 'Saving...' 
                    : editingPhoto ? 'Update Photo' : 'Add Photo'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Photo Details</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.description}
                className="w-full h-64 object-cover rounded-lg"
              />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Category</span>
                  <span className="text-white">{selectedPhoto.category}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Visibility</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white">
                      {selectedPhoto.isPublic ? 'Public' : 'Private'}
                    </span>
                    <button
                      onClick={() => toggleVisibilityMutation.mutate({
                        id: selectedPhoto.id,
                        isPublic: !selectedPhoto.isPublic
                      })}
                      className="text-gray-400 hover:text-white"
                    >
                      {selectedPhoto.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                {selectedPhoto.client && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Client</span>
                    <span className="text-white">{selectedPhoto.client.name}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Added</span>
                  <span className="text-white">{formatDate(selectedPhoto.createdAt)}</span>
                </div>
              </div>
              
              {selectedPhoto.description && (
                <div>
                  <h5 className="text-white font-medium mb-2">Description</h5>
                  <p className="text-gray-300 text-sm">{selectedPhoto.description}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(selectedPhoto)}
                  className="flex-1 bg-amber-500 text-gray-900 py-2 rounded-lg hover:bg-amber-600"
                >
                  Edit Photo
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this photo?')) {
                      deletePhotoMutation.mutate(selectedPhoto.id);
                    }
                  }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  Delete Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}