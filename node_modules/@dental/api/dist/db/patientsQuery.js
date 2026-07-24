import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
export async function getPatientByIdFromDb(organizationId, id) {
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
        updatedAt: p.updatedAt.toISOString()
    };
}
export async function getPatientsFromDb(organizationId) {
    const pts = await db.select().from(schema.patients).where(eq(schema.patients.organizationId, organizationId));
    return pts.map(p => ({
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
        updatedAt: p.updatedAt.toISOString()
    }));
}
export async function createPatientInDb(organizationId, input) {
    const [created] = await db.insert(schema.patients).values({
        organizationId,
        fullName: input.fullName,
        birthDate: input.birthDate,
        phone: input.phone,
        email: input.email,
        notes: input.notes
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
        updatedAt: created.updatedAt.toISOString()
    };
}
export async function updatePatientInDb(organizationId, patientId, input) {
    const [updated] = await db.update(schema.patients)
        .set({
        fullName: input.fullName,
        birthDate: input.birthDate,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        status: input.status,
        updatedAt: new Date()
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
        updatedAt: updated.updatedAt.toISOString()
    };
}
export async function updatePatientAdministrativeProfileInDb(organizationId, patientId, input) {
    const [updated] = await db.update(schema.patients)
        .set({
        administrativeProfile: input,
        updatedAt: new Date()
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
        updatedAt: updated.updatedAt.toISOString()
    };
}
