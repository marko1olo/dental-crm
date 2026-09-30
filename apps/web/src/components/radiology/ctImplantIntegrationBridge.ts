/**
 * ctImplantIntegrationBridge.ts — спайка 3D КТ-движка с ЭМК 043/у, планом лечения,
 * зубной формулой (одонтограммой) и расписанием приёмов DENTE CRM.
 *
 * Мандаты DENTE CRM:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: Doctor Autonomy (независимость хирурга, точность калиперов).
 * - Кодировка: строго UTF-8 без BOM.
 */

import type { TreatmentPlanItem } from "../treatment-plans/types";
import type {
	ImplantBrandKey,
	VirtualImplantSpec,
	CrossSectionImplantPose,
	MandibularCanalCrossSection,
	NerveSafetyAuditResult,
	AlveolarRidgeEnvelope,
} from "./implantSafetyEngine";
import { generateForm043CbctDiary, auditAlveolarBoneContainment } from "./implantSafetyEngine";
import type { AlveolarRidgeCaliperMeasurement } from "./cbctCaliperNerveMath";
import type { HUZoneSampling, MischClassificationResult } from "./boneDensityMischMath";
import type { RadiologyStudy } from "./types";
import { buildCbctReportData, openCbctReportPrintWindow } from "./cbctExportEngine";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { useDocumentStore } from "../../store/documentStore";

export interface CtImplantBridgeParams {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly toothFdi: number;
	readonly implantSpec: VirtualImplantSpec;
	readonly angulationDeg: number;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly mischClass?: string | null | undefined;
	readonly meanHU: number | null;
	readonly nerveClearanceMm: number | null;
	readonly recommendedTorqueNcm: string;
	readonly drillingProtocol: string;
	readonly isNerveWarning?: boolean | undefined;
	readonly isNerveDanger?: boolean | undefined;
	readonly customPriceRub?: number | undefined;
}

export interface ImplantDiarySoapPayload {
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTooth: string;
}

export interface QuickScheduleDraftPayload {
	readonly toothNumber: number;
	readonly title: string;
	readonly procedureName: string;
	readonly durationMinutes: number;
	readonly stageKind: "stage_2_surgery";
	readonly notes: string;
}

const BRAND_LABELS: Record<ImplantBrandKey, string> = {
	straumann: "Straumann (Швейцария)",
	nobel_biocare: "Nobel Biocare (Швеция/США)",
	osstem: "Osstem TS III (Южная Корея)",
	dentium: "Dentium SuperLine (Южная Корея)",
	mis: "MIS V3/Seven (Израиль)",
};

const DEFAULT_IMPLANT_PRICES_RUB: Record<ImplantBrandKey, number> = {
	straumann: 48000,
	nobel_biocare: 45000,
	osstem: 24000,
	dentium: 26000,
	mis: 22000,
};

const STORAGE_PREFIX = "dente_custom_plan_items_";

export function getImplantBrandTitle(brand: ImplantBrandKey): string {
	return BRAND_LABELS[brand] || brand.toUpperCase();
}

/**
 * 1. Формирует официальную позицию сметы / плана лечения по Номенклатуре МЗ РФ 804н.
 * Код A16.07.054: Внутрикостная дентальная имплантация
 */
export function buildImplantTreatmentPlanItem(params: CtImplantBridgeParams): TreatmentPlanItem {
	const brandTitle = getImplantBrandTitle(params.implantSpec.brand);
	const priceRub = params.customPriceRub ?? DEFAULT_IMPLANT_PRICES_RUB[params.implantSpec.brand] ?? 25000;
	const diameterStr = params.implantSpec.diameterMm.toFixed(1);
	const lengthStr = params.implantSpec.lengthMm.toFixed(1);

	const nerveStatus =
		params.nerveClearanceMm !== null
			? `Дистанция до канала: ${params.nerveClearanceMm.toFixed(1)} мм`
			: "Канал не размечен";

	const ridgeHStr = typeof params.ridgeHeightMm === "number" ? `H=${params.ridgeHeightMm.toFixed(1)} мм` : "H: не измерялась (—)";
	const ridgeWStr = typeof params.ridgeWidthMm === "number" ? `W=${params.ridgeWidthMm.toFixed(1)} мм` : "W: не измерялась (—)";

	const clinicalRationale =
		`КЛКТ-замеры (FDI #${params.toothFdi}): гребень ${ridgeHStr}, ` +
		`${ridgeWStr}. Плотность кости: ${params.mischClass ?? "не измерялась"} ` +
		`(${params.meanHU !== null ? `${params.meanHU} HU` : "D3"}). ${nerveStatus}. ` +
		`Торк фиксации: ${params.recommendedTorqueNcm}.`;

	return {
		id: `plan-implant-${params.toothFdi}-${Date.now()}`,
		toothNumber: params.toothFdi,
		code804n: "A16.07.054",
		name: `Внутрикостная дентальная имплантация: ${brandTitle} (Ø${diameterStr} × ${lengthStr} мм)`,
		category: "Хирургия",
		priceRub,
		unitPriceRub: priceRub,
		discountRub: 0,
		quantity: 1,
		phase: 2,
		stageKind: "stage_2_surgery",
		isAuto: false,
		materials: `Имплантат ${brandTitle} Ø${diameterStr} × ${lengthStr} мм`,
		clinicalRationale,
	};
}

