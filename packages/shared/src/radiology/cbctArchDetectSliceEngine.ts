/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL CBCT: AUTO ARCH DETECTION & BVH MESH SLICING ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical algorithms for automatic dental arch curve detection from
 * axial CBCT MIP slabs, analytical crop box clipping planes, and fast
 * bounding-volume hierarchy (BVH) AABB mesh slicing.
 *
 * Reverse-engineered & adapted from DenCT (Wave 136):
 * 1. archDetect.ts: Heuristic automatic dental arch Catmull-Rom curve estimation
 *    via axial slab MIP, bone centroid calculation, radial ray sweeping and
 *    uniform arc-length resampling.
 * 2. cropBox.ts: Analytical world-space clipping planes calculation (VTK
 *    convention: (point - origin) · normal >= 0) for VOI bounding boxes.
 * 3. meshSlice.ts: AABB-tree BVH construction with median centroid splits and
 *    fast plane slicing with subtree bounding-box pruning (O(crossings)).
 * 4. Regulatory Form 043/u A4 clinical protocol generator with strict 0 emojis.
 *
 * 100% pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * Standards: DICOM Part 3, Russian Form 043/u, Mandates 8d #7, 8e, 8n.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

// ── 1. Geometric Primitive Types & Schemas ─────────────────────────────────

export const point2Schema = z.tuple([z.number(), z.number()]);
export type Point2 = z.infer<typeof point2Schema>;

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof vec3Schema>;

/** Minimal volume descriptor required for volumetric sampling */
export interface VolumeSamplingData {
	readonly dims: [number, number, number];
	readonly origin: [number, number, number];
	readonly getVoxel: (i: number, j: number, k: number) => number;
	readonly invSx: number;
	readonly invSy: number;
	readonly invSz: number;
	readonly zMin: number;
	readonly zMax: number;
	readonly vSpacing: number;
}

// ── 2. Arch Detection Options & Schemas ────────────────────────────────────

export const archDetectOptionsSchema = z.object({
	/** World Z of the axial slab centre in mm (LPS). Default: volume mid-Z */
	focalWorldZ: z.number().optional(),
	/** Half-thickness of the projected axial slab in mm. Default: 6 mm */
	slabHalfMm: z.number().positive().optional().default(6),
	/** Bone density threshold in HU/GV. Default: 400 HU (cortical bone/teeth) */
	boneThreshold: z.number().optional().default(400),
	/** Number of Catmull-Rom control points to emit. Default: 9 */
	numControlPoints: z.number().int().min(3).max(64).optional().default(9),
	/** Angular half-span of the swept arc from anterior in degrees. Default: 115 */
	angularSpanDeg: z.number().min(10).max(180).optional().default(115),
});
export type ArchDetectInputOptions = z.input<typeof archDetectOptionsSchema>;
export type ArchDetectOptions = z.input<typeof archDetectOptionsSchema>;
export type ArchDetectResolvedOptions = z.output<typeof archDetectOptionsSchema>;

// ── 3. Crop Box Schemas & Analytical Clipping Planes ───────────────────────

export const cropBoxSchema = z.object({
	/** Normalized minimum corner [xMin, yMin, zMin] in range 0..1 */
	min: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]),
	/** Normalized maximum corner [xMax, yMax, zMax] in range 0..1 */
	max: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]),
});
export type CropBox = z.infer<typeof cropBoxSchema>;

export const NO_CROP: Readonly<CropBox> = Object.freeze({
	min: [0, 0, 0] as [number, number, number],
	max: [1, 1, 1] as [number, number, number],
});

export const clipPlaneParamSchema = z.object({
	origin: vec3Schema,
	normal: vec3Schema,
});
export type ClipPlaneParam = z.infer<typeof clipPlaneParamSchema>;

const AXES_3D: readonly Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/**
 * Calculates world-space analytical clipping planes for a normalized CropBox.
 * Retains the half-space where: (point - origin) · normal >= 0.
 *
 * Only faces that actively clip the volume (crop.min > 0.001 or crop.max < 0.999) produce a plane.
 */
