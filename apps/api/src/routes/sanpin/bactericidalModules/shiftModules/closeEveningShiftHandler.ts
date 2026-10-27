import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
} from "../../../../db/schema.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { calculateBactericidalLampResource } from "../bactericidalHoursCalculator.js";
import { eveningShiftBodySchema } from "../bactericidalSchemas.js";

export async function handleCloseEveningShift(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal close evening shift",
	);
	if (!organizationId) return;

	const parsed = eveningShiftBodySchema.safeParse(req.body || {});
	const body = parsed.success
		? parsed.data
		: ((req.body as any) || {});
	const dateStr = body.date || new Date().toISOString().slice(0, 10);
	const shiftHours = typeof body.shiftHours === "number" ? body.shiftHours : 6;
	const finalDisinfectionMinutes = 30;
	const totalSessionHours = Number((shiftHours + finalDisinfectionMinutes / 60).toFixed(2));
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
			const newTotalHours = Number((prevHours + totalSessionHours).toFixed(2));
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

			const shiftStart = new Date(`${dateStr}T08:00:00`);
			const shiftEnd = new Date(shiftStart.getTime() + shiftHours * 60 * 60 * 1000);
			const intermediateHours = Number((prevHours + shiftHours).toFixed(2));

			await tx.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: eqItem.id,
				date: dateStr,
				sessionStartTime: shiftStart,
				sessionEndTime: shiftEnd,
				durationMinutes: shiftHours * 60,
				operatingMode: "continuous_presence",
				cumulativeHoursAfterSession: String(intermediateHours),
				operatorId: req.user?.id ?? null,
				notes: `⚡ Рабочая смена (${shiftHours} ч): непрерывное обеззараживание воздуха рециркулятором по СанПиН 3.3686-21`,
			});

			const finalStart = new Date(`${dateStr}T19:30:00`);
			const finalEnd = new Date(`${dateStr}T20:00:00`);

			await tx.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: eqItem.id,
				date: dateStr,
				sessionStartTime: finalStart,
				sessionEndTime: finalEnd,
				durationMinutes: finalDisinfectionMinutes,
				operatingMode: "post_cleaning",
				cumulativeHoursAfterSession: String(newTotalHours),
				operatorId: req.user?.id ?? null,
				notes: "⚡ Закрыть вечернюю смену: заключительное обеззараживание помещений перед закрытием клиники по СанПиН 3.3686-21",
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
		action: "close_evening_shift",
		message: `⚡ Вечерняя смена закрыта: финальная дезинфекция и наработка ламп зафиксированы для ${results.length} аппаратов (+${totalSessionHours} ч)`,
		results,
	});
}
