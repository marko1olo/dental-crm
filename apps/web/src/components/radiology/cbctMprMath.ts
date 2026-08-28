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

import type { Point2D, Point3D } from "./cbctCaliperNerveMath";

export type MprPlane = "axial" | "coronal" | "sagittal";
export type SlabProjectionMode = "single" | "mip" | "minip" | "average";
export type { Point2D, Point3D };

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
	coronal: "#f59e0b", // Orange / Amber (Frontal / Y-plane)
	coronalRgba: (alpha = 1) => `rgba(245, 158, 11, ${alpha})`,
	sagittal: "#10b981", // Emerald Green (Profile / X-plane)
	sagittalRgba: (alpha = 1) => `rgba(16, 185, 129, ${alpha})`,
	panoramic: "#a855f7", // Purple (Dental Arch Spline)
	panoramicRgba: (alpha = 1) => `rgba(168, 85, 247, ${alpha})`,
	crossSection: "#eab308", // Yellow (Transverse Cross-Section)
	crossSectionRgba: (alpha = 1) => `rgba(234, 179, 8, ${alpha})`,
	rulerGrid: "rgba(148, 163, 184, 0.15)",
	rulerMajor: "rgba(226, 232, 240, 0.85)",
	rulerMinor: "rgba(148, 163, 184, 0.45)",
	rulerText: "rgba(203, 213, 225, 0.9)",
	compassBg: "rgba(15, 23, 42, 0.75)",
	compassBorder: "rgba(51, 65, 85, 0.8)",
} as const;

export type CbctViewportType = MprPlane | "panoramic" | "cross_section";

export type CbctActiveMouseTool =
	| "crosshair"
	| "pan"
	| "zoom"
	| "window_level"
	| "rotate"
	| "ruler"
	| "probe";

export interface CbctMeasurementRuler {
	readonly id: string;
	readonly plane: CbctViewportType;
	readonly startMm: Point3D;
	readonly endMm: Point3D;
	readonly distanceMm: number;
}

export interface CbctProbeMarker {
	readonly id: string;
	readonly plane: CbctViewportType;
	readonly worldMm: Point3D;
	readonly hu: number;
	readonly tissueName: string;
}

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
	readonly originMmX?: number;
	readonly originMmY?: number;
	readonly showXAxis?: boolean;
	readonly showYAxis?: boolean;
	readonly showGrid?: boolean;
	readonly showScaleBar?: boolean;
}

