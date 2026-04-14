import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'site-theme';

type ThemeContextValue = {
    theme: Theme;
    setTheme: (t: Theme) => void;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark') return v;
    } catch {
        /* ignore */
    }
    return 'dark';
}

export function applyTheme(theme: Theme, persist = true) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
    } else {
        root.removeAttribute('data-theme');
    }
    if (!persist) return;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        /* ignore */
    }
}

/** Вызов до createRoot — убирает мигание неверной темой при первой отрисовке. */
export function syncThemeFromStorage() {
    applyTheme(readStoredTheme(), false);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
    }, []);

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, setTheme, toggleTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
