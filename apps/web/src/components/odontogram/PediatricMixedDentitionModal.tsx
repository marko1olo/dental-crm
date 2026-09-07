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
	Zap,
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
	calculatePediatricPhysiologicalNorm,
	getPediatricProcedurePreset,
	dispatchPediatricSoapProtocol,
} from "./pediatricDentitionEngine";
import type { ToothData } from "./ToothChart";
import { showToast } from "../GlobalToast";
import { FranklBehaviorBadge, PediatricParentMemoModal } from "../pediatric";
import { PediatricCariogramTab } from "./PediatricCariogramTab";
import { PediatricResorptionTab } from "./PediatricResorptionTab";
import "./odontogram.css";
import "./pediatricMixedDentition.css";

const UPPER_PRIMARY_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const LOWER_PRIMARY_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export interface PediatricAgePreset {
	readonly id: "primary" | "early_mixed" | "late_mixed" | "primary_3y" | "first_molar_6y" | "mixed_9y" | "permanent_12y";
	readonly labelRu: string;
	readonly ageRangeRu: string;
	readonly targetAge: number;
	readonly descriptionRu: string;
	readonly teethSummaryRu: string;
	readonly teethNumbers?: readonly number[];
	readonly mode?: "primary" | "first_molar" | "mixed" | "permanent";
}

