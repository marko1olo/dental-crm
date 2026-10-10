import crypto from "node:crypto";
import {
	computePackagingExpirationDate,
	createSterilizationLogDtoSchema,
	createSterilizerEquipmentDtoSchema,
	updateSterilizerEquipmentDtoSchema,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	sterilizationLogs,
	sterilizerEquipments,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerSanpinSterilizationRoutes(app: FastifyInstance) {
	// ─────────────────────────────────────────────────────────────────────────
	// 2. ЖУРНАЛ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/sterilization", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: sterilizationLogs.id,
				organizationId: sterilizationLogs.organizationId,
				deviceName: sterilizationLogs.deviceName,
				autoclaveId: sterilizationLogs.autoclaveId,
				cycleNumber: sterilizationLogs.cycleNumber,
				temperatureCelsius: sterilizationLogs.temperatureCelsius,
				pressureBar: sterilizationLogs.pressureBar,
				itemsDescription: sterilizationLogs.itemsDescription,
				operatorId: sterilizationLogs.operatorId,
				operatorName: users.fullName,
				barcode: sterilizationLogs.barcode,
				status: sterilizationLogs.status,
				passedIndicator: sterilizationLogs.passedIndicator,
				packagingType: sterilizationLogs.packagingType,
				expiresAt: sterilizationLogs.expiresAt,
				indicatorType: sterilizationLogs.indicatorType,
				cycleMode: sterilizationLogs.cycleMode,
				durationMin: sterilizationLogs.durationMin,
				timestamp: sterilizationLogs.timestamp,
				createdAt: sterilizationLogs.createdAt,
			})
			.from(sterilizationLogs)
			.leftJoin(users, eq(users.id, sterilizationLogs.operatorId))
			.where(eq(sterilizationLogs.organizationId, organizationId))
			.orderBy(desc(sterilizationLogs.timestamp));

		return logs;
	});

	app.post("/api/registers/sterilization", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization create",
		);
		if (!organizationId) return;

		const parsed = createSterilizationLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные данные стерилизации.",
			});
		}
		const data = parsed.data;

		const now = new Date();
		const status =
			data.passedIndicator && data.biologicalTestResult !== "failed" ? "passed" : "failed";

		const expiresAt =
			status === "passed"
				? computePackagingExpirationDate(
						data.packagingType as SterilizationPackagingType,
						now,
					)
				: null;

		const cleanCycle = String(data.cycleNumber).padStart(3, "0");
		const yyyy = now.getFullYear().toString();
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");
		const generatedBarcode = `DNT-STER-C${cleanCycle}-${yyyy}${mm}${dd}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

		const [log] = await db
			.insert(sterilizationLogs)
			.values({
				organizationId,
				deviceName: data.deviceName,
				autoclaveId: data.autoclaveId ?? data.deviceName,
				cycleNumber: data.cycleNumber,
				itemsDescription: data.itemsDescription,
				packagingType: data.packagingType,
				temperatureCelsius: String(data.temperatureCelsius),
				pressureBar: data.pressureBar !== null && data.pressureBar !== undefined ? String(data.pressureBar) : null,
				durationMin: data.durationMin,
				indicatorType: data.indicatorType,
				passedIndicator: data.passedIndicator,
				status,
				barcode: generatedBarcode,
				expiresAt,
				operatorId: data.operatorId ?? null,
				timestamp: now,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_STERILIZATION_ADDED",
			payload: log,
		});

		return reply.code(201).send(log);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2a. КАНОНИЧЕСКИЙ РОУТ ЦИКЛОВ АВТОКЛАВА (/api/sanpin/cycles)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/sanpin/cycles", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sanpin cycles read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: sterilizationLogs.id,
				organizationId: sterilizationLogs.organizationId,
				deviceName: sterilizationLogs.deviceName,
				autoclaveId: sterilizationLogs.autoclaveId,
				cycleNumber: sterilizationLogs.cycleNumber,
				temperatureCelsius: sterilizationLogs.temperatureCelsius,
				pressureBar: sterilizationLogs.pressureBar,
				itemsDescription: sterilizationLogs.itemsDescription,
				operatorId: sterilizationLogs.operatorId,
				operatorName: users.fullName,
				barcode: sterilizationLogs.barcode,
				status: sterilizationLogs.status,
				passedIndicator: sterilizationLogs.passedIndicator,
				packagingType: sterilizationLogs.packagingType,
				expiresAt: sterilizationLogs.expiresAt,
				indicatorType: sterilizationLogs.indicatorType,
				cycleMode: sterilizationLogs.cycleMode,
				durationMin: sterilizationLogs.durationMin,
				timestamp: sterilizationLogs.timestamp,
				createdAt: sterilizationLogs.createdAt,
			})
			.from(sterilizationLogs)
			.leftJoin(users, eq(users.id, sterilizationLogs.operatorId))
			.where(eq(sterilizationLogs.organizationId, organizationId))
			.orderBy(desc(sterilizationLogs.timestamp));

		return logs;
	});

	app.post("/api/sanpin/cycles", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sanpin cycles create",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const now = new Date();
		const cycleNumber = Number(body.cycleNumber) || 1;
		const deviceName = body.deviceName || body.sterilizerId || "Автоклав 1 (Класс B)";
		const autoclaveId = body.autoclaveId || body.sterilizerId || "АК-01";
		const temp = body.temperatureCelsius !== undefined ? String(body.temperatureCelsius) : "134.0";
		const pressure = body.pressureBar !== undefined ? String(body.pressureBar) : "2.10";
		const duration = body.durationMin || body.exposureMinutes || 5;
		const itemsDescription = body.itemsDescription || body.itemsDescriptionRu || "Стоматологический инструментарий";
		const packagingType = body.packagingType || "kraft_self_adhesive";
		const passedIndicator = body.passedIndicator !== undefined ? Boolean(body.passedIndicator) : true;
		const status = body.status === "failed" ? "failed" : passedIndicator ? "passed" : "failed";
		const cleanCycle = String(cycleNumber).padStart(3, "0");
		const yyyy = now.getFullYear().toString();
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");
		const generatedBarcode = body.barcode || `DNT-STER-C${cleanCycle}-${yyyy}${mm}${dd}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
		const expiresAt = status === "passed"
			? computePackagingExpirationDate(packagingType as SterilizationPackagingType, now)
			: null;

		const [log] = await db
			.insert(sterilizationLogs)
			.values({
				organizationId,
				deviceName,
				autoclaveId,
				cycleNumber,
				itemsDescription,
				packagingType,
				temperatureCelsius: temp,
				pressureBar: pressure,
				durationMin: duration,
				indicatorType: body.indicatorType || "class5_integrating",
				passedIndicator,
				status,
				barcode: generatedBarcode,
				expiresAt,
				operatorId: body.operatorId || null,
				timestamp: now,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_STERILIZATION_ADDED",
			payload: log,
		});

		return reply.code(201).send(log);
	});

	// 1-КЛИК ПАКЕТНАЯ РЕГИСТРАЦИЯ ЦИКЛОВ СТЕРИЛИЗАЦИИ СМЕНЫ (СанПиН 3.3686-21, Форма 257/у)
	app.post("/api/registers/sterilization/shift-batch", async (req: any, reply: any) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization shift batch create",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const cyclesCount = Math.min(Math.max(Number(body.cyclesCount) || 1, 1), 5);
		const deviceName = body.deviceName || "Автоклав B-класса (ЦСО №1)";
		const packagingType = (body.packagingType as SterilizationPackagingType) || "kraft_bag";
		const itemsDescription =
			body.itemsDescription ||
			"Базовый стоматологический набор смены (лотки, зеркала, зонды, пинцеты, боры)";

		const now = new Date();
		const yyyy = now.getFullYear().toString();
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");

		// Определяем начальный номер цикла за сегодня
		const existingToday = await db
			.select({ cycleNumber: sterilizationLogs.cycleNumber })
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					gte(
						sterilizationLogs.timestamp,
						new Date(now.getFullYear(), now.getMonth(), now.getDate()),
					),
				),
			)
			.orderBy(desc(sterilizationLogs.cycleNumber))
			.limit(1);

		const startCycle = (existingToday[0]?.cycleNumber ?? 0) + 1;
		const expiresAt = computePackagingExpirationDate(packagingType, now);
		const logsToInsert: any[] = [];

		for (let i = 0; i < cyclesCount; i++) {
			const cycleNumber = startCycle + i;
			const cleanCycle = String(cycleNumber).padStart(3, "0");
			const generatedBarcode = `DNT-STER-C${cleanCycle}-${yyyy}${mm}${dd}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

			logsToInsert.push({
				organizationId,
				deviceName,
				autoclaveId: body.autoclaveId || deviceName,
				cycleNumber,
				itemsDescription,
				packagingType,
				temperatureCelsius: "134",
				pressureBar: "2.15",
				durationMin: 5,
				indicatorType: "chemical_class_5",
				passedIndicator: true,
				status: "passed" as const,
				barcode: generatedBarcode,
				expiresAt,
				operatorId: req.user?.id || null,
				timestamp: new Date(now.getTime() + i * 60000),
			});
		}

		const inserted = await db.insert(sterilizationLogs).values(logsToInsert).returning();

		for (const insertedLog of inserted) {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "SANPIN_STERILIZATION_ADDED",
				payload: insertedLog,
			});
		}

		return reply.code(201).send({
			success: true,
			count: inserted.length,
			logs: inserted,
			message: `Зарегистрировано циклов смены: ${inserted.length} (134°C, 2.15 бар, 5 мин)`,
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2.1. ПАРК СТЕРИЛИЗАТОРОВ И АВТОКЛАВОВ (ОБОРУДОВАНИЕ ЦСО)
	// ─────────────────────────────────────────────────────────────────────────

	const handleGetSterilizerEquipments = async (req: any, reply: any) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilizer equipments read",
		);
		if (!organizationId) return;

		const list = await db
			.select()
			.from(sterilizerEquipments)
			.where(eq(sterilizerEquipments.organizationId, organizationId))
			.orderBy(sterilizerEquipments.name);

		const todayStr = new Date().toISOString().slice(0, 10);
		const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

		return list.map((row) => {
			const isVerificationExpired = Boolean(row.verificationExpiryDate && row.verificationExpiryDate < todayStr);
			const isVerificationDueSoon = Boolean(
				row.verificationExpiryDate &&
				row.verificationExpiryDate >= todayStr &&
				row.verificationExpiryDate <= in30Days,
			);

			return {
				...row,
				chamberVolumeLiters: Number(row.chamberVolumeLiters),
				isVerificationExpired,
				isVerificationDueSoon,
			};
		});
	};

	app.get("/api/registers/sterilizers/equipments", handleGetSterilizerEquipments);
	app.get("/api/registers/sterilizer/equipments", handleGetSterilizerEquipments);

	const handleCreateSterilizerEquipment = async (req: any, reply: any) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilizer equipment create",
		);
		if (!organizationId) return;

		const parsed = createSterilizerEquipmentDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры аппарата.",
			});
		}
		const data = parsed.data;

		const [created] = await db
			.insert(sterilizerEquipments)
			.values({
				organizationId,
				name: data.name,
				brandModel: data.brandModel,
				serialNumber: data.serialNumber,
				inventoryNumber: data.inventoryNumber ?? null,
				deviceType: data.deviceType,
				deviceClass: data.deviceClass,
				chamberVolumeLiters: String(data.chamberVolumeLiters),
				locationRoom: data.locationRoom,
				verificationExpiryDate: data.verificationExpiryDate ?? null,
				lastMaintenanceDate: data.lastMaintenanceDate ?? null,
				nextMaintenanceDate: data.nextMaintenanceDate ?? null,
				commissioningDate: data.commissioningDate ?? new Date().toISOString().slice(0, 10),
				status: data.status ?? "active",
				isCommissioned: data.status !== "decommissioned",
				notes: data.notes ?? null,
			})
			.returning();

		if (!created) {
			return reply.code(500).send({
				error: "InternalError",
				message: "Не удалось сохранить оборудование стерилизации.",
			});
		}

		return reply.code(201).send({
			...created,
			chamberVolumeLiters: Number(created.chamberVolumeLiters),
		});
	};

	app.post("/api/registers/sterilizers/equipments", handleCreateSterilizerEquipment);
	app.post("/api/registers/sterilizer/equipments", handleCreateSterilizerEquipment);

	const handleUpdateSterilizerEquipment = async (req: any, reply: any) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilizer equipment update",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const parsed = updateSterilizerEquipmentDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры обновления.",
			});
		}
		const body = parsed.data;
		const today = new Date().toISOString().slice(0, 10);

		if (body.action === "put_in_maintenance") {
			const [updated] = await db
				.update(sterilizerEquipments)
				.set({
					status: "in_maintenance",
					lastMaintenanceDate: today,
					notes: body.notes !== undefined ? body.notes : undefined,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(sterilizerEquipments.id, id),
						eq(sterilizerEquipments.organizationId, organizationId),
					),
				)
				.returning();

			if (!updated) {
				return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
			}
			return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
		}

		if (body.action === "return_to_service") {
			const next6Months = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
			const [updated] = await db
				.update(sterilizerEquipments)
				.set({
					status: "active",
					isCommissioned: true,
					lastMaintenanceDate: today,
					nextMaintenanceDate: next6Months,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(sterilizerEquipments.id, id),
						eq(sterilizerEquipments.organizationId, organizationId),
					),
				)
				.returning();

			if (!updated) {
				return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
			}
			return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
		}

		if (body.action === "decommission") {
			const [updated] = await db
				.update(sterilizerEquipments)
				.set({
					status: "decommissioned",
					isCommissioned: false,
					decommissioningDate: body.decommissioningDate || today,
					notes: body.notes || (body.decommissionReason ? `Списан: ${body.decommissionReason}` : undefined),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(sterilizerEquipments.id, id),
						eq(sterilizerEquipments.organizationId, organizationId),
					),
				)
				.returning();

			if (!updated) {
				return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
			}
			return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
		}

		if (body.action === "recommission") {
			const [updated] = await db
				.update(sterilizerEquipments)
				.set({
					status: "active",
					isCommissioned: true,
					decommissioningDate: null,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(sterilizerEquipments.id, id),
						eq(sterilizerEquipments.organizationId, organizationId),
					),
				)
				.returning();

			if (!updated) {
				return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
			}
			return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
		}

		const [updated] = await db
			.update(sterilizerEquipments)
			.set({
				...(body.name ? { name: body.name } : {}),
				...(body.brandModel ? { brandModel: body.brandModel } : {}),
				...(body.serialNumber ? { serialNumber: body.serialNumber } : {}),
				...(body.inventoryNumber !== undefined ? { inventoryNumber: body.inventoryNumber } : {}),
				...(body.deviceType ? { deviceType: body.deviceType } : {}),
				...(body.deviceClass ? { deviceClass: body.deviceClass } : {}),
				...(body.chamberVolumeLiters ? { chamberVolumeLiters: String(body.chamberVolumeLiters) } : {}),
				...(body.locationRoom ? { locationRoom: body.locationRoom } : {}),
				...(body.verificationExpiryDate !== undefined ? { verificationExpiryDate: body.verificationExpiryDate } : {}),
				...(body.lastMaintenanceDate !== undefined ? { lastMaintenanceDate: body.lastMaintenanceDate } : {}),
				...(body.nextMaintenanceDate !== undefined ? { nextMaintenanceDate: body.nextMaintenanceDate } : {}),
				...(body.commissioningDate !== undefined ? { commissioningDate: body.commissioningDate } : {}),
				...(body.status ? { status: body.status, isCommissioned: body.status !== "decommissioned" } : {}),
				...(body.notes !== undefined ? { notes: body.notes } : {}),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(sterilizerEquipments.id, id),
					eq(sterilizerEquipments.organizationId, organizationId),
				),
			)
			.returning();

		if (!updated) {
			return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
		}

		return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
	};

	app.put("/api/registers/sterilizers/equipments/:id", handleUpdateSterilizerEquipment);
	app.put("/api/registers/sterilizer/equipments/:id", handleUpdateSterilizerEquipment);

	const handleDeleteSterilizerEquipment = async (req: any, reply: any) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilizer equipment delete",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		await db
			.delete(sterilizerEquipments)
			.where(
				and(
					eq(sterilizerEquipments.id, id),
					eq(sterilizerEquipments.organizationId, organizationId),
				),
			);

		return { success: true };
	};

	app.delete("/api/registers/sterilizers/equipments/:id", handleDeleteSterilizerEquipment);
	app.delete("/api/registers/sterilizer/equipments/:id", handleDeleteSterilizerEquipment);
}
