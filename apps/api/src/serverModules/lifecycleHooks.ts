import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
	startMigrationWorker,
	stopMigrationWorker,
} from "../migration/worker.js";
import { startDenteTelegramOutboxDueWorker } from "../routes/telegram.js";
import { getRequestIdentity } from "../security/identity.js";
import { stopBiAnalyticsWorker } from "../services/biAnalyticsWorker.js";
import { stopCloudRelayClient } from "../services/cloudRelayClient.js";
import { startCommunicationDispatchWorker } from "../services/communications/dispatchWorker.js";
import { defaultDaemonScheduler } from "../services/daemons/index.js";
import { dicomCStoreScpServer, vatechDirectBridgeService } from "../services/dicom/index.js";
import {
	startEgiszQueueWorker,
	stopEgiszQueueWorker,
} from "../services/egisz/EgiszQueueWorker.js";
import { dicomWatcherDaemon } from "../services/imaging/dicomFolderWatcherDaemon.js";
import { resetLanMeshAutoJoinServiceForTest } from "../services/lanMeshAutoJoinService.js";
import { resetLanMeshServiceForTest } from "../services/lanMeshService.js";
import { stopNotificationWorker } from "../services/notificationWorker.js";
import { persistentOutboxService } from "../services/outbox/persistentOutboxService.js";
import { repairMojibakeText } from "../text/repairMojibake.js";
import type { CreateDenteApiAppOptions, HttpErrorLike } from "./types.js";

export const apiTechnicalErrorPattern =
	/\b(TypeError|SyntaxError|ReferenceError|DOMException|Failed to fetch|NetworkError|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|ERR_[A-Z0-9_]+|stack|undefined|null|NaN|DENTAL_[A-Z0-9_]+|DENTE_[A-Z0-9_]+)\b|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

export const publicValidationErrorMessage =
	"Форма отправлена с неверными или неполными полями.";

export function isZodValidationError(error: unknown): boolean {
	if (error instanceof ZodError) return true;
	if (!error || typeof error !== "object") return false;
	const candidate = error as { issues?: unknown; name?: unknown };
	return candidate.name === "ZodError" && Array.isArray(candidate.issues);
}

export function apiErrorStatusCode(error: unknown): number {
	const candidate = error as HttpErrorLike;
	const statusCode = candidate?.statusCode ?? candidate?.status;
	if (
		typeof statusCode === "number" &&
		Number.isInteger(statusCode) &&
		statusCode >= 400 &&
		statusCode < 600
	)
		return statusCode;
	return 500;
}

export function fallbackApiErrorMessage(statusCode: number): string {
	if (statusCode === 401) return "Нужна авторизация для этой операции.";
	if (statusCode === 403) return "Недостаточно прав для этой операции.";
	if (statusCode === 404) return "Запрошенная запись не найдена.";
	if (statusCode >= 500)
		return "Сервер не выполнил действие. Повторите позже или обратитесь к администратору клиники.";
	return "Запрос не выполнен. Проверьте данные и повторите действие.";
}

export function publicApiErrorMessage(error: unknown, statusCode: number): string {
	const rawMessage =
		typeof (error as HttpErrorLike)?.message === "string"
			? String((error as HttpErrorLike).message)
			: "";
	const repairedMessage = repairMojibakeText(rawMessage).trim();
	if (
		repairedMessage &&
		repairedMessage.length <= 600 &&
		/[А-Яа-яЁё]/.test(repairedMessage) &&
		!apiTechnicalErrorPattern.test(repairedMessage)
	) {
		return repairedMessage;
	}
	return fallbackApiErrorMessage(statusCode);
}

/**
 * Регистрация хуков жизненного цикла Fastify (onRequest, onRoute, setErrorHandler, onSend).
 */
