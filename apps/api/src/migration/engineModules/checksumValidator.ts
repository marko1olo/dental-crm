import {
	type MigrationColumnMapping,
	type MigrationSourceProfile,
	migrationEntityKindTitles,
} from "@dental/shared";
import {
	type ColumnProfile,
	maskValueShape,
	profileTable,
} from "../columnProfile.js";
import { mapColumnsWithLlm } from "../llmMapper.js";
import {
	missingRequiredFields,
	resolveDeterministicMapping,
} from "../mapping.js";
import {
	type ParsedSource,
	type ParsedTable,
	parseSource,
} from "../parsers/index.js";
import { sourceMoneyTotalFromRows } from "../sourceMoney.js";
import { type DateFormatHint } from "../valueNormalize.js";
import type { EngineInput, PreparedTable } from "./types.js";

export function decodeContent(contentBase64: string | undefined): Buffer | undefined {
	if (!contentBase64?.trim()) return undefined;
	const clean = contentBase64.includes(",")
		? (contentBase64.split(",").pop() ?? "")
		: contentBase64;
	return Buffer.from(clean, "base64");
}

/**
 * Разбирает источник и строит карту соответствия для каждой таблицы.
 *
 * Вынесено отдельно от прогона, чтобы фаза анализа (предпросмотр в мастере
 * миграции) и фаза переноса использовали ровно один и тот же код. Иначе
 * предпросмотр показывал бы одно, а перенос делал другое — классическая
 * причина недоверия к таким мастерам.
 */
export async function prepareSource(input: EngineInput): Promise<{
	parsed: ParsedSource;
	tables: PreparedTable[];
	warnings: string[];
}> {
	const content = decodeContent(input.contentBase64);
	const parsed = parseSource({
		sourceName: input.sourceName,
		content,
		rawText: input.rawText,
		forcedKind: input.forcedSourceKind,
	});

	const warnings = [...parsed.warnings];
	const tables: PreparedTable[] = [];

	for (const table of parsed.tables) {
		if (table.columns.length === 0) {
			warnings.push(
				`В таблице «${table.name}» не определены колонки — она пропущена.`,
			);
			continue;
		}

		const profiles = profileTable(table.columns, table.rows);

		const deterministic = resolveDeterministicMapping({
			columns: table.columns,
			rows: table.rows,
			profiles,
			tableName: table.name,
			requestedEntityKind: input.requestedEntityKind,
			requestedVendorProfile: input.requestedVendorProfile,
			overrides: input.mappingOverrides,
		});

		let columns: MigrationColumnMapping[] = deterministic.columns;
		let unmapped = deterministic.unmappedColumns;
		const tableWarnings = [...deterministic.warnings];
		let llmCalls = 0;
		let llmRejected = 0;

		// ---- Слой языковой модели: только нераспознанные колонки.
		if (
			input.allowLlm &&
			deterministic.candidatesForLlm.length > 0 &&
			deterministic.entityKind !== "unknown"
		) {
			const llm = await mapColumnsWithLlm({
				entityKind: deterministic.entityKind,
				profiles: deterministic.candidatesForLlm,
				takenFields: new Set(columns.map((column) => column.targetField)),
			});
			columns = [...columns, ...llm.accepted];
			const acceptedColumns = new Set(
				llm.accepted.map((column) => column.sourceColumn),
			);
			unmapped = unmapped.filter((column) => !acceptedColumns.has(column));
			tableWarnings.push(...llm.warnings);
			llmCalls = llm.calls;
			llmRejected = llm.rejected;
		} else if (!input.allowLlm && deterministic.candidatesForLlm.length > 0) {
			tableWarnings.push(
				`Обращение к языковой модели отключено: ${deterministic.candidatesForLlm.length} колонок(а) остались без сопоставления. Их содержимое сохранится в исходном виде, но в поля не запишется.`,
			);
		}

		// ---- Достаточность карты для загрузки.
		const missing = missingRequiredFields(
			deterministic.entityKind,
			columns.map((column) => column.targetField),
		);
		if (missing.length > 0) {
			tableWarnings.push(
				`Для загрузки «${migrationEntityKindTitles[deterministic.entityKind]}» не хватает обязательных полей: ${missing.join(
					", ",
				)}. Сопоставьте нужные колонки вручную — иначе все строки уйдут в карантин.`,
			);
		}

		const dateHints = new Map<string, DateFormatHint>(
			profiles.map((profile) => [profile.name, profile.dateHint]),
		);

		/**
		 * Сумма платежей источника считается ЗДЕСЬ, из исходных значений, до всякой
		 * загрузки. Сверка потом сравнит с ней то, что оказалось в стейджинге, и
		 * поймает суммы, потерянные при разборе.
		 */
		let sourceMoneyTotalKopecks: number | null = null;
		const amountColumn = columns.find(
			(column) => column.targetField === "payment.amountRub",
		);
		if (amountColumn) {
			const index = table.columns.indexOf(amountColumn.sourceColumn);
			if (index >= 0) {
				const sourceMoney = sourceMoneyTotalFromRows(table.rows, index);
				sourceMoneyTotalKopecks = sourceMoney.totalKopecks;
				if (sourceMoney.unreadableCells > 0) {
					tableWarnings.push(
						`Сумма платежей источника НЕ ОПРЕДЕЛЯЕТСЯ: ${sourceMoney.unreadableCells} значени(й) в колонке «${amountColumn.sourceColumn}» суммой не являются, и сколько денег в них записано, не знает никто. Сверка не сможет доказать, что деньги перенесены полностью, — исправьте эти значения в источнике или сопоставьте колонку суммы заново.`,
					);
				} else if (sourceMoney.totalKopecks === null) {
					tableWarnings.push(
						`Сумма платежей источника НЕ ОПРЕДЕЛЯЕТСЯ: в колонке «${amountColumn.sourceColumn}» не заполнено ни одно значение. Сверка сможет сравнить только строки, но не деньги.`,
					);
				}
			}
		}

		tables.push({
			table,
			profiles,
			entityKind: deterministic.entityKind,
			dateHints,
			llmCalls,
			llmRejected,
			sourceMoneyTotalKopecks,
			mapping: {
				vendorProfile: deterministic.vendorProfile?.code ?? null,
				sourceTable: table.name,
				entityKind: deterministic.entityKind,
				columns,
				unmappedColumns: unmapped,
				warnings: tableWarnings,
			},
		});
	}

	return { parsed, tables, warnings };
}

/** Портрет источника для показа оператору. Значения маскируются. */
export function sourceProfileFor(
	parsed: ParsedSource,
	prepared: PreparedTable,
): MigrationSourceProfile {
	return {
		sourceKind: parsed.sourceKind,
		detectedEncoding: parsed.detectedEncoding,
		encodingConfidence: parsed.encodingConfidence,
		delimiter: parsed.delimiter,
		columns: prepared.table.columns,
		rowCount: prepared.table.rows.length,
		/**
		 * В предпросмотр уходят МАСКИ, а не значения. Мастер миграции открывают в
		 * присутствии сотрудников клиники и делают снимки экрана для переписки с
		 * поддержкой; настоящие ФИО и телефоны там не нужны, а форма — нужна.
		 */
		sampleRows: prepared.table.rows.slice(0, 10).map((row) => {
			const record: Record<string, string> = {};
			prepared.table.columns.forEach((column, index) => {
				record[column] = maskValueShape(row[index] ?? "", 32);
			});
			return record;
		}),
		warnings: parsed.warnings,
	};
}
