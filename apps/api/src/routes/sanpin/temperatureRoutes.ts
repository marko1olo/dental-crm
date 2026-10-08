import {
	SanPiNRegulatoryEngine,
	createTemperatureHumidityEquipmentDtoSchema,
	createTemperatureHumidityLogDtoSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerSanpinTemperatureRoutes(app: FastifyInstance) {
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
		if (equips.length > 0) {
			const logsToInsert = equips.map((tEquip) => {
				const isFridge = tEquip.equipmentType.includes("refrigerator");
				const temp = isFridge ? 4.2 : 21.5;
				const humidity = isFridge ? null : 48;
				return {
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
				};
			});

			const inserted = await db
				.insert(temperatureHumidityLogs)
				.values(logsToInsert)
				.returning();

			createdLogs.push(...inserted);
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
