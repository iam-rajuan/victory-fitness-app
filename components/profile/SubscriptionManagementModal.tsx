import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../lib/i18n';
import {
  SubscriptionStatusResponse,
  fetchMySubscription,
  cancelMySubscription,
  pauseMySubscription,
  resumeMySubscription,
  changeMySubscriptionPlan,
  fetchProfileUpgradeOffer,
  recordAnalyticsEvent,
} from '../../lib/api';

interface SubscriptionManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscriptionUpdated?: () => void;
}

export default function SubscriptionManagementModal({
  visible,
  onClose,
  onSubscriptionUpdated,
}: SubscriptionManagementModalProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<SubscriptionStatusResponse['subscription'] | null>(null);
  const [upgradeOffer, setUpgradeOffer] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Sub-modals
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [selectedPlanToChange, setSelectedPlanToChange] = useState<string>('gold');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'yearly' | 'monthly'>('yearly');

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, offer] = await Promise.all([
        fetchMySubscription(),
        fetchProfileUpgradeOffer().catch(() => null),
      ]);
      setSubData(res.subscription);
      if (offer && offer.eligible) {
        setUpgradeOffer(offer);
      } else if (res.upgrade_offer) {
        setUpgradeOffer(res.upgrade_offer);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void loadData();
    }
  }, [visible]);

  const handleClaimUpgrade = () => {
    void recordAnalyticsEvent('upgrade_screen_viewed', {
      source: 'profile_upgrade',
      offer_id: upgradeOffer?.offer_id,
      target_tier: upgradeOffer?.target_tier,
    }).catch(() => undefined);

    onClose();
    router.push('/plan?entry=profile_upgrade');
  };

  const handleConfirmCancel = () => {
    Alert.alert(
      t('Cancel Subscription'),
      `${t('Your subscription will remain fully active until')} ${subData?.current_period_end ? new Date(subData.current_period_end).toLocaleDateString() : t('the end of your billing cycle')}. ${t('You will not be billed again. Are you sure you want to proceed?')}`,
      [
        { text: t('Keep Subscription'), style: 'cancel' },
        {
          text: t('Yes, Cancel Renewal'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await cancelMySubscription('User initiated from Profile settings');
              Alert.alert(
                t('Subscription Cancelled'),
                `${res.message}\n\n${t('Access active until:')} ${res.current_period_end ? new Date(res.current_period_end).toLocaleDateString() : t('period end')}.`,
              );
              await loadData();
              onSubscriptionUpdated?.();
            } catch (err: any) {
              Alert.alert(t('Error'), err?.detail || err?.message || t('Failed to cancel subscription.'));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleConfirmPause = async (pauseDays: number) => {
    setActionLoading(true);
    setShowPauseModal(false);
    try {
      const res = await pauseMySubscription(pauseDays);
      Alert.alert(
        t('Subscription Paused'),
        `${res.message}\n\n${t('Auto-resumes on:')} ${res.paused_until ? new Date(res.paused_until).toLocaleDateString() : t('resume date')}.`,
      );
      await loadData();
      onSubscriptionUpdated?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err?.detail || err?.message || t('Failed to pause subscription.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const res = await resumeMySubscription();
      Alert.alert(t('Subscription Resumed'), res.message || t('Your subscription has been restored to active status!'));
      await loadData();
      onSubscriptionUpdated?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err?.detail || err?.message || t('Failed to resume subscription.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmChangePlan = async () => {
    setActionLoading(true);
    setShowChangePlanModal(false);
    try {
      const res = await changeMySubscriptionPlan(selectedPlanToChange, selectedBillingCycle);
      Alert.alert(
        t('Plan Changed!'),
        res.message || `${t('Your plan was updated to')} ${res.tier}!`,
      );
      await loadData();
      onSubscriptionUpdated?.();
    } catch (err: any) {
      Alert.alert(t('Error'), err?.detail || err?.message || t('Failed to change plan.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (!visible) return null;

  const tier = (subData?.tier || 'FREE').toUpperCase();
  const isCancelled = Boolean(subData?.is_cancelled);
  const isPaused = subData?.status === 'PAUSED';
  const periodEndFormatted = subData?.current_period_end
    ? new Date(subData.current_period_end).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.badgeWrap}>
                <Ionicons name="card" size={16} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.title}>{t('MANAGE SUBSCRIPTION')}</Text>
                <Text style={styles.subtitle}>{t('Victory Fitness Headquarters')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.accentBlue} />
                <Text style={styles.loadingText}>{t('Retrieving subscription status...')}</Text>
              </View>
            ) : (
              <>
                {/* Current Plan Overview Card */}
                <View style={styles.planCard}>
                  <View style={styles.planCardHeader}>
                    <View>
                      <Text style={styles.planTitle}>{subData?.plan_title || `${tier} Plan`}</Text>
                      <Text style={styles.billingCycleText}>
                        {subData?.billing_cycle === 'yearly' ? t('Billed Annually') : t('Billed Monthly')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isCancelled
                          ? styles.statusBadgeCancelled
                          : isPaused
                            ? styles.statusBadgePaused
                            : styles.statusBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isCancelled
                            ? { color: '#EF4444' }
                            : isPaused
                              ? { color: '#F59E0B' }
                              : { color: '#10B981' },
                        ]}
                      >
                        {isCancelled ? t('CANCELLED') : isPaused ? t('PAUSED') : t('ACTIVE')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.planDetailRow}>
                    <Text style={styles.detailLabel}>{t('Rate')}:</Text>
                    <Text style={styles.detailValue}>
                      {subData?.currency || '$'}
                      {subData?.price ?? 0} / {subData?.billing_cycle === 'yearly' ? t('yr') : t('mo')}
                    </Text>
                  </View>

                  {periodEndFormatted && (
                    <View style={styles.planDetailRow}>
                      <Text style={styles.detailLabel}>
                        {isCancelled ? t('Access Valid Until') : t('Next Renewal Date')}:
                      </Text>
                      <Text style={[styles.detailValue, isCancelled && { color: '#F59E0B' }]}>
                        {periodEndFormatted}
                      </Text>
                    </View>
                  )}

                  {/* Cancelled Grace Notice */}
                  {isCancelled && periodEndFormatted && (
                    <View style={styles.cancelledAlertBox}>
                      <Ionicons name="information-circle" size={18} color="#F59E0B" />
                      <Text style={styles.cancelledAlertText}>
                        {t('Your subscription was cancelled, but you still have full access until')} {periodEndFormatted}. {t('You will not be billed again.')}
                      </Text>
                    </View>
                  )}

                  {/* Paused Notice */}
                  {isPaused && (
                    <View style={styles.pausedAlertBox}>
                      <Ionicons name="pause-circle" size={18} color="#06B6D4" />
                      <Text style={styles.pausedAlertText}>
                        {t('Your membership is temporarily paused. Auto-resumes on:')}{' '}
                        {subData?.paused_until ? new Date(subData.paused_until).toLocaleDateString() : t('pause end date')}.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Section 17.1 Upgrade Offer Card (if eligible) */}
                {upgradeOffer && (
                  <View style={styles.upgradeOfferCard}>
                    <View style={styles.upgradeOfferHeader}>
                      <View style={styles.upgradeOfferIconWrap}>
                        <Ionicons name="sparkles" size={18} color="#F59E0B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.upgradeOfferTitle}>
                          {upgradeOffer.title || t('Keep this streak moving')}
                        </Text>
                        <Text style={styles.upgradeOfferMessage}>
                          {upgradeOffer.message || t('Unlock unlimited AI coaching to keep this going.')}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.upgradeClaimBtn}
                      onPress={handleClaimUpgrade}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.upgradeClaimBtnText}>{t('View Upgrade Options')}</Text>
                      <Ionicons name="arrow-forward" size={15} color="#04111F" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Management Action Buttons */}
                <View style={styles.actionsContainer}>
                  <Text style={styles.actionsTitle}>{t('MEMBERSHIP ACTIONS')}</Text>

                  {/* Change Plan Button */}
                  <TouchableOpacity
                    style={styles.actionRowBtn}
                    onPress={() => setShowChangePlanModal(true)}
                    activeOpacity={0.8}
                    disabled={actionLoading}
                  >
                    <View style={styles.actionBtnLeft}>
                      <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                        <Ionicons name="swap-horizontal" size={18} color="#06B6D4" />
                      </View>
                      <View>
                        <Text style={styles.actionBtnText}>{t('Change Plan')}</Text>
                        <Text style={styles.actionBtnSubtext}>{t('Switch to Silver, Gold, or Platinum')}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>

                  {/* Pause or Resume Button */}
                  {isPaused ? (
                    <TouchableOpacity
                      style={styles.actionRowBtn}
                      onPress={handleResume}
                      activeOpacity={0.8}
                      disabled={actionLoading}
                    >
                      <View style={styles.actionBtnLeft}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                          <Ionicons name="play" size={18} color="#10B981" />
                        </View>
                        <View>
                          <Text style={styles.actionBtnText}>{t('Resume Membership')}</Text>
                          <Text style={styles.actionBtnSubtext}>{t('Restore active daily workouts immediately')}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.actionRowBtn}
                      onPress={() => setShowPauseModal(true)}
                      activeOpacity={0.8}
                      disabled={actionLoading || isCancelled}
                    >
                      <View style={styles.actionBtnLeft}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                          <Ionicons name="pause" size={18} color="#F59E0B" />
                        </View>
                        <View>
                          <Text style={styles.actionBtnText}>{t('Pause Subscription')}</Text>
                          <Text style={styles.actionBtnSubtext}>{t('Take a 14 to 60 day recovery break')}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  )}

                  {/* Cancel Subscription Button */}
                  {!isCancelled && (
                    <TouchableOpacity
                      style={[styles.actionRowBtn, styles.actionRowBtnDestructive]}
                      onPress={handleConfirmCancel}
                      activeOpacity={0.8}
                      disabled={actionLoading}
                    >
                      <View style={styles.actionBtnLeft}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                        </View>
                        <View>
                          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>
                            {t('Cancel Subscription')}
                          </Text>
                          <Text style={styles.actionBtnSubtext}>
                            {t('Retain access until end of billing cycle')}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Modal: Change Plan */}
      <Modal visible={showChangePlanModal} transparent animationType="fade" onRequestClose={() => setShowChangePlanModal(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>{t('CHOOSE NEW PLAN')}</Text>
              <TouchableOpacity onPress={() => setShowChangePlanModal(false)}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            <View style={styles.billingToggleRow}>
              <TouchableOpacity
                style={[styles.billingToggleBtn, selectedBillingCycle === 'yearly' && styles.billingToggleBtnActive]}
                onPress={() => setSelectedBillingCycle('yearly')}
              >
                <Text style={[styles.billingToggleText, selectedBillingCycle === 'yearly' && styles.billingToggleTextActive]}>
                  {t('Yearly (Save 35%)')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billingToggleBtn, selectedBillingCycle === 'monthly' && styles.billingToggleBtnActive]}
                onPress={() => setSelectedBillingCycle('monthly')}
              >
                <Text style={[styles.billingToggleText, selectedBillingCycle === 'monthly' && styles.billingToggleTextActive]}>
                  {t('Monthly')}
                </Text>
              </TouchableOpacity>
            </View>

            {[
              { id: 'silver', name: 'Silver Plan', price: selectedBillingCycle === 'yearly' ? '$99/yr' : '$14.99/mo', desc: 'Workout library & basic plans' },
              { id: 'gold', name: 'Gold Plan', price: selectedBillingCycle === 'yearly' ? '$189/yr' : '$24.99/mo', desc: 'Coach Victor AI, Longevity OS, Identity statement' },
              { id: 'platinum', name: 'Platinum Plan', price: selectedBillingCycle === 'yearly' ? '$349/yr' : '$49.99/mo', desc: 'Everything in Gold + 1-on-1 coach review' },
            ].map((p) => {
              const selected = selectedPlanToChange === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planOptionCard, selected && styles.planOptionCardSelected]}
                  onPress={() => setSelectedPlanToChange(p.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planOptionName}>{p.name}</Text>
                    <Text style={styles.planOptionDesc}>{p.desc}</Text>
                  </View>
                  <Text style={styles.planOptionPrice}>{p.price}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleConfirmChangePlan}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#04111F" />
              ) : (
                <Text style={styles.modalConfirmText}>{t('Confirm Change Plan')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Pause Subscription */}
      <Modal visible={showPauseModal} transparent animationType="fade" onRequestClose={() => setShowPauseModal(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>{t('PAUSE SUBSCRIPTION')}</Text>
              <TouchableOpacity onPress={() => setShowPauseModal(false)}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.subModalSubtext}>
              {t('Select how long you want to pause your workouts and billing. Your account will auto-resume on schedule or you can resume early anytime.')}
            </Text>

            {[14, 30, 60].map((days) => (
              <TouchableOpacity
                key={days}
                style={styles.pauseOptionBtn}
                onPress={() => handleConfirmPause(days)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
                <Text style={styles.pauseOptionText}>{days} {t('Days Pause')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: '#0F1216',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
  billingCycleText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusBadgePaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  detailValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
  cancelledAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  cancelledAlertText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter_500Medium',
  },
  pausedAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  pausedAlertText: {
    flex: 1,
    color: '#06B6D4',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter_500Medium',
  },
  upgradeOfferCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  upgradeOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  upgradeOfferIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeOfferTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  upgradeOfferMessage: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  upgradeClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 10,
  },
  upgradeClaimBtnText: {
    color: '#04111F',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  actionsContainer: {
    gap: 8,
  },
  actionsTitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
  },
  actionRowBtnDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
  actionBtnSubtext: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    marginTop: 2,
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F1216',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
  subModalSubtext: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  billingToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  billingToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  billingToggleBtnActive: {
    backgroundColor: '#06B6D4',
  },
  billingToggleText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  billingToggleTextActive: {
    color: '#04111F',
    fontWeight: '700',
  },
  planOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  planOptionCardSelected: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  planOptionName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  planOptionDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  planOptionPrice: {
    color: '#06B6D4',
    fontSize: 13,
    fontWeight: '800',
  },
  pauseOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  pauseOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalConfirmText: {
    color: '#04111F',
    fontSize: 14,
    fontWeight: '700',
  },
});
