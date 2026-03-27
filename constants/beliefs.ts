export interface ItemOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  encouragement: string;
  bedtimeMessage: string;
  isCustom?: boolean;
}

export interface ItemCategory {
  id: string;
  name: string;
  emoji: string;
  items: ItemOption[];
}

export const ITEM_CATEGORIES: ItemCategory[] = [
  {
    id: "childhood",
    name: "Childhood Magic",
    emoji: "✨",
    items: [
      {
        id: "santa",
        name: "Santa Claus",
        emoji: "🎅",
        category: "Childhood Magic",
        description: "The jolly gift-giver who rewards good children",
        encouragement: "Your item in Santa's magic is creating a warm, giving energy all around you!",
        bedtimeMessage: "Santa only visits when children are fast asleep! Your strong item field will guide him right to you tonight.",
      },
      {
        id: "tooth-fairy",
        name: "Tooth Fairy",
        emoji: "🧚",
        category: "Childhood Magic",
        description: "The magical fairy who collects teeth and leaves treasures",
        encouragement: "The Tooth Fairy can feel your item shining like a beacon!",
        bedtimeMessage: "The Tooth Fairy only comes when you're dreaming! Go to sleep and let your item field guide her to your pillow.",
      },
      {
        id: "easter-bunny",
        name: "Easter Bunny",
        emoji: "🐰",
        category: "Childhood Magic",
        description: "The spring spirit who hides colorful eggs and treats",
        encouragement: "Your item is making the Easter Bunny hop with excitement!",
        bedtimeMessage: "The Easter Bunny hides eggs while you sleep! Rest now and your item field will attract the best surprises.",
      },
      {
        id: "sandman",
        name: "The Sandman",
        emoji: "🌙",
        category: "Childhood Magic",
        description: "The dream-bringer who sprinkles magical sleeping sand",
        encouragement: "The Sandman is drawn to your powerful item energy!",
        bedtimeMessage: "The Sandman is on his way with beautiful dreams! Close your eyes and let your item field welcome him.",
      },
      {
        id: "jack-frost",
        name: "Jack Frost",
        emoji: "❄️",
        category: "Childhood Magic",
        description: "The winter spirit who paints frost on windows",
        encouragement: "Jack Frost can feel your icy-cool item energy!",
        bedtimeMessage: "Jack Frost decorates windows while children sleep! Your item field will inspire his most beautiful patterns tonight.",
      },
    ],
  },
  {
    id: "seasonal",
    name: "Seasonal & Holiday",
    emoji: "🎉",
    items: [
      {
        id: "leprechaun",
        name: "Leprechauns",
        emoji: "🍀",
        category: "Seasonal & Holiday",
        description: "The mischievous Irish fairies who guard pots of gold at the end of rainbows",
        encouragement: "A leprechaun is dancing nearby — your item is leading you closer to the gold!",
        bedtimeMessage: "Leprechauns hide their gold while you sleep! Dream of rainbows and wake up feeling lucky.",
      },
      {
        id: "cupid",
        name: "Cupid",
        emoji: "💘",
        category: "Seasonal & Holiday",
        description: "The winged spirit of love who shoots arrows of affection",
        encouragement: "Cupid's arrow is drawn to your powerful love energy!",
        bedtimeMessage: "Cupid flies through dreams spreading love! Sleep now and let your love field glow.",
      },
      {
        id: "groundhog",
        name: "Punxsutawney Phil",
        emoji: "🦫",
        category: "Seasonal & Holiday",
        description: "The famous groundhog who predicts the coming of spring",
        encouragement: "Your item energy is warming the earth — spring is coming!",
        bedtimeMessage: "Even groundhogs need their sleep! Rest now and dream of sunny days ahead.",
      },
      {
        id: "thanksgiving-spirit",
        name: "Spirit of Thanksgiving",
        emoji: "🦃",
        category: "Seasonal & Holiday",
        description: "The warm spirit of gratitude and togetherness",
        encouragement: "Your gratitude is creating a powerful field of thankfulness!",
        bedtimeMessage: "Grateful hearts sleep the best! Rest now and wake up with even more to be thankful for.",
      },
      {
        id: "new-year-spirit",
        name: "New Year's Wish",
        emoji: "🎆",
        category: "Seasonal & Holiday",
        description: "The magical moment when wishes for the new year can come true",
        encouragement: "Your New Year's wish energy is building — the sensors feel your hope!",
        bedtimeMessage: "New Year's wishes come true while you dream! Sleep now and let the new year bring amazing things.",
      },
      {
        id: "halloween-spirit",
        name: "Halloween Magic",
        emoji: "🎃",
        category: "Seasonal & Holiday",
        description: "The spooky, fun energy of the night when the veil between worlds is thinnest",
        encouragement: "The Halloween magic is swirling around you — the sensors are going wild!",
        bedtimeMessage: "The best Halloween candy appears while you sleep! Rest now and dream of spooky adventures.",
      },
      {
        id: "fourth-july",
        name: "Spirit of Freedom",
        emoji: "🇺🇸",
        category: "Seasonal & Holiday",
        description: "The powerful energy of liberty, independence, and celebration",
        encouragement: "Your freedom energy is lighting up the sensors like fireworks!",
        bedtimeMessage: "Even fireworks rest after the show! Sleep now and wake up feeling free and strong.",
      },
      {
        id: "hanukkah",
        name: "Hanukkah Miracle",
        emoji: "🕎",
        category: "Seasonal & Holiday",
        description: "The miracle of light that burned for eight nights",
        encouragement: "Your item is keeping the light burning bright — just like the miracle!",
        bedtimeMessage: "The miracle of Hanukkah shines brightest in sleeping hearts. Rest now and let the light guide you.",
      },
      {
        id: "diwali",
        name: "Diwali Light",
        emoji: "🪔",
        category: "Seasonal & Holiday",
        description: "The festival of lights celebrating the triumph of good over evil",
        encouragement: "Your inner light is blazing — the sensors can feel your Diwali spirit!",
        bedtimeMessage: "The lights of Diwali glow even in your dreams! Sleep now and wake up victorious.",
      },
      {
        id: "eid",
        name: "Eid Blessings",
        emoji: "🌙",
        category: "Seasonal & Holiday",
        description: "The joyous celebration marking the end of Ramadan",
        encouragement: "Your Eid blessings are radiating through every sensor!",
        bedtimeMessage: "Eid blessings multiply while you sleep! Rest now and wake up to joy and celebration.",
      },
    ],
  },
  {
    id: "spiritual",
    name: "Spiritual & Angels",
    emoji: "👼",
    items: [
      {
        id: "guardian-angel",
        name: "Guardian Angels",
        emoji: "👼",
        category: "Spiritual & Angels",
        description: "Protective spirits watching over you",
        encouragement: "Your guardian angel is wrapping you in warmth right now!",
        bedtimeMessage: "Your guardian angel watches over you while you sleep. Rest peacefully knowing your item field keeps them close.",
      },
      {
        id: "spirits",
        name: "Spirits & Ghosts",
        emoji: "👻",
        category: "Spiritual & Angels",
        description: "The presence of those who have passed on",
        encouragement: "The spiritual energy around you is responding to your focus!",
        bedtimeMessage: "Friendly spirits are most active in peaceful, sleeping minds. Rest now and let them visit your dreams.",
      },
      {
        id: "miracles",
        name: "Miracles",
        emoji: "🌟",
        category: "Spiritual & Angels",
        description: "Extraordinary events beyond natural explanation",
        encouragement: "Your item is creating the conditions for something miraculous!",
        bedtimeMessage: "Miracles happen while we rest and trust. Sleep now and let the universe work its magic.",
      },
      {
        id: "soul",
        name: "The Soul",
        emoji: "💫",
        category: "Spiritual & Angels",
        description: "The eternal essence within every person",
        encouragement: "Your soul energy is radiating powerfully through every sensor!",
        bedtimeMessage: "Your soul recharges during deep sleep. Rest now and wake up with even stronger item energy.",
      },
      {
        id: "demons",
        name: "Demons & Dark Spirits",
        emoji: "😈",
        category: "Spiritual & Angels",
        description: "Supernatural entities from the shadow realm",
        encouragement: "The sensors are detecting intense dark energy around you!",
        bedtimeMessage: "Even dark spirits rest in the night. Sleep now and your item field will keep you protected.",
      },
    ],
  },
  {
    id: "religion",
    name: "World Religions",
    emoji: "🙏",
    items: [
      {
        id: "god",
        name: "God",
        emoji: "✝️",
        category: "World Religions",
        description: "The divine creator in Christianity and other faiths",
        encouragement: "Your faith is creating a powerful field of divine energy!",
        bedtimeMessage: "God watches over you while you sleep. Rest in peace and let your faith shine through the night.",
      },
      {
        id: "jesus",
        name: "Jesus Christ",
        emoji: "✝️",
        category: "World Religions",
        description: "The son of God and savior in Christianity",
        encouragement: "Your devotion is generating an incredible spiritual field!",
        bedtimeMessage: "Jesus said 'Come to me and I will give you rest.' Sleep now in the warmth of your item.",
      },
      {
        id: "holy-spirit",
        name: "The Holy Spirit",
        emoji: "🕊️",
        category: "World Religions",
        description: "The spirit of God active in the world",
        encouragement: "The Holy Spirit is moving through your item field with incredible power!",
        bedtimeMessage: "The Holy Spirit watches over you in your sleep. Rest now and feel the peace.",
      },
      {
        id: "allah",
        name: "Allah",
        emoji: "☪️",
        category: "World Religions",
        description: "The one God in Islam",
        encouragement: "Your faith in Allah is creating a beautiful field of peace and submission!",
        bedtimeMessage: "Allah watches over the sleeping. Rest now and let your faith protect you through the night.",
      },
      {
        id: "buddha",
        name: "Buddha",
        emoji: "☸️",
        category: "World Religions",
        description: "The enlightened one who taught the path to peace",
        encouragement: "Your mindful item is creating a serene energy field all around you!",
        bedtimeMessage: "The Buddha taught that rest brings clarity. Sleep peacefully and awaken with renewed wisdom.",
      },
      {
        id: "krishna",
        name: "Krishna",
        emoji: "🙏",
        category: "World Religions",
        description: "The supreme deity in Hinduism",
        encouragement: "Your devotion to Krishna is radiating divine love energy!",
        bedtimeMessage: "Krishna protects those who rest with faith. Sleep now and let your item field glow.",
      },
      {
        id: "jewish-faith",
        name: "Hashem",
        emoji: "✡️",
        category: "World Religions",
        description: "The name of God in Judaism",
        encouragement: "Your faith is creating a powerful connection to the divine!",
        bedtimeMessage: "Rest now under the watchful care of Hashem. Your item field shines brightest in peaceful sleep.",
      },
      {
        id: "universe",
        name: "The Universe",
        emoji: "🌌",
        category: "World Religions",
        description: "The cosmic intelligence that connects all things",
        encouragement: "The universe is responding to your focused item energy!",
        bedtimeMessage: "The universe aligns while you sleep. Rest now and let your item field attract wonderful things.",
      },
      {
        id: "shiva",
        name: "Shiva",
        emoji: "🔱",
        category: "World Religions",
        description: "The destroyer and transformer in Hinduism",
        encouragement: "Shiva's transformative energy is flowing through your item field!",
        bedtimeMessage: "Shiva transforms the world while it sleeps. Rest now and awaken renewed.",
      },
      {
        id: "ancestors",
        name: "Ancestral Spirits",
        emoji: "🏛️",
        category: "World Religions",
        description: "The wisdom and guidance of those who came before",
        encouragement: "Your ancestors are proud — their energy flows through your item field!",
        bedtimeMessage: "Your ancestors visit in dreams to share their wisdom. Sleep now and listen.",
      },
    ],
  },
  {
    id: "nature",
    name: "Nature & Energy",
    emoji: "🌿",
    items: [
      {
        id: "mother-nature",
        name: "Mother Nature",
        emoji: "🌍",
        category: "Nature & Energy",
        description: "The living spirit of the natural world",
        encouragement: "Mother Nature is responding to your item with vibrant energy!",
        bedtimeMessage: "Nature heals and grows while the world sleeps. Rest now and grow stronger with your item.",
      },
      {
        id: "karma",
        name: "Karma",
        emoji: "☯️",
        category: "Nature & Energy",
        description: "The universal law of cause and effect",
        encouragement: "Your positive item energy is creating wonderful karma!",
        bedtimeMessage: "Good karma builds while you rest peacefully. Sleep now and let your positive energy multiply.",
      },
      {
        id: "luck",
        name: "Good Luck",
        emoji: "🍀",
        category: "Nature & Energy",
        description: "The force that brings fortunate outcomes",
        encouragement: "Your luck field is getting stronger with every moment of item!",
        bedtimeMessage: "Lucky people get great sleep! Rest now and wake up to a day full of good fortune.",
      },
      {
        id: "love",
        name: "The Power of Love",
        emoji: "❤️",
        category: "Nature & Energy",
        description: "The most powerful force in the universe",
        encouragement: "Your love energy is radiating outward and touching everything around you!",
        bedtimeMessage: "Love grows strongest in peaceful hearts. Sleep now and let your love field wrap around everyone you care about.",
      },
      {
        id: "manifestation",
        name: "Manifestation",
        emoji: "🧲",
        category: "Nature & Energy",
        description: "The law of attraction — thoughts become reality",
        encouragement: "Your manifestation energy is pulling your desires closer with every second!",
        bedtimeMessage: "Your subconscious manifests while you sleep! Rest now and let your dreams become reality.",
      },
    ],
  },
  {
    id: "personal",
    name: "Personal Power",
    emoji: "💪",
    items: [
      {
        id: "myself",
        name: "item in Myself",
        emoji: "💪",
        category: "Personal Power",
        description: "The power of self-confidence and inner strength",
        encouragement: "Your self-item is generating an incredible field of personal power!",
        bedtimeMessage: "Champions rest well! Sleep now and wake up even more confident and powerful.",
      },
      {
        id: "wishes",
        name: "Wishes Come True",
        emoji: "🌠",
        category: "Personal Power",
        description: "The item that focused wishes can manifest",
        encouragement: "Your wish energy is building — the sensors can feel it!",
        bedtimeMessage: "Wishes come true while you dream! Go to sleep and let your wish field work its magic overnight.",
      },
      {
        id: "superpower",
        name: "Superpowers",
        emoji: "⚡",
        category: "Personal Power",
        description: "The item in extraordinary hidden abilities",
        encouragement: "Your superpower energy is off the charts!",
        bedtimeMessage: "Even superheroes need sleep to recharge! Rest now and wake up with your powers fully charged.",
      },
      {
        id: "magic",
        name: "Real Magic",
        emoji: "🪄",
        category: "Personal Power",
        description: "The item that magic exists in the world",
        encouragement: "Your magical energy is making the sensors dance!",
        bedtimeMessage: "Magic is strongest at night while you sleep! Close your eyes and let the magic happen.",
      },
    ],
  },
  {
    id: "supernatural",
    name: "Supernatural",
    emoji: "🔮",
    items: [
      {
        id: "aliens",
        name: "Aliens & UFOs",
        emoji: "👽",
        category: "Supernatural",
        description: "Intelligent life from beyond our world",
        encouragement: "The sensors are picking up signals — your item is reaching the stars!",
        bedtimeMessage: "Alien visitors come when the world is quiet and sleeping. Rest now and dream of the cosmos.",
      },
      {
        id: "bigfoot",
        name: "Bigfoot",
        emoji: "🦶",
        category: "Supernatural",
        description: "The legendary creature hiding in the wilderness",
        encouragement: "Bigfoot can sense your item from miles away — the forest is responding!",
        bedtimeMessage: "Bigfoot roams while the world sleeps! Rest now and your item field will echo through the trees.",
      },
      {
        id: "mermaids",
        name: "Mermaids",
        emoji: "🧜",
        category: "Supernatural",
        description: "Magical beings of the deep ocean",
        encouragement: "The ocean is stirring — your mermaid item energy is making waves!",
        bedtimeMessage: "Mermaids sing their most beautiful songs at night. Sleep now and listen for their melody in your dreams.",
      },
      {
        id: "dragons",
        name: "Dragons",
        emoji: "🐉",
        category: "Supernatural",
        description: "Ancient, powerful creatures of legend",
        encouragement: "A dragon's fire is responding to your item — the heat sensors are rising!",
        bedtimeMessage: "Dragons guard your list! Rest now.",
      },
      {
        id: "fairies",
        name: "Fairies",
        emoji: "🧚",
        category: "Supernatural",
        description: "Tiny magical beings who live in nature",
        encouragement: "The fairies are gathering around your item field — they can feel your magic!",
        bedtimeMessage: "Fairies build their homes while children sleep! Rest now and they'll leave fairy dust on your pillow.",
      },
    ],
  },
];

