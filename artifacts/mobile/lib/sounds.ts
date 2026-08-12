/**
 * Sound effects for ImproKinz study app.
 * Uses expo-av to play short clips from CDN. Fails silently — audio is non-essential.
 */
import { Audio } from "expo-av";
import { Platform } from "react-native";

const SOUNDS = {
  /** Plays when a focus session completes */
  focusComplete: "https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3",
  /** Short coin jingle when XP / coins are earned */
  coinEarned: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  /** Level-up fanfare for major milestones */
  levelUp: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3",
  /** Soft chime for general successes (onboarding complete, quiz aced, etc.) */
  successChime: "https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3",
} as const;

export type SoundName = keyof typeof SOUNDS;

export async function playSound(name: SoundName): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUNDS[name] },
      { shouldPlay: true, volume: 0.85 }
    );
    // Unload when playback finishes to avoid memory leaks
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    // Non-essential feature — fail silently
  }
}
