/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL 3D SURGICAL GUIDE SAFETY & PRINTABILITY VALIDATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical validation of surgical drill guides before fabrication:
 *  - Resin wall thickness verification around sleeve housings (MIN_WALL_MM >= 1.0)
 *  - Drill channel diameter printability for guided burs (MIN_DRILL_MM >= 1.8)
 *  - Inter-sleeve web and bore proximity with bur apex overshoot (DRILL_OVERSHOOT_MM = 2.0)
 *  - Clearance from extended drill path to IAN mandibular nerve canal (>= 2.0 mm)
 *    and maxillary sinus floor (>= 1.0 mm)
 *
 * 100% pure TypeScript, zero DOM/VTK/WASM dependencies, unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./cbctSafetyEngine.js";
import { distSegmentToPolyline3 } from "./cbctSafetyEngine.js";

/** Minimum printable wall thickness (mm) for typical SLA/DLP dental resin. */
export const MIN_WALL_MM = 1.0;

/** Smallest sensible guided-drill bur diameter (mm). */
export const MIN_DRILL_MM = 1.8;

/** Extra travel depth (mm) the drill bur travels past the implant apex. */
export const DRILL_OVERSHOOT_MM = 2.0;

/**
 * Planned implant definition for surgical guide validation.
 */
export interface SurgicalGuideCheckImplant {
  /** Entry point at the bone crest / platform center */
  entry: Vec3;
  /** Unit axis vector directed from entry toward apex */
  axis: Vec3;
  /** Planned implant body length (mm) */
  length: number;
  /** Outer working diameter of drill sleeve bushing (mm) */
  sleeveDiameter: number;
  /** Sleeve bottom to implant platform distance along axis (mm) */
  sleeveOffset: number;
  /** Sleeve cylinder height (mm) */
  sleeveHeight: number;
}

/**
 * Guide template manufacturing and design parameters.
 */
export interface SurgicalGuideParams {
  /** Sleeve housing outer resin wall thickness (radial, mm) */
  wallMm: number;
  /** Base bar cross-section width (mm) */
  baseWidthMm?: number;
  /** Base bar cross-section height along Z (mm) */
  baseHeightMm?: number;
  /** Radial extra tolerance on drill channel (mm) */
  channelTolMm: number;
  /** Tessellation segments */
  segments?: number;
  /** Use stepped metal sleeve pocket (depth-stop shoulder) */
  sleeveSeat?: boolean;
  /** Radial clearance for metal sleeve fit (mm) */
  seatClearanceMm?: number;
  /** Wall thickness of the metal sleeve bushing (radial, mm) */
  sleeveWallMm: number;
}

/**
 * Traced anatomical boundary (mandibular canal, sinus floor) with safety margin.
 */
export interface SurgicalGuideAnatomyMarker {
  id: string;
  name?: string;
  type: "nerve" | "sinus";
  color?: string;
  /** Safety tube radius in mm */
  radius: number;
  /** World polyline vertices in mm */
  points: Vec3[];
}

/**
 * Complete input for surgical guide safety verification.
 */
export interface SurgicalGuideCheckInput {
  implants: SurgicalGuideCheckImplant[];
  params: SurgicalGuideParams;
  /** Traced anatomical boundaries */
  anatomy?: SurgicalGuideAnatomyMarker[];
  /** Custom safety clearance thresholds in mm */
  thresholds?: { nerve: number; sinus: number };
}

export type SurgicalGuideIssueSeverity = "error" | "warning";

/**
 * Issue detected during surgical guide validation.
 */
export interface SurgicalGuideIssue {
  /** Issue code: 'thinWall' | 'narrowChannel' | 'boresClose' | 'drillNerve' | 'drillSinus' */
  code: string;
  severity: SurgicalGuideIssueSeverity;
  /** Formatted measured detail, e.g. "0.6 mm" */
  detail?: string;
}

/** Standard clinical defaults for 3D surgical drill guides */
export const DEFAULT_SURGICAL_GUIDE_PARAMS: SurgicalGuideParams = {
  wallMm: 1.5,
  baseWidthMm: 5.0,
  baseHeightMm: 4.0,
  channelTolMm: 0.1,
  segments: 48,
  sleeveSeat: true,
  seatClearanceMm: 0.05,
  sleeveWallMm: 0.9,
};

