import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { setMasterPassword, getCurrentUser } from '../services/fileStorage';
import { validatePassword, validatePasswordMatch } from '../utils/validators';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface MasterPasswordSetupScreenProps {
  navigation: any;
  route: {
    params: {
      username: string;
      email: string;
      isFirstTime?: boolean;
    };
  };
}

export const MasterPasswordSetupScreen: React.FC<MasterPasswordSetupScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { setMasterPassword: setMasterPasswordInAuth } = useAuth();
  
  // Safely get route params with defaults
  const routeParams = route?.params || {};
  const username = routeParams.username || '';
  const email = routeParams.email || '';
  const isFirstTime = routeParams.isFirstTime !== undefined ? routeParams.isFirstTime : true;
  
  const [masterPassword, setMasterPasswordValue] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log route params on mount
  React.useEffect(() => {
    console.log('=== MasterPasswordSetupScreen Mounted ===');
    console.log('Route:', route);
    console.log('Route params:', routeParams);
    console.log('Username:', username, 'Email:', email, 'IsFirstTime:', isFirstTime);
    
    // Verify user exists
    const checkUser = async () => {
      try {
        const user = await getCurrentUser();
        console.log('Current user:', user ? { id: user.id, username: user.username, email: user.email } : 'None');
        if (!user) {
          console.warn('WARNING: No user found in AsyncStorage');
        }
      } catch (err) {
        console.error('Error checking user:', err);
      }
    };
    checkUser();
  }, []);

  const handleSetMasterPassword = async () => {
    // Validate master password
    const passwordValidation = validatePassword(masterPassword);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.error || 'Invalid master password');
      return;
    }

    // Validate password match
    const passwordMatchValidation = validatePasswordMatch(masterPassword, confirmMasterPassword);
    if (!passwordMatchValidation.valid) {
      Alert.alert('Error', passwordMatchValidation.error || 'Passwords do not match');
      return;
    }

    // Warn user about master password importance
    Alert.alert(
      '⚠️ CRITICAL: Master Password Setup',
      'Your master password is DIFFERENT from your account login password.\n\n• Master password = Encrypts your vault (passwords, MFA, aliases)\n• Account password = Logs you into the app\n\n⚠️ If you forget your master password:\n• You CANNOT recover your encrypted vault data\n• We CANNOT reset it (for security reasons)\n• You will lose all your saved passwords and data\n\n✅ Make sure to:\n• Remember this password or store it securely\n• Use a strong, unique password\n• Never share it with anyone\n\nDo you understand and want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'I Understand, Continue',
          style: 'destructive',
          onPress: async () => {
            await proceedWithMasterPasswordSetup();
          },
        },
      ]
    );
  };

  const proceedWithMasterPasswordSetup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize storage first
      const { initStorage } = await import('../services/fileStorage');
      await initStorage();
      
      const user = await getCurrentUser();
      if (!user) {
        const errorMsg = 'User not found. Please log in again.';
        setError(errorMsg);
        Alert.alert('Error', errorMsg, [
          {
            text: 'Go to Login',
            onPress: () => navigation.replace('Login'),
          },
        ]);
        setLoading(false);
        return;
      }

      console.log('Setting master password for user:', user.id);
      
      // Set master password for user
      try {
        await setMasterPassword(user.id, masterPassword);
        console.log('Master password set successfully');
      } catch (setError: any) {
        console.error('Error in setMasterPassword:', setError);
        throw new Error(setError.message || 'Failed to set master password in storage');
      }
      
      // Store master password in auth context for session
      try {
        await setMasterPasswordInAuth(masterPassword);
        console.log('Master password stored in auth context');
      } catch (authError: any) {
        console.error('Error storing master password in auth context:', authError);
        // Don't fail - this is for session management
      }
      
      // Store master password for biometric unlock (optional)
      try {
        const AuthService = await import('../services/auth');
        await AuthService.storeMasterPasswordForBiometric(masterPassword);
        console.log('Master password stored for biometric');
      } catch (biometricError) {
        console.log('Could not store master password for biometric (continuing anyway):', biometricError);
        // Don't fail - biometric is optional
      }

      // Success - show alert and navigate
      Alert.alert(
        'Master Password Set',
        'Your master password has been set successfully. Your vault will be encrypted with this password.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (isFirstTime) {
                // Navigate to biometric setup
                navigation.replace('BiometricSetup', {
                  username: user.username || username,
                  email: user.email || email,
                });
              } else {
                // Navigate to main app
                navigation.replace('Main');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error setting master password:', error);
      const errorMessage = error?.message || 'Failed to set master password. Please try again.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage, [
        {
          text: 'OK',
          onPress: () => setError(null),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <View style={[styles.shield, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="shield-lock" size={48} color="white" />
          </View>
        </View>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
          Set Master Password
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your master password encrypts your vault. This is DIFFERENT from your account login password.
        </Text>
        <View style={[styles.warningBox, { backgroundColor: '#fff7ed', borderColor: '#f59e0b', borderWidth: 2 }]}>
          <MaterialCommunityIcons name="alert" size={20} color="#d97706" />
          <View style={styles.warningContent}>
            <Text variant="bodySmall" style={[styles.warningTitle, { color: '#92400e' }]}>
              ⚠️ IMPORTANT: Remember This Password
            </Text>
            <Text variant="bodySmall" style={[styles.warningText, { color: '#78350f' }]}>
              If you forget your master password, you CANNOT recover your encrypted vault data. We cannot reset it for security reasons.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text variant="labelMedium" style={styles.label}>
            Master Password
          </Text>
          <TextInput
            label="Master Password"
            value={masterPassword}
            onChangeText={(text) => {
              console.log('Master password changed:', text.length, 'characters');
              setMasterPasswordValue(text);
              setError(null);
            }}
            mode="outlined"
            secureTextEntry={false}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="next"
            editable={true}
            left={<TextInput.Icon icon="lock" />}
            placeholder="Enter master password"
            style={styles.input}
            activeOutlineColor={theme.primary}
            outlineColor={theme.textSecondary}
          />
          <PasswordStrengthIndicator password={masterPassword} />
          <Text variant="bodySmall" style={[styles.hint, { color: theme.textSecondary }]}>
            This password encrypts your vault. Make it strong and memorable. Write it down securely if needed.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text variant="labelMedium" style={styles.label}>
            Confirm Master Password
          </Text>
          <TextInput
            label="Confirm Master Password"
            value={confirmMasterPassword}
            onChangeText={(text) => {
              console.log('Confirm master password changed:', text.length, 'characters');
              setConfirmMasterPassword(text);
              setError(null);
            }}
            mode="outlined"
            secureTextEntry={false}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="done"
            onSubmitEditing={handleSetMasterPassword}
            editable={true}
            left={<TextInput.Icon icon="lock" />}
            placeholder="Confirm master password"
            style={styles.input}
            activeOutlineColor={theme.primary}
            outlineColor={theme.textSecondary}
          />
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
            <View style={styles.errorContent}>
              <Text variant="bodySmall" style={[styles.errorText, { color: '#991b1b' }]}>
                {error}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
          <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text variant="bodySmall" style={[styles.infoTitle, { color: theme.text }]}>
              About Master Password
            </Text>
            <Text variant="bodySmall" style={[styles.infoText, { color: theme.textSecondary }]}>
              • Master password is DIFFERENT from account login password{'\n'}
              • You set it ONCE during setup (this screen){'\n'}
              • It encrypts ALL vault data (passwords, MFA, email aliases){'\n'}
              • If forgotten, encrypted data CANNOT be recovered{'\n'}
              • We CANNOT reset it (zero-knowledge security){'\n'}
              • Write it down securely or use a password manager
            </Text>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSetMasterPassword}
          loading={loading}
          disabled={loading || !masterPassword || !confirmMasterPassword || masterPassword !== confirmMasterPassword}
          style={styles.setupButton}
          buttonColor={theme.primary}
        >
          Set Master Password
        </Button>
        
        {masterPassword !== confirmMasterPassword && confirmMasterPassword.length > 0 && (
          <Text variant="bodySmall" style={[styles.errorText, { color: '#ef4444', textAlign: 'center', marginTop: 8 }]}>
            Passwords do not match
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  shield: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
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
  errorBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  errorContent: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
  },
  setupButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontWeight: '700',
    marginBottom: 4,
    fontSize: 13,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

