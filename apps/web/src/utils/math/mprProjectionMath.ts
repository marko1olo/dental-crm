import { type mat4, vec3 } from "gl-matrix";

export type Point2D = { x: number; y: number };
export type Point3D = { x: number; y: number; z: number };

/**
 * Serializable request sent from the UI thread to the panoramic MPR worker.
 *
 * `scalarData` MUST be a copy the UI thread no longer needs: the worker takes
 * ownership of its ArrayBuffer via the postMessage transfer list, which detaches
 * it on the sender side. Never pass the cornerstone volume's own scalar array
 * here — transferring it would corrupt the volume cache.
 *
 * `direction` is a flattened 4x4 (16-element) matrix laid out for `mat4` index
 * access (basis rows at indices 0..2 / 4..6 / 8..10). The cornerstone volume
 * exposes a 3x3 `Mat3`; the caller is responsible for expanding it (see
 * `mat3ToMat4Direction`).
 */
export interface PanoramicWorkerRequest {
	scalarData: Float32Array | Uint16Array;
	dimensions: [number, number, number];
	origin: [number, number, number];
	direction: Float32Array; // 16 elements, mat4 layout
	spacing: [number, number, number];
	splinePoints: Point2D[];
	zStartWorld: number;
	zEndWorld: number;
	zStepWorld: number;
	thickness: number;
	blendMode: "mip" | "average";
}

export type PanoramicWorkerResponse =
	| { success: true; width: number; height: number; pixels: Float32Array; type?: "panoramic" }
	| { success: false; error: string; type?: "panoramic" };

export interface CrossSectionWorkerRequest {
	type: "crossSection" | "cross_section";
	scalarData: Float32Array | Uint16Array | Int16Array;
	dimensions: [number, number, number];
	origin: [number, number, number];
	spacing: [number, number, number];
	controlPoints: [number, number][];
	position: number; // 0..1 normalized along arch
	tiltDeg: number; // degrees ±30
	widthMm: number; // slice width in mm
	resolution: number; // mm per pixel
}

export type CrossSectionWorkerResponse =
	| {
			success: true;
			type: "crossSection";
			width: number;
			height: number;
			horizontalSpacing: number;
			verticalSpacing: number;
			pixelData: Float32Array;
	  }
	| { success: false; type: "crossSection"; error: string };

export type MprWorkerRequest =
	| (PanoramicWorkerRequest & { type?: "panoramic" })
	| CrossSectionWorkerRequest;

export type MprWorkerResponse = PanoramicWorkerResponse | CrossSectionWorkerResponse;

/**
 * Expand a cornerstone 3x3 column/row-major `Mat3` (9 elements) into the
 * 16-element `mat4`-indexed layout that `generatePanoramicImage` reads. This is
 * a pure structural bridge — the 3x3 rotation/scale basis is copied into the
 * upper-left of a 4x4 identity. No data is invented and no cast is used.
 */
export function mat3ToMat4Direction(m3: ArrayLike<number>): Float32Array {
	const m4 = new Float32Array(16);
	// row 0
	m4[0] = m3[0] ?? 0;
	m4[1] = m3[1] ?? 0;
	m4[2] = m3[2] ?? 0;
	m4[3] = 0;
	// row 1
	m4[4] = m3[3] ?? 0;
	m4[5] = m3[4] ?? 0;
	m4[6] = m3[5] ?? 0;
	m4[7] = 0;
	// row 2
	m4[8] = m3[6] ?? 0;
	m4[9] = m3[7] ?? 0;
	m4[10] = m3[8] ?? 0;
	m4[11] = 0;
	// row 3
	m4[12] = 0;
	m4[13] = 0;
	m4[14] = 0;
	m4[15] = 1;
	return m4;
}

/**
 * Copy an arbitrary cornerstone pixel array (Int16Array for CBCT Hounsfield
 * units, Uint16Array, etc.) into a `Float32Array | Uint16Array` the MPR kernel
 * accepts. Returns a NEW buffer the caller owns and may transfer to the worker.
 *
 * Int16 (signed HU) and other non-Uint16 integer/float types are widened to
 * Float32 to preserve sign and magnitude; a genuine Uint16Array is passed
 * through by copy so its buffer is detachable without touching the source.
 */
