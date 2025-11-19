import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TooltipProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ title, description, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.iconButton}>
        {children}
      </TouchableOpacity>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <MaterialCommunityIcons name="information" size={24} color="#6366f1" />
              <Text variant="titleMedium" style={styles.title}>
                {title}
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.description}>
              {description}
            </Text>
            <TouchableOpacity
              onPress={() => setVisible(false)}
              style={styles.closeButton}
            >
              <Text variant="labelLarge" style={styles.closeButtonText}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 4,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 0,
  },
  modalContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginLeft: 12,
    fontWeight: '600',
    color: '#111827',
  },
  description: {
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

