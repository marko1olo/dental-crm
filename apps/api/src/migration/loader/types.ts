/**
 * Типы и контракты подсистемы загрузки данных миграции.
 * Layer 0: Types & DTO contracts.
 */

import type { db } from "../../db/client.js";
import type { RowIssue, TransformedRow } from "../rowTransform.js";

/** Пояс переноса и признак того, известен ли настоящий пояс клиники. */
export interface MigrationTimeZone {
	/** Имя пояса для `storedDateTimeToUtc`. */
	readonly readingZone: string;
	/** false — пояс клиники не определён, сдвиг не применяется. */
	readonly known: boolean;
}

/** Момент из источника: либо он известен, либо неизвестен. Третьего нет. */
export type TransferredMoment =
	| { readonly known: true; readonly at: Date }
	| { readonly known: false };

/**
 * Тип ТОЧКИ СОХРАНЕНИЯ (вложенной транзакции). Выводится из сигнатуры
 * db.transaction, а не пишется руками: при обновлении драйвера тип поедет
 * вместе с ним.
 *
 * ЭТО НЕ ТО ЖЕ, ЧТО ВНЕШНИЙ ДЕСКРИПТОР. Партию теперь открывает withTenantCtx,
 * и он отдаёт `TenantDb` (NodePgDatabase), а не `PgTransaction`: у последнего
 * есть rollback/setTransaction, которых у первого нет. Вложенный вызов
 * `tx.transaction(...)` внутри партии по-прежнему даёт настоящий PgTransaction —
 * это и есть SAVEPOINT, и именно он описывается этим типом.
 */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Псевдоним для чистоты сигнатур savepoint-раннеров. */
export type SavepointTx = DbTransaction;

/** Поля ошибки PostgreSQL, которые приходят через драйвер node-postgres. */
export interface PostgresErrorFields {
	code?: string | undefined;
	constraint?: string | undefined;
	column?: string | undefined;
	detail?: string | undefined;
	table?: string | undefined;
}

export interface StagedRow {
	stagingId: string;
	sourceRowNumber: number;
	sourceTable: string;
	raw: Record<string, string>;
	rawHash: string;
	transformed: TransformedRow;
	naturalKey: string | null;
	/** Проблемы, обнаруженные до загрузки. */
	issues: RowIssue[];
}

export interface StageResult {
	rows: StagedRow[];
	/** Строки, оказавшиеся буквальными повторами внутри источника. */
	duplicateRowNumbers: number[];
}

export interface LoadOutcome {
	created: number;
	updated: number;
	duplicates: number;
	failed: number;
	/** Проблемы, возникшие именно при записи. */
	issuesByStagingId: Map<string, RowIssue>;
}

export interface PendingStageItem {
	sourceRowNumber: number;
	raw: Record<string, string>;
	rawHash: string;
	transformed: TransformedRow;
	naturalKey: string | null;
	isDuplicate: boolean;
}
