/**
 * DENTE CRM — CBCT Overlay Decoration, Palettes & HUD Math
 * Extracted from cbctMprMath.ts according to Mandate 8b.
 */

import type { MprPlane, Point2D, Point3D } from "./cbctMprMath";
import {
	CRISP_OVERLAY_PAD_BG,
	drawMeasurementDeleteButton,
	drawMandibularNerveBadge,
} from "./cbctCaliperNerveMath";

export { CRISP_OVERLAY_PAD_BG, drawMeasurementDeleteButton, drawMandibularNerveBadge };


export const ROMEXIS_COLORS = {
	axial: "#06b6d4", // Cyan / Blue (Horizontal / Z-plane / B in RGB)
	axialRgba: (alpha = 1) => `rgba(6, 182, 212, ${alpha})`,
	coronal: "#10b981", // Emerald Green (Frontal / Y-plane / G in RGB)
	coronalRgba: (alpha = 1) => `rgba(16, 185, 129, ${alpha})`,
	sagittal: "#f43f5e", // Rose Red (Profile / X-plane / R in RGB)
	sagittalRgba: (alpha = 1) => `rgba(244, 63, 94, ${alpha})`,
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
	| "probe"
	| "nerve";

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
				planeNameRu: "Аксиальный срез",
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
				planeNameRu: "Корональный срез",
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
				planeNameRu: "Сагиттальный срез",
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
				planeNameRu: "Панорама ОПТГ",
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
				planeNameRu: "Кросс-секция",
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
		showScaleBar = false,
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
	ctx.font = "bold 11px monospace";
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
		const padW = Math.max(barWidthPx + 14, 54);
		const padH = 22;
		ctx.fillStyle = scaleBarBg;
		ctx.fillRect(barX - 7, barY - 17, padW, padH);

		ctx.strokeStyle = invertColors ? "rgba(9, 9, 11, 0.35)" : "rgba(6, 182, 212, 0.8)";
		ctx.lineWidth = 1.2;
		ctx.strokeRect(barX - 7, barY - 17, padW, padH);

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

		ctx.font = "bold 11px monospace";
		if (invertColors && typeof ctx.strokeText === "function") {
			ctx.strokeStyle = haloColor;
			ctx.lineWidth = 2.0;
			ctx.textAlign = "center";
			ctx.strokeText("10 mm", barX + barWidthPx / 2, barY - 14);
		}

		ctx.fillStyle = textColor;
		ctx.textAlign = "center";
		ctx.fillText("10 mm", barX + barWidthPx / 2, barY - 14);
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
		case "nerve":
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
