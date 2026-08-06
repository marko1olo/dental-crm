import { hostname } from "node:os";
import type {
	MigrationEntityKind,
	MigrationFieldLineage,
	MigrationMappingSnapshot,
	MigrationRunStatus,
} from "@dental/shared";
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { transactionStorage } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import { migrationRuns, migrationStagingRecords } from "../db/schema.js";
import type { StagedRow } from "./loader.js";
import type { TransformedRow } from "./rowTransform.js";

/**
 * Доступ к состоянию прогона и к стейджингу.
 *
 * ГЛАВНАЯ МЫСЛЬ МОДУЛЯ
 * Загрузчик обязан брать строки ИЗ БАЗЫ, а не получать их в памяти от того, кто
 * их только что уложил. Пока строки передавались массивом внутри одного вызова,
 * перенос был неделим: упал процесс — и всё, что он держал в памяти, потеряно, а
 * повторный запуск начинается с чтения файла заново.
 *
 * Как только источник истины о состоянии каждой строки — колонка status в
 * migration_staging_records, всё меняется. Загрузка становится возобновляемой:
 * после падения достаточно выбрать строки со статусом ready и продолжить.
 * Дублей это не создаёт, потому что уже загруженные помечены loaded, а
 * уникальность в migration_entity_links страхует от повторного создания даже
 * при гонке двух процессов.
 *
 * ---------------------------------------------------------------------------
 * ПОЧЕМУ ЗДЕСЬ ВЕЗДЕ withTenantCtx, А НЕ ГОЛЫЙ `db` (правка RLS)
 * ---------------------------------------------------------------------------
 * БЫЛО: модуль импортировал `db` из ../db/client.js и обращался к базе напрямую.
 * Из обработчика маршрута это работало по случайности: server.ts обёрткой onRoute
 * заворачивает КАЖДЫЙ обработчик в withTenantCtx, а `db` — это Proxy, который
 * подставляет активную транзакцию. Тенант-контекст приходил «сам».
 *
 * ПОЧЕМУ НЕ РАБОТАЛО: фоновый воркер (worker.ts) живёт ВНЕ обработчика маршрута.
 * Транзакции нет — Proxy подставлять нечего — `app.current_tenant` не установлен.
 * А migration_runs и migration_staging_records стоят под ENABLE + FORCE ROW LEVEL
 * SECURITY (миграции 0157 и 0159), роль `dental` не имеет ни rolsuper, ни
 * rolbypassrls. Политика tenant_isolation отдаёт 0 строк, и — вот в чём ловушка —
 * делает это МОЛЧА: SELECT/UPDATE/DELETE под RLS не отличают «не найдено» от «не
 * видно». ИЗМЕРЕНО: захват прогона возвращал rowCount 0 при двух реально стоящих
 * в очереди прогонах; различитель `SET LOCAL row_security = off` давал 42501
 * «запрос будет ограничен политикой», то есть скрытие, а не пустую очередь.
 * Следствие: прогон висел «в очереди» вечно, оператор ждал бесконечно.
 *
 * СТАЛО: тенант-контекст ставится НА КАЖДУЮ ОПЕРАЦИЮ, а не одной обёрткой вокруг
 * прогона. Это принципиально: прогон идёт минутами, и одна транзакция на весь
 * прогон (а) сделала бы отметку живучести невидимой снаружи до коммита, сломав
 * подбор осиротевших заданий, (б) держала бы блокировки и остановила автоочистку
 * по всем задействованным таблицам, (в) заняла бы соединение из пула в 10 штук на
 * всё время работы. Поэтому каждая функция ниже открывает свою короткую
 * транзакцию и закрывает её.
 *
 * Накладных расходов на пути маршрута это не добавляет: withTenantCtx
 * реентерабельна и при совпадении арендатора идёт быстрым путём — переиспользует
 * уже открытую транзакцию без второго соединения и без лишних round-trip.
 *
 * Обход (withSuperuserBypass) применён РОВНО в двух местах и только на ЧТЕНИЕ —
 * там, где арендатор принципиально неизвестен: «у кого есть работа». Образец —
 * listOutboxOrganizations в services/communications/dispatcher.ts.
 */

/** Идентификатор процесса-владельца: по нему видно, кто именно взял прогон. */
export const WORKER_ID = `${hostname()}#${process.pid}`;

