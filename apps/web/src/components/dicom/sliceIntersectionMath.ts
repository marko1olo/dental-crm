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

export * from "./sliceClippingMath";

import {
	dot3,
	cross3,
	norm3,
	normalize3,
	planeFromPointAndNormal,
	intersectPlanes3D,
	clipLineToAABB3D,
	clipSegment2D,
	type Vec2,
	type Vec3,
	type Segment2D,
	type Segment3D,
	type BoundingBox3D,
	type BoundingBox2D,
	type MprSlicePlaneType,
	type CrossSectionPlaneSpec,
	type OrthogonalSliceCoordinates,
	type PlaneEquation,
} from "./sliceClippingMath";

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
