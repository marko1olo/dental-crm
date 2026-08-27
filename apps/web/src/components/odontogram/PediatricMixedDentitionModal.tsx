import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertCircle,
	Check,
	Clock,
	Heart,
	Info,
	Layers,
	PieChart as PieChartIcon,
	Printer,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import {
	ALL_PRIMARY_TEETH,
	type CariogramInput,
	DEFAULT_CARIOGRAM_INPUT,
	generateCariogramPieChartSlices,
	generatePediatricCariogramDiaryText,
	isPrimaryTooth,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
	calculateCariogramRisk,
	calculateEruptionTimelineByAge,
	type FranklRating,
} from "./pediatricDentitionEngine";
import type { ToothData } from "./ToothChart";
import { showToast } from "../GlobalToast";
import { FranklBehaviorBadge, PediatricParentMemoModal } from "../pediatric";

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

type ModalTab = "timeline" | "cariogram" | "resorption" | "frankl";

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
	const [franklRating, setFranklRating] = useState<FranklRating>(3);
	const [isParentMemoModalOpen, setIsParentMemoModalOpen] = useState<boolean>(false);

	// 1. Eruption Timeline State
	const [selectedAge, setSelectedAge] = useState<number>(initialAge);
	const timelineAnalysis = useMemo(
		() => calculateEruptionTimelineByAge(selectedAge),
		[selectedAge],
	);

	// 12-column mixed dentition arch models (unsevered anatomical 12 columns per jaw)
	const upperRow12 = useMemo(() => {
		const pairs: Array<{ primary: number; permanent: number }> = [
			{ primary: 55, permanent: 15 },
			{ primary: 54, permanent: 14 },
			{ primary: 53, permanent: 13 },
			{ primary: 52, permanent: 12 },
			{ primary: 51, permanent: 11 },
			{ primary: 61, permanent: 21 },
			{ primary: 62, permanent: 22 },
			{ primary: 63, permanent: 23 },
			{ primary: 64, permanent: 24 },
			{ primary: 65, permanent: 25 },
		];
		const mid = pairs.map(({ primary, permanent }) => {
			const st = timelineAnalysis.toothStatuses.find((t) => t.predecessorPrimaryFdi === primary);
			return st?.status === "future_permanent" ? permanent : primary;
		});
		return [16, ...mid, 26];
	}, [timelineAnalysis.toothStatuses]);

	const lowerRow12 = useMemo(() => {
		const pairs: Array<{ primary: number; permanent: number }> = [
			{ primary: 85, permanent: 45 },
			{ primary: 84, permanent: 44 },
			{ primary: 83, permanent: 43 },
			{ primary: 82, permanent: 42 },
			{ primary: 81, permanent: 41 },
			{ primary: 71, permanent: 31 },
			{ primary: 72, permanent: 32 },
			{ primary: 73, permanent: 33 },
			{ primary: 74, permanent: 34 },
			{ primary: 75, permanent: 35 },
		];
		const mid = pairs.map(({ primary, permanent }) => {
			const st = timelineAnalysis.toothStatuses.find((t) => t.predecessorPrimaryFdi === primary);
			return st?.status === "future_permanent" ? permanent : primary;
		});
		return [46, ...mid, 36];
	}, [timelineAnalysis.toothStatuses]);

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

	const handleInsertCariogramTo043 = () => {
		const teethStatesMap = (teethData ?? []).reduce(
			(acc, t) => ({ ...acc, [t.toothNumber]: t.state }),
			{} as Record<number, string>,
		);
		const text = generatePediatricCariogramDiaryText({
			patientAgeYears: selectedAge,
			cariogramInput,
			teethStates: teethStatesMap,
			franklRating,
		});
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: "Z01.2",
							statusLocalis: text,
							treatmentDescription: `• Индивидуальный план профилактики кариеса (Шанс избежать: ${cariogramResult.chanceOfAvoidingCariesPercent}%, Риск: ${cariogramResult.riskCategoryNameRu}).\n• Поведение по Франклу: Рейтинг ${franklRating}.\n• ${cariogramResult.preventiveProgram.professionalHygieneRu}\n• ${cariogramResult.preventiveProgram.fluorideVarnishProtocolRu}\n• ${cariogramResult.preventiveProgram.homeCareProtocolRu}\n• ${cariogramResult.preventiveProgram.dietaryGuidanceRu}`,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore event dispatch error
		}
		showToast(
			"Протокол Cariogram и шкала Франкла успешно перенесены в карту 043/у!",
			"success",
		);
	};

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

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pediatric-modal-title"
		>
			<div
				className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] rounded-3xl border border-[var(--odontogram-border,var(--line,#cbd5e1))] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:px-8 border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] border border-[var(--teal-glow,rgba(20,184,166,0.25))] shrink-0 shadow-inner">
							<Sparkles className="w-6 h-6" />
						</div>
						<div>
							<h2
								id="pediatric-modal-title"
								className="text-lg sm:text-xl font-black tracking-tight text-[var(--odontogram-ink,var(--ink,#0f172a))]"
							>
								Детский и сменный прикус: Сроки смены &amp; Cariogram
							</h2>
							<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium">
								Физиологическая резорбция корней (0–100%), эксфолиация и оценка кариесогенного риска по Douglas Bratthall (ВОЗ)
							</p>
						</div>
					</div>

					{/* Close Button */}
					<button
						type="button"
						onClick={onClose}
						className="self-end sm:self-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] border border-transparent hover:border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] transition-all cursor-pointer flex items-center justify-center"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div
					className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 pt-2 sm:pt-3 border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap shrink-0"
					style={{ display: "flex", overflowX: "auto", flexWrap: "nowrap", gap: "6px" }}
				>
					<button
						type="button"
						onClick={() => setActiveTab("timeline")}
						style={{ flexShrink: 0, whiteSpace: "nowrap" }}
						className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 min-h-[44px] rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer select-none shrink-0 flex-shrink-0 ${
							activeTab === "timeline"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--odontogram-paper,var(--paper,#ffffff))] shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))]"
						}`}
					>
						<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
						<span className="hidden sm:inline">Сроки смены (6–12 лет)</span>
						<span className="sm:hidden">Сроки смены</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("cariogram")}
						style={{ flexShrink: 0, whiteSpace: "nowrap" }}
						className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 min-h-[44px] rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer select-none shrink-0 flex-shrink-0 ${
							activeTab === "cariogram"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--odontogram-paper,var(--paper,#ffffff))] shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))]"
						}`}
					>
						<PieChartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
						<span className="hidden sm:inline">Cariogram (Риск кариеса)</span>
						<span className="sm:hidden">Cariogram</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("resorption")}
						style={{ flexShrink: 0, whiteSpace: "nowrap" }}
						className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 min-h-[44px] rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer select-none shrink-0 flex-shrink-0 ${
							activeTab === "resorption"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--odontogram-paper,var(--paper,#ffffff))] shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))]"
						}`}
					>
						<Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
						<span className="hidden sm:inline">Шкала резорбции корней (0–100%)</span>
						<span className="sm:hidden">Резорбция</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("frankl")}
						style={{ flexShrink: 0, whiteSpace: "nowrap" }}
						className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 min-h-[44px] rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer select-none shrink-0 flex-shrink-0 ${
							activeTab === "frankl"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--odontogram-paper,var(--paper,#ffffff))] shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))]"
						}`}
					>
						<Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-rose-500" />
						<span className="hidden sm:inline">Поведение (Франкл) &amp; Памятка</span>
						<span className="sm:hidden">Франкл &amp; Памятка</span>
					</button>
				</div>

				{/* Modal Body Container */}
				<div
					className="flex-1 overflow-y-auto p-4 sm:p-8 pb-28 sm:pb-8 space-y-6"
					style={{ paddingBottom: "112px" }}
				>
					{/* ------------------------------------------------------------------------- */}
					{/* TAB 1: ERUPTION & MIXED DENTITION TIMELINE */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "timeline" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							{/* Age Slider & Preset Bar */}
							<div className="p-5 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
											Калькулятор смены зубов
										</span>
										<h3 className="text-base sm:text-lg font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
											Возраст ребенка:{" "}
											<span className="text-[var(--teal,#0d9488)] font-mono font-black">
												{selectedAge.toFixed(1)} лет ({Math.round(selectedAge * 12)} мес.)
											</span>
										</h3>
									</div>

									{/* Stage Badge */}
									<div className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] border border-[var(--teal-glow,rgba(20,184,166,0.25))] text-xs sm:text-sm font-bold">
										<Clock className="w-4 h-4 shrink-0" />
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
										className="w-full h-3 bg-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] rounded-lg appearance-none cursor-pointer accent-[var(--teal,#0d9488)]"
										aria-label="Возраст ребенка для расчета смены прикуса"
									/>
									<div className="flex justify-between text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-mono font-semibold">
										<span>5.0<span className="hidden sm:inline"> лет</span></span>
										<span>6.0<span className="hidden sm:inline"> (1-е моляры)</span></span>
										<span>8.0<span className="hidden sm:inline"> (Резцы)</span></span>
										<span>10.0<span className="hidden sm:inline"> (Премоляры)</span></span>
										<span>12.0<span className="hidden sm:inline"> (2-е моляры)</span></span>
										<span>13.5<span className="hidden sm:inline"> лет</span></span>
									</div>
								</div>

								{/* Quick Presets */}
								<div className="flex flex-wrap items-center gap-2 pt-1">
									<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] mr-1">
										Пресеты:
									</span>
									{[5.5, 6.0, 7.0, 7.5, 8.5, 10.5, 12.0].map((age) => (
										<button
											key={age}
											type="button"
											onClick={() => setSelectedAge(age)}
											className={`min-h-[44px] min-w-[68px] px-3.5 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer select-none active:scale-95 ${
												Math.abs(selectedAge - age) < 0.1
													? "bg-[var(--teal-fill,var(--teal,#0d9488))] text-white border-[var(--teal,#0d9488)] shadow-md shadow-teal-600/20"
													: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]"
											}`}
										>
											{age.toFixed(1)} лет
										</button>
									))}
								</div>

								<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] italic leading-relaxed">
									{timelineAnalysis.stageDescriptionRu}
								</p>
							</div>

							{/* Dental Arch Visual Preview */}
							<div className="p-5 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
								<div className="flex items-center justify-between">
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
										Ожидаемая зубная формула в {selectedAge.toFixed(1)} лет
									</h4>
								</div>

								<div className="overflow-x-auto pb-1">
									<div className="min-w-[660px] space-y-4">
										{/* Upper Arch 12-column grid */}
										<div className="space-y-1.5">
											<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
												Верхняя челюсть (12 зубов):
											</div>
											<div className="grid grid-cols-12 gap-1.5 sm:gap-2">
												{upperRow12.map((num) => {
													const isPrim = isPrimaryTooth(num);
													const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
													return (
														<span
															key={num}
															className={`min-h-[46px] px-1 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black border flex flex-col items-center justify-center gap-0.5 shadow-xs select-none ${
																isErupting
																	? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
																	: isPrim
																		? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
																		: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
															}`}
															title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
														>
															<span className="leading-none">{num}</span>
															<span className="text-[10px] font-bold font-sans opacity-80 leading-none">
																{isPrim ? "Мол." : "Пост."}
															</span>
														</span>
													);
												})}
											</div>
										</div>

										{/* Lower Arch 12-column grid */}
										<div className="space-y-1.5">
											<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
												Нижняя челюсть (12 зубов):
											</div>
											<div className="grid grid-cols-12 gap-1.5 sm:gap-2">
												{lowerRow12.map((num) => {
													const isPrim = isPrimaryTooth(num);
													const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
													return (
														<span
															key={num}
															className={`min-h-[46px] px-1 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black border flex flex-col items-center justify-center gap-0.5 shadow-xs select-none ${
																isErupting
																	? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
																	: isPrim
																		? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
																		: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
															}`}
															title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
														>
															<span className="leading-none">{num}</span>
															<span className="text-[10px] font-bold font-sans opacity-80 leading-none">
																{isPrim ? "Мол." : "Пост."}
															</span>
														</span>
													);
												})}
											</div>
										</div>
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
											className="w-full min-h-[48px] flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-sm sm:text-base font-bold shadow-lg shadow-teal-600/20 transition-all cursor-pointer active:scale-[0.98]"
										>
											<Sparkles className="w-5 h-5 shrink-0" />
											<span>Применить возрастную формулу ({selectedAge.toFixed(1)} лет) к одонтограмме</span>
										</button>
									</div>
								)}
							</div>

							{/* Clinical Alerts / Space Maintenance Cards */}
							{timelineAnalysis.clinicalAlerts.length > 0 && (
								<div className="space-y-3">
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
										Клинические рекомендации &amp; Профилактика
									</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{timelineAnalysis.clinicalAlerts.map((alert, idx) => (
											<div
												key={idx}
												className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-start gap-3"
											>
												<AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
												<div className="space-y-1">
													<div className="text-sm font-bold text-amber-900 dark:text-amber-200">
														{alert.titleRu}
													</div>
													<div className="text-xs sm:text-sm text-amber-800/85 dark:text-amber-300/85 leading-relaxed font-medium">
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
								<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Матрица смены зубов ({timelineAnalysis.toothStatuses.length} пар)
								</h4>
								<div className="overflow-x-auto rounded-2xl border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]">
									<table className="w-full text-left text-sm border-collapse">
										<thead>
											<tr className="border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-bold text-xs sm:text-sm">
												<th className="p-3.5">Молочный зуб</th>
												<th className="p-3.5">Постоянный наследник</th>
												<th className="p-3.5">Норма смены</th>
												<th className="p-3.5">Текущий статус</th>
												<th className="p-3.5">Резорбция корня</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--odontogram-border-subtle,var(--line,#e2e8f0))]">
											{timelineAnalysis.toothStatuses.map((st) => {
												const resDef = RESORPTION_STAGE_DEFINITIONS[st.expectedResorptionPercent];
												return (
													<tr
														key={st.fdiNumber}
														className="hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]/60 transition-colors"
													>
														<td className="p-3.5 font-mono font-bold text-[var(--teal,#0d9488)] text-sm sm:text-base">
															Зуб {st.predecessorPrimaryFdi}
														</td>
														<td className="p-3.5 font-mono font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] text-sm sm:text-base">
															Зуб {st.successorPermanentFdi}
														</td>
														<td className="p-3.5 font-mono font-semibold text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
															{st.normalEruptionAgeRangeYears[0].toFixed(1)}–{st.normalEruptionAgeRangeYears[1].toFixed(1)} лет
														</td>
														<td className="p-3.5">
															<span
																className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm ${
																	st.status === "future_permanent"
																		? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
																		: st.status === "exfoliating" || st.status === "erupting"
																			? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
																			: "bg-teal-500/15 text-teal-700 dark:text-teal-300"
																}`}
															>
																{st.labelRu}
															</span>
														</td>
														<td className="p-3.5">
															<span
																className="px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm"
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
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-3xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))]">
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
														stroke="var(--odontogram-paper,var(--paper,#ffffff))"
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
											<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
												Шанс избежать
											</span>
											<span className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
												{cariogramResult.chanceOfAvoidingCariesPercent}%
											</span>
											<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
												по Bratthall
											</span>
										</div>
									</div>

									{/* Legend */}
									<div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs sm:text-sm">
										<div className="flex items-center gap-2">
											<span className="w-3.5 h-3.5 rounded-full bg-[#10b981] shrink-0" />
											<span className="font-bold text-emerald-700 dark:text-emerald-300">
												Шанс избежать ({cariogramResult.sectors.actualChanceOfAvoidingCaries}%)
											</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="w-3.5 h-3.5 rounded-full bg-[#1e40af] shrink-0" />
											<span className="font-semibold">Диета ({cariogramResult.sectors.dietSectorPercent}%)</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="w-3.5 h-3.5 rounded-full bg-[#ef4444] shrink-0" />
											<span className="font-semibold">Бактерии ({cariogramResult.sectors.bacteriaSectorPercent}%)</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="w-3.5 h-3.5 rounded-full bg-[#0284c7] shrink-0" />
											<span className="font-semibold">Восприимчивость ({cariogramResult.sectors.susceptibilitySectorPercent}%)</span>
										</div>
										<div className="flex items-center gap-2 col-span-2">
											<span className="w-3.5 h-3.5 rounded-full bg-[#eab308] shrink-0" />
											<span className="font-semibold">Анамнез / соматика ({cariogramResult.sectors.circumstancesSectorPercent}%)</span>
										</div>
									</div>
								</div>

								{/* Right: Risk Analysis & Preventive Plan */}
								<div className="lg:col-span-7 flex flex-col justify-between space-y-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<span
												className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider"
												style={{
													backgroundColor: cariogramResult.badgeBg,
													color: cariogramResult.badgeColor,
												}}
											>
												{cariogramResult.riskCategoryNameRu}
											</span>
											<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
												(Интервал профгигиены: {cariogramResult.preventiveProgram.hygieneRecallIntervalMonths} мес.)
											</span>
										</div>
										<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] leading-relaxed font-medium">
											{cariogramResult.riskCategoryDescriptionRu}
										</p>
										<div className="p-3.5 rounded-xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] border border-[var(--teal-glow,rgba(20,184,166,0.25))] text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)] dark:text-teal-200">
											<strong className="font-black text-[var(--teal,#0d9488)]">Доминирующий фактор риска:</strong> {cariogramResult.dominantRiskFactorRu}
										</div>
									</div>

									{/* Preventive Plan Cards */}
									<div className="space-y-2">
										<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
											Индивидуальный план профилактики
										</h4>
										<div className="space-y-2 text-xs sm:text-sm text-[var(--odontogram-ink,var(--ink,#0f172a))] font-medium">
											<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
												<ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.professionalHygieneRu}</span>
											</div>
											<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
												<Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.fluorideVarnishProtocolRu}</span>
											</div>
											<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
												<Activity className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.homeCareProtocolRu}</span>
											</div>
											<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
												<Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
												<span>{cariogramResult.preventiveProgram.dietaryGuidanceRu}</span>
											</div>
										</div>

										<div className="pt-2">
											<button
												type="button"
												onClick={handleInsertCariogramTo043}
												className="w-full min-h-[48px] flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-sm sm:text-base font-bold shadow-lg shadow-teal-600/20 transition-all cursor-pointer active:scale-[0.98]"
											>
												<Sparkles className="w-5 h-5 shrink-0" />
												<span>Вставить протокол Cariogram в карту 043/у (1 клик)</span>
											</button>
										</div>
									</div>
								</div>
							</div>

							{/* 9 Clinical Factor Controls */}
							<div className="space-y-4">
								<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
									Клинические параметры пациента (Cariogram Input)
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{/* 1. Diet Content */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — Очень низкое (без сахара)</option>
											<option value={1}>1 — Умеренное (стандартное)</option>
											<option value={2}>2 — Высокое (сладкие напитки/соки)</option>
											<option value={3}>3 — Очень высокое (липкие сладости)</option>
										</select>
									</div>

									{/* 2. Diet Frequency */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — ≤3 раз в день (без перекусов)</option>
											<option value={1}>1 — 4–5 раз в день (норма)</option>
											<option value={2}>2 — 6–7 раз в день (частые снеки)</option>
											<option value={3}>3 — &gt;7 раз в день (постоянно)</option>
										</select>
									</div>

									{/* 3. Plaque Amount */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — Отличная гигиена (налета нет)</option>
											<option value={1}>1 — Удовлетворительная (пришеечный налет)</option>
											<option value={2}>2 — Умеренный видимый налёт</option>
											<option value={3}>3 — Обильный мягкий налёт и бляшки</option>
										</select>
									</div>

									{/* 4. S. Mutans */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — Класс 0 (&lt;10⁴ КОЕ/мл)</option>
											<option value={1}>1 — Класс 1 (10⁴–10⁵ КОЕ/мл)</option>
											<option value={2}>2 — Класс 2 (10⁵–10⁶ КОЕ/мл)</option>
											<option value={3}>3 — Класс 3 (&gt;10⁶ КОЕ/мл, критично)</option>
										</select>
									</div>

									{/* 5. Fluoride Program */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — Оптимальное (паста 1450ppm + лак)</option>
											<option value={1}>1 — Стандартная фтор-паста 1000ppm</option>
											<option value={2}>2 — Нерегулярное фторирование</option>
											<option value={3}>3 — Полное отсутствие фтора</option>
										</select>
									</div>

									{/* 6. Saliva Secretion Rate */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — Норма (&gt;1.2 мл/мин)</option>
											<option value={1}>1 — Сниженная (0.9–1.2 мл/мин)</option>
											<option value={2}>2 — Низкая (0.5–0.9 мл/мин)</option>
											<option value={3}>3 — Гипосаливация / Ксеростомия (&lt;0.5)</option>
										</select>
									</div>

									{/* 7. Past Caries Experience */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — Нет новых полостей за последний год</option>
											<option value={1}>1 — 1–2 новые кариозные полости</option>
											<option value={2}>2 — 3–4 новые полости (умеренный КПУ)</option>
											<option value={3}>3 — &gt;4 полостей (высокий прирост КПУ)</option>
										</select>
									</div>

									{/* 8. Systemic Diseases */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
										>
											<option value={0}>0 — Здоров (нет отягощающих факторов)</option>
											<option value={1}>1 — Компенсированные соматические патологии</option>
											<option value={2}>2 — Декомпенсированные / частый прием сиропов</option>
										</select>
									</div>

									{/* 9. Clinical Judgment */}
									<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
										<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
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
											className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
							<div className="p-5 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-3">
								<h3 className="text-base sm:text-lg font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
									Клиническая шкала физиологической резорбции корней молочных зубов
								</h3>
								<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] leading-relaxed font-medium">
									Оценка степени рассасывания корней под давлением постоянного зачатка. Используется для планирования сроков удаления по ортодонтическим показаниям и контроля физиологической смены.
								</p>
							</div>

							{/* 5 Stages Grid - Large Tactile Selector Cards */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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
											className={`min-h-[120px] p-4 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer select-none active:scale-[0.98] ${
												isSelected
													? "border-teal-600 bg-teal-500/15 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/30"
													: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]"
											}`}
										>
											<div className="flex items-center justify-between w-full">
												<span
													className="px-3 py-1 rounded-xl text-xs sm:text-sm font-black"
													style={{ backgroundColor: def.badgeBg, color: def.badgeColor }}
												>
													{stage}%
												</span>
												<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
													{def.expectedMobilityDegree} ст.
												</span>
											</div>

											<div className="my-1.5">
												<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] leading-snug">
													{def.nameRu}
												</div>
												<div className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] line-clamp-2 mt-1 font-medium">
													{def.clinicalSignRu}
												</div>
											</div>

											<div className="text-xs sm:text-sm font-mono font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
												{isSelected ? <Check className="w-4 h-4 shrink-0" /> : null}
												<span>{isSelected ? "Выбрано" : "Выбрать"}</span>
											</div>
										</button>
									);
								})}
							</div>

							{/* Primary Teeth Tactile Grid Selector */}
							<div className="p-5 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
											Выберите молочный зуб для применения резорбции
										</h4>
										<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium mt-0.5">
											Текущий выбранный: <strong className="text-teal-600 dark:text-teal-400 font-mono text-sm sm:text-base font-black">Зуб {selectedPrimaryTooth}</strong> (преемник: постоянный {PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[selectedPrimaryTooth]})
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
											className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0"
										>
											<Sparkles className="w-4 h-4 shrink-0" />
											<span>Применить {selectedResorptionStage}% к зубу {selectedPrimaryTooth}</span>
										</button>
									)}
								</div>

								{/* Upper Arch Teeth Buttons */}
								<div className="space-y-2">
									<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
										Верхний молочный ряд (55–65):
									</div>
									<div className="flex flex-wrap gap-2.5">
										{UPPER_PRIMARY_TEETH.map((num) => {
											const isSelected = selectedPrimaryTooth === num;
											return (
												<button
													key={num}
													type="button"
													onClick={() => setSelectedPrimaryTooth(num)}
													className={`min-w-[52px] min-h-[48px] px-3.5 py-2 rounded-xl text-sm font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center select-none ${
														isSelected
															? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-105"
															: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]"
													}`}
												>
													<span>{num}</span>
													<span className="text-xs font-bold opacity-80 font-sans">
														→{PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[num]}
													</span>
												</button>
											);
										})}
									</div>
								</div>

								{/* Lower Arch Teeth Buttons */}
								<div className="space-y-2">
									<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
										Нижний молочный ряд (85–75):
									</div>
									<div className="flex flex-wrap gap-2.5">
										{LOWER_PRIMARY_TEETH.map((num) => {
											const isSelected = selectedPrimaryTooth === num;
											return (
												<button
													key={num}
													type="button"
													onClick={() => setSelectedPrimaryTooth(num)}
													className={`min-w-[52px] min-h-[48px] px-3.5 py-2 rounded-xl text-sm font-mono font-black border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center select-none ${
														isSelected
															? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-105"
															: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]"
													}`}
												>
													<span>{num}</span>
													<span className="text-xs font-bold opacity-80 font-sans">
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

					{/* ------------------------------------------------------------------------- */}
					{/* TAB 4: FRANKL BEHAVIOR SCALE & PARENT RECOMMENDATIONS */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "frankl" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							<FranklBehaviorBadge
								rating={franklRating}
								onChange={setFranklRating}
								showStrategies={true}
							/>

							{/* Parent Recommendations Trigger Card */}
							<div className="p-5 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
											Рекомендации родителям
										</span>
										<h4 className="text-base font-extrabold text-[var(--odontogram-ink,var(--ink,#0f172a))]">
											Формирование памятки по детским процедурам
										</h4>
										<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium mt-1">
											Печать памяток по серебрению, герметизации фиссур и витальной пульпотомии (с контролем прикусывания анестезированной губы).
										</p>
									</div>

									<button
										type="button"
										onClick={() => setIsParentMemoModalOpen(true)}
										className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
									>
										<Printer className="w-4 h-4" />
										<span>Открыть генератор памятки</span>
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="flex items-center justify-between p-4 sm:px-8 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] text-xs sm:text-sm">
					<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
						DENTE Dental CRM • Детский и сменный прикус
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer select-none active:scale-95"
					>
						Готово
					</button>
				</div>
			</div>

			{/* Child Modal: Parent Recommendations Generator */}
			{isParentMemoModalOpen && (
				<PediatricParentMemoModal
					isOpen={isParentMemoModalOpen}
					onClose={() => setIsParentMemoModalOpen(false)}
					initialFrankl={franklRating}
					patientAgeYears={selectedAge}
				/>
			)}
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
