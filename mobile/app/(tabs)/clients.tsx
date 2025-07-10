import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Clients() {
  const clients = [
    { id: 1, name: 'John Smith', phone: '(555) 123-4567', lastVisit: '2 days ago' },
    { id: 2, name: 'Mike Johnson', phone: '(555) 987-6543', lastVisit: '1 week ago' },
    { id: 3, name: 'David Brown', phone: '(555) 456-7890', lastVisit: '2 weeks ago' },
    { id: 4, name: 'Chris Wilson', phone: '(555) 321-0987', lastVisit: '3 weeks ago' },
    { id: 5, name: 'Alex Davis', phone: '(555) 654-3210', lastVisit: '1 month ago' },
    { id: 6, name: 'Ryan Miller', phone: '(555) 789-0123', lastVisit: '1 month ago' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 py-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-foreground">
            Clients
          </Text>
          <TouchableOpacity className="bg-primary rounded-lg p-3">
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="bg-card rounded-lg p-4 mb-6">
          <TextInput
            className="bg-input border border-border rounded-lg px-4 py-3 text-foreground"
            placeholder="Search clients..."
            placeholderTextColor="#666"
          />
        </View>

        <View className="bg-card rounded-lg p-4">
          <Text className="text-lg font-semibold text-foreground mb-4">
            All Clients ({clients.length})
          </Text>
          
          {clients.map((client) => (
            <TouchableOpacity
              key={client.id}
              className="flex-row items-center py-4 border-b border-border"
            >
              <View className="w-12 h-12 bg-primary rounded-full items-center justify-center mr-4">
                <Text className="text-primary-foreground font-bold text-lg">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-lg">
                  {client.name}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {client.phone}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  Last visit: {client.lastVisit}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}