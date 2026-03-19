/**
 * ShopStorefrontView — main shop page with featured banner, product rows, cosmetics.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getCardImageUrl } from '../../services/cardApi';
import { Modal } from '../../components/common/Modal';
import { FeaturedCarousel } from './FeaturedCarousel';
import { ProductRow } from './ProductRow';
import type { ShopSetProduct, ShopFeaturedItem, BuyResult } from '../../services/shopApi';
import styles from '../ShopPage.module.css';

interface ShopStorefrontViewProps {
  boosters: ShopSetProduct[];
  starters: ShopSetProduct[];
  featuredItems: ShopFeaturedItem[];
  dp: number;
  user: { dp: number } | null;
  isEn: boolean;
  error: string;
  buying: boolean;
  buyResult: BuyResult | null;
  shopLoading: boolean;
  onOpenDetail: (setName: string, mode: 'booster' | 'display') => void;
  onSetBuyResult: (result: BuyResult | null) => void;
}

export function ShopStorefrontView({
  boosters, starters, featuredItems, dp, user, isEn,
  error, buying, buyResult, shopLoading,
  onOpenDetail, onSetBuyResult,
}: ShopStorefrontViewProps) {
  const { t } = useTranslation();
  const [boosterMode, setBoosterModeState] = useState<'pack' | 'display'>(
    () => (localStorage.getItem('dmc-shop-mode') as 'pack' | 'display') || 'pack'
  );
  const setBoosterMode = (mode: 'pack' | 'display') => {
    localStorage.setItem('dmc-shop-mode', mode);
    setBoosterModeState(mode);
  };

  const displayProducts = useMemo(() => {
    if (boosterMode !== 'display') return [];
    return boosters
      .filter((b) => b.priceDisplay != null)
      .map((b) => ({
        ...b,
        pricePack: b.priceDisplay!,
        productType: 'display' as string,
        showcaseCardIds: b.displayShowcaseCardIds ?? b.autoShowcaseCardIds ?? b.showcaseCardIds,
        showcaseAnimated: b.displayShowcaseAnimated ?? false,
      }));
  }, [boosters, boosterMode]);

  const hasDisplays = boosters.some((b) => b.priceDisplay != null);

  return (
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Featured Carousel — driven by shop_featured table via admin UI */}
      {featuredItems.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>{t('shop.featured')}</h2>
          <FeaturedCarousel items={featuredItems} isEn={isEn} onItemClick={(productId) => onOpenDetail(productId, 'booster')} />
        </>
      )}

      {/* Booster Packs / Displays */}
      {boosters.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {boosterMode === 'pack' ? t('shop.boosters') : t('shop.displays')}
            </h2>
            {hasDisplays && (
              <div className={styles.sectionToggle}>
                <button
                  className={`${styles.sectionToggleBtn} ${boosterMode === 'pack' ? styles.sectionToggleBtnActive : ''}`}
                  onClick={() => setBoosterMode('pack')}
                >{t('shop.boosters')}</button>
                <button
                  className={`${styles.sectionToggleBtn} ${boosterMode === 'display' ? styles.sectionToggleBtnActive : ''}`}
                  onClick={() => setBoosterMode('display')}
                >{t('shop.displays')}</button>
              </div>
            )}
          </div>
          <ProductRow
            products={boosterMode === 'pack' ? boosters : displayProducts}
            isEn={isEn}
            onProductClick={(name) => onOpenDetail(name, boosterMode === 'pack' ? 'booster' : 'display')}
          />
        </div>
      )}

      {/* Starter Decks */}
      {starters.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('shop.starterDecks')}</h2>
          <ProductRow products={starters} isEn={isEn} onProductClick={(name) => onOpenDetail(name, 'booster')} />
        </div>
      )}

      {/* Empty state */}
      {boosters.length === 0 && starters.length === 0 && !shopLoading && (
        <div className={styles.loading}>{t('shop.noProducts')}</div>
      )}

      {/* Pack Opening Result Modal */}
      <Modal open={buyResult !== null && (buyResult?.cards?.length ?? 0) > 0} onClose={() => onSetBuyResult(null)} title={t('shop.packOpening')}>
        {buyResult?.cards && (
          <div className={styles.packResult}>
            <p className={styles.packResultText}>{t('shop.cardsReceived')}</p>
            <div className={styles.packCards}>
              {buyResult.cards.map((cardId, i) => (
                <div key={`${cardId}-${i}`} className={styles.packCard}>
                  <img src={getCardImageUrl(cardId, 'small')} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
