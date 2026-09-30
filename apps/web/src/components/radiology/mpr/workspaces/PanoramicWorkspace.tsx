import React, { useState } from "react";
import { Spline, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import type { WorkspaceCommonProps } from "./workspaceTypes";
import { CbctPanoramicFdiRibbon } from "../CbctPanoramicFdiRibbon";

export interface PanoramicWorkspaceProps extends WorkspaceCommonProps {
	readonly jawType?: "mandible" | "maxilla" | undefined;
	readonly onSwitchJaw?: ((jaw: "mandible" | "maxilla") => void) | undefined;
}

export const PanoramicWorkspace: React.FC<PanoramicWorkspaceProps> = ({
	renderers,
	maximizedViewport,
	mobileActiveTab,
	jawType,
	onSwitchJaw,
	archCurve,
	activeCrossSection,
	activeCrossSectionIdx = 0,
	crossSections = [],
	onChangeCrossSectionIdx,
	handleSelectTooth,
}) => {
	const [showFdiRibbon, setShowFdiRibbon] = useState<boolean>(false);

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
			className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-zinc-950"
			data-testid="cbct-workspace-panoramic-root"
		>
			{/* Optional FDI Tooth Navigation Ribbon */}
			{showFdiRibbon && handleSelectTooth && (
				<CbctPanoramicFdiRibbon
					activeToothFdi={activeCrossSection?.nearestToothFdi}
					onSelectTooth={handleSelectTooth}
					onClose={() => setShowFdiRibbon(false)}
					archCurve={archCurve}
				/>
			)}

			{/* Top Half: Dominant Panoramic Viewport (ОПТГ) */}
			<div
				className="flex-1 min-h-[45%] max-h-[55%] relative flex flex-col rounded-md overflow-hidden border border-purple-500/40 bg-black shadow-lg"
				data-testid="cbct-panoramic-dominant-container"
			>
				{/* Top-Right HUD Controls for Panorama Workspace */}
				<div className="absolute top-2 right-28 z-30 flex items-center gap-1.5 pointer-events-auto">
					{/* FDI Ribbon Toggle */}
					{handleSelectTooth && (
						<button
							type="button"
							onClick={() => setShowFdiRibbon((prev) => !prev)}
							className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
								showFdiRibbon
									? "bg-purple-600 text-white border-purple-400 shadow-xs"
									: "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-700 backdrop-blur-md"
							}`}
							data-testid="cbct-pano-toggle-fdi-btn"
							title={showFdiRibbon ? "Скрыть формулу FDI" : "Показать зубную формулу FDI"}
						>
							<Spline className="w-3.5 h-3.5 text-purple-300" />
							<span>FDI</span>
						</button>
					)}
				</div>

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
					data-testid="cbct-panoramic-axial-quadrant"
				>
					{/* Top Overlay: Physical Jaw Switcher [В/Ч (Maxilla)] / [Н/Ч (Mandible)] */}
					<div className="absolute top-2 left-2 z-30 pointer-events-auto flex items-center gap-1 bg-zinc-950/90 border border-zinc-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md">
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
					data-testid="cbct-panoramic-cross-section-quadrant"
				>
					{/* Top Overlay: Cross Section Stepper & Tooth Indicator */}
					{crossSections.length > 0 && onChangeCrossSectionIdx && (
						<div className="absolute top-2 left-2 z-30 pointer-events-auto flex items-center gap-1 bg-zinc-950/90 border border-zinc-700/80 rounded-lg p-0.5 shadow-xl backdrop-blur-md text-xs">
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
