import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import type { Patient } from "@dental/shared";
import {
	createPatient as createPatientInMemory,
	patients as inMemoryPatients,
	updatePatientAdministrativeProfile as updatePatientAdministrativeProfileInMemory,
	updatePatient as updatePatientInMemory,
} from "../sampleData.js";

function useInMemory(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

export async function getPatientByIdFromDb(organizationId: string, id: string): Promise<Patient | null> {
	if (useInMemory()) {
		return (inMemoryPatients.find((p) => p.id === id) as unknown as Patient) ?? null;
	}
	try {
		const [p] = await db.select().from(schema.patients).where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, id)));
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
	} catch {
		return (inMemoryPatients.find((p) => p.id === id) as unknown as Patient) ?? null;
	}
}

export async function getPatientsFromDb(organizationId: string): Promise<Patient[]> {
	if (useInMemory()) {
		return inMemoryPatients as unknown as Patient[];
	}
	try {
		const pts = await db.select().from(schema.patients).where(eq(schema.patients.organizationId, organizationId));
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
	} catch {
		return inMemoryPatients as unknown as Patient[];
	}
}

export async function createPatientInDb(organizationId: string, input: any): Promise<Patient> {
	if (useInMemory()) {
		return createPatientInMemory(input) as unknown as Patient;
	}
	try {
		const [created] = await db.insert(schema.patients).values({
			organizationId,
			fullName: input.fullName,
			birthDate: input.birthDate,
			phone: input.phone,
			email: input.email,
			notes: input.notes,
		}).returning();

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
	} catch {
		return createPatientInMemory(input) as unknown as Patient;
	}
}

export async function updatePatientInDb(organizationId: string, patientId: string, input: any): Promise<Patient | null> {
	if (useInMemory()) {
		return updatePatientInMemory(patientId, input) as unknown as Patient | null;
	}
	try {
		const [updated] = await db.update(schema.patients)
			.set({
				fullName: input.fullName,
				birthDate: input.birthDate,
				phone: input.phone,
				email: input.email,
				notes: input.notes,
				status: input.status,
				updatedAt: new Date(),
			})
			.where(eq(schema.patients.id, patientId))
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
	} catch {
		return updatePatientInMemory(patientId, input) as unknown as Patient | null;
	}
}

export async function updatePatientAdministrativeProfileInDb(organizationId: string, patientId: string, input: any): Promise<Patient | null> {
	if (useInMemory()) {
		return updatePatientAdministrativeProfileInMemory(patientId, input) as unknown as Patient | null;
	}
	try {
		const [updated] = await db.update(schema.patients)
			.set({
				administrativeProfile: input,
				updatedAt: new Date(),
			})
			.where(eq(schema.patients.id, patientId))
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
	} catch {
		return updatePatientAdministrativeProfileInMemory(patientId, input) as unknown as Patient | null;
	}
}
