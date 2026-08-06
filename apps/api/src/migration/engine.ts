import {
	type MigrationAnalyzeResponse,
	type MigrationColumnMapping,
	type MigrationEntityKind,
	type MigrationMappingSnapshot,
	type MigrationQuarantineItem,
	type MigrationRunResponse,
	type MigrationRunSummary,
	type MigrationSourceProfile,
	type MigrationTargetField,
	migrationEntityKindTitles,
} from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { withTenantCtx } from "../db/rls.js";
import {
	appointments,
	auditEvents,
	migrationEntityLinks,
	migrationQuarantineRecords,
	migrationRuns,
	migrationStagingRecords,
	patients,
	payments,
	visits,
} from "../db/schema.js";
import {
	type ColumnProfile,
	maskValueShape,
	profileTable,
} from "./columnProfile.js";
import { naturalKeyFor, sourceFingerprint } from "./identity.js";
import { mapColumnsWithLlm } from "./llmMapper.js";
import {
	loaderFor,
	recordQuarantine,
	type StagedRow,
	stageRows,
} from "./loader.js";
import {
	missingRequiredFields,
	resolveDeterministicMapping,
} from "./mapping.js";
import {
	type ParsedSource,
	type ParsedTable,
	parseSource,
} from "./parsers/index.js";
import { reconcileRun } from "./reconcile.js";
import { transformRow } from "./rowTransform.js";
import { sourceMoneyTotalFromRows } from "./sourceMoney.js";
import { type DateFormatHint, dateOnlyPart } from "./valueNormalize.js";

/**
 * Управляющий движок переноса.
 *
 * Порядок фаз и почему он такой:
 *
 *   разбор → портрет колонок → сопоставление правилами → сопоставление моделью
 *   → укладка в стейджинг → карантин → загрузка → сверка
 *
 * Сопоставление моделью стоит ПОСЛЕ правил, потому что правила надёжнее и
 * дешевле; модель получает только то, что не разобрано, и её решения не могут
 * перебить решения правил.
 *
 * Укладка в стейджинг стоит ПЕРЕД загрузкой и является отдельной фазой, а не
 * шагом внутри загрузки: если загрузка не удастся, исходные строки уже сохранены
 * дословно, и повторный запуск не требует ни файла, ни повторного разбора.
 *
 * Сверка стоит последней и читает стейджинг, а не счётчики загрузчика.
 */

/** Порог уверенности, ниже которого строка выносится на проверку человеком. */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.55;

/** Максимум записей карантина в ответе — остальное запрашивается отдельно. */
const QUARANTINE_PREVIEW_LIMIT = 50;

export interface EngineInput {
	organizationId: string;
	startedByUserId?: string | null;
	sourceName: string;
	rawText?: string;
	contentBase64?: string;
	forcedSourceKind?: MigrationSourceProfile["sourceKind"];
	requestedEntityKind?: MigrationEntityKind;
	requestedVendorProfile?: string;
	allowLlm: boolean;
	dryRun: boolean;
	sourceSystem: string;
	mappingOverrides: Array<{
		sourceColumn: string;
		targetField: MigrationTargetField;
	}>;
}

interface PreparedTable {
	table: ParsedTable;
	profiles: ColumnProfile[];
	mapping: MigrationMappingSnapshot;
	entityKind: MigrationEntityKind;
	dateHints: Map<string, DateFormatHint>;
	llmCalls: number;
	llmRejected: number;
	/** Точная сумма платежей источника в копейках, посчитанная до загрузки. */
	sourceMoneyTotalKopecks: number | null;
}

