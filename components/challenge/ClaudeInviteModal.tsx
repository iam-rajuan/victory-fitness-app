import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { apiRequest } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';

export interface ClaudeInviteViewProps {
  onClose: () => void;
  challengeId?: string;
  challengeTitle?: string;
  challengeDays?: number;
  userName?: string;
  inviterId?: string;
  isOverlay?: boolean;
}

export interface ClaudeInviteModalProps extends ClaudeInviteViewProps {
  visible: boolean;
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

export function ClaudeInviteView({
  onClose,
  challengeId,
  challengeTitle = 'Challenge',
  challengeDays = 1,
  userName = 'Member',
  inviterId,
  isOverlay = false,
}: ClaudeInviteViewProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [inviteState, setInviteState] = useState<{ id: string; url: string } | null>(null);
  const [isPreparingInvite, setIsPreparingInvite] = useState(false);

  const displayTitle = challengeTitle || 'Challenge';
  const displayDays = challengeDays || 1;
  const fallbackInviteUrl = buildChallengeInviteUrl({ challengeId, inviterId });
  const inviteUrl = inviteState?.url || fallbackInviteUrl;
  const inviteMessage = buildChallengeInviteMessage({
    language,
    userName,
    challengeTitle: displayTitle,
    challengeDays: displayDays,
    inviteUrl,
  });

  const prepareInvite = async () => {
    if (inviteState) return inviteState;
    setIsPreparingInvite(true);
    try {
      const response = await apiRequest<{
        id?: string;
        invite_id?: string;
        inviter_id?: string | null;
        challenge_id?: string | null;
      }>('/invites', {
        method: 'POST',
        body: {
          challenge_id: challengeId || undefined,
          source: challengeId ? 'challenge_invite' : 'challenge_guest_invite',
        },
      });
      const inviteId = String(response.invite_id || response.id || '').trim();
      const resolvedUrl = buildChallengeInviteUrl({
        challengeId: String(response.challenge_id || challengeId || '').trim(),
        inviterId: String(response.inviter_id || inviterId || '').trim(),
        inviteId,
      });
      const next = { id: inviteId, url: resolvedUrl };
      setInviteState(next);
      return next;
    } finally {
      setIsPreparingInvite(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const invite = await prepareInvite();
      const shareText = buildChallengeInviteMessage({
        language,
        userName,
        challengeTitle: displayTitle,
        challengeDays: displayDays,
        inviteUrl: invite.url,
      });
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(waUrl, '_blank');
        }
      } else {
        const canOpen = await Linking.canOpenURL(waUrl);
        if (canOpen) {
          await Linking.openURL(waUrl);
        } else {
          await Share.share({ message: shareText });
        }
      }
    } catch {
      Alert.alert('Invite Link', `${inviteMessage}\n\n${inviteUrl}`);
    }
  };

  const handleCopyLink = async () => {
    try {
      const invite = await prepareInvite();
      const shareText = buildChallengeInviteMessage({
        language,
        userName,
        challengeTitle: displayTitle,
        challengeDays: displayDays,
        inviteUrl: invite.url,
      });
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        await Clipboard.setStringAsync(shareText);
      }
    } catch {
      Alert.alert('Invite Link', inviteUrl);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleEmail = async () => {
    const invite = await prepareInvite();
    const subject = `Join ${userName} for the ${displayTitle}`;
    const body = buildChallengeInviteMessage({
      language,
      userName,
      challengeTitle: displayTitle,
      challengeDays: displayDays,
      inviteUrl: invite.url,
    });
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = mailtoUrl;
    } else {
      Linking.openURL(mailtoUrl).catch(() => {
        Alert.alert('Email Invite', `Invite URL ready to send:\n${inviteUrl}`);
      });
    }
  };

  const handleInstagram = async () => {
    try {
      const invite = await prepareInvite();
      const shareText = buildChallengeInviteMessage({
        language,
        userName,
        challengeTitle: displayTitle,
        challengeDays: displayDays,
        inviteUrl: invite.url,
      });
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        await Clipboard.setStringAsync(shareText);
      }
    } catch {}
    Alert.alert(
      'Share to Instagram',
      `Invite message copied to clipboard!\nOpen Instagram and paste it in your Story sticker or direct message.`
    );
  };

  return (
    <View style={[styles.container, isOverlay && styles.overlayContainer]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isOverlay && styles.overlayScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row matching line 1463-1466 */}
        <View style={styles.headerRow}>
          <Text style={styles.kicker}>{`INVITE · ${displayTitle.toUpperCase()}`}</Text>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeBtnText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Title and Subtitle matching lines 1467-1468 */}
        <Text style={styles.title}>Ask someone who isn't in the app</Text>
        <Text style={styles.subtitle}>
          {`They run their own ${displayDays} days starting the day they join — so they get the full challenge, not the tail end of yours. You both appear on the same board.`}
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
              style={[styles.outlineBtn, copied && styles.outlineBtnCopied]}
              activeOpacity={0.8}
              onPress={handleCopyLink}
            >
              <Text style={[styles.outlineBtnText, copied && styles.outlineBtnTextCopied]}>
                {isPreparingInvite ? 'Preparing...' : copied ? '✓ Copied' : 'Copy link'}
              </Text>
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
          <Text style={styles.guestModeKicker}>
            {`GUEST MODE · THEIR OWN ${displayDays} DAYS`}
          </Text>

          {/* Progress Bars Comparison */}
          <View style={styles.progressComparisonBox}>
            <View style={styles.progressRow}>
              <Text style={styles.userLabelYou}>YOU</Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '86%', backgroundColor: GOLD }]} />
              </View>
              <Text style={styles.dayLabel}>
                {displayDays > 5 ? 'day 18' : `day ${Math.max(1, displayDays - 1)}`}
              </Text>
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
            {`On their day ${displayDays} they see how they finished, and that is the moment they're asked to subscribe.`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default function ClaudeInviteModal({
  visible,
  onClose,
  challengeId,
  challengeTitle = 'Challenge',
  challengeDays = 1,
  userName = 'Member',
  inviterId,
}: ClaudeInviteModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <ClaudeInviteView
        onClose={onClose}
        challengeId={challengeId}
        challengeTitle={challengeTitle}
        challengeDays={challengeDays}
        userName={userName}
        inviterId={inviterId}
      />
    </Modal>
  );
}

