import React from "react";
import { Spline, Layers, Sparkles } from "lucide-react";
import type { WorkspaceCommonProps } from "./workspaceTypes";
import { PanoramicCrossSectionGrid } from "./PanoramicCrossSectionGrid";

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
						className="flex-1 flex flex-col w-full h-full"
					/>
				)}
				{maximizedViewport === "coronal" && renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "sagittal" && renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
			</div>
		);
	}

	return (
		<div
			className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-black"
			style={{ backgroundColor: "#000000" }}
			data-testid="cbct-workspace-panoramic-root"
		>
			{/* Top Half: Dominant Panoramic Viewport (ОПТГ) with Non-overlapping Control Bar */}
			<div
				className="flex-1 min-h-[45%] max-h-[55%] flex flex-col rounded-md overflow-hidden border border-purple-500/30 bg-black shadow-lg"
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

					{/* Right: Low-contrast, compact Slab Slider & Sharpness Toggle */}
					<div className="flex items-center gap-2">
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
					</div>
				</div>

				{/* OPG Viewport Canvas Area (100% clean, zero control overlap on teeth) */}
				<div className="flex-1 relative flex flex-col min-h-0 w-full h-full bg-black">
					{renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
				</div>
			</div>

			{/* Bottom Half: 2 Equal Columns (Quarter screen each) */}
			{/* Left Quarter: Axial Slice with Arch & Physical Jaw Switcher */}
			{/* Right Quarter: Multi-Slice Alveolar Ridge Cross-Sections (2 Rows Gallery) */}
			<div className="flex-1 min-h-[45%] grid grid-cols-1 lg:grid-cols-2 gap-1 min-w-0">
				{/* Bottom-Left: Axial Slice of the Active Jaw */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-cyan-500/40 bg-black ${
						mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"
					}`}
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

				{/* Bottom-Right: Multi-Slice Alveolar Ridge Cross-Sections (2 Rows Gallery) */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-amber-500/30 bg-black ${
						mobileActiveTab === "panoramic" ? "flex" : "hidden lg:flex"
					}`}
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
					/>
				</div>
			</div>
		</div>
	);
};
