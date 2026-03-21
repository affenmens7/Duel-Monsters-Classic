/**
 * Misprint utility — converts stored JSONB misprint data to CSS custom properties.
 * Used by CardEffects component to apply unique distortions per misprint card.
 */

export interface MisprintData {
  defects: string[];
  baseHue?: number;
  baseSat?: number;
  baseBrt?: number;
  shiftX?: number;
  shiftY?: number;
  shiftOpacity?: number;
  shiftHue?: number;
  ghostOpacity?: number;
  ghostTranslateX?: number;
  ghostTranslateY?: number;
  ghostScale?: number;
  ghostSkew?: number;
  ghostRotate?: number;
  ghostBlur?: number;
  ghostBrt?: number;
  ghostCon?: number;
  linesAngle?: number;
  linesAngle2?: number;
  linesSpacing?: number;
  linesSpacing2?: number;
  linesWidth?: number;
  linesGlittery?: boolean;
  linesColorR?: number;
  linesColorG?: number;
  linesColorB?: number;
  linesAlpha?: number;
  linesAlpha2?: number;
  linesOpacity?: number;
  glitch1Y?: number;
  glitch1H?: number;
  glitch1Bg?: string;
  glitch1Opacity?: number;
  glitch1Skew?: number;
  glitch1Blend?: string;
  glitch2Y?: number;
  glitch2H?: number;
  glitch2Opacity?: number;
  glitch2Skew?: number;
  inkColor?: string;
  inkW?: number;
  inkH?: number;
  inkX?: number;
  inkY?: number;
  inkRot?: number;
  scratchY?: number;
  scratchRot?: number;
  scratchH?: number;
}