export function toTransferableScalarData(
	src: ArrayLike<number> & { BYTES_PER_ELEMENT?: number },
): Float32Array | Uint16Array {
	if (src instanceof Uint16Array) {
		return src.slice();
	}
	if (src instanceof Float32Array) {
		return src.slice();
	}
	if (src instanceof Int16Array) {
		return new Float32Array(src);
	}
	if (ArrayBuffer.isView(src)) {
		return new Float32Array(src as unknown as ArrayLike<number>);
	}
	const out = new Float32Array(src.length);
	for (let i = 0; i < src.length; i++) out[i] = src[i] ?? 0;
	return out;
}

/**
 * Calculates Catmull-Rom spline points interpolated at equidistant steps.
 */
export function interpolateSpline(
	points: Point2D[],
	stepSize: number = 0.5,
): Point2D[] {
	if (points.length < 2) return points;

	const result: Point2D[] = [];

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i]!;
		const p1 = points[i + 1]!;

		const dx = p1.x - p0.x;
		const dy = p1.y - p0.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		const steps = Math.max(1, Math.floor(distance / stepSize));
		for (let j = 0; j < steps; j++) {
			const t = j / steps;
			result.push({
				x: p0.x + dx * t,
				y: p0.y + dy * t,
			});
		}
	}
	result.push(points[points.length - 1]!);

	return result;
}

/**
 * Calculates the orthogonal vectors (normals) for a set of 2D points.
 */
export function calculateNormals(points: Point2D[]): Point2D[] {
	const normals: Point2D[] = [];
	for (let i = 0; i < points.length; i++) {
		const prev = i === 0 ? points[i]! : points[i - 1]!;
		const next = i === points.length - 1 ? points[i]! : points[i + 1]!;

		const dx = next.x - prev.x;
		const dy = next.y - prev.y;

		// Normalize tangent
		const len = Math.sqrt(dx * dx + dy * dy) || 1;
		const tx = dx / len;
		const ty = dy / len;

		// Normal is orthogonal to tangent (-ty, tx)
		normals.push({ x: -ty, y: tx });
	}
	return normals;
}

/**
 * Trilinear interpolation of scalar data in a 3D volume.
 */
export function trilinearInterpolate(
	scalarData: Float32Array | Uint16Array | Uint8Array,
	dimensions: [number, number, number],
	x: number,
	y: number,
	z: number,
	outOfBoundsValue: number = 0,
): number {
	const [width, height, depth] = dimensions;

	if (
		x < 0 ||
		x > width - 1 ||
		y < 0 ||
		y > height - 1 ||
		z < 0 ||
		z > depth - 1
	) {
		return outOfBoundsValue;
	}

	const x0 = Math.floor(x);
	const x1 = Math.min(x0 + 1, width - 1);
	const y0 = Math.floor(y);
	const y1 = Math.min(y0 + 1, height - 1);
	const z0 = Math.floor(z);
	const z1 = Math.min(z0 + 1, depth - 1);

	const xd = x - x0;
	const yd = y - y0;
	const zd = z - z0;

	const sliceSize = width * height;

	// 8 corners
	const c000 = scalarData[x0 + y0 * width + z0 * sliceSize] ?? outOfBoundsValue;
	const c100 = scalarData[x1 + y0 * width + z0 * sliceSize] ?? outOfBoundsValue;
	const c010 = scalarData[x0 + y1 * width + z0 * sliceSize] ?? outOfBoundsValue;
	const c110 = scalarData[x1 + y1 * width + z0 * sliceSize] ?? outOfBoundsValue;
	const c001 = scalarData[x0 + y0 * width + z1 * sliceSize] ?? outOfBoundsValue;
	const c101 = scalarData[x1 + y0 * width + z1 * sliceSize] ?? outOfBoundsValue;
	const c011 = scalarData[x0 + y1 * width + z1 * sliceSize] ?? outOfBoundsValue;
	const c111 = scalarData[x1 + y1 * width + z1 * sliceSize] ?? outOfBoundsValue;

	// Interpolate along X
	const c00 = c000 * (1 - xd) + c100 * xd;
	const c01 = c001 * (1 - xd) + c101 * xd;
	const c10 = c010 * (1 - xd) + c110 * xd;
	const c11 = c011 * (1 - xd) + c111 * xd;

	// Interpolate along Y
	const c0 = c00 * (1 - yd) + c10 * yd;
	const c1 = c01 * (1 - yd) + c11 * yd;

	// Interpolate along Z
	return c0 * (1 - zd) + c1 * zd;
}

