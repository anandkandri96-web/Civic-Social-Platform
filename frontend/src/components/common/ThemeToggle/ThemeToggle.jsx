import { useTheme } from '../../../hooks/useTheme';
import './ThemeToggle.css';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className="theme-toggle__emoji" aria-hidden="true">
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
};

export default ThemeToggle;
