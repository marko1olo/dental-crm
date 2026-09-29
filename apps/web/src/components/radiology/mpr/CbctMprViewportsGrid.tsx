import React, { useEffect, useRef, useState } from "react";
import { Box, FolderOpen, RotateCcw, Sparkles, Spline, UploadCloud } from "lucide-react";
import type {
	CbctVoxelVolume,
	CbctViewportType,
	MprPlane,
	Point3D,
	SlabProjectionMode,
	ObliqueRotationAngles,
	RotationHandlePosition,
	ViewportTransform,
} from "../cbctMprMath";
import { resetPlaneObliqueAngle } from "../cbctMprMath";
import type { CrossSectionSliceData } from "../dentalCurveEngine";
import { CbctViewportHud } from "../CbctViewportHud";
import type { StudioMode, ViewLayoutMode } from "./cbctStudioTypes";
import { CbctVolume3DViewport } from "./CbctVolume3DViewport";

export interface CbctMprViewportsGridProps {
	readonly isSidebarOpen: boolean;
	readonly mobileActiveTab: string;
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
	readonly axialBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly axialOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly coronalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly coronalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly sagittalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly sagittalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
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
	readonly dragImplantPart: string | null;
	readonly hoveredImplantPart: string | null;
	readonly activeCrossSection: CrossSectionSliceData | null | undefined;
	readonly activeCrossSectionIdx: number;
	readonly crossSections: CrossSectionSliceData[];
	readonly onLoadDemoVolume?: (() => void) | undefined;
}