function decodeContent(contentBase64: string | undefined): Buffer | undefined {
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
async function prepareSource(input: EngineInput): Promise<{
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
function sourceProfileFor(
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

/**
 * Фаза анализа: разбор, определение кодировки, карта соответствия и оценка того,
 * сколько строк пройдёт. Ничего не записывает, даже в стейджинг.
 */
export async function analyzeSource(
	input: EngineInput,
): Promise<MigrationAnalyzeResponse> {
	const { parsed, tables, warnings } = await prepareSource(input);

	if (tables.length === 0) {
		throw new Error(
			`Источник «${input.sourceName}» не содержит распознаваемых таблиц. ${warnings.join(" ")}`.trim(),
		);
	}

	// Анализ показывает первую таблицу; остальные упоминаются в предупреждениях.
	const primary = tables[0]!;

	let projectedReady = 0;
	let projectedQuarantine = 0;
	const findingsByMessage = new Map<
		string,
		{ severity: "info" | "warning" | "blocker"; rows: number }
	>();

	for (const [index, row] of primary.table.rows.entries()) {
		const transformed = transformRow({
			entityKind: primary.entityKind,
			columns: primary.table.columns,
			row,
			mapping: primary.mapping.columns,
			dateHints: primary.dateHints,
			confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
		});

		const blocking = transformed.issues.some((issue) => issue.blocking);
		if (blocking) projectedQuarantine += 1;
		else projectedReady += 1;

		for (const issue of transformed.issues) {
			/**
			 * Замечания группируются по смыслу, а не показываются построчно: «нет
			 * телефона у 340 строк» — полезно, а 340 отдельных сообщений оператор
			 * закроет не читая. Номер строки в тексте заменяется на «N».
			 */
			const key = `${issue.reason}|${issue.fieldPath ?? ""}|${issue.message.replace(/\d+/g, "N")}`;
			const existing = findingsByMessage.get(key);
			if (existing) existing.rows += 1;
			else {
				findingsByMessage.set(key, {
					severity: issue.blocking ? "blocker" : "warning",
					rows: 1,
				});
			}
		}
		void index;
	}

	const qualityFindings = [
		...[...findingsByMessage.entries()].map(([key, value]) => ({
			severity: value.severity,
			message: key.split("|").slice(2).join("|"),
			affectedRows: value.rows,
		})),
		...primary.mapping.warnings.map((message) => ({
			severity: "warning" as const,
			message,
			affectedRows: 0,
		})),
		...warnings.map((message) => ({
			severity: "info" as const,
			message,
			affectedRows: 0,
		})),
	]
		// Сначала блокирующее и то, что затрагивает больше строк.
		.sort((left, right) => {
			const weight = { blocker: 0, warning: 1, info: 2 } as const;
			const bySeverity = weight[left.severity] - weight[right.severity];
			return bySeverity !== 0
				? bySeverity
				: right.affectedRows - left.affectedRows;
		})
		.slice(0, 40);

	if (tables.length > 1) {
		qualityFindings.unshift({
			severity: "info",
			message: `В источнике ${tables.length} таблиц(ы): ${tables
				.map(
					(item) =>
						`${item.table.name} → ${migrationEntityKindTitles[item.entityKind]}`,
				)
				.join("; ")}. Перенос обработает все.`,
			affectedRows: 0,
		});
	}

	return {
		sourceName: input.sourceName,
		profile: sourceProfileFor(parsed, primary),
		mapping: primary.mapping,
		projectedReady,
		projectedQuarantine,
		qualityFindings,
	};
}

function summaryFrom(
	run: typeof migrationRuns.$inferSelect,
): MigrationRunSummary {
	return {
		runId: run.id,
		sourceName: run.sourceName,
		sourceKind: run.sourceKind,
		vendorProfile: run.vendorProfile,
		status: run.status,
		dryRun: run.dryRun,
		sourceRows: run.sourceRows,
		stagedRows: run.stagedRows,
		loadedRows: run.loadedRows,
		updatedRows: run.updatedRows,
		duplicateRows: run.duplicateRows,
		quarantinedRows: run.quarantinedRows,
		skippedRows: run.skippedRows,
		llmCalls: run.llmCalls,
		llmRejectedSuggestions: run.llmRejectedSuggestions,
		startedAt: run.startedAt?.toISOString() ?? null,
		finishedAt: run.finishedAt?.toISOString() ?? null,
		errorMessage: run.errorMessage,
	};
}

/**
 * Полный прогон переноса.
 *
 * Значение dryRun по умолчанию true не случайно: перенос чужой базы начинается
 * с сухого прогона, где видно, что получится, и ничего не записывается. Запись
 * требует явного отключения сухого прогона оператором.
 */
export async function runMigration(
	input: EngineInput,
): Promise<MigrationRunResponse> {
	const content = decodeContent(input.contentBase64);
	const fingerprint = sourceFingerprint(content ?? input.rawText ?? "");

	const { parsed, tables, warnings } = await prepareSource(input);
	if (tables.length === 0) {
		throw new Error(
			`Источник «${input.sourceName}» не содержит распознаваемых таблиц. ${warnings.join(" ")}`.trim(),
		);
	}

	const totalSourceRows = tables.reduce(
		(sum, item) => sum + item.table.rows.length,
		0,
	);

	// ------------------------------------------------------------------
	// Прогон создаётся до любой обработки: если процесс упадёт, останется след.
	// ------------------------------------------------------------------
	const [run] = await withTenantCtx(input.organizationId, async (tx) =>
		tx
			.insert(migrationRuns)
			.values({
				organizationId: input.organizationId,
				sourceName: input.sourceName,
				sourceKind: parsed.sourceKind,
				sourceFingerprint: fingerprint,
				sourceBytes: content?.length ?? Buffer.byteLength(input.rawText ?? ""),
				detectedEncoding: parsed.detectedEncoding,
				encodingConfidence: parsed.encodingConfidence,
				vendorProfile: tables[0]!.mapping.vendorProfile,
				status: "staging",
				dryRun: input.dryRun,
				sourceRows: totalSourceRows,
				mappingJson: tables[0]!.mapping,
				llmCalls: tables.reduce((sum, item) => sum + item.llmCalls, 0),
				llmRejectedSuggestions: tables.reduce(
					(sum, item) => sum + item.llmRejected,
					0,
				),
				startedByUserId: input.startedByUserId ?? null,
				startedAt: new Date(),
			})
			.returning(),
	);

	if (!run) throw new Error("Не удалось создать запись прогона переноса.");

	try {
		let stagedTotal = 0;
		let loadedTotal = 0;
		let updatedTotal = 0;
		let duplicateTotal = 0;
		let quarantinedTotal = 0;
		/** Точная сумма платежей источника в копейках — независимая точка отсчёта сверки. */
		let sourceMoneyTotalKopecks: number | null = null;
		/**
		 * Хотя бы одна таблица с платежами, чью сумму определить не удалось, делает
		 * НЕОПРЕДЕЛИМОЙ сумму всего прогона.
		 *
		 * БЫЛО: `sourceMoneyTotalKopecks = (sourceMoneyTotalKopecks ?? 0) + prepared…`
		 * с пропуском null-таблиц. Тот же дефект, что и внутри таблицы, но на уровень
		 * выше: из двух таблиц с платежами одна могла быть неопределимой, и её деньги
		 * входили в итог слагаемым 0. Сверка получала число, считала его суммой ВСЕГО
		 * источника и снова печатала «разобрана полностью» — теперь уже про источник,
		 * половина которого не сосчитана.
		 */
		let sourceMoneyUndeterminable = false;

		for (const prepared of tables) {
			if (
				prepared.entityKind === "payment" &&
				prepared.sourceMoneyTotalKopecks === null
			) {
				sourceMoneyUndeterminable = true;
			}
			if (prepared.sourceMoneyTotalKopecks !== null) {
				sourceMoneyTotalKopecks =
					(sourceMoneyTotalKopecks ?? 0) + prepared.sourceMoneyTotalKopecks;
			}

			// ---- Укладка в стейджинг.
			const staged = await stageRows({
				runId: run.id,
				organizationId: input.organizationId,
				sourceTable: prepared.table.name,
				entityKind: prepared.entityKind,
				columns: prepared.table.columns,
				rows: prepared.table.rows,
				// Номер первой строки данных: 2 при наличии заголовка, 1 без него.
				firstRowNumber: 2,
				transform: (row) =>
					transformRow({
						entityKind: prepared.entityKind,
						columns: prepared.table.columns,
						row,
						mapping: prepared.mapping.columns,
						dateHints: prepared.dateHints,
						confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
					}),
				naturalKeyOf: (transformed) => {
					/**
					 * В бизнес-ключ идёт только календарная часть даты. Если брать дату со
					 * временем, то исправление времени приёма в старой системе между двумя
					 * выгрузками дало бы другой ключ, и повторный перенос завёл бы второй
					 * приём вместо обновления первого.
					 */
					const rawDate = (transformed.values.date ??
						transformed.values.paidAt ??
						transformed.values.startsAt) as string | undefined;
					return naturalKeyFor(prepared.entityKind, {
						externalId: transformed.values.externalId as string | undefined,
						fullName: (transformed.values.fullName ??
							transformed.values.name) as string | undefined,
						phone: transformed.values.phone as string | undefined,
						birthDate: transformed.values.birthDate as string | undefined,
						date: rawDate ? dateOnlyPart(rawDate) : undefined,
						amountRub: transformed.values.amountRub as number | undefined,
						patientKey: transformed.values.patientRef as string | undefined,
						toothCode: transformed.values.toothCode as string | undefined,
					});
				},
			});

			stagedTotal += staged.rows.length;

			// ---- Строки, помеченные разбором источника как подозрительные.
			const suspect = new Set(
				prepared.table.suspectRowNumbers.map((rowNumber) => rowNumber + 1),
			);
			for (const row of staged.rows) {
				if (suspect.has(row.sourceRowNumber)) {
					row.issues.push({
						reason: "row_too_large",
						blocking: false,
						fieldPath: null,
						message:
							"Строка разобрана с оговорками: число ячеек не совпало с заголовком либо в ней остались нечитаемые символы.",
						suggestedFix:
							"Проверьте строку в источнике; данные сохранены целиком.",
					});
				}
			}

			await recordQuarantine({
				runId: run.id,
				organizationId: input.organizationId,
				entityKind: prepared.entityKind,
				rows: staged.rows,
			});

			// ---- Загрузка.
			const loader = loaderFor(prepared.entityKind);
			if (!loader) {
				warnings.push(
					`Сущность «${migrationEntityKindTitles[prepared.entityKind]}» разобрана и сохранена в стейджинге, но автоматическая загрузка для неё не выполняется: в нашей модели у неё есть связи, которые нельзя создать без решения оператора.`,
				);
				// Строки помечаются пропущенными, а не остаются без исхода — иначе сверка
				// справедливо признает их потерянными.
				// БЫЛО без контекста арендатора: UPDATE под FORCE RLS совпадал с нулём
				// строк, и статус «skipped» не выставлялся. СТАЛО — с контекстом.
				await withTenantCtx(input.organizationId, async (tx) => {
					await tx
						.update(migrationStagingRecords)
						.set({ status: "skipped", updatedAt: new Date() })
						.where(
							and(
								eq(migrationStagingRecords.runId, run.id),
								eq(
									migrationStagingRecords.organizationId,
									input.organizationId,
								),
								eq(migrationStagingRecords.sourceTable, prepared.table.name),
								eq(migrationStagingRecords.status, "ready"),
							),
						);
				});
				continue;
			}

			/**
			 * БЫЛО `db.update(...)` без тенант-контекста: `migration_runs` под
			 * FORCE RLS, поэтому UPDATE молча совпадал с нулём строк и статус
			 * «loading» снаружи не появлялся никогда. СТАЛО — короткая транзакция
			 * с контекстом арендатора.
			 */
			await withTenantCtx(input.organizationId, async (tx) => {
				await tx
					.update(migrationRuns)
					.set({ status: "loading", updatedAt: new Date() })
					.where(
						and(
							eq(migrationRuns.id, run.id),
							eq(migrationRuns.organizationId, input.organizationId),
						),
					);
			});

			const outcome = await loader({
				runId: run.id,
				organizationId: input.organizationId,
				sourceSystem: input.sourceSystem,
				sourceName: input.sourceName,
				rows: staged.rows,
				dryRun: input.dryRun,
			});

			loadedTotal += outcome.created;
			updatedTotal += outcome.updated;
			duplicateTotal += outcome.duplicates;

			// ---- Проблемы, возникшие при загрузке, тоже попадают в карантин.
			const loadIssueRows: StagedRow[] = [];
			for (const [stagingId, issue] of outcome.issuesByStagingId) {
				const row = staged.rows.find(
					(candidate) => candidate.stagingId === stagingId,
				);
				if (row) loadIssueRows.push({ ...row, issues: [issue] });
			}
			if (loadIssueRows.length > 0) {
				await recordQuarantine({
					runId: run.id,
					organizationId: input.organizationId,
					entityKind: prepared.entityKind,
					rows: loadIssueRows,
				});
			}

			/**
			 * В сухом прогоне строки остаются в стейджинге как ready. Помечаем их
			 * пропущенными, чтобы баланс сверки был замкнут и в этом режиме.
			 */
			if (input.dryRun) {
				await withTenantCtx(input.organizationId, async (tx) => {
					await tx
						.update(migrationStagingRecords)
						.set({ status: "skipped", updatedAt: new Date() })
						.where(
							and(
								eq(migrationStagingRecords.runId, run.id),
								eq(
									migrationStagingRecords.organizationId,
									input.organizationId,
								),
								eq(migrationStagingRecords.sourceTable, prepared.table.name),
								eq(migrationStagingRecords.status, "ready"),
							),
						);
				});
			}
		}

		// ---- Фактическое число изолированных строк — из базы, а не из счётчиков.
		const [quarantinedRow, skippedRow] = await withTenantCtx(
			input.organizationId,
			async (tx) => {
				const [quarantined] = await tx
					.select({ rows: sql<string>`count(*)` })
					.from(migrationStagingRecords)
					.where(
						and(
							eq(migrationStagingRecords.runId, run.id),
							eq(migrationStagingRecords.organizationId, input.organizationId),
							eq(migrationStagingRecords.status, "quarantined"),
						),
					);
				const [skipped] = await tx
					.select({ rows: sql<string>`count(*)` })
					.from(migrationStagingRecords)
					.where(
						and(
							eq(migrationStagingRecords.runId, run.id),
							eq(migrationStagingRecords.organizationId, input.organizationId),
							eq(migrationStagingRecords.status, "skipped"),
						),
					);
				return [quarantined, skipped] as const;
			},
		);
		quarantinedTotal = Number(quarantinedRow?.rows ?? 0);
		const skippedTotal = Number(skippedRow?.rows ?? 0);

		// ---- Сверка.
		const reconciliation = await reconcileRun({
			runId: run.id,
			organizationId: input.organizationId,
			sourceRowsParsed: totalSourceRows,
			sourceMoneyTotalKopecks: sourceMoneyUndeterminable
				? null
				: sourceMoneyTotalKopecks,
			dryRun: input.dryRun,
		});

		const status = input.dryRun
			? "validated"
			: quarantinedTotal > 0
				? "completed_with_quarantine"
				: reconciliation.balanced
					? "completed"
					: "failed";

		const [finished] = await withTenantCtx(input.organizationId, async (tx) =>
			tx
				.update(migrationRuns)
				.set({
					status,
					stagedRows: stagedTotal,
					loadedRows: loadedTotal,
					updatedRows: updatedTotal,
					duplicateRows: duplicateTotal,
					quarantinedRows: quarantinedTotal,
					skippedRows: skippedTotal,
					finishedAt: new Date(),
					updatedAt: new Date(),
					errorMessage: reconciliation.balanced
						? null
						: "Сверка не сошлась: часть строк не учтена. Подробности в отчёте сверки.",
				})
				.where(
					and(
						eq(migrationRuns.id, run.id),
						eq(migrationRuns.organizationId, input.organizationId),
					),
				)
				.returning(),
		);

		if (!input.dryRun) {
			// БЫЛО без контекста: INSERT в таблицу под RLS падал бы с 42501 (запись
			// громкая, в отличие от чтения). СТАЛО — контекст арендатора.
			await withTenantCtx(input.organizationId, async (tx) => {
				await tx.insert(auditEvents).values({
					organizationId: input.organizationId,
					actorUserId: input.startedByUserId ?? null,
					entityType: "migration_run",
					entityId: run.id,
					action: "migration_completed",
					reason: `Перенос из «${input.sourceName}»: создано ${loadedTotal}, обновлено ${updatedTotal}, дублей ${duplicateTotal}, в карантине ${quarantinedTotal}. Сверка ${
						reconciliation.balanced ? "сошлась" : "НЕ сошлась"
					}.`,
				});
			});
		}

		const quarantinePreview = await listQuarantine(
			input.organizationId,
			run.id,
			QUARANTINE_PREVIEW_LIMIT,
		);

		return {
			run: summaryFrom(finished ?? run),
			mapping: {
				...tables[0]!.mapping,
				warnings: [...tables[0]!.mapping.warnings, ...warnings],
			},
			reconciliation,
			quarantinePreview,
		};
	} catch (error) {
		/**
		 * Прогон помечается неудачным, но стейджинг НЕ удаляется: сохранённые
		 * исходные строки — единственное, что позволит понять причину и продолжить
		 * без повторной выгрузки из старой системы.
		 */
		const message = error instanceof Error ? error.message : String(error);
		await withTenantCtx(input.organizationId, async (tx) => {
			await tx
				.update(migrationRuns)
				.set({
					status: "failed",
					errorClass:
						error instanceof Error ? error.constructor.name : "UnknownError",
					errorMessage: message.slice(0, 2000),
					finishedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(migrationRuns.id, run.id),
						eq(migrationRuns.organizationId, input.organizationId),
					),
				);
		});
		throw error;
	}
}

/** Записи карантина прогона с привязкой к строке источника. */
export async function listQuarantine(
	organizationId: string,
	runId: string,
	limit = 200,
	offset = 0,
): Promise<MigrationQuarantineItem[]> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({
				id: migrationQuarantineRecords.id,
				stagingRecordId: migrationQuarantineRecords.stagingRecordId,
				entityKind: migrationQuarantineRecords.entityKind,
				reason: migrationQuarantineRecords.reason,
				blocking: migrationQuarantineRecords.blocking,
				fieldPath: migrationQuarantineRecords.fieldPath,
				message: migrationQuarantineRecords.message,
				suggestedFix: migrationQuarantineRecords.suggestedFix,
				resolution: migrationQuarantineRecords.resolution,
				sourceRowNumber: migrationStagingRecords.sourceRowNumber,
				sourceTable: migrationStagingRecords.sourceTable,
			})
			.from(migrationQuarantineRecords)
			.leftJoin(
				migrationStagingRecords,
				eq(
					migrationQuarantineRecords.stagingRecordId,
					migrationStagingRecords.id,
				),
			)
			.where(
				and(
					eq(migrationQuarantineRecords.runId, runId),
					eq(migrationQuarantineRecords.organizationId, organizationId),
				),
			)
			// Блокирующее вперёд: это то, что требует действия.
			.orderBy(
				desc(migrationQuarantineRecords.blocking),
				migrationQuarantineRecords.createdAt,
			)
			.limit(limit)
			.offset(offset),
	);

	return rows.map((row) => ({
		id: row.id,
		stagingRecordId: row.stagingRecordId,
		entityKind: row.entityKind,
		reason: row.reason,
		blocking: row.blocking,
		fieldPath: row.fieldPath,
		message: row.message,
		suggestedFix: row.suggestedFix,
		resolution: row.resolution,
		sourceRowNumber: row.sourceRowNumber,
		sourceTable: row.sourceTable,
	}));
}

/** Прогоны организации, свежие первыми. */
export async function listRuns(
	organizationId: string,
	limit = 50,
): Promise<MigrationRunSummary[]> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select()
			.from(migrationRuns)
			.where(eq(migrationRuns.organizationId, organizationId))
			.orderBy(desc(migrationRuns.createdAt))
			.limit(limit),
	);
	return rows.map(summaryFrom);
}

