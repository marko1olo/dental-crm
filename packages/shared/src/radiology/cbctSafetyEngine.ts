/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL CBCT: IMPLANT GEOMETRY & 3D SAFETY CLEARANCE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure 3D analytical geometry and safety distance calculations:
 * - Analytical closest point of two 3D line segments (Dan Sunday / Ericson)
 * - Point-to-segment and segment-to-polyline distances (IAN nerve / sinus floor)
 * - Clinical threshold evaluation (nerve >= 2.0 mm, sinus >= 1.0 mm, adjacent >= 3.0 mm)
 * - Cylinder-plane chord slicing hw = sqrt(r^2 - w^2) for MPR / CPR overlays
 * - Guided surgery drill sleeve and osteotomy axis calculations
 *
 * 100% pure TypeScript, zero DOM/React dependencies, unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  type Vec3,
  dot3,
  cross3,
  sub3,
  add3,
  scale3,
  len3,
  normalize3,
  distPointToSegment3,
  distSegmentToSegment3,
  distSegmentToPolyline3,
  type PlaneFrame,
  type ImplantBody,
  type SleeveSpec,
  type ArchFrame,
  projectToPlane,
  radiusProfile,
  cylinderPlaneStrip,
  implantPlaneStrip,
  sleeveBody,
  drillSegment,
  archFrameAt,
  nearestArchFrame,
  implantAxis,
  implantWorldAxis,
} from "./implantGeometryEngine.js";

export type { Vec3, PlaneFrame, ImplantBody, SleeveSpec, ArchFrame };
export {
  dot3,
  cross3,
  sub3,
  add3,
  scale3,
  len3,
  normalize3,
  distPointToSegment3,
  distSegmentToSegment3,
  distSegmentToPolyline3,
  projectToPlane,
  radiusProfile,
  cylinderPlaneStrip,
  implantPlaneStrip,
  sleeveBody,
  drillSegment,
  archFrameAt,
  nearestArchFrame,
  implantAxis,
  implantWorldAxis,
};

// ── Implant Safety Clearance Evaluation ────────────────────────

export interface ClearanceResult {
  /** Surface-to-surface clearance in mm (negative = collision/overlap) */
  mm: number;
  /** True if clearance meets or exceeds clinical threshold */
  ok: boolean;
}

export interface AnatomyEval {
  id: string;
  type: "nerve" | "sinus";
  mm: number;
  ok: boolean;
}

export interface ImplantSeg {
  id: string;
  entry: Vec3;
  apex: Vec3;
  radius: number;
}

export interface SafetyThresholds {
  /** Minimum clearance to Inferior Alveolar Nerve (IAN) canal in mm (standard >= 2.0 mm) */
  nerve: number;
  /** Minimum clearance to Maxillary Sinus floor in mm (standard >= 1.0 mm) */
  sinus: number;
  /** Minimum clearance to adjacent implant in mm (standard >= 3.0 mm) */
  neighbor: number;
}

/**
 * Clinical safety thresholds:
 * - Nerve (IAN): >= 2.0 mm (prevents paresthesia / neurovascular bundle trauma)
 * - Sinus floor: >= 1.0 mm (prevents accidental Schneiderian membrane perforation)
 * - Neighbouring implant: >= 3.0 mm (preserves interimplant bone peak & biological width)
 */
export const DEFAULT_SAFETY_THRESHOLDS: SafetyThresholds = {
  nerve: 2.0,
  sinus: 1.0,
  neighbor: 3.0,
};

export interface ImplantSafety {
  anatomy: AnatomyEval[];
  /** Nearest neighbouring-implant clearance in mm, or null when alone */
  neighborMm: number | null;
  neighborOk: boolean;
  worstOk: boolean;
  closestNeighborId?: string | null;
  warnings: string[];
}

/**
 * Surface-to-surface clearance between an implant axis and an anatomical polyline tube.
 */
export function markerClearance(
  entry: Vec3,
  apex: Vec3,
  implantRadius: number,
  polyline: Vec3[],
  tubeRadius: number,
  threshold: number,
): ClearanceResult {
  const centerDist = distSegmentToPolyline3(entry, apex, polyline);
  const mm = centerDist - implantRadius - tubeRadius;
  return { mm, ok: mm >= threshold };
}

