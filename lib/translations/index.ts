import { en } from './en';
import { de } from './de';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { pt } from './pt';
import { nl } from './nl';
import { bn } from './bn';

export const STATIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  en,
  'en-gh': en,
  de,
  es,
  fr,
  it,
  pt,
  nl,
  bn,
};

export { en, de, es, fr, it, pt, nl, bn };
