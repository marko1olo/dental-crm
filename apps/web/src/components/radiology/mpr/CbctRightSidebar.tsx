import React from "react";
import {
	Activity, AlertTriangle, Box, Calendar, Check, ChevronLeft, ChevronRight,
	CircleDot, Compass, Download, Eye, EyeOff, FileText, Info, Printer, RotateCcw, Save, Search,
	Share2, ShieldAlert, ShieldCheck, Trash2, X,
} from "lucide-react";
import type { CbctVoxelVolume, CbctViewportType, Point3D } from "../cbctMprMath";
import { getTissueNameFromHU } from "../cbctMprMath";
import type { CrossSectionSliceData } from "../dentalCurveEngine";
import { measureAlveolarRidgeCrossSection } from "../dentalCurveEngine";
import { CbctViewportHud } from "../CbctViewportHud";
import { BoneQualityPanel } from "../../dicom/BoneQualityPanel";
import { showToast } from "../../GlobalToast";
import type {
	ImplantBrandKey,
	VirtualImplantSpec,
	Implant3DWorldProjection,
} from "../implantSafetyEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath";
import type { HUZoneSampling, MischBoneClass } from "../boneDensityMischMath";
import { formatMischDrillingRecommendation } from "../boneDensityMischMath";
import type { StudioMode } from "./cbctStudioTypes";
import { formatNerveNodesPlural } from "./cbctStudioTypes";

const UPPER_JAW_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_JAW_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

const IMPLANT_BRAND_OPTIONS: readonly { key: ImplantBrandKey; label: string }[] = [
	{ key: "straumann", label: "Straumann" },
	{ key: "nobel_biocare", label: "Nobel" },
	{ key: "osstem", label: "Osstem" },
	{ key: "dentium", label: "Dentium" },
	{ key: "mis", label: "MIS" },
];

export interface CbctRightSidebarProps {
	readonly isSidebarOpen: boolean; readonly setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly mobileActiveTab: string; readonly activeCrossSection: CrossSectionSliceData | null | undefined;
	readonly activeCrossSectionIdx: number; readonly setActiveCrossSectionIdx: React.Dispatch<React.SetStateAction<number>>;
	readonly crossSections: CrossSectionSliceData[]; readonly studioMode: StudioMode; readonly setStudioMode: React.Dispatch<React.SetStateAction<StudioMode>>;
	readonly implantAngulationDeg: number; readonly setImplantAngulationDeg: React.Dispatch<React.SetStateAction<number>>;
	readonly volume: CbctVoxelVolume | null; readonly handleToggleMaximize: (viewport: CbctViewportType) => void;
	readonly crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleCrossSectionMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly dragImplantPart: string | null; readonly hoveredImplantPart: string | null;
	readonly handleFullResetViewport: (viewport: CbctViewportType) => void; readonly maximizedViewport: CbctViewportType | null;
	readonly windowWidth: number; readonly windowLevel: number;
	readonly renderViewportOverlays: (viewport: CbctViewportType) => React.ReactNode;
	readonly sampledVoxelHU: number; readonly handleSelectTooth: (fdi: number) => void;
	readonly implant3DWorld: Implant3DWorldProjection | null;
	readonly nerveAuditResult: { isDangerous: boolean; isWarning: boolean; netClearanceToCanalWallMm: number; clinicalMessageRu: string };
	readonly huSamplingResult: HUZoneSampling; readonly currentImplantSpec: VirtualImplantSpec;
	readonly nervePoints: readonly Point3D[]; readonly setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	readonly nerveTotalLengthMm: number; readonly selectedNerveNodeIdx: number | null;
	readonly setSelectedNerveNodeIdx: React.Dispatch<React.SetStateAction<number | null>>;
	readonly displayBoneClass: string; readonly displayMeanHU: number | null; readonly displayTorque: string;
	readonly displayNerveClearanceMm: number | null; readonly displayDrillingProtocol: string;
	readonly selectedBrand: ImplantBrandKey; readonly setSelectedBrand: React.Dispatch<React.SetStateAction<ImplantBrandKey>>;
	readonly selectedDiameterMm: number; readonly setSelectedDiameterMm: React.Dispatch<React.SetStateAction<number>>;
	readonly selectedLengthMm: number; readonly setSelectedLengthMm: React.Dispatch<React.SetStateAction<number>>;
	readonly implantEntryXOffsetMm: number; readonly setImplantEntryXOffsetMm: React.Dispatch<React.SetStateAction<number>>;
	readonly setImplantEntryDepthMm: React.Dispatch<React.SetStateAction<number>>;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined; readonly ridgeWidthMm?: number | null | undefined;
	readonly isAnonymized?: boolean | undefined; readonly onToggleAnonymize?: (() => void) | undefined;
	readonly handleExport300DpiSnapshot?: (() => void) | undefined; readonly handleShareReport?: (() => void) | undefined;
	readonly handleExportToEmr: () => void; readonly handleExportPdfReport: () => void;
	readonly handleExportToPlan: () => void; readonly handleExportToSchedule: () => void;
	readonly handleExportToFinance?: () => void;
}

