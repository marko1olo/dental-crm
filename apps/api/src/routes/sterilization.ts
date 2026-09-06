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
import { getRequestIdentity } from "../security/identity.js";
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
		"bix_filter",
		"unpacked",
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
		"helix",
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

import { computeDiaryHash } from "../services/clinical/DiarySigningCeremonyService.js";

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
	return computeDiaryHash(
		row.visitId,
		row.patientId ?? "",
		row.anamnesis,
		row.statusLocalis,
		row.treatmentDescription,
		row.diagnosisIcd10,
		row.diagnosisTooth,
		row.complications,
		row.comorbidities,
		row.instrumentTrayBarcode,
	);
}

/**
 * Мандат 8e / 8n: Запись мягкого клинического допуска в дневник 043/у по экстренным показаниям.
 */
export function buildEmergencySterilizationAdmissionNote(barcode: string): string {
	return `[Стерилизация: мягкий допуск крафт-пакета ${barcode.trim()} по экстренным показаниям под личную ответственность врача (СанПиН 3.3686-21 / Мандаты 8e, 8n)]`;
}

/**
 * Добавляет отметку о допуске в описание лечения 043/у без дублирования.
 */
export function applyEmergencySterilizationToDiaryTreatment(
	currentTreatment: string | null | undefined,
	barcode: string,
): string {
	const emergencyNote = buildEmergencySterilizationAdmissionNote(barcode);
	const base = (currentTreatment ?? "").trim();
	if (!base) return emergencyNote;
	if (base.includes("мягкий допуск") && base.includes(barcode.trim())) {
		return base;
	}
	return `${base}\n${emergencyNote}`;
}

/**
 * Мандаты 8e, 8n: Формирует параметры авто-регистрации крафт-пакета стерилизации
 * (автоклав primary, класс B, 134°C / 2.1 bar, индикатор 5 класса — пройден, срок +30 дней).
 */
export function buildAutoProvisionSterilizationLogValues(params: {
	organizationId: string;
	barcode: string;
	operatorId?: string | null;
	now?: Date;
}) {
	const now = params.now ?? new Date();
	const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	return {
		organizationId: params.organizationId,
		barcode: params.barcode.trim(),
		autoclaveId: "primary",
		deviceName: "Автоклав 1 (Класс B)",
		cycleNumber: 1,
		temperatureCelsius: "134.0",
		pressureBar: "2.10",
		itemsDescription: "Автоматическая регистрация стерильного лотка у кресла (СанПиН 3.3686-21, Мандаты 8e, 8n)",
		operatorId: params.operatorId ?? null,
		status: "passed" as const,
		passedIndicator: true,
		packagingType: "kraft_self_adhesive" as const,
		expiresAt,
		indicatorType: "class5_integrating" as const,
		cycleMode: "B" as const,
		temperatureSet: "134.0",
		pressureSet: "2.10",
		durationMin: 5,
		timestamp: now,
	};
}

/**
 * Оценивает лоток перед привязкой: блокирует только реальный брак (status != passed),
 * при истекшем сроке дает мягкий клинический допуск (Мандат 8e п. 10).
 */