/**
 * Окно живучести. Владелец обновляет отметку на каждой партии; если отметки нет
 * дольше этого срока, процесс считается умершим и прогон подбирается.
 *
 * Две минуты, а не десять секунд: партия в 500 строк с точками сохранения на
 * медленной базе может занять десятки секунд, и слишком короткое окно привело бы
 * к тому, что живой прогон отбирают у работающего процесса.
 */
export const HEARTBEAT_STALE_MS = 2 * 60 * 1000;

/** Сколько строк читать из стейджинга за один запрос. */
export const STAGING_PAGE_SIZE = 500;

export type MigrationRunRow = typeof migrationRuns.$inferSelect;

/**
 * Прогон по идентификатору внутри организации.
 *
 * БЫЛО: `organizationId` был необязателен, и без него запрос шёл голым `db` —
 * то есть под RLS отдавал 0 строк из воркера и полагался на автообёртку из
 * маршрута. СТАЛО: арендатор обязателен и задаёт контекст явно. Условие на
 * organization_id в WHERE оставлено сознательно — оно не лишнее: политика
 * защищает от чужого арендатора, а WHERE выражает намерение в коде и переживёт
 * любое будущее ослабление политики.
 */
export async function findRun(
	runId: string,
	organizationId: string,
): Promise<MigrationRunRow | null> {
	return withTenantCtx(organizationId, async (tx) => {
		const [run] = await tx
			.select()
			.from(migrationRuns)
			.where(
				and(
					eq(migrationRuns.id, runId),
					eq(migrationRuns.organizationId, organizationId),
				),
			);
		return run ?? null;
	});
}

export interface CreateRunInput {
	organizationId: string;
	startedByUserId: string | null;
	sourceName: string;
	sourceKind: MigrationRunRow["sourceKind"];
	sourceFingerprint: string;
	sourceBytes: number;
	uploadPath: string;
	uploadFileName: string;
	detectedEncoding: string;
	encodingConfidence: number;
}

/** Создаёт прогон в состоянии draft: файл залит, ничего ещё не разобрано. */
export async function createRun(
	input: CreateRunInput,
): Promise<MigrationRunRow> {
	// INSERT — единственная операция, которая под RLS падает ГРОМКО (42501), а не
	// отдаёт молча 0 строк: WITH CHECK политики требует совпадения арендатора.
	// Тенант-контекст здесь обязателен даже на пути маршрута.
	return withTenantCtx(input.organizationId, async (tx) => {
		const [run] = await tx
			.insert(migrationRuns)
			.values({
				organizationId: input.organizationId,
				sourceName: input.sourceName,
				sourceKind: input.sourceKind,
				sourceFingerprint: input.sourceFingerprint,
				sourceBytes: input.sourceBytes,
				uploadPath: input.uploadPath,
				uploadFileName: input.uploadFileName,
				detectedEncoding: input.detectedEncoding,
				encodingConfidence: input.encodingConfidence,
				status: "draft",
				phase: "Файл принят, ожидает сопоставления",
				dryRun: true,
				startedByUserId: input.startedByUserId,
			})
			.returning();
		if (!run) throw new Error("Не удалось создать запись прогона переноса.");
		return run;
	});
}

export interface UpdateRunPatch {
	status?: MigrationRunStatus;
	phase?: string;
	mappingJson?: MigrationMappingSnapshot | null;
	vendorProfile?: string | null;
	/** Уточняются на фазе сопоставления: голова файла читается только там. */
	sourceKind?: MigrationRunRow["sourceKind"];
	detectedEncoding?: string | null;
	encodingConfidence?: number | null;
	sourceRows?: number;
	stagedRows?: number;
	loadedRows?: number;
	updatedRows?: number;
	duplicateRows?: number;
	quarantinedRows?: number;
	skippedRows?: number;
	llmCalls?: number;
	llmRejectedSuggestions?: number;
	progressTotal?: number;
	progressDone?: number;
	dryRun?: boolean;
	workerId?: string | null;
	heartbeatAt?: Date | null;
	queuedAt?: Date | null;
	startedAt?: Date | null;
	finishedAt?: Date | null;
	errorClass?: string | null;
	errorMessage?: string | null;
	resumeCount?: number;
	uploadPath?: string | null;
}

