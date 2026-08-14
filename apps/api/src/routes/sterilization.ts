import crypto from "node:crypto";
import {
	SanPiNSterilizationEngine,
	computePackagingExpirationDate,
	createAutoclaveDailyTestSchema,
	createPsoCleaningLogSchema,
	STERILIZATION_CYCLE_MODES,
	STERILIZATION_INDICATOR_TYPES,
	STERILIZATION_PACKAGING_TYPES,
	type SterilizationCycleMode,
	type SterilizationIndicatorType,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	autoclaveDailyTests,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	users,
	visitDiaries,
} from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

const packagingTypeSchema = z
	.enum([
		"kraft_heat_sealed",
		"kraft_self_adhesive",
		"laminated_heat_sealed",
		"metal_cassette",
		"other",
	])
	.optional()
	.nullable();

const indicatorTypeSchema = z
	.enum([
		"class4_multivariable",
		"class5_integrating",
		"class6_emulating",
		"biological",
		"bowie_dick",
	])
	.optional()
	.nullable();

const cycleModeSchema = z
	.enum([
		"B",
		"S",
		"N",
		"dry_heat_180",
		"dry_heat_160",
		"plasma_vh2o2",
		"ethylene_oxide",
	])
	.optional()
	.nullable();

const scanSchema = z.object({
	barcode: z.string().trim().min(1, "Штрихкод упаковки обязателен."),
	autoclaveId: z.string().trim().min(1, "Идентификатор стерилизатора/автоклава обязателен."),
	operatorId: z.string().uuid("Некорректный ID оператора стерилизации.").optional().nullable(),
	status: z.enum(["passed", "failed", "quarantined"]),
	deviceName: z.string().trim().max(120).optional().nullable(),
	cycleNumber: z.number().int().min(1).optional().nullable(),
	temperatureCelsius: z.number().min(50).max(300).optional().nullable(),
	pressureBar: z.number().min(0).max(10).optional().nullable(),
	itemsDescription: z.string().trim().max(500).optional().nullable(),
	packagingType: packagingTypeSchema,
	indicatorType: indicatorTypeSchema,
	cycleMode: cycleModeSchema,
	durationMin: z.number().int().min(1).max(300).optional().nullable(),
});

/**
 * 8-сегментный криптографический отпечаток SHA-256 для формы 043/у.
 * Лоток входит в неизменяемый отпечаток дневника: смена штрихкода лотка
 * пересчитывает diary_hash синхронно с подписью.
 */
