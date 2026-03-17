import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { env } from '../config/env';
import styles from './StarterChoicePage.module.css';

export function StarterChoicePage({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [choosing, setChoosing] = useState(false);
  const [selected, setSelected] = useState<'yugi' | 'kaiba' | null>(null);

  async function handleChoose(starter: 'yugi' | 'kaiba') {
    setChoosing(true);
    setSelected(starter);
    try {
      const token = localStorage.getItem('dmc-token');
      const res = await fetch(`${env.api.baseUrl}/user/choose-starter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ starter }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(onComplete, 1500);
    } catch {
      setChoosing(false);
      setSelected(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          {t('starterChoice.title', 'Waehle dein Starter Deck')}
        </h1>
        <p className={styles.subtitle}>
          {t('starterChoice.subtitle', `Willkommen, ${user?.username}! Waehle dein erstes Deck um zu beginnen.`)}
        </p>

        <div className={styles.decks}>
          <button
            className={`${styles.deckOption} ${selected === 'yugi' ? styles.deckSelected : ''}`}
            onClick={() => handleChoose('yugi')}
            disabled={choosing}
          >
            <div className={styles.deckImageWrap}>
              <img src="/images/sets/SYE.png" alt="Starter Deck: Yugi" className={styles.deckImage} />
            </div>
            <h2 className={styles.deckName}>Starter Deck: Yugi</h2>
            <p className={styles.deckDesc}>
              {t('starterChoice.yugiDesc', 'Dark Magician, Summoned Skull und maechtige Zauberkarten. Ein vielseitiges Deck mit starker Magie.')}
            </p>
            <div className={styles.deckHighlights}>
              <span>Dark Magician</span>
              <span>Summoned Skull</span>
              <span>Monster Reborn</span>
            </div>
          </button>

          <div className={styles.vs}>VS</div>

          <button
            className={`${styles.deckOption} ${selected === 'kaiba' ? styles.deckSelected : ''}`}
            onClick={() => handleChoose('kaiba')}
            disabled={choosing}
          >
            <div className={styles.deckImageWrap}>
              <img src="/images/sets/SKE.png" alt="Starter Deck: Kaiba" className={styles.deckImage} />
            </div>
            <h2 className={styles.deckName}>Starter Deck: Kaiba</h2>
            <p className={styles.deckDesc}>
              {t('starterChoice.kaibaDesc', 'Blue-Eyes White Dragon und starke Krieger. Ein aggressives Deck mit roher Kraft.')}
            </p>
            <div className={styles.deckHighlights}>
              <span>Blue-Eyes White Dragon</span>
              <span>Judge Man</span>
              <span>La Jinn</span>
            </div>
          </button>
        </div>

        {selected && (
          <div className={styles.choosing}>
            {t('starterChoice.receiving', 'Du erhaeltst dein Deck...')}
          </div>
        )}
      </div>
    </div>
  );
}
