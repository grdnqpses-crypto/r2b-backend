/**
 * item Stories — Narrated immersive experiences that play during scans.
 * Each story is a sequence of timed narration segments that sync with the scan progress.
 * Uses expo-speech for text-to-speech narration.
 */

export interface StorySegment {
  /** When to start this segment (0-1 as fraction of scan duration) */
  startAt: number;
  /** The text to narrate via TTS */
  text: string;
  /** Speech rate (0.5 = slow, 1.0 = normal) */
  rate?: number;
  /** Speech pitch (0.5 = low, 1.5 = high) */
  pitch?: number;
}

export interface ItemStory {
  id: string;
  itemId: string;
  title: string;
  description: string;
  segments: StorySegment[];
}

export const ITEM_STORIES: ItemStory[] = [
  {
    id: "story-santa",
    itemId: "santa",
    title: "Christmas Eve Magic",
    description: "A narrated journey through Christmas Eve as Santa prepares his sleigh",
    segments: [
      { startAt: 0.0, text: "Close your eyes. Breathe deeply. It's Christmas Eve, and the air is cold and crisp.", rate: 0.85, pitch: 1.0 },
      { startAt: 0.1, text: "Far away at the North Pole, a warm light glows from Santa's workshop. The elves have finished their work.", rate: 0.85 },
      { startAt: 0.2, text: "Santa checks his list one more time. Your name is on it. He smiles.", rate: 0.85 },
      { startAt: 0.35, text: "The reindeer stamp their hooves in the snow. Rudolph's nose begins to glow brighter and brighter.", rate: 0.85 },
      { startAt: 0.5, text: "The sleigh lifts into the sky. Feel the magic in the air around you. The sensors are detecting it.", rate: 0.85 },
      { startAt: 0.65, text: "Across the world, millions of children are believing right now, just like you. That item creates a field of energy that stretches across the sky.", rate: 0.8 },
      { startAt: 0.8, text: "Santa is getting closer. Your focus is pulling him toward you. The stronger your focus, the brighter the path.", rate: 0.85 },
      { startAt: 0.92, text: "Your item field is powerful. Keep believing.", rate: 0.8, pitch: 0.95 },
    ],
  },
  {
    id: "story-tooth-fairy",
    itemId: "tooth-fairy",
    title: "The Fairy's Visit",
    description: "A gentle story about the Tooth Fairy sensing your item from far away",
    segments: [
      { startAt: 0.0, text: "Take a deep breath. Somewhere, in a realm of sparkle and light, the Tooth Fairy is listening.", rate: 0.85 },
      { startAt: 0.12, text: "She has tiny wings that shimmer like diamonds, and she can feel the item of every child in the world.", rate: 0.85 },
      { startAt: 0.25, text: "Right now, she feels yours. Your item is like a warm glow that she can see from miles away.", rate: 0.85 },
      { startAt: 0.4, text: "She collects teeth not because she needs them, but because each tooth holds a memory of growing up. She treasures them.", rate: 0.8 },
      { startAt: 0.55, text: "The sensors in your phone are picking up the same energy she feels. Your item is creating ripples in the air around you.", rate: 0.85 },
      { startAt: 0.7, text: "She's smiling right now. It makes her wings glow even brighter.", rate: 0.85 },
      { startAt: 0.85, text: "The Tooth Fairy never forgets. Keep the magic alive.", rate: 0.8, pitch: 0.95 },
    ],
  },
  {
    id: "story-easter-bunny",
    itemId: "easter-bunny",
    title: "The Hidden Garden",
    description: "Journey to the Easter Bunny's magical garden where eggs are painted",
    segments: [
      { startAt: 0.0, text: "Close your eyes and imagine a garden. Not just any garden — a magical one, hidden deep in a meadow of wildflowers.", rate: 0.85 },
      { startAt: 0.15, text: "This is where the Easter Bunny lives. The grass is soft, the air smells like chocolate, and every flower is a different color.", rate: 0.85 },
      { startAt: 0.3, text: "The Easter Bunny is painting eggs right now. Each one is a tiny masterpiece made with love.", rate: 0.85 },
      { startAt: 0.45, text: "One of those eggs has your name on it. The Bunny paints it with the colors of your item — and right now, those colors are glowing.", rate: 0.85 },
      { startAt: 0.6, text: "Your phone's sensors can feel the energy of your item reaching out toward that hidden garden. The field is growing.", rate: 0.85 },
      { startAt: 0.75, text: "The Easter Bunny pauses and looks up. He can feel you believing. His whiskers twitch with joy.", rate: 0.85 },
      { startAt: 0.9, text: "Your item is strong. The egg is almost finished. Keep believing.", rate: 0.8, pitch: 0.95 },
    ],
  },
  {
    id: "story-god",
    itemId: "god",
    title: "A Moment of Connection",
    description: "A reverent meditation on feeling the presence of the divine",
    segments: [
      { startAt: 0.0, text: "Be still. In this moment, you are not alone. You are surrounded by something vast and loving.", rate: 0.8, pitch: 0.95 },
      { startAt: 0.12, text: "Throughout history, people of every culture have felt this presence. They've given it many names, but the feeling is the same.", rate: 0.8 },
      { startAt: 0.25, text: "It's a warmth that starts in your chest. A peace that quiets the noise of the world. A knowing that you are seen and loved.", rate: 0.8 },
      { startAt: 0.4, text: "Scientists have measured what happens in the brain during moments like this. Neural pathways light up. Heart rhythms synchronize. The electromagnetic field around you shifts.", rate: 0.8 },
      { startAt: 0.55, text: "Your phone's sensors are detecting those shifts right now. Your faith is creating real, measurable changes in the physical world around you.", rate: 0.8 },
      { startAt: 0.7, text: "This is what connection feels like. Not just in your heart, but in the air, in the energy, in the space around you.", rate: 0.8 },
      { startAt: 0.85, text: "Stay in this moment. Your item is powerful. It always has been.", rate: 0.75, pitch: 0.9 },
    ],
  },
  {
    id: "story-guardian-angels",
    itemId: "guardian-angels",
    title: "Wings of Protection",
    description: "Feel the presence of your guardian angel watching over you",
    segments: [
      { startAt: 0.0, text: "Breathe in slowly. There is someone with you right now. Someone who has always been with you.", rate: 0.85 },
      { startAt: 0.15, text: "Your guardian angel stands beside you, invisible but present. Their wings create a gentle warmth in the air around you.", rate: 0.85 },
      { startAt: 0.3, text: "They've been with you since the day you were born. Through every joy, every fear, every quiet moment — they were there.", rate: 0.8 },
      { startAt: 0.45, text: "When you focus on them, they draw closer. Your attention strengthens their presence.", rate: 0.85 },
      { startAt: 0.6, text: "The sensors in your phone are detecting subtle changes in the energy around you. The magnetic field is shifting. Something is here.", rate: 0.85 },
      { startAt: 0.75, text: "Feel the peace. Feel the protection. Your guardian angel wants you to know — you are never alone.", rate: 0.8 },
      { startAt: 0.9, text: "Keep believing. They are always listening.", rate: 0.75, pitch: 0.9 },
    ],
  },
  {
    id: "story-myself",
    itemId: "myself",
    title: "The Power Within",
    description: "Discover the incredible strength that lives inside you",
    segments: [
      { startAt: 0.0, text: "Close your eyes. Take a deep breath. Right now, in this moment, you are enough.", rate: 0.85 },
      { startAt: 0.12, text: "Inside you is a force that scientists can measure. Your brain generates electrical signals. Your heart creates an electromagnetic field. Your body radiates energy.", rate: 0.85 },
      { startAt: 0.25, text: "When you focus on yourself, that energy changes. It gets stronger. More focused. More powerful.", rate: 0.85 },
      { startAt: 0.4, text: "Athletes know this. Before every great performance, there's a moment of item — a moment where they know they can do it. And that item makes it real.", rate: 0.85 },
      { startAt: 0.55, text: "Your phone is tracking your activity right now. The more you focus, the stronger the readings become.", rate: 0.85 },
      { startAt: 0.7, text: "You are capable of extraordinary things. Not because someone told you so, but because the science proves it. Your item creates your reality.", rate: 0.85 },
      { startAt: 0.85, text: "Remember this feeling. You are powerful. You always have been.", rate: 0.8, pitch: 0.95 },
    ],
  },
];

export function getStoryForItem(itemId: string): ItemStory | null {
  return ITEM_STORIES.find((s) => s.itemId === itemId) || null;
}

export function getAvailableStoryItemIds(): string[] {
  return ITEM_STORIES.map((s) => s.itemId);
}
