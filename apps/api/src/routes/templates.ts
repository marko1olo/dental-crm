import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { visitTemplates } from "../db/schema.js";
import { ensureClinicalTemplatesSeeded } from "../scripts/seedTemplates.js";

export default async function registerTemplateRoutes(app: FastifyInstance) {
	// GET /api/templates — list all templates for the org
	app.get("/api/templates", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read templates")))
			return;
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		// Auto-seed built-in templates if none exist
		const existing = await db
			.select()
			.from(visitTemplates)
			.where(eq(visitTemplates.organizationId, orgId));
		/*
		 * ЧТО БЫЛО СЛОМАНО. Провал установки встроенных протоколов приёма
		 * записывался в журнал сервера и наружу уходил безусловный
		 * `200 {"templates":[]}`. Для врача «протоколов в этой клинике нет» и
		 * «протоколы не поставились» выглядели одинаково — пустым выпадающим
		 * списком «Клинический шаблон», — а разница между ними это разница между
		 * «набираю дневник руками» и «звоню администратору». Отказа не было
		 * вообще: человек не знал, что что-то сломалось, и делал вывод, что
		 * готовых протоколов в его клинике не бывает. Дневник приёма заполняется
		 * на каждом приёме, поэтому вывод закреплялся навсегда.
		 *
		 * Ошибка запоминается, а не гасится: ответ решается ПОСЛЕ повторного
		 * чтения списка. Посев идёт вставками в цикле без транзакции
		 * (scripts/seedTemplates.ts), поэтому сбой посередине оставляет часть
		 * протоколов в базе — и отказ вместо них отнял бы у врача то, что уже
		 * годится к работе.
		 */
		let seedFailure: unknown = null;
		if (existing.length === 0) {
			try {
				await ensureClinicalTemplatesSeeded(orgId);
			} catch (err) {
				seedFailure = err;
				// error, а не warn: пустой список протоколов у клиники — это поломка
				// установки, и в журнале она обязана лежать как поломка.
				app.log.error(
					`[Templates] Установка встроенных протоколов провалилась для организации ${orgId}: ${String(err)}`,
				);
			}
		}

		const templates = await db
			.select()
			.from(visitTemplates)
			.where(eq(visitTemplates.organizationId, orgId));

		if (seedFailure && templates.length === 0) {
			// 503, а не 200: список пуст не потому, что протоколов нет, а потому
			// что их не удалось установить. Причина у сервера установлена только
			// такая — сама установка не прошла; ЧТО именно отказало (база, права,
			// связь), сервер здесь не знает и не сочиняет: подробности ушли в
			// журнал строкой выше.
			return reply.code(503).send({
				error: "ClinicalTemplatesSeedFailed",
				message:
					"Встроенные клинические протоколы не установились в этой клинике, поэтому список пуст — это сбой установки, а не отсутствие протоколов. Дневник приёма пока заполните вручную и передайте это сообщение администратору клиники: установку нужно повторить.",
			});
		}

		return reply.send({ templates });
	});

	// GET /api/templates/:id — get single template
	app.get("/api/templates/:id", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read template"))) return;
		const { id } = req.params as { id: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const [template] = await db
			.select()
			.from(visitTemplates)
			.where(
				and(
					eq(visitTemplates.id, id),
					eq(visitTemplates.organizationId, orgId),
				),
			);

		if (!template) return reply.code(404).send({ error: "NotFound" });
		return reply.send({ template });
	});

	// POST /api/templates — create a custom template
	app.post("/api/templates", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "create template")))
			return;
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const body = req.body as {
			title: string;
			category?: string;
			specialty?: string;
			prefilledAnamnesis?: string;
			prefilledObjective?: string;
			prefilledTreatment?: string;
			defaultIcd10?: string;
			defaultIcd10Label?: string;
			suggestedProcedureIds?: string[];
		};

		if (!body.title?.trim())
			return reply.code(400).send({ error: "Title required" });

		const [inserted] = await db
			.insert(visitTemplates)
			.values({
				organizationId: orgId,
				title: body.title.trim(),
				category: body.category,
				specialty: body.specialty,
				prefilledAnamnesis: body.prefilledAnamnesis,
				prefilledObjective: body.prefilledObjective,
				prefilledTreatment: body.prefilledTreatment,
				defaultIcd10: body.defaultIcd10,
				defaultIcd10Label: body.defaultIcd10Label,
				suggestedProcedureIds: body.suggestedProcedureIds ?? [],
				isBuiltIn: false,
			})
			.returning();

		return reply.code(201).send({ template: inserted });
	});

	// DELETE /api/templates/:id — delete custom template (built-in protected)
	app.delete("/api/templates/:id", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "delete template")))
			return;
		const { id } = req.params as { id: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const [template] = await db
			.select()
			.from(visitTemplates)
			.where(
				and(
					eq(visitTemplates.id, id),
					eq(visitTemplates.organizationId, orgId),
				),
			);

		if (!template) return reply.code(404).send({ error: "NotFound" });
		if (template.isBuiltIn)
			return reply.code(403).send({ error: "CannotDeleteBuiltIn" });

		await db
			.delete(visitTemplates)
			.where(
				and(
					eq(visitTemplates.id, id),
					eq(visitTemplates.organizationId, orgId),
				),
			);
		return reply.send({ success: true });
	});

	// POST /api/templates/seed — force re-seed built-in templates
	app.post("/api/templates/seed", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "seed templates")))
			return;
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		await ensureClinicalTemplatesSeeded(orgId);
		const templates = await db
			.select()
			.from(visitTemplates)
			.where(eq(visitTemplates.organizationId, orgId));
		return reply.send({ success: true, count: templates.length });
	});
}
