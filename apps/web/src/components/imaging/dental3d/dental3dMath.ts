/**
 * apps/web/src/components/imaging/dental3d/dental3dMath.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 3D DENTAL GEOMETRY, OCCLUSAL DISTANCE SHADERS & CAD MATRIX TRANSFORMATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * CAD Z-Up -> WebGL Y-Up coordinate transforms, 4x4 occlusion alignment,
 * vertex contact distance computation (<50um red, 50-150um green, 150-350um blue),
 * preparation undercut analysis, and zip archive extraction.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { unzipSync } from "fflate";
import {
	CAD_Z_UP_TO_THREE_Y_UP_MATRIX,
	OCCLUSION_THRESHOLDS_MICRONS,
	detectAndNormalizeUnits,
} from "@dental/shared/geometry";
import type { DentalArchLayer, OcclusionContactStats } from "./dental3dTypes.js";

export { CAD_Z_UP_TO_THREE_Y_UP_MATRIX, OCCLUSION_THRESHOLDS_MICRONS, detectAndNormalizeUnits };

/**
 * Standard CAD to WebGL 4x4 rotation matrix.
 * Dental scanners (3Shape Trios, Medit, iTero, Carestream) output meshes in CAD
 * coordinate space where Z points incisally/superiorly (+Z up) and Y points anteriorly.
 * WebGL and Three.js camera uses +Y up, -Z into screen, +X right.
 * Rotating -90 deg around X brings +Z to +Y, and +Y to -Z.
 */
export const CAD_TO_WEBGL_ROTATION_X = -Math.PI / 2;

/**
 * Applies CAD Z-up to WebGL Y-up coordinate transformation using @dental/shared canonical matrix.
 */
export function orientCadMeshToWebGl(object: THREE.Object3D): void {
	const mat = new THREE.Matrix4().fromArray(CAD_Z_UP_TO_THREE_Y_UP_MATRIX);
	object.applyMatrix4(mat);
	object.updateMatrix();
}

/**
 * Standard identity 4x4 occlusion matrix (16 floats, column-major).
 */
export const DEFAULT_OCCLUSION_MATRIX_16: number[] = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1,
];

/**
 * Applies a 4x4 occlusion matrix to an Object3D / Mesh (lower jaw bite alignment).
 */
export function applyOcclusionTransform(
	target: THREE.Object3D,
	matrixArray: number[] | undefined,
): void {
	if (!matrixArray || matrixArray.length !== 16) return;
	const mat = new THREE.Matrix4();
	mat.fromArray(matrixArray);
	target.applyMatrix4(mat);
}

/**
 * Occlusal distance color coding thresholds in microns (um) & millimeters (mm).
 * - < 50 um (< 0.05 mm): Bright Red (Premature/Hard Contact)
 * - 50 - 150 um (0.05 - 0.15 mm): Green (Ideal Physiological Contact)
 * - 150 - 350 um (0.15 - 0.35 mm): Blue (Clearance / Restorative Gap)
 * - > 350 um (> 0.35 mm): Enamel Neutral
 */
export const OCCLUSION_THRESHOLDS_MM = {
	HARD_CONTACT_MAX: 0.05, // 50 um
	NORMAL_CONTACT_MAX: 0.15, // 150 um
	CLEARANCE_MAX: 0.35, // 350 um
} as const;

export const OCCLUSION_COLORS = {
	HARD: new THREE.Color(0xef4444), // Red
	NORMAL: new THREE.Color(0x22c55e), // Green
	CLEARANCE: new THREE.Color(0x3b82f6), // Blue
	NEUTRAL: new THREE.Color(0xf1f5f9), // Slate white
} as const;

/**
 * Calculates occlusal proximity and generates vertex colors for the heatmap.
 * Compares vertices between upper and lower dental meshes.
 */
