/**
 * DENTE CRM — CBCT 3D Volume Raymarching & Rotation Mathematics
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Implements:
 * 1. 3D Volume Clipping Box and analytical bounds testing.
 * 2. Device Pixel Ratio clamp (safe DPR <= 1.5) for fill-rate protection on 4K / Retina screens.
 * 3. Clinical HU presets (Череп, Плотная кость, Ткани, MIP).
 * 4. Analytical Ray-AABB slab intersection for 0-step skip outside voxel bounding box.
 * 5. Trackball rotation matrix for patient coordinates (+X lateral, +Y sagittal, +Z vertical).
 * 6. Software Canvas2D raymarching fallback for headless/test environments.
 */

import type { CbctVoxelVolume } from "../cbctMprMath";

export interface Volume3DClippingBox {
	/** Normalized UVW minimum bounds in range [0, 1] [X_min, Y_min, Z_min] */
	clipMin: [number, number, number];
	/** Normalized UVW maximum bounds in range [0, 1] [X_max, Y_max, Z_max] */
	clipMax: [number, number, number];
}

export const DEFAULT_VOLUME_3D_CLIPPING_BOX: Volume3DClippingBox = {
	clipMin: [0.0, 0.0, 0.0],
	clipMax: [1.0, 1.0, 1.0],
};

/**
 * Checks if a normalized point [u, v, w] in [0, 1] is within the clipping box.
 */
export function isPointInsideClippingBox(
	uvw: [number, number, number],
	clipMin: [number, number, number],
	clipMax: [number, number, number],
): boolean {
	return (
		uvw[0] >= clipMin[0] &&
		uvw[0] <= clipMax[0] &&
		uvw[1] >= clipMin[1] &&
		uvw[1] <= clipMax[1] &&
		uvw[2] >= clipMin[2] &&
		uvw[2] <= clipMax[2]
	);
}

/**
 * Clamps device pixel ratio to <= 1.5 to protect fill-rate on 4K / Retina screens
 * and prevent out-of-memory crashes on integrated Intel/AMD GPUs.
 */
export function getSafeDevicePixelRatio(dpr?: number): number {
	const val =
		typeof dpr === "number" && !Number.isNaN(dpr)
			? dpr
			: typeof window !== "undefined"
				? window.devicePixelRatio || 1
				: 1;
	return Math.min(1.5, Math.max(1.0, val));
}

export type Volume3DPresetId =
	| "skull"
	| "dense_bone"
	| "soft_tissue"
	| "mip"
	| "cortical_bone"
	| "cancellous_bone"
	| "enamel_metal";

export interface Volume3DPresetSpec {
	id: Volume3DPresetId;
	label: string;
	shortLabel: string;
	description: string;
	huMin: number;
	huMax: number;
	colorRgb: [number, number, number]; // Base bone tint [R, G, B]
}

export const CBCT_VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	{
		id: "skull",
		label: "Череп (Кость / Челюсть)",
		shortLabel: "Череп",
		description: "Челюстно-лицевой скелет, нижняя и верхняя челюсти, костные структуры (350+ HU)",
		huMin: 350,
		huMax: 2000,
		colorRgb: [242, 232, 214], // Clean warm bone ivory
	},
	{
		id: "dense_bone",
		label: "Плотная кость / Зубы",
		shortLabel: "Плотная",
		description: "Кортикальная пластинка, зубной ряд, эмаль и дентин (550+ HU)",
		huMin: 550,
		huMax: 3000,
		colorRgb: [255, 252, 240], // High-density cortical ivory
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани (-100..+300 HU)",
		shortLabel: "Ткани",
		description: "Слизистая оболочка, десна и контуры мягких тканей лица (-100..+300 HU)",
		huMin: -100,
		huMax: 300,
		colorRgb: [225, 185, 170], // Flesh and mucosa tint
	},
	{
		id: "mip",
		label: "MIP (Максимум)",
		shortLabel: "MIP",
		description: "Проекция максимальной интенсивности по всей глубине объема (250+ HU)",
		huMin: 250,
		huMax: 3000,
		colorRgb: [220, 240, 255], // Clear radiologic cyan-white
	},
] as const;

