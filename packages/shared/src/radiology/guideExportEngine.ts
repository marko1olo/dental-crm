/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL RADIOLOGY & CBCT: SURGICAL GUIDE STL EXPORT & MESH SLICING ENGINE (WAVE 128)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical and geometric engine for 3D dental surgical guide manufacturing:
 *  1. Binary STL serialization with custom 80-byte header, analytical facet normals,
 *     and binary STL parser / round-trip validator.
 *  2. Mesh ∩ plane slicing (brute-force and BVH AABB-tree acceleration) for
 *     resecting 3D guide / jaw meshes across arbitrary CBCT cross-sectional planes.
 *  3. Sleeve seat planning, depth stops, and anchor pin channels for guided surgery.
 *  4. Dental 3D printer parameter validation (Formlabs / SprintRay / Phrozen)
 *     accounting for layer height, exposure, resin shrinkage compensation, and print time.
 *  5. Formal A4-printable 3D print manufacturing protocol generator (100% emoji-free).
 *
 * Adapted from DenCT core/guideExport.ts and core/meshSlice.ts references.
 * 100% pure TypeScript, zero DOM/VTK/WASM dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Vec3 } from "./cprMath.js";
import {
  dot3,
  cross3,
  sub3,
  add3,
  scale3,
  len3,
  normalize3,
} from "./cbctSafetyEngine.js";
import type {
  TriMesh,
  BoreCylinder,
  SleeveSeatPlan,
  SleeveSeatParams,
} from "./surgicalGuideGeom.js";
import {
  planSleeveSeat,
  meshVolume,
  isClosedOriented,
} from "./surgicalGuideGeom.js";
import {
  type BVHNode,
  type TriangleBVH,
  sliceTriangleAt,
  slicePlaneSegments,
  buildTriangleBVH,
  slicePlaneBVH,
} from "./cbctScanMeshEngine.js";

export type {
  Vec3,
  TriMesh,
  BoreCylinder,
  SleeveSeatPlan,
  SleeveSeatParams,
  BVHNode,
  TriangleBVH,
};

export {
  sliceTriangleAt,
  slicePlaneSegments,
  buildTriangleBVH,
  slicePlaneBVH,
};

// ── 1. STL / BINARY STL SERIALIZATION & PARSING ──────────────────

/**
 * Options for binary STL 80-byte header metadata.
 */
export interface BinarySTLHeaderOptions {
  title?: string | undefined;
  author?: string | undefined;
  software?: string | undefined;
  patientId?: string | undefined;
  date?: string | undefined;
  unit?: "mm" | "inch" | undefined;
}

/**
 * Result structure of binary STL analysis and generation.
 */
export interface BinarySTLResult {
  buffer: ArrayBuffer;
  triangleCount: number;
  byteLength: number;
  calculatedVolumeMm3: number;
  boundingBox: { min: Vec3; max: Vec3; dimensions: Vec3 };
}

/**
 * Serializes an indexed triangle mesh into standard Little-Endian Binary STL format.
 * Layout strictly adheres to standard binary STL specification:
 *  - 80-byte ASCII header padded with zeros
 *  - 4-byte uint32 little-endian triangle count (T)
 *  - 50 bytes per triangle:
 *      * Normal vector: 3x float32 (12 bytes) - normalized outward unit normal: (b - a) x (c - a)
 *      * Vertex 1 (a):  3x float32 (12 bytes)
 *      * Vertex 2 (b):  3x float32 (12 bytes)
 *      * Vertex 3 (c):  3x float32 (12 bytes)
 *      * Attribute:     1x uint16  (2 bytes, zeroed)
 * Total buffer byte length = 84 + T * 50.
 */
export function triMeshToBinarySTL(
  mesh: TriMesh,
  options?: BinarySTLHeaderOptions,
): ArrayBuffer {
  const idx = mesh.indices;
  const p = mesh.positions;
  const nTri = Math.floor(idx.length / 3);

  const buf = new ArrayBuffer(84 + nTri * 50);
  const view = new DataView(buf);

  // Construct 80-byte header
  const title = options?.title ?? "DentalCRM Surgical Guide 3D Template";
  const software = options?.software ?? "DenteCAM Wave128";
  const headerStr = `${title} | ${software}`.slice(0, 80);
  const headerBytes = new Uint8Array(buf, 0, 80);
  for (let i = 0; i < headerStr.length; i++) {
    headerBytes[i] = headerStr.charCodeAt(i) & 0xff;
  }

  // 80: uint32 triangle count (little-endian)
  view.setUint32(80, nTri, true);

  let o = 84;
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

    // Facet normal = normalize((b - a) x (c - a))
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;

    // Normal vector (12 bytes)
    view.setFloat32(o, nx, true);
    view.setFloat32(o + 4, ny, true);
    view.setFloat32(o + 8, nz, true);

    // Vertex 1 (12 bytes)
    view.setFloat32(o + 12, ax, true);
    view.setFloat32(o + 16, ay, true);
    view.setFloat32(o + 20, az, true);

    // Vertex 2 (12 bytes)
    view.setFloat32(o + 24, bx, true);
    view.setFloat32(o + 28, by, true);
    view.setFloat32(o + 32, bz, true);

    // Vertex 3 (12 bytes)
    view.setFloat32(o + 36, cx, true);
    view.setFloat32(o + 40, cy, true);
    view.setFloat32(o + 44, cz, true);

    // Attribute byte count (2 bytes)
    view.setUint16(o + 48, 0, true);

    o += 50;
  }

  return buf;
}

/**
 * Serializes a raw triangle soup [ax, ay, az, bx, by, bz, cx, cy, cz, ...] into Binary STL.
 */
