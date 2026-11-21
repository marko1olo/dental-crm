import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
} from "../../../../db/schema.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import {
	calculateBactericidalLampResource,
	calculateCumulativeOperatingHours,
} from "../bactericidalHoursCalculator.js";
import { morningShiftBodySchema } from "../bactericidalSchemas.js";

export async function handleOpenMorningShift(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal open morning shift",
	);
	if (!organizationId) return;

	const parsed = morningShiftBodySchema.safeParse(req.body || {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры утренней смены.",
		});
	}
	const body = parsed.data;
	const dateStr = (body.date as string) || new Date().toISOString().slice(0, 10);
	const durationMinutes = 30;
	const targetEquipmentId = body.equipmentId ? String(body.equipmentId) : undefined;
	const operatorId = getRequestIdentity(req).userId ?? null;

	const results = await db.transaction(async (tx) => {
		const activeEquipments = await tx
			.select()
			.from(bactericidalEquipments)
			.where(
				and(
					eq(bactericidalEquipments.organizationId, organizationId),
					eq(bactericidalEquipments.isCommissioned, true),
					targetEquipmentId ? eq(bactericidalEquipments.id, targetEquipmentId) : undefined,
				),
			)
			.for("update");

		if (activeEquipments.length === 0) {
			return null;
		}

		const txResults: Array<{ equipmentId: string; deviceBrand: string; newTotalHours: number; status: string }> = [];

		for (const eqItem of activeEquipments) {
			const prevHours = Number(eqItem.totalOperatingHours);
			const newTotalHours = calculateCumulativeOperatingHours(prevHours, durationMinutes);
			const lampLife = calculateBactericidalLampResource(newTotalHours, eqItem.maxLampHours);

			await tx
				.update(bactericidalEquipments)
				.set({
					totalOperatingHours: String(newTotalHours),
					lampStatus: lampLife.status,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(bactericidalEquipments.id, eqItem.id),
						eq(bactericidalEquipments.organizationId, organizationId),
					),
				);

			const startTime = new Date(`${dateStr}T07:30:00Z`);
			const endTime = new Date(`${dateStr}T08:00:00Z`);

			const notesText =
				(body.notes as string) ||
				"Открыть утреннюю смену (бактерицидная обработка 30 мин + норма): предоперационная подготовка воздуха по СанПиН 3.3686-21 и Р 3.5.1904-04.";

			await tx.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: eqItem.id,
				date: dateStr,
				sessionStartTime: startTime,
				sessionEndTime: endTime,
				durationMinutes,
				operatingMode: "pre_op_preparation",
				cumulativeHoursAfterSession: String(newTotalHours),
				operatorId,
				notes: notesText,
			});

			txResults.push({
				equipmentId: eqItem.id,
				deviceBrand: eqItem.deviceBrand,
				newTotalHours,
				status: lampLife.status,
			});
		}

		return txResults;
	});

	if (!results || results.length === 0) {
		return reply.code(400).send({
			error: "NoActiveEquipments",
			message: targetEquipmentId
				? "Указанный бактерицидный облучатель не найден или не введен в эксплуатацию."
				: "В клинике не зарегистрировано активных бактерицидных облучателей.",
		});
	}

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_BACTERICIDAL_BATCH_UPDATED",
		payload: { results },
	});

	return reply.code(201).send({
		success: true,
		action: "open_morning_shift",
		message: `Утренняя смена открыта: бактерицидная обработка 30 мин + норма зафиксированы для ${results.length} аппаратов клиники (+0.5 ч наработки)`,
		results,
	});
}
