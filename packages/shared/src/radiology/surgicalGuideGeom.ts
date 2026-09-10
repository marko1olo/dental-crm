/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL 3D SURGICAL GUIDE GEOMETRY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical triangle-mesh generators for 3D printed surgical drill guides:
 * - Indexed TriMesh representation with Float32Array coordinates & Uint32Array indices
 * - MeshBuilder: dynamic accumulator for watertight geometric primitives
 * - cylinderMesh: closed, oriented cylindrical sleeves & drill bores (CCW outward)
 * - sweptBarMesh: prism guide base bar swept along 3D dental arch centerline spline
 * - planSleeveSeat: stepped drill guide pocket with depth-stop shoulder
 * - meshVolume: signed resin volume via divergence theorem (Ostrogradsky-Gauss)
 * - isClosedOriented: strict 2-manifold watertight boundary verification
 *
 * 100% pure TypeScript, zero external DOM/WASM/VTK dependencies, unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  type Vec3,
  sub3,
  cross3,
  len3,
  normalize3,
} from "./cbctSafetyEngine.js";

/**
 * Standard indexed triangle mesh representation.
 */
export interface TriMesh {
  /** xyz per vertex, length 3·V */
  positions: Float32Array;
  /** 3 vertex indices per triangle, length 3·T */
  indices: Uint32Array;
}

/**
 * Cylinder segment: axis endpoints + radius.
 */
export interface BoreCylinder {
  a: Vec3;
  b: Vec3;
  radius: number;
}

/**
 * Stepped sleeve seat plan for guided osteotomy.
 */
export interface SleeveSeatPlan {
  /** Wide pocket the metal sleeve drops into (from the occlusal opening down). */
  seat: BoreCylinder;
  /** Narrow drill channel below the seat, continuing toward the apex. */
  channel: BoreCylinder;
  /** Housing outer radius (wall around the seat). */
  housingRadius: number;
  /** Axis parameter (mm from entry, +apical) of the seat floor the sleeve rests on. */
  shoulderT: number;
}

/**
 * Parameters for stepped sleeve seat generation.
 */
export interface SleeveSeatParams {
  /** Housing wall thickness around sleeve (mm) */
  wallMm: number;
  /** Radial fit clearance of sleeve outer diameter in seat (mm) */
  seatClearanceMm: number;
  /** Metal sleeve wall thickness (radial, mm) */
  sleeveWallMm: number;
  /** Extra drill channel tolerance (mm) */
  channelTolMm: number;
}

/**
 * Computes an arbitrary unit vector perpendicular to unit vector `w`.
 * Picks the axis least aligned with `w` to avoid degenerate cross products.
 */
export function anyPerp(w: Vec3): Vec3 {
  const ax: Vec3 = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  return normalize3(cross3(w, ax));
}

/**
 * Mutable accumulator that emits an indexed triangle mesh.
 * Rings push their vertices, then wire up triangles/quads by absolute index.
 */
export class MeshBuilder {
  private pos: number[] = [];
  private idx: number[] = [];

  /** Total number of vertices added so far. */
  get vertexCount(): number {
    return this.pos.length / 3;
  }

  /** Total number of triangles added so far. */
  get triangleCount(): number {
    return this.idx.length / 3;
  }

  /**
   * Add a 3D vertex position [x, y, z] and return its 0-based vertex index.
   */
  addVertex(p: Vec3): number {
    this.pos.push(p[0], p[1], p[2]);
    return this.pos.length / 3 - 1;
  }

  /**
   * Add a vertex by raw coordinates (x, y, z) and return its 0-based vertex index.
   */
  addVertexCoords(x: number, y: number, z: number): number {
    this.pos.push(x, y, z);
    return this.pos.length / 3 - 1;
  }

  /**
   * Add a single triangle with CCW vertex indices (a, b, c).
   */
  addTri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  /**
   * Quad a -> b -> c -> d (CCW) as two triangles: (a, b, c) and (a, c, d).
   */
  addQuad(a: number, b: number, c: number, d: number): void {
    this.idx.push(a, b, c, a, c, d);
  }

  /**
   * Add multiple raw positions at once.
   */
  addPositions(positions: ArrayLike<number>): void {
    for (let i = 0; i < positions.length; i++) {
      this.pos.push(positions[i]!);
    }
  }

  /**
   * Add multiple indices at once.
   */
  addIndices(indices: ArrayLike<number>): void {
    for (let i = 0; i < indices.length; i++) {
      this.idx.push(indices[i]!);
    }
  }

