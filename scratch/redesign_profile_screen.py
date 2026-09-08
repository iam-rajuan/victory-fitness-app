import re
import os

profile_path = r"d:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\app\(tabs)\profile.tsx"

with open(profile_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update displayName logic to capitalize nicely
old_display_name = "  const displayName = me?.name ?? t('Loading...');"
new_display_name = """  const rawName = (me?.name || '').trim();
  const displayName = rawName
    ? rawName.split(/\\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    : t('Victory Athlete');"""

if old_display_name in content:
    content = content.replace(old_display_name, new_display_name, 1)
    print("Updated displayName logic")
else:
    print("Warning: old_display_name not found")

# 2. Replace the JSX between <VictoryHeader /> and {/* ── Menu Sections ── */}
jsx_target = """        <VictoryHeader />

        {/* ── Hero Profile Card ── */}
        <View style={[styles.heroCard, { backgroundColor: Colors.surface }]}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {profileImageUrl && !profileImageFailed ? (
              Platform.OS === 'web' ? (
                React.createElement('img', {
                  src: profileImageUrl,
                  alt: `${displayName} profile`,
                  referrerPolicy: 'no-referrer',
                  style: WEB_AVATAR_IMAGE_STYLE,
                  onError: () => setProfileImageFailed(true),
                })
              ) : (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.avatarImage}
                  onError={() => setProfileImageFailed(true)}
                />
              )
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{profileInitials}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.avatarManageBtn}
            activeOpacity={0.88}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="camera-outline" size={15} color="#06B6D4" />
            <Text style={styles.avatarManageBtnText}>
              {profileImageUrl && !profileImageFailed ? t('Update profile photo') : t('Upload profile photo')}
            </Text>
          </TouchableOpacity>

          {/* Name & Badge */}
          <Text style={styles.heroName}>{loadingMe ? t('Loading...') : displayName}</Text>
          <Text style={styles.heroEmail}>{loadingMe ? t('Fetching /me data') : displayEmail}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{loadingMe ? 'MEMBER' : `${rankIcon} ${rank.toUpperCase()}`}</Text>
            </View>
            <View style={styles.ptsBadge}>
              <Text style={styles.ptsBadgeText}>⚡ {loadingMe ? '...' : points} PTS</Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>{loadingMe ? t('Loading profile...') : displayVerified}</Text>
            {me?.is_admin ? <Text style={styles.heroMetaAdmin}>{t('Admin account')}</Text> : null}
          </View>

          {/* Rank Progress */}
          <View style={styles.rankProgressWrap}>
            <View style={styles.rankProgressLabels}>
              <Text style={styles.rankProgressLabel}>{rank.toUpperCase()}</Text>
              <Text style={styles.rankProgressLabel}>
                {pointsToNextRank > 0 ? `${pointsToNextRank} ${t('pts to')} ${nextRank.toUpperCase()}` : t('MAX RANK')}
              </Text>
            </View>
            <View style={styles.rankBarBg}>
              <View
                style={[styles.rankBarFill, { width: `${progressFraction * 100}%` as any, backgroundColor: Colors.accentBlue }]}
              />
            </View>
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          {profileStats.map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={styles.statEmoji}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Section 20.1: Accountability Partner ── */}
        <AccountabilityPartnerCard onStatusChange={() => void loadProfileData(false, true)} />

        {/* ── Feature 5: Points & Tier Progression ── */}
        <PointsProgressionCard onRefreshNeeded={() => void loadProfileData(false, true)} />

        {/* ── Body Metrics ── */}


        {/* ── Coach Cards ── */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsTitleRow}>
            <Text style={styles.metricsTitle}>{t('Mindset & Habits')}</Text>
          </View>
          {habitSummary.map((line) => (
            <Text key={line} style={styles.habitSummaryLine}>{line}</Text>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={[styles.metricsEditBtn, { flex: 1, marginTop: 0 }]} activeOpacity={0.85} onPress={() => router.push('/profile/settings')}>
              <Ionicons name="settings-outline" size={16} color="#06B6D4" />
              <Text style={styles.metricsEditText}>{t('My Settings')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.metricsEditBtn, { flex: 1, marginTop: 0 }]} activeOpacity={0.85} onPress={openHabitModal}>
              <Ionicons name="sparkles-outline" size={16} color="#F59E0B" />
              <Text style={styles.metricsEditText}>{t('Quick edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.coachSection}>
          <Text style={styles.sectionTitle}>{t('MY COACHES')}</Text>
          {canAccessCoachVictor ? <View style={[styles.coachCard, { backgroundColor: Colors.surface }]}>
            <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentBlue }]}>
              <Ionicons name="add" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coachName}>COACH VICTOR</Text>
              <Text style={styles.coachStatus}>🟢 {t('Ready for you')}</Text>
            </View>
            <TouchableOpacity
              style={styles.coachArrow}
              onPress={() => router.push('/chat')}
            >
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View> : (
            <TouchableOpacity style={[styles.coachCard, styles.lockedCard]} activeOpacity={0.85} onPress={() => setRestrictedSection(t('Coach Victor'))}>
              <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentBlue }]}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachName}>COACH VICTOR</Text>
                <Text style={styles.coachStatus}>{t('Upgrade required')}</Text>
              </View>
              <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
          {/*
            Longevity OS is temporarily hidden from Profile.
            Keep the full feature implementation, access checks, and route intact for later re-enable.
          */}
          <TouchableOpacity style={[styles.coachCard, styles.planCard]} activeOpacity={0.86} onPress={() => setShowSubscriptionModal(true)}>
            <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentGold }]}>
              <Ionicons name="card-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.coachName}>{t('Membership & Subscription').toUpperCase()}</Text>
              <Text style={styles.coachStatus}>{t('Current plan: {plan}', { plan: currentPlanLabel })}</Text>
            </View>
            <View style={[styles.planBadge, currentPlanBadgeStyle]}>
              <Text style={styles.planBadgeText}>{currentPlanLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>"""

jsx_replacement = """        <VictoryHeader showSettings onSettingsPress={() => router.push('/profile/settings')} />

        {/* ── 1. The Athlete Passport (Hero Identity Card) ── */}
        <View style={styles.heroCard}>
          {/* Top Status Strip */}
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={[styles.tierPlanPill, currentPlanBadgeStyle]}
              activeOpacity={0.8}
              onPress={() => setShowSubscriptionModal(true)}
            >
              <Ionicons name="shield-checkmark" size={12} color="#00F0D0" />
              <Text style={styles.tierPlanPillText}>{currentPlanLabel.toUpperCase()}</Text>
            </TouchableOpacity>

            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#00F0D0" />
              <Text style={styles.verifiedBadgeText}>
                {me?.is_admin ? t('ADMIN') : displayVerified.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Avatar with Integrated Floating Camera Badge */}
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.88}
            onPress={() => router.push('/profile/edit')}
            accessibilityLabel={t('Change profile photo')}
          >
            {profileImageUrl && !profileImageFailed ? (
              Platform.OS === 'web' ? (
                React.createElement('img', {
                  src: profileImageUrl,
                  alt: `${displayName} profile`,
                  referrerPolicy: 'no-referrer',
                  style: WEB_AVATAR_IMAGE_STYLE,
                  onError: () => setProfileImageFailed(true),
                })
              ) : (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.avatarImage}
                  onError={() => setProfileImageFailed(true)}
                />
              )
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{profileInitials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color="#04111F" />
            </View>
          </TouchableOpacity>

          {/* Name & Handle */}
          <View style={styles.identityBlock}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>
                {loadingMe ? t('Loading...') : displayName}
              </Text>
            </View>
            <Text style={styles.heroEmail} numberOfLines={1}>
              {loadingMe ? t('Fetching account...') : displayEmail}
            </Text>
          </View>

          {/* Badges Row */}
          <View style={styles.heroBadgeRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{loadingMe ? 'MEMBER' : `${rankIcon} ${rank.toUpperCase()}`}</Text>
            </View>
            <View style={styles.ptsBadge}>
              <Text style={styles.ptsBadgeText}>⚡ {loadingMe ? '...' : points} PTS</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 {streakDays}D STREAK</Text>
            </View>
          </View>

          {/* Rank Progress Bar */}
          <View style={styles.rankProgressWrap}>
            <View style={styles.rankProgressLabels}>
              <Text style={styles.rankProgressLabelLeft}>{rank.toUpperCase()} TIER</Text>
              <Text style={styles.rankProgressLabelRight}>
                {pointsToNextRank > 0 ? `${pointsToNextRank} ${t('pts to')} ${nextRank.toUpperCase()}` : t('MAX RANK ACHIEVED')}
              </Text>
            </View>
            <View style={styles.rankBarBg}>
              <View
                style={[styles.rankBarFill, { width: `${progressFraction * 100}%` as any }]}
              />
            </View>
          </View>
        </View>

        {/* ── 2. Performance KPI Bento Grid ── */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(0, 240, 208, 0.12)' }]}>
              <Ionicons name="barbell-outline" size={18} color="#00F0D0" />
            </View>
            <Text style={styles.kpiValue} numberOfLines={1}>
              {workoutsTotal > 0 ? `${workoutsCompleted}/${workoutsTotal}` : String(workoutsCompleted)}
            </Text>
            <Text style={styles.kpiLabel}>{t('WORKOUTS')}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
              <Ionicons name="flame-outline" size={18} color="#F97316" />
            </View>
            <Text style={styles.kpiValue} numberOfLines={1}>{streakDays}d</Text>
            <Text style={styles.kpiLabel}>{t('STREAK')}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="flash-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.kpiValue} numberOfLines={1}>{points}</Text>
            <Text style={styles.kpiLabel}>{t('POINTS')}</Text>
          </View>
        </View>

        {/* ── 3. Section 20.1: Accountability Partner ── */}
        <AccountabilityPartnerCard onStatusChange={() => void loadProfileData(false, true)} />

        {/* ── 4. Feature 5: Points & Tier Progression ── */}
        <PointsProgressionCard onRefreshNeeded={() => void loadProfileData(false, true)} />

        {/* ── 5. Athlete Mindset & Habit Anchors ── */}
        <View style={styles.mindsetCard}>
          <View style={styles.mindsetHeaderRow}>
            <View style={styles.mindsetHeaderLeft}>
              <View style={styles.mindsetIconCircle}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.mindsetTitle}>{t('MINDSET & HABIT ANCHORS')}</Text>
                <Text style={styles.mindsetSubtitle}>{t('Guiding identity & behavioral triggers')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.mindsetEditAction}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/settings')}
            >
              <Ionicons name="settings-outline" size={16} color="#00F0D0" />
            </TouchableOpacity>
          </View>

          {/* Identity Statement Quote */}
          {me?.identity_statement?.trim() ? (
            <View style={styles.identityQuoteBox}>
              <Ionicons name="quote" size={18} color="rgba(0, 240, 208, 0.4)" style={styles.quoteIcon} />
              <Text style={styles.identityQuoteText}>
                "{me.identity_statement.trim()}"
              </Text>
              <View style={styles.quotePill}>
                <Text style={styles.quotePillText}>{t('CORE IDENTITY')}</Text>
              </View>
            </View>
          ) : null}

          {/* Trigger & Unlock Items */}
          <View style={styles.anchorItemsWrap}>
            {me?.training_trigger_context?.trim() || me?.training_trigger_action?.trim() ? (
              <View style={styles.anchorItemRow}>
                <View style={[styles.anchorIconBadge, { backgroundColor: 'rgba(6, 182, 212, 0.14)' }]}>
                  <Ionicons name="flash-outline" size={14} color="#06B6D4" />
                </View>
                <View style={styles.anchorCopy}>
                  <Text style={styles.anchorItemLabel}>{t('BEHAVIORAL TRIGGER')}</Text>
                  <Text style={styles.anchorItemValue}>
                    {me?.training_trigger_context ? `When ${me.training_trigger_context}` : ''}
                    {me?.training_trigger_context && me?.training_trigger_action ? '  →  ' : ''}
                    {me?.training_trigger_action ? `Then ${me.training_trigger_action}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {me?.workout_unlock_label?.trim() ? (
              <View style={styles.anchorItemRow}>
                <View style={[styles.anchorIconBadge, { backgroundColor: 'rgba(234, 179, 8, 0.14)' }]}>
                  <Ionicons name="headset-outline" size={14} color="#EAB308" />
                </View>
                <View style={styles.anchorCopy}>
                  <Text style={styles.anchorItemLabel}>{t('SESSION UNLOCK REWARD')}</Text>
                  <Text style={styles.anchorItemValue}>{me.workout_unlock_label.trim()}</Text>
                </View>
              </View>
            ) : null}

            {!me?.identity_statement?.trim() && !me?.training_trigger_context?.trim() && !me?.workout_unlock_label?.trim() ? (
              <Text style={styles.emptyMindsetText}>
                {t('Set your identity statement, session unlock rewards, and if-then training triggers in Settings.')}
              </Text>
            ) : null}
          </View>

          {/* Quick Buttons */}
          <View style={styles.mindsetActionsRow}>
            <TouchableOpacity
              style={styles.mindsetPrimaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/profile/settings')}
            >
              <Ionicons name="construct-outline" size={15} color="#00F0D0" />
              <Text style={styles.mindsetPrimaryBtnText}>{t('Manage in Settings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mindsetSecondaryBtn}
              activeOpacity={0.85}
              onPress={openHabitModal}
            >
              <Ionicons name="pencil" size={15} color="rgba(255,255,255,0.7)" />
              <Text style={styles.mindsetSecondaryBtnText}>{t('Quick edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 6. Coaching & Membership Section ── */}
        <View style={styles.coachSection}>
          <Text style={styles.sectionTitle}>{t('COACHING & MEMBERSHIP')}</Text>

          {/* Coach Victor */}
          {canAccessCoachVictor ? (
            <TouchableOpacity
              style={styles.coachCard}
              activeOpacity={0.85}
              onPress={() => router.push('/chat')}
            >
              <View style={[styles.coachIconWrap, { backgroundColor: 'rgba(0, 240, 208, 0.14)', borderColor: 'rgba(0, 240, 208, 0.3)' }]}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#00F0D0" />
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>COACH VICTOR</Text>
                <View style={styles.coachStatusRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.coachStatus}>{t('Online • Ready to coach')}</Text>
                </View>
              </View>
              <View style={styles.coachActionPill}>
                <Text style={styles.coachActionText}>{t('Chat')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#00F0D0" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.coachCard, styles.lockedCard]}
              activeOpacity={0.85}
              onPress={() => setRestrictedSection(t('Coach Victor'))}
            >
              <View style={[styles.coachIconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.5)" />
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>COACH VICTOR</Text>
                <Text style={styles.coachLockedStatus}>{t('Upgrade required for AI Coaching')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}

          {/* Membership Plan Card */}
          <TouchableOpacity
            style={[styles.coachCard, styles.membershipPlanCard]}
            activeOpacity={0.86}
            onPress={() => setShowSubscriptionModal(true)}
          >
            <View style={[styles.coachIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.16)', borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
              <Ionicons name="card" size={22} color="#F59E0B" />
            </View>
            <View style={styles.coachInfo}>
              <Text style={styles.coachName}>{t('MEMBERSHIP STATUS')}</Text>
              <Text style={styles.membershipTierSubtext}>
                {t('Plan: {plan}', { plan: currentPlanLabel })}
              </Text>
            </View>
            <View style={styles.managePlanBadge}>
              <Text style={styles.managePlanBadgeText}>{t('Manage')}</Text>
              <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
            </View>
          </TouchableOpacity>
        </View>"""

if jsx_target in content:
    content = content.replace(jsx_target, jsx_replacement, 1)
    print("Replaced main JSX sections cleanly")
else:
    print("Warning: jsx_target not found!")

# 3. Modernize styles: replace the styles block with sleek, production-grade styles
styles_index = content.find("const styles = StyleSheet.create({")
if styles_index != -1:
    before_styles = content[:styles_index]
    
    new_styles = """const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  scroll: { paddingBottom: 36 },

  /* ── 1. Hero Passport Card ── */
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#111322',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.18)',
    marginBottom: 14,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierPlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierPlanPillText: {
    color: '#00F0D0',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.25)',
  },
  verifiedBadgeText: {
    color: '#00F0D0',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  avatarWrap: {
    position: 'relative',
    width: 86,
    height: 86,
    marginBottom: 14,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 208, 0.4)',
  },
  avatarFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F2634',
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 208, 0.45)',
  },
  avatarFallbackText: {
    color: '#00F0D0',
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00F0D0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111322',
  },
  identityBlock: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 22,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  heroEmail: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rankBadge: {
    backgroundColor: 'rgba(0, 240, 208, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.28)',
  },
  rankBadgeText: {
    color: '#00F0D0',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  ptsBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  ptsBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  streakBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  streakBadgeText: {
    color: '#F97316',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  rankProgressWrap: {
    width: '100%',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  rankProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rankProgressLabelLeft: {
    fontSize: 10,
    color: '#00F0D0',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  rankProgressLabelRight: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.4,
  },
  rankBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#00F0D0',
  },

  /* ── 2. Performance 3-Metric KPI Bento Strip ── */
  kpiRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#121422',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  kpiLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },

  /* ── 5. Athlete Mindset & Habit Anchors ── */
  mindsetCard: {
    marginHorizontal: 16,
    backgroundColor: '#121422',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  mindsetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mindsetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mindsetIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mindsetTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  mindsetSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  mindsetEditAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityQuoteBox: {
    backgroundColor: 'rgba(0, 240, 208, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.18)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: 8,
    left: 10,
    opacity: 0.3,
  },
  identityQuoteText: {
    color: '#E6FFFB',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    fontFamily: 'Inter_500Medium',
    paddingLeft: 18,
  },
  quotePill: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 240, 208, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  quotePillText: {
    color: '#00F0D0',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  anchorItemsWrap: {
    gap: 8,
    marginBottom: 14,
  },
  anchorItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  anchorIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorCopy: {
    flex: 1,
  },
  anchorItemLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  anchorItemValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  emptyMindsetText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    paddingVertical: 6,
  },
  mindsetActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mindsetPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.25)',
  },
  mindsetPrimaryBtnText: {
    color: '#00F0D0',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  mindsetSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  mindsetSecondaryBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  /* ── 6. Coaching & Membership Section ── */
  coachSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121422',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 10,
    gap: 12,
  },
  lockedCard: {
    opacity: 0.75,
  },
  membershipPlanCard: {
    borderColor: 'rgba(245, 158, 11, 0.22)',
    backgroundColor: '#141424',
  },
  coachIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  coachStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  coachStatus: {
    fontSize: 11,
    color: '#00F0D0',
    fontFamily: 'Inter_500Medium',
  },
  coachLockedStatus: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  coachActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.25)',
  },
  coachActionText: {
    color: '#00F0D0',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  membershipTierSubtext: {
    fontSize: 11,
    color: '#F59E0B',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  managePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  managePlanBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },

  /* ── 7. Menu Sections ── */
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: '#121422',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  lockedRow: {
    opacity: 0.72,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuValue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Inter_400Regular',
  },
  lockedIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
  },

  /* ── 8. Privacy & Community ── */
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  privacySubLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  /* ── 9. Log Out & Footer ── */
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 18,
    letterSpacing: 0.4,
  },

  /* ── Modals ── */
  metricsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 20, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  metricsModalCard: {
    backgroundColor: '#151629',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  metricsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricsModalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  metricsFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricsInputGroup: {
    width: '48%',
    marginBottom: 16,
  },
  metricsInputLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  metricsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D20',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricsInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    outlineStyle: 'none' as any,
  },
  metricsInputUnit: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  metricsActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricsCancelBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricsCancelBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  metricsSaveBtn: {
    flex: 1,
    backgroundColor: '#00F0D0',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  metricsSaveBtnText: {
    color: '#04111F',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  metricsSavingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 10, 24, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  metricsSavingCard: {
    backgroundColor: '#0E1325',
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  metricsSavingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  habitKeyboardWrap: {
    width: '100%',
    justifyContent: 'center',
  },
  habitModalCard: {
    maxHeight: '82%',
  },
  habitModalScroll: {
    flexGrow: 0,
  },
  habitModalScrollContent: {
    paddingBottom: 8,
  },
  habitFieldLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  habitInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0D0D20',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
    textAlignVertical: 'top',
    outlineStyle: 'none' as any,
  },
  genderModalCard: {
    backgroundColor: '#151629',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  genderModalTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 18,
  },
  genderModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  genderModalOptionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  genderModalOptionTextActive: {
    color: '#00F0D0',
  },
  profileLanguageList: {
    maxHeight: 360,
    width: '100%',
  },
  profileLanguageListContent: {
    gap: 10,
    paddingBottom: 2,
  },
  profileLanguageOption: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: 'rgba(18, 22, 34, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileLanguageOptionActive: {
    borderColor: '#00F0D0',
    backgroundColor: 'rgba(0, 240, 208, 0.13)',
  },
  profileLanguageOptionText: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    width: 38,
  },
  profileLanguageOptionTextActive: {
    color: '#00F0D0',
  },
  profileLanguageOptionCopy: {
    flex: 1,
  },
  profileLanguageNativeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  profileLanguageEnglishText: {
    color: 'rgba(255, 255, 255, 0.48)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
});
"""
    content = before_styles + new_styles
    print("Replaced styles block cleanly")

with open(profile_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully wrote updated profile.tsx")
