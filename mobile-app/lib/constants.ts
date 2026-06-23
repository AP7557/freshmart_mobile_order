import { Platform } from "react-native";

export const NAV_THEME = {
  light: {
    background:        "#ffffff",       // --background
    border:            "#d1ead8",       // --border
    card:              "#ffffff",       // --card
    notification:      "#ef4444",       // destructive
    primary:           "#1a6b3c",       // --primary (fm-dark)
    text:              "#0d3d20",       // --foreground
  },
  dark: {
    background:        "#0a1f11",
    border:            "#1f3d28",
    card:              "#0f2818",
    notification:      "#ef4444",
    primary:           "#7dc242",       // --primary dark (fm-lime)
    text:              "#e8f5ec",
  },
};

export const IS_IOS = Platform.OS === "ios";