/**
 * Transforms world coordinates to volume index coordinates.
 */
export function worldToIndex(
	worldPos: vec3,
	origin: vec3,
	direction: mat4,
	spacing: vec3,
	out?: vec3,
): vec3 {
	const tx = worldPos[0] - origin[0];
	const ty = worldPos[1] - origin[1];
	const tz = worldPos[2] - origin[2];

	const dirX0 = direction[0] ?? 1;
	const dirX1 = direction[1] ?? 0;
	const dirX2 = direction[2] ?? 0;

	const dirY0 = direction[4] ?? 0;
	const dirY1 = direction[5] ?? 1;
	const dirY2 = direction[6] ?? 0;

	const dirZ0 = direction[8] ?? 0;
	const dirZ1 = direction[9] ?? 0;
	const dirZ2 = direction[10] ?? 1;

	const invSx = 1 / spacing[0];
	const invSy = 1 / spacing[1];
	const invSz = 1 / spacing[2];

	const target = out ?? vec3.create();
	target[0] = (tx * dirX0 + ty * dirX1 + tz * dirX2) * invSx;
	target[1] = (tx * dirY0 + ty * dirY1 + tz * dirY2) * invSy;
	target[2] = (tx * dirZ0 + ty * dirZ1 + tz * dirZ2) * invSz;
	return target;
}

/**
 * Extracts a panoramic 2D array of pixels from the volume based on a spline.
 * Supports "Thick Slab" (Focal Trough) rendering via MIP or Average intensity projections.
 * Optimized for low-spec CPUs (Celeron/i3): Zero Float32Array allocations inside the raycast loop.
 */
export function generatePanoramicImage(
	scalarData: Float32Array | Uint16Array,
	dimensions: [number, number, number],
	origin: vec3,
	direction: mat4,
	spacing: vec3,
	splinePoints: Point2D[], // In World coordinates (Axial projection)
	zStartWorld: number,
	zEndWorld: number,
	zStepWorld: number = 0.5,
	thickness: number = 0, // Thickness in mm
	blendMode: "average" | "mip" = "mip",
): { width: number; height: number; pixels: Float32Array } {
	const width = splinePoints.length;
	const height = Math.abs(Math.floor((zEndWorld - zStartWorld) / zStepWorld));
	const pixels = new Float32Array(width * height);

	const normals = thickness > 0 ? calculateNormals(splinePoints) : [];
	const thicknessSteps = Math.max(1, Math.floor(thickness / 0.5));
	const stepSizeNormal = thickness > 0 ? thickness / thicknessSteps : 0;

	// Precomputed spatial transformation constants (Zero-allocation register math)
	const invSx = 1 / spacing[0];
	const invSy = 1 / spacing[1];
	const invSz = 1 / spacing[2];

	const dirX0 = direction[0] ?? 1;
	const dirX1 = direction[1] ?? 0;
	const dirX2 = direction[2] ?? 0;

	const dirY0 = direction[4] ?? 0;
	const dirY1 = direction[5] ?? 1;
	const dirY2 = direction[6] ?? 0;

	const dirZ0 = direction[8] ?? 0;
	const dirZ1 = direction[9] ?? 0;
	const dirZ2 = direction[10] ?? 1;

	const ox = origin[0] ?? 0;
	const oy = origin[1] ?? 0;
	const oz = origin[2] ?? 0;

	const zSign = Math.sign(zEndWorld - zStartWorld);

	for (let y = 0; y < height; y++) {
		const currentZ = zStartWorld + y * zStepWorld * zSign;
		const tz = currentZ - oz;

		for (let x = 0; x < width; x++) {
			const point = splinePoints[x]!;

			if (thickness === 0) {
				// Single Ray - pure register calculation without Float32Array allocations
				const tx = point.x - ox;
				const ty = point.y - oy;

				const ix = (tx * dirX0 + ty * dirX1 + tz * dirX2) * invSx;
				const iy = (tx * dirY0 + ty * dirY1 + tz * dirY2) * invSy;
				const iz = (tx * dirZ0 + ty * dirZ1 + tz * dirZ2) * invSz;

				pixels[y * width + x] = trilinearInterpolate(
					scalarData,
					dimensions,
					ix,
					iy,
					iz,
				);
			} else {
				// Thick Slab Raycasting along the normal
				const normal = normals[x]!;
				let accumulator = blendMode === "mip" ? -Infinity : 0;
				const halfThickness = thickness / 2;

				for (let s = 0; s <= thicknessSteps; s++) {
					const offset = -halfThickness + s * stepSizeNormal;
					const sampleX = point.x + normal.x * offset;
					const sampleY = point.y + normal.y * offset;

					const tx = sampleX - ox;
					const ty = sampleY - oy;

					const ix = (tx * dirX0 + ty * dirX1 + tz * dirX2) * invSx;
					const iy = (tx * dirY0 + ty * dirY1 + tz * dirY2) * invSy;
					const iz = (tx * dirZ0 + ty * dirZ1 + tz * dirZ2) * invSz;

					const value = trilinearInterpolate(
						scalarData,
						dimensions,
						ix,
						iy,
						iz,
					);

					if (blendMode === "mip") {
						if (value > accumulator) accumulator = value;
					} else {
						accumulator += value;
					}
				}

				if (blendMode === "average") {
					accumulator = accumulator / (thicknessSteps + 1);
				}

				pixels[y * width + x] = accumulator;
			}
		}
	}

	return { width, height, pixels };
}