export function generateOcclusionHeatmapColors(
	meshA: THREE.Mesh,
	meshB: THREE.Mesh,
): { colorsA: Float32Array; stats: OcclusionContactStats } {
	const geomA = meshA.geometry;
	const geomB = meshB.geometry;
	const posA = geomA.attributes.position;
	const posB = geomB.attributes.position;

	if (!posA || !posB) {
		return {
			colorsA: new Float32Array(0),
			stats: {
				hardContactCount: 0,
				optimalContactCount: 0,
				clearanceCount: 0,
				minDistanceUm: 0,
				averageContactUm: 0,
			},
		};
	}

	meshA.updateMatrixWorld(true);
	meshB.updateMatrixWorld(true);

	const vA = new THREE.Vector3();
	const vB = new THREE.Vector3();
	const vertexCountA = posA.count;
	const colors = new Float32Array(vertexCountA * 3);

	// Pre-sample bounding box for target mesh to speed up distance queries
	const boxB = new THREE.Box3().setFromObject(meshB);
	boxB.expandByScalar(OCCLUSION_THRESHOLDS_MM.CLEARANCE_MAX * 2);

	let hardCount = 0;
	let optimalCount = 0;
	let clearanceCount = 0;
	let minDistanceMm = Number.POSITIVE_INFINITY;
	let sumContactDistanceMm = 0;
	let measuredContacts = 0;

	// Build a spatial grid or sample vertices
	const countB = posB.count;
	const stepB = Math.max(1, Math.floor(countB / 2000)); // Sample up to 2000 reference points for performance
	const sampledPointsB: THREE.Vector3[] = [];
	for (let j = 0; j < countB; j += stepB) {
		const pt = new THREE.Vector3(posB.getX(j), posB.getY(j), posB.getZ(j));
		pt.applyMatrix4(meshB.matrixWorld);
		sampledPointsB.push(pt);
	}

	for (let i = 0; i < vertexCountA; i++) {
		vA.set(posA.getX(i), posA.getY(i), posA.getZ(i));
		vA.applyMatrix4(meshA.matrixWorld);

		// If outside bounding box of antagonist, treat as neutral
		if (!boxB.containsPoint(vA)) {
			colors[i * 3] = OCCLUSION_COLORS.NEUTRAL.r;
			colors[i * 3 + 1] = OCCLUSION_COLORS.NEUTRAL.g;
			colors[i * 3 + 2] = OCCLUSION_COLORS.NEUTRAL.b;
			continue;
		}

		// Find nearest antagonist vertex
		let closestDistSq = Number.POSITIVE_INFINITY;
		for (let s = 0; s < sampledPointsB.length; s++) {
			const p = sampledPointsB[s]!;
			const dx = vA.x - p.x;
			const dy = vA.y - p.y;
			const dz = vA.z - p.z;
			const distSq = dx * dx + dy * dy + dz * dz;
			if (distSq < closestDistSq) {
				closestDistSq = distSq;
			}
		}

		const distMm = Math.sqrt(closestDistSq);
		if (distMm < minDistanceMm) {
			minDistanceMm = distMm;
		}

		if (distMm < OCCLUSION_THRESHOLDS_MM.HARD_CONTACT_MAX) {
			hardCount++;
			sumContactDistanceMm += distMm;
			measuredContacts++;
			colors[i * 3] = OCCLUSION_COLORS.HARD.r;
			colors[i * 3 + 1] = OCCLUSION_COLORS.HARD.g;
			colors[i * 3 + 2] = OCCLUSION_COLORS.HARD.b;
		} else if (distMm < OCCLUSION_THRESHOLDS_MM.NORMAL_CONTACT_MAX) {
			optimalCount++;
			sumContactDistanceMm += distMm;
			measuredContacts++;
			colors[i * 3] = OCCLUSION_COLORS.NORMAL.r;
			colors[i * 3 + 1] = OCCLUSION_COLORS.NORMAL.g;
			colors[i * 3 + 2] = OCCLUSION_COLORS.NORMAL.b;
		} else if (distMm < OCCLUSION_THRESHOLDS_MM.CLEARANCE_MAX) {
			clearanceCount++;
			colors[i * 3] = OCCLUSION_COLORS.CLEARANCE.r;
			colors[i * 3 + 1] = OCCLUSION_COLORS.CLEARANCE.g;
			colors[i * 3 + 2] = OCCLUSION_COLORS.CLEARANCE.b;
		} else {
			colors[i * 3] = OCCLUSION_COLORS.NEUTRAL.r;
			colors[i * 3 + 1] = OCCLUSION_COLORS.NEUTRAL.g;
			colors[i * 3 + 2] = OCCLUSION_COLORS.NEUTRAL.b;
		}
	}

	const minUm = Number.isFinite(minDistanceMm) ? Math.round(minDistanceMm * 1000) : 0;
	const avgUm = measuredContacts > 0 ? Math.round((sumContactDistanceMm / measuredContacts) * 1000) : 0;

	return {
		colorsA: colors,
		stats: {
			hardContactCount: hardCount,
			optimalContactCount: optimalCount,
			clearanceCount: clearanceCount,
			minDistanceUm: minUm,
			averageContactUm: avgUm,
		},
	};
}

