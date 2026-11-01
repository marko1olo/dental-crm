/**
 * DENTE CRM — Panoramic Viewport Interaction Hook Facade
 * Dedicated sub-hook coordinator managing panoramic mouse interactions, crosshair syncing, and tool events.
 * Standards: DICOM Part 3, Mandate 8b (<= 120 lines).
 */

import type React from "react";
import { useCallback, useRef, useState } from "react";
import type { Point3D } from "../../cbctMprMath";
import { notifyCbctSliceInteraction } from "../cbctAdaptiveSlicePipeline";
import { getPanoPointerWorldMm } from "./curveSplineMath";
import type {
	PendingPanoSync,
	UseCbctCurvedViewportHandlersParams,
} from "./types";
import {
	handlePanoramicNavMouseDown,
	handlePanoramicNavMouseMove,
	handlePanoramicNavMouseUp,
} from "./handlers/panoramicMouseNavigation";
import {
	type PanoramicToolContext,
	handlePanoramicToolMouseDown,
	handlePanoramicToolMouseMove,
	handlePanoramicToolMouseUp,
	updatePanoramicMeasurementHover,
} from "./handlers/panoramicToolInteractions";
import {
	type PanoramicCrosshairSyncProps,
	handlePanoramicCrosshairMouseDown,
	handlePanoramicCrosshairMouseMove,
	handlePanoramicCrosshairMouseUp,
} from "./handlers/panoramicCrosshairSync";

/**
 * Dedicated sub-hook managing all panoramic viewport mouse interactions
 */
export function usePanoramicViewportHandlers(
	params: UseCbctCurvedViewportHandlersParams,
) {
	const [isDraggingPano, setIsDraggingPano] = useState<boolean>(false);
	const pendingPanoSyncRef = useRef<PendingPanoSync | null>(null);
	const rafPanoIdRef = useRef<number | null>(null);

	const getPanoPointerMm = useCallback(
		(pointerPx: { readonly x: number; readonly y: number }): Point3D => {
			return getPanoPointerWorldMm(
				pointerPx,
				params.transforms.panoramic,
				params.panoramicData,
				params.archCurve.totalArcLengthMm,
			);
		},
		[params.transforms.panoramic, params.panoramicData, params.archCurve.totalArcLengthMm],
	);

	const toolProps: PanoramicToolContext = { ...params, getPanoPointerMm };
	const crosshairProps: PanoramicCrosshairSyncProps = {
		archCurve: params.archCurve,
		crossSections: params.crossSections,
		crosshairMm: params.crosshairMm,
		transforms: params.transforms,
		panoCanvasRef: params.panoCanvasRef,
		setActiveCrossSectionIdx: params.setActiveCrossSectionIdx,
		setCrosshairMm: params.setCrosshairMm,
		setIsDraggingPano,
		pendingPanoSyncRef,
		rafPanoIdRef,
	};

	const handlePanoMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			notifyCbctSliceInteraction();
			if (handlePanoramicNavMouseDown(e, params)) return;
			if (handlePanoramicToolMouseDown(e, toolProps)) return;
			handlePanoramicCrosshairMouseDown(e, crosshairProps);
		},
		[params, toolProps, crosshairProps],
	);

	const handlePanoMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (handlePanoramicNavMouseMove(e, params)) return;
			if (handlePanoramicToolMouseMove(e, toolProps)) return;
			if (!isDraggingPano) {
				updatePanoramicMeasurementHover(e, toolProps);
			} else {
				handlePanoramicCrosshairMouseMove(e, crosshairProps);
			}
		},
		[params, toolProps, isDraggingPano, crosshairProps],
	);

	const handlePanoMouseUp = useCallback(() => {
		handlePanoramicCrosshairMouseUp(crosshairProps);
		handlePanoramicNavMouseUp(params);
		handlePanoramicToolMouseUp(toolProps);
	}, [crosshairProps, params, toolProps]);

	return {
		isDraggingPano,
		handlePanoMouseDown,
		handlePanoMouseMove,
		handlePanoMouseUp,
	};
}
