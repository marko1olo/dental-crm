import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import { createPatient as createPatientInMemory, patients as inMemoryPatients, updatePatientAdministrativeProfile as updatePatientAdministrativeProfileInMemory, updatePatient as updatePatientInMemory, } from "../sampleData.js";
function useInMemory() {
    return process.env.DENTAL_STATE_PERSISTENCE === "off";
}
export async function getPatientByIdFromDb(organizationId, id) {
    if (useInMemory()) {
        return inMemoryPatients.find((p) => p.id === id) ?? null;
    }
    try {
        const [p] = await db.select().from(schema.patients).where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, id)));
        if (!p)
            return null;
        return {
            id: p.id,
            organizationId: p.organizationId,
            status: p.status,
            fullName: p.fullName,
            birthDate: p.birthDate,
            phone: p.phone,
            email: p.email,
            notes: p.notes,
            administrativeProfile: p.administrativeProfile,
            balanceRub: 0,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        };
    }
    catch {
        return inMemoryPatients.find((p) => p.id === id) ?? null;
    }
}
export async function getPatientsFromDb(organizationId) {
    if (useInMemory()) {
        return inMemoryPatients;
    }
    try {
        const pts = await db.select().from(schema.patients).where(eq(schema.patients.organizationId, organizationId));
        return pts.map((p) => ({
            id: p.id,
            organizationId: p.organizationId,
            status: p.status,
            fullName: p.fullName,
            birthDate: p.birthDate,
            phone: p.phone,
            email: p.email,
            notes: p.notes,
            administrativeProfile: p.administrativeProfile,
            balanceRub: 0,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        }));
    }
    catch {
        return inMemoryPatients;
    }
}
export async function createPatientInDb(organizationId, input) {
    if (useInMemory()) {
        return createPatientInMemory(input);
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
        if (!created)
            throw new Error("Failed to create patient in DB");
        return {
            id: created.id,
            organizationId: created.organizationId,
            status: created.status,
            fullName: created.fullName,
            birthDate: created.birthDate,
            phone: created.phone,
            email: created.email,
            notes: created.notes,
            administrativeProfile: created.administrativeProfile,
            balanceRub: 0,
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        };
    }
    catch {
        return createPatientInMemory(input);
    }
}
export async function updatePatientInDb(organizationId, patientId, input) {
    if (useInMemory()) {
        return updatePatientInMemory(patientId, input);
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
        if (!updated)
            return null;
        return {
            id: updated.id,
            organizationId: updated.organizationId,
            status: updated.status,
            fullName: updated.fullName,
            birthDate: updated.birthDate,
            phone: updated.phone,
            email: updated.email,
            notes: updated.notes,
            administrativeProfile: updated.administrativeProfile,
            balanceRub: 0,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        };
    }
    catch {
        return updatePatientInMemory(patientId, input);
    }
}
export async function updatePatientAdministrativeProfileInDb(organizationId, patientId, input) {
    if (useInMemory()) {
        return updatePatientAdministrativeProfileInMemory(patientId, input);
    }
    try {
        const [updated] = await db.update(schema.patients)
            .set({
            administrativeProfile: input,
            updatedAt: new Date(),
        })
            .where(eq(schema.patients.id, patientId))
            .returning();
        if (!updated)
            return null;
        return {
            id: updated.id,
            organizationId: updated.organizationId,
            status: updated.status,
            fullName: updated.fullName,
            birthDate: updated.birthDate,
            phone: updated.phone,
            email: updated.email,
            notes: updated.notes,
            administrativeProfile: updated.administrativeProfile,
            balanceRub: 0,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        };
    }
    catch {
        return updatePatientAdministrativeProfileInMemory(patientId, input);
    }
}