/**
 * Surface-to-surface clearance between two neighbouring implants.
 */
export function neighborClearance(
  entryA: Vec3,
  apexA: Vec3,
  radiusA: number,
  entryB: Vec3,
  apexB: Vec3,
  radiusB: number,
  threshold: number,
): ClearanceResult {
  const centerDist = distSegmentToSegment3(entryA, apexA, entryB, apexB);
  const mm = centerDist - radiusA - radiusB;
  return { mm, ok: mm >= threshold };
}

/**
 * Clearance of one implant against every anatomical marker polyline.
 */
export function evaluateImplantAnatomy(
  entry: Vec3,
  apex: Vec3,
  implantRadius: number,
  markers: Array<{ id: string; type: "nerve" | "sinus"; radius: number; points: Vec3[] }>,
  thresholds: Partial<SafetyThresholds> = {},
): { results: AnatomyEval[]; worstOk: boolean } {
  const thr = { ...DEFAULT_SAFETY_THRESHOLDS, ...thresholds };
  const results: AnatomyEval[] = markers.map((m) => {
    const centerDist = distSegmentToPolyline3(entry, apex, m.points);
    const mm = centerDist - implantRadius - m.radius;
    const required = m.type === "nerve" ? thr.nerve : thr.sinus;
    return { id: m.id, type: m.type, mm, ok: mm >= required };
  });
  return { results, worstOk: results.every((r) => r.ok) };
}

/**
 * Complete clinical safety evaluation of a planned implant against all anatomical
 * structures (mandibular nerve canal, maxillary sinus) and neighbouring implants.
 */
export function evaluateImplantSafety(
  self: ImplantSeg,
  others: ImplantSeg[] = [],
  markers: Array<{ id: string; type: "nerve" | "sinus"; radius: number; points: Vec3[] }> = [],
  thresholds: Partial<SafetyThresholds> = {},
): ImplantSafety {
  const thr: SafetyThresholds = {
    nerve: thresholds.nerve ?? DEFAULT_SAFETY_THRESHOLDS.nerve,
    sinus: thresholds.sinus ?? DEFAULT_SAFETY_THRESHOLDS.sinus,
    neighbor: thresholds.neighbor ?? DEFAULT_SAFETY_THRESHOLDS.neighbor,
  };

  const warnings: string[] = [];

  const anatomy: AnatomyEval[] = markers.map((m) => {
    const centerDist = distSegmentToPolyline3(self.entry, self.apex, m.points);
    const mm = centerDist - self.radius - m.radius;
    const required = m.type === "nerve" ? thr.nerve : thr.sinus;
    const ok = mm >= required;
    if (!ok) {
      if (m.type === "nerve") {
        warnings.push(
          `Опасное сближение с нижнечелюстным каналом (${mm.toFixed(1)} мм < ${required.toFixed(1)} мм). Риск парестезии IAN!`,
        );
      } else {
        warnings.push(
          `Сближение с дном гайморовой пазухи (${mm.toFixed(1)} мм < ${required.toFixed(1)} мм). Требуется синус-лифтинг!`,
        );
      }
    }
    return { id: m.id, type: m.type, mm, ok };
  });

  let neighborMm: number | null = null;
  let closestNeighborId: string | null = null;

  for (const o of others) {
    if (o.id === self.id) continue;
    const centerDist = distSegmentToSegment3(self.entry, self.apex, o.entry, o.apex);
    const mm = centerDist - self.radius - o.radius;
    if (neighborMm === null || mm < neighborMm) {
      neighborMm = mm;
      closestNeighborId = o.id;
    }
  }

  const neighborOk = neighborMm === null || neighborMm >= thr.neighbor;
  if (!neighborOk && neighborMm !== null) {
    warnings.push(
      `Слишком близко к соседнему имплантату (${neighborMm.toFixed(1)} мм < ${thr.neighbor.toFixed(1)} мм). Нарушение межзубного костного гребня!`,
    );
  }

  const worstOk = anatomy.every((a) => a.ok) && neighborOk;

  return {
    anatomy,
    neighborMm,
    neighborOk,
    worstOk,
    closestNeighborId,
    warnings,
  };
}

/** Backward compatibility alias */
export const evaluateImplant = evaluateImplantSafety;


