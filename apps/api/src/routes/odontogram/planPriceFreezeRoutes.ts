import { nonNegativeMoneyRubSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import {
	getActivePriceFreezeToken,
	issuePriceFreezeToken,
	setPlanDiscountMode,
} from "../../db/priceFreezeTokensQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { treatmentPlans } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import { UUID_SHAPE } from "./types.js";

interface CustomHttpError {
	statusCode?: number;
	message?: string;
}

const priceFreezeBodySchema = z
	.object({
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
	})
	.strict();

const discountModeBodySchema = z
	.object({
		discountMode: z.enum(["none", "plan_fixed", "on_selection"]),
		planDiscountPercent: z.number().min(0).max(100).optional(),
		planDiscountRub: nonNegativeMoneyRubSchema.optional(),
	})
	.strict();

function resolveStaffRole(request: FastifyRequest): string | null {
	const identity = getRequestIdentity(request);
	if (identity.role) return identity.role;
	if (
		"user" in request &&
		typeof request.user === "object" &&
		request.user !== null &&
		"role" in request.user
	) {
		const role = (request.user as { role?: unknown }).role;
		return typeof role === "string" ? role : null;
	}
	return null;
}

function hasRegisteredRoute(
	app: FastifyInstance,
	method: "GET" | "POST",
	url: string,
): boolean {
	const maybeHasRoute = (
		app as unknown as {
			hasRoute?: (opts: { method: string; url: string }) => boolean;
		}
	).hasRoute;
	return typeof maybeHasRoute === "function"
		? maybeHasRoute.call(app, { method, url })
		: false;
}

export function registerPlanPriceFreezeRoutes(app: FastifyInstance): void {
	const freezeUrl =
		"/api/patients/:patientId/treatment-plans/:planId/price-freeze";
	const discountUrl =
		"/api/patients/:patientId/treatment-plans/:planId/discount-mode";

	if (!hasRegisteredRoute(app, "POST", freezeUrl)) {
		app.post<{ Params: { patientId: string; planId: string } }>(
			freezeUrl,
			async (request, reply) => {
				const organizationId = await requireResolvedOrganizationId(
					request,
					reply,
					"issue price freeze token",
				);
				if (!organizationId) return;

				const identity = getRequestIdentity(request);
				const staffRole = resolveStaffRole(request);
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.treatment_plan.manage",
						role: staffRole,
						message: `Отказ в закреплении цен плана: ${evalAccess.reason}`,
					});
				}

				const { patientId, planId } = request.params;
				if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
					return reply.code(400).send({ error: "InvalidRequestParameters" });
				}

				const parsedBody = priceFreezeBodySchema.safeParse(request.body ?? {});
				if (!parsedBody.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректные параметры закрепления цен.",
						details: parsedBody.error.issues,
					});
				}
				const body = parsedBody.data;

				try {
					const txResult = await withTenantCtx(organizationId, async (tx) => {
						if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
							return { kind: "patient_not_found" as const };
						}
						const tokenResult = await issuePriceFreezeToken(tx, {
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
						return { kind: "ok" as const, result: tokenResult };
					});

					if (txResult.kind === "patient_not_found") {
						return reply.code(404).send({ error: "PatientNotFound" });
					}
					const { result } = txResult;

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
				} catch (err: unknown) {
					const httpErr =
						typeof err === "object" && err !== null
							? (err as CustomHttpError)
							: undefined;
					if (typeof httpErr?.statusCode === "number") {
						return reply.code(httpErr.statusCode).send({
							error: "PriceFreezeError",
							message: httpErr.message,
						});
					}
					throw err;
				}
			},
		);
	}

	if (!hasRegisteredRoute(app, "GET", freezeUrl)) {
		app.get<{ Params: { patientId: string; planId: string } }>(
			freezeUrl,
			async (request, reply) => {
				const organizationId = await requireResolvedOrganizationId(
					request,
					reply,
					"get price freeze status",
				);
				if (!organizationId) return;

				const staffRole = resolveStaffRole(request);
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.treatment_plan.read",
						role: staffRole,
						message: `Отказ в чтении статуса закрепления цен: ${evalAccess.reason}`,
					});
				}

				const { patientId, planId } = request.params;
				if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
					return reply.code(400).send({ error: "InvalidRequestParameters" });
				}

				const freezeState = await withTenantCtx(
					organizationId,
					async (tx) => {
						if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
							return { kind: "patient_not_found" as const };
						}
						const [plan] = await tx
							.select({ id: treatmentPlans.id })
							.from(treatmentPlans)
							.where(
								and(
									eq(treatmentPlans.id, planId),
									eq(treatmentPlans.patientId, patientId),
									eq(treatmentPlans.organizationId, organizationId),
								),
							)
							.limit(1);

						if (!plan) return { kind: "plan_not_found" as const };

						const status = await getActivePriceFreezeToken(
							tx,
							organizationId,
							planId,
							patientId,
						);
						return { kind: "ok" as const, tokenStatus: status };
					},
				);

				if (freezeState.kind === "patient_not_found") {
					return reply.code(404).send({ error: "PatientNotFound" });
				}
				if (freezeState.kind === "plan_not_found") {
					return reply.code(404).send({
						error: "TreatmentPlanNotFound",
						message: "План лечения не найден для указанного пациента",
					});
				}
				const { tokenStatus } = freezeState;

				return reply.send({
					success: true,
					hasActiveFreeze: Boolean(tokenStatus && tokenStatus.isPriceLocked),
					token: tokenStatus,
				});
			},
		);
	}

	if (!hasRegisteredRoute(app, "POST", discountUrl)) {
		app.post<{ Params: { patientId: string; planId: string } }>(
			discountUrl,
			async (request, reply) => {
				const organizationId = await requireResolvedOrganizationId(
					request,
					reply,
					"set plan discount mode",
				);
				if (!organizationId) return;

				const identity = getRequestIdentity(request);
				const staffRole = resolveStaffRole(request);
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.treatment_plan.manage",
						role: staffRole,
						message: `Отказ в настройке скидок плана: ${evalAccess.reason}`,
					});
				}

				const { patientId, planId } = request.params;
				if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
					return reply.code(400).send({ error: "InvalidRequestParameters" });
				}

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
					const txOutcome = await withTenantCtx(organizationId, async (tx) => {
						if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
							return { kind: "patient_not_found" as const };
						}
						const discountResult = await setPlanDiscountMode(tx, {
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
						return { kind: "ok" as const, result: discountResult };
					});

					if (txOutcome.kind === "patient_not_found") {
						return reply.code(404).send({ error: "PatientNotFound" });
					}
					const { result } = txOutcome;

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
				} catch (err: unknown) {
					const httpErr =
						typeof err === "object" && err !== null
							? (err as CustomHttpError)
							: undefined;
					if (typeof httpErr?.statusCode === "number") {
						return reply.code(httpErr.statusCode).send({
							error: "DiscountModeError",
							message: httpErr.message,
						});
					}
					throw err;
				}
			},
		);
	}
}