/**
 * 2. Формирует клинический протокол планирования и операции для ЭМК Формы 043/у (SOAP).
 */
export function buildImplantDiarySoapEntry(params: CtImplantBridgeParams): ImplantDiarySoapPayload {
	const brandTitle = getImplantBrandTitle(params.implantSpec.brand);
	const diameterStr = params.implantSpec.diameterMm.toFixed(1);
	const lengthStr = params.implantSpec.lengthMm.toFixed(1);
	const tiltStr = params.angulationDeg !== 0 ? `${params.angulationDeg > 0 ? "+" : ""}${params.angulationDeg}°` : "0.0°";

	const hasH = typeof params.ridgeHeightMm === "number";
	const hasW = typeof params.ridgeWidthMm === "number";
	const ridgeLocalis =
		hasH && hasW
			? `высота альвеолярного гребня ${params.ridgeHeightMm!.toFixed(1)} мм, ширина ${params.ridgeWidthMm!.toFixed(1)} мм`
			: hasH
				? `высота альвеолярного гребня ${params.ridgeHeightMm!.toFixed(1)} мм, ширина не измерялась (—)`
				: hasW
					? `высота альвеолярного гребня не измерялась (—), ширина ${params.ridgeWidthMm!.toFixed(1)} мм`
					: "замеры альвеолярного гребня штангенциркулем не проводились (—)";

	const nerveLocalis =
		params.nerveClearanceMm !== null
			? `Расстояние от апекса до нижнечелюстного канала / дна верхнечелюстного синуса: ${params.nerveClearanceMm.toFixed(1)} мм.`
			: "дистанция до нижнечелюстного канала не измерялась (—) (Канал не размечен).";

	const statusLocalis =
		`КЛКТ-диагностика области отсутствующего зуба #${params.toothFdi}: ` +
		`${ridgeLocalis}. Тип архитектоники костной ткани по Misch: ` +
		`${params.mischClass ?? "не измерялась"} (${params.meanHU !== null ? `${params.meanHU} HU` : "не измерялась"}). ` +
		nerveLocalis;

	const treatmentDescription =
		`Протокол 3D КЛКТ-планирования дентальной имплантации (зуб #${params.toothFdi}):\n` +
		`1. Выбрана имплантационная система: ${brandTitle}.\n` +
		`2. Геометрические параметры имплантата: диаметр Ø${diameterStr} мм, длина L=${lengthStr} мм, наклон оси ${tiltStr}.\n` +
		`3. Остеотомия ложа: ${params.drillingProtocol}.\n` +
		`4. Ожидаемый торк первичной стабильности: ${params.recommendedTorqueNcm}.\n` +
		`5. Рекомендована установка формирователя десны / винта-заглушки с последующей интеграцией 3-4 мес.`;

	return {
		statusLocalis,
		treatmentDescription,
		diagnosisIcd10: "K08.1",
		diagnosisTooth: String(params.toothFdi),
	};
}

/**
 * 3. Локальное хранилище кастомных позиций плана для синхронизации без перезагрузки.
 */
