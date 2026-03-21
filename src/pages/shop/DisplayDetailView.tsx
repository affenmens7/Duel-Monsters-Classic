/**
 * DisplayDetailView — display detail page with hero, content breakdown, rarity bars, buy button, card preview.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useAppData } from '../../store/AppDataContext';
import { useSession } from '../../store/SessionContext';
import { useCardLocale } from '../../hooks/useCardLocale';
import { getCardImageUrl } from '../../services/cardApi';
import { updateDisplay } from '../../services/admin/displays';
import { getRarityTier } from '../../utils/rarity';
import { generateSeededMisprintData } from '../../utils/misprint';
import { sortSetCards, type CardSortKey } from '../../utils/cardSort';
import { localizeBilingual } from '../../utils/localize';
import { CardDetailPopup } from '../../components/common/CardDetailPopup';
import { CardEffects } from '../../components/animations/CardEffects';
import { SortDropdown } from '../../components/common/SortDropdown';
import { Modal } from '../../components/common/Modal';
import { SetShowcase } from './SetShowcase';
import type { DisplayDetail, BuyResult } from '../../services/shopApi';
import styles from '../ShopPage.module.css';
import cardStyles from './ProductRow.module.css';

interface DisplayDetailViewProps {
  displayDetail: DisplayDetail;
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
  onBuyDisplay: () => void;
  onSetBuyResult: (result: BuyResult | null) => void;
  onSetPopupCardId: (id: number | null) => void;
}

export function DisplayDetailView({
  displayDetail, ownedCount, dp, buying, error,
  buyResult, popupCardId, detailLoading, user, isEn,
  onBack, onBuyDisplay, onSetBuyResult, onSetPopupCardId,
}: DisplayDetailViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser, token } = useAuth();
  const { cards: allCards } = useAppData();
  const { inventory } = useSession();
  const { localize } = useCardLocale();

  const { display, rarityRates, cards } = displayDetail;
  const canBuy = user && (dp >= display.price) && display.active;
  const isAdmin = authUser?.role === 'admin';

  // Helper: check if user owns the specific artwork
  const ownsCardArtwork = useCallback((card: { cardId: number; artworkId: number | null }) => {
    const inv = inventory.get(card.cardId);
    return card.artworkId
      ? inv?.unlockedArtworks?.includes(card.artworkId) ?? false
      : (inv?.quantity ?? 0) > 0;
  }, [inventory]);

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

  const maxSlots = 5;

  // Fallback: pick random cards from the display when no showcase cards are configured
  const showcaseFallback = useMemo(() => {
    if (display.showcaseCardIds && display.showcaseCardIds.length > 0) return display.showcaseCardIds;
    if (!cards || cards.length === 0) return [];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5).map((c) => c.artworkId ?? c.cardId);
  }, [display.showcaseCardIds, cards]);

  const startEditing = useCallback(() => {
    setEditCards(display.showcaseCardIds ?? []);
    setEditAnimated(display.showcaseAnimated ?? false);
    setEditingShowcase(true);
  }, [display.showcaseCardIds, display.showcaseAnimated]);

  const toggleCardInShowcase = useCallback((artworkId: number) => {
    setEditCards((prev) => {
      if (prev.includes(artworkId)) return prev.filter((id) => id !== artworkId);
      if (prev.length >= maxSlots) return prev;
      return [...prev, artworkId];
    });
  }, [maxSlots]);

  const saveShowcase = useCallback(async () => {
    if (!token) return;
    setSavingShowcase(true);
    try {
      await updateDisplay(token, display.id, {
        showcase_card_ids: editCards.length > 0 ? editCards : null,
        showcase_animated: editAnimated,
      });
      display.showcaseCardIds = editCards.length > 0 ? editCards : null as any;
      display.showcaseAnimated = editAnimated;
      setEditingShowcase(false);
    } catch { /* ignore */ }
    finally { setSavingShowcase(false); }
  }, [token, display, editCards, editAnimated]);

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={onBack}>
        <span className={styles.backArrow}>&#8592;</span>
        {t('shop.backToStore')}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {/* Title + Buy Button */}
      <div className={styles.titleRow}>
        <h1 className={styles.heroSetName}>{display.name}</h1>
        <div className={styles.buyRow}>
          <button className={`${styles.buyBtn} ${styles.buyBtnDisplay}`} onClick={onBuyDisplay} disabled={!canBuy || buying}>
            {buying ? '...' : t('shop.buyDisplay')}
            <span className={styles.buyPrice}>({display.price} DP)</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={`${cardStyles.card} ${display.active ? cardStyles.cardActive : cardStyles.cardInactive} ${styles.detailCard}`}>
          <div className={`${cardStyles.cardImage} ${display.active ? cardStyles.cardImageActive : cardStyles.cardImageInactive}`}>
            <SetShowcase
              cardIds={editingShowcase ? editCards : showcaseFallback}
              code={'DSP'}
              productType="display"
              animated={editingShowcase ? editAnimated : display.showcaseAnimated}
            />
            <span className={`${cardStyles.waveBadge} ${display.active ? cardStyles.waveBadgeActive : cardStyles.waveBadgeInactive}`}>
              {t('shop.wave', { wave: display.wave })}
            </span>
            {!display.active && (
              <span className={cardStyles.inactiveTag}>
                {display.igReleaseDate
                  ? t('shop.availableFrom', {
                      date: new Date(display.igReleaseDate).toLocaleDateString(isEn ? 'en-US' : 'de-DE'),
                    })
                  : t('shop.notAvailable')}
              </span>
            )}
          </div>
          <div className={cardStyles.cardBody}>
            <span className={cardStyles.cardName}>{display.name}</span>
            <span className={cardStyles.cardDesc}>{localizeBilingual(display.descDe, display.descEn, isEn)}</span>
            <div className={cardStyles.cardFooter}>
              <span className={cardStyles.cardPrice}>{display.price} DP</span>
              <span className={cardStyles.cardCount}>
                {display.cardCount > 0 ? t('shop.cards', { count: display.cardCount }) : '--'}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.heroInfo}>
          <div>
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{display.totalPacks}</span>
                <span className={styles.statLabel}>{t('shop.totalPacks')}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{display.cardCount}</span>
                <span className={styles.statLabel}>{t('shop.uniqueCards')}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{cards.filter(ownsCardArtwork).length}</span>
                <span className={styles.statLabel}>{t('inventory.owned')}</span>
              </div>
            </div>

            {/* Content Breakdown */}
            {display.contents && display.contents.length > 0 && (
              <div className={styles.displayContents}>
                <div className={styles.rarityTitle}>{t('shop.displayContents')}</div>
                {display.contents.map((entry) => (
                  <div key={entry.boosterSetName} className={styles.displayContentItem}>
                    <span className={styles.displayContentCount}>{entry.packCount}x</span>{' '}
                    {entry.boosterSetName}
                  </div>
                ))}
              </div>
            )}
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
              className={`${styles.buyBtn} ${!(editingShowcase ? editAnimated : display.showcaseAnimated) ? '' : styles.buyBtnDisplay}`}
              onClick={() => editingShowcase ? setEditAnimated(false) : undefined}
              disabled={!editingShowcase}
            >{t('admin.showcaseStatic')}</button>
            <button
              className={`${styles.buyBtn} ${(editingShowcase ? editAnimated : display.showcaseAnimated) ? '' : styles.buyBtnDisplay}`}
              onClick={() => editingShowcase ? setEditAnimated(true) : undefined}
              disabled={!editingShowcase}
            >{t('admin.showcaseAnimated')}</button>
          </>
        )}
        <SortDropdown value={sortKey} onChange={setSortKey} />
      </div>

      {/* Card Set Preview — grouped by booster */}
      <div className={styles.cardPreview}>
        <div className={styles.cardPreviewHeader}>
          <span className={styles.cardPreviewTitle}>{t('shop.setPreview')}</span>
          <span className={styles.cardPreviewProgress}>{cards.filter(ownsCardArtwork).length}/{cards.length} {t('shop.owned')}</span>
        </div>

        {/* Group cards by setName (booster), preserving order from API */}
        {(() => {
          const groups: { setName: string; cards: typeof sortedCards }[] = [];
          for (const card of sortedCards) {
            const name = card.setName ?? 'Unknown';
            let group = groups.find((g) => g.setName === name);
            if (!group) {
              group = { setName: name, cards: [] };
              groups.push(group);
            }
            group.cards.push(card);
          }

          return groups.map((group) => (
            <div key={group.setName}>
              <div className={styles.boosterGroupHeader}>
                <span className={styles.boosterGroupName}>{group.setName}</span>
                <span className={styles.boosterGroupCount}>{group.cards.filter(ownsCardArtwork).length}/{group.cards.length}</span>
              </div>
              <div className={styles.cardGrid}>
                {group.cards.map((card) => {
                  const imgId = card.artworkId ?? card.cardId;
                  const isSelected = editingShowcase && editCards.includes(imgId);
                  const slotIndex = editingShowcase ? editCards.indexOf(imgId) : -1;
                  const invEntry = inventory.get(card.cardId);
                  const ownsArtwork = card.artworkId
                    ? invEntry?.unlockedArtworks?.includes(card.artworkId) ?? false
                    : (invEntry?.quantity ?? 0) > 0;
                  return (
                    <div
                      key={`${group.setName}-${card.cardId}`}
                      className={`${styles.cardCell} ${ownsArtwork ? styles.cardCellOwned : styles.cardCellNotOwned} ${isSelected ? styles.cardCellSelected : ''}`}
                      onClick={() => editingShowcase ? toggleCardInShowcase(imgId) : onSetPopupCardId(card.cardId)}
                    >
                      <CardEffects
                        imageSrc={getCardImageUrl(card.cardId, 'small', card.artworkId ?? undefined)}
                        rarity={allCards.find((c) => c.id === card.cardId)?.rarity}
                        isGhost={card.isGhost}
                        isMisprint={card.isMisprint}
                        misprintData={card.isMisprint ? generateSeededMisprintData(card.cardId) : undefined}
                        className={styles.cardCellImg}
                      />
                      {isSelected && <span className={styles.cardCellSlot}>{slotIndex + 1}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}

        {/* Card Detail Popup */}
        {popupCardId && (() => {
          const cardData = allCards.find((c) => c.id === popupCardId);
          const setEntry = displayDetail?.cards.find((c) => c.cardId === popupCardId);
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
              initialGhost={setEntry?.isGhost}
              initialMisprint={setEntry?.isMisprint}
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
