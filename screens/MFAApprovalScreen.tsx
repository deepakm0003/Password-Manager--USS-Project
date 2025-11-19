import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { MFAApproval } from '../types';
import { getPendingMFAApprovals, updateMFAApprovalStatus, createMFAApproval } from '../services/fileStorage';
import { Tooltip } from '../components/Tooltip';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface MFAApprovalScreenProps {
  navigation: any;
}

export const MFAApprovalScreen: React.FC<MFAApprovalScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [approvals, setApprovals] = useState<MFAApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
    const unsubscribe = navigation.addListener('focus', loadApprovals);
    return unsubscribe;
  }, [navigation]);

  // Simulate new MFA requests periodically for demo
  useEffect(() => {
    const interval = setInterval(() => {
      simulateMFARequest();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const pending = await getPendingMFAApprovals();
      setApprovals(pending);
    } catch (error) {
      console.error('Error loading MFA approvals:', error);
      Alert.alert('Error', 'Failed to load MFA approvals');
    } finally {
      setLoading(false);
    }
  };

  const simulateMFARequest = async () => {
    try {
      const services = ['SecureBank.com', 'CloudStorage.io', 'SocialMedia.net', 'E-commerce.store'];
      const locations = ['New York, USA', 'London, UK', 'Tokyo, Japan', 'San Francisco, USA'];
      const service = services[Math.floor(Math.random() * services.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      await createMFAApproval(service, location, 'Chrome Browser - Windows 10');
      loadApprovals();
    } catch (error) {
      console.error('Error simulating MFA request:', error);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      await updateMFAApprovalStatus(approvalId, 'approved');
      Alert.alert('Success', 'Login approved');
      loadApprovals();
    } catch (error) {
      console.error('Error approving MFA:', error);
      Alert.alert('Error', 'Failed to approve login');
    }
  };

  const handleDeny = async (approvalId: string) => {
    Alert.alert(
      'Deny Login',
      'Are you sure you want to deny this login attempt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateMFAApprovalStatus(approvalId, 'denied');
              Alert.alert('Success', 'Login denied');
              loadApprovals();
            } catch (error) {
              console.error('Error denying MFA:', error);
              Alert.alert('Error', 'Failed to deny login');
            }
          },
        },
      ]
    );
  };

  const renderApprovalItem = ({ item }: { item: MFAApproval }) => (
    <Card style={[styles.card, { backgroundColor: theme.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <MaterialCommunityIcons name="shield-alert" size={24} color={theme.primary} />
          </View>
          <View style={styles.content}>
            <Text variant="titleMedium" style={[styles.service, { color: theme.text }]}>
              {item.service}
            </Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color={theme.textSecondary} />
              <Text variant="bodySmall" style={[styles.location, { color: theme.textSecondary }]}>
                {item.location}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textSecondary} />
              <Text variant="bodySmall" style={[styles.timestamp, { color: theme.textSecondary }]}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
            {item.deviceInfo && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="devices" size={14} color={theme.textSecondary} />
                <Text variant="bodySmall" style={[styles.deviceInfo, { color: theme.textSecondary }]}>
                  {item.deviceInfo}
                </Text>
              </View>
            )}
          </View>
          <Chip mode="flat" style={[styles.chip, { backgroundColor: theme.primary + '20' }]} textStyle={{ color: theme.primary }}>
            Pending
          </Chip>
        </View>
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={() => handleApprove(item.id)}
            style={styles.approveButton}
            buttonColor="#22c55e"
            icon="check-circle"
          >
            Approve
          </Button>
          <Button
            mode="outlined"
            onPress={() => handleDeny(item.id)}
            style={[styles.denyButton, { borderColor: '#ef4444' }]}
            textColor="#ef4444"
            icon="close-circle"
          >
            Deny
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="shield-alert" size={28} color={theme.primary} style={styles.titleIcon} />
            <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
              MFA Approval Center
            </Text>
            <Tooltip
              title="Multi-Factor Authentication"
              description="Approve or deny login attempts from new devices or locations. You'll receive notifications when someone tries to access your accounts."
            >
              <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
            </Tooltip>
          </View>
          <Button
            mode="text"
            onPress={() => navigation.navigate('MFAHistory')}
            textColor={theme.primary}
            compact
            icon="history"
          >
            View History
          </Button>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading approvals...
          </Text>
        </View>
      ) : approvals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="shield-check" size={64} color={theme.textSecondary} />
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.text }]}>
            No Pending Approvals
          </Text>
          <Text variant="bodyMedium" style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            All login attempts are approved. You'll be notified when new requests arrive.
          </Text>
        </View>
      ) : (
        <FlatList
          data={approvals}
          renderItem={renderApprovalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
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
    marginBottom: 8,
  },
  titleRow: {
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
    marginBottom: 16,
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
  service: {
    fontWeight: '600',
    marginBottom: 8,
  },
  location: {
    marginLeft: 4,
  },
  timestamp: {
    marginLeft: 4,
  },
  deviceInfo: {
    marginLeft: 4,
    fontStyle: 'italic',
  },
  chip: {
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
  },
  denyButton: {
    flex: 1,
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
});