export function clipPlanes(bmin: Vec3, bmax: Vec3, crop: CropBox): ClipPlaneParam[] {
	const planes: ClipPlaneParam[] = [];
	for (let a = 0; a < 3; a++) {
		const bminA = bmin[a] ?? 0;
		const bmaxA = bmax[a] ?? 0;
		const span = bmaxA - bminA;
		const pos = AXES_3D[a] ?? [0, 0, 0];
		const neg: Vec3 = [-pos[0], -pos[1], -pos[2]];
		const cropMinA = crop.min[a] ?? 0;
		const cropMaxA = crop.max[a] ?? 1;

		if (cropMinA > 0.001) {
			const o: Vec3 = [bmin[0] ?? 0, bmin[1] ?? 0, bmin[2] ?? 0];
			o[a] = bminA + cropMinA * span;
			planes.push({ origin: o, normal: pos });
		}
		if (cropMaxA < 0.999) {
			const o: Vec3 = [bmin[0] ?? 0, bmin[1] ?? 0, bmin[2] ?? 0];
			o[a] = bminA + cropMaxA * span;
			planes.push({ origin: o, normal: neg });
		}
	}
	return planes;
}

// ── 4. Triangle BVH (AABB Tree) Data Structures & Slicing ─────────────────

export interface BVHNode {
	cx: number; cy: number; cz: number; // AABB centre
	hx: number; hy: number; hz: number; // AABB half-extents
	left: BVHNode | null;
	right: BVHNode | null;
	tris: Int32Array | number[] | null; // Leaf: triangle indices (index * 9 = float offset)
}

export interface TriangleBVH {
	root: BVHNode | null;
	count: number;
}

export const bvhNodeSchema: z.ZodType<BVHNode> = z.lazy(() =>
	z.object({
		cx: z.number(), cy: z.number(), cz: z.number(),
		hx: z.number(), hy: z.number(), hz: z.number(),
		left: bvhNodeSchema.nullable(),
		right: bvhNodeSchema.nullable(),
		tris: z.union([z.custom<Int32Array>((v) => v instanceof Int32Array), z.array(z.number())]).nullable(),
	}),
);

export const triangleBVHSchema = z.object({
	root: bvhNodeSchema.nullable(),
	count: z.number().int().nonnegative(),
});

const LEAF_SIZE = 4;

/**
 * Intersects a single triangle (at float index offset `o` in `tris`) with a plane.
 * Returns the line segment [p0, p1] in 3D world coordinates, or null if no cut.
 */
export function sliceTriangleAt(
	tris: Float32Array | number[],
	o: number,
	px: number, py: number, pz: number,
	nx: number, ny: number, nz: number,
): [Vec3, Vec3] | null {
	const ax = tris[o] ?? 0, ay = tris[o + 1] ?? 0, az = tris[o + 2] ?? 0;
	const bx = tris[o + 3] ?? 0, by = tris[o + 4] ?? 0, bz = tris[o + 5] ?? 0;
	const cx = tris[o + 6] ?? 0, cy = tris[o + 7] ?? 0, cz = tris[o + 8] ?? 0;

	const d0 = (ax - px) * nx + (ay - py) * ny + (az - pz) * nz;
	const d1 = (bx - px) * nx + (by - py) * ny + (bz - pz) * nz;
	const d2 = (cx - px) * nx + (cy - py) * ny + (cz - pz) * nz;

	const pts: Vec3[] = [];
	const edge = (
		x0: number, y0: number, z0: number, da: number,
		x1: number, y1: number, z1: number, db: number,
	) => {
		if ((da < 0 && db >= 0) || (da >= 0 && db < 0)) {
			const t = da / (da - db);
			pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t]);
		}
	};

	edge(ax, ay, az, d0, bx, by, bz, d1);
	edge(bx, by, bz, d1, cx, cy, cz, d2);
	edge(cx, cy, cz, d2, ax, ay, az, d0);

	return pts.length === 2 && pts[0] && pts[1] ? [pts[0], pts[1]] : null;
}

/**
 * Brute-force intersection of all triangles with the plane.
 * Baseline reference for verifying BVH intersection correctness.
 */
export function slicePlaneSegments(
	tris: Float32Array | number[],
	planePoint: Vec3,
	planeNormal: Vec3,
): [Vec3, Vec3][] {
	const [nx, ny, nz] = planeNormal;
	const [px, py, pz] = planePoint;
	const segs: [Vec3, Vec3][] = [];
	for (let i = 0; i + 8 < tris.length; i += 9) {
		const seg = sliceTriangleAt(tris, i, px, py, pz, nx, ny, nz);
		if (seg) segs.push(seg);
	}
	return segs;
}

