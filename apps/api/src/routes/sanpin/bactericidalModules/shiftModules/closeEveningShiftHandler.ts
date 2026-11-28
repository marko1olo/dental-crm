import { resolveValidIanaTimeZone, todayDateKeyInTimeZone } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../../db/rls.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
} from "../../../../db/schema.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import { clinicTimeZone } from "../../../../services/reports/managerReports/timezone.js";
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
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры вечерней смены.",
		});
	}
	const body = parsed.data;
	const explicitDate = typeof body.date === "string" && body.date ? body.date : null;
	const shiftHours = typeof body.shiftHours === "number" ? body.shiftHours : 6;
	const finalDisinfectionMinutes = 30;
	const totalSessionHours = Number((shiftHours + finalDisinfectionMinutes / 60).toFixed(2));
	const targetEquipmentId = body.equipmentId ? String(body.equipmentId) : undefined;
	const operatorId = getRequestIdentity(req).userId ?? null;

	const results = await withTenantWriteCtx(organizationId, async (tx) => {
		const dateStr =
			explicitDate ??
			todayDateKeyInTimeZone(resolveValidIanaTimeZone(await clinicTimeZone(organizationId, tx)));
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

			const shiftStart = new Date(`${dateStr}T08:00:00Z`);
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
				operatorId,
				notes: `Рабочая смена (${shiftHours} ч): непрерывное обеззараживание воздуха рециркулятором по СанПиН 3.3686-21`,
			});

			const finalStart = new Date(`${dateStr}T19:30:00Z`);
			const finalEnd = new Date(`${dateStr}T20:00:00Z`);

			await tx.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: eqItem.id,
				date: dateStr,
				sessionStartTime: finalStart,
				sessionEndTime: finalEnd,
				durationMinutes: finalDisinfectionMinutes,
				operatingMode: "post_cleaning",
				cumulativeHoursAfterSession: String(newTotalHours),
				operatorId,
				notes: "Закрыть вечернюю смену: заключительное обеззараживание помещений перед закрытием клиники по СанПиН 3.3686-21",
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
		action: "close_evening_shift",
		message: `Вечерняя смена закрыта: финальная дезинфекция и наработка ламп зафиксированы для ${results.length} аппаратов (+${totalSessionHours} ч)`,
		results,
	});
}
