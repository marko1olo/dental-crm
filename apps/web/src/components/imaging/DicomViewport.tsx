/**
 * DENTE CRM — Interactive Dental DICOM / RVG Viewport Component
 * Features:
 * - Touch Gestures on Tablet: Pinch-to-zoom, 1-finger pan, 2-finger Window/Level
 * - Subpixel Calibrated Ruler & Measurement Overlays
 * - WebGL Shader / 2D Canvas Filtering (Inversion, Sharpen, Emboss)
 * - Safe WebGL resource disposal on component unmount
 */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	DEFAULT_DICOM_VIEWPORT_STATE,
	EMBOSS_SHADOW_KERNEL_3X3,
	SHARPEN_KERNEL_3X3,
	apply2DConvolutionFilter,
	buildDicomTonalLUT,
	calculate1FingerPan,
	calculate2FingerWindowLevel,
	calculatePinchDistance,
	calculatePinchZoom,
	disposeWebGlRenderingContext,
	measureDistanceMm,
	type CalibratedRulerMeasurement,
	type DicomViewportState,
	type Point2D,
} from "./rvgViewerEngine.js";

export interface DicomViewportProps {
	readonly imageSrc: string;
	readonly viewportState: DicomViewportState;
	readonly onViewportChange: (nextState: Partial<DicomViewportState>) => void;
	readonly measurements?: readonly CalibratedRulerMeasurement[] | undefined;
	readonly onAddMeasurement?: ((m: CalibratedRulerMeasurement) => void) | undefined;
}