/**
 * Calculates the shortest distance from a 3D point (implant apex) to a line segment (nerve segment).
 */
export function distancePointToLineSegment(p: vec3, v: vec3, w: vec3): number {
	const l2 = vec3.squaredDistance(v, w);
	if (l2 === 0) return vec3.distance(p, v);

	const vw = vec3.create();
	vec3.subtract(vw, w, v);

	const pv = vec3.create();
	vec3.subtract(pv, p, v);

	let t = vec3.dot(pv, vw) / l2;
	t = Math.max(0, Math.min(1, t));

	const projection = vec3.create();
	vec3.scale(vw, vw, t);
	vec3.add(projection, v, vw);

	return vec3.distance(p, projection);
}

/**
 * Calculates shortest distance from a point to a 3D spline (array of connected points).
 */
export function distancePointToSpline(p: vec3, spline: vec3[]): number {
	if (spline.length === 0) return Infinity;
	if (spline.length === 1) return vec3.distance(p, spline[0]!);

	let minDist = Infinity;
	for (let i = 0; i < spline.length - 1; i++) {
		const dist = distancePointToLineSegment(p, spline[i]!, spline[i + 1]!);
		if (dist < minDist) minDist = dist;
	}
	return minDist;
}

/**
 * Classifies Bone Density (HU) into D1-D4 scale (Misch bone density classification).
 */
export function classifyBoneDensity(hu: number): "D1" | "D2" | "D3" | "D4" {
	if (hu > 1250) return "D1";
	if (hu >= 850) return "D2";
	if (hu >= 350) return "D3";
	return "D4";
}

/**
 * Virtual Probe: Calculates average HU inside a cylindrical area (Implant).
 */
