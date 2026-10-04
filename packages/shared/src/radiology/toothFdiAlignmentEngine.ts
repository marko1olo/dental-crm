/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT: TOOTH FDI ALIGNMENT & DYNAMIC PROGRAMMING ENGINE (WAVE 141)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical 1D Dynamic Programming / Dynamic Time Warping (DTW) alignment
 * of 3D detected tooth crown clusters along the dental arch against the
 * canonical Wheeler & Misch dental anatomical width map.
 *
 * Core Clinical Invariants:
 *  1. Canonical Anatomical Map (Wheeler's Dental Anatomy & Misch Prosthodontics):
 *     - Maxilla (18..11, 21..28): Centrals (8.5 mm), Laterals (6.5 mm), Canines (7.5 mm),
 *       Premolars (7.0 mm), M1 (10.5 mm), M2 (9.5 mm), M3 (8.5 mm).
 *     - Mandible (48..41, 31..38): Centrals (5.0 mm), Laterals (5.5 mm), Canines (7.0 mm),
 *       Premolars (7.0-7.2 mm), M1 (11.0 mm), M2 (10.5 mm), M3 (10.0 mm).
 *  2. Robust Adentia & Gap Handling (Zero Number Shifting):
 *     - When an edentulous gap is detected (e.g. between 45 and 47), tooth 46 is
 *       explicitly marked as MISSING, and the next tooth is guaranteed to receive
 *       FDI 47 without shifting subsequent teeth!
 *  3. Titanium Implant Recognition:
 *     - Clusters with HU >= 2900 are assigned status IMPLANT without penalizing
 *       the anatomical position match.
 *  4. Full 16-Tooth Arch Registry (FDI 11..48):
 *     - Guaranteed return of all 16 teeth per arch with estimated coordinates
 *       for missing teeth based on surrounding anatomical landmarks.
 *
 * 100% pure TypeScript, zero DOM/React dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Vec3 } from "./cprMath.js";
import {
  type Arch3DCurve,
  frameAtArcLength,
  vec3Schema,
} from "./cbct3DArchEngine.js";
import type { CrownCluster, EdentulousGap } from "./toothCrownWatershedEngine.js";

// ── 1. Types & Schemas ───────────────────────────────────────────────────

export const fdiToothStatusSchema = z.enum([
  "PRESENT_NATURAL",
  "IMPLANT",
  "METAL_RESTORED",
  "MISSING",
  "PONTIC",
  "IMPACTED",
]);

export type FdiToothStatus = z.infer<typeof fdiToothStatusSchema>;

export type ToothClass =
  | "incisor_central"
  | "incisor_lateral"
  | "canine"
  | "premolar_1"
  | "premolar_2"
  | "molar_1"
  | "molar_2"
  | "molar_3";

export interface WheelerToothSpec {
  fdiNumber: number;
  nameRu: string;
  canonicalWidthMm: number;
  widthRangeMm: [number, number];
  canonicalHeightMm: number;
  canonicalThicknessMm: number;
  quadrant: 1 | 2 | 3 | 4;
  toothClass: ToothClass;
}

export interface AlignedFdiTooth {
  /** Two-digit FDI tooth number (e.g. 11..48) */
  fdiNumber: number;
  /** Full Russian anatomical nomenclature name */
  nameRu: string;
  /** Clinical presence status */
  status: FdiToothStatus;
  /** 3D centroid in LPS world coordinates (mm), detected or anatomically estimated */
  centroidWorld: Vec3;
  /** Arc length along dental arch in mm */
  archArcLengthMm: number;
  /** Normalized coordinate along dental arch [0, 1] */
  archNormalizedU: number;
  /** Matched cluster ID (null if tooth is missing) */
  matchedClusterId: number | null;
  /** Detected mesiodistal diameter in mm (or 0 if missing) */
  mesiodistalWidthMm: number;
  /** Canonical Wheeler anatomical width in mm */
  canonicalWidthMm: number;
  /** Spatial discrepancy from expected canonical position in mm */
  deviationMm: number;
  /** Confidence score in identification [0, 1] */
  confidence: number;
  /** Clinical diagnostic notes / warnings */
  warnings: string[];
}

