import {
	SanPiNSterilizationEngine,
	computePackagingExpirationDate,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationContext,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { sterilizationLogs, visitDiaries } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	applyEmergencySterilizationToDiaryTreatment,
	buildAutoProvisionSterilizationLogValues,
	buildUnsealKraftPackageResponse,
	computeDiaryHashForTrayLink,
	evaluateSterilizationLogForLinking,
} from "./sterilizationHelpers.js";
import {
	generateBarcodeBodySchema,
	linkSchema,
	unsealBodySchema,
} from "./types.js";

export async function registerSterilizationKraftRoutes(app: FastifyInstance): Promise<void> {
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

		const linkParsed = linkSchema.safeParse(req.body);

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

		// Проверяем статус последнего цикла стерилизации для данных штрихкодов в организации (1 батч-запрос)
		const foundLogs = await db
			.select()
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					inArray(sterilizationLogs.barcode, barcodeCandidates),
				),
			)
			.orderBy(desc(sterilizationLogs.timestamp));

		let log: typeof sterilizationLogs.$inferSelect | undefined;
		for (const candidate of barcodeCandidates) {
			const found = foundLogs.find((l) => l.barcode === candidate);
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
					"Дневник приема уже подписан — изменить инструментальный лоток в 043/у нельзя. Если упаковка указана неверно, внесите правку через ревизию («Исправленному верить»).",
			});
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "VISIT_DIARY_UPDATED",
			payload: diary.diary,
		});

		return diary.diary;
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

		const parsed = generateBarcodeBodySchema.safeParse(req.body);
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

	/**
	 * POST /api/sterilization/unseal
	 * Вскрытие и списание крафт-пакета в 1 клик одной медсестрой без комиссии (Мандаты 8e, 8k, 8n).
	 */
	app.post("/api/sterilization/unseal", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sterilization unseal kraft package",
		);
		if (!organizationId) return;

		const parsed = unsealBodySchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные данные для вскрытия крафт-пакета.",
				details: parsed.error.format(),
			});
		}
		const data = parsed.data;
		const now = new Date();

		const existingLog = await db
			.select()
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					eq(sterilizationLogs.barcode, data.barcode),
				),
			)
			.limit(1);

		if (existingLog.length > 0 && existingLog[0]) {
			await db
				.update(sterilizationLogs)
				.set({
					status: "unsealed",
				})
				.where(
					and(
						eq(sterilizationLogs.id, existingLog[0].id),
						eq(sterilizationLogs.organizationId, organizationId),
					),
				);
		}

		return reply.send(
			buildUnsealKraftPackageResponse({
				barcode: data.barcode,
				operatorName: data.operatorName,
				operatorId: data.operatorId,
				notes: data.notes,
				now,
			}),
		);
	});
}
