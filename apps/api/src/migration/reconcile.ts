import type {
	MigrationEntityBreakdown,
	MigrationEntityKind,
	MigrationReconciliationCheck,
	MigrationReconciliationReport,
} from "@dental/shared";
import {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
} from "@dental/shared";
import { and, count, eq, sql } from "drizzle-orm";
import { withTenantCtx } from "../db/rls.js";
import {
	migrationQuarantineRecords,
	migrationReconciliations,
	migrationStagingRecords,
} from "../db/schema.js";

/**
 * Сверка переноса: доказательство того, что не потерялось ничего.
 *
 * ЧТО ЗДЕСЬ ДОКАЗЫВАЕТСЯ
 * Утверждение «перенесено всё» нельзя подтвердить словами «загружено 1043
 * пациента»: неизвестно, сколько их было. Доказательство — это замкнутый
 * баланс, где каждая исходная строка учтена ровно один раз в одном из исходов:
 *
 *     строк в источнике = создано + обновлено + дублей + в карантине + пропущено
 *
 * Если равенство не выполняется, строки где-то потерялись, и перенос НЕЛЬЗЯ
 * объявлять завершённым, каким бы удачным он ни выглядел по счётчикам.
 *
 * Отдельно и обязательно сверяются деньги. Строки могут сойтись, а сумма
 * платежей — нет: например, часть сумм не разобралась и записалась нулями.
 * Поэтому сумма источника считается независимо, прямо из сохранённых исходных
 * значений в стейджинге, а не из счётчиков загрузчика.
 *
 * Сверка читает СТЕЙДЖИНГ, а не отчёт загрузчика. Это принципиально: если бы
 * она проверяла числа, которые сама же загрузка и посчитала, она подтверждала
 * бы не перенос, а внутреннюю непротиворечивость собственной арифметики.
 */

export interface ReconcileInput {
	runId: string;
	organizationId: string;
	/** Число строк, прочитанных из источника разбором. Внешняя точка отсчёта. */
	sourceRowsParsed: number;
	/**
	 * Точная сумма платежей источника в КОПЕЙКАХ, посчитанная разбором до
	 * загрузки. Независимая точка отсчёта: если бы сверка брала это число из
	 * счётчиков загрузчика, она подтверждала бы его собственную арифметику.
	 */
	sourceMoneyTotalKopecks: number | null;
	dryRun: boolean;
}

interface StatusTally {
	loaded: number;
	updated: number;
	duplicate: number;
	quarantined: number;
	skipped: number;
	ready: number;
	pending: number;
	other: number;
	total: number;
}

async function tallyByStatus(
	runId: string,
	organizationId: string,
): Promise<Map<MigrationEntityKind, StatusTally>> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({
				entityKind: migrationStagingRecords.entityKind,
				status: migrationStagingRecords.status,
				rows: count(),
			})
			.from(migrationStagingRecords)
			.where(
				and(
					eq(migrationStagingRecords.runId, runId),
					eq(migrationStagingRecords.organizationId, organizationId),
				),
			)
			.groupBy(
				migrationStagingRecords.entityKind,
				migrationStagingRecords.status,
			),
	);

	const result = new Map<MigrationEntityKind, StatusTally>();
	for (const row of rows) {
		const tally =
			result.get(row.entityKind) ??
			({
				loaded: 0,
				updated: 0,
				duplicate: 0,
				quarantined: 0,
				skipped: 0,
				ready: 0,
				pending: 0,
				other: 0,
				total: 0,
			} satisfies StatusTally);

		const amount = Number(row.rows);
		switch (row.status) {
			case "loaded":
				tally.loaded += amount;
				break;
			case "updated":
				tally.updated += amount;
				break;
			case "duplicate":
				tally.duplicate += amount;
				break;
			case "quarantined":
				tally.quarantined += amount;
				break;
			case "skipped":
				tally.skipped += amount;
				break;
			case "ready":
				tally.ready += amount;
				break;
			case "pending":
			case "normalized":
			case "mapped":
				tally.pending += amount;
				break;
			default:
				tally.other += amount;
				break;
		}
		tally.total += amount;
		result.set(row.entityKind, tally);
	}
	return result;
}

