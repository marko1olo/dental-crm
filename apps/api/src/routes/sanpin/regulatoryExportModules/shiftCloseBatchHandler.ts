/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseBatchHandler.ts
 * Обработчик закрытия смены и фиксации журналов СанПиН.
 * Мандат 8b: строго <= 120 строк.
 */

import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { saveShiftAutoclaveRecords } from "./shiftCloseAutoclaveSaver.js";
import { saveShiftBactericidalRecords } from "./shiftCloseBactericidalSaver.js";
import { saveShiftMicroclimateRecords } from "./shiftCloseMicroclimateSaver.js";
import { saveShiftPsoRecords } from "./shiftClosePsoSaver.js";
import { saveShiftWasteRecords } from "./shiftCloseWasteSaver.js";

const sanpinShiftCloseBodySchema = z
	.object({
		shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
		responsibleStaffName: z.string().trim().max(200).optional(),
		operatorStaffFullName: z.string().trim().max(200).optional(),
		digitalStampHash: z.string().trim().max(200).optional(),
		psoRecords: z.array(z.record(z.string(), z.unknown())).optional(),
		psoBatches: z.array(z.record(z.string(), z.unknown())).optional(),
		autoclaveCycles: z.array(z.record(z.string(), z.unknown())).optional(),
		sterilizationRecords: z.array(z.record(z.string(), z.unknown())).optional(),
		form257Records: z.array(z.record(z.string(), z.unknown())).optional(),
		form257: z.array(z.record(z.string(), z.unknown())).optional(),
		wasteRecords: z.array(z.record(z.string(), z.unknown())).optional(),
		waste: z.record(z.string(), z.unknown()).optional(),
		microclimateRecords: z.array(z.record(z.string(), z.unknown())).optional(),
		microclimate: z.record(z.string(), z.unknown()).optional(),
		bactericidalRecords: z.array(z.record(z.string(), z.unknown())).optional(),
		bactericidalLogs: z.array(z.record(z.string(), z.unknown())).optional(),
		bactericidalIrradiatorLogs: z.array(z.record(z.string(), z.unknown())).optional(),
	})
	.strict();

function isValidCalendarDateYmd(dateStr: string): boolean {
	const [y, m, d] = dateStr.split("-").map((v) => Number.parseInt(v, 10));
	if (!y || !m || !d) return false;
	const probe = new Date(Date.UTC(y, m - 1, d));
	return (
		probe.getUTCFullYear() === y &&
		probe.getUTCMonth() === m - 1 &&
		probe.getUTCDate() === d
	);
}

export async function handlePostSanpinShiftClose(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin shift-close write",
	);
	if (!organizationId) return;

	const parsedBody = sanpinShiftCloseBodySchema.safeParse(req.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры закрытия смены СанПиН.",
			details: parsedBody.error.issues,
		});
	}
	const bodyData = parsedBody.data;
	const dateStr = bodyData.shiftDate ?? bodyData.date;
	if (!dateStr || !isValidCalendarDateYmd(dateStr)) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Необходимо указать корректную дату смены (shiftDate или date в формате YYYY-MM-DD)",
		});
	}

	const operatorName = bodyData.responsibleStaffName || bodyData.operatorStaffFullName || "Дежурная медсестра / ассистент";
	const digitalStampHash =
		bodyData.digitalStampHash || `DENTE-SANPIN-${dateStr}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
	const operatorId = getRequestIdentity(req).userId || null;
	const body: Record<string, unknown> = { ...bodyData };

	try {
		const result = await withTenantWriteCtx(organizationId, async (tx) => {
			const insertedPsoCount = await saveShiftPsoRecords(tx, organizationId, body, operatorId, operatorName);
			const insertedSterilCount = await saveShiftAutoclaveRecords(tx, organizationId, body, operatorId, dateStr);
			const insertedWasteCount = await saveShiftWasteRecords(tx, organizationId, body, operatorId, dateStr, operatorName);
			const insertedMicroCount = await saveShiftMicroclimateRecords(tx, organizationId, body, operatorId, dateStr);
			const insertedBactCount = await saveShiftBactericidalRecords(tx, organizationId, body, operatorId, dateStr, operatorName);

			return {
				insertedPsoCount,
				insertedSterilCount,
				insertedWasteCount,
				insertedMicroCount,
				insertedBactCount,
			};
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_SHIFT_AUTO_CLOSED",
			payload: { date: dateStr, digitalStampHash },
		});

		return reply.send({
			success: true,
			date: dateStr,
			digitalStampHash,
			counts: result,
			savedRecords: {
				form257: result.insertedSterilCount,
				autoclaveCycles: result.insertedSterilCount,
				pso: result.insertedPsoCount,
				waste: result.insertedWasteCount,
				microclimate: result.insertedMicroCount,
				bactericidal: result.insertedBactCount,
			},
			messageRu: `Смена ${dateStr} успешно зафиксирована в журналах СанПиН.`,
		});
	} catch (err) {
		req.log.error(err, "Failed to commit sanpin shift close");
		return reply.status(500).send({
			error: "InternalServerError",
			message: err instanceof Error ? err.message : "Не удалось зафиксировать закрытие смены СанПиН",
		});
	}
}
