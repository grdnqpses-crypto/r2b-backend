export interface BeliefOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  encouragement: string;
  bedtimeMessage: string;
}

export interface BeliefCategory {
  id: string;
  name: string;
  emoji: string;
  beliefs: BeliefOption[];
}

export const BELIEF_CATEGORIES: BeliefCategory[] = [
  {
    id: "childhood",
    name: "Childhood Magic",
    emoji: "✨",
    beliefs: [
      {
        id: "santa",
        name: "Santa Claus",
        emoji: "🎅",
        category: "Childhood Magic",
        description: "The jolly gift-giver who rewards good children",
        encouragement: "Your belief in Santa's magic is creating a warm, giving energy all around you!",
        bedtimeMessage: "Santa only visits when children are fast asleep! Your strong belief field will guide him right to you tonight.",
      },
      {
        id: "tooth-fairy",
        name: "Tooth Fairy",
        emoji: "🧚",
        category: "Childhood Magic",
        description: "The magical fairy who collects teeth and leaves treasures",
        encouragement: "The Tooth Fairy can feel your belief shining like a beacon!",
        bedtimeMessage: "The Tooth Fairy only comes when you're dreaming! Go to sleep and let your belief field guide her to your pillow.",
      },
      {
        id: "easter-bunny",
        name: "Easter Bunny",
        emoji: "🐰",
        category: "Childhood Magic",
        description: "The spring spirit who hides colorful eggs and treats",
        encouragement: "Your belief is making the Easter Bunny hop with excitement!",
        bedtimeMessage: "The Easter Bunny hides eggs while you sleep! Rest now and your belief field will attract the best surprises.",
      },
      {
        id: "sandman",
        name: "The Sandman",
        emoji: "🌙",
        category: "Childhood Magic",
        description: "The dream-bringer who sprinkles magical sleeping sand",
        encouragement: "The Sandman is drawn to your powerful belief energy!",
        bedtimeMessage: "The Sandman is on his way with beautiful dreams! Close your eyes and let your belief field welcome him.",
      },
      {
        id: "jack-frost",
        name: "Jack Frost",
        emoji: "❄️",
        category: "Childhood Magic",
        description: "The winter spirit who paints frost on windows",
        encouragement: "Jack Frost can feel your icy-cool belief energy!",
        bedtimeMessage: "Jack Frost decorates windows while children sleep! Your belief field will inspire his most beautiful patterns tonight.",
      },
    ],
  },
  {
    id: "spiritual",
    name: "Spiritual & Angels",
    emoji: "👼",
    beliefs: [
      {
        id: "guardian-angel",
        name: "Guardian Angels",
        emoji: "👼",
        category: "Spiritual & Angels",
        description: "Protective spirits watching over you",
        encouragement: "Your guardian angel is wrapping you in warmth right now!",
        bedtimeMessage: "Your guardian angel watches over you while you sleep. Rest peacefully knowing your belief field keeps them close.",
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
        encouragement: "Your belief is creating the conditions for something miraculous!",
        bedtimeMessage: "Miracles happen while we rest and trust. Sleep now and let the universe work its magic.",
      },
      {
        id: "soul",
        name: "The Soul",
        emoji: "💫",
        category: "Spiritual & Angels",
        description: "The eternal essence within every person",
        encouragement: "Your soul energy is radiating powerfully through every sensor!",
        bedtimeMessage: "Your soul recharges during deep sleep. Rest now and wake up with even stronger belief energy.",
      },
    ],
  },
  {
    id: "religion",
    name: "World Religions",
    emoji: "🙏",
    beliefs: [
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
        bedtimeMessage: "Jesus said 'Come to me and I will give you rest.' Sleep now in the warmth of your belief.",
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
        encouragement: "Your mindful belief is creating a serene energy field all around you!",
        bedtimeMessage: "The Buddha taught that rest brings clarity. Sleep peacefully and awaken with renewed wisdom.",
      },
      {
        id: "krishna",
        name: "Krishna",
        emoji: "🙏",
        category: "World Religions",
        description: "The supreme deity in Hinduism",
        encouragement: "Your devotion to Krishna is radiating divine love energy!",
        bedtimeMessage: "Krishna protects those who rest with faith. Sleep now and let your belief field glow.",
      },
      {
        id: "jewish-faith",
        name: "Hashem",
        emoji: "✡️",
        category: "World Religions",
        description: "The name of God in Judaism",
        encouragement: "Your faith is creating a powerful connection to the divine!",
        bedtimeMessage: "Rest now under the watchful care of Hashem. Your belief field shines brightest in peaceful sleep.",
      },
      {
        id: "universe",
        name: "The Universe",
        emoji: "🌌",
        category: "World Religions",
        description: "The cosmic intelligence that connects all things",
        encouragement: "The universe is responding to your focused belief energy!",
        bedtimeMessage: "The universe aligns while you sleep. Rest now and let your belief field attract wonderful things.",
      },
    ],
  },
  {
    id: "nature",
    name: "Nature & Energy",
    emoji: "🌿",
    beliefs: [
      {
        id: "mother-nature",
        name: "Mother Nature",
        emoji: "🌍",
        category: "Nature & Energy",
        description: "The living spirit of the natural world",
        encouragement: "Mother Nature is responding to your belief with vibrant energy!",
        bedtimeMessage: "Nature heals and grows while the world sleeps. Rest now and grow stronger with your belief.",
      },
      {
        id: "karma",
        name: "Karma",
        emoji: "☯️",
        category: "Nature & Energy",
        description: "The universal law of cause and effect",
        encouragement: "Your positive belief energy is creating wonderful karma!",
        bedtimeMessage: "Good karma builds while you rest peacefully. Sleep now and let your positive energy multiply.",
      },
      {
        id: "luck",
        name: "Good Luck",
        emoji: "🍀",
        category: "Nature & Energy",
        description: "The force that brings fortunate outcomes",
        encouragement: "Your luck field is getting stronger with every moment of belief!",
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
    ],
  },
  {
    id: "personal",
    name: "Personal Power",
    emoji: "💪",
    beliefs: [
      {
        id: "myself",
        name: "Belief in Myself",
        emoji: "💪",
        category: "Personal Power",
        description: "The power of self-confidence and inner strength",
        encouragement: "Your self-belief is generating an incredible field of personal power!",
        bedtimeMessage: "Champions rest well! Sleep now and wake up even more confident and powerful.",
      },
      {
        id: "wishes",
        name: "Wishes Come True",
        emoji: "🌠",
        category: "Personal Power",
        description: "The belief that focused wishes can manifest",
        encouragement: "Your wish energy is building — the sensors can feel it!",
        bedtimeMessage: "Wishes come true while you dream! Go to sleep and let your wish field work its magic overnight.",
      },
      {
        id: "superpower",
        name: "Superpowers",
        emoji: "⚡",
        category: "Personal Power",
        description: "The belief in extraordinary hidden abilities",
        encouragement: "Your superpower energy is off the charts!",
        bedtimeMessage: "Even superheroes need sleep to recharge! Rest now and wake up with your powers fully charged.",
      },
      {
        id: "magic",
        name: "Real Magic",
        emoji: "🪄",
        category: "Personal Power",
        description: "The belief that magic exists in the world",
        encouragement: "Your magical energy is making the sensors dance!",
        bedtimeMessage: "Magic is strongest at night while you sleep! Close your eyes and let the magic happen.",
      },
    ],
  },
];

export const ALL_BELIEFS = BELIEF_CATEGORIES.flatMap((c) => c.beliefs);

export function getBeliefById(id: string): BeliefOption | undefined {
  return ALL_BELIEFS.find((b) => b.id === id);
}
