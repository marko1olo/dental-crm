/**
 * autonomousLabTrackerEngine.ts — Autonomous Dental Lab & Courier Tracker («Лаба в кармане»).
 *
 * Standalone Trojan module for private dental clinics, orthopedists, and dental labs (ЗТЛ).
 * Works autonomously over Telegram Bot / Web App without requiring full CRM migration.
 *
 * Key Invariants:
 * 1. 152-ФЗ Patient Data Anonymization: External couriers and lab techs receive tokenized initials
 *    and salted hashes; no raw diagnosis or passport data leaks to third parties.
 * 2. Role-Enforced State Machine: Doctor, Tech, Courier, and Admin have strict transition gates.
 * 3. Dead-Man SLA Early Warning: Automated risk detection (<24h to chair visit without delivery).
 * 4. HMAC-Signed QR Code Payloads: Verifiable QR stickers on physical boxes / trays (лоток №3).
 * 5. Production Defect Logging: Instant stop-the-line mechanism on impression / margin defect.
 */

import crypto from "node:crypto";
import { z } from "zod";
import { generateSecureAlphanumericId } from "../utils/idGenerators.js";
import {
	type ImpressionType,
	type ProstheticConstructionType,
	type ProstheticMaterial,
	type VitaClassicalShade,
	type VitaBleachShade,
	type StumpNaturalDieShade,
	impressionTypeSchema,
	prostheticConstructionTypeSchema,
	prostheticMaterialSchema,
	vitaClassicalShadeSchema,
	vitaBleachShadeSchema,
	stumpNaturalDieShadeSchema,
} from "./labOrders.js";

// ─── 1. ROLES & PERMITTED ACTORS ──────────────────────────────────────────────

export const labActorRoleSchema = z.enum([
	"doctor",        // Врач-ортопед / стоматолог
	"technician",    // Зубной техник в ЗТЛ
	"courier",       // Курьер доставки
	"clinic_admin",  // Администратор / куратор клиники
	"system_cron",   // Автономный фоновый сторож SLA
]);
export type LabActorRole = z.infer<typeof labActorRoleSchema>;

// ─── 2. NINE CANONICAL TRACKING STAGES ────────────────────────────────────────

export const autonomousLabStageSchema = z.enum([
	"created",               // Наряд сформирован в клинике
	"courier_assigned",      // Курьер назначен на забор слепка/скана
	"in_transit_to_lab",     // Курьер забрал слепок, везет в ЗТЛ
	"received_by_lab",       // Техник принял слепок/скан в ЗТЛ
	"in_production",         // В работе: гипсовка / CAD-моделировка / спекание
	"ready_in_lab",          // Изделие изготовлено, упаковано в ЗТЛ
	"in_transit_to_clinic",  // Курьер везет готовую работу в клинику
	"delivered_to_clinic",   // Доставлено в клинику, помещено в лоток
	"fitted_to_patient",     // Успешно установлено пациенту в кресле
	"rework_flagged",        // Зафиксирован брак / требуется переделка
]);
export type AutonomousLabStage = z.infer<typeof autonomousLabStageSchema>;

export const AUTONOMOUS_STAGE_LABELS_RU: Record<AutonomousLabStage, { label: string; badge: string }> = {
	created: { label: "Заказ-наряд создан", badge: "Новый" },
	courier_assigned: { label: "Курьер назначен", badge: "Ожидает забора" },
	in_transit_to_lab: { label: "В пути в лабораторию", badge: "В пути" },
	received_by_lab: { label: "Принят в ЗТЛ", badge: "В ЗТЛ" },
	in_production: { label: "В производстве", badge: "Моделировка/Спекание" },
	ready_in_lab: { label: "Готов в лаборатории", badge: "Готов к отправке" },
	in_transit_to_clinic: { label: "В пути в клинику", badge: "Доставка" },
	delivered_to_clinic: { label: "В клинике (в лотке)", badge: "В клинике" },
	fitted_to_patient: { label: "Сдан пациенту", badge: "Завершён" },
	rework_flagged: { label: "Приостановлен / Брак", badge: "Переделка" },
};

// ─── 3. SLA RISK LEVELS ──────────────────────────────────────────────────────

export const labSlaRiskLevelSchema = z.enum([
	"safe",                  // С запасом (> 48 часов до визита)
	"warning_approaching",   // Приближается дедлайн (24–48 часов)
	"critical_under_24h",    // Критический риск (< 24 часов до приёма)
	"breached_overdue",      // Дедлайн сорван (время визита наступило, а работы нет)
]);
export type LabSlaRiskLevel = z.infer<typeof labSlaRiskLevelSchema>;

