export const mprAxisBounds = { min: -90, max: 90 } as const;
export const mprSlabBounds = { min: 1, max: 30 } as const;

export const mprAxisNudgeDeg = [-5, -1, 1, 5] as const;
export const mprSlabNudgeMm = [-5, -1, 1, 5] as const;
export const mprSliceNudgeSteps = [-10, -1, 1, 10] as const;
export const mprSlicePresetFractions = [
  { id: "start", label: "начало", fraction: 0 },
  { id: "quarter", label: "25%", fraction: 0.25 },
  { id: "center", label: "центр", fraction: 0.5 },
  { id: "three_quarters", label: "75%", fraction: 0.75 },
  { id: "end", label: "конец", fraction: 1 }
] as const;

export type MprAxisGuidance = {
  tiltLabel: string;
  slabLabel: string;
  sliceLabel: string;
  summary: string;
};

export type MprProjectionCompassLabels = {
  top: string;
  right: string;
  bottom: string;
  left: string;
  summary: string;
};

export type MprKeyboardAdjustment =
  | { kind: "axis"; value: number }
  | { kind: "slab"; value: number }
  | { kind: "slice"; value: number };

export function resolveMprKeyboardAdjustment(input: {
  key: string;
  shiftKey: boolean;
  axisDeg: number;
  slabMm: number;
  sliceIndex: number;
  maxIndex: number;
}): MprKeyboardAdjustment | null {
  const fineStep = input.shiftKey ? 5 : 1;
  const sliceStep = input.shiftKey ? 10 : 1;
  switch (input.key) {
    case "ArrowLeft":
      return { kind: "axis", value: clampMprAxisDeg(input.axisDeg - fineStep) };
    case "ArrowRight":
      return { kind: "axis", value: clampMprAxisDeg(input.axisDeg + fineStep) };
    case "PageDown":
      return { kind: "slab", value: clampMprSlabMm(input.slabMm - fineStep) };
    case "PageUp":
      return { kind: "slab", value: clampMprSlabMm(input.slabMm + fineStep) };
    case "ArrowDown":
      return { kind: "slice", value: clampMprSliceIndex(input.sliceIndex - sliceStep, input.maxIndex) };
    case "ArrowUp":
      return { kind: "slice", value: clampMprSliceIndex(input.sliceIndex + sliceStep, input.maxIndex) };
    case "Home":
      return { kind: "slice", value: 0 };
    case "End":
      return { kind: "slice", value: clampMprSliceIndex(input.maxIndex, input.maxIndex) };
    default:
      return null;
  }
}

export function mprProjectionCompassLabels(projection: string | null | undefined): MprProjectionCompassLabels {
  switch (projection) {
    case "axial":
      return { top: "перед", right: "право", bottom: "назад", left: "лево", summary: "аксиальная карта: перед/назад и право/лево" };
    case "coronal":
      return { top: "верх", right: "право", bottom: "низ", left: "лево", summary: "корональная карта: верх/низ и стороны" };
    case "sagittal":
      return { top: "верх", right: "перед", bottom: "низ", left: "назад", summary: "сагиттальная карта: верх/низ и перед/назад" };
    case "oblique":
      return { top: "верх", right: "+ось", bottom: "низ", left: "-ось", summary: "косая карта: стороны показывают направление угла" };
    case "panoramic_reconstruction":
      return { top: "верх", right: "по дуге", bottom: "низ", left: "от дуги", summary: "панорамная карта: движение вдоль зубной дуги" };
    case "three_d_volume":
      return { top: "верх", right: "поворот", bottom: "низ", left: "поворот", summary: "объемная карта: ориентация зависит от поворота модели" };
    case "mip":
      return { top: "верх", right: "проекция", bottom: "низ", left: "проекция", summary: "карта плотности: показывает самые плотные структуры" };
    default:
      return { top: "верх", right: "право", bottom: "низ", left: "лево", summary: "карта плоскости просмотра" };
  }
}