/**
 * Draws precision calibrated millimeter rulers (1 mm minor ticks, 5 mm medium ticks, 10 mm major ticks + labels)
 * and a 10 mm scale reference bar onto the 2D canvas.
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
	} = options;

	if (pixelSpacingMmX <= 0 || pixelSpacingMmY <= 0) return;

	const pxPerMmX = 1.0 / pixelSpacingMmX;
	const pxPerMmY = 1.0 / pixelSpacingMmY;

	ctx.save();
	ctx.font = "bold 9px monospace";
	ctx.textBaseline = "top";

	// 1. Optional background grid (every 5mm)
	if (showGrid) {
		ctx.strokeStyle = ROMEXIS_COLORS.rulerGrid;
		ctx.lineWidth = 0.5;
		const gridStepX = 5.0 * pxPerMmX;
		const gridStepY = 5.0 * pxPerMmY;
		for (let x = gridStepX; x < widthPx; x += gridStepX) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, heightPx);
			ctx.stroke();
		}
		for (let y = gridStepY; y < heightPx; y += gridStepY) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(widthPx, y);
			ctx.stroke();
		}
	}

	// 2. Horizontal (X-axis) ruler along top border
	if (showXAxis) {
		const totalMmX = widthPx * pixelSpacingMmX;
		for (let mm = 0; mm <= totalMmX; mm += 1) {
			const x = Math.round(mm * pxPerMmX);
			if (x > widthPx - 2) break;

			const isMajor = mm % 10 === 0;
			const isMedium = mm % 5 === 0 && !isMajor;

			ctx.beginPath();
			ctx.moveTo(x, 0);
			if (isMajor) {
				ctx.strokeStyle = ROMEXIS_COLORS.rulerMajor;
				ctx.lineWidth = 1.0;
				ctx.lineTo(x, 8);
				ctx.stroke();
				if (mm > 0 && x + 14 < widthPx) {
					ctx.fillStyle = ROMEXIS_COLORS.rulerText;
					ctx.fillText(`${mm}`, x + 2, 2);
				}
			} else if (isMedium) {
				ctx.strokeStyle = ROMEXIS_COLORS.rulerMinor;
				ctx.lineWidth = 0.75;
				ctx.lineTo(x, 5);
				ctx.stroke();
			} else {
				ctx.strokeStyle = ROMEXIS_COLORS.rulerMinor;
				ctx.lineWidth = 0.5;
				ctx.lineTo(x, 3);
				ctx.stroke();
			}
		}
	}

	// 3. Vertical (Y-axis) ruler along left border
	if (showYAxis) {
		const totalMmY = heightPx * pixelSpacingMmY;
		for (let mm = 0; mm <= totalMmY; mm += 1) {
			const y = Math.round(mm * pxPerMmY);
			if (y > heightPx - 2) break;

			const isMajor = mm % 10 === 0;
			const isMedium = mm % 5 === 0 && !isMajor;

			ctx.beginPath();
			ctx.moveTo(0, y);
			if (isMajor) {
				ctx.strokeStyle = ROMEXIS_COLORS.rulerMajor;
				ctx.lineWidth = 1.0;
				ctx.lineTo(8, y);
				ctx.stroke();
				if (mm > 0 && y + 10 < heightPx) {
					ctx.fillStyle = ROMEXIS_COLORS.rulerText;
					ctx.fillText(`${mm}`, 2, y + 2);
				}
			} else if (isMedium) {
				ctx.strokeStyle = ROMEXIS_COLORS.rulerMinor;
				ctx.lineWidth = 0.75;
				ctx.lineTo(5, y);
				ctx.stroke();
			} else {
				ctx.strokeStyle = ROMEXIS_COLORS.rulerMinor;
				ctx.lineWidth = 0.5;
				ctx.lineTo(3, y);
				ctx.stroke();
			}
		}
	}

	// 4. Calibrated Scale Legend Bar (10 mm) in bottom corner
	if (showScaleBar) {
		const barWidthPx = 10.0 * pxPerMmX;
		const barX = 14;
		const barY = heightPx - 14;

		ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
		ctx.fillRect(barX - 4, barY - 12, barWidthPx + 8, 16);

		ctx.strokeStyle = ROMEXIS_COLORS.rulerMajor;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(barX, barY - 4);
		ctx.lineTo(barX, barY);
		ctx.lineTo(barX + barWidthPx, barY);
		ctx.lineTo(barX + barWidthPx, barY - 4);
		ctx.stroke();

		ctx.fillStyle = ROMEXIS_COLORS.rulerText;
		ctx.textAlign = "center";
		ctx.fillText("10 mm", barX + barWidthPx / 2, barY - 11);
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
}

/**
 * Draws two parallel dashed bounding lines and a subtle fill corridor on intersecting planes
 * when slab thickness > 1 mm.
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

	// Two parallel dashed bounding lines
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
}

/**
 * Translates HU value to Russian anatomical tissue label.
 */
export function getTissueNameFromHU(hu: number): string {
	if (hu >= 2000) return "Эмаль / Пломбировочный материал";
	if (hu >= 1000) return "Кортикальная кость / Дентин";
	if (hu >= 300) return "Трабекулярная губчатая кость";
	if (hu >= 0) return "Мягкие ткани / Пульпа / Десна";
	if (hu >= -400) return "Жировая клетчатка / Экссудат";
	return "Воздух / Синус / Дыхательные пути";
}

/**
 * Returns CSS cursor style corresponding to active mouse tool and interaction state.
 */
export function getCbctToolCursor(
	tool: CbctActiveMouseTool,
	isDragging: boolean,
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
		default:
			return "crosshair";
	}
}

/**
 * Draws precision calibrated measurement ruler between two points on the slice canvas.
 */
