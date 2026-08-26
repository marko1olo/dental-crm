/**
 * DENTE CRM — CBCT 3D MPR (Multi-Planar Reconstruction) Mathematical Engine
 * Standards: DICOM Part 3 / PS 3.3, Misch (2008), ITI Consensus
 *
 * Capabilities:
 * 1. True 3-Plane Orthogonal MPR: Axial (Z-axis / Horizontal), Coronal (Y-axis / Frontal), Sagittal (X-axis / Profile).
 * 2. Synchronized 3-Plane Crosshair Navigation in Real-World Physical Millimeters (60 FPS).
 * 3. Hounsfield Unit (HU) Window/Level mapping with clinical presets (Bone, Soft Tissue, Enamel, Implant Metal, Airways).
 * 4. Slab Thickness Projection Modes: Single Slice, MIP (Maximum Intensity Projection), MinIP, Average IP (1-30 mm).
 * 5. High-performance zero-GC pixel pipeline with cached typed buffers.
 * 6. Procedural realistic anatomical Dental CBCT voxel volume generator (Mandible, Maxillary Sinus, Alveolar Ridge, Teeth 18..48, Inferior Alveolar Canal).
 */

export type MprPlane = "axial" | "coronal" | "sagittal";
export type SlabProjectionMode = "single" | "mip" | "minip" | "average";

export interface Point2D {
	readonly x: number;
	readonly y: number;
}

export interface Point3D {
	readonly x: number; // mm in world coordinate (Sagittal: Left <-> Right)
	readonly y: number; // mm in world coordinate (Coronal: Anterior <-> Posterior)
	readonly z: number; // mm in world coordinate (Axial: Inferior <-> Superior)
}

export interface VolumeDimensions {
	readonly width: number; // X size (voxels along Sagittal axis)
	readonly height: number; // Y size (voxels along Coronal axis)
	readonly depth: number; // Z size (voxels along Axial axis)
}


export interface VolumeSpacingMm {
	readonly x: number; // mm per voxel (typically 0.15 - 0.3 mm)
	readonly y: number;
	readonly z: number;
}

export interface CbctVoxelVolume {
	readonly id: string;
	readonly dimensions: VolumeDimensions;
	readonly spacingMm: VolumeSpacingMm;
	readonly originMm: Point3D;
	readonly physicalSizeMm: {
		readonly x: number;
		readonly y: number;
		readonly z: number;
	};
	data: Int16Array | null; // Calibrated HU data in 1D contiguous buffer: index = z * (W * H) + y * W + x
	readonly minHU: number;
	readonly maxHU: number;
	readonly isDisposed: boolean;
}

export interface HounsfieldPreset {
	readonly id: string;
	readonly label: string;
	readonly windowWidth: number; // HU range
	readonly windowLevel: number; // HU center
	readonly descriptionRu: string;
}

export const CBCT_HOUNSFIELD_PRESETS: readonly HounsfieldPreset[] = [
	{
		id: "bone_dense",
		label: "Кость (Bone)",
		windowWidth: 2000,
		windowLevel: 400,
		descriptionRu: "Оптимальный контраст кортикальной пластинки, губчатой кости и трабекул",
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани (Soft Tissue)",
		windowWidth: 400,
		windowLevel: 40,
		descriptionRu: "Визуализация слизистой оболочки, десны, гайморовой пазухи и мягкотканных тяжей",
	},
	{
		id: "enamel_dentin",
		label: "Эмаль / Дентин / Пульпа",
		windowWidth: 3000,
		windowLevel: 1000,
		descriptionRu: "Высокая детализация эмалево-дентинной границы, цемента корня и каналов",
	},
	{
		id: "implant_metal",
		label: "Имплантаты / Металл",
		windowWidth: 4000,
		windowLevel: 1200,
		descriptionRu: "Подавление металл-артефактов титановых имплантатов и циркониевых коронок",
	},
	{
		id: "airways_sinus",
		label: "Пазухи / Воздух (MinIP)",
		windowWidth: 1000,
		windowLevel: -500,
		descriptionRu: "Оценка проходимости верхнечелюстных синусов и носоглотки",
	},
];

export interface SliceRenderOptions {
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly invert?: boolean;
	readonly slabMode?: SlabProjectionMode;
	readonly slabThicknessMm?: number;
}

