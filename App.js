import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import BeautifyPetals from './screens/BeautifyPetals';
import ProductDetails from './screens/ProductDetails';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [selectedProductId, setSelectedProductId] = useState(null);

  const navigateToDetails = (productId) => {
    setSelectedProductId(productId);
    setCurrentScreen('Details');
  };

  const navigateToHome = () => {
    setCurrentScreen('Home');
    setSelectedProductId(null);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {currentScreen === 'Home' ? (
        <BeautifyPetals onProductPress={navigateToDetails} />
      ) : (
        <ProductDetails 
          productId={selectedProductId} 
          onBack={navigateToHome} 
          isFavoriteGlobal={false} // Mocked for simplicity
          onToggleFavorite={() => {}} // Mocked
        />
      )}
    </SafeAreaProvider>
  );
}