export function loadPersistedCustomPlanItems(patientId: string): TreatmentPlanItem[] {
	if (typeof window === "undefined" || !window.localStorage || !patientId) return [];
	try {
		const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${patientId}`);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function savePersistedCustomPlanItem(patientId: string, item: TreatmentPlanItem): void {
	if (typeof window === "undefined" || !window.localStorage || !patientId) return;
	try {
		const existing = loadPersistedCustomPlanItems(patientId);
		const filtered = existing.filter((it) => it.id !== item.id);
		filtered.push(item);
		window.localStorage.setItem(`${STORAGE_PREFIX}${patientId}`, JSON.stringify(filtered));
	} catch {
		// ignore
	}
}

/**
 * 4. Экспорт имплантата в план лечения (1-клик):
 * - Генерирует TreatmentPlanItem
 * - Диспатчит событие 'dente-add-treatment-plan-item'
 * - Сохраняет в локальном кеше пациента
 * - Размечает зуб в одонтограмме ('Planned_Implant')
 */
export function exportImplantToTreatmentPlan(params: CtImplantBridgeParams): TreatmentPlanItem {
	const item = buildImplantTreatmentPlanItem(params);

	if (params.patientId) {
		savePersistedCustomPlanItem(params.patientId, item);
	}

	// Обновление состояния зуба в одонтограмме
	updateOdontogramToothToPlannedImplant(params.toothFdi);

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-treatment-plan-item", {
					detail: {
						item,
						toothNumber: params.toothFdi,
						patientId: params.patientId,
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	showToast(
		`Имплантат ${getImplantBrandTitle(params.implantSpec.brand)} Ø${params.implantSpec.diameterMm}x${params.implantSpec.lengthMm} (зуб #${params.toothFdi}) добавлен в план лечения!`,
		"success",
		4500,
	);

	return item;
}

/**
 * 5. Экспорт замеров и протокола КТ в дневник визита / ЭМК 043/у (1-клик):
 * - Генерирует SOAP протокол
 * - Диспатчит 'dente-apply-soap-protocol' с immediate: true
 * - Обновляет объективный статус в useVisitStore
 * - Вызывает опциональный callback
 */
export function exportImplantToDiary043(
	params: CtImplantBridgeParams,
	onApplyCallback?: ((diaryText: string) => void) | undefined,
): ImplantDiarySoapPayload {
	const soap = buildImplantDiarySoapEntry(params);
	const fullProtocolText = `${soap.statusLocalis}\n\n${soap.treatmentDescription}`;

	// 1. Прямое обновление стора визита
	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (typeof setVisitNoteForm === "function") {
			setVisitNoteForm((prev) => {
				const prevObj = prev.objectiveStatus || "";
				return {
					...prev,
					objectiveStatus: prevObj ? `${prevObj}\n\n${fullProtocolText}` : fullProtocolText,
					diagnosis: prev.diagnosis || `K08.1 Частичная потеря зубов (зуб #${params.toothFdi})`,
					diagnosisTooth: String(params.toothFdi),
				};
			});
		}
	} catch {
		// ignore
	}

	// 2. Диспатч глобального SOAP события для useVisitDiaryLogic
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							statusLocalis: soap.statusLocalis,
							treatmentDescription: soap.treatmentDescription,
							diagnosisIcd10: soap.diagnosisIcd10,
							diagnosisTooth: soap.diagnosisTooth,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	// 3. Callback для внешнего слушателя модалки
	if (onApplyCallback) {
		onApplyCallback(fullProtocolText);
	}

	showToast(
		`КТ-протокол имплантации (зуб #${params.toothFdi}) занесен в дневник 043/у!`,
		"success",
		4000,
	);

	return soap;
}

/**
 * 6. Обновление зубной формулы (одонтограммы):
 * Ставит статус "Planned_Implant" на выбранный зуб.
 */
export function updateOdontogramToothToPlannedImplant(toothFdi: number): void {
	if (!toothFdi) return;

	try {
		const setToothState = useVisitStore.getState().setToothState;
		if (typeof setToothState === "function") {
			setToothState(String(toothFdi), "planned");
		}
	} catch {
		// ignore
	}

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-update-tooth-state", {
					detail: {
						toothNumber: toothFdi,
						state: "Planned_Implant",
					},
				}),
			);
		} catch {
			// ignore
		}
	}
}

/**
 * 7. Экспорт в расписание (1-клик):
 * Создает быстрый черновик записи на операцию имплантации.
 */
