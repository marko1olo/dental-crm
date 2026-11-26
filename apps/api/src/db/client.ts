import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";
import { isAutomatedRun } from "../env/requiredEnv.js";
import { getHddDbPoolConfig } from "../lib/hddPerformanceConfig.js";
import { registerMoneyTypeParsers } from "./moneyTypeParsers.js";
import * as schema from "./schema.js";
import { createApiLogger, safeLogError } from "../observability/logger.js";

const logger = createApiLogger("dbPoolClient");

/**
 * Раньше здесь стоял голый `import "dotenv/config"`, который читает .env только
 * из текущего каталога. При запуске из apps/api это apps/api/.env, где
 * DATABASE_URL нет — он лежит в .env корня репозитория. Загрузчик проекта
 * умеет подниматься на два уровня вверх, им же пользуется db:migrate.
 */
loadAdditionalServerEnv();

declare global {
	interface BigInt {
		toJSON?: (() => number) | undefined;
	}
}

if (typeof BigInt.prototype.toJSON !== "function") {
	BigInt.prototype.toJSON = function (this: bigint) {
		return Number(this);
	};
}

/**
 * Адрес базы берётся только из окружения.
 *
 * ЗАЧЕМ БЕЗ ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ: раньше здесь стояло
 * `?? "postgres://dental:dental@127.0.0.1:5432/dental_crm"` — учётные данные
 * прямо в коде, что запрещено правилом об анти-хардкоде. Хуже другое: при
 * незаданном DATABASE_URL приложение молча уходило на локальный адрес и падало
 * позже, на первом же запросе, сообщением про несуществующее отношение. Лучше
 * не стартовать вовсе и сразу сказать, чего не хватает.
 */
export function requireDatabaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url || url.trim() === "") {
		throw new Error(
			"DATABASE_URL не задан. Укажите строку подключения к PostgreSQL в .env — тот же адрес использует npm run db:migrate.",
		);
	}
	return url;
}

/*
 * Разбор денежных типов включается до создания пула. Без него numeric-колонки
 * приходят строками: суммы склеиваются вместо сложения, сравниваются как текст,
 * а схемы z.number() отвергают верные данные. Подробнее — в moneyTypeParsers.ts.
 */
registerMoneyTypeParsers();

const hddPoolConfig = getHddDbPoolConfig();

/*
 * ПОЧЕМУ allowExitOnIdle ТОЛЬКО В АВТОМАТИЧЕСКИХ ПРОГОНАХ: каждый простаивающий
 * клиент пула держит зарегистрированный setTimeout от idleTimeoutMillis, и этот
 * таймер не помечен unref(). Для процесса `node --test` это значит, что раннер
 * не выходит после последнего теста: достаточно одного импорта этого модуля,
 * в том числе транзитивного (`backupWorker.ts` → serverMajorVersion() →
 * await import("../db/client.js")), чтобы набор повис до внешнего убийства.
 * allowExitOnIdle разрешает процессу завершиться, когда все клиенты простаивают,
 * то есть снимает пин с event loop у ИСТОЧНИКА, а не маскирует его флагом
 * раннера вроде --test-force-exit.
 *
 * В рабочем API isAutomatedRun() ложно, опция выключена и пул живёт столько же,
 * сколько сервер: закрытием по сигналу занимается gracefulShutdown в server.ts,
 * ровно один раз на процесс, через endPool ниже.
 * Признак автоматического прогона берём готовый — env/requiredEnv.ts:185, там
 * же измерено, что `node --test` выставляет NODE_TEST_CONTEXT, а NODE_ENV нет.
 */
export const pool = new pg.Pool({
	connectionString: requireDatabaseUrl(),
	max: hddPoolConfig.max,
	idleTimeoutMillis: hddPoolConfig.idleTimeoutMillis,
	connectionTimeoutMillis: hddPoolConfig.connectionTimeoutMillis,
	allowExitOnIdle: hddPoolConfig.allowExitOnIdle,
});

pool.on("error", (err) => {
	logger.error({ err: safeLogError(err) }, "Unexpected error on idle PostgreSQL client");
});