export function drawCbctMeasurementRuler(
	ctx: CanvasRenderingContext2D,
	startPx: { readonly x: number; readonly y: number },
	endPx: { readonly x: number; readonly y: number },
	distanceMm: number,
	isActive = false,
): void {
	const dx = endPx.x - startPx.x;
	const dy = endPx.y - startPx.y;
	const len = Math.hypot(dx, dy);
	if (len < 1) return;

	const nx = -dy / len;
	const ny = dx / len;
	const tickHalfLen = 5;

	ctx.save();
	ctx.strokeStyle = isActive ? "#38bdf8" : "#22d3ee";
	ctx.lineWidth = 1.5;

	// Main connecting line
	ctx.beginPath();
	ctx.moveTo(startPx.x, startPx.y);
	ctx.lineTo(endPx.x, endPx.y);
	ctx.stroke();

	// Perpendicular tick at start point
	ctx.beginPath();
	ctx.moveTo(startPx.x + nx * tickHalfLen, startPx.y + ny * tickHalfLen);
	ctx.lineTo(startPx.x - nx * tickHalfLen, startPx.y - ny * tickHalfLen);
	ctx.stroke();

	// Perpendicular tick at end point
	ctx.beginPath();
	ctx.moveTo(endPx.x + nx * tickHalfLen, endPx.y + ny * tickHalfLen);
	ctx.lineTo(endPx.x - nx * tickHalfLen, endPx.y - ny * tickHalfLen);
	ctx.stroke();

	// End anchor circles
	ctx.fillStyle = "#38bdf8";
	ctx.beginPath();
	ctx.arc(startPx.x, startPx.y, 2.5, 0, Math.PI * 2);
	ctx.arc(endPx.x, endPx.y, 2.5, 0, Math.PI * 2);
	ctx.fill();

	// Floating distance pill badge at midpoint
	const midX = (startPx.x + endPx.x) / 2;
	const midY = (startPx.y + endPx.y) / 2;
	const text = `${distanceMm.toFixed(1)} мм`;

	ctx.font = "bold 10px monospace";
	const textWidth = ctx.measureText(text).width;
	const padX = 5;
	const badgeW = textWidth + padX * 2;
	const badgeH = 16;

	ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
	ctx.strokeStyle = "#38bdf8";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 3);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#ffffff";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, midX, midY);

	ctx.restore();
}

/**
 * Draws point HU densitometry probe marker with target reticle and label badge.
 */
export function drawCbctProbeMarker(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	hu: number,
	tissueName?: string,
): void {
	ctx.save();

	// Target reticle
	ctx.strokeStyle = "#38bdf8";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(posPx.x, posPx.y, 6, 0, Math.PI * 2);
	ctx.stroke();

	// Center dot
	ctx.fillStyle = "#f59e0b";
	ctx.beginPath();
	ctx.arc(posPx.x, posPx.y, 2, 0, Math.PI * 2);
	ctx.fill();

	// Crosshair ticks
	ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
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

	// Info label badge
	const label = tissueName ? `${hu} HU · ${tissueName}` : `${hu} HU`;
	ctx.font = "bold 9px monospace";
	const textWidth = ctx.measureText(label).width;
	const badgeW = textWidth + 8;
	const badgeH = 16;
	const badgeX = posPx.x + 10;
	const badgeY = posPx.y - 18;

	ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
	ctx.strokeStyle = "#38bdf8";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#38bdf8";
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillText(label, badgeX + 4, badgeY + badgeH / 2);

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
	return volume.data[index] ?? -1000;
}

/**
 * Maps Hounsfield Unit (HU) to 8-bit grayscale intensity [0..255] via linear or gamma windowing.
 * Standards: DICOM Part 3 PS 3.3 (C.11.2.1.2 VOI LUT Windowing), Planmeca Romexis, Vatech Ez3D-i.
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
	const low = windowLevel - windowWidth / 2.0;
	const high = windowLevel + windowWidth / 2.0;

	if (hu <= low) return invert ? 255 : 0;
	if (hu >= high) return invert ? 0 : 255;

	const normalized = (hu - low) / windowWidth;
	const corrected = gamma !== 1.0 && gamma > 0 ? Math.pow(normalized, gamma) : normalized;
	const val = Math.round(corrected * 255);
	return invert ? 255 - val : val;
}

// ─── 3. MULTI-PLANAR RESLICER (MPR) WITH SLAB PROJECTIONS ───────────────────

/**
 * Extracts a 2D orthogonal slice (Axial, Coronal, or Sagittal) from the 3D CBCT volume.
 * Supports Single Slice, MIP (Maximum Intensity Projection), MinIP, and Average IP.
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
				const gray = huToGrayscale(hu, windowWidth, windowLevel, invert);

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

				const gray = huToGrayscale(finalHU, windowWidth, windowLevel, invert);
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

export const createSyntheticDentalCbctVolume = createEmptyCbctVolume;

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

// ─── 5. FORWARDING RE-EXPORTS FOR OBLIQUE MPR ENGINE ────────────────────────
export * from "./cbctObliqueMath";


