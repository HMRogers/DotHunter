import type { GameStats, GameResult } from "./constants";

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
