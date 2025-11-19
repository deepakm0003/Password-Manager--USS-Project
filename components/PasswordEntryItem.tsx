import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PasswordEntry } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { getWebsiteIconUrl } from '../services/websiteIconService';

interface PasswordEntryItemProps {
  entry: PasswordEntry;
  onPress: () => void;
  onCopy?: () => void;
  onLongPress?: () => void;
}

export const PasswordEntryItem: React.FC<PasswordEntryItemProps> = ({
  entry,
  onPress,
  onCopy,
  onLongPress,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onLongPress();
    }
  };
  
  // Get domain from website URL
  const getDomain = (url: string) => {
    try {
      const domain = url.replace(/^https?:\/\//, '').split('/')[0];
      return domain;
    } catch {
      return url;
    }
  };

  // Get first letter for avatar
  const getInitial = (text: string) => {
    return text.charAt(0).toUpperCase();
  };

  // Get icon URL - use stored iconUrl or generate one
  const iconUrl = entry.iconUrl || getWebsiteIconUrl(entry.website);
  const domain = getDomain(entry.website);

  const backgroundColor = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.surface, theme.primary + '08'],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor,
              borderRadius: 16,
              marginVertical: 8,
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
          ]}
        >
          <View style={styles.cardContent}>
            <View style={styles.container}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
            {iconUrl ? (
              <Image
                source={{ uri: iconUrl }}
                style={styles.iconImage}
                onError={() => {
                  // Image will fall back to default icon if it fails
                }}
                resizeMode="cover"
              />
            ) : (
              <MaterialCommunityIcons name="web" size={26} color={theme.primary} />
            )}
          </View>
          <View style={styles.content}>
            <View style={styles.websiteRow}>
              <Text 
                variant="titleMedium" 
                style={[styles.website, { color: theme.text }]} 
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {domain}
              </Text>
              {entry.isShared && (
                <View style={[styles.sharedBadge, { backgroundColor: theme.primary + '20' }]}>
                  <MaterialCommunityIcons name="share-variant" size={12} color={theme.primary} />
                </View>
              )}
              {entry.isBreached && (
                <View style={[styles.breachedBadge, { backgroundColor: '#ef444420' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={12} color="#ef4444" />
                </View>
              )}
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="account" size={14} color={theme.textSecondary} />
              <Text 
                variant="bodySmall" 
                style={[styles.username, { color: theme.textSecondary }]} 
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {entry.username}
              </Text>
            </View>
            {entry.lastUsed && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={theme.textSecondary} />
                <Text 
                  variant="bodySmall" 
                  style={[styles.lastUsed, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {new Date(entry.lastUsed).toLocaleDateString()}
                </Text>
              </View>
            )}
            {entry.category && (
              <View style={styles.categoryContainer}>
                <Chip 
                  mode="flat" 
                  style={[styles.categoryChip, { backgroundColor: theme.primary + '20' }]}
                  textStyle={{ color: theme.primary, fontSize: 11, fontWeight: '600' }}
                  icon="tag"
                  compact
                >
                  {entry.category}
                </Chip>
              </View>
            )}
          </View>
          <View style={styles.actions}>
            {onCopy && (
              <TouchableOpacity 
                onPress={onCopy} 
                style={[styles.copyButton, { backgroundColor: theme.primary + '15' }]}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="content-copy" size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    width: '100%',
  },
  website: {
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  sharedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breachedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    width: '100%',
  },
  username: {
    flex: 1,
    fontSize: 13,
    textAlign: 'left',
  },
  lastUsed: {
    fontSize: 11,
    opacity: 0.8,
    textAlign: 'left',
  },
  categoryContainer: {
    marginTop: 6,
  },
  categoryChip: {
    height: 26,
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

