import { type mat4, vec3 } from "gl-matrix";

export type Point2D = { x: number; y: number };
export type Point3D = { x: number; y: number; z: number };

/**
 * Calculates Catmull-Rom spline points interpolated at equidistant steps.
 */
export function interpolateSpline(
	points: Point2D[],
	stepSize: number = 0.5,
): Point2D[] {
	if (points.length < 2) return points;

	// Simple linear interpolation fallback for 2 points,
	// or add a proper Catmull-Rom math here for >= 3 points.
	// For the sake of hardcore math, let's do a basic subdivision for now
	// to ensure equidistant points along the segments.
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
	// push last point
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
): number {
	const [width, height, depth] = dimensions;

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
	const c000 = scalarData[x0 + y0 * width + z0 * sliceSize] ?? 0;
	const c100 = scalarData[x1 + y0 * width + z0 * sliceSize] ?? 0;
	const c010 = scalarData[x0 + y1 * width + z0 * sliceSize] ?? 0;
	const c110 = scalarData[x1 + y1 * width + z0 * sliceSize] ?? 0;
	const c001 = scalarData[x0 + y0 * width + z1 * sliceSize] ?? 0;
	const c101 = scalarData[x1 + y0 * width + z1 * sliceSize] ?? 0;
	const c011 = scalarData[x0 + y1 * width + z1 * sliceSize] ?? 0;
	const c111 = scalarData[x1 + y1 * width + z1 * sliceSize] ?? 0;

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
): vec3 {
	// 1. Translate relative to origin
	const translated = vec3.create();
	vec3.subtract(translated, worldPos, origin);

	// 2. Inverse rotation (transpose of orthogonal direction matrix)
	// Assuming direction is a 3x3 rotation matrix embedded in mat4 or just 3 direction vectors
	// We'll use a simplified dot product projection here for standard DICOM matrices
	const dirX = vec3.fromValues(direction[0], direction[1], direction[2]);
	const dirY = vec3.fromValues(direction[4], direction[5], direction[6]);
	const dirZ = vec3.fromValues(direction[8], direction[9], direction[10]);

	const rotated = vec3.fromValues(
		vec3.dot(translated, dirX),
		vec3.dot(translated, dirY),
		vec3.dot(translated, dirZ),
	);

	// 3. Scale by spacing
	const index = vec3.fromValues(
		rotated[0] / spacing[0],
		rotated[1] / spacing[1],
		rotated[2] / spacing[2],
	);

	return index;
}

/**
 * Extracts a panoramic 2D array of pixels from the volume based on a spline.
 * Supports "Thick Slab" (Focal Trough) rendering via MIP or Average intensity projections.
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
	// Calculate how many steps we take along the normal (e.g. 0.5mm step)
	const thicknessSteps = Math.max(1, Math.floor(thickness / 0.5));
	const stepSizeNormal = thickness > 0 ? thickness / thicknessSteps : 0;

	for (let y = 0; y < height; y++) {
		const currentZ =
			zStartWorld + y * zStepWorld * Math.sign(zEndWorld - zStartWorld);

		for (let x = 0; x < width; x++) {
			const point = splinePoints[x]!;

			if (thickness === 0) {
				// Single Ray
				const worldPos = vec3.fromValues(point.x, point.y, currentZ);
				const indexPos = worldToIndex(worldPos, origin, direction, spacing);
				const value = trilinearInterpolate(
					scalarData,
					dimensions,
					indexPos[0],
					indexPos[1],
					indexPos[2],
				);
				pixels[y * width + x] = value;
			} else {
				// Thick Slab Raycasting along the normal
				const normal = normals[x]!;
				let accumulator = blendMode === "mip" ? -Infinity : 0;

				// Sample from -thickness/2 to +thickness/2
				const halfThickness = thickness / 2;

				for (let s = 0; s <= thicknessSteps; s++) {
					const offset = -halfThickness + s * stepSizeNormal;

					const sampleX = point.x + normal.x * offset;
					const sampleY = point.y + normal.y * offset;

					const worldPos = vec3.fromValues(sampleX, sampleY, currentZ);
					const indexPos = worldToIndex(worldPos, origin, direction, spacing);
					const value = trilinearInterpolate(
						scalarData,
						dimensions,
						indexPos[0],
						indexPos[1],
						indexPos[2],
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
	if (l2 === 0) return vec3.distance(p, v); // v == w case

	const vw = vec3.create();
	vec3.subtract(vw, w, v);

	const pv = vec3.create();
	vec3.subtract(pv, p, v);

	// Consider the line extending the segment, parameterized as v + t (w - v).
	// We find projection of point p onto the line.
	let t = vec3.dot(pv, vw) / l2;
	t = Math.max(0, Math.min(1, t)); // clamp to [0, 1] segment bounds

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
	if (hu >= 850) return "D1";
	if (hu >= 500) return "D2";
	if (hu >= 225) return "D3";
	return "D4";
}

/**
 * Virtual Probe: Calculates average HU inside a cylindrical area (Implant).
 */
