import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Image, TouchableOpacity, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest, API_BASE_URL } from '../../lib/api';
import { GalleryPhoto } from '../../lib/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../lib/theme';

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = (screenWidth - 32 - (numColumns - 1) * 8) / numColumns;

export default function GalleryPage() {
  const [filterType, setFilterType] = useState<'all' | 'before' | 'after' | 'portfolio'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [newType, setNewType] = useState<'before' | 'after' | 'portfolio'>('portfolio');
  const [newDesc, setNewDesc] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Fetch gallery photos
  const { data: photos = [], isLoading: loading } = useQuery<GalleryPhoto[]>({
    queryKey: ['/api/gallery'],
    queryFn: () => apiRequest<GalleryPhoto[]>('GET', '/api/gallery'),
  });

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
  const filteredPhotos = filterType === 'all'
    ? photos
    : photos.filter((photo) => photo.type === filterType);

  // Pick image from library
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
    }
  };

  // Upload photo
  const uploadPhoto = async () => {
    if (!selectedImage) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: selectedImage.uri,
        name: selectedImage.fileName || 'photo.jpg',
        type: selectedImage.type || 'image/jpeg',
      } as any);
      formData.append('type', newType);
      formData.append('description', newDesc);
      formData.append('isPublic', newIsPublic ? 'true' : 'false');
      // TODO: Add clientId if needed

      const res = await fetch(`${API_BASE_URL}/api/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      setAddModalVisible(false);
      setSelectedImage(null);
      setNewDesc('');
      setNewType('portfolio');
      setNewIsPublic(false);
      // Refresh gallery
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
    } catch (e) {
      // TODO: Show error
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color="#F59E0B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gallery</Text>
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
        <Text style={styles.emptyText}>No photos uploaded yet</Text>
      ) : viewMode === 'grid' ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {filteredPhotos.map((photo) => (
            <View key={photo.id} style={styles.imageWrapper}>
              <Image
                source={{
                  uri: photo.photoUrl
                    ? photo.photoUrl
                    : (typeof photo.filename === 'string' && photo.filename.startsWith('http')
                        ? photo.filename
                        : `${API_BASE_URL}/uploads/${photo.filename}`),
                }}
                style={styles.image}
                resizeMode="cover"
                accessibilityLabel={photo.originalName || "Portfolio work"}
              />
              {photo.originalName && (
                <Text style={styles.caption}>{photo.originalName}</Text>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteMutation.mutate(photo.id)}
                disabled={deletingId === photo.id}
              >
                <Text style={styles.deleteButtonText}>
                  {deletingId === photo.id ? 'Deleting...' : 'Delete'}
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
                source={{
                  uri: photo.photoUrl
                    ? photo.photoUrl
                    : (typeof photo.filename === 'string' && photo.filename.startsWith('http')
                        ? photo.filename
                        : `${API_BASE_URL}/uploads/${photo.filename}`),
                }}
                style={styles.listImage}
                resizeMode="cover"
                accessibilityLabel={photo.originalName || "Portfolio work"}
              />
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{photo.originalName || 'Photo'}</Text>
                <Text style={styles.listType}>{photo.type}</Text>
                {photo.description && (
                  <Text style={styles.listDesc}>{photo.description}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteMutation.mutate(photo.id)}
                disabled={deletingId === photo.id}
              >
                <Text style={styles.deleteButtonText}>
                  {deletingId === photo.id ? 'Deleting...' : 'Delete'}
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
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <Text style={styles.addPhotoButtonText}>
                {selectedImage ? 'Change Image' : 'Pick Image'}
              </Text>
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage.uri }}
                style={{ width: 120, height: 120, borderRadius: 8, marginVertical: 12 }}
              />
            )}
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
                }}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={uploadPhoto}
                disabled={!selectedImage || uploading}
              >
                <Text style={styles.modalButtonText}>
                  {uploading ? 'Uploading...' : 'Add'}
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
});