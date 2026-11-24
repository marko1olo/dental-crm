import { randomUUID } from "node:crypto";
import { and, desc, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { calculateAge } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { generatedDocuments, patientRelationships, patients } from "../../db/schema.js";
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

export interface ParentMemoRecord {
	id: string;
	patientId: string;
	memoNumber: string;
	patientName: string;
	patientPhone?: string | undefined;
	patientAgeYears?: number | undefined;
	doctorName: string;
	clinicName: string;
	clinicPhone?: string | undefined;
	franklRating?: number | undefined;
	hasAnesthesia?: boolean | undefined;
	hasPulpotomy?: boolean | undefined;
	pulpotomyTooth?: number | undefined;
	hasFissureSealing?: boolean | undefined;
	fissureTeeth?: string | undefined;
	hasSilvering?: boolean | undefined;
	silveringTeeth?: string | undefined;
	customNotes?: string | undefined;
	memoText: string;
	issuedDateIso: string;
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
}).strict();

const issueParentMemoSchema = z.object({
	patientName: z.string().min(1).optional(),
	patientPhone: z.string().optional(),
	patientAgeYears: z.number().int().min(1).max(18).optional(),
	doctorName: z.string().optional().default("Врач-стоматолог детский"),
	clinicName: z.string().optional().default("Стоматологическая клиника DENTE"),
	clinicPhone: z.string().optional(),
	franklRating: z.number().int().min(1).max(4).optional(),
	hasAnesthesia: z.boolean().optional(),
	hasPulpotomy: z.boolean().optional(),
	pulpotomyTooth: z.number().int().optional(),
	hasFissureSealing: z.boolean().optional(),
	fissureTeeth: z.union([z.string(), z.array(z.number())]).optional(),
	hasSilvering: z.boolean().optional(),
	silveringTeeth: z.union([z.string(), z.array(z.number())]).optional(),
	customNotes: z.string().optional(),
	memoText: z.string().min(1),
	issuedDateIso: z.string().optional(),
	idempotencyKey: z.string().optional(),
}).strict();