/**
 * Сумма денег в источнике по данным стейджинга.
 *
 * Читается normalized_json, а не счётчик загрузчика: если разбор суммы дал
 * null, слагаемое отсутствует, и расхождение с независимо посчитанной суммой
 * источника это обнаружит.
 */
interface MoneyTotals {
	/** Точные суммы в копейках из normalized_json.amountKopecks. */
	stagedKopecks: number;
	loadedKopecks: number;
	quarantinedKopecks: number;
	/**
	 * Сумма загруженного, пересчитанная из значения, которое реально ушло в боевую
	 * колонку (normalized_json.amountRub). Тоже в копейках: сравнивать рубли с
	 * рублями через плавающую точку значило бы проверять деньги тем же
	 * инструментом, который их и портит.
	 */
	loadedColumnKopecks: number;
}

/**
 * Денежные итоги прогона.
 *
 * ПОЧЕМУ ВСЁ В КОПЕЙКАХ
 * Копейка — целое число, и только на целых числах баланс «сошлось / не сошлось»
 * означает то, что написано. Стоит перевести любую из сторон в рубли с
 * плавающей точкой, и сравнение начинает зависеть от порядка слагаемых.
 *
 * Прежняя версия считала рублёвую сторону через `Math.round(Number(sum))`, потому
 * что колонка считалась целочисленной. Колонка — numeric(12, 2), и это
 * округление само порождало расхождение, которое отчёт затем «раскрывал».
 */
async function moneyTotals(
	runId: string,
	organizationId: string,
): Promise<MoneyTotals> {
	const kopecksExpression = sql`(${migrationStagingRecords.normalizedJson} ->> 'amountKopecks')::numeric`;
	const rublesExpression = sql`(${migrationStagingRecords.normalizedJson} ->> 'amountRub')::numeric`;
	const loadedCondition = sql`${migrationStagingRecords.status} in ('loaded','updated')`;
	const quarantinedCondition = sql`${migrationStagingRecords.status} = 'quarantined'`;

	const row = await withTenantCtx(organizationId, async (tx) => {
		const [found] = await tx
			.select({
				stagedKopecks: sql<string>`coalesce(sum(${kopecksExpression}), 0)`,
				loadedKopecks: sql<string>`coalesce(sum(case when ${loadedCondition} then ${kopecksExpression} else 0 end), 0)`,
				quarantinedKopecks: sql<string>`coalesce(sum(case when ${quarantinedCondition} then ${kopecksExpression} else 0 end), 0)`,
				loadedRubles: sql<string>`coalesce(sum(case when ${loadedCondition} then ${rublesExpression} else 0 end), 0)`,
			})
			.from(migrationStagingRecords)
			.where(
				and(
					eq(migrationStagingRecords.runId, runId),
					eq(migrationStagingRecords.organizationId, organizationId),
					eq(migrationStagingRecords.entityKind, "payment"),
				),
			);
		return found;
	});

	return {
		// amountKopecks — уже целые копейки: сумма целых по numeric приходит строкой
		// без дробной части, Number() точен до 2^53.
		stagedKopecks: Math.round(Number(row?.stagedKopecks ?? 0)),
		loadedKopecks: Math.round(Number(row?.loadedKopecks ?? 0)),
		quarantinedKopecks: Math.round(Number(row?.quarantinedKopecks ?? 0)),
		// amountRub — рубли с копейками; parseKopecks разбирает строку numeric
		// регулярным выражением, без parseFloat, поэтому «24901.50» → 2490150 точно.
		loadedColumnKopecks: parseKopecks(row?.loadedRubles ?? "0"),
	};
}

/** Рубли из копеек для полей отчёта, объявленных числом. Перевод точный. */
function rublesFromKopecks(kopecks: number): number {
	return Number(kopecksToNumericString(kopecks));
}

