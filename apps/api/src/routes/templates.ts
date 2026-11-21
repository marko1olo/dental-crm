import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import { db } from "../db/client.js";
import { protocolTemplates } from "../db/schema.js";
import { ensureClinicalTemplatesSeeded } from "../scripts/seedTemplates.js";
import { clinicNotIdentifiedMessage } from "../utils/clinicSessionRefusal.js";

function mapProtocolTemplateToLegacy(row: typeof protocolTemplates.$inferSelect) {
	return {
		id: row.id,
		organizationId: row.organizationId,
		title: row.title,
		category: row.visitReason || "Общий",
		specialty: row.specialty,
		prefilledAnamnesis: row.complaintPrompt,
		prefilledObjective: row.objectiveTemplate,
		prefilledTreatment: row.treatmentPlanTemplate,
		defaultIcd10:
			Array.isArray(row.diagnosisHints) && typeof row.diagnosisHints[0] === "string"
				? row.diagnosisHints[0]
				: "",
		defaultIcd10Label: row.title,
		suggestedProcedureIds: [],
		isBuiltIn: false,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt ? row.updatedAt.toISOString() : row.createdAt.toISOString(),
	};
}

/**
 * ПРОТОКОЛЫ ПРИЁМА ОТКАЗЫВАЛИ КОДОМ, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО. Доказано запросом в процессе (`app.inject`, не дев-сервер): пять
 * ветвей этого файла отвечали телом без поля `message` —
 * `{"error":"OrgRequired"}` (список, один протокол, создание, удаление,
 * переустановка), `{"error":"NotFound"}`, `{"error":"Title required"}` и
 * `{"error":"CannotDeleteBuiltIn"}`. Две последние строки вдобавок написаны
 * латиницей: клиент гасит текст без русских букв целиком
 * (`AppHelpers.tsx`, `operatorReadableErrorDetail`), так что даже поставь их в
 * `message` — человек не увидел бы ничего.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Список «Клинический шаблон» открывается на КАЖДОМ
 * приёме: это первое, что делает врач, садясь заполнять дневник. Отказ без
 * причины здесь неотличим от «протоколов в этой клинике нет» — тот же дефект,
 * который уже починен в этом файле для провала установки (503 ниже). Разница
 * между «войдите в кабинет заново» и «звоните администратору» — это разница
 * между десятью секундами и потерянным приёмом.
 *
 * ПОПРАВКА К РАЗБОРУ УЧАСТКА. План писал про эти строки: «там сервер причины и
 * не знает; сочинять её нельзя». Это неверно, и проверено чтением обеих ветвей:
 * причина у сервера установлена точно в каждой из четырёх — кабинет клиники не
 * определён, протокола с таким номером в этой клинике нет, у протокола нет
 * названия, протокол встроенный. Сочинять ничего не пришлось.
 *
 * Коды ответа и значения поля `error` сохранены дословно. Текст состояния «нет
 * кабинета» берётся из общего дома `utils/clinicSessionRefusal.ts`.
 */
const TEMPLATES_CLINIC_UNKNOWN_LIST_MESSAGE = clinicNotIdentifiedMessage(
	"список протоколов приёма не открыть",
);
const TEMPLATES_CLINIC_UNKNOWN_ONE_MESSAGE = clinicNotIdentifiedMessage(
	"протокол приёма не открыть",
);
const TEMPLATES_CLINIC_UNKNOWN_CREATE_MESSAGE = clinicNotIdentifiedMessage(
	"новый протокол приёма не сохранить",
	"заполненная форма остаётся на экране",
);
const TEMPLATES_CLINIC_UNKNOWN_DELETE_MESSAGE = clinicNotIdentifiedMessage(
	"удалить протокол приёма нельзя",
);
const TEMPLATES_CLINIC_UNKNOWN_SEED_MESSAGE = clinicNotIdentifiedMessage(
	"встроенные протоколы приёма не установить",
);

