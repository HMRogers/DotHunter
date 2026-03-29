import React from "react";
import { View } from "react-native";
import { ThemeColors } from "../lib/constants";

interface MissIndicatorProps {
  misses: number;
  max: number;
  t: ThemeColors;
}

export default function MissIndicator({ misses, max, t }: MissIndicatorProps) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i < misses ? "#FF4D6A" : t.missOff,
          }}
        />
      ))}
    </View>
  );
}
