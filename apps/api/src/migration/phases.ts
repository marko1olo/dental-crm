import {
	type MigrationAnalyzeResponse,
	type MigrationColumnMapping,
	type MigrationEntityKind,
	type MigrationMappingSnapshot,
	type MigrationReconciliationReport,
	type MigrationTargetField,
	migrationEntityKindTitles,
} from "@dental/shared";
import { maskValueShape, profileTable } from "./columnProfile.js";
import { naturalKeyFor } from "./identity.js";
import { mapColumnsWithLlm } from "./llmMapper.js";
import { loaderFor, recordQuarantine, stageRows } from "./loader.js";
import {
	missingRequiredFields,
	resolveDeterministicMapping,
} from "./mapping.js";
import { reconcileRun } from "./reconcile.js";
import { transformRow } from "./rowTransform.js";
import {
	countStagingByStatus,
	findRun,
	heartbeat,
	markRemainingReadyAsSkipped,
	markRowsSkipped,
	readReadyRows,
	readyEntityKinds,
	STAGING_PAGE_SIZE,
	updateRun,
} from "./runStore.js";
import {
	detectSourceShape,
	type SourceShape,
	streamSourceRows,
} from "./streamStage.js";
import { uploadExists } from "./uploadStore.js";
import { type DateFormatHint, dateOnlyPart } from "./valueNormalize.js";

/**
 * Фазы переноса как отдельные, возобновляемые шаги.
 *
 * ЗАЧЕМ РАЗДЕЛЕНИЕ
 * runMigration в engine.ts делает всё за один вызов: разбор, сопоставление,
 * укладку, загрузку, сверку. Для файла обычного размера это удобно и остаётся
 * рабочим путём. Но на выгрузке в сотни тысяч строк один вызов означает один
 * HTTP-запрос длиной в минуты, который обрывается по таймауту, и оператор не
 * знает, перенеслось ли что-нибудь.
 *
 * Здесь те же действия разложены на шаги, между которыми состояние целиком лежит
 * в базе:
 *
 *   1. mapRunPhase     — прочитать голову файла, построить карту соответствия;
 *   2. stageRunPhase   — потоком уложить все строки в стейджинг;
 *   3. executeRunPhase — загрузить готовые строки в боевые таблицы;
 *   4. finishRunPhase  — свести сверку и выставить итоговый статус.
 *
 * Каждый шаг можно вызвать повторно после падения процесса: он смотрит, что уже
 * сделано, и продолжает. Это свойство обеспечивается не флагами в памяти, а
 * колонкой status в migration_staging_records.
 */

/** Порог уверенности, ниже которого строка выносится на проверку человеком. */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.55;

/** Строк в партии укладки. Совпадает с партией потокового чтения. */
const STAGE_BATCH_ROWS = 1000;

export interface PhaseContext {
	runId: string;
	organizationId: string;
	allowLlm: boolean;
	sourceSystem: string;
	requestedEntityKind?: MigrationEntityKind | undefined;
	requestedVendorProfile?: string | undefined;
	mappingOverrides: Array<{
		sourceColumn: string;
		targetField: MigrationTargetField;
	}>;
}

export class MigrationPhaseError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "MigrationPhaseError";
		this.code = code;
	}
}

/** Загружает прогон и убеждается, что файл источника ещё на месте. */
async function requireRunWithUpload(runId: string, organizationId: string) {
	const run = await findRun(runId, organizationId);
	if (!run) {
		throw new MigrationPhaseError(
			"RunNotFound",
			"Прогон переноса не найден в этой организации.",
		);
	}
	if (!run.uploadPath || !(await uploadExists(run.uploadPath))) {
		throw new MigrationPhaseError(
			"UploadExpired",
			"Файл источника больше недоступен: он удалён по сроку хранения либо процесс запущен на другом сервере. Залейте файл заново.",
		);
	}
	return run;
}