export function triangleSoupToBinarySTL(
  tris: Float32Array | number[],
  options?: BinarySTLHeaderOptions,
): ArrayBuffer {
  const nFloats = tris.length;
  const nTri = Math.floor(nFloats / 9);
  const buf = new ArrayBuffer(84 + nTri * 50);
  const view = new DataView(buf);

  const title = options?.title ?? "DentalCRM Mesh Triangle Soup STL";
  const headerBytes = new Uint8Array(buf, 0, 80);
  for (let i = 0; i < Math.min(title.length, 80); i++) {
    headerBytes[i] = title.charCodeAt(i) & 0xff;
  }

  view.setUint32(80, nTri, true);

  let o = 84;
  for (let i = 0; i + 8 < nFloats; i += 9) {
    const ax = tris[i]!;
    const ay = tris[i + 1]!;
    const az = tris[i + 2]!;
    const bx = tris[i + 3]!;
    const by = tris[i + 4]!;
    const bz = tris[i + 5]!;
    const cx = tris[i + 6]!;
    const cy = tris[i + 7]!;
    const cz = tris[i + 8]!;

    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;

    view.setFloat32(o, nx, true);
    view.setFloat32(o + 4, ny, true);
    view.setFloat32(o + 8, nz, true);
    view.setFloat32(o + 12, ax, true);
    view.setFloat32(o + 16, ay, true);
    view.setFloat32(o + 20, az, true);
    view.setFloat32(o + 24, bx, true);
    view.setFloat32(o + 28, by, true);
    view.setFloat32(o + 32, bz, true);
    view.setFloat32(o + 36, cx, true);
    view.setFloat32(o + 40, cy, true);
    view.setFloat32(o + 44, cz, true);
    view.setUint16(o + 48, 0, true);
    o += 50;
  }

  return buf;
}

/**
 * Parses a standard Binary STL ArrayBuffer back into an indexed TriMesh.
 * Validates header length, triangle count, and non-truncated buffer size.
 */
export function parseBinarySTL(buffer: ArrayBuffer): {
  header: string;
  triangleCount: number;
  mesh: TriMesh;
  boundingBox: { min: Vec3; max: Vec3; dimensions: Vec3 };
} {
  if (buffer.byteLength < 84) {
    throw new Error(
      `Invalid binary STL buffer: byte length ${buffer.byteLength} is less than minimum header size (84 bytes).`,
    );
  }

  const view = new DataView(buffer);
  const headerBytes = new Uint8Array(buffer, 0, 80);
  let header = "";
  for (let i = 0; i < 80; i++) {
    const code = headerBytes[i]!;
    if (code >= 32 && code <= 126) {
      header += String.fromCharCode(code);
    }
  }

  const triangleCount = view.getUint32(80, true);
  const expectedBytes = 84 + triangleCount * 50;
  if (buffer.byteLength < expectedBytes) {
    throw new Error(
      `Truncated binary STL buffer: expected at least ${expectedBytes} bytes for ${triangleCount} triangles, got ${buffer.byteLength} bytes.`,
    );
  }

  const positions = new Float32Array(triangleCount * 9);
  const indices = new Uint32Array(triangleCount * 3);

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  let offset = 84;
  let posIdx = 0;
  let triIdx = 0;

  for (let t = 0; t < triangleCount; t++) {
    // skip normal (12 bytes)
    offset += 12;

    // 3 vertices
    for (let v = 0; v < 3; v++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      offset += 12;

      positions[posIdx++] = x;
      positions[posIdx++] = y;
      positions[posIdx++] = z;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    indices[triIdx] = triIdx;
    indices[triIdx + 1] = triIdx + 1;
    indices[triIdx + 2] = triIdx + 2;
    triIdx += 3;

    // skip attribute byte count (2 bytes)
    offset += 2;
  }

  const min: Vec3 = [minX, minY, minZ];
  const max: Vec3 = [maxX, maxY, maxZ];
  const dimensions: Vec3 = [maxX - minX, maxY - minY, maxZ - minZ];

  return {
    header: header.trim(),
    triangleCount,
    mesh: { positions, indices },
    boundingBox: { min, max, dimensions },
  };
}

/**
 * Computes the 3D axis-aligned bounding box of a TriMesh.
 */
export function computeMeshBoundingBox(mesh: TriMesh): {
  min: Vec3;
  max: Vec3;
  dimensions: Vec3;
} {
  const p = mesh.positions;
  if (p.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      dimensions: [0, 0, 0],
    };
  }

  let minX = p[0]!;
  let minY = p[1]!;
  let minZ = p[2]!;
  let maxX = minX;
  let maxY = minY;
  let maxZ = minZ;

  for (let i = 3; i < p.length; i += 3) {
    const x = p[i]!;
    const y = p[i + 1]!;
    const z = p[i + 2]!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    dimensions: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}

/**
 * Computes signed volume of an indexed mesh in mm^3 via the divergence theorem.
 */
export function computeMeshVolume(mesh: TriMesh): number {
  return meshVolume(mesh);
}

/**
 * Checks whether an indexed mesh is a closed, watertight 2-manifold.
 */
export function isWatertight2Manifold(mesh: TriMesh): boolean {
  return isClosedOriented(mesh);
}

/**
 * Exports a TriMesh as a binary STL Blob for browser downloads.
 */
export function exportSurgicalGuideStlBlob(
  mesh: TriMesh,
  options?: BinarySTLHeaderOptions,
): Blob {
  const buf = triMeshToBinarySTL(mesh, options);
  return new Blob([buf], { type: "model/stl" });
}

// ── 2. MESH ∩ PLANE SLICING EXTENSIONS ────────────────────────────

/**
 * Converts an indexed TriMesh into an unindexed triangle soup array.
 */
export function triMeshToSoup(mesh: TriMesh): Float32Array {
  const idx = mesh.indices;
  const p = mesh.positions;
  const soup = new Float32Array(idx.length * 3);
  let s = 0;
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i]! * 3;
    soup[s++] = p[v]!;
    soup[s++] = p[v + 1]!;
    soup[s++] = p[v + 2]!;
  }
  return soup;
}

/**
 * High-level helper: slices a TriMesh with a plane, optionally using an existing BVH.
 */
