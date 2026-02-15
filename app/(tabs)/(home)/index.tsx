import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { products, categories } from '@/mocks/products';
import ProductCard from '@/components/ProductCard';
import CategoryPill from '@/components/CategoryPill';
import CartButton from '@/components/CartButton';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('Все');

  const popularProducts = useMemo(
    () => products.filter((p) => p.isPopular),
    []
  );

  const filteredProducts = useMemo(
    () =>
      selectedCategory === 'Все'
        ? products
        : products.filter((p) => p.category === selectedCategory),
    [selectedCategory]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.primary} />
                <Text style={styles.location}>Владивосток</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.heroBanner} activeOpacity={0.9}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80',
              }}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.heroOverlay}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Настоящий{'\n'}техасский BBQ</Text>
              <Text style={styles.heroSubtitle}>
                Томлёное мясо с доставкой до двери
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Популярное</Text>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => router.push('/(tabs)/menu')}
              >
                <Text style={styles.seeAllText}>Все</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularScroll}
            >
              {popularProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.popularCard}
                  onPress={() => router.push(`/(tabs)/(home)/product/${product.id}`)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: product.image }}
                    style={styles.popularImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.popularGradient}
                  />
                  <View style={styles.popularInfo}>
                    <Text style={styles.popularName}>{product.name}</Text>
                    <Text style={styles.popularPrice}>{product.price} ₽</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitleAlt}>Меню</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories.map((category) => (
                <CategoryPill
                  key={category}
                  label={category}
                  isActive={selectedCategory === category}
                  onPress={() => setSelectedCategory(category)}
                />
              ))}
            </ScrollView>
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => router.push(`/(tabs)/(home)/product/${product.id}`)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <CartButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  logoImage: {
    width: 80,
    height: 60,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  location: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  heroBanner: {
    marginHorizontal: 16,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionTitleAlt: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  popularScroll: {
    paddingHorizontal: 16,
  },
  popularCard: {
    width: width * 0.65,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  popularImage: {
    width: '100%',
    height: '100%',
  },
  popularGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  popularInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  popularName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  popularPrice: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
});
