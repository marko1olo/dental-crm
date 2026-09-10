/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT RELATIONSHIPS, RF LEGAL GUARDIANSHIP & FAMILY WALLET API ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements endpoints:
 * - GET    /api/patients/:patientId/relationships (and /api/v1/patients/:id/relationships)
 * - POST   /api/patients/:patientId/relationships (and /api/v1/patients/:id/relationships)
 * - PATCH  /api/patients/:patientId/relationships/:id (and /api/v1/patients/:id/relationships/:relationId)
 * - DELETE /api/patients/:patientId/relationships/:id (and /api/v1/patients/:id/relationships/:relationId)
 *
 * Implements:
 * - Dynamic mutual inversion:
 *   when querying for P, if P == related_patient_id:
 *   'parent' <-> 'child', 'guardian' <-> 'ward', 'trustee' -> 'ward', 'spouse' <-> 'spouse'
 * - RF Legal representative fields (Art. 64 Family Code RF, FZ-323, Art. 185 Civil Code RF):
 *   is_legal_representative, can_view_medical_record, can_sign_consents, can_spend_family_wallet, document_proof_number
 * - Duplicate guard & self-linking ban (patient_id != related_patient_id)
 */

import {
	createPatientRelationshipDtoSchema,
	getRelationshipKindLabelRu,
	invertRelationshipKind,
	patchPatientRelationshipDtoSchema,
	type PatientRelationshipKind,
	validateRelationshipLink,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { patientRelationships, patients } from "../db/schema.js";

const patientRouteParamsSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").optional(),
	id: z.string().uuid("Некорректный UUID пациента").optional(),
});

const relationRouteParamsSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").optional(),
	id: z.string().uuid("Некорректный UUID связи или пациента").optional(),
	relationId: z.string().uuid("Некорректный UUID связи").optional(),
});

function resolvePatientId(params: {
	patientId?: string | undefined;
	id?: string | undefined;
}): string | null {
	return params.patientId ?? params.id ?? null;
}

function resolveRelationId(params: {
	id?: string | undefined;
	relationId?: string | undefined;
}): string | null {
	return params.relationId ?? params.id ?? null;
}