/**
 * Правка полей прогона.
 *
 * `organizationId` добавлен в сигнатуру именно для тенант-контекста: без него
 * UPDATE из воркера совпадал с нулём строк и МОЛЧА ничего не делал — статус
 * прогона не менялся, ошибка не возникала, и понять это по логам было нельзя.
 */
export async function updateRun(
	runId: string,
	organizationId: string,
	patch: UpdateRunPatch,
): Promise<void> {
	await withTenantCtx(organizationId, async (tx) => {
		await tx
			.update(migrationRuns)
			.set({ ...patch, updatedAt: new Date() })
			.where(
				and(
					eq(migrationRuns.id, runId),
					eq(migrationRuns.organizationId, organizationId),
				),
			);
	});
}

/**
 * Отметка живучести плюс, при необходимости, фаза и прогресс.
 *
 * ПОЧЕМУ ЗДЕСЬ transactionStorage.exit() — ЭТО ИЗМЕРЕННОЕ ТРЕБОВАНИЕ, А НЕ УКРАШЕНИЕ
 *
 * Отметка живучести существует ровно для того, чтобы её видел ДРУГОЙ процесс: по
 * ней он решает, жив ли владелец прогона или прогон осиротел и его надо
 * подобрать. Значит она обязана быть ЗАКОММИЧЕНА немедленно.
 *
 * БЫЛО: просто `withTenantCtx(...)`. В воркере это работало — там внешней
 * транзакции нет, открывалась своя, коммит был сразу. Но `withTenantCtx`
 * РЕЕНТЕРАБЕЛЬНА (rls.ts:108): внутри уже открытой транзакции она
 * ПЕРЕИСПОЛЬЗУЕТ её вместо того, чтобы открыть свою. А обработчики маршрутов
 * server.ts заворачивает автообёрткой, и там пульс попадал в транзакцию запроса
 * — то есть коммитился только в самом конце запроса, а до тех пор снаружи не был
 * виден вовсе.
 *
 * ИЗМЕРЕНО до правки: из второго соединения во время работы прогона поле phase
 * уже показывало новое значение, а heartbeat_at оставался СТАРЫМ — то есть
 * запись висела незакоммиченной. Подбор осиротевших прогонов в таком режиме
 * сломан: сирота выглядит живым, пока идёт запрос, и мёртвым сразу после.
 *
 * СТАЛО: `transactionStorage.exit()` синхронно убирает store у AsyncLocalStorage,
 * поэтому вложенный `withTenantCtx` НЕ находит внешнюю транзакцию и открывает
 * свою — она коммитится сразу и видна снаружи немедленно.
 *
 * ЦЕНА. exit() заставляет взять ВТОРОЕ соединение из пула (пул = 10) на время
 * записи. Это одиночный короткий UPDATE в собственной транзакции, миллисекунды,
 * и он тут же возвращает соединение. Частота пульса — раз на партию (500 строк
 * загрузки либо 1000 строк укладки), то есть единицы вызовов в секунду в худшем
 * случае, а не сотни. Тот же приём по той же причине уже применён в
 * routes/xray.ts и в speech/storage.ts:1114.
 */
export async function heartbeat(
	runId: string,
	organizationId: string,
	phase?: string,
	progressDone?: number,
): Promise<void> {
	await transactionStorage.exit(() =>
		withTenantCtx(organizationId, async (tx) => {
			await tx
				.update(migrationRuns)
				.set({
					heartbeatAt: new Date(),
					updatedAt: new Date(),
					...(phase === undefined ? {} : { phase }),
					...(progressDone === undefined ? {} : { progressDone }),
				})
				.where(
					and(
						eq(migrationRuns.id, runId),
						eq(migrationRuns.organizationId, organizationId),
					),
				);
		}),
	);
}

/**
 * Ставит прогон в очередь на выполнение.
 *
 * Проверяет текущий статус в том же запросе: два одновременных нажатия
 * «выполнить» не должны поставить прогон в очередь дважды. Условие на статус
 * внутри WHERE делает это атомарным без отдельной блокировки.
 */
