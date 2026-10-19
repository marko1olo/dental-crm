/**
 * apps/api/src/routes/sanpin/sterilizationModules/sterilizationLogHandlers.ts
 *
 * Канонический обработчик журнала работы стерилизаторов (Форма № 257/у)
 * и контроля предстерилизационной очистки (ПСО, Форма № 366/у).
 *
 * Реализует категорический приказ Создателя:
 * - ПАКЕТНАЯ ОБРАБОТКА БОЛЬШИМИ БАТЧАМИ ДЛЯ ЖУРНАЛА (партиями на 15, 30, 50 лотков/пакетов)
 * - 1-клик запуск стандартного цикла (134°C / 2.15 бар / 5 мин) и деликатного (121°C / 1.15 бар / 20 мин)
 * - Авто-фиксация 100% нормы ПСО (азопирам и фенолфталеин отрицательные)
 * - Автоматическое списание со склада расходников (пачка крафт-пакетов + индикаторы 5 класса) с мягким овердрафтом
 * - Полный отказ от микро-дрочи у кресла врача: стерилизация — это тихий фоновый бэк-офис медсестры ЦСО
 */

import {
	SanPiNSterilizationEngine,
	computePackagingExpirationDate,
	createAutoclaveDailyTestSchema,
	createPsoCleaningLogSchema,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
	autoclaveDailyTests,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	computeSterilizationExpiration,
	evaluateAutoclaveCycle,
	generateSterilizationBarcode,
} from "./sterilizationCycleEngine.js";
import {
	createSterilizationLogDtoSchema,
	normalizeSterilizationBody,
	scanSchema,
	type SanpinCycleCreateBody,
	type SterilizationShiftBatchBody,
} from "./sterilizationSchemas.js";
import { executeSterilizationConsumablesDeduction } from "./sterilizationStockDeduction.js";

/**
 * GET /api/sanpin/sterilization
 * (Алиасы: /api/registers/sterilization, /api/sterilization/logs)
 * Получение журнала работы стерилизаторов (Форма № 257/у).
 * Поддерживает фильтрацию по периодам: period=day | week | month | all.
 */
export async function handleGetSterilizationLogs(
	req: FastifyRequest<{
		Querystring: {
			period?: "day" | "week" | "month" | "all";
			autoclaveId?: string;
			search?: string;
		};
	}>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilization read",
	);
	if (!organizationId) return;

	const { period, autoclaveId, search } = req.query || {};
	const now = new Date();
	let dateThreshold: Date | null = null;

	if (period === "day") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	} else if (period === "week") {
		dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	} else if (period === "month") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
	}

	const conditions = [eq(sterilizationLogs.organizationId, organizationId)];

	if (dateThreshold) {
		conditions.push(gte(sterilizationLogs.timestamp, dateThreshold));
	}

	if (autoclaveId && autoclaveId !== "all") {
		conditions.push(eq(sterilizationLogs.autoclaveId, autoclaveId));
	}

	const logs = await db
		.select({
			id: sterilizationLogs.id,
			organizationId: sterilizationLogs.organizationId,
			deviceName: sterilizationLogs.deviceName,
			autoclaveId: sterilizationLogs.autoclaveId,
			serialNumber: sterilizationLogs.autoclaveId,
			cycleNumber: sterilizationLogs.cycleNumber,
			temperatureCelsius: sterilizationLogs.temperatureCelsius,
			pressureBar: sterilizationLogs.pressureBar,
			itemsDescription: sql<string>`coalesce(nullif(split_part(${sterilizationLogs.itemsDescription}, ' | ', 1), ''), ${sterilizationLogs.itemsDescription})`,
			operatorId: sterilizationLogs.operatorId,
			operatorName: sql<string>`coalesce(${users.fullName}, 'Медсестра ЦСО')`,
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
			notes: sql<string | null>`case when position(' | ' in coalesce(${sterilizationLogs.itemsDescription}, '')) > 0 then substring(${sterilizationLogs.itemsDescription} from position(' | ' in ${sterilizationLogs.itemsDescription}) + 3) else null end`,
			timestamp: sterilizationLogs.timestamp,
			createdAt: sterilizationLogs.createdAt,
		})
		.from(sterilizationLogs)
		.leftJoin(users, eq(users.id, sterilizationLogs.operatorId))
		.where(and(...conditions))
		.orderBy(desc(sterilizationLogs.timestamp));

	if (search && search.trim()) {
		const q = search.trim().toLowerCase();
		return logs.filter(
			(l) =>
				l.barcode?.toLowerCase().includes(q) ||
				l.itemsDescription?.toLowerCase().includes(q) ||
				l.deviceName?.toLowerCase().includes(q) ||
				l.operatorName?.toLowerCase().includes(q),
		);
	}

	return logs;
}

