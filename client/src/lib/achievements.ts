import type { GameStats, GameResult } from "./constants";

// Custom SVG icons — geometric badges, no emojis
export const ICONS: Record<string, (color: string) => string> = {
  diamond: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  bolt: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  shield: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  star: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8.5L22 9.3L17 14L18.2 21L12 17.5L5.8 21L7 14L2 9.3L9 8.5L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  crown: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18H21V20H3V18ZM3 18L5 8L9 12L12 4L15 12L19 8L21 18H3Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  eye: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5C5 5 2 12 2 12C2 12 5 19 12 19C19 19 22 12 22 12C22 12 19 5 12 5Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/><circle cx="12" cy="12" r="3" stroke="${color}" stroke-width="1.5" fill="${color}44"/></svg>`,
  hex: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  flame: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 2 7 8 7 13C7 16.3 9.2 19 12 19C14.8 19 17 16.3 17 13C17 8 12 2 12 2Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/><path d="M12 12C12 12 10 14 10 15.5C10 16.9 10.9 18 12 18C13.1 18 14 16.9 14 15.5C14 14 12 12 12 12Z" stroke="${color}" stroke-width="1.5" fill="${color}44"/></svg>`,
  target: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.5" fill="${color}11"/><circle cx="12" cy="12" r="5.5" stroke="${color}" stroke-width="1.2" fill="${color}22"/><circle cx="12" cy="12" r="2" fill="${color}"/></svg>`,
  infinity: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 12C7 12 4 8.5 4 12C4 15.5 7 15.5 9 12C11 8.5 12 8.5 15 12C18 15.5 20 15.5 20 12C20 8.5 17 12 17 12" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`,
  triangle: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L22 20H2L12 3Z" stroke="${color}" stroke-width="1.5" fill="${color}22"/></svg>`,
  compass: (color) => `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.5" fill="${color}11"/><path d="M16 8L14 14L8 16L10 10L16 8Z" stroke="${color}" stroke-width="1.2" fill="${color}33"/></svg>`,
};

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  tier: "bronze" | "silver" | "gold";
  check: (s: GameStats, g?: GameResult) => boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Score milestones
  { id: "first_point", name: "First Strike", desc: "Score your first point", icon: "diamond", color: "#00E5FF", tier: "bronze",
    check: (s) => s.totalScore >= 1 },
  { id: "score_25", name: "Quarter Century", desc: "Score 25 points in a single game", icon: "bolt", color: "#FFB830", tier: "bronze",
    check: (s, g) => !!(g && g.score >= 25) },
  { id: "score_50", name: "Half Hundred", desc: "Score 50 points in a single game", icon: "star", color: "#FFB830", tier: "silver",
    check: (s, g) => !!(g && g.score >= 50) },
  { id: "score_100", name: "Centurion", desc: "Score 100 points in a single game", icon: "crown", color: "#FFB830", tier: "gold",
    check: (s, g) => !!(g && g.score >= 100) },
  // Round milestones
  { id: "round_3", name: "Getting Warmer", desc: "Reach round 3", icon: "flame", color: "#FF6B35", tier: "bronze",
    check: (s, g) => !!(g && g.round >= 3) },
  { id: "round_5", name: "Deep Focus", desc: "Reach round 5", icon: "eye", color: "#9B6DFF", tier: "silver",
    check: (s, g) => !!(g && g.round >= 5) },
  { id: "round_8", name: "Tunnel Vision", desc: "Reach round 8", icon: "target", color: "#E84393", tier: "gold",
    check: (s, g) => !!(g && g.round >= 8) },
  // Perfection
  { id: "perfect_round", name: "Flawless", desc: "Complete a round with zero misses", icon: "shield", color: "#00E676", tier: "silver",
    check: (s, g) => !!(g && g.perfectRound) },
  { id: "perfect_3", name: "Untouchable", desc: "Complete 3 consecutive flawless rounds", icon: "shield", color: "#00E5FF", tier: "gold",
    check: (s) => s.maxPerfectStreak >= 3 },
  // Games played
  { id: "games_5", name: "Regular", desc: "Play 5 games", icon: "hex", color: "#8a8aaa", tier: "bronze",
    check: (s) => s.gamesPlayed >= 5 },
  { id: "games_20", name: "Dedicated", desc: "Play 20 games", icon: "hex", color: "#9B6DFF", tier: "silver",
    check: (s) => s.gamesPlayed >= 20 },
  { id: "games_50", name: "Obsessed", desc: "Play 50 games", icon: "infinity", color: "#E84393", tier: "gold",
    check: (s) => s.gamesPlayed >= 50 },
  // Mode-specific
  { id: "mode_classic", name: "Purist", desc: "Score 30+ in Classic mode", icon: "diamond", color: "#00E5FF", tier: "silver",
    check: (s, g) => !!(g && g.mode === 1 && g.score >= 30) },
  { id: "mode_color", name: "Color Blind", desc: "Score 30+ in Color Filter", icon: "triangle", color: "#00E676", tier: "silver",
    check: (s, g) => !!(g && g.mode === 2 && g.score >= 30) },
  { id: "mode_dual", name: "Dual Wielder", desc: "Score 30+ in Dual Hunt", icon: "compass", color: "#E84393", tier: "silver",
    check: (s, g) => !!(g && g.mode === 3 && g.score >= 30) },
  { id: "all_modes", name: "Versatile", desc: "Play all 3 game modes", icon: "star", color: "#FFB830", tier: "gold",
    check: (s) => !!(s.modesPlayed && s.modesPlayed.length >= 3) },
];

export const TIER_BORDER: Record<string, string> = { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700" };

export function checkNewAchievements(stats: GameStats, gameResult: GameResult | undefined, unlockedIds: string[]): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  for (const a of ACHIEVEMENT_DEFS) {
    if (unlockedIds.includes(a.id)) continue;
    if (a.check(stats, gameResult)) newlyUnlocked.push(a);
  }
  return newlyUnlocked;
}
