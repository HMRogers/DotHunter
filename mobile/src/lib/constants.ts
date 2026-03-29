// ═══════════════════════════════════════════
// CONSTANTS — ported from web version
// ═══════════════════════════════════════════
export const DOTS_PER_ROUND = 10;
export const BASE_TIME_MS = 2200;
export const TIME_DECREASE = 180;
export const MIN_TIME_MS = 600;
export const MAX_MISSES = 3;
export const FREE_ROUNDS_LIMIT = 3;
export const DOT_SIZE = 56;
export const DOT_SIZE_SM = 46;
export const DECOY_COLORS = ["#FF4D6A", "#FFB830", "#9B6DFF", "#FF6B35", "#E84393"];
export const TARGET_COLOR_MODE2 = "#00E676";
export const rand = (a: number, b: number) => Math.random() * (b - a) + a;

export const ALL_COLORS = [
  { id: "cyan", hex: "#00E5FF", name: "Cyan" },
  { id: "green", hex: "#00E676", name: "Green" },
  { id: "pink", hex: "#FF4D6A", name: "Pink" },
  { id: "amber", hex: "#FFB830", name: "Amber" },
  { id: "purple", hex: "#9B6DFF", name: "Purple" },
  { id: "orange", hex: "#FF6B35", name: "Orange" },
  { id: "magenta", hex: "#E84393", name: "Magenta" },
  { id: "lime", hex: "#A8E600", name: "Lime" },
];

export function getPos(w: number, h: number, sz: number) {
  const p = sz / 2 + 8;
  return { x: rand(p, w - p), y: rand(p, h - p) };
}

export function getNonOverlapping(count: number, w: number, h: number, sz: number) {
  const pts: { x: number; y: number }[] = [];
  let tries = 0;
  while (pts.length < count && tries < 300) {
    const p = getPos(w, h, sz);
    if (pts.every(q => Math.hypot(p.x - q.x, p.y - q.y) > sz + 6)) pts.push(p);
    tries++;
  }
  while (pts.length < count) pts.push(getPos(w, h, sz));
  return pts;
}

// ═══════════════════════════════════════════
// THEMES (adapted for React Native — no gradients)
// ═══════════════════════════════════════════
export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textDim: string;
  textMuted: string;
  barBg: string;
  missOff: string;
  inputBg: string;
  inputBorder: string;
  cardBg: string;
  btnText: string;
}

export const themes: { dark: ThemeColors; light: ThemeColors } = {
  dark: {
    bg: "#0a0a1a",
    surface: "#0e0e22",
    border: "#1a1a2e",
    text: "#e0e0f0",
    textDim: "#8a8aaa",
    textMuted: "#6a6a8a",
    barBg: "#1a1a2e",
    missOff: "#2a2a4a",
    inputBg: "#1a1a2e",
    inputBorder: "#2a2a4a",
    cardBg: "#12122a",
    btnText: "#0a0a1a",
  },
  light: {
    bg: "#f0f0f8",
    surface: "#ffffff",
    border: "#d8d8e8",
    text: "#1a1a2e",
    textDim: "#5a5a7a",
    textMuted: "#8a8aa0",
    barBg: "#e0e0ec",
    missOff: "#d0d0e0",
    inputBg: "#f4f4fc",
    inputBorder: "#d0d0e0",
    cardBg: "#f0f0f8",
    btnText: "#ffffff",
  },
};

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
export interface DotData {
  id: number;
  x: number;
  y: number;
  color: string;
  isTarget: boolean;
}

export interface GameStats {
  totalScore: number;
  gamesPlayed: number;
  maxPerfectStreak: number;
  currentPerfectStreak: number;
  modesPlayed: number[];
}

export interface GameData {
  classicHigh: number;
  colorHigh: number;
  dualHigh: number;
  recentGames: { score: number; round: number; mode: number; date: number }[];
  theme: string;
  playerName: string;
  achievements: string[];
  stats: GameStats;
  unlocked: boolean;
  freeRoundsUsed: { [mode: number]: number };
}

export interface GameResult {
  score: number;
  round: number;
  mode: number;
  perfectRound: boolean;
  perfectStreak?: number;
}

export function defaultStats(): GameStats {
  return { totalScore: 0, gamesPlayed: 0, maxPerfectStreak: 0, currentPerfectStreak: 0, modesPlayed: [] };
}

export function defaultGameData(): GameData {
  return {
    classicHigh: 0,
    colorHigh: 0,
    dualHigh: 0,
    recentGames: [],
    theme: "dark",
    playerName: "",
    achievements: [],
    stats: defaultStats(),
    unlocked: false,
    freeRoundsUsed: { 1: 0, 2: 0, 3: 0 },
  };
}

export const MODE_LABELS: Record<number, string> = { 1: "CLS", 2: "CLR", 3: "DUO" };
export const MODE_COLORS_TAG: Record<number, string> = { 1: "#00E5FF", 2: "#00E676", 3: "#E84393" };

export function getTimeForRound(r: number): number {
  return Math.max(MIN_TIME_MS, BASE_TIME_MS - (r - 1) * TIME_DECREASE);
}
