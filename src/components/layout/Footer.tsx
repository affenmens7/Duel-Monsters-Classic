import { APP_VERSION } from '../../config/version';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>v{APP_VERSION}</span>
      <span>Duell Monsters Classic</span>
      <span>Ein Fan-Projekt</span>
    </footer>
  );
}
