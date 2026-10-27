import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
} from "../../../../db/schema.js";
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
	const body = parsed.success
		? parsed.data
		: ((req.body as any) || {});
	const dateStr = body.date || new Date().toISOString().slice(0, 10);
	const durationMinutes = 30;
	const targetEquipmentId = body.equipmentId ? String(body.equipmentId) : undefined;

	const activeEquipments = await db
		.select()
		.from(bactericidalEquipments)
		.where(
			and(
				eq(bactericidalEquipments.organizationId, organizationId),
				eq(bactericidalEquipments.isCommissioned, true),
				targetEquipmentId ? eq(bactericidalEquipments.id, targetEquipmentId) : undefined,
			),
		);

	if (activeEquipments.length === 0) {
		return reply.code(400).send({
			error: "NoActiveEquipments",
			message: targetEquipmentId
				? "Указанный бактерицидный облучатель не найден или не введен в эксплуатацию."
				: "В клинике не зарегистрировано активных бактерицидных облучателей.",
		});
	}

	const results: Array<{ equipmentId: string; deviceBrand: string; newTotalHours: number; status: string }> = [];

	await db.transaction(async (tx) => {
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

			const startTime = new Date(`${dateStr}T07:30:00`);
			const endTime = new Date(`${dateStr}T08:00:00`);

			const notesText =
				body.notes ||
				"⚡ Открыть утреннюю смену (бактерицидная обработка 30 мин + норма): предоперационная подготовка воздуха по СанПиН 3.3686-21 и Р 3.5.1904-04.";

			await tx.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: eqItem.id,
				date: dateStr,
				sessionStartTime: startTime,
				sessionEndTime: endTime,
				durationMinutes,
				operatingMode: "pre_op_preparation",
				cumulativeHoursAfterSession: String(newTotalHours),
				operatorId: req.user?.id ?? null,
				notes: notesText,
			});

			results.push({
				equipmentId: eqItem.id,
				deviceBrand: eqItem.deviceBrand,
				newTotalHours,
				status: lampLife.status,
			});
		}
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_BACTERICIDAL_BATCH_UPDATED",
		payload: { results },
	});

	return reply.code(201).send({
		success: true,
		action: "open_morning_shift",
		message: `⚡ Утренняя смена открыта: бактерицидная обработка 30 мин + норма зафиксированы для ${results.length} аппаратов клиники (+0.5 ч наработки)`,
		results,
	});
}
