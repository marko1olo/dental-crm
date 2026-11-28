import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
	formatDateKeyInTimeZone,
	todayDateKeyInTimeZone,
	verifyPrescriptionStatutoryValidity,
} from "@dental/shared";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantReadCtx } from "../../db/rls.js";
import {
	electronicPrescriptionItems,
	electronicPrescriptions,
	patientDrugAllergies,
	patients,
} from "../../db/schema.js";
import { validatePrescriptionAllergiesAndSafety } from "../../services/clinical/prescriptionValidationService.js";
import { clinicTimeZone } from "../../services/reports/managerReports/timezone.js";
import { FORBIDDEN_NARCOTIC_INN_PATTERNS } from "./prescriptionSchemas.js";

type StatutoryValidationPayload = Parameters<typeof verifyPrescriptionStatutoryValidity>[0] & {
	patientAllergies?: string[];
	patientId?: string;
};

const verifyPrescriptionParamsSchema = z.object({
	id: z.string().uuid(),
});

const validatePrescriptionItemSchema = z
	.object({
		latinName: z.string().optional(),
		tradeName: z.string().optional(),
		category: z.string().optional(),
	})
	.passthrough();

const validatePrescriptionBodySchema = z
	.object({
		formNumber: z.string().optional(),
		formType: z.string().optional(),
		prescriptionDate: z.string().optional(),
		validityDays: z.union([z.string(), z.number()]).optional(),
		isChronicSpecialCare: z.boolean().optional(),
		chronicPeriodicity: z.string().nullable().optional(),
		items: z.array(z.unknown()).optional(),
		patientAddress: z.string().nullable().optional(),
		preferentialDetails: z
			.object({
				patientSnils: z.string().optional(),
				patientOmsPolicy: z.string().optional(),
			})
			.passthrough()
			.nullable()
			.optional(),
		patientAllergies: z.array(z.unknown()).optional(),
		patientId: z.string().optional(),
	})
	.passthrough();

/**
 * 2. POST /api/prescriptions/validate
 * Statutory rules engine validation per Order 1094n
 */
export async function handleValidatePrescription(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	if (!request.body || typeof request.body !== "object") {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Тело запроса для валидации рецепта обязательно.",
		});
	}

	const parsedBodyResult = validatePrescriptionBodySchema.safeParse(request.body);
	const bodyData = parsedBodyResult.success ? parsedBodyResult.data : {};
	const clinicTz = await clinicTimeZone(orgId);
	const itemsList = (bodyData.items ?? []).map((item) => {
		const parsedItem = validatePrescriptionItemSchema.safeParse(item);
		return parsedItem.success ? parsedItem.data : {};
	});
	const prescriptionPayload = {
		formNumber: bodyData.formNumber,
		formType: bodyData.formType,
		prescriptionDate: bodyData.prescriptionDate ?? todayDateKeyInTimeZone(clinicTz),
		validityDays: bodyData.validityDays ?? "60",
		isChronicSpecialCare: bodyData.isChronicSpecialCare,
		chronicPeriodicity: bodyData.chronicPeriodicity ?? null,
		items: itemsList.map((item) => ({
			latinName: item.latinName,
			tradeName: item.tradeName,
			category: item.category,
		})),
		patientAddress: bodyData.patientAddress ?? null,
		preferentialDetails: bodyData.preferentialDetails
			? {
					patientSnils: bodyData.preferentialDetails.patientSnils,
					patientOmsPolicy: bodyData.preferentialDetails.patientOmsPolicy,
				}
			: null,
	};

	let result = verifyPrescriptionStatutoryValidity(prescriptionPayload);
	const narcoticErrors: string[] = [];
	for (const itemObj of itemsList) {
		const name =
			typeof itemObj.latinName === "string"
				? itemObj.latinName
				: typeof itemObj.tradeName === "string"
					? itemObj.tradeName
					: "";
		if (name && FORBIDDEN_NARCOTIC_INN_PATTERNS.some((p) => p.test(name))) {
			narcoticErrors.push(
				`Препарат «${name}» относится к наркотическим средствам Списка II/III. В амбулаторной стоматологии применяются ненаркотические анальгетики (НПВП: Нимесил, Кетанов, Дексалгин).`,
			);
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
	for (const itemObj of itemsList) {
		const name =
			typeof itemObj.latinName === "string"
				? itemObj.latinName
				: typeof itemObj.tradeName === "string"
					? itemObj.tradeName
					: "";
		if (name) proposedDrugs.push(name);
	}

	let patientAllergies: string[] = [];
	const customAllergies = bodyData.patientAllergies;
	if (Array.isArray(customAllergies)) {
		patientAllergies = customAllergies.filter((a): a is string => typeof a === "string" && a.length > 0);
	}
	const maybePatientId = bodyData.patientId;
	if (typeof maybePatientId === "string" && maybePatientId.trim().length > 0) {
		const trimmedPatientId = maybePatientId.trim();
		if (!z.string().uuid().safeParse(trimmedPatientId).success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается формат UUID).",
			});
		}
		const { dbAllergies, patientRow } = await withTenantReadCtx(orgId, async (tx) => {
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
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const parsedParams = verifyPrescriptionParamsSchema.safeParse(request.params ?? {});
	if (!parsedParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор рецепта (ожидается формат UUID).",
		});
	}
	const { id } = parsedParams.data;

	const [clinicTz, loaded] = await Promise.all([
		clinicTimeZone(orgId),
		withTenantReadCtx(orgId, async (tx) => {
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
		}),
	]);

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
		prescriptionDate: formatDateKeyInTimeZone(presc.issuedAt ?? presc.createdAt, clinicTz),
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
