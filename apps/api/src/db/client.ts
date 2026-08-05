import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import * as schema from "./schema.js";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";
import { registerMoneyTypeParsers } from "./moneyTypeParsers.js";

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

export const pool = new pg.Pool({ connectionString: requireDatabaseUrl() });

export const dbRaw = drizzle(pool, { schema });
type TenantDb = typeof dbRaw;

export const transactionStorage = new AsyncLocalStorage<any>();

export const db = new Proxy(dbRaw, {
  get(target, prop, receiver) {
    const tx = transactionStorage.getStore();
    if (tx) {
      return Reflect.get(tx, prop, tx);
    }
    return Reflect.get(target, prop, receiver);
  }
});