export const CBCT_CLINICAL_VOLUME_PRESETS: readonly Volume3DPresetSpec[] = [
	{
		id: "cortical_bone",
		label: "Кортикальная кость (+600..+2000 HU)",
		shortLabel: "Кортикал",
		description: "Компактная пластинка альвеолярного отростка и базиса челюсти (+600..+2000 HU)",
		huMin: 600,
		huMax: 2000,
		colorRgb: [255, 250, 240],
	},
	{
		id: "cancellous_bone",
		label: "Губчатая кость (+200..+800 HU)",
		shortLabel: "Губчатая",
		description: "Трабекулярная сеть губчатого вещества челюсти (+200..+800 HU)",
		huMin: 200,
		huMax: 800,
		colorRgb: [238, 224, 204],
	},
	{
		id: "enamel_metal",
		label: "Эмаль зубов и металл (+1500..+3000 HU)",
		shortLabel: "Эмаль/Металл",
		description: "Высокоминерализованная зубная эмаль, дентин и металлические коронки (+1500..+3000 HU)",
		huMin: 1500,
		huMax: 3000,
		colorRgb: [255, 255, 255],
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани (-100..+300 HU)",
		shortLabel: "Ткани",
		description: "Слизистая оболочка, десна и контуры мягких тканей лица (-100..+300 HU)",
		huMin: -100,
		huMax: 300,
		colorRgb: [225, 185, 170],
	},
] as const;

export const ALL_CBCT_VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	...CBCT_VOLUME_3D_PRESETS,
	...CBCT_CLINICAL_VOLUME_PRESETS.filter(
		(cp) => !CBCT_VOLUME_3D_PRESETS.some((bp) => bp.id === cp.id),
	),
];

export function getVolume3DPreset(id: Volume3DPresetId): Volume3DPresetSpec {
	return (
		ALL_CBCT_VOLUME_3D_PRESETS.find((p) => p.id === id) ??
		CBCT_VOLUME_3D_PRESETS.find((p) => p.id === id) ??
		CBCT_VOLUME_3D_PRESETS[0]!
	);
}

export function cleanZero(val: number): number {
	return Math.abs(val) < 1e-9 ? 0 : val;
}

