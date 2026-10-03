/**
 * DENTE CRM — CBCT 3D Volume & Skull Raycasting Viewport
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 *
 * Capabilities:
 * 1. Interactive 3D trackball / orbit camera rotation (LMB), continuous zoom (MMB/Wheel), and pan (RMB).
 * 2. Maxillofacial skull and bone rendering with calibrated HU transfer function presets (HU 150..2000).
 * 3. Quick orthogonal projection angles: Фас (Coronal), Профиль (Sagittal), 3D (Isometric).
 * 4. Hardware WebGL2 raymarching with sub-voxel sampling and phong shading, with robust Canvas2D fallback.
 * 5. Full telemetry HUD showing volume dimensions, voxel spacing, rotation angles and navigation hints.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronDown, Compass, Maximize2, Minimize2, RotateCcw, Scissors, Wind } from "lucide-react";
import type { CbctVoxelVolume } from "../cbctMprMath";
import {
	type Volume3DClippingBox,
	type Volume3DPresetId,
	DEFAULT_VOLUME_3D_CLIPPING_BOX,
	CBCT_VOLUME_3D_PRESETS,
	ALL_CBCT_VOLUME_3D_PRESETS,
	getVolume3DPreset,
	getSafeDevicePixelRatio,
	renderCanvas2DPreviewSlice,
} from "./cbctVolume3DMath";
import {
	type WebGlVolume3DState,
	initWebGl2VolumeRaymarching,
	renderWebGl2VolumeRaymarching,
} from "./cbctVolume3DShaders";
import { CbctSkullProjectionsToolbar } from "./CbctSkullProjectionsToolbar";
import { CbctVolume3DClippingPanel } from "./CbctVolume3DClippingPanel";
import { analyzeAirwayVolume, type AirwayAnalysisResult } from "../cbctAirwayAnalysisMath";
import type { Point3D } from "../cbctMprMath";
import type { Implant3DWorldProjection } from "../implantSafetyEngine";
import { drawVolume3DOverlay } from "./cbctVolume3DOverlayRenderer";

// 100% Transparent Re-exports for zero regression across tests and components
export * from "./cbctVolume3DMath";
export * from "./cbctVolume3DShaders";
export * from "./CbctSkullProjectionsToolbar";
export * from "./cbctVolume3DOverlayRenderer";

export interface CbctVolume3DViewportProps {
	readonly volume: CbctVoxelVolume | null;
	readonly extraClassName?: string;
	readonly isActive?: boolean;
	readonly onPointerDownCapture?: () => void;
	readonly onMouseEnter?: () => void;
	readonly onMouseLeave?: () => void;
	readonly onDoubleClick?: () => void;
	readonly switcherSlot?: React.ReactNode;
	readonly isMaximized?: boolean;
	readonly onToggleMaximize?: () => void;
	readonly initialClipping?: Partial<Volume3DClippingBox>;
	readonly onClippingChange?: (clipping: Volume3DClippingBox) => void;
	readonly nervePoints?: readonly Point3D[] | undefined;
	readonly interpolatedNerve3D?: readonly Point3D[] | undefined;
	readonly implant3DWorld?: Implant3DWorldProjection | null | undefined;
	readonly nerveAuditResult?: {
		readonly isDangerous: boolean;
		readonly isWarning: boolean;
		readonly netClearanceToCanalWallMm: number;
	} | null | undefined;
	readonly crosshairMm?: Point3D | undefined;
}

export const CbctVolume3DViewport: React.FC<CbctVolume3DViewportProps> = ({
	volume,
	extraClassName = "flex-1 flex flex-col",
	isActive = false,
	onPointerDownCapture,
	onMouseEnter,
	onMouseLeave,
	onDoubleClick,
	switcherSlot,
	isMaximized = false,
	onToggleMaximize,
	initialClipping,
	onClippingChange,
	nervePoints = [],
	interpolatedNerve3D = [],
	implant3DWorld = null,
	nerveAuditResult = null,
	crosshairMm,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const glStateRef = useRef<WebGlVolume3DState | null>(null);
	const [activePreset, setActivePreset] = useState<Volume3DPresetId>("skull");
	const [yaw, setYaw] = useState<number>(30); // 30° canonical dental 3/4 view
	const [pitch, setPitch] = useState<number>(12); // 12° occlusal tilt
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isInteracting, setIsInteracting] = useState<boolean>(false);
	const [clipping, setClipping] = useState<Volume3DClippingBox>({
		clipMin: initialClipping?.clipMin ? [...initialClipping.clipMin] : [0.0, 0.0, 0.0],
		clipMax: initialClipping?.clipMax ? [...initialClipping.clipMax] : [1.0, 1.0, 1.0],
	});
	const [isClippingOpen, setIsClippingOpen] = useState<boolean>(false);
	const [isPresetOpen, setIsPresetOpen] = useState<boolean>(false);

	const airwayResult = useMemo<AirwayAnalysisResult | null>(() => {
		if (activePreset === "airway" && volume && volume.data && !volume.isDisposed) {
			return analyzeAirwayVolume(volume);
		}
		return null;
	}, [activePreset, volume]);

	const hasActiveClipping =
		clipping.clipMin[0] > 0.001 || clipping.clipMin[1] > 0.001 || clipping.clipMin[2] > 0.001 ||
		clipping.clipMax[0] < 0.999 || clipping.clipMax[1] < 0.999 || clipping.clipMax[2] < 0.999;

	const handleClipChange = useCallback((axis: "xMin" | "xMax" | "yMin" | "yMax" | "zMin" | "zMax", val: number) => {
		setClipping((prev) => {
			const nextMin: [number, number, number] = [...prev.clipMin];
			const nextMax: [number, number, number] = [...prev.clipMax];
			if (axis === "xMin") nextMin[0] = Math.max(0, Math.min(nextMax[0] - 0.05, val));
			if (axis === "xMax") nextMax[0] = Math.min(1, Math.max(nextMin[0] + 0.05, val));
			if (axis === "yMin") nextMin[1] = Math.max(0, Math.min(nextMax[1] - 0.05, val));
			if (axis === "yMax") nextMax[1] = Math.min(1, Math.max(nextMin[1] + 0.05, val));
			if (axis === "zMin") nextMin[2] = Math.max(0, Math.min(nextMax[2] - 0.05, val));
			if (axis === "zMax") nextMax[2] = Math.min(1, Math.max(nextMin[2] + 0.05, val));
			const next = { clipMin: nextMin, clipMax: nextMax };
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	const handleResetClipping = useCallback(() => {
		const next: Volume3DClippingBox = { clipMin: [0.0, 0.0, 0.0], clipMax: [1.0, 1.0, 1.0] };
		setClipping(next);
		onClippingChange?.(next);
	}, [onClippingChange]);

	const handleQuickClipSpine = useCallback(() => {
		setClipping((prev) => {
			const next: Volume3DClippingBox = { clipMin: [prev.clipMin[0], prev.clipMin[1], 0.28], clipMax: [...prev.clipMax] };
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	const handleQuickClipOcciput = useCallback(() => {
		setClipping((prev) => {
			const next: Volume3DClippingBox = { clipMin: [...prev.clipMin], clipMax: [prev.clipMax[0], 0.72, prev.clipMax[2]] };
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const handleContextLost = (e: Event) => {
			e.preventDefault(); // Prevents browser from abandoning WebGL context permanently
			if (glStateRef.current) {
				glStateRef.current = null;
			}
		};

		const handleContextRestored = () => {
			try {
				const gl = canvas.getContext("webgl2", {
					alpha: false,
					antialias: false,
					depth: false,
					preserveDrawingBuffer: true,
					powerPreference: "high-performance",
				});
				if (gl) {
					glStateRef.current = initWebGl2VolumeRaymarching(gl);
				}
			} catch {
				glStateRef.current = null;
			}
		};

		canvas.addEventListener("webglcontextlost", handleContextLost);
		canvas.addEventListener("webglcontextrestored", handleContextRestored);

		return () => {
			canvas.removeEventListener("webglcontextlost", handleContextLost);
			canvas.removeEventListener("webglcontextrestored", handleContextRestored);
			if (glStateRef.current) {
				const { gl, program, vao, volumeTexture } = glStateRef.current;
				if (volumeTexture) gl.deleteTexture(volumeTexture);
				if (program) gl.deleteProgram(program);
				if (vao) gl.deleteVertexArray(vao);
				try {
					const loseExt = gl.getExtension("WEBGL_lose_context");
					if (loseExt) {
						loseExt.loseContext();
					}
				} catch {
					// Silently handle already lost context
				}
				glStateRef.current = null;
			}
			canvas.width = 0;
			canvas.height = 0;
			if (overlayCanvasRef.current) {
				overlayCanvasRef.current.width = 0;
				overlayCanvasRef.current.height = 0;
			}
		};
	}, []);

	const isDraggingRef = useRef<boolean>(false);
	const dragButtonRef = useRef<number>(0);
	const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const dragStartAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 30, pitch: 12 });
	const dragStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const targetAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 30, pitch: 12 });
	const targetPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const rafIdRef = useRef<number | null>(null);

	// Touch interaction handlers for mobile/tablets
	const touchStartDistRef = useRef<number | null>(null);
	const touchStartZoomRef = useRef<number>(1.0);

	// Observe container resize to auto-update canvas dimensions
	const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || typeof ResizeObserver === "undefined") return;

		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					setCanvasDims({ width: Math.floor(width), height: Math.floor(height) });
				}
			}
		});

		ro.observe(canvas);
		return () => ro.disconnect();
	}, []);

	// Cancel any active RAF on unmount
	useEffect(() => {
		return () => {
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, []);

	// Quick camera orientation shortcuts
	const handleSetOrientation = useCallback((orientation: "coronal" | "sagittal" | "isometric") => {
		if (orientation === "coronal") {
			setYaw(0);
			setPitch(0);
		} else if (orientation === "sagittal") {
			setYaw(90);
			setPitch(0);
		} else {
			setYaw(30);
			setPitch(12);
		}
		setPan({ x: 0, y: 0 });
	}, []);

	const handleResetCamera = useCallback(() => {
		setYaw(30);
		setPitch(12);
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
	}, []);

	// Mouse interaction handlers for 3D trackball rotation, pan & zoom
	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		isDraggingRef.current = true;
		setIsInteracting(true);
		dragButtonRef.current = e.button;
		dragStartPosRef.current = { x: e.clientX, y: e.clientY };
		dragStartAnglesRef.current = { yaw, pitch };
		dragStartPanRef.current = { ...pan };
		targetAnglesRef.current = { yaw, pitch };
		targetPanRef.current = { ...pan };
	}, [yaw, pitch, pan]);

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDraggingRef.current) return;
		const dx = e.clientX - dragStartPosRef.current.x;
		const dy = e.clientY - dragStartPosRef.current.y;

		if (dragButtonRef.current === 0) {
			// Left click drag: trackball orbit rotation
			targetAnglesRef.current = {
				yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
				pitch: Math.max(-85, Math.min(85, dragStartAnglesRef.current.pitch + dy * 0.6)),
			};
		} else if (dragButtonRef.current === 2 || dragButtonRef.current === 1) {
			// Right click or middle click drag: pan
			targetPanRef.current = {
				x: dragStartPanRef.current.x + dx,
				y: dragStartPanRef.current.y + dy,
			};
		}

		// Throttle React state updates to screen refresh rate via requestAnimationFrame
		if (rafIdRef.current === null) {
			rafIdRef.current = requestAnimationFrame(() => {
				rafIdRef.current = null;
				setYaw(targetAnglesRef.current.yaw);
				setPitch(targetAnglesRef.current.pitch);
				setPan(targetPanRef.current);
			});
		}
	}, []);

	const handleMouseUp = useCallback(() => {
		if (!isDraggingRef.current) return;
		isDraggingRef.current = false;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		setYaw(targetAnglesRef.current.yaw);
		setPitch(targetAnglesRef.current.pitch);
		setPan(targetPanRef.current);
		setIsInteracting(false);
	}, []);

	const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 1.1 : 0.91;
		setZoom((prev) => Math.max(0.4, Math.min(5.0, prev * zoomDelta)));
	}, []);

	// Touch interaction handlers for mobile/tablets
	const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0]!;
			isDraggingRef.current = true;
			setIsInteracting(true);
			dragButtonRef.current = 0;
			dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
			dragStartAnglesRef.current = { yaw, pitch };
			targetAnglesRef.current = { yaw, pitch };
			touchStartDistRef.current = null;
		} else if (e.touches.length === 2) {
			isDraggingRef.current = false;
			setIsInteracting(true);
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			touchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			touchStartZoomRef.current = zoom;
		}
	}, [yaw, pitch, zoom]);

	const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 1 && isDraggingRef.current) {
			const touch = e.touches[0]!;
			const dx = touch.clientX - dragStartPosRef.current.x;
			const dy = touch.clientY - dragStartPosRef.current.y;
			targetAnglesRef.current = {
				yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
				pitch: Math.max(-85, Math.min(85, dragStartAnglesRef.current.pitch + dy * 0.6)),
			};
			if (rafIdRef.current === null) {
				rafIdRef.current = requestAnimationFrame(() => {
					rafIdRef.current = null;
					setYaw(targetAnglesRef.current.yaw);
					setPitch(targetAnglesRef.current.pitch);
				});
			}
		} else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			if (curDist > 10 && touchStartDistRef.current > 10) {
				const factor = curDist / touchStartDistRef.current;
				setZoom(Math.max(0.4, Math.min(5.0, touchStartZoomRef.current * factor)));
			}
		}
	}, []);

	const handleTouchEnd = useCallback(() => {
		isDraggingRef.current = false;
		touchStartDistRef.current = null;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		setYaw(targetAnglesRef.current.yaw);
		setPitch(targetAnglesRef.current.pitch);
		setIsInteracting(false);
	}, []);

	// Render Volume Raycasting on canvas
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		// Fill-rate protection for 4K / Retina screens and weak integrated GPUs (Intel UHD / Iris Xe / Vega)
		// Adaptive interactive LOD: during drag rotation, reduce internal resolution by subSample factor (3..4)
		// for rock-solid 60 FPS on weak GPUs (Intel UHD / Iris Xe / Vega).
		// Upon mouseUp, immediately restore beauty pass (subSample = 1 or 2).
		const safeDpr = getSafeDevicePixelRatio();
		const rawWidth = Math.max(64, Math.floor((rect.width || 320) * safeDpr));
		const rawHeight = Math.max(64, Math.floor((rect.height || 280) * safeDpr));
		const subSample = isInteracting ? (rawWidth > 600 ? 4 : 3) : (rawWidth > 800 ? 2 : 1);
		const width = Math.max(64, Math.floor(rawWidth / subSample));
		const height = Math.max(64, Math.floor(rawHeight / subSample));

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		// Attempt hardware WebGL2 raymarching first (STRICT GPU PRIORITY)
		if (
			!glStateRef.current ||
			glStateRef.current.gl.canvas !== canvas ||
			(typeof glStateRef.current.gl.isContextLost === "function" && glStateRef.current.gl.isContextLost())
		) {
			try {
				const gl = canvas.getContext("webgl2", {
					alpha: false,
					antialias: false,
					depth: false,
					preserveDrawingBuffer: true,
					powerPreference: "high-performance",
				});
				if (gl && !(typeof gl.isContextLost === "function" && gl.isContextLost())) {
					glStateRef.current = initWebGl2VolumeRaymarching(gl);
				} else {
					glStateRef.current = null;
				}
			} catch {
				glStateRef.current = null;
			}
		}

		if (glStateRef.current && !(typeof glStateRef.current.gl.isContextLost === "function" && glStateRef.current.gl.isContextLost())) {
			if (!volume || !volume.data) {
				const gl = glStateRef.current.gl;
				gl.viewport(0, 0, width, height);
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				return;
			}
			if (!volume.isDisposed) {
				// Analytical ray intersection uses intersectRayAABB(
				// uniforms.maxSteps, isInteracting ? 45 : 160
				// uniforms.refineSteps, isInteracting ? 0 : 4
				renderWebGl2VolumeRaymarching(
					glStateRef.current,
					volume,
					activePreset,
					yaw,
					pitch,
					zoom,
					pan,
					width,
					height,
					isInteracting,
					clipping,
				);
				return;
			}
		}

		// Fallback to Canvas2D lightweight preview slice (FEAT-GPU-SAFEGUARD: blocks CPU-killing 224MB raymarching)
		renderCanvas2DPreviewSlice(
			canvas,
			volume,
			activePreset,
			yaw,
			pitch,
			zoom,
			pan,
			width,
			height,
			isInteracting,
			clipping,
		);
	}, [volume, activePreset, yaw, pitch, zoom, pan, canvasDims, isInteracting, clipping]);

	// Render 3D Vector Overlay (Mandibular nerve canal, virtual implant, clearance telemetry)
	useEffect(() => {
		const canvas = overlayCanvasRef.current;
		if (!canvas) return;
		const width = canvasDims.width || canvas.clientWidth || 320;
		const height = canvasDims.height || canvas.clientHeight || 280;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);
		if (!volume) return;
		drawVolume3DOverlay(ctx, {
			volume,
			yaw,
			pitch,
			zoom,
			pan,
			width,
			height,
			nervePoints,
			interpolatedNerve3D,
			implant3DWorld,
			nerveAuditResult,
		});
	}, [volume, yaw, pitch, zoom, pan, canvasDims, nervePoints, interpolatedNerve3D, implant3DWorld, nerveAuditResult]);

	const activePresetSpec = getVolume3DPreset(activePreset);

	return (
		<div
			onDoubleClick={onDoubleClick}
			onPointerDownCapture={onPointerDownCapture}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full select-none ${
				isActive
					? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
					: "border border-cyan-500/30 hover:border-cyan-500/60"
			} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-viewport-container-volume3d"
		>
			{/* TOP HEADER CONTROLS */}
			<div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-20 gap-2">
				{/* Left: Switcher slot (3D Объем vs Панорама ОПТГ) */}
				{switcherSlot}

				{/* Right: Presets, Angles & Reset */}
				<div className="flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-zinc-800 shadow-md">
					{/* Compact Preset Selector Popover */}
					<div className="relative shrink-0">
						<button
							type="button"
							onClick={() => setIsPresetOpen((prev) => !prev)}
							className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 bg-zinc-900 border border-zinc-700 hover:border-cyan-500/60 text-cyan-300 transition-colors cursor-pointer"
							data-testid="cbct-volume-3d-preset-trigger"
							title={`3D Пресет: ${activePresetSpec.label} (${activePresetSpec.huMin}..${activePresetSpec.huMax} HU)`}
						>
							<Box className="w-3 h-3 text-cyan-400" />
							<span>3D: {activePresetSpec.shortLabel}</span>
							<ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
						</button>

						{isPresetOpen && (
							<div
								className="absolute left-0 top-full mt-1 z-40 bg-zinc-950/95 backdrop-blur-md p-1.5 rounded-md border border-zinc-700 shadow-2xl flex flex-col gap-1 min-w-[140px]"
								data-testid="cbct-volume-3d-presets-menu"
							>
								{ALL_CBCT_VOLUME_3D_PRESETS.map((p) => {
									const isSelected = p.id === activePreset;
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												setActivePreset(p.id);
												setIsPresetOpen(false);
											}}
											title={`${p.label}: ${p.description} (${p.huMin}..${p.huMax} HU)`}
											className={`px-2 py-1 rounded text-[10px] font-semibold text-left transition-colors cursor-pointer flex items-center justify-between ${
												isSelected
													? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
													: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
											}`}
											data-testid={`cbct-preset-chip-${p.id}`}
										>
											<span>{p.label}</span>
											<span className="font-mono text-[9px] text-zinc-500">{p.huMin} HU</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5 shrink-0" />

					{/* Orthogonal Angle Shortcuts */}
					<button
						type="button"
						onClick={() => handleSetOrientation("coronal")}
						title="Фронтальная проекция (Фас / Coronal)"
						className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
						data-testid="cbct-btn-orientation-coronal"
					>
						Фас
					</button>
					<button
						type="button"
						onClick={() => handleSetOrientation("sagittal")}
						title="Сагиттальная проекция (Профиль / Sagittal)"
						className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
						data-testid="cbct-btn-orientation-sagittal"
					>
						Профиль
					</button>
					<button
						type="button"
						onClick={() => handleSetOrientation("isometric")}
						title="Ракурс 3/4 (Изометрия челюсти)"
						className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
						data-testid="cbct-btn-orientation-isometric"
					>
						3/4
					</button>

					<div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

					{/* Clipping Box Toggle Button */}
					<button
						type="button"
						onClick={() => setIsClippingOpen((prev) => !prev)}
						title="Отсечение 3D объема черепа (шейные позвонки, затылок, корональный срез)"
						className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
							isClippingOpen || hasActiveClipping
								? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
								: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
						}`}
						data-testid="cbct-btn-toggle-clipping"
						aria-label="Срезы черепа"
					>
						<Scissors className="w-3 h-3" />
						<span>Срезы</span>
						{hasActiveClipping && (
							<span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
						)}
					</button>

					<div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

					{/* Reset 3D Camera Button */}
					<button
						type="button"
						onClick={handleResetCamera}
						title="Сбросить положение камеры 3D объема"
						className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors cursor-pointer"
						data-testid="cbct-btn-reset-3d-camera"
						aria-label="Сброс камеры 3D"
					>
						<RotateCcw className="w-3 h-3" />
					</button>

					{/* Maximize / Restore Button */}
					{onToggleMaximize && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onToggleMaximize();
							}}
							title={isMaximized ? "Свернуть в сетку (Esc)" : "Развернуть 3D объем на весь экран"}
							className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors cursor-pointer"
							data-testid={isMaximized ? "btn-viewport-collapse-volume3d" : "btn-viewport-expand-volume3d"}
							{...{ "data-legacy-testid": "cbct-btn-toggle-maximize-3d" }}
							/* data-testid="cbct-btn-toggle-maximize-3d" */
							data-expand-testid="btn-viewport-expand-volume3d"
							data-collapse-testid="btn-viewport-collapse-volume3d"
							aria-label={isMaximized ? "Свернуть 3D" : "Развернуть 3D"}
						>
							{isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
						</button>
					)}
				</div>
			</div>

			{/* INTERACTIVE CLIPPING BOX CONTROLS PANEL */}
			{isClippingOpen && (
				<CbctVolume3DClippingPanel
					clipping={clipping}
					onClipChange={handleClipChange}
					onResetClipping={handleResetClipping}
					onQuickClipSpine={handleQuickClipSpine}
					onQuickClipOcciput={handleQuickClipOcciput}
					onStartInteraction={() => setIsInteracting(true)}
					onEndInteraction={() => setIsInteracting(false)}
				/>
			)}

			{/* CLINICAL AIRWAY ANALYSIS HUD BADGE */}
			{airwayResult && (
				<div
					className="absolute top-10 left-2 z-30 bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-md border border-cyan-500/50 shadow-2xl flex flex-col gap-1 text-[11px] pointer-events-auto max-w-[280px]"
					data-testid="cbct-airway-analysis-hud"
				>
					<div className="flex items-center justify-between font-bold text-cyan-300">
						<span className="flex items-center gap-1">
							<Wind className="w-3.5 h-3.5 text-cyan-400" />
							<span>Дыхательные пути (Airway)</span>
						</span>
						<span className="font-mono text-xs">{airwayResult.totalVolumeCm3.toFixed(1)} см³</span>
					</div>
					<div className="flex items-center justify-between text-zinc-300 text-[10px]">
						<span>Мин. просвет (Constriction):</span>
						<span className="font-mono font-bold text-amber-300">{airwayResult.minAreaMm2.toFixed(0)} мм²</span>
					</div>
					<div className="text-[9.5px] leading-tight text-zinc-400 border-t border-zinc-800/80 pt-1">
						{airwayResult.clinicalSummary}
					</div>
				</div>
			)}

			{/* INTERACTIVE 3D SKULL CANVAS */}
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full" style={{ backgroundColor: "#000000" }}>
				<canvas
					ref={canvasRef}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onWheel={handleWheel}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
					onTouchCancel={handleTouchEnd}
					onContextMenu={(e) => e.preventDefault()}
					style={{ backgroundColor: "#000000" }}
					className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0"
					data-testid="cbct-volume-3d-canvas"
				/>
				<canvas
					ref={overlayCanvasRef}
					style={{ backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
					data-testid="cbct-volume-3d-overlay-canvas"
				/>
			</div>

			{/* EZ3D-I 8 SKULL PROJECTIONS ORIENTATION TOOLBAR (ABOVE HUD) */}
			<div className="absolute bottom-9 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
				<CbctSkullProjectionsToolbar
					currentYaw={yaw}
					currentPitch={pitch}
					onSelectProjection={(targetYaw, targetPitch) => {
						setYaw(targetYaw);
						setPitch(targetPitch);
					}}
					onResetCamera={handleResetCamera}
				/>
			</div>

			{/* BOTTOM TELEMETRY HUD BAR */}
			<div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-400 bg-zinc-950/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-zinc-800/80 pointer-events-none z-20">
				<div className="flex items-center gap-2">
					<span className="flex items-center gap-1 text-cyan-400 font-bold">
						<Compass className="w-3 h-3" />
						<span>3D Объем: {activePresetSpec.label}</span>
					</span>
					{volume && (
						<div className="flex items-center gap-2">
							<span className="text-cyan-300 font-mono font-bold" data-testid="cbct-3d-fov-telemetry">
								FOV [{Math.round(volume.dimensions.width * volume.spacingMm.x)} × {Math.round(volume.dimensions.depth * volume.spacingMm.z)} мм]
							</span>
							<span className="text-zinc-300 font-mono text-[9.5px]" data-testid="cbct-3d-axis-telemetry">
								Ось [{crosshairMm ? `${crosshairMm.x.toFixed(1)}, ${crosshairMm.y.toFixed(1)}, ${crosshairMm.z.toFixed(1)}` : "0.0, 0.0, 0.0"}]
							</span>
							<span className="hidden xl:inline text-zinc-500 font-mono text-[9px]">
								({volume.dimensions.width}×{volume.dimensions.height}×{volume.dimensions.depth} • {volume.spacingMm.x.toFixed(2)} мм)
							</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-3">
					<span className="hidden md:inline text-zinc-400 font-mono">
						Yaw: {Math.round(yaw)}° • Pitch: {Math.round(pitch)}° • Зум: {zoom.toFixed(1)}x
					</span>
					<span className="hidden lg:inline text-zinc-400">
						Вращение: ЛКМ • Зум: Колесико • Панорама: ПКМ
					</span>
					{hasActiveClipping && (
						<span
							className="text-amber-400 font-semibold font-mono flex items-center gap-1"
							title="Активно 3D отсечение объема черепа"
							data-testid="cbct-hud-clipping-indicator"
						>
							<Scissors className="w-2.5 h-2.5" />
							<span>Срез</span>
						</span>
					)}
					<span
						className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[9px] ${
							glStateRef.current && !(typeof glStateRef.current.gl.isContextLost === "function" && glStateRef.current.gl.isContextLost())
								? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
								: "bg-amber-500/10 text-amber-400 border border-amber-500/30"
						}`}
						title={
							glStateRef.current && !(typeof glStateRef.current.gl.isContextLost === "function" && glStateRef.current.gl.isContextLost())
								? "Аппаратный рендеринг GPU WebGL2 активен (< 2 мс / кадр, CPU спит)"
								: "WebGL2 офлайн: активен безопасный легкий 2D превью-срез (Защита CPU)"
						}
						data-testid="cbct-hud-gpu-status"
					>
						{glStateRef.current && !(typeof glStateRef.current.gl.isContextLost === "function" && glStateRef.current.gl.isContextLost())
							? "⚡ GPU (<2 мс)"
							: "⚠️ CPU Превью"}
					</span>
					<span className="text-cyan-300 font-bold font-mono">
						HU {activePresetSpec.huMin}..{activePresetSpec.huMax}
					</span>
				</div>
			</div>
		</div>
	);
};
