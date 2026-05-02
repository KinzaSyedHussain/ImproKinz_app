import React from "react";
import { Text } from "react-native";

const MAP: Record<string, string> = {
  "activity": "◈",
  "alert-circle": "⚠",
  "align-left": "≡",
  "arrow-left": "←",
  "arrow-right": "→",
  "award": "★",
  "bell": "◔",
  "bell-off": "◯",
  "book-open": "◫",
  "bookmark": "⊟",
  "camera": "⊙",
  "check": "✓",
  "check-circle": "✓",
  "check-square": "☑",
  "chevron-down": "▾",
  "chevron-right": "›",
  "chevron-up": "▴",
  "corner-down-right": "↳",
  "edit-2": "✎",
  "eye": "◎",
  "eye-off": "⊘",
  "file-text": "≡",
  "heart": "♡",
  "help-circle": "?",
  "home": "⌂",
  "image": "⊞",
  "info": "ⓘ",
  "layers": "⊞",
  "lock": "⊗",
  "log-out": "⇥",
  "mail": "✉",
  "menu": "☰",
  "message-circle": "◯",
  "moon": "☽",
  "plus": "+",
  "plus-circle": "⊕",
  "refresh-cw": "↻",
  "search": "⌕",
  "send": "▶",
  "settings": "⚙",
  "star": "★",
  "sun": "☀",
  "target": "◎",
  "trash-2": "✕",
  "user": "◉",
  "user-plus": "⊕",
  "users": "◉◉",
  "video": "▷",
  "x": "✕",
  "x-circle": "⊗",
  "zap": "✦",
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 20, color, style }: IconProps) {
  const char = MAP[name] ?? "•";
  return (
    <Text
      style={[
        {
          fontSize: size,
          color: color ?? "#888",
          lineHeight: size * 1.35,
          textAlign: "center",
          includeFontPadding: false,
        },
        style,
      ]}
    >
      {char}
    </Text>
  );
}