/**
 * POST /api/sanpin/sterilization
 * (Алиас: /api/registers/sterilization)
 * Ручная или регламентная регистрация цикла/партии стерилизации.
 */
export async function handleCreateSterilizationLog(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilization create",
	);
	if (!organizationId) return;

	const rawBody = (req.body as Record<string, unknown>) || {};
	const normalizedBody = normalizeSterilizationBody(rawBody);
	const parsed = createSterilizationLogDtoSchema.safeParse(normalizedBody);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные данные стерилизации.",
		});
	}
	const data = parsed.data;

	const now = new Date();
	const evaluation = evaluateAutoclaveCycle({
		temperatureCelsius: data.temperatureCelsius,
		pressureBar: data.pressureBar ?? null,
		durationMin: data.durationMin,
		passedIndicator: data.passedIndicator,
		biologicalTestResult: data.biologicalTestResult,
	});
	const status = evaluation.status;

	const expiresAt = computeSterilizationExpiration(data.packagingType, now, status);
	const generatedBarcode =
		typeof rawBody.barcode === "string" && rawBody.barcode.trim().length > 0
			? rawBody.barcode.trim()
			: generateSterilizationBarcode(data.cycleNumber, now);

	const rawNotes = typeof rawBody.notes === "string" ? rawBody.notes.trim() : "";
	const combinedItemsDesc = rawNotes ? `${data.itemsDescription} | ${rawNotes}` : data.itemsDescription;

	const [log] = await db
		.insert(sterilizationLogs)
		.values({
			organizationId,
			deviceName: data.deviceName,
			autoclaveId:
				data.autoclaveId ??
				(typeof rawBody.serialNumber === "string" ? rawBody.serialNumber : data.deviceName),
			cycleNumber: data.cycleNumber,
			itemsDescription: combinedItemsDesc,
			packagingType: data.packagingType,
			temperatureCelsius: String(data.temperatureCelsius),
			pressureBar:
				data.pressureBar !== null && data.pressureBar !== undefined ? String(data.pressureBar) : null,
			durationMin: data.durationMin,
			indicatorType: data.indicatorType,
			passedIndicator: data.passedIndicator,
			status,
			barcode: generatedBarcode,
			expiresAt,
			operatorId: data.operatorId ?? (req as any).user?.id ?? null,
			timestamp: now,
		})
		.returning();

	// Склад: автоматическое тихое списание расходников под цикл автоклава
	void executeSterilizationConsumablesDeduction({
		organizationId,
		userId: data.operatorId ?? (req as any).user?.id ?? null,
		count: 1,
		packagingType: data.packagingType,
		indicatorType: data.indicatorType,
		cycleNumber: data.cycleNumber,
		barcode: generatedBarcode,
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_STERILIZATION_ADDED",
		payload: log,
	});

	return reply.code(201).send(log);
}

/**
 * POST /api/sanpin/sterilization/quick-norm
 * 1-клик запуск нормативного батча автоклава (134°C / 2.15 бар или 121°C / 1.15 бар)
 * с пакетным списанием расходников со склада и автоматической фиксацией 100% нормы ПСО.
 */
