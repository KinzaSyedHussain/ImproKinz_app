import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { theme } = useTheme();
  return { ...colors[theme], radius: colors.radius };
}
