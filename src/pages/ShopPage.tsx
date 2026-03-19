/**
 * ShopPage — page shell that routes between storefront and detail view.
 * Logic extracted into useShop hook, views into ShopDetailView + ShopStorefrontView.
 */

import { useTranslation } from 'react-i18next';
import { useShop } from './shop/useShop';
import { ShopDetailView } from './shop/ShopDetailView';
import { ShopStorefrontView } from './shop/ShopStorefrontView';
import styles from './ShopPage.module.css';

export function ShopPage() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const shop = useShop();

  if (shop.shopLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (shop.view === 'detail') {
    if (shop.detailLoading || !shop.setDetail) {
      return (
        <div className={styles.page}>
          {shop.error ? (
            <>
              <button className={styles.backBtn} onClick={shop.goBack}>
                <span className={styles.backArrow}>&#8592;</span>
                Back
              </button>
              <div className={styles.error}>{shop.error}</div>
            </>
          ) : (
            <div className={styles.loading}>Loading...</div>
          )}
        </div>
      );
    }
    return (
      <ShopDetailView
        setDetail={shop.setDetail}
        sortedDetailCards={shop.sortedDetailCards}
        ownedCount={shop.ownedCount}
        dp={shop.dp}
        buying={shop.buying}
        error={shop.error}
        buyResult={shop.buyResult}
        popupCardId={shop.popupCardId}
        detailLoading={shop.detailLoading}
        user={shop.user}
        isEn={isEn}
        productMode={shop.productMode}
        onBack={shop.goBack}
        onBuyPack={shop.handleBuyPack}
        onBuyDisplay={shop.handleBuyDisplay}
        onBuyStarter={shop.handleBuyStarter}
        onSetBuyResult={shop.setBuyResult}
        onSetPopupCardId={shop.setPopupCardId}
      />
    );
  }

  return (
    <ShopStorefrontView
      boosters={shop.shopData?.boosters ?? []}
      starters={shop.shopData?.starters ?? []}
      featuredItems={shop.featuredItems}
      dp={shop.dp}
      user={shop.user}
      isEn={isEn}
      error={shop.error}
      buying={shop.buying}
      buyResult={shop.buyResult}
      shopLoading={shop.shopLoading}
      onOpenDetail={shop.openDetail}
      onSetBuyResult={shop.setBuyResult}
    />
  );
}
