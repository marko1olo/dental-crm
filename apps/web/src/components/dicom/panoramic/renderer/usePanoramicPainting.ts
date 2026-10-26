/**
 * usePanoramicPainting.ts — Сэмплирование вокселей, отрисовка сечений и обработка мыши (Мандат 8b <= 120 строк).
 */

import { useMemo, useCallback, useRef } from "react";
import type { RefObject } from "react";
import type { VolumeSamplingData } from "@dental/shared";
import type { VisiographWindowPreset } from "../../../visiograph/VisiographWindowPresets";
import { paintCrossSectionSlice } from "../crossSectionPainter";
import { paintHuPixelsToCanvas, type PanoramicVolumeInput } from "../panoramicTypes";
import type { CrossSectionSlicePlane } from "../../panoramicMprMath";
import type { Point2D } from "../../../../utils/math/mprMath";

export interface UsePanoramicPaintingParams {
	volume: PanoramicVolumeInput | null;
	currentPreset: VisiographWindowPreset;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	crossSectionCanvasRef: RefObject<HTMLCanvasElement | null>;
	offscreenCanvasRef: RefObject<HTMLCanvasElement | null>;
	rawPixelsRef: RefObject<{ width: number; height: number; pixels: Float32Array } | null>;
	activeSlice: CrossSectionSlicePlane | undefined;
	crossSections: CrossSectionSlicePlane[];
	effectiveControlPoints: Point2D[];
	sliceThicknessMm: number;
	setProbedHU: (hu: number | null) => void;
	setCursorPos: (pos: { x: number; y: number } | null) => void;
}

export function usePanoramicPainting(params: UsePanoramicPaintingParams) {
	const {
		volume, currentPreset, canvasRef, crossSectionCanvasRef, offscreenCanvasRef,
		rawPixelsRef, activeSlice, crossSections, effectiveControlPoints,
		sliceThicknessMm, setProbedHU, setCursorPos,
	} = params;
	const canvasRectRef = useRef<DOMRect | null>(null);

	const vol = useMemo<VolumeSamplingData | null>(() => {
		if (!volume || !volume.scalarData || volume.scalarData.length === 0) return null;
		const [nx, ny, nz] = volume.dimensions;
		if (nx < 2 || ny < 2 || nz < 1) return null;
		const sliceStride = nx * ny;
		const scalar = volume.scalarData;
		return {
			dims: volume.dimensions, origin: volume.origin,
			invSx: 1 / volume.spacing[0], invSy: 1 / volume.spacing[1], invSz: 1 / volume.spacing[2],
			zMin: Math.min(volume.origin[2], volume.origin[2] + (nz - 1) * volume.spacing[2]),
			zMax: Math.max(volume.origin[2], volume.origin[2] + (nz - 1) * volume.spacing[2]),
			vSpacing: Math.abs(volume.spacing[2]),
			getVoxel: (i: number, j: number, k: number) => {
				if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) return -1024;
				return scalar[k * sliceStride + j * nx + i] ?? -1024;
			},
		};
	}, [volume]);

	const repaint = useCallback(() => {
		const canvas = canvasRef.current;
		const raw = rawPixelsRef.current;
		if (canvas && raw) paintHuPixelsToCanvas(canvas, raw.width, raw.height, raw.pixels, currentPreset);
	}, [currentPreset, canvasRef, rawPixelsRef]);

	const repaintCrossSection = useCallback(() => {
		const csCanvas = crossSectionCanvasRef.current;
		if (!csCanvas) return;
		paintCrossSectionSlice({
			csCanvas, offscreenRef: offscreenCanvasRef, vol, activeSlice,
			crossSections, effectiveControlPoints, currentPreset, sliceThicknessMm,
		});
	}, [vol, activeSlice, crossSections, effectiveControlPoints, currentPreset, sliceThicknessMm, crossSectionCanvasRef, offscreenCanvasRef]);

	const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		const raw = rawPixelsRef.current;
		if (!canvas || !raw) return;
		const rect = canvasRectRef.current || (canvasRectRef.current = canvas.getBoundingClientRect());
		const px = Math.floor((e.clientX - rect.left) * (raw.width / rect.width));
		const py = Math.floor((e.clientY - rect.top) * (raw.height / rect.height));
		if (px >= 0 && px < raw.width && py >= 0 && py < raw.height) {
			const hu = raw.pixels[py * raw.width + px];
			if (typeof hu === "number" && Number.isFinite(hu)) {
				setProbedHU(Math.round(hu));
				setCursorPos({ x: px, y: py });
			}
		}
	};

	return {
		vol, repaint, repaintCrossSection, handleCanvasMouseMove,
		handleCanvasMouseEnter: () => { if (canvasRef.current) canvasRectRef.current = canvasRef.current.getBoundingClientRect(); },
		handleCanvasMouseLeave: () => { canvasRectRef.current = null; },
	};
}