export async function registerPatientRelationshipsRoutes(app: FastifyInstance) {
	/**
	 * Handler: GET relationships with dynamic mutual inversion & legal rights
	 */
	const getRelationshipsHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const paramsParsed = patientRouteParamsSchema.safeParse(request.params);
		const patientId = paramsParsed.success
			? resolvePatientId(paramsParsed.data)
			: null;

		if (!patientId) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "Некорректный ID пациента",
			});
		}

		// Verify subject patient exists in organization
		const [subjectPatient] = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				birthDate: patients.birthDate,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.id, patientId),
				),
			)
			.limit(1);

		if (!subjectPatient) {
			return reply.code(404).send({
				error: "Not Found",
				message: `Пациент с ID ${patientId} не найден`,
			});
		}

		// Query all relations where patient is either side
		const rows = await db
			.select()
			.from(patientRelationships)
			.where(
				and(
					eq(patientRelationships.organizationId, organizationId),
					or(
						eq(patientRelationships.patientId, patientId),
						eq(patientRelationships.relatedPatientId, patientId),
					),
				),
			);

		if (rows.length === 0) {
			return reply.code(200).send({
				patientId,
				patientFullName: subjectPatient.fullName,
				count: 0,
				relationships: [],
			});
		}

		// Collect counterparty IDs
		const counterPartyIds = new Set<string>();
		for (const r of rows) {
			const counterId =
				r.patientId === patientId ? r.relatedPatientId : r.patientId;
			counterPartyIds.add(counterId);
		}

		const counterPatients = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				status: patients.status,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					or(
						...Array.from(counterPartyIds).map((cid) => eq(patients.id, cid)),
					),
				),
			);

		const patientMap = new Map(counterPatients.map((p) => [p.id, p]));
		const now = new Date();

		const results = rows.map((r) => {
			const isDirect = r.patientId === patientId;
			const counterId = isDirect ? r.relatedPatientId : r.patientId;
			const counterPatient = patientMap.get(counterId);

			const rawType = r.relationshipType as PatientRelationshipKind;
			const effectiveType: PatientRelationshipKind = isDirect
				? rawType
				: invertRelationshipKind(rawType);

			let isMinor = false;
			if (counterPatient?.birthDate) {
				const bDate = new Date(counterPatient.birthDate);
				if (!Number.isNaN(bDate.getTime())) {
					const ageYears =
						(now.getTime() - bDate.getTime()) /
						(365.25 * 24 * 60 * 60 * 1000);
					isMinor = ageYears < 18;
				}
			}

			return {
				id: r.id,
				patientId,
				relatedPatientId: counterId,
				relatedPatientName: counterPatient?.fullName || "—",
				relatedPatientPhone: counterPatient?.phone ?? null,
				relatedPatientBirthDate: counterPatient?.birthDate ?? null,
				isMinor,
				relationshipType: effectiveType,
				relationshipLabelRu: getRelationshipKindLabelRu(
					effectiveType,
					isDirect ? "direct" : "inverse",
				),
				originalRelationshipType: rawType,
				isInverse: !isDirect,
				isLegalRepresentative: r.isLegalRepresentative,
				canViewMedicalRecord: r.canViewMedicalRecord || r.canViewRecords,
				canSignConsents: r.canSignConsents,
				canSpendFamilyWallet: r.canSpendFamilyWallet || r.isPrimaryPayer,
				documentProofNumber: r.documentProofNumber ?? null,
				isPrimaryPayer: r.isPrimaryPayer || r.canSpendFamilyWallet,
				canViewRecords: r.canViewRecords || r.canViewMedicalRecord,
				notes: r.notes ?? null,
				createdAt: r.createdAt.toISOString(),
				updatedAt: r.updatedAt.toISOString(),
			};
		});

		return reply.code(200).send({
			patientId,
			patientFullName: subjectPatient.fullName,
			count: results.length,
			relationships: results,
		});
	};

	/**
	 * Handler: POST create relationship
	 */
	const postRelationshipHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const paramsParsed = patientRouteParamsSchema.safeParse(request.params);
		const patientId = paramsParsed.success
			? resolvePatientId(paramsParsed.data)
			: null;

		if (!patientId) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "Некорректный ID пациента",
			});
		}

		const bodyParsed = createPatientRelationshipDtoSchema.safeParse(
			request.body,
		);
		if (!bodyParsed.success) {
			return reply.code(400).send({
				error: "Validation Error",
				message: "Некорректные параметры создания связи",
				details: bodyParsed.error.issues,
			});
		}

		const {
			relatedPatientId,
			relationshipType,
			isLegalRepresentative,
			canViewMedicalRecord,
			canSignConsents,
			canSpendFamilyWallet,
			documentProofNumber,
			notes,
		} = bodyParsed.data;

		if (patientId === relatedPatientId) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "Пациент не может быть связан сам с собой",
			});
		}

		// Verify both patients belong to this organization
		const existingPatients = await db
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					or(eq(patients.id, patientId), eq(patients.id, relatedPatientId)),
				),
			);

		if (existingPatients.length < 2) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "Один или оба пациента не найдены в базе данных клиники",
			});
		}

		// Check for existing relationship edge between this pair
		const existingLinks = await db
			.select({
				patientId: patientRelationships.patientId,
				relatedPatientId: patientRelationships.relatedPatientId,
				relationshipType: patientRelationships.relationshipType,
			})
			.from(patientRelationships)
			.where(eq(patientRelationships.organizationId, organizationId));

		const validation = validateRelationshipLink(
			patientId,
			relatedPatientId,
			existingLinks as any,
			relationshipType as any,
		);

		if (!validation.isValid) {
			return reply.code(409).send({
				error: "Conflict",
				message: validation.error,
			});
		}

		// Insert into database
		const [created] = await db
			.insert(patientRelationships)
			.values({
				organizationId,
				patientId,
				relatedPatientId,
				relationshipType,
				isLegalRepresentative: isLegalRepresentative ?? false,
				canViewMedicalRecord: canViewMedicalRecord ?? false,
				canSignConsents: canSignConsents ?? false,
				canSpendFamilyWallet: canSpendFamilyWallet ?? false,
				documentProofNumber: documentProofNumber ?? null,
				isPrimaryPayer: canSpendFamilyWallet ?? false,
				canViewRecords: canViewMedicalRecord ?? false,
				notes: notes ?? null,
			})
			.returning();

		if (!created) {
			return reply.code(500).send({
				error: "Internal Server Error",
				message: "Не удалось сохранить связь родственников",
			});
		}

		const relatedPatient = existingPatients.find(
			(p) => p.id === relatedPatientId,
		);

		return reply.code(201).send({
			success: true,
			relationship: {
				id: created.id,
				patientId: created.patientId,
				relatedPatientId: created.relatedPatientId,
				relatedPatientName: relatedPatient?.fullName || "—",
				relationshipType: created.relationshipType,
				relationshipLabelRu: getRelationshipKindLabelRu(
					created.relationshipType as PatientRelationshipKind,
					"direct",
				),
				originalRelationshipType: created.relationshipType,
				isInverse: false,
				isLegalRepresentative: created.isLegalRepresentative,
				canViewMedicalRecord: created.canViewMedicalRecord,
				canSignConsents: created.canSignConsents,
				canSpendFamilyWallet: created.canSpendFamilyWallet,
				documentProofNumber: created.documentProofNumber,
				isPrimaryPayer: created.isPrimaryPayer,
				canViewRecords: created.canViewRecords,
				notes: created.notes,
				createdAt: created.createdAt.toISOString(),
				updatedAt: created.updatedAt.toISOString(),
			},
		});
	};

	/**
	 * Handler: PATCH update relationship rights
	 */
	const patchRelationshipHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const paramsParsed = relationRouteParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "Некорректный ID пациента или связи",
			});
		}

		const patientId = resolvePatientId(paramsParsed.data);
		const relationId = resolveRelationId(paramsParsed.data);

		if (!patientId || !relationId) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "ID пациента и ID связи обязательны",
			});
		}

		const bodyParsed = patchPatientRelationshipDtoSchema.safeParse(
			request.body,
		);
		if (!bodyParsed.success) {
			return reply.code(400).send({
				error: "Validation Error",
				message: "Некорректные параметры обновления связи",
				details: bodyParsed.error.issues,
			});
		}

		const [existing] = await db
			.select()
			.from(patientRelationships)
			.where(
				and(
					eq(patientRelationships.organizationId, organizationId),
					eq(patientRelationships.id, relationId),
					or(
						eq(patientRelationships.patientId, patientId),
						eq(patientRelationships.relatedPatientId, patientId),
					),
				),
			)
			.limit(1);

		if (!existing) {
			return reply.code(404).send({
				error: "Not Found",
				message: "Связь родства не найдена",
			});
		}

		const updates = bodyParsed.data;
		const updatePayload: Partial<typeof patientRelationships.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (updates.relationshipType !== undefined) {
			updatePayload.relationshipType = updates.relationshipType;
		}
		if (updates.isLegalRepresentative !== undefined) {
			updatePayload.isLegalRepresentative = updates.isLegalRepresentative;
		}
		if (updates.canViewMedicalRecord !== undefined) {
			updatePayload.canViewMedicalRecord = updates.canViewMedicalRecord;
			updatePayload.canViewRecords = updates.canViewMedicalRecord;
		}
		if (updates.canSignConsents !== undefined) {
			updatePayload.canSignConsents = updates.canSignConsents;
		}
		if (updates.canSpendFamilyWallet !== undefined) {
			updatePayload.canSpendFamilyWallet = updates.canSpendFamilyWallet;
			updatePayload.isPrimaryPayer = updates.canSpendFamilyWallet;
		}
		if (updates.documentProofNumber !== undefined) {
			updatePayload.documentProofNumber = updates.documentProofNumber;
		}
		if (updates.notes !== undefined) {
			updatePayload.notes = updates.notes;
		}

		const [updated] = await db
			.update(patientRelationships)
			.set(updatePayload)
			.where(
				and(
					eq(patientRelationships.organizationId, organizationId),
					eq(patientRelationships.id, relationId),
				),
			)
			.returning();

		if (!updated) {
			return reply.code(500).send({
				error: "Internal Server Error",
				message: "Не удалось обновить связь родственников",
			});
		}

		return reply.code(200).send({
			success: true,
			relationship: {
				id: updated.id,
				patientId: updated.patientId,
				relatedPatientId: updated.relatedPatientId,
				relationshipType: updated.relationshipType,
				isLegalRepresentative: updated.isLegalRepresentative,
				canViewMedicalRecord: updated.canViewMedicalRecord,
				canSignConsents: updated.canSignConsents,
				canSpendFamilyWallet: updated.canSpendFamilyWallet,
				documentProofNumber: updated.documentProofNumber,
				isPrimaryPayer: updated.isPrimaryPayer,
				canViewRecords: updated.canViewRecords,
				notes: updated.notes,
				updatedAt: updated.updatedAt.toISOString(),
			},
		});
	};

	/**
	 * Handler: DELETE relationship
	 */
	const deleteRelationshipHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const organizationId = await requireResolvedOrganizationId(request, reply);
		if (!organizationId) return;

		const paramsParsed = relationRouteParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "Некорректный ID пациента или связи",
			});
		}

		const patientId = resolvePatientId(paramsParsed.data);
		const relationId = resolveRelationId(paramsParsed.data);

		if (!patientId || !relationId) {
			return reply.code(400).send({
				error: "Bad Request",
				message: "Некорректный ID пациента или связи",
			});
		}

		const [existing] = await db
			.select()
			.from(patientRelationships)
			.where(
				and(
					eq(patientRelationships.organizationId, organizationId),
					eq(patientRelationships.id, relationId),
					or(
						eq(patientRelationships.patientId, patientId),
						eq(patientRelationships.relatedPatientId, patientId),
					),
				),
			)
			.limit(1);

		if (!existing) {
			return reply.code(404).send({
				error: "Not Found",
				message: "Связь родства не найдена",
			});
		}

		await db
			.delete(patientRelationships)
			.where(
				and(
					eq(patientRelationships.organizationId, organizationId),
					eq(patientRelationships.id, relationId),
				),
			);

		return reply.code(200).send({
			success: true,
			deletedRelationId: relationId,
		});
	};

	// ─── Route Registrations (both canonical /api and backward-compatible /api/v1) ───

	// GET
	app.get("/api/patients/:patientId/relationships", getRelationshipsHandler);
	app.get("/api/v1/patients/:id/relationships", getRelationshipsHandler);

	// POST
	app.post("/api/patients/:patientId/relationships", postRelationshipHandler);
	app.post("/api/v1/patients/:id/relationships", postRelationshipHandler);

	// PATCH
	app.patch(
		"/api/patients/:patientId/relationships/:id",
		patchRelationshipHandler,
	);
	app.patch(
		"/api/v1/patients/:id/relationships/:relationId",
		patchRelationshipHandler,
	);

	// DELETE
	app.delete(
		"/api/patients/:patientId/relationships/:id",
		deleteRelationshipHandler,
	);
	app.delete(
		"/api/v1/patients/:id/relationships/:relationId",
		deleteRelationshipHandler,
	);
}