/**
 * Закрытие пула, безопасное при повторном вызове.
 *
 * ЗАЧЕМ: `pg.Pool.end()` при втором вызове отвергает промис сообщением
 * «Called end on pool more than once». Мейнтейнеры node-postgres считают такой
 * отказ ПРАВИЛЬНЫМ (issue #1858) и сохраняют его намеренно: повторное закрытие
 * — признак того, что закрывающий не владеет пулом. Лечить обязана сторона
 * приложения, а не библиотека.
 *
 * Пул здесь — модульный синглтон на процесс, поэтому и закрытие одно на процесс.
 * Кто зовёт вторым — получает ТОТ ЖЕ промис первого закрытия и дожидается его,
 * вместо отказа. Владелец пула — процесс: в рабочем API закрывает
 * gracefulShutdown по SIGINT/SIGTERM, в прогонах — tests/support/poolTeardown.ts.
 * Фабрика приложения (createDenteApiApp) пул НЕ создаёт и потому НЕ закрывает:
 * одно приложение из многих не вправе гасить общий ресурс.
 */
let poolEnding: Promise<void> | undefined;
export const endPool = (): Promise<void> => (poolEnding ??= pool.end());

export const dbRaw = drizzle(pool, { schema });
export const dbSystemRaw = dbRaw;
export type TenantTransaction = Parameters<Parameters<typeof dbRaw.transaction>[0]>[0];
export type TenantDb = NodePgDatabase<typeof schema> | TenantTransaction;

export type TenantAlsMode = "read_only" | "read_write" | "superuser_bypass";

export interface TenantAlsStore {
	tx: TenantDb;
	organizationId: string;
	mode: TenantAlsMode;
}

export const transactionStorage = new AsyncLocalStorage<TenantDb | undefined>();
export const tenantAlsStorage = new AsyncLocalStorage<TenantAlsStore | undefined>();
export const strictUnscopedDbTrapStorage = new AsyncLocalStorage<boolean>();

export class UnscopedTenantDbAccessError extends Error {
	readonly code = "UNSCOPED_TENANT_DB_ACCESS";

	constructor(operation: string) {
		super(
			`Forbidden unscoped db.${operation}() call outside withTenantReadCtx/withTenantWriteCtx/withTenantCtx`,
		);
		this.name = "UnscopedTenantDbAccessError";
	}
}

export async function runWithStrictUnscopedDbTrap<T>(
	fn: () => Promise<T>,
): Promise<T> {
	return strictUnscopedDbTrapStorage.run(true, fn);
}

const DRIZZLE_DB_OPERATIONS = new Set<PropertyKey>([
	"select",
	"selectDistinct",
	"selectDistinctOn",
	"insert",
	"update",
	"delete",
	"execute",
	"query",
	"transaction",
	"$count",
	"with",
]);

function handleUnscopedDbAccess(operation: string): void {
	const isStrict =
		strictUnscopedDbTrapStorage.getStore() === true ||
		process.env.DENTE_STRICT_TENANT_DB_TRAP === "1";
	if (isStrict) {
		throw new UnscopedTenantDbAccessError(operation);
	}
	logger.error(
		{
			operation,
			event: "UNSCOPED_DB_ACCESS_OUTSIDE_TENANT_CTX",
		},
		"UNSCOPED_DB_ACCESS_OUTSIDE_TENANT_CTX",
	);
}

export const db = new Proxy(dbRaw, {
	get(target, prop, receiver) {
		const alsStore = tenantAlsStorage.getStore();
		const currentTx = alsStore?.tx ?? transactionStorage.getStore();
		const delegate = currentTx || target;
		if (prop === "transaction") {
			return (transactionFn: (tx: TenantDb) => Promise<unknown>, config?: unknown) => {
				if (!currentTx) {
					handleUnscopedDbAccess("transaction");
				}
				return (delegate as typeof dbRaw).transaction(async (innerTx) => {
					const nextAls = alsStore ? { ...alsStore, tx: innerTx } : undefined;
					return await tenantAlsStorage.run(nextAls, () =>
						transactionStorage.run(innerTx, () => transactionFn(innerTx)),
					);
				}, config as Parameters<typeof dbRaw.transaction>[1]);
			};
		}
		if (currentTx) {
			return Reflect.get(currentTx, prop, currentTx);
		}
		if (DRIZZLE_DB_OPERATIONS.has(prop)) {
			handleUnscopedDbAccess(String(prop));
		}
		return Reflect.get(target, prop, receiver);
	},
});
