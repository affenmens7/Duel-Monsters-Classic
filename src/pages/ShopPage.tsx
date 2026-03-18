/**
 * ShopPage — Demo 6 storefront with detail view.
 *
 * Two views that toggle:
 * 1. Storefront: featured banner, horizontal scroll categories, cosmetic grid
 * 2. Detail: pack artwork, stats, rarity bars, buy buttons, card set preview
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useSession } from '../store/SessionContext';
import { useAppData } from '../store/AppDataContext';
import { useCardLocale } from '../hooks/useCardLocale';
import { getCardImageUrl } from '../services/cardApi';
import {
  fetchSetDetail,
  buyPack,
  buyDisplay,
  buyStarter,
  buyCosmetic,
  type ShopSetProduct,
  type SetDetail,
  type ShopCosmetic,
  type BuyResult,
} from '../services/shopApi';
import { Modal } from '../components/common/Modal';
import { CardDetailPopup } from '../components/common/CardDetailPopup';
import styles from './ShopPage.module.css';

type ViewMode = 'storefront' | 'detail';
/** Returns the pack artwork URL for a set code, or null if unknown. */
function getSetImageUrl(code: string | null): string | null {
  if (!code) return null;
  return `/images/sets/${code}.jpg`;
}

/** Maps rarity string to a CSS class suffix. */
function rarityColorClass(rarity: string): string {
  const lower = rarity.toLowerCase();
  if (lower.includes('secret')) return 'SecretRare';
  if (lower.includes('ultra')) return 'UltraRare';
  if (lower.includes('super')) return 'SuperRare';
  if (lower.includes('rare')) return 'Rare';
  if (lower.includes('common')) return 'Common';
  return 'Default';
}

