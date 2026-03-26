#!/usr/bin/env python3
"""Add missing stores translation keys to all locale files."""
import json, os

LOCALES_DIR = "/home/ubuntu/belief-field-detector/lib/i18n/locales"

STORES_ADDITIONS = {
    "en": {
        "monitoringActive": "Monitoring active",
        "monitoringCount": "Monitoring {{count}} of {{max}} stores",
        "filterStores": "Filter stores...",
        "sort": "Sort",
        "nearestFirst": "Nearest first",
        "findingStores": "Finding stores near you...",
        "locationError": "Could not get your location. Please try again.",
        "networkError": "Could not reach the store database. Please check your internet connection and try again.",
        "noStoresFound": "No stores found nearby",
        "noStoresFoundDesc": "Pull down to refresh or try in a different area.",
    },
    "es": {
        "monitoringActive": "Monitoreo activo",
        "monitoringCount": "Monitoreando {{count}} de {{max}} tiendas",
        "filterStores": "Filtrar tiendas...",
        "sort": "Ordenar",
        "nearestFirst": "Más cercano primero",
        "findingStores": "Buscando tiendas cercanas...",
        "locationError": "No se pudo obtener tu ubicación. Por favor intenta de nuevo.",
        "networkError": "No se pudo conectar a la base de datos de tiendas. Verifica tu conexión a internet.",
        "noStoresFound": "No se encontraron tiendas cercanas",
        "noStoresFoundDesc": "Desliza hacia abajo para actualizar o intenta en otra área.",
    },
    "fr": {
        "monitoringActive": "Surveillance active",
        "monitoringCount": "Surveillance de {{count}} sur {{max}} magasins",
        "filterStores": "Filtrer les magasins...",
        "sort": "Trier",
        "nearestFirst": "Le plus proche d'abord",
        "findingStores": "Recherche de magasins à proximité...",
        "locationError": "Impossible d'obtenir votre position. Veuillez réessayer.",
        "networkError": "Impossible d'accéder à la base de données des magasins. Vérifiez votre connexion internet.",
        "noStoresFound": "Aucun magasin trouvé à proximité",
        "noStoresFoundDesc": "Tirez vers le bas pour actualiser ou essayez dans une autre zone.",
    },
    "de": {
        "monitoringActive": "Überwachung aktiv",
        "monitoringCount": "Überwache {{count}} von {{max}} Geschäften",
        "filterStores": "Geschäfte filtern...",
        "sort": "Sortieren",
        "nearestFirst": "Nächste zuerst",
        "findingStores": "Suche nach Geschäften in der Nähe...",
        "locationError": "Standort konnte nicht ermittelt werden. Bitte erneut versuchen.",
        "networkError": "Verbindung zur Geschäftsdatenbank nicht möglich. Bitte Internetverbindung prüfen.",
        "noStoresFound": "Keine Geschäfte in der Nähe gefunden",
        "noStoresFoundDesc": "Nach unten ziehen zum Aktualisieren oder in einem anderen Bereich versuchen.",
    },
    "pt": {
        "monitoringActive": "Monitoramento ativo",
        "monitoringCount": "Monitorando {{count}} de {{max}} lojas",
        "filterStores": "Filtrar lojas...",
        "sort": "Ordenar",
        "nearestFirst": "Mais próximo primeiro",
        "findingStores": "Encontrando lojas próximas...",
        "locationError": "Não foi possível obter sua localização. Por favor, tente novamente.",
        "networkError": "Não foi possível acessar o banco de dados de lojas. Verifique sua conexão com a internet.",
        "noStoresFound": "Nenhuma loja encontrada próxima",
        "noStoresFoundDesc": "Puxe para baixo para atualizar ou tente em outra área.",
    },
    "it": {
        "monitoringActive": "Monitoraggio attivo",
        "monitoringCount": "Monitoraggio di {{count}} su {{max}} negozi",
        "filterStores": "Filtra negozi...",
        "sort": "Ordina",
        "nearestFirst": "Più vicino prima",
        "findingStores": "Ricerca negozi vicini...",
        "locationError": "Impossibile ottenere la posizione. Riprova.",
        "networkError": "Impossibile raggiungere il database dei negozi. Controlla la connessione internet.",
        "noStoresFound": "Nessun negozio trovato nelle vicinanze",
        "noStoresFoundDesc": "Trascina verso il basso per aggiornare o prova in un'altra area.",
    },
    "ja": {
        "monitoringActive": "監視中",
        "monitoringCount": "{{max}}店舗中{{count}}店舗を監視中",
        "filterStores": "店舗を絞り込む...",
        "sort": "並び替え",
        "nearestFirst": "近い順",
        "findingStores": "近くの店舗を検索中...",
        "locationError": "位置情報を取得できませんでした。もう一度お試しください。",
        "networkError": "店舗データベースに接続できませんでした。インターネット接続を確認してください。",
        "noStoresFound": "近くに店舗が見つかりません",
        "noStoresFoundDesc": "下にスワイプして更新するか、別のエリアで試してください。",
    },
    "ko": {
        "monitoringActive": "모니터링 중",
        "monitoringCount": "{{max}}개 중 {{count}}개 매장 모니터링 중",
        "filterStores": "매장 필터...",
        "sort": "정렬",
        "nearestFirst": "가까운 순",
        "findingStores": "근처 매장 찾는 중...",
        "locationError": "위치를 가져올 수 없습니다. 다시 시도해주세요.",
        "networkError": "매장 데이터베이스에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.",
        "noStoresFound": "근처에 매장이 없습니다",
        "noStoresFoundDesc": "아래로 당겨 새로고침하거나 다른 지역에서 시도해보세요.",
    },
    "zh": {
        "monitoringActive": "监控中",
        "monitoringCount": "正在监控{{max}}家中的{{count}}家商店",
        "filterStores": "筛选商店...",
        "sort": "排序",
        "nearestFirst": "最近优先",
        "findingStores": "正在寻找附近商店...",
        "locationError": "无法获取您的位置，请重试。",
        "networkError": "无法连接到商店数据库，请检查您的网络连接。",
        "noStoresFound": "附近没有找到商店",
        "noStoresFoundDesc": "下拉刷新或在其他区域尝试。",
    },
    "ar": {
        "monitoringActive": "المراقبة نشطة",
        "monitoringCount": "مراقبة {{count}} من {{max}} متاجر",
        "filterStores": "تصفية المتاجر...",
        "sort": "ترتيب",
        "nearestFirst": "الأقرب أولاً",
        "findingStores": "البحث عن متاجر قريبة...",
        "locationError": "تعذر الحصول على موقعك. يرجى المحاولة مرة أخرى.",
        "networkError": "تعذر الوصول إلى قاعدة بيانات المتاجر. يرجى التحقق من اتصالك بالإنترنت.",
        "noStoresFound": "لم يتم العثور على متاجر قريبة",
        "noStoresFoundDesc": "اسحب للأسفل للتحديث أو جرب في منطقة مختلفة.",
    },
    "hi": {
        "monitoringActive": "निगरानी सक्रिय",
        "monitoringCount": "{{max}} में से {{count}} स्टोर की निगरानी",
        "filterStores": "स्टोर फ़िल्टर करें...",
        "sort": "क्रमबद्ध करें",
        "nearestFirst": "सबसे पास पहले",
        "findingStores": "पास के स्टोर खोज रहे हैं...",
        "locationError": "आपका स्थान नहीं मिल सका। कृपया पुनः प्रयास करें।",
        "networkError": "स्टोर डेटाबेस से कनेक्ट नहीं हो सका। अपना इंटरनेट कनेक्शन जांचें।",
        "noStoresFound": "पास में कोई स्टोर नहीं मिला",
        "noStoresFoundDesc": "ताज़ा करने के लिए नीचे खींचें या किसी अन्य क्षेत्र में प्रयास करें।",
    },
    "ru": {
        "monitoringActive": "Мониторинг активен",
        "monitoringCount": "Мониторинг {{count}} из {{max}} магазинов",
        "filterStores": "Фильтр магазинов...",
        "sort": "Сортировка",
        "nearestFirst": "Ближайшие сначала",
        "findingStores": "Поиск ближайших магазинов...",
        "locationError": "Не удалось получить ваше местоположение. Попробуйте ещё раз.",
        "networkError": "Не удалось подключиться к базе данных магазинов. Проверьте интернет-соединение.",
        "noStoresFound": "Магазины поблизости не найдены",
        "noStoresFoundDesc": "Потяните вниз для обновления или попробуйте в другом районе.",
    },
    "tr": {
        "monitoringActive": "İzleme aktif",
        "monitoringCount": "{{max}} mağazadan {{count}} tanesi izleniyor",
        "filterStores": "Mağazaları filtrele...",
        "sort": "Sırala",
        "nearestFirst": "En yakın önce",
        "findingStores": "Yakındaki mağazalar aranıyor...",
        "locationError": "Konumunuz alınamadı. Lütfen tekrar deneyin.",
        "networkError": "Mağaza veritabanına bağlanılamadı. İnternet bağlantınızı kontrol edin.",
        "noStoresFound": "Yakında mağaza bulunamadı",
        "noStoresFoundDesc": "Yenilemek için aşağı çekin veya farklı bir bölgede deneyin.",
    },
    "pl": {
        "monitoringActive": "Monitorowanie aktywne",
        "monitoringCount": "Monitorowanie {{count}} z {{max}} sklepów",
        "filterStores": "Filtruj sklepy...",
        "sort": "Sortuj",
        "nearestFirst": "Najbliższe pierwsze",
        "findingStores": "Wyszukiwanie pobliskich sklepów...",
        "locationError": "Nie można uzyskać Twojej lokalizacji. Spróbuj ponownie.",
        "networkError": "Nie można połączyć się z bazą danych sklepów. Sprawdź połączenie internetowe.",
        "noStoresFound": "Nie znaleziono sklepów w pobliżu",
        "noStoresFoundDesc": "Przesuń w dół, aby odświeżyć lub spróbuj w innym obszarze.",
    },
    "sv": {
        "monitoringActive": "Övervakning aktiv",
        "monitoringCount": "Övervakar {{count}} av {{max}} butiker",
        "filterStores": "Filtrera butiker...",
        "sort": "Sortera",
        "nearestFirst": "Närmast först",
        "findingStores": "Söker efter butiker i närheten...",
        "locationError": "Kunde inte hämta din plats. Försök igen.",
        "networkError": "Kunde inte nå butiksdatabasen. Kontrollera din internetanslutning.",
        "noStoresFound": "Inga butiker hittades i närheten",
        "noStoresFoundDesc": "Dra nedåt för att uppdatera eller försök i ett annat område.",
    },
    "nl": {
        "monitoringActive": "Bewaking actief",
        "monitoringCount": "Bewaking van {{count}} van {{max}} winkels",
        "filterStores": "Winkels filteren...",
        "sort": "Sorteren",
        "nearestFirst": "Dichtstbijzijnde eerst",
        "findingStores": "Winkels in de buurt zoeken...",
        "locationError": "Kon uw locatie niet ophalen. Probeer het opnieuw.",
        "networkError": "Kon de winkelsdatabase niet bereiken. Controleer uw internetverbinding.",
        "noStoresFound": "Geen winkels gevonden in de buurt",
        "noStoresFoundDesc": "Trek naar beneden om te vernieuwen of probeer in een ander gebied.",
    },
    "id": {
        "monitoringActive": "Pemantauan aktif",
        "monitoringCount": "Memantau {{count}} dari {{max}} toko",
        "filterStores": "Filter toko...",
        "sort": "Urutkan",
        "nearestFirst": "Terdekat dulu",
        "findingStores": "Mencari toko di sekitar...",
        "locationError": "Tidak dapat mengambil lokasi Anda. Silakan coba lagi.",
        "networkError": "Tidak dapat terhubung ke database toko. Periksa koneksi internet Anda.",
        "noStoresFound": "Tidak ada toko ditemukan di sekitar",
        "noStoresFoundDesc": "Tarik ke bawah untuk menyegarkan atau coba di area lain.",
    },
    "th": {
        "monitoringActive": "กำลังติดตาม",
        "monitoringCount": "กำลังติดตาม {{count}} จาก {{max}} ร้านค้า",
        "filterStores": "กรองร้านค้า...",
        "sort": "เรียงลำดับ",
        "nearestFirst": "ใกล้ที่สุดก่อน",
        "findingStores": "กำลังค้นหาร้านค้าใกล้เคียง...",
        "locationError": "ไม่สามารถรับตำแหน่งของคุณได้ กรุณาลองอีกครั้ง",
        "networkError": "ไม่สามารถเชื่อมต่อฐานข้อมูลร้านค้าได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
        "noStoresFound": "ไม่พบร้านค้าในบริเวณใกล้เคียง",
        "noStoresFoundDesc": "ดึงลงเพื่อรีเฟรชหรือลองในพื้นที่อื่น",
    },
    "vi": {
        "monitoringActive": "Đang theo dõi",
        "monitoringCount": "Đang theo dõi {{count}} trong {{max}} cửa hàng",
        "filterStores": "Lọc cửa hàng...",
        "sort": "Sắp xếp",
        "nearestFirst": "Gần nhất trước",
        "findingStores": "Đang tìm cửa hàng gần bạn...",
        "locationError": "Không thể lấy vị trí của bạn. Vui lòng thử lại.",
        "networkError": "Không thể kết nối cơ sở dữ liệu cửa hàng. Kiểm tra kết nối internet của bạn.",
        "noStoresFound": "Không tìm thấy cửa hàng gần đây",
        "noStoresFoundDesc": "Kéo xuống để làm mới hoặc thử ở khu vực khác.",
    },
    "el": {
        "monitoringActive": "Παρακολούθηση ενεργή",
        "monitoringCount": "Παρακολούθηση {{count}} από {{max}} καταστήματα",
        "filterStores": "Φιλτράρισμα καταστημάτων...",
        "sort": "Ταξινόμηση",
        "nearestFirst": "Πλησιέστερο πρώτα",
        "findingStores": "Εύρεση καταστημάτων κοντά σας...",
        "locationError": "Δεν ήταν δυνατή η λήψη της τοποθεσίας σας. Παρακαλώ δοκιμάστε ξανά.",
        "networkError": "Δεν ήταν δυνατή η σύνδεση με τη βάση δεδομένων καταστημάτων. Ελέγξτε τη σύνδεσή σας.",
        "noStoresFound": "Δεν βρέθηκαν καταστήματα κοντά",
        "noStoresFoundDesc": "Τραβήξτε προς τα κάτω για ανανέωση ή δοκιμάστε σε διαφορετική περιοχή.",
    },
    "he": {
        "monitoringActive": "מעקב פעיל",
        "monitoringCount": "מעקב אחר {{count}} מתוך {{max}} חנויות",
        "filterStores": "סנן חנויות...",
        "sort": "מיין",
        "nearestFirst": "הקרוב ביותר ראשון",
        "findingStores": "מחפש חנויות בקרבת מקום...",
        "locationError": "לא ניתן לקבל את מיקומך. אנא נסה שוב.",
        "networkError": "לא ניתן להתחבר למסד הנתונים של החנויות. בדוק את חיבור האינטרנט שלך.",
        "noStoresFound": "לא נמצאו חנויות בקרבת מקום",
        "noStoresFoundDesc": "משוך למטה לרענון או נסה באזור אחר.",
    },
}

def update_locale_file(lang_code, stores_additions):
    filepath = os.path.join(LOCALES_DIR, f"{lang_code}.json")
    if not os.path.exists(filepath):
        print(f"  SKIP: {filepath} not found")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "stores" not in data:
        data["stores"] = {}

    additions = stores_additions.get(lang_code, stores_additions.get("en", {}))
    for key, value in additions.items():
        data["stores"][key] = value

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"  Updated: {lang_code}.json")

locale_files = [f.replace(".json", "") for f in os.listdir(LOCALES_DIR) if f.endswith(".json")]
print(f"Found {len(locale_files)} locale files")

for lang in locale_files:
    update_locale_file(lang, STORES_ADDITIONS)

print("\nDone!")