export const CbctRightSidebar: React.FC<CbctRightSidebarProps> = ({
	isSidebarOpen, setIsSidebarOpen, mobileActiveTab, activeCrossSection,
	activeCrossSectionIdx, setActiveCrossSectionIdx, crossSections, studioMode,
	setStudioMode, implantAngulationDeg, setImplantAngulationDeg, volume,
	handleToggleMaximize, crossSectionBaseCanvasRef, crossSectionOverlayCanvasRef,
	handleCrossSectionMouseDown, handleCrossSectionMouseMove, handleCrossSectionMouseUp,
	dragImplantPart, hoveredImplantPart, handleFullResetViewport, maximizedViewport,
	windowWidth, windowLevel, renderViewportOverlays, sampledVoxelHU, handleSelectTooth,
	implant3DWorld, nerveAuditResult, huSamplingResult, currentImplantSpec, nervePoints,
	setNervePoints, nerveTotalLengthMm, selectedNerveNodeIdx, setSelectedNerveNodeIdx,
	displayBoneClass, displayMeanHU, displayTorque, displayNerveClearanceMm, displayDrillingProtocol,
	selectedBrand, setSelectedBrand, selectedDiameterMm, setSelectedDiameterMm,
	selectedLengthMm, setSelectedLengthMm, implantEntryXOffsetMm, setImplantEntryXOffsetMm,
	setImplantEntryDepthMm, activeCaliper, ridgeHeightMm, ridgeWidthMm, isAnonymized = false,
	onToggleAnonymize, handleExport300DpiSnapshot, handleShareReport, handleExportToEmr,
	handleExportPdfReport, handleExportToPlan, handleExportToSchedule, handleExportToFinance,
}) => {
	const crossSectionMeasurement = activeCrossSection
		? measureAlveolarRidgeCrossSection(activeCrossSection)
		: null;
	const effectiveRidgeHeight =
		activeCaliper?.heightMm ??
		ridgeHeightMm ??
		crossSectionMeasurement?.heightMm ??
		activeCrossSection?.corticalCrestHeightMm ??
		null;
	const effectiveRidgeWidth =
		activeCaliper?.crestWidthMm ??
		ridgeWidthMm ??
		crossSectionMeasurement?.crestWidthMm ??
		activeCrossSection?.alveolarRidgeWidthMm ??
		null;

	const clinicalDrillRec = formatMischDrillingRecommendation(
		(displayBoneClass || "D3") as MischBoneClass,
		selectedDiameterMm || 4.0
	);

	const renderToothRow = (teeth: readonly number[]) => (
		<div className="flex items-center justify-between gap-0.5 overflow-x-auto pb-0.5">
			{teeth.map((fdi) => {
				const isTarget = activeCrossSection?.nearestToothFdi ? Number.parseInt(activeCrossSection.nearestToothFdi, 10) === fdi : false;
				return (
					<button
						key={fdi}
						type="button"
						onClick={() => handleSelectTooth(fdi)}
						className={`px-1 py-1 rounded min-w-[20px] font-mono font-bold text-center transition-colors ${
							isTarget
								? "bg-cyan-500 text-black shadow-xs shadow-cyan-500/50"
								: "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
						}`}
					>
						{fdi}
					</button>
				);
			})}
		</div>
	);

	if (!isSidebarOpen && mobileActiveTab !== "planner") {
		return null;
	}

	return (
		<aside
			className={`shrink-0 ${isSidebarOpen ? "" : "hidden"} ${
				mobileActiveTab === "planner"
					? "flex-1 flex flex-col min-h-0 w-full min-w-0 h-full"
					: "hidden lg:flex lg:flex-col lg:w-[380px] lg:min-w-[360px] lg:max-w-[420px]"
			} bg-zinc-950 rounded-md border border-zinc-800 min-h-0 overflow-y-auto p-3 flex flex-col gap-3`}
		>
			{/* Active Cross-Section Carousel Header */}
			<div className="flex items-center justify-between pb-2 border-b border-zinc-800">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-cyan-400">
						Срез #{activeCrossSection?.sliceIndex ?? 1} из {crossSections.length}
					</span>
					<span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-300 font-bold text-xs border border-zinc-800">
						Зуб FDI: {activeCrossSection?.nearestToothFdi ? `#${activeCrossSection.nearestToothFdi}` : "—"}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					{studioMode === "implant" && (
						<button
							type="button"
							onClick={() => {
								setImplantAngulationDeg(0);
								showToast("Угол наклона имплантата сброшен в 0.0°", "info");
							}}
							className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-amber-500/60 font-mono text-[11px] font-bold min-h-[44px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
							title="Сбросить наклон оси имплантата в 0.0°"
							data-testid="cbct-cross-section-reset-angle-btn"
						>
							<RotateCcw className="w-3.5 h-3.5 text-amber-400" />
							<span>Сброс ({implantAngulationDeg}°)</span>
						</button>
					)}
					<button
						type="button"
						onClick={() => setActiveCrossSectionIdx((prev) => Math.max(0, prev - 1))}
						className="p-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center border border-zinc-800 transition-colors shadow-xs"
						title="Предыдущий срез"
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
					<button
						type="button"
						onClick={() => setActiveCrossSectionIdx((prev) => Math.min(crossSections.length - 1, prev + 1))}
						className="p-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center border border-zinc-800 transition-colors shadow-xs"
						title="Следующий срез"
					>
						<ChevronRight className="w-5 h-5" />
					</button>
					<button
						type="button"
						onClick={() => setIsSidebarOpen(false)}
						className="p-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center border border-zinc-800 transition-colors shadow-xs ml-1"
						title="Скрыть панель"
						data-testid="cbct-close-sidebar-btn"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Cross-Section Viewport Canvas */}
			<div
				onDoubleClick={() => handleToggleMaximize("cross_section")}
				className="relative h-56 bg-black rounded-md overflow-hidden border border-yellow-500/40 flex items-center justify-center shrink-0 w-full"
			>
				{!volume ? (
					<div
						className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 select-none"
						data-testid="cbct-sidebar-empty-state"
					>
						<Box className="w-8 h-8 mb-2 text-zinc-700" />
						<div className="text-xs font-semibold text-zinc-400">Данные срезов недоступны</div>
						<div className="text-[11px] text-zinc-600 mt-1">
							Загрузите исследование КЛКТ для построения кросс-секций и имплантологического планирования
						</div>
					</div>
				) : (
					<>
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
							onContextMenu={(e) => e.preventDefault()}
							className={`absolute inset-0 w-full h-full object-contain z-10 ${
								dragImplantPart ? "cursor-grabbing" : hoveredImplantPart ? "cursor-grab" : "cursor-default"
							}`}
							data-testid="cbct-cross-section-sidebar-canvas"
						/>
						<CbctViewportHud
							viewportType="cross_section"
							toothFdi={activeCrossSection?.nearestToothFdi}
							sliceIndex={activeCrossSectionIdx}
							totalSlices={crossSections.length}
							pixelSpacingMm={activeCrossSection?.pixelSpacingMm ?? 0.25}
							onResetView={() => handleFullResetViewport("cross_section")}
							isMaximized={maximizedViewport === "cross_section"}
							onToggleMaximize={() => handleToggleMaximize("cross_section")}
							windowWidth={windowWidth}
							windowLevel={windowLevel}
						>
							{renderViewportOverlays("cross_section")}
						</CbctViewportHud>

						{/* Quick Ridge Measurements Badge */}
						<div className="absolute top-1.5 right-10 px-2 py-0.5 rounded bg-zinc-950/90 backdrop-blur-sm text-[10px] text-zinc-400 border border-zinc-800 font-mono shadow-xs flex items-center gap-2">
							<span>H: <strong className="text-cyan-400">{activeCrossSection?.corticalCrestHeightMm != null ? `${activeCrossSection.corticalCrestHeightMm.toFixed(1)} мм` : "—"}</strong></span>
							<span>W: <strong className="text-cyan-400">{activeCrossSection?.alveolarRidgeWidthMm != null ? `${activeCrossSection.alveolarRidgeWidthMm.toFixed(1)} мм` : "—"}</strong></span>
						</div>
					</>
				)}
			</div>

			{/* CONDITIONAL SIDEBAR CONTENT: DIAGNOSTIC / ENDO / TMJ vs IMPLANT */}
			{studioMode !== "implant" ? (
				<div className="flex flex-col gap-3">
					{/* Diagnostic HU & Tissue Structure Inspector */}
					<div className="p-3 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-zinc-100">Плотность в курсоре:</span>
							<span className="px-2.5 py-1 rounded bg-zinc-900 text-cyan-400 font-mono font-bold border border-cyan-500/60">
								{sampledVoxelHU} HU
							</span>
						</div>
						<div className="text-[11px] text-zinc-400">
							Структура: <strong className="text-zinc-100">{getTissueNameFromHU(sampledVoxelHU)}</strong>
						</div>
						<div className="grid grid-cols-2 gap-1.5 text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-800">
							<div>Эмаль: <span className="font-mono text-zinc-100">+2000..+3000</span></div>
							<div>Кортекс: <span className="font-mono text-zinc-100">+1000..+1800</span></div>
							<div>Спонгиоза: <span className="font-mono text-zinc-100">+300..+800</span></div>
							<div>Пазухи: <span className="font-mono text-zinc-100">-1000..-500</span></div>
						</div>
					</div>

					{/* Radiological Anatomical Inspection Checklist */}
					<div className="p-3 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
						<div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
							<Search className="w-4 h-4 text-cyan-400" />
							<span>
								{studioMode === "endo"
									? "Эндодонтический осмотр корней & каналов:"
									: studioMode === "tmj"
									? "Анатомический осмотр суставных головок ВНЧС:"
									: `Анатомический осмотр зоны ${activeCrossSection?.nearestToothFdi ? `#${activeCrossSection.nearestToothFdi}` : "—"}:`}
							</span>
						</div>
						<div className="flex flex-col gap-1.5 text-[11px] text-zinc-400">
							{["Кортикальные пластинки & гребень сохранны", "Периодонтальная щель & апексы корней", "Пневматизация синуса / канал IAN"].map((text) => (
								<div key={text} className="flex items-center gap-2.5 p-2 rounded bg-zinc-900 border border-zinc-800">
									<Check className="w-4 h-4 text-emerald-400 shrink-0" />
									<span className="text-zinc-100">{text}</span>
								</div>
							))}
						</div>
					</div>

					{/* Fast Switch to Implant Planning Button */}
					<button
						type="button"
						onClick={() => {
							setStudioMode("implant");
							setIsSidebarOpen(true);
						}}
						className="w-full py-2.5 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-800 hover:border-cyan-500/60 text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] shadow-xs"
						data-testid="cbct-switch-to-implant-mode-btn"
					>
						<CircleDot className="w-4 h-4 text-amber-400" />
						<span>Перейти к планированию имплантата</span>
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{/* 1-CLICK TOOTH FORMULA SELECTOR */}
					<div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col gap-1.5">
						<div className="text-[11px] font-bold text-zinc-400 flex items-center justify-between">
							<span>Выбор позиции зуба (FDI):</span>
							<span className="text-cyan-400 font-mono">{activeCrossSection?.nearestToothFdi ? `#${activeCrossSection.nearestToothFdi}` : "—"}</span>
						</div>
						<div className="flex flex-col gap-1 text-[10px]">
							{renderToothRow(UPPER_JAW_TEETH)}
							{renderToothRow(LOWER_JAW_TEETH)}
						</div>
					</div>

					{/* ANATOMICAL SAFETY ALARM BANNER (SINUS / IAN NERVE SENTINEL) */}
					{(() => {
						const isMaxilla = (implant3DWorld?.targetToothFdi ?? 46) < 30;
						const anatomyLabel = isMaxilla ? "Гайморова пазуха (Sinus)" : "Зазор до нерва (IAN)";
						const anatomyNorm = isMaxilla ? "Дно пазухи интактно" : "Норма >= 2.0 мм";
						return (
							<div
								className={`p-3 rounded-md border flex items-start gap-2.5 transition-colors ${
									nerveAuditResult.isDangerous
										? "bg-[#2d1215] border-rose-600/80 text-rose-200"
										: nerveAuditResult.isWarning
											? "bg-[#2d2212] border-amber-600/80 text-amber-200"
											: "bg-[#12241b] border-emerald-600/80 text-emerald-200"
								}`}
								data-testid="cbct-nerve-safety-banner"
							>
								{nerveAuditResult.isDangerous ? (
									<ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
								) : nerveAuditResult.isWarning ? (
									<AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
								) : (
									<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
								)}
								<div className="text-xs flex-1">
									<div className="font-bold flex items-center justify-between">
										<span>{anatomyLabel}: {nerveAuditResult.netClearanceToCanalWallMm.toFixed(1)} мм</span>
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 font-mono">
											{anatomyNorm}
										</span>
									</div>
									<p className="text-[11px] mt-1 opacity-90 leading-tight">
										{isMaxilla && (implant3DWorld?.targetToothFdi === 16 || implant3DWorld?.targetToothFdi === 26)
											? "Зуб 16/26 (Верхняя челюсть): контроль дна гайморовой пазухи. При дефиците высоты показан синус-лифтинг."
											: nerveAuditResult.clinicalMessageRu}
									</p>
								</div>
							</div>
						);
					})()}

					{/* MISCH BONE DENSITY (HU) & DRILLING PROTOCOL (BoneQualityPanel) */}
					<BoneQualityPanel
						huSamples={
							huSamplingResult.status !== "unmeasured" &&
							(huSamplingResult.coronalCrestalHU !== 0 ||
								huSamplingResult.trabecularCoreHU !== 0 ||
								huSamplingResult.apicalBaseHU !== 0)
								? [
										huSamplingResult.coronalCrestalHU,
										huSamplingResult.trabecularCoreHU,
										huSamplingResult.apicalBaseHU,
									]
								: undefined
						}
						implantDiameterMm={currentImplantSpec.diameterMm}
						implantLengthMm={currentImplantSpec.lengthMm}
						implantSystem={
							currentImplantSpec.brandName?.toLowerCase().includes("straumann") ? "straumann"
								: currentImplantSpec.brandName?.toLowerCase().includes("nobel") ? "nobel"
								: currentImplantSpec.brandName?.toLowerCase().includes("bredent") ? "bredent"
								: currentImplantSpec.brandName?.toLowerCase().includes("mdi") ? "mdi" : "osstem"
						}
						toothFdi={implant3DWorld?.targetToothFdi ?? 46}
					/>

					{/* 3D MANDIBULAR NERVE TRACER PANEL (IAN 3D SPLINE) */}
					<div className="p-3 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-zinc-400 flex items-center gap-1.5">
								<Activity className="w-3.5 h-3.5 text-amber-400" />
								3D Трассировка нерва (IAN)
							</span>
							<span className="px-2 py-0.5 rounded bg-zinc-900 text-amber-400 font-mono text-[11px] font-bold border border-amber-500/50">
								{formatNerveNodesPlural(nervePoints.length)} • {nerveTotalLengthMm.toFixed(1)} мм
							</span>
						</div>

						<div className="text-[11px] text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-800 flex flex-col gap-1">
							<div className="flex justify-between items-center">
								<span>Выбранный узел:</span>
								<span className="font-bold font-mono text-zinc-100">
									{selectedNerveNodeIdx !== null ? `Узел #${selectedNerveNodeIdx + 1}` : "—"}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span>Vatech пороги:</span>
								<span className="font-bold text-amber-400 font-mono">3.0мм апекс • 1.5мм риск</span>
							</div>
							<div className="flex justify-between items-center">
								<span>Режим 2-Seed:</span>
								<span className={`font-mono font-bold ${nervePoints.length === 0 ? "text-cyan-400" : nervePoints.length === 1 ? "text-amber-400" : "text-emerald-400"}`}>
									{nervePoints.length === 0 ? "1/2: Ментальное" : nervePoints.length === 1 ? "2/2: Мандибулярное" : "Fast Marching OK"}
								</span>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-1.5">
							<button
								type="button"
								onClick={() => {
									if (nervePoints.length === 0) return showToast("Трасса канала IAN пока не содержит узлов", "info");
									if (selectedNerveNodeIdx !== null && selectedNerveNodeIdx >= 0 && selectedNerveNodeIdx < nervePoints.length) {
										setNervePoints((prev) => prev.filter((_, idx) => idx !== selectedNerveNodeIdx));
										setSelectedNerveNodeIdx(null);
										showToast("Удален выбранный 3D-узел нерва", "info");
									} else if (nervePoints.length > 0) {
										setNervePoints((prev) => prev.slice(0, -1));
										showToast("Удален последний узел нерва", "info");
									}
								}}
								className="py-1.5 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer"
								data-testid="cbct-delete-nerve-node-btn"
								disabled={selectedNerveNodeIdx === null}
								title="Удалить выбранный или последний узел (Backspace)"
							>
								<Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
								<span>Удалить узел</span>
							</button>

							<button
								type="button"
								onClick={() => {
									if (nervePoints.length === 0) return showToast("Трасса канала IAN уже пуста", "info");
									setNervePoints([]);
									setSelectedNerveNodeIdx(null);
									showToast("Трасса канала IAN сброшена", "info");
								}}
								className="py-1.5 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer"
								data-testid="cbct-reset-nerve-trace-btn"
								disabled={nervePoints.length === 0}
								title="Очистить все точки канала нерва"
							>
								<RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-400" />
								<span>Сброс трассы</span>
							</button>
						</div>
						<div className="text-[10px] text-zinc-400 leading-tight flex items-center gap-1">
							<Info className="w-3 h-3 text-cyan-400 shrink-0" />
							<span>Vatech 2-Seed: 2 клика на срезах (ментальное + мандибулярное отв.) для 3D автоканала</span>
						</div>
					</div>

					{/* VIRTUAL IMPLANT CALIPER SELECTION */}
					<div className="p-3 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col gap-2.5" data-testid="cbct-selected-implant-card">
						<div className="flex items-center justify-between">
							<div className="text-xs font-bold text-zinc-300">Выбор имплантата (Библиотека):</div>
							<div className="text-xs font-mono font-bold text-cyan-400">
								{currentImplantSpec.brandName} Ø{currentImplantSpec.diameterMm}x{currentImplantSpec.lengthMm}
							</div>
						</div>

						{/* LIVE MISCH BONE DENSITY & SAFETY HUD BADGE (МАНДАТ 8e) */}
						<div
							className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col gap-2 shadow-xs"
							data-testid="cbct-implant-live-telemetry-hud"
						>
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-1.5 min-w-0">
									<span className="text-[11px] font-semibold text-zinc-400 shrink-0">Кость (Misch):</span>
									<span
										className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-zinc-900 border border-cyan-500/50 text-cyan-400 shrink-0"
										data-testid="cbct-implant-misch-class-badge"
									>
										{displayBoneClass} {displayMeanHU !== null ? `(${Math.round(displayMeanHU)} HU)` : ""}
									</span>
								</div>
								<div className="text-[11px] text-zinc-300 font-mono shrink-0">
									Торк: <strong className="text-zinc-100">{displayTorque}</strong>
								</div>
							</div>

							{/* 3-ZONE HU DENSITY PROFILE (CREST 20% | CORE 60% | APEX 20%) */}
							<div
								className="grid grid-cols-3 gap-1 pt-1.5 border-t border-zinc-800/80 text-[10px]"
								data-testid="cbct-implant-3zone-density"
							>
								<div className="flex flex-col bg-zinc-900/90 rounded px-1.5 py-1 border border-zinc-800" title="Кортикальный гребень (Coronal crest, 20% длины)">
									<span className="text-zinc-500 text-[9px] uppercase font-semibold">Гребень 20%</span>
									<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-crest-hu">
										{huSamplingResult.status === "measured" || huSamplingResult.coronalCrestalHU !== 0
											? `${huSamplingResult.coronalCrestalHU} HU`
											: "—"}
									</span>
								</div>
								<div className="flex flex-col bg-zinc-900/90 rounded px-1.5 py-1 border border-zinc-800" title="Губчатое тело (Trabecular core, 60% длины)">
									<span className="text-zinc-500 text-[9px] uppercase font-semibold">Тело 60%</span>
									<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-core-hu">
										{huSamplingResult.status === "measured" || huSamplingResult.trabecularCoreHU !== 0
											? `${huSamplingResult.trabecularCoreHU} HU`
											: "—"}
									</span>
								</div>
								<div className="flex flex-col bg-zinc-900/90 rounded px-1.5 py-1 border border-zinc-800" title="Апикальная зона (Apical engagement, 20% длины)">
									<span className="text-zinc-500 text-[9px] uppercase font-semibold">Апекс 20%</span>
									<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-apex-hu">
										{huSamplingResult.status === "measured" || huSamplingResult.apicalBaseHU !== 0
											? `${huSamplingResult.apicalBaseHU} HU`
											: "—"}
									</span>
								</div>
							</div>

							{/* CLINICAL DRILLING PROTOCOL RECOMMENDATION */}
							<div
								className="p-1.5 rounded bg-zinc-900/70 border border-zinc-800 text-[10px] leading-tight flex flex-col gap-0.5"
								data-testid="cbct-implant-drilling-protocol"
								title={clinicalDrillRec || displayDrillingProtocol}
							>
								<div className="text-zinc-400 font-semibold flex items-center justify-between">
									<span>Протокол остеотомии (Misch):</span>
									<span className="text-amber-400 font-mono text-[9px]">{displayBoneClass}</span>
								</div>
								<span className="text-zinc-200 line-clamp-2">
									{clinicalDrillRec || displayDrillingProtocol}
								</span>
							</div>

							<div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-800">
								<div className="flex items-center gap-1.5 min-w-0">
									<span className="text-[11px] font-semibold text-zinc-400 shrink-0">Зазор до IAN:</span>
									<span
										className={`px-2 py-0.5 rounded font-mono font-bold text-xs border shrink-0 ${
											displayNerveClearanceMm === null
												? "bg-zinc-900 text-zinc-400 border-zinc-800"
												: displayNerveClearanceMm >= 2.0
													? "bg-emerald-950/70 text-emerald-300 border-emerald-500/60"
													: displayNerveClearanceMm >= 1.5
														? "bg-amber-950/70 text-amber-300 border-amber-500/60"
														: "bg-rose-950/70 text-rose-300 border-rose-500/60"
										}`}
										data-testid="cbct-implant-nerve-clearance-badge"
									>
										{displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "Не определен"}
									</span>
								</div>
								<span className="text-[10px] text-zinc-500 font-mono shrink-0">
									{displayNerveClearanceMm !== null && displayNerveClearanceMm < 1.5
										? "Опасно (< 1.5 мм)"
										: displayNerveClearanceMm !== null && displayNerveClearanceMm < 2.0
											? "Внимание (< 2.0 мм)"
											: "Норма (>= 2.0 мм)"}
								</span>
							</div>

							<div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-800">
								<div className="flex items-center gap-1.5 min-w-0">
									<span className="text-[11px] font-semibold text-zinc-400 shrink-0">Гребень:</span>
									<span
										className={`px-2 py-0.5 rounded font-mono font-bold text-xs border shrink-0 ${
											effectiveRidgeHeight !== null && effectiveRidgeWidth !== null
												? "bg-zinc-900 text-zinc-200 border-zinc-700"
												: "bg-zinc-900 text-zinc-500 border-zinc-800"
										}`}
										data-testid="cbct-ridge-measurements-badge"
									>
										{effectiveRidgeHeight !== null && effectiveRidgeWidth !== null
											? `H:${effectiveRidgeHeight.toFixed(1)} W:${effectiveRidgeWidth.toFixed(1)} мм`
											: effectiveRidgeHeight !== null
												? `H:${effectiveRidgeHeight.toFixed(1)} мм`
												: effectiveRidgeWidth !== null
													? `W:${effectiveRidgeWidth.toFixed(1)} мм`
													: "Не измерялся (—)"}
									</span>
								</div>
								<span className="text-[10px] text-zinc-500 font-mono shrink-0">
									{activeCaliper ? "Штангенциркуль" : effectiveRidgeHeight !== null ? "КЛКТ-срез" : "Требуется замер"}
								</span>
							</div>
						</div>

						{/* Brand selector */}
						<div className="grid grid-cols-5 gap-1.5">
							{IMPLANT_BRAND_OPTIONS.map(({ key, label }) => (
								<button
									key={key}
									type="button"
									onClick={() => setSelectedBrand(key)}
									className={`py-2 px-1 rounded-md text-xs font-bold capitalize min-h-[44px] transition-colors border flex items-center justify-center ${
										selectedBrand === key
											? "bg-zinc-900 text-cyan-400 border-cyan-500/60 shadow-xs"
											: "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:bg-zinc-800"
									}`}
								>
									{label}
								</button>
							))}
						</div>

						{/* Diameter & Length Selectors */}
						<div className="grid grid-cols-2 gap-2 text-xs">
							<div>
								<label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Диаметр (мм):</label>
								<select
									value={selectedDiameterMm}
									onChange={(e) => setSelectedDiameterMm(Number.parseFloat(e.target.value))}
									className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 min-h-[44px] focus:border-cyan-500 focus:outline-none"
								>
									<option value={3.5}>Ø 3.5 мм (Узкий)</option><option value={4.0}>Ø 4.0 мм (Стандарт)</option><option value={4.3}>Ø 4.3 мм</option><option value={4.5}>Ø 4.5 мм (Широкий)</option><option value={5.0}>Ø 5.0 мм (Молярный)</option>
								</select>
							</div>

							<div>
								<label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Длина (мм):</label>
								<select
									value={selectedLengthMm}
									onChange={(e) => setSelectedLengthMm(Number.parseFloat(e.target.value))}
									className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 min-h-[44px] focus:border-cyan-500 focus:outline-none"
								>
									<option value={8.0}>L 8.0 мм</option><option value={10.0}>L 10.0 мм</option><option value={11.5}>L 11.5 мм</option><option value={13.0}>L 13.0 мм</option>
								</select>
							</div>
						</div>

						{/* Angulation Slider */}
						<div className="flex flex-col gap-1 text-xs">
							<div className="flex items-center justify-between text-[11px] text-zinc-400">
								<span>Наклон оси (Tilt):</span>
								<span className="font-mono font-bold text-zinc-100">{implantAngulationDeg}°</span>
							</div>
							<input type="range" min={-30} max={30} step={1} value={implantAngulationDeg} onChange={(e) => setImplantAngulationDeg(Number.parseInt(e.target.value, 10))} style={{ touchAction: "none" }} className="w-full accent-cyan-400 min-h-[44px] py-2 cursor-pointer bg-transparent cbct-mpr-range-slider" />
						</div>

						{/* Horizontal Entry Offset Slider */}
						<div className="flex flex-col gap-1 text-xs">
							<div className="flex items-center justify-between text-[11px] text-zinc-400">
								<span>Смещение X на гребне:</span>
								<span className="font-mono font-bold text-zinc-100">{implantEntryXOffsetMm.toFixed(1)} мм</span>
							</div>
							<input type="range" min={-5.0} max={5.0} step={0.5} value={implantEntryXOffsetMm} onChange={(e) => setImplantEntryXOffsetMm(Number.parseFloat(e.target.value))} style={{ touchAction: "none" }} className="w-full accent-cyan-400 min-h-[44px] py-2 cursor-pointer bg-transparent cbct-mpr-range-slider" />
						</div>

						{/* 1-CLICK CLINICAL ACTION BUTTONS (TIER 1 HOT PATH) */}
						<div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800">
							{/* 152-FZ Anonymization Toggle */}
							<div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800">
								<div className="flex items-center gap-1.5 min-w-0">
									{isAnonymized ? (
										<EyeOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
									) : (
										<Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
									)}
									<span className="text-[11px] font-semibold text-zinc-300 truncate">
										152-ФЗ Анонимизация:
									</span>
								</div>
								<button
									type="button"
									onClick={onToggleAnonymize}
									className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer border min-h-[32px] flex items-center ${
										isAnonymized
											? "bg-emerald-950/80 text-emerald-300 border-emerald-600/70"
											: "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
									}`}
									data-testid="cbct-toggle-anonymize-btn"
									title="Анонимизировать для консилиума / научной публикации (152-ФЗ)"
								>
									{isAnonymized ? "ВКЛ (Скрыто)" : "ВЫКЛ"}
								</button>
							</div>

							<div className="grid grid-cols-2 gap-1.5">
								<button
									type="button"
									onClick={handleExportToPlan}
									className="w-full py-2 px-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all min-h-[42px] shadow-sm shadow-cyan-500/20 active:scale-98 cursor-pointer"
									data-testid="add-implant-to-plan-btn"
									title="Сохранить имплантат и замеры кости в план лечения и зубную формулу"
								>
									<Save className="w-3.5 h-3.5 shrink-0" />
									<span className="truncate">+ В план & смету</span>
								</button>
								<button
									type="button"
									onClick={handleExportToFinance}
									className="w-full py-2 px-2 rounded-md bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 hover:text-emerald-200 border border-emerald-500/50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all min-h-[42px] shadow-xs active:scale-98 cursor-pointer"
									data-testid="cbct-btn-export-finance"
									title="Добавить услугу КТ челюстей (A06.07.012, 3800 ₽) в финансовый акт визита и план"
								>
									<Check className="w-3.5 h-3.5 shrink-0" />
									<span className="truncate">+ КТ в смету приёма</span>
								</button>
							</div>

							<div className="grid grid-cols-4 gap-1">
								<button type="button" onClick={handleExportToEmr} className="py-2 px-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-200 border border-zinc-800 hover:border-cyan-500/60 text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer" data-testid="cbct-btn-export-emr" data-testid-legacy="copy-diary-btn" title="Записать протокол КТ и замеры кости в ЭМК и дневник приёма">
									<FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
									<span className="truncate">В ЭМК</span>
								</button>
								<button type="button" onClick={handleExportToSchedule} className="py-2 px-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-emerald-300 hover:text-emerald-200 border border-zinc-800 hover:border-emerald-500/60 text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer" data-testid="cbct-btn-export-schedule" title="Создать черновик записи на операцию имплантации в расписании">
									<Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
									<span className="truncate">В запись</span>
								</button>
								<button type="button" onClick={handleExportPdfReport} className="py-2 px-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-zinc-800 hover:border-amber-500/60 text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer" data-testid="cbct-btn-export-pdf" title="Сформировать печатный A4 протокол / PDF">
									<Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
									<span className="truncate">PDF A4</span>
								</button>
								<button
									type="button"
									onClick={() => {
										if (handleExport300DpiSnapshot) return handleExport300DpiSnapshot();
										if (!crossSectionBaseCanvasRef?.current) return showToast("Срез для экспорта не найден", "info");
										const link = document.createElement("a");
										link.href = crossSectionBaseCanvasRef.current.toDataURL("image/png");
										link.download = `CBCT_Snapshot_300DPI_FDI${activeCrossSection?.nearestToothFdi || "46"}.png`;
										link.click();
										showToast("Снимок 300 DPI загружен", "success");
									}}
									className="py-2 px-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-cyan-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500/60 text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer"
									data-testid="cbct-btn-export-300dpi"
									title="Экспорт снимка среза высокого разрешения (300 DPI) с калибровкой"
								>
									<Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
									<span className="truncate">300 DPI</span>
								</button>
							</div>

							<div className="grid grid-cols-2 gap-1 pt-0.5">
								<button
									type="button"
									onClick={() => {
										setImplantEntryXOffsetMm(0); setImplantEntryDepthMm(2.0); setImplantAngulationDeg(0);
										showToast("Положение имплантата центрировано на гребне", "info");
									}}
									className="py-1.5 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[36px] cursor-pointer"
									data-testid="reset-center-btn"
									title="Центрировать имплантат на гребне"
								>
									<Compass className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
									<span>Центр</span>
								</button>
								<button
									type="button"
									onClick={() => {
										if (handleShareReport) handleShareReport();
										else showToast("Ссылка на КЛКТ-исследование скопирована в буфер", "success");
									}}
									className="py-1.5 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[36px] cursor-pointer"
									data-testid="cbct-btn-share-report"
									title="Поделиться исследованием / протоколом"
								>
									<Share2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
									<span>Поделиться</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</aside>
	);
};