export async function reconcileRun(
	input: ReconcileInput,
): Promise<MigrationReconciliationReport> {
	const byEntity = await tallyByStatus(input.runId, input.organizationId);
	const checks: MigrationReconciliationCheck[] = [];

	const totals = {
		staged: 0,
		loaded: 0,
		updated: 0,
		duplicate: 0,
		quarantined: 0,
		skipped: 0,
		unresolved: 0,
	};

	const entityBreakdown: MigrationEntityBreakdown[] = [];
	for (const [entityKind, tally] of byEntity) {
		totals.staged += tally.total;
		totals.loaded += tally.loaded;
		totals.updated += tally.updated;
		totals.duplicate += tally.duplicate;
		totals.quarantined += tally.quarantined;
		totals.skipped += tally.skipped;
		// ready/pending после загрузки — это НЕ учтённые строки: их не загрузили и
		// не изолировали. Именно они и означают потерю.
		totals.unresolved += tally.ready + tally.pending + tally.other;

		entityBreakdown.push({
			entityKind,
			sourceRows: tally.total,
			created: tally.loaded,
			updated: tally.updated,
			duplicates: tally.duplicate,
			quarantined: tally.quarantined,
			skipped: tally.skipped,
		});
	}

	// ------------------------------------------------------------------
	// Проверка 1: все прочитанные строки уложены в стейджинг.
	// ------------------------------------------------------------------
	checks.push({
		code: "staging_completeness",
		title: "Все строки источника уложены в стейджинг",
		expected: input.sourceRowsParsed,
		actual: totals.staged,
		passed: totals.staged === input.sourceRowsParsed,
		detail:
			totals.staged === input.sourceRowsParsed
				? `Разбор прочитал ${input.sourceRowsParsed} строк(и), в стейджинге столько же.`
				: `Разбор прочитал ${input.sourceRowsParsed} строк(и), а в стейджинге ${totals.staged}. Расхождение означает, что часть строк не сохранена и перенос неполон.`,
	});

	// ------------------------------------------------------------------
	// Проверка 2: баланс исходов. Главная проверка отчёта.
	// ------------------------------------------------------------------
	const accountedFor =
		totals.loaded +
		totals.updated +
		totals.duplicate +
		totals.quarantined +
		totals.skipped;
	const rowConservationPassed = input.dryRun
		? // В сухом прогоне загрузки не было, поэтому «учтено» — это всё, кроме
			// строк, по которым даже решение не принято.
			totals.unresolved + accountedFor === totals.staged
		: accountedFor === totals.staged;

	checks.push({
		code: "row_conservation",
		title: "Каждая строка учтена ровно в одном исходе",
		expected: totals.staged,
		actual: input.dryRun ? totals.unresolved + accountedFor : accountedFor,
		passed: rowConservationPassed,
		detail: rowConservationPassed
			? `${totals.staged} строк(и) распределены: создано ${totals.loaded}, обновлено ${totals.updated}, дублей ${totals.duplicate}, в карантине ${totals.quarantined}, пропущено ${totals.skipped}.`
			: `Не сходится баланс: из ${totals.staged} строк учтено ${accountedFor}, без определённого исхода осталось ${totals.unresolved}. Перенос нельзя считать завершённым.`,
	});

	// ------------------------------------------------------------------
	// Проверка 3: нет строк без исхода после загрузки.
	// ------------------------------------------------------------------
	if (!input.dryRun) {
		checks.push({
			code: "no_unresolved_rows",
			title: "Не осталось строк без решения",
			expected: 0,
			actual: totals.unresolved,
			passed: totals.unresolved === 0,
			detail:
				totals.unresolved === 0
					? "Все строки либо загружены, либо изолированы, либо признаны дублями."
					: `${totals.unresolved} строк(и) остались в состоянии готовности к загрузке — загрузка до них не дошла. Повторите загрузку: уже перенесённое не продублируется.`,
		});
	}

	// ------------------------------------------------------------------
	// Проверка 4: у каждой загруженной строки есть созданная сущность.
	// ------------------------------------------------------------------
	const orphan = await withTenantCtx(input.organizationId, async (tx) => {
		const [found] = await tx
			.select({ rows: count() })
			.from(migrationStagingRecords)
			.where(
				and(
					eq(migrationStagingRecords.runId, input.runId),
					eq(migrationStagingRecords.organizationId, input.organizationId),
					sql`${migrationStagingRecords.status} in ('loaded','updated')`,
					sql`${migrationStagingRecords.targetEntityId} is null`,
				),
			);
		return found;
	});
	const orphanCount = Number(orphan?.rows ?? 0);
	checks.push({
		code: "loaded_rows_have_target",
		title: "Каждая загруженная строка указывает на созданную запись",
		expected: 0,
		actual: orphanCount,
		passed: orphanCount === 0,
		detail:
			orphanCount === 0
				? "Происхождение прослеживается для всех загруженных строк."
				: `${orphanCount} строк(и) помечены загруженными, но не ссылаются на созданную запись. Откат и проверка происхождения для них невозможны.`,
	});

	// ------------------------------------------------------------------
	// Проверка 5: деньги. Отдельно от строк.
	// ------------------------------------------------------------------
	const money = await moneyTotals(input.runId, input.organizationId);
	const paymentTally = byEntity.get("payment");

	if (paymentTally && paymentTally.total > 0) {
		/**
		 * Проверка 5.1: разбор ничего не потерял. Сумма источника считается движком
		 * из исходных значений ДО загрузки и передаётся сюда в копейках.
		 */
		if (input.sourceMoneyTotalKopecks !== null) {
			const diff = input.sourceMoneyTotalKopecks - money.stagedKopecks;
			checks.push({
				code: "money_parse_completeness_kopecks",
				title:
					"Сумма разобранных платежей совпадает с суммой источника (до копейки)",
				expected: input.sourceMoneyTotalKopecks,
				actual: money.stagedKopecks,
				passed: diff === 0,
				detail:
					diff === 0
						? `Сумма платежей источника ${formatKopecksRu(input.sourceMoneyTotalKopecks)} разобрана полностью, копейка в копейку.`
						: `Сумма платежей источника ${formatKopecksRu(input.sourceMoneyTotalKopecks)}, а в стейджинге ${formatKopecksRu(
								money.stagedKopecks,
							)}. Не разобрано ${formatKopecksRu(diff)} — часть значений в колонке суммы не является суммой.`,
			});
		}

		/**
		 * Проверка 5.2: главный денежный баланс. Ни одна копейка не исчезла между
		 * стейджингом и итогом: загружено плюс изолировано равно уложенному.
		 */
		const accountedKopecks = money.loadedKopecks + money.quarantinedKopecks;
		checks.push({
			code: "money_conservation_kopecks",
			title: "Загруженное плюс изолированное равно уложенному (до копейки)",
			expected: money.stagedKopecks,
			actual: input.dryRun ? money.stagedKopecks : accountedKopecks,
			passed: input.dryRun ? true : accountedKopecks === money.stagedKopecks,
			detail: input.dryRun
				? `Сухой прогон: к загрузке подготовлено ${formatKopecksRu(money.stagedKopecks)}.`
				: accountedKopecks === money.stagedKopecks
					? `${formatKopecksRu(money.stagedKopecks)} распределены: загружено ${formatKopecksRu(
							money.loadedKopecks,
						)}, в карантине ${formatKopecksRu(money.quarantinedKopecks)}.`
					: `Деньги не сходятся: в стейджинге ${formatKopecksRu(money.stagedKopecks)}, учтено ${formatKopecksRu(
							accountedKopecks,
						)}. Потеряно из вида ${formatKopecksRu(money.stagedKopecks - accountedKopecks)}.`,
		});

		/**
		 * Проверка 5.3: в боевую колонку ушла ровно разобранная сумма, до копейки.
		 *
		 * БЫЛА проверка «money_rounding_disclosure»: она РАСКРЫВАЛА неизбежную, как
		 * тогда считалось, потерю копеек — колонка payments.amount_rub числилась
		 * целочисленной, и отчёт лишь называл разницу вслух, всегда с passed: true.
		 * Колонка — numeric(12, 2). Потеря перестала быть неизбежной, а значит
		 * перестала быть допустимой: теперь расхождение обязано быть нулевым, и
		 * проверка на нём ПРОВАЛИВАЕТСЯ, иначе перенос нельзя объявлять сошедшимся.
		 *
		 * Сравниваются два независимо посчитанных числа: точные копейки разбора
		 * (normalized_json.amountKopecks) и копейки того значения, которое ушло в
		 * колонку (normalized_json.amountRub). Оба целые.
		 */
		const columnDeltaKopecks = money.loadedColumnKopecks - money.loadedKopecks;
		checks.push({
			code: "money_column_exactness_kopecks",
			title: "В колонку суммы записано ровно разобранное значение (до копейки)",
			expected: money.loadedKopecks,
			actual: money.loadedColumnKopecks,
			passed: columnDeltaKopecks === 0,
			detail:
				columnDeltaKopecks === 0
					? `Загружено ${formatKopecksRu(money.loadedKopecks)} — столько же, сколько разобрано из источника, копейка в копейку.`
					: `Разобрано ${formatKopecksRu(money.loadedKopecks)}, а в колонку суммы ушло ${formatKopecksRu(
							money.loadedColumnKopecks,
						)}. Расхождение ${formatKopecksRu(
							Math.abs(columnDeltaKopecks),
						)} означает, что перенос изменил деньги клиники. Загрузку нужно откатить и разобрать причину: колонка amount_rub объявлена numeric(12, 2) и обязана принимать копейки без потерь.`,
		});
	}

	// ------------------------------------------------------------------
	// Проверка 6: карантин соответствует изолированным строкам.
	// ------------------------------------------------------------------
	const quarantineRows = await withTenantCtx(
		input.organizationId,
		async (tx) => {
			const [found] = await tx
				.select({
					rows: sql<string>`count(distinct ${migrationQuarantineRecords.stagingRecordId})`,
				})
				.from(migrationQuarantineRecords)
				.where(
					and(
						eq(migrationQuarantineRecords.runId, input.runId),
						eq(migrationQuarantineRecords.organizationId, input.organizationId),
						eq(migrationQuarantineRecords.blocking, true),
					),
				);
			return found;
		},
	);
	const quarantineDistinct = Number(quarantineRows?.rows ?? 0);

	checks.push({
		code: "quarantine_has_reason",
		title: "У каждой изолированной строки есть причина в карантине",
		expected: totals.quarantined,
		actual: quarantineDistinct,
		// Причин может быть больше, чем строк (несколько проблем в одной строке),
		// но не меньше: строка без причины — это изоляция без объяснения.
		passed: quarantineDistinct >= totals.quarantined,
		detail:
			quarantineDistinct >= totals.quarantined
				? `${totals.quarantined} изолированных строк(и) имеют объяснённые причины.`
				: `${totals.quarantined} строк(и) изолированы, но причина записана лишь для ${quarantineDistinct}. Оператор не сможет разобрать остальные.`,
	});

	const balanced = checks.every((check) => check.passed);

	const report: MigrationReconciliationReport = {
		runId: input.runId,
		generatedAt: new Date().toISOString(),
		balanced,
		checks,
		entityBreakdown,
		/**
		 * Итоги отчёта — рубли с копейками. Раньше здесь стояло
		 * `Math.round(kopecks / 100)` «для читаемости»: акт о переносе, который
		 * клиника подписывает, объявлял сумму на копейки не такой, какая перенесена,
		 * а колонки migration_reconciliations.*_money_total_rub — numeric(12, 2) и
		 * держат точное значение.
		 */
		sourceMoneyTotalRub:
			input.sourceMoneyTotalKopecks === null
				? null
				: rublesFromKopecks(input.sourceMoneyTotalKopecks),
		loadedMoneyTotalRub:
			paymentTally && paymentTally.total > 0
				? rublesFromKopecks(money.loadedKopecks)
				: null,
		quarantinedMoneyTotalRub:
			paymentTally && paymentTally.total > 0
				? rublesFromKopecks(money.quarantinedKopecks)
				: null,
	};

	/**
	 * Отчёт сохраняется целиком, а не пересчитывается по требованию: доказательство
	 * переноса должно быть воспроизводимым спустя год, когда содержимое боевых
	 * таблиц уже изменилось работой клиники.
	 */
	await withTenantCtx(input.organizationId, async (tx) => {
		await tx.insert(migrationReconciliations).values({
			runId: input.runId,
			organizationId: input.organizationId,
			balanced,
			checksJson: checks,
			entityBreakdownJson: entityBreakdown,
			sourceMoneyTotalRub: report.sourceMoneyTotalRub,
			loadedMoneyTotalRub: report.loadedMoneyTotalRub,
			quarantinedMoneyTotalRub: report.quarantinedMoneyTotalRub,
		});
	});

	return report;
}

