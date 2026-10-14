/**
 * HygieneIndicesPanel.tsx — Экспресс-расчет клинических индексов гигиены полости рта (OHI-S, PMA, КПИ Леуса, Silness-Löe, Федорова-Володкиной, PHP).
 *
 * (DOMAIN: CLINICAL HYGIENE INDICES & PERIODONTAL ASSESSMENT)
 *
 * Архитектурная декомпозиция по Мандату 8b (строго <= 800 строк):
 * 1. OhiSilnessCalculator.tsx — калькулятор индексов OHI-S и Silness-Löe (<= 500 строк).
 * 2. KpuBleedingIndicesCalculator.tsx — калькулятор КПУ и кровоточивости десневой борозды SBI (<= 500 строк).
 * 3. HygieneExpressPresetsStrip.tsx — экспресс-пресеты клинических статусов и протоколов 804н.
 * 4. HygieneHomeCareCard.tsx — персональная карта домашнего ухода (Curaprox 5460, монопучок, ершики, ирригатор, паста RDA < 50).
 * 5. HygieneBottomSheetDrawer.tsx — нативная мобильная шторка Bottom Sheet по Apple HIG.
 * 6. hygieneWarehouseHelper.ts — списание расходников профгигиены (AirFlow KaVo/EMS, Cleanic, Fluor Protector) с мягким овердрафтом.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Check,
	Clipboard,
	ClipboardList,
	Printer,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Smartphone,
} from "lucide-react";
import { DentalForm043 } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	calculateCombinedHygieneReport, calculateFedorovVolodkinaScore, calculatePhpScore,
	calculateSilnessLoeScore, createHealthyHygieneAssessment, deriveHygieneFromPerioTeeth,
	HYGIENE_INDEX_TEETH_CONFIG, WHO_HYGIENE_SEXTANTS,
	type CombinedHygieneReport, type ExtendedToothAssessment, type FedorovVolodkinaResult,
	type HygieneToothAssessment, type PerioToothRecord, type PhpResult, type SilnessLoeResult,
} from "@dental/shared";

import {
	CATARRHAL_GINGIVITIS_ASSESSMENTS, CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU, CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU, CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createCatarrhalGingivitisProtocolText, createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText, createDeepFluoridationProtocolText,
	createExpressHygieneFairProtocolText, createExpressHygienePoorProtocolText,
	createExpressHygieneSevereProtocolText, createMildPeriodontitisProtocolText,
	createModeratePeriodontitisProtocolText, createPerioAntisepticProtocolText,
	createSeverePeriodontitisProtocolText, createToothMousseProtocolText,
	DEEP_FLUORIDATION_SERVICE, EXPRESS_HYGIENE_FAIR_ASSESSMENTS,
	EXPRESS_HYGIENE_NORM_ASSESSMENTS, EXPRESS_HYGIENE_POOR_ASSESSMENTS,
	EXPRESS_HYGIENE_SEVERE_ASSESSMENTS, HYGIENE_EXPRESS_SERVICES,
	MILD_PERIODONTITIS_ASSESSMENTS, MODERATE_PERIODONTITIS_ASSESSMENTS,
	PERIO_ANTISEPTIC_SERVICE, PRO_HYGIENE_SERVICE,
	SEVERE_PERIODONTITIS_ASSESSMENTS, TOOTH_MOUSSE_SERVICE,
} from "./hygienePresetsData";

import { OhiSilnessCalculator } from "./OhiSilnessCalculator";
import { KpuBleedingIndicesCalculator } from "./KpuBleedingIndicesCalculator";
import { PmaKpiSextantsGrid } from "./PmaKpiSextantsGrid";
import { HygieneExpressPresetsStrip } from "./HygieneExpressPresetsStrip";
import { HygieneHomeCareCard } from "./HygieneHomeCareCard";
import { HygieneBottomSheetDrawer } from "./HygieneBottomSheetDrawer";
import { printHygieneProtocol } from "./hygienePrintHelper";
import { deductHygieneConsumables } from "./hygieneWarehouseHelper";

export {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU, CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU, HYGIENE_EXPRESS_SERVICES,
	createDeepFluoridationProtocolText, createToothMousseProtocolText,
	createPerioAntisepticProtocolText, type ExtendedToothAssessment,
	type SilnessLoeResult, type FedorovVolodkinaResult, type PhpResult,
	calculateSilnessLoeScore, calculateFedorovVolodkinaScore, calculatePhpScore,
	OhiSilnessCalculator, KpuBleedingIndicesCalculator, HygieneExpressPresetsStrip,
	HygieneHomeCareCard, HygieneBottomSheetDrawer,
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
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	/** Previous visit OHI-S measurement for dynamics comparison (Mandate 8e/8k) */
	readonly previousOhiS?:
		| { ohi_s: number; debris?: number; calculus?: number; date?: string }
		| number
		| null
		| undefined;
}