export function calculateImplantBoneDensity(
	scalarData: Float32Array | Uint16Array | Uint8Array | Int16Array | ArrayLike<number>,
	dimensions: [number, number, number],
	origin: vec3,
	direction: mat4,
	spacing: vec3,
	implantStartWorld: vec3,
	implantEndWorld: vec3,
	diameter: number,
): { averageHU: number; classification: string } {
	const implantVec = vec3.create();
	vec3.subtract(implantVec, implantEndWorld, implantStartWorld);

	const length = vec3.length(implantVec);
	if (length === 0) return { averageHU: 0, classification: "D4" };

	const implantDir = vec3.create();
	vec3.scale(implantDir, implantVec, 1 / length);

	const stepSize = 0.5;
	const radius = diameter / 2 + 1.0;

	let totalHU = 0;
	let count = 0;

	let arbitrary = vec3.fromValues(1, 0, 0);
	if (Math.abs(implantDir[0]) > 0.9) arbitrary = vec3.fromValues(0, 1, 0);

	const ortho1 = vec3.create();
	vec3.cross(ortho1, implantDir, arbitrary);
	vec3.normalize(ortho1, ortho1);

	const ortho2 = vec3.create();
	vec3.cross(ortho2, implantDir, ortho1);
	vec3.normalize(ortho2, ortho2);

	const centerWorld = vec3.create();
	const tempDir = vec3.create();
	const offset = vec3.create();
	const o1 = vec3.create();
	const o2 = vec3.create();
	const sampleWorld = vec3.create();
	const idx = vec3.create();

	for (let l = 0; l <= length; l += stepSize) {
		vec3.scale(tempDir, implantDir, l);
		vec3.add(centerWorld, implantStartWorld, tempDir);

		for (let r = 0; r <= radius; r += stepSize) {
			if (r === 0) {
				worldToIndex(centerWorld, origin, direction, spacing, idx);
				const val = trilinearInterpolate(
					scalarData as Float32Array,
					dimensions,
					idx[0],
					idx[1],
					idx[2],
				);
				totalHU += val;
				count++;
				continue;
			}

			const numAngles = Math.max(4, Math.floor((2 * Math.PI * r) / stepSize));
			for (let i = 0; i < numAngles; i++) {
				const theta = (i / numAngles) * 2 * Math.PI;

				vec3.scale(o1, ortho1, r * Math.cos(theta));
				vec3.scale(o2, ortho2, r * Math.sin(theta));
				vec3.add(offset, o1, o2);

				vec3.add(sampleWorld, centerWorld, offset);

				worldToIndex(sampleWorld, origin, direction, spacing, idx);
				const val = trilinearInterpolate(
					scalarData as Float32Array,
					dimensions,
					idx[0],
					idx[1],
					idx[2],
				);
				totalHU += val;
				count++;
			}
		}
	}

	const avg = count > 0 ? totalHU / count : 0;

	return {
		averageHU: Math.round(avg),
		classification: classifyBoneDensity(avg),
	};
}

export interface CurveFrame {
	point: Point3D;
	tangent: Point3D;
	normal: Point3D;
	up: Point3D;
}

function normalize(v: Point3D): Point3D {
	const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
	if (length === 0) return { x: 0, y: 0, z: 0 };
	return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function cross(a: Point3D, b: Point3D): Point3D {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x,
	};
}

export function generateCatmullRomSpline(
	points: Point3D[],
	samples: number = 200,
): Point3D[] {
	if (points.length < 2) return points;

	const curve: Point3D[] = [];
	const pList = [points[0]!, ...points, points[points.length - 1]!];

	for (let i = 1; i < pList.length - 2; i++) {
		const p0 = pList[i - 1]!;
		const p1 = pList[i]!;
		const p2 = pList[i + 1]!;
		const p3 = pList[i + 2]!;

		const segmentSamples = Math.floor(samples / (points.length - 1));
		for (let t = 0; t < 1.0; t += 1.0 / segmentSamples) {
			const t2 = t * t;
			const t3 = t2 * t;

			const x =
				0.5 *
				(2 * p1.x +
					(-p0.x + p2.x) * t +
					(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
					(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

			const y =
				0.5 *
				(2 * p1.y +
					(-p0.y + p2.y) * t +
					(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
					(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

			const z =
				0.5 *
				(2 * p1.z +
					(-p0.z + p2.z) * t +
					(2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
					(-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);

			curve.push({ x, y, z });
		}
	}

	curve.push(points[points.length - 1]!);
	return curve;
}

export function calculateCurveFrames(curve: Point3D[]): CurveFrame[] {
	if (curve.length < 2) return [];

	const frames: CurveFrame[] = [];
	const up: Point3D = { x: 0, y: 0, z: -1 };

	for (let i = 0; i < curve.length; i++) {
		const p = curve[i]!;
		let tangent: Point3D;

		if (i === 0) {
			const next = curve[i + 1]!;
			tangent = normalize({
				x: next.x - p.x,
				y: next.y - p.y,
				z: next.z - p.z,
			});
		} else if (i === curve.length - 1) {
			const prev = curve[i - 1]!;
			tangent = normalize({
				x: p.x - prev.x,
				y: p.y - prev.y,
				z: p.z - prev.z,
			});
		} else {
			const next = curve[i + 1]!;
			const prev = curve[i - 1]!;
			tangent = normalize({
				x: next.x - prev.x,
				y: next.y - prev.y,
				z: next.z - prev.z,
			});
		}

		const normal = normalize(cross(up, tangent));
		frames.push({ point: p, tangent, normal, up });
	}

	return frames;
}
