/**
 * Укладка сырых строк в стейджинг и фиксация карантина.
 * Layer 1: Staging Store & Quarantine Persistence.
 */

import type { MigrationEntityKind } from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	migrationQuarantineRecords,
	migrationStagingRecords,
} from "../../db/schema.js";
import { rawRowHash } from "../recordResolution.js";
import type { TransformedRow } from "../rowTransform.js";
import { LOAD_BATCH_SIZE } from "./constants.js";
import type { PendingStageItem, StageResult, StagedRow } from "./types.js";

/**
 * Укладывает строки в стейджинг.
 *
 * Повторы внутри источника определяются по отпечатку строки: одна и та же
 * строка, встретившаяся дважды в файле, — это ошибка выгрузки, а не два
 * пациента. Первая остаётся, вторая помечается duplicate и не загружается, но
 * сохраняется целиком.
 */
export async function stageRows(input: {
	runId: string;
	organizationId: string;
	sourceTable: string;
	entityKind: MigrationEntityKind;
	columns: string[];
	rows: string[][];
	/** Номер первой строки данных в источнике (с учётом заголовка). */
	firstRowNumber: number;
	transform: (row: string[], rowNumber: number) => TransformedRow;
	naturalKeyOf: (transformed: TransformedRow) => string | null;
}): Promise<StageResult> {
	const seenHashes = new Map<string, number>();
	const duplicateRowNumbers: number[] = [];

	const pending: PendingStageItem[] = input.rows.map((row, index) => {
		const sourceRowNumber = input.firstRowNumber + index;
		const raw: Record<string, string> = {};
		input.columns.forEach((column, columnIndex) => {
			raw[column] = row[columnIndex] ?? "";
		});

		const rawHash = rawRowHash(raw);
		const firstSeenAt = seenHashes.get(rawHash);
		const isDuplicate = firstSeenAt !== undefined;
		if (!isDuplicate) seenHashes.set(rawHash, sourceRowNumber);
		else duplicateRowNumbers.push(sourceRowNumber);

		const transformed = input.transform(row, sourceRowNumber);
		if (isDuplicate) {
			transformed.issues.push({
				reason: "duplicate_conflict",
				blocking: false,
				fieldPath: null,
				message: `Строка полностью повторяет строку ${firstSeenAt} того же источника и не загружается второй раз.`,
				suggestedFix: null,
			});
		}

		return {
			sourceRowNumber,
			raw,
			rawHash,
			transformed,
			naturalKey: input.naturalKeyOf(transformed),
			isDuplicate,
		};
	});

	// ------------------------------------------------------------------
	// Запись в стейджинг партиями.
	// ------------------------------------------------------------------
	const staged: StagedRow[] = [];

	for (let offset = 0; offset < pending.length; offset += LOAD_BATCH_SIZE) {
		const batch = pending.slice(offset, offset + LOAD_BATCH_SIZE);
		/*
		 * БЫЛО: голый `db` — вне обработчика маршрута это соединение без
		 * тенант-контекста, и INSERT в migration_staging_records под FORCE RLS падал
		 * с 42501 (единственная операция, которая под RLS отказывает ГРОМКО).
		 * СТАЛО: партия укладывается в своей короткой транзакции с арендатором.
		 * Границы — одна партия, чтобы не держать длинную транзакцию на весь прогон.
		 */
		const inserted = await withTenantCtx(input.organizationId, async (tx) =>
			tx
				.insert(migrationStagingRecords)
				.values(
					batch.map((item) => ({
						runId: input.runId,
						organizationId: input.organizationId,
						entityKind: input.entityKind,
						sourceTable: input.sourceTable,
						sourceRowNumber: item.sourceRowNumber,
						rawJson: item.raw,
						rawHash: item.rawHash,
						naturalKey: item.naturalKey,
						normalizedJson: item.transformed.values,
						lineageJson: item.transformed.lineage,
						status: item.isDuplicate
							? ("duplicate" as const)
							: item.transformed.issues.some((issue) => issue.blocking)
								? ("quarantined" as const)
								: ("ready" as const),
						confidence: item.transformed.confidence,
					})),
				)
				/**
				 * Повторный вызов укладки (например, после обрыва связи и повторной
				 * отправки запроса) не должен создавать вторые копии строк. Уникальный
				 * индекс по (run_id, source_table, source_row_number) это гарантирует, а
				 * onConflictDoNothing превращает гонку в безобидную.
				 */
				.onConflictDoNothing({
					target: [
						migrationStagingRecords.runId,
						migrationStagingRecords.sourceTable,
						migrationStagingRecords.sourceRowNumber,
					],
				})
				.returning({
					id: migrationStagingRecords.id,
					sourceRowNumber: migrationStagingRecords.sourceRowNumber,
				}),
		);

		const idByRowNumber = new Map(
			inserted.map((record) => [record.sourceRowNumber, record.id]),
		);

		// Строки, которые уже были уложены ранее, нужно прочитать: их идентификаторы
		// необходимы для привязки карантина.
		const missingRowNumbers = batch
			.map((item) => item.sourceRowNumber)
			.filter((rowNumber) => !idByRowNumber.has(rowNumber));
		if (missingRowNumbers.length > 0) {
			const existing = await withTenantCtx(input.organizationId, async (tx) =>
				tx
					.select({
						id: migrationStagingRecords.id,
						sourceRowNumber: migrationStagingRecords.sourceRowNumber,
					})
					.from(migrationStagingRecords)
					.where(
						and(
							eq(migrationStagingRecords.runId, input.runId),
							eq(migrationStagingRecords.organizationId, input.organizationId),
							eq(migrationStagingRecords.sourceTable, input.sourceTable),
							inArray(
								migrationStagingRecords.sourceRowNumber,
								missingRowNumbers,
							),
						),
					),
			);
			for (const record of existing)
				idByRowNumber.set(record.sourceRowNumber, record.id);
		}

		for (const item of batch) {
			const stagingId = idByRowNumber.get(item.sourceRowNumber);
			if (!stagingId) continue;
			staged.push({
				stagingId,
				sourceRowNumber: item.sourceRowNumber,
				sourceTable: input.sourceTable,
				raw: item.raw,
				rawHash: item.rawHash,
				transformed: item.transformed,
				naturalKey: item.naturalKey,
				issues: item.transformed.issues,
			});
		}
	}

	return { rows: staged, duplicateRowNumbers };
}

