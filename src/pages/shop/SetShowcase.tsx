/**
 * SetShowcase — card artwork compositions for set covers in the shop.
 *
 * Styles per product type:
 *   Static:   Booster = Cascade Stack (3) | Display = Tight Stack (5) | Starter = Pedestal (3, 1 dominant)
 *   Animated: Booster = Deal Out (3)      | Display = Deal Out (5)    | Starter = 3D Tilt (3, 1 dominant)
 */

import { getCardImageUrl } from '../../services/cardApi';
import styles from './SetShowcase.module.css';

interface SetShowcaseProps {
  cardIds: number[];
  code: string;
  productType?: string;
  animated?: boolean;
}

export function SetShowcase({ cardIds, code, productType, animated }: SetShowcaseProps) {
  if (!cardIds || cardIds.length === 0) {
    return <span className={styles.codeFallback}>{code}</span>;
  }

  const isStarter = productType === 'starter';
  const isDisplay = productType === 'display';

  // Determine CSS class based on type + animation
  let layoutClass: string;
  if (isStarter) {
    layoutClass = animated ? styles.deckTiltAnim : styles.deckPedestal;
  } else if (isDisplay) {
    layoutClass = animated ? styles.displayDealAnim : styles.displayStack;
  } else {
    // booster (default)
    layoutClass = animated ? styles.boosterDealAnim : styles.boosterCascade;
  }

  const count = isDisplay ? 5 : 3;
  const ids = cardIds.slice(0, count);

  return (
    <div className={`${styles.showcase} ${layoutClass}`}>
      {ids.map((id, i) => (
        <img
          key={id}
          className={styles[`c${i}`]}
          src={getCardImageUrl(id, 'small')}
          alt=""
          loading="lazy"
        />
      ))}
    </div>
  );
}