export async function enqueueRun(
	runId: string,
	organizationId: string,
	dryRun: boolean,
): Promise<boolean> {
	return withTenantCtx(organizationId, async (tx) => {
		const updated = await tx
			.update(migrationRuns)
			.set({
				status: "queued",
				dryRun,
				queuedAt: new Date(),
				phase: "В очереди на выполнение",
				errorClass: null,
				errorMessage: null,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(migrationRuns.id, runId),
					eq(migrationRuns.organizationId, organizationId),
					// Ставить в очередь можно только то, что разобрано и ещё не выполняется.
					inArray(migrationRuns.status, [
						"validated",
						"failed",
						"draft",
						"mapping",
					]),
				),
			)
			.returning({ id: migrationRuns.id });
		return updated.length > 0;
	});
}

/**
 * Захватывает следующий прогон из очереди либо осиротевший.
 *
 * ПОЧЕМУ В ДВА ШАГА, А НЕ ОДНИМ ЗАПРОСОМ
 * Воркер по своей природе межарендный: он не знает заранее, у какой клиники
 * появилась работа. Но записывать под обходом НЕЛЬЗЯ, и это не осторожность, а
 * измеренный факт: дизъюнкт обхода стоит только в USING политики, в WITH CHECK
 * его нет. ИЗМЕРЕНО: тот же захватывающий UPDATE под `app.superuser_bypass=on`
 * падает с 42501 «новая строка нарушает политику защиты на уровне строк». То
 * есть обход даёт ЧТЕНИЕ и только чтение.
 *
 * Отсюда устройство, повторяющее эталон listOutboxOrganizations из
 * services/communications/dispatcher.ts:
 *
 *   Шаг 1 — под обходом, СТРОГО ОДИН SELECT: «чей прогон следующий». Читаются
 *           ДВЕ КОЛОНКИ — идентификатор прогона и идентификатор организации.
 *           Ни одной строки чужих данных под обход не попадает.
 *   Шаг 2 — под тенант-контекстом этой организации: собственно захват.
 *
 * ПОЧЕМУ РАЗРЫВ МЕЖДУ ШАГАМИ БЕЗОПАСЕН. Между шагами другой процесс может
 * успеть забрать тот же прогон. Захват на шаге 2 остаётся атомарным сравнением
 * с записью: условие на статус ('queued' либо loading с протухшей отметкой)
 * стоит внутри WHERE, поэтому опоздавший совпадёт с нулём строк и вернёт null, а
 * цикл воркера просто попробует снова. Двойного исполнения не возникает.
 * FOR UPDATE SKIP LOCKED на шаге 2 сохранён и работает в границах одной
 * организации — ИЗМЕРЕНО: под тенант-контекстом клиники A захват берёт прогон
 * клиники A и не видит прогон клиники B.
 *
 * ПОЧЕМУ transactionStorage.exit() ЗДЕСЬ ТОЖЕ
 * Захват обязан быть ВИДИМ немедленно — иначе второй исполнитель возьмёт тот же
 * прогон и начнёт его грузить параллельно. ИЗМЕРЕНО до правки: внутри внешней
 * транзакции (как из обработчика маршрута) `claimNextRun` возвращал `loading`,
 * но чтение из второго соединения видело `queued` до коммита. То есть
 * реентерабельность `withTenantCtx` (rls.ts:108) сливала захват в транзакцию
 * запроса, и коммит откладывался. Та же проблема, что у пульса. `exit()` лечит
 * тем же способом: синхронно убирает store, заставляет открыть свою транзакцию,
 * захват коммитится сразу.
 */
