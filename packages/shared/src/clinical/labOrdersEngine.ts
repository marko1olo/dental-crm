/**
 * labOrdersEngine.ts — Dental Laboratory Orders (ZTL) & Prosthetic Stages Workflow Engine.
 *
 * Wave 139 — Domain: Clinical / Prosthetics & Dental Laboratory Workflow.
 * Adapted from DentalPin (backend/app/modules/lab_orders/) for DENTE Dental CRM.
 *
 * INVARIANTS:
 * 1. 100% Zero Mocks & Pure Deterministic Calculations:
 *    - Strict Zod schemas and type validation.
 * 2. Mandate 8e item 7 & Mandate 8n (Doctor Autonomy & Scale Sovereignty):
 *    - Orthopedic lab orders can be created and updated freely.
 *    - Warranty rework ('rework_needed') never blocks clinical operations, never demands
 *      administrator master-passwords, and supports 100% warranty discounts.
 *    - Solo practitioner or large clinic operation without backoffice friction.
 * 3. Exact FDI Dental Notation (FDI 11..48):
 *    - Adult permanent dentition quadrants 1..4 (11..18, 21..28, 31..38, 41..48).
 * 4. Kopeck-Exact Lab Costs:
 *    - labCostKopecks stored as exact integer kopecks (1 RUB = 100 kopecks).
 * 5. Statutory Russian Form ZTL-1 A4 Protocol (Mandate 8d item 7):
 *    - Formal laboratory requisition slip conforming to Ministry of Health Form 043/u.
 *    - STRICTLY 0 EMOJIS in official medical documents.
 */

import { z } from "zod";

// ─── 1. ZOD SCHEMAS & TYPES ───────────────────────────────────────────────────

/**
 * Types of orthopedic and technical works manufactured in dental laboratories.
 */
export const labWorkTypeSchema = z.enum([
	"single_crown",
	"bridge",
	"veneer",
	"inlay_onlay",
	"implant_abutment",
	"removable_denture",
	"clasp_denture",
	"orthodontic_splint",
	"surgical_guide",
	"repair",
]);
export type LabWorkType = z.infer<typeof labWorkTypeSchema>;

export const LAB_WORK_TYPE_LABELS_RU: Record<LabWorkType, string> = {
	single_crown: "Одиночная коронка",
	bridge: "Мостовидный протез",
	veneer: "Винир / Ультранир",
	inlay_onlay: "Вкладка / Накладка (Inlay/Onlay)",
	implant_abutment: "Индивидуальный абатмент",
	removable_denture: "Съемный пластиночный протез",
	clasp_denture: "Бюгельный протез",
	orthodontic_splint: "Окклюзионная шина / Каппа",
	surgical_guide: "Хирургический навигационный шаблон",
	repair: "Починка / Перебазировка протеза",
};

/**
 * Contemporary dental biomaterials used in CAD/CAM milling and manual fabrication.
 */
export const prostheticMaterialSchema = z.enum([
	"zirconia_multilayer",
	"emax_disilicate",
	"pfm_cobalt_chromium",
	"pmma_milled_temp",
	"titanium_custom",
	"peek_bio",
	"composite_nano",
]);
export type ProstheticMaterial = z.infer<typeof prostheticMaterialSchema>;

export const PROSTHETIC_MATERIAL_LABELS_RU: Record<ProstheticMaterial, string> = {
	zirconia_multilayer: "Диоксид циркония (Multilayer 3D/5D)",
	emax_disilicate: "Пресс-керамика IPS e.max (Дисиликат лития)",
	pfm_cobalt_chromium: "Металлокерамика (Co-Cr / КХС)",
	pmma_milled_temp: "Фрезерованный PMMA (Временная конструкция)",
	titanium_custom: "Индивидуальный титановый сплав (Grade 5)",
	peek_bio: "Биополимер PEEK (Полиэфирэфиркетон)",
	composite_nano: "Нанокомпозит гибридный (CAD/CAM)",
};

/**
 * Standard VITA Classical and Bleach shade selection catalog.
 */
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
	"BL1",
	"BL2",
	"BL3",
	"BL4",
]);
export type VitaShade = z.infer<typeof vitaShadeSchema>;

