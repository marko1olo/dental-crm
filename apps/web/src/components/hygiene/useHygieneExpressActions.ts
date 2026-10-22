/**
 * useHygieneExpressActions.ts — Действия экспресс-протоколов гигиены, интеграция с кассой и складом (Мандаты 8e, 8n).
 * (Layer 3 Hook).
 */

import { useCallback, useState } from "react";
import type {
	CombinedHygieneReport,
	ExtendedToothAssessment,
	FedorovVolodkinaResult,
	PhpResult,
	SilnessLoeResult,
	PerioToothRecord,
} from "@dental/shared";
import {
	calculateCombinedHygieneReport,
	deriveHygieneFromPerioTeeth,
} from "@dental/shared";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import {
	CATARRHAL_GINGIVITIS_ASSESSMENTS,
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createCatarrhalGingivitisProtocolText,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createExpressHygieneFairProtocolText,
	createExpressHygienePoorProtocolText,
	createExpressHygieneSevereProtocolText,
	createMildPeriodontitisProtocolText,
	createModeratePeriodontitisProtocolText,
	createPerioAntisepticProtocolText,
	createSeverePeriodontitisProtocolText,
	createToothMousseProtocolText,
	DEEP_FLUORIDATION_SERVICE,
	EXPRESS_HYGIENE_FAIR_ASSESSMENTS,
	EXPRESS_HYGIENE_NORM_ASSESSMENTS,
	EXPRESS_HYGIENE_POOR_ASSESSMENTS,
	EXPRESS_HYGIENE_SEVERE_ASSESSMENTS,
	MILD_PERIODONTITIS_ASSESSMENTS,
	MODERATE_PERIODONTITIS_ASSESSMENTS,
	PERIO_ANTISEPTIC_SERVICE,
	PRO_HYGIENE_SERVICE,
	SEVERE_PERIODONTITIS_ASSESSMENTS,
	TOOTH_MOUSSE_SERVICE,
} from "./hygienePresetsData";
import { printHygieneProtocol } from "./hygienePrintHelper";
import { deductHygieneConsumables } from "./hygieneWarehouseHelper";

export interface UseHygieneExpressActionsParams {
	readonly readOnly: boolean;
	readonly report: CombinedHygieneReport;
	readonly silnessResult: SilnessLoeResult;
	readonly fedorovResult: FedorovVolodkinaResult;
	readonly phpResult: PhpResult;
	readonly assessments: Record<number, ExtendedToothAssessment>;
	readonly setAssessments: React.Dispatch<
		React.SetStateAction<Record<number, ExtendedToothAssessment>>
	>;
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly visitId?: string | undefined;
	readonly doctorName?: string | undefined;
}

