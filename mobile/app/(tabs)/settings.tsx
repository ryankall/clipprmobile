import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../lib/api';
import { User } from '../../lib/types';

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserProfile();
    }
  }, [isAuthenticated]);

  const loadUserProfile = async () => {
    try {
      const data = await apiRequest<User>('GET', '/api/user/profile');
      setUser(data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth');
          }
        }
      ]
    );
  };

  const settingsItems = [
    {
      title: 'Profile',
      subtitle: 'Edit your personal information',
      icon: 'person-outline',
      onPress: () => router.push('/profile/edit'),
    },
    {
      title: 'Business Settings',
      subtitle: 'Manage your business details',
      icon: 'business-outline',
      onPress: () => router.push('/business/settings'),
    },
    {
      title: 'Working Hours',
      subtitle: 'Set your availability',
      icon: 'time-outline',
      onPress: () => router.push('/working-hours'),
    },
    {
      title: 'Notifications',
      subtitle: 'Manage push notifications',
      icon: 'notifications-outline',
      onPress: () => router.push('/notifications/settings'),
    },
    {
      title: 'Gallery',
      subtitle: 'Manage your portfolio',
      icon: 'camera-outline',
      onPress: () => router.push('/gallery'),
    },
    {
      title: 'Invoices',
      subtitle: 'View and manage invoices',
      icon: 'receipt-outline',
      onPress: () => router.push('/invoices'),
    },
    {
      title: 'Messages',
      subtitle: 'Client booking requests',
      icon: 'chatbubbles-outline',
      onPress: () => router.push('/messages'),
    },
    {
      title: 'Booking Link',
      subtitle: 'Share your booking page',
      icon: 'link-outline',
      onPress: () => router.push('/booking-link'),
    },
    {
      title: 'Premium Plan',
      subtitle: 'Upgrade your account',
      icon: 'star-outline',
      onPress: () => router.push('/premium'),
    },
  ];

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authPromptText}>Please sign in to access settings</Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        {user && (
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                {user.businessName && (
                  <Text style={styles.profileBusiness}>{user.businessName}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Settings Items */}
        <View style={styles.settingsSection}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.settingsItem,
                index === settingsItems.length - 1 && styles.lastSettingsItem
              ]}
              onPress={item.onPress}
            >
              <View style={styles.settingsItemLeft}>
                <Ionicons name={item.icon as any} size={24} color="#9CA3AF" />
                <View style={styles.settingsItemText}>
                  <Text style={styles.settingsItemTitle}>{item.title}</Text>
                  <Text style={styles.settingsItemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Clippr Mobile v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2025 Clippr. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    backgroundColor: '#22C55E',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  profileBusiness: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  lastSettingsItem: {
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemText: {
    marginLeft: 12,
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  signOutSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 24,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 12,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appInfoText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authPromptText: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});