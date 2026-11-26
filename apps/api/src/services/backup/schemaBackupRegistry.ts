import { getTableColumns, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import type pg from "pg";
import * as schema from "../../db/schema/index.js";

/**
 * Закрытый белый список эфемерных таблиц (одноразовые OTP/ссылки, ключи
 * идемпотентности с минутным TTL) и глобальных системных справочников без
 * принадлежности к тенанту.
 *
 * ЛЮБАЯ новая таблица в schema/, отсутствующая здесь и не имеющая пути к
 * organizations через organization_id или FK, немедленно провалит CI-тест
 * `backupSchemaParity.test.ts`.
 */
export const EXPLICIT_NON_TENANT_TABLES: ReadonlySet<string> = new Set([
	// Эфемерные кэши, одноразовые коды и ключи идемпотентности
	"idempotency_keys",
	"sync_idempotency_records",
	"portal_otp_codes",
	"portal_revoked_tokens",
	"dente_telegram_link_codes",
	// Глобальные неизменяемые клинические и документооборотные каталоги
	"clinical_teeth_catalog",
	"tooth_defects_catalog",
	"mkb_categories",
	"document_template_categories",
	"document_template_variables",
	"outpatient_template_categories",
	"outpatient_templates",
]);

/**
 * Таблицы журнала аудита (мера РСБ.7 приказа ФСТЭК N 21): append-only WORM.
 * Право DELETE отозвано, UPDATE запрещён триггерами — при восстановлении
 * не очищаются и конфликты по PK разрешаются через ON CONFLICT DO NOTHING.
 */
export const APPEND_ONLY_AUDIT_TABLES: ReadonlySet<string> = new Set([
	"audit_events",
	"clinical_audit_logs",
	"audit_actions",
]);

/**
 * Приоритетные nullable-колонки для детерминированного разрыва циклов и self-FK
 * при топологической сортировке (алгоритм Кана), без `SET session_replication_role = 'replica'`.
 */
const CYCLE_BREAKER_PREFERRED_EDGES: ReadonlySet<string> = new Set([
	"patients.merged_into_patient_id",
	"patients.family_group_id",
	"family_groups.head_patient_id",
	"lab_orders.parent_lab_order_id",
	"appointments.rebooking_source_visit_id",
	"visits.appointment_id",
]);

/**
 * При `sanitizeForSupport: true` эти поля очищаются в поддержке.
 * В штатном Disaster Recovery (`sanitizeForSupport: false`) сохраняются 100% колонок,
 * включая `password_hash`, `pin_code_hash` и `login_id`, чтобы персонал мог войти после восстановления.
 */
const SUPPORT_SANITIZE_NULL_COLUMNS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
	["organizations", new Set(["password_hash", "login_id"])],
	["users", new Set(["password_hash", "pin_code_hash", "current_session_id", "yandex_calendar_token"])],
	["dente_telegram_bot_configs", new Set(["bot_token_encrypted", "webhook_secret"])],
	["dente_whatsapp_bot_configs", new Set(["access_token_encrypted", "verify_token", "app_secret_encrypted"])],
	["dente_vk_bot_configs", new Set(["access_token_encrypted", "confirmation_code", "secret_key"])],
	["dente_max_bot_configs", new Set(["bot_token_encrypted", "webhook_secret"])],
	["dente_telegram_account_configs", new Set(["session_string_encrypted", "api_hash_encrypted"])],
	["sms_gateways", new Set(["api_key_encrypted", "api_secret_encrypted"])],
]);

export interface ForeignKeyEdgeInput {
	readonly srcTable: string;
	readonly srcCols: readonly string[];
	readonly dstTable: string;
	readonly dstCols: readonly string[];
	readonly nullable: boolean;
}

/**
 * Реальные FK-ограничения PostgreSQL 18 из миграций, не продублированные `.references()`
 * в определениях Drizzle (верифицировано по `pg_constraint`).
 */
