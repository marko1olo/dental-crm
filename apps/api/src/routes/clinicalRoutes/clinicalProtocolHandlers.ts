import {
	clinicalRuleEvaluationInputSchema,
	clinicalRuleEvaluationResponseSchema,
	clinicalRuleSchema,
	createClinicalRuleSchema,
	updateClinicalRuleSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	createClinicalRuleInDb,
	deleteClinicalRuleInDb,
	evaluateClinicalRulesInDb,
	getClinicalRules,
	updateClinicalRuleInDb,
} from "../../db/clinicalQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	UUID_PATTERN,
	clinicalRuleEvaluationValidationMessage,
	clinicalRuleMutationValidationMessage,
	parseClinicalPayload,
	resolveClinicalStaffRole,
} from "./types.js";

/**
 * Clinical protocols, statutory evaluation rules, EMR templates, and security enforcements.
 */
export async function registerClinicalProtocolRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/rules/evaluate",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"clinical rule evaluate",
					))
				)
					return reply;
				const input = parseClinicalPayload(
					clinicalRuleEvaluationInputSchema,
					request.body,
				);
				if (!input) {
					return reply.code(400).send({
						error: "ClinicalRuleValidationError",
						message: clinicalRuleEvaluationValidationMessage,
					});
				}
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return reply;
				const evaluation = await withTenantReadCtx(orgId, () =>
					evaluateClinicalRulesInDb(orgId, input),
				);
				const blockingRule = evaluation.evaluations.find(
					(e) => !e.resolved && e.severity === "blocker",
				);
				const hasWarnings = Boolean(
					blockingRule ||
						evaluation.summary.blockers > 0 ||
						evaluation.summary.warnings > 0,
				);
				const warningMessage = blockingRule
					? `Клиническое противопоказание: ${blockingRule.message}`
					: null;

				return reply.send(
					clinicalRuleEvaluationResponseSchema.parse({
						...evaluation,
						hasWarnings,
						warningMessage,
					}),
				);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при расчете клинических правил.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/rules",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"clinical rules read",
					))
				)
					return reply;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return reply;

				const rules = await withTenantReadCtx(orgId, (tx) =>
					getClinicalRules(orgId, tx),
				);
				return reply.status(200).send(rules);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при получении клинических правил.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/rules",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"clinical rule create",
					))
				)
					return reply;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return reply;

				const staffRole = resolveClinicalStaffRole(request);
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.rules.write",
						role: staffRole,
						message:
							"Управление клиническими правилами ограничено 152-ФЗ и 323-ФЗ: требуются права клинического персонала.",
					});
				}
				const input = parseClinicalPayload(
					createClinicalRuleSchema,
					request.body,
				);
				if (!input) {
					return reply.code(400).send({
						error: "ClinicalRuleValidationError",
						message: clinicalRuleMutationValidationMessage,
					});
				}
				const created = await withTenantWriteCtx(orgId, () =>
					createClinicalRuleInDb(orgId, input),
				);
				return reply.send(clinicalRuleSchema.parse(created));
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при создании клинического правила.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/clinical/rules/:ruleId",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"clinical rule update",
					))
				)
					return reply;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return reply;

				const staffRole = resolveClinicalStaffRole(request);
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.rules.write",
						role: staffRole,
						message:
							"Управление клиническими правилами ограничено 152-ФЗ и 323-ФЗ: требуются права клинического персонала.",
					});
				}

				const { ruleId } = request.params as { ruleId: string };
				if (!ruleId || !UUID_PATTERN.test(ruleId)) {
					return reply.code(400).send({
						error: "ClinicalRuleValidationError",
						message: "Ошибка валидации: ruleId должен быть UUID.",
					});
				}
				const body =
					request.body && typeof request.body === "object" ? request.body : {};
				const input = parseClinicalPayload(updateClinicalRuleSchema, {
					...body,
					id: ruleId,
				});
				if (!input) {
					return reply.code(400).send({
						error: "ClinicalRuleValidationError",
						message: clinicalRuleMutationValidationMessage,
					});
				}
				const updated = await withTenantWriteCtx(orgId, () =>
					updateClinicalRuleInDb(orgId, input),
				);
				return reply.send(clinicalRuleSchema.parse(updated));
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при обновлении клинического правила.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/clinical/rules/:ruleId",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"clinical rule delete",
					))
				)
					return reply;
				const { ruleId } = request.params as { ruleId: string };
				if (!ruleId || !UUID_PATTERN.test(ruleId)) {
					return reply.code(400).send({
						error: "ClinicalRuleValidationError",
						message: clinicalRuleMutationValidationMessage,
					});
				}
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return reply;

				const staffRole = resolveClinicalStaffRole(request);
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.rules.write",
						role: staffRole,
						message:
							"Управление клиническими правилами ограничено 152-ФЗ и 323-ФЗ: требуются права клинического персонала.",
					});
				}

				const deleted = await withTenantWriteCtx(orgId, () =>
					deleteClinicalRuleInDb(orgId, ruleId),
				);
				if (!deleted) {
					return reply.code(404).send({
						error: "ClinicalRuleNotFound",
						message: "Правило не найдено.",
					});
				}
				return reply.code(200).send({ id: ruleId, deleted: true });
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при удалении клинического правила.",
				});
			}
		},
	});

	const emrTemplatesQuerySchema = z
		.object({
			q: z.string().trim().max(200).optional(),
			category: z.string().trim().max(120).optional(),
		})
		.strict();

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/emr/templates",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"emr templates read",
				))
			) {
				return reply;
			}
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"emr templates read",
			);
			if (!orgId) return reply;

			const parsed = emrTemplatesQuerySchema.safeParse(request.query ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры фильтрации шаблонов ЭМК.",
					details: parsed.error.issues,
				});
			}

			const { q, category } = parsed.data;
			const { getStatutoryEmrTemplates } = await import(
				"../../services/clinical/statutoryCatalogs.js"
			);
			const items = getStatutoryEmrTemplates({
				...(q ? { q } : {}),
				...(category ? { category } : {}),
			});
			return reply.status(200).send(items);
		},
	});
}
