/**
 * Слияние двух карточек одного человека.
 *
 * ЭТО САМАЯ ОПАСНАЯ ОПЕРАЦИЯ В КАРТОТЕКЕ, поэтому решения приняты так:
 *
 * 1. НИ ОДНА ССЫЛКА НЕ ПОТЕРЯЕТСЯ. На пациента ссылаются 46 колонок в базе:
 *    37 с внешним ключом и 9 без него — посчитано запросом к каталогу, не на
 *    глаз. Список зашивать в код нельзя: добавят таблицу — слияние начнёт
 *    оставлять сирот, и заметят это через месяцы. Поэтому список колонок
 *    берётся из information_schema в момент выполнения.
 *
 * 2. КАРТОЧКА НЕ УДАЛЯЕТСЯ НИКОГДА. Это медицинские данные: удаление лишает
 *    клинику доказательств. Вторая карточка помечается архивной и получает
 *    ссылку merged_into_patient_id — открыв её по старому адресу, администратор
 *    увидит, куда она объединена.
 *
 * 3. ЗАПОЛНЕННОЕ НЕ ПЕРЕТИРАЕТСЯ. В основную карточку переносятся только те
 *    поля, которых там нет: телефон, почта, дата рождения. Затирать телефон
 *    основной карточки телефоном дубля нельзя — неизвестно, какой из них верен.
 *
 * 4. ВСЁ ИЛИ НИЧЕГО. Одна транзакция: при сбое на девятнадцатой таблице
 *    восемнадцать первых не должны остаться перенесёнными.
 *
 * 5. КОНФЛИКТЫ УНИКАЛЬНОСТИ РАЗБИРАЮТСЯ ЯВНО. Таких мест ровно два (проверено
 *    по каталогу уникальных индексов): анамнез — один на пациента, и согласия
 *    на связь — уникальны по каналу и виду. При конфликте остаётся запись
 *    ОСНОВНОЙ карточки: она та, которую администратор оставляет жить.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patients } from "../../db/schema.js";
import { patientDuplicateDecisions } from "../../db/patientsSchema.js";

/** Имя таблицы или колонки из каталога. Защита от подстановки в динамический SQL. */
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export type PatientReferenceColumn = {
  readonly tableName: string;
  readonly columnName: string;
};

/**
 * Все колонки, ссылающиеся на пациента: и по внешнему ключу, и по имени.
 *
 * Колонки без внешнего ключа тоже нужны: их девять, целостность там не
 * поддерживается базой, и именно они остались бы сиротами.
 */
export async function patientReferenceColumns(): Promise<
  PatientReferenceColumn[]
> {
  const result = await db.execute(sql`
		select tc.table_name, kcu.column_name
		from information_schema.table_constraints tc
		join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
		join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
		where tc.constraint_type = 'FOREIGN KEY'
			and tc.table_schema = 'public'
			and ccu.table_name = 'patients'
			and ccu.column_name = 'id'
			and tc.table_name <> 'patients'
		union
		select c.table_name, c.column_name
		from information_schema.columns c
		where c.table_schema = 'public'
			and c.table_name <> 'patients'
			and c.column_name in ('patient_id', 'local_patient_id')
	`);

  const rows =
    (result as unknown as { rows?: Record<string, unknown>[] }).rows ??
    (result as unknown as Record<string, unknown>[]);
  const columns: PatientReferenceColumn[] = [];
  for (const row of rows) {
    const tableName = String(row.table_name ?? "");
    const columnName = String(row.column_name ?? "");
    // Имена приходят из каталога, но проверка обязательна: значение попадёт в
    // динамический SQL, а не в параметр.
    if (!SAFE_IDENTIFIER.test(tableName) || !SAFE_IDENTIFIER.test(columnName))
      continue;
    columns.push({ tableName, columnName });
  }
  return columns.sort((left, right) =>
    left.tableName.localeCompare(right.tableName),
  );
}

/**
 * Места, где перенос упёрся бы в уникальность. Список короткий и проверенный по
 * каталогу; при конфликте побеждает запись основной карточки.
 */
const UNIQUE_CONFLICT_TABLES: readonly {
  table: string;
  column: string;
  scope: readonly string[];
}[] = [
  { table: "patient_anamnesis", column: "patient_id", scope: [] },
  {
    table: "patient_communication_consents",
    column: "patient_id",
    scope: ["organization_id", "channel", "scope"],
  },
];