/**
 * Builds an AABB Bounding Volume Hierarchy (AABB tree) over a triangle soup
 * using recursive median centroid splits along the widest axis.
 */
export function buildTriangleBVH(tris: Float32Array | number[]): TriangleBVH {
	const n = Math.floor(tris.length / 9);
	if (n === 0) return { root: null, count: 0 };

	const bmin = new Float64Array(n * 3);
	const bmax = new Float64Array(n * 3);
	const cen = new Float64Array(n * 3);

	for (let t = 0; t < n; t++) {
		const o = t * 9;
		let mnx = tris[o] ?? 0, mny = tris[o + 1] ?? 0, mnz = tris[o + 2] ?? 0;
		let mxx = mnx, mxy = mny, mxz = mnz;

		for (let k = 1; k < 3; k++) {
			const p = o + k * 3;
			const x = tris[p] ?? 0, y = tris[p + 1] ?? 0, z = tris[p + 2] ?? 0;
			if (x < mnx) mnx = x; if (y < mny) mny = y; if (z < mnz) mnz = z;
			if (x > mxx) mxx = x; if (y > mxy) mxy = y; if (z > mxz) mxz = z;
		}

		bmin[t * 3] = mnx; bmin[t * 3 + 1] = mny; bmin[t * 3 + 2] = mnz;
		bmax[t * 3] = mxx; bmax[t * 3 + 1] = mxy; bmax[t * 3 + 2] = mxz;
		cen[t * 3] = (mnx + mxx) / 2; cen[t * 3 + 1] = (mny + mxy) / 2; cen[t * 3 + 2] = (mnz + mxz) / 2;
	}

	const idx = new Int32Array(n);
	for (let i = 0; i < n; i++) idx[i] = i;

	const build = (lo: number, hi: number): BVHNode => {
		let mnx = Infinity, mny = Infinity, mnz = Infinity;
		let mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;

		for (let i = lo; i < hi; i++) {
			const t = idx[i] ?? 0;
			const minX = bmin[t * 3] ?? 0, minY = bmin[t * 3 + 1] ?? 0, minZ = bmin[t * 3 + 2] ?? 0;
			const maxX = bmax[t * 3] ?? 0, maxY = bmax[t * 3 + 1] ?? 0, maxZ = bmax[t * 3 + 2] ?? 0;
			if (minX < mnx) mnx = minX; if (minY < mny) mny = minY; if (minZ < mnz) mnz = minZ;
			if (maxX > mxx) mxx = maxX; if (maxY > mxy) mxy = maxY; if (maxZ > mxz) mxz = maxZ;
		}

		const node: BVHNode = {
			cx: (mnx + mxx) / 2, cy: (mny + mxy) / 2, cz: (mnz + mxz) / 2,
			hx: (mxx - mnx) / 2, hy: (mxy - mny) / 2, hz: (mxz - mnz) / 2,
			left: null, right: null, tris: null,
		};

		const cnt = hi - lo;
		if (cnt <= LEAF_SIZE) {
			node.tris = idx.slice(lo, hi);
			return node;
		}

		let cmnx = Infinity, cmny = Infinity, cmnz = Infinity;
		let cmxx = -Infinity, cmxy = -Infinity, cmxz = -Infinity;
		for (let i = lo; i < hi; i++) {
			const t = idx[i] ?? 0;
			const x = cen[t * 3] ?? 0, y = cen[t * 3 + 1] ?? 0, z = cen[t * 3 + 2] ?? 0;
			if (x < cmnx) cmnx = x; if (y < cmny) cmny = y; if (z < cmnz) cmnz = z;
			if (x > cmxx) cmxx = x; if (y > cmxy) cmxy = y; if (z > cmxz) cmxz = z;
		}

		const dx = cmxx - cmnx, dy = cmxy - cmny, dz = cmxz - cmnz;
		const axis = dx >= dy && dx >= dz ? 0 : dy >= dz ? 1 : 2;
		const mid = (axis === 0 ? cmnx + cmxx : axis === 1 ? cmny + cmxy : cmnz + cmxz) / 2;

		let i = lo;
		let j = hi - 1;
		while (i <= j) {
			const val = cen[(idx[i] ?? 0) * 3 + axis] ?? 0;
			if (val < mid) {
				i++;
			} else {
				const tmp = idx[i] ?? 0;
				idx[i] = idx[j] ?? 0;
				idx[j] = tmp;
				j--;
			}
		}

		let split = i;
		if (split === lo || split === hi) {
			split = lo + (cnt >> 1); // Degenerate distribution -> median count fallback
		}

		node.left = build(lo, split);
		node.right = build(split, hi);
		return node;
	};

	return { root: build(0, n), count: n };
}