  /**
   * Build immutable TriMesh with TypedArrays.
   */
  build(): TriMesh {
    return {
      positions: new Float32Array(this.pos),
      indices: new Uint32Array(this.idx),
    };
  }
}

/**
 * Closed capped cylinder between world points `p0` and `p1` with `radius`.
 * `segments` (>= 3) sets the angular tessellation.
 * Outward-oriented (CCW outward normal).
 */
export function cylinderMesh(p0: Vec3, p1: Vec3, radius: number, segments = 48): TriMesh {
  const seg = Math.max(3, Math.floor(segments));
  const w = normalize3(sub3(p1, p0)); // cylinder axis
  const u = anyPerp(w);
  const v = normalize3(cross3(w, u)); // (u, v, w) right-handed orthonormal basis
  const b = new MeshBuilder();

  const ring0: number[] = [];
  const ring1: number[] = [];
  for (let k = 0; k < seg; k++) {
    const t = (k / seg) * Math.PI * 2;
    const dx = Math.cos(t) * radius;
    const dy = Math.sin(t) * radius;
    const off: Vec3 = [
      u[0] * dx + v[0] * dy,
      u[1] * dx + v[1] * dy,
      u[2] * dx + v[2] * dy,
    ];
    ring0.push(b.addVertex([p0[0] + off[0], p0[1] + off[1], p0[2] + off[2]]));
    ring1.push(b.addVertex([p1[0] + off[0], p1[1] + off[1], p1[2] + off[2]]));
  }
  const c0 = b.addVertex(p0);
  const c1 = b.addVertex(p1);

  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg;
    // Side: outward normal radial for CCW ring around +w
    b.addQuad(ring0[k]!, ring0[k1]!, ring1[k1]!, ring1[k]!);
    // Top cap (normal +w): fan center1 -> ring1
    b.addTri(c1, ring1[k]!, ring1[k1]!);
    // Bottom cap (normal -w): fan center0 -> ring0 reversed
    b.addTri(c0, ring0[k1]!, ring0[k]!);
  }
  return b.build();
}

/**
 * Rectangular-section prism swept along `centerline` (>= 2 world points).
 * The cross-section is `width` wide (horizontal, perpendicular to the forward tangent)
 * and `height` tall (along world Z).
 * End-capped, outward-oriented closed 2-manifold.
 */
export function sweptBarMesh(centerline: Vec3[], width: number, height: number): TriMesh {
  if (centerline.length < 2) {
    return { positions: new Float32Array(0), indices: new Uint32Array(0) };
  }
  const halfW = width / 2;
  const halfH = height / 2;
  const Z: Vec3 = [0, 0, 1];
  const b = new MeshBuilder();

  // Per-ring corners in CCW order around the forward tangent: with
  // r = normalize(Z x tangent), (r, Z, tangent) is right-handed, so the order
  // A(-r, -Z), B(+r, -Z), C(+r, +Z), D(-r, +Z) is CCW as seen from +tangent.
  const rings: number[][] = [];
  const n = centerline.length;
  for (let i = 0; i < n; i++) {
    const prev = centerline[Math.max(0, i - 1)]!;
    const next = centerline[Math.min(n - 1, i + 1)]!;
    let f = sub3(next, prev);
    const fl = len3(f);
    let fNorm = fl > 1e-9 ? normalize3(f) : ([1, 0, 0] as Vec3);
    let r = cross3(Z, fNorm);
    if (len3(r) < 1e-9) {
      r = [1, 0, 0]; // tangent parallel to Z (degenerate)
    }
    r = normalize3(r);
    const c = centerline[i]!;
    const corner = (sr: number, sz: number): Vec3 => [
      c[0] + r[0] * sr * halfW,
      c[1] + r[1] * sr * halfW,
      c[2] + sz * halfH,
    ];
    const A = b.addVertex(corner(-1, -1));
    const B = b.addVertex(corner(1, -1));
    const C = b.addVertex(corner(1, 1));
    const D = b.addVertex(corner(-1, 1));
    rings.push([A, B, C, D]);
  }

  // Sides: 4 quads between consecutive rings (same winding as cylinder).
  for (let i = 0; i < n - 1; i++) {
    const a = rings[i]!;
    const d = rings[i + 1]!;
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) % 4;
      b.addQuad(a[k]!, a[k1]!, d[k1]!, d[k]!);
    }
  }

  // Start cap (normal -tangent): reversed order.
  const s = rings[0]!;
  b.addQuad(s[0]!, s[3]!, s[2]!, s[1]!);

  // End cap (normal +tangent): forward order.
  const e = rings[n - 1]!;
  b.addQuad(e[0]!, e[1]!, e[2]!, e[3]!);

  return b.build();
}

