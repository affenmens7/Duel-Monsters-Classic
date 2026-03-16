import { useTranslation } from 'react-i18next';
import type { Card } from '../../types/card';
import { getCardImageUrl } from '../../services/cardApi';
import { useCardLocale } from '../../hooks/useCardLocale';
import styles from './CardDetail.module.css';

interface CardDetailProps {
  card: Card;
  onClose: () => void;
}

export function CardDetail({ card, onClose }: CardDetailProps) {
  const { t } = useTranslation();
  const { localize } = useCardLocale();
  const loc = localize(card);
  const imageUrl = getCardImageUrl(card.id, 'full');
  const isMonster = ['normal', 'effect', 'ritual', 'fusion'].includes(card.frameType);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          x
        </button>

        <div className={styles.content}>
          <div className={styles.imageSection}>
            <img
              src={imageUrl}
              alt={loc.name}
              className={styles.cardImage}
            />
          </div>

          <div className={styles.infoSection}>
            <h2 className={styles.cardName}>{loc.name}</h2>
            {loc.secondaryName && (
              <span className={styles.cardNameEn}>{loc.secondaryName}</span>
            )}

            <div className={styles.typeBadge}>
              {loc.type}
            </div>

            {isMonster && (
              <div className={styles.stats}>
                {card.attribute && (
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>{t('cardDetail.attribute')}</span>
                    <span className={styles.statValue}>{card.attribute}</span>
                  </div>
                )}
                {card.level !== undefined && (
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>{t('cardDetail.level')}</span>
                    <span className={styles.statValue}>{card.level}</span>
                  </div>
                )}
                <div className={styles.stat}>
                  <span className={styles.statLabel}>{t('cardDetail.type')}</span>
                  <span className={styles.statValue}>{loc.race}</span>
                </div>
                <div className={styles.atkDef}>
                  <span className={styles.atk}>ATK/{card.atk ?? '?'}</span>
                  <span className={styles.def}>DEF/{card.def ?? '?'}</span>
                </div>
              </div>
            )}

            <p className={styles.description}>{loc.desc}</p>

            {card.card_sets && card.card_sets.length > 0 && (
              <div className={styles.sets}>
                <span className={styles.setsLabel}>{t('cardDetail.containedIn')}</span>
                <div className={styles.setList}>
                  {card.card_sets.slice(0, 5).map((set, index) => (
                    <span key={index} className={styles.setBadge}>
                      {set.set_name}
                    </span>
                  ))}
                  {card.card_sets.length > 5 && (
                    <span className={styles.setBadge}>
                      {t('cardDetail.more', { count: card.card_sets.length - 5 })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