export function sliceMeshByPlane(
  mesh: TriMesh,
  planePoint: Vec3,
  planeNormal: Vec3,
  existingBvh?: TriangleBVH,
): [Vec3, Vec3][] {
  const soup = triMeshToSoup(mesh);
  const bvh = existingBvh ?? buildTriangleBVH(soup);
  return slicePlaneBVH(soup, bvh, planePoint, planeNormal);
}

/**
 * Chains unordered 3D line segments from plane slicing into continuous oriented polylines.
 * Handles floating-point vertex tolerance (default 0.02 mm).
 */
export function chainSegmentsIntoPolylines(
  segments: [Vec3, Vec3][],
  toleranceMm = 0.02,
): Vec3[][] {
  if (segments.length === 0) return [];

  const remaining = segments.map((s) => ({ a: s[0], b: s[1], used: false }));
  const polylines: Vec3[][] = [];
  const tolSq = toleranceMm * toleranceMm;

  const distSq = (p1: Vec3, p2: Vec3): number => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    const dz = p1[2] - p2[2];
    return dx * dx + dy * dy + dz * dz;
  };

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i]!.used) continue;

    remaining[i]!.used = true;
    const polyline: Vec3[] = [remaining[i]!.a, remaining[i]!.b];

    let extended = true;
    while (extended) {
      extended = false;
      const tail = polyline[polyline.length - 1]!;
      const head = polyline[0]!;

      // Try to extend forward from tail
      for (let j = 0; j < remaining.length; j++) {
        if (remaining[j]!.used) continue;
        const seg = remaining[j]!;
        if (distSq(tail, seg.a) <= tolSq) {
          polyline.push(seg.b);
          seg.used = true;
          extended = true;
          break;
        } else if (distSq(tail, seg.b) <= tolSq) {
          polyline.push(seg.a);
          seg.used = true;
          extended = true;
          break;
        }
      }

      // Try to extend backward from head
      for (let j = 0; j < remaining.length; j++) {
        if (remaining[j]!.used) continue;
        const seg = remaining[j]!;
        if (distSq(head, seg.b) <= tolSq) {
          polyline.unshift(seg.a);
          seg.used = true;
          extended = true;
          break;
        } else if (distSq(head, seg.a) <= tolSq) {
          polyline.unshift(seg.b);
          seg.used = true;
          extended = true;
          break;
        }
      }
    }

    polylines.push(polyline);
  }

  return polylines;
}

// ── 3. SLEEVE PARAMETERS, SEATING & ANCHOR PIN CHANNELS ──────────

export const sleeveStopTypeSchema = z.enum([
  "shoulder",
  "straight",
  "lateral_slot",
]);
export type SleeveStopType = z.infer<typeof sleeveStopTypeSchema>;

/**
 * Metal drill sleeve bushing specification.
 */
export interface SleeveSpecification {
  id: string;
  manufacturer: string;
  systemName: string;
  outerDiameterMm: number;
  innerDiameterMm: number;
  heightMm: number;
  flangeDiameterMm?: number | undefined;
  flangeHeightMm?: number | undefined;
}

/**
 * Input for planning an individual implant guide sleeve site.
 */
export interface ImplantSleeveSiteInput {
  implantId: string;
  toothFdi?: number | undefined;
  entry: Vec3;
  axis: Vec3;
  implantLengthMm: number;
  implantDiameterMm: number;
  sleeve: SleeveSpecification;
  sleeveOffsetMm: number;
  sleeveStopType?: SleeveStopType | undefined;
  wallThicknessMm?: number | undefined;
  seatClearanceMm?: number | undefined;
  drillChannelToleranceMm?: number | undefined;
  lateralSlotAngleDeg?: number | undefined;
}

/**
 * Planned sleeve seat details including mechanical stop and drill channels.
 */
export interface ImplantSleeveSitePlan {
  implantId: string;
  toothFdi?: number | undefined;
  entry: Vec3;
  axis: Vec3;
  implantLengthMm: number;
  implantDiameterMm: number;
  sleeve: SleeveSpecification;
  sleeveOffsetMm: number;
  sleeveStopType: SleeveStopType;
  seatClearanceMm: number;
  wallThicknessMm: number;
  drillChannelToleranceMm: number;
  // Computed parameters
  housingOuterRadiusMm: number;
  seatRadiusMm: number;
  drillChannelRadiusMm: number;
  sleeveTopZ: number;
  sleeveBottomZ: number;
  totalOsteotomyDepthMm: number;
  drillStopDistanceMm: number;
  lateralSlotAngleDeg?: number | undefined;
  seatCylinder: BoreCylinder;
  channelCylinder: BoreCylinder;
}

/**
 * Standard clinical extra drill penetration depth (mm) past implant apex.
 */
export const CLINICAL_DRILL_OVERSHOOT_MM = 2.0;

/**
 * Calculates complete sleeve seat and drill guidance parameters for an implant site.
 */
