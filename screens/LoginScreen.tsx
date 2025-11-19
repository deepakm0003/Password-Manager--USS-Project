import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Animated } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByUsername, verifyAccountPassword, initStorage } from '../services/fileStorage';
import * as AuthService from '../services/auth';
import { validateEmail, validatePassword } from '../utils/validators';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { authenticate, authenticateWithBiometric } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [masterUnlockVisible, setMasterUnlockVisible] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [masterUnlockLoading, setMasterUnlockLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    checkBiometricAvailability();
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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

  const checkBiometricAvailability = async () => {
    const available = await AuthService.isBiometricAvailable();
    setBiometricAvailable(available);
  };

  const handleLogin = async () => {
    // Validate input
    const emailValidation = validateEmail(username);
    if (!emailValidation.valid && !username.includes('@')) {
      // If not email format, treat as username
      if (!username) {
        Alert.alert('Error', 'Please enter your username or email');
        return;
      }
    } else if (!emailValidation.valid) {
      Alert.alert('Error', emailValidation.error || 'Invalid email');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await initStorage();
      const identifier = username.trim().toLowerCase();
      const userRecord = await getUserByUsername(identifier);

      if (!userRecord) {
        Alert.alert('Error', 'No account found with that username or email.');
        setLoading(false);
        return;
      }

      const isValid = await verifyAccountPassword(userRecord, password);
      if (!isValid) {
        Alert.alert('Error', 'Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('@current_user', JSON.stringify(userRecord));

      Alert.alert(
        'Login Successful',
        'Now enter your master password below to unlock your vault.',
        [{ text: 'OK' }]
      );
      setMasterUnlockVisible(true);
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.message || 'An error occurred during login. Please try again.';
      Alert.alert('Error', errorMessage);
      // Clear user on error
      try {
        await AsyncStorage.removeItem('@current_user');
      } catch (clearError) {
        console.error('Error clearing user on login error:', clearError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        navigation.replace('Main');
      } else {
        Alert.alert('Error', 'Biometric authentication failed. Please log in with your password first.');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'An error occurred during biometric authentication');
    }
  };

  const handleMasterUnlock = async () => {
    if (!masterPasswordInput.trim()) {
      Alert.alert('Master Password Required', 'Enter your master password to unlock the vault.');
      return;
    }

    try {
      setMasterUnlockLoading(true);
      const success = await authenticate(masterPasswordInput.trim());
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
      setMasterUnlockLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[theme.background, theme.surface || '#f8f9fa']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <View style={styles.iconContainer}>
              <View style={[styles.shieldContainer, { shadowColor: theme.primary }]}>
                <LinearGradient
                  colors={[theme.primary, theme.primary + 'DD']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.shield}
                >
                  <MaterialCommunityIcons name="account-circle" size={48} color="white" />
                </LinearGradient>
                <View style={[styles.shieldGlow, { backgroundColor: theme.primary + '20' }]} />
              </View>
            </View>
          </Animated.View>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
            Welcome Back!
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign in to continue to your secure vault
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Card style={[styles.formCard, { backgroundColor: theme.surface }]} elevation={3}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <TextInput
                  label="Username or Email"
                  value={username}
                  onChangeText={setUsername}
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="account" color={theme.primary} />}
                  style={[styles.input, { backgroundColor: theme.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  outlineColor={theme.textSecondary + '40'}
                  activeOutlineColor={theme.primary}
                />
              </View>

              <View style={styles.inputGroup}>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={false}
                  left={<TextInput.Icon icon="lock" color={theme.primary} />}
                  style={[styles.input, { backgroundColor: theme.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  placeholder="Enter your password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  outlineColor={theme.textSecondary + '40'}
                  activeOutlineColor={theme.primary}
                />
              </View>

              <View style={styles.forgotButtonsContainer}>
                <Button
                  onPress={() => navigation.navigate('ForgotUsername')}
                  textColor={theme.primary}
                  style={styles.forgotButton}
                  compact
                  labelStyle={styles.forgotButtonLabel}
                >
                  Forgot Username?
                </Button>
                <Text style={[styles.forgotSeparator, { color: theme.textSecondary + '60' }]}>•</Text>
                <Button
                  onPress={() => navigation.navigate('ForgotPassword')}
                  textColor={theme.primary}
                  style={styles.forgotButton}
                  compact
                  labelStyle={styles.forgotButtonLabel}
                >
                  Forgot Password?
                </Button>
              </View>

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={[styles.loginButton, { backgroundColor: theme.primary }]}
                buttonColor={theme.primary}
                labelStyle={styles.buttonLabel}
                contentStyle={styles.buttonContent}
                icon="login"
              >
                Log In
              </Button>

              <Card style={[styles.masterCard, { backgroundColor: theme.surface }]} elevation={1}>
                <View style={styles.masterHeader}>
                  <Text variant="titleSmall" style={{ color: theme.text }}>Unlock with Master Password</Text>
                  <Button
                    onPress={() => setMasterUnlockVisible(prev => !prev)}
                    compact
                    textColor={theme.primary}
                  >
                    {masterUnlockVisible ? 'Hide' : 'Show'}
                  </Button>
                </View>
                {masterUnlockVisible && (
                  <View style={styles.masterForm}>
                    <TextInput
                      label="Master Password"
                      value={masterPasswordInput}
                      onChangeText={setMasterPasswordInput}
                      mode="outlined"
                      secureTextEntry
                      style={{ backgroundColor: theme.surface }}
                      left={<TextInput.Icon icon="shield-key" color={theme.primary} />}
                    />
                    <Button
                      mode="contained"
                      onPress={handleMasterUnlock}
                      loading={masterUnlockLoading}
                      disabled={masterUnlockLoading}
                      style={[styles.loginButton, { backgroundColor: theme.primary }]}
                      buttonColor={theme.primary}
                    >
                      Unlock Vault
                    </Button>
                  </View>
                )}
              </Card>
            </View>
          </Card>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.textSecondary + '30' }]} />
            <Text style={[styles.dividerText, { color: theme.textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.textSecondary + '30' }]} />
          </View>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('SignUp')}
            style={[styles.signUpButton, { borderColor: theme.primary, borderWidth: 2 }]}
            textColor={theme.primary}
            labelStyle={[styles.buttonLabel, { color: theme.primary }]}
            contentStyle={styles.buttonContent}
            icon="account-plus"
          >
            Create New Account
          </Button>

          {biometricAvailable && (
            <Button
              mode="outlined"
              onPress={handleBiometricLogin}
              style={[styles.biometricButton, { borderColor: theme.primary, borderWidth: 2 }]}
              textColor={theme.primary}
              icon="fingerprint"
              labelStyle={[styles.buttonLabel, { color: theme.primary }]}
              contentStyle={styles.buttonContent}
            >
              Sign in with Biometrics
            </Button>
          )}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  shieldContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  shieldGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
    zIndex: -1,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  formContainer: {
    gap: 16,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 0,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  input: {
    borderRadius: 12,
  },
  inputContent: {
    paddingHorizontal: 4,
  },
  inputOutline: {
    borderRadius: 12,
  },
  forgotButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    gap: 8,
  },
  forgotButton: {
    marginTop: -4,
  },
  forgotButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  forgotSeparator: {
    fontSize: 12,
    marginHorizontal: 4,
    opacity: 0.6,
  },
  loginButton: {
    borderRadius: 12,
    marginTop: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  masterCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  masterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterForm: {
    marginTop: 8,
    gap: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  signUpButton: {
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  biometricButton: {
    borderRadius: 12,
    marginTop: 8,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
