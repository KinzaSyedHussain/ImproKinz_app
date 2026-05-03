import { Ionicons } from "@expo/vector-icons";
import React from "react";

const MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  "activity":           "pulse-outline",
  "alert-circle":       "alert-circle-outline",
  "align-left":         "menu-outline",
  "arrow-left":         "arrow-back",
  "arrow-right":        "arrow-forward",
  "award":              "trophy-outline",
  "bell":               "notifications-outline",
  "bell-off":           "notifications-off-outline",
  "book-open":          "book-outline",
  "bookmark":           "bookmark",
  "bookmark-outline":   "bookmark-outline",
  "camera":             "camera-outline",
  "check":              "checkmark",
  "check-circle":       "checkmark-circle",
  "check-square":       "checkbox-outline",
  "chevron-down":       "chevron-down",
  "chevron-right":      "chevron-forward",
  "chevron-up":         "chevron-up",
  "compass":            "compass-outline",
  "corner-down-right":  "return-down-forward-outline",
  "edit-2":             "create-outline",
  "external-link":      "open-outline",
  "eye":                "eye-outline",
  "eye-off":            "eye-off-outline",
  "file-text":          "document-text-outline",
  "heart":              "heart",
  "heart-outline":      "heart-outline",
  "help-circle":        "help-circle-outline",
  "home":               "home",
  "home-outline":       "home-outline",
  "image":              "image-outline",
  "info":               "information-circle-outline",
  "layers":             "layers-outline",
  "lock":               "lock-closed-outline",
  "log-out":            "log-out-outline",
  "mail":               "mail-outline",
  "menu":               "menu",
  "message-circle":     "chatbubble-outline",
  "moon":               "moon-outline",
  "plus":               "add",
  "plus-circle":        "add-circle-outline",
  "refresh-cw":         "refresh",
  "search":             "search",
  "send":               "paper-plane-outline",
  "settings":           "settings-outline",
  "star":               "star",
  "sun":                "sunny-outline",
  "target":             "radio-button-on-outline",
  "trash-2":            "trash-outline",
  "user":               "person-outline",
  "user-plus":          "person-add-outline",
  "users":              "people-outline",
  "video":              "play-circle-outline",
  "x":                  "close",
  "x-circle":           "close-circle-outline",
  "zap":                "flash-outline",
  "zap-filled":         "flash",
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 20, color = "#888", style }: IconProps) {
  const ionName = MAP[name] ?? "ellipse-outline";
  return <Ionicons name={ionName} size={size} color={color} style={style} />;
}
