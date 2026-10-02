import React, { useEffect, useRef, useState } from "react";
import { Box, RotateCcw, Spline } from "lucide-react";
import type {
	CbctVoxelVolume,
	CbctViewportType,
	MprPlane,
	Point3D,
	SlabProjectionMode,
	ObliqueRotationAngles,
	RotationHandlePosition,
	ViewportTransform,
	CbctMeasurementRuler,
	CbctAngleMeasurement,
} from "../cbctMprMath";
import { resetPlaneObliqueAngle } from "../cbctMprMath";
import type { CrossSectionSliceData, DentalArchCurve } from "../dentalCurveEngine";
import { CbctViewportHud } from "../CbctViewportHud";
import type { StudioMode, ViewLayoutMode } from "./cbctStudioTypes";
import type { ImplantBrandKey } from "../implantSafetyEngine";
import { CbctVolume3DViewport } from "./CbctVolume3DViewport";
import { CbctViewportRulerToolbar, CbctQuickWlBar } from "./CbctViewportsRuler";
import { CbctEmptyVolumeDropzone } from "./CbctEmptyVolumeDropzone";
import {
	MprQuadWorkspace,
	PanoramicWorkspace,
	EndoWorkspace,
	ImplantWorkspace,
	type ViewportRenderers,
} from "./workspaces";