// ---------------------------------------------------------------------------
// Фаза 1: сопоставление
// ---------------------------------------------------------------------------

export interface MapPhaseResult {
	shape: SourceShape;
	mapping: MigrationMappingSnapshot;
	analyze: MigrationAnalyzeResponse;
	llmCalls: number;
	llmRejected: number;
}

/**
 * Строит карту соответствия по голове файла.
 *
 * Читается только начало источника, поэтому фаза дешёвая независимо от размера
 * файла и её можно вызывать повторно, пока оператор правит карту.
 */
export async function mapRunPhase(
	context: PhaseContext,
): Promise<MapPhaseResult> {
	const run = await requireRunWithUpload(context.runId, context.organizationId);
	await updateRun(context.runId, context.organizationId, {
		status: "mapping",
		phase: "Определение колонок",
	});

	const shape = await detectSourceShape({
		filePath: run.uploadPath!,
		fileName: run.uploadFileName ?? run.sourceName,
		byteSize: run.sourceBytes ?? 0,
		forcedKind: undefined,
	});

	if (shape.columns.length === 0) {
		throw new MigrationPhaseError(
			"SourceHasNoColumns",
			`В источнике «${run.sourceName}» не определены колонки. ${shape.warnings.join(" ")}`.trim(),
		);
	}

	const profiles = profileTable(shape.columns, shape.sampleRows);

	const deterministic = resolveDeterministicMapping({
		columns: shape.columns,
		rows: shape.sampleRows,
		profiles,
		tableName: shape.tableName,
		requestedEntityKind: context.requestedEntityKind,
		requestedVendorProfile: context.requestedVendorProfile,
		overrides: context.mappingOverrides,
	});

	let columns: MigrationColumnMapping[] = deterministic.columns;
	let unmapped = deterministic.unmappedColumns;
	const warnings = [...shape.warnings, ...deterministic.warnings];
	let llmCalls = 0;
	let llmRejected = 0;

	// ---- Языковая модель получает только нераспознанные колонки.
	if (
		context.allowLlm &&
		deterministic.candidatesForLlm.length > 0 &&
		deterministic.entityKind !== "unknown"
	) {
		const llm = await mapColumnsWithLlm({
			entityKind: deterministic.entityKind,
			profiles: deterministic.candidatesForLlm,
			takenFields: new Set(columns.map((column) => column.targetField)),
		});
		columns = [...columns, ...llm.accepted];
		const accepted = new Set(llm.accepted.map((column) => column.sourceColumn));
		unmapped = unmapped.filter((column) => !accepted.has(column));
		warnings.push(...llm.warnings);
		llmCalls = llm.calls;
		llmRejected = llm.rejected;
	} else if (!context.allowLlm && deterministic.candidatesForLlm.length > 0) {
		warnings.push(
			`Обращение к языковой модели отключено: ${deterministic.candidatesForLlm.length} колонок(а) остались без сопоставления. Их содержимое сохранится в исходном виде, но в поля не запишется.`,
		);
	}

	const missing = missingRequiredFields(
		deterministic.entityKind,
		columns.map((column) => column.targetField),
	);
	if (missing.length > 0) {
		warnings.push(
			`Для загрузки «${migrationEntityKindTitles[deterministic.entityKind]}» не хватает обязательных полей: ${missing.join(
				", ",
			)}. Сопоставьте нужные колонки вручную — иначе все строки уйдут в карантин.`,
		);
	}

	const mapping: MigrationMappingSnapshot = {
		vendorProfile: deterministic.vendorProfile?.code ?? null,
		sourceTable: shape.tableName,
		entityKind: deterministic.entityKind,
		columns,
		unmappedColumns: unmapped,
		warnings,
	};

	// ---- Оценка на выборке: сколько строк пройдёт при текущей карте.
	const dateHints = new Map<string, DateFormatHint>(
		profiles.map((profile) => [profile.name, profile.dateHint]),
	);
	let projectedReady = 0;
	let projectedQuarantine = 0;
	const findings = new Map<
		string,
		{ severity: "info" | "warning" | "blocker"; rows: number }
	>();

	for (const row of shape.sampleRows) {
		const transformed = transformRow({
			entityKind: mapping.entityKind,
			columns: shape.columns,
			row,
			mapping: mapping.columns,
			dateHints,
			confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
		});
		if (transformed.issues.some((issue) => issue.blocking))
			projectedQuarantine += 1;
		else projectedReady += 1;

		for (const issue of transformed.issues) {
			// Замечания группируются по смыслу: 340 одинаковых сообщений оператор
			// закроет не читая, а «нет телефона у 340 строк» полезно.
			const key = `${issue.reason}|${issue.fieldPath ?? ""}|${issue.message.replace(/\d+/g, "N")}`;
			const existing = findings.get(key);
			if (existing) existing.rows += 1;
			else
				findings.set(key, {
					severity: issue.blocking ? "blocker" : "warning",
					rows: 1,
				});
		}
	}

	await updateRun(context.runId, context.organizationId, {
		status: "validated",
		phase: "Карта соответствия готова",
		mappingJson: mapping,
		vendorProfile: mapping.vendorProfile,
		detectedEncoding: shape.detectedEncoding,
		encodingConfidence: shape.encodingConfidence,
		sourceKind: shape.sourceKind,
		llmCalls,
		llmRejectedSuggestions: llmRejected,
	});

	const analyze: MigrationAnalyzeResponse = {
		sourceName: run.sourceName,
		profile: {
			sourceKind: shape.sourceKind,
			detectedEncoding: shape.detectedEncoding,
			encodingConfidence: shape.encodingConfidence,
			delimiter: shape.delimiter,
			columns: shape.columns,
			rowCount: shape.sampleRows.length,
			/**
			 * В предпросмотр уходят МАСКИ, а не значения: мастер миграции открывают в
			 * присутствии сотрудников и снимают с него экран для переписки с
			 * поддержкой. Настоящие ФИО и телефоны там не нужны, а форма — нужна.
			 */
			sampleRows: shape.sampleRows.slice(0, 10).map((row) => {
				const record: Record<string, string> = {};
				shape.columns.forEach((column, index) => {
					record[column] = maskValueShape(row[index] ?? "", 32);
				});
				return record;
			}),
			warnings: shape.warnings,
		},
		mapping,
		projectedReady,
		projectedQuarantine,
		qualityFindings: [...findings.entries()]
			.map(([key, value]) => ({
				severity: value.severity,
				message: key.split("|").slice(2).join("|"),
				affectedRows: value.rows,
			}))
			.concat(
				mapping.warnings.map((message) => ({
					severity: "warning" as const,
					message,
					affectedRows: 0,
				})),
			)
			.sort((left, right) => {
				const weight = { blocker: 0, warning: 1, info: 2 } as const;
				const bySeverity = weight[left.severity] - weight[right.severity];
				return bySeverity !== 0
					? bySeverity
					: right.affectedRows - left.affectedRows;
			})
			.slice(0, 40),
	};

	return { shape, mapping, analyze, llmCalls, llmRejected };
}

