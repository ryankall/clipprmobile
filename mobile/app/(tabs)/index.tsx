import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  const stats = [
    { title: 'Today\'s Earnings', value: '$0.00', icon: 'cash' },
    { title: 'Appointments', value: '0', icon: 'calendar' },
    { title: 'New Messages', value: '10', icon: 'chatbubble' },
    { title: 'Clients', value: '6', icon: 'people' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 py-6">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-foreground mb-2">
            Good evening, Ryan! 👋
          </Text>
          <Text className="text-muted-foreground">
            Here's what's happening today
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between mb-6">
          {stats.map((stat, index) => (
            <View key={index} className="bg-card rounded-lg p-4 w-[48%] mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-foreground mb-1">
                    {stat.value}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {stat.title}
                  </Text>
                </View>
                <Ionicons 
                  name={stat.icon as any} 
                  size={24} 
                  color="#22c55e" 
                />
              </View>
            </View>
          ))}
        </View>

        <View className="bg-card rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">
            Quick Actions
          </Text>
          <View className="space-y-3">
            <TouchableOpacity className="bg-primary rounded-lg p-3">
              <Text className="text-primary-foreground font-semibold text-center">
                New Appointment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-secondary rounded-lg p-3">
              <Text className="text-secondary-foreground font-semibold text-center">
                Add Client
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-card rounded-lg p-4">
          <Text className="text-lg font-semibold text-foreground mb-3">
            Recent Activity
          </Text>
          <Text className="text-muted-foreground text-center py-4">
            No recent activity
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}