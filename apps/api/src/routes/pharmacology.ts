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
import { db } from "../db/client.js";
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
	app.post("/api/pharmacology/check-interactions", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = checkInteractionsRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "PharmacologyValidationError",
				message: "Некорректные параметры для проверки взаимодействий.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Fetch patient allergies
		const allergies = await db
			.select()
			.from(patientDrugAllergies)
			.where(
				and(
					eq(patientDrugAllergies.organizationId, orgId),
					eq(patientDrugAllergies.patientId, input.patientId),
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
	});

	/**
	 * 2. POST /api/pharmacology/prescriptions
	 * Create official Form 107-1/u prescription under Order 1094n
	 */
	app.post("/api/pharmacology/prescriptions", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"create prescription",
		);
		if (!orgId) return;

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

		// Fetch patient and doctor
		const [patient] = await db
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
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден.",
			});
		}

		const [doctor] = await db
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
			return reply.code(404).send({
				error: "DoctorNotFound",
				message: "Врач не найден.",
			});
		}

		// Run clinical interaction check
		const allergies = await db
			.select()
			.from(patientDrugAllergies)
			.where(
				and(
					eq(patientDrugAllergies.organizationId, orgId),
					eq(patientDrugAllergies.patientId, input.patientId),
				),
			);

		const safetyAudit = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
			{
				patientId: input.patientId,
				prescribedInnList: input.items.map((i) => i.innLatin),
				currentMedications: input.currentMedications,
				chronicDiseases: [],
				vasoconstrictorPlanned: "1:200000",
				patientAgeYears: 35,
				isPregnant: false,
				isLactating: false,
			},
			allergies.map((a) => ({
				allergenGroup: a.allergenGroup,
				reactionSeverity: a.reactionSeverity,
				hasSamterTriad: a.hasSamterTriad,
			})),
		);

		if (!safetyAudit.isPrescriptionSafe) {
			return reply.code(422).send({
				error: "PrescriptionSafetyBlocker",
				message:
					"Рецепт заблокирован клиническим движком безопасности из-за критических межлекарственных взаимодействий или аллергии.",
				safetyAudit,
			});
		}

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

		const result = await db.transaction(async (tx) => {
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
				throw new Error("Failed to create electronic prescription");
			}

			// Insert items
			for (let idx = 0; idx < input.items.length; idx++) {
				const item = input.items[idx];
				if (!item) continue;
				await tx.insert(electronicPrescriptionItems).values({
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
				});
			}

			return presc;
		});

		return reply.code(201).send({
			success: true,
			prescription: result,
			safetyAudit,
		});
	});

	/**
	 * 3. GET /api/pharmacology/prescriptions/patient/:patientId
	 * List patient's prescriptions
	 */
	app.get("/api/pharmacology/prescriptions/patient/:patientId", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		const prescriptions = await db
			.select()
			.from(electronicPrescriptions)
			.where(
				and(
					eq(electronicPrescriptions.organizationId, orgId),
					eq(electronicPrescriptions.patientId, patientId),
				),
			)
			.orderBy(desc(electronicPrescriptions.createdAt));

		return reply.send({
			success: true,
			patientId,
			prescriptions,
		});
	});
}
