import { and, eq, type SQL } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { clinicalTeethCatalog, toothDefectsCatalog } from "../../db/schema.js";
import { getToothDefectsQuerySchema } from "./outpatientTypes.js";

export async function getTeethCatalogHandler(_req: FastifyRequest, reply: FastifyReply) {
	const teeth = await db
		.select()
		.from(clinicalTeethCatalog)
		.orderBy(clinicalTeethCatalog.order, clinicalTeethCatalog.id);

	return reply.send({ count: teeth.length, teeth });
}

export async function getToothDefectsHandler(request: FastifyRequest, reply: FastifyReply) {
	const parsed = getToothDefectsQuerySchema.safeParse(request.query);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры фильтрации дефектов",
			details: parsed.error.issues,
		});
	}

	const conditions: SQL[] = [];
	if (parsed.data.type) conditions.push(eq(toothDefectsCatalog.type, parsed.data.type));
	if (parsed.data.key) conditions.push(eq(toothDefectsCatalog.key, parsed.data.key));
	if (parsed.data.activeOnly === "true" || parsed.data.activeOnly === "1") {
		conditions.push(eq(toothDefectsCatalog.isActive, true));
	}

	const defects = await db
		.select()
		.from(toothDefectsCatalog)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(toothDefectsCatalog.order, toothDefectsCatalog.id);

	return reply.send({ count: defects.length, defects });
}

export async function getToothDefectsTreeHandler(_req: FastifyRequest, reply: FastifyReply) {
	const allDefects = await db
		.select()
		.from(toothDefectsCatalog)
		.where(eq(toothDefectsCatalog.isActive, true))
		.orderBy(toothDefectsCatalog.order, toothDefectsCatalog.id);

	const tree: Record<string, Record<string, typeof allDefects>> = {
		outpatient: {},
		anomaly: {},
		orthodontic: {},
	};

	for (const defect of allDefects) {
		const type = defect.type || "outpatient";
		const key = defect.key || "common";
		if (!tree[type]) tree[type] = {};
		if (!tree[type][key]) tree[type][key] = [];
		tree[type][key].push(defect);
	}

	return reply.send({ totalCount: allDefects.length, tree });
}