// ---------------------------------------------------------------------------
// Фаза 2: укладка в стейджинг потоком
// ---------------------------------------------------------------------------

export interface StagePhaseResult {
	sourceRows: number;
	stagedRows: number;
	quarantinedRows: number;
}

/**
 * Укладывает все строки источника в стейджинг, читая файл потоком.
 *
 * Идемпотентна по построению: уникальный индекс по (run_id, source_table,
 * source_row_number) с onConflictDoNothing означает, что повторный вызов после
 * обрыва не создаст вторых копий строк, а просто дойдёт до конца.
 */
export async function stageRunPhase(
	context: PhaseContext,
): Promise<StagePhaseResult> {
	const run = await requireRunWithUpload(context.runId, context.organizationId);
	const mapping = run.mappingJson;
	if (!mapping) {
		throw new MigrationPhaseError(
			"MappingMissing",
			"Карта соответствия не построена. Сначала выполните фазу сопоставления.",
		);
	}

	await updateRun(context.runId, context.organizationId, {
		status: "staging",
		phase: "Укладка строк источника",
	});

	const shape = await detectSourceShape({
		filePath: run.uploadPath!,
		fileName: run.uploadFileName ?? run.sourceName,
		byteSize: run.sourceBytes ?? 0,
		forcedKind: undefined,
	});

	const profiles = profileTable(shape.columns, shape.sampleRows);
	const dateHints = new Map<string, DateFormatHint>(
		profiles.map((profile) => [profile.name, profile.dateHint]),
	);

	let sourceRows = 0;

	for await (const batch of streamSourceRows({
		filePath: run.uploadPath!,
		fileName: run.uploadFileName ?? run.sourceName,
		shape,
		batchRows: STAGE_BATCH_ROWS,
	})) {
		const staged = await stageRows({
			runId: context.runId,
			organizationId: context.organizationId,
			sourceTable: batch.tableName,
			entityKind: mapping.entityKind,
			columns: batch.columns,
			rows: batch.rows,
			firstRowNumber: batch.firstRowNumber,
			transform: (row) =>
				transformRow({
					entityKind: mapping.entityKind,
					columns: batch.columns,
					row,
					mapping: mapping.columns,
					dateHints,
					confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
				}),
			naturalKeyOf: (transformed) => {
				// В бизнес-ключ идёт только календарная часть: правка времени в старой
				// системе между выгрузками не должна давать другой ключ.
				const rawDate = (transformed.values.date ??
					transformed.values.paidAt ??
					transformed.values.startsAt) as string | undefined;
				return naturalKeyFor(mapping.entityKind, {
					externalId: transformed.values.externalId as string | undefined,
					fullName: (transformed.values.fullName ?? transformed.values.name) as
						| string
						| undefined,
					phone: transformed.values.phone as string | undefined,
					birthDate: transformed.values.birthDate as string | undefined,
					date: rawDate ? dateOnlyPart(rawDate) : undefined,
					amountRub: transformed.values.amountRub as number | undefined,
					patientKey: transformed.values.patientRef as string | undefined,
					toothCode: transformed.values.toothCode as string | undefined,
				});
			},
		});

		await recordQuarantine({
			runId: context.runId,
			organizationId: context.organizationId,
			entityKind: mapping.entityKind,
			rows: staged.rows,
		});

		sourceRows += batch.rows.length;

		// Отметка живучести на каждой партии: укладка миллиона строк не должна
		// выглядеть как зависший процесс.
		await heartbeat(
			context.runId,
			context.organizationId,
			`Уложено строк: ${sourceRows}`,
			0,
		);
	}

	const counts = await countStagingByStatus(
		context.runId,
		context.organizationId,
	);

	await updateRun(context.runId, context.organizationId, {
		status: "validated",
		phase: `Уложено ${counts.total} строк, готово к загрузке ${counts.ready}`,
		sourceRows,
		stagedRows: counts.total,
		quarantinedRows: counts.quarantined,
		progressTotal: counts.total,
		progressDone: counts.total - counts.ready,
	});

	return {
		sourceRows,
		stagedRows: counts.total,
		quarantinedRows: counts.quarantined,
	};
}

