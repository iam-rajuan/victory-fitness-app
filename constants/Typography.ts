/**
 * Victory Fitness - Brand Typography System (v7.0)
 * 
 * ROLE 1: Display / Hero -> Clash Display (Bold)
 *   Usage: App name on splash, large headings, hero sections
 * 
 * ROLE 2: Headings -> DM Sans (600 SemiBold)
 *   Usage: Section titles, card headers, navigation labels, modal titles
 * 
 * ROLE 3: Body -> Inter (400 Regular / 500 Medium / 600 SemiBold / 700 Bold)
 *   Usage: Paragraphs, descriptions, form input labels, button labels
 * 
 * ROLE 4: Data / Numbers -> JetBrains Mono (500 Medium / 700 Bold)
 *   Usage: Calories, weights, rep counts, statistics, streak counts, timers
 * 
 * Mandatory: All fonts self-hosted locally in /public/fonts/ and /assets/fonts/
 * Zero Google Fonts CDN calls (High performance + German GDPR compliant).
 */

export const Fonts = {
  // ROLE 1: Display / Hero
  display: 'ClashDisplay-Bold',

  // ROLE 2: Headings
  heading: 'DMSans-SemiBold',

  // ROLE 3: Body
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',

  // ROLE 4: Data / Numbers
  data: 'JetBrainsMono-Medium',
  dataBold: 'JetBrainsMono-Bold',
} as const;

export const Typography = {
  // Display / Hero Presets
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  displayLarge: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  displayMedium: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },

  // Heading Presets
  h1: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  h2: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  h3: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  sectionEyebrow: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  navLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },

  // Body Presets
  bodyLarge: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  caption: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  captionMedium: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  formLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.4,
  },

  // Data / Numbers Presets (JetBrains Mono)
  dataMetricHero: {
    fontFamily: Fonts.dataBold,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  dataMetricLarge: {
    fontFamily: Fonts.dataBold,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  dataMetricValue: {
    fontFamily: Fonts.dataBold,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  dataStat: {
    fontFamily: Fonts.data,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  dataSmall: {
    fontFamily: Fonts.data,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
} as const;

export default Typography;
