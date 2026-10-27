import { useTranslation } from 'react-i18next';
import { Icon } from './icons';
import { useApp } from '../store/appStore';

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useApp((state) => state.theme);
  const toggleTheme = useApp((state) => state.toggleTheme);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="btn btn--ghost btn--icon"
      onClick={toggleTheme}
      aria-label={t('nav.theme', { theme: nextTheme })}
      title={t('nav.theme', { theme: nextTheme })}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
