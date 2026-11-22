import { randomUUID } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { calculateAge, computePayloadHash } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { generatedDocuments, patients } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { ensurePatientInOrganization } from "../odontogram/planHelpers.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BraveryDiplomaRecord {
	id: string;
	patientId: string;
	diplomaNumber: string;
	patientName: string;
	patientAgeYears?: number | undefined;
	doctorName: string;
	clinicName: string;
	awardReasonRu: string;
	awardedDateIso: string;
	issueDateRu: string;
	createdAt: string;
}

const issueDiplomaSchema = z.object({
	patientName: z.string().min(1).optional(),
	patientAgeYears: z.number().int().min(1).max(18).optional(),
	doctorName: z.string().optional().default("Врач-стоматолог детский"),
	clinicName: z.string().optional().default("Стоматологическая клиника DENTE"),
	awardReasonRu: z.string().optional().default("За выдающееся мужество, образцовое спокойствие в кресле стоматолога и дружбу с Зубной Феей!"),
	awardedDateIso: z.string().optional(),
	idempotencyKey: z.string().optional(),
});

export function registerPediatricDiplomaRoutes(app: FastifyInstance): void {
	app.get<{ Params: { patientId: string } }>("/api/patients/:patientId/pediatric/bravery-diploma", async (request, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "pediatric diploma audit");
		if (!organizationId) return;

		const { patientId } = request.params;
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
		}

		try {
			const dbDocs = await db.select().from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.organizationId, organizationId),
						eq(generatedDocuments.patientId, patientId),
						or(
							eq(generatedDocuments.kind, "bravery_diploma"),
							eq(generatedDocuments.kind, "visit_attendance_certificate"),
							eq(generatedDocuments.title, "Диплом за храбрость")
						)
					)
				)
				.orderBy(desc(generatedDocuments.createdAt));

			const mappedFromDb: BraveryDiplomaRecord[] = dbDocs.map((doc) => {
				let payload: Partial<BraveryDiplomaRecord> = {};
				if (doc.payloadJson) {
					try {
						payload = JSON.parse(doc.payloadJson);
					} catch (parseErr) {
						request.log.warn({ parseErr, docId: doc.id }, "Failed to parse bravery diploma payloadJson");
					}
				}
				return {
					id: doc.id,
					patientId: doc.patientId,
					diplomaNumber: payload.diplomaNumber ?? `ДИПЛОМ-ГЕРОЙ-${doc.id.slice(0, 8).toUpperCase()}`,
					patientName: payload.patientName ?? "Юный пациент",
					patientAgeYears: payload.patientAgeYears,
					doctorName: payload.doctorName ?? "Врач-стоматолог",
					clinicName: payload.clinicName ?? "DENTE",
					awardReasonRu: payload.awardReasonRu ?? "За выдающееся мужество в кресле стоматолога!",
					awardedDateIso: payload.awardedDateIso ?? doc.createdAt?.toISOString() ?? new Date().toISOString(),
					issueDateRu: payload.issueDateRu ?? new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
					createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
				};
			});
			return reply.send({ success: true, diplomas: mappedFromDb });
		} catch (error) {
			request.log.error({ error, patientId }, "Failed to fetch bravery diplomas from PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось получить список дипломов за храбрость" });
		}
	});

	app.post<{ Params: { patientId: string } }>("/api/patients/:patientId/pediatric/bravery-diploma", async (request, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "issue pediatric diploma");
		if (!organizationId) return;

		const { patientId } = request.params;
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
		}

		const parsed = issueDiplomaSchema.safeParse(request.body ?? {});
		if (!parsed.success) return reply.code(400).send({ error: "ValidationFailed", issues: parsed.error.issues });

		// Мандаты 8d, 8bo, 8zp: Идемпотентность по заголовку Idempotency-Key
		const rawIdempotencyKey =
			(request.headers?.["idempotency-key"] as string | undefined) ??
			(request.headers?.["x-idempotency-key"] as string | undefined) ??
			parsed.data.idempotencyKey;
		const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			try {
				const [existingRecord] = await db
					.select()
					.from(idempotencyKeys)
					.where(and(eq(idempotencyKeys.clinicId, organizationId), eq(idempotencyKeys.key, idempotencyKey)))
					.limit(1);

				if (existingRecord) {
					if (existingRecord.status === "completed" && existingRecord.responseBody) {
						reply.header("idempotency-replayed", "true");
						reply.header("x-idempotency-replayed", "true");
						return reply.code(existingRecord.responseCode || 201).send(existingRecord.responseBody);
					}
					if (existingRecord.status === "in_flight") {
						return reply.code(409).header("Retry-After", "1").send({
							error: "Conflict",
							message: "Операция генерации диплома за храбрость с данным Idempotency-Key уже выполняется.",
						});
					}
				}
			} catch (idempotencyCheckErr) {
				request.log.warn({ idempotencyCheckErr, idempotencyKey }, "Idempotency check bypass on read failure");
			}
		}

		const now = new Date();
		let patientBirthDate: string | null = null;
		let patientDbFullName: string | null = null;

		try {
			const [patientRow] = await db
				.select({
					fullName: patients.fullName,
					birthDate: patients.birthDate,
				})
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
				.limit(1);

			if (patientRow) {
				patientBirthDate = patientRow.birthDate;
				patientDbFullName = patientRow.fullName;
			}
		} catch (patientFetchErr) {
			request.log.warn({ patientFetchErr, patientId }, "Failed to fetch patient details for bravery diploma age calculation");
		}

		let effectiveAge = parsed.data.patientAgeYears;
		if (effectiveAge === undefined && patientBirthDate) {
			const computed = calculateAge(patientBirthDate);
			if (computed > 0 && computed <= 18) {
				effectiveAge = computed;
			}
		}

		const effectivePatientName =
			(parsed.data.patientName && parsed.data.patientName.trim()) ||
			patientDbFullName ||
			"Юный пациент";

		// Криптографически стойкая энтропия без Math.random
		const entropy = randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase();
		const diplomaNumber = `ДИПЛОМ-ГЕРОЙ-${now.getFullYear()}-${entropy}`;
		const issueDateRu = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

		const diplomaRecord: BraveryDiplomaRecord = {
			id: randomUUID(),
			patientId,
			diplomaNumber,
			patientName: effectivePatientName,
			patientAgeYears: effectiveAge,
			doctorName: parsed.data.doctorName,
			clinicName: parsed.data.clinicName,
			awardReasonRu: parsed.data.awardReasonRu,
			awardedDateIso: parsed.data.awardedDateIso ?? now.toISOString(),
			issueDateRu,
			createdAt: now.toISOString(),
		};

		const responsePayload: Record<string, unknown> = { success: true, diploma: diplomaRecord };

		try {
			await db.transaction(async (tx) => {
				await tx.insert(generatedDocuments).values({
					id: diplomaRecord.id,
					organizationId,
					patientId,
					kind: "bravery_diploma",
					status: "issued",
					title: "Диплом за храбрость",
					payloadJson: JSON.stringify(diplomaRecord),
				});

				if (idempotencyKey) {
					await tx
						.insert(idempotencyKeys)
						.values({
							clinicId: organizationId,
							key: idempotencyKey,
							status: "completed",
							payloadHash: computePayloadHash(request.body ?? {}),
							responseBody: responsePayload,
							responseCode: 201,
						})
						.onConflictDoUpdate({
							target: [idempotencyKeys.clinicId, idempotencyKeys.key],
							set: {
								status: "completed",
								responseBody: responsePayload,
								responseCode: 201,
							},
						});
				}
			});

			return reply.code(201).send(responsePayload);
		} catch (error) {
			request.log.error({ error, patientId, diplomaRecord }, "Failed to persist bravery diploma into PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось сохранить диплом за храбрость в базу данных" });
		}
	});
}
