import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { AuthUser, fetchCurrentUser, fetchNetworkActivity, NetworkActivityResponse } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';

export default function SocialContagionWidget() {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [userTrainedToday, setUserTrainedToday] = useState(false);
  const [headline, setHeadline] = useState('');
  const [recentCompletions, setRecentCompletions] = useState<NetworkActivityResponse['recent_completions']>([]);
  const [shareActivity, setShareActivity] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      try {
        const [activity, user] = await Promise.all([
          fetchNetworkActivity().catch(() => null),
          fetchCurrentUser().catch(() => null),
        ]);

        if (cancelled) return;

        if (activity) {
          setActiveCount(activity.active_today || 0);
          setUserTrainedToday(Boolean(activity.user_trained_today));
          if (activity.headline) {
            setHeadline(activity.headline);
          }
          setRecentCompletions(activity.recent_completions || []);
        }
        if (user) {
          setCurrentUser(user);
          setShareActivity(user.share_activity_with_network !== false);
        }
        setUserLoaded(true);
      } catch {
        setUserLoaded(true);
      }
    };

    void loadActivity();
    const interval = setInterval(() => {
      void loadActivity();
    }, 60000); // 1 minute near real-time refresh

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const tier = String(currentUser?.subscription_tier || 'NONE').toUpperCase().replace(/\s+/g, '_');
  const isSilverOrAbove =
    Boolean(currentUser?.is_admin) ||
    Boolean(currentUser?.gold_trial?.active) ||
    ['SILVER', 'GOLD', 'PLATINUM', 'INNER_CIRCLE', 'GOLD_BETA'].includes(tier);

  // Locked card for Free tier per Section 20.2 (Silver and above)
  if (userLoaded && !isSilverOrAbove) {
    return (
      <View style={[styles.card, styles.lockedCard]}>
        <View style={styles.headerRow}>
          <View style={styles.silverBadge}>
            <Ionicons name="sparkles" size={13} color="#CBD5E1" />
            <Text style={styles.silverBadgeText}>{t('SILVER AND ABOVE')}</Text>
          </View>
          <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.5)" />
        </View>
        <Text style={styles.lockedTitle}>{t('Social Contagion Feed')}</Text>
        <Text style={styles.lockedDesc}>
          {t('See real-time training activity from your circle, accountability partners, and challenge teammates.')}
        </Text>
        <TouchableOpacity
          style={styles.upgradeBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/plan')}
        >
          <Text style={styles.upgradeBtnText}>{t('UNLOCK WITH SILVER')}</Text>
          <Ionicons name="arrow-forward" size={14} color="#050814" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    );
  }

  // Dynamic 3-state headline logic per Section 20.2
  const computedHeadline =
    headline ||
    (userTrainedToday
      ? activeCount > 0
        ? `You trained today — ${activeCount} others did too.`
        : 'You trained today — Be the first in your network!'
      : activeCount > 0
      ? `${activeCount} people in your network trained today`
      : 'Be the first in your network to train today');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.liveBadge}>
          <View style={styles.livePulseDot} />
          <Text style={styles.liveText}>{t('LIVE NETWORK')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          style={styles.privacyLink}
          hitSlop={6}
        >
          <Ionicons
            name={shareActivity ? 'shield-checkmark-outline' : 'eye-off-outline'}
            size={14}
            color={shareActivity ? Colors.primary : Colors.textMuted}
          />
          <Text style={styles.privacyLinkText}>
            {shareActivity ? t('Sharing on') : t('Private')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.countRow}>
        {recentCompletions.length > 0 ? (
          <View style={styles.avatarStack}>
            {recentCompletions.slice(0, 4).map((item, index) => (
              <View
                key={item.id || `${item.name}-${index}`}
                style={[styles.avatarMini, { backgroundColor: item.avatar_color || Colors.primary, marginLeft: index === 0 ? 0 : -8 }]}
              >
                <Text style={styles.avatarInitial}>{String(item.name || '?').trim().slice(0, 1).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1, marginLeft: recentCompletions.length > 0 ? 12 : 0 }}>
          <Text style={styles.countText}>
            {t(computedHeadline)}
          </Text>
        </View>
      </View>

      {recentCompletions.length > 0 ? (
        <View style={styles.recentList}>
          {recentCompletions.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.recentItem}>
              <View style={[styles.recentDot, { backgroundColor: item.avatar_color || Colors.primary }]} />
              <Text style={styles.recentItemText} numberOfLines={1}>
                <Text style={styles.recentItemName}>{item.name} </Text>
                {t(item.action)}
              </Text>
              <Text style={styles.recentItemTime}>{item.time_ago}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101426',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 20,
  },
  lockedCard: {
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  silverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  silverBadgeText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  lockedTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  lockedDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00F0D0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  upgradeBtnText: {
    color: '#050814',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  liveText: {
    color: '#10B981',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.1,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyLinkText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#101426',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#000',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  countText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  recentList: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recentItemText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  recentItemName: {
    color: '#FFF',
    fontFamily: 'Inter_600SemiBold',
  },
  recentItemTime: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
