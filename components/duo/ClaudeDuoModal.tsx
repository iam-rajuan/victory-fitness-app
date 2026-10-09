import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  acceptAccountabilityInvite,
  createAccountabilityInvite,
  fetchAccountabilityPartner,
  nudgeAccountabilityPartner,
  unpairAccountabilityPartner,
} from '../../lib/api';

interface ClaudeDuoModalProps {
  visible: boolean;
  onClose: () => void;
}

type DuoState = 'inactive' | 'pending' | 'active';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeDuoModal({ visible, onClose }: ClaudeDuoModalProps) {
  const [duoState, setDuoState] = useState<DuoState>('inactive');
  const [pairId, setPairId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerProfileImage, setPartnerProfileImage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [daysInSync, setDaysInSync] = useState(0);
  const [partnerTrainedToday, setPartnerTrainedToday] = useState(false);
  const [youTrainedToday, setYouTrainedToday] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const loadPair = async () => {
      try {
        const res = await fetchAccountabilityPartner() as any;
        setPairId(String(res?.pair_id || ''));
        if (res && res.partner) {
          setDuoState('active');
          setPartnerName(res.partner.name || res.partner.email?.split('@')[0] || '');
          setPartnerProfileImage(String(res.partner.profileImage || res.partner_profile_image || '').trim());
          setDaysInSync(Math.max(0, Number(res.days_in_sync || res.partner.days_in_sync || 0)));
          setPartnerTrainedToday(Boolean(res.partner.trained_today ?? res.partner_checked_in_today));
          setYouTrainedToday(Boolean(res.your_checked_in_today));
        } else if (res && res.invite_code) {
          setDuoState('pending');
          setInviteCode(String(res.invite_code || ''));
          setPartnerName('');
          setPartnerProfileImage('');
          setDaysInSync(0);
          setPartnerTrainedToday(false);
          setYouTrainedToday(false);
        } else {
          setDuoState('inactive');
          setInviteCode('');
          setPartnerName('');
          setPartnerProfileImage('');
          setDaysInSync(0);
          setPartnerTrainedToday(false);
          setYouTrainedToday(false);
        }
      } catch {
        // Keep the current visible state if the refresh fails.
      }
    };

    void loadPair();
  }, [visible]);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert('Copied', `Pairing code ${inviteCode} copied to clipboard!`);
  };

  const handleShareWhatsApp = () => {
    if (!inviteCode) return;
    const text = `Join my Accountability Duo on Victory Fitness! Enter code: ${inviteCode}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      Alert.alert('WhatsApp Share', text);
    }
  };

  const handleEnterCodeSubmit = async () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    try {
      const res = await acceptAccountabilityInvite(inputCode.trim().toUpperCase());
      const accepted = res as typeof res & { partner?: { name?: string | null; email?: string | null } };
      setPairId(res.pair_id || '');
      setDuoState('active');
      setPartnerName(accepted.partner?.name || accepted.partner?.email?.split('@')[0] || '');
      setPartnerProfileImage('');
      setShowCodeInput(false);
      Alert.alert('Duo Active', 'You are now synced with your accountability partner!');
    } catch (error: any) {
      Alert.alert('Code not accepted', error?.message || 'That invite code could not be used.');
    } finally {
      setLoading(false);
    }
  };

  const handleNudge = async () => {
    if (!pairId) {
      Alert.alert('Duo not ready', 'Your accountability pair is not active yet.');
      return;
    }
    try {
      await nudgeAccountabilityPartner(pairId);
      Alert.alert('Nudge Sent', `A gentle nudge was sent to ${partnerName}!`);
    } catch (error: any) {
      Alert.alert('Could not send nudge', error?.message || 'Please try again.');
    }
  };

  const handleEndDuo = () => {
    Alert.alert('End Duo', `Are you sure you want to disconnect from ${partnerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End this duo',
        style: 'destructive',
        onPress: async () => {
          try {
            if (pairId) await unpairAccountabilityPartner(pairId);
            setPairId('');
            setDuoState('inactive');
            setPartnerName('');
            setPartnerProfileImage('');
            setDaysInSync(0);
            setPartnerTrainedToday(false);
            setYouTrainedToday(false);
            Alert.alert('Duo Ended', 'Your accountability partnership has ended.');
          } catch (error: any) {
            Alert.alert('Could not end duo', error?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const handleCreateInvite = async () => {
    setLoading(true);
    try {
      const res = await createAccountabilityInvite();
      setPairId(res.pair_id || '');
      setInviteCode(res.invite_code || '');
      setDuoState('pending');
    } catch (error: any) {
      Alert.alert('Could not create invite', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar matching line 1772-1775 */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>

            <View
              style={[
                styles.statePill,
                duoState === 'active'
                  ? styles.statePillActive
                  : duoState === 'pending'
                  ? styles.statePillPending
                  : styles.statePillInactive,
              ]}
            >
              <Text
                style={[
                  styles.statePillText,
                  duoState === 'active'
                    ? styles.statePillTextActive
                    : duoState === 'pending'
                    ? styles.statePillTextPending
                    : styles.statePillTextInactive,
                ]}
              >
                {duoState === 'active'
                  ? 'IN SYNC'
                  : duoState === 'pending'
                  ? 'PENDING'
                  : 'INACTIVE'}
              </Text>
            </View>
          </View>

          {/* Main Duo Card matching lines 1777-1821 */}
          <View style={styles.mainCard}>
            <View style={styles.cardHeader}>
              {duoState === 'active' && partnerProfileImage ? (
                <Image source={{ uri: partnerProfileImage }} style={styles.avatarWrap} />
              ) : (
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>
                    {duoState === 'active' ? partnerName.slice(0, 2).toUpperCase() : 'AD'}
                  </Text>
                </View>
              )}

              <View style={styles.cardHeaderTextWrap}>
                <Text style={styles.cardHeading}>
                  {duoState === 'active'
                    ? `${partnerName.toUpperCase()} IS YOUR PARTNER`
                    : duoState === 'pending'
                    ? 'WAITING ON YOUR PARTNER'
                    : 'ACCOUNTABILITY DUO'}
                </Text>
                <Text style={styles.cardSub}>
                  {duoState === 'active'
                    ? partnerTrainedToday
                      ? 'They trained today.'
                      : 'No partner workout logged today.'
                    : duoState === 'pending'
                    ? `Code ${inviteCode} sent — nothing shared yet`
                    : 'Inactive until someone accepts, then the card becomes their name.'}
                </Text>
              </View>
            </View>

            <Text style={styles.cardBody}>
              {duoState === 'active'
                ? `You and ${partnerName} share a single daily check-in. When either logs a workout, the other gets a green tick.`
                : 'Choose one person to see whether you trained today. No scores, no weights — just a tick when either of you logs a session.'}
            </Text>

            {/* Inactive State CTAs matching lines 1787-1792 */}
            {duoState === 'inactive' && (
              <>
                {!showCodeInput ? (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      activeOpacity={0.85}
                      disabled={loading}
                      onPress={handleCreateInvite}
                    >
                      <Text style={styles.primaryBtnText}>{loading ? 'Creating...' : 'Invite partner'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outlineBtn}
                      activeOpacity={0.85}
                      onPress={() => setShowCodeInput(true)}
                    >
                      <Text style={styles.outlineBtnText}>Enter code</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.codeEntryBox}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="Enter partner code"
                      placeholderTextColor="rgba(247,243,238,0.3)"
                      value={inputCode}
                      onChangeText={setInputCode}
                      autoCapitalize="characters"
                    />
                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={styles.primaryBtn}
                        activeOpacity={0.85}
                        disabled={loading}
                        onPress={handleEnterCodeSubmit}
                      >
                        <Text style={styles.primaryBtnText}>{loading ? 'Connecting...' : 'Connect'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.outlineBtn}
                        activeOpacity={0.85}
                        onPress={() => setShowCodeInput(false)}
                      >
                        <Text style={styles.outlineBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Pending State matching lines 1794-1808 */}
            {duoState === 'pending' && (
              <View>
                <View style={styles.codeBox}>
                  <Text style={styles.codeBoxKicker}>YOUR CODE</Text>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeValue}>{inviteCode}</Text>
                    <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
                      <Text style={styles.codeCopyText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.85}
                    onPress={handleShareWhatsApp}
                  >
                    <Text style={styles.primaryBtnText}>Share on WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.linkBtn}
                    activeOpacity={0.85}
                    onPress={handleCopyCode}
                  >
                    <Text style={styles.linkBtnText}>Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Active State Stats matching lines 1810-1820 */}
            {duoState === 'active' && (
              <View>
                <View style={styles.statsRow}>
                  <View style={[styles.statCol, styles.statColBorder]}>
                    <Text style={[styles.statValue, { color: GREEN }]}>{daysInSync}</Text>
                    <Text style={styles.statLabel}>DAYS IN SYNC</Text>
                  </View>
                  <View style={[styles.statCol, styles.statColBorder]}>
                    <Text style={[styles.statValue, { color: partnerTrainedToday ? GREEN : IVORY }]}>
                      {partnerTrainedToday ? 'YES' : 'NO'}
                    </Text>
                    <Text style={styles.statLabel}>PARTNER TODAY</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.statValue, { color: youTrainedToday ? GREEN : GOLD }]}>
                      {youTrainedToday ? 'YES' : 'NO'}
                    </Text>
                    <Text style={styles.statLabel}>YOU TODAY</Text>
                  </View>
                </View>

                <View style={styles.indicatorRow}>
                  <View style={[styles.dot, { backgroundColor: GREEN }]} />
                  <Text style={styles.indicatorText}>
                    {partnerTrainedToday
                      ? `${partnerName} trained today.`
                      : `${partnerName} has not logged a workout today.`}
                  </Text>
                </View>

                <View style={styles.indicatorRow}>
                  <View style={[styles.dot, { backgroundColor: COPPER }]} />
                  <Text style={styles.indicatorText}>
                    Gentle nudge at 20:30, only if neither of you has trained
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Active State: MANAGE Section matching lines 1823-1834 */}
          {duoState === 'active' && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>MANAGE</Text>
              <View style={styles.manageCard}>
                <TouchableOpacity
                  style={styles.manageRow}
                  activeOpacity={0.7}
                  onPress={() => Alert.alert('Second Partner', 'Second partner invite is available for Platinum & Inner Circle.')}
                >
                  <Text style={styles.manageRowTitle}>Add a second partner</Text>
                  <Text style={styles.manageRowMeta}>1 of 2</Text>
                  <Text style={styles.manageRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manageRow}
                  activeOpacity={0.7}
                  onPress={() => Alert.alert('Swap Partner', `${partnerName} will be informed and the duo slot reopened.`)}
                >
                  <Text style={styles.manageRowTitle}>Swap partner</Text>
                  <Text style={styles.manageRowMeta}>{partnerName} is told</Text>
                  <Text style={styles.manageRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manageRow}
                  activeOpacity={0.7}
                  onPress={handleNudge}
                >
                  <Text style={styles.manageRowTitle}>Send manual nudge</Text>
                  <Text style={styles.manageRowMeta}>Now</Text>
                  <Text style={styles.manageRowChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.manageRow, { borderBottomWidth: 0 }]}
                  activeOpacity={0.7}
                  onPress={handleEndDuo}
                >
                  <Text style={[styles.manageRowTitle, { color: COPPER }]}>End this duo</Text>
                  <Text style={[styles.manageRowChevron, { color: COPPER }]}>›</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.manageFootnote}>
                {partnerName} sees one thing: whether you trained. Not your weights, not your journal, not your protein.
              </Text>
            </View>
          )}

          {/* Inactive State: WHAT THEY WILL SEE matching lines 1836-1845 */}
          {duoState === 'inactive' && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>WHAT THEY WILL SEE</Text>
              <View style={styles.whatCard}>
                <View style={styles.whatRow}>
                  <View style={[styles.dot, { backgroundColor: GREEN }]} />
                  <Text style={styles.whatText}>A tick on the days you trained</Text>
                </View>
                <View style={styles.whatRow}>
                  <View style={[styles.dot, styles.dotEmpty]} />
                  <Text style={[styles.whatText, { color: 'rgba(247,243,238,0.45)' }]}>
                    Not your weights, journal, protein or weight
                  </Text>
                </View>
                <Text style={styles.whatNote}>
                  They need the app to be your duo. To pull in someone who does not have it, use a challenge invite instead.
                </Text>
              </View>
            </View>
          )}
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
    paddingTop: Platform.OS === 'web' ? 40 : 64,
    paddingBottom: 96,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  statePill: {
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statePillInactive: {
    backgroundColor: 'rgba(247,243,238,0.08)',
  },
  statePillPending: {
    backgroundColor: 'rgba(201,148,58,0.15)',
  },
  statePillActive: {
    backgroundColor: 'rgba(26,122,74,0.18)',
  },
  statePillText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  statePillTextInactive: {
    color: 'rgba(247,243,238,0.5)',
  },
  statePillTextPending: {
    color: GOLD,
  },
  statePillTextActive: {
    color: GREEN,
  },
  mainCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 20,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 16,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  cardHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardHeading: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: IVORY,
  },
  cardSub: {
    fontFamily: INTER,
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  cardBody: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.8)',
    marginBottom: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  outlineBtn: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  codeEntryBox: {
    gap: 10,
  },
  codeInput: {
    height: 48,
    backgroundColor: 'rgba(247,243,238,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: IVORY,
    fontFamily: MONO,
    fontSize: 15,
  },
  codeBox: {
    backgroundColor: 'rgba(247, 243, 238, 0.07)',
    borderRadius: 13,
    padding: 15,
    marginBottom: 12,
  },
  codeBoxKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 7,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: IVORY,
  },
  codeCopyText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
    color: GOLD,
  },
  linkBtn: {
    width: 96,
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: IVORY,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderRadius: 13,
    overflow: 'hidden',
    marginBottom: 14,
  },
  statCol: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statColBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(247, 243, 238, 0.1)',
  },
  statValue: {
    fontFamily: MONO,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 0.7,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  dotEmpty: {
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    backgroundColor: 'transparent',
  },
  indicatorText: {
    fontFamily: INTER,
    fontSize: 13.5,
    color: 'rgba(247, 243, 238, 0.8)',
  },
  sectionWrap: {
    paddingTop: 10,
  },
  sectionTitle: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  manageCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  manageRowTitle: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '500',
    color: IVORY,
  },
  manageRowMeta: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginRight: 10,
  },
  manageRowChevron: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  manageFootnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  whatCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 18,
  },
  whatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 5,
  },
  whatText: {
    fontFamily: INTER,
    fontSize: 13.5,
    color: 'rgba(247, 243, 238, 0.82)',
  },
  whatNote: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 11,
  },
});
