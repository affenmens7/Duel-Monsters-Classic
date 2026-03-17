/**
 * AdminCosmeticsPage — placeholder for managing cosmetic items.
 */

import { useTranslation } from 'react-i18next';
import styles from './AdminPlaceholder.module.css';

export function AdminCosmeticsPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Admin - {t('admin.cosmetics')}</h1>
      <p className={styles.hint}>{t('admin.comingSoon')}</p>
    </div>
  );
}