/**
 * Computes preparation undercut (поднутрение) highlighting on a tooth preparation.
 * For each vertex normal n and insertion path vector v:
 * if dot(n, v) < 0, an undercut exists that prevents seating a crown without path blockage.
 */
export function generateUndercutHighlightColors(
	geometry: THREE.BufferGeometry,
	insertionVector = new THREE.Vector3(0, 1, 0),
): Float32Array {
	geometry.computeVertexNormals();
	const normals = geometry.attributes.normal;
	const pos = geometry.attributes.position;
	if (!normals || !pos) return new Float32Array(0);

	const count = normals.count;
	const colors = new Float32Array(count * 3);
	const n = new THREE.Vector3();
	const v = insertionVector.clone().normalize();

	const UNDERCUT_COLOR = new THREE.Color(0xef4444); // Red/Orange warning
	const CLEAR_COLOR = new THREE.Color(0x10b981); // Emerald / Clear pass
	const MARGIN_COLOR = new THREE.Color(0xfacc15); // Yellow transition

	for (let i = 0; i < count; i++) {
		n.set(normals.getX(i), normals.getY(i), normals.getZ(i));
		const dot = n.dot(v);

		if (dot < -0.05) {
			// Undercut detected
			colors[i * 3] = UNDERCUT_COLOR.r;
			colors[i * 3 + 1] = UNDERCUT_COLOR.g;
			colors[i * 3 + 2] = UNDERCUT_COLOR.b;
		} else if (dot < 0.1) {
			// Near-parallel marginal wall
			colors[i * 3] = MARGIN_COLOR.r;
			colors[i * 3 + 1] = MARGIN_COLOR.g;
			colors[i * 3 + 2] = MARGIN_COLOR.b;
		} else {
			// Favorable clearance angle
			colors[i * 3] = CLEAR_COLOR.r;
			colors[i * 3 + 1] = CLEAR_COLOR.g;
			colors[i * 3 + 2] = CLEAR_COLOR.b;
		}
	}

	return colors;
}

/**
 * Extracts dental meshes from a dropped ZIP archive.
 * Auto-detects layer type by matching standard CAD naming conventions:
 * 3Shape, Medit, Carestream, iTero, Sirona export patterns.
 */
