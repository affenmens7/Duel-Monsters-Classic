/**
 * CardEffects — wraps a card image with CSS visual effects based on rarity and bonuses.
 *
 * Effects:
 * - none (Common/Rare): plain image
 * - holo (Super/Ultra Rare): shimmer sweep + emboss + tint
 * - rainbow (Secret Rare): animated rainbow border + shimmer
 * - ghost: silver border + bleached pulse + rainbow shimmer (replaces base effect)
 * - misprint: structural distortions via CSS custom properties (combinable with any)
 */

import { type CSSProperties } from 'react';
import { getEffectTier } from '../../utils/rarity';
import { misprintDataToCssVars, type MisprintData } from '../../utils/misprint';
import styles from './CardEffects.module.css';

interface CardEffectsProps {
  imageSrc: string;
  alt?: string;
  rarity?: string;
  isGhost?: boolean;
  isMisprint?: boolean;
  misprintData?: MisprintData | null;
  className?: string;
}

export function CardEffects({
  imageSrc,
  alt = '',
  rarity,
  isGhost = false,
  isMisprint = false,
  misprintData,
  className,
}: CardEffectsProps) {
  const effectTier = isGhost ? 'none' : getEffectTier(rarity);
  const hasBorder = isGhost || effectTier === 'rainbow';
  const misprintVars = isMisprint && misprintData
    ? misprintDataToCssVars(misprintData) as unknown as CSSProperties
    : undefined;

  // Ghost replaces the base rarity effect entirely
  if (isGhost) {
    return (
      <div
        className={`${styles.ghostBorder} ${isMisprint ? '' : ''} ${className ?? ''}`}
        style={misprintVars}
      >
        <div className={styles.container}>
          {isMisprint && <MisprintLayers imageSrc={imageSrc} />}
          <img
            src={imageSrc}
            alt={alt}
            className={`${styles.ghostPulse} ${isMisprint ? '' : ''}`}
            style={isMisprint && misprintVars ? { filter: (misprintVars as Record<string, string>)['--mp-base-filter'] } : undefined}
          />
          <div className={styles.overlay}>
            <div className={styles.ghostShimmer} />
          </div>
        </div>
      </div>
    );
  }

  // Rainbow (Secret Rare)
  if (effectTier === 'rainbow') {
    return (
      <div
        className={`${styles.rainbowBorder} ${className ?? ''}`}
        style={misprintVars}
      >
        <div className={styles.container}>
          {isMisprint && <MisprintLayers imageSrc={imageSrc} />}
          <img
            src={imageSrc}
            alt={alt}
            style={isMisprint && misprintVars ? { filter: (misprintVars as Record<string, string>)['--mp-base-filter'] } : undefined}
          />
          <div className={styles.overlay}>
            <div className={styles.rainbowShimmer} />
          </div>
        </div>
      </div>
    );
  }

  // Holo (Super/Ultra Rare)
  if (effectTier === 'holo') {
    return (
      <div
        className={`${styles.container} ${className ?? ''}`}
        style={misprintVars}
      >
        {isMisprint && <MisprintLayers imageSrc={imageSrc} />}
        <img
          src={imageSrc}
          alt={alt}
          style={isMisprint && misprintVars ? { filter: (misprintVars as Record<string, string>)['--mp-base-filter'] } : undefined}
        />
        <div className={styles.overlay}>
          <div className={styles.holoSweep} />
          <div className={styles.holoEmboss} />
          <div className={styles.holoTint} />
        </div>
      </div>
    );
  }

  // None (Common/Rare) — still can have misprint
  return (
    <div
      className={`${styles.container} ${className ?? ''}`}
      style={misprintVars}
    >
      {isMisprint && <MisprintLayers imageSrc={imageSrc} />}
      <img
        src={imageSrc}
        alt={alt}
        style={isMisprint && misprintVars ? { filter: (misprintVars as Record<string, string>)['--mp-base-filter'] } : undefined}
      />
    </div>
  );
}

/** Misprint overlay layers — rendered behind the main image effects */
function MisprintLayers({ imageSrc }: { imageSrc: string }) {
  return (
    <>
      <div className={styles.misprintShift}>
        <img src={imageSrc} alt="" />
      </div>
      <div className={styles.misprintInk} />
      <div className={styles.misprintScratch} />
      <div className={styles.misprintGhost}>
        <img src={imageSrc} alt="" />
      </div>
      <div className={styles.misprintFx}>
        <div className={styles.misprintGlitch} />
        <div className={styles.misprintGlitch2} />
        <div className={styles.misprintLines} />
      </div>
    </>
  );
}
