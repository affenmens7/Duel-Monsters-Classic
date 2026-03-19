/**
 * ProductCard — card for horizontal scroll rows in the shop storefront.
 */

import { useTranslation } from 'react-i18next';
import { localizeBilingual } from '../../utils/localize';
import type { ShopSetProduct } from '../../services/shopApi';
import styles from '../ShopPage.module.css';

interface ProductCardProps {
  product: ShopSetProduct;
  isEn: boolean;
  onClick: () => void;
}

function formatInactiveLabel(
  product: ShopSetProduct,
  isEn: boolean,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  if (product.gameReleaseDate) {
    return t('shop.availableFrom', {
      date: new Date(product.gameReleaseDate).toLocaleDateString(isEn ? 'en-US' : 'de-DE'),
    });
  }
  return t('shop.notAvailable');
}

export function ProductCard({ product, isEn, onClick }: ProductCardProps) {
  const { t } = useTranslation();
  const desc = localizeBilingual(product.descDe, product.descEn, isEn);

  return (
    <div
      className={`${styles.productCard} ${!product.active ? styles.productCardLocked : ''}`}
      onClick={onClick}
    >
      <div className={styles.productImagePlaceholder}>
        {product.code ?? product.setName}
      </div>
      <div className={styles.productBody}>
        <span className={styles.productWave}>{t('shop.wave', { wave: product.wave })}</span>
        <span className={styles.productName}>{product.setName}</span>
        <span className={styles.productDesc}>{desc}</span>
      </div>
      <div className={styles.productFooter}>
        <span className={styles.productPrice}>{product.pricePack} DP</span>
        {product.active ? (
          <span className={styles.productCards}>{t('shop.cards', { count: product.cardCount })}</span>
        ) : (
          <span className={styles.lockedBadge}>{formatInactiveLabel(product, isEn, t)}</span>
        )}
      </div>
    </div>
  );
}
