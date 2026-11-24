import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withSavepoint, withTenantCtx } from "../../../../db/rls.js";
import { sterilizationLogs } from "../../../../db/schema.js";
import { executeSterilizationConsumablesDeduction } from "../handlers/sterilizationConsumablesDeduction.js";
import { buildUnsealKraftPackageResponse } from "../sterilizationHelpers.js";
import { unsealBodySchema } from "../sterilizationSchemas.js";
import { executeLinkDiaryTransaction } from "./sterilizationLinkTransaction.js";

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
		(data.visitId ? `TRAY-VISIT-${data.visitId}` : `BATCH-SHIFT-${now.toISOString().slice(0, 10).replace(/-/g, "")}`);

	await withTenantCtx(organizationId, async (tx) => {
		if (data.barcode && data.barcode.trim()) {
			const [existingLog] = await tx
				.select()
				.from(sterilizationLogs)
				.where(
					and(
						eq(sterilizationLogs.organizationId, organizationId),
						eq(sterilizationLogs.barcode, effectiveBarcode),
					),
				)
				.limit(1)
				.for("update");

			if (existingLog) {
				await tx
					.update(sterilizationLogs)
					.set({
						status: "unsealed",
					})
					.where(
						and(
							eq(sterilizationLogs.id, existingLog.id),
							eq(sterilizationLogs.organizationId, organizationId),
						),
					);
			}
		}

		// Если передан visitId — привязываем стерильный лоток к визиту у кресла
		if (data.visitId) {
			try {
				const visitId = data.visitId;
				await withSavepoint(tx, (spTx) =>
					executeLinkDiaryTransaction({
						organizationId,
						visitId,
						trimmedBarcode: effectiveBarcode,
						doctorUserId: data.operatorId || null,
						isEmergencyAdmission: false,
						emergencyAdmissionNote: "",
						tx: spTx,
					}),
				);
			} catch (linkErr) {
				req.log.warn(
					{ err: linkErr, visitId: data.visitId, barcode: effectiveBarcode },
					"Не удалось привязать стерильный лоток к дневнику визита при вскрытии упаковки",
				);
			}
		}

		await executeSterilizationConsumablesDeduction({
			organizationId,
			userId: data.operatorId || null,
			count: 1,
			cycleNumber: 1,
			barcode: effectiveBarcode,
			logger: req.log,
		}, tx);
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