export function calculateSleeveSitePlan(
  input: ImplantSleeveSiteInput,
): ImplantSleeveSitePlan {
  const normAxis = normalize3(input.axis);
  const wallMm = input.wallThicknessMm ?? 1.5;
  const seatClearance = input.seatClearanceMm ?? 0.05;
  const channelTol = input.drillChannelToleranceMm ?? 0.1;
  const stopType = input.sleeveStopType ?? "shoulder";

  const sleeveTop = -(input.sleeveOffsetMm + input.sleeve.heightMm);
  const sleeveBottom = -input.sleeveOffsetMm;
  const seatRadius = input.sleeve.outerDiameterMm / 2 + seatClearance;
  const drillRadius = input.sleeve.innerDiameterMm / 2 + channelTol;
  const housingRadius = seatRadius + wallMm;

  // 3D position generator along axis: entry + axis * t
  const at = (t: number): Vec3 => [
    input.entry[0] + normAxis[0] * t,
    input.entry[1] + normAxis[1] * t,
    input.entry[2] + normAxis[2] * t,
  ];

  const OVERSHOOT = 2.0; // Break through the occlusal resin surface cleanly
  const seatCylinder: BoreCylinder = {
    a: at(sleeveTop - OVERSHOOT),
    b: at(sleeveBottom),
    radius: seatRadius,
  };

  const channelCylinder: BoreCylinder = {
    a: at(input.implantLengthMm + CLINICAL_DRILL_OVERSHOOT_MM),
    b: at(sleeveBottom),
    radius: drillRadius,
  };

  // Total osteotomy distance from the sleeve stop shoulder down to the bur tip (+2mm overshoot)
  const totalOsteotomyDepth =
    input.sleeveOffsetMm +
    input.implantLengthMm +
    CLINICAL_DRILL_OVERSHOOT_MM;

  // Required drill stop length on the physical bur (from handpiece collar/shoulder to bur tip)
  const drillStopDistance =
    input.sleeve.heightMm + input.sleeveOffsetMm + input.implantLengthMm;

  return {
    implantId: input.implantId,
    toothFdi: input.toothFdi,
    entry: input.entry,
    axis: normAxis,
    implantLengthMm: input.implantLengthMm,
    implantDiameterMm: input.implantDiameterMm,
    sleeve: input.sleeve,
    sleeveOffsetMm: input.sleeveOffsetMm,
    sleeveStopType: stopType,
    seatClearanceMm: seatClearance,
    wallThicknessMm: wallMm,
    drillChannelToleranceMm: channelTol,
    housingOuterRadiusMm: housingRadius,
    seatRadiusMm: seatRadius,
    drillChannelRadiusMm: drillRadius,
    sleeveTopZ: sleeveTop,
    sleeveBottomZ: sleeveBottom,
    totalOsteotomyDepthMm: totalOsteotomyDepth,
    drillStopDistanceMm: drillStopDistance,
    lateralSlotAngleDeg: input.lateralSlotAngleDeg,
    seatCylinder,
    channelCylinder,
  };
}

/**
 * Fixation anchor pin channel parameters.
 */
export interface AnchorPinChannel {
  id: string;
  type: "bone_anchor" | "palatal_pin" | "labial_pin";
  entryPoint: Vec3;
  direction: Vec3;
  pinDiameterMm: number;
  channelLengthMm: number;
  radialClearanceMm: number;
  sleeveLined: boolean;
  sleeveOuterDiameterMm?: number | undefined;
  wallThicknessMm: number;
  depthStopMm?: number | undefined;
  boreRadiusMm: number;
  housingOuterRadiusMm: number;
}

/**
 * Calculates fixation anchor pin channel parameters for template stabilization.
 */
export function calculateAnchorPinChannel(input: {
  id: string;
  type?: "bone_anchor" | "palatal_pin" | "labial_pin" | undefined;
  entryPoint: Vec3;
  direction: Vec3;
  pinDiameterMm?: number | undefined;
  channelLengthMm?: number | undefined;
  radialClearanceMm?: number | undefined;
  wallThicknessMm?: number | undefined;
  sleeveLined?: boolean | undefined;
  sleeveOuterDiameterMm?: number | undefined;
  depthStopMm?: number | undefined;
}): AnchorPinChannel {
  const pinD = input.pinDiameterMm ?? 1.5;
  const clearance = input.radialClearanceMm ?? 0.06;
  const wallMm = input.wallThicknessMm ?? 1.5;
  const sleeveLined = input.sleeveLined ?? false;

  let boreRadius = pinD / 2 + clearance;
  if (sleeveLined && input.sleeveOuterDiameterMm) {
    boreRadius = input.sleeveOuterDiameterMm / 2 + clearance;
  }
  const housingOuterRadius = boreRadius + wallMm;

  return {
    id: input.id,
    type: input.type ?? "bone_anchor",
    entryPoint: input.entryPoint,
    direction: normalize3(input.direction),
    pinDiameterMm: pinD,
    channelLengthMm: input.channelLengthMm ?? 8.0,
    radialClearanceMm: clearance,
    sleeveLined,
    sleeveOuterDiameterMm: input.sleeveOuterDiameterMm,
    wallThicknessMm: wallMm,
    depthStopMm: input.depthStopMm,
    boreRadiusMm: boreRadius,
    housingOuterRadiusMm: housingOuterRadius,
  };
}

/**
 * Standard sleeve presets catalog for major implant systems.
 */
export const STANDARD_SLEEVE_PRESETS: Record<string, SleeveSpecification> = {
  universal_50: {
    id: "universal_50",
    manufacturer: "Universal Dental",
    systemName: "Universal 5.0mm Stepped Sleeve",
    outerDiameterMm: 5.0,
    innerDiameterMm: 4.2,
    heightMm: 5.0,
  },
  straumann_t_sleeve: {
    id: "straumann_t_sleeve",
    manufacturer: "Straumann",
    systemName: "Guided Surgery T-Sleeve ND/RC",
    outerDiameterMm: 5.0,
    innerDiameterMm: 4.0,
    heightMm: 5.0,
    flangeDiameterMm: 5.8,
    flangeHeightMm: 0.8,
  },
  mis_mguide: {
    id: "mis_mguide",
    manufacturer: "MIS Implants",
    systemName: "MGUIDE Surgical Sleeve",
    outerDiameterMm: 5.5,
    innerDiameterMm: 4.8,
    heightMm: 6.0,
  },
  nobel_guided: {
    id: "nobel_guided",
    manufacturer: "Nobel Biocare",
    systemName: "NobelGuide Guided Sleeve Regular",
    outerDiameterMm: 5.2,
    innerDiameterMm: 4.1,
    heightMm: 5.0,
  },
  osstem_oneguide: {
    id: "osstem_oneguide",
    manufacturer: "Osstem",
    systemName: "OneGuide Surgical Sleeve 5.0",
    outerDiameterMm: 5.0,
    innerDiameterMm: 4.5,
    heightMm: 5.0,
  },
  anchor_pin_bushing: {
    id: "anchor_pin_bushing",
    manufacturer: "Universal Dental",
    systemName: "Anchor Fixation Pin Bushing 1.5mm",
    outerDiameterMm: 2.5,
    innerDiameterMm: 1.6,
    heightMm: 8.0,
  },
};

