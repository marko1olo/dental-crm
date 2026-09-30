/**
 * DENTE CRM — CBCT Panoramic & Cross-Section Interactive Viewport Handlers
 * Decomposed from useCbctInteractionHandlers.ts per Mandate 8b & Mandate 8k.
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import React, { useCallback, useRef, useState } from "react";
import type { Point3D, ViewportTransform, CbctViewportType, CbctMeasurementRuler } from "../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM, getCanvasPointerPos } from "../cbctMprMath";
import type { DentalArchCurve, PanoramicReconstructionResult, CrossSectionSliceData } from "../dentalCurveEngine";
import { hitTestPanoramicToothMarker, mapPanoPointerToCrosshairAndSlice } from "../dentalCurveEngine";
import { type VirtualImplantSpec, pointToSegmentDistance2D } from "../implantSafetyEngine";
import { showToast } from "../../GlobalToast";
import type { CbctToolMode } from "../CbctLeftToolDock";
import type { StudioMode } from "./cbctStudioTypes";
import { getImplantCrossSectionGeometry } from "./cbctInteractionHelpers";

export interface UseCbctCurvedViewportHandlersParams {
	activeTool: CbctToolMode;
	studioMode: StudioMode;
	windowWidth: number;
	setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
	windowLevel: number;
	setWindowLevel: React.Dispatch<React.SetStateAction<number>>;
	transforms: Record<CbctViewportType, ViewportTransform>;
	setTransforms: React.Dispatch<React.SetStateAction<Record<CbctViewportType, ViewportTransform>>>;
	crosshairMm: Point3D;
	setCrosshairMm: React.Dispatch<React.SetStateAction<Point3D>>;
	archCurve: DentalArchCurve;
	panoramicData: PanoramicReconstructionResult | null;
	crossSections: CrossSectionSliceData[];
	activeCrossSection: CrossSectionSliceData | null;
	setActiveCrossSectionIdx: React.Dispatch<React.SetStateAction<number>>;
	currentImplantSpec: VirtualImplantSpec;
	implantEntryXOffsetMm: number;
	setImplantEntryXOffsetMm: React.Dispatch<React.SetStateAction<number>>;
	implantEntryDepthMm: number;
	setImplantEntryDepthMm: React.Dispatch<React.SetStateAction<number>>;
	implantAngulationDeg: number;
	setImplantAngulationDeg: React.Dispatch<React.SetStateAction<number>>;
	hoveredImplantPart: string | null;
	setHoveredImplantPart: React.Dispatch<React.SetStateAction<string | null>>;
	dragImplantPart: string | null;
	setDragImplantPart: React.Dispatch<React.SetStateAction<string | null>>;
	crossSectionDragStart: { clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null;
	setCrossSectionDragStart: React.Dispatch<React.SetStateAction<{ clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null>>;
	setSelectedMeasurement: React.Dispatch<React.SetStateAction<CbctMeasurementRuler | null>>;
	handleSelectTooth: (toothFdi: number | string) => void;
	panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	isDraggingWL: { startX: number; startY: number; startWW: number; startWL: number } | null;
	setIsDraggingWL: React.Dispatch<React.SetStateAction<{ startX: number; startY: number; startWW: number; startWL: number } | null>>;
	isPanning: { plane: CbctViewportType; startX: number; startY: number; startPanX: number; startPanY: number } | null;
	setIsPanning: React.Dispatch<React.SetStateAction<{ plane: CbctViewportType; startX: number; startY: number; startPanX: number; startPanY: number } | null>>;
	isDraggingZoom: { plane: CbctViewportType; startY: number; startZoom: number } | null;
	setIsDraggingZoom: React.Dispatch<React.SetStateAction<{ plane: CbctViewportType; startY: number; startZoom: number } | null>>;
	hasDraggedZoomRef: React.MutableRefObject<boolean>;
}

export function useCbctCurvedViewportHandlers(params: UseCbctCurvedViewportHandlersParams) {
	const {
		activeTool, studioMode, windowWidth, setWindowWidth, windowLevel, setWindowLevel,
		transforms, setTransforms, crosshairMm, setCrosshairMm, archCurve, panoramicData,
		crossSections, activeCrossSection, setActiveCrossSectionIdx, currentImplantSpec,
		implantEntryXOffsetMm, setImplantEntryXOffsetMm, implantEntryDepthMm, setImplantEntryDepthMm,
		implantAngulationDeg, setImplantAngulationDeg, hoveredImplantPart, setHoveredImplantPart,
		dragImplantPart, setDragImplantPart, crossSectionDragStart, setCrossSectionDragStart,
		setSelectedMeasurement, handleSelectTooth, panoCanvasRef, crossSectionCanvasRef,
		isDraggingWL, setIsDraggingWL, isPanning, setIsPanning, isDraggingZoom, setIsDraggingZoom,
		hasDraggedZoomRef,
	} = params;

	const [isDraggingPano, setIsDraggingPano] = useState<boolean>(false);
	const pendingPanoSyncRef = useRef<{ crossSectionIdx: number; worldMm: Point3D } | null>(null);
	const rafPanoIdRef = useRef<number | null>(null);

	const handlePanoMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (e.button === 2 || activeTool === "window_level") {
			e.preventDefault();
			setIsDraggingWL({ startX: e.clientX, startY: e.clientY, startWW: windowWidth, startWL: windowLevel });
			return;
		}
		if (activeTool === "pan" || e.button === 1) {
			e.preventDefault();
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			setIsPanning({ plane: "panoramic", startX: e.clientX, startY: e.clientY, startPanX: currentTransform.panX, startPanY: currentTransform.panY });
			return;
		}
		if (activeTool === "zoom") {
			e.preventDefault();
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			if (e.altKey) {
				const nextZoom = Math.max(0.5, Number((currentTransform.zoom * 0.8).toFixed(2)));
				setTransforms((prev) => ({ ...prev, panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
				return;
			}
			hasDraggedZoomRef.current = false;
			setIsDraggingZoom({ plane: "panoramic", startY: e.clientY, startZoom: currentTransform.zoom });
			return;
		}
		if (crossSections.length === 0 || !panoCanvasRef.current) return;
		setIsDraggingPano(true);
		const canvas = panoCanvasRef.current;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		if (panoramicData?.toothMarkersOnPano) {
			const hitMarker = hitTestPanoramicToothMarker({ x, y }, panoramicData.toothMarkersOnPano, transforms.panoramic);
			if (hitMarker) {
				handleSelectTooth(hitMarker.toothFdi);
				return;
			}
		}
		const syncRes = mapPanoPointerToCrosshairAndSlice({ x, y }, { width: canvas.width, height: canvas.height }, archCurve, crossSections, crosshairMm, transforms.panoramic);
		setActiveCrossSectionIdx(syncRes.crossSectionIdx);
		setCrosshairMm(syncRes.worldMm);
	}, [crossSections, archCurve, crosshairMm, transforms.panoramic, panoramicData?.toothMarkersOnPano, handleSelectTooth, activeTool, windowWidth, windowLevel, panoCanvasRef, setTransforms, setActiveCrossSectionIdx, setCrosshairMm, setIsDraggingWL, setIsPanning, setIsDraggingZoom, hasDraggedZoomRef]);

	const handlePanoMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (isDraggingWL) {
			const dx = e.clientX - isDraggingWL.startX;
			const dy = e.clientY - isDraggingWL.startY;
			setWindowWidth(Math.max(100, Math.min(10000, Math.round(isDraggingWL.startWW + dx * 8))));
			setWindowLevel(Math.max(-1000, Math.min(4000, Math.round(isDraggingWL.startWL - dy * 4))));
			return;
		}
		if (isPanning && isPanning.plane === "panoramic") {
			const dx = e.clientX - isPanning.startX;
			const dy = e.clientY - isPanning.startY;
			setTransforms((prev) => ({
				...prev,
				panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), panX: isPanning.startPanX + dx, panY: isPanning.startPanY + dy },
			}));
			return;
		}
		if (isDraggingZoom && isDraggingZoom.plane === "panoramic") {
			hasDraggedZoomRef.current = true;
			const dy = isDraggingZoom.startY - e.clientY;
			const zoomFactor = Math.exp(dy * 0.01);
			const nextZoom = Math.max(0.5, Math.min(5.0, Number((isDraggingZoom.startZoom * zoomFactor).toFixed(2))));
			setTransforms((prev) => ({
				...prev,
				panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom },
			}));
			return;
		}
		if (!isDraggingPano || crossSections.length === 0 || !panoCanvasRef.current) return;
		const canvas = panoCanvasRef.current;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const syncRes = mapPanoPointerToCrosshairAndSlice({ x, y }, { width: canvas.width, height: canvas.height }, archCurve, crossSections, crosshairMm, transforms.panoramic);
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
	}, [isDraggingWL, isPanning, isDraggingZoom, isDraggingPano, crossSections, archCurve, crosshairMm, transforms.panoramic, panoCanvasRef, setWindowWidth, setWindowLevel, setTransforms, setActiveCrossSectionIdx, setCrosshairMm, hasDraggedZoomRef]);

	const handlePanoMouseUp = useCallback(() => {
		if (rafPanoIdRef.current !== null) {
			cancelAnimationFrame(rafPanoIdRef.current);
			rafPanoIdRef.current = null;
		}
		if (pendingPanoSyncRef.current) {
			setActiveCrossSectionIdx(pendingPanoSyncRef.current.crossSectionIdx);
			setCrosshairMm(pendingPanoSyncRef.current.worldMm);
			pendingPanoSyncRef.current = null;
		}
		if (isDraggingZoom && !hasDraggedZoomRef.current && isDraggingZoom.plane === "panoramic") {
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			const nextZoom = Math.min(5.0, Number((currentTransform.zoom * 1.25).toFixed(2)));
			setTransforms((prev) => ({ ...prev, panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
		}
		setIsDraggingPano(false);
		setIsPanning(null);
		setIsDraggingZoom(null);
		setIsDraggingWL(null);
		hasDraggedZoomRef.current = false;
	}, [isDraggingZoom, transforms.panoramic, setActiveCrossSectionIdx, setCrosshairMm, setTransforms, setIsPanning, setIsDraggingZoom, setIsDraggingWL, hasDraggedZoomRef]);

	const handleCrossSectionMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (e.button === 2 || activeTool === "window_level") {
			e.preventDefault();
			setIsDraggingWL({ startX: e.clientX, startY: e.clientY, startWW: windowWidth, startWL: windowLevel });
			return;
		}
		if (activeTool === "pan" || e.button === 1) {
			e.preventDefault();
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			setIsPanning({ plane: "cross_section", startX: e.clientX, startY: e.clientY, startPanX: currentTransform.panX, startPanY: currentTransform.panY });
			return;
		}
		if (activeTool === "zoom") {
			e.preventDefault();
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			if (e.altKey) {
				const nextZoom = Math.max(0.5, Number((currentTransform.zoom * 0.8).toFixed(2)));
				setTransforms((prev) => ({ ...prev, cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
				return;
			}
			hasDraggedZoomRef.current = false;
			setIsDraggingZoom({ plane: "cross_section", startY: e.clientY, startZoom: currentTransform.zoom });
			return;
		}
		if (studioMode !== "implant" || !activeCrossSection || !crossSectionCanvasRef.current) return;
		const canvas = crossSectionCanvasRef.current;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);

		if (x >= canvas.width - 85 && x <= canvas.width - 10 && y >= 8 && y <= 30) {
			setImplantEntryXOffsetMm(0);
			setImplantEntryDepthMm(2);
			setImplantAngulationDeg(0);
			setSelectedMeasurement(null);
			showToast("Положение имплантата сброшено по умолчанию", "info");
			return;
		}

		const { entryPxX, entryPxY, apexPxX, apexPxY, radiusPx } = getImplantCrossSectionGeometry(
			canvas, activeCrossSection, currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg,
		);
		const distToEntry = Math.hypot(x - entryPxX, y - entryPxY);
		const distToApex = Math.hypot(x - apexPxX, y - apexPxY);
		const hitPart = distToEntry <= 12 ? "entry" : distToApex <= 12 ? "apex" : pointToSegmentDistance2D({ x, y }, { x: entryPxX, y: entryPxY }, { x: apexPxX, y: apexPxY }).distance <= radiusPx + 10 ? "body" : null;
		if (hitPart) {
			setDragImplantPart(hitPart);
			setSelectedMeasurement({ type: "implant" as unknown as "ruler", id: "active" } as unknown as CbctMeasurementRuler);
			setCrossSectionDragStart({ clientX: e.clientX, clientY: e.clientY, startX: implantEntryXOffsetMm, startY: implantEntryDepthMm, startAng: implantAngulationDeg });
		}
	}, [studioMode, activeCrossSection, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg, currentImplantSpec, activeTool, windowWidth, windowLevel, transforms.cross_section, crossSectionCanvasRef, setTransforms, setImplantEntryXOffsetMm, setImplantEntryDepthMm, setImplantAngulationDeg, setSelectedMeasurement, setDragImplantPart, setCrossSectionDragStart, setIsDraggingWL, setIsPanning, setIsDraggingZoom, hasDraggedZoomRef]);

	const handleCrossSectionMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (isDraggingWL) {
			const dx = e.clientX - isDraggingWL.startX;
			const dy = e.clientY - isDraggingWL.startY;
			setWindowWidth(Math.max(100, Math.min(10000, Math.round(isDraggingWL.startWW + dx * 8))));
			setWindowLevel(Math.max(-1000, Math.min(4000, Math.round(isDraggingWL.startWL - dy * 4))));
			return;
		}
		if (isPanning && isPanning.plane === "cross_section") {
			const dx = e.clientX - isPanning.startX;
			const dy = e.clientY - isPanning.startY;
			setTransforms((prev) => ({
				...prev,
				cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), panX: isPanning.startPanX + dx, panY: isPanning.startPanY + dy },
			}));
			return;
		}
		if (isDraggingZoom && isDraggingZoom.plane === "cross_section") {
			hasDraggedZoomRef.current = true;
			const dy = isDraggingZoom.startY - e.clientY;
			const zoomFactor = Math.exp(dy * 0.01);
			const nextZoom = Math.max(0.5, Math.min(5.0, Number((isDraggingZoom.startZoom * zoomFactor).toFixed(2))));
			setTransforms((prev) => ({
				...prev,
				cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom },
			}));
			return;
		}
		if (!activeCrossSection || !crossSectionCanvasRef.current) return;
		const canvas = crossSectionCanvasRef.current;
		const pxSpacing = activeCrossSection.pixelSpacingMm || 0.25;

		if (!dragImplantPart || !crossSectionDragStart) {
			if (studioMode === "implant") {
				const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const { entryPxX, entryPxY, apexPxX, apexPxY, radiusPx } = getImplantCrossSectionGeometry(
					canvas, activeCrossSection, currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg,
				);
				const distToEntry = Math.hypot(x - entryPxX, y - entryPxY);
				const distToApex = Math.hypot(x - apexPxX, y - apexPxY);
				const seg = pointToSegmentDistance2D({ x, y }, { x: entryPxX, y: entryPxY }, { x: apexPxX, y: apexPxY });
				const hoverPart = distToEntry <= 12 ? "entry" : distToApex <= 12 ? "apex" : seg.distance <= radiusPx + 10 ? "body" : null;
				if (hoveredImplantPart !== hoverPart) setHoveredImplantPart(hoverPart);
			}
			return;
		}

		const dxPx = e.clientX - crossSectionDragStart.clientX;
		const dyPx = e.clientY - crossSectionDragStart.clientY;

		if (dragImplantPart === "entry" || dragImplantPart === "body") {
			const newX = Math.max(-8.0, Math.min(8.0, crossSectionDragStart.startX + dxPx * pxSpacing));
			const newY = Math.max(0.0, Math.min(15.0, crossSectionDragStart.startY + dyPx * pxSpacing));
			setImplantEntryXOffsetMm(Number(newX.toFixed(1)));
			setImplantEntryDepthMm(Number(newY.toFixed(1)));
		} else if (dragImplantPart === "apex") {
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const { entryPxX, entryPxY } = getImplantCrossSectionGeometry(
				canvas, activeCrossSection, currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg,
			);
			const relX = x - entryPxX;
			const relY = y - entryPxY;
			if (Math.hypot(relX, relY) > 8) {
				const angleDeg = Math.round((Math.atan2(relX, relY) * 180) / Math.PI);
				setImplantAngulationDeg(Math.max(-30, Math.min(30, angleDeg)));
			}
		}
	}, [isDraggingWL, isPanning, isDraggingZoom, dragImplantPart, crossSectionDragStart, activeCrossSection, studioMode, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg, currentImplantSpec, hoveredImplantPart, crossSectionCanvasRef, setWindowWidth, setWindowLevel, setTransforms, setHoveredImplantPart, setImplantEntryXOffsetMm, setImplantEntryDepthMm, setImplantAngulationDeg, hasDraggedZoomRef]);

	const handleCrossSectionMouseUp = useCallback(() => {
		if (isDraggingZoom && !hasDraggedZoomRef.current && isDraggingZoom.plane === "cross_section") {
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			const nextZoom = Math.min(5.0, Number((currentTransform.zoom * 1.25).toFixed(2)));
			setTransforms((prev) => ({ ...prev, cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
		}
		setDragImplantPart(null);
		setCrossSectionDragStart(null);
		setIsPanning(null);
		setIsDraggingZoom(null);
		setIsDraggingWL(null);
		hasDraggedZoomRef.current = false;
	}, [isDraggingZoom, transforms.cross_section, setDragImplantPart, setCrossSectionDragStart, setTransforms, setIsPanning, setIsDraggingZoom, setIsDraggingWL, hasDraggedZoomRef]);

	return {
		isDraggingPano,
		handlePanoMouseDown,
		handlePanoMouseMove,
		handlePanoMouseUp,
		handleCrossSectionMouseDown,
		handleCrossSectionMouseMove,
		handleCrossSectionMouseUp,
	};
}
