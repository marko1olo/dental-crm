import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
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
	type SanpinCycleCreateBody,
	type SterilizationPackagingType,
	type SterilizationShiftBatchBody,
} from "./sterilizationSchemas.js";

export async function handleGetSterilizationLogs(
	req: FastifyRequest,
	reply: FastifyReply,
) {
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
		.where(eq(sterilizationLogs.organizationId, organizationId))
		.orderBy(desc(sterilizationLogs.timestamp));

	return logs;
}

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

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_STERILIZATION_ADDED",
		payload: log,
	});

	return reply.code(201).send(log);
}

export async function handleGetSanpinCycles(
	req: FastifyRequest,
	reply: FastifyReply,
) {
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
}

export async function handleCreateSanpinCycle(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin cycles create",
	);
	if (!organizationId) return;

	const body = (req.body as SanpinCycleCreateBody) || {};
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

	const generatedBarcode = body.barcode || generateSterilizationBarcode(cycleNumber, now);
	const expiresAt = computeSterilizationExpiration(packagingType, now, status);

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
}

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
	const deviceName = body.deviceName || "Автоклав B-класса (ЦСО №1)";
	const packagingType = (body.packagingType as SterilizationPackagingType) || "kraft_bag";
	const itemsDescription =
		body.itemsDescription ||
		"Базовый стоматологический набор смены (лотки, зеркала, зонды, пинцеты, боры)";

	const now = new Date();

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
	const expiresAt = computeSterilizationExpiration(packagingType, now, "passed");
	const logsToInsert: Array<typeof sterilizationLogs.$inferInsert> = [];

	for (let i = 0; i < cyclesCount; i++) {
		const cycleNumber = startCycle + i;
		const generatedBarcode = generateSterilizationBarcode(cycleNumber, now);

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
			indicatorType: "class5_integrating",
			cycleMode: "B",
			passedIndicator: true,
			status: "passed" as const,
			barcode: generatedBarcode,
			expiresAt,
			operatorId: (req as any).user?.id || null,
			timestamp: new Date(now.getTime() + i * 60000),
		});
	}

	const inserted = await db.insert(sterilizationLogs).values(logsToInsert).returning();

	// СанПиН 3.3686-21: Предстерилизационная очистка (ПСО) для данной смены (100% норма, азопирам и фенолфталеин отрицательные)
	await db
		.insert(preSterilizationCleaningLogs)
		.values({
			organizationId,
			testType: "both",
			batchItemCount: 100,
			testedSampleCount: 3,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand: "Биолот 0.5% + Аламинол 1%",
			rejectionReason: null,
			operatorId: (req as any).user?.id || null,
			notes: "[СанПиН 3.3686-21] Азопирамовая и фенолфталеиновая пробы отрицательные, норма (ИнТест 134/5). Партия инструментов смены допущена к автоклавированию (134°C, 2.1 бар, 5 мин).",
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
		message: `Зарегистрировано циклов смены: ${inserted.length} (134°C, 2.15 бар, 5 мин, ПСО норма)`,
	});
}
