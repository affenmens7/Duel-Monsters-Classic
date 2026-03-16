import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Modal } from '../components/common/Modal';
import { SHOP_PRODUCTS, type ProductType, type ShopProduct } from '../config/shop';
import { buyProduct } from '../services/shopApi';
import { getCardImageUrl } from '../services/cardApi';
import styles from './ShopPage.module.css';

type ShopTab = ProductType;

const TABS: { type: ShopTab; labelKey: string }[] = [
  { type: 'starter-deck', labelKey: 'shop.starterDecks' },
  { type: 'booster', labelKey: 'shop.boosters' },
  { type: 'display', labelKey: 'shop.displays' },
  { type: 'cosmetic', labelKey: 'shop.cosmetics' },
];

export function ShopPage() {
  const { t } = useTranslation();
  const { user, login, token } = useAuth();
  const [activeTab, setActiveTab] = useState<ShopTab>('starter-deck');
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ cards: number[]; type: string } | null>(null);

  const products = SHOP_PRODUCTS.filter((p) => p.type === activeTab);

  async function handleBuy(product: ShopProduct) {
    if (!user || !token) {
      setError('Bitte zuerst anmelden');
      return;
    }

    if (buying) return;
    setError('');
    setBuying(product.id);

    try {
      const res = await buyProduct(product.id);

      // Update DP in auth context
      login(token, { ...user, dp: res.dpRemaining });

      if (res.cards && res.cards.length > 0) {
        setResult({ cards: res.cards, type: res.type });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kauf fehlgeschlagen');
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('shop.title')}</h1>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.type}
            className={`${styles.tab} ${activeTab === tab.type ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.type)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {products.map((product) => (
          <ScrollReveal key={product.id}>
            <div className={`${styles.card} ${!product.available ? styles.cardLocked : ''}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardType}>{t(`shop.${product.type === 'starter-deck' ? 'starterDecks' : product.type === 'booster' ? 'boosters' : product.type === 'display' ? 'displays' : 'cosmetics'}`)}</span>
                {product.cardCount && (
                  <span className={styles.cardCount}>{t('shop.cards', { count: product.cardCount })}</span>
                )}
              </div>
              <h3 className={styles.cardName}>{t(product.nameKey)}</h3>
              <p className={styles.cardDesc}>{t(product.descKey)}</p>
              <div className={styles.cardFooter}>
                <span className={styles.price}>{product.price} DP</span>
                {product.available ? (
                  <button
                    className={styles.buyBtn}
                    onClick={() => handleBuy(product)}
                    disabled={buying === product.id || !user || (user?.dp ?? 0) < product.price}
                  >
                    {buying === product.id ? '...' : (user?.dp ?? 0) < product.price ? t('shop.notEnoughDp') : t('shop.buy')}
                  </button>
                ) : (
                  <span className={styles.unavailable}>{t('shop.notAvailable')}</span>
                )}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Pack Opening Result Modal */}
      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        title={t('shop.packOpening')}
      >
        {result && (
          <div className={styles.packResult}>
            <p className={styles.packResultText}>{t('shop.cardsReceived')}</p>
            <div className={styles.packCards}>
              {result.cards.map((cardId, i) => (
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
