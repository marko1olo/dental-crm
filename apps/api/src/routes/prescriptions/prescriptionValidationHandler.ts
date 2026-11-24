import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { verifyPrescriptionStatutoryValidity } from "@dental/shared";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	electronicPrescriptionItems,
	electronicPrescriptions,
	patientDrugAllergies,
	patients,
} from "../../db/schema.js";
import { validatePrescriptionAllergiesAndSafety } from "../../services/clinical/prescriptionValidationService.js";
import { FORBIDDEN_NARCOTIC_INN_PATTERNS } from "./prescriptionSchemas.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StatutoryValidationPayload = Parameters<typeof verifyPrescriptionStatutoryValidity>[0] & {
	patientAllergies?: string[];
	patientId?: string;
};

interface VerifyPrescriptionParams {
	id: string;
}

/**
 * 2. POST /api/prescriptions/validate
 * Statutory rules engine validation per Order 1094n
 */
export async function handleValidatePrescription(
	request: FastifyRequest<{ Body: StatutoryValidationPayload }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const body = request.body;
	if (!body || typeof body !== "object") {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Тело запроса для валидации рецепта обязательно.",
		});
	}

	let result = verifyPrescriptionStatutoryValidity(body);
	const narcoticErrors: string[] = [];
	if (Array.isArray(body.items)) {
		for (const item of body.items) {
			const itemObj = item && typeof item === "object" ? (item as { latinName?: string; tradeName?: string }) : null;
			const name = itemObj?.latinName || itemObj?.tradeName || "";
			if (name && FORBIDDEN_NARCOTIC_INN_PATTERNS.some((p) => p.test(name))) {
				narcoticErrors.push(
					`Препарат «${name}» относится к наркотическим средствам Списка II/III. В амбулаторной стоматологии применяются ненаркотические анальгетики (НПВП: Нимесил, Кетанов, Дексалгин).`,
				);
			}
		}
	}
	if (narcoticErrors.length > 0) {
		result = {
			...result,
			isValid: false,
			errors: [...result.errors, ...narcoticErrors],
		};
	}

	const proposedDrugs: string[] = [];
	if (Array.isArray(body.items)) {
		for (const item of body.items) {
			const itemObj = item && typeof item === "object" ? (item as { latinName?: string; tradeName?: string }) : null;
			const name = itemObj?.latinName || itemObj?.tradeName || "";
			if (name) proposedDrugs.push(name);
		}
	}

	let patientAllergies: string[] = [];
	const customAllergies = body.patientAllergies;
	if (Array.isArray(customAllergies)) {
		patientAllergies = customAllergies.filter(Boolean);
	}
	const maybePatientId = body.patientId;
	if (typeof maybePatientId === "string" && maybePatientId.trim().length > 0) {
		const trimmedPatientId = maybePatientId.trim();
		if (!UUID_PATTERN.test(trimmedPatientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается формат UUID).",
			});
		}
		const { dbAllergies, patientRow } = await withTenantCtx(orgId, async (tx) => {
			const dbAllergiesInner = await tx
				.select()
				.from(patientDrugAllergies)
				.where(and(eq(patientDrugAllergies.organizationId, orgId), eq(patientDrugAllergies.patientId, trimmedPatientId)));
			const [patientRowInner] = await tx
				.select({ notes: patients.notes })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, trimmedPatientId)))
				.limit(1);
			return { dbAllergies: dbAllergiesInner, patientRow: patientRowInner };
		});
		const dbAllergyStrings = dbAllergies
			.map((a) => a.allergenGroup || a.drugInnLatin)
			.filter((s): s is string => typeof s === "string" && s.length > 0);
		patientAllergies = [
			...patientAllergies,
			...dbAllergyStrings,
			...(patientRow?.notes ? [patientRow.notes] : []),
		];
	}

	const safetyAudit = validatePrescriptionAllergiesAndSafety({
		proposedDrugs,
		patientAllergies,
	});

	return reply.send({
		success: true,
		validation: result,
		safetyAudit: {
			safetyAuditPassed: safetyAudit.safetyAuditPassed,
			hasAllergyWarning: safetyAudit.hasAllergyWarning,
			hasDdiWarning: safetyAudit.hasDdiWarning,
			passiveWarnings: safetyAudit.passiveWarnings,
			allergyWarnings: safetyAudit.allergyWarnings,
			drugInteractions: safetyAudit.drugInteractions,
			safeAlternativeRecommendations: safetyAudit.safeAlternativeRecommendations,
			isDoctorAutonomyPermitted: true,
		},
	});
}

/**
 * 8. POST /api/prescriptions/:id/verify
 * Verify statutory validity and expiration status
 */
export async function handleVerifyPrescription(
	request: FastifyRequest<{ Params: VerifyPrescriptionParams }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const { id } = request.params;
	if (!UUID_PATTERN.test(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор рецепта (ожидается формат UUID).",
		});
	}

	const loaded = await withTenantCtx(orgId, async (tx) => {
		const [prescInner] = await tx
			.select()
			.from(electronicPrescriptions)
			.where(and(eq(electronicPrescriptions.id, id), eq(electronicPrescriptions.organizationId, orgId)))
			.limit(1);

		if (!prescInner) {
			return null;
		}

		const itemsInner = await tx
			.select()
			.from(electronicPrescriptionItems)
			.where(and(eq(electronicPrescriptionItems.prescriptionId, prescInner.id), eq(electronicPrescriptionItems.organizationId, orgId)));

		return { presc: prescInner, items: itemsInner };
	});

	if (!loaded) {
		return reply.code(404).send({ error: "PrescriptionNotFound", message: "Рецепт не найден." });
	}
	const { presc, items } = loaded;

	const validityDaysNum =
		presc.validityPeriod === "days_15"
			? 15
			: presc.validityPeriod === "days_30"
				? 30
				: presc.validityPeriod === "year_1"
					? 365
					: 60;

	const validation = verifyPrescriptionStatutoryValidity({
		formType: presc.formType,
		prescriptionDate: presc.issuedAt?.toISOString().slice(0, 10) || presc.createdAt.toISOString().slice(0, 10),
		validityDays: validityDaysNum,
		isChronicSpecialCare: presc.isSpecialChronicIndication,
		chronicPeriodicity: presc.chronicDispenseFrequencyNotes,
		items: items.map((i) => ({ latinName: i.innLatin })),
	});

	return reply.send({
		success: true,
		prescriptionId: presc.id,
		prescriptionNumber: presc.prescriptionNumber,
		isSignedUkep: Boolean(presc.cryptoSignaturePkcs7),
		status: presc.status,
		validation,
	});
}
