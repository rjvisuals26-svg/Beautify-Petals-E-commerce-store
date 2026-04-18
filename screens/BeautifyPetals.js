import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
  Platform,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import ProductDetails from './ProductDetails';
import BASE_URL from '../src/api/apiConfig';

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

const THEME = {
  background: '#FFF5F7',
  surface: '#FFFFFF',
  primary: '#E91E78',
  primaryLight: '#FF6EB4',
  secondary: '#FFF0F5',
  accent: '#AD1457',
  text: '#1A1A2E',
  textSub: '#8E8E9A',
  gold: '#FFB800',
  white: '#FFFFFF',
  shadow: 'rgba(233, 30, 120, 0.12)',
  glass: 'rgba(255, 255, 255, 0.85)',
  petal: 'rgba(233, 30, 120, 0.04)',
  lavender: '#E8D5F5',
  roseGold: '#B76E79',
  success: '#00C48C',
  danger: '#FF4757',
  cardBg: '#FEFEFF',
};

const CATEGORY_ICONS = {
  'All Products': 'flower-tulip',
  'Lipstick': 'lipstick',
  'Foundation': 'palette-swatch',
  'Moisturizer': 'water',
  'Toner': 'spray',
  'Blush': 'heart',
  'Mascara': 'eye',
};

const CATEGORIES = ['All Products', 'Lipstick', 'Foundation', 'Moisturizer', 'Toner', 'Blush', 'Mascara'];

const PETAL_COUNT = 12;
const PETAL_ICONS = ['flower', 'leaf', 'flower-outline'];

// --- Floating Petal Background (Optimized) ---
const Petal = React.memo(({ index }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const xPos = useRef(Math.random() * width).current;
  const size = useRef(Math.random() * 18 + 8).current;
  const dur = useRef(Math.random() * 10000 + 5000).current;

  useEffect(() => {
    let isMounted = true;
    const run = () => {
      if (!isMounted) return;
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }).start(() => run());
    };
    run();
    return () => { isMounted = false; };
  }, [anim, dur]);

  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, left: xPos, zIndex: -1,
        opacity: anim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.2, 0.2, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] }) },
          { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
        ],
      }}
    >
      <MaterialCommunityIcons name={PETAL_ICONS[index % PETAL_ICONS.length]} size={size} color={THEME.primary} />
    </Animated.View>
  );
});