const SUPPLEMENTAL_PG_FKS: readonly ForeignKeyEdgeInput[] = [
	{
		srcTable: "patients",
		srcCols: ["merged_into_patient_id"],
		dstTable: "patients",
		dstCols: ["id"],
		nullable: true,
	},
	{
		srcTable: "patients",
		srcCols: ["home_clinic_id"],
		dstTable: "clinics",
		dstCols: ["id"],
		nullable: true,
	},
	{
		srcTable: "document_signatures",
		srcCols: ["document_id"],
		dstTable: "generated_documents",
		dstCols: ["id"],
		nullable: false,
	},
	{
		srcTable: "document_signatures",
		srcCols: ["patient_id"],
		dstTable: "patients",
		dstCols: ["id"],
		nullable: true,
	},
];

export type BackupTableKind = "TENANT_OWNED_DIRECT" | "TENANT_OWNED_CHILD";

export interface BackupColumnMeta {
	readonly sqlName: string;
	readonly tsKey: string;
	readonly dataType: string;
	readonly columnType: string;
	readonly sqlType: string;
	readonly notNull: boolean;
}

export interface FkJoinStep {
	readonly childTable: string;
	readonly childCol: string;
	readonly parentTable: string;
	readonly parentCol: string;
}

export interface DeferredLinkRecord {
	readonly table: string;
	readonly pk: Record<string, unknown>;
	readonly col: string;
	readonly val: unknown;
}

export interface BackupTableMeta {
	readonly sqlName: string;
	readonly exportName: string;
	readonly kind: BackupTableKind;
	readonly pkSqlCols: readonly string[];
	readonly columns: readonly BackupColumnMeta[];
	readonly columnsBySqlName: ReadonlyMap<string, BackupColumnMeta>;
	readonly tsKeyToSqlName: ReadonlyMap<string, string>;
	readonly hasOrgIdColumn: boolean;
	readonly orgIdNotNull: boolean;
	readonly isAppendOnly: boolean;
	readonly deferredNullableColumns: readonly string[];
	readonly parentChainToOrg: readonly FkJoinStep[];
	buildSelectPageSql(hasCursor: boolean): string;
	buildDeleteChildSql(): string;
	buildClearDeferredSql(): string | null;
	extractDeferredLinks(
		rows: ReadonlyArray<Record<string, unknown>>,
		onLink: (record: DeferredLinkRecord) => void,
	): Array<Record<string, unknown>>;
	insertBatchMultiRow(
		pgClient: pg.Client,
		rows: ReadonlyArray<Record<string, unknown>>,
		expectedOrganizationId: string,
	): Promise<number>;
	normalizeLegacyRowKeys(rawRow: Record<string, unknown>): Record<string, unknown>;
	sanitizeRowForSupport(row: Record<string, unknown>): Record<string, unknown>;
}

export interface SchemaBackupDag {
	readonly allSchemaTablesCount: number;
	readonly orderedTables: readonly BackupTableMeta[];
	readonly bySqlName: ReadonlyMap<string, BackupTableMeta>;
	readonly byExportName: ReadonlyMap<string, BackupTableMeta>;
	readonly explicitExcludedTables: ReadonlySet<string>;
}

interface RawTableNode {
	readonly sqlName: string;
	readonly exportName: string;
	readonly pkSqlCols: readonly string[];
	readonly columns: readonly BackupColumnMeta[];
	readonly fks: ForeignKeyEdgeInput[];
}

function quoteIdent(ident: string): string {
	return `"${ident.replace(/"/g, '""')}"`;
}

