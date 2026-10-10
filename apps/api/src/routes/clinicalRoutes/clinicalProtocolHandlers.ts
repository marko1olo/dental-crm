import {
	clinicalRuleEvaluationInputSchema,
	clinicalRuleEvaluationResponseSchema,
	clinicalRuleSchema,
	createClinicalRuleSchema,
	updateClinicalRuleSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import {
	createClinicalRuleInDb,
	deleteClinicalRuleInDb,
	evaluateClinicalRulesInDb,
	getClinicalRules,
	updateClinicalRuleInDb,
} from "../../db/clinicalQuery.js";
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
	app.post("/api/clinical/rules/evaluate", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"clinical rule evaluate",
				))
			)
				return;
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
			// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»
			// без учёта того, кто прислал запрос. Клиника Б проверяла противопоказания
			// по НАБОРУ ПРАВИЛ КЛИНИКИ А: её собственное правило «аллергия на артикаин —
			// блокирующее» в выборку не попадало, blocker не находился, и укол
			// с противопоказанием проходил проверку.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const evaluation = await evaluateClinicalRulesInDb(orgId, input);
			const blockingRule = evaluation.evaluations.find(
				(e) => !e.resolved && e.severity === "blocker",
			);
			if (blockingRule && input.enforceBlockers) {
				return reply.code(400).send({
					code: "ClinicalRuleBlocker",
					error: "ClinicalRuleBlocker",
					message: `Клиническое противопоказание: ${blockingRule.message}`,
					ruleId: blockingRule.ruleId,
					evaluation: blockingRule,
				});
			}
			return clinicalRuleEvaluationResponseSchema.parse(evaluation);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при расчете клинических правил.",
			});
		}
	});

	/**
	 * Получение списка клинических правил организации (противопоказания, протоколы).
	 *
	 * Защищено обязательной проверкой прав клинического чтения (152-ФЗ / 323-ФЗ)
	 * и строгой изоляцией по organizationId.
	 */
	app.get("/api/clinical/rules", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"clinical rules read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const rules = await getClinicalRules(orgId);
			return reply.status(200).send(rules);
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при получении клинических правил.",
			});
		}
	});

	app.post("/api/clinical/rules", async (request, reply) => {
		try {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"clinical rule create",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			// 152-ФЗ / 323-ФЗ: Редактирование клинических противопоказаний разрешено только клиническому персоналу
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
			return clinicalRuleSchema.parse(
				await createClinicalRuleInDb(orgId, input),
			);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при создании клинического правила.",
			});
		}
	});

	app.patch("/api/clinical/rules/:ruleId", async (request, reply) => {
		try {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"clinical rule update",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			// 152-ФЗ / 323-ФЗ: Редактирование клинических противопоказаний разрешено только клиническому персоналу
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

			const params = request.params as { ruleId: string };
			const body =
				request.body && typeof request.body === "object" ? request.body : {};
			const input = parseClinicalPayload(updateClinicalRuleSchema, {
				...body,
				id: params.ruleId,
			});
			if (!input) {
				return reply.code(400).send({
					error: "ClinicalRuleValidationError",
					message: clinicalRuleMutationValidationMessage,
				});
			}
			return clinicalRuleSchema.parse(
				await updateClinicalRuleInDb(orgId, input),
			);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при обновлении клинического правила.",
			});
		}
	});

	/**
	 * Удаление клинического правила.
	 *
	 * БЫЛО: маршрута не существовало ни в одной сборке. Кнопка «удалить» в
	 * настройках правил звала этот адрес и получала 404 «Route not found» —
	 * проверено живым запросом: PATCH по тому же пути отвечал 401, то есть сервер
	 * различал случаи и говорил именно «такого маршрута нет». Врач нажимал
	 * «удалить», видел ошибку, и правило продолжало срабатывать на приёме.
	 *
	 * Гарды и их порядок повторяют PATCH выше: сначала право на изменение правил,
	 * затем организация из подписанного токена. Организация обязательна и здесь —
	 * см. выше про редактирование правила в чужой организации; удалить чужое
	 * правило хуже, чем испортить его, потому что вернуть его нечем.
	 *
	 * Идентификатор проверяется на формат UUID по той же причине, что и в задачах
	 * выше: clinical_rules.id имеет тип uuid, и строка «rule1» дошла бы до
	 * PostgreSQL пятисоткой «invalid input syntax for type uuid».
	 */
	app.delete("/api/clinical/rules/:ruleId", async (request, reply) => {
		try {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"clinical rule delete",
				))
			)
				return;
			const { ruleId } = request.params as { ruleId: string };
			if (!ruleId || !UUID_PATTERN.test(ruleId)) {
				return reply.code(400).send({
					error: "ClinicalRuleValidationError",
					message: clinicalRuleMutationValidationMessage,
				});
			}
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			// 152-ФЗ / 323-ФЗ: Удаление клинических противопоказаний разрешено только клиническому персоналу
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

			const deleted = await deleteClinicalRuleInDb(orgId, ruleId);
			if (!deleted) {
				// Чужое правило и несуществующее правило отвечают одинаково: разный ответ
				// сообщал бы посторонней клинике, что такое правило у соседей есть.
				return reply.code(404).send({
					error: "ClinicalRuleNotFound",
					message: "Правило не найдено.",
				});
			}
			return reply.code(200).send({ id: ruleId, deleted: true });
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при удалении клинического правила.",
			});
		}
	});

	// COMPETITOR FEATURE #57: кадры::блокировка_параллельного_входа_под_одной_учетной_записью
	app.get("/api/system/single-session-enforcements", async (request, reply) => {
		try {
			// Организация берётся из подписанного токена, а не из заголовка клиента.
			// Раньше здесь принимался x-organization-id без всякой аутентификации:
			// любой мог подставить UUID чужой клиники и читать её медицинские данные.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getSingleSessionEnforcementsFromDb } = await import(
				"../../db/singleSessionEnforcementsQuery.js"
			);
			return reply
				.status(200)
				.send(await getSingleSessionEnforcementsFromDb(orgId));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при проверке односессионного режима.",
			});
		}
	});

	// COMPETITOR FEATURE #60: интеграции::геокодирование_адресов_через_dadata
	app.get("/api/integrations/dadata-addresses", async (request, reply) => {
		try {
			// Организация берётся из подписанного токена, а не из заголовка клиента.
			// Раньше здесь принимался x-organization-id без всякой аутентификации:
			// любой мог подставить UUID чужой клиники и читать её медицинские данные.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getDadataGeocodedAddressesFromDb } = await import(
				"../../db/dadataGeocodedAddressesQuery.js"
			);
			return reply
				.status(200)
				.send(await getDadataGeocodedAddressesFromDb(orgId));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при геокодировании адресов через DaData.",
			});
		}
	});

	// COMPETITOR FEATURE #54: маркетинг::маппинг_полей_лендингов_и_лид_форм
	app.get(
		"/api/integrations/landing-field-mappings",
		async (request, reply) => {
			try {
				// Организация берётся из подписанного токена, а не из заголовка клиента.
				// Раньше здесь принимался x-organization-id без всякой аутентификации:
				// любой мог подставить UUID чужой клиники и читать её медицинские данные.
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;
				const { getLandingFieldMappingsFromDb } = await import(
					"../../db/landingFieldMappingsQuery.js"
				);
				return reply
					.status(200)
					.send(await getLandingFieldMappingsFromDb(orgId));
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			} catch (error: any) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при получении маппинга полей лендингов.",
				});
			}
		},
	);

	// COMPETITOR FEATURE #58: пациенты::геокодинг_адресов_через_dadata
	app.get(
		"/api/integrations/dadata-geocoded-addresses",
		async (request, reply) => {
			try {
				// Организация берётся из подписанного токена, а не из заголовка клиента.
				// Раньше здесь принимался x-organization-id без всякой аутентификации:
				// любой мог подставить UUID чужой клиники и читать её медицинские данные.
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;
				const { getDadataGeocodedAddressesFromDb } = await import(
					"../../db/dadataGeocodedAddressesQuery.js"
				);
				return reply
					.status(200)
					.send(await getDadataGeocodedAddressesFromDb(orgId));
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			} catch (error: any) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Внутренняя ошибка сервера при геокодировании адресов пациентов.",
				});
			}
		},
	);

	app.get(
		"/api/emr/templates",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const query = request.query as
				| { q?: string; category?: string }
				| undefined;
			const { getStatutoryEmrTemplates } = await import(
				"../../services/clinical/statutoryCatalogs.js"
			);
			const items = getStatutoryEmrTemplates({
				...(query?.q ? { q: query.q } : {}),
				...(query?.category ? { category: query.category } : {}),
			});
			return reply.status(200).send(items);
		},
	);
}