export function useHygieneExpressActions({
	readOnly,
	report,
	silnessResult,
	fedorovResult,
	phpResult,
	assessments,
	setAssessments,
	perioTeeth,
	onInsertToProtocol,
	visitId,
	doctorName,
}: UseHygieneExpressActionsParams) {
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	const applyClinicalProtocol = useCallback(
		(
			protocolText: string,
			toastMessage: string,
			toastType: "success" | "warning" = "success",
		) => {
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

			const effectiveVisitId =
				visitId || (useVisitStore.getState() as any).activeVisit?.id;
			if (effectiveVisitId) {
				void fetch(`/api/visits/${effectiveVisitId}/hygiene-indices`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(hygieneIndicesData),
				}).catch(() => {});
			}

			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: protocolText,
						mode: "smart_append",
						hygiene_indices: hygieneIndicesData,
					},
				}),
			);

			window.dispatchEvent(
				new CustomEvent("dente-update-hygiene-indices", {
					detail: hygieneIndicesData,
				}),
			);

			if (typeof window !== "undefined") {
				(window as any).__DENTE_LAST_OHI_S__ = hygieneIndicesData;
			}

			onInsertToProtocol?.(protocolText);
			showToast(toastMessage, toastType, 4000);
		},
		[onInsertToProtocol, report.ohiS, visitId],
	);

	const dispatchServiceEvents = useCallback(
		(service: {
			code: string;
			name: string;
			price: number;
			quantity: number;
			category: string;
		}) => {
			useVisitStore.getState().addCompletedService({
				serviceId: `hygiene_${service.code}`,
				code804n: service.code,
				name: service.name,
				priceRub: service.price,
				priceKopecks: Math.round(service.price * 100),
				quantity: service.quantity,
				category: service.category,
			});

			window.dispatchEvent(
				new CustomEvent("dente-add-estimate-service", { detail: service }),
			);
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: { ...service, service, services: [service] },
				}),
			);
		},
		[],
	);

	const handlePresetHygieneNorm = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_NORM_ASSESSMENTS);
		const protocolText = createClinicalPerioNormProtocolText();
		applyClinicalProtocol(
			protocolText,
			"Идеальная гигиена полости рта (OHI-S = 0.0). Внесено в медицинскую карту!",
			"success",
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetHygieneFair = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_FAIR_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(EXPRESS_HYGIENE_FAIR_ASSESSMENTS);
		const protocolText = createExpressHygieneFairProtocolText(rep);
		applyClinicalProtocol(
			protocolText,
			"Удовлетворительная гигиена (OHI-S = 0.8: мягкий налёт). Внесено в карту!",
			"info" as any,
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetHygienePoor = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_POOR_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(EXPRESS_HYGIENE_POOR_ASSESSMENTS);
		const protocolText = createExpressHygienePoorProtocolText(rep);
		applyClinicalProtocol(
			protocolText,
			"Неудовлетворительная гигиена (OHI-S = 1.8: зубной камень). Внесено в карту!",
			"warning",
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetHygieneSevere = useCallback(() => {
		if (readOnly) return;
		setAssessments(EXPRESS_HYGIENE_SEVERE_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(
			EXPRESS_HYGIENE_SEVERE_ASSESSMENTS,
		);
		const protocolText = createExpressHygieneSevereProtocolText(rep);
		applyClinicalProtocol(
			protocolText,
			"Тяжелая гигиена (OHI-S = 2.6: поддесневой камень, BOP+). Внесено в карту!",
			"warning",
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetPeriodontalNorm = useCallback(() => {
		if (readOnly) return;
		handlePresetHygieneNorm();
	}, [readOnly, handlePresetHygieneNorm]);

	const handlePresetCatarrhalGingivitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(CATARRHAL_GINGIVITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(CATARRHAL_GINGIVITIS_ASSESSMENTS);
		const protocolText = createCatarrhalGingivitisProtocolText(rep);
		applyClinicalProtocol(
			protocolText,
			"Катаральный гингивит зафиксирован: отек сосочков, BOP+, наддесневые отложения. Данные внесены в медицинскую карту!",
			"warning",
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetMildPeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(MILD_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(MILD_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createMildPeriodontitisProtocolText(rep);
		applyClinicalProtocol(
			protocolText,
			"Пародонтит легкой степени зафиксирован: карманы 3-4 мм, над/поддесневой камень, BOP+. Данные внесены в медицинскую карту!",
			"warning",
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetModeratePeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(MODERATE_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(
			MODERATE_PERIODONTITIS_ASSESSMENTS,
		);
		const protocolText = createModeratePeriodontitisProtocolText(rep);
		applyClinicalProtocol(
			protocolText,
			"Пародонтит средней степени зафиксирован: карманы 4-5 мм, рецессия 1-2 мм, зубной камень, подвижность I ст. Данные внесены в медицинскую карту!",
			"warning",
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetSeverePeriodontitis = useCallback(() => {
		if (readOnly) return;
		setAssessments(SEVERE_PERIODONTITIS_ASSESSMENTS);
		const rep = calculateCombinedHygieneReport(SEVERE_PERIODONTITIS_ASSESSMENTS);
		const protocolText = createSeverePeriodontitisProtocolText(rep);
		applyClinicalProtocol(
			protocolText,
			"Пародонтит тяжёлой степени зафиксирован: карманы ≥6 мм, гноетечение, подвижность II-III ст. Данные внесены в медицинскую карту!",
			"warning",
		);
	}, [readOnly, applyClinicalProtocol, setAssessments]);

	const handlePresetProHygieneDone = useCallback(() => {
		if (readOnly) return;
		handlePresetHygieneNorm();
		const protocolText = createClinicalProHygieneProtocolText();
		dispatchServiceEvents(PRO_HYGIENE_SERVICE);
		applyClinicalProtocol(
			protocolText,
			`${CLINICAL_PRO_HYGIENE_SUMMARY_RU}. Услуга A16.07.051 начислена в смету! Реколл через 6 мес сформирован.`,
			"success",
		);
		void deductHygieneConsumables({ doctorName });
		window.dispatchEvent(
			new CustomEvent("dente-hygiene-recall-scheduled", {
				detail: {
					intervalMonths: 6,
					dueDate: new Date(
						Date.now() + 180 * 24 * 60 * 60 * 1000,
					).toISOString(),
					reason: "Плановый контрольный осмотр и гигиена через 6 месяцев",
				},
			}),
		);
	}, [
		readOnly,
		handlePresetHygieneNorm,
		dispatchServiceEvents,
		applyClinicalProtocol,
		doctorName,
	]);

	const handlePresetDeepFluoridation = useCallback(() => {
		if (readOnly) return;
		const protocolText = createDeepFluoridationProtocolText();
		dispatchServiceEvents(DEEP_FLUORIDATION_SERVICE);
		applyClinicalProtocol(
			protocolText,
			`${CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU}. Внесено в смету и карту визита!`,
			"success",
		);
	}, [readOnly, dispatchServiceEvents, applyClinicalProtocol]);

	const handlePresetToothMousse = useCallback(() => {
		if (readOnly) return;
		const protocolText = createToothMousseProtocolText();
		dispatchServiceEvents(TOOTH_MOUSSE_SERVICE);
		applyClinicalProtocol(
			protocolText,
			`${CLINICAL_TOOTH_MOUSSE_SUMMARY_RU}. Внесено в смету и карту визита!`,
			"success",
		);
	}, [readOnly, dispatchServiceEvents, applyClinicalProtocol]);

	const handlePresetPerioAntiseptic = useCallback(() => {
		if (readOnly) return;
		const protocolText = createPerioAntisepticProtocolText();
		dispatchServiceEvents(PERIO_ANTISEPTIC_SERVICE);
		applyClinicalProtocol(
			protocolText,
			`${CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU}. Внесено в смету и карту визита!`,
			"success",
		);
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
		showToast(
			"Индексы синхронизированы с текущей пародонтограммой",
			"info",
			3500,
		);
	}, [readOnly, perioTeeth, setAssessments]);

	const handleInsertTo043 = useCallback(() => {
		const lines = [
			report.summaryText043,
			"• Дополнительные клинические индексы гигиены:",
			`  - ${silnessResult.ratingText}`,
			`  - ${fedorovResult.ratingText}`,
			`  - ${phpResult.ratingText}`,
		];
		const textToInsert = lines.join("\n");
		applyClinicalProtocol(
			textToInsert,
			"Индексы гигиены успешно внесены в дневник приёма",
			"success",
		);
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(textToInsert);
		}
		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2500);
	}, [
		report.summaryText043,
		silnessResult,
		fedorovResult,
		phpResult,
		applyClinicalProtocol,
	]);

	const handlePrintProtocol = useCallback(() => {
		printHygieneProtocol(
			report,
			silnessResult,
			fedorovResult,
			phpResult,
			assessments,
		);
	}, [report, silnessResult, fedorovResult, phpResult, assessments]);

	const handleCopyText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(report.summaryText043);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Протокол индексов гигиены скопирован", "success", 3000);
		}
	}, [report.summaryText043]);

	return {
		copyStatus,
		insertStatus,
		handlePresetHygieneNorm,
		handlePresetHygieneFair,
		handlePresetHygienePoor,
		handlePresetHygieneSevere,
		handlePresetPeriodontalNorm,
		handlePresetCatarrhalGingivitis,
		handlePresetMildPeriodontitis,
		handlePresetModeratePeriodontitis,
		handlePresetSeverePeriodontitis,
		handlePresetProHygieneDone,
		handlePresetDeepFluoridation,
		handlePresetToothMousse,
		handlePresetPerioAntiseptic,
		handleSyncFromPerio,
		handleInsertTo043,
		handlePrintProtocol,
		handleCopyText,
	};
}
