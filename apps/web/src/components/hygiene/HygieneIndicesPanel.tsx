/**
 * HygieneIndicesPanel.tsx — Экспресс-расчет клинических индексов гигиены полости рта (OHI-S, PMA, КПИ Леуса, Silness-Löe, Федорова-Володкиной, PHP).
 *
 * (DOMAIN: CLINICAL HYGIENE INDICES & PERIODONTAL ASSESSMENT)
 *
 * Архитектурная декомпозиция по Мандату 8b (строго <= 800 строк):
 * 1. OhiSilnessCalculator.tsx — калькулятор индексов OHI-S и Silness-Löe (<= 500 строк).
 * 2. KpuBleedingIndicesCalculator.tsx — калькулятор КПУ и кровоточивости десневой борозды SBI (<= 500 строк).
 * 3. HygieneExpressPresetsStrip.tsx — экспресс-пресеты клинических статусов и протоколов 804н.
 * 4. hygienePrintHelper.ts — печать стандартизированного протокола Формы 043/у.
 * 5. hygienePresetsData.ts — справочники и генераторы клинических текстов.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Check,
	Clipboard,
	Printer,
	RotateCcw,
	ShieldCheck,
} from "lucide-react";
import { DentalForm043 } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	calculateCombinedHygieneReport,
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	calculateSilnessLoeScore,
	createHealthyHygieneAssessment,
	deriveHygieneFromPerioTeeth,
	HYGIENE_INDEX_TEETH_CONFIG,
	WHO_HYGIENE_SEXTANTS,
	type CombinedHygieneReport,
	type ExtendedToothAssessment,
	type FedorovVolodkinaResult,
	type HygieneToothAssessment,
	type PerioToothRecord,
	type PhpResult,
	type SilnessLoeResult,
} from "@dental/shared";

import {
	CATARRHAL_GINGIVITIS_ASSESSMENTS,
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createCatarrhalGingivitisProtocolText,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createMildPeriodontitisProtocolText,
	createModeratePeriodontitisProtocolText,
	createPerioAntisepticProtocolText,
	createSeverePeriodontitisProtocolText,
	createToothMousseProtocolText,
	DEEP_FLUORIDATION_SERVICE,
	HYGIENE_EXPRESS_SERVICES,
	MILD_PERIODONTITIS_ASSESSMENTS,
	MODERATE_PERIODONTITIS_ASSESSMENTS,
	PERIO_ANTISEPTIC_SERVICE,
	PRO_HYGIENE_SERVICE,
	SEVERE_PERIODONTITIS_ASSESSMENTS,
	TOOTH_MOUSSE_SERVICE,
} from "./hygienePresetsData";

import { OhiSilnessCalculator } from "./OhiSilnessCalculator";
import { KpuBleedingIndicesCalculator } from "./KpuBleedingIndicesCalculator";
import { HygieneExpressPresetsStrip } from "./HygieneExpressPresetsStrip";
import { printHygieneProtocol } from "./hygienePrintHelper";

export {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	HYGIENE_EXPRESS_SERVICES,
	createDeepFluoridationProtocolText,
	createToothMousseProtocolText,
	createPerioAntisepticProtocolText,
	type ExtendedToothAssessment,
	type SilnessLoeResult,
	type FedorovVolodkinaResult,
	type PhpResult,
	calculateSilnessLoeScore,
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	OhiSilnessCalculator,
	KpuBleedingIndicesCalculator,
	HygieneExpressPresetsStrip,
};

export type ActiveHygieneIndexTab =
	| "ohi-s"
	| "silness-loe"
	| "fedorov-volodkina"
	| "php";

export interface HygieneIndicesPanelProps {
	/** Optional existing perio dentition for auto-sync */
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	/** Callback when assessments change */
	readonly onChange?: ((report: CombinedHygieneReport) => void) | undefined;
	/** Insertion into 043/u visit diary */
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
}

