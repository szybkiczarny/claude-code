// Skin/Case types — shared across the app
// Real data comes from /api/cs2/cases (ByMykel + Steam Market prices)

export interface Skin {
  id: string;
  name: string;
  wear: string;        // "Factory New" | "Minimal Wear" | "Field-Tested" | "Well-Worn" | "Battle-Scarred"
  exterior?: string;   // alias for wear (legacy)
  rarity: string;
  rarityColor: string;
  price: number;
  imageUrl: string;
  stattrak?: boolean;
}

export interface Case {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  tag?: string;
  tagColor?: string;
  skins: Skin[];
  items?: Skin[];      // alias for skins (legacy)
}

export const RARITY_COLORS: Record<string, string> = {
  "Consumer Grade":    "#b0c3d9",
  "Industrial Grade":  "#5e98d9",
  "Mil-Spec Grade":    "#4b69ff",
  "Restricted":        "#8847ff",
  "Classified":        "#d32ce6",
  "Covert":            "#eb4b4b",
  "Rare Special Item": "#ffd700",
  "Extraordinary":     "#eb4b4b",
};

export function rarityColor(r: string) {
  return RARITY_COLORS[r] ?? "#b0c3d9";
}

export const LIVE_DROPS = [
  { user: "xKomik99",  avatar: "🦊", item: "AWP | Dragon Lore",        rarity: "Covert",     price: 4200,  caseName: "Prisma Case" },
  { user: "Shadow_PL", avatar: "🐺", item: "AK-47 | Redline",          rarity: "Classified",  price: 46.8,  caseName: "Danger Zone Case" },
  { user: "ProSkin3r", avatar: "🔥", item: "Butterfly Knife | Fade",   rarity: "Covert",     price: 1200,  caseName: "Operation Broken Fang Case" },
  { user: "NightHawk", avatar: "🦅", item: "Glock-18 | Fade",          rarity: "Restricted",  price: 420,   caseName: "CS:GO Weapon Case" },
  { user: "LuckyStar", avatar: "⭐", item: "Karambit | Doppler",       rarity: "Covert",     price: 890,   caseName: "Chroma Case" },
  { user: "FastDrop",  avatar: "⚡", item: "USP-S | Kill Confirmed",   rarity: "Covert",     price: 95.5,  caseName: "Clutch Case" },
  { user: "CS2Lord",   avatar: "👑", item: "M4A4 | Howl",              rarity: "Covert",     price: 1850,  caseName: "Operation Bravo Case" },
  { user: "TopFrag",   avatar: "🎯", item: "AWP | Asiimov",            rarity: "Covert",     price: 65,    caseName: "Phoenix Case" },
  { user: "NeonKing",  avatar: "💜", item: "Desert Eagle | Blaze",     rarity: "Restricted",  price: 380,   caseName: "Horizon Case" },
  { user: "GoldRush",  avatar: "💛", item: "AK-47 | Vulcan",           rarity: "Covert",     price: 88,    caseName: "Operation Vanguard Case" },
];