/**
 * «Протокола нет». Причина установлена точно: строки с таким номером в этой
 * клинике не существует. Прежний голый 404 клиент превращал в «сервер не знает
 * такого раздела — скорее всего программа клиники обновлена не полностью,
 * сообщите администратору» — ложное указание, потому что маршрут работает.
 */
const TEMPLATE_NOT_FOUND_MESSAGE =
	"Этот протокол приёма не найден в вашей клинике. Так бывает, если его удалили, пока список был открыт на экране. Обновите список протоколов и выберите протокол заново.";

/**
 * «У протокола нет названия». Поле названо русской подписью с экрана, а не
 * именем колонки: по названию врач и выбирает протокол в списке на приёме, и это
 * же объясняет, зачем оно обязательно.
 */
const TEMPLATE_TITLE_REQUIRED_MESSAGE =
	"Протокол приёма не сохранён, потому что у него не заполнено название. Именно по названию врач выбирает протокол в списке на приёме, поэтому пустым оно быть не может. Впишите название и сохраните снова.";

/**
 * «Встроенный протокол удалить нельзя».
 *
 * Обходной путь назван ровно тот, который в продукте есть: своих протоколов
 * можно создать сколько угодно. Признака «снять с использования» у протокола НЕТ
 * — в `visit_templates` нет колонки активности (проверено чтением
 * `db/schema.ts`), — поэтому предлагать «отключите его» значило бы отправить
 * администратора к кнопке, которой не существует.
 */
const TEMPLATE_BUILT_IN_MESSAGE =
	"Это встроенный протокол приёма, он поставляется вместе с программой и удалить его нельзя. Если он вам не подходит, создайте свой протокол приёма и выбирайте на приёме его — встроенный останется в списке, но пользоваться им никто не обязан.";

/**
 * POST /api/templates: тело раньше — bare cast `req.body as { title: string; … }`.
 * null/array → TypeError на body.title (500). Zod safeParse после AUTH/org → 400.
 */
const templateCreateBodySchema = z.object({
	title: z.unknown().optional(),
	category: z.unknown().optional(),
	specialty: z.unknown().optional(),
	prefilledAnamnesis: z.unknown().optional(),
	prefilledObjective: z.unknown().optional(),
	prefilledTreatment: z.unknown().optional(),
	defaultIcd10: z.unknown().optional(),
	defaultIcd10Label: z.unknown().optional(),
	suggestedProcedureIds: z.unknown().optional(),
});

