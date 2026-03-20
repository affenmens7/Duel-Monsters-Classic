/**
 * useShop — encapsulates shop state, navigation, and purchase handlers.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useSession } from '../../store/SessionContext';
import { useAppData } from '../../store/AppDataContext';
import {
  fetchSetDetail,
  fetchDisplayDetail,
  fetchShopFeatured,
  buyPack,
  buyStarter,
  buyDisplay,
  type ShopFeaturedItem,
  type SetDetail,
  type DisplayDetail,
  type BuyResult,
} from '../../services/shopApi';

type ViewMode = 'storefront' | 'detail' | 'display-detail';

export function useShop() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setName: urlSetName, displayId: urlDisplayId } = useParams<{ setName?: string; displayId?: string }>();

  const { user, token } = useAuth();
  const { dp, updateDp, addCardsToInventory } = useSession();
  const { shopProducts: cachedShopData } = useAppData();

  const initialView: ViewMode = urlDisplayId ? 'display-detail' : urlSetName ? 'detail' : 'storefront';
  const [view, setView] = useState<ViewMode>(initialView);
  const [selectedSetName, setSelectedSetName] = useState<string | null>(urlSetName ?? null);
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | null>(urlDisplayId ? parseInt(urlDisplayId, 10) : null);
  const [setDetail, setSetDetail] = useState<SetDetail | null>(null);
  const [displayDetail, setDisplayDetail] = useState<DisplayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(!!urlSetName || !!urlDisplayId);
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
  const openDetail = useCallback((setName: string, _mode: 'booster' | 'display' = 'booster') => {
    if (!token) { setError(t('shop.loginRequired')); return; }
    navigate(`/app/shop/booster/${encodeURIComponent(setName)}`);
  }, [token, t, navigate]);

  // Navigate to display detail
  const openDisplayDetail = useCallback((id: number) => {
    if (!token) { setError(t('shop.loginRequired')); return; }
    navigate(`/app/shop/display/${id}`);
  }, [token, t, navigate]);

  // Single source of truth: fetch set detail when URL param is present
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

  // Single source of truth: fetch display detail when URL param is present
  useEffect(() => {
    if (!urlDisplayId) return;
    if (!token) { setError(t('shop.loginRequired')); return; }
    const displayIdNum = parseInt(urlDisplayId, 10);
    if (isNaN(displayIdNum)) return;
    let cancelled = false;
    setDetailLoading(true);
    setError('');
    setView('display-detail');
    setSelectedDisplayId(displayIdNum);
    fetchDisplayDetail(displayIdNum, token)
      .then((detail) => { if (!cancelled) setDisplayDetail(detail); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : t('shop.loadError')); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [urlDisplayId, token, t]);

  const goBack = useCallback(() => {
    setView('storefront');
    setSetDetail(null);
    setDisplayDetail(null);
    setSelectedSetName(null);
    setSelectedDisplayId(null);
    setPopupCardId(null);
    setError('');
    navigate('/app/shop', { replace: true });
  }, [navigate]);

  // Unified purchase handler
  async function handlePurchase(purchaseFn: () => Promise<BuyResult>, refreshDisplay = false) {
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
      if (refreshDisplay && selectedDisplayId) {
        const updatedDisplay = await fetchDisplayDetail(selectedDisplayId, token);
        setDisplayDetail(updatedDisplay);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shop.purchaseFailed'));
    } finally {
      setBuying(false);
    }
  }

  const handleBuyPack = useCallback((quantity: number = 1) =>
    handlePurchase(() => buyPack(selectedSetName!, token!, quantity)),
    [token, user, selectedSetName, buying]);

  const handleBuyStarter = useCallback((setName: string) =>
    handlePurchase(() => buyStarter(setName, token!)),
    [token, user, buying]);

  const handleBuyDisplay = useCallback(() =>
    handlePurchase(() => buyDisplay(selectedDisplayId!, token!), true),
    [token, user, selectedDisplayId, buying]);

  const ownedCount = useMemo(() => {
    if (!setDetail) return 0;
    return setDetail.cards.filter((c) => c.owned > 0).length;
  }, [setDetail]);

  const displayOwnedCount = useMemo(() => {
    if (!displayDetail) return 0;
    return displayDetail.cards.filter((c) => c.owned > 0).length;
  }, [displayDetail]);

  return {
    // State
    view, shopData, shopLoading, featuredItems,
    setDetail, displayDetail, detailLoading,
    buying, error, buyResult, setBuyResult,
    popupCardId, setPopupCardId,
    dp, user, selectedSetName, selectedDisplayId,
    ownedCount, displayOwnedCount,
    // Actions
    openDetail, openDisplayDetail, goBack,
    handleBuyPack, handleBuyStarter, handleBuyDisplay,
  };
}
