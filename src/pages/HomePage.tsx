import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Roadmap } from '../components/common/Roadmap';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { NEWS } from '../config/news';
import { APP_VERSION } from '../config/version';
import styles from './HomePage.module.css';

export function HomePage() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.page} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>{t('title.gameName')}</h1>
          <p className={styles.heroSub}>{t('title.flavor')}</p>
        </section>

        {/* News */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>News</h2>
            <div className={styles.newsGrid}>
              {NEWS.map((entry) => (
                <article key={entry.id} className={styles.newsCard}>
                  <div className={styles.newsDate}>{entry.date}</div>
                  <h3 className={styles.newsHeading}>{entry.title}</h3>
                  <p className={styles.newsText}>{entry.summary}</p>
                  <div className={styles.newsFooter}>
                    <span className={styles.newsTag}>{entry.tag}</span>
                    <Link to={`/app/news/${entry.id}`} className={styles.newsMore}>
                      mehr Infos
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Changelog */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Changelog</h2>
            <div className={styles.changelog}>
              <div className={styles.changelogEntry}>
                <div className={styles.changelogHeader}>
                  <span className={styles.changelogVersion}>v{APP_VERSION}</span>
                  <span className={styles.changelogDate}>16.03.2026</span>
                </div>
                <ul className={styles.changelogList}>
                  <li>Kartenbrowser mit Suche und Filtern</li>
                  <li>Zweisprachig: Deutsch und Englisch</li>
                  <li>Theme-System (Orichalcos Gold)</li>
                  <li>Einstellungen-Modal mit Sprachauswahl</li>
                  <li>Home-Page mit News, Roadmap, Changelog, Stats, Community</li>
                  <li>Server-Status Anzeige</li>
                  <li>Floating Cards Hintergrund</li>
                  <li>TitleScreen mit Login</li>
                </ul>
                <div className={styles.changelogFooter}>
                <Link to="/app/news/patch-0-0-1" className={styles.changelogMore}>
                  mehr Infos
                </Link>
              </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Roadmap */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Roadmap</h2>
            <Roadmap />
          </section>
        </ScrollReveal>

        {/* Community */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Community</h2>
            <div className={styles.communityGrid}>
              <ScrollReveal delay={0}>
                <a href="https://discord.gg/E7Rj7BXkD9" target="_blank" rel="noopener noreferrer" className={styles.communityCard}>
                  <span className={styles.communityName}>Discord</span>
                  <span className={styles.communityDesc}>Community beitreten, Feedback geben, mitspielen</span>
                </a>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <a href="https://github.com/affenmens7" target="_blank" rel="noopener noreferrer" className={styles.communityCard}>
                  <span className={styles.communityName}>GitHub</span>
                  <span className={styles.communityDesc}>Quellcode, Issues, Mitentwickeln</span>
                </a>
              </ScrollReveal>
            </div>
          </section>
        </ScrollReveal>

        {/* Server Status */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Server Status</h2>
            <div className={styles.statusGrid}>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="online" /><div className={styles.statusInfo}><span className={styles.statusName}>API</span><span className={styles.statusDesc}>Kartendaten und Backend</span></div></div>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="offline" /><div className={styles.statusInfo}><span className={styles.statusName}>Duell-Server</span><span className={styles.statusDesc}>Noch nicht verfuegbar</span></div></div>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="online" /><div className={styles.statusInfo}><span className={styles.statusName}>Datenbank</span><span className={styles.statusDesc}>Spielerdaten und Accounts</span></div></div>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="online" /><div className={styles.statusInfo}><span className={styles.statusName}>Spieler Online</span><span className={styles.statusDesc}>0</span></div></div>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
