import React, { useState, useRef, useEffect } from "react";
import { Spline, Layers, Sparkles, Grid2X2, Maximize2, Minimize2 } from "lucide-react";
import type { WorkspaceCommonProps } from "./workspaceTypes";
import { PanoramicCrossSectionGrid } from "./PanoramicCrossSectionGrid";
import { CbctPanoramicFdiRibbon } from "../CbctPanoramicFdiRibbon";

export interface PanoramicWorkspaceProps extends WorkspaceCommonProps {
	readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly onSwitchJaw?: ((jaw: "mandible" | "maxilla") => void) | undefined;
	readonly onChangeWindowWidth?: ((w: number) => void) | undefined;
	readonly onChangeWindowLevel?: ((l: number) => void) | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly onChangeSlabThicknessMm?: ((th: number) => void) | undefined;
	readonly slabMode?: string | undefined;
	readonly onChangeSlabMode?: ((mode: any) => void) | undefined;
	readonly panoThicknessMm?: number | undefined;
	readonly onChangePanoThicknessMm?: ((th: number) => void) | undefined;
	readonly panoProjectionMode?: string | undefined;
	readonly onChangePanoProjectionMode?: ((mode: string) => void) | undefined;
	readonly onSelectClinicalPreset?: ((presetId: string) => void) | undefined;
	readonly activePresetId?: string | undefined;
}

