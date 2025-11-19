import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserByUsername, initStorage } from '../services/fileStorage';
import { validateEmail } from '../utils/validators';
import { useTheme } from '../contexts/ThemeContext';

interface ForgotUsernameScreenProps {
  navigation: any;
}

export const ForgotUsernameScreen: React.FC<ForgotUsernameScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const handleRecoverUsername = async () => {
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
      const user = await getUserByUsername(email);
      
      if (user) {
        // User found - show username
        setUsername(user.username);
      } else {
        // User not found
        Alert.alert(
          'Username Not Found',
          'No account found with this email address. Please check your email and try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setEmail('');
                setUsername(null);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error recovering username:', error);
      Alert.alert('Error', 'An error occurred while recovering your username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <MaterialCommunityIcons name="account-question" size={32} color="white" />
          </View>
        </View>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
          Forgot Username?
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your email address to recover your username
        </Text>
      </View>

      <View style={styles.form}>
        {!username ? (
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
              onPress={handleRecoverUsername}
              loading={loading}
              disabled={loading || !email}
              style={styles.submitButton}
              buttonColor={theme.primary}
            >
              Recover Username
            </Button>
          </>
        ) : (
          <View style={[styles.successContainer, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="check-circle" size={64} color={theme.primary} style={styles.successIcon} />
            <Text variant="titleLarge" style={[styles.successTitle, { color: theme.text }]}>
              Username Found!
            </Text>
            <Text variant="bodyMedium" style={[styles.successText, { color: theme.textSecondary }]}>
              Your username is:
            </Text>
            <View style={[styles.usernameContainer, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
              <Text variant="headlineSmall" style={[styles.usernameText, { color: theme.primary }]}>
                {username}
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={() => {
                setUsername(null);
                setEmail('');
                navigation.navigate('Login');
              }}
              style={styles.loginButton}
              buttonColor={theme.primary}
            >
              Go to Login
            </Button>
          </View>
        )}

        <View style={styles.footer}>
          <Text variant="bodySmall" style={[styles.footerText, { color: theme.textSecondary }]}>
            Remember your username?{' '}
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
  },
  submitButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
  successContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  usernameContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 24,
    minWidth: '100%',
    alignItems: 'center',
  },
  usernameText: {
    fontWeight: 'bold',
  },
  loginButton: {
    paddingVertical: 8,
    minWidth: '100%',
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

