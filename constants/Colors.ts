/**
 * SECTION 3 — BRANDING & VISUAL IDENTITY (v7.0 Confirmed)
 * Non-negotiable brand palette of six colors used identically across brand & app:
 * 1. NAVY:          #0D2B45 (App bars, headings, navigation, key UI)
 * 2. OBSIDIAN:      #0D0D0D (Dark mode surfaces, root background, overlay backgrounds)
 * 3. COPPER:        #B5651D (Secondary accent, badges, progress indicators, tier borders)
 * 4. GOLD:          #C9943A (CTA buttons, active states, progress rings, streak fire, tier badges)
 * 5. VICTORY GREEN: #1A7A4A (Completed workouts, health metrics, protein target achieved)
 * 6. IVORY:         #F7F3EE (App background surfaces, card surfaces, body text on dark)
 */

export const BrandPalette = {
  navy: '#0D2B45',
  obsidian: '#0D0D0D',
  copper: '#B5651D',
  gold: '#C9943A',
  victoryGreen: '#1A7A4A',
  ivory: '#F7F3EE',
} as const;

export const Colors = {
  // Confirmed Brand Tokens
  navy: BrandPalette.navy,
  obsidian: BrandPalette.obsidian,
  copper: BrandPalette.copper,
  gold: BrandPalette.gold,
  victoryGreen: BrandPalette.victoryGreen,
  ivory: BrandPalette.ivory,

  // Core Semantic Mappings
  primary: BrandPalette.gold, // #C9943A (Primary CTA buttons, active states, progress rings)
  primaryDark: '#A77928',
  secondary: BrandPalette.copper, // #B5651D (Secondary accent, badges, tier borders)
  background: BrandPalette.obsidian, // #0D0D0D (Root dark surface)
  surface: '#111822', // Deep Navy-Obsidian luxury dark surface
  surfaceCard: '#131F2E', // Navy-tinted card surface
  surfaceCardHover: '#18273A',
  cardBorder: 'rgba(181, 101, 29, 0.22)', // Copper subtle border accent
  appBar: BrandPalette.navy, // #0D2B45
  navBar: BrandPalette.navy, // #0D2B45

  // Inputs & Overlays
  inputBackground: 'rgba(13, 43, 69, 0.40)', // Navy-tinted input
  inputBorder: 'rgba(181, 101, 29, 0.35)', // Copper-tinted input border
  overlay: 'rgba(13, 13, 13, 0.85)', // Obsidian overlay
  divider: 'rgba(247, 243, 238, 0.12)', // Ivory subtle divider
  googleButton: '#111822',

  // Typography (Ivory on Dark)
  text: BrandPalette.ivory, // #F7F3EE
  textSecondary: 'rgba(247, 243, 238, 0.72)',
  textMuted: 'rgba(247, 243, 238, 0.48)',
  placeholder: 'rgba(247, 243, 238, 0.35)',

  // Brand Accents & Aliases
  accentNavy: BrandPalette.navy,
  accentObsidian: BrandPalette.obsidian,
  accentCopper: BrandPalette.copper,
  accentGold: BrandPalette.gold,
  accentGreen: BrandPalette.victoryGreen,
  accentIvory: BrandPalette.ivory,
  accentDanger: '#EF4444',
  accentSurface: '#14202E',

  // Backward-compatibility aliases (aligned to v7.0 theme)
  accentBlue: BrandPalette.navy,
  accentPurple: BrandPalette.copper,
  accentPink: BrandPalette.gold,
};
