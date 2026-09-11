/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SURGICAL DRILL GUIDE VALIDATION & OVERSHOOT ENGINE — WAVE 122
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical validation of dental surgical drill guides:
 *  - SLA/DLP 3D-printing resin wall thickness around guide sleeve housings (MIN_WALL_MM = 1.0 mm)
 *  - Guided-bur drill channel diameter verification (MIN_DRILL_MM = 1.8 mm)
 *  - Fragile resin web / shaft collisions between adjacent drill bores (MIN_WALL_MM = 1.0 mm)
 *  - Clinical drill overshoot verification (DRILL_OVERSHOOT_MM = 2.0 mm):
 *    evaluates extended bur penetration past implant apex against mandibular
 *    inferior alveolar nerve (IAN) canal and maxillary sinus floor polylines.
 *
 * 100% pure TypeScript, zero DOM/VTK/WASM dependencies, fully unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./implantSafetyClearance.js";
import { distSegmentToPolyline3 } from "./implantSafetyClearance.js";

/** Minimum printable wall thickness (mm) for typical SLA/DLP dental resin. */
export const MIN_WALL_MM = 1.0;

/** Smallest sensible guided-drill bur diameter (mm). */
export const MIN_DRILL_MM = 1.8;

/** Standard clinical extra depth (mm) the surgical drill bur travels past the implant apex. */
export const DRILL_OVERSHOOT_MM = 2.0;

/**
 * Planned implant definition for surgical guide validation.
 */
export interface GuideCheckImplant {
  /** Optional identifier of the planned implant */
  id?: string;
  /** World coordinates of the implant coronal platform / bone entry point */
  entry: Vec3;
  /** Normalized unit axis vector directed from entry toward apex */
  axis: Vec3;
  /** Planned implant body length in mm */
  length: number;
  /** Outer working diameter of the guide sleeve bushing in mm */
  sleeveDiameter: number;
  /** Sleeve bottom offset distance from implant platform along axis in mm */
  sleeveOffset: number;
  /** Metal guide sleeve cylinder height in mm */
  sleeveHeight: number;
}

/**
 * Surgical guide template manufacturing and design parameters.
 */
export interface GuideParams {
  /** Sleeve housing outer resin wall thickness (radial, mm) */
  wallMm: number;
  /** Wall thickness of the metal guide sleeve bushing (radial, mm) */
  sleeveWallMm: number;
  /** Radial clearance / tolerance on drill channel in mm */
  channelTolMm: number;
  /** Presence of mechanical stop shoulder / seat for sleeve bushing */
  sleeveSeat?: boolean;
  /** Optional base bar cross-section width in mm */
  baseWidthMm?: number;
  /** Optional base bar cross-section height along Z in mm */
  baseHeightMm?: number;
  /** Optional radial clearance for metal sleeve fit in mm */
  seatClearanceMm?: number;
  /** Optional tessellation angular segments */
  segments?: number;
}

/**
 * Traced anatomical boundary landmark (mandibular nerve canal, sinus floor).
 */
export interface AnatomyMarker {
  id: string;
  type: "nerve" | "sinus";
  /** Safety tube / structure radius in mm */
  radius: number;
  /** World coordinates polyline points in mm */
  points: Vec3[];
  name?: string;
  color?: string;
  visible?: boolean;
}

export type GuideIssueSeverity = "error" | "warning";

/**
 * Issue detected during surgical guide validation.
 */
export interface GuideIssue {
  /** Issue classification code */
  code: string;
  /** Issue severity level */
  severity: GuideIssueSeverity;
  /** Human-readable measured clearance or dimension (e.g. "0.6 mm") */
  detail?: string;
  /** Associated implant identifier */
  implantId?: string;
  /** Second implant identifier for pair-wise web proximity issues */
  pairImplantId?: string;
}

/**
 * Complete input payload for surgical guide validation.
 */
export interface GuideCheckInput {
  implants: GuideCheckImplant[];
  params: GuideParams;
  /** Traced anatomical boundaries with safety margins */
  anatomy?: AnatomyMarker[];
  /** Custom safety clearance thresholds in mm (defaults: nerve 2.0 mm, sinus 1.0 mm) */
  thresholds?: { nerve: number; sinus: number };
}

/** Standard clinical defaults for 3D surgical drill guides */
export const DEFAULT_GUIDE_PARAMS: GuideParams = {
  wallMm: 1.5,
  sleeveWallMm: 0.9,
  channelTolMm: 0.1,
  sleeveSeat: true,
  baseWidthMm: 5.0,
  baseHeightMm: 4.0,
  seatClearanceMm: 0.05,
  segments: 48,
};

