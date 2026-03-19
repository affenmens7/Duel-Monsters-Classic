/**
 * CosmeticSection — cosmetic items grouped by category (sleeves, playmats, extras).
 * Each category gets its own paginated row with arrow navigation.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeBilingual } from '../../utils/localize';
import type { ShopCosmetic } from '../../services/shopApi';
import styles from './CosmeticSection.module.css';

interface CosmeticSectionProps {
  cosmetics: ShopCosmetic[];
  isEn: boolean;
  onBuy: (itemId: string) => void;
}

/** Maps DB itemType to display category. Only sleeves + playmats shown. */
const CATEGORY_MAP: Record<string, string> = {
  sleeve: 'sleeves',
  playmat: 'playmats',
};

const CATEGORY_ORDER = ['sleeves', 'playmats'] as const;

function getCategoryStyle(cat: string) {
  if (cat === 'sleeves') return { preview: styles.previewSleeve, badge: styles.typeSleeve };
  if (cat === 'playmats') return { preview: styles.previewPlaymat, badge: styles.typePlaymat };
  return { preview: styles.previewExtra, badge: styles.typeExtra };
}

export function CosmeticSection({ cosmetics, isEn, onBuy }: CosmeticSectionProps) {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const map = new Map<string, ShopCosmetic[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of cosmetics) {
      const cat = CATEGORY_MAP[item.itemType] ?? 'extras';
      const arr = map.get(cat);
      if (arr) arr.push(item);
    }
    return map;
  }, [cosmetics]);

  return (
    <div className={styles.section}>
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat);
        if (!items || items.length === 0) return null;
        return (
          <div key={cat}>
            <div className={styles.categoryTitle}>{t(`shop.cosmetic_${cat}`)}</div>
            <CosmeticRow items={items} category={cat} isEn={isEn} onBuy={onBuy} />
          </div>
        );
      })}
    </div>
  );
}

/* ---- Internal: paginated row per category ---- */

interface CosmeticRowProps {
  items: ShopCosmetic[];
  category: string;
  isEn: boolean;
  onBuy: (itemId: string) => void;
}

function CosmeticRow({ items, category, isEn, onBuy }: CosmeticRowProps) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const [cardWidth, setCardWidth] = useState(0);

  const totalCards = items.length;
  const maxPage = Math.max(0, totalCards - perPage);
  const catStyle = getCategoryStyle(category);

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
      >&#8249;</button>

      <div className={styles.row} ref={rowRef}>
        {items.map((item) => {
          const name = localizeBilingual(item.nameDe, item.nameEn, isEn);
          const desc = localizeBilingual(item.descDe, item.descEn, isEn);

          return (
            <div
              key={item.itemId}
              className={`${styles.card} ${!item.available ? styles.cardLocked : ''}`}
              style={{ transform: `translateX(-${offset}px)` }}
              onClick={() => item.available ? onBuy(item.itemId) : undefined}
            >
              <div
                className={`${styles.preview} ${catStyle.preview}`}
                style={item.previewData ? { background: item.previewData } : undefined}
              >
                <span className={`${styles.typeBadge} ${catStyle.badge}`}>
                  {item.itemType}
                </span>
                <span className={styles.previewIcon}>{item.itemType}</span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardName}>{name}</span>
                <span className={styles.cardDesc}>{desc}</span>
                <div className={styles.cardFooter}>
                  <span className={styles.cardPrice}>
                    {item.available ? `${item.price} DP` : ''}
                  </span>
                  {!item.available && (
                    <span className={styles.cardStatus}>{t('shop.notAvailable')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={`${styles.arrow} ${styles.arrowNext} ${page >= maxPage ? styles.arrowHidden : ''}`}
        onClick={() => setPage((p) => Math.min(maxPage, p + perPage))}
      >&#8250;</button>
    </div>
  );
}
