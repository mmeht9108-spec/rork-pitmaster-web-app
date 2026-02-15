import React from 'react';
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

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);

  const handleAddToCart = () => {
    console.log('ProductCard add to cart', { productId: product.id, quantityBefore: quantity });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    addToCart(product);
  };

  const handleDecrease = () => {
    console.log('ProductCard decrease quantity', { productId: product.id, quantityBefore: quantity });
    if (quantity <= 0) {
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateQuantity(product.id, quantity - 1);
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
            <Text style={styles.quantityText}>{quantity} шт.</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.weight}>{product.weight}</Text>
        <View style={styles.nutriRow}>
          <Text style={styles.nutriLabel}>Б <Text style={styles.nutriValue}>{product.proteins}</Text></Text>
          <Text style={styles.nutriLabel}>Ж <Text style={styles.nutriValue}>{product.fats}</Text></Text>
          <Text style={styles.nutriLabel}>У <Text style={styles.nutriValue}>{product.carbs}</Text></Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{product.price} ₽</Text>
            {quantity > 0 && <Text style={styles.quantityLabel}>{quantity} шт.</Text>}
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
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: Colors.text,
    fontSize: 12,
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
    marginBottom: 4,
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
