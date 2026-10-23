import crypto from "node:crypto";
import { calculatePrescriptionExpiration } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { type patients, users } from "../../db/schema.js";

type PatientRow = typeof patients.$inferSelect;

export function calculatePrescriptionValidityAndNumber(
	formType: string,
	validityPeriod: string,
	now: Date,
) {
	const validityDaysNum =
		validityPeriod === "days_15"
			? 15
			: validityPeriod === "days_30"
				? 30
				: validityPeriod === "year_1"
					? 365
					: 60;

	const expiresAtIso = calculatePrescriptionExpiration(now.toISOString().slice(0, 10), validityDaysNum);
	const expiresAt = new Date(expiresAtIso);

	const year = now.getFullYear();
	let prefix = "107-1У";
	let numPrefix = "RX-107";
	if (formType === "form_148_1_u_88") {
		prefix = "148-1У-88";
		numPrefix = "ПКУ-88";
	} else if (formType === "form_148_1_u_04_l") {
		prefix = "148-1У-04Л";
		numPrefix = "ЛЬГ-04";
	}
	const prescriptionNumber = `${numPrefix}-${year}-${crypto.randomInt(100000, 999999)}`;

	return { validityDaysNum, expiresAt, prefix, prescriptionNumber };
}

export function isAnonymousOmsPatient(patient: PatientRow, patientOmsPolicy?: string | null, benefitCode?: string | null) {
	const adminProfile = (patient.administrativeProfile || {}) as Record<string, unknown>;
	const isAnon =
		Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
		Boolean(patient.fullName?.toLowerCase().includes("аноним")) ||
		adminProfile["isAnonymous"] === true;
	return isAnon && Boolean(patientOmsPolicy || benefitCode);
}

export async function findPrescribingDoctor(orgId: string, doctorId?: string | null, currentUserId?: string | null) {
	const targetDoctorId = doctorId || currentUserId;
	let [doctor] = targetDoctorId
		? await db.select().from(users).where(and(eq(users.id, targetDoctorId), eq(users.organizationId, orgId))).limit(1)
		: [undefined];

	if (!doctor) {
		const [firstOrgUser] = await db.select().from(users).where(eq(users.organizationId, orgId)).limit(1);
		doctor = firstOrgUser;
	}
	return doctor || null;
}
