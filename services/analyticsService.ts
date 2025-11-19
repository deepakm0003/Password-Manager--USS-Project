import { getAllPasswords, getAllMFAApprovals, getAllEmailAliases, getCurrentUser } from './fileStorage';
import { PasswordEntry, MFAApproval, EmailAlias, PrivacyMetrics, SecurityEvent, DashboardData } from '../types';

/**
 * Analytics Service
 * Provides privacy metrics and security event tracking
 */

/**
 * Calculate digital hygiene score (0-100)
 */
function calculateDigitalHygieneScore(
  passwords: PasswordEntry[],
  mfaApprovals: MFAApproval[],
  aliases: EmailAlias[]
): number {
  let score = 100;
  
  // Deduct points for reused passwords
  const passwordCounts = new Map<string, number>();
  passwords.forEach(pwd => {
    const count = passwordCounts.get(pwd.password) || 0;
    passwordCounts.set(pwd.password, count + 1);
  });
  const reusedPasswords = Array.from(passwordCounts.values()).filter(count => count > 1).length;
  score -= Math.min(reusedPasswords * 5, 30); // Max 30 points deduction
  
  // Deduct points for weak passwords (simple check - length < 8)
  const weakPasswords = passwords.filter(pwd => pwd.password.length < 8).length;
  score -= Math.min(weakPasswords * 2, 20); // Max 20 points deduction
  
  // Deduct points for breached passwords
  const breachedPasswords = passwords.filter(pwd => pwd.isBreached).length;
  score -= Math.min(breachedPasswords * 10, 30); // Max 30 points deduction
  
  // Add points for MFA usage
  const recentMFA = mfaApprovals.filter(mfa => {
    const mfaDate = new Date(mfa.timestamp);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return mfaDate >= weekAgo && mfa.status === 'approved';
  }).length;
  score += Math.min(recentMFA * 2, 20); // Max 20 points bonus
  
  // Add points for email aliases usage
  const activeAliases = aliases.filter(a => a.status === 'active').length;
  score += Math.min(activeAliases * 1, 10); // Max 10 points bonus
  
  // Add points for tracker blocking
  const trackersBlocked = aliases.reduce((sum, a) => sum + (a.trackersBlocked || 0), 0);
  score += Math.min(trackersBlocked * 0.5, 10); // Max 10 points bonus
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Get privacy metrics
 */
export async function getPrivacyMetrics(): Promise<PrivacyMetrics> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }

    // Get passwords - for analytics we only need metadata
    // Note: In the current MVP, passwords are stored unencrypted in JSON
    // For production, you'd need to decrypt with masterPassword or maintain metadata separately
    const passwords = await getAllPasswords(''); // Empty string works since passwords aren't encrypted in MVP
    const mfaApprovals = await getAllMFAApprovals();
    const aliases = await getAllEmailAliases();

    // Calculate reused passwords
    const passwordCounts = new Map<string, number>();
    passwords.forEach(pwd => {
      const count = passwordCounts.get(pwd.password) || 0;
      passwordCounts.set(pwd.password, count + 1);
    });
    const reusedPasswords = Array.from(passwordCounts.values()).filter(count => count > 1).length;
    const uniquePasswords = passwordCounts.size;

    // Calculate MFA approvals this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const mfaApprovalsThisWeek = mfaApprovals.filter(mfa => {
      const mfaDate = new Date(mfa.timestamp);
      return mfaDate >= weekAgo && mfa.status === 'approved';
    }).length;

    // Calculate aliases used
    const aliasesUsed = aliases.filter(a => (a.usedCount || 0) > 0).length;
    const totalAliases = aliases.length;

    // Calculate trackers blocked
    const trackersBlocked = aliases.reduce((sum, a) => sum + (a.trackersBlocked || 0), 0);

    // Calculate logins via alias
    const loginsViaAlias = aliases.reduce((sum, a) => sum + (a.loginsViaAlias || 0), 0);

    // Calculate digital hygiene score
    const digitalHygieneScore = calculateDigitalHygieneScore(passwords, mfaApprovals, aliases);

    return {
      reusedPasswords,
      uniquePasswords,
      mfaApprovalsThisWeek,
      aliasesUsed,
      totalAliases,
      digitalHygieneScore: Math.round(digitalHygieneScore),
      trackersBlocked,
      loginsViaAlias,
    };
  } catch (error) {
    console.error('Error getting privacy metrics:', error);
    throw error;
  }
}