const syncLegalRepresentativeSchema = z.object({
	fullName: z.string().trim().min(1, "ФИО законного представителя обязательно"),
	phone: z.string().trim().optional(),
	role: z.enum(["Мать", "Отец", "Опекун", "Усыновитель", "Родитель"]).default("Родитель"),
	consentSigned: z.boolean().default(true),
	statutoryDocument: z.string().trim().optional(),
	idempotencyKey: z.string().optional(),
}).strict();

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
			const dbDocs = await withTenantCtx(organizationId, async (tx) =>
				tx.select().from(generatedDocuments)
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
					.orderBy(desc(generatedDocuments.createdAt)),
			);

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

		const now = new Date();
		const entropy = randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase();
		const diplomaNumber = `ДИПЛОМ-ГЕРОЙ-${now.getFullYear()}-${entropy}`;
		const issueDateRu = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
		const diplomaId = randomUUID();

		try {
			const responsePayload = await withTenantCtx(organizationId, async (tx) => {
				const [patientRow] = await tx
					.select({
						fullName: patients.fullName,
						birthDate: patients.birthDate,
					})
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
					.limit(1);

				let effectiveAge = parsed.data.patientAgeYears;
				if (effectiveAge === undefined && patientRow?.birthDate) {
					const computed = calculateAge(patientRow.birthDate);
					if (computed > 0 && computed <= 18) {
						effectiveAge = computed;
					}
				}

				const effectivePatientName =
					(parsed.data.patientName && parsed.data.patientName.trim()) ||
					patientRow?.fullName ||
					"Юный пациент";

				const diplomaRecord: BraveryDiplomaRecord = {
					id: diplomaId,
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

				await tx.insert(generatedDocuments).values({
					id: diplomaRecord.id,
					organizationId,
					patientId,
					kind: "bravery_diploma",
					status: "issued",
					title: "Диплом за храбрость",
					payloadJson: JSON.stringify(diplomaRecord),
				});

				return { success: true, diploma: diplomaRecord };
			});

			return reply.code(201).send(responsePayload);
		} catch (error) {
			request.log.error({ error, patientId, diplomaId }, "Failed to persist bravery diploma into PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось сохранить диплом за храбрость в базу данных" });
		}
	});

	app.get<{ Params: { patientId: string } }>("/api/patients/:patientId/pediatric/parent-memo", async (request, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "pediatric parent memo audit");
		if (!organizationId) return;

		const { patientId } = request.params;
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
		}

		try {
			const dbDocs = await withTenantCtx(organizationId, async (tx) =>
				tx.select().from(generatedDocuments)
					.where(
						and(
							eq(generatedDocuments.organizationId, organizationId),
							eq(generatedDocuments.patientId, patientId),
							or(
								eq(generatedDocuments.kind, "parent_memo"),
								eq(generatedDocuments.kind, "post_visit_recommendations"),
								eq(generatedDocuments.title, "Памятка родителям")
							)
						)
					)
					.orderBy(desc(generatedDocuments.createdAt)),
			);

			const mappedFromDb: ParentMemoRecord[] = dbDocs.map((doc) => {
				let payload: Partial<ParentMemoRecord> = {};
				if (doc.payloadJson) {
					try {
						payload = JSON.parse(doc.payloadJson);
					} catch (parseErr) {
						request.log.warn({ parseErr, docId: doc.id }, "Failed to parse parent memo payloadJson");
					}
				}
				return {
					id: doc.id,
					patientId: doc.patientId,
					memoNumber: payload.memoNumber ?? `ПАМЯТКА-РОДИТЕЛЯМ-${doc.id.slice(0, 8).toUpperCase()}`,
					patientName: payload.patientName ?? "Юный пациент",
					...(payload.patientPhone !== undefined ? { patientPhone: payload.patientPhone } : {}),
					...(payload.patientAgeYears !== undefined ? { patientAgeYears: payload.patientAgeYears } : {}),
					doctorName: payload.doctorName ?? "Врач-стоматолог детский",
					clinicName: payload.clinicName ?? "DENTE",
					...(payload.clinicPhone !== undefined ? { clinicPhone: payload.clinicPhone } : {}),
					...(payload.franklRating !== undefined ? { franklRating: payload.franklRating } : {}),
					...(payload.hasAnesthesia !== undefined ? { hasAnesthesia: payload.hasAnesthesia } : {}),
					...(payload.hasPulpotomy !== undefined ? { hasPulpotomy: payload.hasPulpotomy } : {}),
					...(payload.pulpotomyTooth !== undefined ? { pulpotomyTooth: payload.pulpotomyTooth } : {}),
					...(payload.hasFissureSealing !== undefined ? { hasFissureSealing: payload.hasFissureSealing } : {}),
					...(payload.fissureTeeth !== undefined ? { fissureTeeth: payload.fissureTeeth } : {}),
					...(payload.hasSilvering !== undefined ? { hasSilvering: payload.hasSilvering } : {}),
					...(payload.silveringTeeth !== undefined ? { silveringTeeth: payload.silveringTeeth } : {}),
					...(payload.customNotes !== undefined ? { customNotes: payload.customNotes } : {}),
					memoText: payload.memoText ?? "",
					issuedDateIso: payload.issuedDateIso ?? doc.createdAt?.toISOString() ?? new Date().toISOString(),
					issueDateRu: payload.issueDateRu ?? new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
					createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
				};
			});
			return reply.send({ success: true, memos: mappedFromDb });
		} catch (error) {
			request.log.error({ error, patientId }, "Failed to fetch parent memos from PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось получить список памяток родителям" });
		}
	});

	app.post<{ Params: { patientId: string } }>("/api/patients/:patientId/pediatric/parent-memo", async (request, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "issue pediatric parent memo");
		if (!organizationId) return;

		const { patientId } = request.params;
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
		}

		const parsed = issueParentMemoSchema.safeParse(request.body ?? {});
		if (!parsed.success) return reply.code(400).send({ error: "ValidationFailed", issues: parsed.error.issues });

		const now = new Date();
		const entropy = randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase();
		const memoNumber = `ПАМЯТКА-РОДИТЕЛЯМ-${now.getFullYear()}-${entropy}`;
		const issueDateRu = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
		const memoId = randomUUID();

		try {
			const responsePayload = await withTenantCtx(organizationId, async (tx) => {
				const [patientRow] = await tx
					.select({
						fullName: patients.fullName,
						birthDate: patients.birthDate,
						phone: patients.phone,
					})
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
					.limit(1);

				let effectiveAge = parsed.data.patientAgeYears;
				if (effectiveAge === undefined && patientRow?.birthDate) {
					const computed = calculateAge(patientRow.birthDate);
					if (computed > 0 && computed <= 18) {
						effectiveAge = computed;
					}
				}

				const effectivePatientName =
					(parsed.data.patientName && parsed.data.patientName.trim()) ||
					patientRow?.fullName ||
					"Юный пациент";

				const effectivePatientPhone =
					(parsed.data.patientPhone && parsed.data.patientPhone.trim()) ||
					patientRow?.phone ||
					undefined;

				const memoRecord: ParentMemoRecord = {
					id: memoId,
					patientId,
					memoNumber,
					patientName: effectivePatientName,
					...(effectivePatientPhone !== undefined ? { patientPhone: effectivePatientPhone } : {}),
					...(effectiveAge !== undefined ? { patientAgeYears: effectiveAge } : {}),
					doctorName: parsed.data.doctorName,
					clinicName: parsed.data.clinicName,
					...(parsed.data.clinicPhone !== undefined ? { clinicPhone: parsed.data.clinicPhone } : {}),
					...(parsed.data.franklRating !== undefined ? { franklRating: parsed.data.franklRating } : {}),
					...(parsed.data.hasAnesthesia !== undefined ? { hasAnesthesia: parsed.data.hasAnesthesia } : {}),
					...(parsed.data.hasPulpotomy !== undefined ? { hasPulpotomy: parsed.data.hasPulpotomy } : {}),
					...(parsed.data.pulpotomyTooth !== undefined ? { pulpotomyTooth: parsed.data.pulpotomyTooth } : {}),
					...(parsed.data.hasFissureSealing !== undefined ? { hasFissureSealing: parsed.data.hasFissureSealing } : {}),
					...(parsed.data.fissureTeeth !== undefined ? { fissureTeeth: Array.isArray(parsed.data.fissureTeeth) ? parsed.data.fissureTeeth.join(", ") : parsed.data.fissureTeeth } : {}),
					...(parsed.data.hasSilvering !== undefined ? { hasSilvering: parsed.data.hasSilvering } : {}),
					...(parsed.data.silveringTeeth !== undefined ? { silveringTeeth: Array.isArray(parsed.data.silveringTeeth) ? parsed.data.silveringTeeth.join(", ") : parsed.data.silveringTeeth } : {}),
					...(parsed.data.customNotes !== undefined ? { customNotes: parsed.data.customNotes } : {}),
					memoText: parsed.data.memoText,
					issuedDateIso: parsed.data.issuedDateIso ?? now.toISOString(),
					issueDateRu,
					createdAt: now.toISOString(),
				};

				await tx.insert(generatedDocuments).values({
					id: memoRecord.id,
					organizationId,
					patientId,
					kind: "parent_memo",
					status: "issued",
					title: "Памятка родителям",
					payloadJson: JSON.stringify(memoRecord),
				});

				return { success: true, memo: memoRecord };
			});

			return reply.code(201).send(responsePayload);
		} catch (error) {
			request.log.error({ error, patientId, memoId }, "Failed to persist parent memo into PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось сохранить памятку родителям в базу данных" });
		}
	});

	app.get<{ Params: { patientId: string } }>("/api/patients/:patientId/pediatric/legal-representative", async (request, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "get pediatric legal representative");
		if (!organizationId) return;

		const { patientId } = request.params;
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
		}

		try {
			const representative = await withTenantCtx(organizationId, async (tx) => {
				const rels = await tx
					.select({
						id: patientRelationships.id,
						patientId: patientRelationships.patientId,
						relatedPatientId: patientRelationships.relatedPatientId,
						relationshipType: patientRelationships.relationshipType,
						isLegalRepresentative: patientRelationships.isLegalRepresentative,
						canSignConsents: patientRelationships.canSignConsents,
						canViewMedicalRecord: patientRelationships.canViewMedicalRecord,
						canSpendFamilyWallet: patientRelationships.canSpendFamilyWallet,
						documentProofNumber: patientRelationships.documentProofNumber,
						notes: patientRelationships.notes,
						createdAt: patientRelationships.createdAt,
						updatedAt: patientRelationships.updatedAt,
					})
					.from(patientRelationships)
					.where(
						and(
							eq(patientRelationships.organizationId, organizationId),
							eq(patientRelationships.patientId, patientId),
							eq(patientRelationships.isLegalRepresentative, true)
						)
					)
					.limit(1);

				if (rels.length === 0 || !rels[0]) {
					return null;
				}

				const rel = rels[0];
				let repFullName = "Законный представитель";
				let repPhone: string | undefined = undefined;

				const [repPatient] = await tx
					.select({
						fullName: patients.fullName,
						phone: patients.phone,
					})
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.id, rel.relatedPatientId)))
					.limit(1);

				if (repPatient) {
					repFullName = repPatient.fullName;
					repPhone = repPatient.phone ?? undefined;
				}

				let roleRu: "Мать" | "Отец" | "Опекун" | "Усыновитель" | "Родитель" = "Родитель";
				if (rel.relationshipType === "mother" || rel.relationshipType === "Мать") roleRu = "Мать";
				else if (rel.relationshipType === "father" || rel.relationshipType === "Отец") roleRu = "Отец";
				else if (rel.relationshipType === "guardian" || rel.relationshipType === "Опекун") roleRu = "Опекун";
				else if (rel.relationshipType === "adopter" || rel.relationshipType === "Усыновитель") roleRu = "Усыновитель";

				return {
					id: rel.id,
					patientId: rel.patientId,
					relatedPatientId: rel.relatedPatientId,
					fullName: repFullName,
					...(repPhone !== undefined ? { phone: repPhone } : {}),
					role: roleRu,
					consentSigned: rel.canSignConsents,
					...(rel.documentProofNumber ? { statutoryDocument: rel.documentProofNumber } : {}),
					...(rel.notes ? { notes: rel.notes } : {}),
				};
			});

			return reply.send({ success: true, representative });
		} catch (error) {
			request.log.error({ error, patientId }, "Failed to fetch legal representative from PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось получить законного представителя" });
		}
	});

	app.post<{ Params: { patientId: string } }>("/api/patients/:patientId/pediatric/legal-representative", async (request, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "sync pediatric legal representative");
		if (!organizationId) return;

		const { patientId } = request.params;
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в клинике" });
		}

		const parsed = syncLegalRepresentativeSchema.safeParse(request.body ?? {});
		if (!parsed.success) return reply.code(400).send({ error: "ValidationFailed", issues: parsed.error.issues });

		const roleToDbKind: Record<string, string> = {
			"Мать": "mother",
			"Отец": "father",
			"Опекун": "guardian",
			"Усыновитель": "guardian",
			"Родитель": "parent",
		};
		const relationshipType = roleToDbKind[parsed.data.role] ?? "parent";
		const statutoryDocument =
			parsed.data.statutoryDocument ||
			(parsed.data.role === "Опекун"
				? "Распоряжение органа опеки и попечительства"
				: "Законный представитель (родитель / опекун)");

		try {
			let responsePayload: Record<string, unknown> | null = null;
			await withTenantCtx(organizationId, async (tx) => {
				const existingRels = await tx
					.select()
					.from(patientRelationships)
					.where(
						and(
							eq(patientRelationships.organizationId, organizationId),
							eq(patientRelationships.patientId, patientId),
							eq(patientRelationships.isLegalRepresentative, true)
						)
					)
					.limit(1);

				let relatedPatientId: string;
				let relationshipId: string;

				if (existingRels.length > 0 && existingRels[0]) {
					const existingRel = existingRels[0];
					relatedPatientId = existingRel.relatedPatientId;
					relationshipId = existingRel.id;

					await tx
						.update(patients)
						.set({
							fullName: parsed.data.fullName,
							...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
							updatedAt: new Date(),
						})
						.where(and(eq(patients.organizationId, organizationId), eq(patients.id, relatedPatientId)));

					await tx
						.update(patientRelationships)
						.set({
							relationshipType,
							isLegalRepresentative: true,
							canSignConsents: parsed.data.consentSigned,
							canViewMedicalRecord: true,
							canViewRecords: true,
							canSpendFamilyWallet: true,
							isPrimaryPayer: true,
							documentProofNumber: statutoryDocument,
							notes: `Законный представитель: ${parsed.data.fullName} (${parsed.data.role}), тел: ${parsed.data.phone ?? "не указан"}`,
							updatedAt: new Date(),
						})
						.where(and(eq(patientRelationships.organizationId, organizationId), eq(patientRelationships.id, relationshipId)));
				} else {
					let matchedPatientId: string | null = null;
					if (parsed.data.phone && parsed.data.phone.trim().length > 5) {
						const [foundByPhone] = await tx
							.select({ id: patients.id })
							.from(patients)
							.where(
								and(
									eq(patients.organizationId, organizationId),
									eq(patients.phone, parsed.data.phone.trim())
								)
							)
							.limit(1);

						if (foundByPhone && foundByPhone.id !== patientId) {
							matchedPatientId = foundByPhone.id;
						}
					}

					if (matchedPatientId) {
						relatedPatientId = matchedPatientId;
						await tx
							.update(patients)
							.set({
								fullName: parsed.data.fullName,
								updatedAt: new Date(),
							})
							.where(and(eq(patients.organizationId, organizationId), eq(patients.id, relatedPatientId)));
					} else {
						const [createdPatient] = await tx
							.insert(patients)
							.values({
								organizationId,
								fullName: parsed.data.fullName,
								phone: parsed.data.phone ?? null,
								status: "active",
								notes: `Законный представитель ребенка (${parsed.data.role})`,
							})
							.returning();
						if (!createdPatient) throw new Error("Failed to insert representative patient");
						relatedPatientId = createdPatient.id;
					}

					const [newRel] = await tx
						.insert(patientRelationships)
						.values({
							organizationId,
							patientId,
							relatedPatientId,
							relationshipType,
							isLegalRepresentative: true,
							canSignConsents: parsed.data.consentSigned,
							canViewMedicalRecord: true,
							canViewRecords: true,
							canSpendFamilyWallet: true,
							isPrimaryPayer: true,
							documentProofNumber: statutoryDocument,
							notes: `Законный представитель: ${parsed.data.fullName} (${parsed.data.role}), тел: ${parsed.data.phone ?? "не указан"}`,
						})
						.returning();
					if (!newRel) throw new Error("Failed to insert patient relationship");
					relationshipId = newRel.id;
				}

				const representativeResult = {
					id: relationshipId,
					patientId,
					relatedPatientId,
					fullName: parsed.data.fullName,
					phone: parsed.data.phone ?? undefined,
					role: parsed.data.role,
					relationshipType,
					consentSigned: parsed.data.consentSigned,
					statutoryDocument,
					isLegalRepresentative: true,
				};

				responsePayload = { success: true, representative: representativeResult };
			});

			return reply.code(200).send(responsePayload);
		} catch (error) {
			request.log.error({ error, patientId }, "Failed to sync legal representative into PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось сохранить законного представителя в базу данных" });
		}
	});
}
