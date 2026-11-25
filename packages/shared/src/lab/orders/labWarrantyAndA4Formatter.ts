import { z } from "zod";
import { kopecksToRubles } from "../../money.js";
import { generateSecureAlphanumericId } from "../../utils/idGenerators.js";
import { calculateExpectedDeliveryDate } from "./labOrderSlaStateMachine.js";
import {
	LAB_IMPRESSION_LABELS_RU,
	LAB_ORDER_STATUS_LABELS_RU,
	LAB_WORK_TYPE_LABELS_RU,
} from "./labOrderLabelsAndShades.js";
import {
	labWorkTypeSchema,
	type ImpressionType,
	type LabOrder,
	type LabOrderRecord,
	type LabWorkType,
	type ProstheticMaterial,
} from "./labOrderSchemasAndEnums.js";

// ─── STATUTORY FORM ZTL-1 METADATA (STaR / GOST R 51087-97) ─────────────────

export const FORM_ZTL_1_METADATA = {
	code: "Форма № ЗТЛ-1",
	titleRu: "Форма № ЗТЛ-1: Наряд-заказ в зуботехническую лабораторию (СтАР / ГОСТ)",
	blankHeaderRu: "Наряд-заказ в зуботехническую лабораторию (Форма № ЗТЛ-1)",
	subtitleRu: "Официальное клиническое задание на изготовление зубных протезов (ГОСТ Р 51087-97 / Стандарты СтАР)",
	clinicalDecisionRu: "Клинический регламент: Срок плана лечения актуален и подтвержден лечащим врачом.",
	treatmentPlanTermsNoticeRu: "Клинический регламент: Срок плана лечения актуален и подтвержден лечащим врачом.",
	sanpinClauseRu: "СанПиН 3.3686-21: Дезинфекция оттисков, прикусных валиков и протезов проведена перед отправкой.",
	warrantyGostRu: "2 года гарантии (ГОСТ Р 51087-97 / ГОСТ 31576-2012 / Рекомендации СтАР)",
} as const;

export const STATUTORY_LAB_ORDER_METADATA = FORM_ZTL_1_METADATA;

// ─── DYNAMIC WARRANTY TERMS CALCULATION (MANDATE 8X, 8E & GOST) ──────────────

export interface WarrantyTermsResult {
	warrantyMonths: number;
	serviceLifeMonths: number;
	warrantyYears: number;
}

/**
 * Расчет гарантийного срока и срока службы ортопедической конструкции по типу материала и реставрации.
 * - All-on-4 / балочные конструкции на имплантатах: 120 мес (10 лет), срок службы 180 мес.
 * - Диоксид циркония (ZrO2): 60 мес (5 лет), срок службы 120 мес.
 * - E.max / прессованная стеклокерамика / виниры / вкладки: 36 мес (3 года), срок службы 84 мес.
 * - Металлокерамика Co-Cr / КХС: 24 мес (2 года), срок службы 60 мес.
 * - Съемные бюгельные и пластиночные протезы: 24 мес (2 года), срок службы 60 мес.
 * - PMMA / провизорные / временные: 6 мес, срок службы 12 мес.
 * - По умолчанию (ГОСТ Р 51087-97 / СтАР): 24 мес (2 года), срок службы 60 мес.
 */
