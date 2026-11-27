/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/createSterilizationLogHandler.ts
 *
 * Обработчик создания записи цикла стерилизации.
 * Мандат 8b: строго <= 120 строк.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../../db/rls.js";
import { sterilizationLogs } from "../../../../db/schema.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { extractIdempotencyKey, isValidUuid } from "../../../../utils/httpIdempotency.js";
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

	const idempotencyKey = extractIdempotencyKey(req);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

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

	const operatorId = data.operatorId ?? getRequestIdentity(req).userId ?? null;
	const batchCount = Math.max(
		1,
		Number(rawBody.packagesCount ?? rawBody.batchSize ?? 1),
	);

	const log = await withTenantWriteCtx(organizationId, async (tx) => {
		const [createdLog] = await tx
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
				operatorId,
				timestamp: now,
			})
			.returning();

		await executeSterilizationConsumablesDeduction({
			organizationId,
			userId: operatorId,
			count: batchCount,
			packagingType: data.packagingType,
			indicatorType: data.indicatorType,
			cycleNumber: data.cycleNumber,
			barcode: generatedBarcode,
			logger: req.log,
		}, tx);

		return createdLog;
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