export function registerLifecycleHooks(app: FastifyInstance): void {
	app.addHook("onRequest", async (request, reply) => {
		reply.header("X-Content-Type-Options", "nosniff");
		reply.header("X-Frame-Options", "DENY");
		reply.header("X-XSS-Protection", "0"); // Устаревший фильтр сам был источником уязвимостей; актуальная защита — CSP.
		reply.header(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains",
		);
		// Один раз разбираем токены запроса и кладём результат в request.user,
		// чтобы маршруты не парсили заголовки самостоятельно и не расходились в логике.
		getRequestIdentity(request);
		// Кешируем organizationId текущего запроса для удобного доступа в маршрутах
		// через withTenantCtx (apps/api/src/db/rls.ts). Не делаем здесь вызова базы —
		// withTenantCtx открывает транзакцию самостоятельно, чтобы set_config и
		// последующий запрос попали на одно и то же pg-соединение из пула.
		const _req = request as unknown as Record<string, unknown>;
		const _identity = _req.user as
			| { organizationId?: string | null }
			| undefined;
		if (_identity?.organizationId) {
			_req.tenantId = _identity.organizationId;
		}
	});

	// Глобальная изоляция арендаторов: если у запроса есть tenantId (выставлен в onRequest выше),
	// автоматически оборачиваем весь обработчик маршрута в withTenantCtx.
	app.addHook("onRoute", (routeOptions) => {
		if (routeOptions.config?.tenantTxSelfManaged === true) return;
		const originalHandler = routeOptions.handler;
		if (originalHandler) {
			routeOptions.handler = async function (request, reply) {
				const _req = request as unknown as Record<string, unknown>;
				const tenantId = _req.tenantId;
				if (typeof tenantId === "string" && tenantId.length > 0) {
					// Динамический импорт, чтобы избежать циклических зависимостей при старте
					const { withTenantCtx } = await import("../db/rls.js");
					return withTenantCtx(tenantId, async () => {
						return originalHandler.call(this, request, reply);
					});
				}
				return originalHandler.call(this, request, reply);
			};
		}
	});

	app.setErrorHandler((error, request, reply) => {
		request.log.error(
			{ err: error, url: request.url, method: request.method },
			"Необработанная ошибка запроса",
		);
		if (isZodValidationError(error)) {
			reply.status(400).send({
				error: "ValidationError",
				message: publicValidationErrorMessage,
			});
			return;
		}

		const statusCode = apiErrorStatusCode(error);
		reply.status(statusCode).send({
			error: statusCode >= 500 ? "ServerError" : "RequestError",
			message: publicApiErrorMessage(error, statusCode),
		});
	});

	app.addHook("onSend", async (_request, reply, payload) => {
		const contentType = String(reply.getHeader("content-type") ?? "");
		const contentSecurityPolicy = contentType.includes("text/html")
			? "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
			: "default-src 'none'; frame-ancestors 'none'";
		if (!reply.hasHeader("cache-control") && !reply.hasHeader("Cache-Control")) {
			reply.header("Cache-Control", "no-store");
		}
		reply.header("X-Content-Type-Options", "nosniff");
		reply.header("X-Frame-Options", "DENY");
		reply.header("Referrer-Policy", "no-referrer");
		reply.header(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=()",
		);
		reply.header("Content-Security-Policy", contentSecurityPolicy);
		return payload;
	});
}

/**
 * Запуск и остановка фоновых очередей, воркеров и шедулеров (Telegram, Communications, EGISZ, Migration, Daemons).
 */
export async function setupBackgroundWorkers(
	app: FastifyInstance,
	options: CreateDenteApiAppOptions = {},
): Promise<void> {
	if (options.startTelegramWorker !== false) {
		const telegramOutboxDueWorker = startDenteTelegramOutboxDueWorker({
			logger: app.log,
		});
		if (telegramOutboxDueWorker.enabled) {
			app.addHook("onClose", async () => {
				telegramOutboxDueWorker.stop();
			});
		}
	}

	// Разбор очереди исходящих сообщений. Включается DENTE_COMMUNICATION_WORKER_ENABLED=1.
	if (options.startCommunicationWorker !== false) {
		const communicationWorker = startCommunicationDispatchWorker({
			logger: app.log,
		});
		if (communicationWorker.enabled) {
			app.addHook("onClose", async () => {
				communicationWorker.stop();
			});
		}
	}

	// Фоновое выполнение переноса чужой базы.
	if (options.startMigrationWorker !== false) {
		await startMigrationWorker();
		app.addHook("onClose", async () => {
			stopMigrationWorker();
		});
	}

	if (options.startDaemonScheduler === true) {
		defaultDaemonScheduler.start({ logger: app.log });
		app.addHook("onClose", async () => {
			defaultDaemonScheduler.stop();
		});
	}

	// Фоновая асинхронная очередь отправки подписанных СЭМД в РЭМД ЕГИСЗ Минздрава РФ.
	if (options.startEgiszWorker !== false) {
		const egiszWorker = startEgiszQueueWorker({
			logger: app.log,
		});
		if (egiszWorker.enabled) {
			app.addHook("onClose", async () => {
				stopEgiszQueueWorker();
			});
		}
	}

	app.addHook("onClose", async () => {
		if (dicomCStoreScpServer.isRunning()) {
			await dicomCStoreScpServer.stop();
		}
		await vatechDirectBridgeService.stop();
		persistentOutboxService.stop();
		dicomWatcherDaemon.stop();
		stopCloudRelayClient();
		stopNotificationWorker();
		stopBiAnalyticsWorker();
		resetLanMeshServiceForTest();
		resetLanMeshAutoJoinServiceForTest();
	});

	// Прогрев регламентных справочников (804н, фармакология, МКБ-10, 043/у)
	// Мгновенный локальный снапшот: 0 мс задержки, гарантированная работа в офлайне (Мандат 8n / 8k)
	const { warmupStatutoryCatalogs } = await import(
		"../services/catalogs/warmupStatutoryCatalogs.js"
	);
	warmupStatutoryCatalogs({ logger: app.log });
}