/** Converts stored misprint JSON to CSS custom property style object. */
export function misprintDataToCssVars(data: MisprintData): Record<string, string> {
  const vars: Record<string, string> = {};

  // Base filter
  if (data.baseHue != null || data.baseSat != null || data.baseBrt != null) {
    vars['--mp-base-filter'] =
      `hue-rotate(${data.baseHue ?? 0}deg) saturate(${data.baseSat ?? 1}) brightness(${data.baseBrt ?? 1})`;
  }

  // Heavy shift
  if (data.defects.includes('heavy-shift')) {
    vars['--mp-shift-x'] = `${data.shiftX ?? 0}px`;
    vars['--mp-shift-y'] = `${data.shiftY ?? 0}px`;
    vars['--mp-shift-opacity'] = `${data.shiftOpacity ?? 0.3}`;
    vars['--mp-shift-hue'] = `${data.shiftHue ?? 0}deg`;
  } else {
    vars['--mp-shift-opacity'] = '0';
  }

  // Ghost double
  if (data.defects.includes('ghost-double')) {
    vars['--mp-ghost-opacity'] = `${data.ghostOpacity ?? 0.2}`;
    vars['--mp-ghost-transform'] =
      `translate(${data.ghostTranslateX ?? 0}px, ${data.ghostTranslateY ?? 0}px) scale(${data.ghostScale ?? 1}) skew(${data.ghostSkew ?? 0}deg) rotate(${data.ghostRotate ?? 0}deg)`;
    vars['--mp-ghost-filter'] =
      `blur(${data.ghostBlur ?? 1}px) brightness(${data.ghostBrt ?? 1.2}) contrast(${data.ghostCon ?? 0.7})`;
  }

  // Ink bleed
  if (data.defects.includes('ink-bleed') && data.inkColor) {
    vars['--mp-ink-color'] = data.inkColor;
    vars['--mp-ink-w'] = `${data.inkW ?? 60}px`;
    vars['--mp-ink-h'] = `${data.inkH ?? 80}px`;
    vars['--mp-ink-x'] = `${data.inkX ?? 15}%`;
    vars['--mp-ink-y'] = `${data.inkY ?? 40}%`;
    vars['--mp-ink-rot'] = `${data.inkRot ?? 0}deg`;
  } else {
    vars['--mp-ink-color'] = 'transparent';
  }

  // Scratch
  if (data.defects.includes('scratch') && data.scratchH) {
    vars['--mp-scratch-y'] = `${data.scratchY ?? 20}%`;
    vars['--mp-scratch-rot'] = `${data.scratchRot ?? 0}deg`;
    vars['--mp-scratch-h'] = `${data.scratchH}px`;
  } else {
    vars['--mp-scratch-h'] = '0px';
  }

  // Glitch bands
  if (data.defects.includes('glitch-band')) {
    vars['--mp-glitch1-y'] = `${data.glitch1Y ?? 0}%`;
    vars['--mp-glitch1-h'] = `${data.glitch1H ?? 0}%`;
    vars['--mp-glitch1-bg'] = data.glitch1Bg ?? 'transparent';
    vars['--mp-glitch1-opacity'] = `${data.glitch1Opacity ?? 0}`;
    vars['--mp-glitch1-skew'] = `${data.glitch1Skew ?? 0}deg`;
    vars['--mp-glitch1-blend'] = data.glitch1Blend ?? 'screen';
    vars['--mp-glitch2-y'] = `${data.glitch2Y ?? 0}%`;
    vars['--mp-glitch2-h'] = `${data.glitch2H ?? 0}%`;
    vars['--mp-glitch2-opacity'] = `${data.glitch2Opacity ?? 0}`;
    vars['--mp-glitch2-skew'] = `${data.glitch2Skew ?? 0}deg`;
  }

  // Print lines
  if (data.defects.includes('print-lines') || data.defects.includes('print-lines-cross')) {
    const angle = data.linesAngle ?? 0;
    const spacing = data.linesSpacing ?? 15;
    const width = data.linesWidth ?? 1;
    const glittery = data.linesGlittery ?? false;
    const color = glittery
      ? `rgba(${data.linesColorR ?? 220},${data.linesColorG ?? 220},${data.linesColorB ?? 230},${data.linesAlpha ?? 0.15})`
      : `rgba(255,255,255,${data.linesAlpha ?? 0.1})`;

    let bg = `repeating-linear-gradient(${angle}deg, transparent, transparent ${spacing}px, ${color} ${spacing}px, ${color} calc(${spacing}px + ${width}px))`;

    if (data.defects.includes('print-lines-cross') && data.linesAngle2 != null) {
      const spacing2 = data.linesSpacing2 ?? 20;
      const color2 = `rgba(${data.linesColorR ?? 220},${data.linesColorG ?? 220},255,${data.linesAlpha2 ?? 0.12})`;
      bg += `, repeating-linear-gradient(${data.linesAngle2}deg, transparent, transparent ${spacing2}px, ${color2} ${spacing2}px, ${color2} calc(${spacing2}px + 1px))`;
    }

    vars['--mp-lines-bg'] = bg;
    vars['--mp-lines-opacity'] = `${data.linesOpacity ?? 0.7}`;
    vars['--mp-lines-blend'] = glittery ? 'color-dodge' : 'screen';
  }

  return vars;
}

