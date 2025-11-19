import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated } from 'react-native';
import { Text, List, Switch, Button, Divider, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentUser, logout as logoutStorage, isBiometricEnabled, setBiometricEnabled } from '../services/fileStorage';
import { isBiometricAvailable } from '../services/auth';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { logout: logoutAuth } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    loadSettings();
    const unsubscribe = navigation.addListener('focus', loadSettings);
    return unsubscribe;
  }, [navigation]);

  const loadSettings = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      const enabled = await isBiometricEnabled();
      setBiometricEnabledState(enabled);
      
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      await setBiometricEnabled(value);
      setBiometricEnabledState(value);
      Alert.alert('Success', value ? 'Biometric authentication enabled' : 'Biometric authentication disabled');
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutAuth();
              await logoutStorage();
              navigation.replace('Auth');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[theme.background, theme.surface || '#f8f9fa']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Card style={[styles.headerCard, { backgroundColor: theme.surface }]} elevation={3}>
            <View style={styles.titleContainer}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '15' }]}>
                <MaterialCommunityIcons name="cog" size={24} color={theme.primary} />
              </View>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
                Settings
              </Text>
            </View>
            {user && (
              <View style={[styles.userInfoCard, { backgroundColor: theme.primary + '08' }]}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.avatarText, { color: 'white' }]}>
                    {user.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text variant="titleMedium" style={[styles.usernameText, { color: theme.text }]}>
                    {user.username}
                  </Text>
                  <Text variant="bodySmall" style={[styles.emailText, { color: theme.textSecondary }]}>
                    {user.email}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Card style={[styles.sectionCard, { backgroundColor: theme.surface }]} elevation={2}>
            <List.Section style={styles.listSection}>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.text }]}>
                Account
              </Text>
              {user && (
                <>
                  <List.Item
                    title="Username"
                    description={user.username}
                    left={(props) => (
                      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                        <List.Icon {...props} icon="account" color={theme.primary} />
                      </View>
                    )}
                    titleStyle={styles.listItemTitle}
                    descriptionStyle={styles.listItemDescription}
                    style={styles.listItem}
                  />
                  <View style={[styles.divider, { backgroundColor: theme.textSecondary + '20' }]} />
                  <List.Item
                    title="Email"
                    description={user.email}
                    left={(props) => (
                      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                        <List.Icon {...props} icon="email" color={theme.primary} />
                      </View>
                    )}
                    titleStyle={styles.listItemTitle}
                    descriptionStyle={styles.listItemDescription}
                    style={styles.listItem}
                  />
                </>
              )}
            </List.Section>
          </Card>

          <Card style={[styles.sectionCard, { backgroundColor: theme.surface }]} elevation={2}>
            <List.Section style={styles.listSection}>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.text }]}>
                Security
              </Text>
              <List.Item
                title="Master Password Info"
                description={user?.masterPasswordHash ? 'Master password is set ✓' : 'Master password not set'}
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="shield-lock" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                onPress={() => {
                  Alert.alert(
                    'Master Password Information',
                    user?.masterPasswordHash
                      ? '✅ Master Password Status: SET\n\n' +
                        'Your master password is different from your account login password:\n\n' +
                        '• Account Password = Logs you into the app\n' +
                        '• Master Password = Encrypts your vault data\n\n' +
                        '⚠️ Important:\n' +
                        '• We cannot show your master password (it\'s encrypted)\n' +
                        '• We cannot reset it (for security reasons)\n' +
                        '• If you forget it, you cannot recover encrypted data\n' +
                        '• You set it when you first created your account\n\n' +
                        '💡 Tip: If you forgot your master password, try:\n' +
                        '• Common passwords you might have used\n' +
                        '• Check if you saved it securely\n' +
                        '• Contact support (but they cannot recover it)'
                      : '⚠️ Master Password Status: NOT SET\n\n' +
                        'You need to set a master password to encrypt your vault.\n\n' +
                        'What is a master password?\n' +
                        '• Different from your account login password\n' +
                        '• Encrypts all your vault data (passwords, MFA, aliases)\n' +
                        '• Required to access your encrypted data\n\n' +
                        'To set it:\n' +
                        '1. Logout and login again\n' +
                        '2. You will be prompted to set a master password\n\n' +
                        '⚠️ Warning: If you forget your master password, you cannot recover your encrypted vault data.',
                    [{ text: 'OK' }]
                  );
                }}
              />
              <View style={[styles.divider, { backgroundColor: theme.textSecondary + '20' }]} />
              <List.Item
                title="Security Dashboard"
                description="View security score and recommendations"
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="shield-check" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                onPress={() => navigation.navigate('SecurityDashboard')}
                right={() => <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
              />
              <View style={[styles.divider, { backgroundColor: theme.textSecondary + '20' }]} />
              <List.Item
                title="Privacy Dashboard"
                description="View digital hygiene score and privacy metrics"
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="shield-account" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                onPress={() => navigation.navigate('PrivacyDashboard')}
                right={() => <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
              />
              <View style={[styles.divider, { backgroundColor: theme.textSecondary + '20' }]} />
              <List.Item
                title="Biometric Authentication"
                description={biometricAvailable ? 'Use fingerprint or Face ID to unlock' : 'Not available on this device'}
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="fingerprint" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                right={() => (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    disabled={!biometricAvailable}
                    trackColor={{ false: theme.textSecondary + '40', true: theme.primary + '80' }}
                    thumbColor={biometricEnabled ? theme.primary : '#f4f3f4'}
                  />
                )}
              />
              <View style={[styles.divider, { backgroundColor: theme.textSecondary + '20' }]} />
              <List.Item
                title="MFA Approval Center"
                description="Approve or deny login attempts"
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="shield-alert" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                onPress={() => {
                  // Navigate to MFA tab
                  const parent = navigation.getParent()?.getParent();
                  if (parent) {
                    parent.navigate('Main', { screen: 'MFA' });
                  }
                }}
                right={() => <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
              />
            </List.Section>
          </Card>

          <Card style={[styles.sectionCard, { backgroundColor: theme.surface }]} elevation={2}>
            <List.Section style={styles.listSection}>
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.text }]}>
                Help & Support
              </Text>
              <List.Item
                title="Theme Settings"
                description="Customize app colors and appearance"
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="palette" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                onPress={() => navigation.navigate('ThemeSettings')}
                right={() => <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
              />
              <View style={[styles.divider, { backgroundColor: theme.textSecondary + '20' }]} />
              <List.Item
                title="Tutorial / Onboarding"
                description="View the app tutorial again"
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="book-open" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                onPress={() => navigation.navigate('Onboarding')}
                right={() => <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
              />
              <View style={[styles.divider, { backgroundColor: theme.textSecondary + '20' }]} />
              <List.Item
                title="About"
                description="App version and information"
                left={(props) => (
                  <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                    <List.Icon {...props} icon="information" color={theme.primary} />
                  </View>
                )}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDescription}
                style={styles.listItem}
                onPress={() => Alert.alert('About', 'Unified Authentication Manager v1.0.0')}
                right={() => <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
              />
            </List.Section>
          </Card>

          <View style={styles.logoutContainer}>
            <Button
              mode="contained"
              onPress={handleLogout}
              style={[styles.logoutButton, { backgroundColor: '#ef4444' }]}
              buttonColor="#ef4444"
              icon="logout"
              labelStyle={styles.logoutButtonLabel}
              contentStyle={styles.logoutButtonContent}
            >
              Logout
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
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerCard: {
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
    letterSpacing: -0.3,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  usernameText: {
    fontWeight: '600',
    marginBottom: 4,
  },
  emailText: {
    opacity: 0.8,
  },
  sectionCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  listSection: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listItemTitle: {
    fontWeight: '600',
    fontSize: 15,
  },
  listItemDescription: {
    fontSize: 13,
    opacity: 0.8,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  logoutContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  logoutButton: {
    borderRadius: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoutButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  logoutButtonContent: {
    paddingVertical: 6,
  },
});
