import en from './en.json';
import ar from './ar.json';

export type Language = 'en' | 'ar';

export const translations = { en, ar };

export function getTranslation(lang: Language, keyPath: string): string {
  const dict = translations[lang] || translations.en;
  const parts = keyPath.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English
      let fallback: any = translations.en;
      for (const fPart of parts) {
        if (fallback && typeof fallback === 'object' && fPart in fallback) {
          fallback = fallback[fPart];
        } else {
          return keyPath;
        }
      }
      return typeof fallback === 'string' ? fallback : keyPath;
    }
  }

  return typeof current === 'string' ? current : keyPath;
}
