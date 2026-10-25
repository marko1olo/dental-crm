import { and, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { outpatientTemplateCategories, outpatientTemplates } from "../../db/schema.js";
import { outpatientTemplatesFilterSchema } from "./outpatientTypes.js";

export async function handleGetOutpatientTemplates(request: FastifyRequest, reply: FastifyReply) {
	const parsed = outpatientTemplatesFilterSchema.safeParse(request.query);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры фильтрации клинических протоколов",
			details: parsed.error.issues,
		});
	}

	const conditions: (SQL | undefined)[] = [];
	if (parsed.data.categoryId !== undefined) {
		conditions.push(eq(outpatientTemplates.categoryId, parsed.data.categoryId));
	}
	if (parsed.data.mkbCode) {
		conditions.push(ilike(outpatientTemplates.mkbCode, `%${parsed.data.mkbCode}%`));
	}
	if (parsed.data.search && parsed.data.search.trim().length > 0) {
		const s = `%${parsed.data.search.trim()}%`;
		conditions.push(
			or(
				ilike(outpatientTemplates.name, s),
				sql`(${outpatientTemplates.contentJson}->>'text') ILIKE ${s}`,
			),
		);
	}

	const filtered = conditions.filter((c): c is SQL => c !== undefined);

	const categories = await db
		.select()
		.from(outpatientTemplateCategories)
		.orderBy(outpatientTemplateCategories.order, outpatientTemplateCategories.id);

	const templates = await db
		.select({
			id: outpatientTemplates.id,
			categoryId: outpatientTemplates.categoryId,
			categoryName: outpatientTemplateCategories.name,
			categorySpecialty: outpatientTemplateCategories.specialty,
			name: outpatientTemplates.name,
			contentJson: outpatientTemplates.contentJson,
			mkbCode: outpatientTemplates.mkbCode,
			order: outpatientTemplates.order,
		})
		.from(outpatientTemplates)
		.leftJoin(
			outpatientTemplateCategories,
			eq(outpatientTemplates.categoryId, outpatientTemplateCategories.id),
		)
		.where(filtered.length > 0 ? and(...filtered) : undefined)
		.orderBy(outpatientTemplates.order, outpatientTemplates.id)
		.limit(parsed.data.limit)
		.offset(parsed.data.offset);

	return reply.send({ count: templates.length, categories, templates });
}
