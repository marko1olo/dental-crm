/**
 * Задачи (поручения) по одной карте пациента.
 *
 * ЗАЧЕМ ЭТОТ МОДУЛЬ. Экран карточки пациента полностью готов и честен:
 * apps/web/src/components/patients/PatientTaskTicketsWidget.tsx разводит
 * загрузку, отказ чтения и пустоту, сбрасывает начатое поручение при переходе на
 * другого пациента и прямо предупреждает об этом, а при отказе записи обещает,
 * что набранный текст остался в форме. Сервера под ним не было: живая проверка
 * сети (scratch/probe-failed-requests.mjs) видела 404 на
 * GET /api/patients/:id/tickets. Администратор нажимал «Создать задачу» и не
 * имел ни одного способа поручить перезвонить пациенту.
 *
 * ГРАНИЦЫ. Все четыре функции принимают orgId и фильтруют по нему в SQL, а не
 * после выборки: поручение называет пациента по имени и по поводу обращения.
 * Ошибки базы НЕ гасятся: пустой список вместо отказа читается администратором
 * как «поручений нет», и несделанный звонок больному человеку выглядит как
 * законченный день.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

/** Ровно те два состояния, которыми пользуется экран. */
export type PatientTaskTicketStatus = "pending" | "completed";

export type PatientTaskTicket = {
  id: string;
  patientId: string;
  assignedToId: string | null;
  title: string;
  description: string | null;
  status: PatientTaskTicketStatus;
  priority: string;
  createdAt: string;
};

/**
 * Приведение строки базы к тому виду, который читает экран.
 *
 * Дату отдаём строкой ISO: экран делает `new Date(ticket.createdAt)`, и объект
 * Date после JSON.stringify всё равно стал бы строкой — но тогда тип ответа
 * зависел бы от способа сериализации, а не от контракта.
 */
function toTicket(row: typeof schema.patientTaskTickets.$inferSelect): PatientTaskTicket {
  return {
    id: row.id,
    patientId: row.patientId,
    assignedToId: row.assignedToId ?? null,
    title: row.title,
    description: row.description ?? null,
    /*
     * База ограничена CHECK-ом на два значения, но приведение всё равно делаем
     * явным. Экран считает задачу «в работе» строгим сравнением со 'pending':
     * если ограничение однажды снимут, третье значение выглядело бы на экране
     * ВЫПОЛНЕННОЙ задачей — то есть поручение молча исчезло бы из работы.
     */
    status: row.status === "completed" ? "completed" : "pending",
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Список по карте, свежие сверху — в этом порядке его читает администратор. */
export async function getPatientTaskTicketsFromDb(
  orgId: string,
  patientId: string,
): Promise<PatientTaskTicket[]> {
  const rows = await db
    .select()
    .from(schema.patientTaskTickets)
    .where(
      and(
        eq(schema.patientTaskTickets.organizationId, orgId),
        eq(schema.patientTaskTickets.patientId, patientId),
      ),
    )
    .orderBy(desc(schema.patientTaskTickets.createdAt));
  return rows.map(toTicket);
}

export async function createPatientTaskTicketInDb(
  orgId: string,
  patientId: string,
  input: {
    title: string;
    description: string | null;
    assignedToId: string | null;
    priority: string;
  },
): Promise<PatientTaskTicket> {
  // Ownership assert: patient must belong to caller org (route also checks; helper is shared).
  const [ownedPatient] = await db
    .select({ id: schema.patients.id })
    .from(schema.patients)
    .where(and(eq(schema.patients.organizationId, orgId), eq(schema.patients.id, patientId)))
    .limit(1);
  if (!ownedPatient) {
    throw new Error("patient_task_tickets: patient does not belong to organization");
  }
  if (input.assignedToId) {
    const [ownedStaff] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.organizationId, orgId), eq(schema.users.id, input.assignedToId)))
      .limit(1);
    if (!ownedStaff) {
      throw new Error("patient_task_tickets: assignee does not belong to organization");
    }
  }
  const [row] = await db
    .insert(schema.patientTaskTickets)
    .values({
      organizationId: orgId,
      patientId,
      assignedToId: input.assignedToId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "pending",
    })
    .returning();
  /*
   * Пустой ответ на вставку означает, что запись не создана. Приводить его к
   * типу через `!` нельзя: маршрут ответил бы 201, экран закрыл бы форму и
   * очистил поля, а поручение не существовало бы. Экран обещает человеку
   * «Введённый текст остался в форме» именно по коду отказа.
   */
  if (!row) {
    throw new Error("patient_task_tickets: вставка не вернула созданную строку");
  }
  return toTicket(row);
}

/**
 * Смена состояния поручения.
 *
 * Возвращает null, если строки с таким id в ЭТОЙ клинике нет — маршрут обязан
 * ответить 404, а не «успешно». Экран переставляет галочку оптимистично, до
 * ответа сервера, и возвращает прежнее значение только по отказу: тихий успех
 * оставил бы на экране отметку о выполнении, которой в базе нет, и задача
 * «перезвонить» считалась бы закрытой без звонка.
 */
export async function setPatientTaskTicketStatusInDb(
  orgId: string,
  patientId: string,
  ticketId: string,
  status: PatientTaskTicketStatus,
): Promise<PatientTaskTicket | null> {
  const [row] = await db
    .update(schema.patientTaskTickets)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(schema.patientTaskTickets.organizationId, orgId),
        eq(schema.patientTaskTickets.patientId, patientId),
        eq(schema.patientTaskTickets.id, ticketId),
      ),
    )
    .returning();
  return row ? toTicket(row) : null;
}

/**
 * Удаление поручения.
 *
 * false означает «такой записи в этой клинике нет». Экран спрашивает
 * подтверждение и по успеху убирает строку из списка, поэтому ответ «удалено»,
 * ничего не удаливший, вернул бы задачу при следующем открытии карты — и человек
 * решил бы, что программа его обманула. Он был бы прав.
 */
export async function deletePatientTaskTicketFromDb(
  orgId: string,
  patientId: string,
  ticketId: string,
): Promise<boolean> {
  const rows = await db
    .delete(schema.patientTaskTickets)
    .where(
      and(
        eq(schema.patientTaskTickets.organizationId, orgId),
        eq(schema.patientTaskTickets.patientId, patientId),
        eq(schema.patientTaskTickets.id, ticketId),
      ),
    )
    .returning({ id: schema.patientTaskTickets.id });
  return rows.length > 0;
}