export const GUIDE_DEFAULTS = DEFAULT_GUIDE_PARAMS;

const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);

const at = (imp: GuideCheckImplant, t: number): Vec3 => [
  imp.entry[0] + imp.axis[0] * t,
  imp.entry[1] + imp.axis[1] * t,
  imp.entry[2] + imp.axis[2] * t,
];

/**
 * Computes the inner drill-channel radius for an implant, honoring sleeve-seat mode.
 */
export function drillRadius(
  imp: GuideCheckImplant,
  params: GuideParams,
): number {
  if (params.sleeveSeat) {
    const innerD = Math.max(0.5, imp.sleeveDiameter - 2 * params.sleeveWallMm);
    return innerD / 2 + params.channelTolMm;
  }
  return (imp.sleeveDiameter + params.channelTolMm) / 2;
}

/**
 * Validates a surgical drill-guide plan for printability, bur clearance, and anatomical safety.
 * Returns issues sorted errors-first; an empty array indicates no issues were detected.
 */
export function validateGuide(input: GuideCheckInput): GuideIssue[] {
  const { implants, params } = input;
  const thr = input.thresholds ?? { nerve: 2.0, sinus: 1.0 };
  const issues: GuideIssue[] = [];

  // 1. Sleeve housing resin wall thickness check (radial resin around sleeve seat)
  if (params.wallMm < MIN_WALL_MM) {
    issues.push({
      code: "thinWall",
      severity: "warning",
      detail: `${f1(params.wallMm)} mm`,
    });
  }

  // 2. Drill channel diameter check for guided burs
  for (const imp of implants) {
    const d = drillRadius(imp, params) * 2;
    if (d < MIN_DRILL_MM) {
      issues.push({
        code: "narrowChannel",
        severity: "warning",
        detail: `${f1(d)} mm`,
        ...(imp.id ? { implantId: imp.id } : {}),
      });
      break; // One note is sufficient
    }
  }

  // 3. Fragile resin web between adjacent drill shafts
  // Each drill runs from entry to apex (+ DRILL_OVERSHOOT_MM). If the gap
  // between two expanded drill cylinders is below MIN_WALL_MM, the printed
  // resin wall is fragile or intersecting.
  for (let i = 0; i < implants.length; i++) {
    for (let j = i + 1; j < implants.length; j++) {
      const A = implants[i]!;
      const B = implants[j]!;
      const aTip = at(A, A.length + DRILL_OVERSHOOT_MM);
      const bTip = at(B, B.length + DRILL_OVERSHOOT_MM);
      const gap =
        distSegmentToPolyline3(A.entry, aTip, [B.entry, bTip]) -
        drillRadius(A, params) -
        drillRadius(B, params);

      if (gap < MIN_WALL_MM) {
        issues.push({
          code: "fragileWeb",
          severity: gap < 0 ? "error" : "warning",
          detail: `${f1(Math.max(0, gap))} mm`,
          ...(A.id ? { implantId: A.id } : {}),
          ...(B.id ? { pairImplantId: B.id } : {}),
        });
      }
    }
  }

  // 4. Drill overshoot anatomy collision check!
  // The drill bur penetrates length + DRILL_OVERSHOOT_MM into the bone.
  // Evaluate the clearance from the extended drill trajectory [entry -> apex + overshoot]
  // to anatomical markers (inferior alveolar nerve, maxillary sinus) taking into account
  // anatomical structure radius, drill bur radius, and safety clearance thresholds.
  const markers = (input.anatomy ?? []).filter(
    (m) => m.points && m.points.length > 0,
  );

  for (const imp of implants) {
    const tip = at(imp, imp.length + DRILL_OVERSHOOT_MM);
    const dr = drillRadius(imp, params);
    for (const m of markers) {
      const clearance =
        distSegmentToPolyline3(imp.entry, tip, m.points) - m.radius - dr;
      const limit = m.type === "nerve" ? thr.nerve : thr.sinus;
      if (clearance < limit) {
        issues.push({
          code: m.type === "nerve" ? "drillNerveCollision" : "drillSinusCollision",
          severity: clearance < 0 ? "error" : "warning",
          detail: `${f1(clearance)} mm`,
          ...(imp.id ? { implantId: imp.id } : {}),
        });
      }
    }
  }

  // Errors first, then warnings; stable within a severity
  return issues.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  );
}
