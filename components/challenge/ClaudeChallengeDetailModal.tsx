import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ChallengeItem } from './ClaudeChallengeDirectory';
import RequirementAuditBoundary from '../audit/RequirementAuditBoundary';

interface ClaudeChallengeDetailModalProps {
  challenge: ChallengeItem | null;
  visible: boolean;
  onClose: () => void;
  onJoin: (challenge: ChallengeItem) => void;
  onOpenCohort: () => void;
  onInvite?: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeChallengeDetailModal({
  challenge,
  visible,
  onClose,
  onJoin,
  onOpenCohort,
  onInvite,
}: ClaudeChallengeDetailModalProps) {
  if (!challenge) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card matching lines 1720-1730 */}
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.backBtnText}>← Challenges</Text>
              </TouchableOpacity>
              <Text style={styles.categoryBadge}>{challenge.c}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaDays}>{`${challenge.d} DAYS`}</Text>
              <Text style={styles.metaPoints}>{challenge.p}</Text>
            </View>

            <Text style={styles.challengeTitle}>{challenge.n}</Text>
          </View>

          {/* WHAT TO DO matching lines 1732-1735 */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionKicker}>WHAT TO DO</Text>
            <Text style={styles.sectionBody}>
              {challenge.desc ||
                '3 full-body sessions per week plus 1 recovery walk. No missed days allowed.'}
            </Text>
          </View>

          {/* WHY IT MATTERS matching lines 1737-1740 */}
          <View style={styles.highlightCard}>
            <Text style={styles.highlightKicker}>WHY IT MATTERS</Text>
            <Text style={styles.highlightBody}>
              {challenge.why ||
                'Three weeks creates the neuro-pathway that turns conscious discipline into automatic behavior.'}
            </Text>
          </View>

          {/* WHO IS IN IT matching lines 1742-1757 */}
          <View style={styles.whoCard}>
            <Text style={styles.whoKicker}>WHO IS IN IT</Text>
            <View style={styles.whoRow}>
              <View style={styles.avatarRow}>
                {challenge.faces.map((f, i) => (
                  <View key={`face-${i}`} style={[styles.avatarCircle, { marginLeft: i > 0 ? -8 : 0 }]}>
                    <Text style={styles.avatarText}>{f.i}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.whoTextCol}>
                <Text style={styles.whoTitle}>{challenge.joined}</Text>
                <Text style={styles.whoSub}>82% completion rate in previous cohort</Text>
              </View>
            </View>

            <View style={styles.whoActionsRow}>
              <TouchableOpacity
                style={styles.cohortBtn}
                activeOpacity={0.8}
                onPress={onOpenCohort}
              >
                <Text style={styles.cohortBtnText}>Cohort chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inviteOutlineBtn}
                activeOpacity={0.8}
                onPress={onInvite || onClose}
              >
                <Text style={styles.inviteOutlineBtnText}>Invite someone</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Points Rules Table matching lines 1759-1763 */}
          <RequirementAuditBoundary
            auditId="APP-EXTRA-020"
            status="extra"
            label="NEW FEATURE - NOT IN REQUIREMENT (PRORATED POINTS & STREAK PRESERVATION)"
          >
            <View style={styles.rulesCard}>
              <View style={[styles.rulesRow, styles.rulesRowBorder]}>
                <Text style={styles.rulesLabel}>If you finish</Text>
                <Text style={styles.rulesPoints}>{challenge.p}</Text>
              </View>
              <View style={[styles.rulesRow, styles.rulesRowBorder]}>
                <Text style={styles.rulesLabel}>Over half done</Text>
                <Text style={styles.rulesSub}>50% of points</Text>
              </View>
              <View style={styles.rulesRow}>
                <Text style={styles.rulesLabel}>If you leave early</Text>
                <Text style={styles.rulesSub}>streak untouched</Text>
              </View>
            </View>
          </RequirementAuditBoundary>

          {/* Join CTA matching lines 1765-1766 */}
          <TouchableOpacity
            style={styles.mainJoinBtn}
            activeOpacity={0.85}
            onPress={() => onJoin(challenge)}
          >
            <Text style={styles.mainJoinBtnText}>Join this challenge</Text>
          </TouchableOpacity>

          <Text style={styles.joinFootnote}>
            Joining opens the cohort lobby so you start with the people already in it.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  headerCard: {
    backgroundColor: NAVY,
    paddingTop: Platform.OS === 'web' ? 36 : 54,
    paddingBottom: 24,
    paddingHorizontal: 22,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  categoryBadge: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: COPPER,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 10,
  },
  metaDays: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  metaPoints: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  challengeTitle: {
    fontFamily: CLASH,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    letterSpacing: -0.3,
  },
  sectionWrap: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: DMSANS,
    fontSize: 16.5,
    lineHeight: 25,
    fontWeight: '500',
    color: IVORY,
  },
  highlightCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 18,
  },
  highlightKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 9,
  },
  highlightBody: {
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.88)',
  },
  whoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
  },
  whoKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 14,
  },
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    color: GOLD,
  },
  whoTextCol: {
    flex: 1,
  },
  whoTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  whoSub: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  whoActionsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  cohortBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cohortBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: IVORY,
  },
  inviteOutlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteOutlineBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
  },
  rulesCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  rulesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rulesRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  rulesLabel: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  rulesPoints: {
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
  },
  rulesSub: {
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '700',
    color: IVORY,
  },
  mainJoinBtn: {
    marginHorizontal: 20,
    marginTop: 22,
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainJoinBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  joinFootnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.45)',
    marginHorizontal: 20,
    marginTop: 12,
  },
});
