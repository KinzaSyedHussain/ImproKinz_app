import React from "react";
import Svg, { Path, Circle, G, Polygon } from "react-native-svg";

export type SvgIconName =
  | "heart" | "heart-outline"
  | "chatbubble-outline"
  | "bookmark" | "bookmark-outline"
  | "home" | "home-outline"
  | "flash" | "flash-outline"
  | "play-circle" | "play-circle-outline"
  | "person" | "person-outline"
  | "search"
  | "close"
  | "arrow-back"
  | "add" | "add-circle-outline"
  | "paper-plane-outline"
  | "trash-outline"
  | "ellipsis-horizontal"
  | "checkmark" | "checkmark-circle"
  | "star" | "star-outline"
  | "trophy-outline"
  | "notifications-outline"
  | "settings-outline"
  | "log-out-outline"
  | "create-outline"
  | "camera-outline"
  | "image-outline"
  | "refresh"
  | "chevron-forward"
  | "chevron-down"
  | "chevron-up"
  | "people-outline"
  | "pulse-outline"
  | "book-outline"
  | "menu"
  | "information-circle-outline"
  | "alert-circle-outline"
  | "lock-closed-outline"
  | "mail-outline"
  | "eye-outline" | "eye-off-outline"
  | "trending-up"
  | "rocket-outline"
  | "school-outline"
  | "calculator-outline"
  | "code-slash-outline"
  | "medkit-outline"
  | "construct-outline"
  | "briefcase-outline"
  | "language-outline"
  | "library-outline"
  | "color-palette-outline"
  | "scale-outline"
  | "brain-outline"
  | "ribbon-outline"
  | "bulb-outline"
  | "bar-chart-outline"
  | "hand-right-outline"
  | "gift-outline"
  | "ellipsis-horizontal-circle-outline"
  | "open-outline"
  | "document-text-outline"
  | "layers-outline"
  | "radio-button-on-outline"
  | "return-down-forward-outline"
  | "sunny-outline"
  | "moon-outline"
  | "person-add-outline"
  | "compass-outline"
  | "flash-outline"
  | "trophy"
  | "star"
  | "people"
  | "flash"
  | "person";

interface Props {
  name: SvgIconName | string;
  size?: number;
  color?: string;
  style?: object;
}

