export interface StoreChain {
  id: string;
  name: string;
  category: string;
}

export const STORE_CATEGORIES = [
  "Grocery",
  "Pharmacy",
  "Home Improvement",
  "Electronics",
  "Clothing",
  "Department Store",
  "Warehouse Club",
  "Gas Station",
  "Dollar Store",
  "Pet Store",
  "Office Supply",
  "Auto Parts",
  "Sporting Goods",
  "Craft & Hobby",
  "Furniture",
  "Bookstore",
  "Convenience",
  "Health & Wellness",
  "Fast Food",
  "Coffee",
  "Other",
] as const;

export const STORE_CHAINS: StoreChain[] = [
  // Grocery
  { id: "walmart", name: "Walmart", category: "Grocery" },
  { id: "target", name: "Target", category: "Grocery" },
  { id: "kroger", name: "Kroger", category: "Grocery" },
  { id: "safeway", name: "Safeway", category: "Grocery" },
  { id: "publix", name: "Publix", category: "Grocery" },
  { id: "heb", name: "H-E-B", category: "Grocery" },
  { id: "whole-foods", name: "Whole Foods Market", category: "Grocery" },
  { id: "trader-joes", name: "Trader Joe's", category: "Grocery" },
  { id: "aldi", name: "ALDI", category: "Grocery" },
  { id: "lidl", name: "Lidl", category: "Grocery" },
  { id: "meijer", name: "Meijer", category: "Grocery" },
  { id: "stop-shop", name: "Stop & Shop", category: "Grocery" },
  { id: "giant", name: "Giant Food", category: "Grocery" },
  { id: "food-lion", name: "Food Lion", category: "Grocery" },
  { id: "winn-dixie", name: "Winn-Dixie", category: "Grocery" },
  { id: "sprouts", name: "Sprouts Farmers Market", category: "Grocery" },
  { id: "wegmans", name: "Wegmans", category: "Grocery" },
  { id: "harris-teeter", name: "Harris Teeter", category: "Grocery" },
  { id: "vons", name: "Vons", category: "Grocery" },
  { id: "ralphs", name: "Ralphs", category: "Grocery" },
  { id: "frys", name: "Fry's Food Stores", category: "Grocery" },
  { id: "king-soopers", name: "King Soopers", category: "Grocery" },
  { id: "smiths", name: "Smith's Food & Drug", category: "Grocery" },
  { id: "fred-meyer", name: "Fred Meyer", category: "Grocery" },
  { id: "qfc", name: "QFC", category: "Grocery" },
  { id: "market-basket", name: "Market Basket", category: "Grocery" },
  { id: "price-chopper", name: "Price Chopper", category: "Grocery" },
  { id: "shoprite", name: "ShopRite", category: "Grocery" },
  { id: "acme", name: "ACME Markets", category: "Grocery" },
  { id: "jewel-osco", name: "Jewel-Osco", category: "Grocery" },
  { id: "albertsons", name: "Albertsons", category: "Grocery" },
  { id: "stater-bros", name: "Stater Bros.", category: "Grocery" },
  { id: "winco", name: "WinCo Foods", category: "Grocery" },
  { id: "save-mart", name: "Save Mart", category: "Grocery" },
  { id: "lucky", name: "Lucky Supermarkets", category: "Grocery" },
  { id: "fiesta-mart", name: "Fiesta Mart", category: "Grocery" },
  { id: "ingles", name: "Ingles Markets", category: "Grocery" },
  { id: "brookshire", name: "Brookshire's", category: "Grocery" },
  { id: "piggly-wiggly", name: "Piggly Wiggly", category: "Grocery" },
  { id: "bi-lo", name: "BI-LO", category: "Grocery" },

  // Pharmacy
  { id: "cvs", name: "CVS Pharmacy", category: "Pharmacy" },
  { id: "walgreens", name: "Walgreens", category: "Pharmacy" },
  { id: "rite-aid", name: "Rite Aid", category: "Pharmacy" },
  { id: "duane-reade", name: "Duane Reade", category: "Pharmacy" },

  // Home Improvement
  { id: "home-depot", name: "The Home Depot", category: "Home Improvement" },
  { id: "lowes", name: "Lowe's", category: "Home Improvement" },
  { id: "menards", name: "Menards", category: "Home Improvement" },
  { id: "ace-hardware", name: "Ace Hardware", category: "Home Improvement" },
  { id: "true-value", name: "True Value", category: "Home Improvement" },
  { id: "do-it-best", name: "Do it Best", category: "Home Improvement" },

  // Electronics
  { id: "best-buy", name: "Best Buy", category: "Electronics" },
  { id: "apple-store", name: "Apple Store", category: "Electronics" },
  { id: "microsoft-store", name: "Microsoft Store", category: "Electronics" },
  { id: "gamestop", name: "GameStop", category: "Electronics" },

  // Clothing
  { id: "gap", name: "Gap", category: "Clothing" },
  { id: "old-navy", name: "Old Navy", category: "Clothing" },
  { id: "banana-republic", name: "Banana Republic", category: "Clothing" },
  { id: "hm", name: "H&M", category: "Clothing" },
  { id: "zara", name: "Zara", category: "Clothing" },
  { id: "uniqlo", name: "Uniqlo", category: "Clothing" },
  { id: "forever-21", name: "Forever 21", category: "Clothing" },
  { id: "express", name: "Express", category: "Clothing" },
  { id: "american-eagle", name: "American Eagle", category: "Clothing" },
  { id: "abercrombie", name: "Abercrombie & Fitch", category: "Clothing" },
  { id: "hollister", name: "Hollister", category: "Clothing" },
  { id: "urban-outfitters", name: "Urban Outfitters", category: "Clothing" },
  { id: "anthropologie", name: "Anthropologie", category: "Clothing" },
  { id: "free-people", name: "Free People", category: "Clothing" },
  { id: "jcrew", name: "J.Crew", category: "Clothing" },
  { id: "madewell", name: "Madewell", category: "Clothing" },
  { id: "lululemon", name: "lululemon", category: "Clothing" },
  { id: "nike", name: "Nike", category: "Clothing" },
  { id: "adidas", name: "Adidas", category: "Clothing" },
  { id: "under-armour", name: "Under Armour", category: "Clothing" },
  { id: "tj-maxx", name: "T.J. Maxx", category: "Clothing" },
  { id: "marshalls", name: "Marshalls", category: "Clothing" },
  { id: "ross", name: "Ross Dress for Less", category: "Clothing" },
  { id: "burlington", name: "Burlington", category: "Clothing" },
  { id: "nordstrom-rack", name: "Nordstrom Rack", category: "Clothing" },

  // Department Store
  { id: "macys", name: "Macy's", category: "Department Store" },
  { id: "nordstrom", name: "Nordstrom", category: "Department Store" },
  { id: "kohls", name: "Kohl's", category: "Department Store" },
  { id: "jcpenney", name: "JCPenney", category: "Department Store" },
  { id: "sears", name: "Sears", category: "Department Store" },
  { id: "bloomingdales", name: "Bloomingdale's", category: "Department Store" },
  { id: "neiman-marcus", name: "Neiman Marcus", category: "Department Store" },
  { id: "saks", name: "Saks Fifth Avenue", category: "Department Store" },

  // Warehouse Club
  { id: "costco", name: "Costco", category: "Warehouse Club" },
  { id: "sams-club", name: "Sam's Club", category: "Warehouse Club" },
  { id: "bjs", name: "BJ's Wholesale Club", category: "Warehouse Club" },

  // Gas Station
  { id: "shell", name: "Shell", category: "Gas Station" },
  { id: "bp", name: "BP", category: "Gas Station" },
  { id: "chevron", name: "Chevron", category: "Gas Station" },
  { id: "exxon", name: "Exxon", category: "Gas Station" },
  { id: "mobil", name: "Mobil", category: "Gas Station" },
  { id: "sunoco", name: "Sunoco", category: "Gas Station" },
  { id: "marathon", name: "Marathon", category: "Gas Station" },
  { id: "speedway", name: "Speedway", category: "Gas Station" },
  { id: "circle-k", name: "Circle K", category: "Gas Station" },
  { id: "wawa", name: "Wawa", category: "Gas Station" },
  { id: "sheetz", name: "Sheetz", category: "Gas Station" },
  { id: "casey", name: "Casey's General Store", category: "Gas Station" },
  { id: "quiktrip", name: "QuikTrip", category: "Gas Station" },
  { id: "racetrac", name: "RaceTrac", category: "Gas Station" },
  { id: "pilot", name: "Pilot Flying J", category: "Gas Station" },
  { id: "loves", name: "Love's Travel Stops", category: "Gas Station" },

  // Dollar Store
  { id: "dollar-general", name: "Dollar General", category: "Dollar Store" },
  { id: "dollar-tree", name: "Dollar Tree", category: "Dollar Store" },
  { id: "family-dollar", name: "Family Dollar", category: "Dollar Store" },
  { id: "five-below", name: "Five Below", category: "Dollar Store" },

  // Pet Store
  { id: "petsmart", name: "PetSmart", category: "Pet Store" },
  { id: "petco", name: "Petco", category: "Pet Store" },
  { id: "pet-supplies-plus", name: "Pet Supplies Plus", category: "Pet Store" },

  // Office Supply
  { id: "staples", name: "Staples", category: "Office Supply" },
  { id: "office-depot", name: "Office Depot", category: "Office Supply" },
  { id: "officemax", name: "OfficeMax", category: "Office Supply" },

  // Auto Parts
  { id: "autozone", name: "AutoZone", category: "Auto Parts" },
  { id: "oreilly", name: "O'Reilly Auto Parts", category: "Auto Parts" },
  { id: "advance-auto", name: "Advance Auto Parts", category: "Auto Parts" },
  { id: "napa", name: "NAPA Auto Parts", category: "Auto Parts" },
  { id: "pep-boys", name: "Pep Boys", category: "Auto Parts" },

  // Sporting Goods
  { id: "dicks", name: "Dick's Sporting Goods", category: "Sporting Goods" },
  { id: "academy", name: "Academy Sports + Outdoors", category: "Sporting Goods" },
  { id: "rei", name: "REI", category: "Sporting Goods" },
  { id: "bass-pro", name: "Bass Pro Shops", category: "Sporting Goods" },
  { id: "cabelas", name: "Cabela's", category: "Sporting Goods" },
  { id: "big-5", name: "Big 5 Sporting Goods", category: "Sporting Goods" },

  // Craft & Hobby
  { id: "hobby-lobby", name: "Hobby Lobby", category: "Craft & Hobby" },
  { id: "michaels", name: "Michaels", category: "Craft & Hobby" },
  { id: "joann", name: "JOANN", category: "Craft & Hobby" },
  { id: "ac-moore", name: "AC Moore", category: "Craft & Hobby" },

  // Furniture
  { id: "ikea", name: "IKEA", category: "Furniture" },
  { id: "ashley", name: "Ashley HomeStore", category: "Furniture" },
  { id: "rooms-to-go", name: "Rooms To Go", category: "Furniture" },
  { id: "wayfair", name: "Wayfair (Local Pickup)", category: "Furniture" },
  { id: "pottery-barn", name: "Pottery Barn", category: "Furniture" },
  { id: "west-elm", name: "West Elm", category: "Furniture" },
  { id: "crate-barrel", name: "Crate & Barrel", category: "Furniture" },
  { id: "williams-sonoma", name: "Williams-Sonoma", category: "Furniture" },

  // Bookstore
  { id: "barnes-noble", name: "Barnes & Noble", category: "Bookstore" },
  { id: "half-price-books", name: "Half Price Books", category: "Bookstore" },

  // Convenience
  { id: "7-eleven", name: "7-Eleven", category: "Convenience" },
  { id: "ampm", name: "ampm", category: "Convenience" },
  { id: "kwik-trip", name: "Kwik Trip", category: "Convenience" },
  { id: "holiday", name: "Holiday Stationstores", category: "Convenience" },

  // Health & Wellness
  { id: "gnc", name: "GNC", category: "Health & Wellness" },
  { id: "vitamin-shoppe", name: "The Vitamin Shoppe", category: "Health & Wellness" },
  { id: "natural-grocers", name: "Natural Grocers", category: "Health & Wellness" },
  { id: "earth-fare", name: "Earth Fare", category: "Health & Wellness" },
  { id: "fresh-thyme", name: "Fresh Thyme Market", category: "Health & Wellness" },

  // Fast Food
  { id: "mcdonalds", name: "McDonald's", category: "Fast Food" },
  { id: "burger-king", name: "Burger King", category: "Fast Food" },
  { id: "wendys", name: "Wendy's", category: "Fast Food" },
  { id: "taco-bell", name: "Taco Bell", category: "Fast Food" },
  { id: "subway", name: "Subway", category: "Fast Food" },
  { id: "chick-fil-a", name: "Chick-fil-A", category: "Fast Food" },
  { id: "popeyes", name: "Popeyes", category: "Fast Food" },
  { id: "kfc", name: "KFC", category: "Fast Food" },
  { id: "pizza-hut", name: "Pizza Hut", category: "Fast Food" },
  { id: "dominos", name: "Domino's", category: "Fast Food" },
  { id: "papa-johns", name: "Papa John's", category: "Fast Food" },
  { id: "chipotle", name: "Chipotle", category: "Fast Food" },
  { id: "panera", name: "Panera Bread", category: "Fast Food" },
  { id: "five-guys", name: "Five Guys", category: "Fast Food" },
  { id: "shake-shack", name: "Shake Shack", category: "Fast Food" },
  { id: "in-n-out", name: "In-N-Out Burger", category: "Fast Food" },
  { id: "whataburger", name: "Whataburger", category: "Fast Food" },
  { id: "sonic", name: "Sonic Drive-In", category: "Fast Food" },
  { id: "arby", name: "Arby's", category: "Fast Food" },
  { id: "dairy-queen", name: "Dairy Queen", category: "Fast Food" },
  { id: "jack-in-box", name: "Jack in the Box", category: "Fast Food" },
  { id: "hardees", name: "Hardee's / Carl's Jr.", category: "Fast Food" },
  { id: "culvers", name: "Culver's", category: "Fast Food" },
  { id: "raising-canes", name: "Raising Cane's", category: "Fast Food" },
  { id: "wingstop", name: "Wingstop", category: "Fast Food" },
  { id: "zaxbys", name: "Zaxby's", category: "Fast Food" },
  { id: "bojangles", name: "Bojangles", category: "Fast Food" },

  // Coffee
  { id: "starbucks", name: "Starbucks", category: "Coffee" },
  { id: "dunkin", name: "Dunkin'", category: "Coffee" },
  { id: "dutch-bros", name: "Dutch Bros Coffee", category: "Coffee" },
  { id: "peets", name: "Peet's Coffee", category: "Coffee" },
  { id: "caribou", name: "Caribou Coffee", category: "Coffee" },
  { id: "tim-hortons", name: "Tim Hortons", category: "Coffee" },
  { id: "biggby", name: "Biggby Coffee", category: "Coffee" },
  { id: "scooters", name: "Scooter's Coffee", category: "Coffee" },

  // Other
  { id: "bed-bath-beyond", name: "Bed Bath & Beyond", category: "Other" },
  { id: "tuesday-morning", name: "Tuesday Morning", category: "Other" },
  { id: "world-market", name: "World Market", category: "Other" },
  { id: "bath-body-works", name: "Bath & Body Works", category: "Other" },
  { id: "victoria-secret", name: "Victoria's Secret", category: "Other" },
  { id: "sephora", name: "Sephora", category: "Other" },
  { id: "ulta", name: "Ulta Beauty", category: "Other" },
  { id: "sally-beauty", name: "Sally Beauty", category: "Other" },
  { id: "dollar-shave", name: "Dollar Shave Club", category: "Other" },
  { id: "costplus-world", name: "Cost Plus World Market", category: "Other" },
  { id: "tuesday-morning-2", name: "Tuesday Morning", category: "Other" },
  { id: "harbor-freight", name: "Harbor Freight Tools", category: "Other" },
  { id: "tractor-supply", name: "Tractor Supply Co.", category: "Other" },
  { id: "rural-king", name: "Rural King", category: "Other" },
  { id: "big-lots", name: "Big Lots", category: "Other" },
  { id: "ollie", name: "Ollie's Bargain Outlet", category: "Other" },
  { id: "tuesday-morning-3", name: "Grocery Outlet", category: "Grocery" },
  { id: "food-4-less", name: "Food 4 Less", category: "Grocery" },
  { id: "smart-final", name: "Smart & Final", category: "Grocery" },
  { id: "cardenas", name: "Cardenas Markets", category: "Grocery" },
  { id: "vallarta", name: "Vallarta Supermarkets", category: "Grocery" },
  { id: "el-super", name: "El Super", category: "Grocery" },
  { id: "compare-foods", name: "Compare Foods", category: "Grocery" },
  { id: "food-bazaar", name: "Food Bazaar", category: "Grocery" },
  { id: "key-food", name: "Key Food", category: "Grocery" },
  { id: "bravo-supermarkets", name: "Bravo Supermarkets", category: "Grocery" },
];

export function searchStores(query: string): StoreChain[] {
  const q = query.toLowerCase().trim();
  if (!q) return STORE_CHAINS;
  return STORE_CHAINS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
  );
}

export function getStoresByCategory(category: string): StoreChain[] {
  return STORE_CHAINS.filter((s) => s.category === category);
}

export function getStoreById(id: string): StoreChain | undefined {
  return STORE_CHAINS.find((s) => s.id === id);
}
