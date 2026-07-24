import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";

export async function getPatientByIdFromDb(organizationId: string, id: string): Promise<Patient | null> {
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
    updatedAt: p.updatedAt.toISOString()
  } as unknown as Patient;
}
import type { Patient } from "@dental/shared";

export async function getPatientsFromDb(organizationId: string): Promise<Patient[]> {
  const pts = await db.select().from(schema.patients).where(eq(schema.patients.organizationId, organizationId));
  return pts.map(p => ({
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
    updatedAt: p.updatedAt.toISOString()
  })) as unknown as Patient[];
}

export async function createPatientInDb(organizationId: string, input: any): Promise<Patient> {
  const [created] = await db.insert(schema.patients).values({
    organizationId,
    fullName: input.fullName,
    birthDate: input.birthDate,
    phone: input.phone,
    email: input.email,
    notes: input.notes
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
    updatedAt: created.updatedAt.toISOString()
  } as unknown as Patient;
}

export async function updatePatientInDb(organizationId: string, patientId: string, input: any): Promise<Patient | null> {
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
    updatedAt: updated.updatedAt.toISOString()
  } as unknown as Patient;
}

export async function updatePatientAdministrativeProfileInDb(organizationId: string, patientId: string, input: any): Promise<Patient | null> {
  const [updated] = await db.update(schema.patients)
    .set({
      administrativeProfile: input,
      updatedAt: new Date()
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
    updatedAt: updated.updatedAt.toISOString()
  } as unknown as Patient;
}
