/**
 * DENTE CRM — Panoramic Viewport 3D Crosshair & Dental Curve Synchronization
 * Manages slice tracking, crosshair position RAF-debouncing, and cross-section syncing.
 * Standards: Mandate 8b (Sweet Spot 100-140 lines), 60 FPS Smooth Drag.
 */

import type React from "react";
import type { Point3D, ViewportTransform } from "../../../cbctMprMath";
import { getCanvasPointerPos } from "../../../cbctMprMath";
import type {
	CrossSectionSliceData,
	DentalArchCurve,
} from "../../../dentalCurveEngine";
import { mapPanoPointerToCrosshairAndSlice } from "../../../dentalCurveEngine";
import type { PendingPanoSync } from "../types";

export interface PanoramicCrosshairSyncProps {
	readonly archCurve: DentalArchCurve;
	readonly crossSections: readonly CrossSectionSliceData[];
	readonly crosshairMm: Point3D;
	readonly transforms: {
		readonly panoramic?: ViewportTransform | undefined;
	};
	readonly panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly setActiveCrossSectionIdx: (idx: number) => void;
	readonly setCrosshairMm: (pt: Point3D) => void;
	readonly setIsDraggingPano: (isDragging: boolean) => void;
	readonly pendingPanoSyncRef: React.MutableRefObject<PendingPanoSync | null>;
	readonly rafPanoIdRef: React.MutableRefObject<number | null>;
}

/**
 * Handles mouse-down for 3D crosshair positioning and transverse slice synchronization.
 */
export function handlePanoramicCrosshairMouseDown(
	e: React.MouseEvent<HTMLCanvasElement>,
	props: PanoramicCrosshairSyncProps,
): void {
	const {
		crossSections,
		panoCanvasRef,
		archCurve,
		crosshairMm,
		transforms,
		setActiveCrossSectionIdx,
		setCrosshairMm,
		setIsDraggingPano,
	} = props;

	if (crossSections.length === 0 || !panoCanvasRef.current) return;

	setIsDraggingPano(true);
	const canvas = panoCanvasRef.current;
	const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

	const syncRes = mapPanoPointerToCrosshairAndSlice(
		pointerPx,
		{ width: canvas.width, height: canvas.height },
		archCurve,
		crossSections,
		crosshairMm,
		transforms.panoramic,
	);

	setActiveCrossSectionIdx(syncRes.crossSectionIdx);
	setCrosshairMm(syncRes.worldMm);
}

/**
 * Handles mouse-move for continuous 3D crosshair synchronization with requestAnimationFrame debouncing.
 */
export function handlePanoramicCrosshairMouseMove(
	e: React.MouseEvent<HTMLCanvasElement>,
	props: PanoramicCrosshairSyncProps,
): void {
	const {
		crossSections,
		panoCanvasRef,
		archCurve,
		crosshairMm,
		transforms,
		setActiveCrossSectionIdx,
		setCrosshairMm,
		pendingPanoSyncRef,
		rafPanoIdRef,
	} = props;

	if (crossSections.length === 0 || !panoCanvasRef.current) return;

	const canvas = panoCanvasRef.current;
	const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

	const syncRes = mapPanoPointerToCrosshairAndSlice(
		pointerPx,
		{ width: canvas.width, height: canvas.height },
		archCurve,
		crossSections,
		crosshairMm,
		transforms.panoramic,
	);

	pendingPanoSyncRef.current = syncRes;

	if (rafPanoIdRef.current === null) {
		rafPanoIdRef.current = requestAnimationFrame(() => {
			if (pendingPanoSyncRef.current) {
				setActiveCrossSectionIdx(pendingPanoSyncRef.current.crossSectionIdx);
				setCrosshairMm(pendingPanoSyncRef.current.worldMm);
			}
			rafPanoIdRef.current = null;
		});
	}
}

/**
 * Finalizes crosshair dragging and cancels pending animation frames.
 */
export function handlePanoramicCrosshairMouseUp(
	props: PanoramicCrosshairSyncProps,
): void {
	const {
		pendingPanoSyncRef,
		rafPanoIdRef,
		setActiveCrossSectionIdx,
		setCrosshairMm,
		setIsDraggingPano,
	} = props;

	if (rafPanoIdRef.current !== null) {
		cancelAnimationFrame(rafPanoIdRef.current);
		rafPanoIdRef.current = null;
	}

	if (pendingPanoSyncRef.current) {
		setActiveCrossSectionIdx(pendingPanoSyncRef.current.crossSectionIdx);
		setCrosshairMm(pendingPanoSyncRef.current.worldMm);
		pendingPanoSyncRef.current = null;
	}

	setIsDraggingPano(false);
}
