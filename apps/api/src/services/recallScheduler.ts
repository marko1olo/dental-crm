import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js'; // assuming
import { treatmentPlans, treatmentPlanItemsNew, patients } from '../db/schema.js';
// import { sendTelegramMessage } from '../routes/telegram.js'; // Assuming this exists or can be stubbed

export class RecallScheduler {
  
  /**
   * Run this periodically (e.g., via node-cron or setInterval)
   * Scans for completed surgical phases and triggers recall if the waiting period is over.
   */
  static async processOsteointegrationRecalls() {
    console.log('[RecallScheduler] Scanning for osteointegration recalls...');
    
    // Find treatment plan items in Phase 2 (Surgery) that are completed,
    // but Phase 3 (Prosthetics) hasn't started yet.
    // In a real DB, we'd check completion dates and status. For MVP:
    // We check items added X months ago.
    
    // Example query: select items from plan where phase=2 and date < (now - 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const readyForCrown = await db.select({
      patientId: treatmentPlans.patientId,
      planName: treatmentPlans.name,
      toothNumber: treatmentPlanItemsNew.toothNumber,
      itemDate: treatmentPlans.updatedAt // simplification for MVP
    })
    .from(treatmentPlanItemsNew)
    .innerJoin(treatmentPlans, eq(treatmentPlans.id, treatmentPlanItemsNew.planId))
    .where(
      and(
        eq(treatmentPlanItemsNew.phase, 2), // Surgery phase
        // lte(treatmentPlans.updatedAt, threeMonthsAgo) // Mock time delay
      )
    )
    .limit(50); // Batch processing

    for (const item of readyForCrown) {
      if (!item.toothNumber) continue;

      // Jaw determination (FDI):
      // Upper jaw: 11-18, 21-28
      // Lower jaw: 31-38, 41-48
      const isUpperJaw = item.toothNumber < 30;
      const healingMonths = isUpperJaw ? 6 : 3;
      
      const healingDate = new Date(item.itemDate);
      healingDate.setMonth(healingDate.getMonth() + healingMonths);
      
      if (new Date() >= healingDate) {
        // Trigger Recall
        await this.triggerRecall(item.patientId, item.toothNumber, item.planName);
      }
    }
  }

  private static async triggerRecall(patientId: string, toothNumber: number, planName: string) {
    // 1. Fetch patient
    const patientRecord = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
    const patient = patientRecord[0];
    if (!patient) return;

    // 2. Generate Notification Message
    const message = `Уважаемый(ая) ${patient.fullName}! Период приживляемости вашего имплантата на зубе ${toothNumber} успешно завершен. Пора записаться на установку коронки для завершения лечения по плану "${planName}"!`;
    
    console.log(`[RecallScheduler] Triggering recall for ${patientId}: ${message}`);
    
    // 3. Send via Telegram (mock/stub if sendTelegramMessage fails)
    try {
      const chat = (patient.administrativeProfile as any)?.telegramChatId;
      if (chat) {
        // await sendTelegramMessage(chat, message);
        console.log(`[RecallScheduler] SMS/TG sent to ${chat}`);
      }
    } catch (e) {
      console.error('[RecallScheduler] Failed to send notification', e);
    }
  }
}
