"""
Add testTitle, testBody, and channelName keys to the notifications section
of all locale JSON files.
"""
import json
import os
import glob

# Per-language translations for the new notification keys
translations = {
    "en": {
        "channelName": "Store Alerts",
        "testTitle": "🛒 Remember2Buy Test",
        "testBody": "Notifications are working! You'll be alerted near stores.",
    },
    "es": {
        "channelName": "Alertas de tiendas",
        "testTitle": "🛒 Prueba de Remember2Buy",
        "testBody": "¡Las notificaciones funcionan! Te avisaremos cerca de las tiendas.",
    },
    "fr": {
        "channelName": "Alertes de magasins",
        "testTitle": "🛒 Test Remember2Buy",
        "testBody": "Les notifications fonctionnent ! Vous serez alerté près des magasins.",
    },
    "de": {
        "channelName": "Geschäftswarnungen",
        "testTitle": "🛒 Remember2Buy Test",
        "testBody": "Benachrichtigungen funktionieren! Sie werden in der Nähe von Geschäften benachrichtigt.",
    },
    "pt": {
        "channelName": "Alertas de lojas",
        "testTitle": "🛒 Teste do Remember2Buy",
        "testBody": "As notificações estão funcionando! Você será alertado perto das lojas.",
    },
    "it": {
        "channelName": "Avvisi negozi",
        "testTitle": "🛒 Test Remember2Buy",
        "testBody": "Le notifiche funzionano! Sarai avvisato vicino ai negozi.",
    },
    "nl": {
        "channelName": "Winkelwaarschuwingen",
        "testTitle": "🛒 Remember2Buy Test",
        "testBody": "Meldingen werken! U wordt gewaarschuwd in de buurt van winkels.",
    },
    "ru": {
        "channelName": "Оповещения о магазинах",
        "testTitle": "🛒 Тест Remember2Buy",
        "testBody": "Уведомления работают! Вы получите оповещение рядом с магазинами.",
    },
    "ja": {
        "channelName": "店舗アラート",
        "testTitle": "🛒 Remember2Buyテスト",
        "testBody": "通知が機能しています！店舗の近くでアラートが届きます。",
    },
    "ko": {
        "channelName": "매장 알림",
        "testTitle": "🛒 Remember2Buy 테스트",
        "testBody": "알림이 작동합니다! 매장 근처에서 알림을 받게 됩니다.",
    },
    "zh": {
        "channelName": "商店提醒",
        "testTitle": "🛒 Remember2Buy 测试",
        "testBody": "通知正常工作！您将在商店附近收到提醒。",
    },
    "ar": {
        "channelName": "تنبيهات المتاجر",
        "testTitle": "🛒 اختبار Remember2Buy",
        "testBody": "الإشعارات تعمل! ستتلقى تنبيهاً عند الاقتراب من المتاجر.",
    },
    "hi": {
        "channelName": "स्टोर अलर्ट",
        "testTitle": "🛒 Remember2Buy परीक्षण",
        "testBody": "सूचनाएं काम कर रही हैं! स्टोर के पास आने पर आपको अलर्ट मिलेगा।",
    },
    "tr": {
        "channelName": "Mağaza Uyarıları",
        "testTitle": "🛒 Remember2Buy Testi",
        "testBody": "Bildirimler çalışıyor! Mağazaların yakınında uyarı alacaksınız.",
    },
    "pl": {
        "channelName": "Alerty sklepów",
        "testTitle": "🛒 Test Remember2Buy",
        "testBody": "Powiadomienia działają! Otrzymasz alert w pobliżu sklepów.",
    },
    "sv": {
        "channelName": "Butiksvarningar",
        "testTitle": "🛒 Remember2Buy Test",
        "testBody": "Aviseringar fungerar! Du kommer att få en varning nära butiker.",
    },
    "id": {
        "channelName": "Peringatan Toko",
        "testTitle": "🛒 Tes Remember2Buy",
        "testBody": "Notifikasi berfungsi! Anda akan diperingatkan di dekat toko.",
    },
    "th": {
        "channelName": "การแจ้งเตือนร้านค้า",
        "testTitle": "🛒 ทดสอบ Remember2Buy",
        "testBody": "การแจ้งเตือนทำงานแล้ว! คุณจะได้รับการแจ้งเตือนใกล้ร้านค้า",
    },
    "vi": {
        "channelName": "Cảnh báo cửa hàng",
        "testTitle": "🛒 Kiểm tra Remember2Buy",
        "testBody": "Thông báo đang hoạt động! Bạn sẽ được cảnh báo khi gần cửa hàng.",
    },
    "el": {
        "channelName": "Ειδοποιήσεις καταστημάτων",
        "testTitle": "🛒 Δοκιμή Remember2Buy",
        "testBody": "Οι ειδοποιήσεις λειτουργούν! Θα ειδοποιηθείτε κοντά σε καταστήματα.",
    },
    "he": {
        "channelName": "התראות חנויות",
        "testTitle": "🛒 בדיקת Remember2Buy",
        "testBody": "ההתראות עובדות! תקבל התראה ליד חנויות.",
    },
}

locale_dir = "lib/i18n/locales"
locale_files = sorted(glob.glob(os.path.join(locale_dir, "*.json")))

updated = 0
for filepath in locale_files:
    lang = os.path.basename(filepath).replace(".json", "")
    if lang not in translations:
        print(f"  SKIP {lang} — no translation provided")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "notifications" not in data:
        data["notifications"] = {}

    new_keys = translations[lang]
    changed = False
    for key, value in new_keys.items():
        if key not in data["notifications"]:
            data["notifications"][key] = value
            changed = True

    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"  UPDATED {lang}")
        updated += 1
    else:
        print(f"  OK      {lang} (already has all keys)")

print(f"\nDone — updated {updated} locale files.")