export const alignedFdiToothSchema: z.ZodType<AlignedFdiTooth> = z.object({
  fdiNumber: z.number().int().min(11).max(48),
  nameRu: z.string(),
  status: fdiToothStatusSchema,
  centroidWorld: vec3Schema,
  archArcLengthMm: z.number().nonnegative(),
  archNormalizedU: z.number().min(0).max(1),
  matchedClusterId: z.number().int().positive().nullable(),
  mesiodistalWidthMm: z.number().nonnegative(),
  canonicalWidthMm: z.number().positive(),
  deviationMm: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

export const fdiAlignmentOptionsSchema = z.object({
  /** Custom estimated dental arch midline in mm (defaults to arch midpoint or detected incisors) */
  midlineArcMm: z.number().nonnegative().optional(),
  /** Maximum allowable deviation from canonical spacing before penalty in mm (default: 3.5 mm) */
  maxSpacingToleranceMm: z.number().positive().optional().default(3.5),
  /** Weight penalty for missing teeth when no edentulous gap is detected (default: 15.0) */
  unsupportedMissingPenalty: z.number().positive().optional().default(15.0),
  /** Weight penalty for missing teeth when an edentulous gap IS detected (default: 0.5) */
  gapSupportedMissingPenalty: z.number().nonnegative().optional().default(0.5),
  /** Weight penalty for unmatched spurious clusters (default: 12.0) */
  unmatchedClusterPenalty: z.number().positive().optional().default(12.0),
});

export type FdiAlignmentOptions = z.infer<typeof fdiAlignmentOptionsSchema>;

export interface FdiAlignmentResult {
  jaw: "maxilla" | "mandible";
  teeth: AlignedFdiTooth[];
  presentCount: number;
  missingCount: number;
  implantCount: number;
  restorationCount: number;
  overallMatchScore: number;
  detectedMidlineArcMm: number;
  totalArchLengthMm: number;
}

export const fdiAlignmentResultSchema: z.ZodType<FdiAlignmentResult> = z.object({
  jaw: z.enum(["maxilla", "mandible"]),
  teeth: z.array(alignedFdiToothSchema).length(16),
  presentCount: z.number().int().nonnegative(),
  missingCount: z.number().int().nonnegative(),
  implantCount: z.number().int().nonnegative(),
  restorationCount: z.number().int().nonnegative(),
  overallMatchScore: z.number().min(0).max(100),
  detectedMidlineArcMm: z.number().nonnegative(),
  totalArchLengthMm: z.number().positive(),
});

// ── 2. Canonical Wheeler Dental Anatomy Database ───────────────────────────

/**
 * Standard permanent dentition table (Wheeler's Dental Anatomy & Misch Prosthodontics).
 * Ordered anatomically from patient right to patient left:
 *  - Maxilla: 18 -> 11, then 21 -> 28
 *  - Mandible: 48 -> 41, then 31 -> 38
 */
export const WHEELER_MAXILLA_SPECS: readonly WheelerToothSpec[] = [
  { fdiNumber: 18, nameRu: "Верхний правый третий моляр (зуб мудрости)", canonicalWidthMm: 8.5, widthRangeMm: [7.5, 9.5], canonicalHeightMm: 6.5, canonicalThicknessMm: 10.0, quadrant: 1, toothClass: "molar_3" },
  { fdiNumber: 17, nameRu: "Верхний правый второй моляр", canonicalWidthMm: 9.5, widthRangeMm: [9.0, 10.5], canonicalHeightMm: 7.0, canonicalThicknessMm: 11.0, quadrant: 1, toothClass: "molar_2" },
  { fdiNumber: 16, nameRu: "Верхний правый первый моляр", canonicalWidthMm: 10.5, widthRangeMm: [10.0, 11.5], canonicalHeightMm: 7.5, canonicalThicknessMm: 11.5, quadrant: 1, toothClass: "molar_1" },
  { fdiNumber: 15, nameRu: "Верхний правый второй премоляр", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 7.5], canonicalHeightMm: 8.5, canonicalThicknessMm: 9.0, quadrant: 1, toothClass: "premolar_2" },
  { fdiNumber: 14, nameRu: "Верхний правый первый премоляр", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 7.5], canonicalHeightMm: 8.5, canonicalThicknessMm: 9.0, quadrant: 1, toothClass: "premolar_1" },
  { fdiNumber: 13, nameRu: "Верхний правый клык", canonicalWidthMm: 7.5, widthRangeMm: [7.0, 8.5], canonicalHeightMm: 10.0, canonicalThicknessMm: 8.0, quadrant: 1, toothClass: "canine" },
  { fdiNumber: 12, nameRu: "Верхний правый боковой резец", canonicalWidthMm: 6.5, widthRangeMm: [6.0, 7.5], canonicalHeightMm: 9.0, canonicalThicknessMm: 6.0, quadrant: 1, toothClass: "incisor_lateral" },
  { fdiNumber: 11, nameRu: "Верхний правый центральный резец", canonicalWidthMm: 8.5, widthRangeMm: [8.0, 9.5], canonicalHeightMm: 10.5, canonicalThicknessMm: 7.0, quadrant: 1, toothClass: "incisor_central" },
  { fdiNumber: 21, nameRu: "Верхний левый центральный резец", canonicalWidthMm: 8.5, widthRangeMm: [8.0, 9.5], canonicalHeightMm: 10.5, canonicalThicknessMm: 7.0, quadrant: 2, toothClass: "incisor_central" },
  { fdiNumber: 22, nameRu: "Верхний левый боковой резец", canonicalWidthMm: 6.5, widthRangeMm: [6.0, 7.5], canonicalHeightMm: 9.0, canonicalThicknessMm: 6.0, quadrant: 2, toothClass: "incisor_lateral" },
  { fdiNumber: 23, nameRu: "Верхний левый клык", canonicalWidthMm: 7.5, widthRangeMm: [7.0, 8.5], canonicalHeightMm: 10.0, canonicalThicknessMm: 8.0, quadrant: 2, toothClass: "canine" },
  { fdiNumber: 24, nameRu: "Верхний левый первый премоляр", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 7.5], canonicalHeightMm: 8.5, canonicalThicknessMm: 9.0, quadrant: 2, toothClass: "premolar_1" },
  { fdiNumber: 25, nameRu: "Верхний левый второй премоляр", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 7.5], canonicalHeightMm: 8.5, canonicalThicknessMm: 9.0, quadrant: 2, toothClass: "premolar_2" },
  { fdiNumber: 26, nameRu: "Верхний левый первый моляр", canonicalWidthMm: 10.5, widthRangeMm: [10.0, 11.5], canonicalHeightMm: 7.5, canonicalThicknessMm: 11.5, quadrant: 2, toothClass: "molar_1" },
  { fdiNumber: 27, nameRu: "Верхний левый второй моляр", canonicalWidthMm: 9.5, widthRangeMm: [9.0, 10.5], canonicalHeightMm: 7.0, canonicalThicknessMm: 11.0, quadrant: 2, toothClass: "molar_2" },
  { fdiNumber: 28, nameRu: "Верхний левый третий моляр (зуб мудрости)", canonicalWidthMm: 8.5, widthRangeMm: [7.5, 9.5], canonicalHeightMm: 6.5, canonicalThicknessMm: 10.0, quadrant: 2, toothClass: "molar_3" },
];

