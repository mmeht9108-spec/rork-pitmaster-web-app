import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Animated, Platform } from 'react-native';
import { ShoppingCart, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';

export default function CartButton() {
  const router = useRouter();
  const { totalItems, totalPrice } = useCart();
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: totalItems > 0 ? 0 : 100,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [totalItems, slideAnim]);

  if (totalItems === 0) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={() => router.push('/cart' as any)}
        activeOpacity={0.85}
        testID="cart-button"
      >
        <View style={styles.left}>
          <View style={styles.iconBadgeWrap}>
            <ShoppingCart size={20} color="#fff" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItems}</Text>
            </View>
          </View>
          <Text style={styles.label}>Оформить заказ</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{totalPrice} ₽</Text>
          <ArrowRight size={18} color="#fff" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 70 : 90,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadgeWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -9,
    backgroundColor: Colors.secondary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
