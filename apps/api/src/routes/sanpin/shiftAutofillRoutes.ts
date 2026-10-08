import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerSanpinShiftAutofillRoutes(app: FastifyInstance) {
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

		const form257 = Array.isArray(body.sterilizationRecords) && body.sterilizationRecords.length > 0
			? body.sterilizationRecords
			: Array.isArray(body.form257) && body.form257.length > 0
				? body.form257
				: [
						{
							sterilizerBrandModel: "Автоклав Euronda E9 Next (Класс B)",
							sterilizerId: "АК-01",
							cycleNumber: 1,
							itemsDescription: "Стоматологический инструментарий смены",
							packagingType: "kraft_bag",
							temperatureCelsius: "134",
							pressureBar: "2.15",
							durationMin: 5,
						},
						{
							sterilizerBrandModel: "Автоклав Euronda E9 Next (Класс B)",
							sterilizerId: "АК-01",
							cycleNumber: 2,
							itemsDescription: "Хирургические наконечники и турбины",
							packagingType: "kraft_bag",
							temperatureCelsius: "134",
							pressureBar: "2.15",
							durationMin: 5,
						},
					];

		const { insertedPso, insertedSteril } = await db.transaction(async (tx) => {
			const psoRows = await tx
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
			const sterilRows = await tx
				.insert(sterilizationLogs)
				.values(
					form257.map((f: any, idx: number) => ({
						organizationId,
						deviceName: f.sterilizerBrandModel || "Автоклав Euronda E9 Next (Класс B)",
						autoclaveId: f.sterilizerId || "АК-01",
						cycleNumber: Number(f.cycleNumber) || (idx + 1),
						itemsDescription: f.itemsDescriptionRu || f.itemsDescription || "Стоматологический инструментарий смены",
						packagingType: ((): string => {
							const pt = String(f.packagingType || "").toLowerCase();
							if (pt === "kraft_self_adhesive") return "kraft_self_adhesive";
							if (pt === "laminated_heat_sealed" || pt.includes("kombin") || pt.includes("laminat")) return "laminated_heat_sealed";
							if (pt === "metal_cassette" || pt.includes("kasset")) return "metal_cassette";
							if (pt === "other") return "other";
							return "kraft_heat_sealed";
						})(),
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
			const activeEquips = await tx
				.select()
				.from(bactericidalEquipments)
				.where(
					and(
						eq(bactericidalEquipments.organizationId, organizationId),
						eq(bactericidalEquipments.isCommissioned, true),
					),
				);

			if (activeEquips.length > 0) {
				const sessStart = new Date();
				sessStart.setHours(8, 0, 0, 0);
				const sessEnd = new Date();
				sessEnd.setHours(8, 30, 0, 0);

				const bactLogsToInsert = activeEquips.map((bactEquip) => {
					const currentHours = Number(bactEquip.totalOperatingHours || 0);
					const nextHours = (currentHours + 0.5).toFixed(2);
					return {
						organizationId,
						equipmentId: bactEquip.id,
						date: todayStr,
						sessionStartTime: sessStart,
						sessionEndTime: sessEnd,
						durationMinutes: 30,
						operatingMode: "continuous_presence" as const,
						cumulativeHoursAfterSession: nextHours,
						operatorId: req.user?.id || null,
						notes: "⚡ 1-Клик автопилот смены: предсменная дезинфекция воздуха",
					};
				});

				await tx.insert(bactericidalIrradiatorLogs).values(bactLogsToInsert);

				for (const bactEquip of activeEquips) {
					const currentHours = Number(bactEquip.totalOperatingHours || 0);
					const nextHours = (currentHours + 0.5).toFixed(2);
					await tx
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
			}

			// 4. Замеры температуры и влажности (холодильники и комнаты)
			const tempEquips = await tx
				.select()
				.from(temperatureHumidityEquipments)
				.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

			if (tempEquips.length > 0) {
				const tempLogsToInsert = tempEquips.map((te) => {
					const isFridge = te.equipmentType.includes("refrigerator");
					const temp = isFridge ? "4.2" : "21.5";
					const humidity = isFridge ? null : "48";
					return {
						organizationId,
						equipmentId: te.id,
						measurementDate: todayStr,
						measurementPeriod: "morning" as const,
						temperatureCelsius: temp,
						relativeHumidityPercent: humidity,
						isWithinNorm: true,
						deviationReason: null,
						operatorId: req.user?.id || null,
						notes: "⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21",
					};
				});

				await tx.insert(temperatureHumidityLogs).values(tempLogsToInsert);
			}

			return { insertedPso: psoRows, insertedSteril: sterilRows };
		});

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
}