// ── 4. 3D PRINTER PROFILES & VALIDATION (Formlabs / SprintRay / Phrozen)

export type DentalPrinterBrand =
  | "formlabs"
  | "sprintray"
  | "phrozen"
  | "asiga"
  | "creality";

export type DentalResinType =
  | "formlabs_surgical_guide"
  | "sprintray_surgical_guide"
  | "phrozen_dental_surgical_guide"
  | "nextdent_sg"
  | "harzlabs_dental_clear";

/**
 * 3D Printer hardware profile.
 */
export interface DentalPrinterProfile {
  brand: DentalPrinterBrand;
  model: string;
  technology: "SLA" | "DLP" | "LCD";
  xyResolutionUm: number;
  minLayerHeightMm: number;
  maxLayerHeightMm: number;
  defaultLayerHeightMm: number;
  recommendedTiltAngleDeg: { min: number; max: number; optimal: number };
  buildVolumeMm: { x: number; y: number; z: number };
}

/**
 * Dental photo-polymer resin curing and print parameters.
 */
export interface ResinPrintParameters {
  resinId: string;
  resinName: string;
  resinType: DentalResinType;
  layerHeightMm: number;
  normalExposureSec: number;
  bottomExposureSec: number;
  bottomLayersCount: number;
  linearShrinkagePct: { x: number; y: number; z: number };
  washSolvent: string;
  washDurationMinutes: number;
  postCuringTemperatureC: number;
  postCuringDurationMinutes: number;
  postCuringWavelengthNm: number;
  biocompatibilityClass: string;
}

/**
 * Pre-configured 3D printer hardware presets.
 */
export const DENTAL_PRINTER_PROFILES: Record<
  DentalPrinterBrand,
  DentalPrinterProfile
> = {
  formlabs: {
    brand: "formlabs",
    model: "Form 3B+ / Form 4B Medical",
    technology: "SLA",
    xyResolutionUm: 25,
    minLayerHeightMm: 0.025,
    maxLayerHeightMm: 0.1,
    defaultLayerHeightMm: 0.05,
    recommendedTiltAngleDeg: { min: 25, max: 60, optimal: 45 },
    buildVolumeMm: { x: 145, y: 145, z: 185 },
  },
  sprintray: {
    brand: "sprintray",
    model: "SprintRay Pro 55 S / Pro 2",
    technology: "DLP",
    xyResolutionUm: 55,
    minLayerHeightMm: 0.05,
    maxLayerHeightMm: 0.1,
    defaultLayerHeightMm: 0.05,
    recommendedTiltAngleDeg: { min: 30, max: 60, optimal: 40 },
    buildVolumeMm: { x: 105, y: 59, z: 200 },
  },
  phrozen: {
    brand: "phrozen",
    model: "Phrozen Sonic XL 4K 2022 Dental",
    technology: "LCD",
    xyResolutionUm: 52,
    minLayerHeightMm: 0.025,
    maxLayerHeightMm: 0.1,
    defaultLayerHeightMm: 0.05,
    recommendedTiltAngleDeg: { min: 30, max: 65, optimal: 45 },
    buildVolumeMm: { x: 120, y: 190, z: 200 },
  },
  asiga: {
    brand: "asiga",
    model: "Asiga MAX UV Dental",
    technology: "DLP",
    xyResolutionUm: 62,
    minLayerHeightMm: 0.025,
    maxLayerHeightMm: 0.1,
    defaultLayerHeightMm: 0.05,
    recommendedTiltAngleDeg: { min: 30, max: 60, optimal: 45 },
    buildVolumeMm: { x: 119, y: 67, z: 75 },
  },
  creality: {
    brand: "creality",
    model: "HALOT-MAGE PRO Dental",
    technology: "LCD",
    xyResolutionUm: 22.8,
    minLayerHeightMm: 0.025,
    maxLayerHeightMm: 0.1,
    defaultLayerHeightMm: 0.05,
    recommendedTiltAngleDeg: { min: 30, max: 60, optimal: 45 },
    buildVolumeMm: { x: 228, y: 128, z: 230 },
  },
};

/**
 * Pre-configured dental surgical guide photo-polymer resins.
 */
export const DENTAL_RESIN_PROFILES: Record<
  DentalResinType,
  ResinPrintParameters