export function ShopPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEn = i18n.language === 'en';
  const { user, token } = useAuth();
  const { dp, updateDp, addCardsToInventory } = useSession();
  const { cards: allCards, shopProducts: cachedShopData } = useAppData();
  const { localize } = useCardLocale();

  // View state
  const [view, setView] = useState<ViewMode>('storefront');
  const [selectedSetName, setSelectedSetName] = useState<string | null>(null);

  // Data — shop products come from AppDataContext cache
  const shopData = cachedShopData;
  const [setDetail, setSetDetail] = useState<SetDetail | null>(null);
  const shopLoading = !shopData;
  const [detailLoading, setDetailLoading] = useState(false);

  // Purchase state
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);

  // Card popup in detail view
  const [popupCardId, setPopupCardId] = useState<number | null>(null);

  // ============================================================
  // Data fetching
  // ============================================================

  const openDetail = useCallback(async (setName: string) => {
    if (!token) {
      setError(t('shop.loginRequired'));
      return;
    }

    setDetailLoading(true);
    setError('');

    try {
      const detail = await fetchSetDetail(setName, token);
      setSetDetail(detail);
      setSelectedSetName(setName);
      setView('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shop.loadError'));
    } finally {
      setDetailLoading(false);
    }
  }, [token, t]);

  const goBack = useCallback(() => {
    setView('storefront');
    setSetDetail(null);
    setSelectedSetName(null);
    setPopupCardId(null);
    setError('');
  }, []);

  // ============================================================
  // Purchase handlers
  // ============================================================

  const handleBuyPack = useCallback(async () => {
    if (!token || !user || !selectedSetName || buying) return;
    setBuying(true);
    setError('');

    try {
      const result = await buyPack(selectedSetName, token);
      updateDp(result.dpRemaining);
      if (result.cards) addCardsToInventory(result.cards);
      setBuyResult(result);
      // Refresh detail to update ownership counts
      const updatedDetail = await fetchSetDetail(selectedSetName, token);
      setSetDetail(updatedDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shop.purchaseFailed'));
    } finally {
      setBuying(false);
    }
  }, [token, user, selectedSetName, buying, updateDp, addCardsToInventory]);

  const handleBuyDisplay = useCallback(async () => {
    if (!token || !user || !selectedSetName || buying) return;
    setBuying(true);
    setError('');

    try {
      const result = await buyDisplay(selectedSetName, token);
      updateDp(result.dpRemaining);
      if (result.cards) addCardsToInventory(result.cards);
      setBuyResult(result);
      const updatedDetail = await fetchSetDetail(selectedSetName, token);
      setSetDetail(updatedDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shop.purchaseFailed'));
    } finally {
      setBuying(false);
    }
  }, [token, user, selectedSetName, buying, updateDp, addCardsToInventory]);

  const handleBuyStarter = useCallback(async (setName: string) => {
    if (!token || !user || buying) return;
    setBuying(true);
    setError('');

    try {
      const result = await buyStarter(setName, token);
      updateDp(result.dpRemaining);
      if (result.cards) addCardsToInventory(result.cards);
      setBuyResult(result);
      if (selectedSetName) {
        const updatedDetail = await fetchSetDetail(selectedSetName, token);
        setSetDetail(updatedDetail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shop.purchaseFailed'));
    } finally {
      setBuying(false);
    }
  }, [token, user, buying, updateDp, addCardsToInventory, selectedSetName]);

  const handleBuyCosmetic = useCallback(async (itemId: string) => {
    if (!token || !user || buying) return;
    setBuying(true);
    setError('');

    try {
      const result = await buyCosmetic(itemId, token);
      updateDp(result.dpRemaining);
      setBuyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shop.purchaseFailed'));
    } finally {
      setBuying(false);
    }
  }, [token, user, buying, updateDp]);

  // ============================================================
  // Detail view: filtered cards
  // ============================================================

  // Sort cards by rarity (rarest first)
  const RARITY_ORDER: Record<string, number> = {
    'Secret Rare': 0, 'Ultra Rare': 1, 'Super Rare': 2, 'Rare': 3, 'Common': 4,
  };

  const sortedDetailCards = useMemo(() => {
    if (!setDetail) return [];
    return [...setDetail.cards].sort((a, b) => {
      const ra = RARITY_ORDER[a.rarity] ?? 5;
      const rb = RARITY_ORDER[b.rarity] ?? 5;
      return ra - rb;
    });
  }, [setDetail]);

  // Ownership count for progress display
  const ownedCount = useMemo(() => {
    if (!setDetail) return 0;
    return setDetail.cards.filter((c) => c.owned > 0).length;
  }, [setDetail]);

  // ============================================================
  // Localization helpers
  // ============================================================

  function localizeSetDesc(product: ShopSetProduct): string {
    return isEn ? (product.descEn ?? product.descDe ?? '') : (product.descDe ?? product.descEn ?? '');
  }

  function localizeCosmeticName(item: ShopCosmetic): string {
    return isEn ? (item.nameEn ?? item.nameDe) : (item.nameDe ?? item.nameEn);
  }

  function localizeCosmeticDesc(item: ShopCosmetic): string {
    return isEn ? (item.descEn ?? item.descDe ?? '') : (item.descDe ?? item.descEn ?? '');
  }

  // ============================================================
  // Render: Loading
  // ============================================================

  if (shopLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>{t('cards.loading')}</div>
      </div>
    );
  }

  // ============================================================
  // Render: Detail View
  // ============================================================

  if (view === 'detail' && setDetail) {
    const { set, rarityRates, cards } = setDetail;
    const imageUrl = getSetImageUrl(set.code);
    const isStarter = set.productType === 'starter';
    const canBuyPack = user && (dp >= set.pricePack) && set.active;
    const canBuyDisplay = user && set.priceDisplay != null && (dp >= set.priceDisplay) && set.active;

    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={goBack}>
          <span className={styles.backArrow}>&#8592;</span>
          {t('shop.backToStore')}
        </button>

        {error && <div className={styles.error}>{error}</div>}

        {/* Hero Section */}
        <div className={styles.hero}>
          {imageUrl ? (
            <img
              className={styles.heroImage}
              src={imageUrl}
              alt={set.setName}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className={styles.heroImagePlaceholder}>{set.code ?? 'N/A'}</div>
          )}

          <div className={styles.heroInfo}>
            <h1 className={styles.heroSetName}>{set.setName}</h1>
            <div className={styles.heroWave}>{t('shop.wave', { wave: set.wave })}</div>
            <p className={styles.heroDesc}>{localizeSetDesc(set)}</p>

            {/* Stats Row */}
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{set.packSize}</span>
                <span className={styles.statLabel}>
                  {t('shop.cardsPerPack')}
                </span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{set.cardCount}</span>
                <span className={styles.statLabel}>
                  {t('shop.setSize')}
                </span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{ownedCount}</span>
                <span className={styles.statLabel}>
                  {t('inventory.owned')}
                </span>
              </div>
              {set.displaySize && (
                <div className={styles.statBox}>
                  <span className={styles.statValue}>{set.displaySize}</span>
                  <span className={styles.statLabel}>
                    {t('shop.packsPerDisplay')}
                  </span>
                </div>
              )}
            </div>

            {/* Rarity Distribution */}
            {rarityRates.length > 0 && (
              <div className={styles.raritySection}>
                <div className={styles.rarityTitle}>
                  {t('shop.rarityDistribution')}
                </div>
                {rarityRates.map((rate) => {
                  const pct = parseFloat(rate.ratePct);
                  const colorSuffix = rarityColorClass(rate.rarity);
                  return (
                    <div key={rate.rarity} className={styles.rarityBar}>
                      <span className={styles.rarityLabel}>{rate.rarity}</span>
                      <div className={styles.rarityTrack}>
                        <div
                          className={`${styles.rarityFill} ${styles[`rarity${colorSuffix}`] ?? styles.rarityDefault}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={styles.rarityPct}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buy Buttons */}
            <div className={styles.buyRow}>
              {isStarter ? (
                <button
                  className={styles.buyBtn}
                  onClick={() => handleBuyStarter(set.setName)}
                  disabled={!canBuyPack || buying}
                >
                  {buying ? '...' : t('shop.buyStarter')}
                  <span className={styles.buyPrice}>({set.pricePack} DP)</span>
                </button>
              ) : (
                <>
                  <button
                    className={styles.buyBtn}
                    onClick={handleBuyPack}
                    disabled={!canBuyPack || buying}
                  >
                    {buying ? '...' : t('shop.buyPack')}
                    <span className={styles.buyPrice}>({set.pricePack} DP)</span>
                  </button>

                  {set.priceDisplay != null && (
                    <button
                      className={`${styles.buyBtn} ${styles.buyBtnDisplay}`}
                      onClick={handleBuyDisplay}
                      disabled={!canBuyDisplay || buying}
                    >
                      {buying ? '...' : t('shop.buyDisplay')}
                      <span className={styles.buyPrice}>({set.priceDisplay} DP)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card Set Preview */}
        <div className={styles.cardPreview}>
          <div className={styles.cardPreviewHeader}>
            <span className={styles.cardPreviewTitle}>
              {t('shop.setPreview')}
            </span>
            <span className={styles.cardPreviewProgress}>
              {ownedCount}/{cards.length} {t('shop.owned')}
            </span>
          </div>


          {/* Card Grid — sorted by rarity */}
          <div className={styles.cardGrid}>
            {sortedDetailCards.map((card) => {
              const colorSuffix = rarityColorClass(card.rarity ?? 'Common');

              return (
                <div
                  key={card.cardId}
                  className={`${styles.cardCell} ${card.owned > 0 ? styles.cardCellOwned : styles.cardCellNotOwned}`}
                  onClick={() => setPopupCardId(card.cardId)}
                >
                  <img
                    className={styles.cardCellImg}
                    src={getCardImageUrl(card.cardId, 'small')}
                    alt=""
                    loading="lazy"
                  />
                  <span className={`${styles.rarityDot} ${styles[`rarityDot${colorSuffix}`] ?? styles.rarityDotDefault}`} />
                </div>
              );
            })}
          </div>

          {/* Card Detail Popup */}
          {popupCardId && (() => {
            const cardData = allCards.find((c) => c.id === popupCardId);
            const setEntry = setDetail?.cards.find((c) => c.cardId === popupCardId);
            if (!cardData) return null;
            const loc = localize(cardData);
            return (
              <CardDetailPopup
                card={{
                  id: cardData.id,
                  nameDe: cardData.name ?? '',
                  nameEn: cardData.name_en ?? '',
                  desc: loc.desc,
                  type: loc.type,
                  frameType: cardData.frameType,
                  atk: cardData.atk,
                  def: cardData.def,
                  level: cardData.level,
                  attribute: cardData.attribute,
                  rarity: setEntry?.rarity,
                  sets: cardData.sets,
                  banStatus: cardData.banStatus,
                }}
                onClose={() => setPopupCardId(null)}
                onSetClick={(setName) => navigate(`/app/cards?set=${encodeURIComponent(setName)}`)}
              >
                {setEntry && (
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#c8a830', padding: '8px 0', borderTop: '1px solid rgba(0,220,168,0.08)' }}>
                    {setEntry.owned > 0 ? `${t('inventory.owned')}: ${setEntry.owned}` : t('inventory.notOwned')}
                  </div>
                )}
              </CardDetailPopup>
            );
          })()}

          {detailLoading && (
            <div className={styles.loading}>{t('cards.loading')}</div>
          )}
        </div>

        {/* Pack Opening Result Modal */}
        <Modal
          open={buyResult !== null && (buyResult?.cards?.length ?? 0) > 0}
          onClose={() => setBuyResult(null)}
          title={t('shop.packOpening')}
        >
          {buyResult?.cards && (
            <div className={styles.packResult}>
              <p className={styles.packResultText}>{t('shop.cardsReceived')}</p>
              <div className={styles.packCards}>
                {buyResult.cards.map((cardId, i) => (
                  <div key={`${cardId}-${i}`} className={styles.packCard}>
                    <img
                      src={getCardImageUrl(cardId, 'small')}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // ============================================================
  // Render: Storefront View
  // ============================================================

  const boosters = shopData?.boosters ?? [];
  const starters = shopData?.starters ?? [];
  const cosmetics = shopData?.cosmetics ?? [];
  const featured = boosters.find((b) => b.featured) ?? starters.find((s) => s.featured) ?? null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{t('shop.title')}</h1>
        {user && (
          <div className={styles.dpBadge}>
            <span className={styles.dpLabel}>{t('common.dp')}</span>
            {dp.toLocaleString()}
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Featured Banner */}
      {featured && featured.active && (
        <div
          className={styles.featuredBanner}
          onClick={() => openDetail(featured.setName)}
        >
          <span className={styles.featuredLabel}>
            {t('shop.featured')}
          </span>
          {getSetImageUrl(featured.code) ? (
            <img
              className={styles.featuredImage}
              src={getSetImageUrl(featured.code)!}
              alt={featured.setName}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}
          <div className={styles.featuredInfo}>
            <h2 className={styles.featuredName}>{featured.setName}</h2>
            <p className={styles.featuredDesc}>{localizeSetDesc(featured)}</p>
            <span className={styles.featuredPrice}>{featured.pricePack} DP</span>
          </div>
        </div>
      )}

      {/* Booster Packs */}
      {boosters.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('shop.boosters')}</h2>
          <div className={styles.scrollRow}>
            {boosters.map((product) => (
              <ProductCard
                key={product.setName}
                product={product}
                isEn={isEn}
                onClick={() => product.active ? openDetail(product.setName) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Starter Decks */}
      {starters.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('shop.starterDecks')}</h2>
          <div className={styles.scrollRow}>
            {starters.map((product) => (
              <ProductCard
                key={product.setName}
                product={product}
                isEn={isEn}
                onClick={() => product.active ? openDetail(product.setName) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cosmetics */}
      {cosmetics.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('shop.cosmetics')}</h2>
          <div className={styles.cosmeticGrid}>
            {cosmetics.map((item) => (
              <div
                key={item.itemId}
                className={`${styles.cosmeticCard} ${!item.available ? styles.cosmeticCardLocked : ''}`}
                onClick={() => item.available ? handleBuyCosmetic(item.itemId) : undefined}
              >
                <span className={styles.cosmeticType}>{item.itemType}</span>
                <span className={styles.cosmeticName}>{localizeCosmeticName(item)}</span>
                <span className={styles.cosmeticDesc}>{localizeCosmeticDesc(item)}</span>
                <span className={styles.cosmeticPrice}>
                  {item.available ? `${item.price} DP` : t('shop.notAvailable')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {boosters.length === 0 && starters.length === 0 && cosmetics.length === 0 && !shopLoading && (
        <div className={styles.loading}>
          {t('shop.noProducts')}
        </div>
      )}

      {/* Pack Opening Result Modal (for starter / cosmetic purchases from storefront) */}
      <Modal
        open={buyResult !== null && (buyResult?.cards?.length ?? 0) > 0}
        onClose={() => setBuyResult(null)}
        title={t('shop.packOpening')}
      >
        {buyResult?.cards && (
          <div className={styles.packResult}>
            <p className={styles.packResultText}>{t('shop.cardsReceived')}</p>
            <div className={styles.packCards}>
              {buyResult.cards.map((cardId, i) => (
                <div key={`${cardId}-${i}`} className={styles.packCard}>
                  <img
                    src={getCardImageUrl(cardId, 'small')}
                    alt=""
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

/** Product card for horizontal scroll rows. */
function ProductCard({
  product,
  isEn,
  onClick,
}: {
  product: ShopSetProduct;
  isEn: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const imageUrl = getSetImageUrl(product.code);
  const desc = isEn ? (product.descEn ?? product.descDe ?? '') : (product.descDe ?? product.descEn ?? '');

  return (
    <div
      className={`${styles.productCard} ${!product.active ? styles.productCardLocked : ''}`}
      onClick={onClick}
    >
      {imageUrl ? (
        <img
          className={styles.productImage}
          src={imageUrl}
          alt={product.setName}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Replace with placeholder on error
            const placeholder = target.parentElement?.querySelector(`.${styles.productImagePlaceholder}`);
            if (!placeholder) {
              target.style.display = 'none';
            }
          }}
        />
      ) : (
        <div className={styles.productImagePlaceholder}>
          {product.code ?? product.setName}
        </div>
      )}
      <div className={styles.productBody}>
        <span className={styles.productWave}>{t('shop.wave', { wave: product.wave })}</span>
        <span className={styles.productName}>{product.setName}</span>
        <span className={styles.productDesc}>{desc}</span>
      </div>
      <div className={styles.productFooter}>
        <span className={styles.productPrice}>{product.pricePack} DP</span>
        {product.active ? (
          <span className={styles.productCards}>
            {t('shop.cards', { count: product.cardCount })}
          </span>
        ) : (
          <span className={styles.lockedBadge}>{t('shop.notAvailable')}</span>
        )}
      </div>
    </div>
  );
}
