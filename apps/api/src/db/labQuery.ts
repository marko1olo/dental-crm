import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { labOrders, patients } from "./schema.js";

export async function getLabOrderByToken(token: string) {
  const result = await db
    .select({
      id: labOrders.id,
      patientId: labOrders.patientId,
      patientFullName: patients.fullName,
      toothFdi: labOrders.toothFdi,
      material: labOrders.material,
      colorVita: labOrders.colorVita,
      status: labOrders.status,
      clinicalNotes: labOrders.clinicalNotes,
      attachedImageUrl: labOrders.attachedImageUrl,
      createdAt: labOrders.createdAt
    })
    .from(labOrders)
    .innerJoin(patients, eq(patients.id, labOrders.patientId))
    .where(eq(labOrders.secureToken, token))
    .limit(1);
    
  return result[0] || null;
}

export async function updateLabOrderStatus(token: string, status: string) {
  const result = await db
    .update(labOrders)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(labOrders.secureToken, token))
    .returning();
    
  return result[0] || null;
}
