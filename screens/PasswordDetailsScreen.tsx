import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PasswordEntry } from '../types';
import { getPassword, savePassword, deletePassword, getCurrentUser, getAllPasswords } from '../services/fileStorage';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { PasswordVulnerabilityAnalyzer } from '../components/PasswordVulnerabilityAnalyzer';
import { analyzePassword } from '../services/passwordAnalyzer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { checkPasswordBreach } from '../services/breachChecker';
import { getWebsiteIcon } from '../services/websiteIconService';
import * as Clipboard from 'expo-clipboard';

interface PasswordDetailsScreenProps {
  navigation: any;
  route: { params: { passwordId?: string } };
}

export const PasswordDetailsScreen: React.FC<PasswordDetailsScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { masterPassword, isAuthenticated } = useAuth();
  const { passwordId } = route.params || {};
  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBreached, setIsBreached] = useState(false);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [fetchingIcon, setFetchingIcon] = useState(false);
  const [passwordAnalysis, setPasswordAnalysis] = useState<ReturnType<typeof analyzePassword> | null>(null);
  const [allPasswords, setAllPasswords] = useState<PasswordEntry[]>([]);

  useEffect(() => {
    // Load all passwords for analysis
    const loadAllPasswords = async () => {
      if (masterPassword && isAuthenticated) {
        try {
          const allPwds = await getAllPasswords(masterPassword);
          setAllPasswords(allPwds);
        } catch (error) {
          console.error('Error loading all passwords for analysis:', error);
        }
      }
    };
    loadAllPasswords();
    
    if (passwordId) {
      loadPassword();
    }
  }, [passwordId, masterPassword, isAuthenticated]);

  useEffect(() => {
    // Check for breach and analyze password when password changes
    if (password && password.length > 0) {
      checkBreach();
      // Analyze password for vulnerabilities
      const analysis = analyzePassword(password, allPasswords);
      setPasswordAnalysis(analysis);
    } else {
      setPasswordAnalysis(null);
    }
  }, [password, allPasswords]);

  useEffect(() => {
    // Fetch website icon when website changes
    if (website && website.trim().length > 0) {
      fetchWebsiteIcon();
    } else {
      setIconUrl(null);
    }
  }, [website]);

  const loadPassword = async () => {
    if (!passwordId || !masterPassword) {
      return;
    }
    
    try {
      setLoading(true);
      console.log('[PasswordDetailsScreen] Loading password from local storage:', passwordId);
      
      // Load password from local encrypted storage
      const entry = await getPassword(passwordId, masterPassword);
      if (entry) {
        setWebsite(entry.website || '');
        setUsername(entry.username || '');
        setPassword(entry.password || '');
        setNotes(entry.notes || '');
        setCategory(entry.category || '');
        setTags(entry.tags || []);
        setIsBreached(entry.isBreached || false);
        setIconUrl(entry.iconUrl || null);
        console.log('[PasswordDetailsScreen] Password loaded successfully');
      } else {
        Alert.alert('Error', 'Password not found');
      }
    } catch (error: any) {
      console.error('[PasswordDetailsScreen] Error loading password:', error);
      const errorMessage = error?.message || 'Failed to load password';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!website || !username || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!masterPassword) {
      Alert.alert('Error', 'Master password is required to encrypt and save passwords');
      return;
    }

    setLoading(true);
    try {
      console.log('[PasswordDetailsScreen] Starting save operation');
      console.log('[PasswordDetailsScreen] Entry data:', { website, username, hasPassword: !!password, passwordId });
      
      // Fetch icon in background (non-blocking) - don't wait for it
      let finalIconUrl = iconUrl;
      if (!finalIconUrl && website && website.trim().length > 0) {
        // Start fetching icon but don't await - save without waiting
        getWebsiteIcon(website)
          .then((fetchedIcon) => {
            if (fetchedIcon) {
              console.log('[PasswordDetailsScreen] Icon fetched in background:', fetchedIcon);
              // Update icon after save if it arrives later
              setIconUrl(fetchedIcon);
              // Optionally update the saved password with icon (for next time)
            }
          })
          .catch((error) => {
            console.error('[PasswordDetailsScreen] Error fetching icon (non-blocking):', error);
            // Continue without icon
          });
      }

      // Save password to local encrypted storage (fast, no network calls)
      const passwordData: Partial<PasswordEntry> & { website: string; username: string; password: string } = {
        ...(passwordId && { id: passwordId }),
        website: website.trim(),
        username: username.trim(),
        password: password, // Will be encrypted by savePassword function
        notes: notes?.trim() || undefined,
        category: category?.trim() || undefined,
        tags: tags || [],
        isBreached: isBreached || false,
        iconUrl: finalIconUrl || undefined,
      };
      
      console.log('[PasswordDetailsScreen] Saving to local encrypted storage...');
      const savedEntry = await savePassword(passwordData, masterPassword);
      console.log('[PasswordDetailsScreen] ✅ Password saved successfully:', savedEntry.id);
      
      // Update icon in background if it arrives after save
      if (!finalIconUrl && website && website.trim().length > 0) {
        // Icon will be fetched in background and saved next time user edits
      }
      
      Alert.alert('Success', 'Password saved successfully and encrypted', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('[PasswordDetailsScreen] ❌ Error saving password:', error);
      const errorMessage = error?.message || 'Failed to save password';
      Alert.alert('Error', errorMessage, [
        {
          text: 'OK',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const checkBreach = async () => {
    if (!password || password.length < 4) return;
    
    setCheckingBreach(true);
    try {
      const breachInfo = await checkPasswordBreach(password);
      setIsBreached(breachInfo.isBreached);
    } catch (error) {
      console.error('Error checking breach:', error);
    } finally {
      setCheckingBreach(false);
    }
  };

  const fetchWebsiteIcon = async () => {
    if (!website || website.trim().length === 0) {
      setIconUrl(null);
      return;
    }

    setFetchingIcon(true);
    try {
      const icon = await getWebsiteIcon(website);
      if (icon) {
        setIconUrl(icon);
      }
    } catch (error) {
      console.error('Error fetching website icon:', error);
    } finally {
      setFetchingIcon(false);
    }
  };

  const handleShare = () => {
    if (!passwordId) {
      Alert.alert('Error', 'Please save the password before sharing');
      return;
    }
    
    const entry: PasswordEntry = {
      id: passwordId,
      website,
      username,
      password,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
      tags,
    };
    
    navigation.navigate('PasswordShare', { passwordEntry: entry });
  };

  const handleCopyPassword = async () => {
    try {
      await Clipboard.setStringAsync(password);
      Alert.alert('Success', 'Password copied to clipboard');
    } catch (error) {
      console.error('Error copying password:', error);
      Alert.alert('Error', 'Failed to copy password');
    }
  };

  const handleCopyUsername = async () => {
    try {
      await Clipboard.setStringAsync(username);
      Alert.alert('Success', 'Username copied to clipboard');
    } catch (error) {
      console.error('Error copying username:', error);
      Alert.alert('Error', 'Failed to copy username');
    }
  };

  const handleDelete = () => {
    if (!passwordId || !masterPassword) {
      Alert.alert('Error', 'Missing required information to delete password');
      return;
    }
    
    Alert.alert(
      'Delete Password',
      'Are you sure you want to delete this password?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[PasswordDetailsScreen] Deleting password from local storage:', passwordId);
              await deletePassword(passwordId, masterPassword);
              console.log('[PasswordDetailsScreen] ✅ Password deleted successfully');
              Alert.alert('Success', 'Password deleted successfully');
              navigation.goBack();
            } catch (error: any) {
              console.error('[PasswordDetailsScreen] Error deleting password:', error);
              const errorMessage = error?.message || 'Failed to delete password';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Button
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          textColor={theme.primary}
        >
          Back
        </Button>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons 
            name={passwordId ? "pencil" : "plus-circle"} 
            size={24} 
            color={theme.primary} 
            style={styles.titleIcon} 
          />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
            {passwordId ? 'Edit Password' : 'Add Password'}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
      <Card style={[styles.card, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <View style={styles.labelLeft}>
                  <MaterialCommunityIcons name="web" size={20} color={theme.primary} />
                  <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                    Website
                  </Text>
                </View>
                <View style={styles.labelRight}>
                  {fetchingIcon && (
                    <MaterialCommunityIcons name="loading" size={16} color={theme.primary} style={styles.loadingIcon} />
                  )}
                  {iconUrl && !fetchingIcon && (
                    <View style={[styles.iconPreview, { borderColor: theme.primary + '40' }]}>
                      <Image source={{ uri: iconUrl }} style={styles.iconPreviewImage} />
                    </View>
                  )}
                </View>
              </View>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                mode="outlined"
                placeholder="example.com"
                style={[styles.input, { backgroundColor: theme.background }]}
                textColor={theme.text}
                left={<TextInput.Icon icon="web" />}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons name="account" size={20} color={theme.primary} />
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Username
                </Text>
                {username && (
                  <Button
                    mode="text"
                    onPress={handleCopyUsername}
                    textColor={theme.primary}
                    icon="content-copy"
                    compact
                    style={styles.copyUsernameButton}
                  >
                    Copy
                  </Button>
                )}
              </View>
              <TextInput
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                placeholder="username"
                style={[styles.input, { backgroundColor: theme.background }]}
                textColor={theme.text}
                left={<TextInput.Icon icon="account" />}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons name="lock" size={20} color={theme.primary} />
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Password
                </Text>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={false}
                style={[styles.input, { backgroundColor: theme.background }]}
                textColor={theme.text}
                left={<TextInput.Icon icon="lock" />}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.passwordActions}>
                <Button
                  mode="text"
                  onPress={handleCopyPassword}
                  textColor={theme.primary}
                  icon="content-copy"
                  compact
                >
                  Copy
                </Button>
              </View>
              <PasswordStrengthIndicator password={password} />
              {passwordAnalysis && (
                <PasswordVulnerabilityAnalyzer analysis={passwordAnalysis} showDetails={true} />
              )}
              {isBreached && (
                <View style={[styles.breachWarning, { backgroundColor: '#fee2e2' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
                  <Text variant="bodySmall" style={[styles.breachText, { color: '#991b1b' }]}>
                    This password has been found in data breaches. Change it immediately.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons name="folder" size={20} color={theme.primary} />
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Category
                </Text>
              </View>
              <TextInput
                value={category}
                onChangeText={setCategory}
                mode="outlined"
                placeholder="e.g., Social Media, Banking, Work"
                style={[styles.input, { backgroundColor: theme.background }]}
                textColor={theme.text}
                left={<TextInput.Icon icon="folder" />}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons name="note-text" size={20} color={theme.primary} />
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Notes
                </Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder="Add any additional notes..."
                style={[styles.input, { backgroundColor: theme.background }]}
                textColor={theme.text}
                left={<TextInput.Icon icon="note-text" />}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Generate')}
          style={[styles.generateButton, { borderColor: theme.primary }]}
          textColor={theme.primary}
          icon="lightning-bolt"
        >
          Generate New Password
        </Button>

        {passwordId && (
          <Button
            mode="outlined"
            onPress={handleShare}
            style={[styles.shareButton, { borderColor: theme.primary }]}
            textColor={theme.primary}
            icon="share-variant"
          >
            Share Password
          </Button>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.saveButton}
          buttonColor={theme.primary}
          icon={passwordId ? "content-save" : "plus"}
        >
          {passwordId ? 'Update' : 'Save'} Password
        </Button>

        {passwordId && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: '#ef4444' }]}
            textColor="#ef4444"
            icon="delete"
          >
            Delete Entry
          </Button>
        )}
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  labelRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  copyUsernameButton: {
    marginLeft: 'auto',
  },
  loadingIcon: {
    // Icon will animate if needed
  },
  iconPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  iconPreviewImage: {
    width: 24,
    height: 24,
  },
  input: {
    marginTop: 4,
  },
  passwordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  breachWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  breachText: {
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  generateButton: {
    paddingVertical: 8,
  },
  shareButton: {
    paddingVertical: 8,
  },
  saveButton: {
    paddingVertical: 8,
  },
  deleteButton: {
    paddingVertical: 8,
  },
  analyzeButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});