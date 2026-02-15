import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';

export default function CartButton() {
  const router = useRouter();
  const { totalItems } = useCart();

  if (totalItems === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/cart')}
      activeOpacity={0.9}
      testID="cart-button"
    >
      <View style={styles.iconWrapper}>
        <ShoppingCart size={22} color={Colors.text} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalItems}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: Colors.secondary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: '700' as const,
  },
});
