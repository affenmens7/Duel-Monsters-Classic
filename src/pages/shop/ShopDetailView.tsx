/**
 * ShopDetailView — set detail page with hero, rarity bars, buy buttons, card preview.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useAppData } from '../../store/AppDataContext';
import { useCardLocale } from '../../hooks/useCardLocale';
import { getCardImageUrl } from '../../services/cardApi';
import { updateSetConfig } from '../../services/admin/sets';
import { getRarityTier } from '../../utils/rarity';
import { localizeBilingual } from '../../utils/localize';
import { CardDetailPopup } from '../../components/common/CardDetailPopup';
import { Modal } from '../../components/common/Modal';
import { SetShowcase } from './SetShowcase';
import type { SetDetail, BuyResult } from '../../services/shopApi';
import styles from '../ShopPage.module.css';
import cardStyles from './ProductRow.module.css';

interface ShopDetailViewProps {
  setDetail: SetDetail;
  sortedDetailCards: SetDetail['cards'];
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
  onBuyPack: () => void;
  onBuyStarter: (setName: string) => void;
  onSetBuyResult: (result: BuyResult | null) => void;
  onSetPopupCardId: (id: number | null) => void;
}

export function ShopDetailView({
  setDetail, sortedDetailCards, ownedCount, dp, buying, error,
  buyResult, popupCardId, detailLoading, user, isEn,
  onBack, onBuyPack, onBuyStarter,
  onSetBuyResult, onSetPopupCardId,
}: ShopDetailViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser, token } = useAuth();
  const { cards: allCards } = useAppData();
  const { localize } = useCardLocale();

  const { set, rarityRates, cards } = setDetail;
  const isStarter = set.productType === 'starter';
  const canBuyPack = user && (dp >= set.pricePack) && set.active;
  const isAdmin = authUser?.role === 'admin';

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
          <h1 className={styles.heroSetName}>{set.setName}</h1>
          <div className={styles.heroWave}>{t('shop.wave', { wave: set.wave })}</div>

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
              <span className={styles.statValue}>{ownedCount}</span>
              <span className={styles.statLabel}>{t('inventory.owned')}</span>
            </div>
          </div>

          {/* Rarity Distribution */}
          {rarityRates.length > 0 && (
            <div className={styles.raritySection}>
              <div className={styles.rarityTitle}>{t('shop.rarityDistribution')}</div>
              {rarityRates.map((rate) => {
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

          {/* Buy Buttons */}
          <div className={styles.buyRow}>
            {isStarter ? (
              <button className={styles.buyBtn} onClick={() => onBuyStarter(set.setName)} disabled={!canBuyPack || buying}>
                {buying ? '...' : t('shop.buyStarter')}
                <span className={styles.buyPrice}>({set.pricePack} DP)</span>
              </button>
            ) : (
              <button className={styles.buyBtn} onClick={onBuyPack} disabled={!canBuyPack || buying}>
                {buying ? '...' : t('shop.buyPack')}
                <span className={styles.buyPrice}>({set.pricePack} DP)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Showcase Controls */}
      {isAdmin && (
        <div className={styles.showcaseAdminRow}>
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
        </div>
      )}

      {/* Card Set Preview */}
      <div className={styles.cardPreview}>
        <div className={styles.cardPreviewHeader}>
          <span className={styles.cardPreviewTitle}>{t('shop.setPreview')}</span>
          <span className={styles.cardPreviewProgress}>{ownedCount}/{cards.length} {t('shop.owned')}</span>
        </div>
        <div className={styles.cardGrid}>
          {sortedDetailCards.map((card) => {
            const colorSuffix = getRarityTier(card.rarity ?? 'Common');
            const imgId = card.artworkId ?? card.cardId;
            const isSelected = editingShowcase && editCards.includes(imgId);
            const slotIndex = editingShowcase ? editCards.indexOf(imgId) : -1;
            return (
              <div
                key={card.cardId}
                className={`${styles.cardCell} ${card.owned > 0 ? styles.cardCellOwned : styles.cardCellNotOwned} ${isSelected ? styles.cardCellSelected : ''}`}
                onClick={() => editingShowcase ? toggleCardInShowcase(imgId) : onSetPopupCardId(card.cardId)}
              >
                <img className={styles.cardCellImg} src={getCardImageUrl(card.cardId, 'small', card.artworkId ?? undefined)} alt="" loading="lazy" />
                <span className={`${styles.rarityDot} ${styles[`rarityDot${colorSuffix}`] ?? styles.rarityDotDefault}`} />
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
          return (
            <CardDetailPopup
              card={{
                id: cardData.id, nameDe: cardData.name ?? '', nameEn: cardData.name_en ?? '',
                desc: loc.desc, type: loc.type, frameType: cardData.frameType,
                atk: cardData.atk, def: cardData.def, level: cardData.level,
                attribute: cardData.attribute, rarity: setEntry?.rarity,
                sets: cardData.sets, banStatus: cardData.banStatus,
              }}
              onClose={() => onSetPopupCardId(null)}
              onSetClick={(setName) => navigate(`/app/cards?set=${encodeURIComponent(setName)}`)}
            >
              {setEntry && (
                <div className={styles.popupOwnership}>
                  {setEntry.owned > 0 ? `${t('inventory.owned')}: ${setEntry.owned}` : t('inventory.notOwned')}
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
              {(buyResult.pulledCards ?? buyResult.cards?.map((id) => ({ cardId: id, artworkId: id })) ?? []).map((card, i) => (
                <div key={`${card.cardId}-${i}`} className={styles.packCard}>
                  <img src={getCardImageUrl(card.cardId, 'small', card.artworkId)} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
