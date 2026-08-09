import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";
import { isAutomatedRun } from "../env/requiredEnv.js";
import { registerMoneyTypeParsers } from "./moneyTypeParsers.js";
import * as schema from "./schema.js";

/**
 * Раньше здесь стоял голый `import "dotenv/config"`, который читает .env только
 * из текущего каталога. При запуске из apps/api это apps/api/.env, где
 * DATABASE_URL нет — он лежит в .env корня репозитория. Загрузчик проекта
 * умеет подниматься на два уровня вверх, им же пользуется db:migrate.
 */
loadAdditionalServerEnv();

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
function requireDatabaseUrl(): string {
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

const parsedPoolMax = Number.parseInt(process.env.PG_POOL_MAX ?? "30", 10);
const poolMax =
	Number.isFinite(parsedPoolMax) && parsedPoolMax > 0 ? parsedPoolMax : 30;

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
	max: poolMax,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
	allowExitOnIdle: isAutomatedRun(),
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
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type TenantDb = typeof dbRaw;

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const transactionStorage = new AsyncLocalStorage<any>();

export const db = new Proxy(dbRaw, {
	get(target, prop, receiver) {
		const tx = transactionStorage.getStore();
		if (tx) {
			return Reflect.get(tx, prop, tx);
		}
		return Reflect.get(target, prop, receiver);
	},
});