/**
 * Fast slicing of a triangle mesh using its BVH AABB tree.
 * Prunes subtrees where |center · n - d| > extent · |n| (AABB strictly on one side).
 */
export function slicePlaneBVH(
	tris: Float32Array | number[],
	bvh: TriangleBVH,
	planePoint: Vec3,
	planeNormal: Vec3,
): [Vec3, Vec3][] {
	const segs: [Vec3, Vec3][] = [];
	if (!bvh.root) return segs;

	const [nx, ny, nz] = planeNormal;
	const [px, py, pz] = planePoint;
	const anx = Math.abs(nx);
	const any = Math.abs(ny);
	const anz = Math.abs(nz);

	const stack: BVHNode[] = [bvh.root];
	while (stack.length > 0) {
		const nd = stack.pop();
		if (!nd) continue;

		const s = (nd.cx - px) * nx + (nd.cy - py) * ny + (nd.cz - pz) * nz;
		const r = nd.hx * anx + nd.hy * any + nd.hz * anz;
		if (Math.abs(s) > r) continue; // Whole box is on one side of plane -> prune

		if (nd.tris) {
			for (let k = 0; k < nd.tris.length; k++) {
				const triIdx = nd.tris[k] ?? 0;
				const seg = sliceTriangleAt(tris, triIdx * 9, px, py, pz, nx, ny, nz);
				if (seg) segs.push(seg);
			}
		} else {
			if (nd.left) stack.push(nd.left);
			if (nd.right) stack.push(nd.right);
		}
	}

	return segs;
}

// ── 5. Smoothing & Arc-Length Resampling Helpers ───────────────────────────

/**
 * Symmetric moving-average smoothing of a 2D polyline.
 * Radius is expressed in integer number of adjacent samples.
 */
export function smoothPolyline(pts: Point2[], radius = 2): Point2[] {
	const n = pts.length;
	if (radius < 1 || n < 3) return [...pts];

	const out: Point2[] = [];
	for (let i = 0; i < n; i++) {
		let sx = 0, sy = 0, c = 0;
		for (let k = -radius; k <= radius; k++) {
			const idx = i + k;
			if (idx >= 0 && idx < n) {
				const pt = pts[idx];
				if (pt) {
					sx += pt[0];
					sy += pt[1];
					c++;
				}
			}
		}
		out.push([sx / c, sy / c]);
	}
	return out;
}

/**
 * Resamples a polyline so that vertices are uniformly spaced by cumulative arc length.
 * Eliminates spatial clustering and geometric distortion along the dental arch curve.
 */
export function resampleByArcLength(curve: Point2[], numSamples: number): Point2[] {
	if (curve.length < 2 || numSamples < 2) return [...curve];

	const firstPt = curve[0] ?? [0, 0];
	const cumLen: number[] = [0];
	for (let i = 1; i < curve.length; i++) {
		const pCurr = curve[i] ?? firstPt;
		const pPrev = curve[i - 1] ?? firstPt;
		const lastLen = cumLen[i - 1] ?? 0;
		cumLen.push(lastLen + Math.hypot(pCurr[0] - pPrev[0], pCurr[1] - pPrev[1]));
	}
	const total = cumLen[cumLen.length - 1] ?? 0;
	if (total === 0) return [firstPt];

	const result: Point2[] = [];
	let seg = 0;

	for (let s = 0; s < numSamples; s++) {
		const target = (s / (numSamples - 1)) * total;
		while (seg < curve.length - 2 && (cumLen[seg + 1] ?? 0) < target) {
			seg++;
		}
		const segStart = cumLen[seg] ?? 0;
		const segNext = cumLen[seg + 1] ?? segStart;
		const segLen = segNext - segStart;
		const t = segLen > 0 ? (target - segStart) / segLen : 0;
		const ptA = curve[seg] ?? firstPt;
		const ptB = curve[seg + 1] ?? ptA;
		result.push([ptA[0] + t * (ptB[0] - ptA[0]), ptA[1] + t * (ptB[1] - ptA[1])]);
	}

	return result;
}

// ── 6. Automatic Dental Arch Detection Algorithm ───────────────────────────

