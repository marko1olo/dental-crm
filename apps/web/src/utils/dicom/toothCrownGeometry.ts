/**
 * toothCrownGeometry.ts
 * 
 * FDI-based 2D crown contour definitions for canvas rendering in CT overlay.
 * Shapes are normalized to a [-1, 1] coordinate space, then scaled at render time.
 */

export type ToothGroup = 'incisor' | 'canine' | 'premolar' | 'molar' | 'wisdom';

/** Returns the morphological group for an FDI tooth number */
export function getToothGroup(fdi: number): ToothGroup {
  const tooth = fdi % 10; // last digit = tooth position in quadrant
  if (tooth === 1 || tooth === 2) return 'incisor';
  if (tooth === 3) return 'canine';
  if (tooth === 4 || tooth === 5) return 'premolar';
  if (tooth === 6 || tooth === 7) return 'molar';
  return 'wisdom';
}

export interface CrownProfile {
  /** Width in mm (buccal-lingual) */
  widthMm: number;
  /** Height in mm (incisal/occlusal to cervical) */
  heightMm: number;
  /** Number of cusps for display */
  cusps: number;
  /** Approximate cervical width fraction (0-1) relative to max width */
  cervicalNarrow: number;
}

/** Reference dimensions per morphological group */
export const CROWN_PROFILES: Record<ToothGroup, CrownProfile> = {
  incisor:  { widthMm: 8,  heightMm: 10, cusps: 0, cervicalNarrow: 0.7 },
  canine:   { widthMm: 8,  heightMm: 11, cusps: 1, cervicalNarrow: 0.65 },
  premolar: { widthMm: 9,  heightMm: 9,  cusps: 2, cervicalNarrow: 0.6 },
  molar:    { widthMm: 12, heightMm: 8,  cusps: 4, cervicalNarrow: 0.55 },
  wisdom:   { widthMm: 10, heightMm: 7,  cusps: 3, cervicalNarrow: 0.5 },
};

/**
 * Draw a schematic tooth crown mockup on canvas context.
 * The crown is drawn centered at (0, 0) in local space,
 * with the cervical margin at y=0 and the occlusal/incisal surface at y=-height.
 * 
 * @param ctx Canvas 2D context (already translated & rotated to implant neck)
 * @param fdi FDI tooth number
 * @param pixelsPerMm Scale factor
 * @param isWarning If true, draw in warning red
 */
export function drawCrownMockup(
  ctx: CanvasRenderingContext2D,
  fdi: number,
  pixelsPerMm: number,
  isWarning: boolean
): void {
  const group = getToothGroup(fdi);
  const profile = CROWN_PROFILES[group];
  
  const w = profile.widthMm * pixelsPerMm;
  const h = profile.heightMm * pixelsPerMm;
  const hw = w / 2;
  const cervW = (profile.widthMm * profile.cervicalNarrow * pixelsPerMm) / 2;

  const strokeColor = isWarning ? '#ef4444' : '#22d3ee';
  const fillColor = isWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 211, 238, 0.15)';
  const labelColor = isWarning ? '#fca5a5' : '#a5f3fc';

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);

  // Main crown body — trapezoid shape (wider at occlusal, narrower at cervical)
  ctx.beginPath();
  ctx.moveTo(-cervW, 0);           // cervical left
  ctx.lineTo(-hw, -h * 0.3);      // shoulder left
  ctx.lineTo(-hw, -h * 0.7);      // buccal wall left
  ctx.lineTo(-hw * 0.6, -h);      // occlusal left
  ctx.lineTo(hw * 0.6, -h);       // occlusal right
  ctx.lineTo(hw, -h * 0.7);       // buccal wall right
  ctx.lineTo(hw, -h * 0.3);       // shoulder right
  ctx.lineTo(cervW, 0);            // cervical right
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cusps
  if (profile.cusps > 0) {
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = isWarning ? 'rgba(239,68,68,0.5)' : 'rgba(34,211,238,0.5)';

    if (profile.cusps === 1) {
      // Single cusp (canine)
      ctx.beginPath();
      ctx.moveTo(-hw * 0.3, -h * 0.9);
      ctx.lineTo(0, -h - 2 * pixelsPerMm);
      ctx.lineTo(hw * 0.3, -h * 0.9);
      ctx.stroke();
    } else if (profile.cusps === 2) {
      // Buccal + lingual (premolar)
      const mid = -h * 0.85;
      drawCusp(ctx, -hw * 0.25, mid, 0, -h - pixelsPerMm);
      drawCusp(ctx, hw * 0.25, mid, 0, -h - pixelsPerMm);
    } else if (profile.cusps >= 4) {
      // 4-cusp molar: 2 buccal + 2 lingual
      drawCusp(ctx, -hw * 0.35, -h * 0.75, -hw * 0.1, -h - pixelsPerMm);
      drawCusp(ctx, hw * 0.35, -h * 0.75, hw * 0.1, -h - pixelsPerMm);
      drawCusp(ctx, -hw * 0.3, -h * 0.9, -hw * 0.05, -h - 1.5 * pixelsPerMm);
      drawCusp(ctx, hw * 0.3, -h * 0.9, hw * 0.05, -h - 1.5 * pixelsPerMm);
      // Central fissure
      ctx.beginPath();
      ctx.moveTo(-hw * 0.1, -h * 0.72);
      ctx.lineTo(hw * 0.1, -h * 0.72);
      ctx.stroke();
    }
  }

  // FDI label
  ctx.setLineDash([]);
  ctx.font = `bold ${Math.round(6 * pixelsPerMm)}px monospace`;
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'center';
  ctx.fillText(`${fdi}`, 0, -h - 3 * pixelsPerMm);

  ctx.textAlign = 'start';
  ctx.setLineDash([]);
}

function drawCusp(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  xtip: number, ytip: number
): void {
  ctx.beginPath();
  ctx.moveTo(x1 - 4, y1);
  ctx.lineTo(xtip, ytip);
  ctx.lineTo(x1 + 4, y1);
  ctx.stroke();
}

/**
 * Returns occlusal angulation warning status.
 * Assumes implant direction vector, occlusal plane = XY plane (Z-axis perpendicular).
 */
export function getAngulationWarning(
  dirZ: number
): { angleDeg: number; isWarning: boolean; message?: string } {
  const angleRad = Math.acos(Math.abs(Math.max(-1, Math.min(1, dirZ))));
  const angleDeg = angleRad * (180 / Math.PI);
  const isWarning = angleDeg > 15;
  if (isWarning) {
    return {
      angleDeg,
      isWarning: true,
      message: `Предупреждение: Избыточный наклон имплантата (${angleDeg.toFixed(1)}°). Риск деструкции кости из-за несимметричной нагрузки на абатмент!`,
    };
  }
  return { angleDeg, isWarning: false };
}
