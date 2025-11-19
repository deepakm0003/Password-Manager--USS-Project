import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserByUsername, initStorage, verifyMasterPassword, changeMasterPassword } from '../services/fileStorage';
import { validateEmail, validatePassword, validatePasswordMatch } from '../utils/validators';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useTheme } from '../contexts/ThemeContext';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleEmailSubmit = async () => {
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      Alert.alert('Error', emailValidation.error || 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await initStorage();
      
      // Search for user by email
      const foundUser = await getUserByUsername(email);
      
      if (foundUser) {
        setUser(foundUser);
        setUsername(foundUser.username);
        setStep('verify');
      } else {
        Alert.alert(
          'Account Not Found',
          'No account found with this email address. Please check your email and try again.'
        );
      }
    } catch (error) {
      console.error('Error finding user:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      // Verify current password
      const isValid = await verifyMasterPassword(user, currentPassword);
      
      if (isValid) {
        setStep('reset');
      } else {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      Alert.alert('Error', 'An error occurred while verifying your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.error);
      return;
    }

    const passwordMatchValidation = validatePasswordMatch(newPassword, confirmPassword);
    if (!passwordMatchValidation.valid) {
      Alert.alert('Error', passwordMatchValidation.error);
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      // Change master password
      await changeMasterPassword(user.id, currentPassword, newPassword);
      
      Alert.alert(
        'Password Changed',
        'Your master password has been successfully changed. Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login screen
              navigation.replace('Login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <TextInput
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        left={<TextInput.Icon icon="email" />}
        style={styles.input}
        placeholder="your.email@example.com"
      />

      <Button
        mode="contained"
        onPress={handleEmailSubmit}
        loading={loading}
        disabled={loading || !email}
        style={styles.submitButton}
        buttonColor={theme.primary}
      >
        Continue
      </Button>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <Card style={[styles.warningCard, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <View style={styles.warningContent}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#f59e0b" />
            <Text variant="bodyMedium" style={[styles.warningText, { color: theme.text }]}>
              To reset your password, you need to verify your current password. This ensures the security of your account.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Text variant="bodyMedium" style={[styles.infoText, { color: theme.textSecondary }]}>
        Account: <Text style={{ fontWeight: 'bold' }}>{username}</Text>
      </Text>

      <TextInput
        label="Current Password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        mode="outlined"
        secureTextEntry={false}
        left={<TextInput.Icon icon="lock" />}
        style={styles.input}
        placeholder="Enter your current password"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button
        mode="contained"
        onPress={handleVerifyPassword}
        loading={loading}
        disabled={loading || !currentPassword}
        style={styles.submitButton}
        buttonColor={theme.primary}
      >
        Verify Password
      </Button>

      <Button
        mode="text"
        onPress={() => setStep('email')}
        textColor={theme.textSecondary}
        style={styles.backButton}
      >
        Back
      </Button>
    </>
  );

  const renderResetStep = () => (
    <>
      <Card style={[styles.warningCard, { backgroundColor: '#fef3c7' }]}>
        <Card.Content>
          <View style={styles.warningContent}>
            <MaterialCommunityIcons name="information" size={24} color="#f59e0b" />
            <Text variant="bodySmall" style={[styles.warningText, { color: '#92400e' }]}>
              Your new master password will be used to re-encrypt all your saved passwords. Make sure you remember this password, as you won't be able to recover your data without it.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <TextInput
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        mode="outlined"
        secureTextEntry={false}
        left={<TextInput.Icon icon="lock" />}
        style={styles.input}
        placeholder="Enter your new password"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <PasswordStrengthIndicator password={newPassword} />

      <TextInput
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        mode="outlined"
        secureTextEntry={false}
        left={<TextInput.Icon icon="lock" />}
        style={styles.input}
        placeholder="Confirm your new password"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button
        mode="contained"
        onPress={handleResetPassword}
        loading={loading}
        disabled={loading || !newPassword || !confirmPassword}
        style={styles.submitButton}
        buttonColor={theme.primary}
      >
        Reset Password
      </Button>

      <Button
        mode="text"
        onPress={() => setStep('verify')}
        textColor={theme.textSecondary}
        style={styles.backButton}
      >
        Back
      </Button>
    </>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          textColor={theme.primary}
          style={styles.backButton}
        >
          Back
        </Button>
        <View style={styles.iconContainer}>
          <View style={[styles.shield, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="lock-reset" size={32} color="white" />
          </View>
        </View>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
          Reset Password
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {step === 'email' && 'Enter your email to begin password reset'}
          {step === 'verify' && 'Verify your current password'}
          {step === 'reset' && 'Enter your new password'}
        </Text>
      </View>

      <View style={styles.form}>
        {step === 'email' && renderEmailStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'reset' && renderResetStep()}
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={[styles.footerText, { color: theme.textSecondary }]}>
          Remember your password?{' '}
        </Text>
        <Button
          onPress={() => navigation.navigate('Login')}
          textColor={theme.primary}
          compact
          style={styles.linkButton}
        >
          Back to Login
        </Button>
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
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 24,
  },
  shield: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  submitButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
  warningCard: {
    marginBottom: 16,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningText: {
    flex: 1,
    lineHeight: 20,
  },
  infoText: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    textAlign: 'center',
  },
  linkButton: {
    marginTop: -4,
  },
});