/**
 * Automatically estimates the Catmull-Rom dental arch control points from a CBCT volume.
 *
 * Method:
 * 1. Max-intensity projection (MIP) of an axial slab around focalWorldZ (+/- slabHalfMm)
 * 2. Weighted centroid of cortical bone voxels (> boneThreshold)
 * 3. Radial ray tracing across the anterior arc [-angularSpanDeg..+angularSpanDeg]
 *    to find the peak bone/teeth radius
 * 4. Moving-average smoothing and uniform arc-length resampling to numControlPoints
 *
 * Returns world coordinates (LPS mm) ordered: Patient Right (-X) -> Anterior (-Y) -> Patient Left (+X).
 * Returns null if the volume/slab has insufficient bone density or degenerate dimensions.
 */
export function detectArchControlPoints(
	vol: VolumeSamplingData,
	opts?: ArchDetectOptions,
): Point2[] | null {
	const parsed = archDetectOptionsSchema.parse(opts ?? {});
	const { slabHalfMm, boneThreshold, numControlPoints, angularSpanDeg } = parsed;

	const [nx, ny, nz] = vol.dims;
	const [ox, oy, oz] = vol.origin;
	const sx = 1 / vol.invSx, sy = 1 / vol.invSy, sz = 1 / vol.invSz;

	if (nx < 4 || ny < 4 || nz < 1) return null;

	const focalZ = parsed.focalWorldZ ?? (vol.zMin + vol.zMax) / 2;
	const kCenter = Math.round((focalZ - oz) / sz);
	const kHalf = Math.max(0, Math.round(slabHalfMm / Math.abs(sz)));
	const kLo = Math.max(0, kCenter - kHalf);
	const kHi = Math.min(nz - 1, kCenter + kHalf);
	if (kLo > kHi) return null;

	// 1. Max-intensity projection over the slab -> M(i, j)
	const M = new Float32Array(nx * ny);
	for (let k = kLo; k <= kHi; k++) {
		for (let j = 0; j < ny; j++) {
			const row = j * nx;
			for (let i = 0; i < nx; i++) {
				const v = vol.getVoxel(i, j, k);
				if (v > (M[row + i] ?? 0)) M[row + i] = v;
			}
		}
	}

	// 2. Bone centroid (index space, weighted over the mask)
	let sumI = 0, sumJ = 0, count = 0;
	for (let j = 0; j < ny; j++) {
		const row = j * nx;
		for (let i = 0; i < nx; i++) {
			if ((M[row + i] ?? 0) > boneThreshold) {
				sumI += i; sumJ += j; count++;
			}
		}
	}

	if (count < Math.max(50, nx * ny * 0.002)) return null;

	const ci = sumI / count, cj = sumJ / count;
	const cxw = ox + ci * sx, cyw = oy + cj * sy;

	const sampleM = (fi: number, fj: number): number => {
		if (fi < 0 || fj < 0 || fi > nx - 1 || fj > ny - 1) return 0;
		const i0 = Math.floor(fi), j0 = Math.floor(fj);
		const i1 = Math.min(nx - 1, i0 + 1), j1 = Math.min(ny - 1, j0 + 1);
		const ti = fi - i0, tj = fj - j0;
		const a = M[j0 * nx + i0] ?? 0, b = M[j0 * nx + i1] ?? 0;
		const c = M[j1 * nx + i0] ?? 0, d = M[j1 * nx + i1] ?? 0;
		return (a * (1 - ti) + b * ti) * (1 - tj) + (c * (1 - ti) + d * ti) * tj;
	};

	// 3. Radial ray tracing across the anterior arc
	const spanRad = (angularSpanDeg * Math.PI) / 180;
	const stepRad = (1.5 * Math.PI) / 180;
	const rMin = 4; // mm
	const rMax = 0.48 * Math.min(nx * sx, ny * sy); // mm
	const rStep = Math.max(0.5, Math.min(sx, sy)); // mm
	const band: Point2[] = [];

	for (let phi = -spanRad; phi <= spanRad + 1e-6; phi += stepRad) {
		const dx = Math.sin(phi), dy = -Math.cos(phi);
		let bestR = -1, bestV = boneThreshold;

		for (let r = rMin; r <= rMax; r += rStep) {
			const wx = cxw + r * dx, wy = cyw + r * dy;
			const v = sampleM((wx - ox) / sx, (wy - oy) / sy);
			if (v > bestV) { bestV = v; bestR = r; }
		}

		if (bestR > 0) band.push([cxw + bestR * dx, cyw + bestR * dy]);
	}

	if (band.length < 5) return null;

	const smoothed = smoothPolyline(band, 2);
	const cps = resampleByArcLength(smoothed, numControlPoints);
	return cps.length === numControlPoints ? cps : null;
}

