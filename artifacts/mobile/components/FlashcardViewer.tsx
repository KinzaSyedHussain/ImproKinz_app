import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export interface Flashcard {
  question: string;
  answer: string;
}

interface Props {
  cards: Flashcard[];
}

export function FlashcardViewer({ cards }: Props) {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const card = cards[index];

  const flip = () => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
    }).start(() => setFlipped((f) => !f));
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const next = () => {
    if (index < cards.length - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
      flipAnim.setValue(0);
    }
  };
  const prev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setFlipped(false);
      flipAnim.setValue(0);
    }
  };

  if (!card) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.progress, { color: colors.mutedForeground }]}>
        {index + 1} / {cards.length}
      </Text>

      <TouchableOpacity onPress={flip} activeOpacity={0.9}>
        <View style={styles.cardWrap}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                backfaceVisibility: "hidden",
                transform: [{ rotateY: frontInterpolate }],
              },
            ]}
          >
            <Feather name="help-circle" size={28} color={colors.primary} />
            <Text style={[styles.label, { color: colors.primary }]}>
              QUESTION
            </Text>
            <Text style={[styles.cardText, { color: colors.foreground }]}>
              {card.question}
            </Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Tap to reveal answer
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              {
                backgroundColor: colors.primary,
                transform: [{ rotateY: backInterpolate }],
              },
            ]}
          >
            <Feather name="check-circle" size={28} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.label, { color: "rgba(255,255,255,0.7)" }]}>
              ANSWER
            </Text>
            <Text style={[styles.cardText, { color: "#FFFFFF" }]}>
              {card.answer}
            </Text>
          </Animated.View>
        </View>
      </TouchableOpacity>

      <View style={styles.nav}>
        <TouchableOpacity
          style={[
            styles.navBtn,
            {
              backgroundColor: index > 0 ? colors.muted : "transparent",
              opacity: index > 0 ? 1 : 0.3,
            },
          ]}
          onPress={prev}
          disabled={index === 0}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.dots}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === index ? colors.primary : colors.border,
                  width: i === index ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.navBtn,
            {
              backgroundColor:
                index < cards.length - 1 ? colors.primary : "transparent",
              opacity: index < cards.length - 1 ? 1 : 0.3,
            },
          ]}
          onPress={next}
          disabled={index === cards.length - 1}
        >
          <Feather
            name="arrow-right"
            size={20}
            color={index < cards.length - 1 ? "#fff" : colors.foreground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 20 },
  progress: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  cardWrap: { width: 320, height: 220, position: "relative" },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBack: { borderWidth: 0 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  cardText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
  },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
