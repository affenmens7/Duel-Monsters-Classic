/**
 * ShopPage — page shell that routes between storefront and detail view.
 * Logic extracted into useShop hook, views into ShopDetailView + ShopStorefrontView.
 */

import { useTranslation } from 'react-i18next';
import { useShop } from './shop/useShop';
import { ShopDetailView } from './shop/ShopDetailView';
import { DisplayDetailView } from './shop/DisplayDetailView';
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

  // Display detail view
  if (shop.view === 'display-detail') {
    if (shop.detailLoading || !shop.displayDetail) {
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
      <DisplayDetailView
        displayDetail={shop.displayDetail}
        sortedDetailCards={shop.sortedDisplayCards}
        ownedCount={shop.displayOwnedCount}
        dp={shop.dp}
        buying={shop.buying}
        error={shop.error}
        buyResult={shop.buyResult}
        popupCardId={shop.popupCardId}
        detailLoading={shop.detailLoading}
        user={shop.user}
        isEn={isEn}
        onBack={shop.goBack}
        onBuyDisplay={shop.handleBuyDisplay}
        onSetBuyResult={shop.setBuyResult}
        onSetPopupCardId={shop.setPopupCardId}
      />
    );
  }

  // Set detail view (booster / starter)
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
        onBack={shop.goBack}
        onBuyPack={shop.handleBuyPack}
        onBuyStarter={shop.handleBuyStarter}
        onSetBuyResult={shop.setBuyResult}
        onSetPopupCardId={shop.setPopupCardId}
      />
    );
  }

  // Storefront view
  return (
    <ShopStorefrontView
      boosters={shop.shopData?.boosters ?? []}
      starters={shop.shopData?.starters ?? []}
      displays={shop.shopData?.displays ?? []}
      featuredItems={shop.featuredItems}
      dp={shop.dp}
      user={shop.user}
      isEn={isEn}
      error={shop.error}
      buying={shop.buying}
      buyResult={shop.buyResult}
      shopLoading={shop.shopLoading}
      onOpenDetail={shop.openDetail}
      onOpenDisplayDetail={(displayId) => shop.openDisplayDetail(displayId)}
      onSetBuyResult={shop.setBuyResult}
    />
  );
}
