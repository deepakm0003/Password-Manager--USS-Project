import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generatePassword, defaultPasswordOptions, PasswordOptions, calculatePasswordStrength } from '../utils/passwordGenerator';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';

interface PasswordGeneratorScreenProps {
  navigation: any;
}

export const PasswordGeneratorScreen: React.FC<PasswordGeneratorScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [options, setOptions] = useState<PasswordOptions>(defaultPasswordOptions);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const password = generatePassword(options);
    setGeneratedPassword(password);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generatedPassword) return;
    try {
      await Clipboard.setStringAsync(generatedPassword);
      setCopied(true);
      Alert.alert('Success', 'Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying password:', error);
      Alert.alert('Error', 'Failed to copy password');
    }
  };

  const toggleOption = (key: keyof PasswordOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons name="lightning-bolt" size={28} color={theme.primary} style={styles.titleIcon} />
          <Text variant="headlineSmall" style={[styles.title, { color: theme.text }]}>
            Password Generator
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.card, { backgroundColor: theme.surface }]}>
        <Card.Content>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons name="lock" size={20} color={theme.primary} />
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Generated Password
                </Text>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={generatedPassword}
                  mode="outlined"
                  editable={false}
                  style={[styles.passwordInput, { backgroundColor: theme.background }]}
                  textColor={theme.text}
                />
                <Button
                  mode="contained"
                  onPress={handleCopy}
                  icon={copied ? 'check-circle' : 'content-copy'}
                  style={styles.copyButton}
                  buttonColor={theme.primary}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </View>
              {generatedPassword && <PasswordStrengthIndicator password={generatedPassword} />}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons name="format-size" size={20} color={theme.primary} />
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Password Length: {options.length}
                </Text>
              </View>
              <View style={styles.sliderContainer}>
                <Button
                  mode="outlined"
                  onPress={() => setOptions((prev) => ({ ...prev, length: Math.max(4, prev.length - 1) }))}
                  compact
                  icon="minus"
                  buttonColor={theme.surface}
                  textColor={theme.text}
                >
                  -
                </Button>
                <TextInput
                  value={options.length.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    if (!isNaN(num) && num >= 4 && num <= 128) {
                      setOptions((prev) => ({ ...prev, length: num }));
                    }
                  }}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.lengthInput, { backgroundColor: theme.background }]}
                  textColor={theme.text}
                />
                <Button
                  mode="outlined"
                  onPress={() => setOptions((prev) => ({ ...prev, length: Math.min(128, prev.length + 1) }))}
                  compact
                  icon="plus"
                  buttonColor={theme.surface}
                  textColor={theme.text}
                >
                  +
                </Button>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons name="format-font" size={20} color={theme.primary} />
                <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
                  Include Characters
                </Text>
              </View>
              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={options.includeUppercase ? 'checked' : 'unchecked'}
                    onPress={() => toggleOption('includeUppercase')}
                    color={theme.primary}
                  />
                  <MaterialCommunityIcons name="format-uppercase" size={20} color={theme.textSecondary} />
                  <Text variant="bodyMedium" style={{ color: theme.text }} onPress={() => toggleOption('includeUppercase')}>
                    Uppercase (A-Z)
                  </Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={options.includeLowercase ? 'checked' : 'unchecked'}
                    onPress={() => toggleOption('includeLowercase')}
                    color={theme.primary}
                  />
                  <MaterialCommunityIcons name="format-lowercase" size={20} color={theme.textSecondary} />
                  <Text variant="bodyMedium" style={{ color: theme.text }} onPress={() => toggleOption('includeLowercase')}>
                    Lowercase (a-z)
                  </Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={options.includeNumbers ? 'checked' : 'unchecked'}
                    onPress={() => toggleOption('includeNumbers')}
                    color={theme.primary}
                  />
                  <MaterialCommunityIcons name="numeric" size={20} color={theme.textSecondary} />
                  <Text variant="bodyMedium" style={{ color: theme.text }} onPress={() => toggleOption('includeNumbers')}>
                    Numbers (0-9)
                  </Text>
                </View>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={options.includeSymbols ? 'checked' : 'unchecked'}
                    onPress={() => toggleOption('includeSymbols')}
                    color={theme.primary}
                  />
                  <MaterialCommunityIcons name="pound" size={20} color={theme.textSecondary} />
                  <Text variant="bodyMedium" style={{ color: theme.text }} onPress={() => toggleOption('includeSymbols')}>
                    Symbols (!@#$)
                  </Text>
                </View>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleGenerate}
              style={styles.generateButton}
              buttonColor={theme.primary}
              icon="lightning-bolt"
            >
              Generate Password
            </Button>
          </View>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
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
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  passwordInput: {
    flex: 1,
  },
  copyButton: {
    justifyContent: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  lengthInput: {
    width: 60,
    textAlign: 'center',
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
});
