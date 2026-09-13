/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: SLICE INTERSECTION MATHEMATICAL ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical geometry for calculating 2D/3D intersection cut lines
 * (reference lines / crosshairs) between orthogonal planes (Axial, Coronal,
 * Sagittal) and oblique/curved Paraxial Cross-Sectional planes in Dental CBCT.
 *
 * Design Invariants:
 * 1. Analytical closed-form solutions: zero matrix library, zero Three.js.
 * 2. Zero-allocation hot path: in-place mutations into reusable buffers/objects
 *    to eliminate V8 GC stuttering during 60 FPS viewport slice scrubbing.
 * 3. Exact Liang-Barsky line-box clipping in 2D and 3D.
 * 4. Orthonormal Frenet-Serret cross-section frame projection.
 *
 * Dental coordinate system: DICOM Patient Coordinates (+X Left, +Y Posterior, +Z Superior).
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. CROSS-SECTION ORTHONORMAL BASIS & FRAME GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export interface CrossSectionOrthonormalFrame {
	origin: Vec3;
	eU: Vec3;
	eV: Vec3;
	normal: Vec3;
	d: number;
}

/**
 * Build 3D orthonormal frame and plane equation for a paraxial cross-section slice.
 *
 * Basis vectors:
 * - origin: [Px, Py, zMid]
 * - eU (horizontal in-plane, buccolingual): [nx, ny, 0]
 * - eV (vertical in-plane, inferosuperior with tilt): [tx * sin(tilt), ty * sin(tilt), cos(tilt)]
 * - normal: eU × eV = [ny * cos(tilt), -nx * cos(tilt), -sin(tilt)]
 */