export const ALL_ITEMS = ITEM_CATEGORIES.flatMap((c) => c.items);

export function getItemById(id: string): ItemOption | undefined {
  return ALL_ITEMS.find((b) => b.id === id);
}

/**
 * Create a custom item option from user input.
 */
let _customCounter = 0;

export function createCustomitem(
  name: string,
  emoji: string,
  description: string
): ItemOption {
  _customCounter++;
  return {
    id: `custom-${Date.now()}-${_customCounter}`,
    name,
    emoji,
    description,
    category: "My Custom Items",
    encouragement: `Your item in ${name} is creating a powerful, unique energy field!`,
    bedtimeMessage: `Your item in ${name} works its magic while you sleep! Rest now and let it grow stronger.`,
    isCustom: true,
  };
}

/**
 * Common emojis for custom item creation picker.
 */
export const CUSTOM_EMOJI_OPTIONS = [
  "✨", "🌟", "💫", "⭐", "🔮", "🪄", "🧿", "💎",
  "🌈", "🦋", "🌸", "🌺", "🍄", "🌊", "🔥", "💨",
  "🌙", "☀️", "⚡", "❄️", "🌀", "💜", "💙", "💚",
  "🦄", "🐉", "🦅", "🐺", "🦁", "🐬", "🦊", "🐱",
  "👑", "🎭", "🎪", "🎯", "🏆", "🎵", "📿", "🗝️",
];
