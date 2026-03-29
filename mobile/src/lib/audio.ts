// ═══════════════════════════════════════════
// AUDIO / HAPTICS — React Native version
// Uses Haptics for tactile feedback since
// synthesizing oscillator tones in RN requires
// native modules. Haptics gives instant feedback.
// ═══════════════════════════════════════════
import * as Haptics from "expo-haptics";

export function playTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function playMiss() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function playWrongColor() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

export function playRoundUp() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function playGameOver() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function playAchievement() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
