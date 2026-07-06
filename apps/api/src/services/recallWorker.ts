/**
 * recallWorker.ts
 * 
 * Background service: checks for overdue osseointegration periods
 * and generates clinical tasks + Telegram recall triggers.
 * 
 * Run via setInterval in app startup — no external cron dependency.
 * DRAFT-FIRST: Only creates clinical tasks; does NOT auto-send Telegram without admin approval.
 */

import { db } from '../db/client.js';
import { schedulerReservations, clinicalTasks, patients } from '../db/schema.js';
import { and, eq, isNull, lte } from 'drizzle-orm';

const POLL_INTERVAL_MS = 1000 * 60 * 15; // every 15 minutes

interface RecallCandidate {
  reservationId: string;
  patientId: string;
  organizationId: string;
  jawLocation: string | null;
  recallDueAt: Date | null;
}

export function startRecallWorker(): NodeJS.Timeout {
  console.log('[RecallWorker] Started. Polling every 15 min for overdue osseointegration.');
  
  // Run immediately on start, then on interval
  processOverdueRecalls().catch(err => console.error('[RecallWorker] Error:', err));

  return setInterval(() => {
    processOverdueRecalls().catch(err => console.error('[RecallWorker] Error:', err));
  }, POLL_INTERVAL_MS);
}

async function processOverdueRecalls(): Promise<void> {
  const now = new Date();

  // Find surgical reservations past osseointegration deadline with no recall triggered
  const overdue: RecallCandidate[] = await db
    .select({
      reservationId: schedulerReservations.id,
      patientId: schedulerReservations.patientId,
      organizationId: schedulerReservations.organizationId,
      jawLocation: schedulerReservations.jawLocation,
      recallDueAt: schedulerReservations.recallDueAt,
    })
    .from(schedulerReservations)
    .where(
      and(
        eq(schedulerReservations.phase, 2), // Surgical phase
        lte(schedulerReservations.recallDueAt, now),
        isNull(schedulerReservations.recallTriggeredAt),
      )
    );

  if (overdue.length === 0) return;

  console.log(`[RecallWorker] Found ${overdue.length} overdue recall(s). Creating draft tasks.`);

  for (const candidate of overdue) {
    await createRecallTask(candidate, now);
  }
}

async function createRecallTask(candidate: RecallCandidate, now: Date): Promise<void> {
  try {
    // Fetch patient name for personalized message
    const [patient] = await db
      .select({ fullName: patients.fullName })
      .from(patients)
      .where(eq(patients.id, candidate.patientId))
      .limit(1);

    const patientName = patient?.fullName ?? 'Пациент';
    const jaw = candidate.jawLocation === 'upper' ? 'верхней челюсти' : 'нижней челюсти';
    const months = candidate.jawLocation === 'upper' ? '5 месяцев' : '3 месяца';

    // Create DRAFT clinical task for recall manager (admin must confirm before sending to patient)
    await db.insert(clinicalTasks).values({
      organizationId: candidate.organizationId,
      patientId: candidate.patientId,
      taskType: 'recall',
      title: `RECALL: Завершена остеоинтеграция — ${patientName}`,
      description: [
        `Период приживляемости имплантата на ${jaw} завершён (${months}).`,
        `Пациент НЕ записан на ортопедический этап (Фаза III).`,
        ``,
        `ЧЕРНОВИК уведомления для пациента:`,
        `"${buildPatientMessage(patientName, jaw)}"`,
        ``,
        `ACTION: Запишите пациента на установку коронки / временной конструкции.`,
      ].join('\n'),
      dueAt: now,
    });

    // Mark reservation as recall triggered to prevent duplicate tasks
    await db.update(schedulerReservations)
      .set({ recallTriggeredAt: now, status: 'patient_notified' })
      .where(eq(schedulerReservations.id, candidate.reservationId));

    console.log(`[RecallWorker] Created recall task for patient ${candidate.patientId}`);
  } catch (err) {
    console.error(`[RecallWorker] Failed for ${candidate.reservationId}:`, err);
  }
}

function buildPatientMessage(patientName: string, jaw: string): string {
  return (
    `Уважаемый(ая) ${patientName}! ` +
    `Период приживляемости вашего имплантата на ${jaw} успешно завершён. ` +
    `Пора записаться на установку коронки для завершения лечения. ` +
    `Свяжитесь с нами для записи на удобное время.`
  );
}