// ---------------------------------------------------------------------------
// Фаза 3: загрузка в боевые таблицы
// ---------------------------------------------------------------------------

export interface ExecutePhaseResult {
	created: number;
	updated: number;
	duplicates: number;
	failed: number;
	entitiesProcessed: MigrationEntityKind[];
	entitiesWithoutLoader: MigrationEntityKind[];
}

/**
 * Загружает готовые строки из стейджинга.
 *
 * ЗДЕСЬ И ЖИВЁТ ВОЗОБНОВЛЯЕМОСТЬ. Строки берутся из базы по статусу ready, а не
 * из памяти. Цикл идёт до тех пор, пока такие строки есть, и после каждой партии
 * состояние обновлено в базе. Падение процесса на середине означает лишь, что
 * следующий владелец продолжит с оставшихся ready-строк.
 *
 * Условие выхода — отсутствие продвижения, а не только пустая выборка: если
 * партия обработана, но ни одна строка не сменила статус (например, все упали в
 * отказ базы, который не пометился), цикл обязан прекратиться, а не вертеться
 * вечно на одних и тех же строках.
 */
export async function executeRunPhase(
	context: PhaseContext & { dryRun: boolean; sourceName: string },
): Promise<ExecutePhaseResult> {
	const result: ExecutePhaseResult = {
		created: 0,
		updated: 0,
		duplicates: 0,
		failed: 0,
		entitiesProcessed: [],
		entitiesWithoutLoader: [],
	};

	const kinds = await readyEntityKinds(context.runId, context.organizationId);
	const totalBefore = await countStagingByStatus(
		context.runId,
		context.organizationId,
	);
	await updateRun(context.runId, context.organizationId, {
		progressTotal: totalBefore.total,
	});

	for (const entityKind of kinds) {
		const loader = loaderFor(entityKind);
		if (!loader) {
			/**
			 * Загрузчика нет — строки помечаются пропущенными, а не остаются в ready.
			 * Иначе сверка справедливо признает их потерянными, а цикл ниже будет
			 * крутиться на них без продвижения.
			 */
			const skipped = await markRemainingReadyAsSkipped(
				context.runId,
				context.organizationId,
				entityKind,
			);
			if (skipped > 0) result.entitiesWithoutLoader.push(entityKind);
			continue;
		}

		result.entitiesProcessed.push(entityKind);
		await heartbeat(
			context.runId,
			context.organizationId,
			`Загрузка: ${migrationEntityKindTitles[entityKind]}`,
		);

		for (;;) {
			const rows = await readReadyRows(
				context.runId,
				context.organizationId,
				entityKind,
				STAGING_PAGE_SIZE,
			);
			if (rows.length === 0) break;

			const outcome = await loader({
				runId: context.runId,
				organizationId: context.organizationId,
				sourceSystem: context.sourceSystem,
				sourceName: context.sourceName,
				rows,
				dryRun: context.dryRun,
			});

			result.created += outcome.created;
			result.updated += outcome.updated;
			result.duplicates += outcome.duplicates;
			result.failed += outcome.failed;

			// Проблемы, возникшие при записи, попадают в карантин.
			const issueRows = rows
				.filter((row) => outcome.issuesByStagingId.has(row.stagingId))
				.map((row) => ({
					...row,
					issues: [outcome.issuesByStagingId.get(row.stagingId)!],
				}));
			if (issueRows.length > 0) {
				await recordQuarantine({
					runId: context.runId,
					organizationId: context.organizationId,
					entityKind,
					rows: issueRows,
				});
			}

			/**
			 * Сухой прогон не меняет статусы строк, поэтому они остались бы ready и
			 * цикл не кончился бы никогда. Помечаем обработанную партию пропущенной.
			 */
			if (context.dryRun) {
				const stagingIds = rows.map((row) => row.stagingId);
				await markRowsSkipped(context.organizationId, stagingIds);
			}

			const counts = await countStagingByStatus(
				context.runId,
				context.organizationId,
			);
			await heartbeat(
				context.runId,
				context.organizationId,
				`Загрузка: ${migrationEntityKindTitles[entityKind]}, обработано ${counts.total - counts.ready} из ${counts.total}`,
				counts.total - counts.ready,
			);

			/**
			 * Защита от бесконечного цикла: если после обработки партии число
			 * ready-строк не уменьшилось, продвижения нет. Помечаем эту партию
			 * пропущенной и выходим — иначе воркер завис бы навсегда.
			 */
			const stillReady = await readReadyRows(
				context.runId,
				context.organizationId,
				entityKind,
				1,
			);
			if (
				stillReady.length > 0 &&
				stillReady[0]!.stagingId === rows[0]!.stagingId
			) {
				await markRowsSkipped(
					context.organizationId,
					rows.map((row) => row.stagingId),
				);
				result.failed += rows.length;
				break;
			}
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Фаза 4: сверка и итоговый статус
// ---------------------------------------------------------------------------

export async function finishRunPhase(context: {
	runId: string;
	organizationId: string;
	dryRun: boolean;
}): Promise<MigrationReconciliationReport> {
	const counts = await countStagingByStatus(
		context.runId,
		context.organizationId,
	);
	const run = await findRun(context.runId, context.organizationId);

	const reconciliation = await reconcileRun({
		runId: context.runId,
		organizationId: context.organizationId,
		// Точка отсчёта — число строк, прочитанных разбором и записанных в прогон.
		sourceRowsParsed: run?.sourceRows ?? counts.total,
		/*
		 * НЕ ОПРЕДЕЛЯЕТСЯ, и это единственный честный ответ на потоковом пути.
		 *
		 * БЫЛО: `sourceMoneyTotalKopecks: await stagedMoneyKopecks(runId)`. Эта
		 * функция суммирует normalized_json.amountKopecks по стейджингу — то есть
		 * РОВНО ТО ЖЕ ЧИСЛО, которое сверка считает своей второй стороной
		 * (moneyTotals().stagedKopecks в reconcile.ts). Проверка
		 * money_parse_completeness_kopecks сравнивала стейджинг сам с собой:
		 * разность тождественно 0, passed всегда true, и акт переноса печатал
		 * «Сумма платежей источника … разобрана полностью, копейка в копейку» как
		 * доказательство. Докстринг reconcile.ts запрещает именно это: «если бы она
		 * проверяла числа, которые сама же загрузка и посчитала, она подтверждала бы
		 * не перенос, а внутреннюю непротиворечивость собственной арифметики».
		 *
		 * Независимой суммы источника у потокового пути СЕГОДНЯ НЕТ: stageRunPhase
		 * укладывает строки через streamSourceRows и нигде не считает сумму по
		 * исходным значениям до нормализации (в одноразовом пути её считает
		 * sourceMoneyTotalFromRows в engine.ts). Пока её не считают, точки отсчёта не
		 * существует, и подставлять вместо неё стейджинг нельзя: неизвестное обязано
		 * остаться неизвестным. Сверка при null пропускает проверку 5.1, а акт
		 * печатает «не определяется» вместо выдуманного «сошлось».
		 */
		sourceMoneyTotalKopecks: null,
		dryRun: context.dryRun,
	});

	const status = context.dryRun
		? "validated"
		: counts.quarantined > 0
			? "completed_with_quarantine"
			: reconciliation.balanced
				? "completed"
				: "failed";

	await updateRun(context.runId, context.organizationId, {
		status,
		phase: context.dryRun
			? "Сухой прогон завершён, боевые таблицы не тронуты"
			: reconciliation.balanced
				? "Перенос завершён, сверка сошлась"
				: "Перенос завершён, сверка НЕ сошлась",
		loadedRows: counts.loaded,
		updatedRows: counts.updated,
		duplicateRows: counts.duplicate,
		quarantinedRows: counts.quarantined,
		skippedRows: counts.skipped,
		progressTotal: counts.total,
		progressDone: counts.total - counts.ready,
		workerId: null,
		heartbeatAt: null,
		finishedAt: new Date(),
		errorMessage: reconciliation.balanced
			? null
			: "Сверка не сошлась: часть строк не учтена. Подробности в отчёте сверки.",
	});

	return reconciliation;
}