export const WHEELER_MANDIBLE_SPECS: readonly WheelerToothSpec[] = [
  { fdiNumber: 48, nameRu: "Нижний правый третий моляр (зуб мудрости)", canonicalWidthMm: 10.0, widthRangeMm: [9.0, 11.0], canonicalHeightMm: 7.0, canonicalThicknessMm: 10.5, quadrant: 4, toothClass: "molar_3" },
  { fdiNumber: 47, nameRu: "Нижний правый второй моляр", canonicalWidthMm: 10.5, widthRangeMm: [10.0, 11.5], canonicalHeightMm: 7.5, canonicalThicknessMm: 11.0, quadrant: 4, toothClass: "molar_2" },
  { fdiNumber: 46, nameRu: "Нижний правый первый моляр", canonicalWidthMm: 11.0, widthRangeMm: [10.5, 12.0], canonicalHeightMm: 8.0, canonicalThicknessMm: 11.5, quadrant: 4, toothClass: "molar_1" },
  { fdiNumber: 45, nameRu: "Нижний правый второй премоляр", canonicalWidthMm: 7.2, widthRangeMm: [6.5, 8.0], canonicalHeightMm: 8.0, canonicalThicknessMm: 8.5, quadrant: 4, toothClass: "premolar_2" },
  { fdiNumber: 44, nameRu: "Нижний правый первый премоляр", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 7.5], canonicalHeightMm: 8.5, canonicalThicknessMm: 8.0, quadrant: 4, toothClass: "premolar_1" },
  { fdiNumber: 43, nameRu: "Нижний правый клык", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 8.0], canonicalHeightMm: 10.5, canonicalThicknessMm: 7.5, quadrant: 4, toothClass: "canine" },
  { fdiNumber: 42, nameRu: "Нижний правый боковой резец", canonicalWidthMm: 5.5, widthRangeMm: [5.0, 6.5], canonicalHeightMm: 9.5, canonicalThicknessMm: 6.5, quadrant: 4, toothClass: "incisor_lateral" },
  { fdiNumber: 41, nameRu: "Нижний правый центральный резец", canonicalWidthMm: 5.0, widthRangeMm: [4.5, 5.5], canonicalHeightMm: 9.0, canonicalThicknessMm: 6.0, quadrant: 4, toothClass: "incisor_central" },
  { fdiNumber: 31, nameRu: "Нижний левый центральный резец", canonicalWidthMm: 5.0, widthRangeMm: [4.5, 5.5], canonicalHeightMm: 9.0, canonicalThicknessMm: 6.0, quadrant: 3, toothClass: "incisor_central" },
  { fdiNumber: 32, nameRu: "Нижний левый боковой резец", canonicalWidthMm: 5.5, widthRangeMm: [5.0, 6.5], canonicalHeightMm: 9.5, canonicalThicknessMm: 6.5, quadrant: 3, toothClass: "incisor_lateral" },
  { fdiNumber: 33, nameRu: "Нижний левый клык", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 8.0], canonicalHeightMm: 10.5, canonicalThicknessMm: 7.5, quadrant: 3, toothClass: "canine" },
  { fdiNumber: 34, nameRu: "Нижний левый первый премоляр", canonicalWidthMm: 7.0, widthRangeMm: [6.5, 7.5], canonicalHeightMm: 8.5, canonicalThicknessMm: 8.0, quadrant: 3, toothClass: "premolar_1" },
  { fdiNumber: 35, nameRu: "Нижний левый второй премоляр", canonicalWidthMm: 7.2, widthRangeMm: [6.5, 8.0], canonicalHeightMm: 8.0, canonicalThicknessMm: 8.5, quadrant: 3, toothClass: "premolar_2" },
  { fdiNumber: 36, nameRu: "Нижний левый первый моляр", canonicalWidthMm: 11.0, widthRangeMm: [10.5, 12.0], canonicalHeightMm: 8.0, canonicalThicknessMm: 11.5, quadrant: 3, toothClass: "molar_1" },
  { fdiNumber: 37, nameRu: "Нижний левый второй моляр", canonicalWidthMm: 10.5, widthRangeMm: [10.0, 11.5], canonicalHeightMm: 7.5, canonicalThicknessMm: 11.0, quadrant: 3, toothClass: "molar_2" },
  { fdiNumber: 38, nameRu: "Нижний левый третий моляр (зуб мудрости)", canonicalWidthMm: 10.0, widthRangeMm: [9.0, 11.0], canonicalHeightMm: 7.0, canonicalThicknessMm: 10.5, quadrant: 3, toothClass: "molar_3" },
];

