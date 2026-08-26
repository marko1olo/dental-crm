import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	Copy,
	Eye,
	Layers,
	Maximize2,
	RefreshCw,
	Sliders,
	Sparkles,
	Volume2,
	Wrench,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	type CrownMaterialId,
	type PreparationZoneType,
	CROWN_MATERIAL_SPECS,
	CROWN_MATERIALS_CATALOG,
	getCrownMaterialById,
	rankMaterialsByClearance,
} from "./crownMaterialTolerances";
import {
	type AnatomicalCuspId,
	type ClearancePoint,
	type OcclusionSimulationPreset,
	OCCLUSAL_LANDMARKS,
	CLEARANCE_HEATMAP_ZONES,
	getAntagonistToothFdi,
	isUpperJawTooth,
	evaluateLandmarkPoints,
	calculateClearanceStats,
	generateDenseOcclusalHeatmapGrid,
	computeCrossSectionSlice,
	generateLabOcclusionReport,
	getSimulationPresetClearances,
} from "./occlusionClearanceMath";

export interface CadCamOcclusionHeatmapModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: number | string | undefined;
	readonly initialMaterialId?: string | undefined;
	readonly initialCementGapMicrons?: number | undefined;
	readonly onApplySettings?: ((settings: {
		materialId: CrownMaterialId;
		cementGapMicrons: number;
		antagonistReductionMm: number;
		labNotes: string;
	}) => void) | undefined;
}