export function SvgIcon({ name, size = 24, color = "#888", style }: Props) {
  const s = size;
  const v = "0 0 24 24";

  const icon = () => {
    switch (name) {
      // ── Heart ─────────────────────────────────────
      case "heart":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </Svg>
        );
      case "heart-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
          </Svg>
        );

      // ── Chatbubble ────────────────────────────────
      case "chatbubble-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          </Svg>
        );

      // ── Bookmark ──────────────────────────────────
      case "bookmark":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </Svg>
        );
      case "bookmark-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
          </Svg>
        );

      // ── Home ─────────────────────────────────────
      case "home":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </Svg>
        );
      case "home-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
          </Svg>
        );

      // ── Flash ────────────────────────────────────
      case "flash":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M7 2v11h3v9l7-12h-4l4-8z" />
          </Svg>
        );
      case "flash-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
          </Svg>
        );

      // ── Play circle ───────────────────────────────
      case "play-circle":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </Svg>
        );
      case "play-circle-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </Svg>
        );

      // ── Person ────────────────────────────────────
      case "person":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </Svg>
        );
      case "person-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </Svg>
        );

      // ── People ────────────────────────────────────
      case "people-outline":
      case "people":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </Svg>
        );

      // ── Search ────────────────────────────────────
      case "search":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </Svg>
        );

      // ── Close ─────────────────────────────────────
      case "close":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </Svg>
        );

      // ── Arrow back ───────────────────────────────
      case "arrow-back":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </Svg>
        );

      // ── Add ──────────────────────────────────────
      case "add":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </Svg>
        );
      case "add-circle-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </Svg>
        );

      // ── Paper plane ──────────────────────────────
      case "paper-plane-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </Svg>
        );

      // ── Trash ────────────────────────────────────
      case "trash-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z" />
          </Svg>
        );

      // ── Ellipsis ─────────────────────────────────
      case "ellipsis-horizontal":
      case "ellipsis-horizontal-circle-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </Svg>
        );

      // ── Checkmark ─────────────────────────────────
      case "checkmark":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </Svg>
        );
      case "checkmark-circle":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </Svg>
        );

      // ── Star ──────────────────────────────────────
      case "star":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </Svg>
        );
      case "star-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" />
          </Svg>
        );

      // ── Trophy ────────────────────────────────────
      case "trophy-outline":
      case "trophy":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm7 6c-1.65 0-3-1.35-3-3V5h6v6c0 1.65-1.35 3-3 3zm7-6c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </Svg>
        );

      // ── Notifications ─────────────────────────────
      case "notifications-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          </Svg>
        );

      // ── Settings ──────────────────────────────────
      case "settings-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </Svg>
        );

      // ── Log out ───────────────────────────────────
      case "log-out-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
          </Svg>
        );

      // ── Edit ──────────────────────────────────────
      case "create-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </Svg>
        );

      // ── Camera ───────────────────────────────────
      case "camera-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9m3 16a6 6 0 0 1-6-6 6 6 0 0 1 6-6 6 6 0 0 1 6 6 6 6 0 0 1-6 6z" />
          </Svg>
        );

      // ── Image ────────────────────────────────────
      case "image-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </Svg>
        );

      // ── Refresh ──────────────────────────────────
      case "refresh":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </Svg>
        );

      // ── Chevrons ─────────────────────────────────
      case "chevron-forward":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </Svg>
        );
      case "chevron-down":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
          </Svg>
        );
      case "chevron-up":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
          </Svg>
        );

      // ── Menu ─────────────────────────────────────
      case "menu":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </Svg>
        );

      // ── Info ─────────────────────────────────────
      case "information-circle-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z" />
          </Svg>
        );

      // ── Alert ────────────────────────────────────
      case "alert-circle-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
          </Svg>
        );

      // ── Lock ─────────────────────────────────────
      case "lock-closed-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </Svg>
        );

      // ── Mail ─────────────────────────────────────
      case "mail-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </Svg>
        );

      // ── Eye ──────────────────────────────────────
      case "eye-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </Svg>
        );
      case "eye-off-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
          </Svg>
        );

      // ── Trending up ──────────────────────────────
      case "trending-up":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
          </Svg>
        );

      // ── Rocket ───────────────────────────────────
      case "rocket-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 2.5C9.5 7 7.5 9.5 7.5 12.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-3-2-5.5-4.5-10zm0 13c-1.38 0-2.5-1.12-2.5-2.5 0-1.75 1.5-4 2.5-6 1 2 2.5 4.25 2.5 6 0 1.38-1.12 2.5-2.5 2.5zM7 14c-2 0-4 .5-4 1.5V18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.5c0-1-2-1.5-4-1.5-.58 0-1.14.06-1.64.14C14.72 17.29 13.42 18 12 18s-2.72-.71-3.36-1.86C8.14 14.06 7.58 14 7 14z" />
          </Svg>
        );

      // ── Pulse / Activity ─────────────────────────
      case "pulse-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
          </Svg>
        );

      // ── Book ─────────────────────────────────────
      case "book-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4zm0 16V14h12v6H6zm12-8h-5V4h5v8z" />
          </Svg>
        );

      // ── Document text ─────────────────────────────
      case "document-text-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </Svg>
        );

      // ── Bar chart ────────────────────────────────
      case "bar-chart-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
          </Svg>
        );

      // ── Hand right ───────────────────────────────
      case "hand-right-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z" />
          </Svg>
        );

      // ── School / Graduation ─────────────────────
      case "school-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
          </Svg>
        );

      // ── Briefcase ────────────────────────────────
      case "briefcase-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 3.15 16.85 2 15.5 2h-7C7.15 2 6 3.15 6 4.64c0 .48.1.92.18 1.36H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zM8 4.64C8 4.29 8.29 4 8.5 4h7c.21 0 .5.29.5.64 0 .48-.1.92-.18 1.36H8.18C8.1 5.56 8 5.12 8 4.64zM20 19H4v-2h16v2zm0-5H4V8h16v6z" />
          </Svg>
        );

      // ── Ribbon ───────────────────────────────────
      case "ribbon-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M19.67 18.46l-2.44-2.44a7.002 7.002 0 0 0-10.46-9.17L4.33 4.41 3 5.74l2.39 2.39A7.002 7.002 0 0 0 12 19a6.97 6.97 0 0 0 4.29-1.46l2.44 2.44 1.33-1.33-2.44-2.44 1.72 1.72 1.33-1.47zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
          </Svg>
        );

      // ── Bulb ─────────────────────────────────────
      case "bulb-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
          </Svg>
        );

      // ── Gift ─────────────────────────────────────
      case "gift-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M20 6h-2.18C17.93 5.52 18 5.02 18 4.5 18 2.57 16.43 1 14.5 1c-1.04 0-1.96.46-2.61 1.19L12 2.56l-.89-1.37C10.46 1.46 9.54 1 8.5 1 6.57 1 5 2.57 5 4.5c0 .52.07 1.02.18 1.5H3c-1.11 0-2 .89-2 2v2c0 1.11.89 2 2 2h18c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zM14.5 3c.83 0 1.5.67 1.5 1.5S15.33 6 14.5 6h-2.55C12.49 4.67 13.4 3 14.5 3zM8.5 3c1.1 0 2.01 1.67 2.55 3H8.5C7.67 6 7 5.33 7 4.5S7.67 3 8.5 3zM3 20c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-9H3v9zm8-7h2v6h-2v-6zm-4 0h2v6H7v-6zm8 0h2v6h-2v-6z" />
          </Svg>
        );

      // ── Construct ────────────────────────────────
      case "construct-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
          </Svg>
        );

      // ── Person add ───────────────────────────────
      case "person-add-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </Svg>
        );

      // ── Compass ──────────────────────────────────
      case "compass-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-9.69l6-2.31-2.31 6L9 16.69l2.31-6zM12 11c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
          </Svg>
        );

      // ── Open ─────────────────────────────────────
      case "open-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
          </Svg>
        );

      // ── Sun ──────────────────────────────────────
      case "sunny-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
          </Svg>
        );

      // ── Moon ─────────────────────────────────────
      case "moon-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M10 2c-1.82 0-3.53.5-5 1.35C7.99 5.08 10 8.3 10 12s-2.01 6.92-5 8.65C6.47 21.5 8.18 22 10 22c5.52 0 10-4.48 10-10S15.52 2 10 2z" />
          </Svg>
        );

      // ── Layers ───────────────────────────────────
      case "layers-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" />
          </Svg>
        );

      // ── Radio button ─────────────────────────────
      case "radio-button-on-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
          </Svg>
        );

      // ── Return forward ───────────────────────────
      case "return-down-forward-outline":
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Path fill={color} d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z" />
          </Svg>
        );

      // Default fallback - simple circle
      default:
        return (
          <Svg width={s} height={s} viewBox={v} style={style}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
          </Svg>
        );
    }
  };

  return <>{icon()}</>;
}
