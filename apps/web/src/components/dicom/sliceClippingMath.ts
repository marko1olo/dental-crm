/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: SLICE CLIPPING & VECTOR ALGEBRA ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * High-performance analytical 3D/2D vector geometry and exact Liang-Barsky
 * line-box clipping for Dental CBCT multiplanar viewports.
 *
 * Invariants:
 * 1. Zero matrix library, zero Three.js, pure algebraic operations.
 * 2. In-place mutations on reusable scratch objects for 60 FPS viewport scrubbing.
 * 3. Dental coordinate system: DICOM Patient Coordinates (+X Left, +Y Posterior, +Z Superior).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface Segment2D {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface Segment3D {
	p1: Vec3;
	p2: Vec3;
}

export interface BoundingBox3D {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
	zMin: number;
	zMax: number;
}

export interface BoundingBox2D {
	uMin: number;
	uMax: number;
	vMin: number;
	vMax: number;
}

export type MprSlicePlaneType =
	| "axial"
	| "coronal"
	| "sagittal"
	| "crossSection"
	| "panoramic";

/**
 * Geometric specification of an oblique or orthogonal cross-section slice plane.
 */
export interface CrossSectionPlaneSpec {
	/** Center point along dental arch in world coordinates [x, y] or [x, y, z] */
	point: [number, number] | [number, number, number];
	/** Buccolingual unit normal vector in XY plane [nx, ny] (pointing buccal/outward) */
	normal: [number, number];
	/** Mesiodistal unit tangent vector in XY plane [tx, ty] (pointing along arch) */
	tangent: [number, number];
	/** Tilt angle of vertical slice axis in degrees (-30° to +30°) */
	tiltDeg?: number;
	/** Buccolingual width of the cross-section slice in mm (e.g. 20-40 mm) */
	widthMm: number;
	/** Minimum and maximum Z bounds of the volume in mm */
	zMin: number;
	zMax: number;
}

/**
 * Current positions of the primary orthogonal slice planes in world mm.
 */
export interface OrthogonalSliceCoordinates {
	axialZ: number;
	coronalY: number;
	sagittalX: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BASIC 3D VECTOR & PLANE ALGEBRA
// ─────────────────────────────────────────────────────────────────────────────

export function dot3(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3, out?: Vec3): Vec3 {
	const x = a[1] * b[2] - a[2] * b[1];
	const y = a[2] * b[0] - a[0] * b[2];
	const z = a[0] * b[1] - a[1] * b[0];
	if (out) {
		out[0] = x;
		out[1] = y;
		out[2] = z;
		return out;
	}
	return [x, y, z];
}

export function norm3(v: Vec3): number {
	return Math.hypot(v[0], v[1], v[2]);
}

export function normalize3(v: Vec3, out?: Vec3): Vec3 {
	const len = Math.hypot(v[0], v[1], v[2]);
	const inv = len > 1e-12 ? 1 / len : 0;
	if (out) {
		out[0] = v[0] * inv;
		out[1] = v[1] * inv;
		out[2] = v[2] * inv;
		return out;
	}
	return [v[0] * inv, v[1] * inv, v[2] * inv];
}

/**
 * Analytical plane equation coefficients: n · X = d.
 */
export interface PlaneEquation {
	normal: Vec3;
	d: number;
}

/**
 * Construct plane equation n · X = d from point and unit normal.
 */
export function planeFromPointAndNormal(point: Vec3, normal: Vec3): PlaneEquation {
	const n = normalize3(normal);
	return {
		normal: n,
		d: dot3(n, point),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ANALYTICAL PLANE-PLANE INTERSECTION & 3D/2D BOX CLIPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the 3D line of intersection between two planes:
 * Plane 1: n1 · X = d1
 * Plane 2: n2 · X = d2
 *
 * Returns false if planes are parallel (|n1 × n2| < 1e-6).
 * Computes line direction D = (n1 × n2) / |n1 × n2| and closest point to origin:
 * P0 = ((d1 - d2*(n1·n2))*n1 + (d2 - d1*(n1·n2))*n2) / (1 - (n1·n2)^2).
 */
export function intersectPlanes3D(
	n1: Vec3,
	d1: number,
	n2: Vec3,
	d2: number,
	outRayPoint: Vec3,
	outRayDir: Vec3,
): boolean {
	const dx = n1[1] * n2[2] - n1[2] * n2[1];
	const dy = n1[2] * n2[0] - n1[0] * n2[2];
	const dz = n1[0] * n2[1] - n1[1] * n2[0];
	const dLen = Math.hypot(dx, dy, dz);

	if (dLen < 1e-6) {
		return false; // Planes are parallel or coincident
	}

	const invDLen = 1 / dLen;
	outRayDir[0] = dx * invDLen;
	outRayDir[1] = dy * invDLen;
	outRayDir[2] = dz * invDLen;

	const cosAlpha = dot3(n1, n2);
	const sin2Alpha = 1 - cosAlpha * cosAlpha;

	if (sin2Alpha < 1e-10) {
		return false;
	}

	const invSin2 = 1 / sin2Alpha;
	const c1 = (d1 - d2 * cosAlpha) * invSin2;
	const c2 = (d2 - d1 * cosAlpha) * invSin2;

	outRayPoint[0] = c1 * n1[0] + c2 * n2[0];
	outRayPoint[1] = c1 * n1[1] + c2 * n2[1];
	outRayPoint[2] = c1 * n1[2] + c2 * n2[2];

	return true;
}

/**
 * Liang-Barsky line clipping against 3D AABB volume bounds.
 * Clips parametric line X(t) = p0 + t * dir to box [xMin, xMax] × [yMin, yMax] × [zMin, zMax].
 *
 * Returns true if the line intersects the box and writes finite endpoints into outSegment.
 */
export function clipLineToAABB3D(
	p0: Vec3,
	dir: Vec3,
	box: BoundingBox3D,
	outSegment: Segment3D,
): boolean {
	let tEnter = -Infinity;
	let tExit = Infinity;

	for (let i = 0; i < 3; i++) {
		const d = dir[i]!;
		const p = p0[i]!;
		const min = i === 0 ? box.xMin : i === 1 ? box.yMin : box.zMin;
		const max = i === 0 ? box.xMax : i === 1 ? box.yMax : box.zMax;

		if (Math.abs(d) < 1e-12) {
			// Line is parallel to slab; if outside, no intersection
			if (p < min || p > max) return false;
		} else {
			const t1 = (min - p) / d;
			const t2 = (max - p) / d;
			const tNear = Math.min(t1, t2);
			const tFar = Math.max(t1, t2);

			if (tNear > tEnter) tEnter = tNear;
			if (tFar < tExit) tExit = tFar;

			if (tEnter > tExit) return false;
		}
	}

	outSegment.p1[0] = p0[0] + tEnter * dir[0];
	outSegment.p1[1] = p0[1] + tEnter * dir[1];
	outSegment.p1[2] = p0[2] + tEnter * dir[2];

	outSegment.p2[0] = p0[0] + tExit * dir[0];
	outSegment.p2[1] = p0[1] + tExit * dir[1];
	outSegment.p2[2] = p0[2] + tExit * dir[2];

	return true;
}

/**
 * Liang-Barsky 2D line segment clipping against box [xMin, xMax] × [yMin, yMax].
 * Modifies outSegment in-place (zero-allocation).
 */
export function clipSegment2D(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	xMin: number,
	xMax: number,
	yMin: number,
	yMax: number,
	outSegment: Segment2D,
): boolean {
	const dx = x2 - x1;
	const dy = y2 - y1;

	let t0 = 0.0;
	let t1 = 1.0;

	const p = [-dx, dx, -dy, dy];
	const q = [x1 - xMin, xMax - x1, y1 - yMin, yMax - y1];

	for (let i = 0; i < 4; i++) {
		const pi = p[i]!;
		const qi = q[i]!;

		if (Math.abs(pi) < 1e-12) {
			if (qi < 0) return false;
		} else {
			const r = qi / pi;
			if (pi < 0) {
				if (r > t1) return false;
				if (r > t0) t0 = r;
			} else {
				if (r < t0) return false;
				if (r < t1) t1 = r;
			}
		}
	}

	outSegment.x1 = x1 + t0 * dx;
	outSegment.y1 = y1 + t0 * dy;
	outSegment.x2 = x1 + t1 * dx;
	outSegment.y2 = y1 + t1 * dy;

	return true;
}
