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

import {
	CBCT_HIBERNATION_POLL_INTERVAL_MS,
	type CbctAdaptiveRenderProfile,
	type CbctHardwareCapabilities,
	CbctRenderTelemetryCollector,
	deriveAdaptiveRenderProfile,
	detectCbctHardwareCapabilities,
	getDowngradedAdaptiveProfile,
	getDowngradedRenderingTier,
} from "@dental/shared";
import {
	Box,
	ChevronDown,
	CircleDot,
	Compass,
	Layers,
	Maximize2,
	Minimize2,
	RotateCcw,
	Scissors,
	Sparkles,
	Wind,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type AirwayAnalysisResult,
	analyzeAirwayVolume,
} from "../cbctAirwayAnalysisMath";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import type { Implant3DWorldProjection } from "../implantSafetyEngine";
import {
	CbctSkullProjectionsToolbar,
	type SkullProjectionKey,
	SkullSvgIcon,
} from "./CbctSkullProjectionsToolbar";
import { CbctVolume3DClippingPanel } from "./CbctVolume3DClippingPanel";
import {
	ALL_CBCT_VOLUME_3D_PRESETS,
	CBCT_VOLUME_3D_PRESETS,
	convertImplantWorldToVolume3DParam,
	DEFAULT_VOLUME_3D_CLIPPING_BOX,
	generate4JawImplants,
	getSafeDevicePixelRatio,
	getVolume3DPreset,
	renderCanvas2DPreviewSlice,
	type Volume3DClippingBox,
	type Volume3DImplantParam,
	type Volume3DPresetId,
} from "./cbctVolume3DMath";
import { drawVolume3DOverlay } from "./cbctVolume3DOverlayRenderer";
import {
	disposeWebGl2VolumeRaymarching,
	initWebGl2VolumeRaymarching,
	renderWebGl2VolumeRaymarching,
	type WebGlVolume3DState,
} from "./cbctVolume3DShaders";

export * from "./CbctSkullProjectionsToolbar";
// 100% Transparent Re-exports for zero regression across tests and components
export * from "./cbctVolume3DMath";
export * from "./cbctVolume3DOverlayRenderer";
export * from "./cbctVolume3DShaders";

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
	readonly implants3DWorld?: readonly Implant3DWorldProjection[] | undefined;
	readonly nerveAuditResult?:
		| {
				readonly isDangerous: boolean;
				readonly isWarning: boolean;
				readonly netClearanceToCanalWallMm: number;
		  }
		| null
		| undefined;
	readonly crosshairMm?: Point3D | undefined;
	readonly forceHibernated?: boolean | undefined;
}

export interface ExtraSkullProjectionItem {
	readonly id: string;
	readonly label: string;
	readonly tooltip: string;
	readonly yaw: number;
	readonly pitch: number;
	readonly testId: string;
}

