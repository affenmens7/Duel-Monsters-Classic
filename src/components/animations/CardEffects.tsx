/**
 * CardEffects — wraps a card image with CSS visual effects based on rarity and bonuses.
 *
 * Effects:
 * - none (Common/Rare): plain image
 * - holo (Super/Ultra Rare): shimmer sweep + emboss + tint
 * - rainbow (Secret Rare): animated rainbow border + shimmer
 * - ghost: silver border + bleached pulse + rainbow shimmer (replaces base effect)
 * - misprint: structural distortions via CSS custom properties (combinable with any)
 *
 * Ghost + Misprint can be combined.
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
  const misprintVars = isMisprint && misprintData
    ? misprintDataToCssVars(misprintData) as unknown as CSSProperties
    : undefined;

  // Build the inner card content
  const imgFilter = isMisprint && misprintVars
    ? { filter: (misprintVars as Record<string, string>)['--mp-base-filter'] }
    : undefined;

  const renderContent = () => (
    <>
      <img
        src={imageSrc}
        alt={alt}
        className={isGhost ? styles.ghostPulse : undefined}
        style={imgFilter}
      />
      {/* Rarity effect overlays */}
      {effectTier === 'holo' && (
        <div className={styles.overlay}>
          <div className={styles.holoSweep} />
          <div className={styles.holoEmboss} />
          <div className={styles.holoTint} />
        </div>
      )}
      {effectTier === 'rainbow' && (
        <div className={styles.overlay}>
          <div className={styles.rainbowShimmer} />
        </div>
      )}
      {isGhost && (
        <div className={styles.overlay}>
          <div className={styles.ghostShimmer} />
        </div>
      )}
      {/* Misprint layers ON TOP of everything */}
      {isMisprint && <MisprintLayers imageSrc={imageSrc} />}
    </>
  );

  // Ghost or Rainbow: needs border wrapper
  if (isGhost) {
    return (
      <div className={`${styles.ghostBorder} ${className ?? ''}`} style={misprintVars}>
        <div className={styles.container}>
          {renderContent()}
        </div>
      </div>
    );
  }

  if (effectTier === 'rainbow') {
    return (
      <div className={`${styles.rainbowBorder} ${className ?? ''}`} style={misprintVars}>
        <div className={styles.container}>
          {renderContent()}
        </div>
      </div>
    );
  }

  // Holo or None: no border wrapper needed
  return (
    <div className={`${styles.container} ${className ?? ''}`} style={misprintVars}>
      {renderContent()}
    </div>
  );
}

/** Misprint overlay layers — rendered ON TOP of card image and effects */
function MisprintLayers({ imageSrc }: { imageSrc: string }) {
  return (
    <>
      <div className={styles.misprintShift}>
        <img src={imageSrc} alt="" />
      </div>
      <div className={styles.misprintGhost}>
        <img src={imageSrc} alt="" />
      </div>
      <div className={styles.misprintInk} />
      <div className={styles.misprintScratch} />
      <div className={styles.misprintFx}>
        <div className={styles.misprintGlitch} />
        <div className={styles.misprintGlitch2} />
        <div className={styles.misprintLines} />
      </div>
    </>
  );
}
