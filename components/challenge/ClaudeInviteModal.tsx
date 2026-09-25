import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
} from 'react-native';

interface ClaudeInviteModalProps {
  visible: boolean;
  onClose: () => void;
  challengeTitle?: string;
  userName?: string;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';
const GREEN = '#1A7A4A';
const EMERALD = '#5FC48E';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeInviteModal({
  visible,
  onClose,
  challengeTitle = '21-Day Warrior',
  userName = 'Michael',
}: ClaudeInviteModalProps) {
  const inviteMessage = `“Join ${userName}'s team for the ${challengeTitle} on Victory Fitness. We're in this together.”`;
  const inviteUrl = 'https://victoryfitness.app/join/CH-WARRIOR';

  const handleShareWhatsApp = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(
            `https://wa.me/?text=${encodeURIComponent(`${inviteMessage}\n\n${inviteUrl}`)}`,
            '_blank'
          );
        }
      } else {
        await Share.share({
          message: `${inviteMessage}\n\n${inviteUrl}`,
        });
      }
    } catch {
      Alert.alert('Invite Link', `${inviteMessage}\n\n${inviteUrl}`);
    }
  };

  const handleCopyLink = () => {
    Alert.alert('Link Copied', `Guest invite link copied to clipboard:\n${inviteUrl}`);
  };

  const handleEmail = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = `mailto:?subject=${encodeURIComponent(
        `Join ${userName} for the ${challengeTitle}`
      )}&body=${encodeURIComponent(`${inviteMessage}\n\n${inviteUrl}`)}`;
    } else {
      Alert.alert('Email Invite', `Invite URL ready to send:\n${inviteUrl}`);
    }
  };

  const handleInstagram = () => {
    Alert.alert(
      'Share to Story / DM',
      `Copy this link to share in your Instagram story or message:\n${inviteUrl}`
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row matching line 1463-1466 */}
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>{`INVITE · ${challengeTitle.toUpperCase()}`}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Title and Subtitle matching lines 1467-1468 */}
          <Text style={styles.title}>Ask someone who isn't in the app</Text>
          <Text style={styles.subtitle}>
            They run their own 21 days starting the day they join — so they get the full challenge,
            not the tail end of yours. You both appear on the same board.
          </Text>

          {/* What they will read matching lines 1469-1472 */}
          <View style={styles.readCard}>
            <Text style={styles.readKicker}>WHAT THEY'LL READ</Text>
            <Text style={styles.readQuote}>{inviteMessage}</Text>
          </View>

          {/* SEND IT Section matching lines 1473-1481 */}
          <Text style={styles.sendKicker}>SEND IT</Text>
          <View style={styles.sendButtonsGroup}>
            <TouchableOpacity
              style={styles.whatsappBtn}
              activeOpacity={0.85}
              onPress={handleShareWhatsApp}
            >
              <Text style={styles.whatsappBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity
                style={styles.outlineBtn}
                activeOpacity={0.8}
                onPress={handleCopyLink}
              >
                <Text style={styles.outlineBtnText}>Copy link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineBtn}
                activeOpacity={0.8}
                onPress={handleEmail}
              >
                <Text style={styles.outlineBtnText}>Email</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.outlineBtnWide}
              activeOpacity={0.8}
              onPress={handleInstagram}
            >
              <Text style={styles.outlineBtnText}>Share to Instagram</Text>
            </TouchableOpacity>
          </View>

          {/* Guest Mode Explainer Card matching lines 1482-1500 */}
          <View style={styles.guestModeCard}>
            <Text style={styles.guestModeKicker}>GUEST MODE · THEIR OWN 21 DAYS</Text>

            {/* Progress Bars Comparison */}
            <View style={styles.progressComparisonBox}>
              <View style={styles.progressRow}>
                <Text style={styles.userLabelYou}>YOU</Text>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: '86%', backgroundColor: GOLD }]} />
                </View>
                <Text style={styles.dayLabel}>day 18</Text>
              </View>

              <View style={[styles.progressRow, { marginTop: 9 }]}>
                <Text style={styles.userLabelThem}>THEM</Text>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: '5%', backgroundColor: EMERALD }]} />
                </View>
                <Text style={styles.dayLabel}>day 1</Text>
              </View>

              <Text style={styles.comparisonNote}>
                Different days, same board. You finish first — then cheer them through the rest.
              </Text>
            </View>

            {/* Bullets matching lines 1497-1498 */}
            <View style={styles.bulletRow}>
              <View style={styles.greenDot} />
              <Text style={styles.bulletTextPrimary}>
                The challenge, their daily tick, your leaderboard
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={styles.emptyDot} />
              <Text style={styles.bulletTextSecondary}>
                No workout library, no coach, no nutrition
              </Text>
            </View>

            <Text style={styles.conversionNote}>
              On their day 21 they see how they finished, and that is the moment they're asked to subscribe.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 54,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: COPPER,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontFamily: DMSANS,
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  title: {
    fontFamily: CLASH,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 20,
  },
  readCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  readKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 10,
  },
  readQuote: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    lineHeight: 23,
    fontWeight: '500',
    color: IVORY,
  },
  sendKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  sendButtonsGroup: {
    gap: 8,
    marginBottom: 18,
  },
  whatsappBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: IVORY,
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  outlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnWide: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: IVORY,
  },
  guestModeCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(181, 101, 29, 0.5)',
    borderRadius: 18,
    padding: 17,
  },
  guestModeKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: COPPER,
    marginBottom: 12,
  },
  progressComparisonBox: {
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userLabelYou: {
    width: 48,
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: GOLD,
  },
  userLabelThem: {
    width: 48,
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: EMERALD,
  },
  progressBarTrack: {
    flex: 1,
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.14)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  dayLabel: {
    width: 50,
    textAlign: 'right',
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.6)',
  },
  comparisonNote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.6)',
    marginTop: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
  },
  bulletTextPrimary: {
    fontFamily: INTER,
    fontSize: 13.5,
    color: 'rgba(247, 243, 238, 0.82)',
  },
  bulletTextSecondary: {
    fontFamily: INTER,
    fontSize: 13.5,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  conversionNote: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 11,
  },
});
