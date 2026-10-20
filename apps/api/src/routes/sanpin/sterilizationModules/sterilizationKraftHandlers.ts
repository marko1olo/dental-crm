import {
	SanPiNSterilizationEngine,
	computePackagingExpirationDate,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { sterilizationLogs, visitDiaries } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { wsBroker } from "../../../services/websocketBroker.js";
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
} from "./sterilizationSchemas.js";

/**
 * POST /api/sanpin/sterilization/link
 * (Алиас: /api/sterilization/link)
 * Привязка стерильного лотка к приему врача с мягким клиническим допуском (Мандаты 8e, 8n).
 * Полная автономия врача: привязка штрихкода лотка строго опциональна и никогда не блокирует приём.
 */
export async function handleSterilizationLink(req: FastifyRequest, reply: FastifyReply) {
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
			message: "Проверьте параметры привязки стерилизации: visitId обязателен.",
		});
	}
	const { visitId, barcode } = linkParsed.data;

	const trimmedBarcode = (barcode || "").trim();

	// Мандат 8e / 8n: Врач не обязан сидеть со сканером штрихкодов перед приёмом.
	// Если штрихкод не передан — стерильность гарантирована регламентом смены клиники.
	// Не блокируем приём и возвращаем дневник визита!
	if (!trimmedBarcode) {
		const [existingDiary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, organizationId),
				),
			)
			.limit(1);

		if (existingDiary) {
			return reply.send(existingDiary);
		}

		const identity = getRequestIdentity(req);
		const doctorUserId = identity.userId ?? null;
		const initialHash = computeDiaryHashForTrayLink({
			visitId,
			patientId: null,
			anamnesis: null,
			statusLocalis: null,
			treatmentDescription: null,
			diagnosisIcd10: null,
			diagnosisTooth: null,
			complications: null,
			comorbidities: null,
			instrumentTrayBarcode: null,
		});

		const [created] = await db
			.insert(visitDiaries)
			.values({
				organizationId,
				visitId,
				instrumentTrayBarcode: null,
				draftAuthorId: doctorUserId,
				authorId: doctorUserId,
				doctorId: doctorUserId,
				diaryHash: initialHash,
				isLocked: false,
				content: "",
			})
			.returning();

		return reply.send(created || { success: true, visitId, message: "Лоток опционален, приём не блокируется." });
	}

	const barcodeCandidates = [trimmedBarcode];
	if (trimmedBarcode.includes("|")) {
		const parts = trimmedBarcode.split("|");
		const firstPart = parts[0]?.replace(/#\d+$/, "").trim();
		if (firstPart) barcodeCandidates.push(firstPart);
	}

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
				message: "Не удалось автоматически зарегистрировать лоток стерилизации.",
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
	const isEmergencyAdmission = !evaluation.allowed || evaluation.isExpired;
	const emergencyAdmissionNote = !evaluation.allowed
		? `[Экстренный допуск лотка ${trimmedBarcode} под личную ответственность врача (СанПиН 3.3686-21)]`
		: (evaluation.emergencyLogNote || "");

	if (isEmergencyAdmission && emergencyAdmissionNote) {
		const nextItemsDescription = log.itemsDescription
			? (log.itemsDescription.includes("Мягкий допуск") || log.itemsDescription.includes("Экстренный допуск")
				? log.itemsDescription
				: `${log.itemsDescription} | ${emergencyAdmissionNote}`)
			: emergencyAdmissionNote;

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
			const identity = getRequestIdentity(req);
			const doctorUserId = identity.userId ?? null;
			const initialTreatmentDesc = isEmergencyAdmission && emergencyAdmissionNote
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
			// Мандат 8e: если дневник уже подписан, привязка лотка фиксируется в журнале смены
			// и не вызывает блокирующий 409 сбой в интерфейсе врача.
			return { kind: "locked_admitted" as const, diary: existingDiary };
		}

		const nextTreatmentDescription = isEmergencyAdmission && emergencyAdmissionNote
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
			return { kind: "locked_admitted" as const, diary: existingDiary };
		}
		return { kind: "ok" as const, diary: updated };
	});

	if (diary.kind === "failed_insert") {
		return reply.code(500).send({
			error: "VisitDiaryCreateFailed",
			message: "Не удалось автоматически инициализировать дневник визита для привязки лотка.",
		});
	}

	wsBroker.broadcastToOrganization(organizationId, {
		type: "VISIT_DIARY_UPDATED",
		payload: diary.diary,
	});

	return reply.send(diary.diary);
}

/**
 * POST /api/sanpin/sterilization/generate-barcode
 * (Алиас: /api/sterilization/generate-barcode)
 */
export async function handleGenerateBarcode(req: FastifyRequest, reply: FastifyReply) {
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
			(data.packagingType as SterilizationPackagingType) || "kraft_heat_sealed",
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
}

/**
 * POST /api/sanpin/sterilization/unseal
 * (Алиас: /api/sterilization/unseal)
 * Списание/вскрытие упаковки стерильных инструментов медсестрой.
 * Полный отказ от поштучного сканирования: поддерживает как одиночные штрихкоды,
 * так и пакетное списание партии на смену без обязательного сканера (Мандаты 8e, 8n).
 */
export async function handleUnsealKraftPackage(req: FastifyRequest, reply: FastifyReply) {
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
			message: "Некорректные данные для списания крафт-пакета.",
			details: parsed.error.format(),
		});
	}
	const data = parsed.data;
	const now = new Date();
	const effectiveBarcode =
		(data.barcode || "").trim() ||
		`BATCH-SHIFT-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;

	if (data.barcode && data.barcode.trim()) {
		const existingLog = await db
			.select()
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					eq(sterilizationLogs.barcode, effectiveBarcode),
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
	}

	return reply.send(
		buildUnsealKraftPackageResponse({
			barcode: effectiveBarcode,
			operatorName: data.operatorName,
			operatorId: data.operatorId,
			notes: data.notes,
			now,
		}),
	);
}