/**
 * Generate security events from data
 */
export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }

    const events: SecurityEvent[] = [];
    const mfaApprovals = await getAllMFAApprovals();
    const aliases = await getAllEmailAliases();
    const passwords = await getAllPasswords('');

    // Add MFA approval events
    mfaApprovals.forEach(mfa => {
      if (mfa.status === 'approved') {
        events.push({
          id: `mfa_${mfa.id}`,
          type: 'mfa_approval',
          title: `MFA Approved: ${mfa.service}`,
          description: `You approved a login from ${mfa.location || 'Unknown Location'}`,
          timestamp: mfa.timestamp,
          location: mfa.location,
          metadata: {
            service: mfa.service,
            deviceInfo: mfa.deviceInfo,
            aliasUsed: mfa.aliasUsed,
          },
        });
      } else if (mfa.status === 'denied') {
        events.push({
          id: `mfa_deny_${mfa.id}`,
          type: 'mfa_denial',
          title: `MFA Denied: ${mfa.service}`,
          description: `You denied a login attempt from ${mfa.location || 'Unknown Location'}`,
          timestamp: mfa.timestamp,
          location: mfa.location,
          metadata: {
            service: mfa.service,
            deviceInfo: mfa.deviceInfo,
          },
        });
      }
    });

    // Add alias creation events
    aliases.forEach(alias => {
      events.push({
        id: `alias_${alias.id}`,
        type: 'alias_created',
        title: `Email Alias Created`,
        description: `Created alias: ${alias.alias}`,
        timestamp: alias.createdAt,
        metadata: {
          alias: alias.alias,
          autoExpire: alias.autoExpire,
        },
      });
    });

    // Add alias expiration events
    aliases
      .filter(a => a.status === 'expired' && a.expiresAt)
      .forEach(alias => {
        events.push({
          id: `alias_expired_${alias.id}`,
          type: 'alias_expired',
          title: `Email Alias Expired`,
          description: `Alias ${alias.alias} expired`,
          timestamp: alias.expiresAt!,
          metadata: {
            alias: alias.alias,
            usedCount: alias.usedCount,
          },
        });
      });

    // Add tracker blocked events (simulated - in real app, these would come from email processing)
    aliases
      .filter(a => (a.trackersBlocked || 0) > 0)
      .forEach(alias => {
        events.push({
          id: `tracker_${alias.id}`,
          type: 'tracker_blocked',
          title: `Trackers Blocked`,
          description: `Blocked ${alias.trackersBlocked} marketing trackers in emails to ${alias.alias}`,
          timestamp: alias.lastUsedAt || alias.createdAt,
          metadata: {
            alias: alias.alias,
            trackersBlocked: alias.trackersBlocked,
          },
        });
      });

    // Add password sharing events (from shared passwords)
    passwords
      .filter(pwd => pwd.isShared)
      .forEach(pwd => {
        events.push({
          id: `share_${pwd.id}`,
          type: 'password_shared',
          title: `Password Shared`,
          description: `Shared password for ${pwd.website}`,
          timestamp: pwd.updatedAt,
          metadata: {
            website: pwd.website,
            sharedWith: pwd.sharedWith,
          },
        });
      });

    // Sort events by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  } catch (error) {
    console.error('Error getting security events:', error);
    return [];
  }
}

/**
 * Get dashboard data (metrics + events)
 */
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const metrics = await getPrivacyMetrics();
    const events = await getSecurityEvents();
    const recentEvents = events.slice(0, 10); // Last 10 events

    return {
      metrics,
      events,
      recentEvents,
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
}

