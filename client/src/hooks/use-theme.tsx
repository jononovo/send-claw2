import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

interface UserPreferences {
  settings?: {
    themePreference?: Theme;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function getStoredTheme(): Theme {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  }
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === "dark" || (theme === "system" && getSystemTheme() === "dark");
  
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    () => theme === "system" ? getSystemTheme() : theme
  );
  const hasHydratedFromDb = useRef(false);

  // Only fetch preferences for authenticated users (skip for landing page visitors)
  const hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('authToken');
  
  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: hasAuthToken,
  });

  // Mutation to save theme preference to database
  const saveThemeMutation = useMutation({
    mutationFn: async (newTheme: Theme) => {
      return apiRequest("POST", "/api/user/preferences", {
        settings: { themePreference: newTheme }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
  });

  // Hydrate theme from database if available (only once)
  useEffect(() => {
    if (preferences?.settings?.themePreference && !hasHydratedFromDb.current) {
      const dbTheme = preferences.settings.themePreference;
      hasHydratedFromDb.current = true;
      // Only update if different from current to avoid loops
      if (dbTheme !== theme) {
        setThemeState(dbTheme);
        localStorage.setItem("theme", dbTheme);
        applyTheme(dbTheme);
        setResolvedTheme(dbTheme === "system" ? getSystemTheme() : dbTheme);
      }
    }
  }, [preferences]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
    setResolvedTheme(newTheme === "system" ? getSystemTheme() : newTheme);
    
    // Save to database (fire and forget - don't block UI)
    saveThemeMutation.mutate(newTheme);
  }, [saveThemeMutation]);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
        setResolvedTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