export type MergeResult =
  | {
      readonly ok: true;
      readonly primaryPatientId: string;
      readonly mergedPatientId: string;
      /** Таблица → сколько строк перенесено. Только непустые. */
      readonly movedRows: Record<string, number>;
      readonly droppedConflicts: Record<string, number>;
      readonly filledFields: string[];
    }
  | { readonly ok: false; readonly reason: string };

export type MergePatientsInput = {
  readonly organizationId: string;
  /** Карточка, которая останется. */
  readonly primaryPatientId: string;
  /** Карточка, которая станет архивной ссылкой на основную. */
  readonly duplicatePatientId: string;
  readonly performedByUserId?: string | null;
  readonly reason?: string | null;
};

export async function mergePatients(
  input: MergePatientsInput,
): Promise<MergeResult> {
  if (input.primaryPatientId === input.duplicatePatientId) {
    return { ok: false, reason: "Указана одна и та же карточка." };
  }

  const bothPatients = await db
    .select({
      id: patients.id,
      fullName: patients.fullName,
      phone: patients.phone,
      email: patients.email,
      birthDate: patients.birthDate,
      notes: patients.notes,
      status: patients.status,
      mergedInto: patients.mergedIntoPatientId,
    })
    .from(patients)
    .where(
      and(
        eq(patients.organizationId, input.organizationId),
        sql`${patients.id} in (${input.primaryPatientId}, ${input.duplicatePatientId})`,
      ),
    );

  const primary = bothPatients.find((row) => row.id === input.primaryPatientId);
  const duplicate = bothPatients.find(
    (row) => row.id === input.duplicatePatientId,
  );
  if (!primary || !duplicate) {
    return { ok: false, reason: "Одна из карточек не найдена в этой клинике." };
  }
  if (duplicate.mergedInto) {
    return { ok: false, reason: "Эта карточка уже объединена с другой." };
  }
  if (primary.mergedInto) {
    return {
      ok: false,
      reason:
        "Основная карточка сама объединена с другой — выберите ту, что осталась.",
    };
  }

  const columns = await patientReferenceColumns();
  if (columns.length === 0) {
    // Пустой список означал бы, что каталог не прочитан: переносить нечего,
    // и молча «успешно объединить» в такой ситуации нельзя.
    return {
      ok: false,
      reason: "Не удалось определить связи карточки в базе. Слияние отменено.",
    };
  }

  const movedRows: Record<string, number> = {};
  const droppedConflicts: Record<string, number> = {};
  const filledFields: string[] = [];

  try {
    await db.transaction(async (tx) => {
      // Сначала снимаем конфликты уникальности, иначе перенос упадёт.
      const conflictPromises = UNIQUE_CONFLICT_TABLES.map(async (conflict) => {
        const scopeMatch =
          conflict.scope.length === 0
            ? sql`true`
            : sql.join(
                conflict.scope.map(
                  (column) =>
                    sql`d.${sql.identifier(column)} = p.${sql.identifier(column)}`,
                ),
                sql` and `,
              );

        const deleted = await tx.execute(sql`
					delete from ${sql.identifier(conflict.table)} d
					where d.${sql.identifier(conflict.column)} = ${input.duplicatePatientId}
						and exists (
							select 1 from ${sql.identifier(conflict.table)} p
							where p.${sql.identifier(conflict.column)} = ${input.primaryPatientId}
								and ${scopeMatch}
						)
					returning d.${sql.identifier(conflict.column)}
				`);
        const count = rowCount(deleted);
        return { table: conflict.table, count };
      });

      const conflictResults = await Promise.all(conflictPromises);
      for (const { table, count } of conflictResults) {
        if (count > 0) droppedConflicts[table] = count;
      }

      const updatePromises = columns.map(async (column) => {
        const updated = await tx.execute(sql`
					update ${sql.identifier(column.tableName)}
					set ${sql.identifier(column.columnName)} = ${input.primaryPatientId}
					where ${sql.identifier(column.columnName)} = ${input.duplicatePatientId}
					returning 1
				`);
        const count = rowCount(updated);
        return { key: `${column.tableName}.${column.columnName}`, count };
      });

      const updateResults = await Promise.all(updatePromises);
      for (const { key, count } of updateResults) {
        if (count > 0) movedRows[key] = count;
      }

      // Переносим только то, чего в основной карточке нет.
      const fill: Record<string, string> = {};
      if (!primary.phone?.trim() && duplicate.phone?.trim()) {
        fill.phone = duplicate.phone.trim();
        filledFields.push("телефон");
      }
      if (!primary.email?.trim() && duplicate.email?.trim()) {
        fill.email = duplicate.email.trim();
        filledFields.push("почта");
      }
      if (!primary.birthDate?.trim() && duplicate.birthDate?.trim()) {
        fill.birthDate = duplicate.birthDate.trim();
        filledFields.push("дата рождения");
      }

      // Заметки не заменяются, а дописываются: в них бывает важное.
      const duplicateNotes = duplicate.notes?.trim();
      const mergedNote = `Объединено из карточки «${duplicate.fullName}»${duplicateNotes ? `. Заметки оттуда: ${duplicateNotes}` : ""}`;
      const nextNotes = primary.notes?.trim()
        ? `${primary.notes.trim()}\n${mergedNote}`
        : mergedNote;

      await tx
        .update(patients)
        .set({ ...fill, notes: nextNotes, updatedAt: new Date() })
        .where(eq(patients.id, input.primaryPatientId));

      // Карточка не удаляется: она становится архивной ссылкой.
      await tx
        .update(patients)
        .set({
          status: "archived",
          mergedIntoPatientId: input.primaryPatientId,
          notes: `Карточка объединена с «${primary.fullName}». Все записи, оплаты и снимки перенесены туда.`,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, input.duplicatePatientId));

      const [left, right] =
        input.primaryPatientId < input.duplicatePatientId
          ? [input.primaryPatientId, input.duplicatePatientId]
          : [input.duplicatePatientId, input.primaryPatientId];

      await tx
        .insert(patientDuplicateDecisions)
        .values({
          organizationId: input.organizationId,
          leftPatientId: left,
          rightPatientId: right,
          decision: "merged",
          decidedByUserId: input.performedByUserId ?? null,
          reason: input.reason ?? null,
          movedRowsJson: JSON.stringify({
            movedRows,
            droppedConflicts,
            filledFields,
          }),
        })
        .onConflictDoUpdate({
          target: [
            patientDuplicateDecisions.organizationId,
            patientDuplicateDecisions.leftPatientId,
            patientDuplicateDecisions.rightPatientId,
          ],
          set: {
            decision: "merged",
            decidedByUserId: input.performedByUserId ?? null,
            reason: input.reason ?? null,
            movedRowsJson: JSON.stringify({
              movedRows,
              droppedConflicts,
              filledFields,
            }),
            decidedAt: new Date(),
          },
        });
    });
  } catch (error) {
    return {
      ok: false,
      reason: `Слияние отменено, карточки не изменены: ${error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)}`,
    };
  }

  return {
    ok: true,
    primaryPatientId: input.primaryPatientId,
    mergedPatientId: input.duplicatePatientId,
    movedRows,
    droppedConflicts,
    filledFields,
  };
}

