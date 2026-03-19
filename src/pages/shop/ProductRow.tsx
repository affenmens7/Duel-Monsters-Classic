/**
 * ProductRow — paginated horizontal product row with arrow navigation.
 * Shows exactly N cards per page (no partial cards). Smooth CSS transform paging.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeBilingual } from '../../utils/localize';
import { SetShowcase } from './SetShowcase';
import type { ShopSetProduct } from '../../services/shopApi';
import styles from './ProductRow.module.css';

interface ProductRowProps {
  products: ShopSetProduct[];
  isEn: boolean;
  onProductClick: (setName: string) => void;
}

export function ProductRow({ products, isEn, onProductClick }: ProductRowProps) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const [cardWidth, setCardWidth] = useState(0);

  const totalCards = products.length;
  const maxPage = Math.max(0, totalCards - perPage);

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row || !row.firstElementChild) return;
    const gap = 16;
    const cw = (row.firstElementChild as HTMLElement).offsetWidth + gap;
    const visible = Math.floor((row.clientWidth + gap) / cw);
    setCardWidth(cw);
    setPerPage(Math.max(1, visible));
    setPage((prev) => Math.min(prev, Math.max(0, totalCards - visible)));
  }, [totalCards]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const offset = page * cardWidth;

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.arrow} ${styles.arrowPrev} ${page <= 0 ? styles.arrowHidden : ''}`}
        onClick={() => setPage((p) => Math.max(0, p - perPage))}
      >
        &#8249;
      </button>

      <div className={styles.row} ref={rowRef}>
        {products.map((product) => {
          const isActive = product.active;
          const desc = localizeBilingual(product.descDe, product.descEn, isEn);

          return (
            <div
              key={product.setName}
              className={`${styles.card} ${isActive ? styles.cardActive : styles.cardInactive}`}
              style={{ transform: `translateX(-${offset}px)` }}
              onClick={() => onProductClick(product.setName)}
            >
              <div className={`${styles.cardImage} ${isActive ? styles.cardImageActive : styles.cardImageInactive}`}>
                <SetShowcase cardIds={product.showcaseCardIds} code={product.code} productType={product.productType} animated={product.showcaseAnimated} />
                <span className={`${styles.waveBadge} ${isActive ? styles.waveBadgeActive : styles.waveBadgeInactive}`}>
                  {t('shop.wave', { wave: product.wave })}
                </span>
                {!isActive && (
                  <span className={styles.inactiveTag}>
                    {product.gameReleaseDate
                      ? t('shop.availableFrom', {
                          date: new Date(product.gameReleaseDate).toLocaleDateString(isEn ? 'en-US' : 'de-DE'),
                        })
                      : t('shop.notAvailable')}
                  </span>
                )}
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardName}>{product.setName}</span>
                <span className={styles.cardDesc}>{desc}</span>
                <div className={styles.cardFooter}>
                  <span className={styles.cardPrice}>{product.pricePack} DP</span>
                  <span className={styles.cardCount}>
                    {product.cardCount > 0 ? t('shop.cards', { count: product.cardCount }) : '--'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={`${styles.arrow} ${styles.arrowNext} ${page >= maxPage ? styles.arrowHidden : ''}`}
        onClick={() => setPage((p) => Math.min(maxPage, p + perPage))}
      >
        &#8250;
      </button>
    </div>
  );
}
