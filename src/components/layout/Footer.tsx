import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../../config/version';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <span>v{APP_VERSION}</span>
      <span>{t('title.gameName')} {t('title.subtitle')}</span>
      <span>{t('title.credit')}</span>
    </footer>
  );
}