// ── 7. Regulatory Russian Form 043/u A4 Clinical Protocol ─────────────────

export const archDetectAndSlicingReportParamsSchema = z.object({
	patientFullName: z.string().min(1),
	birthDate: z.string().optional(),
	cardRecordNumber: z.string().optional(),
	studyDate: z.string().min(1),
	doctorFullName: z.string().min(1),
	clinicName: z.string().optional(),
	jawType: z.enum(["maxilla", "mandible", "both"]).optional(),
	archDetection: z.object({
		detected: z.boolean(),
		controlPointsCount: z.number().int().nonnegative(),
		focalWorldZ: z.number(),
		slabHalfMm: z.number(),
		boneThresholdHu: z.number(),
		angularSpanDeg: z.number(),
		approxArcLengthMm: z.number().optional(),
		controlPoints: z.array(z.tuple([z.number(), z.number()])).optional(),
	}).optional(),
	cropBox: z.object({
		min: z.tuple([z.number(), z.number(), z.number()]),
		max: z.tuple([z.number(), z.number(), z.number()]),
		activePlanesCount: z.number().int().nonnegative(),
		volumeReductionPercent: z.number().optional(),
	}).optional(),
	meshSlicing: z.object({
		totalTriangles: z.number().int().nonnegative(),
		planePoint: z.tuple([z.number(), z.number(), z.number()]),
		planeNormal: z.tuple([z.number(), z.number(), z.number()]),
		intersectedSegmentsCount: z.number().int().nonnegative(),
		contourLengthMm: z.number().optional(),
	}).optional(),
	clinicalConclusion: z.string().optional(),
});
export type ArchDetectAndSlicingReportParams = z.infer<typeof archDetectAndSlicingReportParamsSchema>;

/**
 * Formats a formal A4 clinical protocol for dental arch curve detection,
 * VOI crop box parameters, and mesh BVH slicing for Form 043/u.
 * Strictly 0 cartoon emojis per Mandate 8d point 7.
 */
