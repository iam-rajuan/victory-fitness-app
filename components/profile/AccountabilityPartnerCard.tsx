import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';
import {
  AccountabilityPartnerResponse,
  fetchAccountabilityPartner,
  createAccountabilityInvite,
  acceptAccountabilityInvite,
  nudgeAccountabilityPartner,
  unpairAccountabilityPartner,
} from '../../lib/api';

interface AccountabilityPartnerCardProps {
  onStatusChange?: () => void;
}

export default function AccountabilityPartnerCard({ onStatusChange }: AccountabilityPartnerCardProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<AccountabilityPartnerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(false);
  const [unpairing, setUnpairing] = useState(false);

  // Invite / Accept Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [submittingAccept, setSubmittingAccept] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const loadPartnerData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchAccountabilityPartner();
      setData(res);
      if (res.invite_code && res.status === 'pending') {
        setGeneratedCode(res.invite_code);
      }
    } catch {
      setData({ status: 'none', partner: null });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadPartnerData();
  }, []);

  const handleCreateInvite = async () => {
    setSubmittingInvite(true);
    try {
      const res = await createAccountabilityInvite(inviteEmail.trim() || undefined);
      setGeneratedCode(res.invite_code);
      setShowInviteModal(false);
      Alert.alert(
        t('Invite Created!'),
        `${t('Share this 6-character code with your partner:')}\n\n${res.invite_code}\n\n${t('Once they enter it, your mutual pairing will be activated!')}`,
      );
      await loadPartnerData(true);
      onStatusChange?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err?.detail || err?.message || t('Failed to create invite.'));
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleAcceptInvite = async () => {
    const code = inputCode.trim();
    if (!code) {
      Alert.alert(t('Error'), t('Please enter a 6-character invite code.'));
      return;
    }
    setSubmittingAccept(true);
    try {
      const res = await acceptAccountabilityInvite(code);
      setShowAcceptModal(false);
      setInputCode('');
      Alert.alert(t('Paired Successfully!'), res.message || t('You and your partner are now linked for mutual daily accountability!'));
      await loadPartnerData(true);
      onStatusChange?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err?.detail || err?.message || t('Invalid or expired invite code.'));
    } finally {
      setSubmittingAccept(false);
    }
  };

  const handleNudge = async () => {
    if (!data?.pair_id || nudging) return;
    setNudging(true);
    try {
      const res = await nudgeAccountabilityPartner(data.pair_id);
      Alert.alert(t('Nudge Sent!'), res.message || t('We sent an accountability reminder to your partner.'));
      await loadPartnerData(true);
    } catch (err: any) {
      Alert.alert(t('Error'), err?.detail || err?.message || t('Could not send nudge right now.'));
    } finally {
      setNudging(false);
    }
  };

  const handleUnpair = () => {
    if (!data?.pair_id || unpairing) return;
    Alert.alert(
      t('Unpair Partner'),
      t('Are you sure you want to unpair? You will no longer track each other’s daily workouts.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Unpair'),
          style: 'destructive',
          onPress: async () => {
            setUnpairing(true);
            try {
              await unpairAccountabilityPartner(data.pair_id!);
              Alert.alert(t('Unpaired'), t('You have successfully unpaired.'));
              await loadPartnerData(true);
              onStatusChange?.();
            } catch (err: any) {
              Alert.alert(t('Error'), err?.detail || err?.message || t('Failed to unpair.'));
            } finally {
              setUnpairing(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.gold} />
          <Text style={styles.loadingText}>{t('Checking accountability partner...')}</Text>
        </View>
      </View>
    );
  }

  const isPaired = data?.status === 'active' && Boolean(data.partner);
  const isPending = data?.status === 'pending';
  const partner = data?.partner;
  const trainedToday = Boolean(partner?.trained_today);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={16} color={Colors.gold} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">{t('ACCOUNTABILITY DUO')}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1} ellipsizeMode="tail">{t('Mutual Daily Consistency')}</Text>
          </View>
        </View>
        {isPaired && (
          <TouchableOpacity onPress={handleUnpair} disabled={unpairing} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ flexShrink: 0 }}>
            {unpairing ? (
              <ActivityIndicator size="small" color={Colors.accentDanger} />
            ) : (
              <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* State 1: Active Partner */}
      {isPaired && partner ? (
        <View style={styles.activeContainer}>
          <View style={styles.partnerRow}>
            {/* Avatar */}
            <View style={styles.partnerAvatarWrap}>
              <View style={styles.partnerAvatarFallback}>
                <Text style={styles.partnerInitials}>
                  {partner.name ? partner.name.slice(0, 2).toUpperCase() : 'AP'}
                </Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partner.name || t('Partner')}</Text>
              <Text style={styles.partnerEmail}>{partner.email}</Text>
              <View style={styles.partnerStatsRow}>
                <Text style={styles.partnerStatText}>🔥 {partner.streak_days ?? 0} {t('day streak')}</Text>
                <Text style={styles.partnerStatDivider}>•</Text>
                <Text style={styles.partnerStatText}>⚡ {partner.points ?? 0} PTS</Text>
              </View>
            </View>

            {/* Daily Status Indicator (Green Tick vs Grey Circle) */}
            <View style={styles.dailyStatusBadgeWrap}>
              {trainedToday ? (
                <View style={styles.trainedBadge}>
                  <Ionicons name="checkmark-circle" size={26} color={Colors.victoryGreen} />
                  <Text style={styles.trainedBadgeText}>{t('Trained')}</Text>
                </View>
              ) : (
                <View style={styles.notTrainedBadge}>
                  <Ionicons name="ellipse-outline" size={26} color={Colors.textMuted} />
                  <Text style={styles.notTrainedBadgeText}>{t('Resting')}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Status Message & Nudge Button */}
          <View style={styles.statusFooter}>
            <View style={styles.statusDescriptionWrap}>
              {trainedToday ? (
                <Text style={styles.statusSuccessText}>
                  ✨ {partner.name || t('Your partner')} {t('has completed their workout for today!')}
                </Text>
              ) : (
                <Text style={styles.statusWarningText}>
                  ⏳ {partner.name || t('Your partner')} {t('has not trained today yet.')}
                </Text>
              )}
            </View>

            {!trainedToday && (
              <TouchableOpacity
                style={[styles.nudgeBtn, nudging && styles.nudgeBtnDisabled]}
                onPress={handleNudge}
                disabled={nudging}
                activeOpacity={0.85}
              >
                {nudging ? (
                  <ActivityIndicator size="small" color={Colors.obsidian} />
                ) : (
                  <>
                    <Ionicons name="notifications" size={15} color={Colors.obsidian} />
                    <Text style={styles.nudgeBtnText}>{t('Send 8pm Nudge')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      {/* State 2: Pending Invite */}
      {isPending ? (
        <View style={styles.pendingContainer}>
          <View style={styles.pendingBadgeRow}>
            <Ionicons name="time-outline" size={18} color={Colors.copper} />
            <Text style={styles.pendingTitle}>{t('Pairing Request Pending')}</Text>
          </View>
          {generatedCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>{t('SHARE THIS CODE WITH YOUR PARTNER')}</Text>
              <Text style={styles.codeValue}>{generatedCode}</Text>
              <Text style={styles.codeSubtext}>
                {t('When your partner inputs this code in their app, your mutual accountability activates instantly.')}
              </Text>
            </View>
          ) : (
            <Text style={styles.pendingSubtext}>
              {t('You have a pending invite. Waiting for mutual confirmation.')}
            </Text>
          )}

          <TouchableOpacity
            style={styles.cancelPendingBtn}
            onPress={handleUnpair}
            disabled={unpairing}
          >
            <Text style={styles.cancelPendingText}>{t('Cancel Invite')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* State 3: No Partner */}
      {!isPaired && !isPending ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyPrompt}>
            {t('Train alongside a workout partner. Sync daily workouts, track consistency in real time, and send gentle 8pm nudges to keep your streaks alive.')}
          </Text>

          <View style={styles.emptyActionsRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => setShowInviteModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={16} color={Colors.obsidian} />
              <Text style={styles.primaryActionText}>{t('Invite Partner')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => setShowAcceptModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={16} color={Colors.gold} />
              <Text style={styles.secondaryActionText}>{t('Enter Code')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Modal: Create Invite */}
      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('INVITE ACCOUNTABILITY DUO')}</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)} disabled={submittingInvite}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtext}>
              {t('Enter your partner’s email (optional). A unique 6-character code will also be generated for instant pairing.')}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="partner@example.com (optional)"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!submittingInvite}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowInviteModal(false)}
                disabled={submittingInvite}
              >
                <Text style={styles.modalCancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCreateInvite}
                disabled={submittingInvite}
              >
                {submittingInvite ? (
                  <ActivityIndicator size="small" color={Colors.obsidian} />
                ) : (
                  <Text style={styles.modalConfirmText}>{t('Generate Code')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Enter Code */}
      <Modal visible={showAcceptModal} transparent animationType="fade" onRequestClose={() => setShowAcceptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('ENTER INVITE CODE')}</Text>
              <TouchableOpacity onPress={() => setShowAcceptModal(false)} disabled={submittingAccept}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtext}>
              {t('Enter the 6-character code provided by your accountability partner.')}
            </Text>

            <TextInput
              style={[styles.modalInput, styles.codeInput]}
              value={inputCode}
              onChangeText={(txt) => setInputCode(txt.toUpperCase().slice(0, 10))}
              placeholder="e.g. A9B2C4"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="characters"
              maxLength={10}
              editable={!submittingAccept}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAcceptModal(false)}
                disabled={submittingAccept}
              >
                <Text style={styles.modalCancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleAcceptInvite}
                disabled={submittingAccept}
              >
                {submittingAccept ? (
                  <ActivityIndicator size="small" color={Colors.obsidian} />
                ) : (
                  <Text style={styles.modalConfirmText}>{t('Accept & Pair')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.body,
  },
  activeContainer: {
    paddingTop: 4,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 43, 69, 0.4)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.15)',
  },
  partnerAvatarWrap: {
    marginRight: 12,
  },
  partnerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(201, 148, 58, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.4)',
  },
  partnerInitials: {
    color: Colors.gold,
    fontSize: 16,
    fontFamily: Fonts.heading,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: Fonts.heading,
  },
  partnerEmail: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.body,
  },
  partnerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  partnerStatText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.data,
  },
  partnerStatDivider: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  dailyStatusBadgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  trainedBadge: {
    alignItems: 'center',
    gap: 2,
  },
  trainedBadgeText: {
    color: Colors.victoryGreen,
    fontSize: 10,
    fontFamily: Fonts.heading,
  },
  notTrainedBadge: {
    alignItems: 'center',
    gap: 2,
  },
  notTrainedBadgeText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
  },
  statusFooter: {
    marginTop: 12,
    gap: 8,
  },
  statusDescriptionWrap: {
    paddingHorizontal: 4,
  },
  statusSuccessText: {
    color: Colors.victoryGreen,
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  statusWarningText: {
    color: Colors.copper,
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  nudgeBtnDisabled: {
    opacity: 0.6,
  },
  nudgeBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  pendingContainer: {
    backgroundColor: 'rgba(181, 101, 29, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    borderRadius: 14,
    padding: 14,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pendingTitle: {
    color: Colors.copper,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  codeBox: {
    backgroundColor: 'rgba(13, 13, 13, 0.6)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
  },
  codeLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  codeValue: {
    color: Colors.gold,
    fontSize: 24,
    fontFamily: Fonts.dataBold,
    letterSpacing: 3,
  },
  codeSubtext: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    fontFamily: Fonts.body,
  },
  pendingSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  cancelPendingBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelPendingText: {
    color: Colors.accentDanger,
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  emptyContainer: {
    paddingTop: 2,
  },
  emptyPrompt: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
    marginBottom: 14,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 11,
  },
  primaryActionText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 148, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
    borderRadius: 12,
    paddingVertical: 11,
  },
  secondaryActionText: {
    color: Colors.gold,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: Fonts.display,
    letterSpacing: 0.5,
  },
  modalSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
    fontFamily: Fonts.body,
  },
  modalInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    marginBottom: 18,
  },
  codeInput: {
    fontSize: 20,
    fontFamily: Fonts.dataBold,
    textAlign: 'center',
    letterSpacing: 3,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
});
