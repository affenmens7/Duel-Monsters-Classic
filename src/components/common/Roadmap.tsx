import { Link } from 'react-router-dom';
import { ROADMAP_PHASES } from '../../config/roadmap';
import { ScrollReveal } from './ScrollReveal';
import styles from './Roadmap.module.css';

export function Roadmap() {
  return (
    <div className={styles.roadmap}>
      {ROADMAP_PHASES.map((phase, i) => {
        const isLeft = i % 2 === 0;
        return (
          <ScrollReveal key={phase.id} delay={i * 120}>
            <div className={`${styles.phase} ${isLeft ? styles.phaseLeft : styles.phaseRight} ${styles[phase.status]}`}>
              <div className={styles.dot} />
              <div className={styles.card}>
                <div className={styles.topRow}>
                  <span className={styles.phaseLabel}>{phase.phase}</span>
                  <span className={styles.badge}>
                    {phase.status === 'done' && 'Fertig'}
                    {phase.status === 'active' && 'Aktiv'}
                    {phase.status === 'upcoming' && 'Geplant'}
                  </span>
                </div>
                <h3 className={styles.title}>{phase.title}</h3>
                <p className={styles.desc}>{phase.desc}</p>
                <ul className={styles.features}>
                  {phase.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link to={`/app/roadmap/${phase.id}`} className={styles.moreLink}>
                  mehr Infos
                </Link>
              </div>
            </div>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