export function getCanonicalArchSpecs(jaw: "maxilla" | "mandible"): readonly WheelerToothSpec[] {
  return jaw === "maxilla" ? WHEELER_MAXILLA_SPECS : WHEELER_MANDIBLE_SPECS;
}

// ── 3. Canonical Spacing & Midline Calculation ─────────────────────────────

/**
 * Calculates theoretical expected arc positions s_expected (in mm) for all 16 teeth
 * based on the dental arch midline (contact point between 11-21 or 41-31).
 */
export function computeCanonicalToothPositions(
  specs: readonly WheelerToothSpec[],
  midlineArcMm: number,
): Array<{ spec: WheelerToothSpec; expectedArcMm: number }> {
  const result: Array<{ spec: WheelerToothSpec; expectedArcMm: number }> = [];

  // Indices: 0..7 are Right quadrant (18..11 or 48..41), 8..15 are Left quadrant (21..28 or 31..38).
  // Centrals are index 7 (Right central) and index 8 (Left central).
  const centralRight = specs[7]!;
  const centralLeft = specs[8]!;

  const rightCenters: number[] = new Array(8);
  const leftCenters: number[] = new Array(8);

  // Right central center is (midline - width / 2)
  rightCenters[7] = midlineArcMm - centralRight.canonicalWidthMm / 2;
  for (let i = 6; i >= 0; i--) {
    const prevSpec = specs[i + 1]!;
    const currSpec = specs[i]!;
    rightCenters[i] = rightCenters[i + 1]! - (prevSpec.canonicalWidthMm + currSpec.canonicalWidthMm) / 2;
  }

  // Left central center is (midline + width / 2)
  leftCenters[0] = midlineArcMm + centralLeft.canonicalWidthMm / 2;
  for (let i = 1; i < 8; i++) {
    const prevSpec = specs[i + 7]!;
    const currSpec = specs[i + 8]!;
    leftCenters[i] = leftCenters[i - 1]! + (prevSpec.canonicalWidthMm + currSpec.canonicalWidthMm) / 2;
  }

  // Assemble all 16 in order from patient right to patient left
  for (let i = 0; i < 8; i++) {
    result.push({ spec: specs[i]!, expectedArcMm: rightCenters[i]! });
  }
  for (let i = 0; i < 8; i++) {
    result.push({ spec: specs[i + 8]!, expectedArcMm: leftCenters[i]! });
  }

  return result;
}

