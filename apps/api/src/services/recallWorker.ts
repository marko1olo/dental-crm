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
import { and, eq, isNull, lte, inArray } from 'drizzle-orm';

const POLL_INTERVAL_MS = 1000 * 60 * 15; // every 15 minutes

interface RecallCandidate {
  reservationId: string;
  patientId: string;
  organizationId: string;
  jawLocation: string | null;
  recallDueAt: Date | null;
  patientFullName?: string | null;
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
  const overdue = await db
    .select({
      reservationId: schedulerReservations.id,
      patientId: schedulerReservations.patientId,
      organizationId: schedulerReservations.organizationId,
      jawLocation: schedulerReservations.jawLocation,
      recallDueAt: schedulerReservations.recallDueAt,
      patientFullName: patients.fullName,
    })
    .from(schedulerReservations)
    .leftJoin(patients, eq(schedulerReservations.patientId, patients.id))
    .where(
      and(
        eq(schedulerReservations.phase, 2), // Surgical phase
        lte(schedulerReservations.recallDueAt, now),
        isNull(schedulerReservations.recallTriggeredAt),
      )
    );

  if (overdue.length === 0) return;

  console.log(`[RecallWorker] Found ${overdue.length} overdue recall(s). Creating draft tasks.`);

  const tasksToInsert = overdue.map(candidate => {
    const patientName = candidate.patientFullName ?? 'Пациент';
    const jaw = candidate.jawLocation === 'upper' ? 'верхней челюсти' : 'нижней челюсти';
    const months = candidate.jawLocation === 'upper' ? '5 месяцев' : '3 месяца';

    return {
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
    };
  });

  const reservationIds = overdue.map(c => c.reservationId);

  try {
    await db.transaction(async (tx) => {
      if (tasksToInsert.length > 0) {
        await tx.insert(clinicalTasks).values(tasksToInsert);
      }
      if (reservationIds.length > 0) {
        await tx.update(schedulerReservations)
          .set({ recallTriggeredAt: now, status: 'patient_notified' })
          .where(inArray(schedulerReservations.id, reservationIds));
      }
    });

    console.log(`[RecallWorker] Processed ${overdue.length} overdue recall(s).`);
  } catch (err) {
    console.error(`[RecallWorker] Bulk operation failed:`, err);
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
