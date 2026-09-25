import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchCurrentUser, logout } from '../../lib/api';
import { replaceRoute } from '../../lib/navigation';
import ClaudeProfileHeader from '../../components/profile/ClaudeProfileHeader';
import ClaudeHabitsCard from '../../components/profile/ClaudeHabitsCard';
import ClaudeWearablesCard from '../../components/profile/ClaudeWearablesCard';
import ClaudeHabitDigestModal from '../../components/profile/ClaudeHabitDigestModal';
import ClaudeWearablesModal from '../../components/profile/ClaudeWearablesModal';
import ClaudeOneToOneBookingModal from '../../components/profile/ClaudeOneToOneBookingModal';
import ClaudeInnerCircleApplyModal from '../../components/profile/ClaudeInnerCircleApplyModal';
import ClaudeNotificationPreferencesModal from '../../components/profile/ClaudeNotificationPreferencesModal';
import ClaudeDuoModal from '../../components/duo/ClaudeDuoModal';
import { useTheme } from '../../context/ThemeContext';
import RequirementAuditBoundary from '../../components/audit/RequirementAuditBoundary';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, colors, theme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('Michael Krause');
  const [initials, setInitials] = useState('MK');
  const [tier, setTier] = useState('GOLD');
  const [streakDays, setStreakDays] = useState(12);
  const [totalSessions, setTotalSessions] = useState(64);
  const [consistencyPct, setConsistencyPct] = useState(78);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Modals state
  const [showDuoModal, setShowDuoModal] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [showWearModal, setShowWearModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUserData = async () => {
      try {
        const u = await fetchCurrentUser();
        if (cancelled || !u) return;
        const userObj = u as any;
        setUser(userObj);
        if (userObj.name) {
          setName(userObj.name);
          const parts = userObj.name.trim().split(' ');
          const inits = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
          setInitials(inits.toUpperCase());
        }
        const t = (userObj.tier || userObj.membership_tier || 'gold').toUpperCase();
        setTier(t);
      } catch {
        // Fallback silently
      }
    };

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, []);

  const isSilver = tier === 'SILVER';
  const isPlatinumOrIC = tier === 'PLATINUM' || tier === 'INNER CIRCLE' || tier === 'INNER_CIRCLE';
  const isIC = tier === 'INNER CIRCLE' || tier === 'INNER_CIRCLE';

  const performLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    await logout();
    replaceRoute(router, '/welcome');
  };

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    await performLogout();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header & Stats Row matching lines 1133-1141 */}
        <ClaudeProfileHeader
          name={name}
          initials={initials}
          tier={tier}
          streakDays={streakDays}
          totalSessions={totalSessions}
          consistencyPct={consistencyPct}
        />

        {/* Daily Journal Teaser Card matching lines 1143-1156 */}
        <RequirementAuditBoundary auditId="APP-EXTRA-001" status="extra">
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionKicker, { color: colors.copper }]}>JOURNAL</Text>
            <TouchableOpacity
              style={[
                styles.journalCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'transparent' : colors.cardBorder,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => router.push('/journal')}
            >
              <View style={styles.journalTopRow}>
                <Text style={styles.journalPromptKicker}>TODAY'S PROMPT</Text>
                <Text style={styles.journalRunningBadge}>5 DAYS RUNNING</Text>
              </View>
              <Text style={[styles.journalTitle, { color: colors.text }]}>What went better than you expected?</Text>
              <View style={styles.journalBottomRow}>
                <Text style={[styles.journalSub, { color: colors.textSecondary }]}>Two minutes. Nobody else sees it.</Text>
                <Text style={styles.journalWriteLink}>Write ›</Text>
              </View>
            </TouchableOpacity>
          </View>
        </RequirementAuditBoundary>

        {/* Health & Wearables section matching lines 1158-1182 (Platinum & Inner Circle) */}
        {isPlatinumOrIC && (
          <ClaudeWearablesCard onOpenWearables={() => setShowWearModal(true)} />
        )}

        {/* All 4 Habit Fields editable with trigger usage counter matching lines 1184-1211 */}
        <ClaudeHabitsCard
          isSilver={isSilver}
          onOpenDuo={() => setShowDuoModal(true)}
          onUpgrade={() => router.push('/membership')}
        />

        {/* Weekly Digest Teaser Card matching lines 1213-1220 (Platinum & Inner Circle) */}
        {isPlatinumOrIC && (
          <View style={styles.digestWrap}>
            <TouchableOpacity
              style={[
                styles.digestCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'transparent' : colors.cardBorder,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setShowDigestModal(true)}
            >
              <View style={styles.digestTextCol}>
                <Text style={[styles.digestTitle, { color: colors.text }]}>Your week, in your own words</Text>
                <Text style={[styles.digestSub, { color: colors.textSecondary }]}>Monday 08:00 habit and training digest</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACCOUNT Menu Section matching lines 1222-1231 */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionKicker, { color: colors.copper }]}>ACCOUNT</Text>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderColor: isDark ? 'transparent' : colors.cardBorder,
                borderWidth: isDark ? 0 : 1,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/settings')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>Settings</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>Habits & mindset</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/settings')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>Appearance</Text>
              <Text style={[styles.menuMeta, { fontFamily: MONO, color: GOLD }]}>
                {isDark ? 'DARK MODE' : 'WHITE MODE'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>Edit profile</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>Name, photo, targets</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => setShowNotifModal(true)}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.menuMeta, { fontFamily: MONO, color: colors.textMuted }]}>20:30 · PUSH & WA</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Language', 'English (UK) is currently selected.')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>Language</Text>
              <Text style={[styles.menuMeta, { fontFamily: MONO, color: GOLD }]}>ENGLISH</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/support')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>Help & support</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>Replies within a day</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/privacy')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>Privacy policy</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>Export or delete data</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inner Circle Application card matching lines 1233-1240 (for non-IC members) */}
        {!isIC && (
          <View style={styles.sectionWrap}>
            <TouchableOpacity
              style={[
                styles.applyCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'transparent' : colors.cardBorder,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => setShowApplyModal(true)}
            >
              <View style={styles.applyTextCol}>
                <Text style={[styles.applyTitle, { color: colors.text }]}>Apply for Inner Circle</Text>
                <Text style={[styles.applySub, { color: colors.textSecondary }]}>
                  Five questions, straight to Victor. Then a call to see whether it fits.
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* YOUR PLAN Card matching lines 1242-1246 */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: isDark ? NAVY : '#FFFFFF',
              borderColor: isDark ? 'transparent' : colors.cardBorder,
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          <View style={styles.planHeaderRow}>
            <Text style={styles.planKicker}>{`YOUR PLAN · ${tier}`}</Text>
            <Text style={[styles.planPrice, { color: colors.textMuted }]}>
              {tier === 'SILVER' ? '€19/mo' : tier === 'GOLD' ? '€49/mo' : tier === 'PLATINUM' ? '€129/mo' : '€490/mo'}
            </Text>
          </View>
          <Text style={[styles.planSub, { color: colors.textSecondary }]}>
            {tier === 'SILVER'
              ? 'Workouts and community. Upgrade to Gold for AI Coach, macro tracker, and week meal plans.'
              : tier === 'GOLD'
              ? 'Unlimited AI Coach, 170 workouts, and macro tracking. Platinum adds wearable sync & monthly 1-to-1 coach calls.'
              : 'Priority coach responses, wearable sync, and monthly 1-to-1 coaching sessions included.'}
          </Text>
          <TouchableOpacity
            style={styles.compareBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/membership')}
          >
            <Text style={styles.compareBtnText}>Compare tiers & upgrade</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.06)',
            },
          ]}
          activeOpacity={0.75}
          disabled={isSigningOut}
          onPress={handleLogout}
        >
          {isSigningOut ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={[styles.signOutBtnText, { color: colors.textSecondary }]}>Sign out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <ClaudeDuoModal visible={showDuoModal} onClose={() => setShowDuoModal(false)} />
      <ClaudeHabitDigestModal
        visible={showDigestModal}
        onClose={() => setShowDigestModal(false)}
        onBookHumanSession={() => {
          setShowDigestModal(false);
          setShowBookingModal(true);
        }}
      />
      <ClaudeWearablesModal
        visible={showWearModal}
        onClose={() => setShowWearModal(false)}
        tierBadge={tier}
      />
      <ClaudeOneToOneBookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        tierBadge={tier}
      />
      <ClaudeInnerCircleApplyModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        userName={name}
        userEmail={user?.email || 'm.krause@mail.de'}
        userPhone={user?.contact_number || ''}
      />
      <ClaudeNotificationPreferencesModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'web' ? 24 : 50,
    paddingBottom: 110,
  },
  sectionWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  journalCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  journalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  journalPromptKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.2,
    color: GOLD,
  },
  journalRunningBadge: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  journalTitle: {
    fontFamily: CLASH,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: IVORY,
  },
  journalBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  journalSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  journalWriteLink: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
  digestWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  digestCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  digestTextCol: {
    flex: 1,
  },
  digestTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  digestSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  menuTitle: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 15,
    color: IVORY,
  },
  menuMeta: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginRight: 10,
  },
  chevron: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  applyCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    paddingVertical: 17,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  applyTextCol: {
    flex: 1,
  },
  applyTitle: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '600',
    color: IVORY,
  },
  applySub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  planCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
  },
  planPrice: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  planSub: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.82)',
    marginBottom: 14,
  },
  compareBtn: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.65)',
  },
});