export function extractDentalScansFromZip(
	zipBuffer: ArrayBuffer,
): Array<{ name: string; layer: DentalArchLayer; format: "ply" | "stl" | "obj"; buffer: ArrayBuffer }> {
	const unzipped = unzipSync(new Uint8Array(zipBuffer)) as Record<string, Uint8Array>;
	const results: Array<{
		name: string;
		layer: DentalArchLayer;
		format: "ply" | "stl" | "obj";
		buffer: ArrayBuffer;
	}> = [];

	for (const [filename, fileBytes] of Object.entries(unzipped)) {
		const lower = filename.toLowerCase();
		let format: "ply" | "stl" | "obj" | null = null;
		if (lower.endsWith(".ply")) format = "ply";
		else if (lower.endsWith(".stl")) format = "stl";
		else if (lower.endsWith(".obj")) format = "obj";

		if (!format) continue;

		let layer: DentalArchLayer = "upper";
		if (
			lower.includes("lower") ||
			lower.includes("mandib") ||
			lower.includes("inf") ||
			lower.includes("bottom") ||
			lower.includes("нч")
		) {
			layer = "lower";
		} else if (
			lower.includes("upper") ||
			lower.includes("maxil") ||
			lower.includes("sup") ||
			lower.includes("top") ||
			lower.includes("вч")
		) {
			layer = "upper";
		} else if (
			lower.includes("bite") ||
			lower.includes("occl") ||
			lower.includes("прикус") ||
			lower.includes("regist")
		) {
			layer = "bite";
		} else if (
			lower.includes("prep") ||
			lower.includes("stump") ||
			lower.includes("культ") ||
			lower.includes("die")
		) {
			layer = "prep";
		} else if (
			lower.includes("scanbody") ||
			lower.includes("locator") ||
			lower.includes("implant") ||
			lower.includes("боди")
		) {
			layer = "scanbody";
		}

		const bytes = fileBytes as Uint8Array;
		const copyBuffer = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(copyBuffer).set(bytes);

		results.push({
			name: filename.split("/").pop() || filename,
			layer,
			format,
			buffer: copyBuffer,
		});
	}

	return results;
}

/**
 * Creates realistic procedural anatomical dental arch geometry for demo / instant preview.
 * Includes dental arch curve, tooth crowns (incisors, canines, premolars, molars) and alveolar gingiva.
 * Features true 24-bit vertex colors (TrueColor PLY standard): enamel ivory and gingival pink.
 */
export function createProceduralDentalArch(isUpper = true): THREE.BufferGeometry {
	const teethCount = 14;
	const archRadiusX = 26; // Dental arch transverse width in mm
	const archRadiusZ = 28; // Dental arch sagittal depth in mm
	const toothHeight = 7.5;
	const toothWidth = 5.2;

	const geometries: THREE.BufferGeometry[] = [];

	// Dental Arch Curve: Elliptic parabola typical of human arch
	for (let i = 0; i < teethCount; i++) {
		const t = (i / (teethCount - 1)) * Math.PI - Math.PI / 2; // -PI/2 to +PI/2
		const x = Math.sin(t) * archRadiusX;
		const z = -Math.cos(t) * archRadiusZ * 0.85;
		const y = isUpper ? 3.0 : -3.0;

		// Morph shape based on anterior vs posterior
		const isMolar = i <= 2 || i >= teethCount - 3;
		const isAnterior = i >= 5 && i <= 8;
		const radX = isMolar ? toothWidth * 0.9 : isAnterior ? toothWidth * 0.7 : toothWidth * 0.8;
		const radZ = isMolar ? toothWidth * 0.95 : isAnterior ? toothWidth * 0.45 : toothWidth * 0.7;

		const toothGeom = new THREE.CylinderGeometry(radX * 0.9, radX, toothHeight, 16, 4);
		toothGeom.scale(1, 1, radZ / radX);

		// Orient tooth along arch tangent
		const tangentX = Math.cos(t);
		const tangentZ = Math.sin(t);
		const angle = Math.atan2(tangentX, tangentZ);
		toothGeom.rotateY(angle);

		toothGeom.translate(x, y, z);

		// Paint enamel TrueColor: subtle ivory gradient
		const pos = toothGeom.attributes.position!;
		const colors = new Float32Array(pos.count * 3);
		for (let v = 0; v < pos.count; v++) {
			const py = pos.getY(v);
			const ratio = (py + toothHeight / 2) / toothHeight;
			// Incisal edge translucent ivory (#f8fafc) -> Cervical enamel (#fef08a tint)
			colors[v * 3] = 0.96 + ratio * 0.03;
			colors[v * 3 + 1] = 0.95 + ratio * 0.04;
			colors[v * 3 + 2] = 0.91 + ratio * 0.08;
		}
		toothGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geometries.push(toothGeom);
	}

	// Alveolar Gingiva: Torus-like soft tissue base along the arch
	const gingivaCurvePoints: THREE.Vector3[] = [];
	for (let i = 0; i <= 24; i++) {
		const t = (i / 24) * Math.PI - Math.PI / 2;
		const x = Math.sin(t) * (archRadiusX * 0.95);
		const z = -Math.cos(t) * (archRadiusZ * 0.85);
		const y = isUpper ? 6.0 : -6.0;
		gingivaCurvePoints.push(new THREE.Vector3(x, y, z));
	}
	const curve = new THREE.CatmullRomCurve3(gingivaCurvePoints);
	const gingivaGeom = new THREE.TubeGeometry(curve, 32, 4.5, 12, false);

	// Paint Gingiva TrueColor: healthy natural pink (#e27b88 / #f43f5e blend)
	const gingivaPos = gingivaGeom.attributes.position!;
	const gingivaColors = new Float32Array(gingivaPos.count * 3);
	for (let v = 0; v < gingivaPos.count; v++) {
		gingivaColors[v * 3] = 0.88; // Red
		gingivaColors[v * 3 + 1] = 0.48; // Green
		gingivaColors[v * 3 + 2] = 0.55; // Blue
	}
	gingivaGeom.setAttribute("color", new THREE.BufferAttribute(gingivaColors, 3));
	geometries.push(gingivaGeom);

	// Merge into single cohesive BufferGeometry
	return mergeBufferGeometries(geometries);
}

