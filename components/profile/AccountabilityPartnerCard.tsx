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
          <ActivityIndicator size="small" color={Colors.accentBlue} />
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
            <Ionicons name="people" size={16} color="#00F0D0" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('ACCOUNTABILITY PARTNER')}</Text>
            <Text style={styles.cardSubtitle}>{t('Section 20.1 • Mutual Consistency')}</Text>
          </View>
        </View>
        {isPaired && (
          <TouchableOpacity onPress={handleUnpair} disabled={unpairing} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {unpairing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="close-circle-outline" size={20} color="rgba(255,255,255,0.4)" />
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
                  <Ionicons name="checkmark-circle" size={26} color="#10B981" />
                  <Text style={styles.trainedBadgeText}>{t('Trained')}</Text>
                </View>
              ) : (
                <View style={styles.notTrainedBadge}>
                  <Ionicons name="ellipse-outline" size={26} color="#9CA3AF" />
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
                  <ActivityIndicator size="small" color="#04111F" />
                ) : (
                  <>
                    <Ionicons name="notifications" size={15} color="#04111F" />
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
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
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
            {t('Train alongside someone. When paired, you can see each other’s daily training status (green tick / grey circle) and send an 8pm nudge if they haven’t trained.')}
          </Text>

          <View style={styles.emptyActionsRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => setShowInviteModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={16} color="#04111F" />
              <Text style={styles.primaryActionText}>{t('Invite Partner')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => setShowAcceptModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={16} color="#00F0D0" />
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
              <Text style={styles.modalTitle}>{t('INVITE ACCOUNTABILITY PARTNER')}</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)} disabled={submittingInvite}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
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
              placeholderTextColor="rgba(255,255,255,0.4)"
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
                  <ActivityIndicator size="small" color="#04111F" />
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
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
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
              placeholderTextColor="rgba(255,255,255,0.4)"
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
                  <ActivityIndicator size="small" color="#04111F" />
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
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
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
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 240, 208, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  activeContainer: {
    paddingTop: 4,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
  },
  partnerAvatarWrap: {
    marginRight: 12,
  },
  partnerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 240, 208, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.4)',
  },
  partnerInitials: {
    color: '#00F0D0',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  partnerEmail: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  partnerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  partnerStatText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  partnerStatDivider: {
    color: 'rgba(255, 255, 255, 0.25)',
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
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  notTrainedBadge: {
    alignItems: 'center',
    gap: 2,
  },
  notTrainedBadgeText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  statusFooter: {
    marginTop: 12,
    gap: 8,
  },
  statusDescriptionWrap: {
    paddingHorizontal: 4,
  },
  statusSuccessText: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  statusWarningText: {
    color: '#F59E0B',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00F0D0',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  nudgeBtnDisabled: {
    opacity: 0.6,
  },
  nudgeBtnText: {
    color: '#04111F',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  pendingContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
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
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  codeBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  codeLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  codeValue: {
    color: '#00F0D0',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    letterSpacing: 3,
  },
  codeSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  pendingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  cancelPendingBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelPendingText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyContainer: {
    paddingTop: 2,
  },
  emptyPrompt: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
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
    backgroundColor: '#00F0D0',
    borderRadius: 12,
    paddingVertical: 11,
  },
  primaryActionText: {
    color: '#04111F',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.3)',
    borderRadius: 12,
    paddingVertical: 11,
  },
  secondaryActionText: {
    color: '#00F0D0',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F1216',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  modalSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 18,
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: 3,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#00F0D0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#04111F',
    fontSize: 13,
    fontWeight: '700',
  },
});
