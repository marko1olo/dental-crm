import type { FastifyInstance } from "fastify";
import { registerMigrationProgressRoutes } from "./migrationProgressHandlers.js";
import { registerMigrationRunCoreRoutes } from "./migrationRunHandlers.js";
import { registerMigrationValidationRoutes } from "./migrationValidationHandlers.js";

export * from "./types.js";
export * from "./migrationValidationHandlers.js";
export * from "./migrationRunHandlers.js";
export * from "./migrationProgressHandlers.js";

/**
 * Оркестрация переноса по фазам: заливка, сопоставление, выполнение, сверка.
 * Fastify плагин регистрации маршрутов миграции клиник (1С / Инфодент / Dental4Windows / DBF / DICOM).
 */
export async function registerMigrationRunRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * Сквозной разбор двоичного тела.
	 *
	 * Без этого Fastify отвечает 415 Unsupported Media Type: у него нет парсера
	 * для application/octet-stream, и запрос отвергается до обработчика. Штатные
	 * парсеры здесь не подходят по существу — они собирают тело в память, а весь
	 * смысл этого маршрута в том, чтобы этого не делать.
	 *
	 * Парсер отдаёт сам поток, не читая его: обработчик льёт его прямо на диск.
	 */
	app.addContentTypeParser(
		"application/octet-stream",
		(_request, payload, done) => {
			done(null, payload);
		},
	);

	registerMigrationValidationRoutes(app);
	registerMigrationRunCoreRoutes(app);
	registerMigrationProgressRoutes(app);
}

export default registerMigrationRunRoutes;
