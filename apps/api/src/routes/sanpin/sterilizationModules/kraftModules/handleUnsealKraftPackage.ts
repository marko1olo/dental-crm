import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizationLogs } from "../../../../db/schema.js";
import { executeSterilizationConsumablesDeduction } from "../handlers/sterilizationConsumablesDeduction.js";
import { buildUnsealKraftPackageResponse } from "../sterilizationHelpers.js";
import { unsealBodySchema } from "../sterilizationSchemas.js";

export async function handleUnsealKraftPackage(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilization unseal kraft package",
	);
	if (!organizationId) return;

	const parsed = unsealBodySchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные данные для списания крафт-пакета.",
			details: parsed.error.format(),
		});
	}
	const data = parsed.data;
	const now = new Date();
	const effectiveBarcode =
		(data.barcode || "").trim() ||
		`BATCH-SHIFT-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;

	if (data.barcode && data.barcode.trim()) {
		const existingLog = await db
			.select()
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					eq(sterilizationLogs.barcode, effectiveBarcode),
				),
			)
			.limit(1);

		if (existingLog.length > 0 && existingLog[0]) {
			await db
				.update(sterilizationLogs)
				.set({
					status: "unsealed",
				})
				.where(
					and(
						eq(sterilizationLogs.id, existingLog[0].id),
						eq(sterilizationLogs.organizationId, organizationId),
					),
				);
		}
	}

	void executeSterilizationConsumablesDeduction({
		organizationId,
		userId: data.operatorId || null,
		count: 1,
		cycleNumber: 1,
		barcode: effectiveBarcode,
	});

	return reply.send(
		buildUnsealKraftPackageResponse({
			barcode: effectiveBarcode,
			operatorName: data.operatorName,
			operatorId: data.operatorId,
			notes: data.notes,
			now,
		}),
	);
}