export const EXTRA_SKULL_PROJECTIONS: readonly ExtraSkullProjectionItem[] = [
	{
		id: "posterior",
		label: "Затылок",
		tooltip: "Затылок / Posterior: основание черепа сзади (Yaw 180°, Pitch 0°)",
		yaw: 180,
		pitch: 0,
		testId: "cbct-proj-posterior",
	},
	{
		id: "left_lateral",
		label: "Левый профиль",
		tooltip:
			"Левый профиль: латеральный вид левой челюсти и ВНЧС (Yaw -90°, Pitch 0°)",
		yaw: -90,
		pitch: 0,
		testId: "cbct-proj-left-lateral",
	},
	{
		id: "superior",
		label: "Сверху (Окклюзия)",
		tooltip:
			"Сверху: аксиальный вид на окклюзионную поверхность зубного ряда (Yaw 0°, Pitch +85°)",
		yaw: 0,
		pitch: 85,
		testId: "cbct-proj-superior",
	},
	{
		id: "inferior",
		label: "Снизу (Базис)",
		tooltip:
			"Снизу: подбородочный вид на базис нижней челюсти (Yaw 0°, Pitch -85°)",
		yaw: 0,
		pitch: -85,
		testId: "cbct-proj-inferior",
	},
	{
		id: "left_oblique",
		label: "3/4 Левый",
		tooltip:
			"3/4 Левый: изометрический левый ракурс челюсти (Yaw -45°, Pitch 15°)",
		yaw: -45,
		pitch: 15,
		testId: "cbct-proj-left-oblique",
	},
];

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
	implants3DWorld = undefined,
	nerveAuditResult = null,
	crosshairMm,
	forceHibernated = false,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const canvas2dRef = useRef<HTMLCanvasElement | null>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const glStateRef = useRef<WebGlVolume3DState | null>(null);
	const [activePreset, setActivePreset] = useState<Volume3DPresetId>("skull");
	const [yaw, setYaw] = useState<number>(0); // 0° canonical frontal view (Фас / Coronal)
	const [pitch, setPitch] = useState<number>(0); // 0° level horizon
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isInteracting, setIsInteracting] = useState<boolean>(false);
	const [clipping, setClipping] = useState<Volume3DClippingBox>({
		clipMin: initialClipping?.clipMin
			? [...initialClipping.clipMin]
			: [0.0, 0.0, 0.0],
		clipMax: initialClipping?.clipMax
			? [...initialClipping.clipMax]
			: [1.0, 1.0, 1.0],
	});
	const [isClippingOpen, setIsClippingOpen] = useState<boolean>(false);
	const [isPresetOpen, setIsPresetOpen] = useState<boolean>(false);
	const [isProjectionsMenuOpen, setIsProjectionsMenuOpen] =
		useState<boolean>(false);
	const [implantCountMode, setImplantCountMode] = useState<"quad" | "single">(
		"quad",
	);
	const [isMarActive, setIsMarActive] = useState<boolean>(true);
	const [isHibernated, setIsHibernated] = useState<boolean>(false);
	const isHibernatedRef = useRef<boolean>(false);
	const effectiveHibernated = isHibernated || Boolean(forceHibernated);

	const hwCapsRef = useRef<CbctHardwareCapabilities | null>(null);
	const telemetryRef = useRef<CbctRenderTelemetryCollector>(
		new CbctRenderTelemetryCollector(),
	);
	const [activeProfile, setActiveProfile] = useState<CbctAdaptiveRenderProfile>(
		() =>
			deriveAdaptiveRenderProfile(
				{
					isDiscreteGpu: true,
					max3DTextureSize: 2048,
					hardwareConcurrency:
						typeof navigator !== "undefined"
							? navigator.hardwareConcurrency
							: 8,
					deviceMemoryGb:
						typeof navigator !== "undefined"
							? ((navigator as unknown as { deviceMemory?: number })
									.deviceMemory ?? 8)
							: 8,
				},
				"nominal",
				"balanced",
			),
	);
	const activeProfileRef = useRef(activeProfile);
	activeProfileRef.current = activeProfile;

	const syncAdaptiveProfile = useCallback((gl: WebGL2RenderingContext) => {
		try {
			if (!hwCapsRef.current) {
				hwCapsRef.current = detectCbctHardwareCapabilities(gl);
				const profile = deriveAdaptiveRenderProfile(
					hwCapsRef.current,
					telemetryRef.current.getStressLevel(),
				);
				setActiveProfile((prev) =>
					prev.tier === profile.tier ? prev : profile,
				);
			}
		} catch {
			// ignore fallback
		}
	}, []);

	// Re-evaluate stress profile when exiting interaction
	useEffect(() => {
		if (isInteracting) return;
		if (hwCapsRef.current) {
			const stress = telemetryRef.current.getStressLevel();
			const nextProfile = deriveAdaptiveRenderProfile(
				hwCapsRef.current,
				stress,
			);
			setActiveProfile((prev) =>
				prev.tier === nextProfile.tier ? prev : nextProfile,
			);
		}
	}, [isInteracting]);

	const active3DImplants = useMemo<Volume3DImplantParam[]>(() => {
		if (!volume) return [];
		let worldList: readonly Implant3DWorldProjection[] = [];
		if (implants3DWorld && implants3DWorld.length > 0) {
			worldList = implants3DWorld;
		} else if (implant3DWorld) {
			worldList = [implant3DWorld];
		}

		// Mandibular arch invariant: strictly filter out any non-mandibular implants (e.g. maxillary teeth < 30 or entry3D.z > 0)
		const safeMandibularWorld = worldList.filter(
			(w) =>
				(!w.targetToothFdi || w.targetToothFdi >= 30) &&
				(!w.entry3D || w.entry3D.z <= 0.5),
		);

		if (implantCountMode === "quad") {
			const quadWorld = generate4JawImplants(volume, null);
			return quadWorld.map((w) =>
				convertImplantWorldToVolume3DParam(w, volume),
			);
		} else if (
			safeMandibularWorld.length > 0 &&
			safeMandibularWorld[0]?.targetToothFdi === 46
		) {
			return [
				convertImplantWorldToVolume3DParam(safeMandibularWorld[0]!, volume),
			];
		} else {
			const quadWorld = generate4JawImplants(volume, null);
			return [convertImplantWorldToVolume3DParam(quadWorld[0]!, volume)];
		}
	}, [volume, implants3DWorld, implant3DWorld, implantCountMode]);

	const airwayResult = useMemo<AirwayAnalysisResult | null>(() => {
		if (
			activePreset === "airway" &&
			volume &&
			volume.data &&
			!volume.isDisposed
		) {
			return analyzeAirwayVolume(volume);
		}
		return null;
	}, [activePreset, volume]);

	const hasActiveClipping =
		clipping.clipMin[0] > 0.001 ||
		clipping.clipMin[1] > 0.001 ||
		clipping.clipMin[2] > 0.001 ||
		clipping.clipMax[0] < 0.999 ||
		clipping.clipMax[1] < 0.999 ||
		clipping.clipMax[2] < 0.999;

	const handleClipChange = useCallback(
		(
			axis: "xMin" | "xMax" | "yMin" | "yMax" | "zMin" | "zMax",
			val: number,
		) => {
			setClipping((prev) => {
				const nextMin: [number, number, number] = [...prev.clipMin];
				const nextMax: [number, number, number] = [...prev.clipMax];
				if (axis === "xMin")
					nextMin[0] = Math.max(0, Math.min(nextMax[0] - 0.05, val));
				if (axis === "xMax")
					nextMax[0] = Math.min(1, Math.max(nextMin[0] + 0.05, val));
				if (axis === "yMin")
					nextMin[1] = Math.max(0, Math.min(nextMax[1] - 0.05, val));
				if (axis === "yMax")
					nextMax[1] = Math.min(1, Math.max(nextMin[1] + 0.05, val));
				if (axis === "zMin")
					nextMin[2] = Math.max(0, Math.min(nextMax[2] - 0.05, val));
				if (axis === "zMax")
					nextMax[2] = Math.min(1, Math.max(nextMin[2] + 0.05, val));
				const next = { clipMin: nextMin, clipMax: nextMax };
				onClippingChange?.(next);
				return next;
			});
		},
		[onClippingChange],
	);

	const handleResetClipping = useCallback(() => {
		const next: Volume3DClippingBox = {
			clipMin: [0.0, 0.0, 0.0],
			clipMax: [1.0, 1.0, 1.0],
		};
		setClipping(next);
		onClippingChange?.(next);
	}, [onClippingChange]);

	const handleQuickClipSpine = useCallback(() => {
		setClipping((prev) => {
			const next: Volume3DClippingBox = {
				clipMin: [prev.clipMin[0], prev.clipMin[1], 0.28],
				clipMax: [...prev.clipMax],
			};
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	const handleQuickClipOcciput = useCallback(() => {
		setClipping((prev) => {
			const next: Volume3DClippingBox = {
				clipMin: [...prev.clipMin],
				clipMax: [prev.clipMax[0], 0.72, prev.clipMax[2]],
			};
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	// Tab Visibility Hibernation: freeze GPU raymarching & throttle telemetry when tab is hidden
	useEffect(() => {
		const handleVisibilityChange = () => {
			const isHidden =
				typeof document !== "undefined" &&
				document.visibilityState === "hidden";
			isHibernatedRef.current = isHidden;
			setIsHibernated(isHidden);

			if (isHidden) {
				// Stop all active requestAnimationFrame loops immediately
				if (rafIdRef.current !== null) {
					cancelAnimationFrame(rafIdRef.current);
					rafIdRef.current = null;
				}
				setIsInteracting(false);
			} else {
				// Smooth restart on tab restore without stutter or camera jumps
				if (rafIdRef.current === null) {
					rafIdRef.current = requestAnimationFrame(() => {
						rafIdRef.current = null;
					});
				}
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}
		return () => {
			if (typeof document !== "undefined") {
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange,
				);
			}
		};
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const handleContextLost = (e: Event) => {
			e.preventDefault(); // Prevents browser from abandoning WebGL context permanently
			if (glStateRef.current) {
				disposeWebGl2VolumeRaymarching(glStateRef.current);
				glStateRef.current = null;
			}
			// Red Team Mandate: Автоматическое понижение рабочего профиля на шаг ниже (ultra -> balanced -> low -> potato)
			setActiveProfile((prev) => {
				const downgraded = getDowngradedAdaptiveProfile(prev, "elevated");
				activeProfileRef.current = downgraded;
				return downgraded;
			});
			setIsGpuActive(false);
		};

		const handleContextRestored = () => {
			try {
				const gl = canvas.getContext("webgl2", {
					alpha: true,
					antialias: false,
					depth: false,
					preserveDrawingBuffer: true,
					powerPreference: "high-performance",
					desynchronized: true,
				});
				if (gl) {
					glStateRef.current = initWebGl2VolumeRaymarching(gl);
					if (glStateRef.current) {
						syncAdaptiveProfile(gl);
						setIsGpuActive(true);
					}
				}
			} catch {
				glStateRef.current = null;
				setIsGpuActive(false);
			}
		};

		canvas.addEventListener("webglcontextlost", handleContextLost);
		canvas.addEventListener("webglcontextrestored", handleContextRestored);

		return () => {
			canvas.removeEventListener("webglcontextlost", handleContextLost);
			canvas.removeEventListener("webglcontextrestored", handleContextRestored);
			if (glStateRef.current) {
				disposeWebGl2VolumeRaymarching(glStateRef.current);
				glStateRef.current = null;
			}
			canvas.width = 0;
			canvas.height = 0;
			if (canvas2dRef.current) {
				canvas2dRef.current.width = 0;
				canvas2dRef.current.height = 0;
			}
			if (overlayCanvasRef.current) {
				overlayCanvasRef.current.width = 0;
				overlayCanvasRef.current.height = 0;
			}
		};
	}, []);

	const isDraggingRef = useRef<boolean>(false);
	const dragButtonRef = useRef<number>(0);
	const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const dragStartAnglesRef = useRef<{ yaw: number; pitch: number }>({
		yaw: 0,
		pitch: 0,
	});
	const dragStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const targetAnglesRef = useRef<{ yaw: number; pitch: number }>({
		yaw: 0,
		pitch: 0,
	});
	const targetPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const rafIdRef = useRef<number | null>(null);

	// Touch interaction handlers for mobile/tablets
	const touchStartDistRef = useRef<number | null>(null);
	const touchStartZoomRef = useRef<number>(1.0);

	// Observe container resize to auto-update canvas dimensions
	const [canvasDims, setCanvasDims] = useState<{
		width: number;
		height: number;
	}>({ width: 0, height: 0 });
	const [isGpuActive, setIsGpuActive] = useState<boolean>(false);

	useEffect(() => {
		const target = containerRef.current || canvasRef.current;
		if (!target || typeof ResizeObserver === "undefined") return;

		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					setCanvasDims({
						width: Math.floor(width),
						height: Math.floor(height),
					});
				}
			}
		});

		ro.observe(target);
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
	const handleSetOrientation = useCallback(
		(orientation: "coronal" | "sagittal" | "isometric") => {
			if (orientation === "coronal") {
				setYaw(0);
				setPitch(0);
			} else if (orientation === "sagittal") {
				setYaw(90);
				setPitch(0);
			} else {
				setYaw(45);
				setPitch(15);
			}
			setPan({ x: 0, y: 0 });
		},
		[],
	);

	// Close popovers on click outside
	useEffect(() => {
		if (!isPresetOpen && !isProjectionsMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target) return;
			if (
				!target.closest("[data-testid='cbct-volume-3d-presets-menu']") &&
				!target.closest("[data-testid='cbct-volume-3d-preset-trigger']")
			) {
				setIsPresetOpen(false);
			}
			if (
				!target.closest("[data-testid='cbct-projections-more-menu']") &&
				!target.closest("[data-testid='cbct-btn-projections-more']")
			) {
				setIsProjectionsMenuOpen(false);
			}
		};
		window.addEventListener("mousedown", handleClickOutside);
		return () => window.removeEventListener("mousedown", handleClickOutside);
	}, [isPresetOpen, isProjectionsMenuOpen]);

	const handleResetCamera = useCallback(() => {
		setYaw(0);
		setPitch(0);
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
	}, []);

	// Mouse interaction handlers for 3D trackball rotation, pan & zoom
	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			e.preventDefault();
			isDraggingRef.current = true;
			setIsInteracting(true);
			dragButtonRef.current = e.button;
			dragStartPosRef.current = { x: e.clientX, y: e.clientY };
			dragStartAnglesRef.current = { yaw, pitch };
			dragStartPanRef.current = { ...pan };
			targetAnglesRef.current = { yaw, pitch };
			targetPanRef.current = { ...pan };
		},
		[yaw, pitch, pan],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDraggingRef.current) return;
			const dx = e.clientX - dragStartPosRef.current.x;
			const dy = e.clientY - dragStartPosRef.current.y;

			if (dragButtonRef.current === 0) {
				// Left click drag: trackball orbit rotation
				targetAnglesRef.current = {
					yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
					pitch: Math.max(
						-85,
						Math.min(85, dragStartAnglesRef.current.pitch + dy * 0.6),
					),
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
		},
		[],
	);

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
	const handleTouchStart = useCallback(
		(e: React.TouchEvent<HTMLCanvasElement>) => {
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
				touchStartDistRef.current = Math.hypot(
					t1.clientX - t2.clientX,
					t1.clientY - t2.clientY,
				);
				touchStartZoomRef.current = zoom;
			}
		},
		[yaw, pitch, zoom],
	);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent<HTMLCanvasElement>) => {
			if (e.touches.length === 1 && isDraggingRef.current) {
				const touch = e.touches[0]!;
				const dx = touch.clientX - dragStartPosRef.current.x;
				const dy = touch.clientY - dragStartPosRef.current.y;
				targetAnglesRef.current = {
					yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
					pitch: Math.max(
						-85,
						Math.min(85, dragStartAnglesRef.current.pitch + dy * 0.6),
					),
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
				const curDist = Math.hypot(
					t1.clientX - t2.clientX,
					t1.clientY - t2.clientY,
				);
				if (curDist > 10 && touchStartDistRef.current > 10) {
					const factor = curDist / touchStartDistRef.current;
					setZoom(
						Math.max(0.4, Math.min(5.0, touchStartZoomRef.current * factor)),
					);
				}
			}
		},
		[],
	);

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
		const canvas2d = canvas2dRef.current;
		const container = containerRef.current;
		if (!canvas && !canvas2d) return;
		if (effectiveHibernated || isHibernatedRef.current) return;

		const targetElem = container || canvas || canvas2d;
		const rect = targetElem
			? targetElem.getBoundingClientRect()
			: { width: 320, height: 280 };
		const safeDpr = getSafeDevicePixelRatio();
		const rawWidth = Math.max(64, Math.floor((rect.width || 320) * safeDpr));
		const rawHeight = Math.max(64, Math.floor((rect.height || 280) * safeDpr));
		// Diagnostic Honesty: idle resolution strictly 1.0x with sub-voxel bisection refinement;
		// interactive downsampling factor applied dynamically during mouse/touch drag
		const downsample = isInteracting
			? activeProfile.interactiveDownsampleFactor
			: 1.0;
		const width = Math.max(64, Math.floor(rawWidth * downsample));
		const height = Math.max(64, Math.floor(rawHeight * downsample));

		if (canvas && (canvas.width !== width || canvas.height !== height)) {
			canvas.width = width;
			canvas.height = height;
		}
		if (canvas2d && (canvas2d.width !== width || canvas2d.height !== height)) {
			canvas2d.width = width;
			canvas2d.height = height;
		}

		// Attempt hardware WebGL2 raymarching first (STRICT GPU PRIORITY)
		let gpuRenderSuccess = false;
		if (canvas) {
			if (
				!glStateRef.current ||
				glStateRef.current.gl.canvas !== canvas ||
				(typeof glStateRef.current.gl.isContextLost === "function" &&
					glStateRef.current.gl.isContextLost())
			) {
				try {
					const gl = canvas.getContext("webgl2", {
						alpha: true,
						antialias: false,
						depth: false,
						preserveDrawingBuffer: true,
						powerPreference: "high-performance",
						desynchronized: true,
					});
					if (
						gl &&
						!(typeof gl.isContextLost === "function" && gl.isContextLost())
					) {
						glStateRef.current = initWebGl2VolumeRaymarching(gl);
						if (glStateRef.current) {
							syncAdaptiveProfile(gl);
						}
					} else {
						glStateRef.current = null;
					}
				} catch {
					glStateRef.current = null;
				}
			}

			if (
				glStateRef.current &&
				!(
					typeof glStateRef.current.gl.isContextLost === "function" &&
					glStateRef.current.gl.isContextLost()
				)
			) {
				if (!volume || !volume.data) {
					const gl = glStateRef.current.gl;
					gl.viewport(0, 0, width, height);
					gl.clearColor(0.035, 0.035, 0.043, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
					if (!isGpuActive) setIsGpuActive(true);
					return;
				}
				if (!volume.isDisposed) {
					try {
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
							0,
							0,
							active3DImplants,
							isMarActive,
							{
								voxelStep: isInteracting
									? activeProfileRef.current.interactiveVoxelStep
									: activeProfileRef.current.raymarchingVoxelStep,
								maxSteps: isInteracting
									? Math.min(
											64,
											activeProfileRef.current.interactiveMaxRaySteps,
										)
									: activeProfileRef.current.maxRaySteps,
								refineSteps: isInteracting
									? 0
									: activeProfileRef.current.bisectionRefineSteps,
								max3DLimit: activeProfileRef.current.max3DTextureDimension,
							},
						);
						if (glStateRef.current.lastRenderTimeMs !== undefined) {
							telemetryRef.current.recordFrameTime(
								glStateRef.current.lastRenderTimeMs,
							);
						}
						gpuRenderSuccess = true;
						if (!isGpuActive) {
							setIsGpuActive(true);
						}
						return;
					} catch (err) {
						console.error("[CbctVolume3DViewport WebGL2 Render Error]:", err);
						gpuRenderSuccess = false;
					}
				}
			}
		}

		if (!gpuRenderSuccess) {
			if (isGpuActive) {
				setIsGpuActive(false);
			}
			// Fallback to Canvas2D lightweight preview slice (FEAT-GPU-SAFEGUARD: blocks CPU-killing raymarching)
			// STRICT W3C ISOLATION: Passes canvas2d (which has never called getContext("webgl2"))
			if (canvas2d) {
				renderCanvas2DPreviewSlice(
					canvas2d,
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
			}
		}
	}, [
		volume,
		activePreset,
		yaw,
		pitch,
		zoom,
		pan,
		canvasDims,
		isInteracting,
		clipping,
		active3DImplants,
		isMarActive,
		activeProfile,
		effectiveHibernated,
	]);

	// Render 3D Vector Overlay (Mandibular nerve canal, virtual implant, clearance telemetry)
	useEffect(() => {
		const canvas = overlayCanvasRef.current;
		if (!canvas || effectiveHibernated || isHibernatedRef.current) return;
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
		const quadOrSingleList =
			implantCountMode === "quad"
				? generate4JawImplants(volume, null)
				: implant3DWorld && implant3DWorld.targetToothFdi === 46
					? [implant3DWorld]
					: generate4JawImplants(volume, null).slice(0, 1);

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
			implant3DWorld: quadOrSingleList[0] ?? null,
			implantsList: quadOrSingleList,
			nerveAuditResult,
		});
	}, [
		volume,
		yaw,
		pitch,
		zoom,
		pan,
		canvasDims,
		nervePoints,
		interpolatedNerve3D,
		implant3DWorld,
		nerveAuditResult,
		implantCountMode,
		effectiveHibernated,
	]);

	const activePresetSpec = getVolume3DPreset(activePreset);

	// Canonical skull projection matching for active state highlight
	const normYaw = ((((yaw + 180) % 360) + 360) % 360) - 180;
	const isAngleNear = useCallback(
		(targetYaw: number, targetPitch: number, tolerance = 12): boolean => {
			const dYaw = Math.abs(normYaw - targetYaw);
			const dPitch = Math.abs(pitch - targetPitch);
			return (
				(dYaw <= tolerance || Math.abs(dYaw - 360) <= tolerance) &&
				dPitch <= tolerance
			);
		},
		[normYaw, pitch],
	);

	const isCoronalActive = isAngleNear(0, 0);
	const isSagittalActive = isAngleNear(90, 0);
	const isIsometricActive = isAngleNear(45, 15, 16) || isAngleNear(30, 12, 16);
	const activeExtraProjection = EXTRA_SKULL_PROJECTIONS.find((p) =>
		isAngleNear(p.yaw, p.pitch, 15),
	);
	const isExtraActive = Boolean(activeExtraProjection);

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
				<div className="h-7 flex items-center gap-0.5 bg-zinc-950/85 backdrop-blur-md px-1 py-0.5 rounded-lg border border-zinc-800 shadow-xl select-none">
					{/* Compact Preset Selector Popover */}
					<div className="relative shrink-0">
						<button
							type="button"
							onClick={() => {
								setIsPresetOpen((prev) => !prev);
								setIsProjectionsMenuOpen(false);
							}}
							className={`h-6 px-1.5 rounded flex items-center gap-1 transition-all cursor-pointer group ${
								isPresetOpen
									? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)]"
									: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
							}`}
							data-testid="cbct-volume-3d-preset-trigger"
							title={`3D Пресет плотности (HU): ${activePresetSpec.label} (${activePresetSpec.huMin}..${activePresetSpec.huMax} HU)`}
							aria-label={`3D Пресет: ${activePresetSpec.label}`}
						>
							<Layers className="w-3.5 h-3.5 text-cyan-400 transition-transform group-hover:scale-105" />
							<span className="text-[10px] font-bold font-mono text-cyan-300 leading-none">
								{activePresetSpec.shortLabel}
							</span>
							<ChevronDown
								className={`w-2.5 h-2.5 text-zinc-400 transition-transform ${
									isPresetOpen ? "rotate-180" : ""
								}`}
							/>
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
											<span className="font-mono text-[9px] text-zinc-500">
												{p.huMin} HU
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

					{/* Orthogonal Angle Shortcuts with Anatomical Skull Vector Icons */}
					<button
						type="button"
						onClick={() => handleSetOrientation("coronal")}
						title="Фас (Anterior / Coronal): фронтальная проекция (Yaw 0°, Pitch 0°)"
						aria-label="Фас"
						className={`w-7 h-6 rounded flex items-center justify-center transition-all cursor-pointer group shrink-0 ${
							isCoronalActive
								? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-btn-orientation-coronal"
					>
						<SkullSvgIcon
							projection="anterior"
							className={`w-3.5 h-3.5 transition-colors ${
								isCoronalActive
									? "text-cyan-300"
									: "text-zinc-400 group-hover:text-cyan-300"
							}`}
						/>
						<span className="sr-only">Фас</span>
					</button>

					<button
						type="button"
						onClick={() => handleSetOrientation("sagittal")}
						title="Профиль (Lateral / Sagittal): правая сагиттальная проекция (Yaw 90°, Pitch 0°)"
						aria-label="Профиль"
						className={`w-7 h-6 rounded flex items-center justify-center transition-all cursor-pointer group shrink-0 ${
							isSagittalActive
								? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-btn-orientation-sagittal"
					>
						<SkullSvgIcon
							projection="right_lateral"
							className={`w-3.5 h-3.5 transition-colors ${
								isSagittalActive
									? "text-cyan-300"
									: "text-zinc-400 group-hover:text-cyan-300"
							}`}
						/>
						<span className="sr-only">Профиль</span>
					</button>

					<button
						type="button"
						onClick={() => handleSetOrientation("isometric")}
						title="Ракурс 3/4 (Anterolateral): изометрия челюсти (Yaw 45°, Pitch 15°)"
						aria-label="3/4"
						className={`w-7 h-6 rounded flex items-center justify-center transition-all cursor-pointer group shrink-0 ${
							isIsometricActive
								? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-btn-orientation-isometric"
					>
						<SkullSvgIcon
							projection="right_oblique"
							className={`w-3.5 h-3.5 transition-colors ${
								isIsometricActive
									? "text-cyan-300"
									: "text-zinc-400 group-hover:text-cyan-300"
							}`}
						/>
						<span className="sr-only">3/4</span>
					</button>

					{/* Extra Projections Dropdown (Затылок, Левый профиль, Окклюзия, Базис, 3/4 Левый) */}
					<div className="relative shrink-0">
						<button
							type="button"
							onClick={() => {
								setIsProjectionsMenuOpen((prev) => !prev);
								setIsPresetOpen(false);
							}}
							title={`Дополнительные анатомические проекции черепа: ${
								activeExtraProjection
									? activeExtraProjection.label
									: "Затылок, Левый профиль, Сверху, Снизу, 3/4L"
							}`}
							aria-label="Дополнительные проекции черепа"
							className={`h-6 px-1.5 rounded flex items-center gap-0.5 transition-all cursor-pointer group shrink-0 ${
								isExtraActive || isProjectionsMenuOpen
									? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
									: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
							}`}
							data-testid="cbct-btn-projections-more"
						>
							<Compass
								className={`w-3.5 h-3.5 transition-colors ${
									isExtraActive || isProjectionsMenuOpen
										? "text-cyan-300"
										: "text-zinc-400 group-hover:text-cyan-300"
								}`}
							/>
							<ChevronDown
								className={`w-2.5 h-2.5 transition-transform ${
									isProjectionsMenuOpen ? "rotate-180" : ""
								}`}
							/>
							<span className="sr-only">
								{activeExtraProjection ? activeExtraProjection.label : "Еще"}
							</span>
						</button>

						{isProjectionsMenuOpen && (
							<div
								className="absolute right-0 top-full mt-1 z-40 bg-zinc-950/95 backdrop-blur-md p-1.5 rounded-md border border-zinc-700 shadow-2xl flex flex-col gap-1 min-w-[160px]"
								data-testid="cbct-projections-more-menu"
							>
								{EXTRA_SKULL_PROJECTIONS.map((p) => {
									const isSelected = isAngleNear(p.yaw, p.pitch, 15);
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												setYaw(p.yaw);
												setPitch(p.pitch);
												setPan({ x: 0, y: 0 });
												setIsProjectionsMenuOpen(false);
											}}
											title={p.tooltip}
											className={`px-2 py-1 rounded text-[10px] font-semibold text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
												isSelected
													? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
													: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent"
											}`}
											data-testid={p.testId}
										>
											<span className="flex items-center gap-1.5">
												<SkullSvgIcon
													projection={p.id as SkullProjectionKey}
													className="w-3.5 h-3.5 text-cyan-400/80"
												/>
												<span>{p.label}</span>
											</span>
											<span className="font-mono text-[9px] text-zinc-500">
												{p.yaw}°
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

					{/* Clipping Box Toggle Button */}
					<button
						type="button"
						onClick={() => setIsClippingOpen((prev) => !prev)}
						title="Срезы черепа (Clipping Box): отсечение шейных позвонков, затылка и корональной плоскости"
						className={`w-7 h-6 rounded relative flex items-center justify-center transition-all cursor-pointer group ${
							isClippingOpen || hasActiveClipping
								? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-btn-toggle-clipping"
						aria-label="Срезы черепа"
					>
						<Scissors
							className={`w-3.5 h-3.5 transition-colors ${
								isClippingOpen || hasActiveClipping
									? "text-cyan-300"
									: "text-zinc-400 group-hover:text-cyan-300"
							}`}
						/>
						<span className="sr-only">Срезы</span>
						{hasActiveClipping && (
							<span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)] animate-pulse" />
						)}
					</button>

					<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

					{/* 4 Implants / 1 Implant Jaw Selector Toggle */}
					<button
						type="button"
						onClick={() =>
							setImplantCountMode((prev) =>
								prev === "quad" ? "single" : "quad",
							)
						}
						title={
							implantCountMode === "quad"
								? "Анатомический ряд: 4 импланта в кости челюсти (#46, #47, #36, #37). Клик для 1 импланта"
								: "Одиночный имплант (#46). Клик для зубного ряда из 4 имплантов"
						}
						className={`h-6 px-1.5 rounded relative flex items-center gap-1 transition-all cursor-pointer group ${
							implantCountMode === "quad"
								? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-bold"
								: "bg-zinc-900/80 text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-volume-3d-implant-toggle"
						aria-label={
							implantCountMode === "quad" ? "4 импланта" : "1 имплант"
						}
					>
						<CircleDot
							className={`w-3.5 h-3.5 transition-colors ${
								implantCountMode === "quad"
									? "text-emerald-300"
									: "text-zinc-400 group-hover:text-emerald-300"
							}`}
						/>
						<span
							className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded leading-none transition-colors ${
								implantCountMode === "quad"
									? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
									: "bg-zinc-800 text-zinc-400 border border-zinc-700"
							}`}
						>
							{implantCountMode === "quad" ? "4" : "1"}
						</span>
						<span className="sr-only">
							{implantCountMode === "quad" ? "4 импланта" : "1 имплант"}
						</span>
					</button>

					<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

					{/* MAR (Metal Artifact Reduction) Streak Needle Filter Toggle */}
					<button
						type="button"
						onClick={() => setIsMarActive((prev) => !prev)}
						title={
							isMarActive
								? "MAR (Metal Artifact Reduction): Умное отсечение фонящих радиальных игл и артефактов металла (Активно)"
								: "MAR: Отсечение фонящих игл выключено. Клик для активации"
						}
						className={`w-7 h-6 rounded relative flex items-center justify-center transition-all cursor-pointer group ${
							isMarActive
								? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-volume-3d-mar-toggle"
						aria-label="Фильтр металла MAR"
					>
						<Sparkles
							className={`w-3.5 h-3.5 transition-colors ${
								isMarActive
									? "text-cyan-300"
									: "text-zinc-400 group-hover:text-cyan-300"
							}`}
						/>
						<span
							className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full transition-colors ${
								isMarActive
									? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)] animate-pulse"
									: "bg-zinc-600"
							}`}
						/>
						<span className="sr-only">MAR</span>
					</button>

					<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

					{/* Reset 3D Camera Button */}
					<button
						type="button"
						onClick={handleResetCamera}
						title="Сбросить положение камеры 3D объема"
						aria-label="Сброс камеры 3D"
						className="w-7 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80 bg-zinc-900/80 transition-all cursor-pointer"
						data-testid="cbct-btn-reset-3d-camera"
					>
						<RotateCcw className="w-3.5 h-3.5" />
					</button>

					{/* Maximize / Restore Button */}
					{onToggleMaximize && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onToggleMaximize();
							}}
							title={
								isMaximized
									? "Свернуть в сетку (Esc)"
									: "Развернуть 3D объем на весь экран"
							}
							className="w-7 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80 bg-zinc-900/80 transition-all cursor-pointer"
							data-testid={
								isMaximized
									? "btn-viewport-collapse-volume3d"
									: "btn-viewport-expand-volume3d"
							}
							{...{ "data-legacy-testid": "cbct-btn-toggle-maximize-3d" }}
							/* data-testid="cbct-btn-toggle-maximize-3d" */
							data-expand-testid="btn-viewport-expand-volume3d"
							data-collapse-testid="btn-viewport-collapse-volume3d"
							aria-label={isMaximized ? "Свернуть 3D" : "Развернуть 3D"}
						>
							{isMaximized ? (
								<Minimize2 className="w-3.5 h-3.5" />
							) : (
								<Maximize2 className="w-3.5 h-3.5" />
							)}
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
						<span className="font-mono text-xs">
							{airwayResult.totalVolumeCm3.toFixed(1)} см³
						</span>
					</div>
					<div className="flex items-center justify-between text-zinc-300 text-[10px]">
						<span>Мин. просвет (Constriction):</span>
						<span className="font-mono font-bold text-amber-300">
							{airwayResult.minAreaMm2.toFixed(0)} мм²
						</span>
					</div>
					<div className="text-[9.5px] leading-tight text-zinc-400 border-t border-zinc-800/80 pt-1">
						{airwayResult.clinicalSummary}
					</div>
				</div>
			)}

			{/* INTERACTIVE 3D SKULL CANVASES */}
			<div
				ref={containerRef}
				className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full"
				style={{ backgroundColor: "#000000" }}
			>
				{/* 1. Hardware WebGL2 Raymarching Canvas */}
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
					style={{
						backgroundColor: "#000000",
						display: isGpuActive ? "block" : "none",
					}}
					className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0"
					data-testid="cbct-volume-3d-canvas"
				/>
				{/* 2. Isolated Canvas2D Fallback (100% W3C getContext("2d") isolation) */}
				<canvas
					ref={canvas2dRef}
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
					style={{
						backgroundColor: "#000000",
						display: isGpuActive ? "none" : "block",
					}}
					className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0"
					data-testid="cbct-volume-3d-canvas-2d"
				/>
				{/* 3. 3D Vector Overlay Canvas */}
				<canvas
					ref={overlayCanvasRef}
					style={{ backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
					data-testid="cbct-volume-3d-overlay-canvas"
				/>
			</div>

			{/* BOTTOM TELEMETRY HUD (Subtle borderless floating text, zero distracting boxes) */}
			<div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-zinc-400/80 pointer-events-none z-20 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
				<div className="flex items-center gap-2">
					<span className="flex items-center gap-1 text-cyan-400 font-semibold">
						<Compass className="w-2.5 h-2.5" />
						<span>3D Объем: {activePresetSpec.label}</span>
					</span>
					{volume && (
						<div className="flex items-center gap-1.5 opacity-80">
							<span
								className="text-zinc-300 font-mono"
								data-testid="cbct-3d-fov-telemetry"
							>
								FOV [{Math.round(volume.dimensions.width * volume.spacingMm.x)} × {Math.round(volume.dimensions.depth * volume.spacingMm.z)} мм]
							</span>
							<span
								className="text-zinc-400 font-mono text-[8.5px]"
								data-testid="cbct-3d-axis-telemetry"
							>
								[{crosshairMm ? `${crosshairMm.x.toFixed(1)}, ${crosshairMm.y.toFixed(1)}, ${crosshairMm.z.toFixed(1)}` : "0.0, 0.0, 0.0"}]
							</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<span className="hidden md:inline text-zinc-400 text-[8.5px]">
						Yaw: {Math.round(yaw)}° • Pitch: {Math.round(pitch)}°
					</span>
					{hasActiveClipping && (
						<span
							className="text-amber-400 font-semibold font-mono flex items-center gap-0.5 text-[8.5px]"
							title="Активно 3D отсечение объема черепа"
							data-testid="cbct-hud-clipping-indicator"
						>
							<Scissors className="w-2 h-2" />
							<span>Срез</span>
						</span>
					)}
					{effectiveHibernated && (
						<span
							className="font-mono text-blue-300 flex items-center gap-0.5 text-[8.5px]"
							data-testid="cbct-hud-hibernation-status"
							title="Вкладка свёрнута: рендерер находится в спящем режиме гибернации"
						>
							<span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
							<span>Сон</span>
						</span>
					)}
					<span
						className="font-mono text-emerald-400/90 text-[8.5px]"
						data-testid="cbct-hud-gpu-status"
					>
						{isGpuActive
							? `⚡ GPU (${(glStateRef.current?.lastRenderTimeMs ?? 1.5).toFixed(1)} мс)`
							: "CPU"}
					</span>
					<span
						className="font-mono text-cyan-400/90 text-[8.5px]"
						data-testid="cbct-hud-mar-status"
					>
						{isMarActive ? "MAR: ON" : "MAR: OFF"}
					</span>
					<span className="text-zinc-400 font-mono text-[8.5px]">
						HU {activePresetSpec.huMin}..{activePresetSpec.huMax}
					</span>
				</div>
			</div>
		</div>
	);
};
