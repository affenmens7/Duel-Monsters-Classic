import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { Modal } from '../common/Modal';
import { SettingsContent } from '../common/SettingsContent';
import styles from './Header.module.css';

export function Header() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <Link to="/app/home" className={styles.left}>
          <span className={styles.logoText}>{t('title.gameName')}</span>
          <span className={styles.logoSub}>{t('title.subtitle')}</span>
        </Link>
        <div className={styles.right}>
          <div className={styles.dpBadge}>{user?.dp ?? 0} DP</div>
          <button className={styles.userBtn} onClick={() => setSettingsOpen(true)}>
            {user ? user.displayName : t('settings.title')}
          </button>
        </div>
      </header>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t('settings.title')}
      >
        <SettingsContent onClose={() => setSettingsOpen(false)} />
      </Modal>
    </>
  );
}