function camelToSnakeFallback(key: string): string {
	return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function serializeCellValueForPg(val: unknown, colMeta: BackupColumnMeta): unknown {
	if (val === undefined) return null;
	if (val === null) return null;

	if (colMeta.dataType === "json" || colMeta.columnType === "PgJsonb") {
		if (typeof val === "string") {
			// Drizzle/PG иногда возвращает строковые значения JSONB; убеждаемся, что сохраняем валидный JSON.
			return JSON.stringify(val);
		}
		return JSON.stringify(val);
	}

	if (colMeta.columnType === "PgCustomColumn") {
		// pgvector vector(1536): node-postgres преобразует JS-массив в {a,b}, поэтому передаём '[a,b]'
		if (Array.isArray(val)) return JSON.stringify(val);
		return val;
	}

	if (colMeta.dataType === "bigint") {
		return typeof val === "bigint" ? val.toString() : String(val);
	}

	if (val instanceof Date) {
		return val.toISOString();
	}

	return val;
}

export function serializeSnapshotValueForNdjson(value: unknown): unknown {
	if (typeof value === "bigint") return value.toString();
	if (value instanceof Date) return value.toISOString();
	return value;
}

function buildTenantPredicateSql(
	kind: BackupTableKind,
	sqlName: string,
	alias: string,
	parentChain: readonly FkJoinStep[],
): string {
	if (sqlName === "organizations") {
		return `${alias}."id" = $1`;
	}
	if (kind === "TENANT_OWNED_DIRECT") {
		return `${alias}."organization_id" = $1`;
	}
	const firstStep = parentChain[0];
	if (!firstStep) {
		throw new Error(`Child table "${sqlName}" is missing FK path to organization_id`);
	}
	const joinClauses: string[] = [];
	for (let i = 1; i < parentChain.length; i += 1) {
		const step = parentChain[i];
		if (!step) continue;
		const prevAlias = `p${i - 1}`;
		const curAlias = `p${i}`;
		joinClauses.push(
			`JOIN "public".${quoteIdent(step.parentTable)} AS ${curAlias} ON ${curAlias}.${quoteIdent(step.parentCol)} = ${prevAlias}.${quoteIdent(step.childCol)}`,
		);
	}
	const rootAlias = `p${parentChain.length - 1}`;
	const rootStep = parentChain[parentChain.length - 1];
	const rootOrgExpr =
		rootStep?.parentTable === "organizations"
			? `${rootAlias}."id" = $1`
			: `${rootAlias}."organization_id" = $1`;

	return (
		`EXISTS (SELECT 1 FROM "public".${quoteIdent(firstStep.parentTable)} AS p0 ` +
		`${joinClauses.join(" ")} ` +
		`WHERE p0.${quoteIdent(firstStep.parentCol)} = ${alias}.${quoteIdent(firstStep.childCol)} ` +
		`AND ${rootOrgExpr})`
	);
}

function computeParentChainToOrg(
	startTable: string,
	directTables: ReadonlySet<string>,
	allNodes: ReadonlyMap<string, RawTableNode>,
): FkJoinStep[] | null {
	const queue: Array<{ table: string; chain: FkJoinStep[] }> = [{ table: startTable, chain: [] }];
	const visited = new Set<string>([startTable]);

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		const node = allNodes.get(current.table);
		if (!node) continue;

		// Сортируем FK детерминированно: ненулевые FK в приоритете перед nullable.
		const sortedFks = [...node.fks].sort((a, b) => {
			if (a.nullable !== b.nullable) return a.nullable ? 1 : -1;
			return a.dstTable.localeCompare(b.dstTable);
		});

		for (const fk of sortedFks) {
			if (fk.dstTable === current.table) continue;
			if (fk.srcCols.length !== 1 || fk.dstCols.length !== 1) continue;
			const childCol = fk.srcCols[0];
			const parentCol = fk.dstCols[0];
			if (!childCol || !parentCol) continue;

			const nextChain: FkJoinStep[] = [
				...current.chain,
				{
					childTable: current.table,
					childCol,
					parentTable: fk.dstTable,
					parentCol,
				},
			];

			if (directTables.has(fk.dstTable)) {
				return nextChain;
			}
			if (!visited.has(fk.dstTable)) {
				visited.add(fk.dstTable);
				queue.push({ table: fk.dstTable, chain: nextChain });
			}
		}
	}

	return null;
}

