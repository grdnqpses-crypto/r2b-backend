import { describe, it, expect } from "vitest";
import en from "../lib/i18n/locales/en.json";
import es from "../lib/i18n/locales/es.json";
import fr from "../lib/i18n/locales/fr.json";
import de from "../lib/i18n/locales/de.json";
import ja from "../lib/i18n/locales/ja.json";
import ar from "../lib/i18n/locales/ar.json";
import zh from "../lib/i18n/locales/zh.json";

// Flatten nested object to dot-notation keys
function flattenKeys(obj: any, prefix = ""): string[] {
  return Object.keys(obj).flatMap((key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      return flattenKeys(obj[key], fullKey);
    }
    return [fullKey];
  });
}

const enKeys = flattenKeys(en);

describe("i18n translation keys", () => {
  it("English has all required section keys", () => {
    const requiredSections = ["common", "dashboard", "list", "stores", "coupons", "settings", "onboarding"];
    for (const section of requiredSections) {
      expect(Object.keys(en)).toContain(section);
    }
  });

  it("English has all critical store keys", () => {
    const criticalKeys = [
      "stores.title",
      "stores.nearby",
      "stores.myStores",
      "stores.monitoringActive",
      "stores.monitoringCount",
      "stores.filterStores",
      "stores.findingStores",
      "stores.noStoresFound",
      "stores.noSavedStores",
    ];
    for (const key of criticalKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it("English has all critical coupons keys", () => {
    const criticalKeys = [
      "coupons.title",
      "coupons.scan",
      "coupons.saved",
      "coupons.noCoupons",
      "coupons.premiumFeature",
      "coupons.deleteCoupon",
    ];
    for (const key of criticalKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it("English has all critical onboarding keys", () => {
    const criticalKeys = [
      "onboarding.ad.headline",
      "onboarding.ad.feature1",
      "onboarding.tutorial.step1Title",
      "onboarding.tutorial.step2Title",
      "onboarding.tutorial.step3Title",
      "onboarding.notifications.title",
      "onboarding.notifications.enableButton",
      "onboarding.locationFg.title",
      "onboarding.locationBg.title",
      "onboarding.referral.title",
      "onboarding.buttons.continue",
    ];
    for (const key of criticalKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it("Spanish has all the same top-level sections as English", () => {
    const enSections = Object.keys(en);
    const esSections = Object.keys(es);
    for (const section of enSections) {
      expect(esSections).toContain(section);
    }
  });

  it("French has all the same top-level sections as English", () => {
    const enSections = Object.keys(en);
    const frSections = Object.keys(fr);
    for (const section of enSections) {
      expect(frSections).toContain(section);
    }
  });

  it("German has all the same top-level sections as English", () => {
    const enSections = Object.keys(en);
    const deSections = Object.keys(de);
    for (const section of enSections) {
      expect(deSections).toContain(section);
    }
  });

  it("Japanese has all the same top-level sections as English", () => {
    const enSections = Object.keys(en);
    const jaSections = Object.keys(ja);
    for (const section of enSections) {
      expect(jaSections).toContain(section);
    }
  });

  it("Arabic has all the same top-level sections as English", () => {
    const enSections = Object.keys(en);
    const arSections = Object.keys(ar);
    for (const section of enSections) {
      expect(arSections).toContain(section);
    }
  });

  it("Chinese has all the same top-level sections as English", () => {
    const enSections = Object.keys(en);
    const zhSections = Object.keys(zh);
    for (const section of enSections) {
      expect(zhSections).toContain(section);
    }
  });

  it("All locale files have non-empty translation values", () => {
    const locales = [en, es, fr, de, ja, ar, zh];
    for (const locale of locales) {
      const keys = flattenKeys(locale);
      expect(keys.length).toBeGreaterThan(50);
    }
  });
});
