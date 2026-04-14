import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            className="theme-toggle app-icon-btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
        >
            {isDark ? '☀' : '☽'}
        </button>
    );
}
