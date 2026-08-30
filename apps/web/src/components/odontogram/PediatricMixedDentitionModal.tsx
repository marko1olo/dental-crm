import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertCircle,
	Check,
	Clock,
	Info,
	Printer,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import {
	ALL_PRIMARY_TEETH,
	type CariogramInput,
	DEFAULT_CARIOGRAM_INPUT,
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
import { PediatricCariogramTab } from "./PediatricCariogramTab";
import "./odontogram.css";

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
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pediatric-modal-title"
		>
			<div
				className="relative flex flex-col w-full max-w-5xl max-h-[calc(100dvh-32px)] bg-[var(--odontogram-paper,var(--paper-strong,var(--paper,#ffffff)))] dark:bg-slate-900 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 rounded-2xl sm:rounded-3xl border border-[var(--odontogram-border,var(--line,#cbd5e1))] dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex items-start justify-between gap-3 p-4 sm:p-6 sm:px-8 border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] border border-[var(--teal-glow,rgba(20,184,166,0.25))] shrink-0 shadow-inner">
							<Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
						</div>
						<div className="min-w-0">
							<h2
								id="pediatric-modal-title"
								className="text-sm sm:text-lg lg:text-xl font-black tracking-tight text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 whitespace-normal break-words"
							>
								Детский и сменный прикус: Сроки смены &amp; Cariogram
							</h2>
							<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 font-medium mt-0.5 whitespace-normal break-words">
								Физиологическая резорбция корней (0–100%), эксфолиация и оценка кариесогенного риска по Douglas Bratthall (ВОЗ)
							</p>
						</div>
					</div>

					{/* Close Button >= 44x44px */}
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-100 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-800 border border-transparent hover:border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Navigation Tabs (>= 44px Touch Targets) */}
				<div
					className="flex items-center gap-1.5 px-3 sm:px-4 pt-2 border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap scrollbar-none shrink-0 touch-pan-x whitespace-nowrap w-full"
				>
					<button
						type="button"
						onClick={() => setActiveTab("timeline")}
						className={`min-h-[44px] min-w-max shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "timeline"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						<span className="hidden sm:inline">📅 Сроки смены (6–12 лет)</span>
						<span className="sm:hidden">📅 Сроки смены</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("cariogram")}
						className={`min-h-[44px] min-w-max shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "cariogram"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						<span className="hidden sm:inline">📊 Cariogram (Риск кариеса)</span>
						<span className="sm:hidden">📊 Cariogram</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("resorption")}
						className={`min-h-[44px] min-w-max shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "resorption"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						<span className="hidden sm:inline">🦷 Резорбция корней (0–100%)</span>
						<span className="sm:hidden">🦷 Резорбция</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("frankl")}
						className={`min-h-[44px] min-w-max shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "frankl"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						♡ Шкала Frankl
					</button>
				</div>

				{/* Modal Body Container */}
				<div
					className="flex-[1_1_auto] min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 md:p-8 pb-28 sm:pb-8 space-y-6 touch-pan-y"
				>
					{/* ------------------------------------------------------------------------- */}
					{/* TAB 1: ERUPTION & MIXED DENTITION TIMELINE */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "timeline" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							{/* Age Slider & Preset Bar */}
							<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
											Калькулятор смены зубов
										</span>
										<h3 className="text-base sm:text-lg font-black text-[var(--odontogram-ink,var(--ink,#0f172a))]">
											Возраст ребенка:{" "}
											<span className="text-[var(--teal,#0d9488)] font-bold">
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
									<div className="flex justify-between text-[11px] sm:text-xs md:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-mono font-bold select-none">
										<span>5.0<span className="hidden sm:inline font-normal"> лет</span></span>
										<span>6.0<span className="hidden sm:inline font-normal"> (1-е мол.)</span></span>
										<span>7.5<span className="hidden sm:inline font-normal"> (Резцы)</span></span>
										<span>9.0<span className="hidden sm:inline font-normal"> (Премол.)</span></span>
										<span>12.0<span className="hidden sm:inline font-normal"> (2-е мол.)</span></span>
										<span>13.5<span className="hidden sm:inline font-normal"> лет</span></span>
									</div>
								</div>

								<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] italic leading-relaxed">
									{timelineAnalysis.stageDescriptionRu}
								</p>
							</div>

							{/* Dental Arch Visual Preview */}
							<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4">
								<div className="flex items-center justify-between">
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
										Ожидаемая зубная формула в {selectedAge.toFixed(1)} лет
									</h4>
								</div>

								<div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2 touch-pan-x w-full">
									<div className="min-w-[620px] space-y-4">
										{/* Upper Arch 12-column grid */}
										<div className="space-y-1.5">
											<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
												Верхняя челюсть (12 зубов):
											</div>
											<div className="grid grid-cols-12 gap-2">
												{upperRow12.map((num) => {
													const isPrim = isPrimaryTooth(num);
													const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
													return (
														<span
															key={num}
															className={`min-h-[48px] min-w-[40px] sm:min-w-[44px] px-1 py-1 rounded-xl text-sm font-mono font-bold border flex flex-col items-center justify-center gap-0.5 shadow-xs select-none transition-all ${
																isErupting
																	? "bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-500/60 animate-pulse font-bold"
																	: isPrim
																		? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-400/50 hover:border-amber-500"
																		: "bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-400/50 hover:border-teal-500"
															}`}
															title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
														>
															<span className="text-sm font-bold font-mono leading-none">{num}</span>
															<span className="text-[10px] font-medium font-sans opacity-90 leading-none">
																{isPrim ? "Мол." : "Пост."}
															</span>
														</span>
													);
												})}
											</div>
										</div>

										{/* Lower Arch 12-column grid */}
										<div className="space-y-1.5">
											<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
												Нижняя челюсть (12 зубов):
											</div>
											<div className="grid grid-cols-12 gap-2">
												{lowerRow12.map((num) => {
													const isPrim = isPrimaryTooth(num);
													const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
													return (
														<span
															key={num}
															className={`min-h-[48px] min-w-[40px] sm:min-w-[44px] px-1 py-1 rounded-xl text-sm font-mono font-bold border flex flex-col items-center justify-center gap-0.5 shadow-xs select-none transition-all ${
																isErupting
																	? "bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-500/60 animate-pulse font-bold"
																	: isPrim
																		? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-400/50 hover:border-amber-500"
																		: "bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-400/50 hover:border-teal-500"
															}`}
															title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
														>
															<span className="text-sm font-bold font-mono leading-none">{num}</span>
															<span className="text-[10px] font-medium font-sans opacity-90 leading-none">
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
					{/* TAB 2: CARIOGRAM 3-STATE CLINICAL RISK CLASSIFIER */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "cariogram" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							<PediatricCariogramTab
								cariogramInput={cariogramInput}
								onCariogramInputChange={setCariogramInput}
								cariogramResult={cariogramResult}
							/>

							{/* 1-Click Insert to 043/u Action Button */}
							<div className="flex items-center justify-end pt-2">
								<button
									type="button"
									onClick={handleInsertCariogramTo043}
									className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
								>
									<Check className="w-5 h-5" />
									<span>Вставить протокол Cariogram в карту 043/у (1 клик)</span>
								</button>
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
															: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800/90 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700/80"
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
															: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-800/90 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-200 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-700 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-700/80"
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
				<div className="flex items-center justify-between p-4 sm:px-8 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 text-xs sm:text-sm">
					<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
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
