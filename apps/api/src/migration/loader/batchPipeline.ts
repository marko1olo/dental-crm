/**
 * Изоляция транзакций строк, перевод ошибок PostgreSQL и загрузка ссылок сущностей.
 * Layer 2: Batch Pipeline & Savepoint Runner.
 */

import type { MigrationEntityKind } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	migrationEntityLinks,
	migrationStagingRecords,
} from "../../db/schema.js";
import type {
	DbTransaction,
	LoadOutcome,
	PostgresErrorFields,
	StagedRow,
} from "./types.js";

/**
 * Извлекает поля ошибки PostgreSQL из исключения Drizzle.
 *
 * Drizzle оборачивает ошибку драйвера, поэтому нужное лежит либо в самом
 * объекте, либо в cause. Проверка идёт через unknown без приведения к any.
 */
export function postgresErrorFields(error: unknown): PostgresErrorFields {
	const candidates: unknown[] = [error];
	if (error !== null && typeof error === "object" && "cause" in error) {
		candidates.push((error as { cause: unknown }).cause);
	}

	for (const candidate of candidates) {
		if (candidate === null || typeof candidate !== "object") continue;
		const record = candidate as Record<string, unknown>;
		if (typeof record.code === "string") {
			return {
				code: record.code,
				constraint:
					typeof record.constraint === "string" ? record.constraint : undefined,
				column: typeof record.column === "string" ? record.column : undefined,
				detail: typeof record.detail === "string" ? record.detail : undefined,
				table: typeof record.table === "string" ? record.table : undefined,
			};
		}
	}
	return {};
}

/**
 * Переводит отказ базы в объяснение для оператора клиники.
 *
 * ЗАЧЕМ
 * Без перевода в карантин попадал текст вида «Failed query: insert into
 * "payments" ("id", "organization_id", ...) values ($1, $2, ...)» — то есть
 * запрос целиком. Администратору клиники такое сообщение не говорит ничего, а
 * ради него карантин и существует: строка отложена, чтобы человек мог её
 * исправить. Коды SQLSTATE переводятся в причину и в действие.
 */
export function explainDatabaseError(error: unknown): {
	message: string;
	suggestedFix: string;
	fieldPath: string | null;
} {
	const fields = postgresErrorFields(error);
	const column = fields.column ?? null;

	switch (fields.code) {
		case "23503":
			return {
				message:
					"ссылка на запись, которой нет в базе. Обычно связанная сущность была удалена уже после переноса.",
				suggestedFix:
					"Проверьте, существует ли связанный пациент или приём, и перенесите сначала его.",
				fieldPath: column,
			};
		case "23505":
			return {
				message: `нарушена уникальность${fields.constraint ? ` (${fields.constraint})` : ""}: такая запись уже есть.`,
				suggestedFix:
					"Это дубль. Либо пропустите строку, либо исправьте отличающее её значение.",
				fieldPath: column,
			};
		case "23502":
			return {
				message: `обязательное поле${column ? ` «${column}»` : ""} пустое, а база не принимает пустое значение.`,
				suggestedFix:
					"Сопоставьте колонку источника с этим полем либо заполните значение вручную.",
				fieldPath: column,
			};
		case "23514":
			return {
				message: `значение не проходит проверку базы${fields.constraint ? ` (${fields.constraint})` : ""}.`,
				suggestedFix:
					"Значение вне допустимого диапазона. Исправьте его в источнике.",
				fieldPath: column,
			};
		case "22001":
			return {
				message: "значение длиннее, чем допускает колонка.",
				suggestedFix:
					"Сократите значение в источнике либо перенесите его в поле примечания.",
				fieldPath: column,
			};
		case "22P02":
		case "22007":
		case "22008":
			return {
				message:
					"значение не приводится к типу колонки (число, дата или перечисление).",
				suggestedFix: "Проверьте, та ли колонка сопоставлена этому полю.",
				fieldPath: column,
			};
		case "22021":
		case "22P05":
			return {
				message:
					"в значении есть байты, недопустимые для базы (например, нулевой символ).",
				suggestedFix:
					"Источник повреждён на уровне байт. Перевыгрузите файл из старой системы.",
				fieldPath: column,
			};
		case "40001":
		case "40P01":
			return {
				message: "конфликт одновременного доступа к базе.",
				suggestedFix:
					"Повторите загрузку: строка не записана и не продублируется.",
				fieldPath: null,
			};
		default: {
			/**
			 * Неизвестный код. Показываем первую строку сообщения без текста запроса:
			 * Drizzle пишет «Failed query: <весь SQL>», и он занимает весь экран,
			 * не добавляя ничего к пониманию.
			 */
			const raw = error instanceof Error ? error.message : String(error);
			const withoutQuery = raw.split(/\n|Failed query:/)[0]?.trim() ?? raw;
			return {
				message: `${withoutQuery.slice(0, 200)}${fields.code ? ` (код ${fields.code})` : ""}`,
				suggestedFix:
					"Причина не распознана автоматически. Строка сохранена целиком и доступна для разбора.",
				fieldPath: column,
			};
		}
	}
}

