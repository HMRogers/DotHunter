/*
 * FOCUS DOT GAME
 * Design: Dark Arcade / Neon Minimalism
 * Typography: Outfit (display), DM Sans (body)
 * Colors: Deep navy bg, neon cyan/green/magenta accents
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { playTap, playMiss, playWrongColor, playRoundUp, playGameOver, playAchievement } from "@/lib/audio";
import {
  DOTS_PER_ROUND, BASE_TIME_MS, TIME_DECREASE, MIN_TIME_MS, MAX_MISSES, FREE_ROUNDS_LIMIT,
  DOT_SIZE, DOT_SIZE_SM, DECOY_COLORS, TARGET_COLOR_MODE2, ALL_COLORS,
  rand, getPos, getNonOverlapping, themes,
  defaultStats, defaultGameData, MODE_LABELS, MODE_COLORS_TAG,
  type ThemeColors, type DotData, type RippleData, type GameData, type GameResult,
} from "@/lib/constants";
import { ICONS, ACHIEVEMENT_DEFS, TIER_BORDER, checkNewAchievements, type AchievementDef } from "@/lib/achievements";
import { loadData, saveData } from "@/lib/storage";

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════
function Dot({ dot, onTap, small }: { dot: DotData; onTap: (d: DotData) => void; small: boolean }) {
  const [scale, setScale] = useState(0);
  const sz = small ? DOT_SIZE_SM : DOT_SIZE;
  useEffect(() => { requestAnimationFrame(() => setScale(1)); }, []);
  return (
    <div
      style={{
        position: "absolute", left: dot.x - sz / 2, top: dot.y - sz / 2, width: sz, height: sz,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${dot.color}CC, ${dot.color} 50%, ${dot.color}88 100%)`,
        boxShadow: `0 0 18px ${dot.color}66, 0 0 36px ${dot.color}33, inset 0 -4px 8px ${dot.color}44`,
        transform: `scale(${scale})`, transition: "transform 0.14s cubic-bezier(.4,0,.2,1)",
        cursor: "pointer", zIndex: 10,
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
        overflow: "hidden",
      }}
      onPointerDown={() => onTap(dot)}
    >
      {/* Glossy bubble highlight */}
      <div style={{
        position: "absolute", top: "12%", left: "20%", width: "35%", height: "28%",
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
        transform: "rotate(-25deg)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

function TimerBar({ timeLeft, maxTime, color, t }: { timeLeft: number; maxTime: number; color: string; t: ThemeColors }) {
  const pct = Math.max(0, timeLeft / maxTime) * 100;
  return (
    <div style={{ width: "100%", height: 4, background: t.barBg, borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: pct > 30 ? color : "#FF4D6A",
        transition: "width 0.05s linear, background 0.3s", borderRadius: 2,
      }} />
    </div>
  );
}

function MissIndicator({ misses, max, t }: { misses: number; max: number; t: ThemeColors }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: "50%",
          background: i < misses ? "#FF4D6A" : t.missOff,
          transition: "background 0.3s",
          boxShadow: i < misses ? "0 0 6px #FF4D6A88" : "none",
        }} />
      ))}
    </div>
  );
}