export const CbctMprViewportsGrid: React.FC<CbctMprViewportsGridProps> = ({
	isSidebarOpen,
	mobileActiveTab,
	onSelectMobileTab,
	hoveredViewport,
	onHoverViewport,
	showEdgeRulers = false,
	volume,
	dicomLoadingStatus,
	dicomProgress,
	maximizedViewport,
	viewLayout,
	studioMode,
	onSelectStudioMode,
	folderInputRef,
	zipInputRef,
	handleDicomFilesChange,
	onLoadDemoVolume,
	activeViewport,
	setActiveViewport,
	handleToggleMaximize,
	axialBaseCanvasRef,
	axialOverlayCanvasRef,
	coronalBaseCanvasRef,
	coronalOverlayCanvasRef,
	sagittalBaseCanvasRef,
	sagittalOverlayCanvasRef,
	panoBaseCanvasRef,
	panoOverlayCanvasRef,
	crossSectionBaseCanvasRef,
	crossSectionOverlayCanvasRef,
	handleCanvasDoubleClick,
	handleCanvasMouseDown,
	handleCanvasMouseMove,
	handleCanvasMouseUp,
	handleCanvasWheel,
	getCanvasCursor,
	crosshairMm,
	currentVoxel,
	slabMode,
	slabThicknessMm,
	obliqueAngles,
	setObliqueAngles,
	handleFullResetViewport,
	activeRotationHandle,
	isShiftRotating,
	hoveredHandle,
	transforms,
	windowWidth,
	windowLevel,
	renderViewportOverlays,
	handlePanoMouseDown,
	handlePanoMouseMove,
	handlePanoMouseUp,
	handleCrossSectionMouseDown,
	handleCrossSectionMouseMove,
	handleCrossSectionMouseUp,
	dragImplantPart,
	hoveredImplantPart,
	activeCrossSection,
	activeCrossSectionIdx,
	crossSections,
}) => {
	// 4th Quadrant display mode: defaults to "volume3d" so the surgeon immediately sees the 3D Skull in MPR
	const [fourthQuadrantMode, setFourthQuadrantMode] = useState<"volume3d" | "panoramic">("volume3d");

	useEffect(() => {
		if (studioMode === "panoramic") {
			setFourthQuadrantMode("panoramic");
		} else if (studioMode === "volume3d") {
			setFourthQuadrantMode("volume3d");
		}
	}, [studioMode]);

	// 4-Way Interactive 2x2 Grid Resizer State
	const [splitX, setSplitX] = useState<number>(0.5);
	const [splitY, setSplitY] = useState<number>(0.5);
	const [isDraggingSplitter, setIsDraggingSplitter] = useState<"x" | "y" | "center" | null>(null);
	const quadGridRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isDraggingSplitter) return;

		const handlePointerMove = (e: PointerEvent) => {
			if (!quadGridRef.current) return;
			const rect = quadGridRef.current.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;

			if (isDraggingSplitter === "x" || isDraggingSplitter === "center") {
				const relX = (e.clientX - rect.left) / rect.width;
				setSplitX(Math.max(0.20, Math.min(0.80, relX)));
			}
			if (isDraggingSplitter === "y" || isDraggingSplitter === "center") {
				const relY = (e.clientY - rect.top) / rect.height;
				setSplitY(Math.max(0.20, Math.min(0.80, relY)));
			}
		};

		const handlePointerUp = () => {
			setIsDraggingSplitter(null);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [isDraggingSplitter]);

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
			data-testid="cbct-viewport-container-axial"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={axialBaseCanvasRef}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={axialOverlayCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("axial", e)}
					onMouseDown={(e) => handleCanvasMouseDown("axial", e)}
					onMouseMove={(e) => handleCanvasMouseMove("axial", e)}
					onMouseUp={handleCanvasMouseUp}
					onWheel={(e) => handleCanvasWheel("axial", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ cursor: getCanvasCursor("axial") }}
					className="absolute inset-0 w-full h-full object-contain z-10"
				/>
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
					{renderViewportOverlays("axial")}
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
			data-testid="cbct-viewport-container-coronal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={coronalBaseCanvasRef}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={coronalOverlayCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("coronal", e)}
					onMouseDown={(e) => handleCanvasMouseDown("coronal", e)}
					onMouseMove={(e) => handleCanvasMouseMove("coronal", e)}
					onMouseUp={handleCanvasMouseUp}
					onWheel={(e) => handleCanvasWheel("coronal", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ cursor: getCanvasCursor("coronal") }}
					className="absolute inset-0 w-full h-full object-contain z-10"
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
					{renderViewportOverlays("coronal")}
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
			data-testid="cbct-viewport-container-sagittal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={sagittalBaseCanvasRef}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
				/>
				<canvas
					ref={sagittalOverlayCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("sagittal", e)}
					onMouseDown={(e) => handleCanvasMouseDown("sagittal", e)}
					onMouseMove={(e) => handleCanvasMouseMove("sagittal", e)}
					onMouseUp={handleCanvasMouseUp}
					onWheel={(e) => handleCanvasWheel("sagittal", e)}
					onContextMenu={(e) => e.preventDefault()}
					style={{ cursor: getCanvasCursor("sagittal") }}
					className="absolute inset-0 w-full h-full object-contain z-10"
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
					{renderViewportOverlays("sagittal")}
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
				className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
					fourthQuadrantMode === "volume3d"
						? "bg-cyan-600 text-white shadow-xs"
						: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
				}`}
				data-testid="cbct-btn-mode-volume3d"
				title="3D Объем / Череп: интерактивная трехмерная реконструкция костной ткани"
			>
				<Box className="w-3 h-3 text-cyan-300" />
				<span>3D Объем / Череп</span>
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setFourthQuadrantMode("panoramic");
					onSelectStudioMode?.("panoramic");
				}}
				className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
					fourthQuadrantMode === "panoramic"
						? "bg-purple-600 text-white shadow-xs"
						: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
				}`}
				data-testid="cbct-btn-mode-panoramic"
				title="Ортопантомограмма (ОПТГ): развернутая зубная панорама и кросс-секции"
			>
				<Spline className="w-3 h-3 text-purple-300" />
				<span>Панорама ОПТГ</span>
			</button>
		</div>
	);

	const renderPanoramicViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("panoramic")}
			onPointerDownCapture={() => setActiveViewport("panoramic")}
			onMouseEnter={() => onHoverViewport?.("panoramic")}
			onMouseLeave={() => onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "panoramic"
					? "ring-1 ring-purple-500/50 border border-purple-500/80 shadow-purple-950/30"
					: "border border-purple-500/30 hover:border-purple-500/60"
			} ${extraClassName}`}
			data-testid="cbct-viewport-container-panoramic"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				{/* Top-left Mode Switcher */}
				<div className="absolute top-2 left-2 z-20 pointer-events-auto">
					{renderFourthQuadrantSwitcher()}
				</div>
				<canvas
					ref={panoBaseCanvasRef}
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
					{renderViewportOverlays("panoramic")}
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
				/>
			);
		}

		return renderPanoramicViewport(extraClassName);
	};

	const renderCrossSectionMaximizedViewport = () => (
		<div
			onDoubleClick={() => handleToggleMaximize("cross_section")}
			onPointerDownCapture={() => setActiveViewport("cross_section")}
			onMouseEnter={() => onHoverViewport?.("cross_section")}
			onMouseLeave={() => onHoverViewport?.(null)}
			className={`relative bg-black rounded-md overflow-hidden transition-all flex-1 flex flex-col min-h-0 w-full h-full ${
				activeViewport === "cross_section"
					? "ring-1 ring-amber-500/50 border border-amber-500/80 shadow-amber-950/30"
					: "border border-amber-500/30 hover:border-amber-500/60"
			}`}
			data-testid="cbct-viewport-container-cross-section"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={crossSectionBaseCanvasRef}
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
					isMaximized={true}
					onToggleMaximize={() => handleToggleMaximize("cross_section")}
					zoomFactor={transforms.cross_section?.zoom}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
				>
					{renderViewportOverlays("cross_section")}
				</CbctViewportHud>
			</div>
		</div>
	);

	return (
		<div className={`${isSidebarOpen ? "lg:col-span-8" : "lg:col-span-12"} ${mobileActiveTab === "planner" ? "hidden lg:flex" : "flex-1 flex flex-col"} min-h-0 min-w-0 w-full h-full transition-all relative`}>
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
						className={`flex-1 min-w-[56px] py-1.5 px-2 text-xs font-semibold rounded transition-colors text-center cursor-pointer ${
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
				<div
					className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 border border-dashed border-zinc-800 rounded-lg m-1 select-none"
					data-testid="cbct-empty-volume-dropzone"
					onDragOver={(e) => e.preventDefault()}
					onDrop={(e) => {
						e.preventDefault();
						if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
							handleDicomFilesChange(e.dataTransfer.files);
						}
					}}
				>
					{dicomLoadingStatus ? (
						<div className="flex flex-col items-center justify-center gap-3">
							<div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-inner">
								<RotateCcw className="w-6 h-6 animate-spin text-cyan-400" />
							</div>
							<h3 className="text-sm font-bold text-zinc-100 mb-1">
								{dicomLoadingStatus}
							</h3>
							<div className="w-64 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
								<div
									className="h-full bg-cyan-500 transition-all duration-200"
									style={{ width: `${Math.max(5, Math.min(100, dicomProgress))}%` }}
								/>
							</div>
							<span className="text-xs font-mono text-zinc-400">{dicomProgress}%</span>
						</div>
					) : (
						<>
							<div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
								<Box className="w-6 h-6" />
							</div>
							<h3 className="text-sm font-bold text-[var(--ink,#f4f4f5)] mb-1">
								Исследование КЛКТ не загружено
							</h3>
							<p className="text-xs text-[var(--muted,#a1a1aa)] max-w-md mb-4">
								Перетащите папку со срезами DICOM (.dcm) или архив .zip сюда, либо выберите файлы для построения мультипланарной реконструкции (MPR) и имплантологического планирования.
							</p>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => folderInputRef.current?.click()}
									className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer min-h-[36px]"
									data-testid="cbct-btn-select-folder-empty"
								>
									<FolderOpen className="w-4 h-4" />
									<span>Выбрать папку DICOM</span>
								</button>
								<button
									type="button"
									onClick={() => zipInputRef.current?.click()}
									className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer min-h-[36px]"
									data-testid="cbct-btn-select-zip-empty"
								>
									<UploadCloud className="w-4 h-4" />
									<span>Загрузить .ZIP</span>
								</button>
								{onLoadDemoVolume && (
									<button
										type="button"
										onClick={onLoadDemoVolume}
										className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-dashed border-zinc-600 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer min-h-[36px]"
										data-testid="cbct-btn-load-demo-volume"
									>
										<Sparkles className="w-4 h-4 text-cyan-400" />
										<span>Показать демо КТ-исследование</span>
									</button>
								)}
							</div>
						</>
					)}
				</div>
			) : maximizedViewport !== null ? (
				<div className="flex-1 flex flex-col min-h-0 w-full h-full">
					{maximizedViewport === "axial" && renderAxialViewport("flex-1 flex flex-col w-full h-full")}
					{maximizedViewport === "coronal" && renderCoronalViewport("flex-1 flex flex-col w-full h-full")}
					{maximizedViewport === "sagittal" && renderSagittalViewport("flex-1 flex flex-col w-full h-full")}
					{maximizedViewport === "panoramic" && renderFourthQuadrantViewport("flex-1 flex flex-col w-full h-full")}
					{maximizedViewport === "cross_section" && renderCrossSectionMaximizedViewport()}
				</div>
			) : viewLayout === "mpr_3_view" ? (
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-1 min-h-0 min-w-0 w-full h-full" data-testid="cbct-mpr-3-view-grid">
					{renderAxialViewport(mobileActiveTab === "axial" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
					{renderCoronalViewport(mobileActiveTab === "coronal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
					{renderSagittalViewport(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
				</div>
			) : viewLayout === "layout_1_plus_3" ? (
				<div className="flex-1 grid grid-cols-12 gap-1 min-h-0 min-w-0 w-full h-full">
					<div className={`col-span-12 lg:col-span-8 min-h-0 min-w-0 w-full h-full ${mobileActiveTab === "axial" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
						{renderAxialViewport("flex-1 flex flex-col w-full h-full")}
					</div>
					<div className="col-span-12 lg:col-span-4 min-h-0 min-w-0 w-full h-full flex flex-col lg:grid lg:grid-rows-3 gap-1">
						{renderCoronalViewport(mobileActiveTab === "coronal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
						{renderSagittalViewport(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
						{renderFourthQuadrantViewport(mobileActiveTab === "panoramic" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
					</div>
				</div>
			) : (
				<div
					ref={quadGridRef}
					className="flex-1 relative min-h-0 min-w-0 w-full h-full select-none"
					data-testid="cbct-mpr-quad-grid"
				>
					{/* Single Unified Responsive 2x2 Grid: eliminates duplicate canvas DOM mounting that overwrites canvas refs */}
					<div
						className="grid w-full h-full gap-1 grid-cols-1 lg:grid-cols-2"
						style={{
							gridTemplateColumns: `${(splitX * 100).toFixed(2)}% calc(${((1 - splitX) * 100).toFixed(2)}% - 4px)`,
							gridTemplateRows: `${(splitY * 100).toFixed(2)}% calc(${((1 - splitY) * 100).toFixed(2)}% - 4px)`,
						}}
					>
						{renderAxialViewport(mobileActiveTab === "axial" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
						{renderCoronalViewport(mobileActiveTab === "coronal" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
						{renderSagittalViewport(mobileActiveTab === "sagittal" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
						{renderFourthQuadrantViewport(mobileActiveTab === "panoramic" ? "flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col w-full h-full")}
					</div>

					{/* Interactive Splitter Controls (Desktop only) */}
					{/* 1. Vertical Splitter Bar */}
					<div
						onPointerDown={(e) => {
							e.preventDefault();
							setIsDraggingSplitter("x");
						}}
						style={{ left: `calc(${(splitX * 100).toFixed(2)}% - 3px)` }}
						className="hidden lg:block absolute top-0 bottom-0 w-1.5 cursor-col-resize z-30 group"
						title="Перетащите для изменения ширины окон (двойной клик — сброс 50%)"
						onDoubleClick={() => setSplitX(0.5)}
					>
						<div className="w-0.5 h-full mx-auto bg-zinc-800 group-hover:bg-cyan-500/80 transition-colors" />
					</div>

					{/* 2. Horizontal Splitter Bar */}
					<div
						onPointerDown={(e) => {
							e.preventDefault();
							setIsDraggingSplitter("y");
						}}
						style={{ top: `calc(${(splitY * 100).toFixed(2)}% - 3px)` }}
						className="hidden lg:block absolute left-0 right-0 h-1.5 cursor-row-resize z-30 group"
						title="Перетащите для изменения высоты окон (двойной клик — сброс 50%)"
						onDoubleClick={() => setSplitY(0.5)}
					>
						<div className="h-0.5 w-full my-auto bg-zinc-800 group-hover:bg-cyan-500/80 transition-colors" />
					</div>

					{/* 3. Central 4-Way Crosshair Splitter Knob */}
					<div
						onPointerDown={(e) => {
							e.preventDefault();
							setIsDraggingSplitter("center");
						}}
						onDoubleClick={() => {
							setSplitX(0.5);
							setSplitY(0.5);
						}}
						style={{
							left: `calc(${(splitX * 100).toFixed(2)}% - 7px)`,
							top: `calc(${(splitY * 100).toFixed(2)}% - 7px)`,
						}}
						className="hidden lg:flex absolute w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-cyan-400 hover:bg-cyan-950 items-center justify-center cursor-move z-40 shadow-md group transition-transform hover:scale-125"
						title="4-сторонний сплиттер: перетащите для изменения размеров окон (двойной клик — сброс 50/50)"
						data-testid="cbct-mpr-grid-splitter-knob"
					>
						<div className="w-1 h-1 rounded-full bg-zinc-400 group-hover:bg-cyan-400" />
					</div>
				</div>
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
