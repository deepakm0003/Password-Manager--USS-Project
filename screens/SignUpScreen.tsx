import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateEmail, validateUsername, validatePassword, validatePasswordMatch } from '../utils/validators';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { createUser, setOnboardingCompleted, initStorage } from '../services/fileStorage';

interface SignUpScreenProps {
  navigation: any;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
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

  const handleSignUp = async () => {
    // Validate all fields
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      Alert.alert('Error', emailValidation.error);
      return;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      Alert.alert('Error', usernameValidation.error);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.error);
      return;
    }

    const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
    if (!passwordMatchValidation.valid) {
      Alert.alert('Error', passwordMatchValidation.error);
      return;
    }

    setLoading(true);
    try {
      await initStorage();

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim();

      const user = await createUser(normalizedUsername, normalizedEmail, password);

      await AsyncStorage.setItem('@current_user', JSON.stringify(user));
      await setOnboardingCompleted();

      navigation.replace('MasterPasswordSetup', {
        username: user.username,
        email: user.email,
        isFirstTime: true,
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      const errorMessage = error?.message || 'Failed to create account. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
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
                  <MaterialCommunityIcons name="account-plus" size={48} color="white" />
                </LinearGradient>
                <View style={[styles.shieldGlow, { backgroundColor: theme.primary + '20' }]} />
              </View>
            </View>
          </Animated.View>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
            Create Account
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Join us to secure your digital life
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
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Email Address
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  left={<TextInput.Icon icon="email" color={theme.primary} />}
                  placeholder="your.email@example.com"
                  style={[styles.input, { backgroundColor: theme.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  outlineColor={theme.textSecondary + '40'}
                  activeOutlineColor={theme.primary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Username
                </Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="account" color={theme.primary} />}
                  placeholder="Choose a username"
                  style={[styles.input, { backgroundColor: theme.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  outlineColor={theme.textSecondary + '40'}
                  activeOutlineColor={theme.primary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={false}
                  left={<TextInput.Icon icon="lock" color={theme.primary} />}
                  placeholder="Enter your password"
                  style={[styles.input, { backgroundColor: theme.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  autoCapitalize="none"
                  autoCorrect={false}
                  outlineColor={theme.textSecondary + '40'}
                  activeOutlineColor={theme.primary}
                />
                <PasswordStrengthIndicator password={password} />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Confirm Password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry={false}
                  left={<TextInput.Icon icon="lock-check" color={theme.primary} />}
                  placeholder="Confirm your password"
                  style={[styles.input, { backgroundColor: theme.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  autoCapitalize="none"
                  autoCorrect={false}
                  outlineColor={theme.textSecondary + '40'}
                  activeOutlineColor={theme.primary}
                />
                {confirmPassword && password !== confirmPassword && (
                  <Text variant="bodySmall" style={[styles.errorText, { color: '#ef4444' }]}>
                    Passwords do not match
                  </Text>
                )}
                {confirmPassword && password === confirmPassword && password.length > 0 && (
                  <View style={styles.matchIndicator}>
                    <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
                    <Text variant="bodySmall" style={[styles.matchText, { color: '#10b981' }]}>
                      Passwords match
                    </Text>
                  </View>
                )}
              </View>

              <Button
                mode="contained"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading || !email || !username || !password || !confirmPassword || password !== confirmPassword}
                style={[styles.signUpButton, { backgroundColor: theme.primary }]}
                buttonColor={theme.primary}
                labelStyle={styles.buttonLabel}
                contentStyle={styles.buttonContent}
                icon="account-plus"
              >
                Sign Up
              </Button>
            </View>
          </Card>

          <View style={styles.loginLink}>
            <Text variant="bodyMedium" style={[styles.loginText, { color: theme.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Button
              onPress={() => navigation.navigate('Login')}
              textColor={theme.primary}
              compact
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
            >
              Login
            </Button>
          </View>
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
    gap: 20,
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
  label: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
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
  errorText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },
  signUpButton: {
    borderRadius: 12,
    marginTop: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  loginText: {
    opacity: 0.8,
  },
  loginButton: {
    marginTop: -4,
  },
  loginButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
