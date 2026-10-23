/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/createSterilizationLogHandler.ts
 *
 * Обработчик создания записи цикла стерилизации.
 * Мандат 8b: строго <= 120 строк.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizationLogs } from "../../../../db/schema.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import {
	computeSterilizationExpiration,
	evaluateAutoclaveCycle,
	generateSterilizationBarcode,
} from "../sterilizationCycleEngine.js";
import {
	createSterilizationLogDtoSchema,
	normalizeSterilizationBody,
} from "../sterilizationSchemas.js";
import { executeSterilizationConsumablesDeduction } from "./sterilizationConsumablesDeduction.js";

export async function handleCreateSterilizationLog(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilization create",
	);
	if (!organizationId) return;

	const rawBody = (req.body as Record<string, unknown>) || {};
	const normalizedBody = normalizeSterilizationBody(rawBody);
	const parsed = createSterilizationLogDtoSchema.safeParse(normalizedBody);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные данные стерилизации.",
		});
	}
	const data = parsed.data;

	const now = new Date();
	const evaluation = evaluateAutoclaveCycle({
		temperatureCelsius: data.temperatureCelsius,
		pressureBar: data.pressureBar ?? null,
		durationMin: data.durationMin,
		passedIndicator: data.passedIndicator,
		biologicalTestResult: data.biologicalTestResult,
	});
	const status = evaluation.status;

	const expiresAt = computeSterilizationExpiration(data.packagingType, now, status);
	const generatedBarcode =
		typeof rawBody.barcode === "string" && rawBody.barcode.trim().length > 0
			? rawBody.barcode.trim()
			: generateSterilizationBarcode(data.cycleNumber, now);

	const rawNotes = typeof rawBody.notes === "string" ? rawBody.notes.trim() : "";
	const combinedItemsDesc = rawNotes ? `${data.itemsDescription} | ${rawNotes}` : data.itemsDescription;

	const [log] = await db
		.insert(sterilizationLogs)
		.values({
			organizationId,
			deviceName: data.deviceName,
			autoclaveId:
				data.autoclaveId ??
				(typeof rawBody.serialNumber === "string" ? rawBody.serialNumber : data.deviceName),
			cycleNumber: data.cycleNumber,
			itemsDescription: combinedItemsDesc,
			packagingType: data.packagingType,
			temperatureCelsius: String(data.temperatureCelsius),
			pressureBar:
				data.pressureBar !== null && data.pressureBar !== undefined ? String(data.pressureBar) : null,
			durationMin: data.durationMin,
			indicatorType: data.indicatorType,
			passedIndicator: data.passedIndicator,
			status,
			barcode: generatedBarcode,
			expiresAt,
			operatorId: data.operatorId ?? (req as any).user?.id ?? null,
			timestamp: now,
		})
		.returning();

	void executeSterilizationConsumablesDeduction({
		organizationId,
		userId: data.operatorId ?? (req as any).user?.id ?? null,
		count: 1,
		packagingType: data.packagingType,
		indicatorType: data.indicatorType,
		cycleNumber: data.cycleNumber,
		barcode: generatedBarcode,
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_STERILIZATION_ADDED",
		payload: log,
	});

	return reply.code(201).send(log);
}

export async function handleCreateSanpinCycle(req: FastifyRequest, reply: FastifyReply) {
	return handleCreateSterilizationLog(req, reply);
}