export function exportImplantToScheduleDraft(params: CtImplantBridgeParams): QuickScheduleDraftPayload {
	const brandTitle = getImplantBrandTitle(params.implantSpec.brand);
	const hasH = typeof params.ridgeHeightMm === "number";
	const hasW = typeof params.ridgeWidthMm === "number";
	const ridgeDraftStr =
		hasH && hasW
			? `гребень H=${params.ridgeHeightMm!.toFixed(1)} мм, W=${params.ridgeWidthMm!.toFixed(1)} мм`
			: hasH
				? `гребень H=${params.ridgeHeightMm!.toFixed(1)} мм, W: — (не измерялась)`
				: hasW
					? `гребень H: — (не измерялась), W=${params.ridgeWidthMm!.toFixed(1)} мм`
					: "гребень: — (не измерялся)";

	const draft: QuickScheduleDraftPayload = {
		toothNumber: params.toothFdi,
		title: `Имплантация #${params.toothFdi} (${brandTitle})`,
		procedureName: `Внутрикостная дентальная имплантация ${brandTitle}`,
		durationMinutes: 60,
		stageKind: "stage_2_surgery",
		notes: `КЛКТ запланировано: ${ridgeDraftStr}, плотность ${params.mischClass}.`,
	};

	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(draft));
			window.dispatchEvent(
				new CustomEvent("dente-quick-appointment-draft", {
					detail: draft,
				}),
			);
		} catch {
			// ignore
		}
	}

	showToast(
		`Черновик операции (зуб #${params.toothFdi}, 60 мин) отправлен в расписание!`,
		"success",
		4000,
	);

	return draft;
}

export interface ExportPdfReportParams {
	readonly targetTooth: number;
	readonly currentImplantPose: CrossSectionImplantPose;
	readonly currentCanal: MandibularCanalCrossSection;
	readonly huSamplingResult: HUZoneSampling;
	readonly patientDisplayName: string;
	readonly study?: RadiologyStudy | null | undefined;
	readonly mischClassification: MischClassificationResult;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly envelope?: AlveolarRidgeEnvelope | null | undefined;
}

/**
 * 8. Экспорт протокола КЛКТ-планирования в печатный вид / PDF (A4)
 */
export function exportPdfImplantReport(params: ExportPdfReportParams): void {
	let derivedEnvelope: AlveolarRidgeEnvelope | undefined = params.envelope ?? undefined;
	let effectiveRidgeHeightMm: number | null =
		typeof params.ridgeHeightMm === "number" ? params.ridgeHeightMm : null;
	let effectiveRidgeWidthMm: number | null =
		typeof params.ridgeWidthMm === "number" ? params.ridgeWidthMm : null;

	if (params.activeCaliper) {
		const cal = params.activeCaliper;
		effectiveRidgeHeightMm = cal.heightMm;
		effectiveRidgeWidthMm = cal.crestWidthMm;
		derivedEnvelope = {
			crestPoint: cal.crestPoint,
			basePoint: cal.basePoint,
			buccalCrestPoint: cal.crestWidthLeft ?? { x: cal.crestPoint.x - cal.crestWidthMm / 2, y: cal.crestPoint.y },
			lingualCrestPoint: cal.crestWidthRight ?? { x: cal.crestPoint.x + cal.crestWidthMm / 2, y: cal.crestPoint.y },
			ridgeWidthMm: cal.crestWidthMm,
			ridgeHeightMm: cal.heightMm,
		};
	} else if (!derivedEnvelope && effectiveRidgeHeightMm !== null && effectiveRidgeWidthMm !== null) {
		derivedEnvelope = {
			crestPoint: { x: 0, y: 0 },
			basePoint: { x: 0, y: effectiveRidgeHeightMm },
			buccalCrestPoint: { x: -effectiveRidgeWidthMm / 2, y: 0 },
			lingualCrestPoint: { x: effectiveRidgeWidthMm / 2, y: 0 },
			ridgeWidthMm: effectiveRidgeWidthMm,
			ridgeHeightMm: effectiveRidgeHeightMm,
		};
	}

	const containment = derivedEnvelope
		? auditAlveolarBoneContainment(params.currentImplantPose, derivedEnvelope)
		: undefined;

	const diaryText = generateForm043CbctDiary({
		toothFdi: params.targetTooth,
		implantPose: params.currentImplantPose,
		canal: params.currentCanal,
		envelope: derivedEnvelope ?? null,
		huSampling: params.huSamplingResult,
		patientName: params.patientDisplayName,
		clinicName: "Стоматологический центр DENTE",
	});

	const reportData = buildCbctReportData({
		patientName: params.patientDisplayName,
		clinicName: "Стоматологический центр DENTE",
		doctorName: params.study?.doctorName ? `Врач: ${params.study.doctorName}` : "Лечащий врач-стоматолог",
		studyDate: params.study?.studyDate || new Date().toLocaleDateString("ru-RU"),
		targetToothFdi: params.targetTooth,
		implantPose: params.currentImplantPose,
		mischResult: params.mischClassification,
		huSampling: params.huSamplingResult,
		ridgeHeightMm: effectiveRidgeHeightMm,
		ridgeWidthMm: effectiveRidgeWidthMm,
		containment,
		nerveSafety: params.nerveAuditResult,
		diary043Text: diaryText,
		tonerSaving: true,
	});

	openCbctReportPrintWindow(reportData, { tonerSaving: true });
	showToast(
		`Протокол КЛКТ-планирования для зуба FDI #${params.targetTooth} сформирован для печати / PDF (A4)`,
		"success",
	);
}

