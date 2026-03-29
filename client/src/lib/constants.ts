// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
export const DOTS_PER_ROUND = 10;
export const BASE_TIME_MS = 2200;
export const TIME_DECREASE = 180;
export const MIN_TIME_MS = 600;
export const MAX_MISSES = 3;
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
// THEMES
// ═══════════════════════════════════════════
export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceGrad: string;
  border: string;
  text: string;
  textDim: string;
  textMuted: string;
  dotGrid: string;
  barBg: string;
  missOff: string;
  inputBg: string;
  inputBorder: string;
  cardBg: string;
  toggleBg: string;
  toggleKnob: string;
  privacyBg: string;
  privacyBorder: string;
  btnText: string;
}

export const themes: { dark: ThemeColors; light: ThemeColors } = {
  dark: {
    bg: "linear-gradient(165deg, #0a0a1a 0%, #12122a 40%, #0d0d20 100%)",
    surface: "#0e0e22",
    surfaceGrad: "linear-gradient(180deg, #0e0e22 0%, #0a0a18 100%)",
    border: "#1a1a2e",
    text: "#e0e0f0",
    textDim: "#8a8aaa",
    textMuted: "#6a6a8a",
    dotGrid: "#ffffff06",
    barBg: "#1a1a2e",
    missOff: "#2a2a4a",
    inputBg: "#1a1a2e",
    inputBorder: "#2a2a4a",
    cardBg: "#12122a",
    toggleBg: "#1a1a2e",
    toggleKnob: "#e0e0f0",
    privacyBg: "#0e0e1e",
    privacyBorder: "#1a1a2e",
    btnText: "#0a0a1a",
  },
  light: {
    bg: "linear-gradient(165deg, #f0f0f8 0%, #e8e8f4 40%, #f4f4fc 100%)",
    surface: "#ffffff",
    surfaceGrad: "linear-gradient(180deg, #ffffff 0%, #f6f6fc 100%)",
    border: "#d8d8e8",
    text: "#1a1a2e",
    textDim: "#5a5a7a",
    textMuted: "#8a8aa0",
    dotGrid: "#00000008",
    barBg: "#e0e0ec",
    missOff: "#d0d0e0",
    inputBg: "#f4f4fc",
    inputBorder: "#d0d0e0",
    cardBg: "#f0f0f8",
    toggleBg: "#d8d8e8",
    toggleKnob: "#1a1a2e",
    privacyBg: "#f8f8ff",
    privacyBorder: "#e0e0ec",
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

export interface RippleData {
  id: number;
  x: number;
  y: number;
  color: string;
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
  };
}

export const MODE_LABELS: Record<number, string> = { 1: "CLS", 2: "CLR", 3: "DUO" };
export const MODE_COLORS_TAG: Record<number, string> = { 1: "#00E5FF", 2: "#00E676", 3: "#E84393" };