export async function claimNextRun(): Promise<MigrationRunRow | null> {
	const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);

	// ---- Шаг 1: чей прогон следующий. Единственное межарендное чтение.
	const candidate = await withSuperuserBypass(async (tx) => {
		const [row] = await tx
			.select({
				id: migrationRuns.id,
				organizationId: migrationRuns.organizationId,
			})
			.from(migrationRuns)
			.where(
				or(
					eq(migrationRuns.status, "queued"),
					and(
						eq(migrationRuns.status, "loading"),
						or(
							isNull(migrationRuns.heartbeatAt),
							lt(migrationRuns.heartbeatAt, staleBefore),
						),
					),
				),
			)
			// `asc nulls first` дословно, а не drizzle-хелпер asc(): в PostgreSQL у
			// ASC умолчание NULLS LAST, и прогон без queued_at (осиротевший, ещё ни
			// разу не ставившийся в очередь) уехал бы в конец очереди вместо начала.
			.orderBy(sql`${migrationRuns.queuedAt} asc nulls first`)
			.limit(1);
		return row ?? null;
	});

	if (!candidate) return null;

	// ---- Шаг 2: захват в контексте этой клиники и только её, своей короткой
	// транзакцией (exit() принудительно), чтобы коммит был немедленным.
	return transactionStorage.exit(() =>
		withTenantCtx(candidate.organizationId, async (tx) => {
			const claimed = await tx
				.update(migrationRuns)
				.set({
					status: "loading",
					workerId: WORKER_ID,
					heartbeatAt: new Date(),
					startedAt: sql`coalesce(${migrationRuns.startedAt}, now())`,
					// Подбор осиротевшего считается отдельно от первого запуска.
					resumeCount: sql`case when ${migrationRuns.status} = 'loading' then ${migrationRuns.resumeCount} + 1 else ${migrationRuns.resumeCount} end`,
					updatedAt: new Date(),
				})
				.where(
					eq(
						migrationRuns.id,
						sql`(
          select ${migrationRuns.id} from ${migrationRuns}
          where ${migrationRuns.id} = ${candidate.id}
            and (${migrationRuns.status} = 'queued'
             or (${migrationRuns.status} = 'loading'
                 and (${migrationRuns.heartbeatAt} is null or ${migrationRuns.heartbeatAt} < ${staleBefore})))
          for update skip locked
          limit 1
        )`,
					),
				)
				.returning();

			return claimed[0] ?? null;
		}),
	);
}

/**
 * Помечает прогоны, брошенные этим процессом при прошлом запуске.
 *
 * Вызывается один раз на старте. Свои прогоны узнаются по worker_id: после
 * перезапуска pid тот же практически никогда, но хост совпадает, и прогон всё
 * равно будет подобран по устаревшей отметке живучести. Сброс владельца делает
 * подбор мгновенным, не дожидаясь окна живучести.
 *
 * Та же двухшаговая схема, что и в claimNextRun, и по той же причине: найти свои
 * прогоны можно только межарендным чтением, а СНЯТЬ владельца — это запись, и
 * под обходом она отказывает с 42501. Поэтому обход читает пары
 * (прогон, организация), а освобождение идёт по одной клинике в своей
 * транзакции.
 */
export async function releaseOwnRuns(): Promise<number> {
	const own = await withSuperuserBypass(async (tx) =>
		tx
			.select({
				id: migrationRuns.id,
				organizationId: migrationRuns.organizationId,
			})
			.from(migrationRuns)
			.where(
				and(
					eq(migrationRuns.status, "loading"),
					eq(migrationRuns.workerId, WORKER_ID),
				),
			),
	);

	if (own.length === 0) return 0;

	// Группировка по клинике: одна транзакция на клинику, а не на строку.
	const byOrganization = new Map<string, string[]>();
	for (const row of own) {
		const group = byOrganization.get(row.organizationId) ?? [];
		group.push(row.id);
		byOrganization.set(row.organizationId, group);
	}

	let released = 0;
	for (const [organizationId, ids] of byOrganization) {
		const updated = await withTenantCtx(organizationId, async (tx) =>
			tx
				.update(migrationRuns)
				.set({
					workerId: null,
					heartbeatAt: null,
					phase: "Прервано перезапуском процесса, ожидает возобновления",
					updatedAt: new Date(),
				})
				.where(
					and(
						inArray(migrationRuns.id, ids),
						eq(migrationRuns.status, "loading"),
					),
				)
				.returning({ id: migrationRuns.id }),
		);
		released += updated.length;
	}
	return released;
}

/**
 * Сколько прогонов ждут исполнителя прямо сейчас.
 *
 * Обход оправдан и безопасен: это ЧТЕНИЕ, и оно отдаёт одно число по всем
 * клиникам — ни одной строки чужих данных наружу не уходит. Величина нужна
 * системному маршруту состояния, которому по смыслу и полагается видеть очередь
 * целиком.
 */
export async function pendingRunCount(): Promise<number> {
	const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);
	return withSuperuserBypass(async (tx) => {
		const [row] = await tx
			.select({ count: sql<string>`count(*)` })
			.from(migrationRuns)
			.where(
				or(
					eq(migrationRuns.status, "queued"),
					and(
						eq(migrationRuns.status, "loading"),
						or(
							isNull(migrationRuns.heartbeatAt),
							lt(migrationRuns.heartbeatAt, staleBefore),
						),
					),
				),
			);
		return Number(row?.count ?? 0);
	});
}

