/**
 * CardTable — tabular view for the public card browser.
 * Shows cards in a sortable table with image, name, type, ATK/DEF, level, attribute, ban status.
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card } from '../../types/card';
import { getCardImageUrl } from '../../services/cardApi';
import { useCardLocale } from '../../hooks/useCardLocale';
import { getSortArrow } from '../../utils/sortArrow';
import styles from './CardTable.module.css';

const PAGE_SIZE = 50;

interface CardTableProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
  setFilter?: string;
  isCardMaxed?: (cardId: number) => boolean;
}

type SortKey = 'name' | 'type' | 'atk' | 'level' | 'attribute' | 'banStatus';

export function CardTable({ cards, onCardClick, setFilter, isCardMaxed }: CardTableProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const { localize } = useCardLocale();
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  // Reset page when cards change (filter/search)
  useEffect(() => { setPage(1); }, [cards]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortArrow = (key: SortKey) => getSortArrow(sortBy, sortDir, key);

  const BAN_ORDER: Record<string, number> = {
    Forbidden: 0, Limited: 1, 'Semi-Limited': 2, Unlimited: 3,
  };

  function getBanRank(status: string | null | undefined): number {
    if (!status) return 3; // null/undefined = Unlimited
    return BAN_ORDER[status] ?? 3;
  }

  const sorted = useMemo(() => {
    return [...cards].sort((a, b) => {
      let cmp = 0;
      const locA = localize(a);
      const locB = localize(b);
      switch (sortBy) {
        case 'name': cmp = locA.name.localeCompare(locB.name); break;
        case 'type': cmp = (a.frameType ?? '').localeCompare(b.frameType ?? ''); break;
        case 'atk': cmp = (a.atk ?? -1) - (b.atk ?? -1); break;
        case 'level': cmp = (a.level ?? -1) - (b.level ?? -1); break;
        case 'attribute': {
          const attrA = a.attribute ?? a.race ?? '';
          const attrB = b.attribute ?? b.race ?? '';
          cmp = attrA.localeCompare(attrB);
          break;
        }
        case 'banStatus': {
          cmp = getBanRank(a.banStatus) - getBanRank(b.banStatus);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [cards, sortBy, sortDir, localize]);

  if (cards.length === 0) {
    return <div className={styles.empty}>{t('cards.noResults')}</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>{t('admin.image')}</th>
            <th className={styles.thSort} onClick={() => handleSort('name')}>
              {t('admin.name')}{sortArrow('name')}
            </th>
            <th className={styles.thSort} onClick={() => handleSort('type')}>
              {t('admin.type')}{sortArrow('type')}
            </th>
            <th className={styles.thSort} onClick={() => handleSort('atk')}>
              ATK/DEF{sortArrow('atk')}
            </th>
            <th className={styles.thSort} onClick={() => handleSort('level')}>
              {t('admin.level')}{sortArrow('level')}
            </th>
            <th className={styles.thSort} onClick={() => handleSort('attribute')}>
              {t('admin.attribute')}{sortArrow('attribute')}
            </th>
            <th className={styles.thSort} onClick={() => handleSort('banStatus')}>
              {t('admin.banStatus')}{sortArrow('banStatus')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((card) => {
            const loc = localize(card);
            const artworkId = setFilter && setFilter !== 'all'
              ? card.sets?.find((s) => s.name === setFilter)?.artworkId ?? card.artworkIds?.[0]
              : card.artworkIds?.[0];
            const banKey = (card.banStatus ?? 'Unlimited').replace('-', '');

            return (
              <tr
                key={card.id}
                className={`${styles.tr} ${card.available === false || isCardMaxed?.(card.id) ? styles.trLocked : ''}`}
                onClick={() => onCardClick(card)}
              >
                <td className={styles.td}>
                  <img
                    className={styles.thumb}
                    src={getCardImageUrl(card.id, 'small', artworkId)}
                    alt=""
                    loading="lazy"
                  />
                </td>
                <td className={styles.td}>
                  <span className={styles.cardName}>{loc.name}</span>
                  {card.name_en && card.name_en !== loc.name && (
                    <span className={styles.cardNameSub}>{isEn ? card.name : card.name_en}</span>
                  )}
                </td>
                <td className={styles.tdCode}>{loc.type ?? card.frameType}</td>
                <td className={styles.td}>
                  {card.atk != null ? `${card.atk} / ${card.def ?? '?'}` : '\u2014'}
                </td>
                <td className={styles.td}>
                  {card.level ?? '\u2014'}
                </td>
                <td className={styles.tdCode}>
                  {card.attribute
                    ? t(`attributes.${card.attribute}`, card.attribute)
                    : (card.frameType === 'spell' || card.frameType === 'trap')
                      ? t(`spellTrapType.${card.race_en}`, card.race_en)
                      : '\u2014'}
                </td>
                <td className={styles.td}>
                  <span className={`${styles.banBadge} ${styles[`ban${banKey}`]}`}>
                    {t(`banStatus.${card.banStatus ?? 'Unlimited'}`)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sorted.length > PAGE_SIZE && (() => {
        const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
        return (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {t('admin.prev')}
            </button>
            <span className={styles.pageInfo}>
              {t('admin.page')} {page} {t('admin.of')} {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t('admin.next')}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
