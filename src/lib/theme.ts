export type AppTheme = "dark" | "light" | "warm-light";

export const THEME_STORAGE_KEY = "branded-ecommerce-theme";

const VALID_THEMES = new Set<AppTheme>(["dark", "light", "warm-light"]);

export const THEME_OPTIONS: { value: AppTheme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "warm-light", label: "Warm Light" },
];

export function isAppTheme(value: string): value is AppTheme {
  return VALID_THEMES.has(value as AppTheme);
}

export function getSavedTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && isAppTheme(saved)) {
      return saved;
    }
  } catch {
    /* localStorage unavailable */
  }
  return "dark";
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: AppTheme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable */
  }
}