/**
 * Отчёт сверки в CSV — для передачи клинике вместе с актом о переносе.
 *
 * Разделитель «точка с запятой»: русский Excel открывает CSV с запятой одной
 * колонкой, и отчёт, который нельзя прочитать, доказательством не является.
 */
export function reconciliationReportCsv(
	report: MigrationReconciliationReport,
): string {
	const cell = (value: string | number | boolean | null): string => {
		if (value === null) return "";
		const text = String(value).replace(/\s+/g, " ").trim();
		return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
	};

	const lines: string[] = [];
	lines.push(`Отчёт сверки переноса;${cell(report.runId)}`);
	lines.push(`Сформирован;${cell(report.generatedAt)}`);
	lines.push(
		`Итог;${report.balanced ? "СОШЛОСЬ" : "НЕ СОШЛОСЬ — перенос неполон"}`,
	);
	lines.push("");
	lines.push("Проверка;Ожидалось;Получено;Результат;Пояснение");
	for (const check of report.checks) {
		lines.push(
			[
				check.title,
				check.expected,
				check.actual,
				check.passed ? "пройдена" : "НЕ ПРОЙДЕНА",
				check.detail,
			]
				.map(cell)
				.join(";"),
		);
	}
	lines.push("");
	lines.push(
		"Сущность;Строк в источнике;Создано;Обновлено;Дублей;В карантине;Пропущено",
	);
	for (const entity of report.entityBreakdown) {
		lines.push(
			[
				entity.entityKind,
				entity.sourceRows,
				entity.created,
				entity.updated,
				entity.duplicates,
				entity.quarantined,
				entity.skipped,
			]
				.map(cell)
				.join(";"),
		);
	}
	/*
	 * ДЕНЬГИ ПЕЧАТАЮТСЯ ВСЕГДА, КОГДА ХОТЬ ОДНА ИЗ ТРЁХ СУММ ИЗВЕСТНА.
	 *
	 * БЫЛО: `if (report.sourceMoneyTotalRub !== null)` — весь денежный раздел акта
	 * исчезал, если не определилась ОДНА из трёх сумм, сумма источника. Вместе с
	 * ней из акта пропадали «Загружено» и «В карантине» — измеренные значения,
	 * которые к неопределившейся сумме источника отношения не имеют. Клиника
	 * подписывала акт о переносе, в котором про деньги не сказано ничего, и
	 * отличить «денег в переносе не было» от «сумму источника определить не
	 * удалось» по такому акту нельзя никак. Молчание — не честность: пустое место
	 * читается как «вопрос не возникал».
	 *
	 * Теперь неизвестная сумма печатается словами «не определяется». Пустая клетка
	 * («») больше не используется: в CSV она неотличима от нуля, потерянного при
	 * открытии в Excel.
	 */
	const anyMoneyFigure =
		report.sourceMoneyTotalRub !== null ||
		report.loadedMoneyTotalRub !== null ||
		report.quarantinedMoneyTotalRub !== null;
	if (anyMoneyFigure) {
		lines.push("");
		lines.push("Деньги;Значение");
		/**
		 * Суммы печатаются русской записью «24 901,50 ₽», а не числом как есть.
		 * С тех пор как перенос сохраняет копейки, `String(24901.5)` дало бы в акте
		 * «24901.5» — точка вместо запятой и один знак копеек; это не денежная
		 * запись, и клиника, которая этот акт подписывает, читает её неправильно.
		 */
		const csvMoney = (value: number | null): string =>
			value === null ? "не определяется" : formatKopecksRu(parseKopecks(value));
		lines.push(
			`Сумма в источнике;${cell(csvMoney(report.sourceMoneyTotalRub))}`,
		);
		lines.push(`Загружено;${cell(csvMoney(report.loadedMoneyTotalRub))}`);
		lines.push(
			`В карантине;${cell(csvMoney(report.quarantinedMoneyTotalRub))}`,
		);
		if (report.sourceMoneyTotalRub === null) {
			lines.push(
				`Почему сумма в источнике не определяется;${cell(
					"Независимая сумма платежей источника не посчитана: часть значений в колонке суммы суммой не является, " +
						"либо перенос шёл потоковым путём, где такая сумма сегодня не считается. Значит проверка «сумма " +
						"разобранных платежей совпадает с суммой источника» в этом акте НЕ ВЫПОЛНЯЛАСЬ, и полноту переноса " +
						"денег этот акт не подтверждает — сверьте суммы по выгрузке источника вручную.",
				)}`,
			);
		}
	}

	return lines.join("\r\n");
}
