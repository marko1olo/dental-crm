import { db } from "./db/client.js";
import { auditEvents, organizations } from "./db/schema.js";

/**
 * Писатель журнала аудита для пути документов (`db/documentQuery.ts`).
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО (измерено 2026-08-06 на живой базе `dental_crm`,
 * PostgreSQL 18.4, роль `dental`):
 *
 * 1. АВТОРА НЕ БЫЛО В СИГНАТУРЕ ВООБЩЕ. Функция принимала только сущность,
 *    действие и причину, поэтому колонка `audit_events.actor_user_id` по всем
 *    трём событиям документов (`document_created`, `document_issued`,
 *    `document_voided`) заполнялась NULL — не «иногда», а всегда и по
 *    построению. При этом в `voidGeneratedDocumentInDb` идентификатор
 *    аннулировавшего сотрудника ЕСТЬ и пишется в саму строку документа
 *    (`voidedByUserId`), то есть данные были под рукой и терялись на границе
 *    вызова. Событие журнала без субъекта не отвечает на вопрос «кто», ради
 *    которого журнал и ведут. Параметр добавлен необязательным: три
 *    существующих места вызова не ломаются, автор проставляется по мере того,
 *    как вызывающие начнут его передавать.
 *
 * 2. СОБЫТИЕ МОЛЧА ИСЧЕЗАЛО. Было: `if (!orgId) return;` — обычный возврат без
 *    ошибки, без записи и без строки в логе. Вызывающий получал успех, документ
 *    создавался/выдавался/аннулировался, а следа не оставалось. Это худший из
 *    возможных исходов для юридического журнала: не «сбой», а «тишина».
 *
 *    КОГДА ЭТА ВЕТКА СРАБАТЫВАЛА. С миграции 0157 политики RLS fail-closed, и
 *    `select ... from organizations` без активного `withTenantCtx` возвращает
 *    ноль строк (`db/rls.ts:32-37`). То есть пустой `orgId` — это ровно признак
 *    «клиника текущего запроса не установлена». В таком контексте последующий
 *    INSERT в `audit_events` всё равно будет отвергнут политикой: проверено
 *    прямым замером в откаченной транзакции 2026-08-06 —
 *    `INSERT ... without app.current_tenant` -> SQLSTATE **42501**, «новая строка
 *    нарушает политику защиты на уровне строк для таблицы audit_events».
 *    Значит «тихий возврат» не спасал операцию, а лишь прятал неизбежный отказ.
 *
 * 3. ПОЧЕМУ ТЕПЕРЬ ОШИБКА, А НЕ ПРОДОЛЖЕНИЕ. Развилка стоит честно: ронять
 *    операцию или пропускать её без следа. Здесь выбрано ронять, и вот чем это
 *    обосновано именно для этого пути.
 *    - `server.ts:339-354` оборачивает КАЖДЫЙ обработчик маршрута в
 *      `withTenantCtx`, а это транзакция Drizzle. Отказ INSERT внутри неё уже
 *      прерывает транзакцию на уровне PostgreSQL («текущая транзакция
 *      прервана»), и сам документ откатывается вместе с событием. То есть
 *      «операция прошла, следа нет» в этом пути технически недостижима —
 *      прежний `return` создавал лишь иллюзию мягкого отказа.
 *    - Документ (согласие, направление, справка, счёт) — юридически значимая
 *      бумага. Выдать её без записи о выдаче хуже, чем не выдать: ст. 13
 *      323-ФЗ требует прослеживаемости обращения с врачебной тайной, а
 *      Приказ РКН № 179 от 28.10.2022 требует подтверждать уничтожение ПДн
 *      выгрузкой из журнала регистрации событий — из журнала, которого нет,
 *      выгрузить нечего.
 *    Аварийный канал при этом остаётся: перед пробросом пишется одна строка с
 *    ПОЛНЫМ содержимым события, чтобы его можно было восстановить вручную.
 *    Для денежных путей развилка решается иначе и решает её ведущий —
 *    `routes/billing.ts` и `db/billingQuery.ts` вне этой зоны правки.
 */
export async function recordAuditEvent(input: {
  organizationId?: string | null | undefined;
  actorUserId?: string | null | undefined;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string | null | undefined;
}) {
  let orgId = input.organizationId?.trim();
  if (!orgId) {
    const [org] = await db.select().from(organizations).limit(1);
    orgId = org?.id;
  }

  if (!orgId) {
    const message =
      "Событие журнала аудита НЕ записано: клиника не определена ни из аргумента, " +
      "ни из контекста арендатора (RLS fail-closed, см. db/rls.ts). " +
      `Потерянное событие: ${describeAuditEvent(input)}`;
    console.error(`[audit] ${message}`);
    throw new Error(message);
  }

  try {
    await db.insert(auditEvents).values({
      organizationId: orgId,
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      reason: input.reason
    });
  } catch (error) {
    // Аварийный канал: событие целиком уходит в лог одной строкой, чтобы его
    // можно было восстановить, даже если база отвергла запись. Проброс
    // обязателен — молчаливое проглатывание здесь и было исходным дефектом.
    console.error(
      `[audit] ОТКАЗ ЗАПИСИ ЖУРНАЛА. Событие: ${describeAuditEvent({
        ...input,
        organizationId: orgId
      })}. Операция вызывающего должна быть отменена. Причина отказа:`,
      error
    );
    throw error;
  }
}

/**
 * Одна строка со всеми полями события — формат аварийного канала.
 * Причина обрезается: она свободного вида и может быть длинной, а задача строки
 * — дать возможность восстановить событие, а не воспроизвести текст дословно.
 */
function describeAuditEvent(input: {
  organizationId?: string | null | undefined;
  actorUserId?: string | null | undefined;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string | null | undefined;
}): string {
  const reason = input.reason ?? null;
  return JSON.stringify({
    organizationId: input.organizationId?.trim() || null,
    actorUserId: input.actorUserId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    reason: reason && reason.length > 500 ? `${reason.slice(0, 500)}…` : reason,
    occurredAt: new Date().toISOString()
  });
}
