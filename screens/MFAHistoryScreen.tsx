import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { MFAApproval } from '../types';
import { getAllMFAApprovals } from '../services/fileStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface MFAHistoryScreenProps {
  navigation: any;
}

export const MFAHistoryScreen: React.FC<MFAHistoryScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [approvals, setApprovals] = useState<MFAApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    const unsubscribe = navigation.addListener('focus', loadHistory);
    return unsubscribe;
  }, [navigation]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const all = await getAllMFAApprovals();
      setApprovals(all);
    } catch (error) {
      console.error('Error loading MFA history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#22c55e';
      case 'denied':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const renderHistoryItem = ({ item }: { item: MFAApproval }) => (
    <Card style={[styles.card, { backgroundColor: theme.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <MaterialCommunityIcons
              name={item.status === 'approved' ? 'shield-check' : item.status === 'denied' ? 'shield-off' : 'shield-alert'}
              size={24}
              color={getStatusColor(item.status)}
            />
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
          </View>
          <Chip
            mode="flat"
            style={[styles.chip, { backgroundColor: getStatusColor(item.status) + '20' }]}
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.surface }]}>
        <Button
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          textColor={theme.primary}
          style={styles.backButton}
        >
          Back
        </Button>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons name="history" size={28} color={theme.primary} style={styles.titleIcon} />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
            MFA History
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading history...
          </Text>
        </View>
      ) : approvals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="shield-off" size={64} color={theme.textSecondary} />
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.text }]}>
            No History
          </Text>
          <Text variant="bodyMedium" style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Your MFA approval history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={approvals}
          renderItem={renderHistoryItem}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    alignSelf: 'flex-start',
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
    marginBottom: 8,
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
    marginTop: 4,
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
  chip: {
    alignSelf: 'flex-start',
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
