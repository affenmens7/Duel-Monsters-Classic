/**
 * Shared misprint data generator — single source of truth for frontend + backend.
 * Generates random distortion parameters that CardEffects renders via CSS custom properties.
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

type RngFn = () => number;

/**
 * Core generator — takes an RNG function so callers can provide Math.random() or a seeded PRNG.
 * Always includes heavy-shift + ghost-double, plus 1-3 random extras.
 */
function generateMisprintDataWith(rng: RngFn): MisprintData {
  const r = (min: number, max: number) => rng() * (max - min) + min;
  const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  const extras = ['print-lines', 'print-lines-cross', 'glitch-band', 'ink-bleed', 'scratch'];
  const shuffled = extras.sort(() => rng() - 0.5);
  const defects = ['heavy-shift', 'ghost-double', ...shuffled.slice(0, Math.floor(r(1, 4)))];

  const data: MisprintData = {
    defects,
    // Base filter (minimal color distortion)
    baseHue: r(-8, 8),
    baseSat: r(0.85, 1.15),
    baseBrt: r(0.92, 1.08),
    // Heavy shift
    shiftX: r(-15, 15),
    shiftY: r(-12, 12),
    shiftOpacity: r(0.25, 0.55),
    shiftHue: r(-15, 15),
    // Ghost double
    ghostOpacity: r(0.15, 0.4),
    ghostTranslateX: r(-18, 18),
    ghostTranslateY: r(-14, 14),
    ghostScale: r(1.03, 1.12),
    ghostSkew: r(-8, 8),
    ghostRotate: r(-5, 5),
    ghostBlur: r(0.5, 3),
    ghostBrt: r(1.0, 1.4),
    ghostCon: r(0.5, 0.9),
  };

  for (const defect of defects) {
    switch (defect) {
      case 'print-lines': {
        data.linesAngle = pick([0, 90, 45, -45, 30, -30]);
        data.linesSpacing = r(6, 25);
        data.linesWidth = r(0.5, 3);
        data.linesGlittery = rng() < 0.5;
        data.linesColorR = r(180, 255);
        data.linesColorG = r(180, 255);
        data.linesColorB = r(200, 255);
        data.linesAlpha = r(0.06, 0.2);
        data.linesOpacity = r(0.6, 1);
        break;
      }
      case 'print-lines-cross': {
        data.linesAngle = pick([0, 45, -45, 30]);
        data.linesAngle2 = data.linesAngle! + pick([60, 90, 45]);
        data.linesSpacing = r(8, 20);
        data.linesSpacing2 = r(10, 30);
        data.linesAlpha = r(0.06, 0.15);
        data.linesAlpha2 = r(0.08, 0.2);
        data.linesOpacity = r(0.5, 1);
        data.linesGlittery = true;
        break;
      }
      case 'glitch-band': {
        data.glitch1Y = r(8, 80);
        data.glitch1H = r(3, 12);
        data.glitch1Bg = pick(['rgba(255,255,255,0.2)', 'rgba(200,200,255,0.25)', 'rgba(255,200,255,0.2)']);
        data.glitch1Opacity = r(0.5, 1);
        data.glitch1Skew = r(-20, 20);
        data.glitch1Blend = pick(['screen', 'overlay', 'color-dodge']);
        data.glitch2Y = r(15, 85);
        data.glitch2H = r(1, 8);
        data.glitch2Opacity = r(0.4, 0.9);
        data.glitch2Skew = r(-12, 12);
        break;
      }
      case 'ink-bleed': {
        data.inkColor = pick(['rgba(200,200,255,0.3)', 'rgba(180,220,255,0.25)', 'rgba(255,220,255,0.25)']);
        data.inkW = r(50, 120);
        data.inkH = r(50, 140);
        data.inkX = r(5, 65);
        data.inkY = r(10, 70);
        data.inkRot = r(-45, 45);
        break;
      }
      case 'scratch': {
        data.scratchY = r(10, 80);
        data.scratchRot = r(-12, 12);
        data.scratchH = pick([1, 2, 3, 4]);
        break;
      }
    }
  }

  return data;
}

/** Generate random misprint data using Math.random(). */
export function generateMisprintData(): MisprintData {
  return generateMisprintDataWith(Math.random);
}

/** Simple seeded PRNG for deterministic misprint based on cardId. */
function seededRng(seed: number): RngFn {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/** Generate deterministic misprint data based on cardId (always same look for same card). */
export function generateSeededMisprintData(cardId: number): MisprintData {
  return generateMisprintDataWith(seededRng(cardId));
}