function buildChallengeInviteMessage({
  language,
  userName,
  challengeTitle,
  challengeDays,
  inviteUrl,
}: {
  language: string;
  userName: string;
  challengeTitle: string;
  challengeDays: number;
  inviteUrl: string;
}) {
  const safeUserName = userName || 'A Victory Fitness member';
  const safeTitle = challengeTitle || 'Challenge';
  const days = Math.max(1, Number(challengeDays || 1));
  const templates: Record<string, string> = {
    de: [
      `${safeUserName} lädt dich zur Challenge "${safeTitle}" bei Victory Fitness ein.`,
      `Du bekommst deine eigenen ${days} Tage ab dem Moment, in dem du beitrittst. Ihr seid trotzdem auf demselben Board und könnt euch gegenseitig motivieren.`,
      `Hier beitreten oder zuerst dein Konto erstellen: ${inviteUrl}`,
    ].join('\n\n'),
    es: [
      `${safeUserName} te invita al reto "${safeTitle}" en Victory Fitness.`,
      `Tendrás tus propios ${days} días desde el momento en que te unes. Aun así estarán en el mismo tablero para apoyarse.`,
      `Únete aquí o crea primero tu cuenta: ${inviteUrl}`,
    ].join('\n\n'),
    fr: [
      `${safeUserName} t'invite au challenge "${safeTitle}" sur Victory Fitness.`,
      `Tu auras tes propres ${days} jours à partir du moment où tu rejoins. Vous serez quand même sur le même classement pour vous encourager.`,
      `Rejoins ici ou crée d'abord ton compte : ${inviteUrl}`,
    ].join('\n\n'),
    it: [
      `${safeUserName} ti invita alla challenge "${safeTitle}" su Victory Fitness.`,
      `Avrai i tuoi ${days} giorni dal momento in cui entri. Sarete comunque sulla stessa classifica per motivarvi.`,
      `Entra qui o crea prima il tuo account: ${inviteUrl}`,
    ].join('\n\n'),
    pt: [
      `${safeUserName} está te convidando para o desafio "${safeTitle}" no Victory Fitness.`,
      `Você terá seus próprios ${days} dias a partir do momento em que entrar. Mesmo assim, vocês ficam no mesmo ranking para se apoiar.`,
      `Entre aqui ou crie sua conta primeiro: ${inviteUrl}`,
    ].join('\n\n'),
    nl: [
      `${safeUserName} nodigt je uit voor de challenge "${safeTitle}" op Victory Fitness.`,
      `Je krijgt je eigen ${days} dagen vanaf het moment dat je meedoet. Jullie staan toch op hetzelfde bord om elkaar te motiveren.`,
      `Doe hier mee of maak eerst je account aan: ${inviteUrl}`,
    ].join('\n\n'),
    bn: [
      `${safeUserName} তোমাকে Victory Fitness-এর "${safeTitle}" চ্যালেঞ্জে আমন্ত্রণ জানাচ্ছে।`,
      `তুমি যোগ দেওয়ার সময় থেকে নিজের ${days} দিন পাবে। তবুও তোমরা একই বোর্ডে থাকবে এবং একে অন্যকে উৎসাহ দিতে পারবে।`,
      `এখানে যোগ দাও অথবা আগে অ্যাকাউন্ট তৈরি করো: ${inviteUrl}`,
    ].join('\n\n'),
  };

  return templates[language] || [
    `${safeUserName} invited you to join the "${safeTitle}" challenge on Victory Fitness.`,
    `You get your own ${days} days from the moment you join. You will still be on the same board so you can cheer each other on.`,
    `Join here, or create your Victory Fitness account first: ${inviteUrl}`,
  ].join('\n\n');
}

function buildChallengeInviteUrl({
  challengeId,
  inviterId,
  inviteId,
}: {
  challengeId?: string;
  inviterId?: string;
  inviteId?: string;
}) {
  const baseUrl = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'https://app.victoryfitnessapp.com';
  const params = new URLSearchParams();
  if (challengeId) params.set('challenge_id', challengeId);
  if (inviterId) params.set('inviter_id', inviterId);
  if (inviteId) params.set('invite_id', inviteId);
  params.set('source', 'challenge_invite');
  return `${baseUrl}/register?${params.toString()}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(13, 13, 13, 0.98)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 54,
    paddingBottom: 48,
  },
  overlayScrollContent: {
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
    padding: 6,
    cursor: 'pointer' as any,
  },
  closeBtnText: {
    fontFamily: DMSANS,
    fontSize: 22,
    lineHeight: 22,
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
    cursor: 'pointer' as any,
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
    cursor: 'pointer' as any,
  },
  outlineBtnCopied: {
    borderColor: GREEN,
    backgroundColor: 'rgba(26, 122, 74, 0.15)',
  },
  outlineBtnTextCopied: {
    color: EMERALD,
  },
  outlineBtnWide: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
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
