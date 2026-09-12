/**
 * labOrdersEngine.ts — Dental Laboratory Orders & Prosthodontic Workflow Engine.
 *
 * Wave 127 — Domain: Dental Lab Orders (DentalPin Reverse-Engineering).
 * Adapted from dentalpin lab_orders module (schemas.py, service.py, migrations).
 *
 * Features:
 * - Types and Zod schemas for dental lab orders, work types, impression types, and VITA shades.
 * - Localized Russian labels for UI, clinical cards, and print blanks.
 * - Workflow state transition validation adhering to Mandate 8e (Doctor Autonomy).
 * - Delivery deadline SLA overdue monitoring.
 * - Calendar-day manufacturing turnaround calculation.
 * - Official A4 lab prescription sheet generator (100% zero emojis per Mandate 8d item 7).
 */

import { z } from "zod";

// ─── 1. WORK TYPES & RUSSIAN LABELS ──────────────────────────────────────────

export const labWorkTypeSchema = z.enum([
	"crown",
	"bridge",
	"denture",
	"implant",
	"veneer",
	"orthodontic",
	"repair",
	"other",
]);
export type LabWorkType = z.infer<typeof labWorkTypeSchema>;

export const LAB_WORK_TYPE_LABELS_RU: Record<LabWorkType, string> = {
	crown: "Коронка",
	bridge: "Мостовидный протез",
	denture: "Съемный протез",
	implant: "Протезирование на имплантате",
	veneer: "Винир",
	orthodontic: "Ортодонтический аппарат",
	repair: "Ремонт протеза",
	other: "Прочее",
};

// ─── 2. ORDER STATUSES & RUSSIAN LABELS ──────────────────────────────────────

export const labOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"in_progress",
	"ready",
	"received",
	"fitted",
	"cancelled",
]);
export type LabOrderStatus = z.infer<typeof labOrderStatusSchema>;

export const LAB_ORDER_STATUS_LABELS_RU: Record<LabOrderStatus, string> = {
	draft: "Черновик",
	sent: "Отправлен в ЗТЛ",
	in_progress: "В работе у техника",
	ready: "Готов в ЗТЛ",
	received: "Доставлен в клинику",
	fitted: "Припасован / Сдан пациенту",
	cancelled: "Отменен",
};

// ─── 3. IMPRESSION TYPES & RUSSIAN LABELS ────────────────────────────────────

export const labImpressionTypeSchema = z.enum([
	"digital_scan",
	"alginate",
	"pvs_silicone",
	"polyether",
	"other",
]);
export type LabImpressionType = z.infer<typeof labImpressionTypeSchema>;

export const LAB_IMPRESSION_LABELS_RU: Record<LabImpressionType, string> = {
	digital_scan: "Цифровой скан IOS",
	alginate: "Альгинатный слепок",
	pvs_silicone: "А-Силикон / C-Силикон",
	polyether: "Полиэфирный оттиск",
	other: "Прочее",
};

// ─── 4. VITA SHADES (CLASSICAL & BLEACH) ──────────────────────────────────────

export const vitaShadeSchema = z.enum([
	"A1",
	"A2",
	"A3",
	"A3.5",
	"A4",
	"B1",
	"B2",
	"B3",
	"B4",
	"C1",
	"C2",
	"C3",
	"C4",
	"D2",
	"D3",
	"D4",
	"bleach_1",
	"bleach_2",
	"bleach_3",
	"bleach_4",
]);
export type VitaShade = z.infer<typeof vitaShadeSchema>;

// ─── 5. LAB ORDER RECORD SCHEMA & TYPE ───────────────────────────────────────

export const labOrderRecordSchema = z.object({
	id: z.string().uuid().optional(),
	patientId: z.string().min(1, "ID пациента обязателен"),
	patientName: z.string().min(1, "ФИО пациента обязательно"),
	labContactId: z.string().min(1, "ID контакта лаборатории обязателен"),
	labName: z.string().min(1, "Наименование лаборатории обязательно"),
	workType: labWorkTypeSchema,
	toothReference: z.string().max(50).nullable().optional(),
	impressionType: labImpressionTypeSchema.nullable().optional(),
	antagonistInfo: z.string().max(500).nullable().optional(),
	shade: vitaShadeSchema.nullable().optional(),
	status: labOrderStatusSchema.default("sent"),
	sentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата отправки должна быть в формате YYYY-MM-DD"),
	expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Плановая дата должна быть в формате YYYY-MM-DD").nullable().optional(),
	receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата доставки должна быть в формате YYYY-MM-DD").nullable().optional(),
	priceRub: z.number().nonnegative("Стоимость не может быть отрицательной").nullable().optional(),
	notes: z.string().max(2000).nullable().optional(),
	createdAt: z.string().optional(),
});
export type LabOrderRecord = z.infer<typeof labOrderRecordSchema>;

// ─── 6. WORKFLOW STATE TRANSITIONS (MANDATE 8E: DOCTOR AUTONOMY) ─────────────

