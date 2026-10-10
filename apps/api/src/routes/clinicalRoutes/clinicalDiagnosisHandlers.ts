import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireOrganizationId,
	requireStaffIdentity,
} from "../../security/identity.js";
import { recentPatientViewBodySchema } from "./types.js";

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
		const query = request.query as
			| { q?: string; category?: string }
			| undefined;
		const { getStatutory804nCatalog } = await import(
			"../../services/clinical/statutoryCatalogs.js"
		);
		const items = getStatutory804nCatalog({
			...(query?.q ? { q: query.q } : {}),
			...(query?.category ? { category: query.category } : {}),
		});
		return reply.status(200).send(items);
	};

	app.get("/api/clinical/804n", handleGet804nCatalog);
	app.get("/api/clinical/nomenclature", handleGet804nCatalog);

	app.get(
		"/api/clinical/icd10",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const query = request.query as
				| { q?: string; group?: string }
				| undefined;
			const { getStatutoryIcd10Catalog } = await import(
				"../../services/clinical/statutoryCatalogs.js"
			);
			const items = getStatutoryIcd10Catalog({
				...(query?.q ? { q: query.q } : {}),
				...(query?.group ? { group: query.group } : {}),
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
			const { getRecentPatientHistoryFromDb } = await import(
				"../../db/recentPatientHistoryQuery.js"
			);
			return reply.status(200).send(
				await getRecentPatientHistoryFromDb(
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					identity.organizationId!,
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					identity.userId!,
				),
			);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
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
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				identity.organizationId!,
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				identity.userId!,
				patientId,
			);
			if (!result.recorded) {
				return reply.status(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в этой клинике.",
				});
			}
			return reply.status(200).send({ recorded: true });
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
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
			// Организация берётся из подписанного токена, а не из заголовка клиента.
			// Раньше здесь принимался x-organization-id без всякой аутентификации:
			// любой мог подставить UUID чужой клиники и читать её медицинские данные.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getLostPatientsFiltersFromDb } = await import(
				"../../db/lostPatientsFiltersQuery.js"
			);
			return reply.status(200).send(await getLostPatientsFiltersFromDb(orgId));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при фильтрации потерянных пациентов.",
			});
		}
	});
}