function BubblePop({ x, y, color }: { x: number; y: number; color: string }) {
  // Generate 8 particles in a circle
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 28 + Math.random() * 16;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      size: 4 + Math.random() * 5,
      delay: Math.random() * 0.04,
    };
  });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, pointerEvents: "none", zIndex: 25 }}>
      {/* Expanding ring */}
      <div style={{
        position: "absolute", left: -30, top: -30, width: 60, height: 60,
        borderRadius: "50%", border: `2px solid ${color}`,
        animation: "bubbleRingPop 0.4s ease-out forwards",
      }} />
      {/* Center flash */}
      <div style={{
        position: "absolute", left: -20, top: -20, width: 40, height: 40,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}88 0%, transparent 70%)`,
        animation: "bubbleCenterFlash 0.3s ease-out forwards",
      }} />
      {/* Burst particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: -p.size / 2, top: -p.size / 2,
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}88`,
          animation: `bubbleParticle 0.45s ease-out ${p.delay}s forwards`,
          // @ts-ignore
          '--tx': `${p.tx}px`,
          '--ty': `${p.ty}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function ThemeToggle({ isDark, onToggle, t }: { isDark: boolean; onToggle: () => void; t: ThemeColors }) {
  return (
    <button onClick={onToggle} aria-label="Toggle theme" style={{
      position: "relative", width: 52, height: 28, borderRadius: 14,
      background: t.toggleBg, border: `1.5px solid ${t.border}`, cursor: "pointer", padding: 0,
    }}>
      <div style={{
        position: "absolute", top: 3, left: isDark ? 3 : 25, width: 20, height: 20,
        borderRadius: "50%", background: t.toggleKnob,
        transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
      }}>
        {isDark ? "🌙" : "☀️"}
      </div>
    </button>
  );
}

function PrivacyBadge({ t, onTap }: { t: ThemeColors; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: t.privacyBg, border: `1px solid ${t.privacyBorder}`,
      borderRadius: 20, padding: "5px 12px 5px 8px",
      color: t.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
      </svg>
      Data stored locally
    </button>
  );
}

function PrivacyModal({ t, onClose }: { t: ThemeColors; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, animation: "fadeSlideUp 0.3s ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: t.surface, borderRadius: 20, padding: "32px 28px", maxWidth: 380, width: "100%",
        border: `1px solid ${t.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", color: t.text,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
          </svg>
          Your Privacy
        </div>
        <div style={{ fontSize: 14, color: t.textDim, lineHeight: 1.7, marginBottom: 20 }}>
          All your game data — scores, achievements, settings — is saved exclusively on your device. Nothing is transmitted to any server or shared with third parties.
        </div>
        <div style={{ background: t.privacyBg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${t.privacyBorder}`, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.8 }}>
            <div>✓ Scores saved to device only</div>
            <div>✓ No accounts or sign-ins</div>
            <div>✓ No analytics or tracking</div>
            <div>✓ Clear data anytime from menu</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: "100%", padding: "12px 0", background: t.text, color: t.surface,
          border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
        }}>Got it</button>
      </div>
    </div>
  );
}

function AchievementBadge({ achievement, unlocked, t, size = 40 }: { achievement: AchievementDef; unlocked: boolean; t: ThemeColors; size?: number }) {
  const iconSvg = ICONS[achievement.icon] ? ICONS[achievement.icon](unlocked ? achievement.color : t.textMuted + "66") : "";
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: unlocked ? `${achievement.color}15` : `${t.textMuted}08`,
      border: `1.5px solid ${unlocked ? TIER_BORDER[achievement.tier] : t.border}`,
      opacity: unlocked ? 1 : 0.4, transition: "all 0.3s",
      boxShadow: unlocked ? `0 0 12px ${achievement.color}22` : "none",
    }}>
      <div style={{ width: size * 0.55, height: size * 0.55 }} dangerouslySetInnerHTML={{ __html: iconSvg }} />
    </div>
  );
}

function AchievementToast({ achievement, t, onDone }: { achievement: AchievementDef; t: ThemeColors; onDone: () => void }) {
  useEffect(() => { const tm = setTimeout(onDone, 3500); return () => clearTimeout(tm); }, [onDone]);
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 2000,
      background: t.surface, border: `1.5px solid ${TIER_BORDER[achievement.tier]}`,
      borderRadius: 16, padding: "12px 20px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: `0 8px 30px rgba(0,0,0,0.3), 0 0 20px ${achievement.color}22`,
      animation: "toastIn 0.4s cubic-bezier(.2,1,.3,1), toastOut 0.3s ease 3.2s forwards",
      maxWidth: 360,
    }}>
      <AchievementBadge achievement={achievement} unlocked={true} t={t} size={36} />
      <div>
        <div style={{ fontSize: 10, color: TIER_BORDER[achievement.tier], letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Unlocked</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>{achievement.name}</div>
        <div style={{ fontSize: 11, color: t.textDim }}>{achievement.desc}</div>
      </div>
    </div>
  );
}

function AchievementsPanel({ t, unlockedIds, onClose }: { t: ThemeColors; unlockedIds: string[]; onClose: () => void }) {
  const unlocked = ACHIEVEMENT_DEFS.filter(a => unlockedIds.includes(a.id));
  const locked = ACHIEVEMENT_DEFS.filter(a => !unlockedIds.includes(a.id));
  const pct = Math.round((unlocked.length / ACHIEVEMENT_DEFS.length) * 100);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeSlideUp 0.3s ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: t.surface, borderRadius: 20, padding: "28px 24px", maxWidth: 400, width: "100%",
        maxHeight: "85vh", overflowY: "auto", border: `1px solid ${t.border}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", color: t.text,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800 }}>Achievements</div>
          <div style={{ fontSize: 13, color: t.textDim }}>{unlocked.length}/{ACHIEVEMENT_DEFS.length}</div>
        </div>

        <div style={{ width: "100%", height: 6, background: t.barBg, borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #00E5FF, #9B6DFF, #E84393)", borderRadius: 3, transition: "width 0.5s" }} />
        </div>

        {unlocked.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Unlocked</div>
            {unlocked.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
                <AchievementBadge achievement={a} unlocked={true} t={t} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: t.textDim }}>{a.desc}</div>
                </div>
                <div style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: `${TIER_BORDER[a.tier]}22`, color: TIER_BORDER[a.tier], fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{a.tier}</div>
              </div>
            ))}
          </>
        )}

        {locked.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, marginTop: 16 }}>Locked</div>
            {locked.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${t.border}`, opacity: 0.5 }}>
                <AchievementBadge achievement={a} unlocked={false} t={t} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.textDim }}>???</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{a.desc}</div>
                </div>
                <div style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: `${t.textMuted}15`, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{a.tier}</div>
              </div>
            ))}
          </>
        )}

        <button onClick={onClose} style={{
          width: "100%", padding: "12px 0", background: t.text, color: t.surface,
          border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginTop: 20,
        }}>Close</button>
      </div>
    </div>
  );
}

function ScoreHistory({ recentGames, t }: { recentGames: GameData["recentGames"]; t: ThemeColors }) {
  if (!recentGames || recentGames.length === 0) return null;
  const last5 = recentGames.slice(-5).reverse();
  return (
    <div style={{
      width: "100%", background: t.cardBg, borderRadius: 14, padding: "14px 18px",
      border: `1px solid ${t.border}`, marginBottom: 20,
    }}>
      <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Recent Games</div>
      {last5.map((g, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0",
          borderBottom: i < last5.length - 1 ? `1px solid ${t.border}` : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: `${MODE_COLORS_TAG[g.mode]}18`, color: MODE_COLORS_TAG[g.mode], fontWeight: 600 }}>{MODE_LABELS[g.mode] || "???"}</span>
            <span style={{ fontSize: 13, color: t.textDim }}>R{g.round}</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: t.text }}>{g.score}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN GAME
// ═══════════════════════════════════════════
export default function FocusDotGame() {
  const [screen, setScreen] = useState<"menu" | "nameEntry" | "colorPicker" | "playing" | "roundEnd" | "gameOver" | "paywall">("menu");
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [dotsCleared, setDotsCleared] = useState(0);
  const [dots, setDots] = useState<DotData[]>([]);
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showFlash, setShowFlash] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [gameData, setGameData] = useState<GameData>(defaultGameData());
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pickedColors, setPickedColors] = useState<string[]>([]);
  const [targetsLeft, setTargetsLeft] = useState(0);
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>([]);
  const [roundMisses, setRoundMisses] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);

  const t = isDark ? themes.dark : themes.light;

  const fieldRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const dotTimerRef = useRef<any>(null);
  const tickRef = useRef<any>(null);
  const roundRef = useRef(round);
  const missRef = useRef(misses);
  const dotsClearedRef = useRef(dotsCleared);
  const scoreRef = useRef(score);
  const activeRef = useRef(false);
  const modeRef = useRef(mode);
  const gameDataRef = useRef(gameData);
  const pickedRef = useRef(pickedColors);
  const targetsLeftRef = useRef(targetsLeft);
  const roundMissesRef = useRef(roundMisses);
  const perfectStreakRef = useRef(perfectStreak);

  roundRef.current = round;
  missRef.current = misses;
  dotsClearedRef.current = dotsCleared;
  scoreRef.current = score;
  modeRef.current = mode;
  gameDataRef.current = gameData;
  pickedRef.current = pickedColors;
  targetsLeftRef.current = targetsLeft;
  roundMissesRef.current = roundMisses;
  perfectStreakRef.current = perfectStreak;

  useEffect(() => {
    (async () => {
      const saved = await loadData();
      if (saved) {
        if (!saved.stats) saved.stats = defaultStats();
        if (!saved.achievements) saved.achievements = [];
        if (saved.unlocked === undefined) saved.unlocked = false;
        if (!saved.freeRoundsUsed) saved.freeRoundsUsed = { 1: 0, 2: 0, 3: 0 };
        setGameData(saved);
        setIsDark(saved.theme !== "light");
        if (saved.playerName) setPlayerName(saved.playerName);
      }
      setLoaded(true);
    })();
  }, []);

  const persistAll = useCallback(async (ov: Partial<GameData> = {}) => {
    const next = { ...gameDataRef.current, ...ov };
    setGameData(next);
    gameDataRef.current = next;
    await saveData(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const n = !prev;
      persistAll({ theme: n ? "dark" : "light" });
      return n;
    });
  }, [persistAll]);

  const processAchievements = useCallback((gameResult: GameResult) => {
    const d = { ...gameDataRef.current };
    const stats = { ...(d.stats || defaultStats()) };
    stats.totalScore = (stats.totalScore || 0) + gameResult.score;
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    if (!stats.modesPlayed) stats.modesPlayed = [];
    if (!stats.modesPlayed.includes(gameResult.mode)) stats.modesPlayed.push(gameResult.mode);
    if (gameResult.perfectRound) {
      stats.currentPerfectStreak = (stats.currentPerfectStreak || 0) + 1;
      stats.maxPerfectStreak = Math.max(stats.maxPerfectStreak || 0, stats.currentPerfectStreak);
    }
    d.stats = stats;
    const unlocked = d.achievements || [];
    const newOnes = checkNewAchievements(stats, gameResult, unlocked);
    if (newOnes.length > 0) {
      d.achievements = [...unlocked, ...newOnes.map(a => a.id)];
      setToastQueue(prev => [...prev, ...newOnes]);
      playAchievement();
    }
    d.recentGames = [...(d.recentGames || []), { score: gameResult.score, round: gameResult.round, mode: gameResult.mode, date: Date.now() }].slice(-20);
    if (gameResult.mode === 1 && gameResult.score > (d.classicHigh || 0)) d.classicHigh = gameResult.score;
    if (gameResult.mode === 2 && gameResult.score > (d.colorHigh || 0)) d.colorHigh = gameResult.score;
    if (gameResult.mode === 3 && gameResult.score > (d.dualHigh || 0)) d.dualHigh = gameResult.score;
    setGameData(d);
    gameDataRef.current = d;
    saveData(d);
  }, []);

  const clearAllData = useCallback(async () => {
    const empty = defaultGameData();
    empty.theme = isDark ? "dark" : "light";
    empty.playerName = playerName;
    setGameData(empty);
    gameDataRef.current = empty;
    await saveData(empty);
  }, [isDark, playerName]);

  const currentHigh = mode === 1 ? (gameData.classicHigh || 0) : mode === 2 ? (gameData.colorHigh || 0) : (gameData.dualHigh || 0);
  const unlockedCount = (gameData.achievements || []).length;

  const getTimeForRound = useCallback((r: number) => Math.max(MIN_TIME_MS, BASE_TIME_MS - (r - 1) * TIME_DECREASE), []);
  const getFieldDims = useCallback(() => {
    if (!fieldRef.current) return { w: 300, h: 400 };
    const r = fieldRef.current.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }, []);
  const clearTimers = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(dotTimerRef.current);
    clearInterval(tickRef.current);
  }, []);

  const endGame = useCallback((finalScore: number, finalRound: number, gameMode: number) => {
    const perfectRound = roundMissesRef.current === 0 && dotsClearedRef.current > 0;
    const ps = perfectRound ? perfectStreakRef.current + 1 : 0;
    processAchievements({ score: finalScore, round: finalRound, mode: gameMode, perfectRound, perfectStreak: ps });
  }, [processAchievements]);

  const onRoundComplete = useCallback(() => {
    const wasPerfect = roundMissesRef.current === 0;
    if (wasPerfect) {
      const ns = perfectStreakRef.current + 1;
      setPerfectStreak(ns);
      perfectStreakRef.current = ns;
      const d = { ...gameDataRef.current };
      const stats = { ...(d.stats || defaultStats()) };
      stats.currentPerfectStreak = ns;
      stats.maxPerfectStreak = Math.max(stats.maxPerfectStreak || 0, ns);
      d.stats = stats;
      const newOnes = checkNewAchievements(stats, { perfectRound: true, score: 0, round: 0, mode: 0 }, d.achievements || []);
      if (newOnes.length > 0) {
        d.achievements = [...(d.achievements || []), ...newOnes.map(a => a.id)];
        setToastQueue(prev => [...prev, ...newOnes]);
        playAchievement();
      }
      setGameData(d);
      gameDataRef.current = d;
      saveData(d);
    } else {
      setPerfectStreak(0);
      perfectStreakRef.current = 0;
    }
    setRoundMisses(0);
    roundMissesRef.current = 0;
  }, []);

  // ========== MODE 3 ==========
  const spawnMode3Wave = useCallback((currentRound: number) => {
    if (!activeRef.current) return;
    const { w, h } = getFieldDims();
    const timeMs = getTimeForRound(currentRound);
    const picked = pickedRef.current;
    const totalDots = Math.min(4 + currentRound, 12);
    const targetCount = Math.max(2, Math.floor(totalDots * 0.4));
    const decoyCount = totalDots - targetCount;
    const positions = getNonOverlapping(totalDots, w, h, DOT_SIZE_SM);
    const decoyPool = ALL_COLORS.filter(c => !picked.includes(c.hex)).map(c => c.hex);
    const newDots: DotData[] = [];
    for (let i = 0; i < targetCount; i++) {
      newDots.push({ id: Date.now() + Math.random() + i, x: positions[i].x, y: positions[i].y, color: picked[Math.floor(Math.random() * picked.length)], isTarget: true });
    }
    for (let i = 0; i < decoyCount; i++) {
      newDots.push({ id: Date.now() + Math.random() + targetCount + i, x: positions[targetCount + i].x, y: positions[targetCount + i].y, color: decoyPool[Math.floor(Math.random() * decoyPool.length)], isTarget: false });
    }
    setDots(newDots);
    setTargetsLeft(targetCount);
    targetsLeftRef.current = targetCount;
    setTimeLeft(timeMs);
    clearInterval(tickRef.current);
    const startT = Date.now();
    tickRef.current = setInterval(() => { setTimeLeft(Math.max(0, timeMs - (Date.now() - startT))); }, 30);
    clearTimeout(dotTimerRef.current);
    dotTimerRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      clearInterval(tickRef.current);
      const remaining = targetsLeftRef.current;
      if (remaining > 0) {
        playMiss();
        const nm = missRef.current + remaining;
        setMisses(nm);
        setRoundMisses(r => r + remaining);
        roundMissesRef.current += remaining;
        setShowFlash("miss");
        setTimeout(() => setShowFlash(null), 300);
        if (nm >= MAX_MISSES) {
          activeRef.current = false;
          setDots([]);
          playGameOver();
          endGame(scoreRef.current, roundRef.current, modeRef.current);
          setScreen("gameOver");
          return;
        }
      }
      const nc = dotsClearedRef.current + 1;
      setDotsCleared(nc);
      setDots([]);
      if (nc >= DOTS_PER_ROUND) {
        activeRef.current = false;
        playRoundUp();
        onRoundComplete();
        setScreen("roundEnd");
      } else {
        setTimeout(() => spawnMode3Wave(currentRound), 400);
      }
    }, timeMs);
  }, [getFieldDims, getTimeForRound, endGame, onRoundComplete]);

  // ========== MODE 1 & 2 ==========
  const spawnDot = useCallback((currentRound: number, currentMode: number) => {
    if (!activeRef.current) return;
    if (currentMode === 3) { spawnMode3Wave(currentRound); return; }
    const { w, h } = getFieldDims();
    const pos = getPos(w, h, DOT_SIZE);
    const timeMs = getTimeForRound(currentRound);
    let color: string;
    if (currentMode === 1) {
      color = "#00E5FF";
    } else {
      const isDecoy = Math.random() < 0.3 + Math.min(currentRound * 0.03, 0.25);
      color = isDecoy ? DECOY_COLORS[Math.floor(Math.random() * DECOY_COLORS.length)] : TARGET_COLOR_MODE2;
    }
    const newDot: DotData = { id: Date.now() + Math.random(), x: pos.x, y: pos.y, color, isTarget: currentMode === 1 || color === TARGET_COLOR_MODE2 };
    setDots([newDot]);
    setTimeLeft(timeMs);
    clearInterval(tickRef.current);
    const startT = Date.now();
    tickRef.current = setInterval(() => { setTimeLeft(Math.max(0, timeMs - (Date.now() - startT))); }, 30);
    clearTimeout(dotTimerRef.current);
    dotTimerRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      clearInterval(tickRef.current);
      if (newDot.isTarget) {
        playMiss();
        const nm = missRef.current + 1;
        setMisses(nm);
        setRoundMisses(r => r + 1);
        roundMissesRef.current++;
        setShowFlash("miss");
        setTimeout(() => setShowFlash(null), 300);
        if (nm >= MAX_MISSES) {
          activeRef.current = false;
          setDots([]);
          playGameOver();
          endGame(scoreRef.current, roundRef.current, modeRef.current);
          setScreen("gameOver");
          return;
        }
      }
      const nc = dotsClearedRef.current + 1;
      setDotsCleared(nc);
      setDots([]);
      if (nc >= DOTS_PER_ROUND) {
        activeRef.current = false;
        playRoundUp();
        onRoundComplete();
        setScreen("roundEnd");
      } else {
        setTimeout(() => spawnDot(currentRound, currentMode), 300);
      }
    }, timeMs);
    if (currentMode === 2 && currentRound >= 2) {
      const numExtra = Math.min(currentRound - 1, 3);
      for (let i = 0; i < numExtra; i++) {
        const delay = rand(200, timeMs * 0.7);
        setTimeout(() => {
          if (!activeRef.current) return;
          const p = getPos(w, h, DOT_SIZE);
          setDots(prev => [...prev, { id: Date.now() + Math.random(), x: p.x, y: p.y, color: DECOY_COLORS[Math.floor(Math.random() * DECOY_COLORS.length)], isTarget: false }]);
        }, delay);
      }
    }
  }, [getFieldDims, getTimeForRound, endGame, onRoundComplete, spawnMode3Wave]);

  const handleDotTap = useCallback((dot: DotData) => {
    if (!activeRef.current) return;
    const isMode3 = modeRef.current === 3;
    if (dot.isTarget) {
      playTap();
      setScore(s => s + 1);
      setRipples(prev => [...prev, { id: Date.now(), x: dot.x, y: dot.y, color: dot.color }]);
      setTimeout(() => setRipples(prev => prev.slice(1)), 500);
      setShowFlash("hit");
      setTimeout(() => setShowFlash(null), 200);
      if (isMode3) {
        setDots(prev => prev.filter(d => d.id !== dot.id));
        const newTL = targetsLeftRef.current - 1;
        setTargetsLeft(newTL);
        targetsLeftRef.current = newTL;
        if (newTL <= 0) {
          clearTimeout(dotTimerRef.current);
          clearInterval(tickRef.current);
          const nc = dotsClearedRef.current + 1;
          setDotsCleared(nc);
          setDots([]);
          if (nc >= DOTS_PER_ROUND) {
            activeRef.current = false;
            playRoundUp();
            onRoundComplete();
            setScreen("roundEnd");
          } else {
            setTimeout(() => spawnMode3Wave(roundRef.current), 350);
          }
        }
      } else {
        clearTimeout(dotTimerRef.current);
        clearInterval(tickRef.current);
        const nc = dotsClearedRef.current + 1;
        setDotsCleared(nc);
        setDots([]);
        if (nc >= DOTS_PER_ROUND) {
          activeRef.current = false;
          playRoundUp();
          onRoundComplete();
          setScreen("roundEnd");
        } else {
          setTimeout(() => spawnDot(roundRef.current, modeRef.current), 250);
        }
      }
    } else {
      playWrongColor();
      const nm = missRef.current + 1;
      setMisses(nm);
      setRoundMisses(r => r + 1);
      roundMissesRef.current++;
      setShowFlash("wrong");
      setTimeout(() => setShowFlash(null), 300);
      setDots(prev => prev.filter(d => d.id !== dot.id));
      if (nm >= MAX_MISSES) {
        activeRef.current = false;
        clearTimeout(dotTimerRef.current);
        clearInterval(tickRef.current);
        setDots([]);
        playGameOver();
        endGame(scoreRef.current, roundRef.current, modeRef.current);
        setScreen("gameOver");
      }
    }
  }, [spawnDot, spawnMode3Wave, endGame, onRoundComplete]);

  const startRound = useCallback((r: number) => {
    setDotsCleared(0);
    dotsClearedRef.current = 0;
    setDots([]);
    setRoundMisses(0);
    roundMissesRef.current = 0;
    setCountdown(3);
    let c = 3;
    const iv = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(iv);
        setCountdown(null);
        activeRef.current = true;
        spawnDot(r, modeRef.current);
      } else {
        setCountdown(c);
      }
    }, 700);
  }, [spawnDot]);

  const checkFreeRounds = useCallback((selectedMode: number): boolean => {
    if (gameDataRef.current.unlocked) return true;
    const used = gameDataRef.current.freeRoundsUsed?.[selectedMode] || 0;
    return used < FREE_ROUNDS_LIMIT;
  }, []);

  const consumeFreeRound = useCallback((selectedMode: number) => {
    if (gameDataRef.current.unlocked) return;
    const fru = { ...(gameDataRef.current.freeRoundsUsed || { 1: 0, 2: 0, 3: 0 }) };
    fru[selectedMode] = (fru[selectedMode] || 0) + 1;
    persistAll({ freeRoundsUsed: fru });
  }, [persistAll]);

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Check server-side unlock status on load (if authenticated)
  const { user: authUser, isAuthenticated } = useAuth();
  const purchaseQuery = trpc.purchase.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const createCheckoutMutation = trpc.purchase.createCheckout.useMutation();

  // Sync server unlock status to local state
  useEffect(() => {
    if (purchaseQuery.data?.gameUnlocked && !gameDataRef.current.unlocked) {
      persistAll({ unlocked: true });
    }
  }, [purchaseQuery.data, persistAll]);

  // Check for payment success/cancel URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      persistAll({ unlocked: true });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [persistAll]);

  const handleUnlock = useCallback(async () => {
    if (!isAuthenticated) {
      // Redirect to login first
      window.location.href = getLoginUrl();
      return;
    }
    setCheckoutLoading(true);
    try {
      const result = await createCheckoutMutation.mutateAsync();
      if (result.alreadyUnlocked) {
        persistAll({ unlocked: true });
        setScreen("menu");
      } else if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(false);
    }
  }, [isAuthenticated, createCheckoutMutation, persistAll]);

  const startGame = useCallback((selectedMode: number) => {
    if (!checkFreeRounds(selectedMode)) {
      setMode(selectedMode);
      modeRef.current = selectedMode;
      setScreen("paywall");
      return;
    }
    consumeFreeRound(selectedMode);
    setMode(selectedMode);
    modeRef.current = selectedMode;
    setRound(1);
    setScore(0);
    setMisses(0);
    setDotsCleared(0);
    setRoundMisses(0);
    roundMissesRef.current = 0;
    setPerfectStreak(0);
    perfectStreakRef.current = 0;
    setScreen("playing");
    persistAll({ playerName });
    setTimeout(() => startRound(1), 100);
  }, [startRound, persistAll, playerName, checkFreeRounds, consumeFreeRound]);

  const nextRound = useCallback(() => {
    const nr = round + 1;
    setRound(nr);
    setScreen("playing");
    startRound(nr);
  }, [round, startRound]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const dismissToast = useCallback(() => { setToastQueue(prev => prev.slice(1)); }, []);

  const accent = mode === 3 ? "#E84393" : mode === 2 ? TARGET_COLOR_MODE2 : "#00E5FF";
  const accentDim = accent + "33";
  const modeLabel = mode === 1 ? "Classic" : mode === 2 ? "Color Filter" : "Dual Hunt";

  if (!loaded) {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #00E5FF33", borderTopColor: "#00E5FF", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: t.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      color: t.text, overflow: "hidden", userSelect: "none",
      WebkitUserSelect: "none", position: "relative", transition: "background 0.4s",
    }}>
      <style>{`
        @keyframes pulseGlowDynamic {
          0%, 100% { box-shadow: 0 0 20px ${accentDim}; }
          50% { box-shadow: 0 0 40px ${accentDim}, 0 0 60px ${accentDim}; }
        }
      `}</style>

      {/* Toasts */}
      {toastQueue.length > 0 && <AchievementToast achievement={toastQueue[0]} t={t} onDone={dismissToast} key={toastQueue[0].id} />}

      {showPrivacy && <PrivacyModal t={t} onClose={() => setShowPrivacy(false)} />}
      {showAchievements && <AchievementsPanel t={t} unlockedIds={gameData.achievements || []} onClose={() => setShowAchievements(false)} />}

      {/* ═══════ MENU ═══════ */}
      {screen === "menu" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "60px 24px 40px", animation: "fadeSlideUp 0.5s ease", maxWidth: 420 }}>
          <div style={{ position: "absolute", top: 16, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <PrivacyBadge t={t} onTap={() => setShowPrivacy(true)} />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} t={t} />
          </div>

          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 44, fontWeight: 800, background: "linear-gradient(135deg, #00E5FF, #9B6DFF, #E84393)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1, marginBottom: 8 }}>DOTHUNTER</div>
          <div style={{ fontSize: 14, color: t.textMuted, letterSpacing: 6, textTransform: "uppercase", marginBottom: 32 }}>HUNT EVERY DOT</div>

          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 30px #00E5FF66", animation: "pulseGlowDynamic 2s infinite", marginBottom: 28 }} />

          {/* Achievements button */}
          <button onClick={() => setShowAchievements(true)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
            background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 14,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 20, transition: "all 0.2s",
          }}
            onPointerEnter={e => (e.currentTarget.style.borderColor = "#FFD700")}
            onPointerLeave={e => (e.currentTarget.style.borderColor = t.border)}
          >
            <div style={{ width: 24, height: 24 }} dangerouslySetInnerHTML={{ __html: ICONS.star("#FFD700") }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, textAlign: "left" }}>Achievements</div>
              <div style={{ fontSize: 11, color: t.textDim }}>{unlockedCount}/{ACHIEVEMENT_DEFS.length} unlocked</div>
            </div>
            <div style={{ width: "100%", maxWidth: 50, height: 4, background: t.barBg, borderRadius: 2, overflow: "hidden", marginLeft: 8 }}>
              <div style={{ height: "100%", width: `${(unlockedCount / ACHIEVEMENT_DEFS.length) * 100}%`, background: "linear-gradient(90deg, #FFD700, #E84393)", borderRadius: 2 }} />
            </div>
          </button>

          {/* High scores */}
          {(gameData.classicHigh > 0 || gameData.colorHigh > 0 || gameData.dualHigh > 0) && (
            <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap", justifyContent: "center", background: t.cardBg, borderRadius: 14, padding: "12px 20px", border: `1px solid ${t.border}` }}>
              {gameData.classicHigh > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>CLASSIC</div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#00E5FF" }}>{gameData.classicHigh}</div></div>}
              {gameData.colorHigh > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>COLOR</div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: TARGET_COLOR_MODE2 }}>{gameData.colorHigh}</div></div>}
              {gameData.dualHigh > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>DUAL</div><div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "#E84393" }}>{gameData.dualHigh}</div></div>}
            </div>
          )}

          <ScoreHistory recentGames={gameData.recentGames} t={t} />

          <button onClick={() => setScreen("nameEntry")} style={{
            width: "100%", padding: "16px 0", background: "transparent", border: "1.5px solid #00E5FF55",
            borderRadius: 14, color: "#00E5FF", fontSize: 16, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 14,
          }}
            onPointerEnter={e => { e.currentTarget.style.background = "#00E5FF15"; e.currentTarget.style.borderColor = "#00E5FF"; }}
            onPointerLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#00E5FF55"; }}
          >PLAY</button>

          {gameData.recentGames && gameData.recentGames.length > 0 && (
            <button onClick={clearAllData} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginTop: 12, padding: "6px 12px", borderRadius: 8 }}
              onPointerEnter={e => (e.currentTarget.style.color = "#FF4D6A")}
              onPointerLeave={e => (e.currentTarget.style.color = t.textMuted)}
            >Clear all data</button>
          )}
        </div>
      )}

      {/* ═══════ NAME ENTRY ═══════ */}
      {screen === "nameEntry" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420, overflowY: "auto" }}>
          <div style={{ position: "absolute", top: 16, right: 20 }}><ThemeToggle isDark={isDark} onToggle={toggleTheme} t={t} /></div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 24, color: t.text }}>Enter Your Name</div>
          <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value.slice(0, 16))} placeholder="Player" autoFocus
            style={{ width: "100%", padding: "14px 18px", background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 12, color: t.text, fontSize: 18, fontFamily: "inherit", textAlign: "center", marginBottom: 28 }}
            onFocus={e => (e.target.style.borderColor = "#00E5FF")}
            onBlur={e => (e.target.style.borderColor = t.inputBorder)}
          />
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 14, letterSpacing: 3, textTransform: "uppercase" }}>Select Mode</div>
          {!gameData.unlocked && (
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Free trial — {FREE_ROUNDS_LIMIT} rounds per mode
            </div>
          )}
          {(() => {
            const fru = gameData.freeRoundsUsed || { 1: 0, 2: 0, 3: 0 };
            const isUnlocked = gameData.unlocked;
            const freeTag = (m: number, color: string) => !isUnlocked ? (
              <div style={{ fontSize: 10, marginTop: 4, color: fru[m] >= FREE_ROUNDS_LIMIT ? "#FF4D6A" : color, opacity: 0.7 }}>
                {fru[m] >= FREE_ROUNDS_LIMIT ? "\uD83D\uDD12 Locked" : `${FREE_ROUNDS_LIMIT - (fru[m] || 0)} free round${FREE_ROUNDS_LIMIT - (fru[m] || 0) !== 1 ? "s" : ""} left`}
              </div>
            ) : null;
            return (
              <>
                <button onClick={() => startGame(1)} style={{ width: "100%", padding: "14px 0", background: isDark ? "#00E5FF08" : "#00E5FF12", border: "1.5px solid #00E5FF44", borderRadius: 14, color: "#00E5FF", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>●</span>&nbsp;&nbsp;Classic Focus<div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Single dot — pure speed</div>{freeTag(1, "#00E5FF")}
                </button>
                <button onClick={() => startGame(2)} style={{ width: "100%", padding: "14px 0", background: isDark ? "#00E67608" : "#00E67612", border: "1.5px solid #00E67644", borderRadius: 14, color: TARGET_COLOR_MODE2, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>●</span><span style={{ fontSize: 14, marginLeft: 4 }}><span style={{ color: "#FF4D6A" }}>●</span><span style={{ color: "#FFB830" }}>●</span><span style={{ color: "#9B6DFF" }}>●</span></span>&nbsp;&nbsp;Color Filter<div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Tap green, ignore decoys</div>{freeTag(2, "#00E676")}
                </button>
                <button onClick={() => { if (fru[3] >= FREE_ROUNDS_LIMIT && !isUnlocked) { setMode(3); modeRef.current = 3; setScreen("paywall"); return; } setPickedColors([]); setScreen("colorPicker"); }} style={{ width: "100%", padding: "14px 0", background: isDark ? "#E8439308" : "#E8439312", border: "1.5px solid #E8439344", borderRadius: 14, color: "#E84393", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>●●</span>&nbsp;&nbsp;Dual Hunt<div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Pick 2 colors to hunt</div>{freeTag(3, "#E84393")}
                </button>
              </>
            );
          })()}
          <button onClick={() => setScreen("menu")} style={{ marginTop: 16, background: "none", border: "none", color: t.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>← Back</button>
        </div>
      )}

      {/* ═══════ COLOR PICKER ═══════ */}
      {screen === "colorPicker" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 8, color: t.text }}>Choose Your 2 Colors</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 28 }}>Tap the colors you want to hunt</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32, width: "100%", maxWidth: 280 }}>
            {ALL_COLORS.map(c => {
              const sel = pickedColors.includes(c.hex);
              const dis = pickedColors.length >= 2 && !sel;
              return (
                <button key={c.id} onClick={() => {
                  if (sel) setPickedColors(p => p.filter(x => x !== c.hex));
                  else if (pickedColors.length < 2) setPickedColors(p => [...p, c.hex]);
                }} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", borderRadius: 14,
                  background: sel ? `${c.hex}20` : t.cardBg,
                  border: sel ? `2px solid ${c.hex}` : `1.5px solid ${t.border}`,
                  cursor: dis ? "default" : "pointer", opacity: dis ? 0.35 : 1,
                  transition: "all 0.2s", fontFamily: "inherit",
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.hex, boxShadow: sel ? `0 0 14px ${c.hex}66` : "none" }} />
                  <div style={{ fontSize: 10, color: t.textDim, fontWeight: 500 }}>{c.name}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, minHeight: 48, alignItems: "center" }}>
            {pickedColors.length === 0 && <div style={{ fontSize: 13, color: t.textMuted }}>Select 2 colors above</div>}
            {pickedColors.map((hex, i) => <div key={i} style={{ width: 44, height: 44, borderRadius: "50%", background: hex, boxShadow: `0 0 16px ${hex}66`, border: `2px solid ${hex}`, animation: "fadeSlideUp 0.2s ease" }} />)}
            {pickedColors.length === 1 && <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 18 }}>+</div>}
          </div>
          <button onClick={() => startGame(3)} disabled={pickedColors.length !== 2} style={{
            width: "100%", padding: "16px 0",
            background: pickedColors.length === 2 ? "#E84393" : t.barBg,
            border: "none", borderRadius: 14,
            color: pickedColors.length === 2 ? (isDark ? "#0a0a1a" : "#fff") : t.textMuted,
            fontSize: 16, fontWeight: 700, fontFamily: "inherit",
            cursor: pickedColors.length === 2 ? "pointer" : "default",
            boxShadow: pickedColors.length === 2 ? "0 4px 20px #E8439344" : "none",
          }}>START DUAL HUNT</button>
          <button onClick={() => setScreen("nameEntry")} style={{ marginTop: 16, background: "none", border: "none", color: t.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>← Back</button>
        </div>
      )}

      {/* ═══════ PLAYING ═══════ */}
      {screen === "playing" && (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 420, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 8px" }}>
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>{playerName || "Player"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 13, color: t.textDim }}>{modeLabel}</span>
                {mode === 3 && pickedColors.map((hex, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: hex }} />)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Round</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{round}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>Score</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: t.text, lineHeight: 1 }}>{score}</div>
            </div>
          </div>
          <div style={{ padding: "0 20px 6px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}><TimerBar timeLeft={timeLeft} maxTime={getTimeForRound(round)} color={accent} t={t} /></div>
            <MissIndicator misses={misses} max={MAX_MISSES} t={t} />
          </div>
          <div style={{ padding: "0 20px 8px" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: DOTS_PER_ROUND }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < dotsCleared ? accent : t.barBg, transition: "background 0.2s" }} />
              ))}
            </div>
          </div>
          <div ref={fieldRef} style={{
            flex: 1, margin: "0 12px 12px", background: t.surfaceGrad, borderRadius: 20,
            border: `1px solid ${t.border}`, position: "relative", overflow: "hidden",
            touchAction: "manipulation", minHeight: "70vh",
            transition: "background 0.4s, border-color 0.4s",
          }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, ${t.dotGrid} 1px, transparent 1px)`, backgroundSize: "30px 30px", pointerEvents: "none" }} />
            {showFlash && (
              <div style={{
                position: "absolute", inset: 0,
                background: showFlash === "hit" ? accent : showFlash === "wrong" ? "#9B6DFF" : "#FF4D6A",
                animation: showFlash === "hit" ? "flashHit 0.2s ease forwards" : "flashMiss 0.3s ease forwards",
                pointerEvents: "none", zIndex: 30, borderRadius: 20,
              }} />
            )}
            {countdown !== null && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                <div key={countdown} style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: 72, fontWeight: 800, color: accent,
                  animation: "countPulse 0.6s ease", textShadow: `0 0 40px ${accentDim}`,
                }}>{countdown}</div>
              </div>
            )}
            {dots.map(dot => <Dot key={dot.id} dot={dot} onTap={handleDotTap} small={mode === 3} />)}
            {ripples.map(r => <BubblePop key={r.id} x={r.x} y={r.y} color={r.color} />)}
            {mode === 2 && countdown === null && (
              <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 11, color: t.textMuted, pointerEvents: "none" }}>
                Tap <span style={{ color: TARGET_COLOR_MODE2 }}>●</span> green only
              </div>
            )}
            {mode === 3 && countdown === null && (
              <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 11, color: t.textMuted, pointerEvents: "none", display: "flex", justifyContent: "center", gap: 4, alignItems: "center" }}>
                Tap {pickedColors.map((hex, i) => <span key={i} style={{ color: hex, fontSize: 14 }}>●</span>)} only
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ ROUND END ═══════ */}
      {screen === "roundEnd" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: t.textMuted, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Round Complete</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 64, fontWeight: 800, color: accent, lineHeight: 1, marginBottom: 24 }}>{round}</div>
          <div style={{ display: "flex", gap: 32, marginBottom: 40 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>SCORE</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: t.text }}>{score}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>MISSES</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: misses > 0 ? "#FF4D6A" : t.text }}>{misses}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 24 }}>
            Next: <span style={{ color: accent }}>{getTimeForRound(round + 1)}ms</span> per dot
            {mode === 3 && <span> · {Math.min(5 + round, 12)} dots</span>}
          </div>
          <button onClick={nextRound} style={{
            width: "100%", padding: "16px 0", background: accent, border: "none", borderRadius: 14,
            color: t.btnText, fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
            boxShadow: `0 4px 20px ${accent}44`,
          }}>NEXT ROUND →</button>
        </div>
      )}

      {/* ═══════ PAYWALL ═══════ */}
      {screen === "paywall" && (() => {
        const modeNames: Record<number, string> = { 1: "Classic Focus", 2: "Color Filter", 3: "Dual Hunt" };
        const modeColors: Record<number, string> = { 1: "#00E5FF", 2: "#00E676", 3: "#E84393" };
        const mc = modeColors[mode] || "#00E5FF";
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
            <div style={{ position: "absolute", top: 16, right: 20 }}><ThemeToggle isDark={isDark} onToggle={toggleTheme} t={t} /></div>

            {/* Lock icon */}
            <div style={{ width: 80, height: 80, borderRadius: 20, background: `${mc}12`, border: `2px solid ${mc}33`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke={mc} strokeWidth="2" fill={`${mc}20`} />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke={mc} strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="1.5" fill={mc} />
              </svg>
            </div>

            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, color: t.text, marginBottom: 8, textAlign: "center" }}>Unlock Full Game</div>
            <div style={{ fontSize: 14, color: t.textDim, textAlign: "center", lineHeight: 1.6, marginBottom: 28, maxWidth: 320 }}>
              You've used all {FREE_ROUNDS_LIMIT} free rounds for <span style={{ color: mc, fontWeight: 600 }}>{modeNames[mode]}</span>. Unlock unlimited play across all modes.
            </div>

            {/* What you get */}
            <div style={{ width: "100%", background: t.cardBg, borderRadius: 16, padding: "20px 22px", border: `1px solid ${t.border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>What You Get</div>
              {[
                { icon: "\u221E", text: "Unlimited rounds in all 3 modes" },
                { icon: "\u2605", text: "Full achievement tracking" },
                { icon: "\u26A1", text: "No ads, no interruptions" },
                { icon: "\u2764", text: "Support indie game development" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${mc}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: mc }}>{item.icon}</div>
                  <div style={{ fontSize: 13, color: t.textDim }}>{item.text}</div>
                </div>
              ))}
            </div>

            {/* Price button */}
            {!isAuthenticated && (
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, textAlign: "center", padding: "8px 16px", background: `${mc}08`, borderRadius: 10, border: `1px solid ${mc}22` }}>
                Sign in required to purchase
              </div>
            )}
            <button onClick={handleUnlock} disabled={checkoutLoading} style={{
              width: "100%", padding: "18px 0", background: checkoutLoading ? t.barBg : `linear-gradient(135deg, ${mc}, ${mc}cc)`,
              border: "none", borderRadius: 14, color: checkoutLoading ? t.textMuted : (isDark ? "#0a0a1a" : "#fff"),
              fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif",
              cursor: checkoutLoading ? "wait" : "pointer",
              boxShadow: checkoutLoading ? "none" : `0 4px 24px ${mc}44`, marginBottom: 10,
              letterSpacing: 0.5, transition: "all 0.3s",
            }}>
              {checkoutLoading ? "REDIRECTING..." : (!isAuthenticated ? "SIGN IN TO UNLOCK — $1.99" : "UNLOCK FOR $1.99")}
            </button>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 20 }}>One-time purchase via Stripe. No subscriptions.</div>

            <button onClick={() => setScreen("menu")} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer", padding: "8px 16px" }}>
              \u2190 Back to Menu
            </button>
          </div>
        );
      })()}

      {/* ═══════ GAME OVER ═══════ */}
      {screen === "gameOver" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", padding: "40px 24px", animation: "fadeSlideUp 0.4s ease", maxWidth: 420 }}>
          <div style={{ fontSize: 13, color: "#FF4D6A", letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>Game Over</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 32, color: t.textDim }}>{playerName || "Player"}</div>
          <div style={{ display: "flex", gap: 32, marginBottom: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>FINAL SCORE</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 48, fontWeight: 800, color: accent }}>{score}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>ROUND</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 48, fontWeight: 800, color: t.text }}>{round}</div>
            </div>
          </div>
          {score > 0 && score >= currentHigh && (
            <div style={{ fontSize: 13, color: "#FFD700", marginBottom: 24, letterSpacing: 2, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 16, height: 16 }} dangerouslySetInnerHTML={{ __html: ICONS.star("#FFD700") }} />
              New Best
              <div style={{ width: 16, height: 16 }} dangerouslySetInnerHTML={{ __html: ICONS.star("#FFD700") }} />
            </div>
          )}
          <button onClick={() => startGame(mode)} style={{
            width: "100%", padding: "16px 0", background: accent, border: "none", borderRadius: 14,
            color: t.btnText, fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
            marginBottom: 12, boxShadow: `0 4px 20px ${accent}44`,
          }}>PLAY AGAIN</button>
          <button onClick={() => { setScreen("menu"); setMode(1); }} style={{
            width: "100%", padding: "14px 0", background: "transparent", border: `1.5px solid ${t.border}`,
            borderRadius: 14, color: t.textDim, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
          }}>MENU</button>
        </div>
      )}
    </div>
  );
}