export interface AddCbctToFinanceParams {
	readonly patientId?: string | undefined;
	readonly toothFdi?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly doctorName?: string | undefined;
}

/**
 * Statutory Order 804n medical service definition for CBCT diagnostics:
 * A06.07.012: Компьютерная томография челюстно-лицевой области (КЛКТ)
 */
export const STATUTORY_CBCT_804N = {
	code804n: "A06.07.012",
	statutoryTitle804n: "Компьютерная томография челюстно-лицевой области",
	commercialTitle: "3D Компьютерная томография (КЛКТ) челюстно-лицевой области (обе челюсти)",
	category: "radiology",
	basePriceRub: 3800,
	basePriceKopecks: 380000,
	stageKind: "stage_1_therapy" as const,
	vatRate: 0 as const,
	vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
};

/**
 * 9. Добавление услуги КЛКТ (A06.07.012) в финансовый акт визита (1-клик):
 * - Обновляет строку выполненных услуг в дневнике приёма (treatmentPlan в useVisitStore)
 * - Добавляет строку в акт выполненных работ (completedActServicesSummary) и пересчитывает сумму (completedActTotalRub в useDocumentStore)
 * - Диспатчит глобальное событие 'dente-add-services-to-invoice' для моментальной оплаты у кресла
 */
export function addCbctServiceToVisitFinanceAct(params: AddCbctToFinanceParams = {}): {
	code: string;
	title: string;
	priceRub: number;
} {
	const priceRub = params.priceRub ?? STATUTORY_CBCT_804N.basePriceRub;
	const toothCode = params.toothFdi ? String(params.toothFdi) : undefined;
	const toothSuffix = toothCode ? ` (область зуба #${toothCode})` : "";
	const serviceRecord = {
		code: STATUTORY_CBCT_804N.code804n,
		title: `${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix}`,
		priceRub,
	};

	// 1. Дневник приёма useVisitStore (Форма 043/у)
	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (typeof setVisitNoteForm === "function") {
			setVisitNoteForm((prev) => {
				const line = `[${STATUTORY_CBCT_804N.code804n}] ${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix} — ${priceRub.toLocaleString("ru-RU")} ₽`;
				const prevPlan = (prev.treatmentPlan || "").trim();
				return {
					...prev,
					treatmentPlan: prevPlan ? `${prevPlan}\n${line}` : line,
				};
			});
		}
	} catch {
		// ignore
	}

	// 2. Акт выполненных работ useDocumentStore
	try {
		const docState = useDocumentStore.getState();
		if (docState && typeof docState.setCompletedActServicesSummary === "function") {
			const actLine = `${STATUTORY_CBCT_804N.code804n} ${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix} — ${priceRub.toLocaleString("ru-RU")} ₽`;
			const prevSummary = (docState.completedActServicesSummary || "").trim();
			docState.setCompletedActServicesSummary(prevSummary ? `${prevSummary}\n${actLine}` : actLine);

			const currentTotal = Number.parseFloat((docState.completedActTotalRub || "0").replace(/[^\d.-]/g, "")) || 0;
			docState.setCompletedActTotalRub(String(currentTotal + priceRub));
		}
	} catch {
		// ignore
	}

	// 3. CustomEvent 'dente-add-services-to-invoice'
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: params.toothFdi,
						toothCode,
						services: [
							{
								code: STATUTORY_CBCT_804N.code804n,
								title: `${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix}`,
								price: priceRub,
								priceRub,
								quantity: 1,
								toothCode,
								category: "radiology",
							},
						],
						source: "cbct_studio",
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	return serviceRecord;
}