export function calculateWarrantyTerms(
	material?: string | null | undefined,
	restorationType?: string | null | undefined,
): WarrantyTermsResult {
	const mat = (material ?? "").toLowerCase();
	const rest = (restorationType ?? "").toLowerCase();

	// 1. All-on-4 / All-on-6 / балочные конструкции
	if (
		rest.includes("all_on") ||
		rest.includes("all-on") ||
		rest.includes("балочн") ||
		rest.includes("beam") ||
		mat.includes("all-on") ||
		(mat.includes("титан") && rest.includes("имплант"))
	) {
		return { warrantyMonths: 120, serviceLifeMonths: 180, warrantyYears: 10 };
	}

	// 2. Временные / PMMA / провизорные коронки
	if (
		mat.includes("pmma") ||
		mat.includes("временн") ||
		mat.includes("провизорн") ||
		mat.includes("temporary") ||
		rest.includes("pmma") ||
		rest.includes("временн") ||
		rest.includes("temporary")
	) {
		return { warrantyMonths: 6, serviceLifeMonths: 12, warrantyYears: 1 };
	}

	// 3. Диоксид циркония (ZrO2, Prettau, Multi-layer)
	if (
		mat.includes("zirconia") ||
		mat.includes("циркони") ||
		mat.includes("zro2") ||
		mat.includes("prettau")
	) {
		return { warrantyMonths: 60, serviceLifeMonths: 120, warrantyYears: 5 };
	}

	// 4. E.max / дисиликат лития / стеклокерамика / виниры / накладки / вкладки
	if (
		mat.includes("emax") ||
		mat.includes("e.max") ||
		mat.includes("дисиликат") ||
		mat.includes("стеклокерамик") ||
		mat.includes("полевошпат") ||
		rest.includes("veneer") ||
		rest.includes("винир") ||
		rest.includes("inlay") ||
		rest.includes("onlay") ||
		rest.includes("вкладк")
	) {
		return { warrantyMonths: 36, serviceLifeMonths: 84, warrantyYears: 3 };
	}

	// 5. Металлокерамика Co-Cr / КХС / PFM
	if (
		mat.includes("pfm") ||
		mat.includes("металлокерамик") ||
		mat.includes("cocr") ||
		mat.includes("кхс") ||
		mat.includes("noritake")
	) {
		return { warrantyMonths: 24, serviceLifeMonths: 60, warrantyYears: 2 };
	}

	// 6. Съемные протезы (бюгельные, акриловые, нейлоновые)
	if (
		rest.includes("denture") ||
		rest.includes("протез") ||
		rest.includes("бюгел") ||
		rest.includes("clasp")
	) {
		return { warrantyMonths: 24, serviceLifeMonths: 60, warrantyYears: 2 };
	}

	// Базовый гарантийный срок
	return { warrantyMonths: 24, serviceLifeMonths: 60, warrantyYears: 2 };
}

// ─── PROSTHETIC WARRANTY PASSPORT & STAR PRINT BLANK ─────────────────────────

export const prostheticWarrantyPassportSchema = z.object({
	orderNumber: z.string().min(1),
	batchCode: z.string().min(1),
	patientFullName: z.string().min(1),
	clinicName: z.string().min(1),
	doctorFullName: z.string().min(1),
	technicianLabName: z.string().min(1),
	toothFdi: z.string().min(1),
	restorationType: z.string().min(1),
	frameworkMaterial: z.string().min(1),
	shade: z.string().min(1),
	shadeStump: z.string().optional().nullable(),
	cementationProtocol: z.string().min(1),
	warrantyYears: z.number().int().min(1).max(10).default(2),
	warrantyMonths: z.number().int().min(1).max(120).optional(),
	fixationDate: z.string(), // YYYY-MM-DD
	expirationDate: z.string(), // YYYY-MM-DD
	gostStandard: z.string().default("ГОСТ Р 51087-97 / Стандарты СтАР"),
	sanpinDisinfectionMark: z.string().default("СанПиН 3.3686-21: Дезинфекция оттисков и протезов выполнена"),
	isDraft: z.boolean().optional(),
	draftNotice: z.string().optional(),
	certificateNumber: z.string().optional(),
	integritySha256: z.string().optional(),
});
export type ProstheticWarrantyPassport = z.infer<typeof prostheticWarrantyPassportSchema>;

