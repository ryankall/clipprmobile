import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../lib/api';
import { GalleryPhoto } from '../../lib/types';

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = (screenWidth - 32 - (numColumns - 1) * 8) / numColumns;

export default function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest<GalleryPhoto[]>('GET', '/api/gallery')
      .then((data) => setPhotos(data || []))
      .catch((err) => {
        console.error('Failed to load gallery photos:', err);
        setPhotos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Gallery</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#22C55E" style={{ marginTop: 32 }} />
      ) : photos.length === 0 ? (
        <Text style={styles.emptyText}>No photos uploaded yet</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.imageWrapper}>
              <Image
                source={{
                  uri:
                    typeof photo.filename === 'string' && photo.filename.startsWith('http')
                      ? photo.filename
                      : `${photo.filename}`,
                }}
                style={styles.image}
                resizeMode="cover"
                accessibilityLabel={photo.originalName || "Portfolio work"}
              />
              {photo.originalName && (
                <Text style={styles.caption}>{photo.originalName}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
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
});