// --- Animated Add-to-Cart Toast ---
const CartToast = ({ visible, itemName }) => {
  const slide = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slide, { toValue: 120, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [visible, slide, opacity]);

  if (!visible) return null;
  return (
    <Animated.View style={[styles.cartToast, { transform: [{ translateY: slide }], opacity }]}>
      <LinearGradient colors={[THEME.primary, THEME.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cartToastGrad}>
        <Ionicons name="checkmark-circle" size={22} color={THEME.white} />
        <Text style={styles.cartToastText} numberOfLines={1}>Added "{itemName}" to bag!</Text>
        <MaterialCommunityIcons name="shopping" size={20} color={THEME.white} />
      </LinearGradient>
    </Animated.View>
  );
};

// --- Skeleton Loading Card ---
const SkeletonCard = () => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerValue, { toValue: 0, duration: 800, useNativeDriver: true })
      ]).start(() => shimmer());
    };
    shimmer();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View style={[styles.card, { opacity, elevation: 0 }]}>
      <View style={[styles.imageContainer, { backgroundColor: '#E0E0E0' }]} />
      <View style={styles.cardContent}>
        <View style={{ width: '40%', height: 10, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 8 }} />
        <View style={{ width: '70%', height: 14, backgroundColor: '#E0E0E0', borderRadius: 6, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '40%', height: 18, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
          <View style={{ width: 32, height: 32, backgroundColor: '#E0E0E0', borderRadius: 10 }} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function BeautifyPetals({ goBack }) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home' or 'wishlist'

  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastItem, setToastItem] = useState('');
  const toastKey = useRef(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;

  // Pulsing FAB
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(fabPulse, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(fabPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();
  }, [fabPulse]);

  const fetchProducts = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/products`);
      if (!response.ok) throw new Error('Store connection failed');
      const data = await response.json();
      setProducts(data);
      // The formatting useEffect will handle the entry animations automatically

    } catch (err) {
      setError('Connection issue. Please ensure your backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim]);

  const loadData = useCallback(async () => {
    try {
      const storedCart = await AsyncStorage.getItem('cart');
      const storedFavs = await AsyncStorage.getItem('favorites');
      const storedRecentlyViewed = await AsyncStorage.getItem('recentlyViewed');

      if (storedCart) {
        let parsedCart = JSON.parse(storedCart);
        const cleanedCart = [];
        const seenIds = new Set();
        parsedCart.forEach(item => {
          if (item && item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            cleanedCart.push({ ...item, quantity: Number(item.quantity) || 1 });
          }
        });
        setCart(cleanedCart);
        await AsyncStorage.setItem('cart', JSON.stringify(cleanedCart));
      }
      if (storedFavs) setFavorites(JSON.parse(storedFavs));
      if (storedRecentlyViewed) setRecentlyViewed(JSON.parse(storedRecentlyViewed));
    } catch (err) { console.error('Error loading data:', err); }
  }, []);

  useEffect(() => { fetchProducts(); loadData(); }, [fetchProducts, loadData]);
  useEffect(() => { if (!selectedProductId) loadData(); }, [selectedProductId, loadData]);

  const saveCart = async (newCart) => {
    try { setCart(newCart); await AsyncStorage.setItem('cart', JSON.stringify(newCart)); }
    catch (err) { console.error('Error saving cart:', err); }
  };
  const saveFavorites = async (newFavs) => {
    try { setFavorites(newFavs); await AsyncStorage.setItem('favorites', JSON.stringify(newFavs)); }
    catch (err) { console.error('Error saving favs:', err); }
  };

  // ─── HIGH PERFORMANCE SYNCHRONOUS FILTERING ───────────────────
  const filteredData = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All Products' || p.category === selectedCategory;
      const matchesTab = activeTab === 'home' || favorites.includes(p.id);
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [search, selectedCategory, products, activeTab, favorites]);

  // Entrance animation for products when count changes or category changes
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 350, 
      useNativeDriver: true 
    }).start();
  }, [selectedCategory, activeTab, loading]);

  const handleCategoryChange = (cat) => {
    if (cat === selectedCategory) return;
    Haptics.selectionAsync();
    setSelectedCategory(cat);
  };

  const handleQuickAdd = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      saveCart(cart.map(i => i.id === item.id ? { ...i, quantity: (Number(i.quantity) || 1) + 1 } : i));
    } else {
      saveCart([...cart, { ...item, quantity: 1 }]);
    }
    // Show toast
    toastKey.current += 1;
    setToastItem(item.name);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const updateQuantity = (id, delta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newCart = cart.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(i => i.quantity > 0);
    saveCart(newCart);
  };

  const removeFromCart = (id) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const newCart = cart.filter(i => i.id !== id);
    saveCart(newCart);
  };

  const clearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items from your beauty bag?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); saveCart([]); } },
    ]);
  };

  const toggleFavorite = (id) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    saveFavorites(newFavs);
  };

  const calculateSubtotal = () => cart.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 1)), 0);
  const deliveryFee = cart.length > 0 ? 150 : 0;
  const discount = calculateSubtotal() > 5000 ? Math.round(calculateSubtotal() * 0.1) : 0;
  const calculateTotal = () => (calculateSubtotal() - discount + deliveryFee).toFixed(2);
  const totalItems = cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  // ========== PRODUCT CARD COMPONENT ==========
  const ProductCard = React.memo(({ item, index, onPress, onToggleFav, onQuickAdd, isFav, cartQty }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const addBtnScale = useRef(new Animated.Value(1)).current;

    const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    const onAddPress = () => {
      Animated.sequence([
        Animated.timing(addBtnScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.spring(addBtnScale, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
      onQuickAdd(item);
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={onPressIn} onPressOut={onPressOut}
          onPress={() => onPress(item.id)}
          style={[styles.card, { marginTop: index % 2 === 1 ? 20 : 0 }]}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.08)']} style={styles.imageGradOverlay} />
            {item.is_popular ? (
              <View style={styles.popBadge}>
                <Ionicons name="flame" size={10} color={THEME.white} />
                <Text style={styles.popBadgeText}>HOT</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.wishlistBtn} onPress={() => onToggleFav(item.id)}>
              <Ionicons name={isFav ? "heart" : "heart-outline"} size={16} color={isFav ? THEME.danger : THEME.textSub} />
            </TouchableOpacity>
            {cartQty > 0 && (
              <View style={styles.cartQtyBadge}>
                <Text style={styles.cartQtyBadgeText}>{cartQty}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.productCategory}>{item.category}</Text>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Ionicons key={star} name={star <= Math.round(item.rating || 4.5) ? "star" : "star-outline"} size={11} color={THEME.gold} />
              ))}
              <Text style={styles.ratingText}>({item.rating || '4.5'})</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>Rs.{item.price}</Text>
              <Animated.View style={{ transform: [{ scale: addBtnScale }] }}>
                <TouchableOpacity style={styles.miniAddBtn} onPress={onAddPress}>
                  <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.miniAddGrad}>
                    <Ionicons name="bag-add" size={16} color={THEME.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  // ========== HEADER ==========
  const Header = () => {
    const headerScale = scrollY.interpolate({ inputRange: [0, 150], outputRange: [1, 0.95], extrapolate: 'clamp' });
    const bannerOpacity = scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0], extrapolate: 'clamp' });
    const bannerTranslateY = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, -30], extrapolate: 'clamp' });

    return (
      <View>
        {/* App Bar */}
        <Animated.View style={[styles.appBar, { transform: [{ scale: headerScale }] }]}>
          <TouchableOpacity style={styles.iconCircle} onPress={goBack}>
            <Ionicons name="apps" size={22} color={THEME.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="flower-tulip" size={20} color={THEME.primary} />
            <Text style={styles.brandText}>Beautify Petals</Text>
          </View>
          <TouchableOpacity style={styles.cartIconBadge} onPress={() => setIsCartVisible(true)}>
            <Ionicons name="bag-handle" size={22} color={THEME.primary} />
            {totalItems > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Hero Banner (Only on Home) */}
        {activeTab === 'home' && (
          <Animated.View style={[styles.heroBanner, { opacity: bannerOpacity, transform: [{ translateY: bannerTranslateY }] }]}>
            <LinearGradient colors={['#FFF0F5', '#FFE0EB', '#FFD5E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBannerGrad}>
              <View style={styles.heroTextContent}>
                <View style={styles.heroTagWrap}>
                  <MaterialCommunityIcons name="creation" size={12} color={THEME.primary} />
                  <Text style={styles.heroTag}>NEW ARRIVAL</Text>
                </View>
                <Text style={styles.heroTitle}>Natural &{"\n"}Organic{"\n"}Beauty</Text>
                <TouchableOpacity style={styles.heroBtn} activeOpacity={0.8}>
                  <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.heroBtnGrad}>
                    <Text style={styles.heroBtnText}>Shop Now</Text>
                    <Ionicons name="arrow-forward" size={14} color={THEME.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <View style={styles.heroImageContainer}>
                <Image
                  source={{ uri: 'https://images.pexels.com/photos/3373739/pexels-photo-3373739.jpeg?auto=compress&cs=tinysrgb&w=300' }}
                  style={styles.heroImg}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color={THEME.textSub} />
            <TextInput
              placeholder={activeTab === 'home' ? "Search beauty products..." : "Search wishlist..."}
              placeholderTextColor={THEME.textSub}
              style={styles.searchField}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={18} color={THEME.textSub} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="options-outline" size={18} color={THEME.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recently Viewed (Only on Home if there are items) */}
        {activeTab === 'home' && recentlyViewed.filter(p => !favorites.includes(p.id)).length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <View style={[styles.sectionHeader, { marginBottom: 10 }]}>
              <Text style={[styles.sectionTitle, { fontSize: 14 }]}>Recently Viewed</Text>
            </View>
            <FlatList
              horizontal
              data={recentlyViewed.filter(p => !favorites.includes(p.id))}
              keyExtractor={(item) => `recent-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setSelectedProductId(item.id)} style={{ marginRight: 15, alignItems: 'center', width: 60 }}>
                  <Image source={{ uri: item.image_url }} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: THEME.secondary, borderWidth: 1, borderColor: THEME.border }} />
                  <Text style={{ fontSize: 9, fontWeight: '700', color: THEME.text, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Categories with Icons */}
        <View style={styles.categoryContainer}>
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(item, index) => `cat-${item}-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleCategoryChange(item)}
                style={[styles.categoryPill, selectedCategory === item && styles.categoryPillActive]}
              >
                <MaterialCommunityIcons
                  name={CATEGORY_ICONS[item] || 'flower'}
                  size={16}
                  color={selectedCategory === item ? THEME.white : THEME.primary}
                />
                <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {activeTab === 'wishlist' 
                ? 'Your Wishlist' 
                : selectedCategory === 'All Products' ? 'Exclusive Collection' : selectedCategory}
            </Text>
            <Text style={styles.sectionSub}>{filteredData.length} products available</Text>
          </View>
          <TouchableOpacity style={styles.sortBtn}>
            <Feather name="sliders" size={16} color={THEME.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ========== CART ITEM ==========
  const CartItem = ({ item, index }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeOut = useRef(new Animated.Value(1)).current;

    const onRemove = () => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeOut, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => removeFromCart(item.id));
    };

    return (
      <Animated.View style={[styles.cartLineItem, { transform: [{ translateX: slideAnim }], opacity: fadeOut }]}>
        <Image source={{ uri: item.image_url }} style={styles.cartItemImg} />
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cartItemCategory}>{item.category}</Text>
          <Text style={styles.cartItemPrice}>Rs.{(Number(item.price) * Number(item.quantity)).toFixed(0)}</Text>
        </View>
        <View style={styles.qtyContainer}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
            <Ionicons name="remove" size={14} color={THEME.primary} />
          </TouchableOpacity>
          <View style={styles.qtyValWrap}>
            <Text style={styles.qtyVal}>{item.quantity}</Text>
          </View>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
            <Ionicons name="add" size={14} color={THEME.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Ionicons name="trash-outline" size={16} color={THEME.danger} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />

      {Array.from({ length: PETAL_COUNT }).map((_, i) => <Petal key={`petal-${i}`} index={i} />)}

      {loading && !refreshing ? (
        <View style={{ flex: 1, paddingTop: 100 }}>
           <View style={styles.columnWrapper}>
              <SkeletonCard />
              <SkeletonCard />
           </View>
           <View style={styles.columnWrapper}>
              <SkeletonCard />
              <SkeletonCard />
           </View>
           <View style={styles.columnWrapper}>
              <SkeletonCard />
              <SkeletonCard />
           </View>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="flower" size={60} color={THEME.primary} style={{ opacity: 0.2 }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProducts()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredData}
          numColumns={2}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={Header}
          renderItem={({ item, index }) => (
            <ProductCard 
              item={item} 
              index={index} 
              onPress={setSelectedProductId}
              onToggleFav={toggleFavorite}
              onQuickAdd={handleQuickAdd}
              isFav={favorites.includes(item.id)}
              cartQty={cart.find(c => c.id === item.id)?.quantity || 0}
            />
          )}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          style={{ opacity: fadeAnim }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} tintColor={THEME.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="flower-outline" size={60} color={THEME.textSub} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>No petals found in this category.</Text>
            </View>
          }
        />
      )}

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <Ionicons name={activeTab === 'home' ? 'home' : 'home-outline'} size={22} color={activeTab === 'home' ? THEME.primary : THEME.textSub} />
          <Text style={[styles.navLabel, { color: activeTab === 'home' ? THEME.primary : THEME.textSub }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('wishlist')}>
          <Ionicons name={activeTab === 'wishlist' ? 'heart' : 'heart-outline'} size={22} color={activeTab === 'wishlist' ? THEME.primary : THEME.textSub} />
          <Text style={[styles.navLabel, { color: activeTab === 'wishlist' ? THEME.primary : THEME.textSub }]}>Wishlist</Text>
        </TouchableOpacity>
        <View style={styles.navFabContainer}>
          <Animated.View style={{ transform: [{ scale: fabPulse }] }}>
            <TouchableOpacity style={styles.navFab} activeOpacity={0.8}>
              <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.navFabGrad}>
                <Feather name="plus" size={26} color={THEME.white} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
        <TouchableOpacity style={styles.navItem} onPress={() => setIsCartVisible(true)}>
          <View>
            <Ionicons name="bag-outline" size={22} color={isCartVisible ? THEME.primary : THEME.textSub} />
            {totalItems > 0 && (
              <View style={[styles.navBadge]}>
                <Text style={styles.navBadgeText}>{totalItems}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navLabel}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={22} color={THEME.textSub} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Add-to-Cart Toast */}
      <CartToast key={toastKey.current} visible={toastVisible} itemName={toastItem} />

      {/* ========== PREMIUM CART MODAL ========== */}
      <Modal visible={isCartVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContent}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {checkoutStep === 0 ? (
              <>
                {/* Cart Header */}
                <View style={styles.cartHeader}>
                  <View>
                    <Text style={styles.cartTitle}>Your Beauty Bag</Text>
                    <Text style={styles.cartSubtitle}>{totalItems} item{totalItems !== 1 ? 's' : ''} in your bag</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {cart.length > 0 && (
                      <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
                        <Feather name="trash-2" size={16} color={THEME.danger} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => { setIsCartVisible(false); setCheckoutStep(0); }} style={styles.closeBtn}>
                      <Ionicons name="close" size={20} color={THEME.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.cartScroll} showsVerticalScrollIndicator={false}>
                  {cart.length === 0 ? (
                    <View style={styles.emptyCartWrap}>
                      <View style={styles.emptyCartIconWrap}>
                        <MaterialCommunityIcons name="shopping-outline" size={60} color={THEME.primary} />
                      </View>
                      <Text style={styles.emptyCartTitle}>Your bag is empty</Text>
                      <Text style={styles.emptyCartText}>Discover our exclusive collection of premium beauty products</Text>
                      <TouchableOpacity style={styles.continueBtn} onPress={() => setIsCartVisible(false)}>
                        <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.continueBtnGrad}>
                          <Text style={styles.continueText}>Start Shopping</Text>
                          <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {cart.map((item, index) => <CartItem key={`${item.id}-${index}`} item={item} index={index} />)}

                      {/* Promo */}
                      <View style={styles.promoSection}>
                        <View style={styles.promoInputWrap}>
                          <Feather name="tag" size={16} color={THEME.textSub} />
                          <TextInput placeholder="Enter promo code" placeholderTextColor={THEME.textSub} style={styles.promoInput} />
                          <TouchableOpacity style={styles.promoApplyBtn}>
                            <Text style={styles.promoApplyText}>Apply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Order Summary */}
                      <View style={styles.orderSummary}>
                        <Text style={styles.summaryTitle}>Order Summary</Text>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
                          <Text style={styles.summaryValue}>Rs.{calculateSubtotal().toFixed(0)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Delivery</Text>
                          <Text style={[styles.summaryValue, deliveryFee === 0 && { color: THEME.success }]}>{deliveryFee === 0 ? 'Free' : `Rs.${deliveryFee}`}</Text>
                        </View>
                        {discount > 0 && (
                          <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: THEME.success }]}>Discount (10%)</Text>
                            <Text style={[styles.summaryValue, { color: THEME.success }]}>-Rs.{discount}</Text>
                          </View>
                        )}
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryRow}>
                          <Text style={styles.totalLabel}>Total</Text>
                          <Text style={styles.totalValue}>Rs.{calculateTotal()}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </ScrollView>

                {cart.length > 0 && (
                  <View style={styles.cartFooter}>
                    {discount > 0 && (
                      <View style={styles.savingsBanner}>
                        <MaterialCommunityIcons name="tag-heart" size={16} color={THEME.success} />
                        <Text style={styles.savingsText}>You're saving Rs.{discount} on this order!</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.checkoutBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setCheckoutStep(1); }} activeOpacity={0.85}>
                      <LinearGradient colors={[THEME.primary, THEME.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.checkoutGrad}>
                        <View style={styles.checkoutLeft}>
                          <Text style={styles.checkoutBtnText}>Checkout Now</Text>
                          <Text style={styles.checkoutSubtext}>{totalItems} items • Rs.{calculateTotal()}</Text>
                        </View>
                        <View style={styles.checkoutArrow}>
                          <Ionicons name="arrow-forward" size={20} color={THEME.white} />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIconWrap}>
                  <LinearGradient colors={[THEME.success, '#00E5A0']} style={styles.successIconBg}>
                    <Ionicons name="checkmark" size={50} color={THEME.white} />
                  </LinearGradient>
                </View>
                <Text style={styles.successTitle}>Order Confirmed!</Text>
                <Text style={styles.successSub}>Your beauty secrets are on their way. We'll notify you when they bloom at your doorstep. 🌸</Text>
                <View style={styles.orderIdWrap}>
                  <Text style={styles.orderIdLabel}>Order ID</Text>
                  <Text style={styles.orderIdValue}>#BP{Date.now().toString().slice(-6)}</Text>
                </View>
                <TouchableOpacity style={styles.doneBtn} onPress={() => { saveCart([]); setIsCartVisible(false); setCheckoutStep(0); }}>
                  <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.doneBtnGrad}>
                    <Text style={styles.doneText}>Continue Shopping</Text>
                    <MaterialCommunityIcons name="flower" size={18} color={THEME.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Product Details */}
      {selectedProductId && (
        <View style={StyleSheet.absoluteFill}>
          <ProductDetails
            productId={selectedProductId}
            onBack={() => setSelectedProductId(null)}
            onRefreshCart={loadData}
            isFavoriteGlobal={favorites.includes(selectedProductId)}
            onToggleFavorite={() => toggleFavorite(selectedProductId)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingWrap: { alignItems: 'center', gap: 16 },
  loadingText: { color: THEME.primary, fontWeight: '600', fontSize: 14 },

  // App Bar
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  iconCircle: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: THEME.surface,
    justifyContent: 'center', alignItems: 'center',
    elevation: 3, shadowColor: THEME.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  brandText: { fontSize: 20, fontWeight: '800', color: THEME.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  cartIconBadge: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: THEME.surface,
    justifyContent: 'center', alignItems: 'center',
    elevation: 3, shadowColor: THEME.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  badgeCount: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: THEME.primary, minWidth: 18, height: 18,
    borderRadius: 9, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: THEME.white,
  },
  badgeText: { color: THEME.white, fontSize: 9, fontWeight: '900' },

  // Hero Banner
  heroBanner: { marginHorizontal: 20, marginBottom: 20, borderRadius: 28, overflow: 'hidden', elevation: 6, shadowColor: THEME.shadow, shadowOpacity: 0.3, shadowRadius: 15 },
  heroBannerGrad: { height: 180, flexDirection: 'row', overflow: 'hidden' },
  heroTextContent: { flex: 1, padding: 22, justifyContent: 'center' },
  heroTagWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  heroTag: { fontSize: 9, fontWeight: '900', color: THEME.primary, letterSpacing: 2 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: THEME.text, lineHeight: 28 },
  heroBtn: { marginTop: 14, alignSelf: 'flex-start', borderRadius: 14, overflow: 'hidden' },
  heroBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  heroBtnText: { color: THEME.white, fontSize: 11, fontWeight: '800' },
  heroImageContainer: { flex: 0.75, justifyContent: 'flex-end', alignItems: 'center' },
  heroImg: { width: '100%', height: '120%', marginBottom: -10 },

  // Search
  searchSection: { paddingHorizontal: 20, marginBottom: 18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.surface, borderRadius: 16,
    paddingLeft: 14, height: 50,
    elevation: 2, shadowColor: THEME.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  searchField: { flex: 1, marginLeft: 8, fontSize: 14, color: THEME.text },
  filterBtn: { backgroundColor: THEME.primary, width: 40, height: 40, borderRadius: 12, marginRight: 5, justifyContent: 'center', alignItems: 'center' },

  // Categories
  categoryContainer: { marginBottom: 20 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    backgroundColor: THEME.surface, marginRight: 10,
    elevation: 1, shadowColor: THEME.shadow, shadowOpacity: 0.1, shadowRadius: 4,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  categoryPillActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  categoryText: { color: THEME.textSub, fontWeight: '700', fontSize: 12 },
  categoryTextActive: { color: THEME.white },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: THEME.text },
  sectionSub: { fontSize: 12, color: THEME.textSub, marginTop: 2 },
  sortBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: THEME.secondary, justifyContent: 'center', alignItems: 'center' },
  seeAllText: { fontSize: 12, color: THEME.primary, fontWeight: '700' },

  // Product Cards
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20 },
  card: {
    width: COLUMN_WIDTH, backgroundColor: THEME.cardBg, borderRadius: 24,
    marginBottom: 20, padding: 10,
    elevation: 4, shadowColor: THEME.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  imageContainer: { width: '100%', height: 160, backgroundColor: THEME.secondary, borderRadius: 18, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%', zIndex: 2 },
  imageGradOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 3 },
  popBadge: { position: 'absolute', top: 10, left: 10, zIndex: 5, backgroundColor: '#FF6B6B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  popBadgeText: { color: THEME.white, fontSize: 8, fontWeight: '900' },
  wishlistBtn: { position: 'absolute', top: 10, right: 10, zIndex: 5, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  cartQtyBadge: { position: 'absolute', bottom: 10, left: 10, zIndex: 5, backgroundColor: THEME.primary, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: THEME.white },
  cartQtyBadgeText: { color: THEME.white, fontSize: 10, fontWeight: '900' },

  cardContent: { marginTop: 10, paddingHorizontal: 4 },
  productCategory: { fontSize: 10, fontWeight: '700', color: THEME.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  productName: { fontSize: 14, fontWeight: '700', color: THEME.text, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 1 },
  ratingText: { fontSize: 10, color: THEME.textSub, marginLeft: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 16, fontWeight: '900', color: THEME.accent },
  miniAddBtn: { borderRadius: 10, overflow: 'hidden' },
  miniAddGrad: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  // Toast
  cartToast: { position: 'absolute', bottom: 100, left: 20, right: 20, zIndex: 999 },
  cartToastGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 10 },
  cartToastText: { flex: 1, color: THEME.white, fontWeight: '700', fontSize: 13 },

  // Bottom Nav
  bottomNav: {
    position: 'absolute', bottom: 0, width: '100%', height: 70,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: THEME.glass, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 15,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  navLabel: { fontSize: 10, fontWeight: '600', color: THEME.textSub, marginTop: 2 },
  navFabContainer: { marginTop: -40, zIndex: 100 },
  navFab: { borderRadius: 28, overflow: 'hidden', elevation: 8, shadowColor: THEME.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
  navFabGrad: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  navBadge: { position: 'absolute', top: -4, right: -8, backgroundColor: THEME.primary, minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: THEME.white },
  navBadgeText: { color: THEME.white, fontSize: 8, fontWeight: '900' },

  // Cart Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.5)', justifyContent: 'flex-end' },
  cartModalContent: { backgroundColor: THEME.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', paddingHorizontal: 20, paddingTop: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 25, elevation: 25 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cartTitle: { fontSize: 22, fontWeight: '800', color: THEME.text },
  cartSubtitle: { fontSize: 12, color: THEME.textSub, marginTop: 2 },
  clearBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: THEME.secondary, justifyContent: 'center', alignItems: 'center' },

  cartScroll: { flex: 1 },
  emptyCartWrap: { alignItems: 'center', paddingTop: 60 },
  emptyCartIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: THEME.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyCartTitle: { fontSize: 20, fontWeight: '800', color: THEME.text, marginBottom: 8 },
  emptyCartText: { color: THEME.textSub, fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  continueBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  continueBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 14, gap: 8 },
  continueText: { color: THEME.white, fontWeight: '800', fontSize: 15 },

  cartLineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: THEME.background, padding: 10, borderRadius: 18 },
  cartItemImg: { width: 56, height: 56, borderRadius: 14 },
  cartItemInfo: { flex: 1, marginLeft: 12 },
  cartItemName: { fontSize: 14, fontWeight: '700', color: THEME.text },
  cartItemCategory: { fontSize: 10, color: THEME.textSub, marginTop: 1 },
  cartItemPrice: { fontSize: 14, color: THEME.primary, fontWeight: '800', marginTop: 2 },

  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.white, borderRadius: 12, borderWidth: 1, borderColor: THEME.secondary, marginRight: 8 },
  qtyBtn: { padding: 6 },
  qtyValWrap: { backgroundColor: THEME.secondary, paddingHorizontal: 10, paddingVertical: 4 },
  qtyVal: { fontSize: 13, fontWeight: '800', color: THEME.text },
  removeBtn: { padding: 6 },

  // Promo
  promoSection: { marginTop: 10, marginBottom: 16 },
  promoInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.background, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: THEME.secondary },
  promoInput: { flex: 1, marginLeft: 8, fontSize: 13, color: THEME.text },
  promoApplyBtn: { backgroundColor: THEME.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  promoApplyText: { color: THEME.white, fontWeight: '700', fontSize: 12 },

  // Order Summary
  orderSummary: { backgroundColor: THEME.background, borderRadius: 18, padding: 16, marginBottom: 10 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: THEME.text, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: THEME.textSub },
  summaryValue: { fontSize: 13, fontWeight: '700', color: THEME.text },
  summaryDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: THEME.text },
  totalValue: { fontSize: 20, fontWeight: '900', color: THEME.accent },

  // Footer
  cartFooter: { borderTopWidth: 1, borderTopColor: THEME.secondary, paddingTop: 14, paddingBottom: 10 },
  savingsBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8FAF0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  savingsText: { color: THEME.success, fontWeight: '700', fontSize: 12 },
  checkoutBtn: { borderRadius: 18, overflow: 'hidden' },
  checkoutGrad: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  checkoutLeft: {},
  checkoutBtnText: { color: THEME.white, fontSize: 17, fontWeight: '800' },
  checkoutSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  checkoutArrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  successIconWrap: { marginBottom: 20 },
  successIconBg: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 26, fontWeight: '800', color: THEME.text },
  successSub: { fontSize: 14, color: THEME.textSub, textAlign: 'center', marginTop: 10, paddingHorizontal: 40, lineHeight: 22 },
  orderIdWrap: { backgroundColor: THEME.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, marginTop: 20, alignItems: 'center' },
  orderIdLabel: { fontSize: 10, color: THEME.textSub, fontWeight: '700' },
  orderIdValue: { fontSize: 16, fontWeight: '900', color: THEME.primary, marginTop: 2 },
  doneBtn: { marginTop: 30, borderRadius: 18, overflow: 'hidden', elevation: 6, shadowColor: THEME.primary, shadowOpacity: 0.3, shadowRadius: 10 },
  doneBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 14, gap: 10 },
  doneText: { color: THEME.white, fontWeight: '800', fontSize: 15 },

  // Misc
  emptyContainer: { alignItems: 'center', paddingTop: 50, gap: 10 },
  emptyText: { color: THEME.textSub, fontSize: 14 },
  errorText: { color: THEME.textSub, fontSize: 14, textAlign: 'center', marginTop: 15 },
  retryBtn: { marginTop: 15, backgroundColor: THEME.primary, paddingHorizontal: 25, paddingVertical: 10, borderRadius: 14 },
  retryText: { color: THEME.white, fontWeight: '700' },
  listContent: { paddingBottom: 100 },
});
