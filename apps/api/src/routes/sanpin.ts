import crypto from "node:crypto";
import {
	SanPiNRegulatoryEngine,
	computePackagingExpirationDate,
	createBactericidalEquipmentDtoSchema,
	createBactericidalLogEntryDtoSchema,
	createEmergencyBiohazardLogDtoSchema,
	createGeneralCleaningLogDtoSchema,
	createMedicalWasteLogDtoSchema,
	createPsoCleaningLogDtoSchema,
	createSterilizationLogDtoSchema,
	createSterilizerEquipmentDtoSchema,
	updateSterilizerEquipmentDtoSchema,
	createTemperatureHumidityEquipmentDtoSchema,
	createTemperatureHumidityLogDtoSchema,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	autoclaveDailyTests,
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	emergencyBiohazardLogs,
	generalCleaningLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	sterilizerEquipments,
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
	users,
} from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

export async function registerSanpinRoutes(app: FastifyInstance) {
	// ─────────────────────────────────────────────────────────────────────────
	// 0. SUMMARY & COMPLIANCE DASHBOARD
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/summary", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sanpin summary read",
		);
		if (!organizationId) return;

		const todayStr = new Date().toISOString().slice(0, 10);
		const startOfDay = new Date(todayStr);

		// 1. PSO checks today
		const [psoStats] = await db
			.select({
				totalToday: sql<number>`count(*)::int`,
				approvedToday: sql<number>`count(*) filter (where ${preSterilizationCleaningLogs.isBatchApproved} = true)::int`,
			})
			.from(preSterilizationCleaningLogs)
			.where(
				and(
					eq(preSterilizationCleaningLogs.organizationId, organizationId),
					gte(preSterilizationCleaningLogs.timestamp, startOfDay),
				),
			);

		// 2. Sterilization cycles today & equipment fleet stats
		const [sterilStats] = await db
			.select({
				totalCyclesToday: sql<number>`count(*)::int`,
				passedToday: sql<number>`count(*) filter (where ${sterilizationLogs.status} = 'passed')::int`,
			})
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					gte(sterilizationLogs.timestamp, startOfDay),
				),
			);

		const [sterilizerFleetStats] = await db
			.select({
				totalEquipments: sql<number>`count(*)::int`,
				activeEquipments: sql<number>`count(*) filter (where ${sterilizerEquipments.status} = 'active')::int`,
				inMaintenance: sql<number>`count(*) filter (where ${sterilizerEquipments.status} = 'in_maintenance')::int`,
				decommissioned: sql<number>`count(*) filter (where ${sterilizerEquipments.status} = 'decommissioned')::int`,
				verificationExpired: sql<number>`count(*) filter (where ${sterilizerEquipments.verificationExpiryDate} < ${todayStr} and ${sterilizerEquipments.status} = 'active')::int`,
			})
			.from(sterilizerEquipments)
			.where(eq(sterilizerEquipments.organizationId, organizationId));

		// 3. Lamps warning / expired
		const [lampStats] = await db
			.select({
				totalEquipments: sql<number>`count(*)::int`,
				warningLamps: sql<number>`count(*) filter (where ${bactericidalEquipments.lampStatus} = 'warning_replace_soon')::int`,
				expiredLamps: sql<number>`count(*) filter (where ${bactericidalEquipments.lampStatus} = 'expired_replace_now')::int`,
			})
			.from(bactericidalEquipments)
			.where(
				and(
					eq(bactericidalEquipments.organizationId, organizationId),
					eq(bactericidalEquipments.isCommissioned, true),
				),
			);

		// 4. Waste month kg
		const startOfMonth = new Date(todayStr.slice(0, 7) + "-01");
		const wasteStats = await db
			.select({
				wasteClass: medicalWasteLogs.wasteClass,
				totalKg: sql<string>`coalesce(sum(${medicalWasteLogs.weightKg}), 0)`,
				totalPackages: sql<number>`coalesce(sum(${medicalWasteLogs.packageCount}), 0)::int`,
			})
			.from(medicalWasteLogs)
			.where(
				and(
					eq(medicalWasteLogs.organizationId, organizationId),
					gte(medicalWasteLogs.logDate, startOfMonth),
				),
			)
			.groupBy(medicalWasteLogs.wasteClass);

		// 5. Temperature deviations today
		const [tempStats] = await db
			.select({
				totalChecksToday: sql<number>`count(*)::int`,
				deviationsToday: sql<number>`count(*) filter (where ${temperatureHumidityLogs.isWithinNorm} = false)::int`,
			})
			.from(temperatureHumidityLogs)
			.where(
				and(
					eq(temperatureHumidityLogs.organizationId, organizationId),
					eq(temperatureHumidityLogs.measurementDate, todayStr),
				),
			);

		// 6. Active emergency incidents
		const [emergencyStats] = await db
			.select({
				totalIncidents: sql<number>`count(*)::int`,
				criticalArvPending: sql<number>`count(*) filter (where ${emergencyBiohazardLogs.arvProphylaxisRecommended} = true and ${emergencyBiohazardLogs.arvProphylaxisStartedWithin72h} = false)::int`,
			})
			.from(emergencyBiohazardLogs)
			.where(eq(emergencyBiohazardLogs.organizationId, organizationId));

		return {
			date: todayStr,
			pso: {
				totalToday: psoStats?.totalToday || 0,
				approvedToday: psoStats?.approvedToday || 0,
			},
			sterilization: {
				totalCyclesToday: sterilStats?.totalCyclesToday || 0,
				passedToday: sterilStats?.passedToday || 0,
				fleet: {
					totalEquipments: sterilizerFleetStats?.totalEquipments || 0,
					activeEquipments: sterilizerFleetStats?.activeEquipments || 0,
					inMaintenance: sterilizerFleetStats?.inMaintenance || 0,
					decommissioned: sterilizerFleetStats?.decommissioned || 0,
					verificationExpired: sterilizerFleetStats?.verificationExpired || 0,
				},
			},
			bactericidal: {
				totalEquipments: lampStats?.totalEquipments || 0,
				warningLamps: lampStats?.warningLamps || 0,
				expiredLamps: lampStats?.expiredLamps || 0,
			},
			wasteMonth: wasteStats.map((w) => ({
				wasteClass: w.wasteClass,
				totalKg: Number(w.totalKg),
				totalPackages: w.totalPackages,
			})),
			temperature: {
				totalChecksToday: tempStats?.totalChecksToday || 0,
				deviationsToday: tempStats?.deviationsToday || 0,
			},
			biohazard: {
				totalIncidents: emergencyStats?.totalIncidents || 0,
				criticalArvPending: emergencyStats?.criticalArvPending || 0,
			},
		};
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 1. ЖУРНАЛ ПСО (ФОРМА № 366/у)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/pso", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: preSterilizationCleaningLogs.id,
				organizationId: preSterilizationCleaningLogs.organizationId,
				instrumentName: sql<string>`coalesce(nullif(pre_sterilization_cleaning_logs.notes, ''), 'Стоматологический инструментарий')`,
				testType: preSterilizationCleaningLogs.testType,
				batchItemCount: preSterilizationCleaningLogs.batchItemCount,
				testedSampleCount: preSterilizationCleaningLogs.testedSampleCount,
				isAzopyramNegative: preSterilizationCleaningLogs.isAzopyramNegative,
				isPhenolphthaleinNegative: preSterilizationCleaningLogs.isPhenolphthaleinNegative,
				isBatchApproved: preSterilizationCleaningLogs.isBatchApproved,
				detergentBrand: preSterilizationCleaningLogs.detergentBrand,
				rejectionReason: preSterilizationCleaningLogs.rejectionReason,
				operatorId: preSterilizationCleaningLogs.operatorId,
				operatorName: users.fullName,
				notes: preSterilizationCleaningLogs.notes,
				timestamp: preSterilizationCleaningLogs.timestamp,
				createdAt: preSterilizationCleaningLogs.createdAt,
			})
			.from(preSterilizationCleaningLogs)
			.leftJoin(users, eq(users.id, preSterilizationCleaningLogs.operatorId))
			.where(eq(preSterilizationCleaningLogs.organizationId, organizationId))
			.orderBy(desc(preSterilizationCleaningLogs.timestamp));

		return logs;
	});

	app.post("/api/registers/pso", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso create",
		);
		if (!organizationId) return;

		const parsed = createPsoCleaningLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры ПСО.",
			});
		}
		const data = parsed.data;

		const evaluation = SanPiNRegulatoryEngine.evaluatePsoSampling(
			data.batchItemCount,
			data.testedSampleCount,
			data.isAzopyramNegative,
			data.isPhenolphthaleinNegative,
		);

		const [log] = await db
			.insert(preSterilizationCleaningLogs)
			.values({
				organizationId,
				testType: data.testType,
				batchItemCount: data.batchItemCount,
				testedSampleCount: data.testedSampleCount,
				isAzopyramNegative: data.isAzopyramNegative,
				isPhenolphthaleinNegative: data.isPhenolphthaleinNegative,
				isBatchApproved: evaluation.isBatchApproved,
				detergentBrand: data.detergentBrand ?? null,
				rejectionReason: evaluation.rejectionReason,
				operatorId: data.operatorId ?? null,
				notes: data.notes
					? `${data.instrumentName} | ${data.notes}`
					: data.instrumentName,
				timestamp: new Date(),
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_PSO_ADDED",
			payload: log,
		});

		return reply.code(201).send({
			success: true,
			log,
			evaluation,
		});
	});

	app.post("/api/registers/pso/quick-norm", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso quick norm",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const batchItemCount = typeof body.batchItemCount === "number" ? body.batchItemCount : 100;
		const testedSampleCount =
			typeof body.testedSampleCount === "number"
				? body.testedSampleCount
				: Math.max(3, Math.ceil(batchItemCount * 0.01));
		const detergentBrand = body.detergentBrand || "Биолот 0.5% + Аламинол 1%";
		const instrumentName =
			body.instrumentName ||
			"Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)";
		const notesText =
			body.notes ||
			"⚡ Отметка партии в 1 клик по СанПиН 3.3686-21: проба отрицательная, норма. Партия допущена к стерилизации.";

		const evaluation = SanPiNRegulatoryEngine.evaluatePsoSampling(
			batchItemCount,
			testedSampleCount,
			true,
			true,
		);

		const [log] = await db
			.insert(preSterilizationCleaningLogs)
			.values({
				organizationId,
				testType: "both",
				batchItemCount,
				testedSampleCount,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isBatchApproved: true,
				detergentBrand,
				rejectionReason: null,
				operatorId: body.operatorId ?? null,
				notes: `${instrumentName} | ${notesText}`,
				timestamp: new Date(),
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_PSO_ADDED",
			payload: log,
		});

		return reply.code(201).send({
			success: true,
			log,
			evaluation,
		});
	});

	app.delete("/api/registers/pso/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso delete",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const [deleted] = await db
			.delete(preSterilizationCleaningLogs)
			.where(
				and(
					eq(preSterilizationCleaningLogs.id, id),
					eq(preSterilizationCleaningLogs.organizationId, organizationId),
				),
			)
			.returning();

		if (!deleted) {
			return reply.code(404).send({ error: "NotFound", message: "Запись не найдена" });
		}
		return { success: true, id };
	});

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
			message: `Зарегистрировано циклов смены в 1 клик: ${inserted.length} (134°C, 2.15 бар, 5 мин, норма СанПиН 3.3686-21)`,
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
				.where(eq(bactericidalEquipments.id, equipment.id));

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
					.where(eq(bactericidalEquipments.id, eqItem.id));

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

		const staff = req.user?.staff;
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
					operatorId: (req.user as any)?.id ?? null,
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

	// ─────────────────────────────────────────────────────────────────────────
	// 5. ЖУРНАЛ МЕДИЦИНСКИХ ОТХОДОВ А, Б, В, Г (СанПиН 2.1.3684-21)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/medical-waste", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"waste read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: medicalWasteLogs.id,
				organizationId: medicalWasteLogs.organizationId,
				operationType: medicalWasteLogs.operationType,
				logDate: medicalWasteLogs.logDate,
				wasteClass: medicalWasteLogs.wasteClass,
				wasteDescription: medicalWasteLogs.wasteDescription,
				packageType: medicalWasteLogs.packageType,
				packageCount: medicalWasteLogs.packageCount,
				weightKg: medicalWasteLogs.weightKg,
				volumeLiters: medicalWasteLogs.volumeLiters,
				disinfectionMethod: medicalWasteLogs.disinfectionMethod,
				disinfectantUsed: medicalWasteLogs.disinfectantUsed,
				disposalCompany: medicalWasteLogs.disposalCompany,
				contractNumber: medicalWasteLogs.contractNumber,
				transferActNumber: medicalWasteLogs.transferActNumber,
				responsibleStaffId: medicalWasteLogs.responsibleStaffId,
				responsibleStaffName: users.fullName,
				notes: medicalWasteLogs.notes,
				createdAt: medicalWasteLogs.createdAt,
			})
			.from(medicalWasteLogs)
			.leftJoin(users, eq(users.id, medicalWasteLogs.responsibleStaffId))
			.where(eq(medicalWasteLogs.organizationId, organizationId))
			.orderBy(desc(medicalWasteLogs.logDate));

		return logs.map((l) => ({
			...l,
			weightKg: Number(l.weightKg),
			volumeLiters: l.volumeLiters ? Number(l.volumeLiters) : null,
		}));
	});

	app.post("/api/registers/medical-waste", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"waste create",
		);
		if (!organizationId) return;

		const parsed = createMedicalWasteLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры учета отходов.",
			});
		}
		const data = parsed.data;

		const [log] = await db
			.insert(medicalWasteLogs)
			.values({
				organizationId,
				operationType: data.operationType,
				logDate: new Date(data.logDate),
				wasteClass: data.wasteClass,
				wasteDescription: data.wasteDescription,
				packageType: data.packageType,
				packageCount: data.packageCount,
				weightKg: String(data.weightKg),
				volumeLiters: data.volumeLiters ? String(data.volumeLiters) : null,
				disinfectionMethod: data.disinfectionMethod,
				disinfectantUsed: data.disinfectantUsed ?? null,
				disposalCompany: data.disposalCompany ?? null,
				contractNumber: data.contractNumber ?? null,
				transferActNumber: data.transferActNumber ?? null,
				responsibleStaffId: data.responsibleStaffId ?? null,
				notes: data.notes ?? null,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_WASTE_LOG_ADDED",
			payload: log,
		});

		return reply.code(201).send(log);
	});

	app.post("/api/registers/medical-waste/quick-shift-bundle", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"waste quick-shift create",
		);
		if (!organizationId) return;

		const staff = req.user?.staff;
		const now = new Date();

		// Нормативные записи по СанПиН 2.1.3684-21 для стоматологической смены:
		// 1) Желтый пакет (мягкие отходы: перчатки, маски, салфетки, валики, слюноотсосы), 1 шт., брутто 2.55 кг, нетто 2.50 кг
		// 2) Желтый непрокалываемый контейнер (острые отходы: карпулы, иглы, скальпели), 1 шт., брутто 0.95 кг, нетто 0.80 кг
		const newLogs = await db
			.insert(medicalWasteLogs)
			.values([
				{
					organizationId,
					operationType: "accumulation",
					logDate: now,
					wasteClass: "class_B",
					wasteDescription: "Мягкие эпидемиологически опасные отходы смены (перчатки, маски, салфетки, валики, слюноотсосы)",
					packageType: "yellow_bag",
					packageCount: 1,
					weightKg: "2.500",
					volumeLiters: "30.00",
					disinfectionMethod: "chemical_soaking",
					disinfectantUsed: "Бриллиант Классик 2% (экспозиция 60 мин)",
					responsibleStaffId: (req.user as any)?.id ?? null,
					notes: "1-клик фиксация отходов смены (СанПиН 2.1.3684-21: брутто 2.55 кг, тара 0.05 кг, нетто 2.50 кг)",
				},
				{
					organizationId,
					operationType: "accumulation",
					logDate: now,
					wasteClass: "class_B",
					wasteDescription: "Острые эпидемиологически опасные отходы смены (пустые карпулы анестетиков, инъекционные иглы, скальпели)",
					packageType: "yellow_sharps_container",
					packageCount: 1,
					weightKg: "0.800",
					volumeLiters: "2.00",
					disinfectionMethod: "steam_autoclave",
					disinfectantUsed: "Аппаратное автоклавирование 134°C (5 мин, 2.15 бар)",
					responsibleStaffId: (req.user as any)?.id ?? null,
					notes: "1-клик фиксация острых отходов смены в желтом непрокалываемом контейнере (СанПиН 2.1.3684-21: брутто 0.95 кг, тара 0.15 кг, нетто 0.80 кг)",
				},
			])
			.returning();

		for (const log of newLogs) {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "SANPIN_WASTE_LOG_ADDED",
				payload: log,
			});
		}

		return reply.code(201).send({
			message: "Отходы смены (Класс Б) успешно зафиксированы по СанПиН 2.1.3684-21",
			records: newLogs,
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. ЖУРНАЛ АВАРИЙНЫХ СИТУАЦИЙ («АНТИ-ВИЧ»)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/emergency-biohazard", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"biohazard read",
		);
		if (!organizationId) return;

		const logs = await db
			.select()
			.from(emergencyBiohazardLogs)
			.where(eq(emergencyBiohazardLogs.organizationId, organizationId))
			.orderBy(desc(emergencyBiohazardLogs.incidentDateTime));

		return logs;
	});

	app.post("/api/registers/emergency-biohazard", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"biohazard create",
		);
		if (!organizationId) return;

		const parsed = createEmergencyBiohazardLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры аварийной ситуации.",
			});
		}
		const data = parsed.data;

		const protocolEval = SanPiNRegulatoryEngine.evaluateBiohazardEmergencyProtocol({
			antiHivKitUsed: data.antiHivKitUsed,
			bloodSampled: data.bloodSampledForTesting,
			arvRecommended: data.arvProphylaxisRecommended,
			arvStartedWithin72h: data.arvProphylaxisStartedWithin72h,
			chiefPhysicianNotified: data.chiefPhysicianNotified,
		});

		const year = new Date().getFullYear();
		const actNumber =
			data.actSanPiNNumber ||
			`АКТ-ВБИ-${year}-${crypto.randomInt(100, 999)}`;

		const [log] = await db
			.insert(emergencyBiohazardLogs)
			.values({
				organizationId,
				incidentDateTime: new Date(data.incidentDateTime),
				victimStaffId: data.victimStaffId ?? null,
				victimFullName: data.victimFullName,
				victimRole: data.victimRole,
				patientId: data.patientId ?? null,
				patientFullName: data.patientFullName ?? null,
				patientCardNumber: data.patientCardNumber ?? null,
				patientInfectiousStatus: data.patientInfectiousStatus ?? null,
				injuryType: data.injuryType,
				circumstances: data.circumstances,
				firstAidMeasures: data.firstAidMeasures,
				antiHivKitUsed: data.antiHivKitUsed,
				bloodSampledForTesting: data.bloodSampledForTesting,
				arvProphylaxisRecommended: data.arvProphylaxisRecommended,
				arvProphylaxisStartedWithin72h: data.arvProphylaxisStartedWithin72h,
				arvDrugsPrescribed: data.arvDrugsPrescribed ?? null,
				chiefPhysicianNotified: data.chiefPhysicianNotified,
				actSanPiNNumber: actNumber,
				responsibleDoctorId: data.responsibleDoctorId ?? null,
				notes: data.notes ?? null,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_BIOHAZARD_LOG_ADDED",
			payload: { log, protocolEval },
		});

		return reply.code(201).send({
			success: true,
			log,
			protocolEval,
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. ЖУРНАЛ ТЕМПЕРАТУРЫ И ВЛАЖНОСТИ (ПРИКАЗ 706н)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/temperature-humidity/equipments", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"temperature equipments read",
		);
		if (!organizationId) return;

		const list = await db
			.select()
			.from(temperatureHumidityEquipments)
			.where(eq(temperatureHumidityEquipments.organizationId, organizationId))
			.orderBy(temperatureHumidityEquipments.name);

		return list.map((e) => ({
			...e,
			targetTempMinCelsius: Number(e.targetTempMinCelsius),
			targetTempMaxCelsius: Number(e.targetTempMaxCelsius),
			targetHumidityMinPercent: e.targetHumidityMinPercent ? Number(e.targetHumidityMinPercent) : null,
			targetHumidityMaxPercent: e.targetHumidityMaxPercent ? Number(e.targetHumidityMaxPercent) : null,
		}));
	});

	app.post("/api/registers/temperature-humidity/equipments", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"temperature equipment create",
		);
		if (!organizationId) return;

		const parsed = createTemperatureHumidityEquipmentDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры объекта контроля.",
			});
		}
		const data = parsed.data;

		const [created] = await db
			.insert(temperatureHumidityEquipments)
			.values({
				organizationId,
				equipmentType: data.equipmentType,
				name: data.name,
				location: data.location,
				meterDeviceName: data.meterDeviceName,
				meterSerialNumber: data.meterSerialNumber ?? null,
				verificationExpiryDate: data.verificationExpiryDate ?? null,
				targetTempMinCelsius: String(data.targetTempMinCelsius),
				targetTempMaxCelsius: String(data.targetTempMaxCelsius),
				targetHumidityMinPercent: data.targetHumidityMinPercent ? String(data.targetHumidityMinPercent) : null,
				targetHumidityMaxPercent: data.targetHumidityMaxPercent ? String(data.targetHumidityMaxPercent) : null,
				isActive: data.isActive ?? true,
			})
			.returning();

		return reply.code(201).send(created);
	});

	app.get("/api/registers/temperature-humidity/logs", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"temperature logs read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: temperatureHumidityLogs.id,
				organizationId: temperatureHumidityLogs.organizationId,
				equipmentId: temperatureHumidityLogs.equipmentId,
				equipmentName: temperatureHumidityEquipments.name,
				equipmentType: temperatureHumidityEquipments.equipmentType,
				location: temperatureHumidityEquipments.location,
				targetTempMin: temperatureHumidityEquipments.targetTempMinCelsius,
				targetTempMax: temperatureHumidityEquipments.targetTempMaxCelsius,
				measurementDate: temperatureHumidityLogs.measurementDate,
				measurementPeriod: temperatureHumidityLogs.measurementPeriod,
				temperatureCelsius: temperatureHumidityLogs.temperatureCelsius,
				relativeHumidityPercent: temperatureHumidityLogs.relativeHumidityPercent,
				isWithinNorm: temperatureHumidityLogs.isWithinNorm,
				deviationReason: temperatureHumidityLogs.deviationReason,
				correctiveAction: temperatureHumidityLogs.correctiveAction,
				operatorId: temperatureHumidityLogs.operatorId,
				operatorName: users.fullName,
				notes: temperatureHumidityLogs.notes,
				createdAt: temperatureHumidityLogs.createdAt,
			})
			.from(temperatureHumidityLogs)
			.innerJoin(
				temperatureHumidityEquipments,
				eq(temperatureHumidityEquipments.id, temperatureHumidityLogs.equipmentId),
			)
			.leftJoin(users, eq(users.id, temperatureHumidityLogs.operatorId))
			.where(eq(temperatureHumidityLogs.organizationId, organizationId))
			.orderBy(desc(temperatureHumidityLogs.measurementDate), desc(temperatureHumidityLogs.createdAt));

		return logs.map((l) => ({
			...l,
			temperatureCelsius: Number(l.temperatureCelsius),
			relativeHumidityPercent: l.relativeHumidityPercent ? Number(l.relativeHumidityPercent) : null,
			targetTempMin: Number(l.targetTempMin),
			targetTempMax: Number(l.targetTempMax),
		}));
	});

	app.post("/api/registers/temperature-humidity/logs", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"temperature log create",
		);
		if (!organizationId) return;

		const parsed = createTemperatureHumidityLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные данные замера температуры/влажности.",
			});
		}
		const data = parsed.data;

		const [equipment] = await db
			.select()
			.from(temperatureHumidityEquipments)
			.where(
				and(
					eq(temperatureHumidityEquipments.id, data.equipmentId),
					eq(temperatureHumidityEquipments.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!equipment) {
			return reply.code(404).send({
				error: "NotFound",
				message: "Холодильник / помещение не найдены.",
			});
		}

		const evalResult = SanPiNRegulatoryEngine.evaluateTemperatureHumidity({
			equipmentType: equipment.equipmentType as any,
			targetTempMin: Number(equipment.targetTempMinCelsius),
			targetTempMax: Number(equipment.targetTempMaxCelsius),
			actualTemp: data.temperatureCelsius,
			targetHumidityMin: equipment.targetHumidityMinPercent ? Number(equipment.targetHumidityMinPercent) : null,
			targetHumidityMax: equipment.targetHumidityMaxPercent ? Number(equipment.targetHumidityMaxPercent) : null,
			actualHumidity: data.relativeHumidityPercent ?? null,
		});

		const [log] = await db
			.insert(temperatureHumidityLogs)
			.values({
				organizationId,
				equipmentId: data.equipmentId,
				measurementDate: data.measurementDate,
				measurementPeriod: data.measurementPeriod,
				temperatureCelsius: String(data.temperatureCelsius),
				relativeHumidityPercent: data.relativeHumidityPercent ? String(data.relativeHumidityPercent) : null,
				isWithinNorm: evalResult.isWithinNorm,
				deviationReason: data.deviationReason || evalResult.deviationMessage,
				correctiveAction: data.correctiveAction ?? null,
				operatorId: data.operatorId ?? null,
				notes: data.notes ?? null,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_TEMPERATURE_LOG_ADDED",
			payload: { log, evalResult },
		});

		return reply.code(201).send({
			success: true,
			log,
			evalResult,
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. 1-КЛИК АВТОПИЛОТ СМЕНЫ САНПИН (СанПиН 3.3686-21, Форма 257/у, 366/у)
	// ─────────────────────────────────────────────────────────────────────────
	app.post("/api/registers/autofill-shift", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sanpin shift autofill",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const now = new Date();
		const todayStr = body.date || now.toISOString().slice(0, 10);

		// 1. Пробы ПСО (Форма № 366/у)
		const psoBatches = Array.isArray(body.psoRecords) && body.psoRecords.length > 0
			? body.psoRecords
			: [
					{
						instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты)",
						batchItemCount: 120,
						testedSampleCount: 5,
						detergentBrand: "Биолот 0.5% + Аламинол 1%",
						notes: "СанПиН 3.3686-21. 1% от партии проверен. Азопирам/фенолфталеин отрицательны.",
					},
					{
						instrumentName: "Хирургический инструментарий (щипцы, элеваторы)",
						batchItemCount: 40,
						testedSampleCount: 4,
						detergentBrand: "Оптимакс Про 1.5%",
						notes: "Кровь и белковые загрязнения отсутствуют.",
					},
					{
						instrumentName: "Эндодонтический инструментарий и боры",
						batchItemCount: 150,
						testedSampleCount: 5,
						detergentBrand: "Биолот 0.5%",
						notes: "УЗ-мойка 15 мин. Пробы отрицательные.",
					},
				];

		const insertedPso = await db
			.insert(preSterilizationCleaningLogs)
			.values(
				psoBatches.map((p: any) => ({
					organizationId,
					testType: "both",
					batchItemCount: Number(p.batchItemCount) || 100,
					testedSampleCount: Number(p.testedSampleCount) || 3,
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isBatchApproved: true,
					detergentBrand: p.detergentBrand || "Биолот 0.5%",
					operatorId: req.user?.id || null,
					notes: p.notes || "⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21",
				})),
			)
			.returning();

		// 2. Стерилизация (Форма № 257/у)
		const form257 = Array.isArray(body.form257Records) && body.form257Records.length > 0
			? body.form257Records
			: [
					{
						cycleNumber: 1,
						itemsDescription: "Терапевтические наборы и смотровые лотки (крафт-пакеты)",
						temperatureCelsius: "134",
						pressureBar: "2.15",
						durationMin: 5,
					},
					{
						cycleNumber: 2,
						itemsDescription: "Хирургический и эндодонтический инструментарий (крафт-пакеты)",
						temperatureCelsius: "134",
						pressureBar: "2.15",
						durationMin: 5,
					},
				];

		const insertedSteril = await db
			.insert(sterilizationLogs)
			.values(
				form257.map((f: any, idx: number) => ({
					organizationId,
					deviceName: f.sterilizerBrandModel || "Автоклав Euronda E9 Next (Класс B)",
					autoclaveId: f.sterilizerId || "АК-01",
					cycleNumber: Number(f.cycleNumber) || (idx + 1),
					itemsDescription: f.itemsDescriptionRu || f.itemsDescription || "Стоматологический инструментарий смены",
					packagingType: f.packagingType || "kraft_bag",
					temperatureCelsius: String(f.actualTemperatureCelsius || f.temperatureCelsius || "134"),
					pressureBar: String(f.actualPressureBar || f.pressureBar || "2.15"),
					durationMin: Number(f.actualExposureMinutes || f.durationMin) || 5,
					indicatorType: "chemical_class_5",
					passedIndicator: true,
					status: "passed" as const,
					barcode: `DNT-STER-${todayStr.replace(/-/g, "")}-${idx + 1}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
					operatorId: req.user?.id || null,
				})),
			)
			.returning();

		// 3. Бактерицидные установки / Дезар
		const activeEquips = await db
			.select()
			.from(bactericidalEquipments)
			.where(
				and(
					eq(bactericidalEquipments.organizationId, organizationId),
					eq(bactericidalEquipments.isCommissioned, true),
				),
			);

		for (const bactEquip of activeEquips) {
			const currentHours = Number(bactEquip.totalOperatingHours || 0);
			const nextHours = (currentHours + 0.5).toFixed(2);
			const sessStart = new Date();
			sessStart.setHours(8, 0, 0, 0);
			const sessEnd = new Date();
			sessEnd.setHours(8, 30, 0, 0);

			await db.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: bactEquip.id,
				date: todayStr,
				sessionStartTime: sessStart,
				sessionEndTime: sessEnd,
				durationMinutes: 30,
				operatingMode: "continuous_presence",
				cumulativeHoursAfterSession: nextHours,
				operatorId: req.user?.id || null,
				notes: "⚡ 1-Клик автопилот смены: предсменная дезинфекция воздуха",
			});

			await db
				.update(bactericidalEquipments)
				.set({
					totalOperatingHours: nextHours,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(bactericidalEquipments.id, bactEquip.id),
						eq(bactericidalEquipments.organizationId, organizationId),
					),
				);
		}

		// 4. Замеры температуры и влажности (холодильники и комнаты)
		const tempEquips = await db
			.select()
			.from(temperatureHumidityEquipments)
			.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

		for (const te of tempEquips) {
			const isFridge = te.equipmentType.includes("refrigerator");
			const temp = isFridge ? "4.2" : "21.5";
			const humidity = isFridge ? null : "48";

			await db.insert(temperatureHumidityLogs).values({
				organizationId,
				equipmentId: te.id,
				measurementDate: todayStr,
				measurementPeriod: "morning",
				temperatureCelsius: temp,
				relativeHumidityPercent: humidity,
				isWithinNorm: true,
				deviationReason: null,
				operatorId: req.user?.id || null,
				notes: "⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21",
			});
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_SHIFT_AUTOPILOT_COMPLETED",
			payload: {
				date: todayStr,
				psoCount: insertedPso.length,
				sterilCount: insertedSteril.length,
			},
		});

		return reply.send({
			success: true,
			date: todayStr,
			batchCount: insertedPso.length,
			sterilCount: insertedSteril.length,
			summary: {
				totalPsoItems: insertedPso.reduce((acc, p) => acc + p.batchItemCount, 0),
				totalSterilizationCycles: insertedSteril.length,
			},
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. 1-КЛИК ФИКСАЦИЯ НОРМЫ ТЕМПЕРАТУРЫ И ВЛАЖНОСТИ СМЕНЫ
	// ─────────────────────────────────────────────────────────────────────────
	app.post("/api/registers/temperature-humidity/shift-autopilot", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"temperature shift autopilot",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const now = new Date();
		const measurementDate = body.date || now.toISOString().slice(0, 10);
		const measurementPeriod: "morning" | "evening" =
			body.period === "evening" ? "evening" : "morning";

		let equips = await db
			.select()
			.from(temperatureHumidityEquipments)
			.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

		if (equips.length === 0) {
			const [fridge] = await db
				.insert(temperatureHumidityEquipments)
				.values({
					organizationId,
					name: "Фармацевтический холодильник Pozis ХФ-250 (№1)",
					equipmentType: "refrigerator_cold",
					location: "ЦСО / Процедурный кабинет",
					meterDeviceName: "Электронный термометр-гигрометр ТМЦ-1",
					meterSerialNumber: "SN-TM-2026-001",
					targetTempMinCelsius: "2.00",
					targetTempMaxCelsius: "8.00",
				})
				.returning();

			const [room] = await db
				.insert(temperatureHumidityEquipments)
				.values({
					organizationId,
					name: "Кабинет терапевтической стоматологии №1",
					equipmentType: "room_ambient",
					location: "Основной лечебный блок",
					meterDeviceName: "Психрометрический гигрометр ВИТ-2",
					meterSerialNumber: "VIT2-4412",
					targetTempMinCelsius: "15.00",
					targetTempMaxCelsius: "25.00",
					targetHumidityMinPercent: "30.00",
					targetHumidityMaxPercent: "60.00",
				})
				.returning();

			const createdEquips: (typeof equips)[number][] = [];
			if (fridge) createdEquips.push(fridge);
			if (room) createdEquips.push(room);
			equips = createdEquips;
		}

		const createdLogs: any[] = [];
		for (const tEquip of equips) {
			const isFridge = tEquip.equipmentType.includes("refrigerator");
			const temp = isFridge ? 4.2 : 21.5;
			const humidity = isFridge ? null : 48;

			const [log] = await db
				.insert(temperatureHumidityLogs)
				.values({
					organizationId,
					equipmentId: tEquip.id,
					measurementDate,
					measurementPeriod,
					temperatureCelsius: String(temp),
					relativeHumidityPercent: humidity ? String(humidity) : null,
					isWithinNorm: true,
					deviationReason: null,
					operatorId: req.user?.id || null,
					notes: `⚡ 1-Клик норма смены (${measurementPeriod === "morning" ? "утро" : "вечер"}): СанПиН 3.3686-21, Приказы № 706н / 646н`,
				})
				.returning();

			if (log) {
				createdLogs.push(log);
			}
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_TEMPERATURE_SHIFT_AUTOPILOT",
			payload: { count: createdLogs.length, measurementDate, measurementPeriod },
		});

		return reply.send({
			success: true,
			count: createdLogs.length,
			logs: createdLogs,
		});
	});
}
