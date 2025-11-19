import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logout as logoutStorage } from '../services/fileStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MasterPasswordPromptScreenProps {
  navigation: any;
  onAuthenticated: () => void;
}

export const MasterPasswordPromptScreen: React.FC<MasterPasswordPromptScreenProps> = ({
  navigation,
  onAuthenticated,
}) => {
  const { theme } = useTheme();
  const rootNavigation = useNavigation();
  const { authenticate, authenticateWithBiometric, checkBiometricAvailable, logout: logoutAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const available = await checkBiometricAvailable();
    setBiometricAvailable(available);
  };

  const handlePasswordAuth = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your master password');
      return;
    }

    setLoading(true);
    try {
      const success = await authenticate(password);
      if (success) {
        setPassword('');
        onAuthenticated();
      } else {
        Alert.alert('Error', 'Incorrect master password. Please try again.');
        setPassword('');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setLoading(true);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        setPassword(''); // Clear password field
        onAuthenticated();
      } else {
        // Don't show error alert - just let user enter password manually
        // Alert.alert('Error', 'Biometric authentication failed');
        console.log('Biometric authentication failed - user can enter password');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      // Don't show error alert - just let user enter password manually
      // Alert.alert('Error', 'An error occurred during biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotMasterPassword = () => {
    Alert.alert(
      '⚠️ Forgot Master Password?',
      'Your master password is different from your account login password. It was set when you:\n\n1. First created your account\n2. Set up your vault encryption\n\n⚠️ IMPORTANT:\n• We CANNOT recover or reset your master password (for security reasons)\n• If you forgot it, you CANNOT access your encrypted vault data\n• Your encrypted data (passwords, MFA, aliases) will be lost\n\n📋 What to do next:\n\nOption 1: Try Again\n• Try different passwords you might have used\n• Check if you saved it securely\n• Go back to login and try again\n\nOption 2: Create New Account\n• Create a new account with a new master password\n• You will lose all encrypted data from this account\n• Make sure to remember your new master password\n\nWhich option would you like to choose?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Try Again',
          onPress: async () => {
            // Clear session and navigate to Login
            try {
              await logoutAuth();
              await logoutStorage();
              // Clear current user session
              await AsyncStorage.removeItem('@current_user');
              // Reset navigation stack to Auth > Login using nested state
              rootNavigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Auth',
                      state: {
                        routes: [{ name: 'Login' }],
                        index: 0,
                      },
                    },
                  ],
                })
              );
            } catch (error) {
              console.error('Error during logout:', error);
              // Fallback: reset to Auth (will show Welcome screen)
              try {
                rootNavigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                  })
                );
              } catch (navError) {
                console.error('Navigation error:', navError);
              }
            }
          },
        },
        {
          text: 'Create New Account',
          style: 'destructive',
          onPress: async () => {
            // Warn user about data loss
            Alert.alert(
              '⚠️ Warning: Data Loss',
              'Creating a new account will:\n\n• Delete all your current encrypted data\n• Remove all saved passwords\n• Remove all MFA approvals\n• Remove all email aliases\n• You cannot recover this data\n\nAre you sure you want to create a new account?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Create New Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Clear all user data and session
                      await logoutAuth();
                      await logoutStorage();
                      // Clear current user from AsyncStorage
                      await AsyncStorage.removeItem('@current_user');
                      // Reset navigation stack to Auth > SignUp using nested state
                      rootNavigation.dispatch(
                        CommonActions.reset({
                          index: 0,
                          routes: [
                            {
                              name: 'Auth',
                              state: {
                                routes: [{ name: 'SignUp' }],
                                index: 0,
                              },
                            },
                          ],
                        })
                      );
                    } catch (error) {
                      console.error('Error clearing user data:', error);
                      // Fallback: reset to Auth (will show Welcome screen)
                      try {
                        rootNavigation.dispatch(
                          CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                          })
                        );
                      } catch (navError) {
                        console.error('Navigation error:', navError);
                      }
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.shield, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="shield-lock" size={48} color="white" />
          </View>
        </View>

        <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
          Enter Master Password
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your master password to unlock your encrypted vault. This is different from your account login password.
        </Text>

        <View style={styles.passwordContainer}>
          <TextInput
            label="Your Master Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={false}
            left={<TextInput.Icon icon="lock" />}
            style={[styles.input, { backgroundColor: theme.surface }]}
            autoFocus
            onSubmitEditing={handlePasswordAuth}
            placeholder="Enter your master password"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
          <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text variant="bodySmall" style={[styles.infoTitle, { color: theme.text }]}>
              About Master Password
            </Text>
            <Text variant="bodySmall" style={[styles.infoText, { color: theme.textSecondary }]}>
              • Master password is DIFFERENT from your account login password{'\n'}
              • You set it when you first signed up or after login{'\n'}
              • It encrypts all your vault data (passwords, MFA, aliases){'\n'}
              • If you forgot it, your encrypted data cannot be recovered
            </Text>
          </View>
        </View>

        <Text variant="bodySmall" style={[styles.helperText, { color: theme.textSecondary }]}>
          Enter the master password you set when you created your account or during setup.
        </Text>

        <Button
          mode="contained"
          onPress={handlePasswordAuth}
          loading={loading}
          disabled={loading}
          style={styles.unlockButton}
          buttonColor={theme.primary}
        >
          Unlock My Vault
        </Button>

        <Button
          mode="text"
          onPress={handleForgotMasterPassword}
          textColor={theme.textSecondary}
          style={styles.forgotButton}
          compact
        >
          Forgot Master Password?
        </Button>

        {biometricAvailable && (
          <Button
            mode="outlined"
            onPress={handleBiometricAuth}
            disabled={loading}
            style={[styles.biometricButton, { borderColor: theme.primary }]}
            textColor={theme.primary}
            icon="fingerprint"
          >
            Use Biometric Instead
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    padding: 24,
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shield: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  passwordContainer: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 8,
  },
  helperText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  unlockButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  biometricButton: {
    paddingVertical: 8,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  forgotButton: {
    marginTop: 8,
  },
});

