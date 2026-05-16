export const colors = {
  ink: "#08090b",
  panel: "#111418",
  panelSoft: "#171b20",
  line: "#2a2f35",
  ivory: "#f7f1e8",
  muted: "#a8a29e",
  faint: "#706b66",
  gold: "#d6b25e",
  green: "#34d399",
  red: "#f87171",
  blue: "#60a5fa"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24
};

export function toneColor(tone?: "neutral" | "gold" | "green" | "red" | "blue") {
  if (tone === "gold") return colors.gold;
  if (tone === "green") return colors.green;
  if (tone === "red") return colors.red;
  if (tone === "blue") return colors.blue;
  return colors.muted;
}
