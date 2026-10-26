import type { CbctVoxelVolume } from "../cbctMprMath";
import { get16BitLut } from "../cbctMprMath";
import type { Point2D, Point3D } from "../cbctCaliperNerveMath";
import type { DentalArchAnchor } from "../cbctArchSplineMath";
import { getSharedCbctGlContext } from "../mpr/webgl/CbctVolumeGlContext";
import type { CrossSectionRenderOptions, CrossSectionSliceData } from "./types";
import { computeCrossSectionAffineBasis } from "./basisMath";
import { rasterizeCrossSectionSoftware } from "./rasterFallback";

export function extractSingleCrossSectionSlice(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	sliceIndex: number,
	distanceAlongArchMm: number,
	nearestAnchor: DentalArchAnchor,
	options: CrossSectionRenderOptions = {},
): CrossSectionSliceData {
	const widthMm = Number.isFinite(options.widthMm) && (options.widthMm ?? 0) > 0 ? options.widthMm! : 24.0;
	const heightMm = Number.isFinite(options.heightMm) && (options.heightMm ?? 0) > 0 ? options.heightMm! : 32.0;
	const pixelSpacingMm = Number.isFinite(options.pixelSpacingMm) && (options.pixelSpacingMm ?? 0) > 0 ? options.pixelSpacingMm! : 0.25;
	const windowWidth = options.windowWidth ?? (volume.defaultWindowWidth && volume.defaultWindowWidth >= 1000 ? volume.defaultWindowWidth : 4025);
	const windowLevel = options.windowLevel ?? (volume.defaultWindowLevel !== undefined && volume.defaultWindowLevel <= 1000 ? volume.defaultWindowLevel : 525);
	const invert = options.invert ?? false;
	const gamma = options.gamma ?? 1.50;
	const airCutoffHU = options.airCutoffHU ?? -500.0;
	const softKnee = options.softKnee ?? false;
	const slabThicknessMm = options.slabThicknessMm ?? 1.0;
	const slabMode = options.slabMode ?? "single";

	const basis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, {
		...options, widthMm, heightMm, pixelSpacingMm, slabMode, slabThicknessMm,
	});

	const { widthPx, heightPx, unitNormal, unitTangent } = basis;
	let pixelData: Uint8ClampedArray | null = null;
	let rawHuData: Int16Array | undefined = undefined;

	if (options.useGpu !== false) {
		const gl = options.glContext ?? (typeof document !== "undefined" ? getSharedCbctGlContext() : null);
		if (gl && gl.isAvailable() && !volume.isDisposed) {
			const glRes = gl.renderCrossSectionOnGl(volume, centerMm, normal2D, {
				widthMm, heightMm, pixelSpacingMm, windowWidth, windowLevel,
				invert, gamma, airCutoffHU, readPixels: true, slabMode, slabThicknessMm,
			});
			if (glRes?.pixelData && glRes.pixelData.length === widthPx * heightPx * 4) {
				pixelData = glRes.pixelData;
			}
		}
	}

	if (!pixelData) {
		const reqPixelBytes = widthPx * heightPx * 4;
		const reqHuElements = widthPx * heightPx;
		pixelData = options.outputBuffer && options.outputBuffer.length >= reqPixelBytes
			? options.outputBuffer
			: new Uint8ClampedArray(reqPixelBytes);
		rawHuData = options.outputRawHu && options.outputRawHu.length >= reqHuElements
			? options.outputRawHu
			: new Int16Array(reqHuElements);
		const lut = options.lut ?? get16BitLut(windowWidth, windowLevel, invert, gamma, softKnee ? { enabled: true, airCutoffHU } : { enabled: false, airCutoffHU });

		rasterizeCrossSectionSoftware({ volume, basis, lut, pixelData, rawHuData });
	}

	const safeDistMm = Number(distanceAlongArchMm.toFixed(2));
	const sliceLabel = `#${nearestAnchor.toothFdi} (${safeDistMm.toFixed(1)} мм)`;

	return {
		sliceIndex,
		distanceAlongArchMm: safeDistMm,
		centerPointMm: centerMm,
		normalVector2D: unitNormal,
		tangentVector2D: unitTangent,
		nearestToothFdi: nearestAnchor.toothFdi,
		toothLabelRu: nearestAnchor.labelRu,
		sliceLabel,
		...(typeof options.offsetFromMidlineMm === "number" && Number.isFinite(options.offsetFromMidlineMm)
			? { offsetFromMidlineMm: Number(options.offsetFromMidlineMm.toFixed(2)) }
			: {}),
		widthMm,
		heightMm,
		pixelSpacingMm,
		widthPx,
		heightPx,
		pixelData,
		rawHuData,
		glCoordinates: {
			widthPx: basis.widthPx,
			heightPx: basis.heightPx,
			pixelSpacingX: basis.pixelSpacingX,
			pixelSpacingY: basis.pixelSpacingY,
			sliceOrigin: basis.sliceOrigin,
			axisU: basis.axisU,
			axisV: basis.axisV,
			axisNorm: basis.axisNorm,
			slabModeCode: basis.slabModeCode,
			slabSteps: basis.slabSteps,
		},
	};
}
