import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Layers, Copy, Compass, Check, FilePlus } from "lucide-react";
import { EndoFileCanal } from "../../../icons/DentalIcons";
import type { WorkspaceCommonProps } from "./workspaceTypes";
import { EndoCompassPanel, type EndoCompassClinicalData } from "./EndoCompassPanel";
import { runEndoAnalysisForTooth, runEndoAnalysisForToothAsync } from "./endoCanalPipeline";
import {
	exportEndoToDiary043,
	exportEndoToTreatmentPlan,
} from "../../endoClinicalIntegrationBridge";

export interface EndoWorkspaceProps extends WorkspaceCommonProps {
	readonly activeToothFdi?: string | number | undefined;
}

const COMMON_ENDO_TEETH = [16, 17, 26, 27, 36, 37, 46, 47, 14, 24, 34, 44] as const;

export const EndoWorkspace: React.FC<EndoWorkspaceProps> = ({
	volume,
	renderers,
	maximizedViewport,
	mobileActiveTab,
	activeToothFdi,
	archCurve,
	patientId,
	patientDisplayName,
	handleSelectTooth,
	handleExportToEmr,
	handleExportToPlan,
}) => {
	const [selectedTooth, setSelectedTooth] = useState<number>(() =>
		activeToothFdi ? Number.parseInt(String(activeToothFdi), 10) : 36,
	);

	const prevPropToothRef = useRef<string | number | undefined>(activeToothFdi);
	useEffect(() => {
		if (activeToothFdi !== undefined && activeToothFdi !== prevPropToothRef.current) {
			prevPropToothRef.current = activeToothFdi;
			const parsed = Number.parseInt(String(activeToothFdi), 10);
			if (!Number.isNaN(parsed) && parsed > 0) {
				setSelectedTooth(parsed);
			}
		}
	}, [activeToothFdi]);

	// 4th Quadrant display mode: 3D High-Res Voxel Cube vs Orthogonal Cross-Section
	const [fourthQuadrantMode, setFourthQuadrantMode] = useState<"volume3d" | "cross_section">("volume3d");

	// Endo Compass 3D Panel State: closed by default to guarantee clean unobstructed 4-quadrant diagnostic viewing
	const [isCompassOpen, setIsCompassOpen] = useState<boolean>(false);
	const [activeCanalId, setActiveCanalId] = useState<string>("c-mb1");
	const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
	// Start in safe slice inspection mode without claiming premature fake computed channels
	const [compassData, setCompassData] = useState<EndoCompassClinicalData | null>(null);

	// Tooth or volume change returns to safe slice inspection mode (channels computed in isolated worker on demand)
	useEffect(() => {
		setCompassData(null);
		setIsAnalyzing(false);
	}, [selectedTooth, volume]);

	// 4-Way Interactive 2x2 Grid Resizer State (macOS / Studio density)
	const [splitX, setSplitX] = useState<number>(0.5);
	const [splitY, setSplitY] = useState<number>(0.5);
	const [isDraggingSplitter, setIsDraggingSplitter] = useState<"x" | "y" | "center" | null>(null);
	const quadGridRef = useRef<HTMLDivElement | null>(null);

	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [isPlanAdded, setIsPlanAdded] = useState<boolean>(false);

	const handleExportEmrAction = () => {
		if (handleExportToEmr) {
			handleExportToEmr();
		}
		if (compassData) {
			exportEndoToDiary043({
				clinicalData: compassData,
				toothFdi: selectedTooth,
				patientId,
				patientDisplayName,
			});
		}
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleExportPlanAction = () => {
		if (handleExportToPlan) {
			handleExportToPlan();
		}
		if (compassData) {
			exportEndoToTreatmentPlan({
				clinicalData: compassData,
				toothFdi: selectedTooth,
				patientId,
				patientDisplayName,
			});
		}
		setIsPlanAdded(true);
		setTimeout(() => setIsPlanAdded(false), 2000);
	};

	const handleTriggerRerun = async () => {
		setIsAnalyzing(true);
		try {
			const res = await runEndoAnalysisForToothAsync(volume, selectedTooth, archCurve);
			if (res) {
				setCompassData(res.clinicalData);
				if (res.clinicalData.canals.length > 0) {
					setActiveCanalId(res.clinicalData.canals[0]!.id);
				}
			} else {
				const syncRes = runEndoAnalysisForTooth(volume, selectedTooth, archCurve);
				setCompassData(syncRes);
				if (syncRes && syncRes.canals.length > 0) {
					setActiveCanalId(syncRes.canals[0]!.id);
				}
			}
		} catch (err) {
			console.warn("[EndoWorkspace] Async analysis failed, using sync fallback:", err);
			const syncRes = runEndoAnalysisForTooth(volume, selectedTooth, archCurve);
			setCompassData(syncRes);
			if (syncRes && syncRes.canals.length > 0) {
				setActiveCanalId(syncRes.canals[0]!.id);
			}
		} finally {
			setIsAnalyzing(false);
		}
	};

	useEffect(() => {
		if (!isDraggingSplitter) return;

		const handlePointerMove = (e: PointerEvent) => {
			if (!quadGridRef.current) return;
			const rect = quadGridRef.current.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;

			if (isDraggingSplitter === "x" || isDraggingSplitter === "center") {
				const relX = (e.clientX - rect.left) / rect.width;
				setSplitX(Math.max(0.2, Math.min(0.8, relX)));
			}
			if (isDraggingSplitter === "y" || isDraggingSplitter === "center") {
				const relY = (e.clientY - rect.top) / rect.height;
				setSplitY(Math.max(0.2, Math.min(0.8, relY)));
			}
		};

		const handlePointerUp = () => {
			setIsDraggingSplitter(null);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("pointercancel", handlePointerUp);
		window.addEventListener("blur", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("pointercancel", handlePointerUp);
			window.removeEventListener("blur", handlePointerUp);
		};
	}, [isDraggingSplitter]);

	if (maximizedViewport) {
		return (
			<div className="flex-1 flex min-h-0 min-w-0 w-full h-full" data-testid="cbct-endo-maximized-grid">
				{maximizedViewport === "coronal" && renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "axial" && renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "sagittal" && renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
				{maximizedViewport === "panoramic" &&
					(fourthQuadrantMode === "volume3d"
						? renderers.renderVolume3D("flex-1 flex flex-col w-full h-full", { isEndoMode: true })
						: renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", true))}
				{maximizedViewport === "cross_section" && renderers.renderCrossSection("flex-1 flex flex-col w-full h-full", true)}
			</div>
		);
	}

	return (
		<div
			className="flex-1 flex flex-col min-h-0 min-w-0 w-full h-full gap-1 p-0.5 bg-zinc-950"
			data-testid="cbct-workspace-endo-root"
		>
			{/* Top Toolstrip: Clean Clinical Tooth Selector FDI & Outpatient Card Copy */}
			<div className="flex items-center justify-between px-2.5 py-1 bg-zinc-950/80 border border-zinc-800/80 rounded-md shrink-0 gap-2 shadow-xs">
				<div className="flex items-center gap-2 min-w-0 overflow-x-auto">
					<div className="flex items-center gap-1.5 text-zinc-400 font-medium text-xs shrink-0">
						<EndoFileCanal className="w-3.5 h-3.5 text-zinc-400" />
						<span className="hidden sm:inline">Эндодонтия:</span>
						<span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[11px] border border-zinc-800">
							Зуб {selectedTooth}
						</span>
					</div>

					{/* Clinical Safe Slice Mode Indicator */}
					<div
						className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 shrink-0"
						data-testid="cbct-endo-safe-mode-badge"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
						<span>Безопасный режим просмотра срезов зуба</span>
					</div>

					<div className="h-3.5 w-px bg-zinc-800 shrink-0" />

					{/* Fast Tooth Switcher FDI for Endo */}
					<div className="flex items-center gap-1 overflow-x-auto">
						{COMMON_ENDO_TEETH.map((tooth) => {
							const isSel = tooth === selectedTooth;
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => {
										setSelectedTooth(tooth);
										handleSelectTooth?.(tooth);
									}}
									className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
										isSel
											? "bg-zinc-800 text-zinc-200 font-semibold border border-zinc-600 shadow-xs"
											: "bg-zinc-900/90 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-zinc-800/80"
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

				{/* Right: Clean Clinical Copy to Outpatient Card (043/u) & Endo Compass 3D Toggle */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => setIsCompassOpen((prev) => !prev)}
						className={`h-7 px-2.5 py-0.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
							isCompassOpen
								? "bg-cyan-950/80 text-cyan-300 border-cyan-600/70 shadow-xs"
								: "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-800"
						}`}
						title="Открыть/скрыть 3D Эндодонтический Компас (фоновый воркер-расчет)"
						data-testid="cbct-endo-compass-toggle-btn"
					>
						<Compass className="w-3.5 h-3.5 text-cyan-400" />
						<span>Компас 3D</span>
						<span className="text-[10px] px-1 py-0.2 rounded bg-zinc-900 border border-zinc-700/80 text-zinc-300 font-mono">
							{compassData ? `${compassData.canals.length} к.` : "Воркер"}
						</span>
					</button>

					<button
						type="button"
						onClick={handleExportPlanAction}
						className="h-7 px-2.5 py-0.5 rounded text-xs font-medium flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-200 border border-emerald-700/60 transition-colors cursor-pointer"
						title="Добавить услуги эндодонтии в план лечения пациента"
						data-testid="cbct-endo-export-plan-btn"
					>
						{isPlanAdded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FilePlus className="w-3.5 h-3.5 text-emerald-400" />}
						<span>{isPlanAdded ? "В плане" : "+ В план"}</span>
					</button>

					<button
						type="button"
						onClick={handleExportEmrAction}
						className="h-7 px-2.5 py-0.5 rounded text-xs font-medium flex items-center gap-1.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-200 border border-cyan-700/60 transition-colors cursor-pointer"
						title="Перенести данные срезов эндодонтии в медицинскую карту пациента Form 043/u"
						data-testid="cbct-endo-copy-emr-btn"
					>
						{isCopied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
						<span>{isCopied ? "Перенесено" : "В медкарту (043/у)"}</span>
					</button>
				</div>
			</div>

			{/* Main 4-Quadrant Diagnostic Cockpit (Zero Mocks, Pure Radiography) */}
			<div
				ref={quadGridRef}
				style={{
					display: "grid",
					gridTemplateColumns: `calc(${(splitX * 100).toFixed(2)}% - 2px) calc(${((1 - splitX) * 100).toFixed(2)}% - 2px)`,
					gridTemplateRows: `calc(${(splitY * 100).toFixed(2)}% - 2px) calc(${((1 - splitY) * 100).toFixed(2)}% - 2px)`,
					gap: "4px",
				}}
				className="flex-1 min-h-0 min-w-0 w-full h-full relative"
				data-testid="cbct-endo-quad-grid"
			>
				{/* Floating Endo Compass 3D Panel */}
				{isCompassOpen && (
					<div
						className="absolute top-2 right-2 z-40 max-w-[340px] pointer-events-auto"
						data-testid="cbct-endo-floating-compass"
					>
						<EndoCompassPanel
							data={compassData}
							isAnalyzing={isAnalyzing}
							activeCanalId={activeCanalId}
							onSelectCanal={setActiveCanalId}
							onRunAnalysis={handleTriggerRerun}
							onExportToEmr={handleExportEmrAction}
							onExportToPlan={handleExportPlanAction}
							onClose={() => setIsCompassOpen(false)}
						/>
					</div>
				)}

				{/* Top-Left: Paraxial Root Long-Axis View (renderers.renderCoronal) */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800/80 bg-black ${
						mobileActiveTab === "coronal" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-endo-paraxial-viewport"
				>
					<div className="absolute top-9 left-2 z-30 pointer-events-none bg-zinc-950/90 px-2 py-0.5 rounded border border-zinc-800 text-[10px] text-zinc-400 font-medium backdrop-blur-md shadow-xs">
						1. Продольная ось корня (Paraxial Coronal)
					</div>
					{renderers.renderCoronal("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Top-Right: Cross-Axial Root Canal View (renderers.renderAxial) */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800/80 bg-black ${
						mobileActiveTab === "axial" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-endo-crossaxial-viewport"
				>
					<div className="absolute top-9 left-2 z-30 pointer-events-none bg-zinc-950/90 px-2 py-0.5 rounded border border-zinc-800 text-[10px] text-zinc-400 font-medium backdrop-blur-md shadow-xs">
						2. Поперечный срез канала (Cross-Axial)
					</div>
					{renderers.renderAxial("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Bottom-Left: Sagittal Root View (renderers.renderSagittal) */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800/80 bg-black ${
						mobileActiveTab === "sagittal" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-endo-sagittal-viewport"
				>
					<div className="absolute top-9 left-2 z-30 pointer-events-none bg-zinc-950/90 px-2 py-0.5 rounded border border-zinc-800 text-[10px] text-zinc-400 font-medium backdrop-blur-md shadow-xs">
						3. Сагиттальный срез корня (Sagittal)
					</div>
					{renderers.renderSagittal("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Bottom-Right: 3D High-Res Voxel Cube or Orthogonal Cross-Section */}
				<div
					className={`flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-hidden border border-zinc-800/80 bg-black ${
						mobileActiveTab === "panoramic" ? "flex" : "hidden lg:flex"
					}`}
					data-testid="cbct-endo-3d-zoom-viewport"
				>
					{/* Mode Switcher: 3D Zoom Cube vs Cross-Section */}
					<div className="absolute top-9 left-2 z-30 pointer-events-auto inline-flex items-center bg-zinc-950/90 backdrop-blur-md rounded-md p-0.5 border border-zinc-800 shadow-xs gap-0.5">
						<button
							type="button"
							onClick={() => setFourthQuadrantMode("volume3d")}
							className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
								fourthQuadrantMode === "volume3d"
									? "bg-zinc-800 text-zinc-300 border border-zinc-700/60 shadow-xs"
									: "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900"
							}`}
							data-testid="cbct-endo-mode-volume3d"
							title="3D куб зуба: высокоточный трехмерный воксельный зум верхушки корня"
						>
							<Box className="w-3 h-3 text-zinc-400" />
							<span>3D Куб</span>
						</button>
						<button
							type="button"
							onClick={() => setFourthQuadrantMode("cross_section")}
							className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
								fourthQuadrantMode === "cross_section"
									? "bg-zinc-800 text-zinc-300 border border-zinc-700/60 shadow-xs"
									: "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900"
							}`}
							data-testid="cbct-endo-mode-crosssection"
							title="Кросс-секция: ортогональный поперечный срез канала зуба"
						>
							<Layers className="w-3 h-3 text-zinc-400" />
							<span>Кросс-секция</span>
						</button>
					</div>

					{/* 4th Viewport Render Content */}
					{fourthQuadrantMode === "volume3d"
						? renderers.renderVolume3D("flex-1 flex flex-col w-full h-full", { isEndoMode: true })
						: renderers.renderCrossSection("flex-1 flex flex-col w-full h-full")}
				</div>

				{/* Desktop Interactive 4-Way Splitters */}
				{/* Vertical Splitter Bar */}
				<div
					onPointerDown={(e) => {
						e.preventDefault();
						setIsDraggingSplitter("x");
					}}
					style={{ left: `calc(${(splitX * 100).toFixed(2)}% - 3px)` }}
					className="hidden lg:block absolute top-0 bottom-0 w-1.5 cursor-col-resize z-30 group"
					title="Перетащите для изменения ширины окон (двойной клик — сброс 50%)"
					onDoubleClick={() => setSplitX(0.5)}
					data-testid="cbct-endo-vertical-splitter"
				>
					<div className="w-0.5 h-full mx-auto bg-zinc-800 group-hover:bg-zinc-600 transition-colors" />
				</div>

				{/* Horizontal Splitter Bar */}
				<div
					onPointerDown={(e) => {
						e.preventDefault();
						setIsDraggingSplitter("y");
					}}
					style={{ top: `calc(${(splitY * 100).toFixed(2)}% - 3px)` }}
					className="hidden lg:block absolute left-0 right-0 h-1.5 cursor-row-resize z-30 group"
					title="Перетащите для изменения высоты окон (двойной клик — сброс 50%)"
					onDoubleClick={() => setSplitY(0.5)}
					data-testid="cbct-endo-horizontal-splitter"
				>
					<div className="h-0.5 w-full my-auto bg-zinc-800 group-hover:bg-zinc-600 transition-colors" />
				</div>

				{/* Central 4-Way Crosshair Splitter Knob */}
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
					className="hidden lg:flex absolute w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 items-center justify-center cursor-move z-40 shadow-md group transition-transform hover:scale-125"
					title="4-сторонний сплиттер: перетащите для изменения размеров окон (двойной клик — сброс 50/50)"
					data-testid="cbct-endo-grid-splitter-knob"
				>
					<div className="w-1 h-1 rounded-full bg-zinc-500 group-hover:bg-zinc-300" />
				</div>
			</div>
		</div>
	);
};
