/**
 * ShopStorefrontView — main shop page with featured banner, product rows, cosmetics.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCardImageUrl } from '../../services/cardApi';
import { CardEffects } from '../../components/animations/CardEffects';
import { Modal } from '../../components/common/Modal';
import { FeaturedCarousel } from './FeaturedCarousel';
import { ProductRow } from './ProductRow';
import type { ShopSetProduct, ShopDisplayProduct, ShopFeaturedItem, BuyResult } from '../../services/shopApi';
import styles from '../ShopPage.module.css';

interface ShopStorefrontViewProps {
  boosters: ShopSetProduct[];
  starters: ShopSetProduct[];
  displays: ShopDisplayProduct[];
  featuredItems: ShopFeaturedItem[];
  dp: number;
  user: { dp: number } | null;
  isEn: boolean;
  error: string;
  buying: boolean;
  buyResult: BuyResult | null;
  shopLoading: boolean;
  onOpenDetail: (setName: string, mode: 'booster' | 'display') => void;
  onOpenDisplayDetail: (displayId: number) => void;
  onSetBuyResult: (result: BuyResult | null) => void;
}

export function ShopStorefrontView({
  boosters, starters, displays, featuredItems, dp, user, isEn,
  error, buying, buyResult, shopLoading,
  onOpenDetail, onOpenDisplayDetail, onSetBuyResult,
}: ShopStorefrontViewProps) {
  const { t } = useTranslation();
  const [boosterMode, setBoosterModeState] = useState<'pack' | 'display'>(
    () => (localStorage.getItem('dmc-shop-mode') as 'pack' | 'display') || 'pack'
  );
  const setBoosterMode = (mode: 'pack' | 'display') => {
    localStorage.setItem('dmc-shop-mode', mode);
    setBoosterModeState(mode);
  };

  const hasDisplays = displays.length > 0;

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

      {/* Booster Packs / Displays — toggle */}
      {(boosters.length > 0 || displays.length > 0) && (
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
          {boosterMode === 'pack' ? (
            <ProductRow
              products={boosters}
              isEn={isEn}
              onProductClick={(name) => onOpenDetail(name, 'booster')}
            />
          ) : (
            <ProductRow
              products={displays.map((d) => ({
                setName: d.name,
                code: '',
                wave: d.wave,
                active: d.active,
                productType: 'display',
                pricePack: d.price,
                packSize: d.totalPacks,
                descDe: d.descDe,
                descEn: d.descEn,
                featured: false,
                cardCount: d.cardCount,
                showcaseCardIds: d.showcaseCardIds ?? [],
                showcaseAnimated: d.showcaseAnimated,
                igReleaseDate: d.igReleaseDate,
              }))}
              isEn={isEn}
              onProductClick={(_name, idx) => {
                const display = displays[idx];
                if (display) onOpenDisplayDetail(display.id);
              }}
            />
          )}
        </div>
      )}

      {/* Starter Decks */}
      {starters.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('shop.starterDecks')}</h2>
          </div>
          <ProductRow products={starters} isEn={isEn} onProductClick={(name) => onOpenDetail(name, 'booster')} />
        </div>
      )}

      {/* Empty state */}
      {boosters.length === 0 && starters.length === 0 && displays.length === 0 && !shopLoading && (
        <div className={styles.loading}>{t('shop.noProducts')}</div>
      )}

      {/* Pack Opening Result Modal */}
      <Modal open={buyResult !== null && (buyResult?.cards?.length ?? 0) > 0} onClose={() => onSetBuyResult(null)} title={t('shop.packOpening')}>
        {buyResult?.cards && (
          <div className={styles.packResult}>
            <p className={styles.packResultText}>{t('shop.cardsReceived')}</p>
            <div className={styles.packCards}>
              {(buyResult.pulledCards ?? buyResult.cards?.map((id) => ({ cardId: id, artworkId: id, rarity: 'Common', isGhost: false, isMisprint: false, misprintData: null })) ?? []).map((card, i) => (
                <div key={`${card.cardId}-${i}`} className={styles.packCard}>
                  <CardEffects
                    imageSrc={getCardImageUrl(card.cardId, 'small', card.artworkId)}
                    rarity={card.rarity}
                    isGhost={card.isGhost}
                    isMisprint={card.isMisprint}
                    misprintData={card.misprintData as any}
                  />
                  {card.isGhost && (
                    <span className={styles.pullBadgeGhost}>{t('shop.ghostRare')}</span>
                  )}
                  {card.isMisprint && (
                    <span className={styles.pullBadgeMisprint}>{t('shop.misprint')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