/**
 * Signed volume of an indexed mesh via the divergence theorem (sum of signed
 * tetrahedra from origin). Positive for a closed, outward-oriented mesh.
 * Used for resin volume calculations and printability sanity checks.
 */
export function meshVolume(m: TriMesh): number {
  const p = m.positions;
  const idx = m.indices;
  let vol = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = (idx[t] ?? 0) * 3;
    const b = (idx[t + 1] ?? 0) * 3;
    const c = (idx[t + 2] ?? 0) * 3;
    const ax = p[a] ?? 0;
    const ay = p[a + 1] ?? 0;
    const az = p[a + 2] ?? 0;
    const bx = p[b] ?? 0;
    const by = p[b + 1] ?? 0;
    const bz = p[b + 2] ?? 0;
    const cx = p[c] ?? 0;
    const cy = p[c + 1] ?? 0;
    const cz = p[c + 2] ?? 0;
    vol +=
      (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) /
      6;
  }
  return vol;
}

/**
 * True iff every directed edge appears exactly once and has an opposite directed half-edge
 * that appears exactly once — i.e. the mesh is a closed, consistently-oriented 2-manifold.
 */
export function isClosedOriented(m: TriMesh): boolean {
  const idx = m.indices;
  if (idx.length === 0 || idx.length % 3 !== 0) return false;
  const seen = new Map<string, number>();

  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]!;
    const b = idx[t + 1]!;
    const c = idx[t + 2]!;
    const edges: [number, number][] = [
      [a, b],
      [b, c],
      [c, a],
    ];
    for (const [u, v] of edges) {
      const k = `${u}_${v}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
  }

  for (const [key, count] of seen) {
    if (count !== 1) return false; // directed edge repeated -> non-manifold / flipped
    const sep = key.indexOf("_");
    const u = key.slice(0, sep);
    const v = key.slice(sep + 1);
    const revKey = `${v}_${u}`;
    if (seen.get(revKey) !== 1) return false; // opposite half-edge missing -> boundary / open
  }

  return true;
}

/**
 * Plan a stepped sleeve seat along an implant axis so the 3D-printed guide accepts
 * a metal drill sleeve with outer diameter `sleeveOuterDiameter`:
 *
 *   ── occlusal opening ──┐  seat    Ø = outer + 2·clearance  (depth = sleeveHeight)
 *          shoulder  ─────┤  ← sleeve rests here (repeatable drill depth stop)
 *                         │  channel Ø = (outer − 2·sleeveWall) + 2·channelTol
 *                        apex
 *
 * `at(t) = entry + axis·t`; sleeve occupies the occlusal region (negative t,
 * above the implant platform).
 */
export function planSleeveSeat(
  entry: Vec3,
  axis: Vec3,
  implantLength: number,
  sleeveOuterDiameter: number,
  sleeveOffset: number,
  sleeveHeight: number,
  p: SleeveSeatParams,
): SleeveSeatPlan {
  const at = (t: number): Vec3 => [
    entry[0] + axis[0] * t,
    entry[1] + axis[1] * t,
    entry[2] + axis[2] * t,
  ];
  const OVERSHOOT = 2.0; // break occlusal surface so the pocket opens cleanly

  const sleeveTop = -(sleeveOffset + sleeveHeight); // most occlusal
  const sleeveBottom = -sleeveOffset;               // seat floor / depth stop shoulder
  const seatRadius = sleeveOuterDiameter / 2 + p.seatClearanceMm;
  const innerDiameter = Math.max(0.5, sleeveOuterDiameter - 2 * p.sleeveWallMm);
  const channelRadius = innerDiameter / 2 + p.channelTolMm;

  return {
    seat: {
      a: at(sleeveTop - OVERSHOOT),
      b: at(sleeveBottom),
      radius: seatRadius,
    },
    channel: {
      a: at(implantLength + 2.0),
      b: at(sleeveTop - OVERSHOOT),
      radius: channelRadius,
    },
    housingRadius: seatRadius + p.wallMm,
    shoulderT: sleeveBottom,
  };
}