> = {
  formlabs_surgical_guide: {
    resinId: "FL-SG-01",
    resinName: "Formlabs Surgical Guide Resin",
    resinType: "formlabs_surgical_guide",
    layerHeightMm: 0.05,
    normalExposureSec: 2.8,
    bottomExposureSec: 25.0,
    bottomLayersCount: 4,
    linearShrinkagePct: { x: 0.35, y: 0.35, z: 0.45 },
    washSolvent: "IPA >= 99%",
    washDurationMinutes: 15,
    postCuringTemperatureC: 60,
    postCuringDurationMinutes: 30,
    postCuringWavelengthNm: 405,
    biocompatibilityClass: "Class I (EN ISO 10993)",
  },
  sprintray_surgical_guide: {
    resinId: "SR-SG2-01",
    resinName: "SprintRay Surgical Guide 2",
    resinType: "sprintray_surgical_guide",
    layerHeightMm: 0.05,
    normalExposureSec: 2.2,
    bottomExposureSec: 20.0,
    bottomLayersCount: 4,
    linearShrinkagePct: { x: 0.3, y: 0.3, z: 0.4 },
    washSolvent: "IPA >= 99%",
    washDurationMinutes: 10,
    postCuringTemperatureC: 60,
    postCuringDurationMinutes: 20,
    postCuringWavelengthNm: 405,
    biocompatibilityClass: "Class I (FDA 510(k) / MDR)",
  },
  phrozen_dental_surgical_guide: {
    resinId: "PHZ-DSG-01",
    resinName: "Phrozen Dental Surgical Guide Resin",
    resinType: "phrozen_dental_surgical_guide",
    layerHeightMm: 0.05,
    normalExposureSec: 3.5,
    bottomExposureSec: 35.0,
    bottomLayersCount: 6,
    linearShrinkagePct: { x: 0.4, y: 0.4, z: 0.5 },
    washSolvent: "IPA >= 99%",
    washDurationMinutes: 12,
    postCuringTemperatureC: 60,
    postCuringDurationMinutes: 30,
    postCuringWavelengthNm: 405,
    biocompatibilityClass: "Class I Biocompatible",
  },
  nextdent_sg: {
    resinId: "ND-SG-01",
    resinName: "NextDent SG (Surgical Guide)",
    resinType: "nextdent_sg",
    layerHeightMm: 0.05,
    normalExposureSec: 2.5,
    bottomExposureSec: 28.0,
    bottomLayersCount: 5,
    linearShrinkagePct: { x: 0.32, y: 0.32, z: 0.42 },
    washSolvent: "IPA >= 99%",
    washDurationMinutes: 10,
    postCuringTemperatureC: 60,
    postCuringDurationMinutes: 30,
    postCuringWavelengthNm: 405,
    biocompatibilityClass: "Class I Medical Device",
  },
  harzlabs_dental_clear: {
    resinId: "HL-DCP-01",
    resinName: "Harz Labs Dental Clear PRO",
    resinType: "harzlabs_dental_clear",
    layerHeightMm: 0.05,
    normalExposureSec: 3.0,
    bottomExposureSec: 30.0,
    bottomLayersCount: 5,
    linearShrinkagePct: { x: 0.38, y: 0.38, z: 0.48 },
    washSolvent: "IPA >= 99%",
    washDurationMinutes: 15,
    postCuringTemperatureC: 60,
    postCuringDurationMinutes: 30,
    postCuringWavelengthNm: 405,
    biocompatibilityClass: "Class IIa (GOST R ISO 10993)",
  },
};

/**
 * Result of printer parameter validation and scale calculation.
 */
export interface PrinterValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  compensationApplied: {
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    effectiveLayerHeightMm: number;
    estimatedPrintTimeMinutes: number;
    estimatedResinVolumeMl: number;
  };
}

/**
 * Validates dental 3D printer parameters against resin curing limits,
 * computing resin shrinkage scale compensation and estimating print time/volume.
 */
export function validatePrinterAndResinSettings(
  printer: DentalPrinterProfile,
  resin: ResinPrintParameters,
  meshVolumeMm3 = 12000,
  guideHeightAlongZMm = 25.0,
): PrinterValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Layer thickness validation
  if (
    resin.layerHeightMm < printer.minLayerHeightMm ||
    resin.layerHeightMm > printer.maxLayerHeightMm
  ) {
    errors.push(
      `Высота слоя (${resin.layerHeightMm} мм) выходит за пределы возможностей принтера ${printer.model} (${printer.minLayerHeightMm} - ${printer.maxLayerHeightMm} мм).`,
    );
  }

  // 2. Exposure time validation
  if (printer.technology === "SLA") {
    // Laser based: standard range
    if (resin.normalExposureSec < 0.5 || resin.normalExposureSec > 10.0) {
      warnings.push(
        `Экспозиция (${resin.normalExposureSec} с) нетипична для SLA принтера.`,
      );
    }
  } else {
    // LCD / DLP: layer flash times
    if (resin.normalExposureSec < 1.0) {
      warnings.push(
        `Слишком короткая экспозиция (${resin.normalExposureSec} с) может привести к недополимеризации и расслоению шаблона.`,
      );
    } else if (resin.normalExposureSec > 8.0) {
      warnings.push(
        `Слишком длительная экспозиция (${resin.normalExposureSec} с) приведет к паразитной засветке и сужению шахт втулок.`,
      );
    }
  }

  if (resin.bottomExposureSec < resin.normalExposureSec * 4) {
    warnings.push(
      `Экспозиция базовых слоев (${resin.bottomExposureSec} с) недостаточна относительно нормальных слоев для надежной адгезии к платформе.`,
    );
  }

  // 3. Shrinkage compensation scale calculation: Scale = 1 + (ShrinkagePct / 100)
  const sx = 1 + resin.linearShrinkagePct.x / 100;
  const sy = 1 + resin.linearShrinkagePct.y / 100;
  const sz = 1 + resin.linearShrinkagePct.z / 100;

  if (sx < 1.0005 || sx > 1.03) {
    warnings.push(
      `Коэффициент усадки по оси X (${resin.linearShrinkagePct.x}%) выходит за типичные рамки стоматологических смол (0.1 - 2.5%).`,
    );
  }

  // 4. Estimation of print time and resin volume
  const layersCount = Math.ceil(guideHeightAlongZMm / resin.layerHeightMm);
  // Cycle time per layer ≈ exposure + peel/lift move (approx 8-12 seconds for DLP/LCD, 15 for SLA)
  const layerMoveOverheadSec = printer.technology === "SLA" ? 14 : 9;
  const totalSeconds =
    resin.bottomLayersCount *
      (resin.bottomExposureSec + layerMoveOverheadSec) +
    Math.max(0, layersCount - resin.bottomLayersCount) *
      (resin.normalExposureSec + layerMoveOverheadSec);
  const estimatedPrintTimeMinutes = Math.round(totalSeconds / 60);

  // Resin consumption: template volume + support structure overhead (approx 20%)
  const supportOverhead = 1.2;
  const estimatedResinVolumeMl =
    Math.round(((meshVolumeMm3 * supportOverhead) / 1000) * 10) / 10;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    compensationApplied: {
      scaleX: Math.round(sx * 10000) / 10000,
      scaleY: Math.round(sy * 10000) / 10000,
      scaleZ: Math.round(sz * 10000) / 10000,
      effectiveLayerHeightMm: resin.layerHeightMm,
      estimatedPrintTimeMinutes,
      estimatedResinVolumeMl,
    },
  };
}

