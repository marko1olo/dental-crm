import {
	DentalInteractionMatrixEngine,
	checkInteractionsRequestSchema,
	createPrescription107RequestSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { extractIdempotencyKey, isValidUuid } from "../utils/httpIdempotency.js";
import { defineStreamRoute } from "../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../db/rls.js";
import {
	electronicPrescriptionItems,
	electronicPrescriptions,
	patientDrugAllergies,
	patients,
	users,
} from "../db/schema.js";

export async function registerPharmacologyRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/pharmacology/check-interactions
	 * Real-time clinical checking of prescribed dental drugs against
	 * patient allergies, chronic medications, and local anesthetics/vasoconstrictors.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pharmacology/check-interactions",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return reply;

			const parsed = checkInteractionsRequestSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "PharmacologyValidationError",
					message: "Некорректные параметры для проверки взаимодействий.",
					details: parsed.error.format(),
				});
			}
			const input = parsed.data;

			const allergies = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(patientDrugAllergies)
					.where(
						and(
							eq(patientDrugAllergies.organizationId, orgId),
							eq(patientDrugAllergies.patientId, input.patientId),
						),
					),
			);

			const result = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
				input,
				allergies.map((a) => ({
					allergenGroup: a.allergenGroup,
					reactionSeverity: a.reactionSeverity,
					hasSamterTriad: a.hasSamterTriad,
				})),
			);

			return reply.send({
				success: true,
				audit: result,
			});
		},
	});

	/**
	 * 2. POST /api/pharmacology/prescriptions
	 * Create official Form 107-1/u prescription under Order 1094n
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pharmacology/prescriptions",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"create prescription",
			);
			if (!orgId) return reply;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "InvalidIdempotencyKey",
					message: "Некорректный заголовок Idempotency-Key (ожидается UUID)",
				});
			}

			const parsed = z
				.object({
					patientId: z.string().uuid(),
					visitId: z.string().uuid().optional(),
					prescribingDoctorId: z.string().uuid(),
					validityPeriod: z
						.enum(["days_15", "days_30", "days_60", "year_1"])
						.default("days_60"),
					isSpecialChronicIndication: z.boolean().default(false),
					chronicDispenseFrequencyNotes: z.string().optional(),
					clinicalDiagnosisMkb10: z.string().optional(),
					clinicalDiagnosisDescription: z.string().optional(),
					items: z
						.array(
							z.object({
								catalogDrugId: z.string().uuid().optional(),
								innLatin: z.string().min(2),
								dosageFormLatin: z.string().min(2),
								dosageDoseConcentration: z.string().min(1),
								dispenseInstructionLatin: z.string().min(2),
								signatureDirectionRussian: z.string().min(5),
								quantityPackages: z.number().int().min(1).default(1),
								durationDays: z.number().int().min(1).default(7),
								frequencyTimesPerDay: z.number().int().min(1).default(3),
								mealRelation: z
									.enum(["before_meal", "with_meal", "after_meal", "independent"])
									.default("after_meal"),
							}),
						)
						.min(1)
						.max(3),
					currentMedications: z.array(z.string()).default([]),
				})
				.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					error: "PrescriptionValidationError",
					message: "Некорректные реквизиты рецепта (Форма № 107-1/у).",
					details: parsed.error.format(),
				});
			}
			const input = parsed.data;

			const precheck = await withTenantReadCtx(orgId, async (tx) => {
				const [patient] = await tx
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.id, input.patientId),
							eq(patients.organizationId, orgId),
						),
					)
					.limit(1);

				if (!patient) {
					return { status: "patient_not_found" as const };
				}

				const [doctor] = await tx
					.select()
					.from(users)
					.where(
						and(
							eq(users.id, input.prescribingDoctorId),
							eq(users.organizationId, orgId),
						),
					)
					.limit(1);

				if (!doctor) {
					return { status: "doctor_not_found" as const };
				}

				const allergies = await tx
					.select()
					.from(patientDrugAllergies)
					.where(
						and(
							eq(patientDrugAllergies.organizationId, orgId),
							eq(patientDrugAllergies.patientId, input.patientId),
						),
					);

				return { status: "ok" as const, patient, doctor, allergies };
			});

			if (precheck.status === "patient_not_found") {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден.",
				});
			}

			if (precheck.status === "doctor_not_found") {
				return reply.code(404).send({
					error: "DoctorNotFound",
					message: "Врач не найден.",
				});
			}

			const { patient, doctor, allergies } = precheck;

			let patientAgeYears = 35;
			if (patient.birthDate) {
				const bDate = new Date(patient.birthDate);
				if (!Number.isNaN(bDate.getTime())) {
					const ageDiffMs = Date.now() - bDate.getTime();
					patientAgeYears = Math.max(
						0,
						Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000)),
					);
				}
			}

			const safetyAudit = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
				{
					patientId: input.patientId,
					prescribedInnList: input.items.map((i) => i.innLatin),
					currentMedications: input.currentMedications,
					chronicDiseases: [],
					vasoconstrictorPlanned: "1:200000",
					patientAgeYears,
					isPregnant: false,
					isLactating: false,
				},
				allergies.map((a) => ({
					allergenGroup: a.allergenGroup,
					reactionSeverity: a.reactionSeverity,
					hasSamterTriad: a.hasSamterTriad,
				})),
			);

			const prescriptionNumber = `RX-107-${Date.now().toString().slice(-6)}`;
			const now = new Date();
			const validityDays =
				input.validityPeriod === "days_15"
					? 15
					: input.validityPeriod === "days_30"
						? 30
						: input.validityPeriod === "year_1"
							? 365
							: 60;
			const expiresAt = new Date(now.getTime() + validityDays * 86400000);

			const result = await withTenantWriteCtx(orgId, async (tx) => {
				const [presc] = await tx
					.insert(electronicPrescriptions)
					.values({
						organizationId: orgId,
						patientId: input.patientId,
						visitId: input.visitId,
						prescribingDoctorId: input.prescribingDoctorId,
						prescriptionSeries: "107-1У",
						prescriptionNumber,
						formType: "form_107_1_u",
						status: "issued",
						validityPeriod: input.validityPeriod,
						isSpecialChronicIndication: input.isSpecialChronicIndication,
						chronicDispenseFrequencyNotes: input.chronicDispenseFrequencyNotes,
						patientFullName: patient.fullName,
						patientBirthDate: patient.birthDate || "1990-01-01",
						patientCardNumber: `CARD-${patient.id.slice(-6).toUpperCase()}`,
						doctorFullName: doctor.fullName,
						clinicalDiagnosisMkb10: input.clinicalDiagnosisMkb10,
						clinicalDiagnosisDescription: input.clinicalDiagnosisDescription,
						safetyAuditPassed: true,
						safetyAuditSnapshotJson: safetyAudit,
						issuedAt: now,
						expiresAt,
					})
					.returning();

				if (!presc) {
					throw new Error("Не удалось создать электронный рецепт");
				}

				if (input.items.length > 0) {
					await tx.insert(electronicPrescriptionItems).values(
						input.items.map((item, idx) => ({
							organizationId: orgId,
							prescriptionId: presc.id,
							catalogDrugId: item.catalogDrugId,
							itemIndex: idx + 1,
							innLatin: item.innLatin,
							dosageFormLatin: item.dosageFormLatin,
							dosageDoseConcentration: item.dosageDoseConcentration,
							dispenseInstructionLatin: item.dispenseInstructionLatin,
							signatureDirectionRussian: item.signatureDirectionRussian,
							quantityPackages: item.quantityPackages,
							durationDays: item.durationDays,
							frequencyTimesPerDay: item.frequencyTimesPerDay,
							mealRelation: item.mealRelation,
						})),
					);
				}

				return presc;
			});

			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			return reply.code(201).send({
				success: true,
				prescription: result,
				safetyAudit,
			});
		},
	});

	/**
	 * 3. GET /api/pharmacology/prescriptions/patient/:patientId
	 * List patient's prescriptions
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pharmacology/prescriptions/patient/:patientId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return reply;

			const { patientId } = request.params as { patientId: string };
			const prescriptions = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(electronicPrescriptions)
					.where(
						and(
							eq(electronicPrescriptions.organizationId, orgId),
							eq(electronicPrescriptions.patientId, patientId),
						),
					)
					.orderBy(desc(electronicPrescriptions.createdAt)),
			);

			return reply.send({
				success: true,
				patientId,
				prescriptions,
			});
		},
	});

	/**
	 * 4. GET /api/pharmacology/references
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pharmacology/references",
		permission: "public",
		handler: async ({ reply }) => {
			const { getPharmacologyReferencesSnapshot } = await import(
				"../services/catalogs/warmupStatutoryCatalogs.js"
			);
			const references = getPharmacologyReferencesSnapshot();
			return reply.send(references);
		},
	});

	/**
	 * 5. GET /api/pharmacology/medications
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pharmacology/medications",
		permission: "public",
		handler: async ({ request, reply }) => {
			const query = request.query as { q?: string; category?: string } | undefined;
			const { getPharmacologyMedicationsSnapshot } = await import(
				"../services/catalogs/warmupStatutoryCatalogs.js"
			);
			const medications = getPharmacologyMedicationsSnapshot({
				...(query?.q ? { q: query.q } : {}),
				...(query?.category ? { category: query.category } : {}),
			});
			return reply.send(medications);
		},
	});

	/**
	 * 6. GET /api/pharmacology/catalog
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pharmacology/catalog",
		permission: "public",
		handler: async ({ reply }) => {
			const {
				getPharmacologyMedicationsSnapshot,
				getPharmacologyReferencesSnapshot,
				getWarmupCatalogsStatus,
			} = await import("../services/catalogs/warmupStatutoryCatalogs.js");
			return reply.send({
				success: true,
				medications: getPharmacologyMedicationsSnapshot(),
				references: getPharmacologyReferencesSnapshot(),
				status: getWarmupCatalogsStatus(),
			});
		},
	});

	/**
	 * 7. GET /api/pharmacology/warmup-status
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pharmacology/warmup-status",
		permission: "public",
		handler: async ({ reply }) => {
			const { getWarmupCatalogsStatus } = await import(
				"../services/catalogs/warmupStatutoryCatalogs.js"
			);
			return reply.send(getWarmupCatalogsStatus());
		},
	});
}