export const PEDIATRIC_AGE_PRESETS: readonly PediatricAgePreset[] = [
	{
		id: "primary",
		labelRu: "3 года — молочный прикус",
		ageRangeRu: "3–5 лет",
		targetAge: 3.0,
		descriptionRu: "Все 20 молочных зубов интактны (51–85), физиологическая норма без постоянных моляров, 0% резорбция",
		teethSummaryRu: "20 молочных зубов (51–85)",
		teethNumbers: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
		mode: "primary",
	},
	{
		id: "early_mixed",
		labelRu: "6 лет — первый моляр",
		ageRangeRu: "6–7 лет",
		targetAge: 6.0,
		descriptionRu: "Прорезывание первых постоянных моляров (16, 26, 36, 46) + 20 молочных зубов",
		teethSummaryRu: "1-е моляры (16, 26, 36, 46) + 20 молочных",
		teethNumbers: [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26, 46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36],
		mode: "first_molar",
	},
	{
		id: "late_mixed",
		labelRu: "9 лет — сменный прикус",
		ageRangeRu: "8–10 лет",
		targetAge: 9.0,
		descriptionRu: "Смена резцов (11..42) и 1-е постоянные моляры (16..46) + молочные клыки и моляры (53..85)",
		teethSummaryRu: "Резцы 11..42 + 1-е моляры + молочные 53..85",
		teethNumbers: [16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26, 46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36],
		mode: "mixed",
	},
	{
		id: "permanent_12y",
		labelRu: "12 лет — постоянный прикус",
		ageRangeRu: "11–13 лет",
		targetAge: 12.0,
		descriptionRu: "Все 28 постоянных зубов прорезались (17..27, 47..37, без третьих моляров 18, 28, 38, 48)",
		teethSummaryRu: "28 постоянных зубов (17..27, 47..37)",
		teethNumbers: [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37],
		mode: "permanent",
	},
];

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

	// First permanent molars erupt at age ~6 years
	const hasFirstPermanentMolars = selectedAge >= 6.0;

	// Anatomical dental arch models (10 primary columns for 3–5 years, 12 columns for 6–12 years)
	const upperRow = useMemo(() => {
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
		return hasFirstPermanentMolars ? [16, ...mid, 26] : mid;
	}, [hasFirstPermanentMolars, timelineAnalysis.toothStatuses]);

	const lowerRow = useMemo(() => {
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
		return hasFirstPermanentMolars ? [46, ...mid, 36] : mid;
	}, [hasFirstPermanentMolars, timelineAnalysis.toothStatuses]);

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

	const handleApplyPrimaryNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("primary");
		setSelectedAge(3.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = norm.teethNumbers.map((t) => ({
				toothNumber: t,
				resorptionStage: 0 as ResorptionStagePercent,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"⚡ 1-клик: Применена норма временного прикуса (3 года: 51–85 интактны, кариеса нет, 0% резорбция). Протокол перенесен в 043/у!",
			"success",
		);
	};

	const handleApplyFirstMolarNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("first_molar");
		setSelectedAge(6.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = Object.entries(norm.resorptionStages).map(([toothStr, stage]) => ({
				toothNumber: Number(toothStr),
				resorptionStage: stage,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"⚡ 1-клик: Применена норма прорезывания первых моляров (6 лет: 16, 26, 36, 46 + 20 молочных). Протокол перенесен в 043/у!",
			"success",
		);
	};

	const handleApplyEarlyMixedNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("mixed");
		setSelectedAge(9.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = Object.entries(norm.resorptionStages).map(([toothStr, stage]) => ({
				toothNumber: Number(toothStr),
				resorptionStage: stage,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"⚡ 1-клик: Применена норма сменного прикуса (9 лет: резцы 11..42, 1-е моляры 16..46, молочные 53..85). Протокол перенесен в 043/у!",
			"success",
		);
	};

	const handleApplyPermanentNorm = () => {
		const norm = calculatePediatricPhysiologicalNorm("permanent");
		setSelectedAge(12.0);
		if (onApplyAgeArch) {
			onApplyAgeArch([...norm.teethNumbers]);
		}
		if (onBatchUpdateResorption) {
			const batch = ALL_PRIMARY_TEETH.map((t) => ({
				toothNumber: t,
				resorptionStage: 100 as ResorptionStagePercent,
			}));
			onBatchUpdateResorption(batch);
		}
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: norm.diagnosisIcd10,
			statusLocalis: norm.statusLocalisRu,
			treatmentDescription: norm.treatmentDescriptionRu,
		});
		showToast(
			"⚡ 1-клик: Применена норма постоянного прикуса (12 лет: 28 зубов 17..27, 47..37). Протокол перенесен в 043/у!",
			"success",
		);
	};

	const handleApplyProcedurePreset = (presetId: "saforide" | "fissurit" | "pulpotec") => {
		const preset = getPediatricProcedurePreset(presetId);
		dispatchPediatricSoapProtocol({
			diagnosisIcd10: preset.diagnosisIcd10,
			statusLocalis: preset.statusLocalisRu,
			treatmentDescription: preset.treatmentDescriptionRu,
		});
		showToast(
			`⚡ 1-клик: Протокол ${preset.labelRu} (${preset.serviceCode804n}) перенесен в карту 043/у!`,
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

	// Anti-Matryoshka (Sin 6, Mandate 8d): Render child modal sequentially (depth strictly 1).
	if (isParentMemoModalOpen) {
		return (
			<PediatricParentMemoModal
				isOpen={true}
				onClose={() => setIsParentMemoModalOpen(false)}
				onBack={() => setIsParentMemoModalOpen(false)}
				initialFrankl={franklRating}
				patientAgeYears={selectedAge}
			/>
		);
	}

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

				{/* Navigation Tabs (Strictly 1 row 32–36px under Sin #2) */}
				<div
					className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 h-[36px] min-h-[36px] border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 shrink-0 w-full overflow-x-auto no-scrollbar"
				>
					<button
						type="button"
						onClick={() => setActiveTab("timeline")}
						className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "timeline"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						<span className="hidden sm:inline">Сроки смены (6–12 лет)</span>
						<span className="sm:hidden">Сроки смены</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("cariogram")}
						className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "cariogram"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						<span className="hidden sm:inline">Cariogram (Риск кариеса)</span>
						<span className="sm:hidden">Cariogram</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("resorption")}
						className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "resorption"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						<span className="hidden sm:inline">Резорбция корней (0–100%)</span>
						<span className="sm:hidden">Резорбция</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("frankl")}
						className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
							activeTab === "frankl"
								? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
								: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
						}`}
					>
						<span>Шкала Frankl</span>
					</button>
				</div>

				{/* Modal Body Container */}
				<div
					className="flex-[1_1_auto] min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 md:p-8 pb-28 sm:pb-8 space-y-6 touch-pan-y"
				>
					{/* ⚡ 1-Клик Клинические Протоколы и Физиологическая Норма (Мандат 8e / 8i / 8k / 8n) */}
					<div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 space-y-2.5 shadow-xs">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-2">
								<Zap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
									⚡ 1-Клик Клинические Протоколы &amp; Физиологическая Норма (Мандат 8e / Приказ 804н)
								</span>
							</div>
							<span className="text-[11px] font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
								0 лишних кликов • Без бюрократии • Готовый дневник 043/у
							</span>
						</div>

						{/* Quick Action Buttons Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
							{/* 1. 3 года: Временный прикус — норма */}
							<button
								type="button"
								onClick={handleApplyPrimaryNorm}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
								title="Установить норму временного прикуса (3 года): 20 интактных молочных зубов (51–85), кариеса нет, резорбция 0%"
								data-testid="pediatric-preset-3y-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold text-emerald-700 dark:text-emerald-400 truncate">
										⚡ 3 года: Молочный прикус
									</div>
									<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
										51–85 интактны, 0% резорбция
									</div>
								</div>
								<Check className="w-4 h-4 text-emerald-600 shrink-0" />
							</button>

							{/* 2. 6 лет: Первый моляр — норма */}
							<button
								type="button"
								onClick={handleApplyFirstMolarNorm}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
								title="Установить норму (6 лет): прорезывание первых моляров (16, 26, 36, 46) + 20 молочных зубов"
								data-testid="pediatric-preset-6y-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold text-cyan-700 dark:text-cyan-400 truncate">
										⚡ 6 лет: Первый моляр
									</div>
									<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
										16, 26, 36, 46 + 20 молочных
									</div>
								</div>
								<Check className="w-4 h-4 text-cyan-600 shrink-0" />
							</button>

							{/* 3. 9 лет: Сменный прикус — норма */}
							<button
								type="button"
								onClick={handleApplyEarlyMixedNorm}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-teal-500/40 hover:border-teal-500 hover:bg-teal-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
								title="Установить норму сменного прикуса (9 лет): резцы 11..42, моляры 16..46, молочные 53..85"
								data-testid="pediatric-preset-9y-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold text-teal-700 dark:text-teal-400 truncate">
										⚡ 9 лет: Сменный прикус
									</div>
									<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
										Резцы 11..42, 1-е мол., мол. 53..85
									</div>
								</div>
								<Check className="w-4 h-4 text-teal-600 shrink-0" />
							</button>

							{/* 4. 12 лет: Постоянный прикус — норма */}
							<button
								type="button"
								onClick={handleApplyPermanentNorm}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
								title="Установить норму постоянного прикуса (12 лет): 28 постоянных зубов 17..27, 47..37 без 8-ок"
								data-testid="pediatric-preset-12y-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold text-blue-700 dark:text-blue-400 truncate">
										⚡ 12 лет: Постоянный прикус
									</div>
									<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
										28 зубов (17..27, 47..37)
									</div>
								</div>
								<Check className="w-4 h-4 text-blue-600 shrink-0" />
							</button>

							{/* 5. Серебрение Saforide (A16.07.057) */}
							<button
								type="button"
								onClick={() => handleApplyProcedurePreset("saforide")}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
								title="Приказ 804н: A16.07.057 Серебрение эмали Saforide 38% (51, 52, 61, 62)"
								data-testid="pediatric-preset-saforide-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold text-amber-700 dark:text-amber-400 truncate">
										⚡ Saforide (A16.07.057)
									</div>
									<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
										Серебрение резцов 51, 52, 61, 62
									</div>
								</div>
								<Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
							</button>

							{/* 6. Герметизация фиссур Fissurit (A16.07.050) */}
							<button
								type="button"
								onClick={() => handleApplyProcedurePreset("fissurit")}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-sky-500/40 hover:border-sky-500 hover:bg-sky-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
								title="Приказ 804н: A16.07.050 Запечатывание фиссур Fissurit FX (16, 26, 36, 46)"
								data-testid="pediatric-preset-fissurit-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold text-sky-700 dark:text-sky-400 truncate">
										⚡ Fissurit FX (A16.07.050)
									</div>
									<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
										Герметизация моляров 16, 26, 36, 46
									</div>
								</div>
								<ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
							</button>

							{/* 7. Витальная пульпотомия Pulpotec (A16.07.009) */}
							<button
								type="button"
								onClick={() => handleApplyProcedurePreset("pulpotec")}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 border border-rose-500/40 hover:border-rose-500 hover:bg-rose-500/10 text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs text-left"
								title="Приказ 804н: A16.07.009 Пульпотомия (ампутация пульпы) препаратом Pulpotec"
								data-testid="pediatric-preset-pulpotec-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold text-rose-700 dark:text-rose-400 truncate">
										⚡ Pulpotec (A16.07.009)
									</div>
									<div className="text-[10px] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] truncate">
										Пульпотомия мол. моляра 54
									</div>
								</div>
								<Activity className="w-4 h-4 text-rose-600 shrink-0" />
							</button>

							{/* 8. Вставить протокол в карту 043/у */}
							<button
								type="button"
								onClick={handleInsertCariogramTo043}
								className="min-h-[44px] px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 shadow-sm text-left"
								title="Мгновенно перенести текущий протокол, Cariogram и поведение по Франклу в дневник Формы 043/у"
								data-testid="pediatric-preset-insert-043-btn"
							>
								<div className="min-w-0">
									<div className="font-extrabold truncate">
										⚡ В карту 043/у (1 клик)
									</div>
									<div className="text-[10px] text-teal-100 truncate">
										Перенос протокола и статуса
									</div>
								</div>
								<Zap className="w-4 h-4 text-amber-300 shrink-0" />
							</button>
						</div>
					</div>
					{/* ------------------------------------------------------------------------- */}
					{/* TAB 1: ERUPTION & MIXED DENTITION TIMELINE */}
					{/* ------------------------------------------------------------------------- */}
					{activeTab === "timeline" && (
						<div className="space-y-6 animate-in fade-in duration-200">
							{/* Age Slider & Preset Bar */}
							<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
											Калькулятор смены зубов
										</span>
										<h3 className="text-base sm:text-lg font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100">
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

								{/* Clinical Age Presets Bar (3-5 years, 6-7 years, 8-10 years, 11-13 years) */}
								<div className="space-y-2">
									<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
										Клинические возрастные пресеты (Мандат 8e &amp; 8k — норма в 1 клик):
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
										{PEDIATRIC_AGE_PRESETS.map((preset) => {
											const isSelected =
												(preset.id === "primary" && selectedAge < 5.5) ||
												(preset.id === "early_mixed" && selectedAge >= 5.5 && selectedAge < 7.5) ||
												(preset.id === "late_mixed" && selectedAge >= 7.5 && selectedAge < 11.0) ||
												(preset.id === "permanent_12y" && selectedAge >= 11.0);
											return (
												<div
													key={preset.id}
													onClick={() => setSelectedAge(preset.targetAge)}
													className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
														isSelected
															? "border-teal-600 bg-teal-500/15 dark:bg-teal-950/30 shadow-sm ring-2 ring-teal-500/20"
															: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-800"
													}`}
													data-testid={`pediatric-timeline-card-${preset.id}`}
												>
													<div>
														<div className="flex items-center justify-between gap-1 mb-1">
															<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100">
																{preset.labelRu}
															</span>
															<span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300">
																{preset.ageRangeRu}
															</span>
														</div>
														<p className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 line-clamp-2 font-medium">
															{preset.descriptionRu}
														</p>
													</div>

													<div className="mt-2.5 pt-2 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))]/60 dark:border-slate-800 flex items-center justify-between gap-2">
														<span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
															{preset.targetAge.toFixed(1)} лет
														</span>
														{onApplyAgeArch && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	setSelectedAge(preset.targetAge);
																	if (preset.teethNumbers) {
																		onApplyAgeArch([...preset.teethNumbers]);
																	} else {
																		const analysis = calculateEruptionTimelineByAge(preset.targetAge);
																		onApplyAgeArch([
																			...analysis.expectedUpperArchTeeth,
																			...analysis.expectedLowerArchTeeth,
																		]);
																	}
																	showToast(
																		`Пресет «${preset.labelRu}» (${preset.ageRangeRu}) успешно применен к одонтограмме!`,
																		"success",
																		3000,
																	);
																}}
																className="min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-xs select-none touch-manipulation"
																title={`Применить формулу «${preset.labelRu}» в 1 клик`}
																data-testid={`pediatric-timeline-apply-${preset.id}`}
															>
																<Sparkles className="w-4 h-4 shrink-0" />
																<span>Применить</span>
															</button>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</div>

								{/* Range Slider (Expanded from 3.0 to 13.5 years) */}
								<div className="space-y-2 pt-2">
									<input
										type="range"
										min="3.0"
										max="13.5"
										step="0.1"
										value={selectedAge}
										onChange={(e) => setSelectedAge(Number.parseFloat(e.target.value))}
										className="pediatric-age-slider w-full h-3 bg-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] rounded-lg appearance-none cursor-pointer accent-[var(--teal,#0d9488)] touch-none select-none"
										aria-label="Возраст ребенка для расчета смены прикуса"
									/>
									<div className="flex justify-between text-[11px] sm:text-xs md:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-mono font-bold select-none">
										<span>3.0<span className="hidden sm:inline font-normal"> (Временный)</span></span>
										<span>6.0<span className="hidden sm:inline font-normal"> (1-е мол.)</span></span>
										<span>7.5<span className="hidden sm:inline font-normal"> (Резцы)</span></span>
										<span>9.5<span className="hidden sm:inline font-normal"> (Премол.)</span></span>
										<span>12.0<span className="hidden sm:inline font-normal"> (2-е мол.)</span></span>
										<span>13.5<span className="hidden sm:inline font-normal"> лет</span></span>
									</div>
								</div>

								<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] italic leading-relaxed">
									{timelineAnalysis.stageDescriptionRu}
								</p>
							</div>

							{/* Dental Arch Visual Preview */}
							<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
								<div className="flex items-center justify-between">
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
										Ожидаемая зубная формула в {selectedAge.toFixed(1)} лет
									</h4>
								</div>

								<div className="w-full overflow-x-auto touch-pan-x snap-x pb-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
									<div className="min-w-[640px] space-y-4">
										{/* Upper Arch */}
										<div className="space-y-2">
											<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
												{hasFirstPermanentMolars
													? "Верхняя челюсть (12 зубов, включая 1-е моляры):"
													: "Верхняя челюсть (10 молочных зубов):"}
											</div>
											<div className={`grid gap-2 ${hasFirstPermanentMolars ? "grid-cols-12" : "grid-cols-10"}`}>
												{upperRow.map((num) => {
													const isPrim = isPrimaryTooth(num);
													const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
													return (
														<span
															key={num}
															className={`min-h-[52px] min-w-[48px] px-1 py-1.5 rounded-xl text-sm font-mono font-bold border flex flex-col items-center justify-center gap-1 shadow-xs select-none transition-all shrink-0 snap-start ${
																isErupting
																	? "bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-500/60 animate-pulse font-bold"
																	: isPrim
																		? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-400/50 hover:border-amber-500"
																		: "bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-400/50 hover:border-teal-500"
															}`}
															title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
														>
															<span className="text-sm font-bold font-mono leading-none">{num}</span>
															<span className="text-[10px] font-semibold font-sans opacity-90 leading-none">
																{isPrim ? "Мол." : "Пост."}
															</span>
														</span>
													);
												})}
											</div>
										</div>

										{/* Lower Arch */}
										<div className="space-y-2">
											<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
												{hasFirstPermanentMolars
													? "Нижняя челюсть (12 зубов, включая 1-е моляры):"
													: "Нижняя челюсть (10 молочных зубов):"}
											</div>
											<div className={`grid gap-2 ${hasFirstPermanentMolars ? "grid-cols-12" : "grid-cols-10"}`}>
												{lowerRow.map((num) => {
													const isPrim = isPrimaryTooth(num);
													const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
													return (
														<span
															key={num}
															className={`min-h-[52px] min-w-[48px] px-1 py-1.5 rounded-xl text-sm font-mono font-bold border flex flex-col items-center justify-center gap-1 shadow-xs select-none transition-all shrink-0 snap-start ${
																isErupting
																	? "bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-500/60 animate-pulse font-bold"
																	: isPrim
																		? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-400/50 hover:border-amber-500"
																		: "bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-400/50 hover:border-teal-500"
															}`}
															title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
														>
															<span className="text-sm font-bold font-mono leading-none">{num}</span>
															<span className="text-[10px] font-semibold font-sans opacity-90 leading-none">
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
									className="min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
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
						<PediatricResorptionTab
							selectedPrimaryTooth={selectedPrimaryTooth}
							onSelectPrimaryTooth={setSelectedPrimaryTooth}
							selectedResorptionStage={selectedResorptionStage}
							onSelectResorptionStage={setSelectedResorptionStage}
							onUpdateToothResorption={onUpdateToothResorption}
							onBatchUpdateResorption={onBatchUpdateResorption}
							patientAgeYears={selectedAge}
							onAgeChange={setSelectedAge}
						/>
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
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