export const HygieneIndicesPanel: React.FC<HygieneIndicesPanelProps> = ({
	perioTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	compactMode = false,
}) => {
	// Active assessment state for 6 index teeth
	const [assessments, setAssessments] = useState<
		Record<number, ExtendedToothAssessment>
	>(() => {
		if (perioTeeth && perioTeeth.length > 0) {
			const derived = deriveHygieneFromPerioTeeth(perioTeeth);
			const enriched: Record<number, ExtendedToothAssessment> = {};
			for (const [k, v] of Object.entries(derived)) {
				const num = Number(k);
				const d = v.debrisScore ?? 0;
				enriched[num] = {
					...v,
					silnessScore: d,
					fedorovScore: d === 0 ? 1 : Math.min(5, d + 1),
					phpScore: Math.min(5, Math.round(d * 1.67)),
				};
			}
			return enriched;
		}
		const healthy = createHealthyHygieneAssessment();
		const enrichedHealthy: Record<number, ExtendedToothAssessment> = {};
		for (const [k, v] of Object.entries(healthy)) {
			const num = Number(k);
			enrichedHealthy[num] = {
				...valToExtended(v),
				silnessScore: 0,
				fedorovScore: 1,
				phpScore: 0,
			};
		}
		return enrichedHealthy;
	});

	const [activeTab, setActiveTab] = useState<ActiveHygieneIndexTab>("ohi-s");
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	// Calculate live report via @dental/shared pure engine
	const report: CombinedHygieneReport = useMemo(() => {
		return calculateCombinedHygieneReport(assessments);
	}, [assessments]);

	// Secondary indices calculation
	const silnessResult = useMemo(
		() => calculateSilnessLoeScore(assessments),
		[assessments],
	);
	const fedorovResult = useMemo(
		() => calculateFedorovVolodkinaScore(assessments),
		[assessments],
	);
	const phpResult = useMemo(() => calculatePhpScore(assessments), [assessments]);

	// Broadcast change upward
	useEffect(() => {
		if (onChange) {
			onChange(report);
		}
	}, [report, onChange]);

	// ─── Tooth Score Updates ──────────────────────────────────────────────────
	const updateToothScore = useCallback(
		(
			toothNumber: number,
			field:
				| "debrisScore"
				| "calculusScore"
				| "pmaScore"
				| "kpiScore"
				| "silnessScore"
				| "fedorovScore"
				| "phpScore",
			value: number,
		) => {
			if (readOnly) return;
			setAssessments((prev) => {
				const current = prev[toothNumber] ?? { toothNumber };
				let debrisScore = current.debrisScore;
				let calculusScore = current.calculusScore;
				let pmaScore = current.pmaScore;
				let kpiScore = current.kpiScore;
				let silnessScore = current.silnessScore;
				let fedorovScore = current.fedorovScore;
				let phpScore = current.phpScore;

				if (field === "debrisScore") {
					debrisScore = value;
					silnessScore = value;
					fedorovScore = value === 0 ? 1 : Math.min(5, value + 1);
					phpScore = Math.min(5, Math.round(value * 1.67));
				} else if (field === "calculusScore") {
					calculusScore = value;
				} else if (field === "pmaScore") {
					pmaScore = value;
				} else if (field === "kpiScore") {
					kpiScore = value;
				} else if (field === "silnessScore") {
					silnessScore = value;
					debrisScore = value;
					fedorovScore = value === 0 ? 1 : Math.min(5, value + 1);
					phpScore = Math.min(5, Math.round(value * 1.67));
				} else if (field === "fedorovScore") {
					fedorovScore = value;
					const mappedDebris = value === 1 ? 0 : Math.min(3, value - 1);
					debrisScore = mappedDebris;
					silnessScore = mappedDebris;
					phpScore = Math.min(5, Math.round(mappedDebris * 1.67));
				} else if (field === "phpScore") {
					phpScore = value;
					const mappedDebris =
						value === 0 ? 0 : value <= 2 ? 1 : value <= 4 ? 2 : 3;
					debrisScore = mappedDebris;
					silnessScore = mappedDebris;
					fedorovScore = mappedDebris === 0 ? 1 : mappedDebris + 1;
				}

				const updated: ExtendedToothAssessment = {
					...current,
					debrisScore,
					calculusScore,
					pmaScore,
					kpiScore,
					silnessScore,
					fedorovScore,
					phpScore,
				};
				return {
					...prev,
					[toothNumber]: updated,
				};
			});
		},
		[readOnly],
	);

	// Helper to apply clinical protocols to store & events
	const applyClinicalProtocol = useCallback(
		(protocolText: string, toastMessage: string, toastType: "success" | "warning" = "success") => {
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${protocolText}`
					: protocolText,
			}));

			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: protocolText,
						mode: "smart_append",
					},
				}),
			);

			onInsertToProtocol?.(protocolText);
			showToast(toastMessage, toastType, 4000);
		},
		[onInsertToProtocol],
	);

	const dispatchServiceEvents = useCallback((service: { code: string; name: string; price: number; quantity: number; category: string }) => {
		window.dispatchEvent(
			new CustomEvent("dente-add-estimate-service", {
				detail: service,
			}),
		);
		window.dispatchEvent(
			new CustomEvent("dente-add-services-to-invoice", {
				detail: {
					...service,
					service,
					services: [service],
				},
			}),
		);
	}, []);

	// 1. Норма пародонта
	const handlePresetPeriodontalNorm = useCallback(() => {
		if (readOnly) return;
		const healthy = createHealthyHygieneAssessment();
		const enrichedHealthy: Record<number, ExtendedToothAssessment> = {};
		for (const [key, val] of Object.entries(healthy)) {
			const num = Number(key);
			enrichedHealthy[num] = { ...val, silnessScore: 0, fedorovScore: 1, phpScore: 0 };
		}
		setAssessments(enrichedHealthy);
		const protocolText = createClinicalPerioNormProtocolText();
		applyClinicalProtocol(protocolText, `${CLINICAL_PERIO_NORM_SUMMARY_RU}. Данные внесены в медицинскую карту!`, "success");
	}, [readOnly, applyClinicalProtocol]);

	// 2. Катаральный гингивит
	const handlePresetCatarrhalGingivitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(CATARRHAL_GINGIVITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(CATARRHAL_GINGIVITIS_ASSESSMENTS);
		const protocolText = createCatarrhalGingivitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Катаральный гингивит зафиксирован: отек сосочков, BOP+, наддесневые отложения. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// 3. Пародонтит легкой степени
	const handlePresetMildPeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(MILD_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(MILD_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createMildPeriodontitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Пародонтит легкой степени зафиксирован: карманы 3-4 мм, над/поддесневой камень, BOP+. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// 4. Пародонтит средней степени
	const handlePresetModeratePeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(MODERATE_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(MODERATE_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createModeratePeriodontitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Пародонтит средней степени зафиксирован: карманы 4-5 мм, рецессия 1-2 мм, зубной камень, подвижность I ст. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// 5. Пародонтит тяжёлой степени
	const handlePresetSeverePeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(SEVERE_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(SEVERE_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createSeverePeriodontitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Пародонтит тяжёлой степени зафиксирован: карманы ≥6 мм, гноетечение, подвижность II-III ст. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// 6. Профессиональная гигиена выполнена (A16.07.051)
	const handlePresetProHygieneDone = useCallback(() => {
		if (readOnly) return;
		handlePresetPeriodontalNorm();
		const protocolText = createClinicalProHygieneProtocolText();
		dispatchServiceEvents(PRO_HYGIENE_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_PRO_HYGIENE_SUMMARY_RU}. Дневник приёма и смета обновлены!`, "success");
	}, [readOnly, handlePresetPeriodontalNorm, dispatchServiceEvents, applyClinicalProtocol]);

	// 7. Глубокое фторирование эмали (A11.07.012)
	const handlePresetDeepFluoridation = useCallback(() => {
		if (readOnly) return;
		const protocolText = createDeepFluoridationProtocolText();
		dispatchServiceEvents(DEEP_FLUORIDATION_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU}. Внесено в карту и чек визита!`, "success");
	}, [readOnly, dispatchServiceEvents, applyClinicalProtocol]);

	// 8. Реминерализирующая терапия каппой (GC Tooth Mousse, A11.07.010)
	const handlePresetToothMousse = useCallback(() => {
		if (readOnly) return;
		const protocolText = createToothMousseProtocolText();
		dispatchServiceEvents(TOOTH_MOUSSE_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_TOOTH_MOUSSE_SUMMARY_RU}. Внесено в карту и чек визита!`, "success");
	}, [readOnly, dispatchServiceEvents, applyClinicalProtocol]);

	// 9. Медикаментозная обработка карманов (A16.07.053)
	const handlePresetPerioAntiseptic = useCallback(() => {
		if (readOnly) return;
		const protocolText = createPerioAntisepticProtocolText();
		dispatchServiceEvents(PERIO_ANTISEPTIC_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU}. Внесено в карту и чек визита!`, "success");
	}, [readOnly, dispatchServiceEvents, applyClinicalProtocol]);

	const handleSyncFromPerio = useCallback(() => {
		if (readOnly || !perioTeeth || perioTeeth.length === 0) return;
		const derived = deriveHygieneFromPerioTeeth(perioTeeth);
		const enriched: Record<number, ExtendedToothAssessment> = {};
		for (const [k, v] of Object.entries(derived)) {
			const num = Number(k);
			const d = v.debrisScore ?? 0;
			enriched[num] = {
				...v,
				silnessScore: d,
				fedorovScore: d === 0 ? 1 : Math.min(5, d + 1),
				phpScore: Math.min(5, Math.round(d * 1.67)),
			};
		}
		setAssessments(enriched);
		showToast("Индексы синхронизированы с текущей пародонтограммой", "info", 3500);
	}, [readOnly, perioTeeth]);

	// Вставка в медицинскую карту 043/у
	const handleInsertTo043 = useCallback(() => {
		const lines = [
			report.summaryText043,
			"• Дополнительные клинические индексы гигиены:",
			`  - ${silnessResult.ratingText}`,
			`  - ${fedorovResult.ratingText}`,
			`  - ${phpResult.ratingText}`,
		];
		const textToInsert = lines.join("\n");

		applyClinicalProtocol(textToInsert, "Индексы гигиены успешно внесены в дневник приёма", "success");

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(textToInsert);
		}

		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2500);
	}, [report.summaryText043, silnessResult, fedorovResult, phpResult, applyClinicalProtocol]);

	// Печать протокола клинических индексов
	const handlePrintProtocol = useCallback(() => {
		printHygieneProtocol(report, silnessResult, fedorovResult, phpResult, assessments);
	}, [report, silnessResult, fedorovResult, phpResult, assessments]);

	const handleCopyText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(report.summaryText043);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Протокол индексов гигиены скопирован", "success", 3000);
		}
	}, [report.summaryText043]);

	return (
		<div data-testid="hygiene-indices-panel" className="w-full flex flex-col gap-4 p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-xs">
			{/* ─── Шапка и действия (Miller's Law) ─────────────────────────── */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 shrink-0">
						<ShieldCheck size={20} />
					</div>
					<div className="min-w-0 flex-1">
						<h4 className="text-sm font-bold text-[var(--ink)] truncate">
							Индексы гигиены полости рта (OHI-S, PMA, КПИ Леуса)
						</h4>
						<p className="text-xs text-[var(--muted)] truncate">
							Быстрый клинический замер по 6 индексным зубам без требования заполнять всю челюсть
						</p>
					</div>
				</div>

				{!readOnly && (
					<div className="flex items-center gap-2 flex-wrap shrink-0">
						{perioTeeth && perioTeeth.length > 0 && (
							<button
								type="button"
								onClick={handleSyncFromPerio}
								className="h-8 sm:h-9 px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] hover:bg-teal-500/15 hover:text-teal-700 dark:hover:text-teal-300 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
								title="Импортировать налет и кровоточивость из пародонтограммы"
							>
								<RotateCcw size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate">Из перио-карты</span>
							</button>
						)}

						{/* Внесение в 043/у */}
						<button
							type="button"
							onClick={handleInsertTo043}
							className="h-8 sm:h-9 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer touch-manipulation truncate"
							title="Вставить сводку индексов гигиены в дневник приёма"
							data-testid="hygiene-insert-to-043-btn"
						>
							{insertStatus ? <Check size={14} className="shrink-0" /> : <DentalForm043 size={14} className="shrink-0" />}
							<span className="truncate">{insertStatus ? "Внесено в карту!" : "В медицинскую карту"}</span>
						</button>

						{/* Печать протокола */}
						<button
							type="button"
							onClick={handlePrintProtocol}
							className="h-8 sm:h-9 px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
							title="Распечатать стандартизированный протокол клинических индексов гигиены"
							data-testid="hygiene-print-protocol-btn"
						>
							<Printer size={14} className="shrink-0" />
							<span className="truncate">Печать протокола</span>
						</button>

						<button
							type="button"
							onClick={handleCopyText}
							className="h-8 sm:h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer flex items-center justify-center touch-manipulation"
							title="Скопировать протокол в буфер обмена"
							aria-label="Скопировать протокол в буфер"
							data-testid="hygiene-copy-protocol-btn"
						>
							{copyStatus ? <Check size={15} className="text-emerald-500 dark:text-emerald-400" /> : <Clipboard size={15} />}
						</button>
					</div>
				)}
			</div>

			{/* ─── Экспресс-пресеты клинических статусов и протоколов 804н ─── */}
			{!readOnly && (
				<HygieneExpressPresetsStrip
					onPresetPeriodontalNorm={handlePresetPeriodontalNorm}
					onPresetCatarrhalGingivitis={handlePresetCatarrhalGingivitis}
					onPresetMildPeriodontitis={handlePresetMildPeriodontitis}
					onPresetModeratePeriodontitis={handlePresetModeratePeriodontitis}
					onPresetSeverePeriodontitis={handlePresetSeverePeriodontitis}
					onPresetProHygieneDone={handlePresetProHygieneDone}
					onPresetDeepFluoridation={handlePresetDeepFluoridation}
					onPresetToothMousse={handlePresetToothMousse}
					onPresetPerioAntiseptic={handlePresetPerioAntiseptic}
				/>
			)}

			{/* ─── Тулбар переключения индексов (Hick's Law: 32–36px) ────────── */}
			<div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--line)]">
				<div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] h-8 sm:h-9">
					{[
						{ id: "ohi-s", label: "OHI-S (Грин-Вермиллион)", shortLabel: "OHI-S" },
						{ id: "silness-loe", label: "Silness-Löe (Сиднесс-Лоэ)", shortLabel: "Сиднесс-Лоэ" },
						{ id: "fedorov-volodkina", label: "Федорова-Володкина", shortLabel: "Федорова-Володкина" },
						{ id: "php", label: "PHP (Подошадлей-Хейли)", shortLabel: "PHP" },
					].map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id as ActiveHygieneIndexTab)}
								className={`h-6 sm:h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer truncate ${
									isActive
										? "bg-teal-600 text-white font-bold shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/40"
								}`}
								title={tab.label}
							>
								<span className="hidden sm:inline truncate">{tab.label}</span>
								<span className="sm:hidden truncate">{tab.shortLabel}</span>
							</button>
						);
					})}
				</div>

				<div className="text-[11px] text-[var(--muted)] min-w-0 truncate hidden md:flex items-center gap-1.5">
					<span className="font-semibold text-teal-700 dark:text-teal-400">
						{activeTab === "ohi-s" && "OHI-S:"}
						{activeTab === "silness-loe" && "Silness-Löe:"}
						{activeTab === "fedorov-volodkina" && "Федорова-Володкина:"}
						{activeTab === "php" && "PHP:"}
					</span>
					<span className="truncate">
						{activeTab === "ohi-s" && "Зубной налет (DI-S) + зубной камень (CI-S). Норма ≤ 0.6"}
						{activeTab === "silness-loe" && "Толщина налета у края десны (0..3). Норма = 0 (налет отсутствует)"}
						{activeTab === "fedorov-volodkina" && "Окрашивание раствором Шиллера-Писарева (1..5). Норма = 1.0"}
						{activeTab === "php" && "Эффективность гигиены по 5 зонам коронки (0..5). Норма = 0.0"}
					</span>
				</div>
			</div>

			{/* ─── Телеметрия OHI-S и Silness-Löe (Субкомпонент 1) ─────────── */}
			<OhiSilnessCalculator
				assessments={assessments}
				report={report}
				silnessResult={silnessResult}
				activeTab={activeTab}
				onUpdateToothScore={updateToothScore}
				readOnly={readOnly}
				compactMode={compactMode}
			/>

			{/* ─── Карточки вторичных индексов (PMA и КПИ) ─────────────────── */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{/* PMA */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							Индекс PMA (Парма / воспаление)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								report.pma.severity === "intact"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: report.pma.severity === "mild"
										? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
										: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{report.pma.severity === "intact"
								? "Норма 0%"
								: report.pma.severity === "mild"
									? "Легкий"
									: "Средний/Тяжелый"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								report.pma.pmaPercent === 0
									? "text-emerald-600 dark:text-emerald-400"
									: report.pma.pmaPercent <= 25
										? "text-amber-600 dark:text-amber-400"
										: "text-rose-600 dark:text-rose-400"
							}`}
						>
							{report.pma.pmaPercent}%
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							баллы: <strong>{report.pma.totalPoints}</strong> из {report.pma.maxPossiblePoints}
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: 0% (воспаление десны отсутствует)
					</span>
				</div>

				{/* КПИ Леуса */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							КПИ Леуса (состояние пародонта)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								report.kpi.severity === "healthy"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: report.kpi.severity === "risk"
										? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
										: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{report.kpi.severity === "healthy" ? "Здоров 0.0" : "Изменения"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								report.kpi.kpiScore === 0
									? "text-emerald-600 dark:text-emerald-400"
									: "text-amber-600 dark:text-amber-400"
							}`}
						>
							{report.kpi.kpiScore.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							обследовано: <strong>{report.kpi.assessedTeethCount}</strong> зубов
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: 0.0 (здоровый периодонт)
					</span>
				</div>
			</div>

			{/* ─── Сетка 6 индексных зубов для PMA и КПИ ───────────────────── */}
			<div className="flex flex-col gap-3">
				<div className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center justify-between flex-wrap gap-1">
					<span className="truncate">
						СЕТКА 6 ИНДЕКСНЫХ ЗУБОВ (16, 11, 26 • 46, 31, 36) — ВОСПАЛЕНИЕ И ПЕРИОДОНТ:
					</span>
					<span className="text-[11px] text-[var(--muted)] font-normal truncate">
						Кликните на цифру для выбора балла
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
					{HYGIENE_INDEX_TEETH_CONFIG.map((cfg) => {
						const item = assessments[cfg.toothNumber] ?? { toothNumber: cfg.toothNumber };
						const pma = item.pmaScore ?? 0;
						const kpi = item.kpiScore ?? 0;
						const sextantDef = WHO_HYGIENE_SEXTANTS.find((s) => s.indexToothNumber === cfg.toothNumber);

						return (
							<div
								key={cfg.toothNumber}
								className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2.5 min-w-0"
							>
								{/* Tooth Header */}
								<div className="flex items-center justify-between min-w-0">
									<div className="flex items-center gap-2 min-w-0 flex-1">
										<span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-800 dark:text-teal-300 font-mono font-black text-sm flex items-center justify-center border border-teal-500/30 shrink-0">
											{cfg.toothNumber}
										</span>
										<div className="min-w-0 flex-1">
											<div className="text-xs font-bold text-[var(--ink)] truncate">
												{cfg.anatomicalNameRu}
											</div>
											<div className="text-[10px] text-teal-700 dark:text-teal-400 font-medium truncate">
												{cfg.surfaceLabelRu}
											</div>
										</div>
									</div>
									{sextantDef && (
										<span
											className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 shrink-0"
											title={`Секстант ВОЗ ${sextantDef.sextant}: зубы ${sextantDef.teethRangeRu}`}
										>
											{sextantDef.sextant} ({sextantDef.teethRangeRu})
										</span>
									)}
								</div>

								{/* PMA */}
								<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line)]/60">
									<span className="text-[11px] text-[var(--muted)] font-medium truncate">
										Воспаление (PMA):
									</span>
									<div className="flex items-center gap-1 shrink-0">
										{[
											{ val: 0, label: "0", hint: "0: Десна здорова" },
											{ val: 1, label: "P", hint: "1: Сосочек (P - Papillary)" },
											{ val: 2, label: "M", hint: "2: Маргинальная десна (M)" },
											{ val: 3, label: "A", hint: "3: Альвеолярная десна (A)" },
										].map(({ val, label, hint }) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() => updateToothScore(cfg.toothNumber, "pmaScore", val)}
												className={`min-h-[44px] min-w-[30px] sm:min-w-[34px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
													pma === val
														? val === 0
															? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
															: "bg-rose-500 text-white font-black shadow-xs ring-1 ring-rose-300"
														: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
												}`}
												title={hint}
											>
												{label}
											</button>
										))}
									</div>
								</div>

								{/* KPI */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[11px] text-[var(--muted)] font-medium truncate">
										Периодонт (КПИ):
									</span>
									<div className="flex items-center gap-1 shrink-0">
										{[
											{ val: 0, label: "0", hint: "0: Здоровый периодонт" },
											{ val: 1, label: "1", hint: "1: Кровоточивость (BOP)" },
											{ val: 2, label: "2", hint: "2: Зубной камень" },
											{ val: 3, label: "3", hint: "3: Карман 4-5 мм" },
											{ val: 4, label: "4", hint: "4: Карман ≥ 6 мм или подвижность" },
										].map(({ val, label, hint }) => (
											<button
												key={val}
												type="button"
												disabled={readOnly}
												onClick={() => updateToothScore(cfg.toothNumber, "kpiScore", val)}
												className={`min-h-[44px] min-w-[28px] sm:min-w-[32px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
													kpi === val
														? val === 0
															? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
															: val <= 2
																? "bg-amber-500 text-slate-950 font-black ring-1 ring-amber-300"
																: "bg-rose-600 text-white font-black ring-1 ring-rose-300"
														: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
												}`}
												title={hint}
											>
												{label}
											</button>
										))}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* ─── Индексы КПУ и кровоточивости десневой борозды (Субкомпонент 2) ─── */}
			<KpuBleedingIndicesCalculator
				onInsertToProtocol={onInsertToProtocol}
				readOnly={readOnly}
			/>
		</div>
	);
};

function valToExtended(item: HygieneToothAssessment): ExtendedToothAssessment {
	return {
		...item,
		silnessScore: item.debrisScore ?? 0,
		fedorovScore: (item.debrisScore ?? 0) === 0 ? 1 : Math.min(5, (item.debrisScore ?? 0) + 1),
		phpScore: Math.min(5, Math.round((item.debrisScore ?? 0) * 1.67)),
	};
}
