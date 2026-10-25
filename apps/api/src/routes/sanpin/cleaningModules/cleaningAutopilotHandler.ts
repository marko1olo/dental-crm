/**
 * apps/api/src/routes/sanpin/cleaningModules/cleaningAutopilotHandler.ts
 * Формирование месячного графика генеральных уборок в 1 клик.
 * Мандат 8b: строго <= 120 строк.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { generalCleaningLogs } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

const DEFAULT_CLINIC_ROOMS = [
	{ name: "Кабинет № 1 (Терапия)", area: "24.5" },
	{ name: "Кабинет № 2 (Ортопедия)", area: "22.0" },
	{ name: "Операционная / Хирургический кабинет", area: "32.5" },
	{ name: "Стерилизационная (ЦСО)", area: "18.0" },
];

export async function handlePostCleaningAutopilotMonth(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"cleaning autopilot create",
	);
	if (!organizationId) return;

	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();

	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const cleaningDays: number[] = [];
	for (let day = 1; day <= daysInMonth; day += 7) {
		cleaningDays.push(day);
	}

	const entriesToInsert: Array<typeof generalCleaningLogs.$inferInsert> = [];

	for (const day of cleaningDays) {
		const scheduledDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const actualDate = new Date(year, month, day, 8, 0, 0);
		const isPastOrToday = actualDate <= now;

		for (const room of DEFAULT_CLINIC_ROOMS) {
			entriesToInsert.push({
				organizationId,
				cleaningType: "general",
				scheduledDate: scheduledDateStr,
				actualDateTime: actualDate,
				roomName: room.name,
				treatedAreaM2: room.area,
				disinfectantName: "Аламинол 1.5%",
				activeIngredient: "ЧАС + Глутаровый альдегид",
				solutionConcentrationPercent: "1.5",
				applicationMethod: "wiping",
				exposureTimeMinutes: 60,
				uvIrradiationMinutes: 60,
				ventilationMinutes: 15,
				operatorId: (req as any).user?.id ?? null,
				status: isPastOrToday ? "completed" : "scheduled",
				notes: "График генеральных уборок (интервал 7 дней)",
			});
		}
	}

	const created = await db.insert(generalCleaningLogs).values(entriesToInsert).returning();

	for (const log of created) {
		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_CLEANING_ADDED",
			payload: log,
		});
	}

	return reply.code(201).send({
		message: `График генеральных уборок сформирован на месяц (${created.length} записей, интервал 7 дней)`,
		count: created.length,
	});
}