// ---------------------------------------------------------------------------
// Чтение стейджинга
// ---------------------------------------------------------------------------

/**
 * Восстанавливает StagedRow из строки базы.
 *
 * Поле issues намеренно пустое. Строка со статусом ready по определению не имеет
 * блокирующих проблем: те, что были, уже привели к статусу quarantined на этапе
 * укладки, и записи о них лежат в migration_quarantine_records. Возвращать их
 * снова означало бы либо пересчитывать разбор, либо читать карантин на каждую
 * строку — и то и другое лишнее.
 */
function toStagedRow(
	record: typeof migrationStagingRecords.$inferSelect,
): StagedRow {
	const transformed: TransformedRow = {
		entityKind: record.entityKind,
		values: record.normalizedJson ?? {},
		lineage: (record.lineageJson ?? []) as MigrationFieldLineage[],
		issues: [],
		confidence: record.confidence,
	};

	return {
		stagingId: record.id,
		sourceRowNumber: record.sourceRowNumber,
		sourceTable: record.sourceTable,
		raw: record.rawJson,
		rawHash: record.rawHash,
		transformed,
		naturalKey: record.naturalKey,
		issues: [],
	};
}

/**
 * Партия строк, готовых к загрузке.
 *
 * Порядок по (source_table, source_row_number) не для красоты: он делает
 * прогресс монотонным. Оператор видит «дошли до строки 40 000», и после
 * возобновления счётчик продолжает расти, а не прыгает.
 */
export async function readReadyRows(
	runId: string,
	organizationId: string,
	entityKind: MigrationEntityKind,
	limit = STAGING_PAGE_SIZE,
): Promise<StagedRow[]> {
	return withTenantCtx(organizationId, async (tx) => {
		const records = await tx
			.select()
			.from(migrationStagingRecords)
			.where(
				and(
					eq(migrationStagingRecords.runId, runId),
					eq(migrationStagingRecords.organizationId, organizationId),
					eq(migrationStagingRecords.entityKind, entityKind),
					eq(migrationStagingRecords.status, "ready"),
				),
			)
			.orderBy(
				asc(migrationStagingRecords.sourceTable),
				asc(migrationStagingRecords.sourceRowNumber),
			)
			.limit(limit);

		return records.map(toStagedRow);
	});
}

/** Сущности, по которым в прогоне есть готовые строки, в порядке загрузки. */
export async function readyEntityKinds(
	runId: string,
	organizationId: string,
): Promise<MigrationEntityKind[]> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.selectDistinct({ entityKind: migrationStagingRecords.entityKind })
			.from(migrationStagingRecords)
			.where(
				and(
					eq(migrationStagingRecords.runId, runId),
					eq(migrationStagingRecords.organizationId, organizationId),
					eq(migrationStagingRecords.status, "ready"),
				),
			),
	);

	/**
	 * Порядок обязателен: приёмы и платежи ссылаются на пациента через таблицу
	 * соответствий, и если грузить их раньше пациентов, все ссылки окажутся
	 * битыми, а строки уедут в карантин с broken_reference. Пациенты и врачи —
	 * первыми, зависимые — после.
	 */
	const order: MigrationEntityKind[] = [
		"patient",
		"doctor",
		"service",
		"appointment",
		"visit",
		"payment",
		"tooth_state",
		"treatment_plan",
		"document",
		"unknown",
	];
	const present = new Set(rows.map((row) => row.entityKind));
	return order.filter((kind) => present.has(kind));
}

export interface StagingCounts {
	total: number;
	ready: number;
	loaded: number;
	updated: number;
	duplicate: number;
	quarantined: number;
	skipped: number;
	pending: number;
}

