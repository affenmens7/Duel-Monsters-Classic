import { useState } from 'react';
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
        <div className={styles.left}>
          <span className={styles.logoIcon}>DMC</span>
          <span className={styles.logoText}>Duell Monsters</span>
          <span className={styles.logoSub}>Classic</span>
        </div>
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