/** Simple seeded PRNG for deterministic misprint based on cardId. */
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/** Generate deterministic misprint data based on cardId (always same look for same card). */
export function generateSeededMisprintData(cardId: number): MisprintData {
  const rng = seededRng(cardId);
  const r = (min: number, max: number) => rng() * (max - min) + min;
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  const extras = ['print-lines', 'print-lines-cross', 'glitch-band', 'ink-bleed', 'scratch'];
  const shuffled = extras.sort(() => rng() - 0.5);
  const defects = ['heavy-shift', 'ghost-double', ...shuffled.slice(0, Math.floor(r(1, 4)))];

  return {
    defects,
    baseHue: r(-8, 8), baseSat: r(0.85, 1.15), baseBrt: r(0.92, 1.08),
    shiftX: r(-15, 15), shiftY: r(-12, 12), shiftOpacity: r(0.25, 0.55), shiftHue: r(-15, 15),
    ghostOpacity: r(0.15, 0.4), ghostTranslateX: r(-18, 18), ghostTranslateY: r(-14, 14),
    ghostScale: r(1.03, 1.12), ghostSkew: r(-8, 8), ghostRotate: r(-5, 5),
    ghostBlur: r(0.5, 3), ghostBrt: r(1.0, 1.4), ghostCon: r(0.5, 0.9),
    linesAngle: pick([0, 90, 45, -45, 30]), linesSpacing: r(6, 25), linesWidth: r(0.5, 3),
    linesGlittery: rng() < 0.5, linesColorR: r(180, 255), linesColorG: r(180, 255),
    linesColorB: r(200, 255), linesAlpha: r(0.06, 0.2), linesOpacity: r(0.6, 1),
    glitch1Y: r(8, 80), glitch1H: r(3, 12),
    glitch1Bg: pick(['rgba(255,255,255,0.2)', 'rgba(200,200,255,0.25)']),
    glitch1Opacity: r(0.5, 1), glitch1Skew: r(-20, 20),
    glitch2Y: r(15, 85), glitch2H: r(1, 8), glitch2Opacity: r(0.4, 0.9), glitch2Skew: r(-12, 12),
    inkColor: pick(['rgba(200,200,255,0.3)', 'rgba(180,220,255,0.25)']),
    inkW: r(50, 120), inkH: r(50, 140), inkX: r(5, 65), inkY: r(10, 70), inkRot: r(-45, 45),
    scratchY: r(10, 80), scratchRot: r(-12, 12), scratchH: pick([1, 2, 3]),
  };
}

/** Generate random misprint data for preview (client-side only, not stored). */
export function generatePreviewMisprintData(): MisprintData {
  const r = (min: number, max: number) => Math.random() * (max - min) + min;
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const extras = ['print-lines', 'print-lines-cross', 'glitch-band', 'ink-bleed', 'scratch'];
  const shuffled = extras.sort(() => Math.random() - 0.5);
  const defects = ['heavy-shift', 'ghost-double', ...shuffled.slice(0, Math.floor(r(1, 4)))];

  return {
    defects,
    baseHue: r(-8, 8), baseSat: r(0.85, 1.15), baseBrt: r(0.92, 1.08),
    shiftX: r(-15, 15), shiftY: r(-12, 12), shiftOpacity: r(0.25, 0.55), shiftHue: r(-15, 15),
    ghostOpacity: r(0.15, 0.4), ghostTranslateX: r(-18, 18), ghostTranslateY: r(-14, 14),
    ghostScale: r(1.03, 1.12), ghostSkew: r(-8, 8), ghostRotate: r(-5, 5),
    ghostBlur: r(0.5, 3), ghostBrt: r(1.0, 1.4), ghostCon: r(0.5, 0.9),
    linesAngle: pick([0, 90, 45, -45, 30]), linesSpacing: r(6, 25), linesWidth: r(0.5, 3),
    linesGlittery: Math.random() < 0.5, linesColorR: r(180, 255), linesColorG: r(180, 255),
    linesColorB: r(200, 255), linesAlpha: r(0.06, 0.2), linesOpacity: r(0.6, 1),
    glitch1Y: r(8, 80), glitch1H: r(3, 12),
    glitch1Bg: pick(['rgba(255,255,255,0.2)', 'rgba(200,200,255,0.25)']),
    glitch1Opacity: r(0.5, 1), glitch1Skew: r(-20, 20),
    glitch2Y: r(15, 85), glitch2H: r(1, 8), glitch2Opacity: r(0.4, 0.9), glitch2Skew: r(-12, 12),
    inkColor: pick(['rgba(200,200,255,0.3)', 'rgba(180,220,255,0.25)']),
    inkW: r(50, 120), inkH: r(50, 140), inkX: r(5, 65), inkY: r(10, 70), inkRot: r(-45, 45),
    scratchY: r(10, 80), scratchRot: r(-12, 12), scratchH: pick([1, 2, 3]),
  };
}
