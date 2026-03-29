/*
 * DOTHUNTER — Main Game Screen (React Native)
 * Ported from web version Home.tsx
 * All 3 modes, achievements, paywall, full game logic
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Dimensions, ScrollView,
  StatusBar, Alert, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DOTS_PER_ROUND, BASE_TIME_MS, TIME_DECREASE, MIN_TIME_MS, MAX_MISSES,
  FREE_ROUNDS_LIMIT, DOT_SIZE, DOT_SIZE_SM, DECOY_COLORS, TARGET_COLOR_MODE2,
  ALL_COLORS, rand, getPos, getNonOverlapping, themes, getTimeForRound,
  defaultStats, defaultGameData, MODE_LABELS, MODE_COLORS_TAG,
  type ThemeColors, type DotData, type GameData, type GameResult,
} from "../lib/constants";
import { ACHIEVEMENT_DEFS, TIER_BORDER, checkNewAchievements, type AchievementDef } from "../lib/achievements";
import { loadData, saveData } from "../lib/storage";
import { playTap, playMiss, playWrongColor, playRoundUp, playGameOver, playAchievement } from "../lib/audio";
import { initIAP, purchaseUnlock, restorePurchases, disconnectIAP } from "../lib/purchase";
import Dot from "../components/Dot";
import TimerBar from "../components/TimerBar";
import MissIndicator from "../components/MissIndicator";
import AchievementToast from "../components/AchievementToast";
import AchievementsPanel from "../components/AchievementsPanel";

type Screen = "menu" | "nameEntry" | "colorPicker" | "playing" | "roundEnd" | "gameOver" | "paywall";

const { width: SCREEN_W } = Dimensions.get("window");
const FIELD_W = Math.min(SCREEN_W - 24, 420);
const FIELD_H = Dimensions.get("window").height * 0.6;

export default function GameScreen() {
  // ═══════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════
  const [screen, setScreen] = useState<Screen>("menu");
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [dotsCleared, setDotsCleared] = useState(0);
  const [dots, setDots] = useState<DotData[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showFlash, setShowFlash] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [gameData, setGameData] = useState<GameData>(defaultGameData());
  const [showAchievements, setShowAchievements] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pickedColors, setPickedColors] = useState<string[]>([]);
  const [targetsLeft, setTargetsLeft] = useState(0);
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>([]);
  const [roundMisses, setRoundMisses] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const t = isDark ? themes.dark : themes.light;

  // ═══════════════════════════════════════════
  // REFS (for use inside callbacks/timers)
  // ═══════════════════════════════════════════
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
  const dotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync
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

  // ═══════════════════════════════════════════
  // INIT — load saved data + IAP
  // ═══════════════════════════════════════════
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

    // Init IAP
    initIAP(() => {
      // On successful purchase
      const next = { ...gameDataRef.current, unlocked: true };
      setGameData(next);
      gameDataRef.current = next;
      saveData(next);
      setScreen("menu");
    });

    return () => {
      disconnectIAP();
    };
  }, []);

  // ═══════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════
  const persistAll = useCallback(async (ov: Partial<GameData> = {}) => {
    const next = { ...gameDataRef.current, ...ov };
    setGameData(next);
    gameDataRef.current = next;
    await saveData(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const n = !prev;
      persistAll({ theme: n ? "dark" : "light" });
      return n;
    });
  }, [persistAll]);

  // ═══════════════════════════════════════════
  // ACHIEVEMENTS
  // ═══════════════════════════════════════════
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
      d.achievements = [...unlocked, ...newOnes.map((a) => a.id)];
      setToastQueue((prev) => [...prev, ...newOnes]);
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
    Alert.alert("Clear Data", "This will reset all scores, achievements, and settings.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          const empty = defaultGameData();
          empty.theme = isDark ? "dark" : "light";
          empty.playerName = playerName;
          setGameData(empty);
          gameDataRef.current = empty;
          await saveData(empty);
        },
      },
    ]);
  }, [isDark, playerName]);

  // ═══════════════════════════════════════════
  // TIMER HELPERS
  // ═══════════════════════════════════════════
  const clearTimers = useCallback(() => {
    if (dotTimerRef.current) clearTimeout(dotTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  const endGame = useCallback(
    (finalScore: number, finalRound: number, gameMode: number) => {
      const perfectRound = roundMissesRef.current === 0 && dotsClearedRef.current > 0;
      const ps = perfectRound ? perfectStreakRef.current + 1 : 0;
      processAchievements({ score: finalScore, round: finalRound, mode: gameMode, perfectRound, perfectStreak: ps });
    },
    [processAchievements]
  );

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
        d.achievements = [...(d.achievements || []), ...newOnes.map((a) => a.id)];
        setToastQueue((prev) => [...prev, ...newOnes]);
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

  // ═══════════════════════════════════════════
  // MODE 3 — DUAL HUNT
  // ═══════════════════════════════════════════
  const spawnMode3Wave = useCallback(
    (currentRound: number) => {
      if (!activeRef.current) return;
      const w = FIELD_W;
      const h = FIELD_H;
      const timeMs = getTimeForRound(currentRound);
      const picked = pickedRef.current;
      const totalDots = Math.min(4 + currentRound, 12);
      const targetCount = Math.max(2, Math.floor(totalDots * 0.4));
      const decoyCount = totalDots - targetCount;
      const positions = getNonOverlapping(totalDots, w, h, DOT_SIZE_SM);
      const decoyPool = ALL_COLORS.filter((c) => !picked.includes(c.hex)).map((c) => c.hex);
      const newDots: DotData[] = [];
      for (let i = 0; i < targetCount; i++) {
        newDots.push({
          id: Date.now() + Math.random() + i,
          x: positions[i].x,
          y: positions[i].y,
          color: picked[Math.floor(Math.random() * picked.length)],
          isTarget: true,
        });
      }
      for (let i = 0; i < decoyCount; i++) {
        newDots.push({
          id: Date.now() + Math.random() + targetCount + i,
          x: positions[targetCount + i].x,
          y: positions[targetCount + i].y,
          color: decoyPool[Math.floor(Math.random() * decoyPool.length)],
          isTarget: false,
        });
      }
      setDots(newDots);
      setTargetsLeft(targetCount);
      targetsLeftRef.current = targetCount;
      setTimeLeft(timeMs);
      if (tickRef.current) clearInterval(tickRef.current);
      const startT = Date.now();
      tickRef.current = setInterval(() => {
        setTimeLeft(Math.max(0, timeMs - (Date.now() - startT)));
      }, 30);
      if (dotTimerRef.current) clearTimeout(dotTimerRef.current);
      dotTimerRef.current = setTimeout(() => {
        if (!activeRef.current) return;
        if (tickRef.current) clearInterval(tickRef.current);
        const remaining = targetsLeftRef.current;
        if (remaining > 0) {
          playMiss();
          const nm = missRef.current + remaining;
          setMisses(nm);
          setRoundMisses((r) => r + remaining);
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
    },
    [endGame, onRoundComplete]
  );

  // ═══════════════════════════════════════════
  // MODE 1 & 2
  // ═══════════════════════════════════════════
  const spawnDot = useCallback(
    (currentRound: number, currentMode: number) => {
      if (!activeRef.current) return;
      if (currentMode === 3) {
        spawnMode3Wave(currentRound);
        return;
      }
      const w = FIELD_W;
      const h = FIELD_H;
      const timeMs = getTimeForRound(currentRound);
      let color: string;
      if (currentMode === 1) {
        color = "#00E5FF";
      } else {
        const isDecoy = Math.random() < 0.3 + Math.min(currentRound * 0.03, 0.25);
        color = isDecoy ? DECOY_COLORS[Math.floor(Math.random() * DECOY_COLORS.length)] : TARGET_COLOR_MODE2;
      }
      const pos = getPos(w, h, DOT_SIZE);
      const newDot: DotData = {
        id: Date.now() + Math.random(),
        x: pos.x,
        y: pos.y,
        color,
        isTarget: currentMode === 1 || color === TARGET_COLOR_MODE2,
      };
      setDots([newDot]);
      setTimeLeft(timeMs);
      if (tickRef.current) clearInterval(tickRef.current);
      const startT = Date.now();
      tickRef.current = setInterval(() => {
        setTimeLeft(Math.max(0, timeMs - (Date.now() - startT)));
      }, 30);
      if (dotTimerRef.current) clearTimeout(dotTimerRef.current);
      dotTimerRef.current = setTimeout(() => {
        if (!activeRef.current) return;
        if (tickRef.current) clearInterval(tickRef.current);
        if (newDot.isTarget) {
          playMiss();
          const nm = missRef.current + 1;
          setMisses(nm);
          setRoundMisses((r) => r + 1);
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
      // Mode 2 extra decoys
      if (currentMode === 2 && currentRound >= 2) {
        const numExtra = Math.min(currentRound - 1, 3);
        for (let i = 0; i < numExtra; i++) {
          const delay = rand(200, timeMs * 0.7);
          setTimeout(() => {
            if (!activeRef.current) return;
            const p = getPos(w, h, DOT_SIZE);
            setDots((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                x: p.x,
                y: p.y,
                color: DECOY_COLORS[Math.floor(Math.random() * DECOY_COLORS.length)],
                isTarget: false,
              },
            ]);
          }, delay);
        }
      }
    },
    [spawnMode3Wave, endGame, onRoundComplete]
  );

  // ═══════════════════════════════════════════
  // DOT TAP HANDLER
  // ═══════════════════════════════════════════
  const handleDotTap = useCallback(
    (dot: DotData) => {
      if (!activeRef.current) return;
      const isMode3 = modeRef.current === 3;
      if (dot.isTarget) {
        playTap();
        setScore((s) => s + 1);
        setShowFlash("hit");
        setTimeout(() => setShowFlash(null), 200);
        if (isMode3) {
          setDots((prev) => prev.filter((d) => d.id !== dot.id));
          const newTL = targetsLeftRef.current - 1;
          setTargetsLeft(newTL);
          targetsLeftRef.current = newTL;
          if (newTL <= 0) {
            if (dotTimerRef.current) clearTimeout(dotTimerRef.current);
            if (tickRef.current) clearInterval(tickRef.current);
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
          if (dotTimerRef.current) clearTimeout(dotTimerRef.current);
          if (tickRef.current) clearInterval(tickRef.current);
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
        setRoundMisses((r) => r + 1);
        roundMissesRef.current++;
        setShowFlash("wrong");
        setTimeout(() => setShowFlash(null), 300);
        setDots((prev) => prev.filter((d) => d.id !== dot.id));
        if (nm >= MAX_MISSES) {
          activeRef.current = false;
          if (dotTimerRef.current) clearTimeout(dotTimerRef.current);
          if (tickRef.current) clearInterval(tickRef.current);
          setDots([]);
          playGameOver();
          endGame(scoreRef.current, roundRef.current, modeRef.current);
          setScreen("gameOver");
        }
      }
    },
    [spawnDot, spawnMode3Wave, endGame, onRoundComplete]
  );

  // ═══════════════════════════════════════════
  // ROUND START
  // ═══════════════════════════════════════════
  const startRound = useCallback(
    (r: number) => {
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
    },
    [spawnDot]
  );

  // ═══════════════════════════════════════════
  // FREE ROUNDS / PAYWALL
  // ═══════════════════════════════════════════
  const checkFreeRounds = useCallback((selectedMode: number): boolean => {
    if (gameDataRef.current.unlocked) return true;
    const used = gameDataRef.current.freeRoundsUsed?.[selectedMode] || 0;
    return used < FREE_ROUNDS_LIMIT;
  }, []);

  const consumeFreeRound = useCallback(
    (selectedMode: number) => {
      if (gameDataRef.current.unlocked) return;
      const fru = { ...(gameDataRef.current.freeRoundsUsed || { 1: 0, 2: 0, 3: 0 }) };
      fru[selectedMode] = (fru[selectedMode] || 0) + 1;
      persistAll({ freeRoundsUsed: fru });
    },
    [persistAll]
  );

  const handleUnlock = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const success = await purchaseUnlock();
      if (!success) {
        // IAP not available — offer web fallback
        Alert.alert(
          "Purchase",
          "In-app purchases are not available in this build. You can unlock via the web version at dothuntergame.app",
          [
            { text: "Open Web", onPress: () => Linking.openURL("https://dothuntergame.app/play") },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    } catch (e) {
      console.error("Purchase error:", e);
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    const restored = await restorePurchases();
    if (restored) {
      persistAll({ unlocked: true });
      Alert.alert("Restored", "Your purchase has been restored!");
      setScreen("menu");
    } else {
      Alert.alert("No Purchases", "No previous purchases found.");
    }
  }, [persistAll]);

  // ═══════════════════════════════════════════
  // START GAME
  // ═══════════════════════════════════════════
  const startGame = useCallback(
    (selectedMode: number) => {
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
    },
    [startRound, persistAll, playerName, checkFreeRounds, consumeFreeRound]
  );

  const nextRound = useCallback(() => {
    const nr = round + 1;
    setRound(nr);
    setScreen("playing");
    startRound(nr);
  }, [round, startRound]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const dismissToast = useCallback(() => {
    setToastQueue((prev) => prev.slice(1));
  }, []);

  // ═══════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════
  const accent = mode === 3 ? "#E84393" : mode === 2 ? TARGET_COLOR_MODE2 : "#00E5FF";
  const modeLabel = mode === 1 ? "Classic" : mode === 2 ? "Color Filter" : "Dual Hunt";
  const currentHigh = mode === 1 ? (gameData.classicHigh || 0) : mode === 2 ? (gameData.colorHigh || 0) : (gameData.dualHigh || 0);
  const unlockedCount = (gameData.achievements || []).length;

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: "#0a0a1a", flex: 1 }]}>
        <Text style={{ color: "#00E5FF", fontSize: 24, fontWeight: "800" }}>DOTHUNTER</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={t.bg} />

      {/* Achievement Toast */}
      {toastQueue.length > 0 && (
        <AchievementToast achievement={toastQueue[0]} t={t} onDone={dismissToast} key={toastQueue[0].id} />
      )}

      {/* Achievements Panel */}
      {showAchievements && (
        <AchievementsPanel t={t} unlockedIds={gameData.achievements || []} onClose={() => setShowAchievements(false)} />
      )}

      {/* ═══════ MENU ═══════ */}
      {screen === "menu" && (
        <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
          {/* Theme toggle */}
          <View style={styles.topBar}>
            <Pressable onPress={toggleTheme} style={[styles.themeBtn, { borderColor: t.border }]}>
              <Text style={{ fontSize: 16 }}>{isDark ? "🌙" : "☀️"}</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>DOTHUNTER</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>HUNT EVERY DOT</Text>

          {/* Glowing dot */}
          <View style={styles.glowDot} />

          {/* Achievements button */}
          <Pressable onPress={() => setShowAchievements(true)} style={[styles.achieveBtn, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <Text style={{ fontSize: 18, color: "#FFD700" }}>★</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>Achievements</Text>
              <Text style={{ fontSize: 11, color: t.textDim }}>
                {unlockedCount}/{ACHIEVEMENT_DEFS.length} unlocked
              </Text>
            </View>
          </Pressable>

          {/* High scores */}
          {(gameData.classicHigh > 0 || gameData.colorHigh > 0 || gameData.dualHigh > 0) && (
            <View style={[styles.highScores, { backgroundColor: t.cardBg, borderColor: t.border }]}>
              {gameData.classicHigh > 0 && (
                <View style={styles.highItem}>
                  <Text style={[styles.highLabel, { color: t.textMuted }]}>CLASSIC</Text>
                  <Text style={[styles.highValue, { color: "#00E5FF" }]}>{gameData.classicHigh}</Text>
                </View>
              )}
              {gameData.colorHigh > 0 && (
                <View style={styles.highItem}>
                  <Text style={[styles.highLabel, { color: t.textMuted }]}>COLOR</Text>
                  <Text style={[styles.highValue, { color: TARGET_COLOR_MODE2 }]}>{gameData.colorHigh}</Text>
                </View>
              )}
              {gameData.dualHigh > 0 && (
                <View style={styles.highItem}>
                  <Text style={[styles.highLabel, { color: t.textMuted }]}>DUAL</Text>
                  <Text style={[styles.highValue, { color: "#E84393" }]}>{gameData.dualHigh}</Text>
                </View>
              )}
            </View>
          )}

          {/* Recent games */}
          {gameData.recentGames && gameData.recentGames.length > 0 && (
            <View style={[styles.recentCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
              <Text style={[styles.sectionLabel, { color: t.textMuted }]}>RECENT GAMES</Text>
              {gameData.recentGames
                .slice(-5)
                .reverse()
                .map((g, i) => (
                  <View key={i} style={[styles.recentRow, { borderBottomColor: t.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: (MODE_COLORS_TAG[g.mode] || "#888") + "18",
                          color: MODE_COLORS_TAG[g.mode] || "#888",
                          fontWeight: "600",
                          overflow: "hidden",
                        }}
                      >
                        {MODE_LABELS[g.mode] || "???"}
                      </Text>
                      <Text style={{ fontSize: 13, color: t.textDim }}>R{g.round}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: t.text }}>{g.score}</Text>
                  </View>
                ))}
            </View>
          )}

          <Pressable onPress={() => setScreen("nameEntry")} style={styles.playBtn}>
            <Text style={styles.playBtnText}>PLAY</Text>
          </Pressable>

          {gameData.recentGames && gameData.recentGames.length > 0 && (
            <Pressable onPress={clearAllData}>
              <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 12 }}>Clear all data</Text>
            </Pressable>
          )}

          <Pressable onPress={() => Alert.alert("Privacy", "All game data is stored locally on your device. No data is sent to any server. No accounts, no tracking, no ads.")}>
            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 16 }}>🛡 Data stored locally</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ═══════ NAME ENTRY ═══════ */}
      {screen === "nameEntry" && (
        <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
          <Text style={[styles.screenTitle, { color: t.text }]}>Enter Your Name</Text>
          <TextInput
            value={playerName}
            onChangeText={(v) => setPlayerName(v.slice(0, 16))}
            placeholder="Player"
            placeholderTextColor={t.textMuted}
            style={[styles.nameInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            autoFocus
          />
          <Text style={[styles.sectionLabel, { color: t.textMuted, marginBottom: 14 }]}>SELECT MODE</Text>
          {!gameData.unlocked && (
            <Text style={{ fontSize: 11, color: t.textMuted, marginBottom: 12 }}>
              Free trial — {FREE_ROUNDS_LIMIT} rounds per mode
            </Text>
          )}
          {(() => {
            const fru = gameData.freeRoundsUsed || { 1: 0, 2: 0, 3: 0 };
            const isUnlocked = gameData.unlocked;
            const freeTag = (m: number, color: string) => {
              if (isUnlocked) return null;
              return fru[m] >= FREE_ROUNDS_LIMIT ? (
                <Text style={{ fontSize: 10, marginTop: 4, color: "#FF4D6A" }}>🔒 Locked</Text>
              ) : (
                <Text style={{ fontSize: 10, marginTop: 4, color, opacity: 0.7 }}>
                  {FREE_ROUNDS_LIMIT - (fru[m] || 0)} free round{FREE_ROUNDS_LIMIT - (fru[m] || 0) !== 1 ? "s" : ""} left
                </Text>
              );
            };
            return (
              <>
                <Pressable onPress={() => startGame(1)} style={[styles.modeBtn, { borderColor: "#00E5FF44" }]}>
                  <Text style={{ color: "#00E5FF", fontSize: 15, fontWeight: "600" }}>● Classic Focus</Text>
                  <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Single dot — pure speed</Text>
                  {freeTag(1, "#00E5FF")}
                </Pressable>
                <Pressable onPress={() => startGame(2)} style={[styles.modeBtn, { borderColor: "#00E67644" }]}>
                  <Text style={{ color: TARGET_COLOR_MODE2, fontSize: 15, fontWeight: "600" }}>
                    ● <Text style={{ color: "#FF4D6A" }}>●</Text>
                    <Text style={{ color: "#FFB830" }}>●</Text>
                    <Text style={{ color: "#9B6DFF" }}>●</Text> Color Filter
                  </Text>
                  <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Tap green, ignore decoys</Text>
                  {freeTag(2, "#00E676")}
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (fru[3] >= FREE_ROUNDS_LIMIT && !isUnlocked) {
                      setMode(3);
                      modeRef.current = 3;
                      setScreen("paywall");
                      return;
                    }
                    setPickedColors([]);
                    setScreen("colorPicker");
                  }}
                  style={[styles.modeBtn, { borderColor: "#E8439344" }]}
                >
                  <Text style={{ color: "#E84393", fontSize: 15, fontWeight: "600" }}>●● Dual Hunt</Text>
                  <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>Pick 2 colors to hunt</Text>
                  {freeTag(3, "#E84393")}
                </Pressable>
              </>
            );
          })()}
          <Pressable onPress={() => setScreen("menu")}>
            <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 16 }}>← Back</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ═══════ COLOR PICKER ═══════ */}
      {screen === "colorPicker" && (
        <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
          <Text style={[styles.screenTitle, { color: t.text }]}>Choose Your 2 Colors</Text>
          <Text style={{ fontSize: 13, color: t.textMuted, marginBottom: 28 }}>Tap the colors you want to hunt</Text>
          <View style={styles.colorGrid}>
            {ALL_COLORS.map((c) => {
              const sel = pickedColors.includes(c.hex);
              const dis = pickedColors.length >= 2 && !sel;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    if (dis) return;
                    if (sel) setPickedColors((p) => p.filter((x) => x !== c.hex));
                    else if (pickedColors.length < 2) setPickedColors((p) => [...p, c.hex]);
                  }}
                  style={{
                    alignItems: "center",
                    gap: 6,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: sel ? c.hex + "20" : t.cardBg,
                    borderWidth: sel ? 2 : 1.5,
                    borderColor: sel ? c.hex : t.border,
                    opacity: dis ? 0.35 : 1,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.hex }} />
                  <Text style={{ fontSize: 10, color: t.textDim, fontWeight: "500" }}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24, minHeight: 48, alignItems: "center" }}>
            {pickedColors.length === 0 && <Text style={{ fontSize: 13, color: t.textMuted }}>Select 2 colors above</Text>}
            {pickedColors.map((hex, i) => (
              <View key={i} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: hex, borderWidth: 2, borderColor: hex }} />
            ))}
            {pickedColors.length === 1 && (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: t.border,
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: t.textMuted, fontSize: 18 }}>+</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => startGame(3)}
            disabled={pickedColors.length !== 2}
            style={[
              styles.bigBtn,
              {
                backgroundColor: pickedColors.length === 2 ? "#E84393" : t.barBg,
                opacity: pickedColors.length === 2 ? 1 : 0.5,
              },
            ]}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: pickedColors.length === 2 ? "#fff" : t.textMuted }}>
              START DUAL HUNT
            </Text>
          </Pressable>
          <Pressable onPress={() => setScreen("nameEntry")}>
            <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 16 }}>← Back</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ═══════ PLAYING ═══════ */}
      {screen === "playing" && (
        <View style={{ flex: 1, width: "100%", maxWidth: 420, alignSelf: "center" }}>
          {/* HUD */}
          <View style={styles.hud}>
            <View>
              <Text style={[styles.hudLabel, { color: t.textMuted }]}>{playerName || "Player"}</Text>
              <Text style={{ fontSize: 13, color: t.textDim }}>{modeLabel}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.hudLabel, { color: t.textMuted }]}>ROUND</Text>
              <Text style={[styles.hudValue, { color: accent }]}>{round}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.hudLabel, { color: t.textMuted }]}>SCORE</Text>
              <Text style={[styles.hudValue, { color: t.text }]}>{score}</Text>
            </View>
          </View>
          <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <TimerBar timeLeft={timeLeft} maxTime={getTimeForRound(round)} color={accent} t={t} />
            </View>
            <MissIndicator misses={misses} max={MAX_MISSES} t={t} />
          </View>
          {/* Dots progress */}
          <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {Array.from({ length: DOTS_PER_ROUND }).map((_, i) => (
                <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < dotsCleared ? accent : t.barBg }} />
              ))}
            </View>
          </View>
          {/* Game field */}
          <View
            style={[
              styles.field,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                width: FIELD_W,
                height: FIELD_H,
                alignSelf: "center",
              },
            ]}
          >
            {/* Flash overlay */}
            {showFlash && (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: showFlash === "hit" ? accent + "33" : showFlash === "wrong" ? "#9B6DFF33" : "#FF4D6A33",
                  borderRadius: 20,
                  zIndex: 30,
                }}
              />
            )}
            {/* Countdown */}
            {countdown !== null && (
              <View style={[StyleSheet.absoluteFillObject, styles.center, { zIndex: 50 }]}>
                <Text style={{ fontSize: 72, fontWeight: "800", color: accent }}>{countdown}</Text>
              </View>
            )}
            {/* Dots */}
            {dots.map((dot) => (
              <Dot key={dot.id} dot={dot} onTap={handleDotTap} small={mode === 3} />
            ))}
            {/* Mode hint */}
            {mode === 2 && countdown === null && (
              <View style={styles.modeHint}>
                <Text style={{ fontSize: 11, color: t.textMuted }}>
                  Tap <Text style={{ color: TARGET_COLOR_MODE2 }}>●</Text> green only
                </Text>
              </View>
            )}
            {mode === 3 && countdown === null && (
              <View style={styles.modeHint}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 11, color: t.textMuted }}>Tap </Text>
                  {pickedColors.map((hex, i) => (
                    <Text key={i} style={{ color: hex, fontSize: 14 }}>
                      ●
                    </Text>
                  ))}
                  <Text style={{ fontSize: 11, color: t.textMuted }}> only</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ═══════ ROUND END ═══════ */}
      {screen === "roundEnd" && (
        <View style={styles.centerScreen}>
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>ROUND COMPLETE</Text>
          <Text style={{ fontSize: 64, fontWeight: "800", color: accent, marginBottom: 24 }}>{round}</Text>
          <View style={{ flexDirection: "row", gap: 32, marginBottom: 40 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.hudLabel, { color: t.textMuted }]}>SCORE</Text>
              <Text style={{ fontSize: 28, fontWeight: "700", color: t.text }}>{score}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.hudLabel, { color: t.textMuted }]}>MISSES</Text>
              <Text style={{ fontSize: 28, fontWeight: "700", color: misses > 0 ? "#FF4D6A" : t.text }}>{misses}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: t.textMuted, marginBottom: 24 }}>
            Next: <Text style={{ color: accent }}>{getTimeForRound(round + 1)}ms</Text> per dot
          </Text>
          <Pressable onPress={nextRound} style={[styles.bigBtn, { backgroundColor: accent }]}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.btnText }}>NEXT ROUND →</Text>
          </Pressable>
        </View>
      )}

      {/* ═══════ PAYWALL ═══════ */}
      {screen === "paywall" && (() => {
        const modeNames: Record<number, string> = { 1: "Classic Focus", 2: "Color Filter", 3: "Dual Hunt" };
        const modeColors: Record<number, string> = { 1: "#00E5FF", 2: "#00E676", 3: "#E84393" };
        const mc = modeColors[mode] || "#00E5FF";
        return (
          <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
            {/* Lock icon */}
            <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: mc + "12", borderWidth: 2, borderColor: mc + "33", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <Text style={{ fontSize: 36 }}>🔒</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: t.text, marginBottom: 8, textAlign: "center" }}>Unlock Full Game</Text>
            <Text style={{ fontSize: 14, color: t.textDim, textAlign: "center", lineHeight: 22, marginBottom: 28, maxWidth: 320 }}>
              You've used all {FREE_ROUNDS_LIMIT} free rounds for{" "}
              <Text style={{ color: mc, fontWeight: "600" }}>{modeNames[mode]}</Text>. Unlock unlimited play across all modes.
            </Text>
            {/* What you get */}
            <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
              <Text style={[styles.sectionLabel, { color: t.textMuted }]}>WHAT YOU GET</Text>
              {[
                { icon: "∞", text: "Unlimited rounds in all 3 modes" },
                { icon: "★", text: "Full achievement tracking" },
                { icon: "⚡", text: "No ads, no interruptions" },
                { icon: "♥", text: "Support indie game development" },
              ].map((item, i) => (
                <View key={i} style={[styles.featureRow, { borderBottomColor: i < 3 ? t.border : "transparent" }]}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: mc + "12", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, color: mc }}>{item.icon}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: t.textDim, flex: 1 }}>{item.text}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={handleUnlock} disabled={checkoutLoading} style={[styles.bigBtn, { backgroundColor: checkoutLoading ? t.barBg : mc, marginBottom: 10 }]}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: checkoutLoading ? t.textMuted : "#fff" }}>
                {checkoutLoading ? "PROCESSING..." : "UNLOCK FOR $1.99"}
              </Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: t.textMuted, marginBottom: 12 }}>One-time purchase. No subscriptions.</Text>
            <Pressable onPress={handleRestore}>
              <Text style={{ fontSize: 12, color: accent, marginBottom: 20 }}>Restore Purchase</Text>
            </Pressable>
            <Pressable onPress={() => setScreen("menu")}>
              <Text style={{ color: t.textMuted, fontSize: 13 }}>← Back to Menu</Text>
            </Pressable>
          </ScrollView>
        );
      })()}

      {/* ═══════ GAME OVER ═══════ */}
      {screen === "gameOver" && (
        <View style={styles.centerScreen}>
          <Text style={{ fontSize: 13, color: "#FF4D6A", letterSpacing: 4, marginBottom: 12 }}>GAME OVER</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 32, color: t.textDim }}>{playerName || "Player"}</Text>
          <View style={{ flexDirection: "row", gap: 32, marginBottom: 12 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.hudLabel, { color: t.textMuted }]}>FINAL SCORE</Text>
              <Text style={{ fontSize: 48, fontWeight: "800", color: accent }}>{score}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.hudLabel, { color: t.textMuted }]}>ROUND</Text>
              <Text style={{ fontSize: 48, fontWeight: "800", color: t.text }}>{round}</Text>
            </View>
          </View>
          {score > 0 && score >= currentHigh && (
            <Text style={{ fontSize: 13, color: "#FFD700", marginBottom: 24, letterSpacing: 2 }}>★ NEW BEST ★</Text>
          )}
          <Pressable onPress={() => startGame(mode)} style={[styles.bigBtn, { backgroundColor: accent, marginBottom: 12 }]}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.btnText }}>PLAY AGAIN</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setScreen("menu");
              setMode(1);
            }}
            style={[styles.bigBtn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: t.border }]}
          >
            <Text style={{ fontSize: 14, fontWeight: "500", color: t.textDim }}>MENU</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  menuContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 44,
    fontWeight: "800",
    color: "#00E5FF",
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 6,
    marginBottom: 32,
  },
  glowDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00E5FF",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
    marginBottom: 28,
  },
  achieveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    width: "100%",
  },
  highScores: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  highItem: {
    alignItems: "center",
  },
  highLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  highValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  recentCard: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  recentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 10,
  },
  playBtn: {
    width: "100%",
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#00E5FF55",
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  playBtnText: {
    color: "#00E5FF",
    fontSize: 16,
    fontWeight: "600",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  nameInput: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderRadius: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 28,
  },
  modeBtn: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 32,
    justifyContent: "center",
    maxWidth: 280,
  },
  bigBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  hudLabel: {
    fontSize: 11,
    letterSpacing: 2,
  },
  hudValue: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  field: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  modeHint: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
});