export function generateProstheticWarrantyPassport(params: {
	orderNumber: string;
	batchCode?: string | undefined;
	patientFullName: string;
	clinicName?: string | undefined;
	doctorFullName: string;
	technicianLabName?: string | undefined;
	toothFdi: string;
	restorationType: string;
	frameworkMaterial: string;
	shade: string;
	shadeStump?: string | null | undefined;
	cementationProtocol?: string | undefined;
	warrantyYears?: number | undefined;
	warrantyMonths?: number | undefined;
	fixationDate?: string | undefined;
	isDraft?: boolean | undefined;
	draftNotice?: string | undefined;
	certificateNumber?: string | undefined;
	integritySha256?: string | undefined;
}): ProstheticWarrantyPassport {
	const fixation = params.fixationDate ? new Date(params.fixationDate) : new Date();
	const derivedTerms = calculateWarrantyTerms(params.frameworkMaterial, params.restorationType);
	const months = params.warrantyMonths ?? (params.warrantyYears !== undefined ? params.warrantyYears * 12 : derivedTerms.warrantyMonths);
	const years = params.warrantyYears ?? derivedTerms.warrantyYears;
	const expiration = new Date(fixation.getTime());
	expiration.setMonth(expiration.getMonth() + months);

	const batchCode =
		params.batchCode ||
		`LOT-${fixation.getFullYear()}-${generateSecureAlphanumericId(6, false).toUpperCase()}`;

	return {
		orderNumber: params.orderNumber,
		batchCode,
		patientFullName: params.patientFullName,
		clinicName: params.clinicName || "Стоматологическая клиника",
		doctorFullName: params.doctorFullName,
		technicianLabName: params.technicianLabName || "Цифровая зуботехническая лаборатория CAD/CAM",
		toothFdi: params.toothFdi,
		restorationType: params.restorationType,
		frameworkMaterial: params.frameworkMaterial,
		shade: params.shade,
		shadeStump: params.shadeStump ?? null,
		cementationProtocol: params.cementationProtocol || "Адгезивный протокол двойного отверждения (композитный цемент)",
		warrantyYears: years,
		...(months !== undefined ? { warrantyMonths: months } : {}),
		fixationDate: fixation.toISOString().slice(0, 10),
		expirationDate: expiration.toISOString().slice(0, 10),
		gostStandard: "ГОСТ Р 51087-97 / ГОСТ 31576-2012 / Клинические рекомендации СтАР",
		sanpinDisinfectionMark: "СанПиН 3.3686-21: Оттиски, прикусные блоки и конструкции дезинфицированы",
		...(params.isDraft !== undefined ? { isDraft: params.isDraft } : {}),
		...(params.draftNotice ? { draftNotice: params.draftNotice } : {}),
		...(params.certificateNumber !== undefined ? { certificateNumber: params.certificateNumber } : {}),
		...(params.integritySha256 !== undefined ? { integritySha256: params.integritySha256 } : {}),
	};
}

export function formatLabOrderPrescriptionA4(
	order: LabOrderRecord,
	clinicName: string,
	doctorName: string,
): string {
	const workLabel = LAB_WORK_TYPE_LABELS_RU[order.workType] || order.workType;
	const statusLabel = LAB_ORDER_STATUS_LABELS_RU[order.status] || order.status;
	const impressionLabel = order.impressionType
		? LAB_IMPRESSION_LABELS_RU[order.impressionType]
		: "Не указан / По согласованию";
	const shadeLabel = order.shade ? `VITA ${order.shade}` : "Не указан / Индивидуально";
	const priceFormatted =
		typeof order.priceRub === "number" && order.priceRub >= 0
			? `${order.priceRub.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} руб.`
			: "По прейскуранту ЗТЛ";

	const orderNum = order.id ? `ЗТЛ-${order.id.slice(0, 8).toUpperCase()}` : "Б/Н";

	return [
		"================================================================================",
		"            НАРЯД-ЗАКАЗ В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ           ",
		"             (Официальное клиническое задание на изготовление протеза)           ",
		"================================================================================",
		"",
		`Клиника:     ${clinicName}`,
		`Врач:        ${doctorName}`,
		`Лаборатория: ${order.labName} (ID контакта: ${order.labContactId})`,
		`Номер заказа: ${orderNum}`,
		`Дата выдачи: ${order.sentDate}`,
		"",
		"--------------------------------------------------------------------------------",
		"1. ДАННЫЕ ПАЦИЕНТА",
		"--------------------------------------------------------------------------------",
		`ФИО пациента:        ${order.patientName}`,
		`Идентификатор (ID):  ${order.patientId}`,
		"",
		"--------------------------------------------------------------------------------",
		"2. КЛИНИЧЕСКИЕ И ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ КОНСТРУКЦИИ",
		"--------------------------------------------------------------------------------",
		`Вид конструкции:     ${workLabel} (${order.workType})`,
		`Зубная формула (FDI): ${order.toothReference || "Не указана"}`,
		`Расцветка / оттенок: ${shadeLabel}`,
		`Тип оттиска / скана: ${impressionLabel}`,
		`Антагонисты:         ${order.antagonistInfo || "Оттиск / цифровой скан антагонистов приложен"}`,
		"",
		"--------------------------------------------------------------------------------",
		"3. СРОКИ ИЗГОТОВЛЕНИЯ И ФИНАНСОВЫЕ УСЛОВИЯ",
		"--------------------------------------------------------------------------------",
		`Дата отправки в ЗТЛ: ${order.sentDate}`,
		`Плановая дата сдачи: ${order.expectedDate || "По согласованию"}`,
		`Фактическая сдача:   ${order.receivedDate || "В производстве"}`,
		`Текущий статус:      ${statusLabel}`,
		`Оценочная стоимость: ${priceFormatted}`,
		"",
		"--------------------------------------------------------------------------------",
		"4. ОСОБЫЕ КЛИНИЧЕСКИЕ УКАЗАНИЯ И ПРИМЕЧАНИЯ ТЕХНИКУ",
		"--------------------------------------------------------------------------------",
		order.notes && order.notes.trim().length > 0
			? order.notes.trim()
			: "Стандартный клинический протокол. Изготовление строго по анатомическим ориентирам.",
		"",
		"--------------------------------------------------------------------------------",
		"5. РЕГЛАМЕНТНЫЕ ТРЕБОВАНИЯ И САНИТАРНЫЙ КОНТРОЛЬ",
		"--------------------------------------------------------------------------------",
		"- СанПиН 3.3686-21: Дезинфекция оттисков, прикусных валиков и регистратов окклюзии",
		"  проведена в клинике перед отправкой в зуботехническую лабораторию.",
		"- ГОСТ Р 51087-97 / ГОСТ 31576-2012: Требования к совместимости стоматологических материалов.",
		"- Клинические рекомендации СтАР по ортопедической стоматологии.",
		"- Клиническое решение: срок плана лечения (>30 дней) подтвержден врачом и не препятствует",
		"  изготовлению наряда ЗТЛ, оказанию услуг или оплате.",
		"",
		"--------------------------------------------------------------------------------",
		"6. ПОДПИСИ СТОРОН",
		"--------------------------------------------------------------------------------",
		`Врач-стоматолог-ортопед:     ____________________ / ${doctorName} /`,
		"",
		`Зубной техник / приемщик:    ____________________ / ${order.labName} /`,
		"",
		'Дата приемки работы в ЗТЛ:   "____" ____________ 20___ г.',
		"================================================================================",
	].join("\n");
}

