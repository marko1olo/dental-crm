import { nonNegativeMoneyRubSchema } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import {
	createAlternativePlanGroup,
	getAlternativePlanGroupsForPatient,
	selectAndApprovePlanVariant,
} from "../../db/alternativeTreatmentPlansQuery.js";
import { db } from "../../db/client.js";
import {
	getActivePriceFreezeToken,
	issuePriceFreezeToken,
	setPlanDiscountMode,
} from "../../db/priceFreezeTokensQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import { UUID_SHAPE } from "./types.js";

export function registerPlanVariantRoutes(app: FastifyInstance) {
	/**
	 * Выбор и утверждение конкретного плана из группы альтернатив (ст. 20 323-ФЗ и ПП РФ №659)
	 * При утверждении одного плана остальные в группе автоматически отклоняются (Declined / Rejected)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/:planId/approve-variant",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"approve treatment plan variant",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.write",
					role: staffRole,
					message: `Отказ в утверждении плана лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const body = (request.body as { reason?: string | null } | undefined) ?? {};

			try {
				const result = await withTenantCtx(organizationId, async (tx) => {
					return selectAndApprovePlanVariant(tx, {
						organizationId,
						patientId,
						planId,
						actorUserId: identity.userId ?? null,
						reason: body.reason ?? null,
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "TREATMENT_PLAN_VARIANT_APPROVED",
					payload: { patientId, planId, result },
				});

				return reply.send(result);
			// biome-ignore lint/suspicious/noExplicitAny: error mapping
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "TreatmentPlanVariantSelectionError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);

	/**
	 * Создание группы альтернативных планов лечения (ст. 20 323-ФЗ и ПП РФ №659)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/alternative-group",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"create alternative treatment plan group",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.write",
					role: staffRole,
					message: `Отказ в создании группы планов лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const alternativePlanGroupSchema = z.object({
				groupName: z.string().trim().min(1, "Название группы планов лечения обязательно"),
				doctorId: z.string().uuid().optional().nullable(),
				variants: z
					.array(
						z.object({
							name: z.string().trim().min(1, "Название варианта обязательно"),
							alternativeTier: z.string().optional(),
							isInitiallyApproved: z.boolean().optional(),
							items: z.array(
								z.object({
									toothNumber: z.number().int().optional().nullable(),
									priceId: z.string().min(1, "priceId обязателен"),
									name: z.string().optional().nullable(),
									quantity: z.number().positive("Количество должно быть больше нуля"),
									price: z.number().nonnegative("Цена не может быть отрицательной"),
									discount: z.number().nonnegative("Скидка не может быть отрицательной").optional(),
									phase: z.number().optional(),
									isAuto: z.boolean().optional(),
								}),
							),
						}),
					)
					.min(2, "Необходимо указать минимум 2 альтернативных варианта плана лечения (ст. 20 323-ФЗ)"),
			});

			const parsedBody = alternativePlanGroupSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "AlternativePlanGroupValidationError",
					message:
						"Необходимо указать название группы и минимум 2 альтернативных варианта плана лечения (ст. 20 323-ФЗ).",
					details: parsedBody.error.issues,
				});
			}

			const body = parsedBody.data;

			try {
				const result = await withTenantCtx(organizationId, async (tx) => {
					return createAlternativePlanGroup(tx, {
						organizationId,
						patientId,
						doctorId: body.doctorId ?? null,
						groupName: body.groupName,
						variants: body.variants.map((v) => ({
							name: v.name,
							items: v.items.map((item) => ({
								toothNumber: item.toothNumber ?? null,
								priceId: item.priceId,
								name: item.name ?? null,
								quantity: item.quantity,
								price: item.price,
								...(item.discount !== undefined ? { discount: item.discount } : {}),
								...(item.phase !== undefined ? { phase: item.phase } : {}),
								...(item.isAuto !== undefined ? { isAuto: item.isAuto } : {}),
							})),
							...(v.alternativeTier ? { alternativeTier: v.alternativeTier } : {}),
							...(v.isInitiallyApproved !== undefined
								? { isInitiallyApproved: v.isInitiallyApproved }
								: {}),
						})),
						actorUserId: identity.userId ?? null,
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "ALTERNATIVE_PLAN_GROUP_CREATED",
					payload: { patientId, result },
				});

				return reply.send({ success: true, ...result });
			// biome-ignore lint/suspicious/noExplicitAny: error mapping
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "AlternativePlanGroupError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);

	/**
	 * Получение групп альтернативных планов для пациента
	 */
	app.get(
		"/api/patients/:patientId/treatment-plans/alternative-groups",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"get alternative plan groups",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.read",
					role: staffRole,
					message: `Отказ в чтении альтернативных планов (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const groups = await getAlternativePlanGroupsForPatient(
				db,
				organizationId,
				patientId,
			);

			return reply.send({ success: true, groups });
		},
	);

	/**
	 * Выпуск или обновление токена закрепления цен плана лечения (Price Freeze Token / GAP_REPORT строка 164)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/:planId/price-freeze",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"issue price freeze token",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.manage",
					role: staffRole,
					message: `Отказ в закреплении цен плана (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidRequestParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const priceFreezeBodySchema = z.object({
				policyKind: z
					.enum([
						"standard_30_days",
						"surgery_implant_90_days",
						"ortho_vip_180_days",
						"strict_fixed_contract",
						"market_floating",
					])
					.optional(),
				customValidityDays: z.number().int().positive().optional(),
				notes: z.string().trim().max(1000).optional(),
			});

			const parsedBody = priceFreezeBodySchema.safeParse(request.body || {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры закрепления цен.",
					details: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

			try {
				const result = await db.transaction(async (tx) => {
					return issuePriceFreezeToken(tx, {
						organizationId,
						patientId,
						planId,
						...(body.policyKind ? { policyKind: body.policyKind } : {}),
						...(body.customValidityDays !== undefined
							? { customValidityDays: body.customValidityDays }
							: {}),
						...(identity.userId ? { actorUserId: identity.userId } : {}),
						...(body.notes ? { notes: body.notes } : {}),
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "PRICE_FREEZE_TOKEN_ISSUED",
					organizationId,
					payload: {
						patientId,
						planId,
						token: result.token,
						policyKind: result.policyKind,
						validUntil: result.validUntil,
					},
				});

				return reply.code(201).send({ success: true, ...result });
			// biome-ignore lint/suspicious/noExplicitAny: error mapping
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "PriceFreezeError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);

	/**
	 * Получение текущего статуса закрепления цен плана (Price Freeze Token)
	 */
	app.get(
		"/api/patients/:patientId/treatment-plans/:planId/price-freeze",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"get price freeze status",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.read",
					role: staffRole,
					message: `Отказ в чтении статуса закрепления цен (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidRequestParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const tokenStatus = await getActivePriceFreezeToken(
				db,
				organizationId,
				planId,
			);

			return reply.send({
				success: true,
				hasActiveFreeze: !!tokenStatus && tokenStatus.isPriceLocked,
				token: tokenStatus,
			});
		},
	);

	/**
	 * Изменение режима скидок плана лечения (GAP_REPORT строка 165: none | plan_fixed | on_selection)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/:planId/discount-mode",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"set plan discount mode",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.manage",
					role: staffRole,
					message: `Отказ в настройке скидок плана (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidRequestParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const discountModeBodySchema = z.object({
				discountMode: z.enum(["none", "plan_fixed", "on_selection"]),
				planDiscountPercent: z.number().min(0).max(100).optional(),
				planDiscountRub: nonNegativeMoneyRubSchema.optional(),
			});

			const parsedBody = discountModeBodySchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "InvalidDiscountMode",
					message:
						"Недопустимый режим скидок. Разрешены: 'none' (скидки не действуют), 'plan_fixed' (задать на план), 'on_selection' (при выборе в наряд).",
					details: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

			try {
				const result = await db.transaction(async (tx) => {
					return setPlanDiscountMode(tx, {
						organizationId,
						patientId,
						planId,
						discountMode: body.discountMode,
						...(body.planDiscountPercent !== undefined
							? { planDiscountPercent: body.planDiscountPercent }
							: {}),
						...(body.planDiscountRub !== undefined
							? { planDiscountRub: body.planDiscountRub }
							: {}),
						...(identity.userId ? { actorUserId: identity.userId } : {}),
					});
				});

				wsBroker.broadcastToOrganization(organizationId, {
					type: "TREATMENT_PLAN_DISCOUNT_MODE_CHANGED",
					organizationId,
					payload: {
						patientId,
						planId,
						discountMode: result.discountMode,
						planDiscountPercent: result.planDiscountPercent,
						totalDiscountRub: result.totalDiscountRub,
						totalPriceRub: result.totalPriceRub,
					},
				});

				return reply.send(result);
			// biome-ignore lint/suspicious/noExplicitAny: error mapping
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "DiscountModeError",
						message: err.message,
					});
				}
				throw err;
			}
		},
	);
}
