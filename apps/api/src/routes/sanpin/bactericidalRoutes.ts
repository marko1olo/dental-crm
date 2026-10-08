import {
	SanPiNRegulatoryEngine,
	createBactericidalEquipmentDtoSchema,
	createBactericidalLogEntryDtoSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerSanpinBactericidalRoutes(app: FastifyInstance) {
	// ─────────────────────────────────────────────────────────────────────────
	// 3. ЖУРНАЛ РЕЦИРКУЛЯТОРОВ И ОБЛУЧАТЕЛЕЙ (Р 3.5.1904-04)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/bactericidal/equipments", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal equipments read",
		);
		if (!organizationId) return;

		const list = await db
			.select()
			.from(bactericidalEquipments)
			.where(eq(bactericidalEquipments.organizationId, organizationId))
			.orderBy(bactericidalEquipments.roomName);

		return list.map((eqRow) => {
			const totalHours = Number(eqRow.totalOperatingHours);
			const maxHours = eqRow.maxLampHours;
			const lampLife = SanPiNRegulatoryEngine.calculateLampLife(totalHours, maxHours);

			return {
				...eqRow,
				roomVolumeM3: Number(eqRow.roomVolumeM3),
				roomAreaM2: eqRow.roomAreaM2 ? Number(eqRow.roomAreaM2) : null,
				totalOperatingHours: totalHours,
				remainingLampHours: lampLife.remainingHours,
				remainingLampPercent: lampLife.remainingPercent,
				lampStatus: lampLife.status,
				isLampCritical: lampLife.isCritical,
				lampWarningMessage: lampLife.warningMessage,
			};
		});
	});

	app.post("/api/registers/bactericidal/equipments", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal equipment create",
		);
		if (!organizationId) return;

		const parsed = createBactericidalEquipmentDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры оборудования.",
			});
		}
		const data = parsed.data;

		const [created] = await db
			.insert(bactericidalEquipments)
			.values({
				organizationId,
				roomName: data.roomName,
				roomVolumeM3: String(data.roomVolumeM3),
				roomAreaM2: data.roomAreaM2 ? String(data.roomAreaM2) : null,
				deviceBrand: data.deviceBrand,
				serialNumber: data.serialNumber,
				deviceType: data.deviceType,
				lampType: data.lampType,
				lampCount: data.lampCount,
				maxLampHours: data.maxLampHours,
				totalOperatingHours: String(data.totalOperatingHours || 0),
				lampStatus: "normal",
				lastLampReplacementDate: data.lastLampReplacementDate ?? null,
				isCommissioned: data.isCommissioned ?? true,
				notes: data.notes ?? null,
			})
			.returning();

		return reply.code(201).send(created);
	});

	app.put("/api/registers/bactericidal/equipments/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal equipment update",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const body = req.body as {
			action?: "replace_lamps";
			roomName?: string;
			roomVolumeM3?: number;
			deviceBrand?: string;
			serialNumber?: string;
			maxLampHours?: number;
		};

		if (body.action === "replace_lamps") {
			const today = new Date().toISOString().slice(0, 10);
			const [updated] = await db
				.update(bactericidalEquipments)
				.set({
					totalOperatingHours: "0.00",
					lastLampReplacementDate: today,
					lampStatus: "normal",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(bactericidalEquipments.id, id),
						eq(bactericidalEquipments.organizationId, organizationId),
					),
				)
				.returning();

			return updated;
		}

		const [updated] = await db
			.update(bactericidalEquipments)
			.set({
				...(body.roomName ? { roomName: body.roomName } : {}),
				...(body.roomVolumeM3 ? { roomVolumeM3: String(body.roomVolumeM3) } : {}),
				...(body.deviceBrand ? { deviceBrand: body.deviceBrand } : {}),
				...(body.serialNumber ? { serialNumber: body.serialNumber } : {}),
				...(body.maxLampHours ? { maxLampHours: body.maxLampHours } : {}),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(bactericidalEquipments.id, id),
					eq(bactericidalEquipments.organizationId, organizationId),
				),
			)
			.returning();

		return updated;
	});

	app.delete("/api/registers/bactericidal/equipments/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal equipment delete",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		await db
			.delete(bactericidalEquipments)
			.where(
				and(
					eq(bactericidalEquipments.id, id),
					eq(bactericidalEquipments.organizationId, organizationId),
				),
			);
		return { success: true, id };
	});

	app.get("/api/registers/bactericidal/logs", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal logs read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: bactericidalIrradiatorLogs.id,
				organizationId: bactericidalIrradiatorLogs.organizationId,
				equipmentId: bactericidalIrradiatorLogs.equipmentId,
				roomName: bactericidalEquipments.roomName,
				deviceBrand: bactericidalEquipments.deviceBrand,
				serialNumber: bactericidalEquipments.serialNumber,
				date: bactericidalIrradiatorLogs.date,
				sessionStartTime: bactericidalIrradiatorLogs.sessionStartTime,
				sessionEndTime: bactericidalIrradiatorLogs.sessionEndTime,
				durationMinutes: bactericidalIrradiatorLogs.durationMinutes,
				operatingMode: bactericidalIrradiatorLogs.operatingMode,
				cumulativeHoursAfterSession: bactericidalIrradiatorLogs.cumulativeHoursAfterSession,
				operatorId: bactericidalIrradiatorLogs.operatorId,
				operatorName: users.fullName,
				notes: bactericidalIrradiatorLogs.notes,
				createdAt: bactericidalIrradiatorLogs.createdAt,
			})
			.from(bactericidalIrradiatorLogs)
			.innerJoin(
				bactericidalEquipments,
				eq(bactericidalEquipments.id, bactericidalIrradiatorLogs.equipmentId),
			)
			.leftJoin(users, eq(users.id, bactericidalIrradiatorLogs.operatorId))
			.where(eq(bactericidalIrradiatorLogs.organizationId, organizationId))
			.orderBy(desc(bactericidalIrradiatorLogs.date), desc(bactericidalIrradiatorLogs.sessionStartTime));

		return logs.map((l) => ({
			...l,
			cumulativeHoursAfterSession: Number(l.cumulativeHoursAfterSession),
			durationHours: Number((l.durationMinutes / 60).toFixed(2)),
		}));
	});

	app.post("/api/registers/bactericidal/logs", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal log create",
		);
		if (!organizationId) return;

		const parsed = createBactericidalLogEntryDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры сеанса облучателя.",
			});
		}
		const data = parsed.data;

		const [equipment] = await db
			.select()
			.from(bactericidalEquipments)
			.where(
				and(
					eq(bactericidalEquipments.id, data.equipmentId),
					eq(bactericidalEquipments.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!equipment) {
			return reply.code(404).send({
				error: "NotFound",
				message: "Бактерицидный облучатель не найден в клинике.",
			});
		}

		const sessionHours = data.durationMinutes / 60;
		const prevHours = Number(equipment.totalOperatingHours);
		const newTotalHours = Number((prevHours + sessionHours).toFixed(2));
		const lampLife = SanPiNRegulatoryEngine.calculateLampLife(
			newTotalHours,
			equipment.maxLampHours,
		);

		// Combine date with time for start/end
		const startTime = new Date(`${data.date}T${data.sessionStartTime.length === 5 ? data.sessionStartTime + ":00" : data.sessionStartTime}`);
		const endTime = new Date(`${data.date}T${data.sessionEndTime.length === 5 ? data.sessionEndTime + ":00" : data.sessionEndTime}`);

		const [log] = await db.transaction(async (tx) => {
			// Update equipment operating hours and lamp status
			await tx
				.update(bactericidalEquipments)
				.set({
					totalOperatingHours: String(newTotalHours),
					lampStatus: lampLife.status,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(bactericidalEquipments.id, equipment.id),
						eq(bactericidalEquipments.organizationId, organizationId),
					),
				);

			const [inserted] = await tx
				.insert(bactericidalIrradiatorLogs)
				.values({
					organizationId,
					equipmentId: data.equipmentId,
					date: data.date,
					sessionStartTime: isNaN(startTime.getTime()) ? new Date() : startTime,
					sessionEndTime: isNaN(endTime.getTime()) ? new Date() : endTime,
					durationMinutes: data.durationMinutes,
					operatingMode: data.operatingMode,
					cumulativeHoursAfterSession: String(newTotalHours),
					operatorId: data.operatorId ?? null,
					notes: data.notes ?? null,
				})
				.returning();

			return [inserted];
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_BACTERICIDAL_LOG_ADDED",
			payload: { log, lampLife },
		});

		return reply.code(201).send({
			success: true,
			log,
			lampLife,
		});
	});

	/**
	 * POST /api/registers/bactericidal/shift-autopilot
	 * Автоматический учет наработки часов УФ-лампы для всех облучателей клиники за смену.
	 */
	app.post("/api/registers/bactericidal/shift-autopilot", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal shift autopilot",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : 360; // 6 hours default shift
		const dateStr = body.date || new Date().toISOString().slice(0, 10);
		const operatingMode = body.operatingMode || (durationMinutes <= 60 ? "pre_op_preparation" : "continuous_presence");
		const sessionHours = Number((durationMinutes / 60).toFixed(2));
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
				const newTotalHours = Number((prevHours + sessionHours).toFixed(2));
				const lampLife = SanPiNRegulatoryEngine.calculateLampLife(
					newTotalHours,
					eqItem.maxLampHours,
				);

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
	});

	/**
	 * POST /api/registers/bactericidal/open-morning-shift
	 * 1-клик действие для медсестры: «Открыть утреннюю смену (бактерицидная обработка 30 мин + норма)»
	 * Автоматически рассчитывает наработку (+0.5 ч) для всех активных облучателей/рециркуляторов клиники,
	 * проверяет ресурс ламп и вносит запись в Журнал по СанПиН 3.3686-21 и Р 3.5.1904-04 без ручного счета.
	 */
	app.post("/api/registers/bactericidal/open-morning-shift", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal open morning shift",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
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
				const newTotalHours = Number((prevHours + sessionHours).toFixed(2));
				const lampLife = SanPiNRegulatoryEngine.calculateLampLife(
					newTotalHours,
					eqItem.maxLampHours,
				);

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
	});

	/**
	 * POST /api/registers/bactericidal/close-evening-shift
	 * 1-клик действие для медсестры: «Закрыть вечернюю смену (финальная дезинфекция)»
	 * Фиксирует непрерывную работу рециркуляторов в присутствии людей (6 ч) + вечернюю заключительную дезинфекцию (30 мин)
	 * Всего +6.5 ч суммарной наработки без необходимости ручных подсчетов на калькуляторе.
	 */
	app.post("/api/registers/bactericidal/close-evening-shift", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"bactericidal close evening shift",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
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
				const lampLife = SanPiNRegulatoryEngine.calculateLampLife(
					newTotalHours,
					eqItem.maxLampHours,
				);

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
	});
}