// ── 5. FORMAL A4 PRINT PROTOCOL GENERATOR (0 Emojis, Mandate 8d #7) ─

/**
 * Inspection window definition for surgical template seating verification.
 */
export interface InspectionWindow {
  id: string;
  locationDescription: string;
  center: Vec3;
  normal: Vec3;
  widthMm: number;
  heightMm: number;
}

/**
 * Complete input for generating a formal surgical guide 3D-printing protocol.
 */
export interface Guide3DPrintProtocolInput {
  clinicName?: string | undefined;
  patientName?: string | undefined;
  patientId?: string | undefined;
  doctorName?: string | undefined;
  technicianName?: string | undefined;
  guideId: string;
  date?: string | undefined;
  printer: DentalPrinterProfile;
  resin: ResinPrintParameters;
  layerHeightMm?: number | undefined;
  tiltAngleDeg?: number | undefined;
  sleeveSites: ImplantSleeveSitePlan[];
  anchorPins?: AnchorPinChannel[] | undefined;
  inspectionWindows?: InspectionWindow[] | undefined;
  meshStats?:
    | {
        triangleCount: number;
        volumeMm3: number;
        dimensionsMm: Vec3;
      }
    | undefined;
  notes?: string[] | undefined;
}

/**
 * Formats a formal, publication-grade A4 manufacturing protocol for 3D printing
 * of the surgical navigation template.
 * Strictly compliant with Mandate 8d #7: strictly zero cartoon emojis.
 */
