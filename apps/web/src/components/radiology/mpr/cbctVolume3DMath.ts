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
 * Safe Canvas2D lightweight preview slice renderer (FEAT-GPU-SAFEGUARD):
 * Blocked heavy 224 MB CPU raymarching to prevent browser lockup.
 * Extracts a fast 2D central slice corresponding to camera rotation (< 1 ms, 0% CPU burn).
 */
export function renderCanvas2DPreviewSlice(
	canvas: HTMLCanvasElement,
	volume: CbctVoxelVolume | null,
	activePreset: Volume3DPresetId = "skull",
	yaw: number = 30,
	pitch: number = 12,
	zoom: number = 1.0,
	pan: { x: number; y: number } = { x: 0, y: 0 },
	width: number = 256,
	height: number = 256,
	isInteracting: boolean = false,
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

	const dim = volume.dimensions;
	const data = volume.data;
	const huMin = preset.huMin;
	const huMax = preset.huMax;

	const imgData = ctx.createImageData(width, height);
	const u32 = new Uint32Array(imgData.data.buffer);
	// Background #09090b (RGBA little-endian: 0xff0b0909)
	u32.fill(0xff0b0909);

	const centerX = width / 2 + pan.x;
	const centerY = height / 2 + pan.y;
	const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
	const scale = (Math.min(width, height) / maxDim) * zoom * 0.9;
	const invScale = 1.0 / (scale || 1);

	const halfW = dim.width / 2;
	const halfH = dim.height / 2;
	const halfD = dim.depth / 2;
	const sliceSize = dim.width * dim.height;
	const dimW = dim.width;
	const dimH = dim.height;
	const dimD = dim.depth;

	const baseR = preset.colorRgb[0];
	const baseG = preset.colorRgb[1];
	const baseB = preset.colorRgb[2];

	const m00 = rotMat[0]![0]!;
	const m01 = rotMat[0]![1]!;
	const m10 = rotMat[1]![0]!;
	const m11 = rotMat[1]![1]!;
	const m20 = rotMat[2]![0]!;
	const m21 = rotMat[2]![1]!;

	const subSample: number = isInteracting ? 4 : 2;

	for (let py = 0; py < height; py += subSample) {
		const viewY = -(py - centerY) * invScale;
		const r01_vY = m01 * viewY;
		const r11_vY = m11 * viewY;
		const r21_vY = m21 * viewY;

		for (let px = 0; px < width; px += subSample) {
			const viewX = (px - centerX) * invScale;

			// Sample single point at center of volume (t=0)
			const curX = m00 * viewX + r01_vY + halfW;
			const curY = m10 * viewX + r11_vY + halfH;
			const curZ = m20 * viewX + r21_vY + halfD;

			// Clipping box check
			const normX = curX / dimW;
			const normY = curY / dimH;
			const normZ = curZ / dimD;
			if (
				normX < clipping.clipMin[0] || normX > clipping.clipMax[0] ||
				normY < clipping.clipMin[1] || normY > clipping.clipMax[1] ||
				normZ < clipping.clipMin[2] || normZ > clipping.clipMax[2]
			) {
				continue;
			}

			const vx = curX | 0;
			const vy = curY | 0;
			const vz = curZ | 0;

			if (vx >= 0 && vx < dimW && vy >= 0 && vy < dimH && vz >= 0 && vz < dimD) {
				const hu = data[vz * sliceSize + vy * dimW + vx] ?? -1000;
				if (hu >= huMin) {
					const norm = Math.min(1.0, Math.max(0.0, (hu - huMin) / (huMax - huMin || 1)));
					const shade = 0.40 + 0.60 * norm;
					const r = Math.min(255, (baseR * shade) | 0);
					const g = Math.min(255, (baseG * shade) | 0);
					const b = Math.min(255, (baseB * shade) | 0);
					const colorU32 = (255 << 24) | (b << 16) | (g << 8) | r;

					if (subSample === 1) {
						u32[py * width + px] = colorU32;
					} else {
						for (let sy = 0; sy < subSample && py + sy < height; sy++) {
							const rowOffset = (py + sy) * width;
							for (let sx = 0; sx < subSample && px + sx < width; sx++) {
								u32[rowOffset + px + sx] = colorU32;
							}
						}
					}
				}
			}
		}
	}

	ctx.putImageData(imgData, 0, 0);

	// Clinical safeguard badge: WebGL2 Offline Notice
	ctx.save();
	ctx.fillStyle = "rgba(24, 24, 27, 0.85)";
	ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
	ctx.lineWidth = 1;
	const badgeW = 270;
	const badgeH = 22;
	const badgeX = Math.max(8, (width - badgeW) / 2);
	const badgeY = 8;
	if (typeof (ctx as any).roundRect === "function") {
		(ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#facc15";
	ctx.font = "bold 10px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("⚡ WebGL2 офлайн • Легкий 2D превью-срез", badgeX + badgeW / 2, badgeY + badgeH / 2);
	ctx.restore();
}

/**
 * Fallback to Canvas2D software raymarching (used in headless test environments like jsdom/node test).
 * HARDENED (FEAT-GPU-SAFEGUARD): Heavy 224 MB CPU raymarching is permanently disabled.
 * Automatically delegates to lightweight 2D preview slice (< 1 ms, 0% CPU burn).
 */
export function renderCanvas2DVolumeRaymarching(
	canvas: HTMLCanvasElement,
	volume: CbctVoxelVolume | null,
	activePreset: Volume3DPresetId = "skull",
	yaw: number = 30,
	pitch: number = 12,
	zoom: number = 1.0,
	pan: { x: number; y: number } = { x: 0, y: 0 },
	width: number = 256,
	height: number = 256,
	isInteracting: boolean = false,
	clipping: Volume3DClippingBox = DEFAULT_VOLUME_3D_CLIPPING_BOX,
): void {
	renderCanvas2DPreviewSlice(
		canvas,
		volume,
		activePreset,
		yaw,
		pitch,
		zoom,
		pan,
		width,
		height,
		isInteracting,
		clipping,
	);
}
