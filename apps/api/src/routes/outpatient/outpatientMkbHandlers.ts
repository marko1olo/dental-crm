import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { mkbCategories } from "../../db/schema.js";
import { getMkbCategoriesQuerySchema } from "./outpatientTypes.js";

export async function getMkbCategoriesTreeHandler(request: FastifyRequest, reply: FastifyReply) {
	const parsed = getMkbCategoriesQuerySchema.safeParse(request.query);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры поиска МКБ-10",
			details: parsed.error.issues,
		});
	}

	const conditions: (SQL | undefined)[] = [];
	const isDentalOnly = parsed.data.dentalOnly === "true" || parsed.data.dentalOnly === "1";

	if (isDentalOnly) {
		conditions.push(
			or(
				eq(mkbCategories.isDentalSpecialty, true),
				eq(mkbCategories.id, "K00-K14"),
				eq(mkbCategories.parentId, "K00-K14"),
				ilike(mkbCategories.code, "K0%"),
				ilike(mkbCategories.code, "K10%"),
				ilike(mkbCategories.code, "K11%"),
				ilike(mkbCategories.code, "K12%"),
				ilike(mkbCategories.code, "K13%"),
				ilike(mkbCategories.code, "K14%"),
			),
		);
	}

	if (parsed.data.parentId !== undefined) {
		conditions.push(eq(mkbCategories.parentId, parsed.data.parentId));
	}

	if (parsed.data.search && parsed.data.search.trim().length > 0) {
		const s = `%${parsed.data.search.trim()}%`;
		conditions.push(or(ilike(mkbCategories.code, s), ilike(mkbCategories.name, s)));
	}

	const filtered = conditions.filter((c): c is SQL => c !== undefined);

	const items = await db
		.select()
		.from(mkbCategories)
		.where(filtered.length > 0 ? and(...filtered) : undefined)
		.orderBy(mkbCategories.order, mkbCategories.code)
		.limit(parsed.data.limit)
		.offset(parsed.data.offset);

	return reply.send({ count: items.length, dentalOnly: isDentalOnly, items });
}