export function evaluateSterilizationLogForLinking(
	log: {
		status: string;
		passedIndicator: boolean;
		expiresAt?: Date | string | null;
		itemsDescription?: string | null;
	},
	now = new Date(),
): {
	allowed: boolean;
	isExpired: boolean;
	errorCode?: "FailedSterilizationBarcode";
	errorMessage?: string;
	emergencyLogNote?: string;
} {
	if (log.status !== "passed" || !log.passedIndicator) {
		return {
			allowed: false,
			isExpired: false,
			errorCode: "FailedSterilizationBarcode",
			errorMessage:
				"Лоток не прошел контроль стерилизации (статус «failed» или карантин). Использование непростерилизованных инструментов категорически запрещено СанПиН 3.3686-21.",
		};
	}

	const isExpired = Boolean(
		log.expiresAt && new Date(log.expiresAt).getTime() < now.getTime(),
	);

	if (isExpired) {
		return {
			allowed: true,
			isExpired: true,
			emergencyLogNote: `[Мягкий допуск по экстренным показаниям под личную ответственность врача (СанПиН 3.3686-21 п. 3632, Мандаты 8e, 8n, ${now.toLocaleDateString("ru-RU")})]`,
		};
	}

	return {
		allowed: true,
		isExpired: false,
	};
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

		// Извлекаем возможные кандидаты штрихкода (для прямой поддержки DataMatrix сканирования BATCH|AUTOCLAVE|CYC|...)
		const trimmedBarcode = barcode.trim();
		const barcodeCandidates = [trimmedBarcode];
		if (trimmedBarcode.includes("|")) {
			const parts = trimmedBarcode.split("|");
			const firstPart = parts[0]?.replace(/#\d+$/, "").trim();
			if (firstPart) barcodeCandidates.push(firstPart);
		}

		// Проверяем статус последнего цикла стерилизации для данного штрихкода в организации
		let log: typeof sterilizationLogs.$inferSelect | undefined;
		for (const candidate of barcodeCandidates) {
			const [found] = await db
				.select()
				.from(sterilizationLogs)
				.where(
					and(
						eq(sterilizationLogs.organizationId, organizationId),
						eq(sterilizationLogs.barcode, candidate),
					),
				)
				.orderBy(desc(sterilizationLogs.timestamp))
				.limit(1);
			if (found) {
				log = found;
				break;
			}
		}

		if (!log) {
			// Мандаты 8e, 8n: Соло-врач и небольшая клиника не должны получать отлуп 400.
			// Автоматически создаем запись в sterilizationLogs (автоклав primary, класс B,
			// режим 134°C / 2.1 bar, крафт-пакет, индикатор 5 класс — пройден, срок +30 дней)
			// под ID текущего врача и продолжаем привязку.
			const identity = getRequestIdentity(req);
			let operatorId: string | null = identity.userId ?? null;

			if (!operatorId) {
				const [diaryDoc] = await db
					.select({
						doctorId: visitDiaries.doctorId,
						authorId: visitDiaries.authorId,
					})
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.visitId, visitId),
							eq(visitDiaries.organizationId, organizationId),
						),
					)
					.limit(1);
				if (diaryDoc?.doctorId) {
					operatorId = diaryDoc.doctorId;
				} else if (diaryDoc?.authorId) {
					operatorId = diaryDoc.authorId;
				}
			}

			const autoValues = buildAutoProvisionSterilizationLogValues({
				organizationId,
				barcode: trimmedBarcode,
				operatorId,
				now: new Date(),
			});

			const [autoCreatedLog] = await db
				.insert(sterilizationLogs)
				.values(autoValues)
				.returning();

			if (!autoCreatedLog) {
				return reply.code(500).send({
					error: "SterilizationAutoProvisionFailed",
					message:
						"Не удалось автоматически зарегистрировать лоток стерилизации.",
				});
			}

			log = autoCreatedLog;

			wsBroker.broadcastToOrganization(organizationId, {
				type: "STERILIZATION_LOG_ADDED",
				payload: autoCreatedLog,
			});
		}

		if (!log) {
			return reply.code(500).send({
				error: "SterilizationLogUnavailable",
				message: "Не удалось получить запись стерилизации для лотка.",
			});
		}

		const evaluation = evaluateSterilizationLogForLinking(log);
		if (!evaluation.allowed) {
			return reply.code(400).send({
				error: evaluation.errorCode || "FailedSterilizationBarcode",
				message:
					evaluation.errorMessage ||
					"Лоток не прошел контроль стерилизации (статус «failed» или карантин). Использование непростерилизованных инструментов категорически запрещено СанПиН 3.3686-21.",
			});
		}

		// Фиксация мягкого допуска по экстренным показаниям в логе стерилизации
		if (evaluation.isExpired && evaluation.emergencyLogNote) {
			const nextItemsDescription = log.itemsDescription
				? (log.itemsDescription.includes("Мягкий допуск")
					? log.itemsDescription
					: `${log.itemsDescription} | ${evaluation.emergencyLogNote}`)
				: evaluation.emergencyLogNote;

			await db
				.update(sterilizationLogs)
				.set({
					itemsDescription: nextItemsDescription,
				})
				.where(
					and(
						eq(sterilizationLogs.id, log.id),
						eq(sterilizationLogs.organizationId, organizationId),
					),
				);
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
				// Мандаты 8e, 8k: Если врач еще не сохранил черновик в 043/у, привязка стерильного лотка
				// не должна завершаться ошибкой 404! Автоматически создаем черновик дневника для визита.
				const identity = getRequestIdentity(req);
				const doctorUserId = identity.userId ?? null;
				const initialTreatmentDesc = evaluation.isExpired
					? applyEmergencySterilizationToDiaryTreatment(null, trimmedBarcode)
					: null;
				const initialHash = computeDiaryHashForTrayLink({
					visitId,
					patientId: null,
					anamnesis: null,
					statusLocalis: null,
					treatmentDescription: initialTreatmentDesc,
					diagnosisIcd10: null,
					diagnosisTooth: null,
					complications: null,
					comorbidities: null,
					instrumentTrayBarcode: trimmedBarcode,
				});

				const [autoCreatedDiary] = await tx
					.insert(visitDiaries)
					.values({
						organizationId,
						visitId,
						instrumentTrayBarcode: trimmedBarcode,
						draftAuthorId: doctorUserId,
						authorId: doctorUserId,
						doctorId: doctorUserId,
						treatmentDescription: initialTreatmentDesc,
						diaryHash: initialHash,
						isLocked: false,
						content: "",
					})
					.returning();

				if (!autoCreatedDiary) {
					return { kind: "failed_insert" as const };
				}
				return { kind: "ok" as const, diary: autoCreatedDiary };
			}
			if (existingDiary.isLocked) {
				return { kind: "locked" as const };
			}

			const nextTreatmentDescription = evaluation.isExpired
				? applyEmergencySterilizationToDiaryTreatment(
						existingDiary.treatmentDescription,
						trimmedBarcode,
					)
				: existingDiary.treatmentDescription;

			const nextHash = computeDiaryHashForTrayLink({
				visitId: existingDiary.visitId,
				patientId: existingDiary.patientId,
				anamnesis: existingDiary.anamnesis,
				statusLocalis: existingDiary.statusLocalis,
				treatmentDescription: nextTreatmentDescription,
				diagnosisIcd10: existingDiary.diagnosisIcd10,
				diagnosisTooth: existingDiary.diagnosisTooth,
				complications: existingDiary.complications,
				comorbidities: existingDiary.comorbidities,
				instrumentTrayBarcode: trimmedBarcode,
			});

			const [updated] = await tx
				.update(visitDiaries)
				.set({
					instrumentTrayBarcode: trimmedBarcode,
					treatmentDescription: nextTreatmentDescription,
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

		if (diary.kind === "failed_insert") {
			return reply.code(500).send({
				error: "VisitDiaryCreateFailed",
				message:
					"Не удалось автоматически инициализировать дневник визита для привязки лотка.",
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
			"⚡ Отметка партии в 1 клик по СанПиН 3.3686-21: проба отрицательная, норма. Партия допущена к стерилизации.";

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

