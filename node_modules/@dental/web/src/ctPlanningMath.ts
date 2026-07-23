import type { DicomViewerToolStatePoint } from "@dental/shared";

export const round1 = (value: number) => Math.round(value * 10) / 10;
export const round2 = (value: number) => Math.round(value * 100) / 100;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const finiteOrNull = (value: number) => (Number.isFinite(value) ? value : null);

export function distanceMm(a: DicomViewerToolStatePoint, b: DicomViewerToolStatePoint) {
  const dx = a.world[0] - b.world[0];
  const dy = a.world[1] - b.world[1];
  const dz = a.world[2] - b.world[2];
  return Math.hypot(dx, dy, dz);
}

export function polylineLengthMm(points: DicomViewerToolStatePoint[]) {
  if (points.length < 2) return null;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    total += distanceMm(previous, current);
  }
  return Number.isFinite(total) ? round2(total) : null;
}