/**
 * Validates allowed state transitions for dental laboratory work orders.
 *
 * In accordance with Mandate 8e (Doctor Autonomy):
 * - Doctors can freely return fitted or received orders back to 'in_progress' for
 *   adjustment, correction, or remake without administrative blocks.
 * - Any active order can be cancelled at any point if clinical plans change.
 * - A cancelled order can be reopened to draft or sent if cancelled by mistake.
 */
export function canTransitionLabOrderStatus(
	from: LabOrderStatus,
	to: LabOrderStatus,
): boolean {
	if (from === to) {
		return true;
	}

	const transitions: Record<LabOrderStatus, LabOrderStatus[]> = {
		draft: ["sent", "cancelled"],
		sent: ["in_progress", "ready", "received", "draft", "cancelled"],
		in_progress: ["ready", "received", "sent", "draft", "cancelled"],
		ready: ["received", "in_progress", "cancelled"],
		received: ["fitted", "in_progress", "ready", "cancelled"],
		fitted: ["in_progress", "received", "cancelled"],
		cancelled: ["draft", "sent"],
	};

	return transitions[from]?.includes(to) ?? false;
}

// ─── 7. OVERDUE DETECTION ───────────────────────────────────────────────────

/**
 * Evaluates whether a lab order has passed its expected delivery deadline.
 *
 * Rules:
 * - Orders in 'received', 'fitted', or 'cancelled' status are never considered overdue.
 * - Orders without an expectedDate cannot be flagged as overdue.
 * - If referenceDate exceeds the end of the expected delivery date (23:59:59.999 UTC),
 *   the order is flagged as overdue.
 */
export function isLabOrderOverdue(
	order: LabOrderRecord,
	referenceDate: Date = new Date(),
): boolean {
	if (
		order.status === "received" ||
		order.status === "fitted" ||
		order.status === "cancelled"
	) {
		return false;
	}

	if (!order.expectedDate) {
		return false;
	}

	const [expY, expM, expD] = order.expectedDate.split("-").map(Number);
	if (!expY || !expM || !expD) {
		return false;
	}

	const expectedEndOfDayUtc = Date.UTC(expY, expM - 1, expD, 23, 59, 59, 999);
	return referenceDate.getTime() > expectedEndOfDayUtc;
}

// ─── 8. TURNAROUND CALCULATION ──────────────────────────────────────────────

/**
 * Calculates the actual laboratory turnaround duration in integer calendar days.
 *
 * Returns 0 if receivedDate is earlier than sentDate or if inputs are invalid.
 */
export function calculateLabTurnaroundDays(
	sentDate: string,
	receivedDate: string,
): number {
	const [sY, sM, sD] = sentDate.split("-").map(Number);
	const [rY, rM, rD] = receivedDate.split("-").map(Number);

	if (!sY || !sM || !sD || !rY || !rM || !rD) {
		return 0;
	}

	const sentUtc = Date.UTC(sY, sM - 1, sD);
	const recvUtc = Date.UTC(rY, rM - 1, rD);

	if (recvUtc < sentUtc) {
		return 0;
	}

	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.round((recvUtc - sentUtc) / msPerDay);
}

// ─── 9. STATUTORY A4 PRESCRIPTION GENERATOR (0 EMOJIS — MANDATE 8D ITEM 7) ──

/**
 * Generates an official print-ready prescription and work order sheet (A4 format)
 * for the dental laboratory.
 *
 * Strict invariant: ZERO unicode emojis anywhere in output (Mandate 8d item 7).
 */
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
		"                   НАРЯД-ЗАКАЗ В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ                   ",
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

export const formatLabOrderFormZtl1A4Protocol = (
	order: any,
	clinicName?: string,
): string => {
	if (!order) return "";
	const safeWorkType: any = ["crown", "bridge", "denture", "implant", "veneer", "orthodontic", "repair", "other"].includes(order.workType)
		? order.workType
		: "other";
	return formatLabOrderPrescriptionA4(
		{
			id: typeof order.id === "string" && order.id.length === 36 ? order.id : undefined,
			patientId: String(order.patientId || "patient-1"),
			patientName: String(order.patientFullName || order.patientName || "Пациент"),
			labName: String(order.labName || "Зуботехническая лаборатория"),
			labContactId: String(order.labId || order.labContactId || "lab-default"),
			workType: safeWorkType,
			toothReference: Array.isArray(order.toothNumbers) ? order.toothNumbers.join(", ") : (order.toothReference || undefined),
			antagonistInfo: order.antagonistInfo || undefined,
			impressionType: "digital_scan",
			sentDate: order.sentDate || new Date().toISOString().split("T")[0],
			expectedDate: order.expectedDate || undefined,
			receivedDate: order.receivedDate || undefined,
			status: "sent",
			priceRub: typeof order.labCostKopecks === "number" ? Math.round(order.labCostKopecks / 100) : (order.priceRub || undefined),
			notes: order.notes || undefined,
		},
		clinicName || "Стоматологическая клиника DENTE",
		String(order.doctorFullName || "Лечащий врач-ортопед")
	);
};

export const labOrdersEngine = {
	formatLabOrderPrescriptionA4,
	formatLabOrderFormZtl1A4Protocol,
};
