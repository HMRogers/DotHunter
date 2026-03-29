import React from "react";
import { View } from "react-native";
import { ThemeColors } from "../lib/constants";

interface TimerBarProps {
  timeLeft: number;
  maxTime: number;
  color: string;
  t: ThemeColors;
}

export default function TimerBar({ timeLeft, maxTime, color, t }: TimerBarProps) {
  const pct = Math.max(0, timeLeft / maxTime) * 100;
  return (
    <View style={{ width: "100%", height: 4, backgroundColor: t.barBg, borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
      <View
        style={{
          height: "100%",
          width: `${pct}%`,
          backgroundColor: pct > 30 ? color : "#FF4D6A",
          borderRadius: 2,
        }}
      />
    </View>
  );
}
