import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCards } from '../store/CardContext';
import { Roadmap } from '../components/common/Roadmap';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { getCardImageUrl } from '../services/cardApi';
import { NEWS } from '../config/news';
import { APP_VERSION } from '../config/version';
import styles from './HomePage.module.css';

export function HomePage() {
  const { t } = useTranslation();
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
                <div className={styles.bannerLabel}>{t('home.cardDbLabel')}</div>
                <h2 className={styles.bannerTitleTeal}>{t('home.cardDbTitle')}</h2>
                <p className={styles.bannerDesc}>
                  {t('home.cardDbDesc')}
                </p>
                <div className={styles.bannerStats}>
                  <div><span className={styles.bannerStatNum}>{cards.length}</span><span className={styles.bannerStatLabel}>{t('home.cardDbCards')}</span></div>
                  <div><span className={styles.bannerStatNum}>26</span><span className={styles.bannerStatLabel}>{t('home.cardDbSets')}</span></div>
                  <div><span className={styles.bannerStatNum}>DE/EN</span><span className={styles.bannerStatLabel}>{t('home.cardDbBilingual')}</span></div>
                </div>
                <Link to="/app/cards" className={styles.bannerLink}>{t('home.cardDbLink')}</Link>
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
                <div className={styles.bannerLabel}>{t('home.shopLabel')}</div>
                <h2 className={styles.bannerTitleGold}>{t('home.shopTitle')}</h2>
                <p className={styles.bannerDesc}>
                  {t('home.shopDesc')}
                </p>
                <div className={styles.productsGrid}>
                  <div className={styles.productItem}>
                    <div className={styles.productImgPlaceholder}>SDY</div>
                    <span className={styles.productName}>{t('home.shopStarterDeck')}</span>
                    <span className={styles.productInfo}>{t('home.shopCardCount', { count: 40 })}</span>
                    <span className={styles.productPrice}>600 DP</span>
                  </div>
                  <div className={styles.productItem}>
                    <div className={styles.productImgPlaceholder}>LOB</div>
                    <span className={styles.productName}>{t('home.shopBoosterPack')}</span>
                    <span className={styles.productInfo}>{t('home.shopCardCount', { count: 5 })}</span>
                    <span className={styles.productPrice}>120 DP</span>
                  </div>
                  <div className={styles.productItem}>
                    <div className={styles.productImgPlaceholder}>24x</div>
                    <span className={styles.productName}>{t('home.shopDisplay')}</span>
                    <span className={styles.productInfo}>{t('home.shopCardCount', { count: 120 })}</span>
                    <span className={styles.productPrice}>2.400 DP</span>
                  </div>
                </div>
                <Link to="/app/shop" className={styles.bannerLink}>{t('home.shopLink')}</Link>
              </div>
              <div className={styles.bannerVisual}>
                <div className={styles.boosterRow}>
                  <div className={styles.boosterItem}><div className={styles.boosterCode}>LOB</div><span>Blue Eyes</span></div>
                  <div className={styles.boosterItem}><div className={styles.boosterCode}>MRD</div><span>Metal Raiders</span></div>
                  <div className={styles.boosterItem}><div className={styles.boosterCode}>SRL</div><span>Spell Ruler</span></div>
                  <div className={styles.boosterItem}><div className={styles.boosterCode}>PSV</div><span>Pharaoh's</span></div>
                  <div className={styles.boosterItem}><div className={styles.boosterCode}>DCR</div><span>Dark Crisis</span></div>
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
                <div className={styles.bannerLabel}>{t('home.deckbuilderLabel')}</div>
                <h2 className={styles.bannerTitleTeal}>{t('home.deckbuilderTitle')}</h2>
                <p className={styles.bannerDesc}>
                  {t('home.deckbuilderDesc')}
                </p>
                <div className={styles.bannerStats}>
                  <div><span className={styles.bannerStatNum}>40-60</span><span className={styles.bannerStatLabel}>{t('home.deckbuilderCardsPerDeck')}</span></div>
                  <div><span className={styles.bannerStatNum}>3</span><span className={styles.bannerStatLabel}>{t('home.deckbuilderMaxCopies')}</span></div>
                  <div><span className={styles.bannerStatNum}>15</span><span className={styles.bannerStatLabel}>{t('home.deckbuilderExtraDeck')}</span></div>
                </div>
                <Link to="/app/cards" className={styles.bannerLink}>{t('home.deckbuilderLink')}</Link>
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
            <h2 className={styles.sectionTitle}>{t('home.newsTitle')}</h2>
            <div className={styles.newsGrid}>
              {NEWS.map((entry) => (
                <article key={entry.id} className={styles.newsCard}>
                  <div className={styles.newsDate}>{entry.date}</div>
                  <h3 className={styles.newsHeading}>{entry.title}</h3>
                  <p className={styles.newsText}>{entry.summary}</p>
                  <div className={styles.newsFooter}>
                    <span className={styles.newsTag}>{entry.tag}</span>
                    <Link to={`/app/news/${entry.id}`} className={styles.newsMore}>
                      {t('common.moreInfo')}
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
            <h2 className={styles.sectionTitle}>{t('home.changelogTitle')}</h2>
            <div className={styles.changelog}>
              <div className={styles.changelogEntry}>
                <div className={styles.changelogHeader}>
                  <span className={styles.changelogVersion}>v{APP_VERSION}</span>
                  <span className={styles.changelogDate}>16.03.2026</span>
                </div>
                <ul className={styles.changelogList}>
                  <li>{t('home.changelogCardBrowser')}</li>
                  <li>{t('home.changelogBilingual')}</li>
                  <li>{t('home.changelogTheme')}</li>
                  <li>{t('home.changelogSettings')}</li>
                  <li>{t('home.changelogHomePage')}</li>
                  <li>{t('home.changelogServerStatus')}</li>
                  <li>{t('home.changelogFloatingCards')}</li>
                  <li>{t('home.changelogTitleScreen')}</li>
                </ul>
                <div className={styles.changelogFooter}>
                  <Link to="/app/news/patch-0-0-1" className={styles.changelogMore}>
                    {t('common.moreInfo')}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 7. Roadmap */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('home.roadmapTitle')}</h2>
            <Roadmap />
          </section>
        </ScrollReveal>

        {/* 8. Community */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('home.communityTitle')}</h2>
            <div className={styles.communityGrid}>
              <ScrollReveal delay={0}>
                <a href="https://discord.gg/E7Rj7BXkD9" target="_blank" rel="noopener noreferrer" className={styles.communityCard}>
                  <span className={styles.communityName}>Discord</span>
                  <span className={styles.communityDesc}>{t('home.discordDesc')}</span>
                </a>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <a href="https://github.com/affenmens7" target="_blank" rel="noopener noreferrer" className={styles.communityCard}>
                  <span className={styles.communityName}>GitHub</span>
                  <span className={styles.communityDesc}>{t('home.githubDesc')}</span>
                </a>
              </ScrollReveal>
            </div>
          </section>
        </ScrollReveal>

        {/* 9. Server Status */}
        <ScrollReveal>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('home.serverStatusTitle')}</h2>
            <div className={styles.statusGrid}>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="online" /><div className={styles.statusInfo}><span className={styles.statusName}>{t('home.statusApi')}</span><span className={styles.statusDesc}>{t('home.statusApiDesc')}</span></div></div>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="offline" /><div className={styles.statusInfo}><span className={styles.statusName}>{t('home.statusDuelServer')}</span><span className={styles.statusDesc}>{t('home.statusDuelServerDesc')}</span></div></div>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="online" /><div className={styles.statusInfo}><span className={styles.statusName}>{t('home.statusDatabase')}</span><span className={styles.statusDesc}>{t('home.statusDatabaseDesc')}</span></div></div>
              <div className={styles.statusCard}><span className={styles.statusDot} data-status="online" /><div className={styles.statusInfo}><span className={styles.statusName}>{t('home.statusPlayersOnline')}</span><span className={styles.statusDesc}>0</span></div></div>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