/**
 * Изоляция ОДНОЙ строки внутри транзакции партии.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ
 * Раньше try/catch стоял вокруг всей партии в 500 строк:
 *
 *     } catch (error) { outcome.failed += batch.length; ... }
 *
 * То есть одна строка, отклонённая базой (нарушение ограничения, слишком
 * длинное значение, конфликт уникальности), уносила с собой 499 исправных.
 * На выгрузке в 100 000 строк это означало, что несколько кривых записей
 * обнуляли результат целых партий, и повторный запуск натыкался на те же строки.
 *
 * Здесь каждая строка получает точку сохранения (SAVEPOINT). Отказ откатывает
 * только её, транзакция партии продолжается, а строка уходит в карантин с
 * текстом ошибки от базы.
 *
 * Точка сохранения на строку стоит примерно как один дополнительный запрос —
 * платить за это разумно: цена альтернативы измеряется сотнями потерянных строк.
 */
export async function loadRowInSavepoint(
	tx: TenantDb,
	row: StagedRow,
	outcome: LoadOutcome,
	entityTitle: string,
	work: (savepoint: DbTransaction) => Promise<void>,
): Promise<void> {
	try {
		// Вложенная транзакция Drizzle — это SAVEPOINT в PostgreSQL.
		await tx.transaction(async (savepoint) => {
			await work(savepoint);
		});
	} catch (error) {
		outcome.failed += 1;
		const explained = explainDatabaseError(error);
		outcome.issuesByStagingId.set(row.stagingId, {
			reason: "target_write_failed",
			blocking: true,
			fieldPath: explained.fieldPath,
			message: `Строка ${row.sourceRowNumber} (${entityTitle}) не записана: ${explained.message}`,
			suggestedFix: `${explained.suggestedFix} Остальные строки партии загружены, эта ждёт в карантине.`,
		});
		/**
		 * Статус строки выставляется через `tx` — транзакцию ПАРТИИ, а не через
		 * откаченную точку сохранения `savepoint`: откат точки сохранения не отменяет
		 * то, что записано в объемлющей транзакции после него.
		 *
		 * БЫЛО `db.update(...)` с обоснованием «отдельной транзакцией, а не в tx».
		 * Обоснование было неверным уже тогда: `db` — это Proxy, подставляющий
		 * АКТИВНУЮ транзакцию из transactionStorage, поэтому внутри партии он и так
		 * разрешался в тот же самый `tx`. Отдельной транзакции здесь никогда не было,
		 * была лишь её видимость. Теперь зависимость названа явно.
		 */
		await tx
			.update(migrationStagingRecords)
			.set({ status: "quarantined", updatedAt: new Date() })
			.where(eq(migrationStagingRecords.id, row.stagingId))
			.catch(() => {
				// Если и это не удалось, строка останется ready и попадёт в сверку как
				// нерешённая — это верный сигнал, а не тихая потеря.
			});
	}
}

/** Существующие ссылки «ключ старой системы → наш uuid» для этой организации. */
export async function loadEntityLinks(
	organizationId: string,
	sourceSystem: string,
	entityKind: MigrationEntityKind,
): Promise<Map<string, string>> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({
				sourceEntityId: migrationEntityLinks.sourceEntityId,
				targetEntityId: migrationEntityLinks.targetEntityId,
			})
			.from(migrationEntityLinks)
			.where(
				and(
					eq(migrationEntityLinks.organizationId, organizationId),
					eq(migrationEntityLinks.sourceSystem, sourceSystem),
					eq(migrationEntityLinks.entityKind, entityKind),
				),
			),
	);
	return new Map(rows.map((row) => [row.sourceEntityId, row.targetEntityId]));
}