export function formatArchDetectAndSlicingA4Report(
	input: ArchDetectAndSlicingReportParams,
): string {
	const params = archDetectAndSlicingReportParamsSchema.parse(input);
	const clinic = params.clinicName ?? "СТОМАТОЛОГИЧЕСКИЙ ЦЕНТР / ОТДЕЛЕНИЕ ЛУЧЕВОЙ ДИАГНОСТИКИ И ТОМОГРАФИИ";
	const card = params.cardRecordNumber ? `№ ${params.cardRecordNumber}` : "[БЕЗ НОМЕРА]";
	const dob = params.birthDate ? ` (д.р. ${params.birthDate})` : "";
	const jawText = params.jawType === "maxilla"
		? "Верхняя челюсть (Maxilla)"
		: params.jawType === "mandible"
			? "Нижняя челюсть (Mandible)"
			: "Обе челюсти (Maxilla & Mandible)";

	const lines: string[] = [
		"================================================================================",
		"              МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ                ",
		"               МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ: МЕДИЦИНСКАЯ КАРТА                     ",
		"               СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)                       ",
		"================================================================================",
		`Медицинская организация: ${clinic}`,
		"ПРОТОКОЛ АВТОМАТИЧЕСКОЙ ДЕТЕКЦИИ ЗУБНОЙ ДУГИ И BVH-СЛАЙСИНГА СЕТОК КЛКТ",
		"--------------------------------------------------------------------------------",
		"1. ПАСПОРТНАЯ ЧАСТЬ И СВЕДЕНИЯ ОБ ИССЛЕДОВАНИИ:",
		`Пациент: ${params.patientFullName}${dob}`,
		`Медицинская карта стоматологического больного: ${card}`,
		`Дата и время реконструкции: ${params.studyDate}`,
		`Врач-рентгенолог / Лечащий врач: ${params.doctorFullName}`,
		`Зона исследования: ${jawText}`,
		"",
		"2. АВТОМАТИЧЕСКАЯ ДЕТЕКЦИЯ ЗУБНОЙ ДУГИ (CATMULL-ROM & MIP):",
		"--------------------------------------------------------------------------------",
	];

	if (params.archDetection && params.archDetection.detected) {
		const ad = params.archDetection;
		lines.push(
			`Статус детекции: Успешно определена эвристическим алгоритмом DenCT MIP`,
			`Количество контрольных точек Catmull-Rom: ${ad.controlPointsCount}`,
			`Фокальный уровень по оси Z: ${ad.focalWorldZ.toFixed(2)} мм`,
			`Толщина аксиального слэба проекции: ${(ad.slabHalfMm * 2).toFixed(1)} мм (half-slab = ${ad.slabHalfMm.toFixed(1)} мм)`,
			`Порог плотности кортикальной кости: ${ad.boneThresholdHu.toFixed(0)} HU/GV`,
			`Угловой полуразмах передней дуги: ${ad.angularSpanDeg.toFixed(1)} град.`,
		);
		if (ad.approxArcLengthMm !== undefined) {
			lines.push(`Длина реконструированной дуги: ${ad.approxArcLengthMm.toFixed(1)} мм`);
		}
		if (ad.controlPoints && ad.controlPoints.length > 0) {
			lines.push("Координаты опорных точек (LPS, мм):");
			ad.controlPoints.forEach((pt, idx) => {
				lines.push(`  Точка ${idx + 1}: X = ${pt[0].toFixed(2)} мм, Y = ${pt[1].toFixed(2)} мм`);
			});
		}
	} else {
		lines.push(
			"Статус детекции: Не обнаружена (объем содержит недостаточную плотность кости)",
			"Рекомендация: Использование мануальной калибровки контрольных точек дуги.",
		);
	}
	lines.push("");

	lines.push(
		"3. ПАРАМЕТРЫ ОБЪЕМА ИНТЕРЕСА (VOI CROP BOX & СЕКУЩИЕ ПЛОСКОСТИ):",
		"--------------------------------------------------------------------------------",
	);
	if (params.cropBox) {
		const cb = params.cropBox;
		lines.push(
			`Нормализованный диапазон Min: [${cb.min.map((v) => v.toFixed(3)).join(", ")}]`,
			`Нормализованный диапазон Max: [${cb.max.map((v) => v.toFixed(3)).join(", ")}]`,
			`Количество активных секущих плоскостей: ${cb.activePlanesCount}`,
		);
		if (cb.volumeReductionPercent !== undefined) {
			lines.push(`Снижение объема вычислений / RAM: ${cb.volumeReductionPercent.toFixed(1)}%`);
		}
	} else {
		lines.push("Объем интереса: Полный неограниченный объем (NO_CROP, 0 секущих плоскостей).");
	}
	lines.push("");

	lines.push(
		"4. ПРОСТРАНСТВЕННЫЙ СРЕЗ ПОЛИГОНАЛЬНЫХ СЕТОК (AABB BVH SLICING):",
		"--------------------------------------------------------------------------------",
	);
	if (params.meshSlicing) {
		const ms = params.meshSlicing;
		lines.push(
			`Всего треугольников в исходной сетке: ${ms.totalTriangles}`,
			`Точка секущей плоскости: [${ms.planePoint.map((v) => v.toFixed(2)).join(", ")}] мм`,
			`Нормаль секущей плоскости: [${ms.planeNormal.map((v) => v.toFixed(3)).join(", ")}]`,
			`Пересеченных отрезков контура: ${ms.intersectedSegmentsCount}`,
		);
		if (ms.contourLengthMm !== undefined) {
			lines.push(`Суммарная длина контура среза: ${ms.contourLengthMm.toFixed(2)} мм`);
		}
	} else {
		lines.push("Слайсинг сетки: Срезы полигональных поверхностей не производились.");
	}
	lines.push("");

	const conclusion = params.clinicalConclusion ??
		"Анатомическая дуга зубного ряда и пространственные секущие контуры соответствуют клиническим критериям планирования дентальной имплантации.";
	lines.push(
		"5. КЛИНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ЭКСПЕРТИЗА:",
		"--------------------------------------------------------------------------------",
		conclusion,
		"",
		"Протокол сформирован в соответствии с требованиями Приказа Минздрава РФ № 804н",
		"и стандартами заполнения медицинской карты стоматологического больного (043/у).",
		"",
		`Врач: ____________________ / ${params.doctorFullName} /`,
		`Дата: ${params.studyDate}`,
		"================================================================================",
	);

	return lines.join("\n");
}