export interface FormZtl1OrderInput {
	id?: string | null | undefined;
	patientId?: string | null | undefined;
	patientFullName?: string | null | undefined;
	patientName?: string | null | undefined;
	labName?: string | null | undefined;
	labId?: string | null | undefined;
	labContactId?: string | null | undefined;
	workType?: string | null | undefined;
	toothNumbers?: readonly (string | number)[] | null | undefined;
	toothReference?: string | null | undefined;
	antagonistInfo?: string | null | undefined;
	sentDate?: string | null | undefined;
	expectedDate?: string | null | undefined;
	receivedDate?: string | null | undefined;
	labCostKopecks?: number | null | undefined;
	priceRub?: number | null | undefined;
	notes?: string | null | undefined;
	doctorFullName?: string | null | undefined;
}

export const formatLabOrderFormZtl1A4Protocol = (
	order: FormZtl1OrderInput | null | undefined,
	clinicName?: string,
): string => {
	if (!order) return "";
	const safeWorkType: LabWorkType =
		order.workType && (labWorkTypeSchema.options as readonly string[]).includes(order.workType)
			? (order.workType as LabWorkType)
			: "other";
	return formatLabOrderPrescriptionA4(
		{
			id: typeof order.id === "string" && order.id.length === 36 ? order.id : undefined,
			patientId: String(order.patientId || "—"),
			patientName: String(order.patientFullName || order.patientName || "Пациент"),
			labName: String(order.labName || "Зуботехническая лаборатория"),
			labContactId: String(order.labId || order.labContactId || "—"),
			workType: safeWorkType,
			toothReference: Array.isArray(order.toothNumbers) ? order.toothNumbers.join(", ") : (order.toothReference || undefined),
			antagonistInfo: order.antagonistInfo || undefined,
			impressionType: "digital_scan",
			sentDate: order.sentDate || new Date().toISOString().slice(0, 10),
			expectedDate: order.expectedDate || undefined,
			receivedDate: order.receivedDate || undefined,
			status: "sent",
			priceRub: typeof order.labCostKopecks === "number" ? kopecksToRubles(order.labCostKopecks) : (order.priceRub || undefined),
			notes: order.notes || undefined,
		},
		clinicName || "Стоматологическая клиника DENTE",
		String(order.doctorFullName || "Лечащий врач-ортопед")
	);
};

export const formatLabOrderProtocolA4 = formatLabOrderFormZtl1A4Protocol;

export const labOrdersEngine = {
	formatLabOrderPrescriptionA4,
	formatLabOrderFormZtl1A4Protocol,
	formatLabOrderProtocolA4,
};
