import React from "react";
import { Spline, Layers, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { WorkspaceCommonProps } from "./workspaceTypes";

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

const MAXILLARY_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const MANDIBULAR_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

export const PanoramicWorkspace: React.FC<PanoramicWorkspaceProps> = ({
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
	handleSelectTooth,
	isUnsharpActive = false,
	onToggleUnsharp,
	windowWidth = 2200,
	onChangeWindowWidth,
	windowLevel = 450,
	onChangeWindowLevel,
	slabThicknessMm = 1.0,
	onChangeSlabThicknessMm,
	slabMode = "single",
	onChangeSlabMode,
	panoThicknessMm = 3.0,
	onChangePanoThicknessMm,
	panoProjectionMode = "ray_sum",
	onChangePanoProjectionMode,
	onSelectClinicalPreset,
	activePresetId,
}) => {
	const activeTeeth = jawType === "maxilla" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
	const activeFdiStr = activeCrossSection?.nearestToothFdi ? String(activeCrossSection.nearestToothFdi) : null;

	if (maximizedViewport) {
		return (
			<div className="flex-1 flex min-h-0 min-w-0 w-full h-full" data-testid="cbct-pano-maximized-grid">
				{maximizedViewport === "panoramic" && renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "axial" && renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "cross_section" && renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", true)}
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
			{/* Top Half: Dominant Panoramic Viewport (ОПТГ) */}
			<div
				className="flex-1 min-h-[45%] max-h-[55%] relative flex flex-col rounded-md overflow-hidden border border-purple-500/40 bg-black shadow-lg"
				style={{ backgroundColor: "#000000" }}
				data-testid="cbct-panoramic-dominant-container"
			>
				{/* Top-Left HUD Badge: Quiet Clinical Info */}
				<div
					className="absolute top-2 left-2 z-30 pointer-events-auto flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-zinc-800 text-[11px] text-zinc-300 font-medium"
					data-testid="cbct-pano-quiet-hud-chip"
				>
					<Spline className="w-3.5 h-3.5 text-purple-400" />
					<span className="font-semibold text-zinc-200">Панорама ОПТГ</span>
					<span className="text-zinc-600">•</span>
					<span className="font-mono text-zinc-300">Слой {(panoThicknessMm ?? slabThicknessMm).toFixed(1)} мм</span>
					<span className="text-zinc-600">•</span>
					<span className="text-purple-300">
						{panoProjectionMode === "single" ? "Тонкий срез" : panoProjectionMode === "average" ? "Мягкий (Avg)" : "Ray-Sum"}
					</span>
				</div>

				{/* Top HUD Controls: Unsharp Masking Toggle & Diagnostic Shortcuts */}
				<div className="absolute top-2 right-28 z-30 flex items-center gap-1.5 pointer-events-auto">
					{onToggleUnsharp && (
						<div className="flex items-center gap-1 bg-zinc-950/90 border border-zinc-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md">
							<button
								type="button"
								onClick={onToggleUnsharp}
								className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
									isUnsharpActive
										? "bg-amber-950/70 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
										: "bg-zinc-900/90 text-zinc-400 border-zinc-700 hover:text-zinc-100"
								}`}
								data-testid="cbct-pano-unsharp-toggle-btn"
								title="Контурная резкость ОПТГ (Unsharp Masking для дентальной панорамы)"
							>
								<Sparkles className="w-3.5 h-3.5 text-amber-400" />
								<span className="hidden sm:inline">Резкость ОПТГ:</span>
								<span className="font-mono text-[10px] font-bold">
									{isUnsharpActive ? "SHARP (60%)" : "RAW VOXEL"}
								</span>
							</button>
						</div>
					)}
				</div>

				{/* Centered Interactive FDI Tooth Markers Ribbon along bottom of OPG viewport */}
				{handleSelectTooth && (
					<div
						className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-zinc-950/90 border border-zinc-700/80 rounded-lg px-2 py-1 shadow-2xl backdrop-blur-md pointer-events-auto max-w-[95%] overflow-x-auto"
						data-testid="cbct-pano-interactive-tooth-markers"
						role="toolbar"
						aria-label="Интерактивные маркеры зубов ОПТГ"
					>
						{activeTeeth.map((tooth) => {
							const isSelected = activeFdiStr === String(tooth);
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => handleSelectTooth(tooth)}
									className={`h-6 min-w-[26px] px-1.5 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-all cursor-pointer ${
										isSelected
											? "bg-purple-600 text-white border border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.8)] scale-105 z-10"
											: "bg-zinc-900/90 hover:bg-purple-950 text-zinc-300 hover:text-white border border-zinc-700/60 hover:border-purple-400"
									}`}
									title={`Зуб #${tooth}: клик для фокусировки 3D-прицела и открытия кросс-секции`}
									aria-label={`Зуб FDI ${tooth}`}
									aria-pressed={isSelected}
									data-testid={`cbct-pano-marker-tooth-${tooth}`}
								>
									{tooth}
								</button>
							);
						})}
					</div>
				)}

				{renderers.renderPanoramic("flex-1 flex flex-col w-full h-full")}
			</div>

			{/* Bottom Half: 2 Equal Columns (Quarter screen each) */}
			{/* Left Quarter: Axial Slice with Arch & Physical Jaw Switcher */}
			{/* Right Quarter: Cross-Sections with Tooth Navigator */}
			<div className="flex-1 min-h-[45%] grid grid-cols-1 lg:grid-cols-2 gap-1 min-w-0">
				{/* Bottom-Left: Axial Slice of the Active Jaw */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-cyan-500/40 bg-black ${
						mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"
					}`}
					style={{ backgroundColor: "#000000" }}
					data-testid="cbct-panoramic-axial-quadrant"
				>
					{/* Top Overlay: Physical Jaw Switcher [В/Ч (Maxilla)] / [Н/Ч (Mandible)] */}
					<div className="absolute top-9 left-2 z-30 pointer-events-auto flex items-center gap-1 bg-zinc-950/90 border border-zinc-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md">
						<button
							type="button"
							onClick={() => onSwitchJaw?.("maxilla")}
							className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								jawType === "maxilla"
									? "bg-purple-600 text-white shadow-xs border border-purple-400"
									: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
							}`}
							data-testid="cbct-jaw-switch-maxilla-btn"
							title="Верхняя челюсть (Maxilla): переключить Z-срез на верхнюю дугу"
						>
							<Layers className="w-3.5 h-3.5 text-purple-300" />
							<span>В/Ч (Maxilla)</span>
						</button>
						<button
							type="button"
							onClick={() => onSwitchJaw?.("mandible")}
							className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								jawType === "mandible"
									? "bg-cyan-600 text-white shadow-xs border border-cyan-400"
									: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
							}`}
							data-testid="cbct-jaw-switch-mandible-btn"
							title="Нижняя челюсть (Mandible): переключить Z-срез на нижнюю дугу"
						>
							<Layers className="w-3.5 h-3.5 text-cyan-300" />
							<span>Н/Ч (Mandible)</span>
						</button>
					</div>

					{renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Bottom-Right: Cross-Sections of Alveolar Ridge */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-amber-500/40 bg-black ${
						mobileActiveTab === "panoramic" ? "flex" : "hidden lg:flex"
					}`}
					style={{ backgroundColor: "#000000" }}
					data-testid="cbct-panoramic-cross-section-quadrant"
				>
					{/* Top Overlay: Cross Section Stepper & Tooth Indicator */}
					{crossSections.length > 0 && onChangeCrossSectionIdx && (
						<div className="absolute top-9 left-2 z-30 pointer-events-auto flex items-center gap-1 bg-zinc-950/90 border border-zinc-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md text-xs">
							<button
								type="button"
								onClick={() => onChangeCrossSectionIdx(Math.max(0, activeCrossSectionIdx - 1))}
								disabled={activeCrossSectionIdx <= 0}
								className="p-1 rounded hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
								title="Предыдущий срез"
								data-testid="cbct-cross-prev-btn"
							>
								<ChevronLeft className="w-3.5 h-3.5" />
							</button>

							<span className="font-mono px-1.5 text-amber-300 font-bold whitespace-nowrap">
								{activeCrossSectionIdx + 1} / {crossSections.length}
							</span>

							<button
								type="button"
								onClick={() => onChangeCrossSectionIdx(Math.min(crossSections.length - 1, activeCrossSectionIdx + 1))}
								disabled={activeCrossSectionIdx >= crossSections.length - 1}
								className="p-1 rounded hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
								title="Следующий срез"
								data-testid="cbct-cross-next-btn"
							>
								<ChevronRight className="w-3.5 h-3.5" />
							</button>

							{activeCrossSection?.nearestToothFdi && (
								<span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
									Зуб {activeCrossSection.nearestToothFdi}
								</span>
							)}
						</div>
					)}

					{renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", false)}
				</div>
			</div>
		</div>
	);
};