export function buildCrossSectionFrame(
	spec: CrossSectionPlaneSpec,
): CrossSectionOrthonormalFrame {
	const px = spec.point[0];
	const py = spec.point[1];
	const zMid = (spec.zMin + spec.zMax) * 0.5;

	const nx = spec.normal[0];
	const ny = spec.normal[1];
	const tx = spec.tangent[0];
	const ty = spec.tangent[1];

	const MAX_TILT = 30;
	const tiltDeg = Math.max(-MAX_TILT, Math.min(MAX_TILT, spec.tiltDeg ?? 0));
	const tiltRad = (tiltDeg * Math.PI) / 180;

	const sinT = Math.sin(tiltRad);
	const cosT = Math.cos(tiltRad);

	const origin: Vec3 = [px, py, zMid];
	const eU: Vec3 = [nx, ny, 0];
	const eV: Vec3 = [tx * sinT, ty * sinT, cosT];

	// Normal = eU × eV:
	// x: ny * cosT - 0 = ny * cosT
	// y: 0 - nx * cosT = -nx * cosT
	// z: nx * ty * sinT - ny * tx * sinT = (nx * ty - ny * tx) * sinT = -1 * sinT = -sinT
	const normal: Vec3 = [ny * cosT, -nx * cosT, -sinT];
	const d = dot3(normal, origin);

	return {
		origin,
		eU,
		eV,
		normal,
		d,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VIEWPORT INTERSECTION CUT LINE GENERATORS (HOT-PATH ZERO-ALLOCATION)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scratch buffers for zero-allocation hot-path slice intersection calls.
 */
export class SliceIntersectionScratch {
	public readonly rayPoint: Vec3 = [0, 0, 0];
	public readonly rayDir: Vec3 = [0, 0, 0];
	public readonly seg3D: Segment3D = {
		p1: [0, 0, 0],
		p2: [0, 0, 0],
	};
}

const GLOBAL_SCRATCH = new SliceIntersectionScratch();

/**
 * Set of 2D reference cut lines displayed inside the AXIAL Viewport (Z = axialZ).
 * Coordinate system: (X, Y) where X is left/right and Y is posterior/anterior.
 */
export interface AxialViewIntersections {
	/** Coronal plane cut line (horizontal Y = coronalY) */
	coronalLine: Segment2D | null;
	/** Sagittal plane cut line (vertical X = sagittalX) */
	sagittalLine: Segment2D | null;
	/** Cross-section slice plane cut line (buccolingual oblique line) */
	crossSectionLine: Segment2D | null;
}

/**
 * Computes all reference cut lines for the AXIAL viewport (Z = axialZ).
 */
export function computeAxialIntersections(
	coords: OrthogonalSliceCoordinates,
	bounds: BoundingBox3D,
	csSpec?: CrossSectionPlaneSpec,
	out?: AxialViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): AxialViewIntersections {
	const result: AxialViewIntersections = out ?? {
		coronalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		sagittalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	// 1. Coronal Line: Y = coronalY, spanning [xMin, xMax]
	if (coords.coronalY >= bounds.yMin && coords.coronalY <= bounds.yMax) {
		if (!result.coronalLine) result.coronalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.coronalLine.x1 = bounds.xMin;
		result.coronalLine.y1 = coords.coronalY;
		result.coronalLine.x2 = bounds.xMax;
		result.coronalLine.y2 = coords.coronalY;
	} else {
		result.coronalLine = null;
	}

	// 2. Sagittal Line: X = sagittalX, spanning [yMin, yMax]
	if (coords.sagittalX >= bounds.xMin && coords.sagittalX <= bounds.xMax) {
		if (!result.sagittalLine) result.sagittalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.sagittalLine.x1 = coords.sagittalX;
		result.sagittalLine.y1 = bounds.yMin;
		result.sagittalLine.x2 = coords.sagittalX;
		result.sagittalLine.y2 = bounds.yMax;
	} else {
		result.sagittalLine = null;
	}

	// 3. Cross-Section Slice Line on Axial Plane
	if (csSpec) {
		const csFrame = buildCrossSectionFrame(csSpec);
		const nAxial: Vec3 = [0, 0, 1];
		const dAxial = coords.axialZ;

		const hasIntersection = intersectPlanes3D(
			csFrame.normal,
			csFrame.d,
			nAxial,
			dAxial,
			scratch.rayPoint,
			scratch.rayDir,
		);

		if (hasIntersection) {
			const intersectsBox = clipLineToAABB3D(
				scratch.rayPoint,
				scratch.rayDir,
				bounds,
				scratch.seg3D,
			);

			if (intersectsBox) {
				// Also clip length to cross-section widthMm if specified
				const halfW = csSpec.widthMm * 0.5;
				const px = csSpec.point[0];
				const py = csSpec.point[1];

				if (!result.crossSectionLine) {
					result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
				}

				// If halfW is positive, constrain segment centered around the arch point
				if (halfW > 0) {
					const nx = csSpec.normal[0];
					const ny = csSpec.normal[1];
					const tx = csSpec.tangent[0];
					const ty = csSpec.tangent[1];
					const zMid = (csSpec.zMin + csSpec.zMax) * 0.5;
					const tiltDeg = csSpec.tiltDeg ?? 0;
					const tiltRad = (tiltDeg * Math.PI) / 180;
					const shiftAlongTangent = (coords.axialZ - zMid) * Math.tan(tiltRad);

					const cx = px + tx * shiftAlongTangent;
					const cy = py + ty * shiftAlongTangent;

					clipSegment2D(
						cx - nx * halfW,
						cy - ny * halfW,
						cx + nx * halfW,
						cy + ny * halfW,
						bounds.xMin,
						bounds.xMax,
						bounds.yMin,
						bounds.yMax,
						result.crossSectionLine,
					);
				} else {
					result.crossSectionLine.x1 = scratch.seg3D.p1[0];
					result.crossSectionLine.y1 = scratch.seg3D.p1[1];
					result.crossSectionLine.x2 = scratch.seg3D.p2[0];
					result.crossSectionLine.y2 = scratch.seg3D.p2[1];
				}
			} else {
				result.crossSectionLine = null;
			}
		} else {
			result.crossSectionLine = null;
		}
	} else {
		result.crossSectionLine = null;
	}

	return result;
}

/**
 * Set of 2D reference cut lines displayed inside the CORONAL Viewport (Y = coronalY).
 * Coordinate system: (X, Z) where X is horizontal and Z is vertical (superior).
 */
export interface CoronalViewIntersections {
	/** Axial plane cut line (horizontal Z = axialZ) */
	axialLine: Segment2D | null;
	/** Sagittal plane cut line (vertical X = sagittalX) */
	sagittalLine: Segment2D | null;
	/** Cross-section slice plane cut line */
	crossSectionLine: Segment2D | null;
}

/**
 * Computes all reference cut lines for the CORONAL viewport (Y = coronalY).
 */
export function computeCoronalIntersections(
	coords: OrthogonalSliceCoordinates,
	bounds: BoundingBox3D,
	csSpec?: CrossSectionPlaneSpec,
	out?: CoronalViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): CoronalViewIntersections {
	const result: CoronalViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		sagittalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	// 1. Axial Line: Z = axialZ, spanning [xMin, xMax]
	if (coords.axialZ >= bounds.zMin && coords.axialZ <= bounds.zMax) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = bounds.xMin;
		result.axialLine.y1 = coords.axialZ;
		result.axialLine.x2 = bounds.xMax;
		result.axialLine.y2 = coords.axialZ;
	} else {
		result.axialLine = null;
	}

	// 2. Sagittal Line: X = sagittalX, spanning [zMin, zMax]
	if (coords.sagittalX >= bounds.xMin && coords.sagittalX <= bounds.xMax) {
		if (!result.sagittalLine) result.sagittalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.sagittalLine.x1 = coords.sagittalX;
		result.sagittalLine.y1 = bounds.zMin;
		result.sagittalLine.x2 = coords.sagittalX;
		result.sagittalLine.y2 = bounds.zMax;
	} else {
		result.sagittalLine = null;
	}

	// 3. Cross-Section Line on Coronal Plane (Y = coronalY)
	if (csSpec) {
		const csFrame = buildCrossSectionFrame(csSpec);
		const nCoronal: Vec3 = [0, 1, 0];
		const dCoronal = coords.coronalY;

		const hasIntersection = intersectPlanes3D(
			csFrame.normal,
			csFrame.d,
			nCoronal,
			dCoronal,
			scratch.rayPoint,
			scratch.rayDir,
		);

		if (hasIntersection) {
			const intersectsBox = clipLineToAABB3D(
				scratch.rayPoint,
				scratch.rayDir,
				bounds,
				scratch.seg3D,
			);

			if (intersectsBox) {
				if (!result.crossSectionLine) {
					result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
				}
				result.crossSectionLine.x1 = scratch.seg3D.p1[0];
				result.crossSectionLine.y1 = scratch.seg3D.p1[2]; // Z is vertical
				result.crossSectionLine.x2 = scratch.seg3D.p2[0];
				result.crossSectionLine.y2 = scratch.seg3D.p2[2];
			} else {
				result.crossSectionLine = null;
			}
		} else {
			result.crossSectionLine = null;
		}
	} else {
		result.crossSectionLine = null;
	}

	return result;
}

/**
 * Set of 2D reference cut lines displayed inside the SAGITTAL Viewport (X = sagittalX).
 * Coordinate system: (Y, Z) where Y is horizontal (posterior/anterior) and Z is vertical (superior).
 */
export interface SagittalViewIntersections {
	/** Axial plane cut line (horizontal Z = axialZ) */
	axialLine: Segment2D | null;
	/** Coronal plane cut line (vertical Y = coronalY) */
	coronalLine: Segment2D | null;
	/** Cross-section slice plane cut line */
	crossSectionLine: Segment2D | null;
}

/**
 * Computes all reference cut lines for the SAGITTAL viewport (X = sagittalX).
 */
export function computeSagittalIntersections(
	coords: OrthogonalSliceCoordinates,
	bounds: BoundingBox3D,
	csSpec?: CrossSectionPlaneSpec,
	out?: SagittalViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): SagittalViewIntersections {
	const result: SagittalViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		coronalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	// 1. Axial Line: Z = axialZ, spanning [yMin, yMax]
	if (coords.axialZ >= bounds.zMin && coords.axialZ <= bounds.zMax) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = bounds.yMin;
		result.axialLine.y1 = coords.axialZ;
		result.axialLine.x2 = bounds.yMax;
		result.axialLine.y2 = coords.axialZ;
	} else {
		result.axialLine = null;
	}

	// 2. Coronal Line: Y = coronalY, spanning [zMin, zMax]
	if (coords.coronalY >= bounds.yMin && coords.coronalY <= bounds.yMax) {
		if (!result.coronalLine) result.coronalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.coronalLine.x1 = coords.coronalY;
		result.coronalLine.y1 = bounds.zMin;
		result.coronalLine.x2 = coords.coronalY;
		result.coronalLine.y2 = bounds.zMax;
	} else {
		result.coronalLine = null;
	}

	// 3. Cross-Section Line on Sagittal Plane (X = sagittalX)
	if (csSpec) {
		const csFrame = buildCrossSectionFrame(csSpec);
		const nSagittal: Vec3 = [1, 0, 0];
		const dSagittal = coords.sagittalX;

		const hasIntersection = intersectPlanes3D(
			csFrame.normal,
			csFrame.d,
			nSagittal,
			dSagittal,
			scratch.rayPoint,
			scratch.rayDir,
		);

		if (hasIntersection) {
			const intersectsBox = clipLineToAABB3D(
				scratch.rayPoint,
				scratch.rayDir,
				bounds,
				scratch.seg3D,
			);

			if (intersectsBox) {
				if (!result.crossSectionLine) {
					result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
				}
				result.crossSectionLine.x1 = scratch.seg3D.p1[1]; // Y is horizontal
				result.crossSectionLine.y1 = scratch.seg3D.p1[2]; // Z is vertical
				result.crossSectionLine.x2 = scratch.seg3D.p2[1];
				result.crossSectionLine.y2 = scratch.seg3D.p2[2];
			} else {
				result.crossSectionLine = null;
			}
		} else {
			result.crossSectionLine = null;
		}
	} else {
		result.crossSectionLine = null;
	}

	return result;
}

/**
 * Set of 2D reference cut lines displayed inside the CROSS-SECTION Viewport.
 * Coordinates are local (u, v):
 * - u is buccolingual in mm (u = 0 at dental arch curve, [-widthMm/2, +widthMm/2]).
 * - v is inferosuperior in mm (v = 0 at zMid, [-heightMm/2, +heightMm/2]).
 */
export interface CrossSectionViewIntersections {
	/** Axial plane slice cut line (horizontal line at v = (axialZ - zMid)/cos(tilt)) */
	axialLine: Segment2D | null;
	/** Arch spline marker (vertical line at u = 0) */
	archCenterLine: Segment2D;
	/** Coronal plane cut line in (u, v) */
	coronalLine: Segment2D | null;
	/** Sagittal plane cut line in (u, v) */
	sagittalLine: Segment2D | null;
}

/**
 * Computes all reference cut lines for the CROSS-SECTION viewport in local (u, v) space.
 */
export function computeCrossSectionViewIntersections(
	csSpec: CrossSectionPlaneSpec,
	coords: OrthogonalSliceCoordinates,
	out?: CrossSectionViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): CrossSectionViewIntersections {
	const halfW = csSpec.widthMm * 0.5;
	const halfH = Math.abs(csSpec.zMax - csSpec.zMin) * 0.5;
	const zMid = specZMid(csSpec);

	const uMin = -halfW;
	const uMax = halfW;
	const vMin = -halfH;
	const vMax = halfH;

	const result: CrossSectionViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		archCenterLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		coronalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		sagittalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	// 1. Arch Center Line: u = 0, spanning [vMin, vMax]
	result.archCenterLine.x1 = 0;
	result.archCenterLine.y1 = vMin;
	result.archCenterLine.x2 = 0;
	result.archCenterLine.y2 = vMax;

	// 2. Axial Slice Line:
	// In the cross-section plane, Z(u, v) = zMid + v * cos(tiltDeg).
	// Therefore: axialZ = zMid + v * cos(tiltDeg) => v = (axialZ - zMid) / cos(tiltDeg).
	const MAX_TILT = 30;
	const tiltDeg = Math.max(-MAX_TILT, Math.min(MAX_TILT, csSpec.tiltDeg ?? 0));
	const tiltRad = (tiltDeg * Math.PI) / 180;
	const cosT = Math.cos(tiltRad);

	const vAxial = cosT > 1e-6 ? (coords.axialZ - zMid) / cosT : coords.axialZ - zMid;

	if (vAxial >= vMin && vAxial <= vMax) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = uMin;
		result.axialLine.y1 = vAxial;
		result.axialLine.x2 = uMax;
		result.axialLine.y2 = vAxial;
	} else {
		result.axialLine = null;
	}

	// 3. Coronal Plane cut line (Y = coronalY):
	const csFrame = buildCrossSectionFrame(csSpec);
	const hasCoronal = intersectPlanes3D(
		csFrame.normal,
		csFrame.d,
		[0, 1, 0],
		coords.coronalY,
		scratch.rayPoint,
		scratch.rayDir,
	);

	if (hasCoronal) {
		const p03D = scratch.rayPoint;
		const dir3D = scratch.rayDir;

		const rel0: Vec3 = [
			p03D[0] - csFrame.origin[0],
			p03D[1] - csFrame.origin[1],
			p03D[2] - csFrame.origin[2],
		];

		const u0 = dot3(rel0, csFrame.eU);
		const v0 = dot3(rel0, csFrame.eV);
		const du = dot3(dir3D, csFrame.eU);
		const dv = dot3(dir3D, csFrame.eV);

		const bigT = Math.max(csSpec.widthMm, halfH * 2) * 2;
		const seg2D: Segment2D = { x1: 0, y1: 0, x2: 0, y2: 0 };
		const clipped = clipSegment2D(
			u0 - du * bigT,
			v0 - dv * bigT,
			u0 + du * bigT,
			v0 + dv * bigT,
			uMin,
			uMax,
			vMin,
			vMax,
			seg2D,
		);

		if (clipped) {
			if (!result.coronalLine) result.coronalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
			result.coronalLine.x1 = seg2D.x1;
			result.coronalLine.y1 = seg2D.y1;
			result.coronalLine.x2 = seg2D.x2;
			result.coronalLine.y2 = seg2D.y2;
		} else {
			result.coronalLine = null;
		}
	} else {
		result.coronalLine = null;
	}

	// 4. Sagittal Plane cut line (X = sagittalX):
	const hasSagittal = intersectPlanes3D(
		csFrame.normal,
		csFrame.d,
		[1, 0, 0],
		coords.sagittalX,
		scratch.rayPoint,
		scratch.rayDir,
	);

	if (hasSagittal) {
		const p03D = scratch.rayPoint;
		const dir3D = scratch.rayDir;

		const rel0: Vec3 = [
			p03D[0] - csFrame.origin[0],
			p03D[1] - csFrame.origin[1],
			p03D[2] - csFrame.origin[2],
		];

		const u0 = dot3(rel0, csFrame.eU);
		const v0 = dot3(rel0, csFrame.eV);
		const du = dot3(dir3D, csFrame.eU);
		const dv = dot3(dir3D, csFrame.eV);

		const bigT = Math.max(csSpec.widthMm, halfH * 2) * 2;
		const seg2D: Segment2D = { x1: 0, y1: 0, x2: 0, y2: 0 };
		const clipped = clipSegment2D(
			u0 - du * bigT,
			v0 - dv * bigT,
			u0 + du * bigT,
			v0 + dv * bigT,
			uMin,
			uMax,
			vMin,
			vMax,
			seg2D,
		);

		if (clipped) {
			if (!result.sagittalLine) result.sagittalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
			result.sagittalLine.x1 = seg2D.x1;
			result.sagittalLine.y1 = seg2D.y1;
			result.sagittalLine.x2 = seg2D.x2;
			result.sagittalLine.y2 = seg2D.y2;
		} else {
			result.sagittalLine = null;
		}
	} else {
		result.sagittalLine = null;
	}

	return result;
}

