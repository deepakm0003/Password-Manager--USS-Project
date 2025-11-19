import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Button, Chip, FAB, ActivityIndicator } from 'react-native-paper';
import { EmailAlias } from '../types';
import { getAllEmailAliases, createEmailAlias, updateEmailAliasStatus, deleteEmailAlias, recordEmailAliasUsage, recordTrackerBlocked } from '../services/fileStorage';
import { Tooltip } from '../components/Tooltip';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';

interface EmailRelayScreenProps {
  navigation: any;
}

export const EmailRelayScreen: React.FC<EmailRelayScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAliases();
    const unsubscribe = navigation.addListener('focus', loadAliases);
    return unsubscribe;
  }, [navigation]);

  const loadAliases = async () => {
    try {
      setLoading(true);
      const all = await getAllEmailAliases();
      setAliases(all);
    } catch (error) {
      console.error('Error loading email aliases:', error);
      Alert.alert('Error', 'Failed to load email aliases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlias = async () => {
    // Show options for creating alias
    Alert.alert(
      'Create Email Alias',
      'Choose alias type:',
      [
        {
          text: 'Standard (90 days)',
          onPress: async () => {
            try {
              const newAlias = await createEmailAlias();
              Alert.alert('Success', `New alias created: ${newAlias.alias}`);
              loadAliases();
            } catch (error) {
              console.error('Error creating alias:', error);
              Alert.alert('Error', 'Failed to create email alias');
            }
          },
        },
        {
          text: 'Auto-Expire (1 use)',
          onPress: async () => {
            try {
              const newAlias = await createEmailAlias({ autoExpire: true });
              Alert.alert('Success', `Auto-expiring alias created: ${newAlias.alias}\n\nThis alias will expire after first use.`);
              loadAliases();
            } catch (error) {
              console.error('Error creating alias:', error);
              Alert.alert('Error', 'Failed to create email alias');
            }
          },
        },
        {
          text: 'With Reply Masking',
          onPress: async () => {
            try {
              const newAlias = await createEmailAlias({ replyMasking: true });
              Alert.alert('Success', `Alias with reply masking created: ${newAlias.alias}\n\nReplies will be masked to protect your real email.`);
              loadAliases();
            } catch (error) {
              console.error('Error creating alias:', error);
              Alert.alert('Error', 'Failed to create email alias');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCopyAlias = async (alias: string) => {
    try {
      await Clipboard.setStringAsync(alias);
      Alert.alert('Success', 'Alias copied to clipboard');
    } catch (error) {
      console.error('Error copying alias:', error);
      Alert.alert('Error', 'Failed to copy alias');
    }
  };

  const handleToggleStatus = async (aliasId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateEmailAliasStatus(aliasId, newStatus);
      loadAliases();
    } catch (error) {
      console.error('Error updating alias status:', error);
      Alert.alert('Error', 'Failed to update alias status');
    }
  };

  const handleDeleteAlias = (aliasId: string) => {
    Alert.alert(
      'Delete Alias',
      'Are you sure you want to delete this email alias?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmailAlias(aliasId);
              Alert.alert('Success', 'Alias deleted successfully');
              loadAliases();
            } catch (error) {
              console.error('Error deleting alias:', error);
              Alert.alert('Error', 'Failed to delete alias');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'inactive':
        return '#6b7280';
      case 'expired':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const renderAliasItem = ({ item }: { item: EmailAlias }) => (
    <Card style={[styles.card, { backgroundColor: theme.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <MaterialCommunityIcons name="email-lock" size={24} color={theme.primary} />
          </View>
          <View style={styles.content}>
            <Text variant="titleMedium" style={[styles.alias, { color: theme.text }]}>
              {item.alias}
            </Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar" size={14} color={theme.textSecondary} />
              <Text variant="bodySmall" style={[styles.date, { color: theme.textSecondary }]}>
                Created: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {item.expiresAt && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-alert" size={14} color={theme.textSecondary} />
                <Text variant="bodySmall" style={[styles.date, { color: theme.textSecondary }]}>
                  Expires: {new Date(item.expiresAt).toLocaleDateString()}
                  {item.autoExpire && ' (Auto-expire after use)'}
                </Text>
              </View>
            )}
            {item.usedCount !== undefined && item.usedCount > 0 && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="email-check" size={14} color={theme.primary} />
                <Text variant="bodySmall" style={[styles.date, { color: theme.textSecondary }]}>
                  Used: {item.usedCount} time(s)
                  {item.emailsReceived !== undefined && item.emailsReceived > 0 && ` • ${item.emailsReceived} email(s)`}
                  {item.loginsViaAlias !== undefined && item.loginsViaAlias > 0 && ` • ${item.loginsViaAlias} login(s)`}
                </Text>
              </View>
            )}
            {item.replyMaskingEnabled && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="shield-account" size={14} color={theme.primary} />
                <Text variant="bodySmall" style={[styles.date, { color: theme.primary }]}>
                  Reply Masking: Enabled
                </Text>
              </View>
            )}
            {item.trackerDetected && item.trackersBlocked !== undefined && item.trackersBlocked > 0 && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="shield-lock" size={14} color="#f59e0b" />
                <Text variant="bodySmall" style={[styles.date, { color: '#f59e0b' }]}>
                  Trackers Blocked: {item.trackersBlocked}
                </Text>
              </View>
            )}
          </View>
          <Chip
            mode="flat"
            style={[styles.chip, { backgroundColor: getStatusColor(item.status) + '20' }]}
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Chip>
        </View>
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => handleCopyAlias(item.alias)}
            style={[styles.copyButton, { borderColor: theme.primary }]}
            textColor={theme.primary}
            icon="content-copy"
            compact
          >
            Copy
          </Button>
          {item.status !== 'expired' && (
            <Button
              mode="outlined"
              onPress={() => handleToggleStatus(item.id, item.status)}
              style={[styles.toggleButton, { borderColor: theme.primary }]}
              textColor={theme.primary}
              compact
              icon={item.status === 'active' ? 'pause' : 'play'}
            >
              {item.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() => handleDeleteAlias(item.id)}
            style={[styles.deleteButton, { borderColor: '#ef4444' }]}
            textColor="#ef4444"
            icon="delete"
            compact
          >
            Remove
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons name="email" size={28} color={theme.primary} style={styles.titleIcon} />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
            Email Relay
          </Text>
          <Tooltip
            title="Email Relay"
            description="Create temporary email aliases to protect your identity online. Use these for sign-ups and services you don't fully trust. Emails sent to aliases are forwarded to your main email address."
          >
            <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
          </Tooltip>
        </View>
        <Text variant="bodyMedium" style={[styles.description, { color: theme.textSecondary }]}>
          Manage temporary email aliases to protect your identity online.
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading aliases...
          </Text>
        </View>
      ) : aliases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="email-lock" size={64} color={theme.textSecondary} />
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.text }]}>
            No Email Aliases
          </Text>
          <Text variant="bodyMedium" style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Tap the + button to create your first temporary email alias
          </Text>
        </View>
      ) : (
        <FlatList
          data={aliases}
          renderItem={renderAliasItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB 
        icon="plus" 
        style={[styles.fab, { backgroundColor: theme.primary }]} 
        onPress={handleCreateAlias}
        color="white"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    paddingTop: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  description: {
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  alias: {
    fontWeight: '600',
    marginBottom: 8,
  },
  date: {
    marginLeft: 4,
  },
  chip: {
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  copyButton: {
    flex: 1,
    minWidth: 80,
  },
  toggleButton: {
    flex: 1,
    minWidth: 100,
  },
  deleteButton: {
    flex: 1,
    minWidth: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

