import React, { useState } from "react";
import { Sparkles, Focus, ShieldCheck, Crosshair, ChevronRight } from "lucide-react";
import { EndoFileCanal, BoneDensityMisch } from "../../../icons/DentalIcons";
import type { WorkspaceCommonProps } from "./workspaceTypes";

export interface EndoWorkspaceProps extends WorkspaceCommonProps {
	readonly activeToothFdi?: string | number | undefined;
}

const COMMON_ENDO_TEETH = [16, 17, 26, 27, 36, 37, 46, 47, 14, 24, 34, 44] as const;

export const EndoWorkspace: React.FC<EndoWorkspaceProps> = ({
	renderers,
	maximizedViewport,
	mobileActiveTab,
	activeToothFdi,
	handleSelectTooth,
	isUnsharpActive = false,
	onToggleUnsharp,
	crossSections = [],
	activeCrossSectionIdx = 0,
	onChangeCrossSectionIdx,
}) => {
	const [activeCanal, setActiveCanal] = useState<string>("MB1");
	const selectedTooth = activeToothFdi ? Number.parseInt(String(activeToothFdi), 10) : 46;

	if (maximizedViewport) {
		return (
			<div className="flex-1 flex min-h-0 min-w-0 w-full h-full" data-testid="cbct-endo-maximized-grid">
				{maximizedViewport === "coronal" && renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "axial" && renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "panoramic" && renderers.renderVolume3D("flex-1 flex flex-col w-full h-full", { isEndoMode: true })}
				{maximizedViewport === "sagittal" && renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
			</div>
		);
	}

	return (
		<div
			className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-zinc-950"
			data-testid="cbct-workspace-endo-root"
		>
			{/* Top Toolstrip: Tooth Selector & Endo Macro Automation */}
			<div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/90 border border-emerald-500/40 rounded-lg shrink-0 gap-2 shadow-md">
				<div className="flex items-center gap-2 min-w-0 overflow-x-auto">
					<div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs shrink-0">
						<EndoFileCanal className="w-4 h-4 text-emerald-400" />
						<span className="hidden sm:inline">Эндодонтия:</span>
						<span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs border border-emerald-500/40">
							Зуб {selectedTooth}
						</span>
					</div>

					<div className="h-4 w-px bg-zinc-700 shrink-0" />

					{/* Fast Tooth Switcher FDI for Endo */}
					<div className="flex items-center gap-1 overflow-x-auto">
						{COMMON_ENDO_TEETH.map((tooth) => {
							const isSel = tooth === selectedTooth;
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => handleSelectTooth?.(tooth)}
									className={`px-1.5 py-0.5 rounded text-[11px] font-bold font-mono transition-colors cursor-pointer ${
										isSel
											? "bg-emerald-600 text-white shadow-xs border border-emerald-400"
											: "bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700/60"
									}`}
									title={`Фокус на зуб ${tooth} и центровка верхушки апекса`}
									data-testid={`cbct-endo-tooth-btn-${tooth}`}
								>
									{tooth}
								</button>
							);
						})}
					</div>
				</div>

				{/* Right: Unsharp Hardware Filter Toggle + MB2 Search Status */}
				<div className="flex items-center gap-2 shrink-0">
					{onToggleUnsharp && (
						<button
							type="button"
							onClick={onToggleUnsharp}
							className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
								isUnsharpActive
									? "bg-amber-950/50 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
									: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-100"
							}`}
							data-testid="cbct-endo-unsharp-toggle-btn"
							title="Контурная резкость верхушек корней и скрытых каналов"
						>
							<BoneDensityMisch className="w-3.5 h-3.5 text-amber-400" />
							<span className="hidden sm:inline">Резкость корня:</span>
							<span className="font-mono text-[10px] font-bold">
								{isUnsharpActive ? "SHARP ON" : "RAW VOXEL"}
							</span>
						</button>
					)}
				</div>
			</div>

			{/* Main Grid: 3 Viewports + Endo Diagnostics Panel */}
			<div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-1 min-h-0">
				{/* Top-Left: Paraxial Root Long-Axis View (Coronal / Oblique tilted along root) */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-emerald-500/40 bg-black ${
						mobileActiveTab === "coronal" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-endo-paraxial-viewport"
				>
					<div className="absolute top-2 left-2 z-30 pointer-events-none bg-zinc-950/85 px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] text-emerald-300 font-bold backdrop-blur-md">
						1. Продольная ось корня (Paraxial)
					</div>
					{renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Top-Right: Cross-Axial Root Canal View (Cross-section or axial channel slice) */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-cyan-500/40 bg-black ${
						mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-endo-crossaxial-viewport"
				>
					<div className="absolute top-2 left-2 z-30 pointer-events-none bg-zinc-950/85 px-2 py-0.5 rounded border border-cyan-500/40 text-[10px] text-cyan-300 font-bold backdrop-blur-md">
						2. Поперечный срез канала (MB1/MB2/D)
					</div>
					{renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Bottom-Left: Local 3D High-Res Zoom Cube */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-purple-500/40 bg-black ${
						mobileActiveTab === "panoramic" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-endo-3d-zoom-viewport"
				>
					<div className="absolute top-2 left-2 z-30 pointer-events-none bg-zinc-950/85 px-2 py-0.5 rounded border border-purple-500/40 text-[10px] text-purple-300 font-bold backdrop-blur-md">
						3. Локальный 3D куб зуба (High-Res Voxel)
					</div>
					{renderers.renderVolume3D("flex-1 flex flex-col w-full h-full", { isEndoMode: true })}
				</div>

				{/* Bottom-Right: Clinical Endodontic Canal Diagnostic Station */}
				<div
					className="flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-950 p-3 gap-2"
					data-testid="cbct-endo-station-panel"
				>
					<div className="flex items-center justify-between border-b border-zinc-800 pb-2">
						<div className="flex items-center gap-1.5">
							<Focus className="w-4 h-4 text-emerald-400" />
							<h3 className="text-xs font-bold text-zinc-100">
								Анатомия корневых каналов зуба {selectedTooth}
							</h3>
						</div>
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
							Апекс: 21.5 мм
						</span>
					</div>

					{/* Canal Channels Matrix */}
					<div className="grid grid-cols-2 gap-2 text-xs">
						{[
							{ id: "MB1", name: "Медиально-щечный 1 (MB1)", status: "Проходим", length: "21.0 мм", curvature: "12°" },
							{ id: "MB2", name: "Скрытый МВ2 канал", status: "Выявлен (КЛКТ)", length: "20.5 мм", curvature: "24°" },
							{ id: "DB", name: "Дистально-щечный (DB)", status: "Проходим", length: "19.5 мм", curvature: "8°" },
							{ id: "P", name: "Небный канал (Palatal)", status: "Широкий", length: "22.5 мм", curvature: "4°" },
						].map((canal) => (
							<div
								key={canal.id}
								onClick={() => setActiveCanal(canal.id)}
								className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
									activeCanal === canal.id
										? "bg-emerald-950/30 border-emerald-500/70 shadow-sm"
										: "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-bold text-zinc-200">{canal.id}</span>
									<span className={`text-[10px] font-bold px-1 rounded ${
										canal.id === "MB2" ? "bg-amber-500/25 text-amber-300" : "bg-emerald-500/25 text-emerald-300"
									}`}>
										{canal.status}
									</span>
								</div>
								<div className="text-[11px] text-zinc-400">{canal.name}</div>
								<div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
									<span>Длина: {canal.length}</span>
									<span>Изгиб: {canal.curvature}</span>
								</div>
							</div>
						))}
					</div>

					{/* Protocol Note for 043/u */}
					<div className="mt-auto p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-2">
						<ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
						<div>
							<span className="font-bold text-emerald-300 block">Диагностическая находка КЛКТ:</span>
							<span>Канал MB2 четко визуализируется в устьевой трети на расстоянии 1.8 мм от MB1 к небной стороне. Периапикальный периодонтит К04.5 отсутствует.</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
