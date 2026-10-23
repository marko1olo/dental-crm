/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/sterilizationBarcodeHandler.ts
 *
 * Сканирование и обработка штрихкодов крафт-пакетов стерилизации.
 * Мандат 8b: строго <= 120 строк.
 */

import { computePackagingExpirationDate, type SterilizationPackagingType } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizationLogs, users } from "../../../../db/schema.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { scanSchema } from "../sterilizationSchemas.js";

export async function handleScanSterilization(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization scan");
	if (!organizationId) return;

	const scanParsed = scanSchema.safeParse(req.body);
	if (!scanParsed.success) {
		const firstIssue = scanParsed.error.issues[0];
		const firstError = !req.body || typeof req.body !== "object" || Array.isArray(req.body)
			? "Некорректные данные стерилизации: ожидается объект с barcode и autoclaveId."
			: (firstIssue?.message ?? "Проверьте данные стерилизации.");
		return reply.code(400).send({ error: "ValidationError", message: firstError });
	}
	const data = scanParsed.data;

	if (data.operatorId) {
		const [operator] = await db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.id, data.operatorId), eq(users.organizationId, organizationId)))
			.limit(1);
		if (!operator) {
			return reply.code(400).send({
				error: "OperatorNotFound",
				message: "Оператор стерилизации не найден в этой клинике. Выберите сотрудника из списка персонала клиники.",
			});
		}
	}

	const now = new Date();
	const expiresAt = data.status === "passed"
		? computePackagingExpirationDate(data.packagingType as SterilizationPackagingType, now)
		: null;

	const passedIndicator = data.status === "passed";

	const [log] = await db
		.insert(sterilizationLogs)
		.values({
			organizationId,
			barcode: data.barcode,
			autoclaveId: data.autoclaveId,
			deviceName: data.deviceName || "Автоклав 1",
			cycleNumber: data.cycleNumber || 1,
			temperatureCelsius: data.temperatureCelsius ? String(data.temperatureCelsius) : null,
			pressureBar: data.pressureBar ? String(data.pressureBar) : null,
			itemsDescription: data.itemsDescription || null,
			operatorId: data.operatorId || null,
			status: data.status,
			passedIndicator,
			packagingType: data.packagingType || null,
			expiresAt,
			indicatorType: data.indicatorType || null,
			cycleMode: data.cycleMode || null,
			durationMin: data.durationMin || null,
			timestamp: now,
		})
		.returning();

	wsBroker.broadcastToOrganization(organizationId, { type: "STERILIZATION_LOG_ADDED", payload: log });

	return reply.code(201).send(log);
}
