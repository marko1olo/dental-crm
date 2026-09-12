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

import { buildUniformCurve, type Point2 } from "./cprMath.js";

export type Vec3 = [number, number, number];

// ── 3D Vector Math Primitives ──────────────────────────────────

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function len3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function normalize3(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

// ── Analytical 3D Distance Primitives ──────────────────────────

/**
 * Shortest Euclidean distance from point p to line segment [a, b] in 3D (mm).
 */
export function distPointToSegment3(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub3(b, a);
  const len2 = dot3(ab, ab);
  let t = len2 > 0 ? dot3(sub3(p, a), ab) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const c: Vec3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  return Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
}

/**
 * Shortest Euclidean distance between two 3D line segments [p1, q1] and [p2, q2] in mm.
 * Analytical solution with clamped parameter space (s, t) in [0, 1] x [0, 1].
 * Correctly handles skew, parallel, collinear, and degenerate (single point) segments.
 */
export function distSegmentToSegment3(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
  const d1 = sub3(q1, p1);
  const d2 = sub3(q2, p2);
  const r = sub3(p1, p2);
  const a = dot3(d1, d1);
  const e = dot3(d2, d2);
  const f = dot3(d2, r);
  const EPS = 1e-9;

  let s: number;
  let t: number;

  if (a <= EPS && e <= EPS) {
    // Both segments degenerate to points
    return Math.hypot(r[0], r[1], r[2]);
  }

  if (a <= EPS) {
    // Segment 1 is a point
    s = 0;
    t = Math.max(0, Math.min(1, f / e));
  } else {
    const c = dot3(d1, r);
    if (e <= EPS) {
      // Segment 2 is a point
      t = 0;
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = dot3(d1, d2);
      const denom = a * e - b * b;

      s = denom > EPS ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;

      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }

  const c1: Vec3 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
  const c2: Vec3 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

/**
 * Shortest Euclidean distance between segment [a, b] and an anatomical 3D polyline.
 * Evaluates all consecutive line segments along the polyline.
 */
export function distSegmentToPolyline3(a: Vec3, b: Vec3, poly: Vec3[]): number {
  if (poly.length === 0) return Infinity;
  const first = poly[0]!;
  if (poly.length === 1) return distPointToSegment3(first, a, b);

  let min = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const pA = poly[i]!;
    const pB = poly[i + 1]!;
    const d = distSegmentToSegment3(a, b, pA, pB);
    if (d < min) min = d;
  }
  return min;
}

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

// ── Resection Plane Intersection & Chord Slicing Math ──────────

export interface PlaneFrame {
  /** Plane origin in world mm */
  origin: Vec3;
  /** In-plane horizontal unit axis */
  eU: Vec3;
  /** In-plane vertical unit axis (pointing up) */
  eV: Vec3;
}

export interface ImplantBody {
  entry: Vec3;
  axis: Vec3; // Unit vector toward apex
  diameter: number;
  length: number;
}

/**
 * Project a 3D world coordinate onto a 2D plane: returns [u, v, w],
 * where u is horizontal in-plane, v is vertical in-plane, and w is signed distance to plane.
 */
export function projectToPlane(p: Vec3, frame: PlaneFrame): [number, number, number] {
  const rel = sub3(p, frame.origin);
  const n = cross3(frame.eU, frame.eV);
  return [dot3(rel, frame.eU), dot3(rel, frame.eV), dot3(rel, n)];
}

/**
 * Anatomical radius profile multiplier along the implant axis (0 = platform, 1 = apex).
 * Matches realistic tapered implant geometry:
 * - Coronal collar (0.00..0.14): 100% radius
 * - Tapered body (0.14..0.90): linear taper down to 64% radius
 * - Rounded apex dome (0.90..1.00): spherical taper 0.64 * sqrt(1 - a^2)
 */
export function radiusProfile(t01: number): number {
  if (t01 <= 0.14) return 1.0;
  if (t01 <= 0.90) return 1.0 - 0.36 * ((t01 - 0.14) / 0.76);
  const a = (t01 - 0.90) / 0.10;
  return 0.64 * Math.sqrt(Math.max(0, 1 - a * a));
}

/**
 * Computes the exact closed 2D polygon resulting from slicing an implant body
 * with an arbitrary 2D resection plane.
 * For each axial disc along the implant axis, the resection plane cuts a chord of
 * half-width: hw = sqrt(r^2 - w^2), where w is the disc center's distance from the plane.
 *
 * Returns null if the implant does not intersect the resection plane.
 */
export function cylinderPlaneStrip(
  body: ImplantBody,
  frame: PlaneFrame,
  radiusFn: (t01: number) => number = () => 1.0,
  samples = 24,
): [number, number][] | null {
  const n = cross3(frame.eU, frame.eV);
  const R = body.diameter / 2;

  const au = dot3(body.axis, frame.eU);
  const av = dot3(body.axis, frame.eV);
  const len2d = Math.hypot(au, av);
  if (len2d < 1e-4) return null; // Axis perpendicular to plane

  const pu = -av / len2d;
  const pv = au / len2d;

  const rel0 = sub3(body.entry, frame.origin);
  const u0 = dot3(rel0, frame.eU);
  const v0 = dot3(rel0, frame.eV);
  const w0 = dot3(rel0, n);
  const dw = dot3(body.axis, n);

  const left: [number, number][] = [];
  const right: [number, number][] = [];
  let anyVisible = false;

  for (let i = 0; i <= samples; i++) {
    const t01 = i / samples;
    const t = t01 * body.length;
    const r = R * radiusFn(t01);
    const w = w0 + dw * t;
    const hwSq = r * r - w * w;
    const hw = hwSq > 0 ? Math.sqrt(hwSq) : 0;
    if (hw > 0.01) anyVisible = true;

    const u = u0 + au * t;
    const v = v0 + av * t;
    left.push([u - hw * pu, v - hw * pv]);
    right.push([u + hw * pu, v + hw * pv]);
  }

  if (!anyVisible) return null;
  return [...left, ...right.reverse()];
}

/**
 * Intersection strip of the implant body with a 2D plane using the realistic tapered profile.
 */
export function implantPlaneStrip(
  body: ImplantBody,
  frame: PlaneFrame,
  samples = 24,
): [number, number][] | null {
  return cylinderPlaneStrip(body, frame, radiusProfile, samples);
}

// ── Guided Surgery: Sleeve & Osteotomy Geometry ────────────────

export interface SleeveSpec {
  /** Sleeve inner guide hole working diameter in mm */
  diameter: number;
  /** Distance from sleeve bottom to implant platform in mm */
  offset: number;
  /** Sleeve cylindrical height in mm */
  height: number;
}

/**
 * Creates the drill sleeve cylindrical body coaxial with the implant.
 */
export function sleeveBody(implant: ImplantBody, sleeve: SleeveSpec): ImplantBody {
  const back = sleeve.offset + sleeve.height;
  const top: Vec3 = [
    implant.entry[0] - implant.axis[0] * back,
    implant.entry[1] - implant.axis[1] * back,
    implant.entry[2] - implant.axis[2] * back,
  ];
  return {
    entry: top,
    axis: implant.axis,
    diameter: sleeve.diameter,
    length: sleeve.height,
  };
}

/**
 * Computes osteotomy / drill axis world 3D segment from the sleeve top down to planned depth.
 */
export function drillSegment(
  implant: ImplantBody,
  sleeve: SleeveSpec,
  drillLength: number,
): [Vec3, Vec3] {
  const back = sleeve.offset + sleeve.height;
  const start: Vec3 = [
    implant.entry[0] - implant.axis[0] * back,
    implant.entry[1] - implant.axis[1] * back,
    implant.entry[2] - implant.axis[2] * back,
  ];
  const end: Vec3 = [
    implant.entry[0] + implant.axis[0] * drillLength,
    implant.entry[1] + implant.axis[1] * drillLength,
    implant.entry[2] + implant.axis[2] * drillLength,
  ];
  return [start, end];
}

// ── Arch Frame & Clinical Tilt Axis Math ───────────────────────

export interface ArchFrame {
  s: number;
  point: Point2;
  normal: Point2;
  tangent: Point2;
}

const curveCache = new WeakMap<Point2[], ReturnType<typeof buildUniformCurve>>();

function getCachedCurve(controlPoints: Point2[]) {
  let c = curveCache.get(controlPoints);
  if (!c) {
    c = buildUniformCurve(controlPoints, 500);
    curveCache.set(controlPoints, c);
  }
  return c;
}

/** Frame of the dental arch at normalized position s (0..1) */
export function archFrameAt(controlPoints: Point2[], s: number): ArchFrame | null {
  if (controlPoints.length < 2) return null;
  const { curve, normals } = getCachedCurve(controlPoints);
  if (curve.length < 2) return null;
  const idx = Math.round(Math.max(0, Math.min(1, s)) * (curve.length - 1));
  const normal = normals[idx] ?? [0, 1];
  const point = curve[idx] ?? [0, 0];
  return {
    s: idx / (curve.length - 1),
    point,
    normal,
    tangent: [normal[1], -normal[0]],
  };
}

/** Frame of the dental arch at the curve point nearest (in XY) to point p */
export function nearestArchFrame(controlPoints: Point2[], p: Point2): ArchFrame | null {
  if (controlPoints.length < 2) return null;
  const { curve, normals } = getCachedCurve(controlPoints);
  if (curve.length < 2) return null;

  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < curve.length; i++) {
    const cp = curve[i];
    if (!cp) continue;
    const dx = cp[0] - p[0];
    const dy = cp[1] - p[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }

  const normal = normals[best] ?? [0, 1];
  const point = curve[best] ?? [0, 0];
  return {
    s: best / (curve.length - 1),
    point,
    normal,
    tangent: [normal[1], -normal[0]],
  };
}

/**
 * Computes 3D apex unit direction from arch frame and two clinical angles:
 * - BL (buccolingual tilt): in cross-section plane (0 = apex down / lower jaw, 180 = apex up / upper jaw)
 * - MD (mesiodistal tilt): leans along arch tangent (visible on panoramic)
 */
export function implantAxis(frame: ArchFrame, angleBLDeg: number, angleMDDeg: number): Vec3 {
  const bl = (angleBLDeg * Math.PI) / 180;
  const md = (angleMDDeg * Math.PI) / 180;
  const sBL = Math.sin(bl);
  const cBL = Math.cos(bl);
  const sMD = Math.sin(md);
  const cMD = Math.cos(md);

  const n = sBL;
  const t = cBL * sMD;
  const z = -cBL * cMD;

  return [
    n * frame.normal[0] + t * frame.tangent[0],
    n * frame.normal[1] + t * frame.tangent[1],
    z,
  ];
}

/**
 * Resolves full 3D world entry -> apex segment of an implant from position and angles.
 */
export function implantWorldAxis(
  controlPoints: Point2[],
  imp: { position: Vec3; angleBLDeg: number; angleMDDeg: number; length: number },
): { entry: Vec3; apex: Vec3; axis: Vec3 } | null {
  const af = nearestArchFrame(controlPoints, [imp.position[0], imp.position[1]]);
  if (!af) return null;
  const axis = implantAxis(af, imp.angleBLDeg, imp.angleMDDeg);
  const apex: Vec3 = [
    imp.position[0] + axis[0] * imp.length,
    imp.position[1] + axis[1] * imp.length,
    imp.position[2] + axis[2] * imp.length,
  ];
  return { entry: imp.position, apex, axis };
}
