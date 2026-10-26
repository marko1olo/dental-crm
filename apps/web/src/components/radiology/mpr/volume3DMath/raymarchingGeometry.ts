import { cleanZero } from "./clippingMath";

export function intersectRayAABB(
	ox: number,
	oy: number,
	oz: number,
	dx: number,
	dy: number,
	dz: number,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	minZ: number,
	maxZ: number,
	tMinLimit: number,
	tMaxLimit: number,
): { hit: boolean; tNear: number; tFar: number } {
	let tNear = tMinLimit;
	let tFar = tMaxLimit;

	if (Math.abs(dx) > 1e-7) {
		const invD = 1.0 / dx;
		let t1 = (minX - ox) * invD;
		let t2 = (maxX - ox) * invD;
		if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (ox < minX || ox > maxX) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	if (Math.abs(dy) > 1e-7) {
		const invD = 1.0 / dy;
		let t1 = (minY - oy) * invD;
		let t2 = (maxY - oy) * invD;
		if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (oy < minY || oy > maxY) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	if (Math.abs(dz) > 1e-7) {
		const invD = 1.0 / dz;
		let t1 = (minZ - oz) * invD;
		let t2 = (maxZ - oz) * invD;
		if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (oz < minZ || oz > maxZ) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	return { hit: true, tNear, tFar };
}

export function computeVolume3DRotationMatrix(yawDeg: number, pitchDeg: number): [number, number, number][] {
	const yawRad = (yawDeg * Math.PI) / 180;
	const pitchRad = (pitchDeg * Math.PI) / 180;

	const cosY = cleanZero(Math.cos(yawRad));
	const sinY = cleanZero(Math.sin(yawRad));
	const cosP = cleanZero(Math.cos(pitchRad));
	const sinP = cleanZero(Math.sin(pitchRad));

	const col0: [number, number, number] = [cosY, sinY, 0];
	const col1: [number, number, number] = [
		cleanZero(-sinY * sinP),
		cleanZero(cosY * sinP),
		cosP,
	];
	const col2: [number, number, number] = [
		cleanZero(-sinY * cosP),
		cleanZero(cosY * cosP),
		cleanZero(-sinP),
	];

	return [col0, col1, col2];
}