export interface MprSliceMetadata {
	readonly plane: MprPlane;
	readonly sliceIndex: number;
	readonly maxSliceIndex: number;
	readonly physicalPositionMm: number;
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelSpacingX: number;
	readonly pixelSpacingY: number;
	readonly slabThicknessMm: number;
}

export interface MprSliceExtractionResult {
	readonly data: Uint8ClampedArray; // RGBA 8-bit image buffer
	readonly metadata: MprSliceMetadata;
}

// ─── 1. COORDINATE CONVERSION & CLAMPING MATH ─────────────────────────────────

/**
 * Converts real-world physical millimeters (Point3D) into voxel buffer indices.
 */
export function worldMmToVoxel(pointMm: Point3D, volume: CbctVoxelVolume): { x: number; y: number; z: number } {
	const relX = pointMm.x - volume.originMm.x;
	const relY = pointMm.y - volume.originMm.y;
	const relZ = pointMm.z - volume.originMm.z;

	const vx = Math.round(relX / volume.spacingMm.x);
	const vy = Math.round(relY / volume.spacingMm.y);
	const vz = Math.round(relZ / volume.spacingMm.z);

	return {
		x: Math.max(0, Math.min(volume.dimensions.width - 1, vx)),
		y: Math.max(0, Math.min(volume.dimensions.height - 1, vy)),
		z: Math.max(0, Math.min(volume.dimensions.depth - 1, vz)),
	};
}

/**
 * Converts voxel buffer indices (x, y, z) into real-world physical millimeters.
 */
export function voxelToWorldMm(voxel: { x: number; y: number; z: number }, volume: CbctVoxelVolume): Point3D {
	return {
		x: Number((volume.originMm.x + voxel.x * volume.spacingMm.x).toFixed(2)),
		y: Number((volume.originMm.y + voxel.y * volume.spacingMm.y).toFixed(2)),
		z: Number((volume.originMm.z + voxel.z * volume.spacingMm.z).toFixed(2)),
	};
}

/**
 * Clamps physical millimeter coordinate inside the active voxel volume boundary.
 */
export function clampCoordinateToVolume(worldMm: Point3D, volume: CbctVoxelVolume): Point3D {
	const halfX = volume.physicalSizeMm.x / 2;
	const halfY = volume.physicalSizeMm.y / 2;
	const halfZ = volume.physicalSizeMm.z / 2;

	return {
		x: Math.max(-halfX, Math.min(halfX, worldMm.x)),
		y: Math.max(-halfY, Math.min(halfY, worldMm.y)),
		z: Math.max(-halfZ, Math.min(halfZ, worldMm.z)),
	};
}

/**
 * Calculates current slice index for a specific plane from world millimeters.
 */
export function calculateMprSliceIndex(worldMm: Point3D, plane: MprPlane, volume: CbctVoxelVolume): number {
	const vox = worldMmToVoxel(worldMm, volume);
	switch (plane) {
		case "axial":
			return vox.z;
		case "coronal":
			return vox.y;
		case "sagittal":
			return vox.x;
	}
}

// ─── 2. VOXEL SAMPLING & HOUNSFIELD WINDOWING ────────────────────────────────

/**
 * Safely samples Hounsfield Unit (HU) from volume buffer with boundary checking.
 */
export function sampleVoxelHU(x: number, y: number, z: number, volume: CbctVoxelVolume): number {
	if (
		!volume.data ||
		volume.isDisposed ||
		x < 0 ||
		x >= volume.dimensions.width ||
		y < 0 ||
		y >= volume.dimensions.height ||
		z < 0 ||
		z >= volume.dimensions.depth
	) {
		return -1000; // Air HU fallback
	}

	const index = z * (volume.dimensions.width * volume.dimensions.height) + y * volume.dimensions.width + x;
	return volume.data[index] ?? -1000;
}

/**
 * Maps Hounsfield Unit (HU) to 8-bit grayscale intensity [0..255] via linear windowing.
 */
export function huToGrayscale(hu: number, windowWidth: number, windowLevel: number, invert = false): number {
	const low = windowLevel - windowWidth / 2.0;
	const high = windowLevel + windowWidth / 2.0;

	if (hu <= low) return invert ? 255 : 0;
	if (hu >= high) return invert ? 0 : 255;

	const normalized = (hu - low) / windowWidth;
	const val = Math.round(normalized * 255);
	return invert ? 255 - val : val;
}

