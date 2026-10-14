import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	calculateBactericidalLampResource,
	calculateCumulativeOperatingHours,
	calculateSessionHours,
} from "./bactericidalHoursCalculator.js";
import {
	bactericidalAutopilotBodySchema,
	eveningShiftBodySchema,
	morningShiftBodySchema,
} from "./bactericidalSchemas.js";

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
	const body = parsed.success
		? parsed.data
		: // biome-ignore lint/suspicious/noExplicitAny: fallback for unparseable payload
			((req.body as any) || {});
	const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : 360; // 6 hours default shift
	const dateStr = body.date || new Date().toISOString().slice(0, 10);
	const operatingMode =
		body.operatingMode || (durationMinutes <= 60 ? "pre_op_preparation" : "continuous_presence");
	const sessionHours = calculateSessionHours(durationMinutes);
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

			const startTime = new Date(`${dateStr}T08:00:00`);
			const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

			const notesText =
				body.notes ||
				(durationMinutes <= 30 && operatingMode === "pre_op_preparation"
					? "⚡ Включение баклампы перед сменой (30 мин) — предоперационная подготовка по СанПиН 3.3686-21."
					: `⚡ Автоматический учет смены (${sessionHours} ч / ${durationMinutes} мин) по Р 3.5.1904-04 / СанПиН 3.3686-21.`);

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
		message: `Успешно зафиксирована наработка для ${results.length} облучателей (+${sessionHours} ч)`,
		results,
	});
}

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
		: // biome-ignore lint/suspicious/noExplicitAny: fallback for unparseable payload
			((req.body as any) || {});
	const dateStr = body.date || new Date().toISOString().slice(0, 10);
	const durationMinutes = 30;
	const sessionHours = 0.5;
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
		: // biome-ignore lint/suspicious/noExplicitAny: fallback for unparseable payload
			((req.body as any) || {});
	const dateStr = body.date || new Date().toISOString().slice(0, 10);
	const shiftHours = typeof body.shiftHours === "number" ? body.shiftHours : 6;
	const finalDisinfectionMinutes = 30;
	const totalSessionHours = Number((shiftHours + finalDisinfectionMinutes / 60).toFixed(2)); // e.g. 6.5 h
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

			// 1. Запись непрерывной работы в смену
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
				notes: `⚡ Рабочая смена (${shiftHours} ч): непрерывное обеззараживание воздуха рециркулятором в присутствии персонала и пациентов по СанПиН 3.3686-21`,
			});

			// 2. Запись финальной вечерней дезинфекции (30 мин)
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
				notes: "⚡ Закрыть вечернюю смену (финальная дезинфекция): заключительное обеззараживание помещений перед закрытием клиники по СанПиН 3.3686-21",
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
