import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Switch, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PasswordEntry } from '../types';
import { generateShareLink, copyShareLink, revokeShareLink, getShareLinkForPassword } from '../services/sharingService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import { savePassword } from '../services/fileStorage';

interface PasswordShareScreenProps {
  navigation: any;
  route: { params: { passwordEntry: PasswordEntry } };
}

export const PasswordShareScreen: React.FC<PasswordShareScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { masterPassword } = useAuth();
  const { passwordEntry } = route.params;
  
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxAccess, setMaxAccess] = useState(1);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isShared, setIsShared] = useState(passwordEntry.isShared || false);

  useEffect(() => {
    loadExistingShareLink();
  }, []);

  const loadExistingShareLink = async () => {
    try {
      const { getShareLinkForPassword } = await import('../services/sharingService');
      const existingLink = await getShareLinkForPassword(passwordEntry.id);
      if (existingLink && existingLink.isActive) {
        const shareUrl = `https://unifiedauth.app/share/${existingLink.token}`;
        setShareLink(shareUrl);
        setIsShared(true);
      }
    } catch (error) {
      console.error('Error loading existing share link:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (!masterPassword) {
      Alert.alert('Error', 'Master password required for sharing');
      return;
    }

    setLoading(true);
    try {
      const link = await generateShareLink(passwordEntry, masterPassword, expiresInHours, maxAccess);
      const shareUrl = `https://unifiedauth.app/share/${link.token}`;
      setShareLink(shareUrl);
      setIsShared(true);
      
      // Update password entry to mark as shared
      try {
        await savePassword(
          {
            id: passwordEntry.id,
            website: passwordEntry.website,
            username: passwordEntry.username,
            password: passwordEntry.password,
            notes: passwordEntry.notes,
            category: passwordEntry.category,
            tags: passwordEntry.tags,
            isBreached: passwordEntry.isBreached,
            isShared: true,
            sharedWith: passwordEntry.sharedWith,
            iconUrl: passwordEntry.iconUrl,
          },
          masterPassword
        );
      } catch (error) {
        console.error('Error updating password share status:', error);
      }
      
      Alert.alert('Success', 'Share link generated successfully');
    } catch (error) {
      console.error('Error generating share link:', error);
      Alert.alert('Error', 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    
    try {
      await Clipboard.setStringAsync(shareLink);
      Alert.alert('Success', 'Share link copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleRevokeLink = async () => {
    if (!shareLink) return;
    
    Alert.alert(
      'Revoke Share Link',
      'Are you sure you want to revoke this share link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const existingLink = await getShareLinkForPassword(passwordEntry.id);
              if (existingLink) {
                await revokeShareLink(existingLink.id);
              }
              setShareLink(null);
              setIsShared(false);
              
              // Update password entry to mark as not shared
              if (masterPassword) {
                try {
                  await savePassword(
                    {
                      id: passwordEntry.id,
                      website: passwordEntry.website,
                      username: passwordEntry.username,
                      password: passwordEntry.password,
                      notes: passwordEntry.notes,
                      category: passwordEntry.category,
                      tags: passwordEntry.tags,
                      isBreached: passwordEntry.isBreached,
                      isShared: false,
                      sharedWith: passwordEntry.sharedWith,
                      iconUrl: passwordEntry.iconUrl,
                    },
                    masterPassword
                  );
                } catch (error) {
                  console.error('Error updating password share status:', error);
                }
              }
              
              Alert.alert('Success', 'Share link revoked');
            } catch (error) {
              console.error('Error revoking link:', error);
              Alert.alert('Error', 'Failed to revoke share link');
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
          <MaterialCommunityIcons name="share-variant" size={28} color={theme.primary} style={styles.titleIcon} />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
            Share Password
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <View style={styles.infoSection}>
              <MaterialCommunityIcons name="web" size={24} color={theme.primary} />
              <View style={styles.infoContent}>
                <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.text }]}>
                  {passwordEntry.website}
                </Text>
                <Text variant="bodySmall" style={[styles.infoSubtitle, { color: theme.textSecondary }]}>
                  {passwordEntry.username}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>
              Share Settings
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingContent}>
                <Text variant="bodyMedium" style={[styles.settingLabel, { color: theme.text }]}>
                  Expires In (Hours)
                </Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Link will expire after {expiresInHours} hours
                </Text>
              </View>
              <TextInput
                value={expiresInHours.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num > 0) {
                    setExpiresInHours(num);
                  }
                }}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.numberInput, { backgroundColor: theme.background }]}
                textColor={theme.text}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingContent}>
                <Text variant="bodyMedium" style={[styles.settingLabel, { color: theme.text }]}>
                  Max Access Count
                </Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Link can be accessed {maxAccess} time(s)
                </Text>
              </View>
              <TextInput
                value={maxAccess.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num > 0) {
                    setMaxAccess(num);
                  }
                }}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.numberInput, { backgroundColor: theme.background }]}
                textColor={theme.text}
              />
            </View>
          </Card.Content>
        </Card>

        {shareLink && (
          <Card style={[styles.card, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>
                Share Link
              </Text>
              <View style={[styles.linkContainer, { backgroundColor: theme.background }]}>
                <Text variant="bodyMedium" style={[styles.linkText, { color: theme.text }]} numberOfLines={1}>
                  {shareLink}
                </Text>
              </View>
              <View style={styles.linkActions}>
                <Button
                  mode="outlined"
                  onPress={handleCopyLink}
                  style={[styles.actionButton, { borderColor: theme.primary }]}
                  textColor={theme.primary}
                  icon="content-copy"
                >
                  Copy Link
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleRevokeLink}
                  style={[styles.actionButton, { borderColor: '#ef4444' }]}
                  textColor="#ef4444"
                  icon="link-off"
                >
                  Revoke
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <View style={styles.warningSection}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#f59e0b" />
              <View style={styles.warningContent}>
                <Text variant="bodyMedium" style={[styles.warningTitle, { color: theme.text }]}>
                  Security Warning
                </Text>
                <Text variant="bodySmall" style={[styles.warningText, { color: theme.textSecondary }]}>
                  Only share passwords with trusted individuals. The link will expire after the set time or access count.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleGenerateLink}
          loading={loading}
          disabled={loading || !!shareLink}
          style={styles.generateButton}
          buttonColor={theme.primary}
          icon="link-variant"
        >
          {shareLink ? 'Link Generated' : 'Generate Share Link'}
        </Button>
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
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  infoSubtitle: {
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    marginTop: 2,
  },
  numberInput: {
    width: 80,
  },
  linkContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  linkText: {
    fontFamily: 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  warningSection: {
    flexDirection: 'row',
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    lineHeight: 20,
  },
  generateButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
});

