import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ProgressBar, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getDashboardData, PrivacyMetrics, SecurityEvent } from '../services/analyticsService';

interface PrivacyDashboardScreenProps {
  navigation: any;
}

export const PrivacyDashboardScreen: React.FC<PrivacyDashboardScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<PrivacyMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = navigation.addListener('focus', loadDashboardData);
    return unsubscribe;
  }, [navigation]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setMetrics(data.metrics);
      setEvents(data.recentEvents);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'mfa_approval':
        return 'shield-check';
      case 'mfa_denial':
        return 'shield-alert';
      case 'password_shared':
        return 'share-variant';
      case 'alias_created':
        return 'email-plus';
      case 'alias_expired':
        return 'email-remove';
      case 'tracker_blocked':
        return 'shield-lock';
      default:
        return 'information';
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'mfa_approval':
        return '#22c55e';
      case 'mfa_denial':
        return '#ef4444';
      case 'password_shared':
        return '#6366f1';
      case 'alias_created':
        return '#3b82f6';
      case 'alias_expired':
        return '#6b7280';
      case 'tracker_blocked':
        return '#f59e0b';
      default:
        return theme.primary;
    }
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && !metrics) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text variant="bodyMedium" style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading dashboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="shield-account" size={32} color={theme.primary} />
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
              Privacy Dashboard
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Your digital hygiene and security overview
            </Text>
          </View>
        </View>
      </View>

      {metrics && (
        <>
          {/* Digital Hygiene Score */}
          <Card style={[styles.card, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <View style={styles.scoreHeader}>
                <Text variant="titleLarge" style={[styles.scoreTitle, { color: theme.text }]}>
                  Digital Hygiene Score
                </Text>
                <Chip
                  mode="flat"
                  style={[
                    styles.scoreChip,
                    { backgroundColor: getScoreColor(metrics.digitalHygieneScore) + '20' },
                  ]}
                  textStyle={{ color: getScoreColor(metrics.digitalHygieneScore) }}
                >
                  {getScoreLabel(metrics.digitalHygieneScore)}
                </Chip>
              </View>
              <View style={styles.scoreContainer}>
                <Text
                  variant="displayMedium"
                  style={[styles.scoreValue, { color: getScoreColor(metrics.digitalHygieneScore) }]}
                >
                  {metrics.digitalHygieneScore}
                </Text>
                <Text variant="bodyMedium" style={[styles.scoreOutOf, { color: theme.textSecondary }]}>
                  / 100
                </Text>
              </View>
              <ProgressBar
                progress={metrics.digitalHygieneScore / 100}
                color={getScoreColor(metrics.digitalHygieneScore)}
                style={styles.progressBar}
              />
            </Card.Content>
          </Card>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Card.Content>
                <MaterialCommunityIcons name="key-variant" size={24} color={theme.primary} />
                <Text variant="headlineSmall" style={[styles.metricValue, { color: theme.text }]}>
                  {metrics.reusedPasswords}
                </Text>
                <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  Reused Passwords
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Card.Content>
                <MaterialCommunityIcons name="shield-check" size={24} color="#22c55e" />
                <Text variant="headlineSmall" style={[styles.metricValue, { color: theme.text }]}>
                  {metrics.mfaApprovalsThisWeek}
                </Text>
                <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  MFA Approvals (Week)
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Card.Content>
                <MaterialCommunityIcons name="email" size={24} color="#3b82f6" />
                <Text variant="headlineSmall" style={[styles.metricValue, { color: theme.text }]}>
                  {metrics.aliasesUsed}/{metrics.totalAliases}
                </Text>
                <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  Aliases Used
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Card.Content>
                <MaterialCommunityIcons name="shield-lock" size={24} color="#f59e0b" />
                <Text variant="headlineSmall" style={[styles.metricValue, { color: theme.text }]}>
                  {metrics.trackersBlocked}
                </Text>
                <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  Trackers Blocked
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Card.Content>
                <MaterialCommunityIcons name="login" size={24} color="#6366f1" />
                <Text variant="headlineSmall" style={[styles.metricValue, { color: theme.text }]}>
                  {metrics.loginsViaAlias}
                </Text>
                <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  Logins via Alias
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
              <Card.Content>
                <MaterialCommunityIcons name="key" size={24} color="#8b5cf6" />
                <Text variant="headlineSmall" style={[styles.metricValue, { color: theme.text }]}>
                  {metrics.uniquePasswords}
                </Text>
                <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  Unique Passwords
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Security Events Timeline */}
          <Card style={[styles.card, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.text }]}>
                Recent Security Events
              </Text>
              {events.length === 0 ? (
                <View style={styles.emptyEvents}>
                  <MaterialCommunityIcons name="history" size={48} color={theme.textSecondary} />
                  <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No security events yet
                  </Text>
                </View>
              ) : (
                <View style={styles.eventsList}>
                  {events.map((event, index) => (
                    <View key={event.id} style={styles.eventItem}>
                      <View style={styles.eventIconContainer}>
                        <MaterialCommunityIcons
                          name={getEventIcon(event.type) as any}
                          size={24}
                          color={getEventColor(event.type)}
                        />
                      </View>
                      <View style={styles.eventContent}>
                        <Text variant="bodyMedium" style={[styles.eventTitle, { color: theme.text }]}>
                          {event.title}
                        </Text>
                        <Text variant="bodySmall" style={[styles.eventDescription, { color: theme.textSecondary }]}>
                          {event.description}
                        </Text>
                        {event.location && (
                          <View style={styles.eventLocation}>
                            <MaterialCommunityIcons name="map-marker" size={14} color={theme.textSecondary} />
                            <Text variant="bodySmall" style={[styles.eventLocationText, { color: theme.textSecondary }]}>
                              {event.location}
                            </Text>
                          </View>
                        )}
                        <Text variant="bodySmall" style={[styles.eventTime, { color: theme.textSecondary }]}>
                          {formatDate(event.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreTitle: {
    fontWeight: '600',
  },
  scoreChip: {
    height: 28,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  scoreValue: {
    fontWeight: 'bold',
  },
  scoreOutOf: {
    marginLeft: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '47%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricValue: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  eventsList: {
    gap: 16,
  },
  eventItem: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDescription: {
    marginBottom: 8,
    lineHeight: 20,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventLocationText: {
    fontSize: 12,
  },
  eventTime: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyEvents: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
  },
});