// Aliases for compatibility
export const GUIDE_DEFAULTS = DEFAULT_SURGICAL_GUIDE_PARAMS;
export type GuideParams = SurgicalGuideParams;
export type GuideCheckImplant = SurgicalGuideCheckImplant;
export type GuideCheckInput = SurgicalGuideCheckInput;
export type GuideIssue = SurgicalGuideIssue;
export type GuideIssueSeverity = SurgicalGuideIssueSeverity;
export type AnatomyMarker = SurgicalGuideAnatomyMarker;

const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);

const at = (imp: SurgicalGuideCheckImplant, t: number): Vec3 => [
  imp.entry[0] + imp.axis[0] * t,
  imp.entry[1] + imp.axis[1] * t,
  imp.entry[2] + imp.axis[2] * t,
];

/**
 * Inner drill-channel radius for an implant, honouring sleeve-seat mode.
 */
export function drillRadius(
  imp: SurgicalGuideCheckImplant,
  params: SurgicalGuideParams,
): number {
  if (params.sleeveSeat) {
    const innerD = Math.max(0.5, imp.sleeveDiameter - 2 * params.sleeveWallMm);
    return innerD / 2 + params.channelTolMm;
  }
  return (imp.sleeveDiameter + params.channelTolMm) / 2;
}

/**
 * Validate a surgical drill-guide plan for printability, bur clearance, and anatomical safety.
 * Returns issues sorted errors-first; an empty array means no issues detected.
 */
export function validateSurgicalGuidePlan(
  input: SurgicalGuideCheckInput,
): SurgicalGuideIssue[] {
  const { implants, params } = input;
  const thr = input.thresholds ?? { nerve: 2.0, sinus: 1.0 };
  const issues: SurgicalGuideIssue[] = [];

  // 1. Housing wall thickness (radial resin around each sleeve seat).
  if (params.wallMm < MIN_WALL_MM) {
    issues.push({
      code: "thinWall",
      severity: "warning",
      detail: `${f1(params.wallMm)} mm`,
    });
  }

  // 2. Drill channel wide enough for a real surgical bur.
  for (const imp of implants) {
    const d = drillRadius(imp, params) * 2;
    if (d < MIN_DRILL_MM) {
      issues.push({
        code: "narrowChannel",
        severity: "warning",
        detail: `${f1(d)} mm`,
      });
      break; // One note is enough
    }
  }

  // 3. Web between two adjacent drill bores.
  // Each drill runs entry -> apex (+ DRILL_OVERSHOOT_MM); if the gap between
  // two such cylinders is below MIN_WALL_MM the printed resin wall between
  // the guide channels is fragile or colliding.
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
          code: "boresClose",
          severity: gap < 0 ? "error" : "warning",
          detail: `${f1(Math.max(0, gap))} mm`,
        });
      }
    }
  }

  // 4. Drill-path collision with marked anatomy.
  // Notice: The drill bur overshoots past the implant apex by DRILL_OVERSHOOT_MM,
  // so the drill can penetrate vital structures even when the implant body clears it.
  const markers = (input.anatomy ?? []).filter((m) => m.points.length > 0);
  for (const imp of implants) {
    const tip = at(imp, imp.length + DRILL_OVERSHOOT_MM);
    const dr = drillRadius(imp, params);
    for (const m of markers) {
      const clearance =
        distSegmentToPolyline3(imp.entry, tip, m.points) - m.radius - dr;
      const limit = m.type === "nerve" ? thr.nerve : thr.sinus;
      if (clearance < limit) {
        issues.push({
          code: m.type === "nerve" ? "drillNerve" : "drillSinus",
          severity: clearance < 0 ? "error" : "warning",
          detail: `${f1(clearance)} mm`,
        });
      }
    }
  }

  // Errors first, then warnings; stable within a severity.
  return issues.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  );
}

/** Backward compatibility alias */
export const validateGuide = validateSurgicalGuidePlan;