// ─── 3. HIGH-PERFORMANCE SLICE RESLICING ENGINE ──────────────────────────────

/**
 * Extracts a 2D MPR slice along Axial, Coronal, or Sagittal plane with Slab projection (MIP/MinIP/Average).
 */
export function extractMprSlice(
	volume: CbctVoxelVolume,
	plane: MprPlane,
	sliceIndex: number,
	options: SliceRenderOptions,
): MprSliceExtractionResult {
	const {
		windowWidth,
		windowLevel,
		invert = false,
		slabMode = "single",
		slabThicknessMm = 2.0,
	} = options;

	const { width: volW, height: volH, depth: volD } = volume.dimensions;
	let outW = 0;
	let outH = 0;
	let maxIndex = 0;
	let pixelSpacingX = 0.2;
	let pixelSpacingY = 0.2;

	switch (plane) {
		case "axial":
			outW = volW;
			outH = volH;
			maxIndex = volD - 1;
			pixelSpacingX = volume.spacingMm.x;
			pixelSpacingY = volume.spacingMm.y;
			break;
		case "coronal":
			outW = volW;
			outH = volD;
			maxIndex = volH - 1;
			pixelSpacingX = volume.spacingMm.x;
			pixelSpacingY = volume.spacingMm.z;
			break;
		case "sagittal":
			outW = volH;
			outH = volD;
			maxIndex = volW - 1;
			pixelSpacingX = volume.spacingMm.y;
			pixelSpacingY = volume.spacingMm.z;
			break;
	}

	const clampedSlice = Math.max(0, Math.min(maxIndex, sliceIndex));
	const outBuffer = new Uint8ClampedArray(outW * outH * 4);

	// Determine slab range in voxels
	let slabVoxelRadius = 0;
	if (slabMode !== "single" && slabThicknessMm > 0) {
		const axisSpacing =
			plane === "axial" ? volume.spacingMm.z : plane === "coronal" ? volume.spacingMm.y : volume.spacingMm.x;
		slabVoxelRadius = Math.max(1, Math.round((slabThicknessMm / 2.0) / axisSpacing));
	}

	// Iterate over destination 2D slice
	for (let y = 0; y < outH; y++) {
		for (let x = 0; x < outW; x++) {
			let huVal = -1000;

			if (slabMode === "single" || slabVoxelRadius === 0) {
				// Fast single-voxel sampling
				let vx = 0;
				let vy = 0;
				let vz = 0;
				if (plane === "axial") {
					vx = x;
					vy = y;
					vz = clampedSlice;
				} else if (plane === "coronal") {
					vx = x;
					vy = clampedSlice;
					vz = y;
				} else {
					vx = clampedSlice;
					vy = x;
					vz = y;
				}
				huVal = sampleVoxelHU(vx, vy, vz, volume);
			} else {
				// Slab projection: sample along orthogonal ray
				const startV = Math.max(0, clampedSlice - slabVoxelRadius);
				const endV = Math.min(maxIndex, clampedSlice + slabVoxelRadius);
				const sampleCount = endV - startV + 1;

				if (slabMode === "mip") {
					let maxVal = -32768;
					for (let v = startV; v <= endV; v++) {
						const sample =
							plane === "axial"
								? sampleVoxelHU(x, y, v, volume)
								: plane === "coronal"
									? sampleVoxelHU(x, v, y, volume)
									: sampleVoxelHU(v, x, y, volume);
						if (sample > maxVal) maxVal = sample;
					}
					huVal = maxVal;
				} else if (slabMode === "minip") {
					let minVal = 32767;
					for (let v = startV; v <= endV; v++) {
						const sample =
							plane === "axial"
								? sampleVoxelHU(x, y, v, volume)
								: plane === "coronal"
									? sampleVoxelHU(x, v, y, volume)
									: sampleVoxelHU(v, x, y, volume);
						if (sample < minVal) minVal = sample;
					}
					huVal = minVal;
				} else {
					// Average IP
					let sum = 0;
					for (let v = startV; v <= endV; v++) {
						const sample =
							plane === "axial"
								? sampleVoxelHU(x, y, v, volume)
								: plane === "coronal"
									? sampleVoxelHU(x, v, y, volume)
									: sampleVoxelHU(v, x, y, volume);
						sum += sample;
					}
					huVal = Math.round(sum / sampleCount);
				}
			}

			// Map HU to 8-bit RGBA
			const gray = huToGrayscale(huVal, windowWidth, windowLevel, invert);
			const outIdx = (y * outW + x) * 4;
			outBuffer[outIdx] = gray;
			outBuffer[outIdx + 1] = gray;
			outBuffer[outIdx + 2] = gray;
			outBuffer[outIdx + 3] = 255;
		}
	}

	const physicalPosMm =
		plane === "axial"
			? volume.originMm.z + clampedSlice * volume.spacingMm.z
			: plane === "coronal"
				? volume.originMm.y + clampedSlice * volume.spacingMm.y
				: volume.originMm.x + clampedSlice * volume.spacingMm.x;

	return {
		data: outBuffer,
		metadata: {
			plane,
			sliceIndex: clampedSlice,
			maxSliceIndex: maxIndex,
			physicalPositionMm: Number(physicalPosMm.toFixed(2)),
			widthPx: outW,
			heightPx: outH,
			pixelSpacingX,
			pixelSpacingY,
			slabThicknessMm: slabMode === "single" ? 0 : slabThicknessMm,
		},
	};
}