export interface CbctMprViewportsGridProps {
	readonly isSidebarOpen: boolean;
	readonly mobileActiveTab: string;
	readonly patientDisplayName?: string | undefined;
	readonly onSelectMobileTab?: ((tab: "axial" | "coronal" | "sagittal" | "panoramic" | "planner") => void) | undefined;
	readonly hoveredViewport?: CbctViewportType | null | undefined;
	readonly onHoverViewport?: ((v: CbctViewportType | null) => void) | undefined;
	readonly showEdgeRulers?: boolean | undefined;
	readonly volume: CbctVoxelVolume | null;
	readonly dicomLoadingStatus: string | null;
	readonly dicomProgress: number;
	readonly maximizedViewport: CbctViewportType | null;
	readonly viewLayout: ViewLayoutMode;
	readonly studioMode?: StudioMode | undefined;
	readonly onSelectStudioMode?: ((mode: StudioMode) => void) | undefined;
	readonly folderInputRef: React.RefObject<HTMLInputElement | null>;
	readonly zipInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleDicomFilesChange: (files: FileList | File[]) => void;
	readonly activeViewport: CbctViewportType;
	readonly setActiveViewport: (v: CbctViewportType) => void;
	readonly handleToggleMaximize: (v: CbctViewportType) => void;
	readonly axialBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly axialOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly coronalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly coronalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly sagittalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly sagittalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly panoOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>; readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly handleCanvasDoubleClick: (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCanvasMouseDown: (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCanvasMouseMove: (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCanvasMouseUp: () => void;
	readonly handleCanvasWheel: (plane: CbctViewportType, e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly getCanvasCursor: (plane: MprPlane) => string;
	readonly crosshairMm: Point3D;
	readonly currentVoxel: Point3D;
	readonly slabMode: SlabProjectionMode;
	readonly slabThicknessMm: number;
	readonly obliqueAngles: ObliqueRotationAngles;
	readonly setObliqueAngles: React.Dispatch<React.SetStateAction<ObliqueRotationAngles>>;
	readonly handleFullResetViewport: (plane: CbctViewportType) => void;
	readonly activeRotationHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	readonly isShiftRotating: { plane: MprPlane } | null;
	readonly hoveredHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	readonly transforms: Record<CbctViewportType, ViewportTransform>;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly renderViewportOverlays: (v: CbctViewportType) => React.ReactNode;
	readonly handlePanoMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handlePanoMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handlePanoMouseUp: () => void;
	readonly handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseUp: () => void;
	readonly dragImplantPart: string | null; readonly hoveredImplantPart: string | null;
	readonly activeCrossSection: CrossSectionSliceData | null | undefined;
	readonly activeCrossSectionIdx: number; readonly crossSections: CrossSectionSliceData[];
	readonly onLoadDemoVolume?: (() => void) | undefined;
	readonly activeTool?: string | undefined; readonly onSelectTool?: ((tool: "ruler" | "crosshair" | "angle") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined; readonly onClearRulers?: ((plane?: CbctViewportType) => void) | undefined;
	readonly angles?: readonly CbctAngleMeasurement[] | undefined; readonly onClearAngles?: ((plane?: CbctViewportType) => void) | undefined;
	readonly onSelectQuickWlPreset?: ((preset: { windowWidth: number; windowLevel: number }) => void) | undefined;
	readonly handleSelectTooth?: ((toothFdi: number | string) => void) | undefined;
	readonly archCurve?: DentalArchCurve | undefined; readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly onSwitchJaw?: ((jaw: "mandible" | "maxilla") => void) | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly isUnsharpActive?: boolean | undefined; readonly onToggleUnsharp?: (() => void) | undefined;
	readonly onChangeCrossSectionIdx?: ((idx: number) => void) | undefined;
	readonly selectedBrand?: ImplantBrandKey | undefined; readonly onSelectBrand?: ((b: ImplantBrandKey) => void) | undefined;
	readonly selectedDiameterMm?: number | undefined; readonly onSelectDiameterMm?: ((d: number) => void) | undefined;
	readonly selectedLengthMm?: number | undefined; readonly onSelectLengthMm?: ((l: number) => void) | undefined;
	readonly displayBoneClass?: string | undefined; readonly displayMeanHU?: number | null | undefined; readonly displayTorque?: string | undefined;
	readonly displayNerveClearanceMm?: number | null | undefined; readonly displayDrillingProtocol?: string | undefined;
	readonly nerveSafetyStatus?: "safe" | "warning" | "danger" | "unmeasured" | undefined;
	readonly handleExportToEmr?: (() => void) | undefined; readonly handleExportToPlan?: (() => void) | undefined;
	readonly onChangeWindowWidth?: ((w: number) => void) | undefined; readonly onChangeWindowLevel?: ((l: number) => void) | undefined;
	readonly onChangeSlabThicknessMm?: ((th: number) => void) | undefined; readonly onChangeSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;
	readonly onSelectClinicalPreset?: ((presetId: string) => void) | undefined; readonly activePresetId?: string | undefined;
	readonly panoThicknessMm?: number | undefined; readonly onChangePanoThicknessMm?: ((th: number) => void) | undefined;
	readonly panoProjectionMode?: string | undefined; readonly onChangePanoProjectionMode?: ((mode: string) => void) | undefined;
	readonly crossSectionStepMm?: number | undefined; readonly onChangeCrossSectionStepMm?: ((step: number) => void) | undefined;
	readonly implantEntryXOffsetMm?: number | undefined; readonly onChangeImplantEntryXOffsetMm?: ((val: number) => void) | undefined;
	readonly implantEntryDepthMm?: number | undefined; readonly onChangeImplantEntryDepthMm?: ((val: number) => void) | undefined;
	readonly implantAngulationDeg?: number | undefined; readonly onChangeImplantAngulationDeg?: ((val: number) => void) | undefined;
}

export const CbctMprViewportsGrid: React.FC<CbctMprViewportsGridProps> = ({
	isSidebarOpen, mobileActiveTab, patientDisplayName, onSelectMobileTab, hoveredViewport, onHoverViewport,
	showEdgeRulers = false, volume, dicomLoadingStatus, dicomProgress, maximizedViewport,
	viewLayout, studioMode, onSelectStudioMode, folderInputRef, zipInputRef,
	handleDicomFilesChange, onLoadDemoVolume, activeViewport, setActiveViewport, handleToggleMaximize,
	axialBaseCanvasRef, axialOverlayCanvasRef, coronalBaseCanvasRef, coronalOverlayCanvasRef,
	sagittalBaseCanvasRef, sagittalOverlayCanvasRef, panoBaseCanvasRef, panoOverlayCanvasRef,
	crossSectionBaseCanvasRef, crossSectionOverlayCanvasRef,
	handleCanvasDoubleClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
	handleCanvasWheel, getCanvasCursor, crosshairMm, currentVoxel, slabMode, slabThicknessMm,
	obliqueAngles, setObliqueAngles, handleFullResetViewport, activeRotationHandle, isShiftRotating,
	hoveredHandle, transforms, windowWidth, windowLevel, renderViewportOverlays,
	handlePanoMouseDown, handlePanoMouseMove, handlePanoMouseUp,
	handleCrossSectionMouseDown, handleCrossSectionMouseMove, handleCrossSectionMouseUp,
	dragImplantPart, hoveredImplantPart, activeCrossSection, activeCrossSectionIdx,
	crossSections, activeTool, onSelectTool, rulers, onClearRulers, angles, onClearAngles, onSelectQuickWlPreset,
	handleSelectTooth, archCurve, jawType, onSwitchJaw, activeToothFdi, isUnsharpActive,
	onToggleUnsharp, onChangeCrossSectionIdx, selectedBrand, onSelectBrand,
	selectedDiameterMm, onSelectDiameterMm, selectedLengthMm, onSelectLengthMm,
	displayBoneClass, displayMeanHU, displayTorque, displayNerveClearanceMm,
	displayDrillingProtocol, nerveSafetyStatus, handleExportToEmr, handleExportToPlan,
	onChangeWindowWidth, onChangeWindowLevel, onChangeSlabThicknessMm, onChangeSlabMode,
	onSelectClinicalPreset, activePresetId, panoThicknessMm, onChangePanoThicknessMm,
	panoProjectionMode, onChangePanoProjectionMode,
	crossSectionStepMm, onChangeCrossSectionStepMm,
	implantEntryXOffsetMm, onChangeImplantEntryXOffsetMm,
	implantEntryDepthMm, onChangeImplantEntryDepthMm,
	implantAngulationDeg, onChangeImplantAngulationDeg,
}) => {
	const [fourthQuadrantMode, setFourthQuadrantMode] = useState<"volume3d" | "panoramic">("volume3d");

	useEffect(() => {
		if (studioMode === "panoramic") {
			setFourthQuadrantMode("panoramic");
		} else if (studioMode === "volume3d") {
			setFourthQuadrantMode("volume3d");
		}
	}, [studioMode]);



	// ─── 60 FPS REQUEST ANIMATION FRAME EVENT THROTTLER ─────────────────────────
	const pendingMouseMoveRef = useRef<{ plane: MprPlane; nativeEvent: React.MouseEvent<HTMLCanvasElement> } | null>(null);
	const rafMouseMoveIdRef = useRef<number | null>(null);
	const pendingWheelRef = useRef<{ viewport: CbctViewportType; nativeEvent: React.WheelEvent<HTMLCanvasElement>; accumulatedDeltaY: number } | null>(null);
	const rafWheelIdRef = useRef<number | null>(null);

	const handleThrottledMouseMove = (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		e.persist?.();
		pendingMouseMoveRef.current = { plane, nativeEvent: e };
		if (rafMouseMoveIdRef.current === null) {
			rafMouseMoveIdRef.current = requestAnimationFrame(() => {
				rafMouseMoveIdRef.current = null;
				if (pendingMouseMoveRef.current) {
					const { plane: targetPlane, nativeEvent } = pendingMouseMoveRef.current;
					pendingMouseMoveRef.current = null;
					handleCanvasMouseMove(targetPlane, nativeEvent);
				}
			});
		}
	};

	const handleThrottledMouseUp = () => {
		if (rafMouseMoveIdRef.current !== null) {
			cancelAnimationFrame(rafMouseMoveIdRef.current);
			rafMouseMoveIdRef.current = null;
		}
		if (pendingMouseMoveRef.current) {
			const { plane: targetPlane, nativeEvent } = pendingMouseMoveRef.current;
			pendingMouseMoveRef.current = null;
			handleCanvasMouseMove(targetPlane, nativeEvent);
		}
		handleCanvasMouseUp();
	};

	const handleThrottledWheel = (viewport: CbctViewportType, e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		e.persist?.();
		const prevDelta = pendingWheelRef.current?.accumulatedDeltaY ?? 0;
		const accumulatedDeltaY = prevDelta + e.deltaY;
		pendingWheelRef.current = { viewport, nativeEvent: e, accumulatedDeltaY };

		if (rafWheelIdRef.current === null) {
			rafWheelIdRef.current = requestAnimationFrame(() => {
				rafWheelIdRef.current = null;
				if (pendingWheelRef.current) {
					const { viewport: targetVp, nativeEvent, accumulatedDeltaY: deltaY } = pendingWheelRef.current;
					pendingWheelRef.current = null;
					const syntheticEvent = Object.create(nativeEvent, {
						deltaY: { value: deltaY, writable: false },
					});
					handleCanvasWheel(targetVp, syntheticEvent);
				}
			});
		}
	};

	useEffect(() => {
		return () => {
			if (rafMouseMoveIdRef.current !== null) {
				cancelAnimationFrame(rafMouseMoveIdRef.current);
				rafMouseMoveIdRef.current = null;
			}
			if (rafWheelIdRef.current !== null) {
				cancelAnimationFrame(rafWheelIdRef.current);
				rafWheelIdRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!activeRotationHandle && !isShiftRotating) return;
		const handleGlobalPointerUp = () => handleThrottledMouseUp();
		window.addEventListener("pointerup", handleGlobalPointerUp);
		return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
	}, [activeRotationHandle, isShiftRotating, handleCanvasMouseUp]);

	const renderViewportOverlaysWithRuler = (viewport: CbctViewportType) => (
		<>
			{/* Top-Right Viewport Caliper Ruler Toolbar (Strict 28-32px density, Mandate 8k) */}
			<div className="absolute top-1.5 right-28 pointer-events-auto flex items-center gap-1 z-30">
				<CbctViewportRulerToolbar
					viewportType={viewport}
					activeTool={activeTool}
					onSelectTool={onSelectTool}
					rulers={rulers}
					onClearRulers={onClearRulers}
					angles={angles}
					onClearAngles={onClearAngles}
				/>
			</div>

			{renderViewportOverlays(viewport)}
		</>
	);

	const renderAxialViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("axial")}
			onPointerDownCapture={() => setActiveViewport("axial")}
			onMouseEnter={() => onHoverViewport?.("axial")}
			onMouseLeave={() => onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "axial"
					? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
					: "border border-cyan-500/30 hover:border-cyan-500/60"
			} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-viewport-container-axial"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full" style={{ backgroundColor: "#000000" }}>
				<canvas
					ref={axialBaseCanvasRef}
					style={{ backgroundColor: "#000000" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={axialOverlayCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("axial", e)}
					onMouseDown={(e) => handleCanvasMouseDown("axial", e)}
					onMouseMove={(e) => handleThrottledMouseMove("axial", e)}
					onMouseUp={handleThrottledMouseUp}
					onMouseLeave={handleThrottledMouseUp}
					onWheel={(e) => handleThrottledWheel("axial", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ cursor: getCanvasCursor("axial"), backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain z-10"
					data-testid="cbct-overlay-canvas-axial"
				/>
				{onSwitchJaw && (studioMode === "panoramic" || studioMode === "implant") && (
					<div
						className="absolute top-8 left-1.5 z-30 pointer-events-auto inline-flex items-center bg-zinc-950/90 border border-zinc-800 rounded p-0.5 shadow-md backdrop-blur-md gap-0.5 text-[10px]"
						role="group"
						aria-label="Выбор челюсти"
					>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onSwitchJaw("maxilla");
							}}
							className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
								jawType === "maxilla"
									? "bg-purple-600 text-white shadow-xs font-bold"
									: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
							}`}
							data-testid="cbct-axial-switch-maxilla-btn"
							title="Верхняя челюсть (ВЧ): дуга и Z-срез"
						>
							ВЧ
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onSwitchJaw("mandible");
							}}
							className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
								jawType === "mandible"
									? "bg-cyan-600 text-white shadow-xs font-bold"
									: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
							}`}
							data-testid="cbct-axial-switch-mandible-btn"
							title="Нижняя челюсть (НЧ): дуга и Z-срез"
						>
							НЧ
						</button>
					</div>
				)}
				<CbctViewportHud
					viewportType="axial"
					coordinateMm={{ z: crosshairMm.z }}
					sliceIndex={volume ? currentVoxel.z : undefined}
					totalSlices={volume?.dimensions.depth}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					obliqueAngleDeg={obliqueAngles.axialAngleDeg}
					onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "axial"))}
					onResetView={() => handleFullResetViewport("axial")}
					isRotating={activeRotationHandle?.plane === "axial" || isShiftRotating?.plane === "axial"}
					isHandleHovered={hoveredHandle?.plane === "axial"}
					isMaximized={maximizedViewport === "axial"}
					onToggleMaximize={() => handleToggleMaximize("axial")}
					zoomFactor={transforms.axial?.zoom}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
				>
					{renderViewportOverlaysWithRuler("axial")}
				</CbctViewportHud>
			</div>
		</div>
	);

	const renderCoronalViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("coronal")}
			onPointerDownCapture={() => setActiveViewport("coronal")}
			onMouseEnter={() => onHoverViewport?.("coronal")}
			onMouseLeave={() => onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "coronal"
					? "ring-1 ring-emerald-500/50 border border-emerald-500/80 shadow-emerald-950/30"
					: "border border-emerald-500/30 hover:border-emerald-500/60"
			} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-viewport-container-coronal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full" style={{ backgroundColor: "#000000" }}>
				<canvas
					ref={coronalBaseCanvasRef}
					style={{ backgroundColor: "#000000" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={coronalOverlayCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("coronal", e)}
					onMouseDown={(e) => handleCanvasMouseDown("coronal", e)}
					onMouseMove={(e) => handleThrottledMouseMove("coronal", e)}
					onMouseUp={handleThrottledMouseUp}
					onMouseLeave={handleThrottledMouseUp}
					onWheel={(e) => handleThrottledWheel("coronal", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ cursor: getCanvasCursor("coronal"), backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain z-10"
					data-testid="cbct-overlay-canvas-coronal"
				/>
				<CbctViewportHud
					viewportType="coronal"
					coordinateMm={{ y: crosshairMm.y }}
					sliceIndex={volume ? currentVoxel.y : undefined}
					totalSlices={volume?.dimensions.height}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					obliqueAngleDeg={obliqueAngles.coronalTiltDeg}
					onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "coronal"))}
					onResetView={() => handleFullResetViewport("coronal")}
					isRotating={activeRotationHandle?.plane === "coronal" || isShiftRotating?.plane === "coronal"}
					isHandleHovered={hoveredHandle?.plane === "coronal"}
					isMaximized={maximizedViewport === "coronal"}
					onToggleMaximize={() => handleToggleMaximize("coronal")}
					zoomFactor={transforms.coronal?.zoom}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
				>
					{renderViewportOverlaysWithRuler("coronal")}
				</CbctViewportHud>
			</div>
		</div>
	);

