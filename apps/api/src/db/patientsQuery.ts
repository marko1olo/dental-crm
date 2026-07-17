import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

export async function getPatientByIdFromDb(
	organizationId: string,
	id: string,
): Promise<Patient | null> {
	const [p] = await db
		.select()
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, id),
			),
		);
	if (!p) return null;
	return {
		id: p.id,
		organizationId: p.organizationId,
		status: p.status as any,
		fullName: p.fullName,
		birthDate: p.birthDate,
		phone: p.phone,
		email: p.email,
		notes: p.notes,
		administrativeProfile: p.administrativeProfile as any,
		balanceRub: 0,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString(),
	} as unknown as Patient;
}

import type { Patient } from "@dental/shared";

export async function getPatientsFromDb(
	organizationId: string,
): Promise<Patient[]> {
	const pts = await db
		.select()
		.from(schema.patients)
		.where(eq(schema.patients.organizationId, organizationId));
	return pts.map((p) => ({
		id: p.id,
		organizationId: p.organizationId,
		status: p.status as any,
		fullName: p.fullName,
		birthDate: p.birthDate,
		phone: p.phone,
		email: p.email,
		notes: p.notes,
		administrativeProfile: p.administrativeProfile as any,
		balanceRub: 0,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString(),
	})) as unknown as Patient[];
}

export async function createPatientInDb(
	organizationId: string,
	input: any,
): Promise<Patient> {
	const result = (await db
		.insert(schema.patients)
		.values({
			organizationId,
			fullName: input.fullName,
			birthDate: input.birthDate,
			phone: input.phone,
			email: input.email,
			notes: input.notes,
			insuranceContractId: input.insuranceContractId,
			insurancePolicyNumber: input.insurancePolicyNumber,
		})
		.returning()) as any;
	const created = result[0];

	if (!created) throw new Error("Failed to create patient in DB");

	return {
		id: created.id,
		organizationId: created.organizationId,
		status: created.status as any,
		fullName: created.fullName,
		birthDate: created.birthDate,
		phone: created.phone,
		email: created.email,
		notes: created.notes,
		administrativeProfile: created.administrativeProfile as any,
		balanceRub: 0,
		createdAt: created.createdAt.toISOString(),
		updatedAt: created.updatedAt.toISOString(),
	} as unknown as Patient;
}

export async function updatePatientInDb(
	organizationId: string,
	patientId: string,
	input: any,
): Promise<Patient | null> {
	const [updated] = await db
		.update(schema.patients)
		.set({
			fullName: input.fullName,
			birthDate: input.birthDate,
			phone: input.phone,
			email: input.email,
			notes: input.notes,
			insuranceContractId: input.insuranceContractId,
			insurancePolicyNumber: input.insurancePolicyNumber,
			familyGroupId:
				input.familyGroupId !== undefined ? input.familyGroupId : undefined,
			status: input.status,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, patientId),
			),
		)
		.returning();

	if (!updated) return null;

	return {
		id: updated.id,
		organizationId: updated.organizationId,
		status: updated.status as any,
		fullName: updated.fullName,
		birthDate: updated.birthDate,
		phone: updated.phone,
		email: updated.email,
		notes: updated.notes,
		administrativeProfile: updated.administrativeProfile as any,
		balanceRub: 0,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
	} as unknown as Patient;
}

export async function updatePatientAdministrativeProfileInDb(
	organizationId: string,
	patientId: string,
	input: any,
): Promise<Patient | null> {
	const [updated] = await db
		.update(schema.patients)
		.set({
			administrativeProfile: input,
			insuranceContractId: input.insuranceContractId || null,
			insurancePolicyNumber: input.insurancePolicyNumber || null,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, patientId),
			),
		)
		.returning();

	if (!updated) return null;

	return {
		id: updated.id,
		organizationId: updated.organizationId,
		status: updated.status as any,
		fullName: updated.fullName,
		birthDate: updated.birthDate,
		phone: updated.phone,
		email: updated.email,
		notes: updated.notes,
		administrativeProfile: updated.administrativeProfile as any,
		balanceRub: 0,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
	} as unknown as Patient;
}

// patient_anamnesis has no organizationId of its own, so ownership is enforced
// by confirming the patient belongs to the caller's org first. Returns false when
// the patient is not in this org (or does not exist).
async function patientBelongsToOrganization(
	patientId: string,
	organizationId: string,
): Promise<boolean> {
	const [patient] = await db
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.id, patientId),
				eq(schema.patients.organizationId, organizationId),
			),
		)
		.limit(1);
	return Boolean(patient);
}

export async function getPatientAnamnesisFromDb(
	patientId: string,
	organizationId: string,
) {
	if (!(await patientBelongsToOrganization(patientId, organizationId))) {
		return null;
	}
	const [anamnesis] = await db
		.select()
		.from(schema.patientAnamnesis)
		.where(eq(schema.patientAnamnesis.patientId, patientId));
	return anamnesis || null;
}

export async function updatePatientAnamnesisInDb(
	patientId: string,
	organizationId: string,
	input: {
		allergies?: string[];
		systemicDiseases?: string[];
		hasCriticalAlerts?: boolean;
	},
) {
	if (!(await patientBelongsToOrganization(patientId, organizationId))) {
		return null;
	}
	const [existing] = await db
		.select()
		.from(schema.patientAnamnesis)
		.where(eq(schema.patientAnamnesis.patientId, patientId));

	if (existing) {
		const [updated] = await db
			.update(schema.patientAnamnesis)
			.set({
				allergies: input.allergies ?? existing.allergies,
				systemicDiseases: input.systemicDiseases ?? existing.systemicDiseases,
				hasCriticalAlerts:
					input.hasCriticalAlerts ?? existing.hasCriticalAlerts,
			})
			.where(eq(schema.patientAnamnesis.patientId, patientId))
			.returning();
		return updated;
	} else {
		const [created] = await db
			.insert(schema.patientAnamnesis)
			.values({
				patientId,
				allergies: input.allergies ?? [],
				systemicDiseases: input.systemicDiseases ?? [],
				hasCriticalAlerts: input.hasCriticalAlerts ?? false,
			})
			.returning();
		return created;
	}
}
