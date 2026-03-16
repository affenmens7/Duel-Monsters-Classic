import { useParams, Link } from 'react-router-dom';
import { getNewsById } from '../config/news';
import styles from './NewsDetailPage.module.css';

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const entry = id ? getNewsById(id) : undefined;

  if (!entry) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h2 className={styles.notFoundTitle}>Nicht gefunden</h2>
          <Link to="/app/home" className={styles.backLink}>Zurueck zur Startseite</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.article}>
        <Link to="/app/home" className={styles.backLink}>Zurueck</Link>

        <div className={styles.meta}>
          <span className={styles.date}>{entry.date}</span>
          <span className={styles.tag}>{entry.tag}</span>
        </div>

        <h1 className={styles.title}>{entry.title}</h1>

        <div className={styles.body}>
          {entry.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className={styles.paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
