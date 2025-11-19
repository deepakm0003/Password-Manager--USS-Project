import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { Theme, defaultThemes } from '../services/fileStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ThemeSettingsScreenProps {
  navigation: any;
}

export const ThemeSettingsScreen: React.FC<ThemeSettingsScreenProps> = ({ navigation }) => {
  const { theme, themes, applyTheme } = useTheme();

  const handleThemeChange = async (themeName: string) => {
    await applyTheme(themeName);
  };

  const renderThemeCard = (themeOption: Theme) => {
    const isSelected = theme.name === themeOption.name;

    return (
      <TouchableOpacity
        key={themeOption.name}
        onPress={() => handleThemeChange(themeOption.name)}
        activeOpacity={0.7}
      >
        <Card
          style={[
            styles.themeCard,
            isSelected && { borderColor: themeOption.primary, borderWidth: 3 },
          ]}
        >
          <Card.Content>
            <View style={styles.themeHeader}>
              <Text variant="titleMedium" style={styles.themeName}>
                {themeOption.name}
              </Text>
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={24} color={themeOption.primary} />
              )}
            </View>
            <View style={styles.colorPreview}>
              <View
                style={[
                  styles.colorBox,
                  { backgroundColor: themeOption.primary },
                ]}
              />
              <View
                style={[
                  styles.colorBox,
                  { backgroundColor: themeOption.secondary },
                ]}
              />
              <View
                style={[
                  styles.colorBox,
                  { backgroundColor: themeOption.accent },
                ]}
              />
              <View
                style={[
                  styles.colorBox,
                  { backgroundColor: themeOption.success },
                ]}
              />
            </View>
            <View
              style={[
                styles.themePreview,
                { backgroundColor: themeOption.surface },
              ]}
            >
              <View
                style={[
                  styles.previewButton,
                  { backgroundColor: themeOption.primary },
                ]}
              />
              <Text
                style={[
                  styles.previewText,
                  { color: themeOption.text },
                ]}
              >
                Preview Text
              </Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          textColor={theme.primary}
        >
          Back
        </Button>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
          Theme Settings
        </Text>
      </View>

      <View style={styles.content}>
        <Text variant="bodyLarge" style={[styles.description, { color: theme.textSecondary }]}>
          Choose a theme to customize the look and feel of your app
        </Text>

        <View style={styles.themesContainer}>
          {defaultThemes.map((themeOption) => renderThemeCard(themeOption))}
        </View>

        <Card style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="information" size={24} color={theme.primary} />
              <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.text }]}>
                Customization
              </Text>
            </View>
            <Text variant="bodyMedium" style={[styles.infoText, { color: theme.textSecondary }]}>
              You can customize colors, fonts, and styles. Changes apply immediately and are saved
              automatically.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
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
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    padding: 16,
  },
  description: {
    marginBottom: 24,
    lineHeight: 22,
  },
  themesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  themeCard: {
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  themeName: {
    fontWeight: '600',
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  themePreview: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewButton: {
    width: 60,
    height: 32,
    borderRadius: 6,
  },
  previewText: {
    fontWeight: '500',
  },
  infoCard: {
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontWeight: '600',
  },
  infoText: {
    lineHeight: 20,
  },
});


