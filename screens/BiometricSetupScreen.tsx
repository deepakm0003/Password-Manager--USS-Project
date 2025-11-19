import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isBiometricAvailable, getSupportedBiometrics, storeMasterPasswordForBiometric } from '../services/auth';
import { setBiometricEnabled, getCurrentUser } from '../services/fileStorage';
import { useAuth } from '../contexts/AuthContext';

interface BiometricSetupScreenProps {
  navigation: any;
  route: { params: { username: string; email: string } };
}

export const BiometricSetupScreen: React.FC<BiometricSetupScreenProps> = ({ navigation, route }) => {
  const { setMasterPassword, masterPassword } = useAuth();
  const [available, setAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const isAvailable = await isBiometricAvailable();
    setAvailable(isAvailable);

    if (isAvailable) {
      const types = await getSupportedBiometrics();
      if (types.includes(1)) {
        // FINGERPRINT
        setBiometricType('Fingerprint');
      } else if (types.includes(2)) {
        // FACIAL_RECOGNITION
        setBiometricType('Face ID');
      } else {
        setBiometricType('Biometric');
      }
    }
  };

  const handleEnableBiometric = async () => {
    if (!available) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }

    setLoading(true);
    try {
      // If we have master password from signup, use it
      if (masterPassword) {
        await setMasterPassword(masterPassword);
        await setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric authentication enabled successfully');
        navigation.replace('Main');
      } else {
        // Master password not available, skip for now
        await setBiometricEnabled(false);
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Error enabling biometric:', error);
      Alert.alert('Error', 'Failed to enable biometric authentication');
      // Continue anyway
      navigation.replace('Main');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="fingerprint" size={100} color="#6366f1" />
        </View>

        <Text variant="headlineSmall" style={styles.title}>
          Enable {biometricType} Authentication
        </Text>

        <Text variant="bodyLarge" style={styles.description}>
          Use your {biometricType.toLowerCase()} to quickly and securely access your vault without entering your master password every time.
        </Text>

        {!available && (
          <View style={styles.warningContainer}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#f59e0b" />
            <Text variant="bodyMedium" style={styles.warningText}>
              Biometric authentication is not available on this device.
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          {available && (
            <Button
              mode="contained"
              onPress={handleEnableBiometric}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              buttonColor="#6366f1"
              icon="fingerprint"
            >
              Enable {biometricType}
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={handleSkip}
            style={styles.secondaryButton}
            textColor="#6366f1"
          >
            Skip for Now
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
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
    marginBottom: 32,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    flex: 1,
    color: '#92400e',
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    paddingVertical: 8,
  },
  secondaryButton: {
    paddingVertical: 8,
    borderColor: '#6366f1',
  },
});
