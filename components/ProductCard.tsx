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
import { getPricePerKg, getSubtotal, parseWeightGrams } from '@/utils/pricing';

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
    if (quantity <= 0) return 0;
    return getSubtotal(product.price, baseWeightGrams, quantity);
  }, [product.price, baseWeightGrams, quantity]);

  const handleAdd = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (quantity <= 0) {
      addToCart(product, 100);
    } else {
      updateQuantity(product.id, quantity + 100);
    }
  };

  const handleDecrease = () => {
    if (quantity <= 0) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (quantity <= 100) {
      updateQuantity(product.id, 0);
    } else {
      updateQuantity(product.id, quantity - 100);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
      testID={`product-card-${product.id}`}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        {product.isPopular && (
          <View style={styles.popularBadge}>
            <Flame size={11} color={Colors.secondary} />
            <Text style={styles.popularText}>Хит</Text>
          </View>
        )}
        {quantity > 0 && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityBadgeText}>{quantity} г</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.pricePerKg}>{pricePerKg} ₽/кг</Text>

        <View style={styles.footer}>
          <View style={styles.leftBlock}>
            {quantity > 0 ? (
              <>
                <Text style={styles.selectedWeight}>{quantity} г</Text>
                <Text style={styles.subtotal}>{subtotal} ₽</Text>
              </>
            ) : (
              <Text style={styles.basePrice}>{product.price} ₽</Text>
            )}
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.btn, styles.btnMinus, quantity <= 0 && styles.btnDisabled]}
              onPress={handleDecrease}
              disabled={quantity <= 0}
              testID={`remove-from-cart-${product.id}`}
            >
              <Minus size={14} color={quantity <= 0 ? Colors.textMuted : Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPlus]}
              onPress={handleAdd}
              testID={`add-to-cart-${product.id}`}
            >
              <Plus size={14} color={Colors.text} />
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
    resizeMode: 'cover',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  popularText: {
    color: Colors.secondary,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  quantityBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  content: {
    padding: 10,
    paddingTop: 8,
  },
  name: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    marginBottom: 3,
  },
  pricePerKg: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftBlock: {
    flex: 1,
    gap: 1,
  },
  selectedWeight: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  subtotal: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  basePrice: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPlus: {
    backgroundColor: Colors.primary,
  },
  btnMinus: {
    backgroundColor: Colors.surfaceLight,
  },
  btnDisabled: {
    opacity: 0.35,
  },
});
