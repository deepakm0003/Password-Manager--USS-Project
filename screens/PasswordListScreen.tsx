import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, Animated, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Text, FAB, Searchbar, ActivityIndicator, Chip, Menu, Card, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PasswordEntry } from '../types';
import { getAllPasswords, deletePassword, updatePasswordLastUsed, getCurrentUser } from '../services/fileStorage';
import { PasswordEntryItem } from '../components/PasswordEntryItem';
import { isPasswordShared } from '../services/sharingService';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Separate component for password list item to fix hook error
const PasswordListItem: React.FC<{
  item: PasswordEntry;
  index: number;
  onPress: () => void;
  onCopy: () => void;
  onLongPress: () => void;
}> = ({ item, index, onPress, onCopy, onLongPress }) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: itemAnim,
        transform: [
          {
            translateY: itemAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      <PasswordEntryItem
        entry={item}
        onPress={onPress}
        onCopy={onCopy}
        onLongPress={onLongPress}
      />
    </Animated.View>
  );
};

interface PasswordListScreenProps {
  navigation: any;
}

export const PasswordListScreen: React.FC<PasswordListScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { masterPassword, isAuthenticated } = useAuth();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showBreachedOnly, setShowBreachedOnly] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadPasswords = useCallback(
    async (showRefreshIndicator = false): Promise<void> => {
      try {
        if (showRefreshIndicator) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const user = await getCurrentUser();
        if (!user) {
          console.warn('No user found - redirecting to login');
          navigation.replace('Auth');
          return;
        }

        if (!isAuthenticated || !masterPassword) {
          console.log('Vault locked - waiting for master password to load passwords');
          setPasswords([]);
          return;
        }

        const allPasswords = await getAllPasswords(masterPassword);

        const passwordsWithShareStatus = await Promise.all(
          allPasswords.map(async (pwd) => {
            try {
              const shared = await isPasswordShared(pwd.id);
              return { ...pwd, isShared: shared || pwd.isShared || false };
            } catch (error) {
              console.error('Error checking share status for password:', pwd.id, error);
              return { ...pwd, isShared: pwd.isShared || false };
            }
          })
        );

        setPasswords(passwordsWithShareStatus);

        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error('[PasswordListScreen] Error loading passwords:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load passwords from secure storage';
        Alert.alert('Unable to load passwords', errorMessage);
        setPasswords([]);
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        if (showRefreshIndicator) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [getCurrentUser, navigation, isAuthenticated, masterPassword]
  );

  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadPasswords());
    return unsubscribe;
  }, [navigation, loadPasswords]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Animate search bar focus
    Animated.spring(searchAnim, {
      toValue: searchFocused ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [searchFocused]);

  const onRefresh = useCallback(() => {
    loadPasswords(true);
  }, [loadPasswords]);

  const handlePasswordPress = (passwordId: string) => {
    navigation.navigate('PasswordDetails', { passwordId });
  };

  const handleCopyPassword = async (password: string, passwordId: string) => {
    try {
      // Haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      await Clipboard.setStringAsync(password);
      if (masterPassword) {
        await updatePasswordLastUsed(passwordId, masterPassword);
      }
      
      // Success feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert('Success', 'Password copied to clipboard');
      loadPasswords();
    } catch (error) {
      console.error('Error copying password:', error);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', 'Failed to copy password');
    }
  };

  const handleQuickDelete = async (passwordId: string, passwordEntry: PasswordEntry) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Delete Password',
      `Are you sure you want to delete "${passwordEntry.website}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!masterPassword) {
                Alert.alert('Unlock Required', 'Please unlock your vault to delete a password.');
                return;
              }
              await deletePassword(passwordId, masterPassword);
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              loadPasswords();
            } catch (error: any) {
              console.error('Error deleting password:', error);
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete password';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  // Get unique categories
  const categories = Array.from(new Set(passwords.map(p => p.category).filter(Boolean))) as string[];

  const filteredPasswords = passwords.filter((p) => {
    // Search filter
    const matchesSearch = 
      p.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = !filterCategory || p.category === filterCategory;

    // Breached filter
    const matchesBreached = !showBreachedOnly || p.isBreached;

    return matchesSearch && matchesCategory && matchesBreached;
  });

  const renderPasswordItem = ({ item, index }: { item: PasswordEntry; index: number }) => {
    return (
      <PasswordListItem
        item={item}
        index={index}
        onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          handlePasswordPress(item.id);
        }}
        onCopy={() => handleCopyPassword(item.password, item.id)}
        onLongPress={() => handleQuickDelete(item.id, item)}
      />
    );
  };

  return (
    <LinearGradient
      colors={[theme.background, theme.surface || '#f8f9fa']}
      style={styles.container}
    >
      <View style={[styles.header, { backgroundColor: theme.surface + 'F5' }]}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '15' }]}>
            <MaterialCommunityIcons name="key-variant" size={24} color={theme.primary} />
          </View>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            My Passwords
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <View style={[styles.filterButton, { backgroundColor: theme.primary + '15' }]}>
                <MaterialCommunityIcons 
                  name="filter-variant" 
                  size={22} 
                  color={theme.primary} 
                  onPress={() => setMenuVisible(true)}
                />
              </View>
            }
          >
            <Menu.Item 
              onPress={() => {
                setFilterCategory(null);
                setShowBreachedOnly(false);
                setMenuVisible(false);
              }} 
              title="All Passwords"
              leadingIcon="view-list"
            />
            <Menu.Item 
              onPress={() => {
                setShowBreachedOnly(true);
                setMenuVisible(false);
              }} 
              title="Breached Only"
              leadingIcon="alert-circle"
            />
            {categories.map((cat) => (
              <Menu.Item 
                key={cat}
                onPress={() => {
                  setFilterCategory(cat);
                  setMenuVisible(false);
                }} 
                title={cat}
                leadingIcon="tag"
              />
            ))}
          </Menu>
        </View>
        <Animated.View
          style={[
            styles.searchContainer,
            {
              transform: [
                {
                  scale: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.02],
                  }),
                },
              ],
              elevation: searchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 4],
              }),
            },
          ]}
        >
          <Card style={[styles.searchCard, { backgroundColor: theme.surface }]} elevation={searchFocused ? 4 : 1}>
            <Searchbar
              placeholder="Search passwords..."
              onChangeText={(text) => {
                setSearchQuery(text);
                if (Platform.OS === 'ios' && text.length > 0) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              value={searchQuery}
              style={[styles.searchbar, { backgroundColor: theme.surface }]}
              iconColor={theme.primary}
              inputStyle={{ color: theme.text }}
              placeholderTextColor={theme.textSecondary}
              elevation={0}
              onFocus={() => {
                setSearchFocused(true);
                if (Platform.OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              onBlur={() => setSearchFocused(false)}
              clearIcon={() => (
                <IconButton
                  icon="close-circle"
                  size={20}
                  iconColor={theme.textSecondary}
                  onPress={() => {
                    setSearchQuery('');
                    setSearchFocused(false);
                  }}
                />
              )}
            />
          </Card>
        </Animated.View>
        {(filterCategory || showBreachedOnly) && (
          <View style={styles.filtersContainer}>
            {filterCategory && (
              <Chip 
                mode="flat" 
                onClose={() => setFilterCategory(null)}
                style={[styles.filterChip, { backgroundColor: theme.primary + '20' }]}
                textStyle={{ color: theme.primary, fontWeight: '600' }}
                icon="tag"
              >
                {filterCategory}
              </Chip>
            )}
            {showBreachedOnly && (
              <Chip 
                mode="flat" 
                onClose={() => setShowBreachedOnly(false)}
                style={[styles.filterChip, { backgroundColor: '#ef444420' }]}
                textStyle={{ color: '#ef4444', fontWeight: '600' }}
                icon="alert-circle"
              >
                Breached
              </Chip>
            )}
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text 
            variant="bodyMedium" 
            style={[styles.emptyText, { color: theme.textSecondary }]}
            textAlign="center"
            numberOfLines={1}
          >
            Loading passwords...
          </Text>
        </View>
      ) : filteredPasswords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '15' }]}>
            <MaterialCommunityIcons name="lock-off-outline" size={64} color={theme.primary} />
          </View>
          <Text 
            variant="headlineSmall" 
            style={[styles.emptyTitle, { color: theme.text }]}
            textAlign="center"
            numberOfLines={2}
          >
            {searchQuery || filterCategory || showBreachedOnly ? 'No passwords found' : 'No passwords yet'}
          </Text>
          <Text 
            variant="bodyMedium" 
            style={[styles.emptySubtext, { color: theme.textSecondary }]}
            textAlign="center"
            numberOfLines={2}
          >
            {searchQuery || filterCategory || showBreachedOnly 
              ? 'Try adjusting your filters' 
              : 'Tap the + button to add your first password'}
          </Text>
          {!searchQuery && !filterCategory && !showBreachedOnly && (
            <View style={[styles.emptyActionCard, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="information" size={20} color={theme.primary} />
              <Text 
                variant="bodySmall" 
                style={[styles.emptyHint, { color: theme.textSecondary }]}
                textAlign="center"
                numberOfLines={2}
              >
                Store all your passwords securely in one place
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <FlatList
            data={filteredPasswords}
            renderItem={renderPasswordItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            ListHeaderComponent={
              <Animated.View
                style={[
                  styles.listHeader,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text 
                  variant="titleMedium" 
                  style={[styles.listHeaderText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {filteredPasswords.length} {filteredPasswords.length === 1 ? 'password' : 'passwords'}
                </Text>
                {searchQuery && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={[styles.clearSearchButton, { backgroundColor: theme.primary + '15' }]}
                  >
                    <MaterialCommunityIcons name="close-circle" size={16} color={theme.primary} />
                    <Text 
                      variant="bodySmall" 
                      style={[styles.clearSearchText, { color: theme.primary }]}
                      numberOfLines={1}
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            }
          />
        </Animated.View>
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          navigation.navigate('AddPassword');
        }}
        color="white"
        customSize={56}
        animated={true}
        variant="surface"
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
  },
  filterIcon: {
    marginLeft: 8,
  },
  searchContainer: {
    marginTop: 8,
    width: '100%',
  },
  searchCard: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  searchbar: {
    elevation: 0,
    borderRadius: 12,
    width: '100%',
  },
  clearSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    marginLeft: 12,
    minWidth: 60,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  filterChip: {
    marginRight: 4,
  },
  list: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    width: '100%',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
    width: '100%',
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  emptySubtext: {
    textAlign: 'center',
    lineHeight: 20,
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  emptyActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 12,
    maxWidth: '90%',
    width: '100%',
  },
  emptyHint: {
    flex: 1,
    lineHeight: 18,
    textAlign: 'left',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    width: '100%',
    paddingHorizontal: 4,
  },
  listHeaderText: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.3,
    textAlign: 'left',
    flex: 1,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});