function computeDiaryHashForTrayLink(row: {
	visitId: string;
	patientId: string | null;
	anamnesis: string | null;
	statusLocalis: string | null;
	treatmentDescription: string | null;
	diagnosisIcd10: string | null;
	diagnosisTooth: string | null;
	complications: string | null;
	comorbidities: string | null;
	instrumentTrayBarcode: string | null;
}): string {
	const raw = [
		row.visitId,
		row.patientId ?? "",
		row.anamnesis ?? "",
		row.statusLocalis ?? "",
		row.treatmentDescription ?? "",
		row.diagnosisIcd10 ?? "",
		row.diagnosisTooth ?? "",
		row.complications ?? "",
		row.comorbidities ?? "",
		row.instrumentTrayBarcode ?? "",
	].join("|");
	return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function registerSterilizationRoutes(app: FastifyInstance) {
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
			const firstError = scanParsed.error.issues[0]?.message ?? "Проверьте данные стерилизации.";
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
	 * POST /api/sterilization/link
	 * Привязка стерильного лотка к дневному приему 043/у с пересчетом SHA-256 хэша
	 * и защитой от TOCTOU / нестерильных или просроченных упаковок.
	 */
	app.post("/api/sterilization/link", async (req, reply) => {
		const clinical = await requireClinicalMutationContext(
			req,
			reply,
			"sterilization link",
		);
		if (!clinical) return;
		const organizationId = clinical.organizationId;

		const linkParsed = z
			.object({
				visitId: z.string().uuid("Некорректный ID визита."),
				barcode: z.string().trim().min(1, "Штрихкод обязателен."),
			})
			.safeParse(req.body);

		if (!linkParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте привязку стерилизации: visitId и barcode обязательны.",
			});
		}
		const { visitId, barcode } = linkParsed.data;

		// Проверяем статус последнего цикла стерилизации для данного штрихкода в организации
		const [log] = await db
			.select()
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					eq(sterilizationLogs.barcode, barcode),
				),
			)
			.orderBy(desc(sterilizationLogs.timestamp))
			.limit(1);

		if (!log) {
			return reply.code(400).send({
				error: "InvalidSterilizationBarcode",
				message:
					"Штрихкод инструментального лотка не найден в журнале стерилизации клиники. Отсканируйте зарегистрированный лоток.",
			});
		}

		if (log.status !== "passed" || !log.passedIndicator) {
			return reply.code(400).send({
				error: "FailedSterilizationBarcode",
				message:
					"Лоток не прошел контроль стерилизации (статус «failed» или карантин). Использование непростерилизованных инструментов категорически запрещено СанПиН 3.3686-21.",
			});
		}

		// Проверка срока годности стерильности
		if (log.expiresAt && new Date(log.expiresAt).getTime() < Date.now()) {
			return reply.code(400).send({
				error: "ExpiredSterilizationBarcode",
				message: `Срок годности стерильной упаковки лотка истек (${new Date(log.expiresAt).toLocaleDateString("ru-RU")}). Требуется повторная предстерилизационная очистка и автоклавирование.`,
			});
		}

		// Атомарная транзакция с пессимистичной блокировкой FOR UPDATE
		const diary = await db.transaction(async (tx) => {
			const [existingDiary] = await tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, visitId),
						eq(visitDiaries.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!existingDiary) {
				return { kind: "not_found" as const };
			}
			if (existingDiary.isLocked) {
				return { kind: "locked" as const };
			}

			const nextHash = computeDiaryHashForTrayLink({
				visitId: existingDiary.visitId,
				patientId: existingDiary.patientId,
				anamnesis: existingDiary.anamnesis,
				statusLocalis: existingDiary.statusLocalis,
				treatmentDescription: existingDiary.treatmentDescription,
				diagnosisIcd10: existingDiary.diagnosisIcd10,
				diagnosisTooth: existingDiary.diagnosisTooth,
				complications: existingDiary.complications,
				comorbidities: existingDiary.comorbidities,
				instrumentTrayBarcode: barcode,
			});

			const [updated] = await tx
				.update(visitDiaries)
				.set({
					instrumentTrayBarcode: barcode,
					diaryHash: nextHash,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(visitDiaries.id, existingDiary.id),
						eq(visitDiaries.organizationId, organizationId),
						eq(visitDiaries.isLocked, false),
					),
				)
				.returning();

			if (!updated) {
				return { kind: "locked" as const };
			}
			return { kind: "ok" as const, diary: updated };
		});

		if (diary.kind === "not_found") {
			return reply.code(404).send({
				error: "VisitDiaryNotFound",
				message:
					"Дневник этого приема еще не сохранен, привязать лоток не к чему. Сохраните черновик дневника и повторите привязку.",
			});
		}
		if (diary.kind === "locked") {
			return reply.code(409).send({
				error: "DiaryLocked",
				message:
					"Дневник приема уже подписан — изменить инструментальный лоток в 043/у нельзя. Если упаковка указана неверно, правку вносит администратор через ревизию дневника.",
			});
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "VISIT_DIARY_UPDATED",
			payload: diary.diary,
		});

		return diary.diary;
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

	/**
	 * POST /api/sterilization/generate-barcode
	 * Генерация маркировочного штрихкода трассируемости и расчет срока сохранения стерильности.
	 */
	app.post("/api/sterilization/generate-barcode", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"generate barcode",
		);
		if (!organizationId) return;

		const bodySchema = z.object({
			cycleId: z.union([z.string(), z.number()]),
			trayCode: z.string().trim().min(1).max(50),
			packagingType: packagingTypeSchema.default("kraft_heat_sealed"),
		});

		const parsed = bodySchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры для генерации штрихкода.",
				details: parsed.error.format(),
			});
		}
		const data = parsed.data;

		const now = new Date();
		const expiryDate =
			computePackagingExpirationDate(
				(data.packagingType as SterilizationPackagingType) ||
					"kraft_heat_sealed",
				now,
			) || new Date(now.getTime() + 50 * 86400000);

		const barcode = SanPiNSterilizationEngine.generateSterilizationBarcode({
			cycleId: data.cycleId,
			trayCode: data.trayCode,
			expiryDate,
		});

		return reply.send({
			success: true,
			barcode,
			packagingType: data.packagingType,
			createdAt: now.toISOString(),
			expiresAt: expiryDate.toISOString(),
		});
	});
}
