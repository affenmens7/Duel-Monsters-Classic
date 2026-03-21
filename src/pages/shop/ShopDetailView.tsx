/**
 * ShopDetailView — set detail page with hero, rarity bars, buy buttons, card preview.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useAppData } from '../../store/AppDataContext';
import { useSession } from '../../store/SessionContext';
import { useCardLocale } from '../../hooks/useCardLocale';
import { getCardImageUrl } from '../../services/cardApi';
import { updateSetConfig } from '../../services/admin/sets';
import { getRarityTier } from '../../utils/rarity';
import { sortSetCards, type CardSortKey } from '../../utils/cardSort';
import { localizeBilingual } from '../../utils/localize';
import { CardDetailPopup } from '../../components/common/CardDetailPopup';
import { CardEffects } from '../../components/animations/CardEffects';
import { SortDropdown } from '../../components/common/SortDropdown';
import { Modal } from '../../components/common/Modal';
import { SetShowcase } from './SetShowcase';
import type { SetDetail, BuyResult } from '../../services/shopApi';
import styles from '../ShopPage.module.css';
import cardStyles from './ProductRow.module.css';

interface ShopDetailViewProps {
  setDetail: SetDetail;
  ownedCount: number;
  dp: number;
  buying: boolean;
  error: string;
  buyResult: BuyResult | null;
  popupCardId: number | null;
  detailLoading: boolean;
  user: { dp: number } | null;
  isEn: boolean;
  onBack: () => void;
  onBuyPack: (quantity: number) => void;
  onBuyStarter: (setName: string) => void;
  onSetBuyResult: (result: BuyResult | null) => void;
  onSetPopupCardId: (id: number | null) => void;
}

export function ShopDetailView({
  setDetail, ownedCount, dp, buying, error,
  buyResult, popupCardId, detailLoading, user, isEn,
  onBack, onBuyPack, onBuyStarter,
  onSetBuyResult, onSetPopupCardId,
}: ShopDetailViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser, token } = useAuth();
  const { cards: allCards } = useAppData();
  const { inventory } = useSession();
  const { localize } = useCardLocale();

  const { set, rarityRates, cards } = setDetail;
  const isStarter = set.productType === 'starter';
  const [packQty, setPackQty] = useState(1);
  const totalCost = set.pricePack * packQty;
  const canBuyPack = user && (dp >= totalCost) && set.active;
  const isAdmin = authUser?.role === 'admin';

  // Count owned artworks (matches tile greying logic)
  const artworkOwnedCount = useMemo(() => {
    return cards.filter((card) => {
      const inv = inventory.get(card.cardId);
      return card.artworkId
        ? inv?.unlockedArtworks?.includes(card.artworkId) ?? false
        : (inv?.quantity ?? 0) > 0;
    }).length;
  }, [cards, inventory]);

  // Card sort
  const [sortKey, setSortKey] = useState<CardSortKey>('type');
  const sortedCards = useMemo(
    () => sortSetCards(cards, sortKey, allCards),
    [cards, sortKey, allCards],
  );

  // Showcase editor state (admin only)
  const [editingShowcase, setEditingShowcase] = useState(false);
  const [editCards, setEditCards] = useState<number[]>([]);
  const [editAnimated, setEditAnimated] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);

  const maxSlots = isStarter ? 3 : 3;

  // Fallback: pick random cards from the set when no showcase cards are configured
  const showcaseFallback = useMemo(() => {
    if (set.showcaseCardIds && set.showcaseCardIds.length > 0) return set.showcaseCardIds;
    if (!cards || cards.length === 0) return [];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map((c) => c.artworkId ?? c.cardId);
  }, [set.showcaseCardIds, cards]);

  const startEditing = useCallback(() => {
    setEditCards(set.showcaseCardIds ?? []);
    setEditAnimated(set.showcaseAnimated ?? false);
    setEditingShowcase(true);
  }, [set.showcaseCardIds, set.showcaseAnimated]);

  const saveShowcase = useCallback(async () => {
    if (!token) return;
    setSavingShowcase(true);
    try {
      await updateSetConfig(token, set.setName, {
        showcase_card_ids: editCards.length > 0 ? editCards : null,
        showcase_animated: editAnimated,
      });
      // Update local state so preview refreshes
      set.showcaseCardIds = editCards.length > 0 ? editCards : null as any;
      set.showcaseAnimated = editAnimated;
      setEditingShowcase(false);
    } catch { /* ignore */ }
    finally { setSavingShowcase(false); }
  }, [token, set, editCards, editAnimated]);

  const toggleCardInShowcase = useCallback((artworkId: number) => {
    setEditCards((prev) => {
      if (prev.includes(artworkId)) return prev.filter((id) => id !== artworkId);
      if (prev.length >= maxSlots) return prev;
      return [...prev, artworkId];
    });
  }, [maxSlots]);

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={onBack}>
        <span className={styles.backArrow}>&#8592;</span>
        {t('shop.backToStore')}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {/* Title + Buy Button */}
      <div className={styles.titleRow}>
        <h1 className={styles.heroSetName}>{set.setName}</h1>
        <div className={styles.buyRow}>
          {isStarter ? (
            <button className={styles.buyBtn} onClick={() => onBuyStarter(set.setName)} disabled={!canBuyPack || buying}>
              {buying ? '...' : t('shop.buyStarter')}
              <span className={styles.buyPrice}>({set.pricePack} DP)</span>
            </button>
          ) : (
            <>
              <div className={styles.packStepper}>
                <button className={styles.stepperBtn} onClick={() => setPackQty((q) => Math.max(1, q - 1))} disabled={packQty <= 1}>-</button>
                <span className={styles.stepperValue}>{packQty}</span>
                <button className={styles.stepperBtn} onClick={() => setPackQty((q) => q + 1)}>+</button>
              </div>
              <button className={styles.buyBtn} onClick={() => onBuyPack(packQty)} disabled={!canBuyPack || buying}>
                {buying ? '...' : `${packQty}x ${t('shop.buyPack')}`}
                <span className={styles.buyPrice}>({totalCost.toLocaleString()} DP)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={`${cardStyles.card} ${set.active ? cardStyles.cardActive : cardStyles.cardInactive} ${styles.detailCard}`}>
          <div className={`${cardStyles.cardImage} ${set.active ? cardStyles.cardImageActive : cardStyles.cardImageInactive}`}>
            <SetShowcase
              cardIds={editingShowcase ? editCards : showcaseFallback}
              code={set.code ?? 'N/A'}
              productType={isStarter ? 'starter' : 'booster'}
              animated={editingShowcase ? editAnimated : set.showcaseAnimated}
            />
            <span className={`${cardStyles.waveBadge} ${set.active ? cardStyles.waveBadgeActive : cardStyles.waveBadgeInactive}`}>
              {t('shop.wave', { wave: set.wave })}
            </span>
            {!set.active && (
              <span className={cardStyles.inactiveTag}>
                {set.igReleaseDate
                  ? t('shop.availableFrom', {
                      date: new Date(set.igReleaseDate).toLocaleDateString(isEn ? 'en-US' : 'de-DE'),
                    })
                  : t('shop.notAvailable')}
              </span>
            )}
          </div>
          <div className={cardStyles.cardBody}>
            <span className={cardStyles.cardName}>{set.setName}</span>
            <span className={cardStyles.cardDesc}>{localizeBilingual(set.descDe, set.descEn, isEn)}</span>
            <div className={cardStyles.cardFooter}>
              <span className={cardStyles.cardPrice}>{set.pricePack} DP</span>
              <span className={cardStyles.cardCount}>
                {set.cardCount > 0 ? t('shop.cards', { count: set.cardCount }) : '--'}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.heroInfo}>
          <div>
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{set.packSize}</span>
                <span className={styles.statLabel}>{t('shop.cardsPerPack')}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{set.cardCount}</span>
                <span className={styles.statLabel}>{t('shop.setSize')}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{artworkOwnedCount}</span>
                <span className={styles.statLabel}>{t('inventory.owned')}</span>
              </div>
            </div>
          </div>

          {/* Rarity Distribution */}
          {rarityRates.length > 0 && (
            <div className={styles.raritySection}>
              <div className={styles.rarityTitle}>{t('shop.rarityDistribution')}</div>
              {rarityRates.filter((r) => parseFloat(r.ratePct) > 0).map((rate) => {
                const pct = parseFloat(rate.ratePct);
                const colorSuffix = getRarityTier(rate.rarity);
                return (
                  <div key={rate.rarity} className={styles.rarityBar}>
                    <span className={styles.rarityLabel}>{rate.rarity}</span>
                    <div className={styles.rarityTrack}>
                      <div className={`${styles.rarityFill} ${styles[`rarity${colorSuffix}`] ?? styles.rarityDefault}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.rarityPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Admin Showcase Controls + Sort Dropdown */}
      <div className={styles.showcaseAdminRow}>
        {isAdmin && (
          <>
            {!editingShowcase ? (
              <button className={styles.buyBtn} onClick={startEditing}>
                {t('admin.editShowcase')}
              </button>
            ) : (
              <>
                <button className={styles.buyBtn} onClick={saveShowcase} disabled={savingShowcase}>
                  {savingShowcase ? '...' : t('common.save')}
                </button>
                <button className={`${styles.buyBtn} ${styles.buyBtnDisplay}`} onClick={() => setEditingShowcase(false)}>
                  {t('common.cancel')}
                </button>
                <span className={styles.showcaseSlotInfo}>{editCards.length}/{maxSlots}</span>
              </>
            )}
            <button
              className={`${styles.buyBtn} ${!(editingShowcase ? editAnimated : (set.showcaseAnimated ?? false)) ? '' : styles.buyBtnDisplay}`}
              onClick={() => editingShowcase ? setEditAnimated(false) : undefined}
              disabled={!editingShowcase}
            >{t('admin.showcaseStatic')}</button>
            <button
              className={`${styles.buyBtn} ${(editingShowcase ? editAnimated : (set.showcaseAnimated ?? false)) ? '' : styles.buyBtnDisplay}`}
              onClick={() => editingShowcase ? setEditAnimated(true) : undefined}
              disabled={!editingShowcase}
            >{t('admin.showcaseAnimated')}</button>
          </>
        )}
        <SortDropdown value={sortKey} onChange={setSortKey} />
      </div>

      {/* Card Set Preview */}
      <div className={styles.cardPreview}>
        <div className={styles.cardPreviewHeader}>
          <span className={styles.cardPreviewTitle}>{t('shop.setPreview')}</span>
          <span className={styles.cardPreviewProgress}>{artworkOwnedCount}/{cards.length} {t('shop.owned')}</span>
        </div>
        <div className={styles.cardGrid}>
          {sortedCards.map((card) => {
            const imgId = card.artworkId ?? card.cardId;
            const isSelected = editingShowcase && editCards.includes(imgId);
            const slotIndex = editingShowcase ? editCards.indexOf(imgId) : -1;
            const invEntry = inventory.get(card.cardId);
            const ownsArtwork = card.artworkId
              ? invEntry?.unlockedArtworks?.includes(card.artworkId) ?? false
              : (invEntry?.quantity ?? 0) > 0;
            return (
              <div
                key={card.cardId}
                className={`${styles.cardCell} ${ownsArtwork ? styles.cardCellOwned : styles.cardCellNotOwned} ${isSelected ? styles.cardCellSelected : ''}`}
                onClick={() => editingShowcase ? toggleCardInShowcase(imgId) : onSetPopupCardId(card.cardId)}
              >
                <CardEffects
                  imageSrc={getCardImageUrl(card.cardId, 'small', card.artworkId ?? undefined)}
                  rarity={allCards.find((c) => c.id === card.cardId)?.rarity}
                  isGhost={card.isGhost}
                  isMisprint={card.isMisprint}
                  className={styles.cardCellImg}
                />
                {isSelected && <span className={styles.cardCellSlot}>{slotIndex + 1}</span>}
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
          const invEntry = inventory.get(popupCardId);
          const artworkIds = cardData.artworkIds ?? [];
          return (
            <CardDetailPopup
              card={{
                id: cardData.id, nameDe: cardData.name ?? '', nameEn: cardData.name_en ?? '',
                desc: loc.desc, type: loc.type, frameType: cardData.frameType,
                atk: cardData.atk, def: cardData.def, level: cardData.level,
                attribute: cardData.attribute, rarity: cardData.rarity ?? setEntry?.rarity,
                sets: cardData.sets, banStatus: cardData.banStatus,
              }}
              onClose={() => onSetPopupCardId(null)}
              onSetClick={(setName) => navigate(`/app/cards?set=${encodeURIComponent(setName)}`)}
              currentArtworkId={setEntry?.artworkId ?? artworkIds[0] ?? null}
              artworks={artworkIds.length > 0
                ? artworkIds.map((aId, i) => ({
                    artworkId: aId,
                    label: i === 0 ? 'Original' : `Artwork ${i + 1}`,
                    imagePath: `/images/cards/${aId}.jpg`,
                    isDefault: i === 0,
                    availableIn: cardData.sets
                      ?.filter((s) => s.artworkId === aId)
                      .map((s) => s.name)
                      .join(', ') || null,
                  }))
                : undefined
              }
              effectPreviewMode
              ownedArtworkIds={invEntry?.unlockedArtworks}
              isPreviewGreyed={!invEntry}
            >
              {setEntry && (
                <div className={styles.popupOwnership}>
                  {(invEntry?.quantity ?? 0) > 0 ? `${t('inventory.owned')}: ${invEntry!.quantity}` : t('inventory.notOwned')}
                </div>
              )}
            </CardDetailPopup>
          );
        })()}

        {detailLoading && <div className={styles.loading}>{t('cards.loading')}</div>}
      </div>

      {/* Pack Opening Result Modal */}
      <Modal open={buyResult !== null && (buyResult?.cards?.length ?? 0) > 0} onClose={() => onSetBuyResult(null)} title={t('shop.packOpening')}>
        {buyResult?.cards && (
          <div className={styles.packResult}>
            <p className={styles.packResultText}>{t('shop.cardsReceived')}</p>
            <div className={styles.packCards}>
              {(buyResult.pulledCards ?? buyResult.cards?.map((id) => ({ cardId: id, artworkId: id, rarity: 'Common', isGhost: false, isMisprint: false, misprintData: null })) ?? []).map((card, i) => {
                const cardData = allCards.find((c) => c.id === card.cardId);
                const rarity = cardData?.rarity ?? card.rarity ?? 'Common';
                return (
                  <div key={`${card.cardId}-${i}`} className={styles.packCard}>
                    <CardEffects
                      imageSrc={getCardImageUrl(card.cardId, 'small', card.artworkId)}
                      rarity={rarity}
                      isGhost={card.isGhost}
                      isMisprint={card.isMisprint}
                      misprintData={card.misprintData as any}
                    />
                    {card.isGhost && card.isMisprint && (
                      <span className={styles.pullBadgeGhostMisprint}>{t('shop.ghostMisprint')}</span>
                    )}
                    {card.isGhost && !card.isMisprint && (
                      <span className={styles.pullBadgeGhost}>{t('shop.ghostRare')}</span>
                    )}
                    {card.isMisprint && !card.isGhost && (
                      <span className={styles.pullBadgeMisprint}>{t('shop.misprint')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
