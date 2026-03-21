import React, { useEffect, useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, FlatList, Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface StoreChain {
  id: string;
  name: string;
  category: string;
}

interface SelectedStore {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

const STORE_CHAINS: StoreChain[] = [
  // Grocery
  { id: "walmart", name: "Walmart", category: "Grocery" },
  { id: "target", name: "Target", category: "Grocery" },
  { id: "kroger", name: "Kroger", category: "Grocery" },
  { id: "safeway", name: "Safeway", category: "Grocery" },
  { id: "publix", name: "Publix", category: "Grocery" },
  { id: "aldi", name: "ALDI", category: "Grocery" },
  { id: "lidl", name: "Lidl", category: "Grocery" },
  { id: "wholefoods", name: "Whole Foods Market", category: "Grocery" },
  { id: "traderjoes", name: "Trader Joe's", category: "Grocery" },
  { id: "heb", name: "H-E-B", category: "Grocery" },
  { id: "meijer", name: "Meijer", category: "Grocery" },
  { id: "wegmans", name: "Wegmans", category: "Grocery" },
  { id: "sprouts", name: "Sprouts Farmers Market", category: "Grocery" },
  { id: "costco", name: "Costco", category: "Grocery" },
  { id: "samsclub", name: "Sam's Club", category: "Grocery" },
  { id: "bjs", name: "BJ's Wholesale Club", category: "Grocery" },
  { id: "foodlion", name: "Food Lion", category: "Grocery" },
  { id: "stopshop", name: "Stop & Shop", category: "Grocery" },
  { id: "giantfood", name: "Giant Food", category: "Grocery" },
  { id: "albertsons", name: "Albertsons", category: "Grocery" },
  { id: "vons", name: "Vons", category: "Grocery" },
  { id: "jewel", name: "Jewel-Osco", category: "Grocery" },
  { id: "acme", name: "ACME Markets", category: "Grocery" },
  { id: "shaws", name: "Shaw's", category: "Grocery" },
  { id: "winco", name: "WinCo Foods", category: "Grocery" },
  { id: "ralphs", name: "Ralphs", category: "Grocery" },
  { id: "frys", name: "Fry's Food Stores", category: "Grocery" },
  { id: "smiths", name: "Smith's Food & Drug", category: "Grocery" },
  { id: "king_soopers", name: "King Soopers", category: "Grocery" },
  { id: "qfc", name: "QFC", category: "Grocery" },
  { id: "fred_meyer", name: "Fred Meyer", category: "Grocery" },
  { id: "harris_teeter", name: "Harris Teeter", category: "Grocery" },
  { id: "winn_dixie", name: "Winn-Dixie", category: "Grocery" },
  { id: "bi_lo", name: "BI-LO", category: "Grocery" },
  { id: "piggly_wiggly", name: "Piggly Wiggly", category: "Grocery" },
  { id: "iga", name: "IGA", category: "Grocery" },
  { id: "price_chopper", name: "Price Chopper", category: "Grocery" },
  { id: "market_basket", name: "Market Basket", category: "Grocery" },
  { id: "stater_bros", name: "Stater Bros.", category: "Grocery" },
  { id: "lucky", name: "Lucky Supermarkets", category: "Grocery" },
  { id: "save_mart", name: "Save Mart", category: "Grocery" },
  { id: "raley", name: "Raley's", category: "Grocery" },
  { id: "hannaford", name: "Hannaford", category: "Grocery" },
  { id: "giant_eagle", name: "Giant Eagle", category: "Grocery" },
  { id: "meijer2", name: "Meijer", category: "Grocery" },
  { id: "hy_vee", name: "Hy-Vee", category: "Grocery" },
  { id: "dillons", name: "Dillons", category: "Grocery" },
  { id: "bakers", name: "Baker's", category: "Grocery" },
  { id: "city_market", name: "City Market", category: "Grocery" },
  // Pharmacy
  { id: "cvs", name: "CVS Pharmacy", category: "Pharmacy" },
  { id: "walgreens", name: "Walgreens", category: "Pharmacy" },
  { id: "riteaid", name: "Rite Aid", category: "Pharmacy" },
  { id: "duane_reade", name: "Duane Reade", category: "Pharmacy" },
  // Big Box / Department
  { id: "kohl", name: "Kohl's", category: "Department" },
  { id: "macys", name: "Macy's", category: "Department" },
  { id: "jcpenney", name: "JCPenney", category: "Department" },
  { id: "nordstrom", name: "Nordstrom", category: "Department" },
  { id: "tjmaxx", name: "TJ Maxx", category: "Department" },
  { id: "marshalls", name: "Marshalls", category: "Department" },
  { id: "ross", name: "Ross Dress for Less", category: "Department" },
  { id: "burlington", name: "Burlington", category: "Department" },
  { id: "homegoods", name: "HomeGoods", category: "Department" },
  { id: "bedbath", name: "Bed Bath & Beyond", category: "Department" },
  { id: "sears", name: "Sears", category: "Department" },
  // Hardware / Home
  { id: "homedepot", name: "The Home Depot", category: "Hardware" },
  { id: "lowes", name: "Lowe's", category: "Hardware" },
  { id: "menards", name: "Menards", category: "Hardware" },
  { id: "acehardware", name: "Ace Hardware", category: "Hardware" },
  { id: "truevalue", name: "True Value", category: "Hardware" },
  // Electronics
  { id: "bestbuy", name: "Best Buy", category: "Electronics" },
  { id: "apple", name: "Apple Store", category: "Electronics" },
  { id: "microsoft", name: "Microsoft Store", category: "Electronics" },
  // Pet
  { id: "petsmart", name: "PetSmart", category: "Pet" },
  { id: "petco", name: "Petco", category: "Pet" },
  // Dollar / Discount
  { id: "dollartree", name: "Dollar Tree", category: "Discount" },
  { id: "dollargeneral", name: "Dollar General", category: "Discount" },
  { id: "familydollar", name: "Family Dollar", category: "Discount" },
  { id: "fivebelow", name: "Five Below", category: "Discount" },
  // Clothing / Apparel
  { id: "gap", name: "Gap", category: "Clothing" },
  { id: "oldnavy", name: "Old Navy", category: "Clothing" },
  { id: "hm", name: "H&M", category: "Clothing" },
  { id: "zara", name: "Zara", category: "Clothing" },
  { id: "forever21", name: "Forever 21", category: "Clothing" },
  { id: "express", name: "Express", category: "Clothing" },
  { id: "ae", name: "American Eagle", category: "Clothing" },
  { id: "hollister", name: "Hollister", category: "Clothing" },
  { id: "abercrombie", name: "Abercrombie & Fitch", category: "Clothing" },
  { id: "victoriassecret", name: "Victoria's Secret", category: "Clothing" },
  { id: "bath_body", name: "Bath & Body Works", category: "Clothing" },
  // Sporting Goods
  { id: "dicks", name: "Dick's Sporting Goods", category: "Sporting Goods" },
  { id: "academy", name: "Academy Sports", category: "Sporting Goods" },
  { id: "rei", name: "REI", category: "Sporting Goods" },
  // Craft / Hobby
  { id: "michaels", name: "Michaels", category: "Craft" },
  { id: "hobbylobby", name: "Hobby Lobby", category: "Craft" },
  { id: "joann", name: "Jo-Ann Fabric", category: "Craft" },
  // Office
  { id: "officedepot", name: "Office Depot", category: "Office" },
  { id: "staples", name: "Staples", category: "Office" },
  // Convenience
  { id: "7eleven", name: "7-Eleven", category: "Convenience" },
  { id: "circlek", name: "Circle K", category: "Convenience" },
  { id: "wawa", name: "Wawa", category: "Convenience" },
  { id: "sheetz", name: "Sheetz", category: "Convenience" },
  { id: "caseys", name: "Casey's General Store", category: "Convenience" },
];

const STORAGE_KEY = "@r2b_selected_stores";

export default function StoresScreen() {
  const colors = useColors();
  const [selectedStores, setSelectedStores] = useState<SelectedStore[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isPremium] = useState(false);

  const categories = useMemo(() => {
    const cats = ["All", ...Array.from(new Set(STORE_CHAINS.map((s) => s.category)))];
    return cats;
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) setSelectedStores(JSON.parse(v));
    });
  }, []);

  const save = async (updated: SelectedStore[]) => {
    setSelectedStores(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const isSelected = (id: string) => selectedStores.some((s) => s.id === id);

  const toggleStore = async (chain: StoreChain) => {
    if (isSelected(chain.id)) {
      await save(selectedStores.filter((s) => s.id !== chain.id));
    } else {
      if (!isPremium && selectedStores.length >= 1) {
        Alert.alert(
          "Free Tier Limit",
          "Free accounts can select 1 store. Upgrade to Premium for unlimited stores.",
          [{ text: "OK" }]
        );
        return;
      }
      await save([...selectedStores, { id: chain.id, name: chain.name }]);
    }
  };

  const filtered = useMemo(() => {
    return STORE_CHAINS.filter((s) => {
      const matchCat = activeCategory === "All" || s.category === activeCategory;
      const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>My Stores</Text>
        <Text style={styles.headerSub}>{selectedStores.length} store{selectedStores.length !== 1 ? "s" : ""} selected</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search stores..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, { borderColor: colors.border, backgroundColor: activeCategory === cat ? colors.primary : colors.surface }]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catChipText, { color: activeCategory === cat ? "#fff" : colors.foreground }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Store List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const selected = isSelected(item.id);
          return (
            <TouchableOpacity
              style={[styles.storeRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}
              onPress={() => toggleStore(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.storeName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.storeCat, { color: colors.muted }]}>{item.category}</Text>
              </View>
              <View style={[styles.selectBox, { borderColor: colors.primary, backgroundColor: selected ? colors.primary : "transparent" }]}>
                {selected && <IconSymbol name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {!isPremium && (
        <View style={[styles.premiumBanner, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
          <Text style={[styles.premiumText, { color: colors.primary }]}>
            Free: 1 store max. Upgrade to Premium for unlimited stores — $1.99/week
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  searchContainer: { flexDirection: "row", alignItems: "center", margin: 16, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  catScroll: { maxHeight: 44 },
  catContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  catChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  catChipText: { fontSize: 13, fontWeight: "600" },
  storeRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1.5, padding: 14, marginBottom: 8 },
  storeName: { fontSize: 15, fontWeight: "600" },
  storeCat: { fontSize: 12, marginTop: 2 },
  selectBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  premiumBanner: { margin: 16, borderRadius: 10, padding: 12, borderWidth: 1 },
  premiumText: { fontSize: 13, textAlign: "center", fontWeight: "600" },
});