/**
 * Lifecycle status of laboratory order.
 */
export const labOrderStatusSchema = z.enum([
	"draft",
	"sent_to_lab",
	"in_progress",
	"fitting_stage",
	"ready_at_lab",
	"received_in_clinic",
	"installed_accepted",
	"rework_needed",
	"cancelled",
]);
export type LabOrderStatus = z.infer<typeof labOrderStatusSchema>;

export const LAB_ORDER_STATUS_LABELS_RU: Record<LabOrderStatus, string> = {
	draft: "Черновик наряда",
	sent_to_lab: "Отправлен в лабораторию",
	in_progress: "В работе (моделирование / фрезеровка)",
	fitting_stage: "Этап клинической примерки",
	ready_at_lab: "Готов в лаборатории",
	received_in_clinic: "Получен в клинике",
	installed_accepted: "Сдан пациенту / Принят врачом",
	rework_needed: "Требуется переделка / Коррекция",
	cancelled: "Аннулирован",
};

/**
 * Impression transfer methodology from clinic to laboratory.
 */
export const impressionTypeSchema = z.enum([
	"digital_intraoral_scan",
	"silicone_a_type",
	"silicone_c_type",
	"alginate",
	"combined",
]);
export type ImpressionType = z.infer<typeof impressionTypeSchema>;

export const IMPRESSION_TYPE_LABELS_RU: Record<ImpressionType, string> = {
	digital_intraoral_scan: "Цифровой интраоральный 3D-скан (STL/PLY)",
	silicone_a_type: "А-силиконовый прецизионный оттиск",
	silicone_c_type: "С-силиконовый анатомический оттиск",
	alginate: "Альгинатный диагностический слепок",
	combined: "Комбинированный оттиск (скан + прикусной валик)",
};

/**
 * Intermediate stage status in technical production chain.
 */
export const labOrderStageStatusSchema = z.enum([
	"pending",
	"completed",
	"overdue",
]);
export type LabOrderStageStatus = z.infer<typeof labOrderStageStatusSchema>;

/**
 * Intermediate technological or clinical stage of prosthetic fabrication.
 */
export const labOrderStageSchema = z.object({
	stageName: z.string().min(1),
	plannedDate: z.string(),
	completedDate: z.string().nullable().optional(),
	technicianNotes: z.string().nullable().optional(),
	status: labOrderStageStatusSchema,
});
export type LabOrderStage = z.infer<typeof labOrderStageSchema>;

/**
 * FDI adult tooth numbers: 11..18, 21..28, 31..38, 41..48.
 */
const VALID_PERMANENT_FDI_TEETH = new Set([
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
]);

export function isValidFdiToothNumber(tooth: number): boolean {
	return VALID_PERMANENT_FDI_TEETH.has(tooth);
}

/**
 * Full dental laboratory work order record.
 */
