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

		// 2. Sterilization cycles today
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
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");
		const generatedBarcode = `DNT-STER-C${cleanCycle}-${yyyy}${mm}${dd}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
			`АКТ-ВБИ-${year}-${Math.floor(100 + Math.random() * 900)}`;

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
			actualHumidity: data.relativeHumidityPercent,
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
}