export function formatGuide3DPrintProtocol(
  input: Guide3DPrintProtocolInput,
): string {
  const clinic = input.clinicName?.trim() || "Стоматологическая клиника";
  const patient = input.patientName?.trim() || "Не указан";
  const doctor =
    input.doctorName?.trim() || "Врач-стоматолог хирург-имплантолог";
  const technician =
    input.technicianName?.trim() || "Зубной техник / CAD-CAM оператор";
  const dateStr = input.date?.trim() || new Date().toISOString().slice(0, 10);
  const tilt =
    input.tiltAngleDeg ?? input.printer.recommendedTiltAngleDeg.optimal;
  const layerH = input.layerHeightMm ?? input.resin.layerHeightMm;

  const validation = validatePrinterAndResinSettings(
    input.printer,
    { ...input.resin, layerHeightMm: layerH },
    input.meshStats?.volumeMm3 ?? 12000,
    input.meshStats?.dimensionsMm[2] ?? 28.0,
  );

  const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);
  const f2 = (x: number): string => (Math.round(x * 100) / 100).toFixed(2);
  const f4 = (x: number): string => (Math.round(x * 10000) / 10000).toFixed(4);

  const lines: string[] = [
    "================================================================================",
    "            ТЕХНОЛОГИЧЕСКИЙ ПРОТОКОЛ 3D-ПЕЧАТИ ХИРУРГИЧЕСКОГО ШАБЛОНА           ",
    "               (DENTAL SURGICAL GUIDE 3D PRINTING PROTOCOL)                     ",
    "================================================================================",
    "",
    `Медицинская организация : ${clinic}`,
    `Пациент                 : ${patient}${input.patientId ? ` (ID: ${input.patientId})` : ""}`,
    `Идентификатор шаблона   : ${input.guideId}`,
    `Лечащий врач-хирург     : ${doctor}`,
    `Оператор 3D-печати      : ${technician}`,
    `Дата формирования       : ${dateStr}`,
    "Нормативный базис       : ГОСТ Р ИСО 10993 / Приказ МЗ РФ 804н / СанПиН 3.3686-21",
    "",
    "--------------------------------------------------------------------------------",
    "1. ПАРАМЕТРЫ 3D-ПРИНТЕРА И ФОТОПОЛИМЕРНОЙ СМОЛЫ",
    "--------------------------------------------------------------------------------",
    `Оборудование            : ${input.printer.brand.toUpperCase()} - ${input.printer.model} (${input.printer.technology})`,
    `Разрешение по XY        : ${input.printer.xyResolutionUm} мкм`,
    `Рабочее поле (XYZ)      : ${input.printer.buildVolumeMm.x} x ${input.printer.buildVolumeMm.y} x ${input.printer.buildVolumeMm.z} мм`,
    `Фотополимерная смола    : ${input.resin.resinName} [${input.resin.resinId}]`,
    `Класс биосовместимости  : ${input.resin.biocompatibilityClass}`,
    `Экспозиция нормал. слоя : ${f2(input.resin.normalExposureSec)} с`,
    `Экспозиция базовых слоев: ${f1(input.resin.bottomExposureSec)} с (кол-во слоев: ${input.resin.bottomLayersCount})`,
    "",
    "--------------------------------------------------------------------------------",
    "2. ОРИЕНТАЦИЯ, СЛОЙ И КОМПЕНСАЦИЯ УСАДКИ",
    "--------------------------------------------------------------------------------",
    `Толщина печатного слоя  : ${f4(layerH)} мм (${Math.round(layerH * 1000)} мкм)`,
    `Угол наклона в камере   : ${f1(tilt)} град. (рекомендовано: ${input.printer.recommendedTiltAngleDeg.min}-${input.printer.recommendedTiltAngleDeg.max} град.)`,
    `Линейная усадка смолы   : X: ${f2(input.resin.linearShrinkagePct.x)}% | Y: ${f2(input.resin.linearShrinkagePct.y)}% | Z: ${f2(input.resin.linearShrinkagePct.z)}%`,
    `Масштаб компенсации     : X: ${f4(validation.compensationApplied.scaleX)} | Y: ${f4(validation.compensationApplied.scaleY)} | Z: ${f4(validation.compensationApplied.scaleZ)}`,
    `Расчетное время печати  : ~${validation.compensationApplied.estimatedPrintTimeMinutes} мин`,
    `Расход смолы (с подд.)  : ~${f1(validation.compensationApplied.estimatedResinVolumeMl)} мл`,
    "",
    "--------------------------------------------------------------------------------",
    "3. СПЕЦИФИКАЦИЯ НАПРАВЛЯЮЩИХ ВТУЛОК И ШАХТ СВЕРЛЕНИЯ",
    "--------------------------------------------------------------------------------",
  ];

  if (input.sleeveSites.length === 0) {
    lines.push("Спланированные ложа имплантатов отсутствуют.");
  } else {
    for (let i = 0; i < input.sleeveSites.length; i++) {
      const s = input.sleeveSites[i]!;
      const toothLabel = s.toothFdi ? `Зуб FDI ${s.toothFdi}` : s.implantId;
      lines.push(
        `[Ложе #${i + 1}: ${toothLabel}] ${s.sleeve.manufacturer} ${s.sleeve.systemName}`,
      );
      lines.push(
        `   Гильза: Внешний D ${f2(s.sleeve.outerDiameterMm)} мм | Внутренний D ${f2(s.sleeve.innerDiameterMm)} мм | Высота H ${f2(s.sleeve.heightMm)} мм`,
      );
      lines.push(
        `   Шахта шаблона : Посадочный D ${f2(s.seatRadiusMm * 2)} мм (зазор +${f2(s.seatClearanceMm)} мм) | Канал сверла D ${f2(s.drillChannelRadiusMm * 2)} мм`,
      );
      lines.push(
        `   Толщина стенки: ${f2(s.wallThicknessMm)} мм | Офсет втулки: ${f1(s.sleeveOffsetMm)} мм | Тип упора: ${s.sleeveStopType}`,
      );
      lines.push(
        `   Глубина остеотомии (+2мм вылет): ${f1(s.totalOsteotomyDepthMm)} мм | Ограничитель сверла: ${f1(s.drillStopDistanceMm)} мм`,
      );
      if (s.lateralSlotAngleDeg !== undefined) {
        lines.push(
          `   Боковое окно введения сверла: открыто под углом ${f1(s.lateralSlotAngleDeg)} град.`,
        );
      }
    }
  }

  lines.push("");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("4. КАНАЛЫ ФИКСАЦИИ ШАБЛОНА (ANCHOR PINS) И СМОТРОВЫЕ ОКНА");
  lines.push("--------------------------------------------------------------------------------");

  if (!input.anchorPins || input.anchorPins.length === 0) {
    lines.push("Фиксационные пины не предусмотрены (опора на зубы/имплантаты).");
  } else {
    for (let i = 0; i < input.anchorPins.length; i++) {
      const pin = input.anchorPins[i]!;
      lines.push(
        `[Пин #${i + 1}: ${pin.id}] Тип: ${pin.type} | Диаметр: ${f1(pin.pinDiameterMm)} мм | Длина шахты: ${f1(pin.channelLengthMm)} мм`,
      );
      lines.push(
        `   Посадочный канал: D ${f2(pin.boreRadiusMm * 2)} мм | Наружный D: ${f2(pin.housingOuterRadiusMm * 2)} мм | Металл. втулка: ${pin.sleeveLined ? "Да" : "Нет"}`,
      );
    }
  }

  if (input.inspectionWindows && input.inspectionWindows.length > 0) {
    lines.push("");
    lines.push("Смотровые окна визуального контроля прилегания (Fit Windows):");
    for (let i = 0; i < input.inspectionWindows.length; i++) {
      const w = input.inspectionWindows[i]!;
      lines.push(
        `   Окно #${i + 1} [${w.locationDescription}]: ${f1(w.widthMm)} x ${f1(w.heightMm)} мм`,
      );
    }
  }

  lines.push("");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("5. РЕГЛАМЕНТ ПОСТОБРАБОТКИ И СТЕРИЛИЗАЦИИ");
  lines.push("--------------------------------------------------------------------------------");
  lines.push(`1. Промывка ультразвуком: ${input.resin.washSolvent}, ${input.resin.washDurationMinutes} мин (2 ванны: черновая 10 мин, чистовая 5 мин).`);
  lines.push("2. Сушка сжатым воздухом: полное удаление остатков растворителя из шахт втулок.");
  lines.push(`3. УФ-дополимеризация: камера 405 нм при температуре ${input.resin.postCuringTemperatureC}°C, время ${input.resin.postCuringDurationMinutes} мин.`);
  lines.push("4. Удаление поддержек: строго бокорезами снаружи. ЗАПРЕЩЕНЫ поддержки внутри направляющих шахт!");
  lines.push("5. Запрессовка гильз: ручной досылатель, контроль полной посадки на ступеньку упора.");
  lines.push("6. Дезинфекция/стерилизация: холодная химическая стерилизация (Опатол / Деконекс) или автоклав (по IFU смолы).");

  lines.push("");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("6. ЧЕК-ЛИСТ КОНТРОЛЯ КАЧЕСТВА И ПОДПИСИ");
  lines.push("--------------------------------------------------------------------------------");
  lines.push("[ ] Визуальная проверка геометрии: отсутствие пор, раковин и расслоений");
  lines.push("[ ] Контроль шахт: металлическая гильза входит с легким натягом до упора без люфта");
  lines.push("[ ] Примерка на гипсовой/полимерной мастер-модели: стабильная посадка без качания");
  lines.push("[ ] Проверка через смотровые окна: режущие края и бугры плотно соприкасаются с шаблоном");
  lines.push("");
  lines.push(`Врач-стоматолог хирург-имплантолог : ____________________ / ${doctor} /`);
  lines.push("");
  lines.push(`CAD/CAM оператор 3D-печати         : ____________________ / ${technician} /`);
  lines.push("");
  lines.push("М.П. Медицинской организации");
  lines.push("================================================================================");

  return lines.join("\n");
}
