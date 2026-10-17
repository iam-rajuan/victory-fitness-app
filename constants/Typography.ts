/**
 * Victory Fitness - Brand Typography System (v7.0)
 * 
 * ROLE 1: Display / Hero -> DM Sans (600 SemiBold)
 *   Usage: large headings, hero sections, inspirational text
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
  display: 'DMSans-SemiBold',

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
  // ========================================================
  // ROLE 1: H1 / Main Heading / Screen Title
  // Clean, readable DM Sans (SemiBold). Not bloated or fat.
  // ========================================================
  h1: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },

  // ========================================================
  // ROLE 2: H2 / Secondary Heading / Subtitle / Modal Title
  // ========================================================
  h2: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },

  // ========================================================
  // ROLE 3: H3 / Card Title / Section Subtitle
  // ========================================================
  h3: {
    fontFamily: Fonts.heading,
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  // ========================================================
  // ROLE 4: Body Text / Paragraphs (Inter)
  // Crisp, highly readable, standard weight.
  // ========================================================
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodyLarge: {
    fontFamily: Fonts.body,
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  bodySmall: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '400' as const,
  },

  // ========================================================
  // Caption & Meta Text
  // ========================================================
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

  // ========================================================
  // Eyebrows / Kickers (Uppercase Section Labels)
  // ========================================================
  eyebrow: {
    fontFamily: Fonts.heading,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '600' as const,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
  },

  // ========================================================
  // Button Labels
  // ========================================================
  button: {
    fontFamily: Fonts.heading,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },

  // ========================================================
  // Backward-Compatibility Aliases
  // ========================================================
  heroTitle: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600' as const,
    letterSpacing: -0.4,
  },
  displayLarge: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  displayMedium: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  sectionEyebrow: {
    fontFamily: Fonts.heading,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '600' as const,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
  },
  navLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
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
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  dataMetricValue: {
    fontFamily: Fonts.dataBold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700' as const,
  },
  dataStat: {
    fontFamily: Fonts.data,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  dataSmall: {
    fontFamily: Fonts.data,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500' as const,
  },
} as const;

export const typography = Typography;

export default Typography;
