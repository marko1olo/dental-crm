import {
	type MigrationRunResponse,
	migrationEntityKindTitles,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	auditEvents,
	migrationRuns,
	migrationStagingRecords,
} from "../../db/schema.js";
import { naturalKeyFor, sourceFingerprint } from "../recordResolution.js";
import {
	loaderFor,
	recordQuarantine,
	type StagedRow,
	stageRows,
} from "../loader.js";
import { reconcileRun } from "../reconcile.js";
import { transformRow } from "../rowTransform.js";
import { dateOnlyPart } from "../valueNormalize.js";
import {
	decodeContent,
	prepareSource,
} from "./checksumValidator.js";
import {
	listQuarantine,
	summaryFrom,
} from "./migrationHistory.js";
import {
	DEFAULT_CONFIDENCE_THRESHOLD,
	QUARANTINE_PREVIEW_LIMIT,
	type EngineInput,
} from "./types.js";

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
				vendorProfile: tables[0]?.mapping.vendorProfile,
				status: "staging",
				dryRun: input.dryRun,
				sourceRows: totalSourceRows,
				mappingJson: tables[0]?.mapping,
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
			mapping: tables[0]?.mapping
				? {
						...tables[0].mapping,
						warnings: [...tables[0].mapping.warnings, ...warnings],
					}
				: {
						vendorProfile: null,
						sourceTable: "",
						entityKind: "unknown",
						columns: [],
						unmappedColumns: [],
						warnings,
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