function clampRounded(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return Math.max(min, Math.min(max, Math.round(fallback)));
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function clampMprAxisDeg(value: number): number {
  return clampRounded(value, mprAxisBounds.min, mprAxisBounds.max, 0);
}

export function clampMprSlabMm(value: number): number {
  return clampRounded(value, mprSlabBounds.min, mprSlabBounds.max, mprSlabBounds.min);
}

export function clampMprSliceIndex(value: number, maxIndex: number): number {
  const safeMaxIndex = Math.max(0, Math.round(Number.isFinite(maxIndex) ? maxIndex : 0));
  return clampRounded(value, 0, safeMaxIndex, 0);
}

export function formatMprAxisAngleBadge(axisDeg: number, canOpenMpr = true): string {
  if (!canOpenMpr) return "ось --";
  const safeAxisDeg = clampMprAxisDeg(axisDeg);
  return safeAxisDeg > 0 ? `+${safeAxisDeg}°` : `${safeAxisDeg}°`;
}

export function formatMprAxisDirectionLabel(input: { canOpenMpr: boolean; axisDeg: number }): string {
  if (!input.canOpenMpr) return "сначала выберите готовую КЛКТ/КТ-серию";
  const safeAxisDeg = clampMprAxisDeg(input.axisDeg);
  if (safeAxisDeg === 0) return "ось без наклона";
  return safeAxisDeg > 0 ? `ось +${safeAxisDeg}° вправо` : `ось ${safeAxisDeg}° влево`;
}

export function formatMprSlabBadge(slabMm: number, canOpenMpr = true): string {
  if (!canOpenMpr) return "слой --";
  return `${clampMprSlabMm(slabMm)} мм`;
}

export function formatMprSliceBadge(input: { canOpenMpr: boolean; sliceIndex: number; maxIndex: number }): string {
  if (!input.canOpenMpr) return "срез --";
  const safeMaxIndex = Math.max(0, Math.round(Number.isFinite(input.maxIndex) ? input.maxIndex : 0));
  return `срез ${clampMprSliceIndex(input.sliceIndex, safeMaxIndex) + 1}/${safeMaxIndex + 1}`;
}

export function formatMprAxisRangeValue(input: { canOpenMpr: boolean; axisDeg: number }): string {
  if (!input.canOpenMpr) return "Ось включится после выбора готовой КЛКТ/КТ-серии.";
  return `${formatMprAxisDirectionLabel(input)}, диапазон ${mprAxisBounds.min}°...+${mprAxisBounds.max}°.`;
}

export function formatMprSlabRangeValue(input: { canOpenMpr: boolean; slabMm: number }): string {
  if (!input.canOpenMpr) return "Толщина слоя включится после выбора готовой КЛКТ/КТ-серии.";
  const safeSlabMm = clampMprSlabMm(input.slabMm);
  return `Толщина слоя ${safeSlabMm} мм, ${formatMprSlabBandLabel(safeSlabMm)}.`;
}

export function formatMprSliceRangeValue(input: { canOpenMpr: boolean; sliceIndex: number; maxIndex: number }): string {
  if (!input.canOpenMpr) return "Положение среза включится после выбора готовой КЛКТ/КТ-серии.";
  const safeMaxIndex = Math.max(0, Math.round(Number.isFinite(input.maxIndex) ? input.maxIndex : 0));
  const safeSliceIndex = clampMprSliceIndex(input.sliceIndex, safeMaxIndex);
  return `${formatMprSliceBadge({ canOpenMpr: true, sliceIndex: safeSliceIndex, maxIndex: safeMaxIndex })}, ${formatMprSliceFractionLabel(
    mprSliceFraction(safeSliceIndex, safeMaxIndex)
  )}.`;
}

export function mprSliceIndexFromFraction(fraction: number, maxIndex: number): number {
  const safeFraction = Number.isFinite(fraction) ? fraction : 0.5;
  return clampMprSliceIndex(Math.round(Math.max(0, Math.min(1, safeFraction)) * Math.max(0, maxIndex)), maxIndex);
}

export function mprSliceFraction(sliceIndex: number, maxIndex: number): number {
  const safeMaxIndex = Math.max(0, Math.round(Number.isFinite(maxIndex) ? maxIndex : 0));
  if (safeMaxIndex === 0) return 0.5;
  const fraction = Math.max(0, Math.min(1, clampMprSliceIndex(sliceIndex, safeMaxIndex) / safeMaxIndex));
  const snapTolerance = 0.5 / safeMaxIndex + Number.EPSILON;
  const nearestPreset = mprSlicePresetFractions.find((preset) => Math.abs(fraction - preset.fraction) <= snapTolerance);
  return nearestPreset?.fraction ?? fraction;
}

export function formatMprSliceFractionLabel(fraction: number): string {
  const safeFraction = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0.5;
  if (safeFraction <= 0.12) return "срез к началу серии";
  if (safeFraction < 0.38) return "срез в первой половине";
  if (safeFraction <= 0.62) return "срез по центру серии";
  if (safeFraction < 0.88) return "срез во второй половине";
  return "срез к концу серии";
}

function formatMprAxisTiltLabel(axisDeg: number): string {
  const safeAxisDeg = clampMprAxisDeg(axisDeg);
  const absAxisDeg = Math.abs(safeAxisDeg);
  if (absAxisDeg <= 2) return "ось без наклона";
  const side = safeAxisDeg > 0 ? "вправо" : "влево";
  if (absAxisDeg <= 15) return `мягкий наклон ${side}`;
  if (absAxisDeg <= 45) return `рабочий наклон ${side}`;
  return `крутой наклон ${side}`;
}

function formatMprSlabBandLabel(slabMm: number): string {
  const safeSlabMm = clampMprSlabMm(slabMm);
  if (safeSlabMm <= 2) return "тонкий слой для корней и импланта";
  if (safeSlabMm <= 5) return "узкий слой для канала и локальной анатомии";
  if (safeSlabMm <= 12) return "широкий слой для пазухи и панорамы";
  return "очень широкий слой для обзорной навигации";
}

export function buildMprAxisGuidance(input: { canOpenMpr: boolean; axisDeg: number; slabMm: number; sliceFraction: number }): MprAxisGuidance {
  if (!input.canOpenMpr) {
    return {
      tiltLabel: "ось включится после выбора серии",
      slabLabel: "слой включится после выбора серии",
      sliceLabel: "срез включится после выбора серии",
      summary: "Сначала выберите готовую КЛКТ/КТ-серию."
    };
  }

  const tiltLabel = formatMprAxisTiltLabel(input.axisDeg);
  const slabLabel = formatMprSlabBandLabel(input.slabMm);
  const sliceLabel = formatMprSliceFractionLabel(input.sliceFraction);
  return {
    tiltLabel,
    slabLabel,
    sliceLabel,
    summary: `${tiltLabel}; ${slabLabel}; ${sliceLabel}.`
  };
}

export function formatMprAxisVisualizerLabel(input: {
  canOpenMpr: boolean;
  workbenchSummary: string;
  compassSummary: string;
  guidanceSummary: string;
}): string {
  const parts = input.canOpenMpr
    ? [input.workbenchSummary, input.compassSummary, input.guidanceSummary]
    : [input.workbenchSummary, input.guidanceSummary];
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

export function formatSignedMprStep(value: number, unit: string): string {
  return value > 0 ? `+${value}${unit}` : `${value}${unit}`;
}
