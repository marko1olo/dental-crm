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

import {
	type Point2D,
	type Point3D,
	type CbctAngleMeasurement,
	type MeasurementHandleHit,
	type MeasurementObjectHit,
	type CbctMeasurementRuler,
	type CbctProbeMarker,
	CRISP_OVERLAY_PAD_BG,
	CRISP_OVERLAY_BORDER_GOLD,
	CRISP_OVERLAY_BORDER_CYAN,
	CRISP_OVERLAY_BORDER_BLUE,
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	drawMeasurementDeleteButton,
	drawCaliperDeleteButton,
	drawMandibularNerveBadge,
	drawNerveCanalBadge,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
} from "./cbctCaliperNerveMath";
import {
	type ObliqueRotationAngles,
	type ViewportTransform,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	mapCanvasPointerToWorldMmWithTransform,
} from "./cbctObliqueMath";

export type MprPlane = "axial" | "coronal" | "sagittal";
export type SlabProjectionMode = "single" | "mip" | "minip" | "average";
export type { Point2D, Point3D, CbctAngleMeasurement, MeasurementHandleHit, MeasurementObjectHit, CbctMeasurementRuler, CbctProbeMarker };
export {
	CRISP_OVERLAY_PAD_BG,
	CRISP_OVERLAY_BORDER_GOLD,
	CRISP_OVERLAY_BORDER_CYAN,
	CRISP_OVERLAY_BORDER_BLUE,
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	drawMeasurementDeleteButton,
	drawCaliperDeleteButton,
	drawMandibularNerveBadge,
	drawNerveCanalBadge,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
};

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
	readonly rescaleSlope?: number;
	readonly rescaleIntercept?: number;
	readonly defaultWindowWidth?: number;
	readonly defaultWindowLevel?: number;
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
		label: "Зубы и Кость (Dental)",
		windowWidth: 4400,
		windowLevel: 1300,
		descriptionRu: "Стандарт Romexis/HDXWILL: идеальная видимость пульпы, дентина, эмали и трабекул без засветки",
	},
	{
		id: "enamel_dentin",
		label: "Эндодонтия / Кариес",
		windowWidth: 5500,
		windowLevel: 1600,
		descriptionRu: "Максимальная детализация корневых каналов, апексов, кариозных полостей и периодонтальной щели",
	},
	{
		id: "bone_cortical",
		label: "Кортикал / Гребень",
		windowWidth: 3500,
		windowLevel: 900,
		descriptionRu: "Оценка кортикальных пластинок альвеолярного гребня и плотности по Misch",
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани",
		windowWidth: 600,
		windowLevel: 50,
		descriptionRu: "Визуализация слизистой оболочки, десны, гайморовой пазухи и мягкотканных тяжей",
	},
	{
		id: "implant_metal",
		label: "Имплантаты / Металл",
		windowWidth: 8000,
		windowLevel: 2500,
		descriptionRu: "Подавление металл-артефактов титановых имплантатов, вкладок и циркониевых коронок",
	},
	{
		id: "airways_sinus",
		label: "Пазухи / ЛОР",
		windowWidth: 1600,
		windowLevel: -400,
		descriptionRu: "Оценка проходимости верхнечелюстных синусов, носоглотки и остиомеатального комплекса",
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

// ─── ROMEXIS 6.X & VATECH EZ3D-I STANDARDS & PALETTES ────────────────────────

export const ROMEXIS_COLORS = {
	axial: "#06b6d4", // Cyan (Horizontal / Z-plane)
	axialRgba: (alpha = 1) => `rgba(6, 182, 212, ${alpha})`,
	coronal: "#f97316", // Orange (Frontal / Y-plane)
	coronalRgba: (alpha = 1) => `rgba(249, 115, 22, ${alpha})`,
	sagittal: "#22c55e", // Emerald Green (Profile / X-plane)
	sagittalRgba: (alpha = 1) => `rgba(34, 197, 94, ${alpha})`,
	panoramic: "#a855f7", // Purple (Dental Arch Spline)
	panoramicRgba: (alpha = 1) => `rgba(168, 85, 247, ${alpha})`,
	crossSection: "#eab308", // Yellow (Transverse Cross-Section)
	crossSectionRgba: (alpha = 1) => `rgba(234, 179, 8, ${alpha})`,
	rulerGrid: "rgba(113, 113, 122, 0.15)",
	rulerMajor: "rgba(244, 244, 245, 0.85)",
	rulerMinor: "rgba(113, 113, 122, 0.45)",
	rulerText: "rgba(228, 228, 231, 0.9)",
	compassBg: "rgba(9, 9, 11, 0.85)",
	compassBorder: "rgba(39, 39, 42, 0.9)",
} as const;

export type CbctViewportType = MprPlane | "panoramic" | "cross_section";

export type CbctActiveMouseTool =
	| "crosshair"
	| "pan"
	| "zoom"
	| "window_level"
	| "rotate"
	| "ruler"
	| "angle"
	| "probe";

export interface ViewportOrientationLabels {
	readonly top: string;
	readonly bottom: string;
	readonly left: string;
	readonly right: string;
	readonly topTooltipRu: string;
	readonly bottomTooltipRu: string;
	readonly leftTooltipRu: string;
	readonly rightTooltipRu: string;
	readonly planeColor: string;
	readonly planeNameRu: string;
	readonly planeNameEn: string;
}

/**
 * Returns anatomical orientation indicators adhering strictly to radiological convention:
 * Patient's RIGHT side (R) is displayed on the LEFT of the screen for Axial and Coronal views.
 */
export function getViewportOrientationLabels(viewport: CbctViewportType): ViewportOrientationLabels {
	switch (viewport) {
		case "axial":
			return {
				top: "A",
				bottom: "P",
				left: "R",
				right: "L",
				topTooltipRu: "Anterior (Передняя сторона / Лицо)",
				bottomTooltipRu: "Posterior (Задняя сторона / Затылок)",
				leftTooltipRu: "Right (Правая сторона пациента — слева на экране)",
				rightTooltipRu: "Left (Левая сторона пациента — справа на экране)",
				planeColor: ROMEXIS_COLORS.axial,
				planeNameRu: "Аксиальный (Горизонтальный срез)",
				planeNameEn: "AXIAL",
			};
		case "coronal":
			return {
				top: "S",
				bottom: "I",
				left: "R",
				right: "L",
				topTooltipRu: "Superior (Верхняя сторона / Череп)",
				bottomTooltipRu: "Inferior (Нижняя сторона / Шея)",
				leftTooltipRu: "Right (Правая сторона пациента — слева на экране)",
				rightTooltipRu: "Left (Левая сторона пациента — справа на экране)",
				planeColor: ROMEXIS_COLORS.coronal,
				planeNameRu: "Корональный (Фронтальный срез)",
				planeNameEn: "CORONAL",
			};
		case "sagittal":
			return {
				top: "S",
				bottom: "I",
				left: "A",
				right: "P",
				topTooltipRu: "Superior (Верхняя сторона / Череп)",
				bottomTooltipRu: "Inferior (Нижняя сторона / Шея)",
				leftTooltipRu: "Anterior (Передняя сторона / Лицо)",
				rightTooltipRu: "Posterior (Задняя сторона / Затылок)",
				planeColor: ROMEXIS_COLORS.sagittal,
				planeNameRu: "Сагиттальный (Профиль)",
				planeNameEn: "SAGITTAL",
			};
		case "panoramic":
			return {
				top: "S",
				bottom: "I",
				left: "R",
				right: "L",
				topTooltipRu: "Superior (Верхняя челюсть / Коронально)",
				bottomTooltipRu: "Inferior (Нижняя челюсть / Базально)",
				leftTooltipRu: "Right (Правая сторона / Квадранты 1 и 4)",
				rightTooltipRu: "Left (Левая сторона / Квадранты 2 и 3)",
				planeColor: ROMEXIS_COLORS.panoramic,
				planeNameRu: "Развернутая панорама (ОПТГ)",
				planeNameEn: "PANORAMA",
			};
		case "cross_section":
			return {
				top: "S",
				bottom: "I",
				left: "B",
				right: "L",
				topTooltipRu: "Superior (Вершина альвеолярного гребня / Crestal)",
				bottomTooltipRu: "Inferior (Базальная кость / Apical)",
				leftTooltipRu: "Buccal (Вестибулярно / Щечно)",
				rightTooltipRu: "Lingual (Язычно / Небно)",
				planeColor: ROMEXIS_COLORS.crossSection,
				planeNameRu: "Кросс-секция (Трансверзальный срез)",
				planeNameEn: "CROSS-SECTION",
			};
	}
}

export interface RulerDrawingOptions {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelSpacingMmX: number;
	readonly pixelSpacingMmY: number;
	readonly originMmX?: number | undefined;
	readonly originMmY?: number | undefined;
	readonly showXAxis?: boolean | undefined;
	readonly showYAxis?: boolean | undefined;
	readonly showGrid?: boolean | undefined;
	readonly showScaleBar?: boolean | undefined;
	readonly invertColors?: boolean | undefined;
	readonly scaleBarOffsetX?: number | undefined;
	readonly scaleBarOffsetY?: number | undefined;
	readonly transform?: {
		readonly panX?: number | undefined;
		readonly panY?: number | undefined;
		readonly zoom?: number | undefined;
	} | undefined;
}

/**
 * Draws precision calibrated millimeter rulers (1 mm minor ticks, 5 mm medium ticks, 10 mm major ticks + labels)
 * and a 10 mm scale reference bar onto the 2D canvas in 1:1 screen vector space (Zero-aliasing under zoom).
 * Supports WCAG AAA contrast inverting (Negative LUT X-Ray mode).
 */
export function drawCalibratedMillimeterRulers(
	ctx: CanvasRenderingContext2D,
	options: RulerDrawingOptions,
): void {
	const {
		widthPx,
		heightPx,
		pixelSpacingMmX,
		pixelSpacingMmY,
		showXAxis = true,
		showYAxis = true,
		showGrid = false,
		showScaleBar = true,
		invertColors = false,
		transform,
	} = options;

	if (pixelSpacingMmX <= 0 || pixelSpacingMmY <= 0) return;

	const zoom = transform?.zoom ?? 1.0;
	const panX = transform?.panX ?? 0.0;
	const panY = transform?.panY ?? 0.0;

	const pxPerMmX = (1.0 / pixelSpacingMmX) * zoom;
	const pxPerMmY = (1.0 / pixelSpacingMmY) * zoom;

	ctx.save();
	ctx.font = "bold 9px monospace";
	ctx.textBaseline = "top";

	// WCAG AAA palette resolution for negative vs positive X-Ray LUT
	const majorColor = invertColors ? "#09090b" : ROMEXIS_COLORS.rulerMajor;
	const minorColor = invertColors ? "rgba(9, 9, 11, 0.85)" : ROMEXIS_COLORS.rulerMinor;
	const textColor = invertColors ? "#09090b" : ROMEXIS_COLORS.rulerText;
	const gridColor = invertColors ? "rgba(9, 9, 11, 0.2)" : ROMEXIS_COLORS.rulerGrid;
	const scaleBarBg = invertColors ? "rgba(255, 255, 255, 0.95)" : CRISP_OVERLAY_PAD_BG;
	const haloColor = invertColors ? "#ffffff" : "rgba(0, 0, 0, 0.85)";

	// 1. Optional background grid (every 5mm aligned with slice coordinate space)
	if (showGrid) {
		ctx.strokeStyle = gridColor;
		ctx.lineWidth = 0.5;
		const gridStepX = 5.0 * pxPerMmX;
		const gridStepY = 5.0 * pxPerMmY;

		const startX = ((panX % gridStepX) + gridStepX) % gridStepX;
		for (let x = startX; x < widthPx; x += gridStepX) {
			ctx.beginPath();
			ctx.moveTo(Math.round(x), 0);
			ctx.lineTo(Math.round(x), heightPx);
			ctx.stroke();
		}
		const startY = ((panY % gridStepY) + gridStepY) % gridStepY;
		for (let y = startY; y < heightPx; y += gridStepY) {
			ctx.beginPath();
			ctx.moveTo(0, Math.round(y));
			ctx.lineTo(widthPx, Math.round(y));
			ctx.stroke();
		}
	}

	// 2. Horizontal (X-axis) ruler along top border
	if (showXAxis) {
		const minMm = Math.floor(-panX / pxPerMmX);
		const maxMm = Math.ceil((widthPx - panX) / pxPerMmX);
		const startMm = Math.max(0, minMm);
		const endMm = Math.max(0, maxMm);

		for (let mm = startMm; mm <= endMm; mm += 1) {
			const x = Math.round(panX + mm * pxPerMmX);
			if (x < 0) continue;
			if (x > widthPx - 2) break;

			const isMajor = mm % 10 === 0;
			const isMedium = mm % 5 === 0 && !isMajor;

			ctx.save();
			if (invertColors) {
				ctx.shadowColor = haloColor;
				ctx.shadowBlur = 2;
			}

			ctx.beginPath();
			ctx.moveTo(x, 0);
			if (isMajor) {
				ctx.strokeStyle = majorColor;
				ctx.lineWidth = 1.0;
				ctx.lineTo(x, 8);
				ctx.stroke();
				// Avoid collision with center anatomical orientation badge 'A'/'S' at x ~ widthPx / 2
				const isNearCenter = Math.abs(x - widthPx / 2) < 18;
				if (mm > 0 && x + 14 < widthPx && !isNearCenter) {
					if (invertColors && typeof ctx.strokeText === "function") {
						ctx.strokeStyle = haloColor;
						ctx.lineWidth = 2.0;
						ctx.strokeText(`${mm}`, x + 2, 2);
					}
					ctx.fillStyle = textColor;
					ctx.fillText(`${mm}`, x + 2, 2);
				}
			} else if (isMedium) {
				ctx.strokeStyle = minorColor;
				ctx.lineWidth = 0.75;
				ctx.lineTo(x, 5);
				ctx.stroke();
			} else {
				ctx.strokeStyle = minorColor;
				ctx.lineWidth = 0.5;
				ctx.lineTo(x, 3);
				ctx.stroke();
			}
			ctx.restore();
		}
	}

	// 3. Vertical (Y-axis) ruler along left border
	if (showYAxis) {
		const minMm = Math.floor(-panY / pxPerMmY);
		const maxMm = Math.ceil((heightPx - panY) / pxPerMmY);
		const startMm = Math.max(0, minMm);
		const endMm = Math.max(0, maxMm);

		for (let mm = startMm; mm <= endMm; mm += 1) {
			const y = Math.round(panY + mm * pxPerMmY);
			if (y < 0) continue;
			if (y > heightPx - 2) break;

			const isMajor = mm % 10 === 0;
			const isMedium = mm % 5 === 0 && !isMajor;

			ctx.save();
			if (invertColors) {
				ctx.shadowColor = haloColor;
				ctx.shadowBlur = 2;
			}

			ctx.beginPath();
			ctx.moveTo(0, y);
			if (isMajor) {
				ctx.strokeStyle = majorColor;
				ctx.lineWidth = 1.0;
				ctx.lineTo(8, y);
				ctx.stroke();
				if (mm > 0 && y + 10 < heightPx) {
					if (invertColors && typeof ctx.strokeText === "function") {
						ctx.strokeStyle = haloColor;
						ctx.lineWidth = 2.0;
						ctx.strokeText(`${mm}`, 2, y + 2);
					}
					ctx.fillStyle = textColor;
					ctx.fillText(`${mm}`, 2, y + 2);
				}
			} else if (isMedium) {
				ctx.strokeStyle = minorColor;
				ctx.lineWidth = 0.75;
				ctx.lineTo(5, y);
				ctx.stroke();
			} else {
				ctx.strokeStyle = minorColor;
				ctx.lineWidth = 0.5;
				ctx.lineTo(3, y);
				ctx.stroke();
			}
			ctx.restore();
		}
	}

	// 4. Calibrated Scale Legend Bar (10 mm) in bottom corner (Dense dark pad rgba(15, 23, 42, 0.92) with 1px border)
	if (showScaleBar) {
		const barWidthPx = 10.0 * pxPerMmX;
		const barX = options.scaleBarOffsetX ?? 14;
		const barY = heightPx - (options.scaleBarOffsetY ?? 14);

		ctx.save();
		ctx.fillStyle = scaleBarBg;
		ctx.fillRect(barX - 4, barY - 12, barWidthPx + 8, 16);

		ctx.strokeStyle = invertColors ? "rgba(9, 9, 11, 0.25)" : "rgba(6, 182, 212, 0.6)";
		ctx.lineWidth = 1.0;
		ctx.strokeRect(barX - 4, barY - 12, barWidthPx + 8, 16);

		if (invertColors) {
			ctx.shadowColor = haloColor;
			ctx.shadowBlur = 2;
		}

		ctx.strokeStyle = majorColor;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(barX, barY - 4);
		ctx.lineTo(barX, barY);
		ctx.lineTo(barX + barWidthPx, barY);
		ctx.lineTo(barX + barWidthPx, barY - 4);
		ctx.stroke();

		if (invertColors && typeof ctx.strokeText === "function") {
			ctx.strokeStyle = haloColor;
			ctx.lineWidth = 2.0;
			ctx.textAlign = "center";
			ctx.strokeText("10 mm", barX + barWidthPx / 2, barY - 11);
		}

		ctx.fillStyle = textColor;
		ctx.textAlign = "center";
		ctx.fillText("10 mm", barX + barWidthPx / 2, barY - 11);
		ctx.restore();
	}

	ctx.restore();
}

export interface SlabCorridorParams {
	readonly orientation: "horizontal" | "vertical";
	readonly centerPx: number;
	readonly thicknessMm: number;
	readonly pixelSpacingMm: number;
	readonly lengthPx: number;
	readonly colorRgba: string;
	readonly fillColorRgba?: string;
	readonly invertColors?: boolean | undefined;
}

/**
 * Draws two parallel dashed bounding lines and a subtle fill corridor on intersecting planes
 * when slab thickness > 1 mm. Supports WCAG AAA dark halo underlay on invert LUT.
 */
export function drawRomexisSlabCorridor(
	ctx: CanvasRenderingContext2D,
	params: SlabCorridorParams,
): void {
	const {
		orientation,
		centerPx,
		thicknessMm,
		pixelSpacingMm,
		lengthPx,
		colorRgba,
		fillColorRgba,
		invertColors = false,
	} = params;

	if (thicknessMm <= 1.0 || pixelSpacingMm <= 0) return;

	const halfThicknessPx = (thicknessMm / 2.0) / pixelSpacingMm;
	if (halfThicknessPx < 1.0) return;

	const minPos = Math.round(centerPx - halfThicknessPx);
	const maxPos = Math.round(centerPx + halfThicknessPx);

	ctx.save();

	// Translucent corridor fill
	if (fillColorRgba) {
		ctx.fillStyle = fillColorRgba;
		if (orientation === "horizontal") {
			ctx.fillRect(0, minPos, lengthPx, Math.max(1, maxPos - minPos));
		} else {
			ctx.fillRect(minPos, 0, Math.max(1, maxPos - minPos), lengthPx);
		}
	}

	// Two parallel dashed bounding lines with dark halo underlay on inverted LUT
	ctx.save();
	if (invertColors) {
		ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
		ctx.shadowBlur = 4;
	}
	ctx.strokeStyle = colorRgba;
	ctx.lineWidth = 1.0;
	ctx.setLineDash([4, 3]);

	if (orientation === "horizontal") {
		ctx.beginPath();
		ctx.moveTo(0, minPos);
		ctx.lineTo(lengthPx, minPos);
		ctx.moveTo(0, maxPos);
		ctx.lineTo(lengthPx, maxPos);
		ctx.stroke();
	} else {
		ctx.beginPath();
		ctx.moveTo(minPos, 0);
		ctx.lineTo(minPos, lengthPx);
		ctx.moveTo(maxPos, 0);
		ctx.lineTo(maxPos, lengthPx);
		ctx.stroke();
	}
	ctx.restore();

	ctx.restore();
}

/**
 * Translates HU value to Russian anatomical tissue label per clinical radiological norms (DEF-C08).
 * Pure soft tissue zone 0..+150 HU is classified as "Мягкие ткани / Слизистая / Хрящ",
 * ensuring palatal and mucosal probes are not mislabeled as pulp.
 */
export function getTissueNameFromHU(hu: number): string {
	if (hu >= 2000) return "Эмаль / Пломбировочный материал";
	if (hu >= 1000) return "Кортикальная кость / Дентин";
	if (hu >= 350) return "Трабекулярная губчатая кость";
	if (hu >= 150) return "Мягкая губчатая кость (D4)";
	if (hu >= 0) return "Мягкие ткани / Слизистая / Хрящ";
	if (hu >= -400) return "Жировая клетчатка / Экссудат";
	return "Воздух / Синус / Дыхательные пути";
}

/**
 * Calibrates raw 12/16-bit CT voxel data using Rescale Slope & Rescale Intercept (DICOM Part 3 PS 3.3).
 * Strictly clamps output to physical radiological CT bounds [-1000 .. +3071] HU.
 */
export function calibrateRawToHU(
	rawVoxel: number,
	rescaleSlope = 1.0,
	rescaleIntercept = 0.0,
): number {
	const hu = rawVoxel * rescaleSlope + rescaleIntercept;
	return Math.max(-1000, Math.min(3071, Math.round(hu)));
}

/**
 * Formats a point HU probe measurement with anatomical tissue description.
 * Adheres to DEF-17.1: Strictly formatted as `${huValue > 0 ? '+' : ''}${huValue} HU (${tissueName})`.
 * Prevents any double HU repetition or dot insertion, with physical clamping [-1000..3071].
 */
export function formatHuProbe(hu: number, tissueName?: string): string {
	const clampedHu = Math.max(-1000, Math.min(3071, Math.round(hu)));
	const sign = clampedHu > 0 ? "+" : "";
	let cleanTissue = tissueName;
	if (cleanTissue) {
		// Strip outer HU prefix if already formatted like "+950 HU (tissue)" or "950 HU · tissue" or "+950 HU • tissue"
		const parenMatch = cleanTissue.match(/^[+-]?\d+\s*HU\s*\((.+)\)$/);
		if (parenMatch) {
			cleanTissue = parenMatch[1];
		} else {
			const dotMatch = cleanTissue.match(/^[+-]?\d+\s*HU\s*[·•\.\-]\s*(.+)$/);
			if (dotMatch) {
				cleanTissue = dotMatch[1];
			}
		}
	}
	const tissue = cleanTissue || getTissueNameFromHU(clampedHu);
	return `${sign}${clampedHu} HU (${tissue})`;
}

/**
 * Returns CSS cursor style corresponding to active mouse tool and interaction state.
 */
export function getCbctToolCursor(
	tool: CbctActiveMouseTool,
	isDragging = false,
	hoveredHandle?: boolean,
): string {
	if (hoveredHandle) return "grab";
	switch (tool) {
		case "crosshair":
			return "crosshair";
		case "pan":
			return isDragging ? "grabbing" : "grab";
		case "zoom":
			return isDragging ? "ns-resize" : "zoom-in";
		case "window_level":
			return isDragging ? "move" : "ns-resize";
		case "rotate":
			return isDragging ? "grabbing" : "grab";
		case "probe":
			return "crosshair";
		case "ruler":
			return "crosshair";
		case "angle":
			return "crosshair";
		default:
			return "crosshair";
	}
}

/**
 * Draws precision calibrated measurement ruler between two points on the slice canvas.
 * Features 6-8px luminous glowing handles (#22d3ee / #f59e0b), active amber selection ring,
 * and high-contrast dark badge (rgba(0, 0, 0, 0.85)) with fast delete [×] trigger.
 */
export function drawCbctMeasurementRuler(
	ctx: CanvasRenderingContext2D,
	startPx: { readonly x: number; readonly y: number },
	endPx: { readonly x: number; readonly y: number },
	distanceMm: number,
	isActive = false,
	selectedHandleIndex: number | null = null,
	invertColors = false,
): void {
	const dx = endPx.x - startPx.x;
	const dy = endPx.y - startPx.y;
	const len = Math.hypot(dx, dy);
	if (len < 1) return;

	const nx = -dy / len;
	const ny = dx / len;
	const tickHalfLen = 5;

	ctx.save();
	const primaryColor = isActive
		? (invertColors ? "#c2410c" : "#f59e0b")
		: (invertColors ? "#0284c7" : "#22d3ee");

	// 1. Active Amber Halo / Selection Glow when active
	if (isActive) {
		ctx.save();
		ctx.strokeStyle = invertColors ? "rgba(194, 65, 12, 0.4)" : "rgba(245, 158, 11, 0.35)";
		ctx.lineWidth = 4.5;
		ctx.shadowColor = invertColors ? "#c2410c" : "#f59e0b";
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.moveTo(startPx.x, startPx.y);
		ctx.lineTo(endPx.x, endPx.y);
		ctx.stroke();
		ctx.restore();
	}

	// 2. Main connecting line with dark halo underlay for WCAG AAA contrast
	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
	ctx.shadowBlur = 4;
	ctx.strokeStyle = primaryColor;
	ctx.lineWidth = isActive ? 2.0 : 1.5;
	ctx.beginPath();
	ctx.moveTo(startPx.x, startPx.y);
	ctx.lineTo(endPx.x, endPx.y);
	ctx.stroke();

	// 3. Perpendicular tick at start point
	ctx.beginPath();
	ctx.moveTo(startPx.x + nx * tickHalfLen, startPx.y + ny * tickHalfLen);
	ctx.lineTo(startPx.x - nx * tickHalfLen, startPx.y - ny * tickHalfLen);
	ctx.stroke();

	// 4. Perpendicular tick at end point
	ctx.beginPath();
	ctx.moveTo(endPx.x + nx * tickHalfLen, endPx.y + ny * tickHalfLen);
	ctx.lineTo(endPx.x - nx * tickHalfLen, endPx.y - ny * tickHalfLen);
	ctx.stroke();
	ctx.restore();

	// 5. End anchor handles (start = 0, end = 1) — 6-8px Luminous Glowing Points
	const isStartActive = selectedHandleIndex === 0;
	ctx.save();
	ctx.shadowColor = isStartActive ? primaryColor : isActive ? primaryColor : (invertColors ? "rgba(0, 0, 0, 0.95)" : "#22d3ee");
	ctx.shadowBlur = isStartActive ? 8 : 6;
	ctx.fillStyle = isStartActive ? primaryColor : isActive ? primaryColor : (invertColors ? "#0284c7" : "#22d3ee");
	ctx.beginPath();
	ctx.arc(startPx.x, startPx.y, isStartActive ? 4.2 : 3.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = invertColors ? "rgba(0, 0, 0, 0.95)" : "#ffffff";
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.restore();

	const isEndActive = selectedHandleIndex === 1;
	ctx.save();
	ctx.shadowColor = isEndActive ? primaryColor : isActive ? primaryColor : (invertColors ? "rgba(0, 0, 0, 0.95)" : "#22d3ee");
	ctx.shadowBlur = isEndActive ? 8 : 6;
	ctx.fillStyle = isEndActive ? primaryColor : isActive ? primaryColor : (invertColors ? "#0284c7" : "#22d3ee");
	ctx.beginPath();
	ctx.arc(endPx.x, endPx.y, isEndActive ? 4.2 : 3.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = invertColors ? "rgba(0, 0, 0, 0.95)" : "#ffffff";
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.restore();

	// 6. Floating distance pill badge at midpoint with high-contrast dark pad rgba(15, 23, 42, 0.92) and 1px gold/cyan border
	const midX = (startPx.x + endPx.x) / 2;
	const midY = (startPx.y + endPx.y) / 2;
	const distText = `${distanceMm.toFixed(1)} мм`;

	ctx.font = "bold 12px monospace";
	const textWidth = ctx.measureText(distText).width;
	// 8px left pad + textWidth + 6px gap + 22px delete button + 3px right pad = textWidth + 39px
	const badgeW = isActive ? textWidth + 39 : textWidth + 16;
	const badgeH = 22;

	// Dark underlay pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = isActive ? (invertColors ? "#c2410c" : CRISP_OVERLAY_BORDER_GOLD) : (invertColors ? "#0284c7" : CRISP_OVERLAY_BORDER_CYAN);
	ctx.lineWidth = 1.0;
	if (isActive) {
		ctx.shadowColor = invertColors ? "rgba(194, 65, 12, 0.5)" : "rgba(245, 158, 11, 0.5)";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 4);
	} else {
		ctx.rect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	if (isActive) {
		ctx.shadowBlur = 0;
		// Distance label (8px left padding)
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(distText, midX - badgeW / 2 + 8, midY);

		// Fast Delete [×] Button Trigger with 6px gap from distance text (DEF-03 / DEF-18.1 / DEF-R2-06)
		const delBtnX = midX + badgeW / 2 - 14;
		drawMeasurementDeleteButton(ctx, delBtnX, midY, 11);
	} else {
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(distText, midX, midY);
	}

	ctx.restore();
}

/**
 * Draws precision protractor / angle measurement on the slice canvas.
 * Renders two arms, circular vertex arc, 6-8px luminous control handles, and high-contrast degree badge with delete trigger.
 */
export function drawCbctAngleMeasurement(
	ctx: CanvasRenderingContext2D,
	p1Px: { readonly x: number; readonly y: number },
	vertexPx: { readonly x: number; readonly y: number },
	p2Px: { readonly x: number; readonly y: number },
	angleDeg: number,
	isActive = false,
	selectedHandleIndex: number | null = null,
): void {
	const dx1 = p1Px.x - vertexPx.x;
	const dy1 = p1Px.y - vertexPx.y;
	const len1 = Math.hypot(dx1, dy1);

	const dx2 = p2Px.x - vertexPx.x;
	const dy2 = p2Px.y - vertexPx.y;
	const len2 = Math.hypot(dx2, dy2);

	if (len1 < 1 && len2 < 1) return;

	ctx.save();
	const primaryColor = isActive ? "#f59e0b" : "#22d3ee";

	// 1. Active Amber Halo when selected
	if (isActive) {
		ctx.save();
		ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
		ctx.lineWidth = 4.5;
		ctx.shadowColor = "#f59e0b";
		ctx.shadowBlur = 8;
		ctx.beginPath();
		if (len1 >= 1) {
			ctx.moveTo(vertexPx.x, vertexPx.y);
			ctx.lineTo(p1Px.x, p1Px.y);
		}
		if (len2 >= 1) {
			ctx.moveTo(vertexPx.x, vertexPx.y);
			ctx.lineTo(p2Px.x, p2Px.y);
		}
		ctx.stroke();
		ctx.restore();
	}

	// Dark halo underlay (shadowColor = rgba(0,0,0,0.85), shadowBlur = 4)
	// ensures angle measurement lines and arc manipulators are never lost against hyperdense white bone or enamel
	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
	ctx.shadowBlur = 4;
	ctx.strokeStyle = primaryColor;
	ctx.lineWidth = isActive ? 2.0 : 1.5;

	// 1. Draw arm 1 (vertex -> p1)
	if (len1 >= 1) {
		ctx.beginPath();
		ctx.moveTo(vertexPx.x, vertexPx.y);
		ctx.lineTo(p1Px.x, p1Px.y);
		ctx.stroke();
	}

	// 2. Draw arm 2 (vertex -> p2)
	if (len2 >= 1) {
		ctx.beginPath();
		ctx.moveTo(vertexPx.x, vertexPx.y);
		ctx.lineTo(p2Px.x, p2Px.y);
		ctx.stroke();
	}

	// 3. Draw circular angle arc at vertex if both arms are present
	if (len1 >= 5 && len2 >= 5) {
		const angle1 = Math.atan2(dy1, dx1);
		const angle2 = Math.atan2(dy2, dx2);

		let diff = angle2 - angle1;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;

		const arcRadius = Math.min(32, Math.max(16, Math.min(len1, len2) * 0.45));
		const anticlockwise = diff < 0;

		ctx.beginPath();
		ctx.strokeStyle = isActive ? "#f59e0b" : "#22d3ee";
		ctx.lineWidth = 1.5;
		ctx.arc(vertexPx.x, vertexPx.y, arcRadius, angle1, angle1 + diff, anticlockwise);
		ctx.stroke();

		// Translucent wedge fill
		ctx.beginPath();
		ctx.moveTo(vertexPx.x, vertexPx.y);
		ctx.arc(vertexPx.x, vertexPx.y, arcRadius, angle1, angle1 + diff, anticlockwise);
		ctx.closePath();
		ctx.fillStyle = isActive ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 211, 238, 0.15)";
		ctx.fill();
	}
	ctx.restore();

	// 4. Draw control handles (0 = arm 1, 1 = vertex, 2 = arm 2) — 6-8px Luminous Glowing Points
	const handles = [
		{ pt: p1Px, idx: 0 },
		{ pt: vertexPx, idx: 1 },
		{ pt: p2Px, idx: 2 },
	];

	for (const h of handles) {
		const isHandleActive = selectedHandleIndex === h.idx;
		ctx.save();
		ctx.shadowColor = isHandleActive ? "#f59e0b" : isActive ? "#f59e0b" : "#22d3ee";
		ctx.shadowBlur = isHandleActive ? 8 : 6;
		ctx.fillStyle = isHandleActive ? "#f59e0b" : (isActive ? "#f59e0b" : "#22d3ee");
		ctx.beginPath();
		ctx.arc(h.pt.x, h.pt.y, isHandleActive ? 4.2 : (h.idx === 1 ? 4.0 : 3.5), 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.restore();
	}

	// 5. Floating angle degree badge with high contrast background and delete trigger
	let badgeX = vertexPx.x;
	let badgeY = vertexPx.y;

	if (len1 >= 5 && len2 >= 5) {
		const angle1 = Math.atan2(dy1, dx1);
		const angle2 = Math.atan2(dy2, dx2);
		let diff = angle2 - angle1;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;
		const bisectorAngle = angle1 + diff / 2;
		const badgeDist = Math.min(48, Math.max(26, Math.min(len1, len2) * 0.4 + 14));
		badgeX = vertexPx.x + Math.cos(bisectorAngle) * badgeDist;
		badgeY = vertexPx.y + Math.sin(bisectorAngle) * badgeDist;
	} else if (len1 >= 5) {
		badgeX = (vertexPx.x + p1Px.x) / 2;
		badgeY = (vertexPx.y + p1Px.y) / 2 - 12;
	} else {
		badgeY -= 16;
	}

	const angleText = `${angleDeg.toFixed(1)}°`;
	ctx.font = "bold 12px monospace";
	const textWidth = ctx.measureText(angleText).width;
	const badgeW = isActive ? textWidth + 39 : textWidth + 16;
	const badgeH = 22;

	// Dark underlay pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = isActive ? CRISP_OVERLAY_BORDER_GOLD : CRISP_OVERLAY_BORDER_CYAN;
	ctx.lineWidth = 1.0;
	if (isActive) {
		ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	if (isActive) {
		ctx.shadowBlur = 0;
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(angleText, badgeX - badgeW / 2 + 8, badgeY);

		// Fast Delete [×] Button Trigger (DEF-03 / DEF-18.1 / DEF-R2-06)
		const delBtnX = badgeX + badgeW / 2 - 14;
		drawMeasurementDeleteButton(ctx, delBtnX, badgeY, 11);
	} else {
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(angleText, badgeX, badgeY);
	}

	ctx.restore();
}

/**
 * Draws point HU densitometry probe marker with target reticle and label badge.
 * Features high-contrast dark pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border.
 */
export function drawCbctProbeMarker(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	hu: number,
	tissueName?: string,
	isActive = false,
): void {
	ctx.save();

	// Target reticle
	ctx.strokeStyle = isActive ? CRISP_OVERLAY_BORDER_GOLD : "#38bdf8";
	ctx.lineWidth = isActive ? 2.0 : 1.5;
	if (isActive) {
		ctx.shadowColor = "#f59e0b";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	ctx.arc(posPx.x, posPx.y, 6, 0, Math.PI * 2);
	ctx.stroke();

	// Center dot — 6px Luminous dot
	ctx.fillStyle = isActive ? "#f59e0b" : "#22d3ee";
	ctx.shadowColor = isActive ? "#f59e0b" : "#22d3ee";
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.arc(posPx.x, posPx.y, 3, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1.0;
	ctx.stroke();

	// Crosshair ticks
	ctx.shadowBlur = 0;
	ctx.strokeStyle = isActive ? "#f59e0b" : "rgba(56, 189, 248, 0.85)";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.moveTo(posPx.x - 10, posPx.y);
	ctx.lineTo(posPx.x - 6, posPx.y);
	ctx.moveTo(posPx.x + 6, posPx.y);
	ctx.lineTo(posPx.x + 10, posPx.y);
	ctx.moveTo(posPx.x, posPx.y - 10);
	ctx.lineTo(posPx.x, posPx.y - 6);
	ctx.moveTo(posPx.x, posPx.y + 6);
	ctx.lineTo(posPx.x, posPx.y + 10);
	ctx.stroke();

	// Info label badge (DEF-17.1: Zero string duplication via formatHuProbe)
	const label = formatHuProbe(hu, tissueName);
	ctx.font = "bold 11px monospace";
	const textWidth = ctx.measureText(label).width;
	const badgeW = isActive ? textWidth + 39 : textWidth + 12;
	const badgeH = 22;
	const badgeX = posPx.x + 10;
	const badgeY = posPx.y - 22;

	// Dark underlay pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = isActive ? CRISP_OVERLAY_BORDER_GOLD : CRISP_OVERLAY_BORDER_CYAN;
	ctx.lineWidth = 1.0;
	if (isActive) {
		ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.shadowBlur = 0;
	if (isActive) {
		ctx.fillStyle = "#fef08a";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(label, badgeX + 8, badgeY + badgeH / 2);

		const delBtnX = badgeX + badgeW - 14;
		drawMeasurementDeleteButton(ctx, delBtnX, badgeY + badgeH / 2, 11);
	} else {
		ctx.fillStyle = "#38bdf8";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(label, badgeX + 6, badgeY + badgeH / 2);
	}

	ctx.restore();
}

/**
 * Converts a 3D physical world point (mm) to slice pixel coordinates on a given viewport.
 */
export function worldMmToSlicePx(
	pointMm: Point3D,
	plane: CbctViewportType,
	volume: CbctVoxelVolume,
): { x: number; y: number } {
	const vox = worldMmToVoxel(pointMm, volume);
	const depthMax = volume.dimensions.depth - 1;
	switch (plane) {
		case "axial":
			return { x: vox.x, y: vox.y };
		case "coronal":
			return { x: vox.x, y: depthMax - vox.z };
		case "sagittal":
			return { x: vox.y, y: depthMax - vox.z };
		default:
			return { x: vox.x, y: vox.y };
	}
}

/**
 * Maps 2D slice pixel coordinates to 2D screen canvas pixels using the viewport pan/zoom transform.
 */
export function slicePxToScreenPx(
	slicePx: { readonly x: number; readonly y: number },
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
): { x: number; y: number } {
	const zoom = transform?.zoom ?? 1.0;
	const panX = transform?.panX ?? 0.0;
	const panY = transform?.panY ?? 0.0;
	return {
		x: slicePx.x * zoom + panX,
		y: slicePx.y * zoom + panY,
	};
}

/**
 * Maps 3D world millimeter coordinates to 2D screen canvas pixels using slice projection and viewport transform.
 */
export function worldMmToScreenPx(
	worldMm: Point3D,
	plane: CbctViewportType,
	volume: CbctVoxelVolume,
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
): { x: number; y: number } {
	const slicePx = worldMmToSlicePx(worldMm, plane, volume);
	return slicePxToScreenPx(slicePx, transform);
}

/**
 * Converts slice pixel coordinates on a given viewport back to a 3D physical world point (mm).
 */
export function slicePxToWorldMm(
	pixel: { readonly x: number; readonly y: number },
	plane: CbctViewportType,
	currentCrosshairMm: Point3D,
	volume: CbctVoxelVolume,
): Point3D {
	const curVox = worldMmToVoxel(currentCrosshairMm, volume);
	const depthMax = volume.dimensions.depth - 1;
	switch (plane) {
		case "axial":
			return voxelToWorldMm({ x: Math.round(pixel.x), y: Math.round(pixel.y), z: curVox.z }, volume);
		case "coronal":
			return voxelToWorldMm({ x: Math.round(pixel.x), y: curVox.y, z: depthMax - Math.round(pixel.y) }, volume);
		case "sagittal":
			return voxelToWorldMm({ x: curVox.x, y: Math.round(pixel.x), z: depthMax - Math.round(pixel.y) }, volume);
		default:
			return voxelToWorldMm({ x: Math.round(pixel.x), y: Math.round(pixel.y), z: curVox.z }, volume);
	}
}

/**
 * Computes min and max voxel indices for slab projection boundaries.
 */
export function calculateSlabVoxelBounds(
	centerVoxel: number,
	slabThicknessMm: number,
	voxelSpacingMm: number,
	maxVoxelIndex: number,
): { startVoxel: number; endVoxel: number; halfSlabVoxels: number } {
	if (slabThicknessMm <= voxelSpacingMm) {
		return { startVoxel: centerVoxel, endVoxel: centerVoxel, halfSlabVoxels: 0 };
	}
	const slabVoxelCount = Math.max(1, Math.round(slabThicknessMm / voxelSpacingMm));
	const halfSlabVoxels = Math.floor(slabVoxelCount / 2);
	const startVoxel = Math.max(0, centerVoxel - halfSlabVoxels);
	const endVoxel = Math.min(maxVoxelIndex, centerVoxel + halfSlabVoxels);
	return { startVoxel, endVoxel, halfSlabVoxels };
}

// ─── 1. COORDINATE CONVERSION & CLAMPING MATH ─────────────────────────────────

/**
 * Converts real-world physical millimeters into voxel buffer indices.
 * Overloaded: supports worldMmToVoxel(pointMm, volume) and worldMmToVoxel(volume, pointMm).
 */
export function worldMmToVoxel(
	arg1: Point3D | CbctVoxelVolume,
	arg2: CbctVoxelVolume | Point3D,
): { x: number; y: number; z: number } {
	let pointMm: Point3D;
	let volume: CbctVoxelVolume;

	if ("data" in arg1 || "dimensions" in arg1) {
		volume = arg1 as CbctVoxelVolume;
		pointMm = arg2 as Point3D;
	} else {
		pointMm = arg1 as Point3D;
		volume = arg2 as CbctVoxelVolume;
	}

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
 * Overloaded: supports voxelToWorldMm(voxel, volume) and voxelToWorldMm(volume, vx, vy, vz).
 */
export function voxelToWorldMm(
	arg1: { x: number; y: number; z: number } | CbctVoxelVolume,
	arg2: CbctVoxelVolume | number,
	arg3?: number,
	arg4?: number,
): Point3D {
	let volume: CbctVoxelVolume;
	let vx = 0;
	let vy = 0;
	let vz = 0;

	if (typeof arg2 === "number") {
		volume = arg1 as CbctVoxelVolume;
		vx = arg2;
		vy = arg3 ?? 0;
		vz = arg4 ?? 0;
	} else {
		const vox = arg1 as { x: number; y: number; z: number };
		volume = arg2 as CbctVoxelVolume;
		vx = vox.x;
		vy = vox.y;
		vz = vox.z;
	}

	return {
		x: Number((volume.originMm.x + vx * volume.spacingMm.x).toFixed(2)),
		y: Number((volume.originMm.y + vy * volume.spacingMm.y).toFixed(2)),
		z: Number((volume.originMm.z + vz * volume.spacingMm.z).toFixed(2)),
	};
}

/**
 * Clamps real-world millimeter coordinates strictly inside the 3D volume bounding box.
 */
export function clampCoordinateToVolume(worldMm: Point3D, volume: CbctVoxelVolume): Point3D {
	if (!volume) return { ...worldMm };
	const halfX = volume.physicalSizeMm.x / 2;
	const halfY = volume.physicalSizeMm.y / 2;
	const halfZ = volume.physicalSizeMm.z / 2;

	const minX = Math.min(volume.originMm.x, -halfX);
	const maxX = Math.max(volume.originMm.x + volume.physicalSizeMm.x, halfX);
	const minY = Math.min(volume.originMm.y, -halfY);
	const maxY = Math.max(volume.originMm.y + volume.physicalSizeMm.y, halfY);
	const minZ = Math.min(volume.originMm.z, -halfZ);
	const maxZ = Math.max(volume.originMm.z + volume.physicalSizeMm.z, halfZ);

	const safeX = Number.isFinite(worldMm.x) ? Math.max(minX, Math.min(maxX, worldMm.x)) : 0;
	const safeY = Number.isFinite(worldMm.y) ? Math.max(minY, Math.min(maxY, worldMm.y)) : 0;
	const safeZ = Number.isFinite(worldMm.z) ? Math.max(minZ, Math.min(maxZ, worldMm.z)) : 0;

	return {
		x: Number(safeX.toFixed(2)),
		y: Number(safeY.toFixed(2)),
		z: Number(safeZ.toFixed(2)),
	};
}

/**
 * Calculates current slice index for a specific plane from world millimeters.
 */
export function calculateMprSliceIndex(worldMm: Point3D, plane: MprPlane, volume: CbctVoxelVolume): number {
	const clamped = clampCoordinateToVolume(worldMm, volume);
	const vox = worldMmToVoxel(clamped, volume);
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
 * Safely samples Hounsfield Unit (HU) from volume buffer with boundary checking and RescaleSlope/Intercept calibration.
 * Overloaded: supports (x, y, z, volume) and (volume, x, y, z).
 */
export function sampleVoxelHU(
	arg1: number | CbctVoxelVolume,
	arg2: number,
	arg3: number,
	arg4?: number | CbctVoxelVolume,
): number {
	let volume: CbctVoxelVolume;
	let x: number;
	let y: number;
	let z: number;

	if (typeof arg1 === "object") {
		volume = arg1;
		x = arg2;
		y = arg3;
		z = typeof arg4 === "number" ? arg4 : 0;
	} else {
		x = arg1;
		y = arg2;
		z = arg3;
		volume = arg4 as CbctVoxelVolume;
	}

	if (
		!volume ||
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
	const raw = volume.data[index] ?? -1000;
	const slope = volume.rescaleSlope ?? 1.0;
	const intercept = volume.rescaleIntercept ?? 0.0;
	const hu = (slope !== 1.0 || intercept !== 0.0) ? raw * slope + intercept : raw;
	return Math.max(-1000, Math.min(3071, Math.round(hu)));
}

/**
 * Trilinear continuous sub-voxel interpolation of Hounsfield Unit (HU) with RescaleSlope/Intercept calibration.
 * Guarantees smooth, anti-aliased reslicing without nearest-neighbor jagged comb artifacts.
 */
export function sampleVoxelTrilinearHU(
	x: number,
	y: number,
	z: number,
	volume: CbctVoxelVolume,
): number {
	if (
		!volume ||
		!volume.data ||
		volume.isDisposed ||
		x < 0 ||
		x > volume.dimensions.width - 1 ||
		y < 0 ||
		y > volume.dimensions.height - 1 ||
		z < 0 ||
		z > volume.dimensions.depth - 1
	) {
		return -1000;
	}

	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const z0 = Math.floor(z);
	const x1 = Math.min(volume.dimensions.width - 1, x0 + 1);
	const y1 = Math.min(volume.dimensions.height - 1, y0 + 1);
	const z1 = Math.min(volume.dimensions.depth - 1, z0 + 1);

	const dx = x - x0;
	const dy = y - y0;
	const dz = z - z0;

	const w = volume.dimensions.width;
	const wh = w * volume.dimensions.height;
	const data = volume.data;

	const c000 = data[z0 * wh + y0 * w + x0] ?? -1000;
	const c100 = data[z0 * wh + y0 * w + x1] ?? -1000;
	const c010 = data[z0 * wh + y1 * w + x0] ?? -1000;
	const c110 = data[z0 * wh + y1 * w + x1] ?? -1000;
	const c001 = data[z1 * wh + y0 * w + x0] ?? -1000;
	const c101 = data[z1 * wh + y0 * w + x1] ?? -1000;
	const c011 = data[z1 * wh + y1 * w + x0] ?? -1000;
	const c111 = data[z1 * wh + y1 * w + x1] ?? -1000;

	const c00 = c000 + dx * (c100 - c000);
	const c10 = c010 + dx * (c110 - c010);
	const c01 = c001 + dx * (c101 - c001);
	const c11 = c011 + dx * (c111 - c011);

	const c0 = c00 + dy * (c10 - c00);
	const c1 = c01 + dy * (c11 - c01);

	const rawHu = c0 + dz * (c1 - c0);
	const slope = volume.rescaleSlope ?? 1.0;
	const intercept = volume.rescaleIntercept ?? 0.0;
	const hu = (slope !== 1.0 || intercept !== 0.0) ? rawHu * slope + intercept : rawHu;
	return Math.max(-1000, Math.min(3071, Math.round(hu)));
}

/**
 * Continuous millimeter to fractional sub-voxel coordinate mapping.
 */
export function worldMmToVoxelContinuous(
	pointMm: Point3D,
	volume: CbctVoxelVolume,
): { x: number; y: number; z: number } {
	return {
		x: (pointMm.x - volume.originMm.x) / (volume.spacingMm.x || 0.2),
		y: (pointMm.y - volume.originMm.y) / (volume.spacingMm.y || 0.2),
		z: (pointMm.z - volume.originMm.z) / (volume.spacingMm.z || 0.2),
	};
}

// ─── 2.1 16-BIT LOOK-UP TABLE (LUT) WINDOW/LEVEL CONTRAST ENGINE ───────────

/**
 * Generates a precomputed 65536-entry Uint8Array Look-Up Table (LUT) mapping signed 16-bit
 * HU values (-32768..+32767) to 8-bit grayscale intensities [0..255].
 *
 * Direct index mapping: `lutIndex = (hu + 32768) & 0xffff`.
 *
 * Supports:
 * - Sub-millisecond window width / window level contrast calculations.
 * - Negative / Inverted X-ray LUT (White Paper mode) via `invert = true`.
 * - Anti-blinding dark background: Air voxels (HU < -600) remain deep dark (#090d16 -> 10) on inversion.
 * - Non-linear gamma VOI transfer curve via `gamma`.
 */
export function generate16BitLut(
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
): Uint8Array {
	const lut = new Uint8Array(65536);
	const safeWW = Math.max(1, windowWidth);
	const low = windowLevel - safeWW / 2.0;
	const high = windowLevel + safeWW / 2.0;
	const invWW = 1.0 / safeWW;

	const lowIdx = Math.max(0, Math.min(65536, Math.floor(low + 32768)));
	const highIdx = Math.max(0, Math.min(65536, Math.ceil(high + 32768)));

	// Air threshold for anti-blinding in inverted LUT: HU < -600 keeps deep dark background (#090d16 -> 10)
	const airThresholdHU = -600;
	const airThresholdIdx = Math.max(0, Math.min(65536, Math.floor(airThresholdHU + 32768)));
	const darkAirVal = 10; // #090d16 deep dark background

	const bottomVal = invert ? 255 : 0;
	const topVal = invert ? 0 : 255;

	if (lowIdx > 0) {
		lut.fill(bottomVal, 0, lowIdx);
	}
	if (highIdx < 65536) {
		lut.fill(topVal, highIdx, 65536);
	}

	const isGamma = gamma !== 1.0 && gamma > 0;
	for (let i = lowIdx; i < highIdx; i++) {
		const hu = i - 32768;
		if (hu <= low) {
			lut[i] = bottomVal;
		} else if (hu >= high) {
			lut[i] = topVal;
		} else {
			const normalized = (hu - low) * invWW;
			const corrected = isGamma ? Math.pow(normalized, gamma) : normalized;
			const val = Math.round(corrected * 255);
			lut[i] = invert ? 255 - val : val;
		}
	}

	// Invert LUT: keep ambient air voxels (HU < -600) deep dark (#090d16) to eliminate white background blinding
	if (invert) {
		for (let i = 0; i < airThresholdIdx; i++) {
			lut[i] = darkAirVal;
		}
	}

	return lut;
}

const LUT_CACHE_MAX_SIZE = 64;
const lutCache = new Map<string, Uint8Array>();

/**
 * Retrieves a cached 65536-entry Uint8Array Look-Up Table (LUT) for instantaneous
 * (< 0.05 ms) Window/Level mapping without memory allocation churn.
 */
export function get16BitLut(
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
): Uint8Array {
	const key = `${windowWidth}|${windowLevel}|${invert ? 1 : 0}|${gamma}`;
	let lut = lutCache.get(key);
	if (!lut) {
		lut = generate16BitLut(windowWidth, windowLevel, invert, gamma);
		if (lutCache.size >= LUT_CACHE_MAX_SIZE) {
			const firstKey = lutCache.keys().next().value;
			if (firstKey !== undefined) {
				lutCache.delete(firstKey);
			}
		}
		lutCache.set(key, lut);
	}
	return lut;
}

/**
 * Clears the 16-bit Window/Level LUT cache.
 */
export function clearLutCache(): void {
	lutCache.clear();
}

/**
 * Applies a precomputed 16-bit LUT to a single Hounsfield Unit (HU) or raw voxel value.
 * Indexing: `(clamp(hu, -32768, 32767) + 32768) & 0xffff`.
 */
export function applyLutToHU(lut: Uint8Array, hu: number): number {
	const idx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
	return lut[idx] ?? 0;
}

/**
 * Maps Hounsfield Unit (HU) to 8-bit grayscale intensity [0..255] via linear or gamma windowing.
 * Standards: DICOM Part 3 PS 3.3 (C.11.2.1.2 VOI LUT Windowing), Planmeca Romexis, Vatech Ez3D-i.
 * Uses cached 16-bit LUT for instantaneous sub-microsecond evaluation.
 *
 * Tissue HU Reference under WW 4400 / WL 1300:
 * - Air (-1000 HU) -> 0 (Black)
 * - Pulp / Nerve soft tissue (+50..200 HU) -> 55..64 (Dark gray / black)
 * - Trabecular Bone (+600..900 HU) -> 90..104 (Medium gray)
 * - Cortical Bone (+1300..1600 HU) -> 127..145 (Medium gray)
 * - Dentin (+1800..2500 HU) -> 156..197 (Light gray)
 * - Enamel (+3000..4000 HU) -> 226..255 (Bright white)
 */
export function huToGrayscale(
	hu: number,
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
): number {
	const lut = get16BitLut(windowWidth, windowLevel, invert, gamma);
	const idx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
	return lut[idx] ?? 0;
}

// ─── 3. MULTI-PLANAR RESLICER (MPR) WITH SLAB PROJECTIONS ───────────────────

/**
 * Extracts a 2D orthogonal slice (Axial, Coronal, or Sagittal) from the 3D CBCT volume.
 * Supports Single Slice, MIP (Maximum Intensity Projection), MinIP, and Average IP.
 * Uses 16-bit Look-Up Table (LUT) caching for sub-millisecond contrast recoloring.
 */
export function extractMprSlice(
	volume: CbctVoxelVolume,
	plane: MprPlane,
	sliceIndex: number,
	options: SliceRenderOptions = { windowWidth: 4400, windowLevel: 1300 },
): MprSliceExtractionResult {
	const { windowWidth = 4400, windowLevel = 1300, invert = false, slabMode = "single", slabThicknessMm = 2.0 } = options ?? {};

	const dim = volume.dimensions;
	const sp = volume.spacingMm;

	let widthPx = 0;
	let heightPx = 0;
	let pixelSpacingX = 0;
	let pixelSpacingY = 0;
	let maxSliceIndex = 0;
	let physicalPosMm = 0;
	let slabVoxelCount = 1;

	// Determine plane geometry
	switch (plane) {
		case "axial": {
			// Horizontal slice: X (width) vs Y (height) at constant Z
			widthPx = dim.width;
			heightPx = dim.height;
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.y;
			maxSliceIndex = dim.depth - 1;
			const clampedZ = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
			physicalPosMm = volume.originMm.z + clampedZ * sp.z;
			slabVoxelCount = slabMode === "single" ? 1 : Math.max(1, Math.round(slabThicknessMm / sp.z));
			break;
		}
		case "coronal": {
			// Frontal slice: X (width) vs Z (height) at constant Y
			widthPx = dim.width;
			heightPx = dim.depth;
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.z;
			maxSliceIndex = dim.height - 1;
			const clampedY = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
			physicalPosMm = volume.originMm.y + clampedY * sp.y;
			slabVoxelCount = slabMode === "single" ? 1 : Math.max(1, Math.round(slabThicknessMm / sp.y));
			break;
		}
		case "sagittal": {
			// Profile slice: Y (width) vs Z (height) at constant X
			widthPx = dim.height;
			heightPx = dim.depth;
			pixelSpacingX = sp.y;
			pixelSpacingY = sp.z;
			maxSliceIndex = dim.width - 1;
			const clampedX = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
			physicalPosMm = volume.originMm.x + clampedX * sp.x;
			slabVoxelCount = slabMode === "single" ? 1 : Math.max(1, Math.round(slabThicknessMm / sp.x));
			break;
		}
	}

	const clampedSlice = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
	const halfSlab = Math.floor(slabVoxelCount / 2);
	const startSlice = Math.max(0, clampedSlice - halfSlab);
	const endSlice = Math.min(maxSliceIndex, clampedSlice + halfSlab);

	const totalPixels = widthPx * heightPx;
	const pixelBuffer = new Uint8ClampedArray(totalPixels * 4); // RGBA

	// Pre-cached 16-bit Window/Level Look-Up Table (LUT)
	const lut = get16BitLut(windowWidth, windowLevel, invert);

	// Fast single slice path
	if (slabMode === "single" || startSlice === endSlice) {
		for (let row = 0; row < heightPx; row++) {
			for (let col = 0; col < widthPx; col++) {
				let vx = 0;
				let vy = 0;
				let vz = 0;

				if (plane === "axial") {
					vx = col;
					vy = row;
					vz = clampedSlice;
				} else if (plane === "coronal") {
					vx = col;
					vy = clampedSlice;
					vz = heightPx - 1 - row; // Flip Z for anatomical display (top = superior)
				} else {
					// sagittal
					vx = clampedSlice;
					vy = col;
					vz = heightPx - 1 - row;
				}

				const hu = sampleVoxelHU(vx, vy, vz, volume);
				const gray = lut[(hu + 32768) & 0xffff]!;

				const pIdx = (row * widthPx + col) * 4;
				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
			}
		}
	} else {
		// Slab projection (MIP, MinIP, Average)
		for (let row = 0; row < heightPx; row++) {
			for (let col = 0; col < widthPx; col++) {
				let maxHU = -32768;
				let minHU = 32767;
				let sumHU = 0;
				let count = 0;

				for (let s = startSlice; s <= endSlice; s++) {
					let vx = 0;
					let vy = 0;
					let vz = 0;

					if (plane === "axial") {
						vx = col;
						vy = row;
						vz = s;
					} else if (plane === "coronal") {
						vx = col;
						vy = s;
						vz = heightPx - 1 - row;
					} else {
						// sagittal
						vx = s;
						vy = col;
						vz = heightPx - 1 - row;
					}

					const hu = sampleVoxelHU(vx, vy, vz, volume);
					if (hu > maxHU) maxHU = hu;
					if (hu < minHU) minHU = hu;
					sumHU += hu;
					count++;
				}

				let finalHU = maxHU;
				if (slabMode === "minip") finalHU = minHU;
				else if (slabMode === "average") finalHU = count > 0 ? Math.round(sumHU / count) : minHU;

				const gray = lut[(finalHU + 32768) & 0xffff]!;
				const pIdx = (row * widthPx + col) * 4;
				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
			}
		}
	}

	return {
		data: pixelBuffer,
		metadata: {
			plane,
			sliceIndex: clampedSlice,
			maxSliceIndex,
			physicalPositionMm: Number(physicalPosMm.toFixed(2)),
			widthPx,
			heightPx,
			pixelSpacingX,
			pixelSpacingY,
			slabThicknessMm: slabMode === "single" ? sp.x : slabThicknessMm,
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

	switch (plane) {
		case "axial":
			// Horizontal: NormX = Left -> Right (-halfX -> +halfX), NormY = Anterior -> Posterior (-halfY -> +halfY)
			newX = (canvasNormX - 0.5) * 2 * halfX;
			newY = (canvasNormY - 0.5) * 2 * halfY;
			break;
		case "coronal":
			// Frontal: NormX = Left -> Right, NormY = Superior -> Inferior (+halfZ -> -halfZ)
			newX = (canvasNormX - 0.5) * 2 * halfX;
			newZ = (0.5 - canvasNormY) * 2 * halfZ;
			break;
		case "sagittal":
			// Profile: NormX = Posterior -> Anterior, NormY = Superior -> Inferior
			newY = (canvasNormX - 0.5) * 2 * halfY;
			newZ = (0.5 - canvasNormY) * 2 * halfZ;
			break;
	}

	return clampCoordinateToVolume({ x: newX, y: newY, z: newZ }, volume);
}

// ─── 4. CBCT VOXEL VOLUME UTILITIES ──────────────────────────────────────────

/**
 * Generates an anatomically authentic 3D dental CBCT volume with true Hounsfield Unit (HU) voxels:
 * - Mandibular parabolic arch with cortical plate (1450 HU), trabecular marrow (450 HU), and mandibular canals (IAN).
 * - Maxillary bone, hard palate, and bilateral air-filled maxillary sinuses (-1000 HU).
 * - Maxillary teeth (18..28) with crowns occlusal (z=0..3mm) and roots pointing UP/cranially (z=3..11mm) towards the sinus floor.
 * - Mandibular teeth (48..38) with crowns occlusal (z=-3..0mm) and roots pointing DOWN/apically (z=-11..-3mm), safely >= 4.5mm above the IAN canal.
 * - Soft tissue facial envelope (+40 HU) and ambient air (-1000 HU).
 * Eliminates pitch black screens (#000000) in all MPR viewports (DEF-C01).
 */
export function createSyntheticDentalCbctVolume(
	width = 160,
	height = 160,
	depth = 100,
	voxelSpacingMm = 0.4,
): CbctVoxelVolume {
	const totalVoxels = width * height * depth;
	const buffer = new Int16Array(totalVoxels).fill(-1000); // Ambient air outside

	const physW = width * voxelSpacingMm;
	const physH = height * voxelSpacingMm;
	const physD = depth * voxelSpacingMm;

	const originX = -physW / 2;
	const originY = -physH / 2;
	const originZ = -physD / 2;

	let minHU = 3071;
	let maxHU = -1000;

	for (let k = 0; k < depth; k++) {
		const zMm = originZ + (k + 0.5) * voxelSpacingMm;
		const sliceOffset = k * width * height;

		for (let j = 0; j < height; j++) {
			const yMm = originY + (j + 0.5) * voxelSpacingMm;
			const rowOffset = sliceOffset + j * width;

			for (let i = 0; i < width; i++) {
				const xMm = originX + (i + 0.5) * voxelSpacingMm;
				const idx = rowOffset + i;

				// Parabolic dental arch: y = -18 + 0.038 * x^2
				const archY = -18 + 0.038 * (xMm * xMm);
				const distToArchY = yMm - archY;
				const absDistToArch = Math.abs(distToArchY);
				const absX = Math.abs(xMm);

				let hu = -1000;

				// 1. Soft tissue facial envelope
				const facialRadius = Math.hypot(xMm, yMm + 6);
				if (facialRadius < 30 && zMm > -18 && zMm < 18) {
					hu = 40;
				}

				// 2. Mandibular bone arch (zMm: -18 to -2, absX <= 26)
				if (zMm >= -18 && zMm <= -2 && absX <= 26) {
					const mandibleWidth = 8.5;
					if (absDistToArch <= mandibleWidth / 2) {
						const distFromSurface = (mandibleWidth / 2) - absDistToArch;
						const distFromBase = zMm - (-18);

						if (distFromSurface < 1.4 || distFromBase < 1.6 || absDistToArch > 3.0) {
							hu = 1450 + Math.round((Math.sin(xMm * 3) + Math.cos(zMm * 2)) * 80);
						} else {
							hu = 450 + Math.round((Math.sin(xMm * 7) * Math.cos(yMm * 5 + zMm * 4)) * 120);
						}

						// Mandibular Canal (IAN) at z = -15.5mm..-17mm
						if (absX >= 12 && absX <= 24) {
							const canalZ = -15.5 + (absX - 12) * 0.1;
							const canalDist = Math.hypot(distToArchY + 0.3, zMm - canalZ);
							if (canalDist < 1.4) {
								hu = -30; // Soft tissue / nerve bundle inside canal
							} else if (canalDist < 1.9) {
								hu = 950; // Cortical wall of mandibular canal
							}
						}
					}
				}

				// 3. Mandibular teeth (48..38: zMm between -12 and +1)
				if (zMm >= -12 && zMm <= +1 && absX <= 24) {
					if (absDistToArch <= 4.0) {
						const toothPeriod = Math.sin(absX * 0.85);
						if (toothPeriod > -0.4) {
							const toothCenterDist = Math.hypot(distToArchY, (absX % 4.5) - 2.25);
							if (zMm >= -3) {
								if (toothCenterDist < 3.2) {
									if (toothCenterDist > 2.2) {
										hu = 2650; // Enamel
									} else if (toothCenterDist > 0.8) {
										hu = 1350; // Dentin
									} else {
										hu = 50; // Pulp
									}
								}
							} else if (zMm >= -11) {
								const rootRadius = 2.4 * (1.0 - ((-3 - zMm) / 9.0) * 0.55);
								if (toothCenterDist < rootRadius) {
									if (toothCenterDist > 0.6) {
										hu = 1250; // Dentin of root
									} else {
										hu = 40; // Root canal
									}
								}
							}
						}
					}
				}

				// 4. Maxillary bone & sinuses (zMm between +1 and +18)
				if (zMm >= +1 && zMm <= +18 && absX <= 26) {
					const maxillaWidth = 8.0;
					if (absDistToArch <= maxillaWidth / 2 && zMm <= +8) {
						const distFromSurface = (maxillaWidth / 2) - absDistToArch;
						if (distFromSurface < 1.3 || zMm <= +2.5) {
							hu = 1250;
						} else {
							hu = 400;
						}
					}

					if (zMm >= +6 && zMm <= +8.5 && yMm > -14 && yMm < 14 && absX < 18) {
						hu = 1100;
					}

					// Maxillary Sinuses
					if (absX >= 9 && absX <= 25 && yMm >= -8 && yMm <= 16 && zMm >= +6 && zMm <= +18) {
						const sinusDist = Math.hypot(absX - 17, (yMm - 4) * 0.8, (zMm - 12) * 0.9);
						if (sinusDist < 7.5) {
							hu = -1000;
						} else if (sinusDist < 8.8) {
							hu = 1200;
						}
					}

					// Nasal cavity
					if (absX < 7 && yMm >= -16 && yMm <= 10 && zMm >= +6 && zMm <= +18) {
						if (absX < 0.9) {
							hu = 950;
						} else {
							hu = -1000;
						}
					}
				}

				// 5. Maxillary teeth (18..28: zMm between 0 and +12)
				if (zMm >= 0 && zMm <= +12 && absX <= 24) {
					if (absDistToArch <= 3.8) {
						const toothPeriod = Math.sin(absX * 0.85);
						if (toothPeriod > -0.4) {
							const toothCenterDist = Math.hypot(distToArchY, (absX % 4.5) - 2.25);
							if (zMm <= +3) {
								if (toothCenterDist < 3.2) {
									if (toothCenterDist > 2.2) {
										hu = 2650;
									} else if (toothCenterDist > 0.8) {
										hu = 1350;
									} else {
										hu = 50;
									}
								}
							} else if (zMm <= +11) {
								const rootRadius = 2.3 * (1.0 - ((zMm - 3) / 9.0) * 0.55);
								if (toothCenterDist < rootRadius) {
									if (toothCenterDist > 0.6) {
										hu = 1250;
									} else {
										hu = 40;
									}
								}
							}
						}
					}
				}

				buffer[idx] = hu;
				if (hu < minHU) minHU = hu;
				if (hu > maxHU) maxHU = hu;
			}
		}
	}

	return {
		id: `synthetic-dental-cbct-${Date.now()}`,
		dimensions: { width, height, depth },
		spacingMm: { x: voxelSpacingMm, y: voxelSpacingMm, z: voxelSpacingMm },
		originMm: { x: originX, y: originY, z: originZ },
		physicalSizeMm: { x: physW, y: physH, z: physD },
		data: buffer,
		minHU: Math.max(-1000, minHU),
		maxHU: Math.min(3071, maxHU),
		defaultWindowWidth: 4400,
		defaultWindowLevel: 1300,
		isDisposed: false,
	};
}

/**
 * Creates an empty or flat-field CBCT voxel volume for mathematical coordinate calculations and tests.
 */
export function createEmptyCbctVolume(
	width = 64,
	height = 64,
	depth = 32,
	voxelSpacingMm = 0.5,
	defaultHU = -1000,
): CbctVoxelVolume {
	const totalVoxels = width * height * depth;
	const buffer = new Int16Array(totalVoxels).fill(defaultHU);

	const physW = width * voxelSpacingMm;
	const physH = height * voxelSpacingMm;
	const physD = depth * voxelSpacingMm;

	return {
		id: `empty-cbct-${Date.now()}`,
		dimensions: { width, height, depth },
		spacingMm: { x: voxelSpacingMm, y: voxelSpacingMm, z: voxelSpacingMm },
		originMm: {
			x: -physW / 2,
			y: -physH / 2,
			z: -physD / 2,
		},
		physicalSizeMm: { x: physW, y: physH, z: physD },
		data: buffer,
		minHU: defaultHU,
		maxHU: defaultHU,
		defaultWindowWidth: 2000,
		defaultWindowLevel: 400,
		isDisposed: false,
	};
}

/**
 * Explicitly releases TypedArray buffers to prevent GPU/RAM memory leaks.
 */
export function disposeCbctVolume(volume: CbctVoxelVolume): void {
	if (volume && !volume.isDisposed) {
		volume.data = null;
		(volume as { isDisposed: boolean }).isDisposed = true;
	}
}

/**
 * Calculates the exact un-letterboxed canvas pixel coordinate and normalized 0..1 coordinate
 * from a mouse/pointer event on a canvas styled with object-fit: contain (Fit-to-Viewport).
 */
export function getCanvasPointerPos(
	canvas: HTMLCanvasElement,
	clientX: number,
	clientY: number,
): { x: number; y: number; normX: number; normY: number } {
	const rect = canvas.getBoundingClientRect();
	const elemW = rect.width;
	const elemH = rect.height;
	const bufW = canvas.width;
	const bufH = canvas.height;

	if (elemW <= 0 || elemH <= 0 || bufW <= 0 || bufH <= 0) {
		return { x: 0, y: 0, normX: 0, normY: 0 };
	}

	const elemAspect = elemW / elemH;
	const bufAspect = bufW / bufH;

	let renderedW = elemW;
	let renderedH = elemH;
	let offsetX = 0;
	let offsetY = 0;

	if (elemAspect > bufAspect) {
		// Element is wider than buffer -> vertical fit, horizontal letterbox bars
		renderedH = elemH;
		renderedW = elemH * bufAspect;
		offsetX = (elemW - renderedW) / 2;
	} else {
		// Element is taller than buffer -> horizontal fit, vertical letterbox bars
		renderedW = elemW;
		renderedH = elemW / bufAspect;
		offsetY = (elemH - renderedH) / 2;
	}

	const localX = clientX - rect.left - offsetX;
	const localY = clientY - rect.top - offsetY;

	const normX = Math.max(0, Math.min(1, renderedW > 0 ? localX / renderedW : 0));
	const normY = Math.max(0, Math.min(1, renderedH > 0 ? localY / renderedH : 0));

	return {
		x: normX * (bufW - 1),
		y: normY * (bufH - 1),
		normX,
		normY,
	};
}

/**
 * Calculates updated 3D world millimeter coordinates during real-time crosshair translation dragging.
 * Correctly updates the two free spatial axes of the active plane while preserving the fixed slice axis.
 * Supports zoom & pan viewport transforms.
 */
export function calculateCrosshairDragWorldMm(
	pointerPx: { readonly x: number; readonly y: number },
	canvasSize: { readonly width: number; readonly height: number },
	plane: MprPlane,
	currentCrosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	transform: ViewportTransform,
	volume?: CbctVoxelVolume | null | undefined,
): Point3D {
	if (!volume) return { ...currentCrosshairMm };
	return mapCanvasPointerToWorldMmWithTransform(
		pointerPx,
		canvasSize,
		plane,
		currentCrosshairMm,
		angles,
		transform,
		volume,
	);
}

/**
 * Calculations for synchronized 2D slice pixel and screen pixel crosshair positions across all 5 CBCT viewports
 * (Axial, Coronal, Sagittal, Panoramic, Cross-Section) in real time (60 FPS).
 */
export interface SynchronizedCrosshairProjection {
	readonly axial: {
		readonly centerSlicePx: { readonly x: number; readonly y: number };
		readonly centerScreenPx: { readonly x: number; readonly y: number };
		readonly coronalLineY: number;
		readonly sagittalLineX: number;
		readonly rotationDeg: number;
	};
	readonly coronal: {
		readonly centerSlicePx: { readonly x: number; readonly y: number };
		readonly centerScreenPx: { readonly x: number; readonly y: number };
		readonly axialLineY: number;
		readonly sagittalLineX: number;
		readonly rotationDeg: number;
	};
	readonly sagittal: {
		readonly centerSlicePx: { readonly x: number; readonly y: number };
		readonly centerScreenPx: { readonly x: number; readonly y: number };
		readonly axialLineY: number;
		readonly coronalLineX: number;
		readonly rotationDeg: number;
	};
	readonly panoramic: {
		readonly axialLineY: number;
		readonly crossSectionLineX: number | null;
	};
	readonly crossSection: {
		readonly axialLineY: number;
	};
}

/**
 * Calculates synchronized 2D slice pixel and screen pixel crosshair positions across all 5 CBCT viewports
 * (Axial, Coronal, Sagittal, Panoramic, Cross-Section) in real time (60 FPS).
 */
export function computeSynchronizedCrosshairProjections(
	worldMm: Point3D,
	volume: CbctVoxelVolume,
	obliqueAngles: ObliqueRotationAngles = DEFAULT_OBLIQUE_ROTATION,
	transforms?: Partial<Record<CbctViewportType, ViewportTransform>> | undefined,
	panoramicDimensions?: { readonly widthPx: number; readonly heightPx: number; readonly totalArcLengthMm?: number } | null | undefined,
	activeCrossSection?: { readonly centerPointMm: Point3D; readonly widthMm?: number; readonly pixelSpacingMm?: number } | null | undefined,
): SynchronizedCrosshairProjection {
	const vox = worldMmToVoxel(worldMm, volume);
	const depthMax = Math.max(1, volume.dimensions.depth - 1);
	const zPx = depthMax - vox.z;

	const axialTrans = transforms?.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
	const coronalTrans = transforms?.coronal ?? DEFAULT_VIEWPORT_TRANSFORM;
	const sagittalTrans = transforms?.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM;

	const axialSlice = { x: vox.x, y: vox.y };
	const axialScreen = slicePxToScreenPx(axialSlice, axialTrans);

	const coronalSlice = { x: vox.x, y: zPx };
	const coronalScreen = slicePxToScreenPx(coronalSlice, coronalTrans);

	const sagittalSlice = { x: vox.y, y: zPx };
	const sagittalScreen = slicePxToScreenPx(sagittalSlice, sagittalTrans);

	let panoAxialY = 0;
	let panoCrossX: number | null = null;

	if (panoramicDimensions && panoramicDimensions.heightPx > 0) {
		const zNorm = 1.0 - (vox.z / depthMax);
		panoAxialY = Math.round(zNorm * panoramicDimensions.heightPx);
		if (activeCrossSection && panoramicDimensions.totalArcLengthMm && panoramicDimensions.totalArcLengthMm > 0) {
			const relDist = Math.hypot(activeCrossSection.centerPointMm.x, activeCrossSection.centerPointMm.y);
			const ratio = Math.max(0, Math.min(1, relDist / panoramicDimensions.totalArcLengthMm));
			panoCrossX = Math.round(ratio * (panoramicDimensions.widthPx - 1));
		}
	}

	const csPixelSpacing = activeCrossSection?.pixelSpacingMm ?? 0.25;
	const csAxialY = Math.round(15.0 / (csPixelSpacing > 0 ? csPixelSpacing : 0.25));

	return {
		axial: {
			centerSlicePx: axialSlice,
			centerScreenPx: axialScreen,
			coronalLineY: axialScreen.y,
			sagittalLineX: axialScreen.x,
			rotationDeg: obliqueAngles.axialAngleDeg,
		},
		coronal: {
			centerSlicePx: coronalSlice,
			centerScreenPx: coronalScreen,
			axialLineY: coronalScreen.y,
			sagittalLineX: coronalScreen.x,
			rotationDeg: obliqueAngles.coronalTiltDeg,
		},
		sagittal: {
			centerSlicePx: sagittalSlice,
			centerScreenPx: sagittalScreen,
			axialLineY: sagittalScreen.y,
			coronalLineX: sagittalScreen.x,
			rotationDeg: obliqueAngles.sagittalTiltDeg,
		},
		panoramic: {
			axialLineY: panoAxialY,
			crossSectionLineX: panoCrossX,
		},
		crossSection: {
			axialLineY: csAxialY,
		},
	};
}

/**
 * Composites a base grayscale slice canvas (Layer 1) and an overlay UI canvas (Layer 2)
 * into a single unified canvas for clean PNG export / reporting snapshots without visual loss.
 */
export function getCompositeViewportCanvas(
	baseCanvas: HTMLCanvasElement | null,
	overlayCanvas: HTMLCanvasElement | null,
): HTMLCanvasElement | null {
	if (!baseCanvas && !overlayCanvas) return null;
	if (baseCanvas && !overlayCanvas) return baseCanvas;
	if (!baseCanvas && overlayCanvas) return overlayCanvas;

	if (typeof document === "undefined" || !document.createElement) {
		return baseCanvas || overlayCanvas;
	}

	const w = baseCanvas!.width > 0 ? baseCanvas!.width : (overlayCanvas!.width > 0 ? overlayCanvas!.width : 512);
	const h = baseCanvas!.height > 0 ? baseCanvas!.height : (overlayCanvas!.height > 0 ? overlayCanvas!.height : 512);

	const composite = document.createElement("canvas");
	composite.width = w;
	composite.height = h;

	const ctx = composite.getContext("2d");
	if (ctx) {
		if (baseCanvas && baseCanvas.width > 0 && baseCanvas.height > 0) {
			ctx.drawImage(baseCanvas, 0, 0, w, h);
		}
		if (overlayCanvas && overlayCanvas.width > 0 && overlayCanvas.height > 0) {
			ctx.drawImage(overlayCanvas, 0, 0, w, h);
		}
	}
	return composite;
}

// ─── 5. FORWARDING RE-EXPORTS FOR OBLIQUE MPR ENGINE ────────────────────────
import { drawObliqueCrosshairWithRotationHandles } from "./cbctObliqueMath";
export * from "./cbctObliqueMath";
export const drawMprCrosshair = drawObliqueCrosshairWithRotationHandles;
export const drawCbctCrosshair = drawObliqueCrosshairWithRotationHandles;