export const labOrderSchema = z.object({
	id: z.string().min(1),
	clinicId: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	doctorId: z.string().min(1),
	doctorFullName: z.string().min(1),
	labId: z.string().min(1),
	labName: z.string().min(1),
	workType: labWorkTypeSchema,
	material: prostheticMaterialSchema,
	shade: vitaShadeSchema,
	toothNumbers: z
		.array(z.number().int())
		.min(1)
		.refine(
			(teeth) => teeth.every((t) => isValidFdiToothNumber(t)),
			"Все зубы должны соответствовать международной нумерации FDI (11..48)",
		),
	impressionType: impressionTypeSchema,
	antagonistInfo: z.string().nullable().optional(),
	sentDate: z.string(),
	expectedDate: z.string(),
	receivedDate: z.string().nullable().optional(),
	labCostKopecks: z.number().int().nonnegative().default(0),
	stages: z.array(labOrderStageSchema).default([]),
	notes: z.string().nullable().optional(),
	warrantyMonths: z.number().int().nonnegative().default(12),
	isWarrantyRework: z.boolean().default(false),
	reworkReason: z.string().nullable().optional(),
	status: labOrderStatusSchema.default("draft"),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type LabOrder = z.infer<typeof labOrderSchema>;

// ─── 2. BUSINESS LOGIC & STAGE WORKFLOW ENGINE ────────────────────────────────

export interface CreateLabOrderParams {
	id?: string | undefined;
	clinicId: string;
	patientId: string;
	patientFullName: string;
	doctorId: string;
	doctorFullName: string;
	labId: string;
	labName: string;
	workType: LabWorkType;
	material: ProstheticMaterial;
	shade: VitaShade;
	toothNumbers: number[];
	impressionType: ImpressionType;
	antagonistInfo?: string | null | undefined;
	sentDate: string;
	expectedDate: string;
	labCostKopecks?: number | undefined;
	notes?: string | null | undefined;
	warrantyMonths?: number | undefined;
	isWarrantyRework?: boolean | undefined;
	reworkReason?: string | null | undefined;
	status?: LabOrderStatus | undefined;
	customStages?: LabOrderStage[] | undefined;
	now?: string | undefined;
}

/**
 * Calculates default technological stages based on work type and timeframe.
 */
export function generateDefaultStages(
	workType: LabWorkType,
	sentDate: string,
	expectedDate: string,
): LabOrderStage[] {
	const sentMs = new Date(sentDate).getTime();
	const expectedMs = new Date(expectedDate).getTime();
	const totalSpan = Math.max(86400000, expectedMs - sentMs);

	const formatDateOffset = (ratio: number): string => {
		const targetMs = sentMs + Math.round(totalSpan * ratio);
		return new Date(targetMs).toISOString().split("T")[0]!;
	};

	switch (workType) {
		case "bridge":
			return [
				{
					stageName: "CAD/CAM Моделирование и фрезеровка каркаса",
					plannedDate: formatDateOffset(0.35),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Клиническая примерка каркаса мостовидного протеза",
					plannedDate: formatDateOffset(0.65),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Нанесение керамической облицовки, глазурование и сдача",
					plannedDate: formatDateOffset(1.0),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
			];

		case "clasp_denture":
		case "removable_denture":
			return [
				{
					stageName: "Отливка рабочей модели и изготовление прикусных валиков",
					plannedDate: formatDateOffset(0.3),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Примерка восковой постановки зубов и проверка окклюзии",
					plannedDate: formatDateOffset(0.65),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Полимеризация, шлифовка, полировка и сдача протеза",
					plannedDate: formatDateOffset(1.0),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
			];

		case "surgical_guide":
			return [
				{
					stageName: "Виртуальное 3D-планирование имплантации и дизайн шаблона",
					plannedDate: formatDateOffset(0.4),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "3D-печать шаблона и фиксация металлических направляющих втулок",
					plannedDate: formatDateOffset(0.8),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Автоклавирование, контроль посадки и передача в клинику",
					plannedDate: formatDateOffset(1.0),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
			];

		case "repair":
			return [
				{
					stageName: "Диагностика перелома / дефекта и подготовка базиса",
					plannedDate: formatDateOffset(0.4),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Вварка зуба / кламмера / перебазировка и финишная полировка",
					plannedDate: formatDateOffset(1.0),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
			];

		default:
			// single_crown, veneer, inlay_onlay, implant_abutment, orthodontic_splint
			return [
				{
					stageName: "Цифровой дизайн конструкции (CAD-моделирование)",
					plannedDate: formatDateOffset(0.4),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Фрезерование / Синтеризация / Нанесение индивидуальных красителей",
					plannedDate: formatDateOffset(0.8),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
				{
					stageName: "Глазурование, контроль краевого прилегания и сдача в клинику",
					plannedDate: formatDateOffset(1.0),
					completedDate: null,
					technicianNotes: null,
					status: "pending",
				},
			];
	}
}

/**
 * Creates a validated LabOrder with automatic prosthetic stage calculation.
 * Respects Mandate 8e & 8n: Doctor Autonomy.
 */
export function createLabOrder(params: CreateLabOrderParams): LabOrder {
	const nowIso = params.now ?? new Date().toISOString();
	const orderId = params.id ?? `ztl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	const stages =
		params.customStages ??
		generateDefaultStages(params.workType, params.sentDate, params.expectedDate);

	const initialStatus = params.status ?? "sent_to_lab";
	const isWarrantyRework = Boolean(params.isWarrantyRework || params.reworkReason);

	const rawOrder = {
		id: orderId,
		clinicId: params.clinicId,
		patientId: params.patientId,
		patientFullName: params.patientFullName,
		doctorId: params.doctorId,
		doctorFullName: params.doctorFullName,
		labId: params.labId,
		labName: params.labName,
		workType: params.workType,
		material: params.material,
		shade: params.shade,
		toothNumbers: params.toothNumbers,
		impressionType: params.impressionType,
		antagonistInfo: params.antagonistInfo ?? null,
		sentDate: params.sentDate,
		expectedDate: params.expectedDate,
		receivedDate: null,
		labCostKopecks: params.labCostKopecks ?? 0,
		stages,
		notes: params.notes ?? null,
		warrantyMonths: params.warrantyMonths ?? 12,
		isWarrantyRework,
		reworkReason: params.reworkReason ?? null,
		status: initialStatus,
		createdAt: nowIso,
		updatedAt: nowIso,
	};

	return labOrderSchema.parse(rawOrder);
}

/**
 * Advances lab order status with historical record updates and stage completions.
 * Mandate 8e item 7: warranty rework transitions ('rework_needed') never block operations.
 */
export function advanceLabOrderStatus(
	order: LabOrder,
	newStatus: LabOrderStatus,
	updateInfo?: {
		receivedDate?: string | undefined;
		notes?: string | undefined;
		reworkReason?: string | undefined;
		technicianNotes?: string | undefined;
		now?: string | undefined;
	},
): LabOrder {
	const nowIso = updateInfo?.now ?? new Date().toISOString();
	const todayStr = nowIso.split("T")[0]!;

	let receivedDate = order.receivedDate;
	if (newStatus === "received_in_clinic" && !receivedDate) {
		receivedDate = updateInfo?.receivedDate ?? todayStr;
	}

	const isRework = newStatus === "rework_needed" || order.isWarrantyRework;
	const reworkReason =
		updateInfo?.reworkReason ??
		(newStatus === "rework_needed"
			? order.reworkReason ?? "Клиническая коррекция / уточнение окклюзии"
			: order.reworkReason);

	// Update stage status when advancing to delivery or completion
	const updatedStages: LabOrderStage[] = order.stages.map((stage, idx) => {
		if (newStatus === "received_in_clinic" || newStatus === "installed_accepted") {
			return {
				...stage,
				completedDate: stage.completedDate ?? todayStr,
				status: "completed",
			};
		}
		if (newStatus === "fitting_stage" && idx === 1) {
			return {
				...stage,
				completedDate: todayStr,
				status: "completed",
				technicianNotes: updateInfo?.technicianNotes ?? stage.technicianNotes,
			};
		}
		return stage;
	});

	const mergedNotes = updateInfo?.notes
		? order.notes
			? `${order.notes}\n[${todayStr}] ${updateInfo.notes}`
			: updateInfo.notes
		: order.notes;

	return labOrderSchema.parse({
		...order,
		status: newStatus,
		receivedDate,
		isWarrantyRework: isRework,
		reworkReason,
		stages: updatedStages,
		notes: mergedNotes,
		updatedAt: nowIso,
	});
}

/**
 * Computes laboratory SLA delivery discipline, rework rate, and turnaround times.
 */
export function calculateLabSlaCompliance(
	orders: LabOrder[],
	currentDate: string,
): {
	totalOrders: number;
	completedCount: number;
	onTimeRate: number;
	overdueCount: number;
	averageTurnaroundDays: number;
	reworkRate: number;
} {
	const totalOrders = orders.length;
	if (totalOrders === 0) {
		return {
			totalOrders: 0,
			completedCount: 0,
			onTimeRate: 1.0,
			overdueCount: 0,
			averageTurnaroundDays: 0,
			reworkRate: 0.0,
		};
	}

	const currentStr = currentDate.split("T")[0]!;

	let completedCount = 0;
	let onTimeDeliveries = 0;
	let overdueCount = 0;
	let reworkCount = 0;
	let totalTurnaroundDays = 0;
	let turnaroundCount = 0;

	for (const o of orders) {
		if (o.isWarrantyRework || o.status === "rework_needed") {
			reworkCount += 1;
		}

		const isFinished =
			o.status === "received_in_clinic" || o.status === "installed_accepted";

		if (isFinished) {
			completedCount += 1;
			const receivedStr = o.receivedDate?.slice(0, 10) ?? o.expectedDate.slice(0, 10);
			if (receivedStr <= o.expectedDate.slice(0, 10)) {
				onTimeDeliveries += 1;
			} else {
				overdueCount += 1;
			}

			// Turnaround calculation in full calendar days
			const sentMs = new Date(o.sentDate).getTime();
			const recMs = new Date(receivedStr).getTime();
			if (!Number.isNaN(sentMs) && !Number.isNaN(recMs) && recMs >= sentMs) {
				const days = Math.round((recMs - sentMs) / 86400000);
				totalTurnaroundDays += days;
				turnaroundCount += 1;
			}
		} else if (o.status !== "cancelled" && o.status !== "draft") {
			// In-progress order check against current date
			if (currentStr > o.expectedDate.slice(0, 10)) {
				overdueCount += 1;
			}
		}
	}

	const rawOnTime = completedCount > 0 ? onTimeDeliveries / completedCount : 1.0;
	const onTimeRate = Math.max(0, Math.min(1, Math.round(rawOnTime * 10000) / 10000));

	const rawRework = totalOrders > 0 ? reworkCount / totalOrders : 0.0;
	const reworkRate = Math.max(0, Math.min(1, Math.round(rawRework * 10000) / 10000));

	const averageTurnaroundDays =
		turnaroundCount > 0 ? Math.round((totalTurnaroundDays / turnaroundCount) * 10) / 10 : 0;

	return {
		totalOrders,
		completedCount,
		onTimeRate,
		overdueCount,
		averageTurnaroundDays,
		reworkRate,
	};
}

// ─── 3. OFFICIAL RUSSIAN STATUTORY FORM ZTL-1 A4 PROTOCOL ──────────────────────

/**
 * Formats official statutory dental lab requisition slip (Form ZTL-1).
 * Attached to Outpatient Dental Medical Record Form 043/u (Ministry of Health).
 * STRICTLY 0 EMOJIS in compliance with Mandate 8d item 7.
 */
export function formatLabOrderFormZtl1A4Protocol(
	order: LabOrder,
	clinicName?: string | undefined,
): string {
	const separator = "=".repeat(76);
	const subSeparator = "-".repeat(76);

	const safeClinic = clinicName?.trim() || "Медицинская организация DENTE";
	const safeDoctor = order.doctorFullName.trim() || "Не указан";
	const safePatient = order.patientFullName.trim() || "Не указан";
	const safeLab = order.labName.trim() || "Зуботехническая лаборатория";

	const workLabel = LAB_WORK_TYPE_LABELS_RU[order.workType];
	const matLabel = PROSTHETIC_MATERIAL_LABELS_RU[order.material];
	const impLabel = IMPRESSION_TYPE_LABELS_RU[order.impressionType];
	const statusLabel = LAB_ORDER_STATUS_LABELS_RU[order.status];

	const teethFormatted = order.toothNumbers.join(", ");
	const costRub = (order.labCostKopecks / 100).toFixed(2);

	const lines: string[] = [];
	lines.push(separator);
	lines.push("НАРЯД-ЗАКАЗ В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ (ФОРМА ЗТЛ-1)");
	lines.push("Приложение к медицинской карте стоматологического пациента (Форма 043/у)");
	lines.push(separator);
	lines.push(`Медицинская организация: ${safeClinic}`);
	lines.push(`Зуботехническая лаборатория (Исполнитель): ${safeLab} (ID: ${order.labId})`);
	lines.push(`Номер наряда: ${order.id}`);
	lines.push(`Дата оформления: ${order.sentDate}`);
	lines.push(`Плановая дата сдачи: ${order.expectedDate}`);
	lines.push(subSeparator);

	lines.push("1. ДАННЫЕ ПАЦИЕНТА И КЛИНИЧЕСКИЙ ЗАКАЗ:");
	lines.push(`- Пациент: ${safePatient} (ID: ${order.patientId})`);
	lines.push(`- Лечащий врач-ортопед: ${safeDoctor} (ID: ${order.doctorId})`);
	lines.push(`- Вид протетической работы: ${workLabel} [${order.workType}]`);
	lines.push(`- Зубная формула (FDI 11..48): ${teethFormatted}`);
	lines.push(`- Конструкционный материал: ${matLabel}`);
	lines.push(`- Цвет по шкале VITA: ${order.shade}`);
	lines.push(`- Тип оттиска / скана: ${impLabel}`);
	lines.push(`- Данные антагонистов и прикуса: ${order.antagonistInfo ?? "По прикусному валику / в центральной окклюзии"}`);
	lines.push(subSeparator);

	lines.push("2. ЭТАПЫ ИЗГОТОВЛЕНИЯ И ТЕХНОЛОГИЧЕСКИЙ КОНТРОЛЬ:");
	if (order.stages.length > 0) {
		for (let i = 0; i < order.stages.length; i++) {
			const st = order.stages[i]!;
			const statusText =
				st.status === "completed"
					? `ВЫПОЛНЕНО (${st.completedDate ?? "да"})`
					: st.status === "overdue"
						? "ПРОСРОЧЕНО"
						: "В ОЖИДАНИИ";
			lines.push(`  ${i + 1}. ${st.stageName}`);
			lines.push(`     План: ${st.plannedDate} | Статус: ${statusText}`);
			if (st.technicianNotes) {
				lines.push(`     Заметки техника: ${st.technicianNotes}`);
			}
		}
	} else {
		lines.push("  Этапы согласованы в типовом производственном регламенте.");
	}
	lines.push(subSeparator);

	lines.push("3. СТАТУС, ГАРАНТИЯ И ФИНАНСОВЫЕ ДАННЫЕ:");
	lines.push(`- Текущий статус наряда: ${statusLabel} [${order.status}]`);
	lines.push(`- Гарантийный срок на изделие: ${order.warrantyMonths} мес.`);
	lines.push(`- Стоимость лабораторного этапа: ${costRub} руб.`);
	if (order.isWarrantyRework) {
		lines.push(`- ВНИМАНИЕ: Гарантийная переделка / Коррекция без удержаний с пациента (Мандат 8e).`);
		lines.push(`- Причина переделки: ${order.reworkReason ?? "Уточнение окклюзионных контактов"}`);
	}
	if (order.notes) {
		lines.push(`- Клинические указания врача: ${order.notes}`);
	}
	lines.push(subSeparator);

	lines.push("4. ПРИЕМКА ИЗДЕЛИЯ И ПОДПИСИ СТОРОН:");
	lines.push("Конструкция изготовлена в соответствии с требованиями ГОСТ Р 51087-97 и");
	lines.push("СанПиН 3.3686-21. Претензий по качеству и точности посадки нет.");
	lines.push("");
	lines.push("Оттиск снял и наряд оформил:   ____________________ / " + safeDoctor);
	lines.push("Работу выполнил зубной техник: ____________________ / ____________________");
	lines.push("Штамп ОТК лаборатории:         ____________________");
	lines.push("М.П. (Место печати медицинской организации)");
	lines.push(separator);

	return lines.join("\n");
}

export const labOrdersEngine = {
	labWorkTypeSchema,
	LAB_WORK_TYPE_LABELS_RU,
	prostheticMaterialSchema,
	PROSTHETIC_MATERIAL_LABELS_RU,
	vitaShadeSchema,
	labOrderStatusSchema,
	LAB_ORDER_STATUS_LABELS_RU,
	impressionTypeSchema,
	IMPRESSION_TYPE_LABELS_RU,
	labOrderStageStatusSchema,
	labOrderStageSchema,
	labOrderSchema,
	isValidFdiToothNumber,
	generateDefaultStages,
	createLabOrder,
	advanceLabOrderStatus,
	calculateLabSlaCompliance,
	formatLabOrderFormZtl1A4Protocol,
};
