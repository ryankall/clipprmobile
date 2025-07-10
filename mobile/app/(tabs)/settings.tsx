import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Settings() {
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => router.replace('/') }
      ]
    );
  };

  const settingsItems = [
    { title: 'Profile', icon: 'person', screen: null },
    { title: 'Working Hours', icon: 'time', screen: null },
    { title: 'Notifications', icon: 'notifications', screen: null },
    { title: 'Payment Settings', icon: 'card', screen: null },
    { title: 'Backup & Sync', icon: 'cloud', screen: null },
    { title: 'Privacy & Security', icon: 'shield', screen: null },
    { title: 'Help & Support', icon: 'help-circle', screen: null },
    { title: 'About', icon: 'information-circle', screen: null },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 py-6">
        <Text className="text-2xl font-bold text-foreground mb-6">
          Settings
        </Text>

        <View className="bg-card rounded-lg p-4 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 bg-primary rounded-full items-center justify-center mr-4">
              <Text className="text-primary-foreground font-bold text-2xl">
                R
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-semibold text-lg">
                Ryan Miller
              </Text>
              <Text className="text-muted-foreground">
                ryan11432@gmail.com
              </Text>
              <Text className="text-muted-foreground">
                (646) 789-1820
              </Text>
            </View>
          </View>
          <TouchableOpacity className="bg-secondary rounded-lg p-3">
            <Text className="text-secondary-foreground font-semibold text-center">
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-card rounded-lg p-4 mb-6">
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="flex-row items-center py-4 border-b border-border"
            >
              <Ionicons name={item.icon as any} size={24} color="#22c55e" />
              <Text className="text-foreground font-semibold text-lg ml-4 flex-1">
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          className="bg-destructive rounded-lg p-4 mb-6"
          onPress={handleSignOut}
        >
          <Text className="text-destructive-foreground font-semibold text-center">
            Sign Out
          </Text>
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-muted-foreground text-sm">
            Clippr Mobile v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}