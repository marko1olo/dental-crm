import { createGeneralCleaningLogDtoSchema } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { generalCleaningLogs, users } from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerSanpinCleaningRoutes(app: FastifyInstance) {
	// ─────────────────────────────────────────────────────────────────────────
	// 4. ЖУРНАЛ ГЕНЕРАЛЬНЫХ УБОРОК И ДЕЗИНФЕКЦИИ (СанПиН 3.3686-21)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/cleaning", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"cleaning read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: generalCleaningLogs.id,
				organizationId: generalCleaningLogs.organizationId,
				cleaningType: generalCleaningLogs.cleaningType,
				scheduledDate: generalCleaningLogs.scheduledDate,
				actualDateTime: generalCleaningLogs.actualDateTime,
				roomName: generalCleaningLogs.roomName,
				treatedAreaM2: generalCleaningLogs.treatedAreaM2,
				disinfectantName: generalCleaningLogs.disinfectantName,
				activeIngredient: generalCleaningLogs.activeIngredient,
				solutionConcentrationPercent: generalCleaningLogs.solutionConcentrationPercent,
				applicationMethod: generalCleaningLogs.applicationMethod,
				exposureTimeMinutes: generalCleaningLogs.exposureTimeMinutes,
				uvIrradiationMinutes: generalCleaningLogs.uvIrradiationMinutes,
				ventilationMinutes: generalCleaningLogs.ventilationMinutes,
				operatorId: generalCleaningLogs.operatorId,
				operatorName: users.fullName,
				inspectorId: generalCleaningLogs.inspectorId,
				status: generalCleaningLogs.status,
				notes: generalCleaningLogs.notes,
				createdAt: generalCleaningLogs.createdAt,
			})
			.from(generalCleaningLogs)
			.leftJoin(users, eq(users.id, generalCleaningLogs.operatorId))
			.where(eq(generalCleaningLogs.organizationId, organizationId))
			.orderBy(desc(generalCleaningLogs.scheduledDate), desc(generalCleaningLogs.actualDateTime));

		return logs.map((l) => ({
			...l,
			treatedAreaM2: Number(l.treatedAreaM2),
			solutionConcentrationPercent: Number(l.solutionConcentrationPercent),
		}));
	});

	app.post("/api/registers/cleaning", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"cleaning create",
		);
		if (!organizationId) return;

		const parsed = createGeneralCleaningLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры генеральной уборки.",
			});
		}
		const data = parsed.data;

		const [log] = await db
			.insert(generalCleaningLogs)
			.values({
				organizationId,
				cleaningType: data.cleaningType,
				scheduledDate: data.scheduledDate,
				actualDateTime: new Date(data.actualDateTime),
				roomName: data.roomName,
				treatedAreaM2: String(data.treatedAreaM2),
				disinfectantName: data.disinfectantName,
				activeIngredient: data.activeIngredient ?? null,
				solutionConcentrationPercent: String(data.solutionConcentrationPercent),
				applicationMethod: data.applicationMethod,
				exposureTimeMinutes: data.exposureTimeMinutes,
				uvIrradiationMinutes: data.uvIrradiationMinutes,
				ventilationMinutes: data.ventilationMinutes,
				operatorId: data.operatorId ?? null,
				inspectorId: data.inspectorId ?? null,
				status: data.status,
				notes: data.notes ?? null,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_CLEANING_ADDED",
			payload: log,
		});

		return reply.code(201).send(log);
	});

	app.put("/api/registers/cleaning/:id/verify", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"cleaning verify",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const [updated] = await db
			.update(generalCleaningLogs)
			.set({
				status: "verified_by_inspector",
			})
			.where(
				and(
					eq(generalCleaningLogs.id, id),
					eq(generalCleaningLogs.organizationId, organizationId),
				),
			)
			.returning();

		return updated;
	});

	app.post("/api/registers/cleaning/autopilot-month", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"cleaning autopilot create",
		);
		if (!organizationId) return;

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth(); // 0-11

		// Кабинеты стоматологической клиники со стандартными площадями по СанПиН
		const rooms = [
			{ name: "Кабинет № 1 (Терапия)", area: "24.5" },
			{ name: "Кабинет № 2 (Ортопедия)", area: "22.0" },
			{ name: "Операционная / Хирургический кабинет", area: "32.5" },
			{ name: "Стерилизационная (ЦСО)", area: "18.0" },
		];

		// Дни месяца с шагом 7 дней (по СанПиН 3.3686-21: генеральная уборка каждые 7 дней)
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

			for (const room of rooms) {
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
					operatorId: req.user?.id ?? null,
					status: isPastOrToday ? "completed" : "scheduled",
					notes: "График генеральных уборок (СанПиН 3.3686-21, интервал 7 дней)",
				});
			}
		}

		const created = await db
			.insert(generalCleaningLogs)
			.values(entriesToInsert)
			.returning();

		for (const log of created) {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "SANPIN_CLEANING_ADDED",
				payload: log,
			});
		}

		return reply.code(201).send({
			message: `График генеральных уборок сформирован на месяц (${created.length} записей, интервал 7 дней)`,
			count: created.length,
			records: created,
		});
	});
}
