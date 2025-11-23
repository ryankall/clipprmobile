import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Image, TouchableOpacity, Modal, TextInput, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, API_BASE_URL } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { GalleryPhoto } from '../../lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../lib/theme';

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = (screenWidth - 32 - (numColumns - 1) * 8) / numColumns;

// Local storage constants
const LOCAL_PHOTOS_KEY = 'local_gallery_photos';

interface LocalPhoto {
  id: string;
  uri: string;
  filename: string;
  type: 'before' | 'after' | 'portfolio';
  description: string;
  isPublic: boolean;
  clientId?: number;
  createdAt: string;
}

export default function GalleryPage() {
  const [filterType, setFilterType] = useState<'all' | 'before' | 'after' | 'portfolio'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [newType, setNewType] = useState<'before' | 'after' | 'portfolio'>('portfolio');
  const [newDesc, setNewDesc] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [localPhotos, setLocalPhotos] = useState<LocalPhoto[]>([]);

  const queryClient = useQueryClient();

  // Fetch gallery photos
  const { data: photos = [], isLoading: loading } = useQuery<GalleryPhoto[]>({
    queryKey: ['/api/gallery'],
    queryFn: () => apiRequest<GalleryPhoto[]>('GET', '/api/gallery'),
  });

  // Fetch clients for selection
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest<any[]>('GET', '/api/clients'),
  });

  // Filter clients based on search query
  const filteredClients = clientSearchQuery
    ? clients.filter(client =>
        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        (client.phone && client.phone.includes(clientSearchQuery))
      )
    : clients;

  // Get selected client object
  const selectedClient = selectedClientId && clients.length > 0
    ? clients.find(client => client.id === selectedClientId)
    : null;

  // Delete photo mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/gallery/${id}`),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
    },
    onError: () => {
      // TODO: Show error
    },
  });

  // Filter photos by type
  const filteredPhotos: (LocalPhoto | GalleryPhoto)[] = filterType === 'all'
    ? [...localPhotos, ...photos]  // Combine local and server photos
    : [...localPhotos.filter((photo) => photo.type === filterType),
       ...photos.filter((photo) => photo.type === filterType)];

  // Helper function to get photo source
  const getPhotoSource = (photo: LocalPhoto | GalleryPhoto) => {
    if ('uri' in photo) {
      // Local photo
      return { uri: photo.uri };
    } else {
      // Server photo
      return {
        uri: photo.photoUrl
          ? photo.photoUrl
          : (typeof photo.filename === 'string' && photo.filename.startsWith('http')
              ? photo.filename
              : `${API_BASE_URL}/uploads/${photo.filename}`),
      };
    }
  };

  // Helper function to get photo name
  const getPhotoName = (photo: LocalPhoto | GalleryPhoto) => {
    if ('filename' in photo && !('originalName' in photo)) {
      // Local photo
      return photo.filename;
    } else {
      // Server photo
      return (photo as GalleryPhoto).originalName || 'Photo';
    }
  };

  // Helper function to handle photo deletion
  const handlePhotoDelete = async (photo: LocalPhoto | GalleryPhoto) => {
    if ('uri' in photo) {
      // Local photo - delete from local storage
      try {
        await FileSystem.deleteAsync(photo.uri, { idempotent: true });
        const updatedPhotos = localPhotos.filter(p => p.id !== photo.id);
        await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(updatedPhotos));
        setLocalPhotos(updatedPhotos);
        Alert.alert('Success', 'Photo deleted from device');
      } catch (error) {
        console.error('Failed to delete local photo:', error);
        Alert.alert('Error', 'Failed to delete photo from device');
      }
    } else {
      // Server photo - delete from server
      deleteMutation.mutate(photo.id);
    }
  };

  // Pick image from library
  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access media library is required!');
        return;
      }

      const result = await (ImagePicker as any).launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', `Error selecting image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      // Request camera permissions first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      const result = await (ImagePicker as any).launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', `Error taking photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Save photo locally
  const savePhotoLocally = async () => {
    if (!selectedImage) return;
    setSaving(true);
    try {
      const token = await getToken();
      
      // Create a unique filename for local storage
      const timestamp = Date.now();
      const filename = `local_photo_${timestamp}.jpg`;
      const localUri = `${FileSystem.documentDirectory}gallery/${filename}`;
      
      // Ensure the gallery directory exists
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}gallery`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}gallery`, { intermediates: true });
      }
      
      // Copy the selected image to local storage
      await FileSystem.copyAsync({
        from: selectedImage.uri,
        to: localUri
      });
      
      // Create local photo metadata
      const localPhoto: LocalPhoto = {
        id: timestamp.toString(),
        uri: localUri,
        filename,
        type: newType,
        description: newDesc,
        isPublic: newIsPublic,
        clientId: selectedClientId || undefined,
        createdAt: new Date().toISOString()
      };
      
      // Save metadata to AsyncStorage
      const existingPhotos = localPhotos;
      const updatedPhotos = [localPhoto, ...existingPhotos];
      await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(updatedPhotos));
      setLocalPhotos(updatedPhotos);
      
      // Send metadata to server (without the photo file)
      if (token) {
        const metadata = {
          id: localPhoto.id,
          type: newType,
          description: newDesc,
          isPublic: newIsPublic,
          clientId: selectedClientId || null,
          createdAt: localPhoto.createdAt,
          originalName: filename,
          localStorage: true // Flag to indicate this is locally stored
        };
        
        try {
          await fetch(`${API_BASE_URL}/api/gallery`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(metadata),
          });
        } catch (error) {
          console.warn('Failed to sync metadata to server, but photo is saved locally:', error);
        }
      }
      
      // Success - reset form and close modal
      setAddModalVisible(false);
      setSelectedImage(null);
      setNewDesc('');
      setNewType('portfolio');
      setNewIsPublic(false);
      setSelectedClientId(null);
      
      Alert.alert('Success', 'Photo saved locally and metadata synced!');
      
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Error', `Failed to save photo: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Load local photos on component mount
  useEffect(() => {
    const loadLocalPhotos = async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
        if (stored) {
          const parsedPhotos = JSON.parse(stored);
          setLocalPhotos(parsedPhotos);
        }
      } catch (error) {
        console.error('Failed to load local photos:', error);
      }
    };
    loadLocalPhotos();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color="#F59E0B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gallery (Local)</Text>
        </View>
      </View>
      {/* Add Photo Button */}
      <View style={styles.addPhotoBar}>
        <TouchableOpacity style={styles.addPhotoButton} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addPhotoButtonText}>+ Add Photo</Text>
        </TouchableOpacity>
      </View>
      {/* Filter and View Mode UI */}
      <View style={styles.topBar}>
        <View style={styles.filterContainer}>
          {['all', 'before', 'after', 'portfolio'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filterType === type && styles.filterButtonActive,
              ]}
              onPress={() => setFilterType(type as typeof filterType)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterType === type && styles.filterButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'grid' && styles.viewToggleButtonActive,
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[
              styles.viewToggleText,
              viewMode === 'grid' && styles.viewToggleTextActive,
            ]}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'list' && styles.viewToggleButtonActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[
              styles.viewToggleText,
              viewMode === 'list' && styles.viewToggleTextActive,
            ]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#22C55E" style={{ marginTop: 32 }} />
      ) : filteredPhotos.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <Text style={styles.emptyText}>No photos saved locally</Text>
          <Text style={[styles.emptyText, { fontSize: 14, marginTop: 8, color: '#666' }]}>
            Photos are saved on your device for privacy
          </Text>
        </View>
      ) : viewMode === 'grid' ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {filteredPhotos.map((photo) => (
            <View key={photo.id} style={styles.imageWrapper}>
              <Image
                source={getPhotoSource(photo)}
                style={styles.image}
                resizeMode="cover"
                accessibilityLabel={getPhotoName(photo)}
              />
              <Text style={styles.caption}>{getPhotoName(photo)}</Text>
              {'uri' in photo && (
                <View style={styles.localBadge}>
                  <Text style={styles.localBadgeText}>LOCAL</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handlePhotoDelete(photo)}
                disabled={typeof photo.id === 'number' && deletingId === photo.id}
              >
                <Text style={styles.deleteButtonText}>
                  {typeof photo.id === 'number' && deletingId === photo.id ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredPhotos.map((photo) => (
            <View key={photo.id} style={styles.listItem}>
              <Image
                source={getPhotoSource(photo)}
                style={styles.listImage}
                resizeMode="cover"
                accessibilityLabel={getPhotoName(photo)}
              />
              <View style={styles.listInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.listTitle}>{getPhotoName(photo)}</Text>
                  {'uri' in photo && (
                    <View style={styles.listLocalBadge}>
                      <Text style={styles.listLocalBadgeText}>LOCAL</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.listType}>{photo.type}</Text>
                {photo.description && (
                  <Text style={styles.listDesc}>{photo.description}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handlePhotoDelete(photo)}
                disabled={typeof photo.id === 'number' && deletingId === photo.id}
              >
                <Text style={styles.deleteButtonText}>
                  {typeof photo.id === 'number' && deletingId === photo.id ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      {/* Add Photo Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Photo</Text>
            
            {/* Image Selection Buttons */}
            <View style={styles.imageSelectionContainer}>
              <TouchableOpacity style={[styles.addPhotoButton, styles.libraryButton]} onPress={pickImage}>
                <Ionicons name="images" size={20} color="#fff" />
                <Text style={styles.addPhotoButtonText}>
                  {selectedImage ? 'Change Image' : 'Gallery'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addPhotoButton, styles.cameraButton]} onPress={takePhoto}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.addPhotoButtonText}>
                  {selectedImage ? 'Retake' : 'Camera'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {selectedImage && (
              <Image
                source={{ uri: selectedImage.uri }}
                style={{ width: 120, height: 120, borderRadius: 8, marginVertical: 12 }}
              />
            )}
            
            {/* Client Selection */}
            <View style={styles.clientSelectionContainer}>
              <Text style={styles.modalLabel}>Client (Optional)</Text>
              <TouchableOpacity
                style={styles.clientDropdownButton}
                onPress={() => setShowClientList(!showClientList)}
              >
                <Text style={[
                  styles.clientDropdownText,
                  selectedClient && { color: '#fff' }
                ]}>
                  {selectedClient ? selectedClient.name : 'Select Client'}
                </Text>
                <Ionicons name={showClientList ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
              
              {showClientList && (
                <View style={styles.clientListContainer}>
                  <TextInput
                    style={styles.clientSearchInput}
                    placeholder="Search clients..."
                    placeholderTextColor="#888"
                    value={clientSearchQuery}
                    onChangeText={setClientSearchQuery}
                  />
                  
                  <ScrollView style={styles.inlineClientList} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[
                        styles.clientListItem,
                        selectedClientId === null && styles.clientListItemSelected
                      ]}
                      onPress={() => {
                        setSelectedClientId(null);
                        setShowClientList(false);
                      }}
                    >
                      <Text style={styles.clientListItemText}>No Client</Text>
                    </TouchableOpacity>
                    
                    {filteredClients.map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        style={[
                          styles.clientListItem,
                          selectedClientId === client.id && styles.clientListItemSelected
                        ]}
                        onPress={() => {
                          setSelectedClientId(client.id);
                          setShowClientList(false);
                          setClientSearchQuery('');
                        }}
                      >
                        <Text style={styles.clientListItemText}>
                          {client.name}
                          {client.phone && ` -- ${client.phone}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    
                    {filteredClients.length === 0 && clientSearchQuery && (
                      <Text style={styles.emptyText}>No clients found</Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              placeholderTextColor="#888"
              value={newDesc}
              onChangeText={setNewDesc}
            />
            
            <View style={styles.modalSwitchRow}>
              <Text style={{ color: '#fff', fontSize: 15 }}>Type:</Text>
              {(['before', 'after', 'portfolio'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterButton,
                    newType === type && styles.filterButtonActive,
                  ]}
                  onPress={() => setNewType(type)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      newType === type && styles.filterButtonTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalSwitchRow}>
              <Text style={{ color: '#fff', fontSize: 15 }}>Public:</Text>
              <Switch
                value={newIsPublic}
                onValueChange={setNewIsPublic}
                thumbColor={newIsPublic ? "#22C55E" : "#888"}
                trackColor={{ false: "#444", true: "#22C55E" }}
              />
            </View>
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setAddModalVisible(false);
                  setSelectedImage(null);
                  setNewDesc('');
                  setNewType('portfolio');
                  setNewIsPublic(false);
                  setSelectedClientId(null);
                }}
                disabled={saving}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  (!selectedImage || saving) && styles.modalButtonDisabled
                ]}
                onPress={savePhotoLocally}
                disabled={!selectedImage || saving}
              >
                <Text style={[
                  styles.modalButtonText,
                  (!selectedImage || saving) && styles.modalButtonTextDisabled
                ]}>
                  {saving ? 'Saving...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#222',
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: '#22C55E',
  },
  filterButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#222',
    marginLeft: 4,
  },
  viewToggleButtonActive: {
    backgroundColor: '#22C55E',
  },
  viewToggleText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  imageWrapper: {
    width: imageSize,
    marginBottom: 12,
    marginRight: 8,
    backgroundColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
  },
  caption: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  localBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  localBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  listLocalBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  listLocalBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  list: {
    flexDirection: 'column',
    gap: 8,
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
    gap: 12,
  },
  listImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  listInfo: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  listTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listType: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  listDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  addPhotoBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  addPhotoButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteButton: {
    marginTop: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 12,
  },
  modalSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#444',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.6,
  },
  modalButtonTextDisabled: {
    color: '#999',
  },
  imageSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  libraryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
  },
  clientSelectionContainer: {
    width: '100%',
    marginBottom: 16,
  },
  modalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  clientScrollView: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  clientOption: {
    backgroundColor: '#444',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clientOptionSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  clientOptionText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  clientOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  clientDropdownButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#444',
  },
  clientDropdownText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  clientSearchModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // Higher z-index
  },
  clientSearchContent: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  clientSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  clientSearchTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  clientSearchInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  clientList: {
    maxHeight: 300,
  },
  clientListItem: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clientListItemSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  clientListItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#444',
    borderRadius: 20,
    padding: 8,
  },
  clientListContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
  },
  inlineClientList: {
    maxHeight: 160,
  },
});