/**
 * Utility to merge multiple BufferGeometries with color attributes.
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
	let totalVertices = 0;
	let totalIndices = 0;

	for (const g of geometries) {
		const pos = g.attributes.position;
		if (pos) {
			totalVertices += pos.count;
			totalIndices += g.index ? g.index.count : pos.count;
		}
	}

	const mergedPositions = new Float32Array(totalVertices * 3);
	const mergedNormals = new Float32Array(totalVertices * 3);
	const mergedColors = new Float32Array(totalVertices * 3);
	const mergedIndices = new Uint32Array(totalIndices);

	let vertexOffset = 0;
	let indexOffset = 0;

	for (const g of geometries) {
		g.computeVertexNormals();
		const pos = g.attributes.position!;
		const norm = g.attributes.normal!;
		const col = g.attributes.color;
		const idx = g.index;

		for (let i = 0; i < pos.count; i++) {
			const target = (vertexOffset + i) * 3;
			mergedPositions[target] = pos.getX(i);
			mergedPositions[target + 1] = pos.getY(i);
			mergedPositions[target + 2] = pos.getZ(i);

			mergedNormals[target] = norm.getX(i);
			mergedNormals[target + 1] = norm.getY(i);
			mergedNormals[target + 2] = norm.getZ(i);

			if (col) {
				mergedColors[target] = col.getX(i);
				mergedColors[target + 1] = col.getY(i);
				mergedColors[target + 2] = col.getZ(i);
			} else {
				mergedColors[target] = 0.95;
				mergedColors[target + 1] = 0.95;
				mergedColors[target + 2] = 0.93;
			}
		}

		if (idx) {
			for (let j = 0; j < idx.count; j++) {
				mergedIndices[indexOffset + j] = vertexOffset + idx.getX(j);
			}
			indexOffset += idx.count;
		} else {
			for (let j = 0; j < pos.count; j++) {
				mergedIndices[indexOffset + j] = vertexOffset + j;
			}
			indexOffset += pos.count;
		}

		vertexOffset += pos.count;
	}

	const result = new THREE.BufferGeometry();
	result.setAttribute("position", new THREE.BufferAttribute(mergedPositions, 3));
	result.setAttribute("normal", new THREE.BufferAttribute(mergedNormals, 3));
	result.setAttribute("color", new THREE.BufferAttribute(mergedColors, 3));
	result.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
	return result;
}
