import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface CategoryPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

export default function CategoryPill({ label, isActive, onPress }: CategoryPillProps) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.pill, isActive && styles.pillActive]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, isActive && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    marginRight: 10,
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  textActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
});
