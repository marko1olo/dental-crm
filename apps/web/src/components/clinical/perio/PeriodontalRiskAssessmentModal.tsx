/**
 * DENTE Dental CRM — Periodontal Risk Assessment Modal (Lang & Tonetti PRA Spider Chart)
 *
 * Implements:
 * - Interactive 6-Axis Spider / Radar Polygon Chart for Periodontal Risk Assessment
 * - Low / Moderate / High concentric risk zones visualization
 * - Full 6-point probing metrics integration (BOP, Deep Pockets, Furcations, Mobility, Suppuration)
 * - Patient systemic & environmental risk parameter adjustments (Age, Bone Loss %, Smoking, Diabetes HbA1c)
 * - Form 043/u clinical protocol text injection and clipboard export
 * - Strict >= 44x44px touch targets and full design-token theming
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PerioToothRecord } from "@dental/shared";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Check,
	CheckCircle2,
	Cigarette,
	Copy,
	Droplet,
	FileText,
	HeartPulse,
	HelpCircle,
	Info,
	Layers,
	Printer,
	Radar,
	RotateCcw,
	Save,
	ShieldAlert,
	Sparkles,
	X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { calculateFullMouth6PointMetrics } from "./perio6PointMath";
import {
	calculateDetailedPra,
	estimateBoneLossPercentFromTeeth,
	generatePraSummaryReport,
	type DiabetesCategory,
	type PraDetailedSpiderResult,
	type PraRiskLevel,
	type SmokingCategory,
} from "./perioPraCalculator";

export interface PeriodontalRiskAssessmentModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly teeth?: readonly PerioToothRecord[] | undefined;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly initialSmokingStatus?: SmokingCategory | undefined;
	readonly initialDiabetesStatus?: DiabetesCategory | undefined;
	readonly initialBoneLossPercent?: number | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly onSavePraParameters?: ((params: {
		patientAgeYears: number;
		boneLossPercent: number;
		smokingStatus: SmokingCategory;
		diabetesStatus: DiabetesCategory;
		praResult: PraDetailedSpiderResult;
	}) => void) | undefined;
}

export function PeriodontalRiskAssessmentModal({
	isOpen,
	onClose,
	teeth = [],
	patientName,
	patientAgeYears = 45,

	initialSmokingStatus = "non_smoker",
	initialDiabetesStatus = "none",
	initialBoneLossPercent,
	onInsertToProtocol,
	onSavePraParameters,
}: PeriodontalRiskAssessmentModalProps) {
	// Full mouth 6-point metrics
	const metrics = useMemo(() => calculateFullMouth6PointMetrics(teeth), [teeth]);

	// Auto-estimate bone loss from max CAL if not provided
	const defaultBoneLoss = useMemo(() => {
		if (typeof initialBoneLossPercent === "number" && initialBoneLossPercent >= 0) {
			return initialBoneLossPercent;
		}
		return estimateBoneLossPercentFromTeeth(teeth, metrics.maxCalMm);
	}, [initialBoneLossPercent, teeth, metrics.maxCalMm]);

	// Interactive Systemic/Environmental State
	const [patientAge, setPatientAge] = useState<number>(patientAgeYears);
	const [boneLossPercent, setBoneLossPercent] = useState<number>(defaultBoneLoss);
	const [smokingStatus, setSmokingStatus] = useState<SmokingCategory>(initialSmokingStatus);
	const [diabetesStatus, setDiabetesStatus] = useState<DiabetesCategory>(initialDiabetesStatus);

	const [activeVectorKey, setActiveVectorKey] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"spider" | "vectors" | "report">("spider");
	const [copied, setCopied] = useState<boolean>(false);

	// Sync state if props change when opening
	useEffect(() => {
		if (isOpen) {
			setPatientAge(patientAgeYears);
			setSmokingStatus(initialSmokingStatus);
			setDiabetesStatus(initialDiabetesStatus);
			if (typeof initialBoneLossPercent === "number") {
				setBoneLossPercent(initialBoneLossPercent);
			} else {
				setBoneLossPercent(estimateBoneLossPercentFromTeeth(teeth, metrics.maxCalMm));
			}
			setActiveVectorKey(null);
			setCopied(false);
		}
	}, [isOpen, patientAgeYears, initialSmokingStatus, initialDiabetesStatus, initialBoneLossPercent, teeth, metrics.maxCalMm]);

	// ESC key handler to close modal
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Compute detailed PRA
	const praResult = useMemo<PraDetailedSpiderResult>(() => {
		return calculateDetailedPra({
			teeth,
			patientAgeYears: patientAge,
			radiographicBoneLossPercent: boneLossPercent,
			smokingStatus,
			diabetesStatus,
		});
	}, [teeth, patientAge, boneLossPercent, smokingStatus, diabetesStatus]);

	const handleResetToAuto = useCallback(() => {
		const autoBl = estimateBoneLossPercentFromTeeth(teeth, metrics.maxCalMm);
		setBoneLossPercent(autoBl);
		showToast(`Уровень костной резорбции рассчитан по максимальному CAL (${metrics.maxCalMm} мм): ${autoBl}%`, "info");
	}, [teeth, metrics.maxCalMm]);

	const handleCopyReport = useCallback(() => {
		const reportText = generatePraSummaryReport(praResult, patientName);
		navigator.clipboard.writeText(reportText);
		setCopied(true);
		showToast("Сводка PRA скопирована в буфер обмена", "success");
		setTimeout(() => setCopied(false), 2500);
	}, [praResult, patientName]);

	const handleInsertToProtocol = useCallback(() => {
		const reportText = generatePraSummaryReport(praResult, patientName);
		if (onInsertToProtocol) {
			onInsertToProtocol(reportText);
			showToast("Профиль риска PRA добавлен в протокол 043/у", "success");
			onClose();
		} else {
			handleCopyReport();
		}
	}, [praResult, patientName, onInsertToProtocol, onClose, handleCopyReport]);

	const handleSave = useCallback(() => {
		if (onSavePraParameters) {
			onSavePraParameters({
				patientAgeYears: patientAge,
				boneLossPercent,
				smokingStatus,
				diabetesStatus,
				praResult,
			});
			showToast("Параметры риска PRA сохранены", "success");
		}
		onClose();
	}, [onSavePraParameters, patientAge, boneLossPercent, smokingStatus, diabetesStatus, praResult, onClose]);

	if (!isOpen) return null;

	// Vector list for easy iteration
	const vectorList = [
		praResult.vectors.bop,
		praResult.vectors.deepPockets,
		praResult.vectors.toothLoss,
		praResult.vectors.boneLossAgeRatio,
		praResult.vectors.systemicDiabetes,
		praResult.vectors.environmentalSmoking,
	];

	const activeVector = activeVectorKey
		? vectorList.find((v) => v.vectorKey === activeVectorKey) ?? null
		: null;

	const riskBadgeStyles: Record<PraRiskLevel, { bg: string; text: string; border: string; label: string }> = {
		low: {
			bg: "bg-emerald-50 dark:bg-emerald-950/40",
			text: "text-emerald-700 dark:text-emerald-300",
			border: "border-emerald-200 dark:border-emerald-800",
			label: "НИЗКИЙ РИСК",
		},
		moderate: {
			bg: "bg-amber-50 dark:bg-amber-950/40",
			text: "text-amber-700 dark:text-amber-300",
			border: "border-amber-200 dark:border-amber-800",
			label: "СРЕДНИЙ РИСК",
		},
		high: {
			bg: "bg-red-50 dark:bg-red-950/40",
			text: "text-red-700 dark:text-red-300",
			border: "border-red-200 dark:border-red-800",
			label: "ВЫСОКИЙ РИСК",
		},
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pra-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
							<Radar className="w-5 h-5" />
						</div>
						<div>
							<h2 id="pra-modal-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
								<span>Пародонтологический профиль риска (PRA по Lang & Tonetti)</span>
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
								{patientName ? `Пациент: ${patientName} • ` : ""}6 диагностических векторов риска и паутинная диаграмма
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Tab navigation */}
						<div className="hidden sm:inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5">
							<button
								type="button"
								onClick={() => setActiveTab("spider")}
								className={`min-h-[40px] px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
									activeTab === "spider"
										? "bg-[var(--paper,#ffffff)] text-blue-600 dark:text-blue-400 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
								}`}
							>
								Диаграмма
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("vectors")}
								className={`min-h-[40px] px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
									activeTab === "vectors"
										? "bg-[var(--paper,#ffffff)] text-blue-600 dark:text-blue-400 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
								}`}
							>
								Векторы ({praResult.highRiskVectorsCount}H / {praResult.moderateRiskVectorsCount}M)
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("report")}
								className={`min-h-[40px] px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
									activeTab === "report"
										? "bg-[var(--paper,#ffffff)] text-blue-600 dark:text-blue-400 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
								}`}
							>
								Текст протокола
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							aria-label="Закрыть"
							className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{/* Top Summary Banner: Overall Risk Level + Prognosis + Recommended SPT Interval */}
					<div className={`p-4 rounded-2xl border ${riskBadgeStyles[praResult.overallRisk].border} ${riskBadgeStyles[praResult.overallRisk].bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs`}>
						<div className="space-y-1">
							<div className="flex items-center gap-2.5">
								<span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase border ${riskBadgeStyles[praResult.overallRisk].border} bg-[var(--paper,#ffffff)] ${riskBadgeStyles[praResult.overallRisk].text}`}>
									{riskBadgeStyles[praResult.overallRisk].label}
								</span>
								<h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
									{praResult.overallRiskLabelRu}
								</h3>
							</div>
							<p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
								{praResult.overallPrognosisRu}
							</p>
						</div>

						<div className="flex items-center gap-3 bg-[var(--paper,#ffffff)] dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 self-stretch md:self-auto">
							<div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
								<RotateCcw className="w-4 h-4" />
							</div>
							<div>
								<span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
									Рекомендуемый интервал SPT
								</span>
								<span className="text-xs font-black text-slate-900 dark:text-slate-100">
									{praResult.recommendedRecallDescriptionRu}
								</span>
							</div>
						</div>
					</div>

					{/* Main Grid: Left Side (Spider Diagram or Vectors) | Right Side (Inputs & Probing Stats) */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
						{/* LEFT PANEL (7 Cols): Spider Chart / Vectors View */}
						<div className="lg:col-span-7 space-y-4">
							{activeTab === "spider" && (
								<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
									<div className="w-full flex items-center justify-between mb-2">
										<span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
											<Radar className="w-4 h-4 text-blue-500" />
											<span>Паутинная диаграмма рисков</span>
										</span>
										<span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
											Нажмите на точку для подробностей
										</span>
									</div>

									{/* SVG Spider Chart */}
									<div className="relative w-full max-w-[360px] aspect-square flex items-center justify-center my-2">
										<svg
											viewBox="0 0 320 320"
											className="w-full h-full overflow-visible drop-shadow-sm select-none"
										>
											{/* Background concentric risk zone polygons */}
											{/* High Risk Outer Zone (Red) */}
											<polygon
												points={praResult.zonePolygonRings.highZonePoints}
												className="fill-red-500/10 stroke-red-400/40 dark:fill-red-950/20 dark:stroke-red-800/40"
												strokeWidth="1.5"
												strokeDasharray="3 3"
											/>
											{/* Moderate Risk Middle Zone (Amber) */}
											<polygon
												points={praResult.zonePolygonRings.moderateZonePoints}
												className="fill-amber-500/10 stroke-amber-400/50 dark:fill-amber-950/20 dark:stroke-amber-800/50"
												strokeWidth="1.5"
												strokeDasharray="2 2"
											/>
											{/* Low Risk Inner Zone (Green) */}
											<polygon
												points={praResult.zonePolygonRings.lowZonePoints}
												className="fill-emerald-500/15 stroke-emerald-500/60 dark:fill-emerald-950/30 dark:stroke-emerald-700/60"
												strokeWidth="1.5"
											/>

											{/* Radial Axis lines from center (160, 160) */}
											{praResult.radarCoordinates.map((coord, i) => {
												const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
												const outerX = Math.round(160 + 122 * Math.cos(angle));
												const outerY = Math.round(160 + 122 * Math.sin(angle));
												return (
													<line
														key={`axis-${i}`}
														x1="160"
														y1="160"
														x2={outerX}
														y2={outerY}
														className="stroke-slate-300 dark:stroke-slate-700"
														strokeWidth="1.2"
													/>
												);
											})}

											{/* Center bullseye */}
											<circle cx="160" cy="160" r="3" className="fill-slate-400 dark:fill-slate-600" />

											{/* Patient Risk Profile Polygon */}
											<polygon
												points={praResult.radarPolygonPoints}
												className="fill-blue-500/35 stroke-blue-600 dark:fill-blue-600/30 dark:stroke-blue-400 transition-all duration-300"
												strokeWidth="2.5"
												strokeLinejoin="round"
											/>

											{/* Vertex Marker Points with Interactive Hover/Click */}
											{praResult.radarCoordinates.map((point, index) => {
												const vector = vectorList[index];
												if (!vector) return null;
												const isSelected = activeVectorKey === vector.vectorKey;
												const pointColor =
													vector.riskLevel === "high"
														? "#ef4444"
														: vector.riskLevel === "moderate"
															? "#f59e0b"
															: "#10b981";

												return (
													<g
														key={`vertex-${vector.vectorKey}`}
														className="cursor-pointer group"
														onClick={() => setActiveVectorKey(vector.vectorKey)}
													>
														{/* Invisible enlarged hit target for effortless tapping */}
														<circle cx={point.x} cy={point.y} r="18" fill="transparent" />
														{/* Outer ring on selection */}
														{isSelected && (
															<circle
																cx={point.x}
																cy={point.y}
																r="10"
																fill="none"
																stroke={pointColor}
																strokeWidth="2"
																className="animate-ping opacity-75"
															/>
														)}
														<circle
															cx={point.x}
															cy={point.y}
															r={isSelected ? "6" : "4.5"}
															fill={pointColor}
															stroke="#ffffff"
															strokeWidth="2"
															className="transition-all duration-150 group-hover:scale-125"
														/>
													</g>
												);
											})}

											{/* Axis Label Annotations */}
											{vectorList.map((v, i) => {
												const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
												const labelRadius = 142;
												const lx = 160 + labelRadius * Math.cos(angle);
												const ly = 160 + labelRadius * Math.sin(angle);
												const isSelected = activeVectorKey === v.vectorKey;

												let textAnchor: "middle" | "start" | "end" = "middle";
												if (Math.cos(angle) > 0.3) textAnchor = "start";
												else if (Math.cos(angle) < -0.3) textAnchor = "end";

												return (
													<text
														key={`label-${v.vectorKey}`}
														x={lx}
														y={ly}
														textAnchor={textAnchor}
														dominantBaseline="central"
														className={`text-[11px] font-black transition-colors cursor-pointer ${
															isSelected
																? "fill-blue-600 dark:fill-blue-400 font-extrabold"
																: v.riskLevel === "high"
																	? "fill-red-600 dark:fill-red-400"
																	: v.riskLevel === "moderate"
																		? "fill-amber-600 dark:fill-amber-400"
																		: "fill-slate-700 dark:fill-slate-300"
														}`}
														onClick={() => setActiveVectorKey(v.vectorKey)}
													>
														{v.shortName} ({v.valueDisplay})
													</text>
												);
											})}
										</svg>
									</div>

									{/* Chart Legend */}
									<div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-bold mt-2">
										<div className="flex items-center gap-1.5">
											<span className="w-3 h-3 rounded-full bg-emerald-500/80" />
											<span className="text-slate-600 dark:text-slate-400">Низкий (≤ 1 умеренный)</span>
										</div>
										<div className="flex items-center gap-1.5">
											<span className="w-3 h-3 rounded-full bg-amber-500/80" />
											<span className="text-slate-600 dark:text-slate-400">Средний (≥ 2 умеренных / 1 высокий)</span>
										</div>
										<div className="flex items-center gap-1.5">
											<span className="w-3 h-3 rounded-full bg-red-500/80" />
											<span className="text-slate-600 dark:text-slate-400">Высокий (≥ 2 высоких)</span>
										</div>
									</div>
								</div>
							)}

							{/* Selected Vector Details Card (or All Vectors List if Vectors tab is active) */}
							{activeVector && (
								<div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 animate-in fade-in slide-in-from-top-2 duration-150">
									<div className="flex items-center justify-between mb-1.5">
										<div className="flex items-center gap-2">
											<span className="text-xs font-black text-blue-900 dark:text-blue-200">
												{activeVector.nameRu}
											</span>
											<span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${riskBadgeStyles[activeVector.riskLevel].bg} ${riskBadgeStyles[activeVector.riskLevel].text} border ${riskBadgeStyles[activeVector.riskLevel].border}`}>
												{activeVector.riskLevel}
											</span>
										</div>
										<span className="text-xs font-black text-slate-900 dark:text-slate-100">
											{activeVector.valueDisplay}
										</span>
									</div>
									<p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
										<span className="font-semibold">Пороги: </span>{activeVector.thresholdDescriptionRu}
									</p>
									<p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
										<span className="font-bold">Рекомендация: </span>{activeVector.clinicalAdviceRu}
									</p>
								</div>
							)}

							{/* Vectors List (Shown when "Векторы" tab is active) */}
							{activeTab === "vectors" && (
								<div className="space-y-2.5">
									{vectorList.map((v) => (
										<div
											key={v.vectorKey}
											className={`p-3.5 rounded-xl border transition-all ${
												activeVectorKey === v.vectorKey
													? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40"
													: "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40"
											} cursor-pointer hover:border-blue-400`}
											onClick={() => setActiveVectorKey(v.vectorKey)}
										>
											<div className="flex items-center justify-between mb-1">
												<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
													{v.nameRu}
												</span>
												<div className="flex items-center gap-2">
													<span className="text-xs font-black text-slate-800 dark:text-slate-200">
														{v.valueDisplay}
													</span>
													<span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${riskBadgeStyles[v.riskLevel].bg} ${riskBadgeStyles[v.riskLevel].text} border ${riskBadgeStyles[v.riskLevel].border}`}>
														{v.riskLevel}
													</span>
												</div>
											</div>
											<p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
												{v.thresholdDescriptionRu}
											</p>
											<p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
												{v.clinicalAdviceRu}
											</p>
										</div>
									))}
								</div>
							)}

							{/* Report Text View (Shown when "Текст протокола" tab is active) */}
							{activeTab === "report" && (
								<div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed max-h-[380px]">
									{generatePraSummaryReport(praResult, patientName)}
								</div>
							)}
						</div>

						{/* RIGHT PANEL (5 Cols): Patient Parameters & 6-Point Statistics */}
						<div className="lg:col-span-5 space-y-4">
							{/* Section 1: Patient Systemic & Environmental Risk Input Controls */}
							<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
								<div className="flex items-center justify-between">
									<h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
										<HeartPulse className="w-4 h-4 text-rose-500" />
										<span>Системные параметры пациента</span>
									</h4>
									<button
										type="button"
										onClick={handleResetToAuto}
										title="Пересчитать резорбцию по максимальному CAL"
										className="min-h-[44px] text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
									>
										<Sparkles className="w-3.5 h-3.5" />
										<span>Авто по CAL</span>
									</button>
								</div>

								{/* Age Input */}
								<div className="space-y-1">
									<div className="flex items-center justify-between">
										<label htmlFor="pra-age-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
											Возраст пациента (лет)
										</label>
										<span className="text-xs font-black text-slate-900 dark:text-slate-100">
											{patientAge} лет
										</span>
									</div>
									<input
										id="pra-age-input"
										type="range"
										min="18"
										max="95"
										value={patientAge}
										onChange={(e) => setPatientAge(parseInt(e.target.value, 10) || 45)}
										className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
									/>
								</div>

								{/* Radiographic Bone Loss (%) Slider */}
								<div className="space-y-1">
									<div className="flex items-center justify-between">
										<label htmlFor="pra-boneloss-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
											Рентгенологическая потеря кости (%)
										</label>
										<span className="text-xs font-black text-slate-900 dark:text-slate-100">
											{boneLossPercent}% (BL/Age = {praResult.calculatedBlAgeRatio})
										</span>
									</div>
									<input
										id="pra-boneloss-input"
										type="range"
										min="0"
										max="90"
										step="5"
										value={boneLossPercent}
										onChange={(e) => setBoneLossPercent(parseInt(e.target.value, 10) || 0)}
										className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
									/>
								</div>

								{/* Diabetes Mellitus Status (HbA1c) */}
								<div className="space-y-1.5">
									<label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
										Сахарный диабет (HbA1c)
									</label>
									<div className="grid grid-cols-3 gap-1.5">
										<button
											type="button"
											onClick={() => setDiabetesStatus("none")}
											className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
												diabetesStatus === "none"
													? "bg-emerald-600 text-white shadow-xs"
													: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
											}`}
										>
											Нет (норма)
										</button>
										<button
											type="button"
											onClick={() => setDiabetesStatus("controlled")}
											className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
												diabetesStatus === "controlled"
													? "bg-amber-500 text-white shadow-xs"
													: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
											}`}
										>
											СД 6.0–7.0%
										</button>
										<button
											type="button"
											onClick={() => setDiabetesStatus("uncontrolled")}
											className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
												diabetesStatus === "uncontrolled"
													? "bg-red-600 text-white shadow-xs"
													: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
											}`}
										>
											СД &gt; 7.0%
										</button>
									</div>
								</div>

								{/* Smoking Status */}
								<div className="space-y-1.5">
									<label className="text-xs font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
										<Cigarette className="w-3.5 h-3.5 text-slate-500" />
										<span>Курение табака</span>
									</label>
									<div className="grid grid-cols-3 gap-1.5">
										<button
											type="button"
											onClick={() => setSmokingStatus("non_smoker")}
											className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
												smokingStatus === "non_smoker"
													? "bg-emerald-600 text-white shadow-xs"
													: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
											}`}
										>
											Не курит
										</button>
										<button
											type="button"
											onClick={() => setSmokingStatus("light")}
											className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
												smokingStatus === "light"
													? "bg-amber-500 text-white shadow-xs"
													: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
											}`}
										>
											≤ 10 сиг/день
										</button>
										<button
											type="button"
											onClick={() => setSmokingStatus("heavy")}
											className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
												smokingStatus === "heavy"
													? "bg-red-600 text-white shadow-xs"
													: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
											}`}
										>
											&gt; 10 сиг/день
										</button>
									</div>
								</div>
							</div>

							{/* Section 2: Probing Metrics & Dental Findings */}
							<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
								<h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
									<Layers className="w-4 h-4 text-indigo-500" />
									<span>Данные 6-точечного зондирования</span>
								</h4>

								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
										<span className="text-[11px] font-bold text-slate-500 block">BOP (Кровоточивость)</span>
										<span className={`text-sm font-black ${metrics.bopPercent > 25 ? "text-red-600" : metrics.bopPercent >= 10 ? "text-amber-600" : "text-emerald-600"}`}>
											{metrics.bopPercent}% ({metrics.bopSitesCount}/{metrics.totalSitesProbed})
										</span>
									</div>

									<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
										<span className="text-[11px] font-bold text-slate-500 block">Карманы PD ≥ 5 мм</span>
										<span className={`text-sm font-black ${metrics.deepPocketsCount >= 9 ? "text-red-600" : metrics.deepPocketsCount >= 5 ? "text-amber-600" : "text-slate-800 dark:text-slate-200"}`}>
											{metrics.deepPocketsCount} участков
										</span>
									</div>

									<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
										<span className="text-[11px] font-bold text-slate-500 block">Макс. PD / CAL</span>
										<span className="text-sm font-black text-slate-800 dark:text-slate-200">
											{metrics.maxPocketDepthMm} мм / {metrics.maxCalMm} мм
										</span>
									</div>

									<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
										<span className="text-[11px] font-bold text-slate-500 block">Потеря зубов</span>
										<span className="text-sm font-black text-slate-800 dark:text-slate-200">
											{metrics.missingTeethCount} зубов
										</span>
									</div>

									<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
										<span className="text-[11px] font-bold text-slate-500 block">Нагноение (Suppuration)</span>
										<span className={`text-sm font-black ${metrics.suppurationSitesCount > 0 ? "text-red-600" : "text-slate-800 dark:text-slate-200"}`}>
											{metrics.suppurationSitesCount} участков
										</span>
									</div>

									<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
										<span className="text-[11px] font-bold text-slate-500 block">Фуркации / Подвижность</span>
										<span className="text-sm font-black text-slate-800 dark:text-slate-200">
											{metrics.teethWithFurcationCount} / {metrics.teethWithMobilityCount} шт.
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Modal Footer Actions */}
				<div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyReport}
							className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
						>
							{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
							<span>{copied ? "Скопировано!" : "Копировать PRA"}</span>
						</button>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							Закрыть
						</button>

						{onInsertToProtocol && (
							<button
								type="button"
								onClick={handleInsertToProtocol}
								className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
							>
								<FileText className="w-4 h-4" />
								<span>Вставить в протокол 043/у</span>
							</button>
						)}

						{onSavePraParameters && (
							<button
								type="button"
								onClick={handleSave}
								className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
							>
								<Save className="w-4 h-4" />
								<span>Сохранить профиль</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
