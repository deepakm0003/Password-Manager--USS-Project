import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export const PasswordImportScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { masterPassword } = useAuth();
  const [importing, setImporting] = useState(false);

  const handleImportCSV = async () => {
    try {
      setImporting(true);
      // In a real app, this would import from CSV file
      Alert.alert('Info', 'CSV import feature coming soon');
    } catch (error) {
      console.error('Error importing CSV:', error);
      Alert.alert('Error', 'Failed to import passwords');
    } finally {
      setImporting(false);
    }
  };

  const handleImportJSON = async () => {
    try {
      setImporting(true);
      // In a real app, this would import from JSON file
      Alert.alert('Info', 'JSON import feature coming soon');
    } catch (error) {
      console.error('Error importing JSON:', error);
      Alert.alert('Error', 'Failed to import passwords');
    } finally {
      setImporting(false);
    }
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
          <MaterialCommunityIcons name="import" size={28} color={theme.primary} style={styles.titleIcon} />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
            Import Passwords
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <MaterialCommunityIcons name="file-document" size={48} color={theme.primary} style={styles.icon} />
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.text }]}>
              Import from CSV
            </Text>
            <Text variant="bodySmall" style={[styles.cardDescription, { color: theme.textSecondary }]}>
              Import passwords from a CSV file. Format: website,username,password,notes
            </Text>
            <Button
              mode="outlined"
              onPress={handleImportCSV}
              loading={importing}
              disabled={importing}
              style={[styles.importButton, { borderColor: theme.primary }]}
              textColor={theme.primary}
              icon="file-export"
            >
              Import CSV
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <MaterialCommunityIcons name="code-json" size={48} color={theme.primary} style={styles.icon} />
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.text }]}>
              Import from JSON
            </Text>
            <Text variant="bodySmall" style={[styles.cardDescription, { color: theme.textSecondary }]}>
              Import passwords from a JSON file exported from another password manager
            </Text>
            <Button
              mode="outlined"
              onPress={handleImportJSON}
              loading={importing}
              disabled={importing}
              style={[styles.importButton, { borderColor: theme.primary }]}
              textColor={theme.primary}
              icon="file-code"
            >
              Import JSON
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: '#fee2e2' }]}>
          <Card.Content>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#991b1b" />
            <Text variant="bodySmall" style={[styles.warningText, { color: '#991b1b' }]}>
              Imported passwords will be encrypted with your master password. Make sure you remember your master password to access imported passwords.
            </Text>
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
  icon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  importButton: {
    paddingVertical: 8,
  },
  warningText: {
    marginTop: 8,
    lineHeight: 20,
  },
});

