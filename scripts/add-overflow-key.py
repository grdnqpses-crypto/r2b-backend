"""
Add 'andXMore' key to the notifications section of all locale JSON files.
Uses i18next plural interpolation: {{count}} is the number of extra items.
"""
import json
import os
import glob

# Per-language "and X more" translations
# i18next uses {{count}} for the number
translations = {
    "en": "and {{count}} more",
    "es": "y {{count}} más",
    "fr": "et {{count}} de plus",
    "de": "und {{count}} weitere",
    "pt": "e mais {{count}}",
    "it": "e altri {{count}}",
    "nl": "en {{count}} meer",
    "ru": "и ещё {{count}}",
    "ja": "他{{count}}件",
    "ko": "외 {{count}}개 더",
    "zh": "还有{{count}}项",
    "ar": "و{{count}} أخرى",
    "hi": "और {{count}} और",
    "tr": "ve {{count}} daha",
    "pl": "i {{count}} więcej",
    "sv": "och {{count}} till",
    "id": "dan {{count}} lagi",
    "th": "และอีก {{count}} รายการ",
    "vi": "và {{count}} nữa",
    "el": "και {{count}} ακόμα",
    "he": "ועוד {{count}}",
}

locale_dir = "lib/i18n/locales"
locale_files = sorted(glob.glob(os.path.join(locale_dir, "*.json")))

updated = 0
for filepath in locale_files:
    lang = os.path.basename(filepath).replace(".json", "")
    if lang not in translations:
        print(f"  SKIP {lang}")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "notifications" not in data:
        data["notifications"] = {}

    if "andXMore" not in data["notifications"]:
        data["notifications"]["andXMore"] = translations[lang]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"  UPDATED {lang}")
        updated += 1
    else:
        print(f"  OK      {lang} (already has key)")

print(f"\nDone — updated {updated} locale files.")
