import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { calculatePasswordStrength } from '../utils/passwordGenerator';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  if (!password) {
    return null;
  }

  const { score, strength, color } = calculatePasswordStrength(password);
  const width = `${score}%`;

  const strengthLabels: Record<string, string> = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
    'very-strong': 'Very Strong',
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width, backgroundColor: color }]} />
      </View>
      <Text style={[styles.label, { color }]} variant="bodySmall">
        {strengthLabels[strength]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  barContainer: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

