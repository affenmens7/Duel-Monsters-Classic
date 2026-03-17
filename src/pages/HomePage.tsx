import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCards } from '../store/CardContext';
import { Roadmap } from '../components/common/Roadmap';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { getCardImageUrl } from '../services/cardApi';
import { NEWS } from '../config/news';
import { APP_VERSION } from '../config/version';
import styles from './HomePage.module.css';

export function HomePage() {
  const { cards } = useCards();
  const [visible, setVisible] = useState(false);

  const showcaseIds = [46986414, 89631139, 74677422, 33396948, 70781052];
  const deckPreviewIds = [46986414, 38033121, 4031928, 5318639, 55144522, 44095762, 64788463, 70368879, 12580477, 89631139];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.page} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        {/* 1. Kartendatenbank */}
        <ScrollReveal>
          <div className={styles.banner}>
            <div className={styles.bannerInner}>
              <div className={styles.bannerText}>
                <div className={styles.bannerLabel}>Kartendatenbank</div>
                <h2 className={styles.bannerTitleTeal}>Entdecke die Karten</h2>
                <p className={styles.bannerDesc}>
                  Durchsuche die komplette Sammlung der DM- und GX-Aera.
                  Alle Karten auf Deutsch und Englisch. Filtere nach Typ, Attribut und Set.
                </p>
                <div className={styles.bannerStats}>
                  <div><span className={styles.bannerStatNum}>{cards.length}</span><span className={styles.bannerStatLabel}>Karten</span></div>
                  <div><span className={styles.bannerStatNum}>26</span><span className={styles.bannerStatLabel}>Sets</span></div>
                  <div><span className={styles.bannerStatNum}>DE/EN</span><span className={styles.bannerStatLabel}>Zweisprachig</span></div>
                </div>
                <Link to="/app/cards" className={styles.bannerLink}>Karten entdecken</Link>
              </div>
              <div className={styles.bannerVisual}>
                <div className={styles.cardsFan}>
                  {showcaseIds.map((id) => (
                    <img key={id} src={getCardImageUrl(id)} alt="" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 3. Kartenladen */}
        <ScrollReveal>
          <div className={`${styles.banner} ${styles.bannerAlt} ${styles.bannerReverse}`}>
            <div className={styles.bannerInner}>
              <div className={styles.bannerText}>
                <div className={styles.bannerLabel}>Kartenladen</div>
                <h2 className={styles.bannerTitleGold}>Booster, Decks und mehr</h2>
                <p className={styles.bannerDesc}>
                  Kaufe Booster Packs mit zufaelligen Karten, komplette Starter Decks oder ganze Displays.
                  Verdiene DP durch Duelle und baue deine Sammlung auf.
                </p>
                <div className={styles.productsGrid}>
                  <div className={styles.productItem}>
                    <img className={styles.productImg} src="/images/sets/SYE.png" alt="" />
                    <span className={styles.productName}>Starter Deck</span>
                    <span className={styles.productInfo}>40 Karten</span>
                    <span className={styles.productPrice}>600 DP</span>
                  </div>
                  <div className={styles.productItem}>
                    <img className={styles.productImg} src="/images/sets/LOB.png" alt="" />
                    <span className={styles.productName}>Booster Pack</span>
                    <span className={styles.productInfo}>5 Karten</span>
                    <span className={styles.productPrice}>120 DP</span>
                  </div>
                  <div className={styles.productItem}>
                    <div className={styles.displayStack}>
                      <img src="/images/sets/LOB.png" alt="" />
                      <img src="/images/sets/LOB.png" alt="" />
                      <img src="/images/sets/LOB.png" alt="" />
                      <img src="/images/sets/LOB.png" alt="" />
                      <img src="/images/sets/LOB.png" alt="" />
                    </div>
                    <span className={styles.productName}>Display</span>
                    <span className={styles.productInfo}>120 Karten</span>
                    <span className={styles.productPrice}>2.400 DP</span>
                  </div>
                </div>
                <Link to="/app/shop" className={styles.bannerLink}>Zum Kartenladen</Link>
              </div>
              <div className={styles.bannerVisual}>
                <div className={styles.boosterRow}>
                  <div className={styles.boosterItem}><img src="/images/sets/LOB.png" alt="" /><span>Blue Eyes</span></div>
                  <div className={styles.boosterItem}><img src="/images/sets/MRD.png" alt="" /><span>Metal Raiders</span></div>
                  <div className={styles.boosterItem}><img src="/images/sets/SRL.png" alt="" /><span>Spell Ruler</span></div>
                  <div className={styles.boosterItem}><img src="/images/sets/PSV.png" alt="" /><span>Pharaoh's</span></div>
                  <div className={styles.boosterItem}><img src="/images/sets/DCR.png" alt="" /><span>Dark Crisis</span></div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 4. Deckbuilder */}
        <ScrollReveal>
          <div className={styles.banner}>
            <div className={styles.bannerInner}>
              <div className={styles.bannerText}>
                <div className={styles.bannerLabel}>Deckbuilder</div>
                <h2 className={styles.bannerTitleTeal}>Baue dein Deck</h2>
                <p className={styles.bannerDesc}>
                  Stelle aus deiner Kartensammlung ein Deck mit 40-60 Karten zusammen.
                  Waehle Monster, Zauber und Fallen fuer die perfekte Strategie.
                </p>
                <div className={styles.bannerStats}>
                  <div><span className={styles.bannerStatNum}>40-60</span><span className={styles.bannerStatLabel}>Karten pro Deck</span></div>
                  <div><span className={styles.bannerStatNum}>3</span><span className={styles.bannerStatLabel}>Max. Kopien</span></div>
                  <div><span className={styles.bannerStatNum}>15</span><span className={styles.bannerStatLabel}>Extra Deck</span></div>
                </div>
                <Link to="/app/cards" className={styles.bannerLink}>Deck erstellen</Link>
              </div>
              <div className={styles.bannerVisual}>
                <div className={styles.deckPreview}>
                  {deckPreviewIds.map((id) => (
                    <div key={id} className={styles.deckPreviewCard}>
                      <img src={getCardImageUrl(id)} alt="" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 5. News */}
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

        {/* 6. Changelog */}
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

        {/* 7. Roadmap */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Roadmap</h2>
            <Roadmap />
          </section>
        </ScrollReveal>

        {/* 8. Community */}
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

        {/* 9. Server Status */}
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