/**
 * 10. Добавление услуги КЛКТ (A06.07.012) в смету плана лечения (1-клик):
 * - Генерирует TreatmentPlanItem этапа диагностики (Этап 1)
 * - Сохраняет в локальном кеше плана лечения пациента
 * - Добавляет позицию в текстовые этапы плана лечения (treatmentPlanStages) и пересчитывает смету (treatmentPlanEstimatedTotalRub)
 * - Диспатчит глобальное событие 'dente-add-treatment-plan-item'
 */
export function addCbctServiceToTreatmentPlan(params: AddCbctToFinanceParams = {}): TreatmentPlanItem {
	const priceRub = params.priceRub ?? STATUTORY_CBCT_804N.basePriceRub;
	const toothCode = params.toothFdi ? String(params.toothFdi) : undefined;
	const toothSuffix = toothCode ? ` (область зуба #${toothCode})` : "";

	const planItem: TreatmentPlanItem = {
		id: `plan-cbct-${Date.now()}`,
		toothNumber: params.toothFdi,
		code804n: STATUTORY_CBCT_804N.code804n,
		name: `${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix}`,
		category: "Диагностика",
		priceRub,
		unitPriceRub: priceRub,
		discountRub: 0,
		quantity: 1,
		phase: 1,
		stageKind: "stage_1_therapy",
		isAuto: false,
		materials: "Конусно-лучевой компьютерный томограф (КЛКТ)",
		clinicalRationale: "3D-томография челюстно-лицевой области для оценки плотности кости, топографии нижнечелюстного канала / верхнечелюстного синуса и анатомических ориентиров перед имплантацией/вмешательством",
	};

	if (params.patientId) {
		savePersistedCustomPlanItem(params.patientId, planItem);
	}

	// 1. Обновление текстовых этапов плана лечения useDocumentStore
	try {
		const docState = useDocumentStore.getState();
		if (docState && typeof docState.setTreatmentPlanStages === "function") {
			const currentStages = docState.treatmentPlanStages || "";
			const stageLine = `Диагностика и КЛКТ | ${STATUTORY_CBCT_804N.code804n} ${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix} | 1-й день | 3D-планирование и анатомическая безопасность | ${priceRub}`;

			if (currentStages.includes("Диагностика")) {
				const updatedStages = currentStages.replace(/(Диагностика[^\n|]*\|)([^|]+)(\|[^\n]*)/, (_match, p1, p2, p3) => {
					const cleanP2 = p2.trim();
					return cleanP2.includes(STATUTORY_CBCT_804N.code804n)
						? `${p1} ${cleanP2} ${p3}`
						: `${p1} ${cleanP2}, ${STATUTORY_CBCT_804N.code804n} КЛКТ 3D (${priceRub} ₽) ${p3}`;
				});
				docState.setTreatmentPlanStages(updatedStages);
			} else {
				docState.setTreatmentPlanStages(currentStages ? `${currentStages}\n${stageLine}` : stageLine);
			}

			const currentTotal = Number.parseFloat((docState.treatmentPlanEstimatedTotalRub || "0").replace(/[^\d.-]/g, "")) || 0;
			docState.setTreatmentPlanEstimatedTotalRub(String(currentTotal + priceRub));
		}
	} catch {
		// ignore
	}

	// 2. CustomEvent 'dente-add-treatment-plan-item'
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-treatment-plan-item", {
					detail: {
						item: planItem,
						toothNumber: params.toothFdi,
						patientId: params.patientId,
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	return planItem;
}

/**
 * 11. Комбинированное добавление услуги КЛКТ (A06.07.012) в 1 клик
 * одновременно в финансовый акт визита И в смету плана лечения (Мандаты 8e, 8n).
 */
export function addCbctToFinanceAndPlan(params: AddCbctToFinanceParams = {}): {
	actService: { code: string; title: string; priceRub: number };
	planItem: TreatmentPlanItem;
} {
	const actService = addCbctServiceToVisitFinanceAct(params);
	const planItem = addCbctServiceToTreatmentPlan(params);

	showToast(
		`Услуга КЛКТ [${STATUTORY_CBCT_804N.code804n}] (${actService.priceRub.toLocaleString("ru-RU")} ₽) добавлена в финансовый акт и смету плана лечения!`,
		"success",
		4500,
	);

	return { actService, planItem };
}