/**
 * Automatically estimates the clinical midline of the dental arch (arc position in mm)
 * by detecting the anterior incisor gap or arch geometric apex.
 */
export function estimateArchMidline(
  clusters: CrownCluster[],
  totalArchLength: number,
): number {
  if (clusters.length === 0) return totalArchLength / 2;

  // Midpoint of arch length
  const archMid = totalArchLength / 2;

  // Find two adjacent clusters closest to the arch midpoint with smallest spacing (~5..8 mm)
  let bestMidline = archMid;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < clusters.length - 1; i++) {
    const c1 = clusters[i]!;
    const c2 = clusters[i + 1]!;
    const contactS = (c1.archArcLengthMm + c2.archArcLengthMm) / 2;
    const spacing = c2.archArcLengthMm - c1.archArcLengthMm;

    // Incisor contact is usually within +/- 15 mm of geometric arch mid, and spacing is 5 - 9 mm
    const distFromMid = Math.abs(contactS - archMid);
    if (distFromMid < 16.0 && spacing >= 4.5 && spacing <= 10.0) {
      const score = distFromMid * 1.5 + Math.abs(spacing - 6.5);
      if (score < bestScore) {
        bestScore = score;
        bestMidline = contactS;
      }
    }
  }

  return bestMidline;
}

// ── 4. 1D Dynamic Programming / Alignment Engine ───────────────────────────

/**
 * Checks if a canonical tooth expected position falls inside any detected edentulous gap.
 */
function isPositionCoveredByGap(sMm: number, gaps: EdentulousGap[]): boolean {
  for (const g of gaps) {
    if (sMm >= g.startArcMm - 2.0 && sMm <= g.endArcMm + 2.0) {
      return true;
    }
  }
  return false;
}

/**
 * Aligns detected 3D crown clusters along the dental arch to canonical 16-tooth FDI positions
 * using global dynamic programming with gap penalty relaxation.
 */