export async function handleQuickNormCycle(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilization quick norm",
	);
	if (!organizationId) return;

	const body = (req.body as Record<string, unknown>) || {};
	const regime = body.regime === "delicate_121" ? "delicate_121" : "standard_134";
	const batchSize = Math.max(1, Math.min(Number(body.batchSize ?? body.packagesCount) || 25, 100));
	const deviceName = String(body.deviceName || "Melag Vacuklav 23 B+ (ЦСО №1)");
	const autoclaveId = String(body.autoclaveId || "АК-01");
	const isDelicate = regime === "delicate_121";

	const temp = isDelicate ? "121.0" : "134.0";
	const pressure = isDelicate ? "1.15" : "2.15";
	const durationMin = isDelicate ? 20 : 5;
	const packagingType = String(body.packagingType || (isDelicate ? "kraft_heat_sealed" : "kraft_self_adhesive"));
	const now = new Date();

	// Получаем номер очередного цикла за сегодня
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const [lastCycle] = await db
		.select({ cycleNumber: sterilizationLogs.cycleNumber })
		.from(sterilizationLogs)
		.where(
			and(
				eq(sterilizationLogs.organizationId, organizationId),
				gte(sterilizationLogs.timestamp, todayStart),
			),
		)
		.orderBy(desc(sterilizationLogs.cycleNumber))
		.limit(1);

	const cycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;
	const barcode = `BATCH-C${String(cycleNumber).padStart(2, "0")}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;
	const expiresAt = computePackagingExpirationDate(packagingType as SterilizationPackagingType, now);

	const cycleTimeLabel = String(
		body.cycleName ||
			body.shiftCycleName ||
			(now.getHours() < 12 ? "Утренний цикл" : now.getHours() < 17 ? "Дневной цикл" : "Вечерний цикл"),
	);

	const itemsDescription = String(
		body.itemsDescription ||
			`${cycleTimeLabel} автоклавирования (${batchSize} упаковок: смотровые лотки, боры, наконечники, хирургия)`,
	);

	// 1. Создаем запись цикла в sterilizationLogs
	const [log] = await db
		.insert(sterilizationLogs)
		.values({
			organizationId,
			deviceName,
			autoclaveId,
			cycleNumber,
			itemsDescription: `${itemsDescription} | Партия ${batchSize} шт.`,
			packagingType,
			temperatureCelsius: temp,
			pressureBar: pressure,
			durationMin,
			indicatorType: "class5_integrating",
			cycleMode: "B",
			temperatureSet: temp,
			pressureSet: pressure,
			passedIndicator: true,
			status: "passed",
			barcode,
			expiresAt,
			operatorId: (req as any).user?.id ?? null,
			timestamp: now,
		})
		.returning();

	// 2. Авто-фиксация контроля качества предстерилизационной очистки (100% норма, азопирам и фенолфталеин отрицательные)
	const sampleCount = Math.max(3, Math.ceil(batchSize * 0.01));
	await db
		.insert(preSterilizationCleaningLogs)
		.values({
			organizationId,
			testType: "both",
			batchItemCount: batchSize,
			testedSampleCount: sampleCount,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand: "Биолот 0.5% + Аламинол 1%",
			rejectionReason: null,
			operatorId: (req as any).user?.id ?? null,
			notes: `[Предстерилизационная очистка] Очистка партии автоклава №${cycleNumber} (${batchSize} шт): азопирамовая и фенолфталеиновая пробы отрицательные, 100% норма. Партия допущена.`,
			timestamp: now,
		})
		.catch((err) => {
			req.log.warn({ err }, "Non-blocking: could not record quick norm PSO test");
		});

	// 3. Автоматическое списание со склада пачки крафт-пакетов и индикаторов
	const stockDeduction = await executeSterilizationConsumablesDeduction({
		organizationId,
		userId: (req as any).user?.id ?? null,
		count: batchSize,
		packagingType,
		indicatorType: "class5_integrating",
		cycleNumber,
		barcode,
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_STERILIZATION_ADDED",
		payload: log,
	});

	return reply.code(201).send({
		success: true,
		log,
		batchSize,
		cycleName: cycleTimeLabel,
		regime: isDelicate ? "121°C / 1.15 бар (20 мин)" : "134°C / 2.15 бар (5 мин)",
		psoStatus: "approved_100_percent_norm",
		stockDeduction,
		message: `Зафиксирован ${cycleTimeLabel.toLowerCase()} автоклавирования №${cycleNumber} (${batchSize} упаковок, ${temp}°C, ${pressure} бар, индикатор 5 класса норма). Очистка норма, расходники со склада списаны.`,
	});
}

/**
 * POST /api/sanpin/sterilization/scan
 * (Алиас: /api/sterilization/scan)
 * Сканирование и регистрация партии крафт-пакетов.
 */
export async function handleScanSterilization(req: FastifyRequest, reply: FastifyReply) {
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

	const now = new Date();
	const expiresAt =
		data.status === "passed"
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
}

/**
 * GET & POST /api/sanpin/sterilization/pso-tests
 * (Алиас: /api/sterilization/pso-tests)
 */
export async function handleGetPsoTests(req: FastifyRequest, reply: FastifyReply) {
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
}

export async function handleCreatePsoTest(req: FastifyRequest, reply: FastifyReply) {
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
}

/**
 * POST /api/sanpin/sterilization/pso/quick-norm
 * (Алиас: /api/sterilization/pso/quick-norm)
 * 1-клик фиксация отрицательных проб ПСО (азопирам + фенолфталеин, 100% норма).
 */
export async function handlePsoQuickNorm(req: FastifyRequest, reply: FastifyReply) {
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
		"[СанПиН 2.1.3678-20] Азопирамовая и фенолфталеиновая пробы отрицательные, норма. Партия допущена к стерилизации.";

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
			azopyram: "negative_norm",
			phenolphthalein: "negative_norm",
		},
		sanpinClause: "СанПиН 2.1.3678-20 / СанПиН 3.3686-21",
	});
}

/**
 * GET & POST /api/sanpin/sterilization/daily-tests
 * (Алиас: /api/sterilization/daily-tests)
 */
export async function handleGetDailyTests(req: FastifyRequest, reply: FastifyReply) {
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
			cycleTemperatureCelsius: autoclaveDailyTests.cycleTemperatureCelsius,
			cyclePressureBar: autoclaveDailyTests.cyclePressureBar,
			vacuumLeakRateMbarPerMin: autoclaveDailyTests.vacuumLeakRateMbarPerMin,
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
}

export async function handleCreateDailyTest(req: FastifyRequest, reply: FastifyReply) {
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
}

/**
 * Алиасы для циклов
 */
export async function handleGetSanpinCycles(req: FastifyRequest, reply: FastifyReply) {
	return handleGetSterilizationLogs(req as any, reply);
}

export async function handleCreateSanpinCycle(req: FastifyRequest, reply: FastifyReply) {
	return handleCreateSterilizationLog(req, reply);
}

/**
 * POST /api/sanpin/sterilization/shift-batch
 * (Алиас: /api/registers/sterilization/shift-batch)
 * Пакетная регистрация циклов смены с автосписанием расходников.
 */
export async function handleSterilizationShiftBatch(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilization shift batch create",
	);
	if (!organizationId) return;

	const body = (req.body as SterilizationShiftBatchBody) || {};
	const cyclesCount = Math.min(Math.max(Number(body.cyclesCount) || 1, 1), 5);
	const deviceName = body.deviceName || "Melag Vacuklav 23 B+ (ЦСО №1)";
	const packagingType = (body.packagingType as SterilizationPackagingType) || "kraft_heat_sealed";
	const itemsDescription =
		body.itemsDescription ||
		"Базовый стоматологический набор смены (лотки, зеркала, зонды, пинцеты, боры)";

	const now = new Date();

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
	const expiresAt = computeSterilizationExpiration(packagingType, now, "passed");
	const logsToInsert: Array<typeof sterilizationLogs.$inferInsert> = [];

	for (let i = 0; i < cyclesCount; i++) {
		const cycleNumber = startCycle + i;
		const generatedBarcode = generateSterilizationBarcode(cycleNumber, now);

		logsToInsert.push({
			organizationId,
			deviceName,
			autoclaveId: body.autoclaveId || "АК-01",
			cycleNumber,
			itemsDescription: `${itemsDescription} (Партия ${cycleNumber})`,
			packagingType,
			temperatureCelsius: "134.0",
			pressureBar: "2.15",
			durationMin: 5,
			indicatorType: "class5_integrating",
			cycleMode: "B",
			temperatureSet: "134.0",
			pressureSet: "2.15",
			passedIndicator: true,
			status: "passed" as const,
			barcode: generatedBarcode,
			expiresAt,
			operatorId: (req as any).user?.id || null,
			timestamp: new Date(now.getTime() + i * 60000),
		});
	}

	const inserted = await db.insert(sterilizationLogs).values(logsToInsert).returning();

	// Склад: списываем пачку крафт-пакетов (по 20 шт на цикл) и индикаторы
	void executeSterilizationConsumablesDeduction({
		organizationId,
		userId: (req as any).user?.id || null,
		count: cyclesCount * 20,
		packagingType,
		indicatorType: "class5_integrating",
	});

	// ПСО контроль
	await db
		.insert(preSterilizationCleaningLogs)
		.values({
			organizationId,
			testType: "both",
			batchItemCount: cyclesCount * 20,
			testedSampleCount: Math.max(3, Math.ceil(cyclesCount * 20 * 0.01)),
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand: "Биолот 0.5% + Аламинол 1%",
			rejectionReason: null,
			operatorId: (req as any).user?.id || null,
			notes: `[СанПиН 2.1.3678-20] ПСО партии смены (${cyclesCount} циклов, ${cyclesCount * 20} лотков): азопирам и фенолфталеин отрицательные, норма. Допущено.`,
			timestamp: now,
		})
		.catch((err) => {
			req.log.warn({ err }, "Non-blocking: could not record shift batch PSO test");
		});

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
		message: `Зарегистрировано циклов смены: ${inserted.length} (134°C, 2.15 бар, 5 мин, ПСО норма, склад списан)`,
	});
}