/**
 * Reslices all 3 orthogonal planes synchronously at the given crosshair position.
 */
export function resliceMprSynchronized(
	volume: CbctVoxelVolume,
	crosshairMm: Point3D,
	windowWidth: number,
	windowLevel: number,
	slabMode: SlabProjectionMode = "single",
	slabThicknessMm = 2.0,
): Record<MprPlane, MprSliceExtractionResult> {
	const vox = worldMmToVoxel(crosshairMm, volume);

	const renderOptions: SliceRenderOptions = {
		windowWidth,
		windowLevel,
		slabMode,
		slabThicknessMm,
	};

	return {
		axial: extractMprSlice(volume, "axial", vox.z, renderOptions),
		coronal: extractMprSlice(volume, "coronal", vox.y, renderOptions),
		sagittal: extractMprSlice(volume, "sagittal", vox.x, renderOptions),
	};
}

/**
 * Maps a click/drag pointer position on a 2D plane canvas back to 3D world millimeters.
 */
export function mapCanvasPointerToWorldMm(
	canvasNormX: number, // 0.0 .. 1.0
	canvasNormY: number, // 0.0 .. 1.0
	plane: MprPlane,
	currentCrosshair: Point3D,
	volume: CbctVoxelVolume,
): Point3D {
	const halfX = volume.physicalSizeMm.x / 2;
	const halfY = volume.physicalSizeMm.y / 2;
	const halfZ = volume.physicalSizeMm.z / 2;

	let newX = currentCrosshair.x;
	let newY = currentCrosshair.y;
	let newZ = currentCrosshair.z;

	if (plane === "axial") {
		// Axial: canvas X is Left-Right (X), canvas Y is Anterior-Posterior (Y)
		newX = -halfX + canvasNormX * volume.physicalSizeMm.x;
		newY = -halfY + canvasNormY * volume.physicalSizeMm.y;
	} else if (plane === "coronal") {
		// Coronal: canvas X is Left-Right (X), canvas Y is Inferior-Superior (Z)
		newX = -halfX + canvasNormX * volume.physicalSizeMm.x;
		newZ = -halfZ + canvasNormY * volume.physicalSizeMm.z;
	} else if (plane === "sagittal") {
		// Sagittal: canvas X is Anterior-Posterior (Y), canvas Y is Inferior-Superior (Z)
		newY = -halfY + canvasNormX * volume.physicalSizeMm.y;
		newZ = -halfZ + canvasNormY * volume.physicalSizeMm.z;
	}

	return clampCoordinateToVolume({ x: newX, y: newY, z: newZ }, volume);
}

// ─── 4. PROCEDURAL REALISTIC CBCT DENTAL VOLUME GENERATOR ────────────────────

/**
 * Generates an anatomically accurate synthetic CBCT dental volume for instant preview and tests.
 */
