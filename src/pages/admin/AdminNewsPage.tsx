/**
 * AdminNewsPage — placeholder for managing news entries.
 */

import { useTranslation } from 'react-i18next';
import styles from './AdminPlaceholder.module.css';

export function AdminNewsPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Admin - {t('admin.news')}</h1>
      <p className={styles.hint}>{t('admin.comingSoon')}</p>
    </div>
  );
}
