import re

plan_path = r"d:\RAJUAN-PERSONAL\VSCODE\victora\victory-fitness-app\app\plan.tsx"
with open(plan_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
if "import { Colors } from '../constants/Colors';" not in content:
    content = content.replace(
        "import { replaceRoute } from '../lib/navigation';",
        "import { replaceRoute } from '../lib/navigation';\nimport { Colors } from '../constants/Colors';\nimport { Fonts } from '../constants/Typography';"
    )

# 2. getTierDesign
old_get_tier = """function getTierDesign(tier: SubscriptionTier) {
  switch (tier) {
    case 'GOLD_BETA':
      return {
        bg: '#1C1917',
        accentColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.18)',
        borderColor: '#44403C',
        activeBorderColor: '#F59E0B',
        glowColor: 'rgba(245, 158, 11, 0.35)',
        iconName: 'ribbon-outline' as const,
        tag: 'BETA ACCESS',
        pillBg: '#F59E0B',
        pillText: '#000000',
      };
    case 'SILVER':
      return {
        bg: '#0F172A',
        accentColor: '#94A3B8',
        badgeBg: 'rgba(148, 163, 184, 0.16)',
        borderColor: '#334155',
        activeBorderColor: '#94A3B8',
        glowColor: 'rgba(148, 163, 184, 0.25)',
        iconName: 'medal-outline' as const,
        tag: 'ESSENTIALS',
        pillBg: 'rgba(148, 163, 184, 0.15)',
        pillText: '#CBD5E1',
      };
    case 'GOLD':
      return {
        bg: '#1C1917',
        accentColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.18)',
        borderColor: '#44403C',
        activeBorderColor: '#F59E0B',
        glowColor: 'rgba(245, 158, 11, 0.35)',
        iconName: 'ribbon-outline' as const,
        tag: 'MOST POPULAR',
        pillBg: '#F59E0B',
        pillText: '#000000',
      };
    case 'PLATINUM':
      return {
        bg: '#0B132B',
        accentColor: '#38BDF8',
        badgeBg: 'rgba(56, 189, 248, 0.18)',
        borderColor: '#1E293B',
        activeBorderColor: '#38BDF8',
        glowColor: 'rgba(56, 189, 248, 0.4)',
        iconName: 'diamond-outline' as const,
        tag: 'RECOMMENDED',
        pillBg: '#38BDF8',
        pillText: '#021417',
      };
    case 'INNER_CIRCLE':
      return {
        bg: '#1F1122',
        accentColor: '#FB7185',
        badgeBg: 'rgba(251, 113, 133, 0.18)',
        borderColor: '#4C1D24',
        activeBorderColor: '#FB7185',
        glowColor: 'rgba(251, 113, 133, 0.35)',
        iconName: 'sparkles-outline' as const,
        tag: 'EXCLUSIVE',
        pillBg: '#FB7185',
        pillText: '#1F1122',
      };
    default:
      return {
        bg: '#0F172A',
        accentColor: '#64748B',
        badgeBg: 'rgba(100, 116, 139, 0.16)',
        borderColor: '#334155',
        activeBorderColor: '#64748B',
        glowColor: 'rgba(100, 116, 139, 0.2)',
        iconName: 'key-outline' as const,
        tag: 'BASIC',
        pillBg: 'rgba(100, 116, 139, 0.15)',
        pillText: '#94A3B8',
      };
  }
}"""

new_get_tier = """function getTierDesign(tier: SubscriptionTier) {
  switch (tier) {
    case 'GOLD_BETA':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.gold,
        badgeBg: 'rgba(201, 148, 58, 0.16)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.gold,
        glowColor: 'rgba(201, 148, 58, 0.2)',
        iconName: 'ribbon-outline' as const,
        tag: 'BETA ACCESS',
        pillBg: Colors.gold,
        pillText: Colors.obsidian,
      };
    case 'SILVER':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.copper,
        badgeBg: 'rgba(181, 101, 29, 0.14)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.copper,
        glowColor: 'rgba(181, 101, 29, 0.2)',
        iconName: 'medal-outline' as const,
        tag: 'ESSENTIALS',
        pillBg: 'rgba(181, 101, 29, 0.2)',
        pillText: Colors.copper,
      };
    case 'GOLD':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.gold,
        badgeBg: 'rgba(201, 148, 58, 0.16)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.gold,
        glowColor: 'rgba(201, 148, 58, 0.2)',
        iconName: 'ribbon-outline' as const,
        tag: 'MOST POPULAR',
        pillBg: Colors.gold,
        pillText: Colors.obsidian,
      };
    case 'PLATINUM':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.gold,
        badgeBg: 'rgba(201, 148, 58, 0.16)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.gold,
        glowColor: 'rgba(201, 148, 58, 0.2)',
        iconName: 'diamond-outline' as const,
        tag: 'RECOMMENDED',
        pillBg: Colors.gold,
        pillText: Colors.obsidian,
      };
    case 'INNER_CIRCLE':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.copper,
        badgeBg: 'rgba(181, 101, 29, 0.18)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.copper,
        glowColor: 'rgba(181, 101, 29, 0.2)',
        iconName: 'sparkles-outline' as const,
        tag: 'EXCLUSIVE',
        pillBg: Colors.copper,
        pillText: Colors.ivory,
      };
    default:
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.copper,
        badgeBg: 'rgba(181, 101, 29, 0.12)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.copper,
        glowColor: 'rgba(181, 101, 29, 0.15)',
        iconName: 'key-outline' as const,
        tag: 'BASIC',
        pillBg: 'rgba(181, 101, 29, 0.12)',
        pillText: Colors.copper,
      };
  }
}"""

content = content.replace(old_get_tier, new_get_tier)

# 3. Card shadow in FlatList
old_card_shadow = """                        shadowColor: active ? design.accentColor : '#000000',
                        shadowOpacity: active ? 0.35 : 0.15,
                        shadowRadius: active ? 18 : 8,"""

new_card_shadow = """                        shadowColor: Colors.navy,
                        shadowOpacity: active ? 0.25 : 0.12,
                        shadowRadius: active ? 10 : 5,
                        elevation: 2,"""

content = content.replace(old_card_shadow, new_card_shadow)

# 4. Card buttons & active states
old_active_btn = """                        style={[
                          styles.cardBtn,
                          active && !current && { backgroundColor: '#18D2EF' },
                          current && { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38BDF8' },
                          !active && !current && { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
                        ]}"""

new_active_btn = """                        style={[
                          styles.cardBtn,
                          active && !current && { backgroundColor: Colors.gold },
                          current && { backgroundColor: 'rgba(201, 148, 58, 0.15)', borderWidth: 1, borderColor: Colors.gold },
                          !active && !current && { backgroundColor: 'rgba(247, 243, 238, 0.06)', borderWidth: 1, borderColor: Colors.cardBorder },
                        ]}"""

content = content.replace(old_active_btn, new_active_btn)

old_card_btn_text = """                          style={[
                            styles.cardBtnText,
                            active && !current && { color: '#021417', fontFamily: 'Inter_700Bold' },
                            current && { color: '#38BDF8', fontFamily: 'Inter_700Bold' },
                            !active && !current && { color: '#E2E8F0', fontFamily: 'Inter_600SemiBold' },
                          ]}"""

new_card_btn_text = """                          style={[
                            styles.cardBtnText,
                            active && !current && { color: Colors.obsidian, fontFamily: Fonts.heading },
                            current && { color: Colors.gold, fontFamily: Fonts.heading },
                            !active && !current && { color: Colors.textSecondary, fontFamily: Fonts.heading },
                          ]}"""

content = content.replace(old_card_btn_text, new_card_btn_text)

# Active indicator icon
content = content.replace(
    '<Ionicons name="checkmark-circle-sharp" size={14} color="#38BDF8" />',
    '<Ionicons name="checkmark-circle-sharp" size={14} color={Colors.gold} />'
)

# Modal discount text
content = content.replace(
    "{ color: '#10B981', fontFamily: 'Inter_600SemiBold' }",
    "{ color: Colors.victoryGreen, fontFamily: Fonts.dataBold }"
)
content = content.replace(
    "{ color: selectedTierDesign.accentColor, fontFamily: 'Inter_700Bold' }",
    "{ color: selectedTierDesign.accentColor, fontFamily: Fonts.heading }"
)
content = content.replace(
    '<Ionicons name="swap-horizontal" size={14} color="#64748B" />',
    '<Ionicons name="swap-horizontal" size={14} color={Colors.textMuted} />'
)
content = content.replace(
    '<ActivityIndicator color="#021417" />',
    '<ActivityIndicator color={Colors.obsidian} />'
)

# 5. Styles replacement
old_styles_start = "const styles = StyleSheet.create({"
idx = content.find(old_styles_start)
if idx != -1:
    new_styles = """const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.obsidian },
  page: { flex: 1, backgroundColor: Colors.obsidian },
  content: { paddingTop: 16, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: Colors.obsidian },
  loadingText: { color: Colors.textMuted, fontSize: 14, fontFamily: Fonts.body },

  /* Top Navigation Bar */
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  topNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavBtnPlaceholder: {
    width: 40,
    height: 40,
  },

  /* Hero Section */
  hero: { paddingHorizontal: 22, alignItems: 'center', marginBottom: 20 },
  kickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
  },
  kicker: { color: Colors.gold, fontSize: 10, fontFamily: Fonts.heading, letterSpacing: 2 },
  title: { color: Colors.text, fontSize: 26, fontFamily: Fonts.display, marginTop: 12, textAlign: 'center', letterSpacing: 0.2 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: Fonts.body, marginTop: 8, textAlign: 'center', maxWidth: 640 },

  /* Master Billing Segment Switch */
  billingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  billingSegmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    width: '100%',
    maxWidth: 390,
  },
  billingSegmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  billingSegmentBtnActive: {
    backgroundColor: Colors.gold,
    shadowColor: Colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  billingSegmentText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
  },
  billingSegmentTextActive: {
    color: Colors.obsidian,
  },
  yearlySaveBadge: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: Colors.victoryGreen,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    zIndex: 10,
  },
  yearlySaveBadgeText: {
    color: Colors.ivory,
    fontSize: 8,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },

  /* Carousel Section */
  carouselSection: {
    marginBottom: 10,
  },
  cardsRow: {
    paddingVertical: 10,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    minHeight: 520,
    justifyContent: 'space-between',
    position: 'relative',
  },

  /* Top Tag Pill */
  topTagPill: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: Colors.navy,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 10,
  },
  topTagText: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },

  /* Card Header */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepBadge: {
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
  },
  stepBadgeText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.heading,
  },

  /* Title & Subtitle */
  cardTitle: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: Fonts.display,
    letterSpacing: 0.3,
  },
  cardDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.body,
    marginTop: 8,
    minHeight: 56,
  },

  /* Price Block */
  priceContainer: {
    marginTop: 14,
    minHeight: 70,
    justifyContent: 'center',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  discountBadge: {
    backgroundColor: 'rgba(26, 122, 74, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(26, 122, 74, 0.35)',
  },
  discountBadgeText: {
    color: Colors.victoryGreen,
    fontSize: 10,
    fontFamily: Fonts.heading,
  },
  originalPriceText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: Fonts.data,
    textDecorationLine: 'line-through',
  },
  priceMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceNumber: {
    color: Colors.text,
    fontSize: 28,
    fontFamily: Fonts.dataBold,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  priceMainText: {
    color: Colors.text,
    fontSize: 22,
    fontFamily: Fonts.dataBold,
  },
  priceSubText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
  savingsText: {
    color: Colors.victoryGreen,
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    marginTop: 4,
  },
  bestValueText: {
    color: Colors.gold,
    fontSize: 10,
    fontFamily: Fonts.heading,
    marginTop: 4,
    letterSpacing: 1,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 14,
  },

  /* Feature List */
  featuresList: {
    gap: 10,
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: Fonts.body,
    flex: 1,
    lineHeight: 19,
  },

  /* Card Footer & Action Button */
  cardFooter: {
    marginTop: 18,
    gap: 10,
  },
  currentActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
  },
  currentActiveText: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  cardBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnText: {
    fontSize: 13,
    letterSpacing: 0.8,
  },

  /* Pagination Dots */
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(247, 243, 238, 0.15)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: Colors.gold,
  },

  /* Swipe Hint */
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  swipeHintText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.body,
  },

  /* Summary Card */
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    padding: 18,
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
  },
  summaryTierTitle: {
    fontSize: 16,
    fontFamily: Fonts.display,
  },
  summaryOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26, 122, 74, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  summaryOfferText: {
    color: Colors.victoryGreen,
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  summaryPriceText: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: Fonts.dataBold,
    marginTop: 4,
  },
  summaryAccessText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  summaryBold: {
    color: Colors.text,
    fontFamily: Fonts.bodySemiBold,
  },

  /* Bottom Confirm Button */
  confirmButton: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: Colors.gold,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(201, 148, 58, 0.2)',
    borderWidth: 1,
    borderColor: Colors.copper,
    shadowOpacity: 0,
  },
  confirmButtonText: {
    color: Colors.obsidian,
    fontSize: 15,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    padding: 22,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: { color: Colors.text, fontSize: 20, fontFamily: Fonts.display },
  modalText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, fontFamily: Fonts.body, marginTop: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalSecondary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(247, 243, 238, 0.05)',
  },
  modalSecondaryText: { color: Colors.textSecondary, fontSize: 14, fontFamily: Fonts.heading },
  modalPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.gold,
  },
  modalPrimaryText: { color: Colors.obsidian, fontSize: 14, fontFamily: Fonts.heading },

  /* Receipt / Invoice Container */
  checkoutReceipt: {
    backgroundColor: 'rgba(13, 43, 69, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.15)',
    padding: 16,
    marginTop: 18,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  receiptLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  receiptValue: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: Fonts.dataBold,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  receiptLabelTotal: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  receiptValueTotal: {
    color: Colors.gold,
    fontSize: 18,
    fontFamily: Fonts.dataBold,
  },
  modalInfoSubtext: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.body,
    marginTop: 10,
    textAlign: 'center',
  },
  modalFeaturesContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.08)',
    paddingTop: 14,
  },
  modalFeaturesTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginBottom: 8,
  },
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modalFeatureText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.body,
    flex: 1,
  },
  modalFeaturesMore: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.body,
    marginLeft: 20,
    marginTop: 2,
  },
  entryAnimationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  entryTierOutline: {
    position: 'absolute',
    width: '78%',
    maxWidth: 320,
    height: 190,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrySilverOutline: {
    borderColor: Colors.copper,
    backgroundColor: 'rgba(181, 101, 29, 0.08)',
  },
  entryGoldOutline: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.1)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  entrySilverText: {
    color: Colors.copper,
    fontSize: 18,
    fontFamily: Fonts.heading,
    letterSpacing: 0,
  },
  entryGoldText: {
    color: Colors.gold,
    fontSize: 22,
    fontFamily: Fonts.display,
    letterSpacing: 0,
  },
});
"""
    content = content[:idx] + new_styles

with open(plan_path, "w", encoding="utf-8") as f:
    f.write(content)

print("plan.tsx updated successfully!")
