import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
} from "../../../../db/schema.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import {
	calculateBactericidalLampResource,
	calculateCumulativeOperatingHours,
	calculateSessionHours,
} from "../bactericidalHoursCalculator.js";
import { bactericidalAutopilotBodySchema } from "../bactericidalSchemas.js";

export async function handleBactericidalShiftAutopilot(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal shift autopilot",
	);
	if (!organizationId) return;

	const parsed = bactericidalAutopilotBodySchema.safeParse(req.body || {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры бактерицидной обработки.",
		});
	}
	const body = parsed.data;
	const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : 360;
	const dateStr: string = typeof body.date === "string" && body.date.trim() ? body.date : new Date().toISOString().slice(0, 10);
	const operatingMode: string =
		typeof body.operatingMode === "string" && body.operatingMode.trim()
			? body.operatingMode
			: durationMinutes <= 60
				? "pre_op_preparation"
				: "continuous_presence";
	const sessionHours = calculateSessionHours(durationMinutes);
	const targetEquipmentId = body.equipmentId ? String(body.equipmentId) : undefined;

	const results = await withTenantCtx(organizationId, async (tx) => {
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

			const startTime = new Date(`${dateStr}T08:00:00Z`);
			const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

			const notesText: string =
				typeof body.notes === "string" && body.notes.trim()
					? body.notes
					: durationMinutes <= 30 && operatingMode === "pre_op_preparation"
						? "Включение баклампы перед сменой (30 мин) — предоперационная подготовка по СанПиН 3.3686-21."
						: `Автоматический учет смены (${sessionHours} ч / ${durationMinutes} мин) по Р 3.5.1904-04 / СанПиН 3.3686-21.`;

			await tx.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: eqItem.id,
				date: dateStr,
				sessionStartTime: startTime,
				sessionEndTime: endTime,
				durationMinutes,
				operatingMode,
				cumulativeHoursAfterSession: String(newTotalHours),
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
		message: `Успешно зафиксирована наработка для ${results.length} облучателей (+${sessionHours} ч)`,
		results,
	});
}