export const HygieneIndicesPanel: React.FC<HygieneIndicesPanelProps> = ({
	perioTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	compactMode = false,
	patientName,
	doctorName,
	patientId,
	visitId,
	previousOhiS,
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
	const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);

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

	const [fetchedPreviousOhiS, setFetchedPreviousOhiS] = useState<{ ohi_s: number; debris?: number; calculus?: number; date?: string } | null>(null);

	// Подгрузка предыдущего замера OHI-S из БД при открытии визита (Мандаты 8e, 8k)
	useEffect(() => {
		if (previousOhiS !== undefined) return;
		const effectivePatientId = patientId || (useVisitStore.getState() as any).activeVisit?.patientId || (useVisitStore.getState() as any).patientId;
		if (!effectivePatientId) return;
		let cancelled = false;
		fetch(`/api/patients/${effectivePatientId}/hygiene-indices/latest`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!cancelled && data?.latest) setFetchedPreviousOhiS(data.latest);
			})
			.catch(() => {});
		return () => { cancelled = true; };
	}, [patientId, previousOhiS]);

	// Previous visit OHI-S measurement comparison (Mandate 8e, 8k)
	const resolvedPreviousOhiS = useMemo(() => {
		if (previousOhiS !== undefined) return previousOhiS;
		if (fetchedPreviousOhiS !== null) return fetchedPreviousOhiS;
		const storeState = useVisitStore.getState() as any;
		if (storeState.previousOhiS) return storeState.previousOhiS;
		if (storeState.activeVisit?.hygieneIndices) return storeState.activeVisit.hygieneIndices;
		if (storeState.visitNoteForm?.hygieneIndices) return storeState.visitNoteForm.hygieneIndices;
		if (typeof window !== "undefined" && (window as any).__DENTE_LAST_OHI_S__) return (window as any).__DENTE_LAST_OHI_S__;
		return null;
	}, [previousOhiS, fetchedPreviousOhiS]);

	const previousScoreNum = useMemo(() => {
		if (resolvedPreviousOhiS === null || resolvedPreviousOhiS === undefined) return null;
		if (typeof resolvedPreviousOhiS === "number") return resolvedPreviousOhiS;
		if (typeof resolvedPreviousOhiS === "object" && typeof resolvedPreviousOhiS.ohi_s === "number") {
			return resolvedPreviousOhiS.ohi_s;
		}
		return null;
	}, [resolvedPreviousOhiS]);

	const previousDate = useMemo(() => {
		if (typeof resolvedPreviousOhiS === "object" && resolvedPreviousOhiS?.date) {
			return resolvedPreviousOhiS.date;
		}
		return null;
	}, [resolvedPreviousOhiS]);

	const comparisonText = useMemo(() => {
		if (previousScoreNum === null) return null;
		const current = report.ohiS.totalScore;
		const formatScore = (val: number) =>
			Number.isInteger(val) ? val.toString() : val.toFixed(1);

		if (current < previousScoreNum) {
			const diff = previousScoreNum - current;
			const pct = previousScoreNum > 0 ? Math.round((diff / previousScoreNum) * 100) : 100;
			return `Было: ${formatScore(previousScoreNum)} ➔ Стало: ${formatScore(current)} (Улучшение на ${pct}% 🟢)`;
		}
		if (current > previousScoreNum) {
			const diff = current - previousScoreNum;
			const pct = previousScoreNum > 0 ? Math.round((diff / previousScoreNum) * 100) : 100;
			return `Было: ${formatScore(previousScoreNum)} ➔ Стало: ${formatScore(current)} (Ухудшение на ${pct}% 🔴)`;
		}
		return `Было: ${formatScore(previousScoreNum)} ➔ Стало: ${formatScore(current)} (Без изменений 🟡)`;
	}, [previousScoreNum, report.ohiS.totalScore]);

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
			const hygieneIndicesData = {
				ohi_s: report.ohiS.totalScore,
				debris: report.ohiS.debrisScore,
				calculus: report.ohiS.calculusScore,
				date: new Date().toISOString(),
			};

			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${protocolText}`
					: protocolText,
				hygieneIndices: hygieneIndicesData,
			}));

			const effectiveVisitId = visitId || (useVisitStore.getState() as any).activeVisit?.id;
			if (effectiveVisitId) {
				void fetch(`/api/visits/${effectiveVisitId}/hygiene-indices`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(hygieneIndicesData),
				}).catch(() => {});
			}

			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: { soap: protocolText, mode: "smart_append", hygiene_indices: hygieneIndicesData },
				}),
			);

			window.dispatchEvent(
				new CustomEvent("dente-update-hygiene-indices", { detail: hygieneIndicesData }),
			);

			if (typeof window !== "undefined") {
				(window as any).__DENTE_LAST_OHI_S__ = hygieneIndicesData;
			}

			onInsertToProtocol?.(protocolText);
			showToast(toastMessage, toastType, 4000);
		},
		[onInsertToProtocol, report.ohiS, visitId],
	);

	const dispatchServiceEvents = useCallback((service: { code: string; name: string; price: number; quantity: number; category: string }) => {
		// 1. Добавление напрямую в смету визита treatment_items через useVisitStore
		useVisitStore.getState().addCompletedService({
			serviceId: `hygiene_${service.code}`,
			code804n: service.code,
			name: service.name,
			priceRub: service.price,
			priceKopecks: Math.round(service.price * 100),
			quantity: service.quantity,
			category: service.category,
		});

		// 2. Генерация событий начисления для сметы и чека
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

	// ─── 4 ЭКСПРЕСС-СТАТУСА ГИГИЕНЫ ПОЛОСТИ РТА (OHI-S, SBI, BOP) ────────────
	// 1. Норма / Идеальная (OHI-S = 0.0)
	const handlePresetHygieneNorm = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_NORM_ASSESSMENTS);
		const protocolText = createClinicalPerioNormProtocolText();
		applyClinicalProtocol(protocolText, "Идеальная гигиена полости рта (OHI-S = 0.0). Внесено в медицинскую карту!", "success");
	}, [readOnly, applyClinicalProtocol]);

	// 2. Удовлетворительная (мягкий налет, OHI-S = 0.8)
	const handlePresetHygieneFair = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_FAIR_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(EXPRESS_HYGIENE_FAIR_ASSESSMENTS);
		const protocolText = createExpressHygieneFairProtocolText(rep);
		applyClinicalProtocol(protocolText, "Удовлетворительная гигиена (OHI-S = 0.8: мягкий налёт). Внесено в карту!", "info" as any);
	}, [readOnly, applyClinicalProtocol]);

	// 3. Неудовлетворительная (наддесневой камень, OHI-S = 1.8)
	const handlePresetHygienePoor = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_POOR_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(EXPRESS_HYGIENE_POOR_ASSESSMENTS);
		const protocolText = createExpressHygienePoorProtocolText(rep);
		applyClinicalProtocol(protocolText, "Неудовлетворительная гигиена (OHI-S = 1.8: зубной камень). Внесено в карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// 4. Тяжелая (поддесневой камень + BOP, OHI-S = 2.6)
	const handlePresetHygieneSevere = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_SEVERE_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(EXPRESS_HYGIENE_SEVERE_ASSESSMENTS);
		const protocolText = createExpressHygieneSevereProtocolText(rep);
		applyClinicalProtocol(protocolText, "Тяжелая гигиена (OHI-S = 2.6: поддесневой камень, BOP+). Внесено в карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// ─── СТАТУСЫ ПАРОДОНТА ────────────────────────────────────────────────────
	// Норма пародонта
	const handlePresetPeriodontalNorm = useCallback(() => {
		if (readOnly) return;
		handlePresetHygieneNorm();
	}, [readOnly, handlePresetHygieneNorm]);

	// Катаральный гингивит
	const handlePresetCatarrhalGingivitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(CATARRHAL_GINGIVITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(CATARRHAL_GINGIVITIS_ASSESSMENTS);
		const protocolText = createCatarrhalGingivitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Катаральный гингивит зафиксирован: отек сосочков, BOP+, наддесневые отложения. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// Пародонтит легкой степени
	const handlePresetMildPeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(MILD_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(MILD_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createMildPeriodontitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Пародонтит легкой степени зафиксирован: карманы 3-4 мм, над/поддесневой камень, BOP+. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// Пародонтит средней степени
	const handlePresetModeratePeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(MODERATE_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(MODERATE_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createModeratePeriodontitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Пародонтит средней степени зафиксирован: карманы 4-5 мм, рецессия 1-2 мм, зубной камень, подвижность I ст. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// Пародонтит тяжёлой степени
	const handlePresetSeverePeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(SEVERE_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(SEVERE_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createSeverePeriodontitisProtocolText(rep);
		applyClinicalProtocol(protocolText, "Пародонтит тяжёлой степени зафиксирован: карманы ≥6 мм, гноетечение, подвижность II-III ст. Данные внесены в медицинскую карту!", "warning");
	}, [readOnly, applyClinicalProtocol]);

	// ─── ПРОТОКОЛЫ 804н + ЧЕСТНОЕ СПИСАНИЕ СО СКЛАДА ─────────────────────────
	// 1-клик Профессиональная гигиена выполнена (A16.07.051)
	const handlePresetProHygieneDone = useCallback(() => {
		if (readOnly) return;
		handlePresetHygieneNorm();
		const protocolText = createClinicalProHygieneProtocolText();
		dispatchServiceEvents(PRO_HYGIENE_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_PRO_HYGIENE_SUMMARY_RU}. Услуга A16.07.051 начислена в смету!`, "success");

		// Автоматическое честное списание расходных материалов со склада с soft overdraft
		void deductHygieneConsumables({ doctorName });
	}, [readOnly, handlePresetHygieneNorm, dispatchServiceEvents, applyClinicalProtocol, doctorName]);

	// Глубокое фторирование эмали (A11.07.012)
	const handlePresetDeepFluoridation = useCallback(() => {
		if (readOnly) return;
		const protocolText = createDeepFluoridationProtocolText();
		dispatchServiceEvents(DEEP_FLUORIDATION_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU}. Внесено в смету и карту визита!`, "success");
	}, [readOnly, dispatchServiceEvents, applyClinicalProtocol]);

	// Реминерализирующая терапия каппой (GC Tooth Mousse, A11.07.010)
	const handlePresetToothMousse = useCallback(() => {
		if (readOnly) return;
		const protocolText = createToothMousseProtocolText();
		dispatchServiceEvents(TOOTH_MOUSSE_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_TOOTH_MOUSSE_SUMMARY_RU}. Внесено в смету и карту визита!`, "success");
	}, [readOnly, dispatchServiceEvents, applyClinicalProtocol]);

	// Медикаментозная обработка карманов (A16.07.053)
	const handlePresetPerioAntiseptic = useCallback(() => {
		if (readOnly) return;
		const protocolText = createPerioAntisepticProtocolText();
		dispatchServiceEvents(PERIO_ANTISEPTIC_SERVICE);
		applyClinicalProtocol(protocolText, `${CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU}. Внесено в смету и карту визита!`, "success");
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

	const mainPanelContent = (
		<div data-testid="hygiene-indices-panel" className="w-full flex flex-col gap-4 p-3.5 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-xs max-w-full overflow-x-clip">
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
						{/* Кнопка нативной мобильной шторки Bottom Sheet (Apple HIG) */}
						<button
							type="button"
							onClick={() => setIsBottomSheetOpen(true)}
							className="md:hidden min-h-[44px] h-9 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-850 dark:text-teal-200 border border-teal-500/35 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation"
							title="Открыть осмотр гигиены в нативной шторке (Apple HIG)"
							data-testid="hygiene-open-bottom-sheet-btn"
						>
							<ClipboardList size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />
							<span>Осмотр гигиены</span>
						</button>

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
							className="h-8 sm:h-9 px-3.5 py-1.5 rounded-lg !bg-teal-600 hover:!bg-teal-700 active:scale-95 !text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer touch-manipulation truncate"
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
					onPresetHygieneNorm={handlePresetHygieneNorm}
					onPresetHygieneFair={handlePresetHygieneFair}
					onPresetHygienePoor={handlePresetHygienePoor}
					onPresetHygieneSevere={handlePresetHygieneSevere}
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

			{/* ─── Сегментированный контрол индексов (Apple HIG: 36px) ────────── */}
			<div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--line)]">
				<div
					role="tablist"
					aria-label="Индексы гигиены полости рта"
					className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-strong)] h-10 max-w-full overflow-x-auto shadow-2xs"
				>
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
								role="tab"
								aria-selected={isActive}
								type="button"
								onClick={() => setActiveTab(tab.id as ActiveHygieneIndexTab)}
								className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer truncate shrink-0 ${
									isActive
										? "!bg-teal-600 !text-white shadow-xs !border-teal-500/50"
										: "text-[var(--ink)] hover:text-teal-700 dark:hover:text-teal-300 hover:bg-[var(--paper)]"
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

			{/* ─── Сравнение динамики OHI-S с прошлым визитом (Мандаты 8e, 8k) ────────── */}
			{comparisonText && (
				<div
					data-testid="ohi-s-dynamics-banner"
					className={`p-2.5 px-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
						report.ohiS.totalScore < (previousScoreNum ?? 0)
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
							: report.ohiS.totalScore > (previousScoreNum ?? 0)
								? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
								: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
					}`}
				>
					<div className="flex items-center gap-2 font-medium min-w-0">
						<span className="font-bold shrink-0">Динамика OHI-S:</span>
						<span className="truncate" data-testid="ohi-s-dynamics-text">{comparisonText}</span>
					</div>
					{previousDate && (
						<span className="text-[11px] opacity-75 shrink-0 hidden sm:inline">
							Предыдущий осмотр: {new Date(previousDate).toLocaleDateString("ru-RU")}
						</span>
					)}
				</div>
			)}

			{/* ─── Телеметрия OHI-S и Silness-Löe (Субкомпонент 1) ─────────── */}
			<OhiSilnessCalculator
				assessments={assessments}
				report={report}
				silnessResult={silnessResult}
				activeTab={activeTab}
				onUpdateToothScore={updateToothScore}
				readOnly={readOnly}
				compactMode={compactMode}
				comparisonText={comparisonText}
			/>

			{/* ─── Вторичные индексы (PMA и КПИ Леуса) и сетка 6 индексных зубов ─── */}
			<PmaKpiSextantsGrid
				assessments={assessments}
				report={report}
				onUpdateToothScore={updateToothScore}
				readOnly={readOnly}
			/>

			{/* ─── Индексы КПУ и кровоточивости десневой борозды (Субкомпонент 2) ─── */}
			<KpuBleedingIndicesCalculator
				onInsertToProtocol={onInsertToProtocol}
				readOnly={readOnly}
			/>

			{/* ─── Персональная карта домашнего ухода (Субкомпонент 4) ──────── */}
			<HygieneHomeCareCard
				patientName={patientName}
				doctorName={doctorName}
				onInsertToProtocol={onInsertToProtocol}
				readOnly={readOnly}
			/>
		</div>
	);

	return (
		<>
			{mainPanelContent}

			{/* Мобильная нативная шторка Bottom Sheet (Apple HIG) */}
			<HygieneBottomSheetDrawer
				isOpen={isBottomSheetOpen}
				onClose={() => setIsBottomSheetOpen(false)}
				title="Индексы гигиены полости рта"
				subtitle="Экспресс-пресеты OHI-S, SBI, 804н и домашний уход"
			>
				{mainPanelContent}
			</HygieneBottomSheetDrawer>
		</>
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
