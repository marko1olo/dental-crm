import crypto from "node:crypto";
import { normalizeVitaShade } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { labOrders, patients, users } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	calculateBusinessDaysDueDate,
	CANONICAL_DENTAL_LAB_PRESETS,
	checkPlanContinuitySchema,
	expressLabOrderSchema,
} from "./types.js";

export async function registerExpressOrderRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinical/dental-lab/presets
	 * Каталог стандартных пресетов для 1-клик и 3-клик заказов ЗТЛ.
	 */
	app.get("/api/clinical/dental-lab/presets", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return reply;

		return reply.status(200).send({
			presets: CANONICAL_DENTAL_LAB_PRESETS,
			autonomyInfo: {
				rule: "Истечение 30 дней с момента составления плана лечения не блокирует наряды ЗТЛ",
				standardPreset: CANONICAL_DENTAL_LAB_PRESETS[0],
				threeClickWorkflow: ["1. Зуб / Мост", "2. Конструкция", "3. Цвет VITA", "Срок сдачи: 5 раб. дней"],
			},
			mandate8eInfo: {
				rule: "Истечение 30 дней с момента составления плана лечения не блокирует наряды ЗТЛ",
				standardPreset: CANONICAL_DENTAL_LAB_PRESETS[0],
				threeClickWorkflow: ["1. Зуб / Мост", "2. Конструкция", "3. Цвет VITA", "Срок сдачи: 5 раб. дней"],
			},
		});
	});

	/**
	 * POST /api/clinical/dental-lab/check-plan-continuity
	 * Проверка срока плана лечения без блокировок оформления нарядов.
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

			return reply.status(200).send({
				canProceed: true,
				blocked: false,
				isPlanExpired,
				planAgeDays,
				requiresChiefPhysicianApproval: false,
				requiresSeniorTechnicianApproval: false,
				autonomyCompliant: true,
				mandate8eCompliant: true,
				noticeRu: isPlanExpired
					? `План лечения составлен ${planAgeDays} дн. назад (>30 дней). Наряды ЗТЛ, оказание услуг и оплата продолжаются в штатном режиме без блокировок.`
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

			let instructions = data.specialInstructions
				? data.specialInstructions
				: data.isOneClickPreset
					? "Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней"
					: `Конструкция: ${data.construction}, цвет: ${data.colorVita}`;

			if (data.doctorClinicalOverride) {
				const overrideNote = `[Клиническое решение врача: ${data.doctorOverrideReason || "Аванс < 50% / Срочное изготовление по клиническим показаниям"}]`;
				instructions = `${instructions}\n${overrideNote}`;
			}

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
					colorVita: normalizeVitaShade(data.colorVita),
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
				autonomy: {
					isPlanExpired,
					planAgeDays: planAge,
					blocked: false,
					canProceed: true,
					doctorClinicalOverride: Boolean(data.doctorClinicalOverride),
					doctorOverrideReason: data.doctorOverrideReason ?? null,
					guarantee:
						"Истечение 30 дней с момента составления плана лечения не блокирует создание нарядов ЗТЛ.",
				},
				mandate8e: {
					isPlanExpired,
					planAgeDays: planAge,
					blocked: false,
					canProceed: true,
					doctorClinicalOverride: Boolean(data.doctorClinicalOverride),
					doctorOverrideReason: data.doctorOverrideReason ?? null,
					guarantee:
						"Истечение 30 дней с момента составления плана лечения не блокирует создание нарядов ЗТЛ.",
				},
			},
		});
	});
}
