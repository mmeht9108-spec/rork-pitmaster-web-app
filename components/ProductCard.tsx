import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Flame, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Product } from '@/types/product';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';
import { formatGrams, getPricePerKg, getSubtotal, parseWeightGrams } from '@/utils/pricing';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);

  const baseWeightGrams = useMemo(() => parseWeightGrams(product.weight), [product.weight]);
  const pricePerKg = useMemo(
    () => getPricePerKg(product.price, baseWeightGrams),
    [product.price, baseWeightGrams]
  );
  const subtotal = useMemo(() => {
    const selectedGrams = quantity > 0 ? quantity : baseWeightGrams;
    return getSubtotal(product.price, baseWeightGrams, selectedGrams);
  }, [product.price, baseWeightGrams, quantity]);

  const handleAddToCart = () => {
    console.log('ProductCard add to cart', { productId: product.id, quantityBefore: quantity });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (quantity <= 0) {
      addToCart(product, 100);
      return;
    }
    updateQuantity(product.id, quantity + 100);
  };

  const handleDecrease = () => {
    console.log('ProductCard decrease quantity', { productId: product.id, quantityBefore: quantity });
    if (quantity <= 100) {
      updateQuantity(product.id, 0);
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateQuantity(product.id, quantity - 100);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      testID={`product-card-${product.id}`}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        {product.isPopular && (
          <View style={styles.popularBadge}>
            <Flame size={12} color={Colors.secondary} />
            <Text style={styles.popularText}>Хит</Text>
          </View>
        )}
        {quantity > 0 && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{formatGrams(quantity)}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.weight}>{product.weight}</Text>
        <Text style={styles.pricePerKg}>{pricePerKg} ₽/кг</Text>
        <View style={styles.nutriRow}>
          <Text style={styles.nutriLabel}>Б <Text style={styles.nutriValue}>{product.proteins}</Text></Text>
          <Text style={styles.nutriLabel}>Ж <Text style={styles.nutriValue}>{product.fats}</Text></Text>
          <Text style={styles.nutriLabel}>У <Text style={styles.nutriValue}>{product.carbs}</Text></Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{product.price} ₽</Text>
            <Text style={styles.subtotalLabel}>{subtotal} ₽</Text>
            {quantity > 0 && (
              <Text style={styles.quantityLabel}>{formatGrams(quantity)}</Text>
            )}
          </View>
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, quantity <= 0 ? styles.controlButtonDisabled : null]}
              onPress={handleDecrease}
              testID={`remove-from-cart-${product.id}`}
            >
              <Minus size={16} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleAddToCart}
              testID={`add-to-cart-${product.id}`}
            >
              <Plus size={16} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    height: cardWidth * 0.85,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  popularText: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  content: {
    padding: 12,
  },
  name: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  weight: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  pricePerKg: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  nutriRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 8,
  },
  nutriLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500' as const,
  },
  nutriValue: {
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  priceBlock: {
    gap: 4,
  },
  price: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  subtotalLabel: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  quantityLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlButton: {
    backgroundColor: Colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
});