/** Пересчитывает состояние стейджинга. Источник истины для прогресса и счётчиков. */
export async function countStagingByStatus(
	runId: string,
	organizationId: string,
): Promise<StagingCounts> {
	const rows = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({
				status: migrationStagingRecords.status,
				count: sql<string>`count(*)`,
			})
			.from(migrationStagingRecords)
			.where(
				and(
					eq(migrationStagingRecords.runId, runId),
					eq(migrationStagingRecords.organizationId, organizationId),
				),
			)
			.groupBy(migrationStagingRecords.status),
	);

	const counts: StagingCounts = {
		total: 0,
		ready: 0,
		loaded: 0,
		updated: 0,
		duplicate: 0,
		quarantined: 0,
		skipped: 0,
		pending: 0,
	};

	for (const row of rows) {
		const amount = Number(row.count);
		counts.total += amount;
		switch (row.status) {
			case "ready":
				counts.ready += amount;
				break;
			case "loaded":
				counts.loaded += amount;
				break;
			case "updated":
				counts.updated += amount;
				break;
			case "duplicate":
				counts.duplicate += amount;
				break;
			case "quarantined":
				counts.quarantined += amount;
				break;
			case "skipped":
				counts.skipped += amount;
				break;
			default:
				counts.pending += amount;
				break;
		}
	}

	return counts;
}

/**
 * Помечает конкретные строки пропущенными по их идентификаторам.
 *
 * Условие на статус ready в WHERE обязательно: строка, которую параллельный
 * процесс успел загрузить, не должна превратиться в пропущенную.
 */
export async function markRowsSkipped(
	organizationId: string,
	stagingIds: string[],
): Promise<number> {
	if (stagingIds.length === 0) return 0;
	const updated = await withTenantCtx(organizationId, async (tx) =>
		tx
			.update(migrationStagingRecords)
			.set({ status: "skipped", updatedAt: new Date() })
			.where(
				and(
					inArray(migrationStagingRecords.id, stagingIds),
					eq(migrationStagingRecords.organizationId, organizationId),
					eq(migrationStagingRecords.status, "ready"),
				),
			)
			.returning({ id: migrationStagingRecords.id }),
	);
	return updated.length;
}

/**
 * Переводит оставшиеся ready-строки в skipped.
 *
 * Нужно в двух случаях: сухой прогон закончился (записи не было, но строки не
 * должны остаться без исхода) и сущность, для которой автоматической загрузки
 * нет. Без этого сверка справедливо признала бы строки потерянными.
 */
export async function markRemainingReadyAsSkipped(
	runId: string,
	organizationId: string,
	entityKind?: MigrationEntityKind,
): Promise<number> {
	const conditions = [
		eq(migrationStagingRecords.runId, runId),
		eq(migrationStagingRecords.organizationId, organizationId),
		eq(migrationStagingRecords.status, "ready"),
	];
	if (entityKind)
		conditions.push(eq(migrationStagingRecords.entityKind, entityKind));

	const updated = await withTenantCtx(organizationId, async (tx) =>
		tx
			.update(migrationStagingRecords)
			.set({ status: "skipped", updatedAt: new Date() })
			.where(and(...conditions))
			.returning({ id: migrationStagingRecords.id }),
	);
	return updated.length;
}

/**
 * Сумма платежей в копейках ПО ДАННЫМ СТЕЙДЖИНГА.
 *
 * ЭТО НЕ СУММА ИСТОЧНИКА, и подставлять её в reconcileRun под именем
 * sourceMoneyTotalKopecks нельзя. Сверка считает вторую сторону того же баланса
 * ровно этим же выражением (moneyTotals().stagedKopecks в reconcile.ts), поэтому
 * проверка money_parse_completeness_kopecks сравнивала бы стейджинг сам с собой:
 * разность тождественно ноль, проверка не может провалиться, а акт переноса
 * печатает «разобрана полностью, копейка в копейку» как доказательство. Так и
 * было в finishRunPhase (phases.ts) до этой правки. Независимая точка отсчёта
 * считается ДО загрузки, из исходных значений: sourceMoneyTotalFromRows в
 * engine.ts.
 *
 * Сейчас у функции нет вызывающих. Оставлена как диагностика (сколько денег
 * лежит в стейджинге) вместе с этим предупреждением: без него следующий автор
 * вернёт её ровно на то место, откуда её убрали.
 */
export async function stagedMoneyKopecks(
	runId: string,
	organizationId: string,
): Promise<number | null> {
	const row = await withTenantCtx(organizationId, async (tx) => {
		const [found] = await tx
			.select({
				total: sql<
					string | null
				>`sum((${migrationStagingRecords.normalizedJson} ->> 'amountKopecks')::numeric)`,
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

	if (row?.total === null || row?.total === undefined) return null;
	return Math.round(Number(row.total));
}