export function alignClustersToFdiArch(
  clusters: CrownCluster[],
  gaps: EdentulousGap[],
  arch: Arch3DCurve,
  opts?: Partial<FdiAlignmentOptions>,
): FdiAlignmentResult {
  const options = fdiAlignmentOptionsSchema.parse(opts ?? {});
  const jaw = arch.jaw === "maxilla" ? "maxilla" : "mandible";
  const specs = getCanonicalArchSpecs(jaw);

  // 1. Estimate or take supplied dental midline
  const midlineArcMm = options.midlineArcMm ?? estimateArchMidline(clusters, arch.totalLengthMm);

  // 2. Compute canonical expected positions along the arch
  const canonicalMap = computeCanonicalToothPositions(specs, midlineArcMm);
  const N = canonicalMap.length; // exactly 16
  const M = clusters.length;

  // 3. DP Table setup:
  // dp[i][j] = minimal cost to align first i clusters (0..M) with first j canonical teeth (0..N).
  // Cost matrix:
  const dp: number[][] = Array.from({ length: M + 1 }, () =>
    new Array(N + 1).fill(Number.POSITIVE_INFINITY),
  );
  // Backtracking path records: { prevI, prevJ, action: "MATCH" | "SKIP_TOOTH" | "SKIP_CLUSTER" }
  const back: Array<Array<{ prevI: number; prevJ: number; action: "MATCH" | "SKIP_TOOTH" | "SKIP_CLUSTER" } | null>> =
    Array.from({ length: M + 1 }, () => new Array(N + 1).fill(null));

  dp[0]![0] = 0;

  // Base case: skipping canonical teeth when 0 clusters are matched
  for (let j = 1; j <= N; j++) {
    const toothExpected = canonicalMap[j - 1]!.expectedArcMm;
    const isGap = isPositionCoveredByGap(toothExpected, gaps);
    const skipCost = isGap ? options.gapSupportedMissingPenalty : options.unsupportedMissingPenalty;
    dp[0]![j] = dp[0]![j - 1]! + skipCost;
    back[0]![j] = { prevI: 0, prevJ: j - 1, action: "SKIP_TOOTH" };
  }

  // Base case: skipping clusters when 0 canonical teeth are matched (spurious clusters)
  for (let i = 1; i <= M; i++) {
    dp[i]![0] = dp[i - 1]![0]! + options.unmatchedClusterPenalty;
    back[i]![0] = { prevI: i - 1, prevJ: 0, action: "SKIP_CLUSTER" };
  }

  // Fill DP table
  for (let i = 1; i <= M; i++) {
    const cluster = clusters[i - 1]!;
    const clusterS = cluster.archArcLengthMm;
    const clusterWidth = cluster.estimatedMesiodistalMm;

    for (let j = 1; j <= N; j++) {
      const tooth = canonicalMap[j - 1]!;
      const expectedS = tooth.expectedArcMm;
      const canonicalWidth = tooth.spec.canonicalWidthMm;

      // Option A: Skip tooth j (Tooth j is MISSING / Edentulous)
      const isGap = isPositionCoveredByGap(expectedS, gaps);
      const skipToothCost = isGap ? options.gapSupportedMissingPenalty : options.unsupportedMissingPenalty;
      let minCost = dp[i]![j - 1]! + skipToothCost;
      let bestMove: { prevI: number; prevJ: number; action: "MATCH" | "SKIP_TOOTH" | "SKIP_CLUSTER" } = {
        prevI: i,
        prevJ: j - 1,
        action: "SKIP_TOOTH",
      };

      // Option B: Skip cluster i (Cluster is noise/osteophyte)
      const skipClusterCost = dp[i - 1]![j]! + options.unmatchedClusterPenalty;
      if (skipClusterCost < minCost) {
        minCost = skipClusterCost;
        bestMove = { prevI: i - 1, prevJ: j, action: "SKIP_CLUSTER" };
      }

      // Option C: Match cluster i with tooth j
      const distError = Math.abs(clusterS - expectedS);
      const widthError = Math.abs(clusterWidth - canonicalWidth);

      // Discrepancy penalty
      let matchCost = distError * 1.2 + widthError * 0.8;

      // If cluster is an implant fixture, match penalty is zeroed for material divergence
      if (cluster.classification === "IMPLANT_FIXTURE") {
        matchCost = distError * 0.9;
      }

      const totalMatchCost = dp[i - 1]![j - 1]! + matchCost;
      if (totalMatchCost < minCost) {
        minCost = totalMatchCost;
        bestMove = { prevI: i - 1, prevJ: j - 1, action: "MATCH" };
      }

      dp[i]![j] = minCost;
      back[i]![j] = bestMove;
    }
  }

  // 4. Backtrack optimal alignment path
  let currI = M;
  let currJ = N;
  const matchMap = new Map<number, number>(); // canonicalIndex (0..15) -> clusterIndex (0..M-1)

  while (currI > 0 || currJ > 0) {
    const move = back[currI]![currJ]!;
    if (!move) break;

    if (move.action === "MATCH") {
      matchMap.set(currJ - 1, currI - 1);
      currI = move.prevI;
      currJ = move.prevJ;
    } else if (move.action === "SKIP_TOOTH") {
      currJ = move.prevJ;
    } else if (move.action === "SKIP_CLUSTER") {
      currI = move.prevI;
    }
  }

  // 5. Build final AlignedFdiTooth list (exactly 16 teeth)
  const resultTeeth: AlignedFdiTooth[] = [];
  let presentCount = 0;
  let missingCount = 0;
  let implantCount = 0;
  let restorationCount = 0;
  let sumScore = 0;

  for (let j = 0; j < N; j++) {
    const { spec, expectedArcMm } = canonicalMap[j]!;
    const matchedIdx = matchMap.get(j);

    if (matchedIdx !== undefined) {
      const cluster = clusters[matchedIdx]!;
      const deviation = Math.abs(cluster.archArcLengthMm - expectedArcMm);
      let status: FdiToothStatus = "PRESENT_NATURAL";
      let confidence = Math.max(0.6, 1.0 - deviation / 15.0);
      const warnings: string[] = [];

      if (cluster.classification === "IMPLANT_FIXTURE") {
        status = "IMPLANT";
        implantCount++;
        warnings.push("Дентальный имплантат: обнаружен металлический сердечник высокой рентгеноконтрастности.");
      } else if (cluster.classification === "METAL_CROWN_OR_FILLING") {
        status = "METAL_RESTORED";
        restorationCount++;
        warnings.push("Рентгеноконтрастная коронка или реставрация.");
      } else {
        presentCount++;
      }

      if (deviation > 4.5) {
        warnings.push(`Анатомическое отклонение: позиция зуба смещена на ${deviation.toFixed(1)} мм от нормы (скученность/дигисценция).`);
      }

      resultTeeth.push({
        fdiNumber: spec.fdiNumber,
        nameRu: spec.nameRu,
        status,
        centroidWorld: cluster.centroidWorld,
        archArcLengthMm: cluster.archArcLengthMm,
        archNormalizedU: cluster.archNormalizedU,
        matchedClusterId: cluster.id,
        mesiodistalWidthMm: cluster.estimatedMesiodistalMm,
        canonicalWidthMm: spec.canonicalWidthMm,
        deviationMm: deviation,
        confidence: Number(confidence.toFixed(2)),
        warnings,
      });

      sumScore += Math.max(0, 100 - deviation * 8);
    } else {
      // Missing tooth (Adentia / Extracted / Gap)
      missingCount++;
      const frame = frameAtArcLength(arch, expectedArcMm);
      const isGap = isPositionCoveredByGap(expectedArcMm, gaps);
      const warnings: string[] = isGap
        ? ["Адентия: подтвержден дефект зубного ряда (беззубый промежуток)."]
        : ["Зуб не обнаружен в коронковом ряду (возможна ретенция, дистопия или экстракция)."];

      resultTeeth.push({
        fdiNumber: spec.fdiNumber,
        nameRu: spec.nameRu,
        status: "MISSING",
        centroidWorld: frame.point,
        archArcLengthMm: expectedArcMm,
        archNormalizedU: frame.u,
        matchedClusterId: null,
        mesiodistalWidthMm: 0,
        canonicalWidthMm: spec.canonicalWidthMm,
        deviationMm: 0,
        confidence: isGap ? 0.95 : 0.82,
        warnings,
      });

      sumScore += isGap ? 90 : 70;
    }
  }

  const overallMatchScore = Number((sumScore / 16).toFixed(1));

  return {
    jaw,
    teeth: resultTeeth,
    presentCount,
    missingCount,
    implantCount,
    restorationCount,
    overallMatchScore,
    detectedMidlineArcMm: midlineArcMm,
    totalArchLengthMm: arch.totalLengthMm,
  };
}
