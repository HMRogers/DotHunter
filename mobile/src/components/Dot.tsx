import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { DotData, DOT_SIZE, DOT_SIZE_SM } from "../lib/constants";

interface DotProps {
  dot: DotData;
  onTap: (d: DotData) => void;
  small: boolean;
}

export default function Dot({ dot, onTap, small }: DotProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const sz = small ? DOT_SIZE_SM : DOT_SIZE;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.dotOuter,
        {
          left: dot.x - sz / 2,
          top: dot.y - sz / 2,
          width: sz,
          height: sz,
          borderRadius: sz / 2,
          backgroundColor: dot.color,
          transform: [{ scale }],
          shadowColor: dot.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 16,
          elevation: 8,
        },
      ]}
    >
      <Pressable
        onPress={() => onTap(dot)}
        style={{ width: "100%", height: "100%", borderRadius: sz / 2 }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dotOuter: {
    position: "absolute",
    zIndex: 10,
  },
});
