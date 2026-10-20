import Fastify, { type FastifyInstance } from "fastify";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";
import {
	applyHddPerformanceDefaults,
	flushHddLogger,
	getHddFastifyLoggerConfig,
} from "../lib/hddPerformanceConfig.js";
import { defaultDaemonScheduler } from "../services/daemons/index.js";
import {
	startLanDiscoveryService,
	stopLanDiscoveryService,
} from "../services/lanDiscoveryService.js";
import { startBackupDaemon, stopBackupDaemon } from "../services/backupWorker.js";
import {
	TaskQueueService,
	type WorkerHandle,
} from "../services/TaskQueueService.js";
import { persistentOutboxService } from "../services/outbox/persistentOutboxService.js";
import { dicomWatcherDaemon } from "../services/imaging/dicomFolderWatcherDaemon.js";
import { stopCloudRelayClient } from "../services/cloudRelayClient.js";
import { stopNotificationWorker } from "../services/notificationWorker.js";
import { stopBiAnalyticsWorker } from "../services/biAnalyticsWorker.js";
import { resetLanMeshServiceForTest } from "../services/lanMeshService.js";
import { resetLanMeshAutoJoinServiceForTest } from "../services/lanMeshAutoJoinService.js";
import { startWatchdog } from "../watchdog.js";
import {
	assertSecurityConfiguration,
	registerCorsAndSecurity,
	setupProxyAndTunnels,
} from "./corsAndSecurity.js";
import { registerCorePlugins } from "./pluginRegistrar.js";
import {
	registerLifecycleHooks,
	setupBackgroundWorkers,
} from "./lifecycleHooks.js";
import { registerAllRoutes } from "./routeRegistrar.js";
import type { CreateDenteApiAppOptions } from "./types.js";

loadAdditionalServerEnv();
applyHddPerformanceDefaults();
startWatchdog();
assertSecurityConfiguration();

/**
 * Фабрика Fastify приложения Dente API с полной регистрацией безопасности, плагинов, хуков и маршрутов.
 */
export async function createDenteApiApp(
	options: CreateDenteApiAppOptions = {},
): Promise<FastifyInstance> {
	const app = Fastify({
		// biome-ignore lint/suspicious/noExplicitAny: Fastify logger config mapping
		logger: getHddFastifyLoggerConfig() as any,
		// За обратным прокси (nginx) реальный IP приходит в X-Forwarded-For.
		// Без trustProxy rate-limit видит один и тот же адрес контейнера у всех
		// клиентов. Включается явно, чтобы напрямую доступный API не доверял
		// подделанному заголовку.
		trustProxy: process.env.TRUST_PROXY === "1",
		// Ограничение размера тела запроса: безопасный стриминг КТ и снимков до 1-2 ГБ
		bodyLimit: Number(process.env.API_BODY_LIMIT_BYTES ?? 1024 * 1024 * 1024),
	});

	await registerCorsAndSecurity(app);
	await registerCorePlugins(app);
	registerLifecycleHooks(app);
	await registerAllRoutes(app);
	await setupBackgroundWorkers(app, options);

	return app;
}

/**
 * Основная точка входа запуска HTTP-сервера API, фоновых демонов и обработчиков сигналов завершения.
 */
export async function startDenteApiServer(): Promise<void> {
	await setupProxyAndTunnels().catch((err) => {
		process.stderr.write(
			`[Proxy Boot] Failed to run proxy/tunnel diagnostics: ${err}\n`,
		);
	});
	const app = await createDenteApiApp();

	process.on("uncaughtException", (err) => {
		app.log.fatal(err, "Uncaught Exception detected. Shutting down...");
		flushHddLogger();
		process.exit(1);
	});
	process.on("unhandledRejection", (reason, promise) => {
		// biome-ignore lint/suspicious/noExplicitAny: error code inspection
		if (
			(reason as any)?.code === "ERR_HTTP_HEADERS_SENT" ||
			(reason as any)?.message?.includes?.("Cannot set headers after they are sent")
		) {
			app.log.error(
				{ reason, promise },
				"ERR_HTTP_HEADERS_SENT caught in unhandledRejection; suppressing crash to keep server live",
			);
			return;
		}
		app.log.fatal(
			{ reason, promise },
			"Unhandled Rejection detected. Shutting down...",
		);
		flushHddLogger();
		process.exit(1);
	});

	const host = process.env.API_HOST ?? "0.0.0.0";
	const port = Number(process.env.API_PORT ?? 4100);

	try {
		await app.listen({ host, port });

		let taskQueueWorker: WorkerHandle | null = null;

		const gracefulShutdown = async (signal: string) => {
			app.log.info(
				`[Shutdown] Received ${signal}, closing HTTP server and draining database pool...`,
			);
			const forceKillTimeout = setTimeout(() => {
				app.log.error(
					`[Shutdown] Force killing process after 10s timeout. Pending connections or workers hung.`,
				);
				flushHddLogger();
				process.exit(1);
			}, 10000);
			forceKillTimeout.unref();
			try {
				if (taskQueueWorker) {
					await taskQueueWorker.stop();
					taskQueueWorker = null;
				}
				stopBackupDaemon();
				stopLanDiscoveryService();
				defaultDaemonScheduler.stop();
				persistentOutboxService.stop();
				dicomWatcherDaemon.stop();
				stopCloudRelayClient();
				stopNotificationWorker();
				stopBiAnalyticsWorker();
				resetLanMeshServiceForTest();
				resetLanMeshAutoJoinServiceForTest();
				await app.close();
				// Единственное закрытие пула на процесс: владелец — процесс, не
				// приложение. endPool идемпотентен, повторный вызов дожидается
				// первого вместо отказа pg.
				const { endPool } = await import("../db/client.js");
				await endPool();
				app.log.info("[Shutdown] Dente API server closed cleanly.");
				flushHddLogger();
				clearTimeout(forceKillTimeout);
				process.exit(0);
			} catch (err) {
				app.log.error(err, "[Shutdown] Error during server shutdown:");
				flushHddLogger();
				clearTimeout(forceKillTimeout);
				process.exit(1);
			}
		};

		// Фоновый обработчик персистентных очередей задач (PostgreSQL FOR UPDATE SKIP LOCKED)
		taskQueueWorker = TaskQueueService.startWorker({
			queues: ["default", "system", "communications"],
			logger: app.log,
		});

		// Резервное копирование базы. БЫЛО: модуль существовал, но startBackupDaemon
		// не вызывался НИ ОТКУДА — копий не создавалось вообще, при том что в логах
		// и в интерфейсе всё выглядело так, будто они делаются.
		startBackupDaemon();

		// Авто-обнаружение сервера в локальной сети (mDNS / UDP discovery responder)
		startLanDiscoveryService({ logger: app.log });

		// Фоновый шедулер клинических демонов (08:00 ZTL, 21:00 EMR Savior, Weekly Retention)
		defaultDaemonScheduler.start({ logger: app.log });

		process.on("SIGINT", () => gracefulShutdown("SIGINT"));
		process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
	} catch (error) {
		app.log.error(error);
		process.exit(1);
	}
}

export { setupProxyAndTunnels } from "./corsAndSecurity.js";
export type * from "./types.js";