/**
 * Analytical Ray-AABB (Axis-Aligned Bounding Box) Slab Intersection.
 * Determines if a 3D ray intersects the volume bounding box and computes the [tNear, tFar] entry/exit points.
 */
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

	// X slab
	if (Math.abs(dx) > 1e-7) {
		const invD = 1.0 / dx;
		let t1 = (minX - ox) * invD;
		let t2 = (maxX - ox) * invD;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (ox < minX || ox > maxX) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	// Y slab
	if (Math.abs(dy) > 1e-7) {
		const invD = 1.0 / dy;
		let t1 = (minY - oy) * invD;
		let t2 = (maxY - oy) * invD;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (oy < minY || oy > maxY) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	// Z slab
	if (Math.abs(dz) > 1e-7) {
		const invD = 1.0 / dz;
		let t1 = (minZ - oz) * invD;
		let t2 = (maxZ - oz) * invD;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (oz < minZ || oz > maxZ) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	return { hit: true, tNear, tFar };
}

/**
 * Computes 3D rotation matrix for trackball navigation in medical coordinates.
 * Patient space: +X = lateral (right-to-left), +Y = sagittal (anterior-to-posterior), +Z = vertical (inferior-to-superior).
 * At yaw=0, pitch=0: camera faces patient from front (Coronal / Фас).
 * Returns 3 columns: [col0 (Right), col1 (Up), col2 (RayDir)].
 */
export function computeVolume3DRotationMatrix(yawDeg: number, pitchDeg: number): [number, number, number][] {
	const yawRad = (yawDeg * Math.PI) / 180;
	const pitchRad = (pitchDeg * Math.PI) / 180;

	const cosY = cleanZero(Math.cos(yawRad));
	const sinY = cleanZero(Math.sin(yawRad));
	const cosP = cleanZero(Math.cos(pitchRad));
	const sinP = cleanZero(Math.sin(pitchRad));

	// Column 0: Camera Right (screen X axis -> patient lateral)
	const col0: [number, number, number] = [cosY, sinY, 0];
	// Column 1: Camera Up (screen Y axis -> patient vertical +Z is UP)
	const col1: [number, number, number] = [
		cleanZero(-sinY * sinP),
		cleanZero(cosY * sinP),
		cosP,
	];
	// Column 2: Ray Direction (marching into face -> patient anterior-to-posterior)
	const col2: [number, number, number] = [
		cleanZero(-sinY * cosP),
		cleanZero(cosY * cosP),
		cleanZero(-sinP),
	];

	return [col0, col1, col2];
}

/**
 * Fallback to Canvas2D software raymarching (used in headless test environments like jsdom/node test).
 */
export function renderCanvas2DVolumeRaymarching(
	canvas: HTMLCanvasElement,
	volume: CbctVoxelVolume | null,
	activePreset: Volume3DPresetId,
	yaw: number,
	pitch: number,
	zoom: number,
	pan: { x: number; y: number },
	width: number,
	height: number,
	isInteracting: boolean,
	clipping: Volume3DClippingBox = DEFAULT_VOLUME_3D_CLIPPING_BOX,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	if (!volume || !volume.data) {
		// Empty volume indicator
		ctx.fillStyle = "#09090b";
		ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = "#52525b";
		ctx.font = "12px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Загрузите КЛКТ для 3D-реконструкции черепа", width / 2, height / 2);
		return;
	}

	const preset = getVolume3DPreset(activePreset);
	const rotMat = computeVolume3DRotationMatrix(yaw, pitch);

	// Render authentic 3D raycasting of voxel volume
	const dim = volume.dimensions;
	const data = volume.data;
	const huMin = preset.huMin;
	const huMax = preset.huMax;

	// Render raycast projection with surface normal shading
	const imgData = ctx.createImageData(width, height);
	// Pre-fill canvas with deep medical dark background (#09090b) in single fast typed array call
	// Little-endian RGBA: R=0x09, G=0x09, B=0x0b, A=0xff -> 0xff0b0909
	const u32 = new Uint32Array(imgData.data.buffer);
	u32.fill(0xff0b0909);

	const centerX = width / 2 + pan.x;
	const centerY = height / 2 + pan.y;
	const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
	const scale = (Math.min(width, height) / maxDim) * zoom * 0.9;
	const invScale = 1.0 / scale;

	const halfW = dim.width / 2;
	const halfH = dim.height / 2;
	const halfD = dim.depth / 2;
	const sliceSize = dim.width * dim.height;
	const dimW = dim.width;
	const dimH = dim.height;
	const dimD = dim.depth;

	// Ray origin and direction rotated by view matrix (constant for all rays)
	const rayDirX = rotMat[0]![2]!;
	const rayDirY = rotMat[1]![2]!;
	const rayDirZ = rotMat[2]![2]!;

	// Adaptive interactive sampling: during mouse/touch drag, render fast 60 FPS sub-sampled pass.
	// When idle/released, render razor-sharp beauty pass.
	const canvas2dSubSample = isInteracting ? (width > 500 ? 4 : 3) : (width > 400 ? 2 : 1);
	const maxSteps = isInteracting ? 64 : 256;
	const nominalStepSize = isInteracting ? Math.max(2.5, maxDim / 64) : Math.max(0.8, maxDim / 256);

	const lightDir = [0.4, 0.6, 0.7]; // Directional light from front-top-right
	const lightLen = Math.hypot(lightDir[0]!, lightDir[1]!, lightDir[2]!);
	const lx = lightDir[0]! / lightLen;
	const ly = lightDir[1]! / lightLen;
	const lz = lightDir[2]! / lightLen;

	const baseR = preset.colorRgb[0];
	const baseG = preset.colorRgb[1];
	const baseB = preset.colorRgb[2];

	const tMinLimit = -maxDim * 0.8;
	const tMaxLimit = maxDim * 0.8;

	// Cache matrix coefficients for fast ray-plane origin computation
	const m00 = rotMat[0]![0]!;
	const m01 = rotMat[0]![1]!;
	const m10 = rotMat[1]![0]!;
	const m11 = rotMat[1]![1]!;
	const m20 = rotMat[2]![0]!;
	const m21 = rotMat[2]![1]!;

	for (let py = 0; py < height; py += canvas2dSubSample) {
		const viewY = -(py - centerY) * invScale;
		const r01_vY = m01 * viewY;
		const r11_vY = m11 * viewY;
		const r21_vY = m21 * viewY;

		for (let px = 0; px < width; px += canvas2dSubSample) {
			const viewX = (px - centerX) * invScale;

			// Ray plane starting point in centered coordinates
			const planeX = m00 * viewX + r01_vY;
			const planeY = m10 * viewX + r11_vY;
			const planeZ = m20 * viewX + r21_vY;

			// Slab AABB bounding box intersection test:
			// If ray completely misses the skull box [-halfW..halfW, -halfH..halfH, -halfD..halfD],
			// instantly skip with ZERO steps!
			const aabb = intersectRayAABB(
				planeX,
				planeY,
				planeZ,
				rayDirX,
				rayDirY,
				rayDirZ,
				-halfW,
				halfW,
				-halfH,
				halfH,
				-halfD,
				halfD,
				tMinLimit,
				tMaxLimit,
			);

			if (!aabb.hit || aabb.tNear >= aabb.tFar) {
				// Ray misses skull volume entirely -> stays background color (#09090b)
				continue;
			}

			const tNear = aabb.tNear;
			const tFar = aabb.tFar;
			const rayDist = tFar - tNear;
			const numSteps = Math.max(1, Math.min(maxSteps, Math.ceil(rayDist / nominalStepSize)));
			const dt = rayDist / numSteps;

			let curX = planeX + rayDirX * tNear + halfW;
			let curY = planeY + rayDirY * tNear + halfH;
			let curZ = planeZ + rayDirZ * tNear + halfD;
			const dX = rayDirX * dt;
			const dY = rayDirY * dt;
			const dZ = rayDirZ * dt;

			let hit = false;
			let maxHU = -1000;
			let hitDepth = 0;
			let nx = 0;
			let ny = 0;
			let nz = 0;

			for (let step = 0; step < numSteps; step++) {
				// 3D Volume Clipping Box check (normalized UVW [0, 1])
				const normX = curX / dimW;
				const normY = curY / dimH;
				const normZ = curZ / dimD;
				if (
					normX < clipping.clipMin[0] || normX > clipping.clipMax[0] ||
					normY < clipping.clipMin[1] || normY > clipping.clipMax[1] ||
					normZ < clipping.clipMin[2] || normZ > clipping.clipMax[2]
				) {
					curX += dX;
					curY += dY;
					curZ += dZ;
					continue;
				}

				const vx = curX | 0;
				const vy = curY | 0;
				const vz = curZ | 0;

				if (vx >= 0 && vx < dimW && vy >= 0 && vy < dimH && vz >= 0 && vz < dimD) {
					const idx = vz * sliceSize + vy * dimW + vx;
					const hu = data[idx] ?? -1000;

					if (preset.id === "mip") {
						if (hu > maxHU) {
							maxHU = hu;
							// Early ray termination: maximum enamel/metal threshold reached (> 2500 HU)
							if (maxHU >= 2500 || maxHU >= huMax) {
								break;
							}
						}
					} else if (hu >= huMin) {
						// Hit skull bone surface: early ray termination with bisection refinement
						hit = true;
						hitDepth = (step + 1) / numSteps;

						let hitX = curX;
						let hitY = curY;
						let hitZ = curZ;

						if (!isInteracting) {
							let p0X = curX - dX;
							let p0Y = curY - dY;
							let p0Z = curZ - dZ;
							let p1X = curX;
							let p1Y = curY;
							let p1Z = curZ;

							for (let b = 0; b < 4; b++) {
								const pmX = (p0X + p1X) * 0.5;
								const pmY = (p0Y + p1Y) * 0.5;
								const pmZ = (p0Z + p1Z) * 0.5;
								const bvx = Math.max(0, Math.min(dimW - 1, pmX | 0));
								const bvy = Math.max(0, Math.min(dimH - 1, pmY | 0));
								const bvz = Math.max(0, Math.min(dimD - 1, pmZ | 0));
								const bhu = data[bvz * sliceSize + bvy * dimW + bvx] ?? -1000;
								if (bhu >= huMin) {
									p1X = pmX; p1Y = pmY; p1Z = pmZ;
								} else {
									p0X = pmX; p0Y = pmY; p0Z = pmZ;
								}
							}
							hitX = (p0X + p1X) * 0.5;
							hitY = (p0Y + p1Y) * 0.5;
							hitZ = (p0Z + p1Z) * 0.5;
						}

						const vxP = Math.min(dimW - 1, (hitX | 0) + 2);
						const vxM = Math.max(0, (hitX | 0) - 2);
						const vyP = Math.min(dimH - 1, (hitY | 0) + 2);
						const vyM = Math.max(0, (hitY | 0) - 2);
						const vzP = Math.min(dimD - 1, (hitZ | 0) + 2);
						const vzM = Math.max(0, (hitZ | 0) - 2);

						const hvy = (hitY | 0);
						const hvz = (hitZ | 0);
						const hvx = (hitX | 0);
						const zOff = hvz * sliceSize;
						const yOff = hvy * dimW;

						const gx = (data[zOff + yOff + vxP] ?? hu) - (data[zOff + yOff + vxM] ?? hu);
						const gy = (data[zOff + vyP * dimW + hvx] ?? hu) - (data[zOff + vyM * dimW + hvx] ?? hu);
						const gz = (data[vzP * sliceSize + yOff + hvx] ?? hu) - (data[vzM * sliceSize + yOff + hvx] ?? hu);

						const gLen = Math.hypot(gx, gy, gz) || 1;
						// Outward surface normal points toward lower density (-grad)
						nx = -gx / gLen;
						ny = -gy / gLen;
						nz = -gz / gLen;
						// Ensure normal faces camera
						if (nx * (-rayDirX) + ny * (-rayDirY) + nz * (-rayDirZ) < 0) {
							nx = -nx;
							ny = -ny;
							nz = -nz;
						}
						break;
					}
				}

				curX += dX;
				curY += dY;
				curZ += dZ;
			}

			let r = 0;
			let g = 0;
			let b = 0;
			let a = 0;

			if (preset.id === "mip") {
				if (maxHU > huMin) {
					const norm = Math.max(0, Math.min(1, (maxHU - huMin) / (huMax - huMin)));
					r = (baseR * norm) | 0;
					g = (baseG * norm) | 0;
					b = (baseB * norm) | 0;
					a = 255;
				}
			} else if (hit) {
				// Clinical Anatomical Phong Shading: Ambient + Lambert Diffuse + Enamel Specular + Rim
				const viewDirX = -rayDirX;
				const viewDirY = -rayDirY;
				const viewDirZ = -rayDirZ;

				const lVecX = viewDirX * 0.82 + m00 * 0.35 + m01 * 0.45;
				const lVecY = viewDirY * 0.82 + m10 * 0.35 + m11 * 0.45;
				const lVecZ = viewDirZ * 0.82 + m20 * 0.35 + m21 * 0.45;
				const lLen = Math.hypot(lVecX, lVecY, lVecZ) || 1;
				const nlx = lVecX / lLen;
				const nly = lVecY / lLen;
				const nlz = lVecZ / lLen;

				const NdotL = Math.max(0, nx * nlx + ny * nly + nz * nlz);
				const ambient = 0.32;
				const diff = NdotL * 0.68;
				const depthFade = 1.0 - hitDepth * 0.15;

				const hx = nlx + viewDirX;
				const hy = nly + viewDirY;
				const hz = nlz + viewDirZ;
				const hLen = Math.hypot(hx, hy, hz) || 1;
				const NdotH = Math.max(0, nx * (hx / hLen) + ny * (hy / hLen) + nz * (hz / hLen));
				const spec = Math.pow(NdotH, 32.0) * 0.35;

				const NdotV = Math.max(0, nx * viewDirX + ny * viewDirY + nz * viewDirZ);
				const rim = Math.pow(1.0 - NdotV, 3.0) * 0.18;

				const shade = ambient + diff * depthFade + rim;
				r = Math.min(255, Math.max(0, (baseR * shade + 255 * spec) | 0));
				g = Math.min(255, Math.max(0, (baseG * shade + 250 * spec) | 0));
				b = Math.min(255, Math.max(0, (baseB * shade + 235 * spec) | 0));
				a = 255;
			}

			if (a > 0) {
				const colorU32 = (a << 24) | (b << 16) | (g << 8) | r;
				if (canvas2dSubSample === 1) {
					u32[py * width + px] = colorU32;
				} else {
					for (let sy = 0; sy < canvas2dSubSample && py + sy < height; sy++) {
						const rowOffset = (py + sy) * width;
						for (let sx = 0; sx < canvas2dSubSample && px + sx < width; sx++) {
							u32[rowOffset + px + sx] = colorU32;
						}
					}
				}
			}
		}
	}

	ctx.putImageData(imgData, 0, 0);
}