function findMultiNodeSccs(
	nodeNames: readonly string[],
	adj: ReadonlyMap<string, ReadonlyArray<{ to: string; col: string; nullable: boolean }>>,
): string[][] {
	let indexCounter = 0;
	const indices = new Map<string, number>();
	const lowlink = new Map<string, number>();
	const onStack = new Set<string>();
	const stack: string[] = [];
	const sccs: string[][] = [];

	function strongconnect(v: string): void {
		indices.set(v, indexCounter);
		lowlink.set(v, indexCounter);
		indexCounter += 1;
		stack.push(v);
		onStack.add(v);

		for (const edge of adj.get(v) ?? []) {
			if (!indices.has(edge.to)) {
				strongconnect(edge.to);
				const vLow = lowlink.get(v) ?? 0;
				const toLow = lowlink.get(edge.to) ?? 0;
				if (toLow < vLow) lowlink.set(v, toLow);
			} else if (onStack.has(edge.to)) {
				const vLow = lowlink.get(v) ?? 0;
				const toIdx = indices.get(edge.to) ?? 0;
				if (toIdx < vLow) lowlink.set(v, toIdx);
			}
		}

		if (lowlink.get(v) === indices.get(v)) {
			const component: string[] = [];
			while (true) {
				const w = stack.pop();
				if (w === undefined) break;
				onStack.delete(w);
				component.push(w);
				if (w === v) break;
			}
			if (component.length > 1) {
				sccs.push(component);
			}
		}
	}

	for (const name of nodeNames) {
		if (!indices.has(name)) strongconnect(name);
	}
	return sccs;
}

