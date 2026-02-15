import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Minus, Plus, ShoppingCart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { products } from '@/mocks/products';
import { useCart } from '@/contexts/CartContext';

const { width, height } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);

  const product = products.find((p) => p.id === id);
  const cartQuantity = product ? getItemQuantity(product.id) : 0;

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Продукт не найден</Text>
      </View>
    );
  }

  const handleQuantityChange = (delta: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    addToCart(product, quantity);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.image} />
          <View style={styles.imageOverlay} />
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{product.name}</Text>
            {cartQuantity > 0 && (
              <View style={styles.inCartBadge}>
                <Text style={styles.inCartText}>В корзине: {cartQuantity}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.weight}>{product.weight}</Text>
            {product.heatingTime && (
              <View style={styles.heatingTime}>
                <Clock size={14} color={Colors.textMuted} />
                <Text style={styles.heatingTimeText}>{product.heatingTime}</Text>
              </View>
            )}
          </View>

          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Количество</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(-1)}
              >
                <Minus size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(1)}
              >
                <Plus size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Итого</Text>
          <Text style={styles.price}>{product.price * quantity} ₽</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToCart}
          activeOpacity={0.8}
        >
          <ShoppingCart size={20} color={Colors.text} />
          <Text style={styles.addButtonText}>В корзину</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  imageContainer: {
    width: width,
    height: height * 0.4,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    flex: 1,
  },
  inCartBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  inCartText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  weight: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  heatingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heatingTimeText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    minWidth: 40,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 16,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  price: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  addButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