export const PanoramicWorkspace: React.FC<PanoramicWorkspaceProps> = ({
	volume,
	renderers,
	maximizedViewport,
	handleToggleMaximize,
	mobileActiveTab,
	jawType = "mandible",
	onSwitchJaw,
	archCurve,
	activeCrossSection,
	activeCrossSectionIdx = 0,
	crossSections = [],
	onChangeCrossSectionIdx,
	crossSectionStepMm = 1.0,
	onChangeCrossSectionStepMm,
	handleSelectTooth,
	isUnsharpActive = false,
	onToggleUnsharp,
	windowWidth = 4025,
	onChangeWindowWidth,
	windowLevel = 525,
	onChangeWindowLevel,
	slabThicknessMm = 1.0,
	onChangeSlabThicknessMm,
	slabMode = "single",
	onChangeSlabMode,
	panoThicknessMm = 1.0,
	onChangePanoThicknessMm,
	panoProjectionMode = "average",
	onChangePanoProjectionMode,
	onSelectClinicalPreset,
	activePresetId,
}) => {
	// Ez3D-i canonical layout: "ez3d_split" (Axial + Panorama on left column, 3x3 Section Matrix on right)
	const [panoLayoutMode, setPanoLayoutMode] = useState<"ez3d_split" | "pano_top">("ez3d_split");

	// 50/50 Parity Splitter: left column (Scout Axial + Panorama OPG) >= 50% width by default
	const [splitRatio, setSplitRatio] = useState<number>(0.5);
	const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
	const panoRootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isDraggingSplitter) return;

		const handlePointerMove = (e: PointerEvent) => {
			if (!panoRootRef.current) return;
			const rect = panoRootRef.current.getBoundingClientRect();
			if (rect.width <= 0) return;
			const relX = (e.clientX - rect.left) / rect.width;
			// Guarantee doctor autonomy: minimum 0.35, maximum 0.75, defaults to 0.50
			setSplitRatio(Math.max(0.35, Math.min(0.75, relX)));
		};

		const handlePointerUp = () => {
			setIsDraggingSplitter(false);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [isDraggingSplitter]);

	if (maximizedViewport) {
		return (
			<div className="flex-1 flex min-h-0 min-w-0 w-full h-full" data-testid="cbct-pano-maximized-grid">
				{maximizedViewport === "panoramic" && renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "axial" && renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "cross_section" && (
					<PanoramicCrossSectionGrid
						volume={volume}
						archCurve={archCurve}
						activeCrossSection={activeCrossSection}
						activeCrossSectionIdx={activeCrossSectionIdx}
						crossSections={crossSections}
						onChangeCrossSectionIdx={onChangeCrossSectionIdx}
						crossSectionStepMm={crossSectionStepMm}
						onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
						windowWidth={windowWidth}
						windowLevel={windowLevel}
						jawType={jawType}
						onSwitchJaw={onSwitchJaw}
						className="flex-1 flex flex-col w-full h-full"
						isMaximized={true}
						onToggleMaximize={() => handleToggleMaximize?.("cross_section")}
					/>
				)}
				{maximizedViewport === "coronal" && renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "sagittal" && renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
			</div>
		);
	}

	const renderPanoramicQuadrant = (containerClass: string) => (
		<div
			onDoubleClick={(e) => {
				if ((e.target as HTMLElement).closest("button, input, select, a")) return;
				handleToggleMaximize?.("panoramic");
			}}
			className={`flex flex-col rounded-md overflow-hidden border border-purple-500/30 bg-black shadow-lg ${containerClass}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-panoramic-dominant-container"
		>
			{/* Dedicated Top Toolbar: Quiet Info & Compact Controls (Zero overlap on OPG canvas) */}
			<div className="h-7 px-2.5 bg-zinc-950/95 border-b border-zinc-850 flex items-center justify-between gap-2 text-xs text-zinc-400 shrink-0 select-none">
				{/* Left: Quiet Clinical Info Chip */}
				<div
					className="flex items-center gap-1.5"
					data-testid="cbct-pano-quiet-hud-chip"
				>
					<Spline className="w-3.5 h-3.5 text-purple-400 shrink-0" />
					<span className="font-semibold text-zinc-200 text-[11px]">Панорама ОПТГ</span>
					<span className="text-zinc-600">•</span>
					<span className="font-mono text-zinc-400 text-[11px]">
						Слой {(panoThicknessMm ?? slabThicknessMm).toFixed(1)} мм
					</span>
					<span className="text-zinc-600">•</span>
					<span className="text-purple-300/80 text-[10px]">
						{panoProjectionMode === "single" ? "Тонкий срез" : panoProjectionMode === "average" ? "Мягкий (Avg)" : "Ray-Sum"}
					</span>
				</div>

				{/* Right: Low-contrast, compact Slab Slider, Sharpness Toggle & Layout Switcher */}
				<div className="flex items-center gap-1.5">
					{onChangePanoThicknessMm && (
						<div className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 rounded px-2 py-0.5 text-[11px]">
							<Layers className="w-3 h-3 text-purple-400/80 shrink-0" />
							<span className="text-zinc-400 text-[10px] hidden sm:inline">Слой:</span>
							<input
								type="range"
								aria-label="Слой ОПТГ (1.0-16.0 мм)"
								min={1.0}
								max={16.0}
								step={0.5}
								value={panoThicknessMm ?? 1.0}
								onChange={(e) => onChangePanoThicknessMm(Number(e.target.value))}
								className="w-16 sm:w-20 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-purple-400"
								data-testid="cbct-pano-slab-slider"
							/>
							<span className="font-mono text-purple-300 font-medium text-[10px] min-w-[34px] text-right">
								{(panoThicknessMm ?? 1.0).toFixed(1)} мм
							</span>
						</div>
					)}

					{onToggleUnsharp && (
						<button
							type="button"
							onClick={onToggleUnsharp}
							className={`h-5.5 px-2 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
								isUnsharpActive
									? "bg-amber-950/40 text-amber-300 border-amber-600/50"
									: "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
							}`}
							data-testid="cbct-pano-unsharp-toggle-btn"
							title="Контурная резкость ОПТГ (Unsharp Masking)"
						>
							<Sparkles className="w-3 h-3 text-amber-400/80 shrink-0" />
							<span className="hidden md:inline">Резкость:</span>
							<span className="font-mono text-[9px]">
								{isUnsharpActive ? "SHARP" : "RAW"}
							</span>
						</button>
					)}

					{/* Ez3D-i «РАЗДЕЛ» Layout Mode Switcher */}
					<button
						type="button"
						onClick={() => setPanoLayoutMode((prev) => (prev === "ez3d_split" ? "pano_top" : "ez3d_split"))}
						className={`h-5.5 px-2 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
							panoLayoutMode === "ez3d_split"
								? "bg-amber-950/50 text-amber-300 border-amber-600/60 shadow-xs"
								: "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
						}`}
						data-testid="cbct-pano-layout-mode-btn"
						title={
							panoLayoutMode === "ez3d_split"
								? "Режим «РАЗДЕЛ» Ez3D-i: Аксиал+Панорама слева, Матрица 3×3 справа (клик — панорама вверху)"
								: "Классический режим: Панорама вверху, срезы внизу (клик — Раздел Ez3D-i)"
						}
					>
						<Grid2X2 className="w-3 h-3 text-amber-400/80 shrink-0" />
						<span className="font-mono text-[9.5px]">
							{panoLayoutMode === "ez3d_split" ? "РАЗДЕЛ 3×3" : "ПАНОРАМА"}
						</span>
					</button>

					{/* Maximize / Restore Button for Panorama */}
					{handleToggleMaximize && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleToggleMaximize("panoramic");
							}}
							className="h-5.5 px-2 rounded text-[10px] font-semibold flex items-center gap-1 border border-zinc-750 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors cursor-pointer"
							title={maximizedViewport === "panoramic" ? "Свернуть в сетку (двойной клик / Esc)" : "Развернуть на 100% (двойной клик)"}
							data-testid={maximizedViewport === "panoramic" ? "btn-viewport-collapse-panoramic" : "btn-viewport-expand-panoramic"}
							data-expand-testid="btn-viewport-expand-panoramic"
							data-collapse-testid="btn-viewport-collapse-panoramic"
							aria-label={maximizedViewport === "panoramic" ? "Свернуть панораму" : "Развернуть панораму"}
						>
							{maximizedViewport === "panoramic" ? (
								<>
									<Minimize2 className="w-3 h-3 text-purple-300" />
									<span className="font-mono text-[9px] hidden sm:inline">СВЕРНУТЬ</span>
								</>
							) : (
								<>
									<Maximize2 className="w-3 h-3 text-purple-300" />
									<span className="font-mono text-[9px] hidden sm:inline">100%</span>
								</>
							)}
						</button>
					)}
				</div>
			</div>
			{handleSelectTooth && (
				<CbctPanoramicFdiRibbon
					onSelectTooth={handleSelectTooth}
					archCurve={archCurve}
				/>
			)}

			{/* OPG Viewport Canvas Area (100% clean, zero control overlap on teeth) */}
			<div className="flex-1 relative flex flex-col min-h-0 w-full h-full bg-black">
				{renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
			</div>
		</div>
	);

	const renderAxialQuadrant = (containerClass: string) => (
		<div
			onDoubleClick={(e) => {
				if ((e.target as HTMLElement).closest("button, input, select, a")) return;
				handleToggleMaximize?.("axial");
			}}
			className={`flex flex-col min-h-0 min-w-0 relative rounded-md overflow-hidden border border-cyan-500/40 bg-black ${
				mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"
			} ${containerClass}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-panoramic-axial-quadrant"
		>
			{/* Top Overlay: Physical Jaw Switcher [ ВЧ | НЧ ] */}
			<div
				className="absolute top-9 left-2 z-30 pointer-events-auto inline-flex items-center bg-zinc-950/90 border border-zinc-800 rounded p-0.5 shadow-lg backdrop-blur-md gap-0.5 text-[11px]"
				role="group"
				aria-label="Выбор челюсти"
			>
				<button
					type="button"
					onClick={() => onSwitchJaw?.("maxilla")}
					className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
						jawType === "maxilla"
							? "bg-purple-950/70 text-purple-200 border border-purple-500/50 shadow-xs font-semibold"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					data-testid="cbct-jaw-switch-maxilla-btn"
					title="Верхняя челюсть (ВЧ): переключить дугу и Z-срез"
				>
					ВЧ
				</button>
				<button
					type="button"
					onClick={() => onSwitchJaw?.("mandible")}
					className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
						jawType === "mandible"
							? "bg-cyan-950/70 text-cyan-200 border border-cyan-500/50 shadow-xs font-semibold"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					data-testid="cbct-jaw-switch-mandible-btn"
					title="Нижняя челюсть (НЧ): переключить дугу и Z-срез"
				>
					НЧ
				</button>
			</div>

			{renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
		</div>
	);

	const renderCrossSectionQuadrant = (containerClass: string) => (
		<div
			className={`flex flex-col min-h-0 min-w-0 relative rounded-md overflow-hidden border border-amber-500/30 bg-black ${
				mobileActiveTab === "panoramic" ? "flex" : "hidden lg:flex"
			} ${containerClass}`}
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-panoramic-cross-section-quadrant"
		>
			<PanoramicCrossSectionGrid
				volume={volume}
				archCurve={archCurve}
				activeCrossSection={activeCrossSection}
				activeCrossSectionIdx={activeCrossSectionIdx}
				crossSections={crossSections}
				onChangeCrossSectionIdx={onChangeCrossSectionIdx}
				crossSectionStepMm={crossSectionStepMm}
				onChangeCrossSectionStepMm={onChangeCrossSectionStepMm}
				windowWidth={windowWidth}
				windowLevel={windowLevel}
				jawType={jawType}
				onSwitchJaw={onSwitchJaw}
				isMaximized={maximizedViewport === "cross_section"}
				onToggleMaximize={() => handleToggleMaximize?.("cross_section")}
			/>
		</div>
	);

	if (panoLayoutMode === "ez3d_split") {
		return (
			<div
				ref={panoRootRef}
				className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-black relative select-none"
				style={{ backgroundColor: "#000000" }}
				data-testid="cbct-workspace-panoramic-root"
			>
				{/* Left Column (Ez3D-i style): Axial Scout (Top) + Panorama OPG (Bottom) - 50% default width */}
				<div
					style={{ width: `calc(${(splitRatio * 100).toFixed(2)}% - 3px)` }}
					className="flex-1 lg:flex-initial flex flex-col gap-1 min-h-0 min-w-0 h-full"
					data-testid="cbct-pano-left-column"
				>
					{renderAxialQuadrant("flex-1 min-h-[45%]")}
					{renderPanoramicQuadrant("flex-1 min-h-[45%]")}
				</div>

				{/* Interactive Vertical Splitter between Left (Scout+OPG) and Right (Cross-Sections) */}
				<div
					onPointerDown={(e) => {
						e.preventDefault();
						setIsDraggingSplitter(true);
					}}
					style={{ left: `calc(${(splitRatio * 100).toFixed(2)}% - 3px)` }}
					className="hidden lg:block absolute top-0 bottom-0 w-1.5 cursor-col-resize z-30 group"
					title="Разделитель: перетащите для изменения ширины (двойной клик — сброс 50/50)"
					onDoubleClick={() => setSplitRatio(0.5)}
					data-testid="cbct-pano-vertical-splitter"
				>
					<div className="w-0.5 h-full mx-auto bg-zinc-800 group-hover:bg-amber-500/80 transition-colors" />
				</div>

				{/* Right Column (Ez3D-i style): 3x3 Alveolar Ridge Cross-Sections Gallery - 50% default width */}
				<div
					style={{ width: `calc(${((1 - splitRatio) * 100).toFixed(2)}% - 3px)` }}
					className="flex-1 lg:flex-initial flex flex-col min-h-0 min-w-0 h-full"
					data-testid="cbct-pano-right-column"
				>
					{renderCrossSectionQuadrant("flex-1 h-full")}
				</div>
			</div>
		);
	}

	return (
		<div
			className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-black"
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-workspace-panoramic-root"
		>
			{/* Top Half: Panoramic Viewport (Generous 50% height for maximum detail) */}
			{renderPanoramicQuadrant("flex-1 min-h-[48%] max-h-[52%]")}

			{/* Bottom Half: Axial Left + Cross-Sections Right (50/50 parity) */}
			<div className="flex-1 min-h-[48%] grid grid-cols-1 lg:grid-cols-2 gap-1 min-w-0">
				{renderAxialQuadrant("w-full h-full")}
				{renderCrossSectionQuadrant("w-full h-full")}
			</div>
		</div>
	);
};