// ─── 4. 152-ФЗ DE-IDENTIFICATION & TOKENIZATION ──────────────────────────────

export const deidentifiedPatientSchema = z.object({
	tokenizedInitials: z.string().min(3),
	anonymizedSaltedHash: z.string().length(64),
});
export type DeidentifiedPatient = z.infer<typeof deidentifiedPatientSchema>;

export function anonymizePatientForExternalLab(
	fullName: string,
	salt: string = "dente-salt-152fz",
): DeidentifiedPatient {
	const trimmed = fullName.trim();
	const parts = trimmed.split(/\s+/);
	let tokenizedInitials = "П*****т";

	if (parts.length >= 3) {
		const lastName = parts[0]!;
		const firstName = parts[1]!;
		const patronymic = parts[2]!;
		const maskedLastName = lastName.length > 2
			? `${lastName[0]}***${lastName[lastName.length - 1]}`
			: `${lastName[0]}*`;
		tokenizedInitials = `${maskedLastName} ${firstName[0]}. ${patronymic[0]}.`;
	} else if (parts.length === 2) {
		const lastName = parts[0]!;
		const firstName = parts[1]!;
		const maskedLastName = lastName.length > 2
			? `${lastName[0]}***${lastName[lastName.length - 1]}`
			: `${lastName[0]}*`;
		tokenizedInitials = `${maskedLastName} ${firstName[0]}.`;
	} else if (parts.length === 1 && parts[0]) {
		const lastName = parts[0];
		tokenizedInitials = `${lastName[0]}***`;
	}

	const hash = crypto.createHmac("sha256", salt).update(trimmed.toLowerCase()).digest("hex");
	return { tokenizedInitials, anonymizedSaltedHash: hash };
}

// ─── 5. TRACKING STAGE TRANSITION AUDIT LOG ──────────────────────────────────

export const stageTransitionLogSchema = z.object({
	stage: autonomousLabStageSchema,
	timestamp: z.string().datetime(),
	actorRole: labActorRoleSchema,
	actorName: z.string(),
	notes: z.string().optional(),
	photoProofUrl: z.string().url().optional(),
	locationTag: z.string().optional(),
});
export type StageTransitionLog = z.infer<typeof stageTransitionLogSchema>;

// ─── 6. PRODUCTION DEFECT SCHEMA ─────────────────────────────────────────────

export const productionDefectSchema = z.object({
	reportedAt: z.string().datetime(),
	reportedByRole: labActorRoleSchema,
	reportedByName: z.string(),
	reasonCategory: z.enum([
		"unclear_margin",      // Нечеткий уступ / край препарирования
		"bubble_distortion",   // Поры / оттяжки слепочной массы
		"shade_ambiguity",     // Неоднозначность расцветки / фото
		"scan_occlusion_gap",  // Недоскан окклюзии / разрыв сетки STL
		"ceramic_chipping",    // Скол керамики при примерке
		"fit_loose_tight",     // Не садится на культю / балансирует
		"other",
	]),
	description: z.string().min(5),
	proofPhotoUrl: z.string().url().optional(),
	isBlocking: z.boolean().default(true),
});
export type ProductionDefect = z.infer<typeof productionDefectSchema>;

// ─── 7. AUTONOMOUS LAB ORDER SCHEMA ──────────────────────────────────────────