/** Число затронутых строк из ответа драйвера: форма отличается между вызовами. */
function rowCount(result: unknown): number {
  if (!result) return 0;
  const asRecord = result as {
    rowCount?: number;
    rows?: unknown[];
    length?: number;
  };
  if (typeof asRecord.rowCount === "number") return asRecord.rowCount;
  if (Array.isArray(asRecord.rows)) return asRecord.rows.length;
  if (typeof asRecord.length === "number") return asRecord.length;
  return 0;
}

/** «Это разные люди, больше не предлагать». */
export async function dismissDuplicatePair(input: {
  readonly organizationId: string;
  readonly leftPatientId: string;
  readonly rightPatientId: string;
  readonly performedByUserId?: string | null;
  readonly reason?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (input.leftPatientId === input.rightPatientId) {
    return { ok: false, reason: "Указана одна и та же карточка." };
  }

  const [left, right] =
    input.leftPatientId < input.rightPatientId
      ? [input.leftPatientId, input.rightPatientId]
      : [input.rightPatientId, input.leftPatientId];

  await db
    .insert(patientDuplicateDecisions)
    .values({
      organizationId: input.organizationId,
      leftPatientId: left,
      rightPatientId: right,
      decision: "dismissed",
      decidedByUserId: input.performedByUserId ?? null,
      reason: input.reason ?? null,
    })
    .onConflictDoUpdate({
      target: [
        patientDuplicateDecisions.organizationId,
        patientDuplicateDecisions.leftPatientId,
        patientDuplicateDecisions.rightPatientId,
      ],
      set: {
        decision: "dismissed",
        decidedByUserId: input.performedByUserId ?? null,
        reason: input.reason ?? null,
        decidedAt: new Date(),
      },
    });

  return { ok: true };
}
