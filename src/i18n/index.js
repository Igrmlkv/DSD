import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import ru from './locales/ru.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'app_language';

const i18n = createInstance();

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
      callback(saved || 'ru');
    } catch {
      callback('ru');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lang) => {
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
    } catch (e) {
      console.error('Failed to save language:', e);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru }, en: { translation: en } },
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
