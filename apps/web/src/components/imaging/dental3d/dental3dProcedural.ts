/**
 * apps/web/src/components/imaging/dental3d/dental3dProcedural.ts
 *
 * Procedural Anatomical Arches & Realistic TrueColor Synthesis.
 */

import * as THREE from "three";
import type { DentalArchLayer } from "./dental3dTypes.js";
import { createProceduralDentalArch } from "./dental3dMath.js";

export function createProceduralArches(): {
	upperGeom: THREE.BufferGeometry;
	lowerGeom: THREE.BufferGeometry;
} {
	const upperGeom = createProceduralDentalArch(true);
	const lowerGeom = createProceduralDentalArch(false);
	return { upperGeom, lowerGeom };
}

export function synthesizeTrueColorForGeometry(
	geometry: THREE.BufferGeometry,
	layer: DentalArchLayer,
): THREE.BufferAttribute {
	const pos = geometry.attributes.position;
	if (!pos) {
		return new THREE.BufferAttribute(new Float32Array(0), 3);
	}
	const count = pos.count;
	const colors = new Float32Array(count * 3);

	geometry.computeBoundingBox();
	const bbox = geometry.boundingBox || new THREE.Box3();
	const minY = bbox.min.y;
	const maxY = bbox.max.y;
	const height = Math.max(0.01, maxY - minY);

	for (let i = 0; i < count; i++) {
		const y = pos.getY(i);
		const t = Math.max(0, Math.min(1, (y - minY) / height));

		if (layer === "prep") {
			colors[i * 3] = 0.95;
			colors[i * 3 + 1] = 0.85;
			colors[i * 3 + 2] = 0.65;
		} else if (layer === "scanbody") {
			colors[i * 3] = 0.65;
			colors[i * 3 + 1] = 0.72;
			colors[i * 3 + 2] = 0.82;
		} else {
			if (t < 0.25) {
				colors[i * 3] = 0.88;
				colors[i * 3 + 1] = 0.52;
				colors[i * 3 + 2] = 0.58;
			} else {
				colors[i * 3] = 0.96;
				colors[i * 3 + 1] = 0.95;
				colors[i * 3 + 2] = 0.91;
			}
		}
	}

	const attr = new THREE.BufferAttribute(colors, 3);
	geometry.setAttribute("color", attr);
	return attr;
}
