/**
 * patientRelationships.ts — Patient-to-Patient Family Relationships & Shared Payer API Routes.
 *
 * Implements endpoints:
 * - GET /api/v1/patients/:id/relationships
 * - POST /api/v1/patients/:id/relationships
 * - DELETE /api/v1/patients/:id/relationships/:relationId
 */

import {
	createRelationshipInputSchema,
	PATIENT_INVERSE_RELATIONSHIP_TYPE,
	PATIENT_RELATIONSHIP_LABELS_RU,
	type PatientRelationshipType,
	validateRelationshipLink,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { patientRelationships, patients } from "../db/schema.js";

const patientIdParamsSchema = z.object({
	id: z.string().uuid("Некорректный UUID пациента"),
});

const relationDeleteParamsSchema = z.object({
	id: z.string().uuid("Некорректный UUID пациента"),
	relationId: z.string().uuid("Некорректный UUID связи"),
});

export async function registerPatientRelationshipsRoutes(app: FastifyInstance) {
	/**
	 * GET /api/v1/patients/:id/relationships
	 * Returns full family relationship tree for a patient, resolving both direct and inverse links.
	 */
	app.get(
		"/api/v1/patients/:id/relationships",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
			);
			if (!organizationId) return;

			const paramsParsed = patientIdParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "Bad Request",
					message: "Некорректный ID пациента",
				});
			}

			const patientId = paramsParsed.data.id;

			// Verify subject patient exists
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

			// Gather all counter-party IDs
			const otherPatientIds = new Set<string>();
			for (const r of rows) {
				const counterId =
					r.patientId === patientId ? r.relatedPatientId : r.patientId;
				otherPatientIds.add(counterId);
			}

			const otherPatients = await db
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
							...Array.from(otherPatientIds).map((oid) =>
								eq(patients.id, oid),
							),
						),
					),
				);

			const patientMap = new Map(otherPatients.map((p) => [p.id, p]));
			const now = new Date();

			const results = rows.map((r) => {
				const isDirect = r.patientId === patientId;
				const counterId = isDirect ? r.relatedPatientId : r.patientId;
				const counterPatient = patientMap.get(counterId);

				const rawType = r.relationshipType as PatientRelationshipType;
				const effectiveType: PatientRelationshipType = isDirect
					? rawType
					: (PATIENT_INVERSE_RELATIONSHIP_TYPE[rawType] || "other");

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
					relationshipLabelRu:
						PATIENT_RELATIONSHIP_LABELS_RU[effectiveType] || "Родственник",
					isPrimaryPayer: isDirect ? r.isPrimaryPayer : false,
					canViewRecords: r.canViewRecords,
					canSignConsents: isDirect ? r.canSignConsents : false,
					notes: r.notes ?? null,
					isInverse: !isDirect,
					createdAt: r.createdAt.toISOString(),
				};
			});

			return reply.code(200).send({
				patientId,
				patientFullName: subjectPatient.fullName,
				count: results.length,
				relationships: results,
			});
		},
	);

	/**
	 * POST /api/v1/patients/:id/relationships
	 * Creates a new family relationship link between patient :id and relatedPatientId.
	 */
	app.post(
		"/api/v1/patients/:id/relationships",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
			);
			if (!organizationId) return;

			const paramsParsed = patientIdParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "Bad Request",
					message: "Некорректный ID пациента",
				});
			}

			const bodyParsed = createRelationshipInputSchema.safeParse(request.body);
			if (!bodyParsed.success) {
				return reply.code(400).send({
					error: "Validation Error",
					message: "Некорректные параметры создания связи",
					details: bodyParsed.error.issues,
				});
			}

			const patientId = paramsParsed.data.id;
			const {
				relatedPatientId,
				relationshipType,
				isPrimaryPayer,
				canViewRecords,
				canSignConsents,
				notes,
			} = bodyParsed.data;

			if (patientId === relatedPatientId) {
				return reply.code(400).send({
					error: "Bad Request",
					message: "Пациент не может быть связан сам с собой",
				});
			}

			// Verify both patients exist in this organization
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

			// Query existing relations for cycle & duplicate validation
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
				relationshipType,
			);

			if (!validation.isValid) {
				return reply.code(409).send({
					error: "Conflict",
					message: validation.error,
				});
			}

			// Insert relationship
			const [created] = await db
				.insert(patientRelationships)
				.values({
					organizationId,
					patientId,
					relatedPatientId,
					relationshipType,
					isPrimaryPayer,
					canViewRecords,
					canSignConsents,
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
					relationshipLabelRu:
						PATIENT_RELATIONSHIP_LABELS_RU[
							created.relationshipType as PatientRelationshipType
						] || "Родственник",
					isPrimaryPayer: created.isPrimaryPayer,
					canViewRecords: created.canViewRecords,
					canSignConsents: created.canSignConsents,
					notes: created.notes,
					createdAt: created.createdAt.toISOString(),
				},
			});
		},
	);

	/**
	 * DELETE /api/v1/patients/:id/relationships/:relationId
	 * Removes an existing relationship link.
	 */
	app.delete(
		"/api/v1/patients/:id/relationships/:relationId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
			);
			if (!organizationId) return;

			const paramsParsed = relationDeleteParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "Bad Request",
					message: "Некорректный ID пациента или связи",
				});
			}

			const { id: patientId, relationId } = paramsParsed.data;

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
		},
	);
}
