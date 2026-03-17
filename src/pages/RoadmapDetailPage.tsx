import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPhaseById } from '../config/roadmap';
import styles from './RoadmapDetailPage.module.css';

export function RoadmapDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const phase = id ? getPhaseById(id) : undefined;

  if (!phase) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h2>{t('common.notFound')}</h2>
          <Link to="/app/home" className={styles.backLink}>{t('common.backToHome')}</Link>
        </div>
      </div>
    );
  }

  const statusLabel = phase.status === 'done' ? t('roadmap.completed') : phase.status === 'active' ? t('roadmap.inProgress') : t('roadmap.planned');

  return (
    <div className={styles.page}>
      <div className={styles.article}>
        <Link to="/app/home" className={styles.backLink}>{t('common.back')}</Link>

        <div className={styles.meta}>
          <span className={styles.phaseLabel}>{phase.phase}</span>
          <span className={`${styles.badge} ${styles[phase.status]}`}>{statusLabel}</span>
        </div>

        <h1 className={styles.title}>{phase.title}</h1>
        <p className={styles.desc}>{phase.desc}</p>

        <div className={styles.features}>
          {phase.features.map((f) => (
            <span key={f} className={styles.featureTag}>{f}</span>
          ))}
        </div>

        <div className={styles.body}>
          {phase.detailContent.split('\n\n').map((paragraph, i) => (
            <p key={i} className={styles.paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