/** Записывает карантин для строк с проблемами. */
export async function recordQuarantine(input: {
	runId: string;
	organizationId: string;
	entityKind: MigrationEntityKind;
	rows: StagedRow[];
}): Promise<number> {
	const entries = input.rows.flatMap((row) =>
		row.issues.map((issue) => ({
			runId: input.runId,
			organizationId: input.organizationId,
			stagingRecordId: row.stagingId,
			entityKind: input.entityKind,
			reason: issue.reason,
			blocking: issue.blocking,
			fieldPath: issue.fieldPath,
			message: issue.message,
			suggestedFix: issue.suggestedFix,
		})),
	);

	if (entries.length === 0) return 0;

	let written = 0;
	for (let offset = 0; offset < entries.length; offset += LOAD_BATCH_SIZE) {
		const batch = entries.slice(offset, offset + LOAD_BATCH_SIZE);
		/**
		 * Карантин — это состояние строки, а не журнал попыток: повторный разбор той
		 * же строки не должен плодить одинаковые записи. Уникальный индекс по
		 * (staging_record_id, reason, field_path) с onConflictDoNothing.
		 */
		const inserted = await withTenantCtx(input.organizationId, async (tx) =>
			tx
				.insert(migrationQuarantineRecords)
				.values(batch)
				.onConflictDoNothing()
				.returning({
					id: migrationQuarantineRecords.id,
				}),
		);
		written += inserted.length;
	}
	return written;
}
