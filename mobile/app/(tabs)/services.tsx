import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Services() {
  const services = [
    { id: 1, name: 'Buzz Cut', price: '$25.00', duration: '30 min', category: 'Haircuts' },
    { id: 2, name: 'Fade Cut', price: '$35.00', duration: '45 min', category: 'Haircuts' },
    { id: 3, name: 'Beard Trim', price: '$20.00', duration: '20 min', category: 'Beard Services' },
    { id: 4, name: 'Line Up', price: '$15.00', duration: '15 min', category: 'Beard Services' },
    { id: 5, name: 'Cut + Beard', price: '$45.00', duration: '60 min', category: 'Combos' },
    { id: 6, name: 'Full Service', price: '$60.00', duration: '90 min', category: 'Combos' },
    { id: 7, name: 'Eyebrow Trim', price: '$10.00', duration: '10 min', category: 'Extras' },
    { id: 8, name: 'Consultation', price: '$0.00', duration: '15 min', category: 'Extras' },
  ];

  const categories = [...new Set(services.map(s => s.category))];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 py-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-foreground">
            Services
          </Text>
          <TouchableOpacity className="bg-primary rounded-lg p-3">
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {categories.map((category) => (
          <View key={category} className="bg-card rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-foreground mb-4">
              {category}
            </Text>
            
            {services
              .filter(service => service.category === category)
              .map((service) => (
                <TouchableOpacity
                  key={service.id}
                  className="flex-row items-center justify-between py-4 border-b border-border"
                >
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold text-lg">
                      {service.name}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      {service.duration}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-primary font-bold text-lg">
                      {service.price}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        ))}

        <TouchableOpacity className="bg-secondary rounded-lg p-4">
          <Text className="text-secondary-foreground font-semibold text-center">
            Manage Service Categories
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}