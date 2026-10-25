/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseBatchHandler.ts
 * Обработчик закрытия смены и фиксации журналов СанПиН.
 * Мандат 8b: строго <= 120 строк.
 */

import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { saveShiftAutoclaveRecords } from "./shiftCloseAutoclaveSaver.js";
import { saveShiftMicroclimateRecords } from "./shiftCloseMicroclimateSaver.js";
import { saveShiftPsoRecords } from "./shiftClosePsoSaver.js";
import { saveShiftWasteRecords } from "./shiftCloseWasteSaver.js";

export async function handlePostSanpinShiftClose(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin shift-close write",
	);
	if (!organizationId) return;

	const body = (req.body as Record<string, any>) || {};
	const dateStr = body.shiftDate || body.date;
	if (!dateStr || typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.slice(0, 10))) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Необходимо указать дату смены (shiftDate или date в формате YYYY-MM-DD)",
		});
	}

	const operatorName = body.responsibleStaffName || body.operatorStaffFullName || "Дежурная медсестра / ассистент";
	const digitalStampHash =
		body.digitalStampHash || `DENTE-SANPIN-${dateStr}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
	const operatorId = (req as any).user?.id || null;

	try {
		const result = await db.transaction(async (tx) => {
			const insertedPsoCount = await saveShiftPsoRecords(tx, organizationId, body, operatorId, operatorName);
			const insertedSterilCount = await saveShiftAutoclaveRecords(tx, organizationId, body, operatorId, dateStr);
			const insertedWasteCount = await saveShiftWasteRecords(tx, organizationId, body, operatorId, dateStr, operatorName);
			const insertedMicroCount = await saveShiftMicroclimateRecords(tx, organizationId, body, operatorId, dateStr);

			return {
				insertedPsoCount,
				insertedSterilCount,
				insertedWasteCount,
				insertedMicroCount,
				insertedBactCount: 0,
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
				pso: result.insertedPsoCount,
				waste: result.insertedWasteCount,
				microclimate: result.insertedMicroCount,
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
