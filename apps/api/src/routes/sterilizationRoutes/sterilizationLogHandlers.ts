import {
	SanPiNSterilizationEngine,
	computePackagingExpirationDate,
	createAutoclaveDailyTestSchema,
	createPsoCleaningLogSchema,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	autoclaveDailyTests,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { scanSchema } from "./types.js";

export async function registerSterilizationLogRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/sterilization/logs
	 * Журнал контроля работы стерилизаторов (форма № 257/у по СанПиН 3.3686-21).
	 */
	app.get("/api/sterilization/logs", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization logs read",
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
				temperatureSet: sterilizationLogs.temperatureSet,
				pressureSet: sterilizationLogs.pressureSet,
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

	/**
	 * POST /api/sterilization/scan
	 * Регистрация цикла стерилизации и упаковки инструментов с расчетом срока годности.
	 */
	app.post("/api/sterilization/scan", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization scan",
		);
		if (!organizationId) return;

		const scanParsed = scanSchema.safeParse(req.body);
		if (!scanParsed.success) {
			const firstIssue = scanParsed.error.issues[0];
			const firstError =
				!req.body || typeof req.body !== "object" || Array.isArray(req.body)
					? "Некорректные данные стерилизации: ожидается объект с barcode и autoclaveId."
					: (firstIssue?.message ?? "Проверьте данные стерилизации.");
			return reply.code(400).send({
				error: "ValidationError",
				message: firstError,
			});
		}
		const data = scanParsed.data;

		if (data.operatorId) {
			const [operator] = await db
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.id, data.operatorId),
						eq(users.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!operator) {
				return reply.code(400).send({
					error: "OperatorNotFound",
					message:
						"Оператор стерилизации не найден в этой клинике. Выберите сотрудника из списка персонала клиники.",
				});
			}
		}

		// Расчет срока годности стерильности по типу упаковки (СанПиН 3.3686-21)
		const now = new Date();
		const expiresAt = data.status === "passed"
			? computePackagingExpirationDate(data.packagingType as SterilizationPackagingType, now)
			: null;

		const passedIndicator = data.status === "passed";

		const [log] = await db
			.insert(sterilizationLogs)
			.values({
				organizationId,
				barcode: data.barcode,
				autoclaveId: data.autoclaveId,
				deviceName: data.deviceName || "Автоклав 1",
				cycleNumber: data.cycleNumber || 1,
				temperatureCelsius: data.temperatureCelsius ? String(data.temperatureCelsius) : null,
				pressureBar: data.pressureBar ? String(data.pressureBar) : null,
				itemsDescription: data.itemsDescription || null,
				operatorId: data.operatorId || null,
				status: data.status,
				passedIndicator,
				packagingType: data.packagingType || null,
				expiresAt,
				indicatorType: data.indicatorType || null,
				cycleMode: data.cycleMode || null,
				durationMin: data.durationMin || null,
				timestamp: now,
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "STERILIZATION_LOG_ADDED",
			payload: log,
		});

		return reply.code(201).send(log);
	});

	/**
	 * POST /api/sterilization/pso-tests
	 * Регистрация контроля качества предстерилизационной очистки (Азопирам / Фенолфталеин)
	 * с проверкой нормы выборки по СанПиН 3.3686-21 (>= 1% партии, min 3-5 шт).
	 */
	app.post("/api/sterilization/pso-tests", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization pso test",
		);
		if (!organizationId) return;

		const parsed = createPsoCleaningLogSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры контроля ПСО.",
				details: parsed.error.format(),
			});
		}
		const data = parsed.data;

		const evaluation = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
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
				notes: data.notes ?? null,
				timestamp: new Date(),
			})
			.returning();

		return reply.code(201).send({
			success: true,
			log,
			evaluation,
		});
	});

	/**
	 * POST /api/sterilization/pso/quick-norm
	 * 1-клик регистрация нормативной пробы ПСО (Азопирам и Фенолфталеин отрицательные, норма).
	 */
	app.post("/api/sterilization/pso/quick-norm", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization pso quick norm",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const batchItemCount = typeof body.batchItemCount === "number" ? body.batchItemCount : 100;
		const testedSampleCount =
			typeof body.testedSampleCount === "number"
				? body.testedSampleCount
				: Math.max(3, Math.ceil(batchItemCount * 0.01));
		const detergentBrand = body.detergentBrand || "Биолот 0.5% + Аламинол 1%";
		const notes =
			body.notes ||
			"[СанПиН 3.3686-21] Азопирамовая и фенолфталеиновая пробы отрицательные, норма (ИнТест 132/20 / 134/5). Партия допущена к стерилизации.";

		const evaluation = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
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
				notes,
				timestamp: new Date(),
			})
			.returning();

		return reply.code(201).send({
			success: true,
			log,
			evaluation,
			indicators: {
				inTest132_20: "negative_norm",
				inTest134_5: "negative_norm",
				azopyram: "negative_norm",
				phenolphthalein: "negative_norm",
			},
			sanpinClause: "СанПиН 3.3686-21 п. 3638-3640",
		});
	});

	/**
	 * GET /api/sterilization/pso-tests
	 * Журнал учета предстерилизационной очистки (ПСО).
	 */
	app.get("/api/sterilization/pso-tests", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"read pso tests",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: preSterilizationCleaningLogs.id,
				organizationId: preSterilizationCleaningLogs.organizationId,
				testType: preSterilizationCleaningLogs.testType,
				batchItemCount: preSterilizationCleaningLogs.batchItemCount,
				testedSampleCount: preSterilizationCleaningLogs.testedSampleCount,
				isAzopyramNegative:
					preSterilizationCleaningLogs.isAzopyramNegative,
				isPhenolphthaleinNegative:
					preSterilizationCleaningLogs.isPhenolphthaleinNegative,
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
			.where(
				eq(preSterilizationCleaningLogs.organizationId, organizationId),
			)
			.orderBy(desc(preSterilizationCleaningLogs.timestamp));

		return logs;
	});

	/**
	 * POST /api/sterilization/daily-tests
	 * Фиксация ежедневных тестов автоклава (Bowie-Dick, Helix PCD, Вакуум-тест).
	 */
	app.post("/api/sterilization/daily-tests", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization daily test",
		);
		if (!organizationId) return;

		const parsed = createAutoclaveDailyTestSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры ежедневного теста автоклава.",
				details: parsed.error.format(),
			});
		}
		const data = parsed.data;

		const testResult = data.colorChangeVerified ? "passed" : "failed";

		const [log] = await db
			.insert(autoclaveDailyTests)
			.values({
				organizationId,
				autoclaveId: data.autoclaveId,
				testType: data.testType,
				cycleTemperatureCelsius: String(data.cycleTemperatureCelsius),
				cyclePressureBar: String(data.cyclePressureBar),
				vacuumLeakRateMbarPerMin: data.vacuumLeakRateMbarPerMin
					? String(data.vacuumLeakRateMbarPerMin)
					: null,
				colorChangeVerified: data.colorChangeVerified,
				testResult,
				operatorId: data.operatorId ?? null,
				notes: data.notes ?? null,
				timestamp: new Date(),
			})
			.returning();

		return reply.code(201).send({
			success: true,
			test: log,
		});
	});

	/**
	 * GET /api/sterilization/daily-tests
	 * Журнал ежедневного контроля готовности автоклавов.
	 */
	app.get("/api/sterilization/daily-tests", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"read daily tests",
		);
		if (!organizationId) return;

		const tests = await db
			.select({
				id: autoclaveDailyTests.id,
				organizationId: autoclaveDailyTests.organizationId,
				autoclaveId: autoclaveDailyTests.autoclaveId,
				testType: autoclaveDailyTests.testType,
				cycleTemperatureCelsius:
					autoclaveDailyTests.cycleTemperatureCelsius,
				cyclePressureBar: autoclaveDailyTests.cyclePressureBar,
				vacuumLeakRateMbarPerMin:
					autoclaveDailyTests.vacuumLeakRateMbarPerMin,
				colorChangeVerified: autoclaveDailyTests.colorChangeVerified,
				testResult: autoclaveDailyTests.testResult,
				operatorId: autoclaveDailyTests.operatorId,
				operatorName: users.fullName,
				notes: autoclaveDailyTests.notes,
				timestamp: autoclaveDailyTests.timestamp,
				createdAt: autoclaveDailyTests.createdAt,
			})
			.from(autoclaveDailyTests)
			.leftJoin(users, eq(users.id, autoclaveDailyTests.operatorId))
			.where(eq(autoclaveDailyTests.organizationId, organizationId))
			.orderBy(desc(autoclaveDailyTests.timestamp));

		return tests;
	});
}