export const autonomousLabOrderSchema = z.object({
	orderId: z.string().min(1),
	orderRef: z.string().regex(/^L-[A-Z0-9]{4,8}$/),
	organizationId: z.string().min(1),
	branchName: z.string().default("Основной филиал"),
	patientToken: deidentifiedPatientSchema,
	doctorName: z.string().min(2),
	doctorTelegramChatId: z.string().optional(),
	labName: z.string().min(2),
	labTelegramChatId: z.string().optional(),
	technicianName: z.string().optional(),
	courierName: z.string().optional(),
	courierPhone: z.string().optional(),
	teethFdi: z.array(z.number().int().min(11).max(85)).min(1),
	constructionType: prostheticConstructionTypeSchema,
	material: prostheticMaterialSchema,
	shade: z.object({
		vitaShade: vitaClassicalShadeSchema,
		bleachShade: vitaBleachShadeSchema.optional(),
		stumpShade: stumpNaturalDieShadeSchema.optional(),
		shadeNotes: z.string().optional(),
	}),
	impression: z.object({
		type: impressionTypeSchema,
		boxCount: z.number().int().min(0).default(1),
		digitalScanKey: z.string().optional(),
	}),
	clinicTrayNumber: z.string().default("Лоток не назначен"),
	patientAppointmentAt: z.string().datetime(),
	requiredDeliveryDeadlineAt: z.string().datetime(),
	currentStage: autonomousLabStageSchema.default("created"),
	history: z.array(stageTransitionLogSchema).default([]),
	slaRiskLevel: labSlaRiskLevelSchema.default("safe"),
	activeDefect: productionDefectSchema.optional(),
	qrSecretKey: z.string().min(8),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type AutonomousLabOrder = z.infer<typeof autonomousLabOrderSchema>;

// ─── 8. PERMITTED TRANSITIONS MATRIX (ROLE-BASED) ────────────────────────────

const PERMITTED_STAGE_TRANSITIONS: Record<
	AutonomousLabStage,
	{ allowedNext: AutonomousLabStage[]; allowedRoles: LabActorRole[] }
> = {
	created: { allowedNext: ["courier_assigned", "in_transit_to_lab", "received_by_lab", "rework_flagged"], allowedRoles: ["doctor", "clinic_admin"] },
	courier_assigned: { allowedNext: ["in_transit_to_lab", "rework_flagged"], allowedRoles: ["courier", "clinic_admin", "doctor"] },
	in_transit_to_lab: { allowedNext: ["received_by_lab", "rework_flagged"], allowedRoles: ["technician", "courier", "clinic_admin"] },
	received_by_lab: { allowedNext: ["in_production", "rework_flagged"], allowedRoles: ["technician"] },
	in_production: { allowedNext: ["ready_in_lab", "rework_flagged"], allowedRoles: ["technician"] },
	ready_in_lab: { allowedNext: ["in_transit_to_clinic", "delivered_to_clinic", "rework_flagged"], allowedRoles: ["technician", "courier", "clinic_admin"] },
	in_transit_to_clinic: { allowedNext: ["delivered_to_clinic", "rework_flagged"], allowedRoles: ["courier", "clinic_admin", "doctor"] },
	delivered_to_clinic: { allowedNext: ["fitted_to_patient", "rework_flagged"], allowedRoles: ["doctor", "clinic_admin"] },
	fitted_to_patient: { allowedNext: ["rework_flagged"], allowedRoles: ["doctor", "clinic_admin"] },
	rework_flagged: { allowedNext: ["created", "in_production", "received_by_lab"], allowedRoles: ["doctor", "technician", "clinic_admin"] },
};

// ─── 9. CORE ENGINE LOGIC FUNCTIONS ──────────────────────────────────────────

export interface CreateAutonomousOrderParams {
	organizationId: string;
	branchName?: string | undefined;
	patientFullName: string;
	doctorName: string;
	doctorTelegramChatId?: string | undefined;
	labName: string;
	labTelegramChatId?: string | undefined;
	teethFdi: number[];
	constructionType: ProstheticConstructionType;
	material: ProstheticMaterial;
	vitaShade: VitaClassicalShade;
	bleachShade?: VitaBleachShade | undefined;
	stumpShade?: StumpNaturalDieShade | undefined;
	shadeNotes?: string | undefined;
	impressionType: ImpressionType;
	boxCount?: number | undefined;
	digitalScanKey?: string | undefined;
	patientAppointmentAt: string;
	requiredDeliveryDeadlineAt?: string | undefined;
	clinicTrayNumber?: string | undefined;
	salt?: string | undefined;
}

export function createAutonomousLabOrder(params: CreateAutonomousOrderParams): AutonomousLabOrder {
	const orderId = `lab_${generateSecureAlphanumericId(12)}`;
	const shortCode = generateSecureAlphanumericId(5).toUpperCase();
	const orderRef = `L-${shortCode}`;
	const nowIso = new Date().toISOString();

	// Деперсонализация ПДн по 152-ФЗ
	const patientToken = anonymizePatientForExternalLab(params.patientFullName, params.salt);

	// Если дедлайн не указан, ставим за 24 часа до визита пациента
	const appointmentDate = new Date(params.patientAppointmentAt);
	let deadlineIso = params.requiredDeliveryDeadlineAt;
	if (!deadlineIso) {
		const defaultDeadline = new Date(appointmentDate.getTime() - 24 * 3600 * 1000);
		deadlineIso = defaultDeadline.toISOString();
	}

	const initialHistory: StageTransitionLog = {
		stage: "created",
		timestamp: nowIso,
		actorRole: "doctor",
		actorName: params.doctorName,
		notes: "Заказ-наряд создан врачом в клинике",
	};

	const secretKey = crypto.randomBytes(16).toString("hex");

	const order: AutonomousLabOrder = {
		orderId,
		orderRef,
		organizationId: params.organizationId,
		branchName: params.branchName ?? "Основной филиал",
		patientToken,
		doctorName: params.doctorName,
		doctorTelegramChatId: params.doctorTelegramChatId,
		labName: params.labName,
		labTelegramChatId: params.labTelegramChatId,
		teethFdi: params.teethFdi,
		constructionType: params.constructionType,
		material: params.material,
		shade: {
			vitaShade: params.vitaShade,
			bleachShade: params.bleachShade,
			stumpShade: params.stumpShade,
			shadeNotes: params.shadeNotes,
		},
		impression: {
			type: params.impressionType,
			boxCount: params.boxCount ?? 1,
			digitalScanKey: params.digitalScanKey,
		},
		clinicTrayNumber: params.clinicTrayNumber ?? "Лоток №1",
		patientAppointmentAt: params.patientAppointmentAt,
		requiredDeliveryDeadlineAt: deadlineIso,
		currentStage: "created",
		history: [initialHistory],
		slaRiskLevel: "safe",
		qrSecretKey: secretKey,
		createdAt: nowIso,
		updatedAt: nowIso,
	};

	return autonomousLabOrderSchema.parse(order);
}

/**
 * Валидация и перевод этапа заказ-наряда.
 */
export function advanceLabOrderStage(
	order: AutonomousLabOrder,
	nextStage: AutonomousLabStage,
	actorRole: LabActorRole,
	actorName: string,
	options?: {
		notes?: string | undefined;
		photoProofUrl?: string | undefined;
		locationTag?: string | undefined;
		assignedTray?: string | undefined;
	},
): AutonomousLabOrder {
	const transitionRule = PERMITTED_STAGE_TRANSITIONS[order.currentStage];
	if (!transitionRule.allowedNext.includes(nextStage)) {
		throw new Error(
			`Недопустимый переход этапа: из '${order.currentStage}' в '${nextStage}'. Разрешены: [${transitionRule.allowedNext.join(", ")}]`,
		);
	}

	if (nextStage === "rework_flagged") {
		if (!["doctor", "technician", "clinic_admin"].includes(actorRole)) {
			throw new Error(`Роль '${actorRole}' не имеет прав для фиксации брака или переделки.`);
		}
	} else if (!transitionRule.allowedRoles.includes(actorRole)) {
		throw new Error(
			`Роль '${actorRole}' не имеет прав для перевода этапа из '${order.currentStage}' в '${nextStage}'. Требуется роль: [${transitionRule.allowedRoles.join(", ")}]`,
		);
	}

	const nowIso = new Date().toISOString();
	const newHistoryEntry: StageTransitionLog = {
		stage: nextStage,
		timestamp: nowIso,
		actorRole,
		actorName,
		notes: options?.notes,
		photoProofUrl: options?.photoProofUrl,
		locationTag: options?.locationTag,
	};

	const updated: AutonomousLabOrder = {
		...order,
		currentStage: nextStage,
		clinicTrayNumber: options?.assignedTray ?? order.clinicTrayNumber,
		activeDefect: nextStage === "rework_flagged" ? order.activeDefect : undefined,
		history: [...order.history, newHistoryEntry],
		updatedAt: nowIso,
	};

	// Пересчитываем SLA
	updated.slaRiskLevel = evaluateLabSlaRisk(updated, new Date());
	return autonomousLabOrderSchema.parse(updated);
}

/**
 * Расчет риска срыва SLA до визита пациента.
 */
export function evaluateLabSlaRisk(order: AutonomousLabOrder, now: Date = new Date()): LabSlaRiskLevel {
	// Если работа уже в клинике или установлена — риск отсутствует
	if (order.currentStage === "delivered_to_clinic" || order.currentStage === "fitted_to_patient") {
		return "safe";
	}

	const appointmentTime = new Date(order.patientAppointmentAt).getTime();
	const currentTime = now.getTime();
	const msRemaining = appointmentTime - currentTime;
	const hoursRemaining = msRemaining / (1000 * 3600);

	if (hoursRemaining <= 0) {
		return "breached_overdue";
	}
	if (hoursRemaining < 24) {
		return "critical_under_24h";
	}
	if (hoursRemaining < 48) {
		return "warning_approaching";
	}
	return "safe";
}

/**
 * Формирование защищенной подписи QR-кода на коробку/лоток.
 */
export function generateLabQrPayload(orderRef: string, secretKey: string): string {
	const timestamp = Math.floor(Date.now() / 1000);
	const signature = crypto
		.createHmac("sha256", secretKey)
		.update(`${orderRef}:${timestamp}`)
		.digest("hex")
		.substring(0, 16);
	return `DNT-LAB:${orderRef}:${timestamp}:${signature}`;
}

/**
 * Верификация отсканированного QR-кода.
 */
export function verifyLabQrPayload(
	payload: string,
	expectedOrderRef: string,
	secretKey: string,
	maxAgeSeconds: number = 86400 * 30, // 30 дней валидности стикера
): boolean {
	const parts = payload.split(":");
	if (parts.length !== 4 || parts[0] !== "DNT-LAB") {
		return false;
	}
	const [, orderRef, tsStr, signature] = parts;
	if (orderRef !== expectedOrderRef) {
		return false;
	}

	const timestamp = Number.parseInt(tsStr ?? "0", 10);
	if (Number.isNaN(timestamp)) {
		return false;
	}

	const now = Math.floor(Date.now() / 1000);
	if (now - timestamp > maxAgeSeconds) {
		return false;
	}

	const expectedSignature = crypto
		.createHmac("sha256", secretKey)
		.update(`${orderRef}:${timestamp}`)
		.digest("hex")
		.substring(0, 16);

	return signature === expectedSignature;
}

/**
 * Генерация структурированных сообщений для Telegram бота.
 */
export function formatLabTelegramAlert(
	order: AutonomousLabOrder,
	targetRole: "doctor" | "technician" | "courier" | "clinic_admin",
): string {
	const stageInfo = AUTONOMOUS_STAGE_LABELS_RU[order.currentStage];
	const teeth = order.teethFdi.join(", ");
	const visitDateStr = new Date(order.patientAppointmentAt).toLocaleString("ru-RU", {
		timeZone: "Europe/Moscow",
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

	if (targetRole === "doctor") {
		if (order.currentStage === "delivered_to_clinic") {
			return `📦 Работа прибыла в клинику!\nНаряд: #${order.orderRef}\nПациент: ${order.patientToken.tokenizedInitials}\nЗубы: ${teeth} (${order.constructionType})\nЦвет: ${order.shade.vitaShade}\n📍 Локация: ${order.clinicTrayNumber}\n📅 Приём: ${visitDateStr}`;
		}
		if (order.slaRiskLevel === "critical_under_24h") {
			return `⚠️ ВНИМАНИЕ: Дедлайн менее 24ч!\nНаряд: #${order.orderRef} (${order.patientToken.tokenizedInitials})\nСтатус: ${stageInfo.label}\n📅 Приём: ${visitDateStr}\nСвяжитесь с лабораторией ${order.labName}`;
		}
		return `🔔 Заказ-наряд #${order.orderRef}\nПациент: ${order.patientToken.tokenizedInitials}\nСтатус: ${stageInfo.label}\nЗубы: ${teeth}\nЦвет: ${order.shade.vitaShade}\nЛоток: ${order.clinicTrayNumber}`;
	}

	if (targetRole === "technician") {
		return `🛠 Наряд #${order.orderRef} от клиники (${order.branchName})\nВрач: ${order.doctorName}\nЗубы: ${teeth} (${order.material})\nЦвет: ${order.shade.vitaShade}\nСрок сдачи в клинику: ${new Date(order.requiredDeliveryDeadlineAt).toLocaleDateString("ru-RU")}`;
	}

	if (targetRole === "courier") {
		return `🛵 Заказ #${order.orderRef} на доставку\nОткуда: ${order.labName}\nКуда: ${order.branchName}\nМест: ${order.impression.boxCount}\nЛоток сдачи: ${order.clinicTrayNumber}`;
	}

	return `📋 Мониторинг ЗТЛ: Наряд #${order.orderRef}\nСтатус: ${stageInfo.label}\nВрач: ${order.doctorName}\nПациент: ${order.patientToken.tokenizedInitials}\nЛоток: ${order.clinicTrayNumber}`;
}