export function CadCamOcclusionHeatmapModal({
	isOpen,
	onClose,
	initialToothFdi = 16,
	initialMaterialId = "zirconia_ultra_translucent",
	initialCementGapMicrons = 40,
	onApplySettings,
}: CadCamOcclusionHeatmapModalProps) {
	const toothNum = Number(initialToothFdi) || 16;
	const isUpper = isUpperJawTooth(toothNum);
	const antagonistNum = getAntagonistToothFdi(toothNum);

	// Active material state
	const [selectedMaterialId, setSelectedMaterialId] = useState<CrownMaterialId>(() => {
		if (initialMaterialId && initialMaterialId in CROWN_MATERIAL_SPECS) {
			return initialMaterialId as CrownMaterialId;
		}
		return "zirconia_ultra_translucent";
	});

	// View Mode: 2D Heatmap vs Cross-Section Slices
	const [activeViewTab, setActiveViewTab] = useState<"heatmap_2d" | "cross_section">("heatmap_2d");
	const [activeSlicePlane, setActiveSlicePlane] = useState<"buccolingual" | "mesiodistal">("buccolingual");

	// Active simulation preset & manual overrides
	const [activePreset, setActivePreset] = useState<OcclusionSimulationPreset>("optimal");
	const [customClearances, setCustomClearances] = useState<Record<AnatomicalCuspId, number>>(() =>
		getSimulationPresetClearances("optimal"),
	);

	// Virtual Clinical & Laboratory Adjustment Sliders
	const [vdoDeltaMm, setVdoDeltaMm] = useState<number>(0.0); // Articulator pin height adjustment
	const [antagonistReductionMm, setAntagonistReductionMm] = useState<number>(0.0); // Enameloplasty on antagonist
	const [prepReductionMm, setPrepReductionMm] = useState<number>(0.0); // Additional tooth prep
	const [cementGapMicrons, setCementGapMicrons] = useState<number>(initialCementGapMicrons || 40);

	// Selected landmark pin for active HUD inspector
	const [selectedCuspId, setSelectedCuspId] = useState<AnatomicalCuspId>("MB");
	const [hoveredCuspId, setHoveredCuspId] = useState<AnatomicalCuspId | null>(null);

	// Evaluate points with real-time adjustments
	const evaluatedPoints: ClearancePoint[] = useMemo(() => {
		return evaluateLandmarkPoints(toothNum, selectedMaterialId, customClearances, {
			vdoDeltaMm,
			antagonistReductionMm,
			prepReductionMm,
		});
	}, [toothNum, selectedMaterialId, customClearances, vdoDeltaMm, antagonistReductionMm, prepReductionMm]);

	// Aggregate statistics
	const stats = useMemo(() => {
		return calculateClearanceStats(toothNum, selectedMaterialId, evaluatedPoints);
	}, [toothNum, selectedMaterialId, evaluatedPoints]);

	// Generate dense interpolating grid for 2D occlusal map
	const heatmapGrid = useMemo(() => {
		return generateDenseOcclusalHeatmapGrid(evaluatedPoints, 12);
	}, [evaluatedPoints]);

	// Compute cross-section slice profiles
	const crossSection = useMemo(() => {
		return computeCrossSectionSlice(activeSlicePlane, evaluatedPoints, selectedMaterialId, cementGapMicrons);
	}, [activeSlicePlane, evaluatedPoints, selectedMaterialId, cementGapMicrons]);

	// Active inspected point
	const activePoint = useMemo(() => {
		const targetId = hoveredCuspId || selectedCuspId;
		return evaluatedPoints.find((p) => p.cuspId === targetId) || evaluatedPoints[0]!;
	}, [evaluatedPoints, hoveredCuspId, selectedCuspId]);

	// Material suitability ranking for current minimum clearance
	const rankedMaterials = useMemo(() => {
		return rankMaterialsByClearance(activePoint.zoneType, stats.minClearanceMm);
	}, [activePoint.zoneType, stats.minClearanceMm]);

	// Build automated dental lab (ЗТЛ) report
	const labReport = useMemo(() => {
		return generateLabOcclusionReport({
			toothFdi: toothNum,
			materialId: selectedMaterialId,
			stats,
			cementGapMicrons,
		});
	}, [toothNum, selectedMaterialId, stats, cementGapMicrons]);

	// Preset change handler
	const handlePresetChange = (preset: OcclusionSimulationPreset) => {
		setActivePreset(preset);
		setCustomClearances(getSimulationPresetClearances(preset));
		setVdoDeltaMm(0);
		setAntagonistReductionMm(0);
		setPrepReductionMm(0);
	};

	// Reset all adjustments
	const handleResetAdjustments = () => {
		setVdoDeltaMm(0);
		setAntagonistReductionMm(0);
		setPrepReductionMm(0);
	};

	// Copy lab report to clipboard
	const handleCopyReport = async () => {
		try {
			await navigator.clipboard.writeText(labReport.rawTextForCopy);
			showToast("Спецификация окклюзии скопирована в буфер обмена");
		} catch {
			showToast("Не удалось скопировать текст");
		}
	};

	// Apply settings back to caller
	const handleApply = () => {
		if (onApplySettings) {
			onApplySettings({
				materialId: selectedMaterialId,
				cementGapMicrons,
				antagonistReductionMm,
				labNotes: labReport.labNotesRu,
			});
		}
		onClose();
	};

	if (!isOpen) return null;

	const activeMaterialSpec = getCrownMaterialById(selectedMaterialId);

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="cad-cam-occlusion-title"
				className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-[var(--paper)] text-[var(--ink)] rounded-2xl shadow-2xl border border-[var(--line)] overflow-hidden"
			>
				{/* ═══ MODAL HEADER (0-CLICK CONTEXT) ════════════════════════════ */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shadow-xs">
							<Activity className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 id="cad-cam-occlusion-title" className="text-base sm:text-lg font-bold text-[var(--ink)] m-0">
									CAD/CAM Окклюзионный Клиренс & Heatmap
								</h2>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
									Зуб №{toothNum} (Антагонист №{antagonistNum})
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0">
								{isUpper ? "Верхняя челюсть (Maxilla) — Небные бугры опорные" : "Нижняя челюсть (Mandible) — Щечные бугры опорные"} • Допуски материалов
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Overall Severity Badge */}
						<div
							className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
								stats.overallSeverity === "danger"
									? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
									: stats.overallSeverity === "warning"
									? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
									: stats.overallSeverity === "excess"
									? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
									: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
							}`}
						>
							{stats.overallSeverity === "danger" ? (
								<AlertCircle className="w-4 h-4" />
							) : stats.overallSeverity === "warning" ? (
								<AlertTriangle className="w-4 h-4" />
							) : (
								<CheckCircle2 className="w-4 h-4" />
							)}
							<span>
								{stats.overallSeverity === "danger"
									? `Дефицит места (${stats.minClearanceMm} мм)`
									: stats.overallSeverity === "warning"
									? `Критический минимум (${stats.minClearanceMm} мм)`
									: stats.overallSeverity === "excess"
									? `Избыточный зазор (${stats.minClearanceMm} мм)`
									: `Оптимально (${stats.minClearanceMm}–${stats.maxClearanceMm} мм)`}
							</span>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-soft)] transition-colors"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ═══ MATERIAL SWITCHER BAR ═════════════════════════════════════ */}
				<div className="px-5 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] flex items-center gap-2 overflow-x-auto shrink-0">
					<span className="text-xs font-bold text-[var(--muted)] shrink-0 mr-1 flex items-center gap-1">
						<Layers className="w-3.5 h-3.5 text-[var(--teal)]" /> Материал:
					</span>
					{CROWN_MATERIALS_CATALOG.map((mat) => {
						const isSelected = selectedMaterialId === mat.id;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => setSelectedMaterialId(mat.id)}
								className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
									isSelected
										? "bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal)] shadow-xs ring-1 ring-[var(--teal-soft)]"
										: "bg-[var(--paper-soft)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--teal-soft)]"
								}`}
							>
								<span>{mat.nameRu.split("(")[0]}</span>
								<span
									className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
										isSelected ? "bg-[var(--teal)] text-white" : "bg-[var(--line)] text-[var(--muted)]"
									}`}
								>
									{mat.flexuralStrengthMpa} МПа
								</span>
							</button>
						);
					})}
				</div>

				{/* ═══ MODAL BODY (SPLIT VIEW) ═══════════════════════════════════ */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
					{/* ─── LEFT COLUMN (DOMINANT 2D HEATMAP / 3D CROSS-SECTION) ─── */}
					<div className="lg:col-span-7 flex flex-col gap-4">
						{/* View Mode Toggle */}
						<div className="flex items-center justify-between bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)]">
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setActiveViewTab("heatmap_2d")}
									className={`min-h-[40px] px-3.5 rounded-lg text-xs font-bold transition-all ${
										activeViewTab === "heatmap_2d"
											? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
											: "text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
								>
									🗺️ 2D Окклюзионный Heatmap
								</button>
								<button
									type="button"
									onClick={() => setActiveViewTab("cross_section")}
									className={`min-h-[40px] px-3.5 rounded-lg text-xs font-bold transition-all ${
										activeViewTab === "cross_section"
											? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
											: "text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
								>
									📐 2D/3D Анатомический срез
								</button>
							</div>

							{activeViewTab === "cross_section" && (
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => setActiveSlicePlane("buccolingual")}
										className={`px-2.5 py-1 rounded text-xs font-semibold ${
											activeSlicePlane === "buccolingual"
												? "bg-[var(--teal)] text-white"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										Щечно-язычный
									</button>
									<button
										type="button"
										onClick={() => setActiveSlicePlane("mesiodistal")}
										className={`px-2.5 py-1 rounded text-xs font-semibold ${
											activeSlicePlane === "mesiodistal"
												? "bg-[var(--teal)] text-white"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										Мезио-дистальный
									</button>
								</div>
							)}
						</div>

						{/* Primary Visual Canvas */}
						<div className="relative bg-slate-950 rounded-2xl border border-slate-800 p-4 min-h-[320px] sm:min-h-[360px] flex items-center justify-center overflow-hidden shadow-inner">
							{activeViewTab === "heatmap_2d" ? (
								/* ═══ 2D HEATMAP SVG WITH ELEVATION MESH ═══ */
								<div className="relative w-full max-w-[340px] aspect-square">
									{/* Background Continuous Heatmap Grid */}
									<svg viewBox="0 0 100 100" className="w-full h-full rounded-2xl overflow-hidden shadow-lg">
										<defs>
											<radialGradient id="occlusalGlow" cx="50%" cy="50%" r="50%">
												<stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
												<stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
											</radialGradient>
										</defs>

										{/* Render interpolated color tiles */}
										{heatmapGrid.map((row, rIdx) =>
											row.map((cell, cIdx) => (
												<rect
													key={`${rIdx}-${cIdx}`}
													x={cell.posX - 4.5}
													y={cell.posY - 4.5}
													width={9.5}
													height={9.5}
													fill={cell.color}
													opacity={0.82}
												/>
											)),
										)}

										{/* Tooth Perimeter & Fissures Outline */}
										<rect
											x="6"
											y="6"
											width="88"
											height="88"
											rx="24"
											fill="none"
											stroke="rgba(255,255,255,0.4)"
											strokeWidth="1.5"
											strokeDasharray="2 2"
										/>

										{/* Central Developmental Fissures Pattern */}
										<path
											d="M 25,50 Q 40,50 50,50 Q 60,50 75,50 M 50,25 L 50,75"
											fill="none"
											stroke="rgba(0,0,0,0.5)"
											strokeWidth="2.5"
											strokeLinecap="round"
										/>
										<circle cx="50" cy="50" r="3" fill="rgba(0,0,0,0.7)" />

										{/* Outer Radial Mask */}
										<rect x="0" y="0" width="100" height="100" fill="url(#occlusalGlow)" pointerEvents="none" />
									</svg>

									{/* Interactive Landmark Pins */}
									{evaluatedPoints.map((pt) => {
										const isSelected = selectedCuspId === pt.cuspId;
										const isHovered = hoveredCuspId === pt.cuspId;
										return (
											<button
												key={pt.id}
												type="button"
												onClick={() => setSelectedCuspId(pt.cuspId)}
												onMouseEnter={() => setHoveredCuspId(pt.cuspId)}
												onMouseLeave={() => setHoveredCuspId(null)}
												style={{
													left: `${pt.xPct}%`,
													top: `${pt.yPct}%`,
												}}
												className={`absolute -translate-x-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-transform cursor-pointer focus:outline-none ${
													isSelected || isHovered ? "scale-125 z-20" : "scale-100 z-10"
												}`}
												aria-label={`${pt.nameRu}: ${pt.clearanceMm} мм`}
											>
												<div
													className={`relative px-2 py-1 rounded-lg text-xs font-black shadow-lg border flex items-center gap-1 ${
														pt.heatmapZone.severity === "danger"
															? "bg-red-600 text-white border-red-300 ring-2 ring-red-400/50"
															: pt.heatmapZone.severity === "warning"
															? "bg-amber-500 text-black border-amber-200 ring-2 ring-amber-300/50"
															: pt.heatmapZone.severity === "excess"
															? "bg-blue-600 text-white border-blue-300"
															: "bg-emerald-600 text-white border-emerald-300"
													}`}
												>
													<span>{pt.cuspId}</span>
													<span className="font-mono text-[11px]">{pt.clearanceMm}</span>
													{pt.isFunctional && (
														<span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" title="Функциональный бугор" />
													)}
												</div>
											</button>
										);
									})}

									{/* Compass Anatomical Labels */}
									<div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-900/80 px-2 py-0.5 rounded">
										{isUpper ? "Вестибулярно (Щека)" : "Вестибулярно (Щека)"}
									</div>
									<div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-900/80 px-2 py-0.5 rounded">
										{isUpper ? "Небно (Palatal)" : "Язычно (Lingual)"}
									</div>
									<div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-900/80 px-1.5 py-0.5 rounded">
										Мезиально
									</div>
									<div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-900/80 px-1.5 py-0.5 rounded">
										Дистально
									</div>
								</div>
							) : (
								/* ═══ 2D/3D CROSS-SECTION SLICE VIEW ═══ */
								<div className="w-full flex flex-col gap-2">
									<div className="text-center text-xs font-bold text-slate-300">
										{crossSection.titleRu}
									</div>

									<svg viewBox="0 0 320 200" className="w-full h-auto bg-slate-900 rounded-xl border border-slate-800">
										<defs>
											<linearGradient id="restorationGrad" x1="0%" y1="0%" x2="0%" y2="100%">
												<stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
												<stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
											</linearGradient>
											<linearGradient id="stumpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
												<stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.9" />
												<stop offset="100%" stopColor="#94a3b8" stopOpacity="0.9" />
											</linearGradient>
										</defs>

										{/* Grid lines */}
										<line x1="20" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
										<line x1="20" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
										<line x1="20" y1="150" x2="300" y2="150" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />

										{/* Antagonist Tooth Profile (Top white curve) */}
										<path
											d={`M ${crossSection.points
												.map((p, idx) => `${idx === 0 ? "M" : "L"} ${(p.xPct * 2.8) + 20} ${p.antagonistY}`)
												.join(" ")} L 300 20 L 20 20 Z`}
											fill="rgba(255,255,255,0.15)"
											stroke="#ffffff"
											strokeWidth="2"
										/>
										<text x="30" y="35" fill="#ffffff" fontSize="9" fontWeight="bold">
											Зуб-антагонист №{antagonistNum} (Эмаль)
										</text>

										{/* Modeled Crown Restoration Layer */}
										<path
											d={`M ${crossSection.points
												.map((p, idx) => `${idx === 0 ? "M" : "L"} ${(p.xPct * 2.8) + 20} ${p.crownTopY}`)
												.join(" ")} ${crossSection.points
												.slice()
												.reverse()
												.map((p) => `L ${(p.xPct * 2.8) + 20} ${p.prepStumpY}`)
												.join(" ")} Z`}
											fill="url(#restorationGrad)"
											stroke="#0284c7"
											strokeWidth="1.5"
										/>

										{/* Prepared Stump Core (Bottom) */}
										<path
											d={`M ${crossSection.points
												.map((p, idx) => `${idx === 0 ? "M" : "L"} ${(p.xPct * 2.8) + 20} ${p.prepStumpY}`)
												.join(" ")} L 300 185 L 20 185 Z`}
											fill="url(#stumpGrad)"
											stroke="#64748b"
											strokeWidth="1.5"
										/>
										<text x="30" y="178" fill="#334155" fontSize="9" fontWeight="bold">
											Культя препарированного зуба №{toothNum}
										</text>

										{/* Clearance Caliper Vectors */}
										{crossSection.points
											.filter((_, idx) => idx === 4 || idx === 10 || idx === 16)
											.map((p, idx) => (
												<g key={idx}>
													<line
														x1={(p.xPct * 2.8) + 20}
														y1={p.prepStumpY}
														x2={(p.xPct * 2.8) + 20}
														y2={p.antagonistY}
														stroke={p.zoneColor}
														strokeWidth="2"
														strokeDasharray={p.isCollision ? "none" : "2 2"}
													/>
													<circle cx={(p.xPct * 2.8) + 20} cy={p.antagonistY} r="3" fill={p.zoneColor} />
													<circle cx={(p.xPct * 2.8) + 20} cy={p.prepStumpY} r="3" fill={p.zoneColor} />
													<rect
														x={(p.xPct * 2.8) + 8}
														y={(p.prepStumpY + p.antagonistY) / 2 - 8}
														width="26"
														height="14"
														rx="4"
														fill="rgba(0,0,0,0.85)"
														stroke={p.zoneColor}
														strokeWidth="1"
													/>
													<text
														x={(p.xPct * 2.8) + 21}
														y={(p.prepStumpY + p.antagonistY) / 2 + 2}
														fill="#ffffff"
														fontSize="8"
														fontWeight="bold"
														textAnchor="middle"
													>
														{p.clearanceMm}
													</text>
												</g>
											))}
									</svg>

									<div className="flex items-center justify-between text-xs text-slate-400 font-medium px-2">
										<span>Мин. зазор: <strong className="text-white">{crossSection.minClearanceMm} мм</strong></span>
										<span>Цементный зазор: <strong className="text-white">{cementGapMicrons} мкм</strong></span>
										<span>Мин. толщина коронки: <strong className="text-white">{crossSection.minThicknessMm} мм</strong></span>
									</div>
								</div>
							)}
						</div>

						{/* ─── HEATMAP COLOR SCALE LEGEND ─── */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)]">
							{CLEARANCE_HEATMAP_ZONES.map((zone) => {
								return (
									<div key={zone.nameRu} className="flex items-start gap-2">
										<div
											className="w-3.5 h-3.5 rounded-md mt-0.5 shrink-0 shadow-xs"
											style={{ backgroundColor: zone.colorHex }}
										/>
										<div className="min-w-0">
											<div className="text-xs font-bold text-[var(--ink)] truncate">{zone.labelRu}</div>
											<div className="text-[10px] text-[var(--muted)] font-mono">
												{zone.minMm === 0 ? `< ${zone.maxMm} мм` : zone.maxMm > 90 ? `> ${zone.minMm} мм` : `${zone.minMm}–${zone.maxMm} мм`}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* ─── SIMULATION SCENARIO PRESETS ─── */}
						<div className="space-y-2">
							<div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
								<span>Клинические сценарии окклюзии (CAD/CAM Симуляция):</span>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
								{(
									[
										{ id: "optimal", name: "🟢 Идеал", desc: "1.3–1.6 мм" },
										{ id: "tight_buccal", name: "🟡 Дефицит Щ", desc: "0.6–0.7 мм" },
										{ id: "tight_central", name: "🔴 Дефицит Фиссуры", desc: "0.4 мм" },
										{ id: "severe_collision", name: "⚠️ Коллизия", desc: "0.3 мм" },
										{ id: "excessive", name: "🔵 Избыток", desc: "> 2.2 мм" },
									] as const
								).map((p) => {
									const isSelected = activePreset === p.id;
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => handlePresetChange(p.id)}
											className={`min-h-[44px] p-2 rounded-xl text-left border transition-all ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] font-bold shadow-xs text-[var(--teal)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--teal-soft)]"
											}`}
										>
											<div className="text-xs font-bold truncate">{p.name}</div>
											<div className="text-[10px] text-[var(--muted)] font-mono">{p.desc}</div>
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* ─── RIGHT COLUMN (CLINICAL CALIPERS, VIRTUAL SLIDERS & ЗТЛ REPORT) ─── */}
					<div className="lg:col-span-5 flex flex-col gap-4">
						{/* ═══ ACTIVE LANDMARK INSPECTOR HUD ═══ */}
						<div className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl p-4 space-y-3">
							<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
								<div className="flex items-center gap-2">
									<div
										className="w-3.5 h-3.5 rounded-full shadow-xs"
										style={{ backgroundColor: activePoint.color }}
									/>
									<div>
										<h4 className="text-sm font-bold text-[var(--ink)] m-0">
											{activePoint.nameRu} ({activePoint.cuspId})
										</h4>
										<span className="text-[11px] text-[var(--muted)]">
											{activePoint.isFunctional ? "🌟 Функциональный опорный бугор" : "Направляющий защитный бугор"}
										</span>
									</div>
								</div>
								<span className="text-lg font-black font-mono text-[var(--ink)]">
									{activePoint.clearanceMm} мм
								</span>
							</div>

							{/* Tolerance Evaluation Bar */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between text-xs">
									<span className="text-[var(--muted)] font-medium">Требование «{activeMaterialSpec.nameRu.split("(")[0]}»:</span>
									<span className="font-bold font-mono">
										Мин {activePoint.evaluation.minAllowedMm} мм / Идеал {activePoint.evaluation.idealMm} мм
									</span>
								</div>

								{/* Progress visual indicator */}
								<div className="w-full h-2.5 bg-[var(--line)] rounded-full overflow-hidden flex">
									<div
										className="h-full transition-all duration-300"
										style={{
											width: `${Math.min(100, (activePoint.clearanceMm / (activePoint.evaluation.idealMm || 1.5)) * 100)}%`,
											backgroundColor: activePoint.color,
										}}
									/>
								</div>

								<div className="text-xs text-[var(--ink-2)] mt-1.5 font-medium leading-relaxed bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--line)]">
									<p className="m-0">{activePoint.evaluation.warningMessageRu}</p>
									<p className="m-0 mt-1 text-[var(--teal)] font-semibold">
										💡 {activePoint.evaluation.actionRecommendationRu}
									</p>
								</div>
							</div>
						</div>

						{/* ═══ VIRTUAL REDUCTION & VDO ADJUSTMENT SLIDERS ═══ */}
						<div className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl p-4 space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Sliders className="w-4 h-4 text-[var(--teal)]" /> Виртуальная коррекция прикуса:
								</span>
								{(vdoDeltaMm !== 0 || antagonistReductionMm !== 0 || prepReductionMm !== 0) && (
									<button
										type="button"
										onClick={handleResetAdjustments}
										className="text-xs text-[var(--teal)] font-bold flex items-center gap-1 hover:underline"
									>
										<RefreshCw className="w-3 h-3" /> Сбросить
									</button>
								)}
							</div>

							{/* Antagonist Reduction Slider */}
							<div className="space-y-1">
								<div className="flex justify-between text-xs font-medium">
									<span>Эмалопластика антагониста (сошлифовывание):</span>
									<span className="font-mono font-bold text-[var(--teal)]">+{antagonistReductionMm} мм</span>
								</div>
								<input
									type="range"
									min="0"
									max="1.5"
									step="0.1"
									value={antagonistReductionMm}
									onChange={(e) => setAntagonistReductionMm(Number(e.target.value))}
									className="w-full h-2 accent-[var(--teal)] cursor-pointer"
								/>
							</div>

							{/* Prep Stump Reduction Slider */}
							<div className="space-y-1">
								<div className="flex justify-between text-xs font-medium">
									<span>Дополнительное препарирование культи:</span>
									<span className="font-mono font-bold text-[var(--teal)]">+{prepReductionMm} мм</span>
								</div>
								<input
									type="range"
									min="0"
									max="1.5"
									step="0.1"
									value={prepReductionMm}
									onChange={(e) => setPrepReductionMm(Number(e.target.value))}
									className="w-full h-2 accent-[var(--teal)] cursor-pointer"
								/>
							</div>

							{/* Articulator VDO Offset Slider */}
							<div className="space-y-1">
								<div className="flex justify-between text-xs font-medium">
									<span>Высота прикуса в артикуляторе (VDO Pin):</span>
									<span className="font-mono font-bold text-[var(--teal)]">{vdoDeltaMm > 0 ? `+${vdoDeltaMm}` : vdoDeltaMm} мм</span>
								</div>
								<input
									type="range"
									min="-0.5"
									max="0.5"
									step="0.05"
									value={vdoDeltaMm}
									onChange={(e) => setVdoDeltaMm(Number(e.target.value))}
									className="w-full h-2 accent-[var(--teal)] cursor-pointer"
								/>
							</div>
						</div>

						{/* ═══ MATERIAL CLEARANCE SUITABILITY COMPARISON ═══ */}
						<div className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl p-4 space-y-2.5">
							<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
								<span className="flex items-center gap-1.5">
									<Sparkles className="w-4 h-4 text-[var(--teal)]" /> Совместимость материалов при зазоре {stats.minClearanceMm} мм:
								</span>
							</div>

							<div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
								{rankedMaterials.map((m) => {
									const isCurrent = m.materialId === selectedMaterialId;
									return (
										<div
											key={m.materialId}
											onClick={() => setSelectedMaterialId(m.materialId)}
											className={`min-h-[44px] p-2 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
												isCurrent
													? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-xs"
													: m.isSafe
													? "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--teal-soft)]"
													: "bg-red-500/5 border-red-500/20 text-[var(--muted)]"
											}`}
										>
											<div className="min-w-0 pr-2">
												<div className="font-bold truncate text-[var(--ink)]">
													{m.materialNameRu.split("(")[0]}
												</div>
												<div className="text-[10px] text-[var(--muted)]">
													Мин. допуск: {m.minAllowedMm} мм
												</div>
											</div>

											<div className="shrink-0 flex items-center gap-1.5">
												<span
													className={`px-2 py-0.5 rounded text-[10px] font-black ${
														m.safetyLevel === "optimal"
															? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
															: m.safetyLevel === "borderline_tight"
															? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
															: m.safetyLevel === "excessive"
															? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
															: "bg-red-500/15 text-red-600 dark:text-red-400"
													}`}
												>
													{m.safetyLevel === "optimal"
														? "Идеально"
														: m.safetyLevel === "borderline_tight"
														? "Допустимо"
														: m.safetyLevel === "excessive"
														? "Избыток"
														: `Дефицит -${m.deficiencyMm}мм`}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* ═══ LAB SPECIFICATION CARD (ЗТЛ НАСТРОЙКИ) ═══ */}
						<div className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl p-4 space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Wrench className="w-4 h-4 text-[var(--teal)]" /> Спецификация для лаборатории (ЗТЛ):
								</span>
								<button
									type="button"
									onClick={handleCopyReport}
									className="min-h-[36px] px-2.5 rounded-lg text-xs font-bold text-[var(--teal)] bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] transition-colors flex items-center gap-1 border border-[var(--teal-soft)]"
								>
									<Copy className="w-3.5 h-3.5" /> Копировать
								</button>
							</div>

							<div className="text-xs space-y-1.5 text-[var(--ink-2)] bg-[var(--paper)] p-3 rounded-xl border border-[var(--line)] font-mono leading-relaxed">
								<div>• <strong>Антагонист:</strong> {labReport.antagonistAdjustmentRu}</div>
								<div>• <strong>Толщина:</strong> {labReport.recommendedCrownThicknessMm}</div>
								<div>• <strong>Цементный зазор:</strong> {cementGapMicrons} мкм</div>
								<div>• <strong>Статус:</strong> <span className={stats.isMaterialCompliant ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>{labReport.complianceStatusRu}</span></div>
							</div>
						</div>
					</div>
				</div>

				{/* ═══ MODAL FOOTER ══════════════════════════════════════════════ */}
				<div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between shrink-0">
					<div className="text-xs text-[var(--muted)] font-medium">
						ISO 6872:2015 Стоматологическая керамика • Рекомендации Ivoclar & Katana
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-[var(--ink-2)] bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleApply}
							className="min-h-[44px] px-5 rounded-xl text-xs font-bold text-white bg-[var(--teal)] hover:opacity-90 shadow-md shadow-[var(--teal)]/20 transition-all flex items-center gap-2"
						>
							<CheckCircle2 className="w-4 h-4" />
							Применить в заказ ЗТЛ
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
