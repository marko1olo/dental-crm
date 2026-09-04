/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTAL LAB EXPRESS ROUTES (ЗТЛ, Ортопедия, Элайнеры & Мандат 8e)
 * Mandate 8e Invariants:
 * 1. Expiration of 30 days from treatment plan creation does NOT block
 *    dental lab orders, clinical services, or payments. Artificial chief
 *    physician (начмед) or senior technician approvals are strictly banned.
 * 2. Orthopedist creates lab orders in 3 clicks:
 *    Tooth/Bridge + Construction + VITA Shade + Due Date (default 5 working days).
 * 3. Standard 1-click preset:
 *    «Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней».
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from "node:crypto";
import {
	isValidVitaShade,
	nonNegativeMoneyRubSchema,
	VALID_FDI_TOOTH_NUMBERS,
	VITA_SHADE_VALIDATION_MESSAGE,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { labOrders, patients, users } from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import { wsBroker } from "../services/websocketBroker.js";

/**
 * Calculates deadline skipping weekends (Saturday & Sunday).
 */
export function calculateBusinessDaysDueDate(startDate: Date, businessDays = 5): Date {
	const result = new Date(startDate);
	let added = 0;
	while (added < businessDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

export const CANONICAL_DENTAL_LAB_PRESETS = [
	{
		id: "zirconia_a2_std",
		nameRu: "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней",
		shortTitle: "Коронка ZrO2 (Katana/Prettau)",
		constructionType: "crown_zirconia",
		material: "Диоксид циркония Multi-Layer (Katana ML)",
		colorVita: "A2",
		stumpShade: "ND2",
		turnaroundBusinessDays: 5,
		isOneClickDefault: true,
		suggestedPriceRub: 24000,
		suggestedCostRub: 7500,
		specialInstructions:
			"Анатомическая форма с выраженными краевыми валиками, микротекстура, режущий край 0.8 мм транслуцентность.",
	},
	{
		id: "emax_a1_aesthetic",
		nameRu: "IPS e.max Press / CAD, цвет А1, высокоэстетичная цельная керамика, срок 5 рабочих дней",
		shortTitle: "IPS e.max Press",
		constructionType: "crown_emax",
		material: "Дисиликат лития IPS e.max Press",
		colorVita: "A1",
		stumpShade: "ND1",
		turnaroundBusinessDays: 5,
		isOneClickDefault: false,
		suggestedPriceRub: 26000,
		suggestedCostRub: 8500,
		specialInstructions: "Фронтальная группа зубов, естественная опалесценция, микрорельеф.",
	},
	{
		id: "metal_ceramic_a3",
		nameRu: "Металлокерамика Co-Cr Noritake, цвет А3, срок 7 рабочих дней",
		shortTitle: "Металлокерамика Co-Cr",
		constructionType: "metal_ceramic",
		material: "КХС каркас с послойным нанесением керамики Noritake EX-3",
		colorVita: "A3",
		stumpShade: null,
		turnaroundBusinessDays: 7,
		isOneClickDefault: false,
		suggestedPriceRub: 15000,
		suggestedCostRub: 5000,
		specialInstructions: "Гирлянда 0.5 мм, промывное пространство под промежуточной частью.",
	},
	{
		id: "clasp_denture_bredent",
		nameRu: "Бюгельный протез с замковыми креплениями Bredent, срок 10 рабочих дней",
		shortTitle: "Бюгельный протез",
		constructionType: "clasp_denture",
		material: "Литой Co-Cr каркас с микрозамками Bredent VKS-SG",
		colorVita: "A2",
		stumpShade: null,
		turnaroundBusinessDays: 10,
		isOneClickDefault: false,
		suggestedPriceRub: 32000,
		suggestedCostRub: 11000,
		specialInstructions: "Оригинальные замки Bredent, гарнитурные зубы Ivoclar.",
	},
	{
		id: "orthodontic_aligners",
		nameRu: "Ортодонтические элайнеры / Каппы / Сплинты, срок 5 рабочих дней",
		shortTitle: "Элайнеры / Сплинт",
		constructionType: "aligners",
		material: "Медицинский термополиуретан Duran / Biolon",
		colorVita: "BL2",
		stumpShade: null,
		turnaroundBusinessDays: 5,
		isOneClickDefault: false,
		suggestedPriceRub: 45000,
		suggestedCostRub: 18000,
		specialInstructions: "Лазерная обрезка по десневому краю, полировка кромок.",
	},
] as const;

function validateFdiToothNotation(value: string | null | undefined): boolean {
	if (!value) return true;
	const parts = value.split(/[\s,;-]+/).filter(Boolean);
	if (parts.length === 0) return true;
	for (const part of parts) {
		const num = Number.parseInt(part, 10);
		if (Number.isNaN(num) || !VALID_FDI_TOOTH_NUMBERS.has(num)) {
			return false;
		}
	}
	return true;
}

const expressLabOrderSchema = z.object({
	patientId: z.string().uuid({ message: "Некорректный UUID пациента" }),
	doctorId: z.string().uuid().optional().nullable(),
	teethFdi: z
		.union([z.string().trim(), z.array(z.number())])
		.refine(
			(val) => {
				if (Array.isArray(val)) {
					return val.every((num) => VALID_FDI_TOOTH_NUMBERS.has(num));
				}
				return validateFdiToothNotation(val);
			},
			{ message: "Недопустимый номер зуба в нотации FDI (11–48, 51–85, 91–98)" },
		)
		.default("16"),
	construction: z.enum([
		"crown_zirconia",
		"crown_emax",
		"metal_ceramic",
		"clasp_denture",
		"aligners",
		"implant_abutment",
	]).default("crown_zirconia"),
	colorVita: z
		.string()
		.trim()
		.refine((val) => !val || isValidVitaShade(val), {
			message: VITA_SHADE_VALIDATION_MESSAGE,
		})
		.default("A2"),
	stumpShade: z.string().trim().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	priceRub: nonNegativeMoneyRubSchema.optional().nullable(),
	specialInstructions: z.string().trim().optional().nullable(),
	treatmentPlanAgeDays: z.number().int().nonnegative().optional().nullable(),
	isOneClickPreset: z.boolean().optional().default(false),
});

const checkPlanContinuitySchema = z.object({
	patientId: z.string().uuid(),
	treatmentPlanId: z.string().uuid().optional().nullable(),
	planAgeDays: z.number().int().nonnegative().optional().default(0),
});

export async function registerDentalLabRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinical/dental-lab/presets
	 * Каталог стандартных пресетов для 1-клик и 3-клик заказов ЗТЛ.
	 */
	app.get("/api/clinical/dental-lab/presets", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		return reply.status(200).send({
			presets: CANONICAL_DENTAL_LAB_PRESETS,
			mandate8eInfo: {
				rule: "Истечение 30 дней с момента составления плана лечения НЕ БЛОКИРУЕТ наряды ЗТЛ",
				standardPreset: CANONICAL_DENTAL_LAB_PRESETS[0],
				threeClickWorkflow: ["1. Зуб / Мост", "2. Конструкция", "3. Цвет VITA", "Срок сдачи: 5 раб. дней"],
			},
		});
	});

	/**
	 * POST /api/clinical/dental-lab/check-plan-continuity
	 * Проверка срока плана лечения с гарантией отсутствия блокировок по Мандату 8e.
	 */
	app.post(
		"/api/clinical/dental-lab/check-plan-continuity",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = checkPlanContinuitySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры проверки плана лечения.",
					details: parsed.error.issues,
				});
			}

			const { planAgeDays } = parsed.data;
			const isPlanExpired = planAgeDays > 30;

			// Mandate 8e: Plan expiration does NOT block lab orders, services, or payment!
			return reply.status(200).send({
				canProceed: true,
				blocked: false,
				isPlanExpired,
				planAgeDays,
				requiresChiefPhysicianApproval: false,
				requiresSeniorTechnicianApproval: false,
				mandate8eCompliant: true,
				noticeRu: isPlanExpired
					? `План лечения составлен ${planAgeDays} дн. назад (>30 дней). По Мандату 8e наряды ЗТЛ, оказание услуг и оплата продолжаются без блокировок и согласований.`
					: "План лечения активен. Ограничений на создание нарядов ЗТЛ нет.",
			});
		},
	);

	/**
	 * POST /api/clinical/dental-lab/express-order
	 * Создание наряда в ЗТЛ в 3 клика / 1-клик пресет без бюрократических барьеров.
	 */
	app.post("/api/clinical/dental-lab/express-order", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;

		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.write",
				role: staffRole,
				message: `Отказ в доступе к созданию наряда ЗТЛ (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
			});
		}

		const parsed = expressLabOrderSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры экспресс-заказа ЗТЛ.",
				details: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const teethFdiStr = Array.isArray(data.teethFdi) ? data.teethFdi.join(", ") : data.teethFdi;

		// Select preset or customized details
		let materialName = "Диоксид циркония Multi-Layer (Katana ML)";
		let defaultPriceRub = 24000;
		let turnaroundDays = 5;

		if (data.isOneClickPreset || data.construction === "crown_zirconia") {
			materialName = "Диоксид циркония Multi-Layer (Katana ML)";
			defaultPriceRub = 24000;
			turnaroundDays = 5;
		} else if (data.construction === "crown_emax") {
			materialName = "Дисиликат лития IPS e.max Press";
			defaultPriceRub = 26000;
			turnaroundDays = 5;
		} else if (data.construction === "metal_ceramic") {
			materialName = "КХС каркас с керамикой Noritake";
			defaultPriceRub = 15000;
			turnaroundDays = 7;
		} else if (data.construction === "clasp_denture") {
			materialName = "Бюгельный протез на замках Bredent";
			defaultPriceRub = 32000;
			turnaroundDays = 10;
		} else if (data.construction === "aligners") {
			materialName = "Ортодонтические элайнеры / Сплинт";
			defaultPriceRub = 45000;
			turnaroundDays = 5;
		}

		const calculatedDueDate = data.dueDate
			? new Date(data.dueDate)
			: calculateBusinessDaysDueDate(new Date(), turnaroundDays);

		const result = await withTenantCtx(orgId, async (tx) => {
			// Verify patient belongs to clinic
			const [patient] = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return { kind: "patient_not_found" as const };
			}

			// Verify doctor if provided
			let doctorName: string | null = null;
			if (data.doctorId) {
				const [doctor] = await tx
					.select({ id: users.id, fullName: users.fullName })
					.from(users)
					.where(and(eq(users.id, data.doctorId), eq(users.organizationId, orgId)))
					.limit(1);
				if (doctor) {
					doctorName = doctor.fullName;
				}
			}

			const secureToken = crypto.randomUUID();
			const finalPrice = data.priceRub ?? defaultPriceRub;

			const instructions = data.specialInstructions
				? data.specialInstructions
				: data.isOneClickPreset
					? "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней"
					: `Конструкция: ${data.construction}, цвет: ${data.colorVita}`;

			const [createdOrder] = await tx
				.insert(labOrders)
				.values({
					organizationId: orgId,
					patientId: data.patientId,
					doctorId: data.doctorId ?? null,
					doctorName: doctorName ?? "Врач-ортопед",
					secureToken,
					toothFdi: teethFdiStr,
					material: materialName,
					colorVita: data.colorVita.toUpperCase(),
					dueDate: calculatedDueDate,
					clinicalNotes: instructions,
					priceRub: finalPrice,
					status: "draft",
				})
				.returning();

			return { kind: "ok" as const, order: createdOrder, patientName: patient.fullName };
		});

		if (result.kind === "patient_not_found") {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в базе клиники.",
			});
		}

		const order = result.order;
		if (!order) {
			return reply.code(500).send({
				error: "OrderCreationFailed",
				message: "Не удалось сохранить заказ-наряд ЗТЛ.",
			});
		}

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			action: "CREATE_EXPRESS_LAB_ORDER",
			diagnosis: `Создан экспресс-наряд ЗТЛ #${order.id} на зубы ${teethFdiStr}`,
		});

		// WebSocket notification
		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_CREATED",
			payload: {
				orderId: order.id,
				patientId: data.patientId,
				toothFdi: teethFdiStr,
				material: materialName,
				dueDate: order.dueDate,
				status: order.status,
			},
		});

		const planAge = data.treatmentPlanAgeDays ?? 0;
		const isPlanExpired = planAge > 30;

		return reply.status(201).send({
			success: true,
			order,
			expressMetadata: {
				workflow: "3-Click Orthopedic Express Order",
				isOneClickPreset: data.isOneClickPreset,
				standardPresetTitle: "Коронка ZrO2, цвет А2, срок 5 рабочих дней",
				turnaroundBusinessDays: turnaroundDays,
				dueDateIso: calculatedDueDate.toISOString(),
				mandate8e: {
					isPlanExpired,
					planAgeDays: planAge,
					blocked: false,
					canProceed: true,
					guarantee:
						"Истечение 30 дней с момента составления плана лечения НЕ БЛОКИРУЕТ создание нарядов ЗТЛ (Мандат 8e). Запрещены согласования начмеда.",
				},
			},
		});
	});
}
