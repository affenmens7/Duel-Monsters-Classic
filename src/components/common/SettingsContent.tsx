import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../store/ThemeContext';
import { THEMES } from '../../config/themes';
import { APP_VERSION } from '../../config/version';
import styles from './SettingsContent.module.css';

interface SettingsContentProps {
  onClose: () => void;
}

export function SettingsContent({ onClose }: SettingsContentProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { activeTheme, setThemeById, unlockedThemeIds } = useTheme();

  function changeLanguage(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('dmc-language', lang);
  }

  function handleLogout() {
    onClose();
    navigate('/');
  }

  return (
    <div className={styles.settings}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings.language')}</h3>
        <div className={styles.optionRow}>
          <button
            className={`${styles.optionBtn} ${i18n.language === 'de' ? styles.optionActive : ''}`}
            onClick={() => changeLanguage('de')}
          >
            {t('settings.german')}
          </button>
          <button
            className={`${styles.optionBtn} ${i18n.language === 'en' ? styles.optionActive : ''}`}
            onClick={() => changeLanguage('en')}
          >
            {t('settings.english')}
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings.theme')}</h3>
        <div className={styles.optionRow}>
          {THEMES.map((theme) => {
            const unlocked = unlockedThemeIds.includes(theme.id);
            const isActive = activeTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                className={`${styles.optionBtn} ${isActive ? styles.optionActive : ''} ${!unlocked ? styles.optionLocked : ''}`}
                onClick={() => unlocked && setThemeById(theme.id)}
                disabled={!unlocked}
              >
                {t(theme.nameKey)}
                {isActive && <span className={styles.badge}>{t('themes.equipped')}</span>}
                {!unlocked && <span className={styles.badge}>{t('themes.locked')}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.divider} />

      <button className={styles.logoutBtn} onClick={handleLogout}>
        {t('common.logout')}
      </button>

      <span className={styles.versionLabel}>v{APP_VERSION}</span>
    </div>
  );
}
