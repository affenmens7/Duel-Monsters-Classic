/**
 * Admin Dashboard — overview stats and quick links.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { fetchAdminStats, type AdminStats } from '../../services/adminApi';
import styles from './AdminDashboard.module.css';

export function AdminDashboardPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchAdminStats(token)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>{t('admin.loading')}</p></div>;
  }

  if (!stats) {
    return <div className={styles.page}><p className={styles.loading}>{t('admin.errorLoading')}</p></div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('admin.dashboard')}</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.totalUsers}</span>
          <span className={styles.statLabel}>{t('admin.totalPlayers')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.recentUsers7d}</span>
          <span className={styles.statLabel}>{t('admin.newPlayers7d')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.activeSets}</span>
          <span className={styles.statLabel}>{t('admin.activeSets')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.totalCards.toLocaleString()}</span>
          <span className={styles.statLabel}>{t('admin.cardsInDb')}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardWide}`}>
          <span className={styles.statValueGold}>{Number(stats.totalDp).toLocaleString()} DP</span>
          <span className={styles.statLabel}>{t('admin.dpInCirculation')}</span>
        </div>
      </div>

      <div className={styles.quickSection}>
        <h2 className={styles.sectionTitle}>{t('admin.quickAccess')}</h2>
        <div className={styles.quickLinks}>
          <a href="/app/admin/sets" className={styles.quickLink}>{t('admin.manageSets')}</a>
          <a href="/app/admin/shop-config" className={styles.quickLink}>{t('admin.configureShop')}</a>
          <a href="/app/admin/news" className={styles.quickLink}>{t('admin.editNews')}</a>
          <a href="/app/admin/users" className={styles.quickLink}>{t('admin.managePlayers')}</a>
        </div>
      </div>
    </div>
  );
}