	const renderSagittalViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("sagittal")}
			onPointerDownCapture={() => setActiveViewport("sagittal")}
			onMouseEnter={() => onHoverViewport?.("sagittal")}
			onMouseLeave={() => onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "sagittal"
					? "ring-1 ring-rose-500/50 border border-rose-500/80 shadow-rose-950/30"
					: "border border-rose-500/30 hover:border-rose-500/60"
			} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-viewport-container-sagittal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full" style={{ backgroundColor: "#000000" }}>
				<canvas
					ref={sagittalBaseCanvasRef}
					style={{ backgroundColor: "#000000" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={sagittalOverlayCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("sagittal", e)}
					onMouseDown={(e) => handleCanvasMouseDown("sagittal", e)}
					onMouseMove={(e) => handleThrottledMouseMove("sagittal", e)}
					onMouseUp={handleThrottledMouseUp}
					onMouseLeave={handleThrottledMouseUp}
					onWheel={(e) => handleThrottledWheel("sagittal", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ cursor: getCanvasCursor("sagittal"), backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain z-10"
					data-testid="cbct-overlay-canvas-sagittal"
				/>
				<CbctViewportHud
					viewportType="sagittal"
					coordinateMm={{ x: crosshairMm.x }}
					sliceIndex={volume ? currentVoxel.x : undefined}
					totalSlices={volume?.dimensions.width}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.y ?? 0.4}
					obliqueAngleDeg={obliqueAngles.sagittalTiltDeg}
					onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "sagittal"))}
					onResetView={() => handleFullResetViewport("sagittal")}
					isRotating={activeRotationHandle?.plane === "sagittal" || isShiftRotating?.plane === "sagittal"}
					isHandleHovered={hoveredHandle?.plane === "sagittal"}
					isMaximized={maximizedViewport === "sagittal"}
					onToggleMaximize={() => handleToggleMaximize("sagittal")}
					zoomFactor={transforms.sagittal?.zoom}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
				>
					{renderViewportOverlaysWithRuler("sagittal")}
				</CbctViewportHud>
			</div>
		</div>
	);

	const renderFourthQuadrantSwitcher = () => (
		<div
			className="inline-flex items-center bg-zinc-950/90 backdrop-blur-md rounded-md p-0.5 border border-zinc-700/60 shadow-md gap-0.5 z-20 pointer-events-auto"
			role="tablist"
			aria-label="Режимы 4-го квадранта"
		>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setFourthQuadrantMode("volume3d");
					onSelectStudioMode?.("volume3d");
				}}
				className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
					fourthQuadrantMode === "volume3d"
						? "bg-cyan-600 text-white shadow-xs"
						: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
				}`}
				data-testid="cbct-btn-mode-volume3d"
				title="3D Череп: интерактивная трехмерная реконструкция костной ткани и зубов"
			>
				<Box className="w-3 h-3 text-cyan-300" />
				<span>3D Череп</span>
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setFourthQuadrantMode("panoramic");
					onSelectStudioMode?.("panoramic");
				}}
				className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
					fourthQuadrantMode === "panoramic"
						? "bg-purple-600 text-white shadow-xs"
						: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
				}`}
				data-testid="cbct-btn-mode-panoramic"
				title="ОПТГ: развернутая зубная панорама и кросс-секции"
			>
				<Spline className="w-3 h-3 text-purple-300" />
				<span>ОПТГ</span>
			</button>
		</div>
	);

	const renderPanoramicViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("panoramic")}
			onPointerDownCapture={() => setActiveViewport("panoramic")}
			onMouseEnter={() => onHoverViewport?.("panoramic")}
			onMouseLeave={() => onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full flex flex-col ${
				activeViewport === "panoramic"
					? "ring-1 ring-purple-500/50 border border-purple-500/80 shadow-purple-950/30"
					: "border border-purple-500/30 hover:border-purple-500/60"
			} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-viewport-container-panoramic"
		>

			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full" style={{ backgroundColor: "#000000" }}>
				{/* Top-left Mode Switcher (placed below clinical HUD badge to prevent overlap) */}
				<div className="absolute top-9 left-2 z-30 pointer-events-auto">
					{renderFourthQuadrantSwitcher()}
				</div>
				<canvas
					ref={panoBaseCanvasRef}
					style={{ backgroundColor: "#000000" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={panoOverlayCanvasRef}
					onDoubleClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleToggleMaximize("panoramic");
					}}
					onMouseDown={handlePanoMouseDown}
					onMouseMove={handlePanoMouseMove}
					onMouseUp={handlePanoMouseUp}
					onMouseLeave={handlePanoMouseUp}
					onWheel={(e) => handleCanvasWheel("panoramic", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain cursor-pointer z-10"
					data-testid="cbct-panorama-canvas"
				/>
				<CbctViewportHud
					viewportType="panoramic"
					coordinateMm={{ z: crosshairMm.z }}
					sliceIndex={volume ? currentVoxel.z : undefined}
					totalSlices={volume?.dimensions.depth}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					onResetView={() => handleFullResetViewport("panoramic")}
					isMaximized={maximizedViewport === "panoramic"}
					onToggleMaximize={() => handleToggleMaximize("panoramic")}
					zoomFactor={transforms.panoramic?.zoom}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
				>
					{renderViewportOverlaysWithRuler("panoramic")}
				</CbctViewportHud>
			</div>
		</div>
	);

	const renderFourthQuadrantViewport = (extraClassName = "flex-1 flex flex-col") => {
		if (fourthQuadrantMode === "volume3d") {
			return (
				<CbctVolume3DViewport
					volume={volume}
					extraClassName={extraClassName}
					isActive={activeViewport === "panoramic"}
					onPointerDownCapture={() => setActiveViewport("panoramic")}
					onMouseEnter={() => onHoverViewport?.("panoramic")}
					onMouseLeave={() => onHoverViewport?.(null)}
					onDoubleClick={() => handleToggleMaximize("panoramic")}
					switcherSlot={renderFourthQuadrantSwitcher()}
					isMaximized={maximizedViewport === "panoramic"}
					onToggleMaximize={() => handleToggleMaximize("panoramic")}
				/>
			);
		}

		return renderPanoramicViewport(extraClassName);
	};

	const renderCrossSectionViewport = (extraClassName = "flex-1 flex flex-col", isMaximized = false) => (
		<div
			onDoubleClick={() => handleToggleMaximize("cross_section")}
			onPointerDownCapture={() => setActiveViewport("cross_section")}
			onMouseEnter={() => onHoverViewport?.("cross_section")}
			onMouseLeave={() => onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all flex flex-col min-h-0 w-full h-full ${
				activeViewport === "cross_section"
					? "ring-1 ring-amber-500/50 border border-amber-500/80 shadow-amber-950/30"
					: "border border-amber-500/30 hover:border-amber-500/60"
			} ${extraClassName}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-viewport-container-cross-section"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full" style={{ backgroundColor: "#000000" }}>
				<canvas
					ref={crossSectionBaseCanvasRef}
					style={{ backgroundColor: "#000000" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={crossSectionOverlayCanvasRef}
					onDoubleClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleToggleMaximize("cross_section");
					}}
					onMouseDown={handleCrossSectionMouseDown}
					onMouseMove={handleCrossSectionMouseMove}
					onMouseUp={handleCrossSectionMouseUp}
					onMouseLeave={handleCrossSectionMouseUp}
					onWheel={(e) => handleCanvasWheel("cross_section", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ backgroundColor: "transparent" }}
					className={`absolute inset-0 w-full h-full object-contain z-10 ${
						dragImplantPart ? "cursor-grabbing" : hoveredImplantPart ? "cursor-grab" : "cursor-default"
					}`}
					data-testid="cbct-cross-section-canvas"
				/>
				<CbctViewportHud
					viewportType="cross_section"
					toothFdi={activeCrossSection?.nearestToothFdi}
					sliceIndex={activeCrossSectionIdx}
					totalSlices={crossSections.length}
					pixelSpacingMm={activeCrossSection?.pixelSpacingMm ?? 0.25}
					onResetView={() => handleFullResetViewport("cross_section")}
					isMaximized={isMaximized}
					onToggleMaximize={() => handleToggleMaximize("cross_section")}
					zoomFactor={transforms.cross_section?.zoom}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
				>
					{renderViewportOverlaysWithRuler("cross_section")}
				</CbctViewportHud>
			</div>
		</div>
	);

	const renderers: ViewportRenderers = {
		renderAxial: (extraClassName) => renderAxialViewport(extraClassName),
		renderCoronal: (extraClassName) => renderCoronalViewport(extraClassName),
		renderSagittal: (extraClassName) => renderSagittalViewport(extraClassName),
		renderPanoramic: (extraClassName) => renderPanoramicViewport(extraClassName),
		renderCrossSection: (extraClassName, isMaximized) => renderCrossSectionViewport(extraClassName, isMaximized),
		renderVolume3D: (extraClassName) => renderFourthQuadrantViewport(extraClassName),
		// Layout contract guarantees: renderFourthQuadrantViewport(extraClassName) in quad, layout_1_plus_3: renderFourthQuadrantViewport(extraClassName)
	};

	return (
		<div
			className={`${mobileActiveTab === "planner" ? "hidden lg:flex" : "flex-1 flex flex-col"} min-h-0 min-w-0 w-full h-full transition-all relative bg-black`}
			style={{ backgroundColor: "#000000" }}
		>
			{/* Mobile Viewport Segmented Switcher (< lg screens) */}
			<div className="flex lg:hidden items-center bg-zinc-900 border-b border-zinc-800 p-1 gap-1 overflow-x-auto shrink-0 select-none z-10" data-testid="cbct-mobile-viewport-tabs">
				{[
					{ id: "axial", label: "Аксиал" },
					{ id: "coronal", label: "Коронал" },
					{ id: "sagittal", label: "Сагиттал" },
					{ id: "panoramic", label: "ОПТГ" },
					{ id: "planner", label: "План" },
				].map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => onSelectMobileTab?.(tab.id as any)}
						className={`flex-1 min-w-[56px] min-h-[44px] py-1.5 px-2 text-xs font-semibold rounded transition-colors text-center cursor-pointer flex items-center justify-center ${
							mobileActiveTab === tab.id
								? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 shadow-xs font-bold"
								: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
						}`}
						data-testid={`cbct-mobile-tab-${tab.id}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{!volume ? (
				<CbctEmptyVolumeDropzone
					dicomLoadingStatus={dicomLoadingStatus}
					dicomProgress={dicomProgress}
					folderInputRef={folderInputRef}
					zipInputRef={zipInputRef}
					handleDicomFilesChange={handleDicomFilesChange}
					onLoadDemoVolume={onLoadDemoVolume}
				/>
			) : studioMode === "panoramic" ? (
				<PanoramicWorkspace
					volume={volume} renderers={renderers}
					activeViewport={activeViewport} setActiveViewport={setActiveViewport}
					maximizedViewport={maximizedViewport} handleToggleMaximize={handleToggleMaximize}
					mobileActiveTab={mobileActiveTab} patientDisplayName={patientDisplayName}
					jawType={jawType ?? "mandible"} onSwitchJaw={onSwitchJaw ?? (() => {})}
					archCurve={archCurve} activeCrossSection={activeCrossSection}
					activeCrossSectionIdx={activeCrossSectionIdx} crossSections={crossSections}
					onChangeCrossSectionIdx={onChangeCrossSectionIdx} handleSelectTooth={handleSelectTooth}
					isUnsharpActive={isUnsharpActive} onToggleUnsharp={onToggleUnsharp}
					windowWidth={windowWidth} onChangeWindowWidth={onChangeWindowWidth}
					windowLevel={windowLevel} onChangeWindowLevel={onChangeWindowLevel}
					slabThicknessMm={slabThicknessMm} onChangeSlabThicknessMm={onChangeSlabThicknessMm}
					slabMode={slabMode} onChangeSlabMode={onChangeSlabMode}
					panoThicknessMm={panoThicknessMm} onChangePanoThicknessMm={onChangePanoThicknessMm}
					panoProjectionMode={panoProjectionMode} onChangePanoProjectionMode={onChangePanoProjectionMode}
					crossSectionStepMm={crossSectionStepMm} onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
					onSelectClinicalPreset={onSelectClinicalPreset} activePresetId={activePresetId}
					/>
			) : studioMode === "endo" ? (
				<EndoWorkspace
					volume={volume}
					renderers={renderers}
					activeViewport={activeViewport}
					setActiveViewport={setActiveViewport}
					maximizedViewport={maximizedViewport}
					handleToggleMaximize={handleToggleMaximize}
					mobileActiveTab={mobileActiveTab}
					patientDisplayName={patientDisplayName}
					activeToothFdi={activeToothFdi ?? activeCrossSection?.nearestToothFdi}
					handleSelectTooth={handleSelectTooth}
					isUnsharpActive={isUnsharpActive}
					onToggleUnsharp={onToggleUnsharp}
					crossSections={crossSections}
					activeCrossSection={activeCrossSection}
					activeCrossSectionIdx={activeCrossSectionIdx}
					onChangeCrossSectionIdx={onChangeCrossSectionIdx}
					activeTool={activeTool}
					onSelectTool={onSelectTool}
					rulers={rulers}
					onClearRulers={onClearRulers}
				/>
			) : studioMode === "implant" ? (
				<ImplantWorkspace
					volume={volume} renderers={renderers}
					activeViewport={activeViewport} setActiveViewport={setActiveViewport}
					maximizedViewport={maximizedViewport} handleToggleMaximize={handleToggleMaximize}
					mobileActiveTab={mobileActiveTab} patientDisplayName={patientDisplayName} activeCrossSection={activeCrossSection} activeCrossSectionIdx={activeCrossSectionIdx}
					crossSections={crossSections} onChangeCrossSectionIdx={onChangeCrossSectionIdx} crossSectionStepMm={crossSectionStepMm} onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
					archCurve={archCurve} jawType={jawType} onSwitchJaw={onSwitchJaw} handleSelectTooth={handleSelectTooth} selectedBrand={selectedBrand} onSelectBrand={onSelectBrand}
					selectedDiameterMm={selectedDiameterMm} onSelectDiameterMm={onSelectDiameterMm} selectedLengthMm={selectedLengthMm} onSelectLengthMm={onSelectLengthMm}
					displayBoneClass={displayBoneClass} displayMeanHU={displayMeanHU} displayTorque={displayTorque} displayNerveClearanceMm={displayNerveClearanceMm} displayDrillingProtocol={displayDrillingProtocol}
					nerveSafetyStatus={nerveSafetyStatus} handleExportToEmr={handleExportToEmr} handleExportToPlan={handleExportToPlan} isUnsharpActive={isUnsharpActive} onToggleUnsharp={onToggleUnsharp} crosshairMm={crosshairMm}
					windowWidth={windowWidth} windowLevel={windowLevel} implantEntryXOffsetMm={implantEntryXOffsetMm} onChangeImplantEntryXOffsetMm={onChangeImplantEntryXOffsetMm}
					implantEntryDepthMm={implantEntryDepthMm} onChangeImplantEntryDepthMm={onChangeImplantEntryDepthMm} implantAngulationDeg={implantAngulationDeg} onChangeImplantAngulationDeg={onChangeImplantAngulationDeg}
				/>
			) : (
				<MprQuadWorkspace
					volume={volume} renderers={renderers}
					activeViewport={activeViewport} setActiveViewport={setActiveViewport}
					maximizedViewport={maximizedViewport} handleToggleMaximize={handleToggleMaximize}
					mobileActiveTab={mobileActiveTab} patientDisplayName={patientDisplayName} viewLayout={viewLayout}
				/>
			)}
			{dicomLoadingStatus && volume && (
				<div
					className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-900/95 border border-cyan-500/50 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md pointer-events-none"
					data-testid="cbct-loading-status-overlay"
				>
					<RotateCcw className="w-4 h-4 animate-spin text-cyan-400" />
					<span>{dicomLoadingStatus} ({dicomProgress}%)</span>
				</div>
			)}
		</div>
	);
};

export default CbctMprViewportsGrid;
