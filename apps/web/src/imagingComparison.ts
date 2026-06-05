import type { Dashboard, ImagingStudyKind } from "@dental/shared";

export type ImagingStudyRow = Dashboard["imagingStudies"][number];

function normalizedImagingComparisonKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function imagingComparisonScore(current: ImagingStudyRow, candidate: ImagingStudyRow): number {
  let score = 0;
  if (current.toothCode && candidate.toothCode && current.toothCode === candidate.toothCode) score += 6;
  if (
    normalizedImagingComparisonKey(current.region) &&
    normalizedImagingComparisonKey(current.region) === normalizedImagingComparisonKey(candidate.region)
  ) {
    score += 3;
  }
  if (current.kind === candidate.kind) score += 4;
  if (
    (current.kind === "cbct" && (candidate.kind === "opg" || candidate.kind === "periapical")) ||
    (candidate.kind === "cbct" && (current.kind === "opg" || current.kind === "periapical"))
  ) {
    score += 2;
  }
  if (candidate.status === "available") score += 1;
  return score;
}

export function imagingComparisonReason(
  current: ImagingStudyRow,
  candidate: ImagingStudyRow,
  kindLabel: (kind: ImagingStudyKind) => string
): string {
  if (current.toothCode && candidate.toothCode && current.toothCode === candidate.toothCode) return `тот же зуб ${candidate.toothCode}`;
  if (
    normalizedImagingComparisonKey(current.region) &&
    normalizedImagingComparisonKey(current.region) === normalizedImagingComparisonKey(candidate.region)
  ) {
    return `та же область: ${candidate.region}`;
  }
  if (current.kind === candidate.kind) return `тот же тип: ${kindLabel(candidate.kind)}`;
  if (
    (current.kind === "cbct" && (candidate.kind === "opg" || candidate.kind === "periapical")) ||
    (candidate.kind === "cbct" && (current.kind === "opg" || current.kind === "periapical"))
  ) {
    return "полезно сверить с КТ/ОПТГ/RVG";
  }
  return "другой снимок пациента";
}

export function imagingCaptureDistanceMs(left: string, right: string): number {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return Number.MAX_SAFE_INTEGER;
  return Math.abs(leftMs - rightMs);
}