export const DicomViewport: React.FC<DicomViewportProps> = ({
	imageSrc,
	viewportState,
	onViewportChange,
	measurements = [],
	onAddMeasurement,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const glRef = useRef<WebGLRenderingContext | null>(null);
	const rawImageRef = useRef<HTMLImageElement | null>(null);

	// Touch gesture tracking refs
	const touchStartDistanceRef = useRef<number>(0);
	const touchStartZoomRef = useRef<number>(1);
	const touchStartPosRef = useRef<Point2D>({ x: 0, y: 0 });
	const touchStartPanRef = useRef<Point2D>({ x: 0, y: 0 });
	const touchCountRef = useRef<number>(0);

	// In-progress ruler drafting
	const [draftRulerStart, setDraftRulerStart] = useState<Point2D | null>(null);
	const [draftRulerCurrent, setDraftRulerCurrent] = useState<Point2D | null>(null);

	// Load source image
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = imageSrc;
		img.onload = () => {
			rawImageRef.current = img;
			renderScene();
		};
	}, [imageSrc]);

	// Render canvas scene
	const renderScene = useCallback(() => {
		const canvas = canvasRef.current;
		const img = rawImageRef.current;
		if (!canvas || !img) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = canvas.parentElement?.clientWidth || 800;
		canvas.height = canvas.parentElement?.clientHeight || 600;

		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#0f172a";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Transform matrix
		ctx.translate(canvas.width / 2 + viewportState.panX, canvas.height / 2 + viewportState.panY);
		ctx.scale(viewportState.zoom, viewportState.zoom);
		ctx.translate(-img.width / 2, -img.height / 2);

		// Draw base image into offscreen buffer for filtering
		const offscreen = document.createElement("canvas");
		offscreen.width = img.width;
		offscreen.height = img.height;
		const offCtx = offscreen.getContext("2d");
		if (offCtx) {
			offCtx.drawImage(img, 0, 0);
			try {
				const imgData = offCtx.getImageData(0, 0, img.width, img.height);
				const lut = buildDicomTonalLUT({
					windowWidth: viewportState.windowWidth,
					windowCenter: viewportState.windowCenter,
					invert: viewportState.invert,
					gamma: viewportState.gamma,
				});

				// Apply LUT
				for (let i = 0; i < imgData.data.length; i += 4) {
					imgData.data[i] = lut[imgData.data[i]!]!;
					imgData.data[i + 1] = lut[imgData.data[i + 1]!]!;
					imgData.data[i + 2] = lut[imgData.data[i + 2]!]!;
				}

				// Apply Sharpen / Emboss filters if enabled
				if (viewportState.sharpen > 0 && img.width <= 1200) {
					const sharpened = apply2DConvolutionFilter(imgData.data, img.width, img.height, SHARPEN_KERNEL_3X3);
					imgData.data.set(sharpened);
				} else if (viewportState.emboss && img.width <= 1200) {
					const embossed = apply2DConvolutionFilter(imgData.data, img.width, img.height, EMBOSS_SHADOW_KERNEL_3X3, 128);
					imgData.data.set(embossed);
				}

				offCtx.putImageData(imgData, 0, 0);
				ctx.drawImage(offscreen, 0, 0);
			} catch {
				ctx.drawImage(img, 0, 0);
			}
		}

		// Draw calibrated rulers
		for (const r of measurements) {
			drawRulerOnContext(ctx, r.p1, r.p2, `${r.lengthMm.toFixed(1)} мм`);
		}

		// Draw draft ruler in progress
		if (draftRulerStart && draftRulerCurrent) {
			const m = measureDistanceMm(draftRulerStart, draftRulerCurrent, viewportState.calibrationMmPerPixel);
			drawRulerOnContext(ctx, draftRulerStart, draftRulerCurrent, `${m.distanceMm.toFixed(1)} мм (черновик)`, "#f59e0b");
		}

		ctx.restore();
	}, [viewportState, measurements, draftRulerStart, draftRulerCurrent]);

	useEffect(() => {
		renderScene();
	}, [renderScene]);

	// Responsive resize sync on window/container changes
	useEffect(() => {
		if (!containerRef.current) return;
		let rafId: number | null = null;
		const observer = new ResizeObserver(() => {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				renderScene();
			});
		});
		observer.observe(containerRef.current);
		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			observer.disconnect();
		};
	}, [renderScene]);

	// Cleanup WebGL on unmount to prevent GPU leaks
	useEffect(() => {
		return () => {
			if (glRef.current) {
				disposeWebGlRenderingContext(glRef.current);
				glRef.current = null;
			}
		};
	}, []);

	// Touch gesture listeners
	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		touchCountRef.current = e.touches.length;
		if (e.touches.length === 1 && e.touches[0]) {
			const t = e.touches[0];
			touchStartPosRef.current = { x: t.clientX, y: t.clientY };
			touchStartPanRef.current = { x: viewportState.panX, y: viewportState.panY };
		} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
			touchStartDistanceRef.current = calculatePinchDistance(e.touches[0], e.touches[1]);
			touchStartZoomRef.current = viewportState.zoom;
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1 && e.touches[0]) {
			// 1-Finger Pan
			const t = e.touches[0];
			const newPan = calculate1FingerPan(touchStartPosRef.current, { x: t.clientX, y: t.clientY }, touchStartPanRef.current);
			onViewportChange({ panX: newPan.x, panY: newPan.y });
		} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
			// Pinch-to-zoom
			const currentDist = calculatePinchDistance(e.touches[0], e.touches[1]);
			const newZoom = calculatePinchZoom(touchStartDistanceRef.current, currentDist, touchStartZoomRef.current);
			onViewportChange({ zoom: newZoom });
		}
	};

	// Mouse click handler for Ruler tool
	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (viewportState.activeTool !== "ruler") return;
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;

		// Convert screen coordinate to image coordinate
		const clickX = (e.clientX - rect.left - (rect.width / 2 + viewportState.panX)) / viewportState.zoom + (rawImageRef.current?.width || 0) / 2;
		const clickY = (e.clientY - rect.top - (rect.height / 2 + viewportState.panY)) / viewportState.zoom + (rawImageRef.current?.height || 0) / 2;

		if (!draftRulerStart) {
			setDraftRulerStart({ x: clickX, y: clickY });
			setDraftRulerCurrent({ x: clickX, y: clickY });
		} else {
			const p2 = { x: clickX, y: clickY };
			const dist = measureDistanceMm(draftRulerStart, p2, viewportState.calibrationMmPerPixel);
			if (onAddMeasurement) {
				onAddMeasurement({
					id: `ruler-${Date.now()}`,
					p1: draftRulerStart,
					p2,
					lengthPx: dist.distancePx,
					lengthMm: dist.distanceMm,
					calibrationMmPerPixel: viewportState.calibrationMmPerPixel,
					labelRu: `${dist.distanceMm.toFixed(1)} мм`,
				});
			}
			setDraftRulerStart(null);
			setDraftRulerCurrent(null);
		}
	};

	return (
		<div
			ref={containerRef}
			style={{
				width: "100%",
				height: "100%",
				position: "relative",
				overflow: "hidden",
				backgroundColor: "#020617",
				touchAction: "none",
				userSelect: "none",
			}}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
		>
			<canvas
				ref={canvasRef}
				style={{ width: "100%", height: "100%", display: "block", cursor: viewportState.activeTool === "ruler" ? "crosshair" : "grab" }}
				onClick={handleCanvasClick}
			/>
		</div>
	);
};

function drawRulerOnContext(
	ctx: CanvasRenderingContext2D,
	p1: Point2D,
	p2: Point2D,
	label: string,
	color = "#38bdf8",
) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();

	// Draw end tick marks
	const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	const perp = angle + Math.PI / 2;
	const tickLen = 6;

	ctx.beginPath();
	ctx.moveTo(p1.x - Math.cos(perp) * tickLen, p1.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p1.x + Math.cos(perp) * tickLen, p1.y + Math.sin(perp) * tickLen);
	ctx.moveTo(p2.x - Math.cos(perp) * tickLen, p2.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p2.x + Math.cos(perp) * tickLen, p2.y + Math.sin(perp) * tickLen);
	ctx.stroke();

	// Draw pill backdrop and text label
	const midX = (p1.x + p2.x) / 2;
	const midY = (p1.y + p2.y) / 2;
	ctx.font = "bold 12px monospace";
	const textWidth = ctx.measureText(label).width;
	const padX = 6;
	const padY = 3;

	ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
	ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(midX + 4, midY - 18, textWidth + padX * 2, 20, 4);
	} else {
		ctx.rect(midX + 4, midY - 18, textWidth + padX * 2, 20);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#38bdf8";
	ctx.textBaseline = "middle";
	ctx.fillText(label, midX + 4 + padX, midY - 8);
	ctx.restore();
}
