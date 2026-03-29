import React, { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet } from "react-native";
import { AchievementDef, TIER_BORDER } from "../lib/achievements";
import { ThemeColors } from "../lib/constants";

interface Props {
  achievement: AchievementDef;
  t: ThemeColors;
  onDone: () => void;
}

export default function AchievementToast({ achievement, t, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDone());
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  const borderColor = TIER_BORDER[achievement.tier] || "#C0C0C0";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: t.surface,
          borderColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: achievement.color + "22", borderColor }]}>
        <Text style={{ fontSize: 18, color: achievement.color }}>★</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tier, { color: borderColor }]}>UNLOCKED</Text>
        <Text style={[styles.name, { color: t.text }]}>{achievement.name}</Text>
        <Text style={[styles.desc, { color: t.textDim }]}>{achievement.desc}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 2000,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tier: { fontSize: 9, letterSpacing: 2, fontWeight: "700" },
  name: { fontSize: 14, fontWeight: "700", marginTop: 1 },
  desc: { fontSize: 11, marginTop: 1 },
});
