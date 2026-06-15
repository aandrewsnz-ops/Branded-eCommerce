import { useState } from "react";
import {
  THEME_OPTIONS,
  getSavedTheme,
  setTheme,
  type AppTheme,
} from "../lib/theme";

export function ThemeSelector() {
  const [theme, setThemeState] = useState<AppTheme>(() => getSavedTheme());

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as AppTheme;
    setThemeState(next);
    setTheme(next);
  }

  return (
    <label className="theme-selector">
      <span className="theme-selector-label">Theme</span>
      <select
        className="theme-selector-input"
        value={theme}
        onChange={handleChange}
        aria-label="App theme"
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
