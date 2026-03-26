import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import ru from "./locales/ru.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import zh from "./locales/zh.json";
import ar from "./locales/ar.json";
import hi from "./locales/hi.json";
import tr from "./locales/tr.json";
import pl from "./locales/pl.json";
import sv from "./locales/sv.json";
import id from "./locales/id.json";
import th from "./locales/th.json";
import vi from "./locales/vi.json";
import el from "./locales/el.json";
import he from "./locales/he.json";

// Get the device locale (e.g. "en-US", "fr-FR", "zh-Hans-CN")
const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      pt: { translation: pt },
      it: { translation: it },
      nl: { translation: nl },
      ru: { translation: ru },
      ja: { translation: ja },
      ko: { translation: ko },
      zh: { translation: zh },
      ar: { translation: ar },
      hi: { translation: hi },
      tr: { translation: tr },
      pl: { translation: pl },
      sv: { translation: sv },
      id: { translation: id },
      th: { translation: th },
      vi: { translation: vi },
      el: { translation: el },
      he: { translation: he },
    },
    lng: deviceLocale,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React Native handles escaping
    },
    compatibilityJSON: "v4",
  });

export default i18n;
export { i18n };
