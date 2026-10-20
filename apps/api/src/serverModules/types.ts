import type { RateLimitRule } from "../security/rateLimit.js";

/**
 * Опция маршрута, снимающая автоматическую обёртку обработчика в withTenantCtx.
 *
 * ПОЧЕМУ ОПЦИЯ МАРШРУТА, А НЕ СПИСОК ПУТЕЙ В ЭТОМ ФАЙЛЕ. Fastify отдаёт
 * `routeOptions.config` в хук `onRoute` — признак читается там же, где
 * принимается решение оборачивать, и при этом объявлен РЯДОМ С САМИМ
 * ОБРАБОТЧИКОМ. Список путей в server.ts разъехался бы при первом
 * переименовании маршрута и молча вернул бы транзакцию на время передачи, не
 * сломав ни одного теста. Признак по типу ответа невозможен в принципе:
 * `onRoute` выполняется при регистрации маршрута, когда тело ещё не известно.
 *
 * Объявление расширяет пустой интерфейс FastifyContextConfig самого Fastify
 * (node_modules/fastify/types/context.d.ts), поэтому `config: { … }` в объявлении
 * маршрута проверяется компилятором и не требует ни `as any`, ни импорта в
 * файле маршрута.
 */
declare module "fastify" {
	interface FastifyContextConfig {
		/**
		 * true — обработчик сам отвечает за контекст арендатора: он обязан открыть
		 * withTenantCtx вокруг чтения данных и отдавать тело ответа уже вне этой
		 * транзакции. Ставится ТОЛЬКО маршрутам с большим или медленным телом
		 * (потоки файлов, PDF от headless-браузера) и только когда все обращения к
		 * базе завершены до первого байта тела.
		 */
		tenantTxSelfManaged?: boolean;
		/**
		 * Персональное правило ограничения частоты для маршрута; false отключает
		 * ограничение. Читается в security/rateLimit.ts (resolveRule).
		 */
		rateLimit?: RateLimitRule | false;
	}
}

export interface CreateDenteApiAppOptions {
	startTelegramWorker?: boolean;
	startCommunicationWorker?: boolean;
	/** Фоновое выполнение переноса чужой базы. Тесты выключают, чтобы не гонять очередь. */
	startMigrationWorker?: boolean;
	startDaemonScheduler?: boolean;
	/** Фоновая очередь отправки подписанных СЭМД в РЭМД ЕГИСЗ Минздрава РФ. */
	startEgiszWorker?: boolean;
}

export type HttpErrorLike = {
	statusCode?: unknown;
	status?: unknown;
	code?: unknown;
	message?: unknown;
};
