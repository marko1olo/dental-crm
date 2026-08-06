/**
 * Печатает, к какой базе реально подключается сервер.
 *
 * Раньше скрипт выводил `client.dataDir` и `client.options` — поля PGlite,
 * которого в проекте больше нет: db/client.ts работает через node-postgres.
 * Импорт несуществующего экспорта `client` ронял файл целиком.
 *
 * Пароль не печатается: строка подключения содержит учётные данные.
 */
import "dotenv/config";

const raw = process.env.DATABASE_URL;
if (!raw) {
	console.error("DATABASE_URL не задан.");
	process.exit(1);
}

const url = new URL(raw);
console.log("host:    ", url.hostname);
console.log("port:    ", url.port || "5432");
console.log("database:", url.pathname.replace(/^\//, ""));
console.log("user:    ", decodeURIComponent(url.username));
console.log("password:", url.password ? "(задан)" : "(не задан)");
