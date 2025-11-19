/**
 * Auto-fill Service
 * Provides password auto-fill suggestions based on website/domain
 */

import { PasswordEntry } from '../types';
import { getAllPasswords } from './fileStorage';

/**
 * Get password suggestions for a website/domain
 */
export function getPasswordSuggestions(
  website: string,
  allPasswords: PasswordEntry[]
): PasswordEntry[] {
  try {
    // Extract domain from website URL
    const domain = extractDomain(website);
    
    // Find matching passwords
    const suggestions = allPasswords.filter((entry) => {
      const entryDomain = extractDomain(entry.website);
      return entryDomain.toLowerCase() === domain.toLowerCase() ||
             entry.website.toLowerCase().includes(domain.toLowerCase()) ||
             domain.toLowerCase().includes(entryDomain.toLowerCase());
    });
    
    // Sort by last used (most recent first)
    return suggestions.sort((a, b) => {
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
  } catch (error) {
    console.error('Error getting password suggestions:', error);
    return [];
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    // Remove protocol
    let domain = url.replace(/^https?:\/\//, '');
    // Remove path
    domain = domain.split('/')[0];
    // Remove www.
    domain = domain.replace(/^www\./, '');
    // Remove port
    domain = domain.split(':')[0];
    return domain;
  } catch {
    return url;
  }
}

/**
 * Get username suggestions for a website
 */
export function getUsernameSuggestions(
  website: string,
  allPasswords: PasswordEntry[]
): string[] {
  try {
    const suggestions = getPasswordSuggestions(website, allPasswords);
    const usernames = suggestions.map(s => s.username);
    // Remove duplicates
    return Array.from(new Set(usernames));
  } catch (error) {
    console.error('Error getting username suggestions:', error);
    return [];
  }
}

