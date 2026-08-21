import React, { useEffect, useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Award,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	FileText,
	Info,
	Layers,
	PieChart as PieChartIcon,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import {
	ALL_PRIMARY_TEETH,
	type CariogramInput,
	type CariogramResult,
	DEFAULT_CARIOGRAM_INPUT,
	type DentitionMode,
	type DentitionStageCategory,
	generateCariogramPieChartSlices,
	getPrimaryToothResorptionVisual,
	isPrimaryTooth,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
	calculateCariogramRisk,
	calculateEruptionTimelineByAge,
	type ToothExchangeStatus,
} from "./pediatricDentitionEngine";
import type { ToothData } from "./ToothChart";
import { showToast } from "../GlobalToast";

const UPPER_PRIMARY_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const LOWER_PRIMARY_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export interface PediatricMixedDentitionModalProps {
	isOpen: boolean;
	onClose: () => void;
	teethData?: ToothData[];
	onApplyAgeArch?: (teethNumbers: number[]) => void;
	onUpdateToothResorption?: (toothNumber: number, resorptionStage: ResorptionStagePercent) => void;
	onBatchUpdateResorption?: (updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[]) => void;
	initialAge?: number;
}

type ModalTab = "timeline" | "cariogram" | "resorption";

export const PediatricMixedDentitionModal: React.FC<PediatricMixedDentitionModalProps> = ({
	isOpen,
	onClose,
	teethData = [],
	onApplyAgeArch,
	onUpdateToothResorption,
	onBatchUpdateResorption,
	initialAge = 7.5,
}) => {
	const [activeTab, setActiveTab] = useState<ModalTab>("timeline");

	// 1. Eruption Timeline State
	const [selectedAge, setSelectedAge] = useState<number>(initialAge);
	const timelineAnalysis = useMemo(
		() => calculateEruptionTimelineByAge(selectedAge),
		[selectedAge],
	);

	// 2. Cariogram State
	const [cariogramInput, setCariogramInput] = useState<CariogramInput>(DEFAULT_CARIOGRAM_INPUT);
	const cariogramResult = useMemo(
		() => calculateCariogramRisk(cariogramInput),
		[cariogramInput],
	);

	// 3. Resorption Selected Primary Tooth
	const [selectedPrimaryTooth, setSelectedPrimaryTooth] = useState<number>(51);
	const [selectedResorptionStage, setSelectedResorptionStage] = useState<ResorptionStagePercent>(0);

	// SVG Slices for Cariogram Donut
	const pieSlices = useMemo(
		() =>
			generateCariogramPieChartSlices(
				cariogramResult.sectors,
				110, // outer radius
				48, // inner radius (donut)
				{ x: 130, y: 130 },
			),
		[cariogramResult.sectors],
	);

	// Keyboard Navigation and Fast Hotkeys
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			const activeTag = (document.activeElement?.tagName || "").toUpperCase();
			if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
				return;
			}

			// Esc: Close modal
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}

			// Enter: Apply timeline age formula or apply resorption
			if (e.key === "Enter") {
				e.preventDefault();
				if (activeTab === "timeline" && onApplyAgeArch) {
					onApplyAgeArch([
						...timelineAnalysis.expectedUpperArchTeeth,
						...timelineAnalysis.expectedLowerArchTeeth,
					]);
					showToast(
						`Возрастная зубная формула (${selectedAge.toFixed(1)} лет) применена к одонтограмме`,
						"success",
						3000,
					);
				} else if (activeTab === "resorption" && onUpdateToothResorption) {
					onUpdateToothResorption(selectedPrimaryTooth, selectedResorptionStage);
					showToast(
						`Резорбция ${selectedResorptionStage}% применена к молочному зубу ${selectedPrimaryTooth}`,
						"success",
						3000,
					);
				}
				return;
			}

			// Fast keys 0, 1, 2, 3, 4 for root resorption stages (0%, 25%, 50%, 75%, 100%)
			const resorptionMap: Record<string, ResorptionStagePercent> = {
				"0": 0,
				"1": 25,
				"2": 50,
				"3": 75,
				"4": 100,
			};
			if (resorptionMap[e.key] !== undefined) {
				const stage = resorptionMap[e.key]!;
				e.preventDefault();
				setSelectedResorptionStage(stage);
				if (onUpdateToothResorption) {
					onUpdateToothResorption(selectedPrimaryTooth, stage);
					showToast(
						`Зуб ${selectedPrimaryTooth}: установлена резорбция ${stage}% (${RESORPTION_STAGE_DEFINITIONS[stage].nameRu})`,
						"info",
						2000,
					);
				}
				return;
			}

			// Arrow Navigation across primary dental arches
			if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"].includes(e.key)) {
				e.preventDefault();
				let nextTooth: number = selectedPrimaryTooth;

				if (e.key === "Tab") {
					const all: readonly number[] = ALL_PRIMARY_TEETH;
					const idx = all.indexOf(selectedPrimaryTooth);
					if (e.shiftKey) {
						nextTooth = idx > 0 ? (all[idx - 1] ?? all[0]!) : all[all.length - 1]!;
					} else {
						nextTooth = idx >= 0 && idx < all.length - 1 ? (all[idx + 1] ?? all[0]!) : all[0]!;
					}
				} else if (e.key === "ArrowLeft") {
					const isUpper = UPPER_PRIMARY_TEETH.includes(selectedPrimaryTooth);
					const arch = isUpper ? UPPER_PRIMARY_TEETH : LOWER_PRIMARY_TEETH;
					const idx = arch.indexOf(selectedPrimaryTooth);
					if (idx > 0 && arch[idx - 1] !== undefined) nextTooth = arch[idx - 1]!;
				} else if (e.key === "ArrowRight") {
					const isUpper = UPPER_PRIMARY_TEETH.includes(selectedPrimaryTooth);
					const arch = isUpper ? UPPER_PRIMARY_TEETH : LOWER_PRIMARY_TEETH;
					const idx = arch.indexOf(selectedPrimaryTooth);
					if (idx >= 0 && idx < arch.length - 1 && arch[idx + 1] !== undefined) nextTooth = arch[idx + 1]!;
				} else if (e.key === "ArrowDown") {
					const idx = UPPER_PRIMARY_TEETH.indexOf(selectedPrimaryTooth);
					if (idx >= 0 && LOWER_PRIMARY_TEETH[idx] !== undefined) {
						nextTooth = LOWER_PRIMARY_TEETH[idx]!;
					}
				} else if (e.key === "ArrowUp") {
					const idx = LOWER_PRIMARY_TEETH.indexOf(selectedPrimaryTooth);
					if (idx >= 0 && UPPER_PRIMARY_TEETH[idx] !== undefined) {
						nextTooth = UPPER_PRIMARY_TEETH[idx]!;
					}
				}

				setSelectedPrimaryTooth(nextTooth);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		activeTab,
		selectedPrimaryTooth,
		selectedResorptionStage,
		selectedAge,
		timelineAnalysis,
		onApplyAgeArch,
		onUpdateToothResorption,
		onClose,
	]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pediatric-modal-title"
		>
			<div
				className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] rounded-3xl border border-[var(--odontogram-border,#cbd5e1)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:px-8 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-glow)] shrink-0 shadow-inner">
							<Sparkles className="w-6 h-6" />
						</div>
						<div>
							<h2
								id="pediatric-modal-title"
								className="text-lg sm:text-xl font-black tracking-tight text-[var(--odontogram-ink,#0f172a)]"
							>
								Детский и сменный прикус: Сроки смены & Cariogram
							</h2>
							<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
								Физиологическая резорбция корней (0–100%), эксфолиация и оценка кариесогенного риска по Douglas Bratthall (ВОЗ)
							</p>
						</div>
					</div>

					{/* Close Button */}
					<button
						type="button"
						onClick={onClose}
						className="self-end sm:self-center p-2 rounded-xl text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-transparent hover:border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)] overflow-x-auto scrollbar-none">
					<button
						type="button"
						onClick={() => setActiveTab("timeline")}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
							activeTab === "timeline"
								? "border-[var(--teal)] text-[var(--teal)] bg-[var(--odontogram-paper,#ffffff)] shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
						}`}
					>
						<Clock className="w-4 h-4" />
						<span>Сроки смены (6–12 лет)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("cariogram")}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
							activeTab === "cariogram"
								? "border-[var(--teal)] text-[var(--teal)] bg-[var(--odontogram-paper,#ffffff)] shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
						}`}
					>
						<PieChartIcon className="w-4 h-4" />
						<span>Cariogram (Риск кариеса)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("resorption")}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
							activeTab === "resorption"
								? "border-[var(--teal)] text-[var(--teal)] bg-[var(--odontogram-paper,#ffffff)] shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
						}`}
					>
						<Layers className="w-4 h-4" />
						<span>Шкала резорбции корней (0–100%)</span>
					</button>
				</div>

				{/* Modal Body Container */}
				<div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
					{/* ------------------------------------------------------------------------- */}
					{/* TAB 1: ERUPTION & MIXED DENTITION TIMELINE */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "timeline" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							{/* Age Slider & Preset Bar */}
							<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
											Калькулятор смены зубов
										</span>
										<h3 className="text-base font-extrabold text-[var(--odontogram-ink,#0f172a)]">
											Возраст ребенка:{" "}
											<span className="text-[var(--teal)] font-mono">
												{selectedAge.toFixed(1)} лет ({Math.round(selectedAge * 12)} мес.)
											</span>
										</h3>
									</div>

									{/* Stage Badge */}
									<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-glow)] text-xs font-bold">
										<Clock className="w-3.5 h-3.5" />
										<span>{timelineAnalysis.stageNameRu}</span>
									</div>
								</div>

								{/* Range Slider */}
								<div className="space-y-2">
									<input
										type="range"
										min="5.0"
										max="13.5"
										step="0.1"
										value={selectedAge}
										onChange={(e) => setSelectedAge(Number.parseFloat(e.target.value))}
										className="w-full h-2.5 bg-[var(--odontogram-border-subtle,#e2e8f0)] rounded-lg appearance-none cursor-pointer accent-[var(--teal)]"
										aria-label="Возраст ребенка для расчета смены прикуса"
									/>
									<div className="flex justify-between text-[11px] text-[var(--odontogram-ink-muted,#64748b)] font-mono font-semibold">
										<span>5.0 лет</span>
										<span>6.0 (1-е моляры)</span>
										<span>8.0 (Резцы)</span>
										<span>10.0 (Премоляры)</span>
										<span>12.0 (2-е моляры)</span>
										<span>13.5 лет</span>
									</div>
								</div>

								{/* Quick Presets */}
								<div className="flex flex-wrap items-center gap-2 pt-1">
									<span className="text-xs font-semibold text-[var(--odontogram-ink-muted,#64748b)] mr-1">
										Пресеты:
									</span>
									{[5.5, 6.0, 7.0, 8.5, 10.5, 12.0].map((age) => (
										<button
											key={age}
											type="button"
											onClick={() => setSelectedAge(age)}
											className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
												Math.abs(selectedAge - age) < 0.1
													? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] border-[var(--teal)] shadow-xs"
													: "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
											}`}
										>
											{age.toFixed(1)} лет
										</button>
									))}
								</div>

								<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] italic">
									{timelineAnalysis.stageDescriptionRu}
								</p>
							</div>

							{/* Dental Arch Visual Preview */}
							<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-4">
								<div className="flex items-center justify-between">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
										Ожидаемая зубная формула в {selectedAge.toFixed(1)} лет
									</h4>
								</div>

								{/* Upper Arch Pills */}
								<div className="space-y-2">
									<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
										Верхняя челюсть ({timelineAnalysis.expectedUpperArchTeeth.length} зубов):
									</div>
									<div className="flex flex-wrap gap-2">
										{timelineAnalysis.expectedUpperArchTeeth.map((num) => {
											const isPrim = isPrimaryTooth(num);
											const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
											return (
												<span
													key={num}
													className={`min-w-[44px] min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-mono font-black border flex items-center justify-center gap-1.5 shadow-xs ${
														isErupting
															? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
															: isPrim
																? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
																: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
													}`}
													title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
												>
													<span>{num}</span>
													<span className="text-[9px] opacity-75">{isPrim ? "Мол." : "Пост."}</span>
												</span>
											);
										})}
									</div>
								</div>

								{/* Lower Arch Pills */}
								<div className="space-y-2">
									<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
										Нижняя челюсть ({timelineAnalysis.expectedLowerArchTeeth.length} зубов):
									</div>
									<div className="flex flex-wrap gap-2">
										{timelineAnalysis.expectedLowerArchTeeth.map((num) => {
											const isPrim = isPrimaryTooth(num);
											const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
											return (
												<span
													key={num}
													className={`min-w-[44px] min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-mono font-black border flex items-center justify-center gap-1.5 shadow-xs ${
														isErupting
															? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
															: isPrim
																? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
																: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
													}`}
													title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
												>
													<span>{num}</span>
													<span className="text-[9px] opacity-75">{isPrim ? "Мол." : "Пост."}</span>
												</span>
											);
										})}
									</div>
								</div>

								{/* Big Tactile Action Button */}
								{onApplyAgeArch && (
									<div className="pt-2">
										<button
											type="button"
											onClick={() =>
												onApplyAgeArch([
													...timelineAnalysis.expectedUpperArchTeeth,
													...timelineAnalysis.expectedLowerArchTeeth,
												])
											}
											className="w-full min-h-[48px] flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-600/20 transition-all cursor-pointer active:scale-[0.98]"
										>
											<Sparkles className="w-5 h-5" />
											<span>Применить возрастную формулу ({selectedAge.toFixed(1)} лет) к одонтограмме</span>
										</button>
									</div>
								)}
							</div>

							{/* Clinical Alerts / Space Maintenance Cards */}
							{timelineAnalysis.clinicalAlerts.length > 0 && (
								<div className="space-y-3">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
										Клинические рекомендации & Профилактика
									</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{timelineAnalysis.clinicalAlerts.map((alert, idx) => (
											<div
												key={idx}
												className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-start gap-3"
											>
												<AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
												<div className="space-y-1">
													<div className="text-xs font-bold text-amber-900 dark:text-amber-200">
														{alert.titleRu}
													</div>
													<div className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
														{alert.textRu}
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Detailed Tooth Exchange Matrix */}
							<div className="space-y-3">
								<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
									Матрица смены зубов ({timelineAnalysis.toothStatuses.length} пар)
								</h4>
								<div className="overflow-x-auto rounded-2xl border border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
									<table className="w-full text-left text-xs border-collapse">
										<thead>
											<tr className="border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] font-bold">
												<th className="p-3">Молочный зуб</th>
												<th className="p-3">Постоянный наследник</th>
												<th className="p-3">Норма смены</th>
												<th className="p-3">Текущий статус</th>
												<th className="p-3">Резорбция корня</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--odontogram-border-subtle,#e2e8f0)]">
											{timelineAnalysis.toothStatuses.map((st) => {
												const resDef = RESORPTION_STAGE_DEFINITIONS[st.expectedResorptionPercent];
												return (
													<tr
														key={st.fdiNumber}
														className="hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]/60 transition-colors"
													>
														<td className="p-3 font-mono font-bold text-[var(--teal)]">
															Зуб {st.predecessorPrimaryFdi}
														</td>
														<td className="p-3 font-mono font-bold text-[var(--odontogram-ink,#0f172a)]">
															Зуб {st.successorPermanentFdi}
														</td>
														<td className="p-3 font-mono text-[var(--odontogram-ink-muted,#64748b)]">
															{st.normalEruptionAgeRangeYears[0].toFixed(1)}–{st.normalEruptionAgeRangeYears[1].toFixed(1)} лет
														</td>
														<td className="p-3">
															<span
																className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
																	st.status === "future_permanent"
																		? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
																		: st.status === "exfoliating" || st.status === "erupting"
																			? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
																			: "bg-teal-500/15 text-teal-700 dark:text-teal-300"
																}`}
															>
																{st.labelRu}
															</span>
														</td>
														<td className="p-3">
															<span
																className="px-2 py-0.5 rounded-md font-bold text-[11px]"
																style={{
																	backgroundColor: resDef.badgeBg,
																	color: resDef.badgeColor,
																}}
															>
																{st.expectedResorptionPercent}%
															</span>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					{/* ------------------------------------------------------------------------- */}
					{/* TAB 2: CARIOGRAM RISK CLASSIFIER (BRATTHALL MODEL) */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "cariogram" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							{/* Top Summary Banner: Risk Gauge & Donut Chart */}
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-3xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)]">
								{/* Left: Interactive SVG Cariogram Donut */}
								<div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
									<div className="relative w-[260px] h-[260px] flex items-center justify-center">
										<svg
											width="260"
											height="260"
											viewBox="0 0 260 260"
											className="drop-shadow-lg"
											role="img"
											aria-label="Cariogram 5-секторная диаграмма кариесогенного риска"
										>
											<title>Cariogram 5-секторная диаграмма риска</title>
											<g transform="rotate(0 130 130)">
												{pieSlices.map((slice) => (
													<path
														key={slice.id}
														d={slice.pathData}
														fill={slice.fillColor}
														stroke="#ffffff"
														strokeWidth="2"
														className="hover:opacity-85 transition-opacity cursor-pointer"
													>
														<title>{`${slice.nameRu}: ${slice.percentage}% (${slice.descriptionRu})`}</title>
													</path>
												))}
											</g>
										</svg>

										{/* Donut Center Overlay */}
										<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
											<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
												Шанс избежать
											</span>
											<span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
												{cariogramResult.chanceOfAvoidingCariesPercent}%
											</span>
											<span className="text-[10px] font-semibold text-[var(--odontogram-ink-muted,#64748b)]">
												по Bratthall
											</span>
										</div>
									</div>

									{/* Legend */}
									<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
										<div className="flex items-center gap-1.5">
											<span className="w-3 h-3 rounded-full bg-[#10b981] shrink-0" />
											<span className="font-semibold text-emerald-700 dark:text-emerald-300">
												Шанс избежать ({cariogramResult.sectors.actualChanceOfAvoidingCaries}%)
											</span>
										</div>
										<div className="flex items-center gap-1.5">
											<span className="w-3 h-3 rounded-full bg-[#1e40af] shrink-0" />
											<span>Диета ({cariogramResult.sectors.dietSectorPercent}%)</span>
										</div>
										<div className="flex items-center gap-1.5">
											<span className="w-3 h-3 rounded-full bg-[#ef4444] shrink-0" />
											<span>Бактерии ({cariogramResult.sectors.bacteriaSectorPercent}%)</span>
										</div>
										<div className="flex items-center gap-1.5">
											<span className="w-3 h-3 rounded-full bg-[#0284c7] shrink-0" />
											<span>Восприимчивость ({cariogramResult.sectors.susceptibilitySectorPercent}%)</span>
										</div>
										<div className="flex items-center gap-1.5 col-span-2">
											<span className="w-3 h-3 rounded-full bg-[#eab308] shrink-0" />
											<span>Анамнез / соматика ({cariogramResult.sectors.circumstancesSectorPercent}%)</span>
										</div>
									</div>
								</div>

								{/* Right: Risk Analysis & Preventive Plan */}
								<div className="lg:col-span-7 flex flex-col justify-between space-y-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<span
												className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider"
												style={{
													backgroundColor: cariogramResult.badgeBg,
													color: cariogramResult.badgeColor,
												}}
											>
												{cariogramResult.riskCategoryNameRu}
											</span>
											<span className="text-xs font-semibold text-[var(--odontogram-ink-muted,#64748b)]">
												(Интервал профгигиены: {cariogramResult.preventiveProgram.hygieneRecallIntervalMonths} мес.)
											</span>
										</div>
										<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] leading-relaxed">
											{cariogramResult.riskCategoryDescriptionRu}
										</p>
										<div className="p-3 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-glow)] text-xs font-semibold text-[var(--ink,#0f172a)]">
											<strong>Доминирующий фактор риска:</strong> {cariogramResult.dominantRiskFactorRu}
										</div>
									</div>

									{/* Preventive Plan Cards */}
									<div className="space-y-2">
										<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
											Индивидуальный план профилактики
										</h4>
										<div className="space-y-1.5 text-xs text-[var(--odontogram-ink,#0f172a)]">
											<div className="p-2 rounded-lg bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] flex items-start gap-2">
												<ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.professionalHygieneRu}</span>
											</div>
											<div className="p-2 rounded-lg bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] flex items-start gap-2">
												<Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.fluorideVarnishProtocolRu}</span>
											</div>
											<div className="p-2 rounded-lg bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] flex items-start gap-2">
												<Activity className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.homeCareProtocolRu}</span>
											</div>
											<div className="p-2 rounded-lg bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] flex items-start gap-2">
												<Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.dietaryGuidanceRu}</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* 9 Clinical Factor Controls */}
							<div className="space-y-4">
								<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
									Клинические параметры пациента (Cariogram Input)
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{/* 1. Diet Content */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Диета: Содержание сахаров
										</label>
										<select
											value={cariogramInput.dietContents}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													dietContents: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Очень низкое (без сахара)</option>
											<option value={1}>1 — Умеренное (стандартное)</option>
											<option value={2}>2 — Высокое (сладкие напитки/соки)</option>
											<option value={3}>3 — Очень высокое (липкие сладости)</option>
										</select>
									</div>

									{/* 2. Diet Frequency */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Диета: Частота приёмов пищи
										</label>
										<select
											value={cariogramInput.dietFrequency}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													dietFrequency: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — ≤3 раз в день (без перекусов)</option>
											<option value={1}>1 — 4–5 раз в день (норма)</option>
											<option value={2}>2 — 6–7 раз в день (частые снеки)</option>
											<option value={3}>3 — &gt;7 раз в день (постоянно)</option>
										</select>
									</div>

									{/* 3. Plaque Amount */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Бактерии: Зубной налёт (Silness-Löe)
										</label>
										<select
											value={cariogramInput.plaqueAmount}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													plaqueAmount: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Отличная гигиена (налета нет)</option>
											<option value={1}>1 — Удовлетворительная (пришеечный налет)</option>
											<option value={2}>2 — Умеренный видимый налёт</option>
											<option value={3}>3 — Обильный мягкий налёт и бляшки</option>
										</select>
									</div>

									{/* 4. S. Mutans */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Бактерии: Уровень Streptococcus mutans
										</label>
										<select
											value={cariogramInput.streptococcusMutans}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													streptococcusMutans: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Класс 0 (&lt;10⁴ КОЕ/мл)</option>
											<option value={1}>1 — Класс 1 (10⁴–10⁵ КОЕ/мл)</option>
											<option value={2}>2 — Класс 2 (10⁵–10⁶ КОЕ/мл)</option>
											<option value={3}>3 — Класс 3 (&gt;10⁶ КОЕ/мл, критично)</option>
										</select>
									</div>

									{/* 5. Fluoride Program */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Восприимчивость: Программа фторирования
										</label>
										<select
											value={cariogramInput.fluorideProgram}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													fluorideProgram: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Оптимальное (паста 1450ppm + лак)</option>
											<option value={1}>1 — Стандартная фтор-паста 1000ppm</option>
											<option value={2}>2 — Нерегулярное фторирование</option>
											<option value={3}>3 — Полное отсутствие фтора</option>
										</select>
									</div>

									{/* 6. Saliva Secretion Rate */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Восприимчивость: Скорость слюноотделения
										</label>
										<select
											value={cariogramInput.salivaSecretionRate}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													salivaSecretionRate: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Норма (&gt;1.2 мл/мин)</option>
											<option value={1}>1 — Сниженная (0.9–1.2 мл/мин)</option>
											<option value={2}>2 — Низкая (0.5–0.9 мл/мин)</option>
											<option value={3}>3 — Гипосаливация / Ксеростомия (&lt;0.5)</option>
										</select>
									</div>

									{/* 7. Past Caries Experience */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Анамнез: Опыт кариеса (КПУ/кпу)
										</label>
										<select
											value={cariogramInput.pastCariesExperience}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													pastCariesExperience: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Нет новых полостей за последний год</option>
											<option value={1}>1 — 1–2 новые кариозные полости</option>
											<option value={2}>2 — 3–4 новые полости (умеренный КПУ)</option>
											<option value={3}>3 — &gt;4 полостей (высокий прирост КПУ)</option>
										</select>
									</div>

									{/* 8. Systemic Diseases */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Анамнез: Соматические факторы
										</label>
										<select
											value={cariogramInput.systemicDiseases}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													systemicDiseases: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Здоров (нет отягощающих факторов)</option>
											<option value={1}>1 — Компенсированные соматические патологии</option>
											<option value={2}>2 — Декомпенсированные / частый прием сиропов</option>
										</select>
									</div>

									{/* 9. Clinical Judgment */}
									<div className="p-4 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-2">
										<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)] block">
											Клиническое суждение врача
										</label>
										<select
											value={cariogramInput.clinicalJudgment}
											onChange={(e) =>
												setCariogramInput({
													...cariogramInput,
													clinicalJudgment: Number(e.target.value),
												})
											}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink,#0f172a)] font-semibold cursor-pointer"
										>
											<option value={0}>0 — Благоприятное (лучше тестов)</option>
											<option value={1}>1 — Стандартное (соответствует тестам)</option>
											<option value={2}>2 — Настороженное (выше риск)</option>
											<option value={3}>3 — Крайне неблагоприятное</option>
										</select>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* ------------------------------------------------------------------------- */}
					{/* TAB 3: PHYSIOLOGICAL ROOT RESORPTION STAGES (0–100%) */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "resorption" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-3">
								<h3 className="text-sm font-extrabold text-[var(--odontogram-ink,#0f172a)]">
									Клиническая шкала физиологической резорбции корней молочных зубов
								</h3>
								<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] leading-relaxed">
									Оценка степени рассасывания корней под давлением постоянного зачатка. Используется для планирования сроков удаления по ортодонтическим показаниям и контроля физиологической смены.
								</p>
							</div>

							{/* 5 Stages Grid - Large Tactile Selector Cards */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
								{([0, 25, 50, 75, 100] as const).map((stage) => {
									const def = RESORPTION_STAGE_DEFINITIONS[stage];
									const isSelected = selectedResorptionStage === stage;
									return (
										<button
											key={stage}
											type="button"
											onClick={() => {
												setSelectedResorptionStage(stage);
												if (onUpdateToothResorption) {
													onUpdateToothResorption(selectedPrimaryTooth, stage);
												}
											}}
											className={`min-h-[110px] p-4 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer select-none active:scale-[0.98] ${
												isSelected
													? "border-teal-600 bg-teal-500/15 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/30"
													: "border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
											}`}
										>
											<div className="flex items-center justify-between w-full">
												<span
													className="px-2.5 py-1 rounded-xl text-xs font-black"
													style={{ backgroundColor: def.badgeBg, color: def.badgeColor }}
												>
													{stage}%
												</span>
												<span className="text-[10px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
													{def.expectedMobilityDegree} ст.
												</span>
											</div>

											<div className="my-1">
												<div className="text-xs font-black text-[var(--odontogram-ink,#0f172a)] leading-snug">
													{def.nameRu}
												</div>
												<div className="text-[11px] text-[var(--odontogram-ink-muted,#64748b)] line-clamp-2 mt-0.5">
													{def.clinicalSignRu}
												</div>
											</div>

											<div className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
												{isSelected ? <Check className="w-3 h-3" /> : null}
												<span>{isSelected ? "Выбрано" : "Выбрать"}</span>
											</div>
										</button>
									);
								})}
							</div>

							{/* Primary Teeth Tactile Grid Selector */}
							<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
									<div>
										<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
											Выберите молочный зуб для применения резорбции
										</h4>
										<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
											Текущий выбранный: <strong className="text-teal-600 dark:text-teal-400 font-mono text-sm">Зуб {selectedPrimaryTooth}</strong> (преемник: постоянный {PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[selectedPrimaryTooth]})
										</p>
									</div>

									{onUpdateToothResorption && (
										<button
											type="button"
											onClick={() => {
												onUpdateToothResorption(
													selectedPrimaryTooth,
													selectedResorptionStage,
												);
											}}
											className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0"
										>
											<Sparkles className="w-4 h-4" />
											<span>Применить {selectedResorptionStage}% к зубу {selectedPrimaryTooth}</span>
										</button>
									)}
								</div>

								{/* Upper Arch Teeth Buttons */}
								<div className="space-y-1.5">
									<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
										Верхний молочный ряд (55–65):
									</div>
									<div className="flex flex-wrap gap-2">
										{UPPER_PRIMARY_TEETH.map((num) => {
											const isSelected = selectedPrimaryTooth === num;
											return (
												<button
													key={num}
													type="button"
													onClick={() => setSelectedPrimaryTooth(num)}
													className={`min-w-[48px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
														isSelected
															? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-105"
															: "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
													}`}
												>
													<span>{num}</span>
													<span className="text-[9px] opacity-75 font-sans">
														→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
													</span>
												</button>
											);
										})}
									</div>
								</div>

								{/* Lower Arch Teeth Buttons */}
								<div className="space-y-1.5">
									<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
										Нижний молочный ряд (85–75):
									</div>
									<div className="flex flex-wrap gap-2">
										{LOWER_PRIMARY_TEETH.map((num) => {
											const isSelected = selectedPrimaryTooth === num;
											return (
												<button
													key={num}
													type="button"
													onClick={() => setSelectedPrimaryTooth(num)}
													className={`min-w-[48px] min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
														isSelected
															? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-105"
															: "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
													}`}
												>
													<span>{num}</span>
													<span className="text-[9px] opacity-75 font-sans">
														→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="flex items-center justify-between p-4 sm:px-8 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)] text-xs">
					<div className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
						DENTE Dental CRM • Детский и сменный прикус
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--odontogram-paper,#ffffff)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border,#cbd5e1)] text-xs font-bold text-[var(--odontogram-ink,#0f172a)] transition-all cursor-pointer shadow-xs"
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);
};
