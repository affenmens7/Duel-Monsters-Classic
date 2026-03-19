/**
 * FeaturedCarousel — rotating hero carousel for the shop storefront.
 * Displays admin-managed featured items with auto-advance, arrows, dots.
 * Pauses on hover. Based on shop-featured-6-carousel-refined demo.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeBilingual } from '../../utils/localize';
import type { ShopFeaturedItem } from '../../services/shopApi';
import styles from './FeaturedCarousel.module.css';

interface FeaturedCarouselProps {
  items: ShopFeaturedItem[];
  isEn: boolean;
  onItemClick: (productId: string) => void;
}

const AUTO_INTERVAL = 6000;

export function FeaturedCarousel({ items, isEn, onItemClick }: FeaturedCarouselProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = items.length;

  const goTo = useCallback((index: number) => {
    setCurrent(((index % total) + total) % total);
  }, [total]);

  // Auto-advance
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, AUTO_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, total]);

  // Progress bar animation
  useEffect(() => {
    const el = progressRef.current;
    if (!el || total <= 1) return;
    // Reset
    el.style.transition = 'none';
    el.style.width = '0%';
    // Force reflow then animate
    void el.offsetWidth;
    if (!paused) {
      el.style.transition = `width ${AUTO_INTERVAL / 1000}s linear`;
      el.style.width = '100%';
    }
  }, [current, paused, total]);

  function handlePrev() {
    goTo(current - 1);
    resetTimer();
  }

  function handleNext() {
    goTo(current + 1);
    resetTimer();
  }

  function handleDot(index: number) {
    goTo(index);
    resetTimer();
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!paused && total > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((prev) => (prev + 1) % total);
      }, AUTO_INTERVAL);
    }
  }

  if (total === 0) return null;

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={styles.track}
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {items.map((item) => {
          const title = localizeBilingual(item.title_de, item.title_en, isEn);
          const subtitle = localizeBilingual(item.subtitle_de, item.subtitle_en, isEn);
          const imageUrl = item.image_path;

          return (
            <div
              key={item.id}
              className={styles.slide}
              onClick={() => onItemClick(item.product_id)}
            >
              <div className={`${styles.visual} ${styles.visualDefault}`}>
                {imageUrl ? (
                  <img
                    className={styles.setImage}
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Replace with code fallback
                      const fallback = document.createElement('div');
                      fallback.className = styles.codeFallback;
                      fallback.innerHTML = `<span class="${styles.codeText}">${item.set_code ?? ''}</span>`;
                      target.replaceWith(fallback);
                    }}
                  />
                ) : (
                  <div className={styles.codeFallback}>
                    <span className={styles.codeText}>{item.set_code ?? ''}</span>
                  </div>
                )}
              </div>
              <div className={styles.body}>
                <span className={styles.badge}>{item.product_type}</span>
                <h3 className={styles.slideTitle}>{title}</h3>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                <div className={styles.footer}>
                  <button
                    className={styles.cta}
                    onClick={(e) => { e.stopPropagation(); onItemClick(item.product_id); }}
                  >
                    {t('shop.viewSet')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrows */}
      {total > 1 && (
        <>
          <button className={`${styles.arrow} ${styles.arrowPrev}`} onClick={handlePrev}>&#8249;</button>
          <button className={`${styles.arrow} ${styles.arrowNext}`} onClick={handleNext}>&#8250;</button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className={styles.dots}>
          {items.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => handleDot(i)}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {total > 1 && <div className={styles.progress} ref={progressRef} />}
    </div>
  );
}
