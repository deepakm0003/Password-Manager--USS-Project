import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OnboardingSlide } from '../types';
import { setOnboardingCompleted } from '../services/fileStorage';

const { width } = Dimensions.get('window');

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Secure Your Digital Life',
    description: 'Store and manage all your passwords securely with AES-256 encryption. Your data never leaves your device.',
    icon: 'shield-lock',
  },
  {
    id: '2',
    title: 'Multi-Factor Authentication',
    description: 'Approve or deny login attempts from anywhere. Stay in control of your account security.',
    icon: 'lock-check',
  },
  {
    id: '3',
    title: 'Email Relay',
    description: 'Create temporary email aliases to protect your identity online. Perfect for sign-ups and untrusted services.',
    icon: 'email-lock',
  },
  {
    id: '4',
    title: 'Biometric Protection',
    description: 'Use your fingerprint or Face ID for quick and secure access to your vault.',
    icon: 'fingerprint',
  },
];

interface OnboardingScreenProps {
  navigation: any;
  route?: {
    params?: {
      fromLogin?: boolean;
    };
  };
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, route }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const fromLogin = route?.params?.fromLogin || false;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleSkip = async () => {
    await handleFinish();
  };

  const handleFinish = async () => {
    if (fromLogin) {
      // If viewing from login page, just go back to login without marking as completed
      navigation.goBack();
    } else {
      // If viewing from welcome screen, go back to welcome without marking as completed
      // This allows users to view tutorial multiple times
      navigation.goBack();
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={item.icon as any} size={80} color="#6366f1" />
      </View>
      <Text variant="headlineMedium" style={styles.title}>
        {item.title}
      </Text>
      <Text variant="bodyLarge" style={styles.description}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button onPress={handleSkip} textColor="#6b7280">
          Back
        </Button>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
          buttonColor="#6366f1"
        >
          {currentIndex === slides.length - 1 
            ? (fromLogin ? 'Back to Login' : 'Back to Welcome')
            : 'Next'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#111827',
  },
  description: {
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 24,
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#6366f1',
    width: 24,
  },
  button: {
    paddingVertical: 8,
  },
});
