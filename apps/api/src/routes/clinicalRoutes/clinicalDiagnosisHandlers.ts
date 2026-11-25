import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	getRequestIdentity,
	requireOrganizationId,
	requireStaffIdentity,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { recentPatientViewBodySchema } from "./types.js";

const catalog804nQuerySchema = z
	.object({
		q: z.string().optional(),
		category: z.string().optional(),
	})
	.strict();

const icd10QuerySchema = z
	.object({
		q: z.string().optional(),
		group: z.string().optional(),
	})
	.strict();

/**
 * Diagnostic, statutory classification, and patient history route handlers.
 * (Order 804n, ICD-10 nomenclature, recent patient cards, and lost patient analytics).
 */
export async function registerClinicalDiagnosisRoutes(app: FastifyInstance) {
	// STATUTORY CLINICAL CATALOGS (Order 804n, ICD-10, 1-Click EMR Protocols)
	const handleGet804nCatalog = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsedQuery = catalog804nQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса справочника 804н.",
			});
		}
		const query = parsedQuery.data;
		const { getStatutory804nCatalog } = await import(
			"../../services/clinical/statutoryCatalogs.js"
		);
		const items = getStatutory804nCatalog({
			...(query.q ? { q: query.q } : {}),
			...(query.category ? { category: query.category } : {}),
		});
		return reply.status(200).send(items);
	};

	app.get("/api/clinical/804n", handleGet804nCatalog);
	app.get("/api/clinical/nomenclature", handleGet804nCatalog);

	app.get(
		"/api/clinical/icd10",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsedQuery = icd10QuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса справочника МКБ-10.",
				});
			}
			const query = parsedQuery.data;
			const { getStatutoryIcd10Catalog } = await import(
				"../../services/clinical/statutoryCatalogs.js"
			);
			const items = getStatutoryIcd10Catalog({
				...(query.q ? { q: query.q } : {}),
				...(query.group ? { group: query.group } : {}),
			});
			return reply.status(200).send(items);
		},
	);

	/*
	 * История последних открытых карточек.
	 *
	 * Была только выборка. В таблицу recent_patient_history не писал никто и
	 * никогда — ни одной вставки во всём сервере, ноль строк в живой базе. Виджет
	 * «Недавние» в шапке рабочего места показывал «История просмотров пуста»
	 * каждому пользователю каждый день с момента появления, и выглядело это как
	 * «функция есть, просто ещё не накопилось».
	 *
	 * История личная: сотрудник видит свои открытия, а не чужие, поэтому нужен
	 * не только идентификатор клиники, но и подписанный вход сотрудника.
	 */
	app.get("/api/hr/recent-patients", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity) return reply;
			if (!identity.organizationId || !identity.userId) {
				return reply.status(401).send({
					error: "Unauthorized",
					message: "Не удалось определить организацию или идентификатор сотрудника.",
				});
			}
			const { getRecentPatientHistoryFromDb } = await import(
				"../../db/recentPatientHistoryQuery.js"
			);
			return reply.status(200).send(
				await getRecentPatientHistoryFromDb(
					identity.organizationId,
					identity.userId,
				),
			);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при получении недавних пациентов.",
			});
		}
	});

	/*
	 * Отметка об открытии карточки — недостающая половина той же функции.
	 *
	 * Идентификатор пациента принимается из тела, но проверяется по организации
	 * из подписанного токена: подставить чужого пациента нельзя. Неизвестный
	 * пациент — 404, а не молчаливое согласие: иначе в историю попадали бы
	 * записи о карточках, которых нет.
	 */
	app.post("/api/hr/recent-patients", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity) return reply;
			if (!identity.organizationId || !identity.userId) {
				return reply.status(401).send({
					error: "Unauthorized",
					message: "Не удалось определить организацию или идентификатор сотрудника.",
				});
			}
			const parsedBody = recentPatientViewBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "PatientIdRequired",
					message: "Не указан пациент, карточку которого открыли.",
				});
			}
			const patientId =
				typeof parsedBody.data.patientId === "string"
					? parsedBody.data.patientId
					: "";
			if (!patientId) {
				return reply.status(400).send({
					error: "PatientIdRequired",
					message: "Не указан пациент, карточку которого открыли.",
				});
			}
			const { recordPatientViewInDb } = await import(
				"../../db/recentPatientHistoryQuery.js"
			);
			const result = await recordPatientViewInDb(
				identity.organizationId,
				identity.userId,
				patientId,
			);
			if (!result.recorded) {
				return reply.status(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в этой клинике.",
				});
			}
			return reply.status(200).send({ recorded: true });
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при записи открытия карточки пациента.",
			});
		}
	});

	// COMPETITOR FEATURE #6: маркетинг::фильтр_потерянных_пациентов_в_отчете
	app.get("/api/analytics/lost-patients-filters", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"lost patients filters",
				))
			) {
				return;
			}
			// Организация берётся из подписанного токена, а не из заголовка клиента.
			// Раньше здесь принимался x-organization-id без всякой аутентификации:
			// любой мог подставить UUID чужой клиники и читать её медицинские данные.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			if (staffRole) {
				const evalAccess = evaluateClinicalAccess(staffRole, {
					clinicalRole: identity.clinicalRole ?? null,
					canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
					specialties: identity.specialties ?? null,
				});
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.analytics.read",
						role: staffRole,
						message:
							"Доступ к фильтрам потерянных пациентов ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
					});
				}
			}

			const { getLostPatientsFiltersFromDb } = await import(
				"../../db/lostPatientsFiltersQuery.js"
			);
			const filters = await withTenantCtx(orgId, () =>
				getLostPatientsFiltersFromDb(orgId),
			);
			return reply.status(200).send(filters);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при фильтрации потерянных пациентов.",
			});
		}
	});
}
