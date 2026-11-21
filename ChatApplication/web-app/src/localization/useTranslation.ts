import { useWebStore } from '../store/useWebStore';
import { translations, TranslationKey } from './translations';

export function useTranslation() {
  const language = useWebStore((state) => state.language);
  const t = (key: TranslationKey): string => {
    const langDict = translations[language] || translations.en;
    return (langDict as any)[key] || (translations.en as any)[key] || key;
  };
  return { t, language };
}