export default async function registerTemplateRoutes(app: FastifyInstance) {
	app.get("/api/templates", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read templates")))
			return;

		const identity = getRequestIdentity(req);
		const staffRole = identity.role ?? req.user?.role ?? null;
		if (staffRole) {
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.templates.read",
					role: staffRole,
					message: `Отказ в доступе к клиническим протоколам (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: TEMPLATES_CLINIC_UNKNOWN_LIST_MESSAGE,
			});

		// Auto-seed built-in templates if none exist
		const existing = await db
			.select()
			.from(protocolTemplates)
			.where(eq(protocolTemplates.organizationId, orgId));

		let seedFailure: unknown = null;
		if (existing.length === 0) {
			try {
				await ensureClinicalTemplatesSeeded(orgId);
			} catch (err) {
				seedFailure = err;
				app.log.error(
					`[Templates] Установка встроенных протоколов провалилась для организации ${orgId}: ${String(err)}`,
				);
			}
		}

		const templates = (await db
			.select()
			.from(protocolTemplates)
			.where(eq(protocolTemplates.organizationId, orgId))).map(mapProtocolTemplateToLegacy);

		if (seedFailure && templates.length === 0) {
			return reply.code(503).send({
				error: "ClinicalTemplatesSeedFailed",
				message:
					"Встроенные клинические протоколы не установились в этой клинике, поэтому список пуст — это сбой установки, а не отсутствие протоколов. Дневник приёма пока заполните вручную и передайте это сообщение администратору клиники: установку нужно повторить.",
			});
		}

		return reply.send({ templates });
	});

	app.get("/api/templates/:id", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read template"))) return;

		const identity = getRequestIdentity(req);
		const staffRole = identity.role ?? req.user?.role ?? null;
		if (staffRole) {
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.templates.read",
					role: staffRole,
					message: `Отказ в доступе к клиническому протоколу (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}
		}

		const { id } = req.params as { id: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: TEMPLATES_CLINIC_UNKNOWN_ONE_MESSAGE,
			});

		const [templateRow] = await db
			.select()
			.from(protocolTemplates)
			.where(
				and(
					eq(protocolTemplates.id, id),
					eq(protocolTemplates.organizationId, orgId),
				),
			);

		if (!templateRow)
			return reply
				.code(404)
				.send({ error: "NotFound", message: TEMPLATE_NOT_FOUND_MESSAGE });
		return reply.send({ template: mapProtocolTemplateToLegacy(templateRow) });
	});

	app.post("/api/templates", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "create template")))
			return;
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: TEMPLATES_CLINIC_UNKNOWN_CREATE_MESSAGE,
			});

		const parsedBody = templateCreateBodySchema.safeParse(req.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "Title required",
				message: TEMPLATE_TITLE_REQUIRED_MESSAGE,
			});
		}
		const titleRaw = parsedBody.data.title;
		const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
		if (!title) {
			return reply.code(400).send({
				error: "Title required",
				message: TEMPLATE_TITLE_REQUIRED_MESSAGE,
			});
		}
		const str = (v: unknown): string | undefined =>
			typeof v === "string" ? v : undefined;

		const [inserted] = await db
			.insert(protocolTemplates)
			.values({
				organizationId: orgId,
				title,
				visitReason: str(parsedBody.data.category) || "",
				specialty: (str(parsedBody.data.specialty) as any) || "universal",
				complaintPrompt: str(parsedBody.data.prefilledAnamnesis) || "",
				objectiveTemplate: str(parsedBody.data.prefilledObjective) || "",
				treatmentPlanTemplate: str(parsedBody.data.prefilledTreatment) || "",
				diagnosisHints: parsedBody.data.defaultIcd10 ? [String(parsedBody.data.defaultIcd10)] : [],
				defaultDurationMinutes: 30,
				requiredDocuments: [],
				suggestedImaging: [],
				safetyWarnings: [],
				updatedAt: new Date(),
			})
			.returning();

		if (!inserted) {
			return reply.code(500).send({ error: "FailedToInsertTemplate" });
		}

		return reply.code(201).send({ template: mapProtocolTemplateToLegacy(inserted) });
	});

	app.delete("/api/templates/:id", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "delete template")))
			return;
		const { id } = req.params as { id: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: TEMPLATES_CLINIC_UNKNOWN_DELETE_MESSAGE,
			});

		const [template] = await db
			.select()
			.from(protocolTemplates)
			.where(
				and(
					eq(protocolTemplates.id, id),
					eq(protocolTemplates.organizationId, orgId),
				),
			);

		if (!template)
			return reply
				.code(404)
				.send({ error: "NotFound", message: TEMPLATE_NOT_FOUND_MESSAGE });

		await db
			.delete(protocolTemplates)
			.where(
				and(
					eq(protocolTemplates.id, id),
					eq(protocolTemplates.organizationId, orgId),
				),
			);
		return reply.send({ success: true });
	});

	app.post("/api/templates/seed", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "seed templates")))
			return;
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: TEMPLATES_CLINIC_UNKNOWN_SEED_MESSAGE,
			});

		await ensureClinicalTemplatesSeeded(orgId);
		const templates = await db
			.select()
			.from(protocolTemplates)
			.where(eq(protocolTemplates.organizationId, orgId));
		return reply.send({ success: true, count: templates.length });
	});
}
