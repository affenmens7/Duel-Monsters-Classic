/**
 * AdminRoadmapPage — placeholder for managing roadmap entries.
 */

import { useTranslation } from 'react-i18next';
import styles from './AdminPlaceholder.module.css';

export function AdminRoadmapPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Admin - {t('admin.roadmap')}</h1>
      <p className={styles.hint}>{t('admin.comingSoon')}</p>
    </div>
  );
}
