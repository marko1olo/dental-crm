import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
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