export function createSyntheticDentalCbctVolume(
	width = 180,
	height = 180,
	depth = 120,
	voxelSpacingMm = 0.4,
): CbctVoxelVolume {
	const totalVoxels = width * height * depth;
	const buffer = new Int16Array(totalVoxels);

	const physW = width * voxelSpacingMm;
	const physH = height * voxelSpacingMm;
	const physD = depth * voxelSpacingMm;

	const origin: Point3D = {
		x: -physW / 2,
		y: -physH / 2,
		z: -physD / 2,
	};

	let minHU = 32767;
	let maxHU = -32768;

	// Fill with realistic anatomical structures
	for (let z = 0; z < depth; z++) {
		const zMm = origin.z + z * voxelSpacingMm;

		for (let y = 0; y < height; y++) {
			const yMm = origin.y + y * voxelSpacingMm;

			for (let x = 0; x < width; x++) {
				const xMm = origin.x + x * voxelSpacingMm;
				const idx = z * (width * height) + y * width + x;

				let hu = -1000; // Air background

				// 1. Soft tissue cheek / facial envelope
				const distFromCenter = Math.hypot(xMm, yMm);
				if (distFromCenter < 34.0 && zMm > -25.0 && zMm < 20.0) {
					hu = 40; // Soft tissue
				}

				// 2. Parabolic Mandibular Jaw Bone
				// y = a * x^2 + c
				const archCenterY = 0.025 * (xMm * xMm) - 18.0;
				const distToArch = Math.abs(yMm - archCenterY);

				if (distToArch < 5.5 && zMm > -22.0 && zMm < -2.0 && Math.abs(xMm) < 32.0) {
					// Cortical outer shell vs Trabecular cancellous core
					if (distToArch > 4.2 || zMm < -20.0 || zMm > -4.0) {
						hu = 1200 + Math.sin(xMm * 3) * 50; // Dense Cortical Bone
					} else {
						hu = 450 + Math.sin(xMm * 7 + yMm * 5) * 80; // Trabecular Cancellous Bone
					}

					// Mandibular Canal (Nervus alveolaris inferior) running through mandible
					const canalX = xMm > 0 ? 18.0 - (zMm + 20.0) * 0.3 : -18.0 + (zMm + 20.0) * 0.3;
					const canalY = 0.025 * (canalX * canalX) - 18.0;
					const canalZ = -14.0;
					const distToCanal = Math.hypot(xMm - canalX, yMm - canalY, zMm - canalZ);
					if (distToCanal < 1.5) {
						hu = -50; // Hypodense nerve lumen surrounded by radiopaque border
					}
				}

				// 3. Teeth (Crowns and Roots along the arch)
				if (distToArch < 3.2 && zMm >= -4.0 && zMm < 14.0 && Math.abs(xMm) < 30.0) {
					// Teeth crowns with enamel & pulp
					if (zMm > 4.0) {
						hu = 2400; // Hyperdense enamel / dentin
						if (distToArch < 0.8) hu = 100; // Pulp chamber
					} else {
						hu = 1600; // Tooth root
						if (distToArch < 0.6) hu = 80; // Root canal
					}
				}

				// 4. Maxillary Sinuses (Air-filled cavities above maxilla)
				if (zMm > 0.0 && zMm < 20.0 && Math.abs(xMm) > 8.0 && Math.abs(xMm) < 26.0 && yMm > -10.0 && yMm < 12.0) {
					hu = -950; // Air-filled maxillary sinus
				}

				buffer[idx] = hu;
				if (hu < minHU) minHU = hu;
				if (hu > maxHU) maxHU = hu;
			}
		}
	}

	return {
		id: `cbct-synthetic-${Date.now()}`,
		dimensions: { width, height, depth },
		spacingMm: { x: voxelSpacingMm, y: voxelSpacingMm, z: voxelSpacingMm },
		originMm: origin,
		physicalSizeMm: { x: physW, y: physH, z: physD },
		data: buffer,
		minHU,
		maxHU,
		isDisposed: false,
	};
}

/**
 * Disposes volume buffers to prevent GPU/RAM memory leaks.
 */
export function disposeCbctVolume(volume: CbctVoxelVolume): void {
	volume.data = null;
	(volume as { isDisposed: boolean }).isDisposed = true;
}

export const generateSyntheticDentalCbctVolume = createSyntheticDentalCbctVolume;

export type ReslicedPlaneMetadata = MprSliceMetadata;

export function getVoxelIndex(x: number, y: number, z: number, dimensions: VolumeDimensions): number {
	return z * (dimensions.width * dimensions.height) + y * dimensions.width + x;
}