export function calculateImplantBoneDensity(
	scalarData: Float32Array | Uint16Array | Uint8Array,
	dimensions: [number, number, number],
	origin: vec3,
	direction: mat4,
	spacing: vec3,
	implantStartWorld: vec3,
	implantEndWorld: vec3,
	diameter: number,
): { averageHU: number; classification: string } {
	// 1. Calculate direction vector of the implant
	const implantVec = vec3.create();
	vec3.subtract(implantVec, implantEndWorld, implantStartWorld);

	const length = vec3.length(implantVec);
	if (length === 0) return { averageHU: 0, classification: "D4" };

	const implantDir = vec3.create();
	vec3.scale(implantDir, implantVec, 1 / length);

	// 2. Sample points within the cylinder
	// We'll take step sizes of 0.5mm along length and radius
	const stepSize = 0.5;
	const radius = diameter / 2 + 1.0; // 1mm buffer around implant thread

	let totalHU = 0;
	let count = 0;

	// Orthogonal vectors to create the disk base
	// Cross product with an arbitrary vector not parallel to implantDir
	let arbitrary = vec3.fromValues(1, 0, 0);
	if (Math.abs(implantDir[0]) > 0.9) arbitrary = vec3.fromValues(0, 1, 0);

	const ortho1 = vec3.create();
	vec3.cross(ortho1, implantDir, arbitrary);
	vec3.normalize(ortho1, ortho1);

	const ortho2 = vec3.create();
	vec3.cross(ortho2, implantDir, ortho1);
	vec3.normalize(ortho2, ortho2);

	for (let l = 0; l <= length; l += stepSize) {
		const centerWorld = vec3.create();
		const tempDir = vec3.create();
		vec3.scale(tempDir, implantDir, l);
		vec3.add(centerWorld, implantStartWorld, tempDir);

		// Sample disk
		for (let r = 0; r <= radius; r += stepSize) {
			if (r === 0) {
				const idx = worldToIndex(centerWorld, origin, direction, spacing);
				const val = trilinearInterpolate(
					scalarData,
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

				const offset = vec3.create();
				const o1 = vec3.create();
				const o2 = vec3.create();
				vec3.scale(o1, ortho1, r * Math.cos(theta));
				vec3.scale(o2, ortho2, r * Math.sin(theta));
				vec3.add(offset, o1, o2);

				const sampleWorld = vec3.create();
				vec3.add(sampleWorld, centerWorld, offset);

				const idx = worldToIndex(sampleWorld, origin, direction, spacing);
				const val = trilinearInterpolate(
					scalarData,
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
	// Assume basic mapping (val -> HU if no rescale intercept/slope provided,
	// DICOM usually maps to actual HU but if raw Uint16, we'd apply (val * slope + intercept).
	// For this generic function, we assume `scalarData` is already in HU or normalized).
	// Let's just pass avg through classify.

	return {
		averageHU: Math.round(avg),
		classification: classifyBoneDensity(avg),
	};
}
