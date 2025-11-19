/**
 * Website Icon Service
 * Fetches and caches website favicons/icons
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const ICON_CACHE_KEY = '@website_icons_cache';
const ICON_CACHE_DIR = `${FileSystem.documentDirectory}website_icons/`;

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    // Remove protocol
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove path
    domain = domain.split('/')[0];
    // Remove port
    domain = domain.split(':')[0];
    return domain.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Get website icon URL using Google's favicon service
 * This is a free service that provides favicons for any domain
 */
export function getWebsiteIconUrl(website: string): string {
  const domain = extractDomain(website);
  
  // Use Google's favicon service (free, no API key needed)
  // Format: https://www.google.com/s2/favicons?domain=example.com&sz=64
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Alternative: Use favicon.io API (also free)
 */
export function getWebsiteIconUrlAlternative(website: string): string {
  const domain = extractDomain(website);
  return `https://favicon.io/api/v1/${domain}`;
}

/**
 * Get icon URL for a website (primary method)
 */
export async function getWebsiteIcon(website: string): Promise<string | null> {
  try {
    if (!website || website.trim().length === 0) {
      return null;
    }

    const domain = extractDomain(website);
    
    // Check cache first
    const cachedIcon = await getCachedIcon(domain);
    if (cachedIcon) {
      return cachedIcon;
    }

    // Get icon URL using Google's service
    const iconUrl = getWebsiteIconUrl(website);
    
    // Cache the icon URL (not the image itself for now)
    await cacheIcon(domain, iconUrl);
    
    return iconUrl;
  } catch (error) {
    console.error('Error getting website icon:', error);
    return null;
  }
}

/**
 * Cache icon URL
 */
async function cacheIcon(domain: string, iconUrl: string): Promise<void> {
  try {
    const cacheStr = await AsyncStorage.getItem(ICON_CACHE_KEY);
    const cache = cacheStr ? JSON.parse(cacheStr) : {};
    cache[domain] = {
      iconUrl,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(ICON_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching icon:', error);
  }
}

/**
 * Get cached icon URL
 */
async function getCachedIcon(domain: string): Promise<string | null> {
  try {
    const cacheStr = await AsyncStorage.getItem(ICON_CACHE_KEY);
    if (!cacheStr) return null;
    
    const cache = JSON.parse(cacheStr);
    const cached = cache[domain];
    
    if (cached && cached.iconUrl) {
      // Cache is valid (we can add expiration logic here if needed)
      return cached.iconUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached icon:', error);
    return null;
  }
}

/**
 * Clear icon cache
 */
export async function clearIconCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ICON_CACHE_KEY);
    // Also clear file cache if it exists
    const dirInfo = await FileSystem.getInfoAsync(ICON_CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(ICON_CACHE_DIR, { idempotent: true });
    }
  } catch (error) {
    console.error('Error clearing icon cache:', error);
  }
}

/**
 * Get icon for multiple websites (batch)
 */
export async function getWebsiteIcons(websites: string[]): Promise<Record<string, string>> {
  const icons: Record<string, string> = {};
  
  await Promise.all(
    websites.map(async (website) => {
      const domain = extractDomain(website);
      const icon = await getWebsiteIcon(website);
      if (icon) {
        icons[domain] = icon;
      }
    })
  );
  
  return icons;
}

