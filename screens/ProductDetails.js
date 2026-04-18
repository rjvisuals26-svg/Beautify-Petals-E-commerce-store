import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import BASE_URL from '../src/api/apiConfig';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: '#FFF5F7',
  primary: '#E91E78',
  accent: '#AD1457',
  text: '#1A1A2E',
  textSub: '#8E8E9A',
  gold: '#FFB800',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.85)',
};

export default function ProductDetails({ productId, onBack, onRefreshCart, isFavoriteGlobal, onToggleFavorite }) {
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${BASE_URL}/products/${productId}`);
      const data = await response.json();
      setProduct(data);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 0, duration: 400, useNativeDriver: true })
      ]).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Product not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Product Image */}
      <View style={styles.imageHeader}>
        <Image source={{ uri: product.image_url }} style={styles.mainImage} />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topGradient} />
        
        <TouchableOpacity style={[styles.navButton, { top: insets.top + 10, left: 20 }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={THEME.white} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navButton, { top: insets.top + 10, right: 20 }]} onPress={() => onToggleFavorite(product.id)}>
          <Ionicons name={isFavoriteGlobal ? "heart" : "heart-outline"} size={24} color={isFavoriteGlobal ? THEME.primary : THEME.white} />
        </TouchableOpacity>
      </View>

      {/* Product Details Sheet */}
      <Animated.View style={[styles.detailsSheet, { opacity: fadeAnim, transform: [{ translateY: slideY }] }]}>
        <View style={styles.sheetHandle} />
        
        <Text style={styles.categoryBadge}>{product.category}</Text>
        <Text style={styles.title}>{product.name}</Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.price}>Rs.{product.price}</Text>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={14} color={THEME.gold} />
            <Text style={styles.ratingText}>{product.rating}</Text>
          </View>
        </View>
        
        <Text style={styles.description}>
          Experience the premium quality of our {product.name}. Carefully crafted to bring out your natural glow and enhance your beauty with every application.
        </Text>

        <TouchableOpacity 
          style={styles.addToCartBtn}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onBack();
          }}
        >
          <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.btnGradient}>
            <Text style={styles.btnText}>Add to Bag</Text>
            <Feather name="shopping-bag" size={20} color={THEME.white} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  imageHeader: {
    width: '100%',
    height: height * 0.55,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 120,
  },
  navButton: {
    position: 'absolute',
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  detailsSheet: {
    flex: 1,
    backgroundColor: THEME.white,
    marginTop: -40,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 25,
    paddingTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 50, height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 25,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 15,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.accent,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontWeight: '800',
    color: '#FF8F00',
  },
  description: {
    fontSize: 15,
    color: THEME.textSub,
    lineHeight: 24,
    marginBottom: 30,
  },
  addToCartBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 'auto',
    marginBottom: 30,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  btnText: {
    color: THEME.white,
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: THEME.text,
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    padding: 15,
    backgroundColor: THEME.primary,
    borderRadius: 10,
  },
  backButtonText: {
    color: THEME.white,
    fontWeight: 'bold',
  }
});