// ---------------------------------------------------------------------------
// Откат
// ---------------------------------------------------------------------------

/**
 * Порядок удаления при откате: от зависимых сущностей к тем, на кого ссылаются.
 * Платежи и приёмы ссылаются на пациента, поэтому пациент удаляется последним.
 */
const ROLLBACK_ORDER: MigrationEntityKind[] = [
	"payment",
	"visit",
	"appointment",
	"tooth_state",
	"patient",
];

export interface RollbackOutcome {
	entityKind: MigrationEntityKind;
	deleted: number;
	retained: number;
	retainedReason: string | null;
}

/**
 * Отменяет загрузку прогона.
 *
 * Удаляется ТОЛЬКО то, что создал этот прогон: список берётся из
 * migration_entity_links, где записана каждая созданная сущность. Записи,
 * обновлённые прогоном (status = updated), не удаляются — они существовали до
 * него, и удалить их значило бы уничтожить данные клиники.
 *
 * Сущность, на которую после переноса уже сослались новой работой (пациенту
 * записали приём в новой системе), не удаляется: она сохраняется, и о ней
 * сообщается отдельно. Молча удалить её каскадом означало бы потерять работу,
 * сделанную после переноса.
 */
export async function rollbackRun(input: {
	organizationId: string;
	runId: string;
	actorUserId?: string | null;
}): Promise<{
	outcomes: RollbackOutcome[];
	status: "rolled_back";
	message: string;
}> {
	const [run] = await withTenantCtx(input.organizationId, async (tx) =>
		tx
			.select()
			.from(migrationRuns)
			.where(
				and(
					eq(migrationRuns.id, input.runId),
					eq(migrationRuns.organizationId, input.organizationId),
				),
			),
	);

	if (!run) throw new Error("Прогон переноса не найден в этой организации.");
	if (run.status === "rolled_back") throw new Error("Этот прогон уже откачен.");
	if (run.dryRun)
		throw new Error("Сухой прогон ничего не записывал — откатывать нечего.");

	const links = await withTenantCtx(input.organizationId, async (tx) =>
		tx
			.select({
				id: migrationEntityLinks.id,
				entityKind: migrationEntityLinks.entityKind,
				targetEntityId: migrationEntityLinks.targetEntityId,
			})
			.from(migrationEntityLinks)
			.where(
				and(
					eq(migrationEntityLinks.createdByRunId, input.runId),
					eq(migrationEntityLinks.organizationId, input.organizationId),
				),
			),
	);

	const byKind = new Map<MigrationEntityKind, string[]>();
	for (const link of links) {
		const group = byKind.get(link.entityKind) ?? [];
		group.push(link.targetEntityId);
		byKind.set(link.entityKind, group);
	}

	const outcomes: RollbackOutcome[] = [];

	/**
	 * БЫЛО `db.transaction(...)` без тенант-контекста. Откат — это DELETE по
	 * боевым таблицам под FORCE RLS, а DELETE под RLS МОЛЧА совпадает с нулём
	 * строк: откат «проходил» и отчитывался «удалено 0», ничего не удалив.
	 * СТАЛО: та же одна транзакция (откат обязан быть неделим — иначе половина
	 * удалена, половина нет), но с установленным арендатором.
	 */
	await withTenantCtx(input.organizationId, async (tx) => {
		for (const entityKind of ROLLBACK_ORDER) {
			const ids = byKind.get(entityKind);
			if (!ids?.length) continue;

			let deleted = 0;
			let retained = 0;
			let retainedReason: string | null = null;

			if (entityKind === "payment") {
				const removed = await tx
					.delete(payments)
					.where(
						and(
							eq(payments.organizationId, input.organizationId),
							inArray(payments.id, ids),
						),
					)
					.returning({ id: payments.id });
				deleted = removed.length;
				retained = ids.length - deleted;
			} else if (entityKind === "visit") {
				const removed = await tx
					.delete(visits)
					.where(
						and(
							eq(visits.organizationId, input.organizationId),
							inArray(visits.id, ids),
						),
					)
					.returning({ id: visits.id });
				deleted = removed.length;
				retained = ids.length - deleted;
			} else if (entityKind === "appointment") {
				const removed = await tx
					.delete(appointments)
					.where(
						and(
							eq(appointments.organizationId, input.organizationId),
							inArray(appointments.id, ids),
						),
					)
					.returning({ id: appointments.id });
				deleted = removed.length;
				retained = ids.length - deleted;
			} else if (entityKind === "patient") {
				/**
				 * Пациент удаляется только если на него не ссылается ничего, созданного
				 * после переноса. Проверяется явно, до удаления: полагаться на отказ
				 * внешнего ключа нельзя, потому что он оборвал бы всю транзакцию отката.
				 */
				const referencedRows = await tx
					.select({ patientId: appointments.patientId })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, input.organizationId),
							inArray(appointments.patientId, ids),
						),
					)
					.union(
						tx
							.select({ patientId: visits.patientId })
							.from(visits)
							.where(
								and(
									eq(visits.organizationId, input.organizationId),
									inArray(visits.patientId, ids),
								),
							),
					)
					.union(
						tx
							.select({ patientId: payments.patientId })
							.from(payments)
							.where(
								and(
									eq(payments.organizationId, input.organizationId),
									inArray(payments.patientId, ids),
								),
							),
					);

				const referenced = new Set(
					referencedRows
						.map((row) => row.patientId)
						.filter((value): value is string => Boolean(value)),
				);
				const deletable = ids.filter((id) => !referenced.has(id));
				retained = ids.length - deletable.length;
				if (retained > 0) {
					retainedReason =
						"На карточки уже ссылаются приёмы, записи или платежи, появившиеся после переноса. Такие карточки сохранены, чтобы не потерять работу, сделанную после миграции.";
				}

				if (deletable.length > 0) {
					const removed = await tx
						.delete(patients)
						.where(
							and(
								eq(patients.organizationId, input.organizationId),
								inArray(patients.id, deletable),
							),
						)
						.returning({ id: patients.id });
					deleted = removed.length;
				}
			} else {
				retained = ids.length;
				retainedReason = `Откат для сущности «${migrationEntityKindTitles[entityKind]}» не реализован — она и не загружалась автоматически.`;
			}

			outcomes.push({ entityKind, deleted, retained, retainedReason });
		}

		/**
		 * Ссылки удалённых сущностей убираются: иначе повторный перенос увидит
		 * соответствие «ключ старой системы → удалённый uuid» и решит, что пациент
		 * уже перенесён, — и не создаст его.
		 */
		await tx
			.delete(migrationEntityLinks)
			.where(
				and(
					eq(migrationEntityLinks.createdByRunId, input.runId),
					eq(migrationEntityLinks.organizationId, input.organizationId),
				),
			);

		await tx
			.update(migrationStagingRecords)
			.set({ status: "skipped", targetEntityId: null, updatedAt: new Date() })
			.where(
				and(
					eq(migrationStagingRecords.runId, input.runId),
					inArray(migrationStagingRecords.status, ["loaded", "updated"]),
				),
			);

		await tx
			.update(migrationRuns)
			.set({
				status: "rolled_back",
				updatedAt: new Date(),
				finishedAt: new Date(),
			})
			.where(eq(migrationRuns.id, input.runId));

		await tx.insert(auditEvents).values({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId ?? null,
			entityType: "migration_run",
			entityId: input.runId,
			action: "migration_rolled_back",
			reason: `Откат переноса из «${run.sourceName}»: ${outcomes
				.map(
					(outcome) =>
						`${outcome.entityKind} удалено ${outcome.deleted}, сохранено ${outcome.retained}`,
				)
				.join("; ")}.`,
		});
	});

	const totalDeleted = outcomes.reduce(
		(sum, outcome) => sum + outcome.deleted,
		0,
	);
	const totalRetained = outcomes.reduce(
		(sum, outcome) => sum + outcome.retained,
		0,
	);

	return {
		outcomes,
		status: "rolled_back",
		message:
			totalRetained === 0
				? `Откат выполнен: удалено ${totalDeleted} записей, созданных переносом. Исходные строки сохранены в стейджинге и доступны для повторной загрузки.`
				: `Откат выполнен частично: удалено ${totalDeleted} записей, сохранено ${totalRetained}, на которые уже сослались после переноса. Подробности по сущностям — в отчёте.`,
	};
}
