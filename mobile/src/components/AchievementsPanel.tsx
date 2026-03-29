import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Modal } from "react-native";
import { ACHIEVEMENT_DEFS, TIER_BORDER, AchievementDef } from "../lib/achievements";
import { ThemeColors } from "../lib/constants";

interface Props {
  t: ThemeColors;
  unlockedIds: string[];
  onClose: () => void;
}

function Badge({ a, unlocked, t }: { a: AchievementDef; unlocked: boolean; t: ThemeColors }) {
  const borderColor = unlocked ? TIER_BORDER[a.tier] : t.border;
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: unlocked ? a.color + "15" : t.barBg,
        borderWidth: 1.5,
        borderColor,
        opacity: unlocked ? 1 : 0.4,
      }}
    >
      <Text style={{ fontSize: 18, color: unlocked ? a.color : t.textMuted }}>★</Text>
    </View>
  );
}

export default function AchievementsPanel({ t, unlockedIds, onClose }: Props) {
  const unlocked = ACHIEVEMENT_DEFS.filter((a) => unlockedIds.includes(a.id));
  const locked = ACHIEVEMENT_DEFS.filter((a) => !unlockedIds.includes(a.id));
  const pct = Math.round((unlocked.length / ACHIEVEMENT_DEFS.length) * 100);

  const renderItem = (a: AchievementDef, isUnlocked: boolean) => (
    <View key={a.id} style={[styles.row, { borderBottomColor: t.border }]}>
      <Badge a={a} unlocked={isUnlocked} t={t} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: isUnlocked ? t.text : t.textMuted }}>{a.name}</Text>
        <Text style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>{a.desc}</Text>
      </View>
      <Text style={{ fontSize: 10, color: TIER_BORDER[a.tier], fontWeight: "700", textTransform: "uppercase" }}>{a.tier}</Text>
    </View>
  );

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: t.surface, borderColor: t.border }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>Achievements</Text>
            <Text style={{ fontSize: 13, color: t.textDim }}>
              {unlocked.length}/{ACHIEVEMENT_DEFS.length}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: t.barBg }]}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {unlocked.length > 0 && (
              <>
                <Text style={[styles.section, { color: t.textMuted }]}>UNLOCKED</Text>
                {unlocked.map((a) => renderItem(a, true))}
              </>
            )}
            {locked.length > 0 && (
              <>
                <Text style={[styles.section, { color: t.textMuted }]}>LOCKED</Text>
                {locked.map((a) => renderItem(a, false))}
              </>
            )}
          </ScrollView>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: t.text }]}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: t.surface }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBar: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#9B6DFF",
  },
  section: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
});