function specZMid(spec: CrossSectionPlaneSpec): number {
	return (spec.zMin + spec.zMax) * 0.5;
}

/**
 * Set of 2D reference cut lines displayed inside the PANORAMIC (OPG) Viewport.
 * Coordinates are (sMm, zMm) where:
 * - sMm is the arc-length position along the panoramic curve in mm [0, archLengthMm].
 * - zMm is the vertical elevation in mm [zMin, zMax].
 */
export interface PanoramicViewIntersections {
	/** Axial plane slice cut line (horizontal line at z = axialZ) */
	axialLine: Segment2D | null;
	/** Cross-Section slice indicator line (vertical or tilted line at sPosition) */
	crossSectionLine: Segment2D | null;
}

/**
 * Computes reference cut lines for the PANORAMIC viewport.
 */
export function computePanoramicIntersections(
	axialZ: number,
	csPositionNormalized: number,
	csTiltDeg: number,
	archLengthMm: number,
	zMin: number,
	zMax: number,
	out?: PanoramicViewIntersections,
): PanoramicViewIntersections {
	const result: PanoramicViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	// 1. Axial Line: horizontal line at Z = axialZ
	if (axialZ >= zMin && axialZ <= zMax && archLengthMm > 0) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = 0;
		result.axialLine.y1 = axialZ;
		result.axialLine.x2 = archLengthMm;
		result.axialLine.y2 = axialZ;
	} else {
		result.axialLine = null;
	}

	// 2. Cross-Section Line:
	// Normalized position s in [0, 1] maps to arc-length sMm = s * archLengthMm.
	// When tilt is non-zero, the line tilts across the height of the slice:
	// Δs(z) = -(z - zMid) * tan(tilt).
	if (archLengthMm > 0 && csPositionNormalized >= 0 && csPositionNormalized <= 1) {
		const zMid = (zMin + zMax) * 0.5;
		const sCenter = csPositionNormalized * archLengthMm;

		const MAX_TILT = 30;
		const tiltDeg = Math.max(-MAX_TILT, Math.min(MAX_TILT, csTiltDeg));
		const tiltRad = (tiltDeg * Math.PI) / 180;
		const tanT = Math.tan(tiltRad);

		const sTop = sCenter - (zMax - zMid) * tanT;
		const sBottom = sCenter - (zMin - zMid) * tanT;

		if (!result.crossSectionLine) {
			result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		}

		result.crossSectionLine.x1 = sBottom;
		result.crossSectionLine.y1 = zMin;
		result.crossSectionLine.x2 = sTop;
		result.crossSectionLine.y2 = zMax;
	} else {
		result.crossSectionLine = null;
	}

	return result;
}
