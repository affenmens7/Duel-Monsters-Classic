/**
 * AdminUsersPage — placeholder for managing users.
 */

import { useTranslation } from 'react-i18next';
import styles from './AdminPlaceholder.module.css';

export function AdminUsersPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Admin - {t('admin.users')}</h1>
      <p className={styles.hint}>{t('admin.comingSoon')}</p>
    </div>
  );
}
