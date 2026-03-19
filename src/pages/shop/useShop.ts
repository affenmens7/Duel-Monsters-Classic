/**
 * useShop — encapsulates shop state, navigation, and purchase handlers.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useSession } from '../../store/SessionContext';
import { useAppData } from '../../store/AppDataContext';
import {
  fetchSetDetail,
  fetchShopFeatured,
  buyPack,
  buyDisplay,
  buyStarter,
  type ShopFeaturedItem,
  type SetDetail,
  type BuyResult,
} from '../../services/shopApi';
import { RARITY_ORDER } from '../../utils/rarity';

type ViewMode = 'storefront' | 'detail';

export function useShop() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setName: urlSetName } = useParams<{ setName?: string }>();

  // Derive product mode from URL path
  const productMode: 'booster' | 'display' = location.pathname.includes('/display/') ? 'display' : 'booster';
  const { user, token } = useAuth();
  const { dp, updateDp, addCardsToInventory } = useSession();
  const { shopProducts: cachedShopData } = useAppData();

  const [view, setView] = useState<ViewMode>(urlSetName ? 'detail' : 'storefront');
  const [selectedSetName, setSelectedSetName] = useState<string | null>(urlSetName ?? null);
  const [setDetail, setSetDetail] = useState<SetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(!!urlSetName);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);
  const [popupCardId, setPopupCardId] = useState<number | null>(null);
  const [featuredItems, setFeaturedItems] = useState<ShopFeaturedItem[]>([]);

  const shopData = cachedShopData;
  const shopLoading = !shopData;

  // Load featured items from shop_featured table
  useEffect(() => {
    fetchShopFeatured().then(setFeaturedItems).catch(() => {});
  }, []);

  // Navigate only — the useEffect below handles the actual fetch
  const openDetail = useCallback((setName: string, mode: 'booster' | 'display' = 'booster') => {
    if (!token) { setError(t('shop.loginRequired')); return; }
    navigate(`/app/shop/${mode}/${encodeURIComponent(setName)}`);
  }, [token, t, navigate]);

  // Single source of truth: fetch detail when URL param is present
  useEffect(() => {
    if (!urlSetName) return;
    if (!token) { setError(t('shop.loginRequired')); return; }
    let cancelled = false;
    setDetailLoading(true);
    setError('');
    setView('detail');
    setSelectedSetName(urlSetName);
    fetchSetDetail(urlSetName, token)
      .then((detail) => { if (!cancelled) setSetDetail(detail); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : t('shop.loadError')); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [urlSetName, token, t]);

  const goBack = useCallback(() => {
    setView('storefront');
    setSetDetail(null);
    setSelectedSetName(null);
    setPopupCardId(null);
    setError('');
    navigate('/app/shop', { replace: true });
  }, [navigate]);

  // Unified purchase handler
  async function handlePurchase(purchaseFn: () => Promise<BuyResult>) {
    if (!token || !user || buying) return;
    setBuying(true);
    setError('');
    try {
      const result = await purchaseFn();
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
  }

  const handleBuyPack = useCallback(() =>
    handlePurchase(() => buyPack(selectedSetName!, token!)),
    [token, user, selectedSetName, buying]);

  const handleBuyDisplay = useCallback(() =>
    handlePurchase(() => buyDisplay(selectedSetName!, token!)),
    [token, user, selectedSetName, buying]);

  const handleBuyStarter = useCallback((setName: string) =>
    handlePurchase(() => buyStarter(setName, token!)),
    [token, user, buying]);

  const sortedDetailCards = useMemo(() => {
    if (!setDetail) return [];
    return [...setDetail.cards].sort((a, b) =>
      (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5)
    );
  }, [setDetail]);

  const ownedCount = useMemo(() => {
    if (!setDetail) return 0;
    return setDetail.cards.filter((c) => c.owned > 0).length;
  }, [setDetail]);

  return {
    // State
    view, shopData, shopLoading, featuredItems, setDetail, detailLoading,
    buying, error, buyResult, setBuyResult,
    popupCardId, setPopupCardId,
    dp, user, selectedSetName, productMode,
    sortedDetailCards, ownedCount,
    // Actions
    openDetail, goBack,
    handleBuyPack, handleBuyDisplay, handleBuyStarter,
  };
}
