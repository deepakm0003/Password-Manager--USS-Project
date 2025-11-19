import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getAllPasswords } from '../services/fileStorage';
import { PasswordEntry } from '../types';
import { checkPasswordBreach } from '../services/breachChecker';

export const SecurityDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { masterPassword, isAuthenticated } = useAuth();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [securityScore, setSecurityScore] = useState(0);
  const [breachedCount, setBreachedCount] = useState(0);
  const [weakPasswords, setWeakPasswords] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    if (!isAuthenticated || !masterPassword) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allPasswords = await getAllPasswords(masterPassword);
      setPasswords(allPasswords);

      // Calculate security metrics
      let breached = 0;
      let weak = 0;

      for (const entry of allPasswords) {
        // Check if password is weak
        if (entry.password.length < 8) {
          weak++;
        }

        // Check for breaches (mock)
        const breachInfo = await checkPasswordBreach(entry.password);
        if (breachInfo.isBreached) {
          breached++;
        }
      }

      setBreachedCount(breached);
      setWeakPasswords(weak);

      // Calculate security score (0-100)
      const total = allPasswords.length;
      if (total === 0) {
        setSecurityScore(100);
      } else {
        const breachPenalty = (breached / total) * 50;
        const weakPenalty = (weak / total) * 30;
        const score = Math.max(0, 100 - breachPenalty - weakPenalty);
        setSecurityScore(Math.round(score));
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getSecurityLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <MaterialCommunityIcons name="shield-check" size={28} color={theme.primary} style={styles.headerIcon} />
        <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
          Security Dashboard
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreCircle, { borderColor: getSecurityColor(securityScore) }]}>
                <Text variant="headlineLarge" style={[styles.scoreText, { color: getSecurityColor(securityScore) }]}>
                  {securityScore}
                </Text>
                <Text variant="bodySmall" style={[styles.scoreLabel, { color: theme.textSecondary }]}>
                  /100
                </Text>
              </View>
              <Text variant="titleLarge" style={[styles.securityLabel, { color: getSecurityColor(securityScore) }]}>
                {getSecurityLabel(securityScore)}
              </Text>
            </View>
            <ProgressBar
              progress={securityScore / 100}
              color={getSecurityColor(securityScore)}
              style={styles.progressBar}
            />
          </Card.Content>
        </Card>

        <View style={styles.metricsRow}>
          <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <MaterialCommunityIcons name="shield-alert" size={32} color="#ef4444" />
              <Text variant="headlineMedium" style={[styles.metricValue, { color: theme.text }]}>
                {breachedCount}
              </Text>
              <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Breached Passwords
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <MaterialCommunityIcons name="lock-alert" size={32} color="#f59e0b" />
              <Text variant="headlineMedium" style={[styles.metricValue, { color: theme.text }]}>
                {weakPasswords}
              </Text>
              <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Weak Passwords
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.metricsRow}>
          <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <MaterialCommunityIcons name="key-variant" size={32} color={theme.primary} />
              <Text variant="headlineMedium" style={[styles.metricValue, { color: theme.text }]}>
                {passwords.length}
              </Text>
              <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Total Passwords
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <MaterialCommunityIcons name="shield-check" size={32} color="#22c55e" />
              <Text variant="headlineMedium" style={[styles.metricValue, { color: theme.text }]}>
                {passwords.length - breachedCount - weakPasswords}
              </Text>
              <Text variant="bodySmall" style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Secure Passwords
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>
              Security Recommendations
            </Text>
            {breachedCount > 0 && (
              <View style={styles.recommendation}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
                <Text variant="bodyMedium" style={[styles.recommendationText, { color: theme.text }]}>
                  Change {breachedCount} breached password(s) immediately
                </Text>
              </View>
            )}
            {weakPasswords > 0 && (
              <View style={styles.recommendation}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#f59e0b" />
                <Text variant="bodyMedium" style={[styles.recommendationText, { color: theme.text }]}>
                  Strengthen {weakPasswords} weak password(s)
                </Text>
              </View>
            )}
            {breachedCount === 0 && weakPasswords === 0 && (
              <View style={styles.recommendation}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
                <Text variant="bodyMedium" style={[styles.recommendationText, { color: theme.text }]}>
                  Your passwords are secure! Keep it up.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerIcon: {
    marginRight: 12,
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
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreText: {
    fontWeight: 'bold',
  },
  scoreLabel: {
    marginTop: -8,
  },
  securityLabel: {
    fontWeight: '600',
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
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
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
  },
});