export function buildSchemaBackupDag(
	extraLiveFks: readonly ForeignKeyEdgeInput[] = [],
): SchemaBackupDag {
	const rawNodes = new Map<string, RawTableNode>();
	const byExportNameMap = new Map<string, string>();

	for (const [exportName, val] of Object.entries(schema)) {
		if (!is(val, PgTable)) continue;
		const cfg = getTableConfig(val);
		if (rawNodes.has(cfg.name)) {
			byExportNameMap.set(exportName, cfg.name);
			continue;
		}
		byExportNameMap.set(exportName, cfg.name);

		const drizzleCols = getTableColumns(val);
		const sqlToTsKey = new Map<string, string>();
		for (const [tsKey, col] of Object.entries(drizzleCols)) {
			sqlToTsKey.set(col.name, tsKey);
		}

		const columns: BackupColumnMeta[] = cfg.columns.map((col) => ({
			sqlName: col.name,
			tsKey: sqlToTsKey.get(col.name) ?? col.name,
			dataType: col.dataType,
			columnType: col.columnType,
			sqlType: col.getSQLType(),
			notNull: col.notNull,
		}));

		const pkSqlCols =
			cfg.primaryKeys.length > 0
				? (cfg.primaryKeys[0]?.columns.map((c) => c.name) ?? [])
				: cfg.columns.filter((c) => c.primary).map((c) => c.name);

		if (pkSqlCols.length === 0) {
			throw new Error(
				`[SchemaBackupRegistry] Таблица "${cfg.name}" не имеет PRIMARY KEY: детерминированная keyset-пагинация невозможна.`,
			);
		}

		const fks: ForeignKeyEdgeInput[] = cfg.foreignKeys.map((fk) => {
			const ref = fk.reference();
			return {
				srcTable: cfg.name,
				srcCols: ref.columns.map((c) => c.name),
				dstTable: getTableConfig(ref.foreignTable).name,
				dstCols: ref.foreignColumns.map((c) => c.name),
				nullable: ref.columns.some((c) => !c.notNull),
			};
		});

		rawNodes.set(cfg.name, {
			sqlName: cfg.name,
			exportName,
			pkSqlCols,
			columns,
			fks,
		});
	}

	// Сливаем дополнительные/живые FK из PG18 без дублирования
	for (const extra of [...SUPPLEMENTAL_PG_FKS, ...extraLiveFks]) {
		const node = rawNodes.get(extra.srcTable);
		if (!node || !rawNodes.has(extra.dstTable)) continue;
		const key = `${extra.srcCols.join(",")}->${extra.dstTable}`;
		const exists = node.fks.some(
			(f) => `${f.srcCols.join(",")}->${f.dstTable}` === key,
		);
		if (!exists) {
			node.fks.push(extra);
		}
	}

	const directTables = new Set<string>();
	for (const node of rawNodes.values()) {
		if (EXPLICIT_NON_TENANT_TABLES.has(node.sqlName)) continue;
		if (
			node.sqlName === "organizations" ||
			node.columns.some((c) => c.sqlName === "organization_id")
		) {
			directTables.add(node.sqlName);
		}
	}

	const childChains = new Map<string, readonly FkJoinStep[]>();
	const unclassifiedTables: string[] = [];

	for (const node of rawNodes.values()) {
		if (EXPLICIT_NON_TENANT_TABLES.has(node.sqlName)) continue;
		if (directTables.has(node.sqlName)) continue;

		const chain = computeParentChainToOrg(node.sqlName, directTables, rawNodes);
		if (chain) {
			childChains.set(node.sqlName, chain);
		} else {
			unclassifiedTables.push(node.sqlName);
		}
	}

	if (unclassifiedTables.length > 0) {
		throw new Error(
			`[SchemaBackupRegistry] ОБНАРУЖЕНЫ НЕКЛАССИФИЦИРОВАННЫЕ ТАБЛИЦЫ БЕЗ organization_id И БЕЗ FK-ПУТИ К organizations (${unclassifiedTables.length}): ${unclassifiedTables.join(", ")}. ` +
				`Либо добавьте organization_id / FK к родительской таблице тенанта, либо осознанно внесите таблицу в EXPLICIT_NON_TENANT_TABLES.`,
		);
	}

	const includedNames = [...directTables, ...childChains.keys()].sort();
	const includedSet = new Set(includedNames);

	const deferredByTable = new Map<string, Set<string>>();
	const dependencyEdges = new Map<
		string,
		Array<{ to: string; col: string; nullable: boolean }>
	>();

	for (const name of includedNames) {
		deferredByTable.set(name, new Set());
		dependencyEdges.set(name, []);
	}

	for (const name of includedNames) {
		const node = rawNodes.get(name);
		if (!node) continue;
		const edges = dependencyEdges.get(name);
		const deferred = deferredByTable.get(name);
		if (!edges || !deferred) continue;

		for (const fk of node.fks) {
			if (!includedSet.has(fk.dstTable)) continue;

			if (fk.dstTable === name) {
				// Self-FK: обязательно откладывается во 2-ю фазу
				if (!fk.nullable) {
					throw new Error(
						`[SchemaBackupRegistry] Неразрешимый NOT NULL self-FK на таблице "${name}" (${fk.srcCols.join(",")}).`,
					);
				}
				for (const col of fk.srcCols) deferred.add(col);
				continue;
			}

			const primaryCol = fk.srcCols[0] ?? "";
			const edgeId = `${name}.${primaryCol}`;
			if (fk.nullable && CYCLE_BREAKER_PREFERRED_EDGES.has(edgeId) && name !== "visits") {
				// Не рвём без нужды все предпочтительные — разорвём только если таблица реально в цикле SCC
			}
			edges.push({ to: fk.dstTable, col: primaryCol, nullable: fk.nullable });
		}
	}

	// Поиск и разрыв циклов (Tarjan SCC) путём переноса nullable FK в deferredNullableColumns
	while (true) {
		const sccs = findMultiNodeSccs(includedNames, dependencyEdges);
		if (sccs.length === 0) break;

		let brokeAny = false;
		for (const scc of sccs) {
			const sccSet = new Set(scc);
			const candidates: Array<{
				from: string;
				to: string;
				col: string;
				preferred: boolean;
			}> = [];

			for (const u of scc) {
				for (const e of dependencyEdges.get(u) ?? []) {
					if (sccSet.has(e.to) && e.nullable && e.col) {
						candidates.push({
							from: u,
							to: e.to,
							col: e.col,
							preferred: CYCLE_BREAKER_PREFERRED_EDGES.has(`${u}.${e.col}`),
						});
					}
				}
			}

			candidates.sort((a, b) => {
				if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
				return `${a.from}.${a.col}`.localeCompare(`${b.from}.${b.col}`);
			});

			const chosen = candidates[0];
			if (!chosen) {
				throw new Error(
					`[SchemaBackupRegistry] Неразрешимый цикл из NOT NULL внешних ключей между таблицами: ${scc.join(" <-> ")}`,
				);
			}

			deferredByTable.get(chosen.from)?.add(chosen.col);
			const currentEdges = dependencyEdges.get(chosen.from) ?? [];
			dependencyEdges.set(
				chosen.from,
				currentEdges.filter((e) => !(e.to === chosen.to && e.col === chosen.col)),
			);
			brokeAny = true;
			break;
		}

		if (!brokeAny) break;
	}

	// Алгоритм Кана: ребро `child -> parent` означает `parent` должен вставляться ДО `child`.
	const childrenOf = new Map<string, Set<string>>();
	const inDegree = new Map<string, number>();
	for (const name of includedNames) {
		childrenOf.set(name, new Set());
		inDegree.set(name, 0);
	}

	for (const child of includedNames) {
		const uniqueParents = new Set<string>();
		for (const dep of dependencyEdges.get(child) ?? []) {
			if (dep.to !== child) uniqueParents.add(dep.to);
		}
		for (const parent of uniqueParents) {
			childrenOf.get(parent)?.add(child);
		}
		inDegree.set(child, uniqueParents.size);
	}

	const readyQueue: string[] = [];
	for (const [name, deg] of inDegree.entries()) {
		if (deg === 0) readyQueue.push(name);
	}
	const sortReady = () =>
		readyQueue.sort((a, b) => {
			if (a === "organizations") return -1;
			if (b === "organizations") return 1;
			return a.localeCompare(b);
		});
	sortReady();

	const insertionOrderNames: string[] = [];
	while (readyQueue.length > 0) {
		const current = readyQueue.shift();
		if (!current) break;
		insertionOrderNames.push(current);

		for (const dependent of childrenOf.get(current) ?? []) {
			const nextDeg = (inDegree.get(dependent) ?? 1) - 1;
			inDegree.set(dependent, nextDeg);
			if (nextDeg === 0) {
				readyQueue.push(dependent);
				sortReady();
			}
		}
	}

	if (insertionOrderNames.length !== includedNames.length) {
		const remaining = includedNames.filter((n) => !insertionOrderNames.includes(n));
		throw new Error(
			`[SchemaBackupRegistry] Алгоритм Кана обнаружил остаточный цикл в графе таблиц: ${remaining.join(", ")}`,
		);
	}

	const orderedTables: BackupTableMeta[] = [];
	const bySqlName = new Map<string, BackupTableMeta>();

	for (const sqlName of insertionOrderNames) {
		const raw = rawNodes.get(sqlName);
		if (!raw) continue;

		const kind: BackupTableKind = directTables.has(sqlName)
			? "TENANT_OWNED_DIRECT"
			: "TENANT_OWNED_CHILD";
		const parentChain = childChains.get(sqlName) ?? [];
		const deferredCols = [...(deferredByTable.get(sqlName) ?? [])].sort();
		const deferredSet = new Set(deferredCols);

		const columnsBySqlName = new Map<string, BackupColumnMeta>();
		const tsKeyToSqlName = new Map<string, string>();
		for (const col of raw.columns) {
			columnsBySqlName.set(col.sqlName, col);
			tsKeyToSqlName.set(col.tsKey, col.sqlName);
		}
		const orgColMeta = columnsBySqlName.get("organization_id");
		const hasOrgIdColumn = Boolean(orgColMeta);
		const orgIdNotNull = orgColMeta?.notNull ?? false;

		const tenantWhere = buildTenantPredicateSql(kind, sqlName, "t", parentChain);
		const deleteWhere = buildTenantPredicateSql(
			kind,
			sqlName,
			quoteIdent(sqlName),
			parentChain,
		);
		const orderBySql = raw.pkSqlCols.map((c) => `t.${quoteIdent(c)} ASC`).join(", ");
		const isAppendOnly = APPEND_ONLY_AUDIT_TABLES.has(sqlName);

		const meta: BackupTableMeta = {
			sqlName,
			exportName: raw.exportName,
			kind,
			pkSqlCols: raw.pkSqlCols,
			columns: raw.columns,
			columnsBySqlName,
			tsKeyToSqlName,
			hasOrgIdColumn,
			orgIdNotNull,
			isAppendOnly,
			deferredNullableColumns: deferredCols,
			parentChainToOrg: parentChain,

			buildSelectPageSql(hasCursor: boolean): string {
				if (!hasCursor) {
					return `SELECT t.* FROM "public".${quoteIdent(sqlName)} AS t WHERE ${tenantWhere} ORDER BY ${orderBySql} LIMIT $2`;
				}
				if (raw.pkSqlCols.length === 1) {
					const pkCol = raw.pkSqlCols[0] ?? "id";
					return `SELECT t.* FROM "public".${quoteIdent(sqlName)} AS t WHERE ${tenantWhere} AND t.${quoteIdent(pkCol)} > $2 ORDER BY ${orderBySql} LIMIT $3`;
				}
				const tupleLeft = `(${raw.pkSqlCols.map((c) => `t.${quoteIdent(c)}`).join(", ")})`;
				const tupleRight = `(${raw.pkSqlCols.map((_, idx) => `$${idx + 2}`).join(", ")})`;
				const limitParam = raw.pkSqlCols.length + 2;
				return `SELECT t.* FROM "public".${quoteIdent(sqlName)} AS t WHERE ${tenantWhere} AND ${tupleLeft} > ${tupleRight} ORDER BY ${orderBySql} LIMIT $${limitParam}`;
			},

			buildDeleteChildSql(): string {
				return `DELETE FROM "public".${quoteIdent(sqlName)} WHERE ${deleteWhere}`;
			},

			buildClearDeferredSql(): string | null {
				if (deferredCols.length === 0) return null;
				const sets = deferredCols.map((c) => `${quoteIdent(c)} = NULL`).join(", ");
				return `UPDATE "public".${quoteIdent(sqlName)} SET ${sets} WHERE ${deleteWhere}`;
			},

			extractDeferredLinks(rows, onLink) {
				if (deferredSet.size === 0) {
					return rows.map((row) => ({ ...row }));
				}
				return rows.map((row) => {
					const copy: Record<string, unknown> = { ...row };
					const pk: Record<string, unknown> = {};
					for (const pkCol of raw.pkSqlCols) {
						pk[pkCol] = copy[pkCol];
					}
					for (const defCol of deferredCols) {
						const val = copy[defCol];
						if (val !== null && val !== undefined) {
							onLink({ table: sqlName, pk, col: defCol, val });
							copy[defCol] = null;
						}
					}
					return copy;
				});
			},

			async insertBatchMultiRow(pgClient, rows, expectedOrganizationId) {
				if (rows.length === 0) return 0;

				// Определяем общий набор валидных SQL-колонок, присутствующих хотя бы в 1 строке батча
				const activeCols: BackupColumnMeta[] = [];
				for (const colMeta of raw.columns) {
					if (
						rows.some((r) => Object.prototype.hasOwnProperty.call(r, colMeta.sqlName))
					) {
						activeCols.push(colMeta);
					}
				}
				if (activeCols.length === 0) return 0;

				// Защита от подмены арендатора внутри строк дампа
				for (const row of rows) {
					if (sqlName === "organizations") {
						if (row.id !== expectedOrganizationId) {
							throw new Error(
								`[RestoreSecurity] Row organization id mismatch in "organizations": got ${String(row.id)}, expected ${expectedOrganizationId}`,
							);
						}
					} else if (hasOrgIdColumn) {
						const rowOrg = row.organization_id;
						if (
							rowOrg !== undefined &&
							rowOrg !== null &&
							rowOrg !== expectedOrganizationId
						) {
							throw new Error(
								`[RestoreSecurity] Cross-tenant row rejected in "${sqlName}": got organization_id=${String(rowOrg)}, expected ${expectedOrganizationId}`,
							);
						}
					}
				}

				// Лимит параметров PG18: 65535 на один prepared/parameterized statement
				const maxRowsPerStmt = Math.max(
					1,
					Math.min(200, Math.floor(60_000 / activeCols.length)),
				);

				let totalInserted = 0;
				const quotedColList = activeCols.map((c) => quoteIdent(c.sqlName)).join(", ");
				const pkSet = new Set(raw.pkSqlCols);
				const allPkPresent = raw.pkSqlCols.every((pk) =>
					activeCols.some((c) => c.sqlName === pk),
				);
				const conflictCols = allPkPresent
					? raw.pkSqlCols.map((c) => quoteIdent(c)).join(", ")
					: null;
				const updateAssignments = activeCols
					.filter((c) => !pkSet.has(c.sqlName) && c.sqlName !== "organization_id")
					.map((c) => `${quoteIdent(c.sqlName)} = EXCLUDED.${quoteIdent(c.sqlName)}`)
					.join(", ");
				const conflictClause = conflictCols
					? !isAppendOnly && updateAssignments.length > 0
						? ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateAssignments}`
						: ` ON CONFLICT (${conflictCols}) DO NOTHING`
					: "";

				for (let offset = 0; offset < rows.length; offset += maxRowsPerStmt) {
					const chunk = rows.slice(offset, offset + maxRowsPerStmt);
					const values: unknown[] = [];
					const valueTuples: string[] = [];

					for (const row of chunk) {
						const placeholders: string[] = [];
						for (const colMeta of activeCols) {
							let rawVal = row[colMeta.sqlName];
							if (
								colMeta.sqlName === "organization_id" &&
								orgIdNotNull &&
								(rawVal === undefined || rawVal === null)
							) {
								rawVal = expectedOrganizationId;
							}
							values.push(serializeCellValueForPg(rawVal, colMeta));
							placeholders.push(`$${values.length}`);
						}
						valueTuples.push(`(${placeholders.join(", ")})`);
					}

					const insertSql =
						`INSERT INTO "public".${quoteIdent(sqlName)} (${quotedColList}) ` +
						`VALUES ${valueTuples.join(", ")}${conflictClause}`;
					const res = await pgClient.query(insertSql, values);
					totalInserted += res.rowCount ?? chunk.length;
				}

				return totalInserted;
			},

			normalizeLegacyRowKeys(rawRow) {
				const out: Record<string, unknown> = {};
				for (const [key, val] of Object.entries(rawRow)) {
					if (columnsBySqlName.has(key)) {
						out[key] = val;
						continue;
					}
					const mappedByTs = tsKeyToSqlName.get(key);
					if (mappedByTs && columnsBySqlName.has(mappedByTs)) {
						out[mappedByTs] = val;
						continue;
					}
					const snake = camelToSnakeFallback(key);
					if (columnsBySqlName.has(snake)) {
						out[snake] = val;
					}
				}
				return out;
			},

			sanitizeRowForSupport(row) {
				const redactCols = SUPPORT_SANITIZE_NULL_COLUMNS.get(sqlName);
				if (!redactCols) return row;
				const copy: Record<string, unknown> = { ...row };
				for (const col of redactCols) {
					if (Object.prototype.hasOwnProperty.call(copy, col)) {
						copy[col] = null;
					}
				}
				return copy;
			},
		};

		orderedTables.push(meta);
		bySqlName.set(sqlName, meta);
	}

	const byExportName = new Map<string, BackupTableMeta>();
	for (const [exportName, sqlName] of byExportNameMap.entries()) {
		const meta = bySqlName.get(sqlName);
		if (meta) byExportName.set(exportName, meta);
	}

	return {
		allSchemaTablesCount: rawNodes.size,
		orderedTables,
		bySqlName,
		byExportName,
		explicitExcludedTables: EXPLICIT_NON_TENANT_TABLES,
	};
}
