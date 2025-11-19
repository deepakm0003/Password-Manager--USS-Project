import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Alert, ScrollView } from 'react-native';
import { Text, Button, Card, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface WelcomeScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { authenticate } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [showMasterUnlock, setShowMasterUnlock] = useState(false);
  const [masterPassword, setMasterPasswordInput] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleMasterUnlock = async () => {
    if (!masterPassword.trim()) {
      Alert.alert('Master Password Required', 'Please enter your master password to unlock your vault.');
      return;
    }

    try {
      setUnlockLoading(true);
      const success = await authenticate(masterPassword.trim());
      if (success) {
        setMasterPasswordInput('');
        navigation.replace('Main');
      } else {
        Alert.alert('Incorrect Password', 'The master password you entered is incorrect. Please try again.');
      }
    } catch (error) {
      console.error('Master unlock error:', error);
      Alert.alert('Error', 'Unable to unlock vault. Please try again.');
    } finally {
      setUnlockLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.background, theme.surface || '#f8f9fa']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={[styles.shieldContainer, { shadowColor: theme.primary }]}>
                <LinearGradient
                  colors={[theme.primary, theme.primary + 'DD']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.shield}
                >
                  <MaterialCommunityIcons name="shield-lock" size={64} color="white" />
                </LinearGradient>
                <View style={[styles.shieldGlow, { backgroundColor: theme.primary + '20' }]} />
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
                Unified Authentication Manager
              </Text>
              <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.textSecondary }]}>
                Your secure digital identity, simplified.
              </Text>
            </Animated.View>
          </View>

        <Animated.View
          style={[
            styles.featuresContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Card style={[styles.featureCard, { backgroundColor: theme.surface }]} elevation={2}>
            <View style={styles.features}>
              <View style={styles.feature}>
                <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + '15' }]}>
                  <MaterialCommunityIcons name="key-variant" size={28} color={theme.primary} />
                </View>
                <View style={styles.featureContent}>
                  <Text variant="titleSmall" style={[styles.featureTitle, { color: theme.text }]}>
                    Secure Password Vault
                  </Text>
                  <Text variant="bodySmall" style={[styles.featureDescription, { color: theme.textSecondary }]}>
                    Encrypted storage for all your passwords
                  </Text>
                </View>
              </View>
              <View style={[styles.featureDivider, { backgroundColor: theme.textSecondary + '20' }]} />
              <View style={styles.feature}>
                <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + '15' }]}>
                  <MaterialCommunityIcons name="shield-alert" size={28} color={theme.primary} />
                </View>
                <View style={styles.featureContent}>
                  <Text variant="titleSmall" style={[styles.featureTitle, { color: theme.text }]}>
                    Multi-Factor Authentication
                  </Text>
                  <Text variant="bodySmall" style={[styles.featureDescription, { color: theme.textSecondary }]}>
                    Enhanced security with MFA approvals
                  </Text>
                </View>
              </View>
              <View style={[styles.featureDivider, { backgroundColor: theme.textSecondary + '20' }]} />
              <View style={styles.feature}>
                <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + '15' }]}>
                  <MaterialCommunityIcons name="email-lock" size={28} color={theme.primary} />
                </View>
                <View style={styles.featureContent}>
                  <Text variant="titleSmall" style={[styles.featureTitle, { color: theme.text }]}>
                    Email Relay Protection
                  </Text>
                  <Text variant="bodySmall" style={[styles.featureDescription, { color: theme.textSecondary }]}>
                    Protect your email with relay aliases
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttons,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            buttonColor={theme.primary}
            icon="login"
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
          >
            Log In
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('SignUp')}
            style={[styles.secondaryButton, { borderColor: theme.primary, borderWidth: 2 }]}
            textColor={theme.primary}
            icon="account-plus"
            labelStyle={[styles.buttonLabel, { color: theme.primary }]}
            contentStyle={styles.buttonContent}
          >
            Sign Up
          </Button>
        </Animated.View>

        <Animated.View
          style={{
            width: '100%',
            marginTop: 24,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Card style={[styles.unlockCard, { backgroundColor: theme.surface }]} elevation={2}>
            <Text style={[styles.unlockTitle, { color: theme.text }]}>Unlock Vault</Text>
            <Text style={[styles.unlockSubtitle, { color: theme.textSecondary }]}>
              Already signed in? Enter your master password to access your vault instantly.
            </Text>

            {showMasterUnlock && (
              <View style={styles.unlockForm}>
                <TextInput
                  label="Master Password"
                  value={masterPassword}
                  onChangeText={setMasterPasswordInput}
                  mode="outlined"
                  secureTextEntry
                  style={styles.unlockInput}
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="shield-key" />}
                />
                <Button
                  mode="contained"
                  onPress={handleMasterUnlock}
                  loading={unlockLoading}
                  disabled={unlockLoading}
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  buttonColor={theme.primary}
                >
                  Unlock Vault
                </Button>
              </View>
            )}

            <Button
              mode="text"
              onPress={() => setShowMasterUnlock(prev => !prev)}
              textColor={theme.primary}
            >
              {showMasterUnlock ? 'Hide Master Password' : 'Enter Master Password'}
            </Button>
          </Card>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Button
            onPress={() => navigation.navigate('Login')}
            textColor={theme.textSecondary}
            style={styles.linkButton}
            compact
          >
            Forgot Username or Password?
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Onboarding', { fromLogin: false })}
            style={styles.tutorialButton}
            textColor={theme.primary}
            icon="help-circle-outline"
            compact
          >
            View Tutorial
          </Button>
        </Animated.View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    flexGrow: 1,
  },
  content: {
    gap: 28,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    marginBottom: 32,
  },
  shieldContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  shieldGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.4,
    zIndex: -1,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.8,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
  },
  featureCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  features: {
    gap: 0,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    lineHeight: 18,
  },
  featureDivider: {
    height: 1,
    marginVertical: 8,
  },
  buttons: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unlockCard: {
    borderRadius: 16,
    padding: 20,
    gap: 12,
    width: '100%',
    alignSelf: 'stretch',
  },
  unlockTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  unlockSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  unlockForm: {
    marginTop: 8,
    gap: 12,
  },
  unlockInput: {
    backgroundColor: 'transparent',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 24,
  },
  tutorialButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});

