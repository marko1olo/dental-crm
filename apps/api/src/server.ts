import "dotenv/config";
import net from "node:net";
import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifyWebsocket from "@fastify/websocket";
import Fastify from "fastify";
import { ZodError } from "zod";
import { db } from "./db/client.js";
import { loadAdditionalServerEnv } from "./env/loadServerEnv.js";
import { registerAiRoutes } from "./routes/ai.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerAuthRoutes } from "./routes/auth.js";
import {
	registerAdvancedBillingRoutes,
	registerBillingRoutes,
} from "./routes/billing.js";
import { registerClinicalRoutes } from "./routes/clinical.js";
import { registerCommunicationRoutes } from "./routes/communications.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import registerDiaryRoutes from "./routes/diary.js";
import { registerDicomwebRoutes } from "./routes/dicomweb.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import registerEgiszRoutes from "./routes/egisz.js";
import { registerFilesRoutes } from "./routes/files.js";
import { registerFamilyFinanceRoutes } from "./routes/finance_family.js";
import { registerImagingRoutes } from "./routes/imaging.js";
import { registerImagingPlanningRoutes } from "./routes/imaging_planning.js";
import { registerImportRoutes } from "./routes/imports.js";
import { registerIngestionRoutes } from "./routes/ingestion.js";
import { registerInsuranceRoutes } from "./routes/insurance.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { registerLabRoutes } from "./routes/lab.js";
import { registerLeadsRoutes } from "./routes/leads.js";
import { registerWaitlistRoutes } from "./routes/waitlist.js";
import { registerMaxRoutes } from "./routes/max.js";
import { registerOdontogramRoutes } from "./routes/odontogram.js";
import { registerPatientRoutes } from "./routes/patients.js";
import { portalRoutes } from "./routes/portal.js";
import { registerPricelistRoutes } from "./routes/pricelist.js";
import { registerPublicBookingRoutes } from "./routes/publicBooking.js";
import { registerScheduleRoutes } from "./routes/schedule.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerSmartImportRoutes } from "./routes/smartImports.js";
import { registerSpeechRoutes } from "./routes/speech.js";
import { registerSterilizationRoutes } from "./routes/sterilization.js";
import { registerSystemRoutes } from "./routes/system.js";
import {
	registerTelegramRoutes,
	registerTelegramWebhookRoutes,
	startDenteTelegramOutboxDueWorker,
} from "./routes/telegram.js";
import { telephonyRoutes } from "./routes/telephony.js";
import registerTemplateRoutes from "./routes/templates.js";
import registerToothHistoryRoutes from "./routes/toothHistory.js";
import { registerVisitRoutes } from "./routes/visits.js";
import { registerVkRoutes } from "./routes/vk.js";
import { registerWhatsappRoutes } from "./routes/whatsapp.js";
import { workspaceProfileRoutes } from "./routes/workspaceProfile.js";
import { registerXrayRoutes } from "./routes/xray.js";
import {
	startBackupDaemon,
	stopBackupDaemon,
} from "./services/backupWorker.js";
import { startBiAnalyticsWorker } from "./services/biAnalyticsWorker.js";
import { startNotificationWorker } from "./services/notificationWorker.js";
import { startSyncEngine, stopSyncEngine } from "./services/syncEngine.js";
import { wsBroker } from "./services/websocketBroker.js";
import { getProxyAgent } from "./speech/keyPool.js";
import { ensureSshTunnel } from "./speech/tunnel.js";
import { repairMojibakeText } from "./text/repairMojibake.js";
import { startWatchdog } from "./watchdog.js";

loadAdditionalServerEnv();
startWatchdog();
// startNotificationWorker();

async function checkProxyPortDirectly(
	proxyUrlString: string,
): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const cleanUrl = proxyUrlString.replace(/^socks5h?:\/\//i, "socks5://");
			const url = new URL(
				cleanUrl.includes("://") ? cleanUrl : `socks5://${cleanUrl}`,
			);
			const port = parseInt(url.port || "1080");
			const host = url.hostname || "127.0.0.1";
			const socket = net.connect(port, host, () => {
				socket.end();
				resolve(true);
			});
			socket.setTimeout(1500);
			socket.on("timeout", () => {
				socket.destroy();
				resolve(false);
			});
			socket.on("error", () => {
				resolve(false);
			});
		} catch {
			resolve(false);
		}
	});
}

export async function setupProxyAndTunnels() {
	// 1. Проверяем наличие SSH-ключа. Если есть, пробуем поднять туннель на порту 1080
	const hasTunnel = await ensureSshTunnel().catch((err) => {
		console.warn("[Proxy Boot] SSH SOCKS5 tunnel autostart failed:", err);
		return false;
	});

	if (hasTunnel) {
		process.env.HTTPS_PROXY = "socks5://127.0.0.1:1080";
		process.env.HTTP_PROXY = "socks5://127.0.0.1:1080";
		process.env.PROXY_URL = "socks5://127.0.0.1:1080";
	} else {
		// 2. Если туннеля нет, проверяем настроенный прокси из .env
		const proxyUrl =
			process.env.HTTPS_PROXY ||
			process.env.HTTP_PROXY ||
			process.env.PROXY_URL;
		if (proxyUrl) {
			const isOnline = await checkProxyPortDirectly(proxyUrl);
			if (!isOnline) {
				console.warn(
					`[Proxy Boot] Configured proxy ${proxyUrl} is offline. Disabling proxy env variables to force clean direct connections.`,
				);
				delete process.env.HTTPS_PROXY;
				delete process.env.HTTP_PROXY;
				delete process.env.PROXY_URL;
			}
		}
	}

	// Register global agent for direct undici fetches
	(globalThis as any)._dentalProxyAgent = getProxyAgent() || undefined;
}

type HttpErrorLike = {
	statusCode?: unknown;
	status?: unknown;
	code?: unknown;
	message?: unknown;
};

const apiTechnicalErrorPattern =
	/\b(TypeError|SyntaxError|ReferenceError|DOMException|Failed to fetch|NetworkError|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|ERR_[A-Z0-9_]+|stack|undefined|null|NaN|DENTAL_[A-Z0-9_]+|DENTE_[A-Z0-9_]+)\b|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;
const publicValidationErrorMessage =
	"Форма отправлена с неверными или неполными полями.";

function isZodValidationError(error: unknown): boolean {
	if (error instanceof ZodError) return true;
	if (!error || typeof error !== "object") return false;
	const candidate = error as { issues?: unknown; name?: unknown };
	return candidate.name === "ZodError" && Array.isArray(candidate.issues);
}

function apiErrorStatusCode(error: unknown): number {
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

function fallbackApiErrorMessage(statusCode: number): string {
	if (statusCode === 401) return "Нужна авторизация для этой операции.";
	if (statusCode === 403) return "Недостаточно прав для этой операции.";
	if (statusCode === 404) return "Запрошенная запись не найдена.";
	if (statusCode >= 500)
		return "Сервер не выполнил действие. Повторите позже или обратитесь к администратору клиники.";
	return "Запрос не выполнен. Проверьте данные и повторите действие.";
}

function publicApiErrorMessage(error: unknown, statusCode: number): string {
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

export async function createDenteApiApp(
	options: { startTelegramWorker?: boolean } = {},
) {
	const app = Fastify({
		logger: {
			level: process.env.NODE_ENV === "production" ? "info" : "debug",
		},
	});

	const webOrigins = (process.env.WEB_ORIGIN ?? "http://127.0.0.1:5173")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean)
		.map((origin) => {
			if (origin === "*" || origin === "null") {
				if (process.env.NODE_ENV === "production") {
					throw new Error(
						`Insecure WEB_ORIGIN configured: "${origin}" is not allowed in production`,
					);
				}
				return origin;
			}
			try {
				return new URL(origin).origin;
			} catch {
				throw new Error(`Invalid WEB_ORIGIN configured: "${origin}"`);
			}
		});

	await app.register(cors, {
		origin: webOrigins,
	});

	await app.register(fastifyWebsocket, {
		options: { maxPayload: 1048576 },
	});

	await app.register(fastifyMultipart, {
		limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
	});

	app.get(
		"/api/ws/schedule",
		{ websocket: true } as any,
		(connection: any, req: any) => {
			const orgId = req.query.orgId || "default-org";
			const patientId = req.query.patientId || undefined;
			wsBroker.addClient(connection, orgId, patientId);
		},
	);

	app.setErrorHandler((error, _request, reply) => {
		const logPath = process.env.ERROR_LOG_PATH;
		if (logPath) {
			import("node:fs").then((m) =>
				m.appendFileSync(
					logPath,
					((error as any)?.stack || (error as any)?.message || String(error)) +
						"\nCAUSE: " +
						((error as any)?.cause || "") +
						"\n",
				),
			);
		}
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
		reply.header("Cache-Control", "no-store");
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

	app.get("/api/health", async () => ({
		ok: true,
		service: "dental-crm-api",
		time: new Date().toISOString(),
	}));

	await registerAiRoutes(app);
	await registerBillingRoutes(app);
	await registerAdvancedBillingRoutes(app);
	await app.register(telephonyRoutes, { prefix: "/api/telephony" });
	await app.register(portalRoutes, { prefix: "/api/portal" });
	await app.register(inventoryRoutes, { prefix: "/api/inventory" });
	await registerInsuranceRoutes(app);
	await registerClinicalRoutes(app);
	await registerCommunicationRoutes(app);
	await registerDashboardRoutes(app);
	registerAnalyticsRoutes(app);
	await registerDocumentRoutes(app);
	await registerImagingRoutes(app);
	await registerImagingPlanningRoutes(app);
	await registerIngestionRoutes(app);
	await registerImportRoutes(app);
	await registerPatientRoutes(app);
	await registerPricelistRoutes(app);
	await registerScheduleRoutes(app);
	await registerSettingsRoutes(app);
	await app.register(registerPublicBookingRoutes, {
		prefix: "/api/public/booking",
	});
	await registerVkRoutes(app);
	await registerSpeechRoutes(app);
	await registerSmartImportRoutes(app);
	await registerSystemRoutes(app);
	await registerTelegramRoutes(app);
	await registerTelegramWebhookRoutes(app);
	await registerWhatsappRoutes(app);
	await registerMaxRoutes(app);
	await registerVisitRoutes(app);
	await registerLeadsRoutes(app);
	await registerWaitlistRoutes(app);
	await registerSterilizationRoutes(app);
	await registerFamilyFinanceRoutes(app);
	await registerDicomwebRoutes(app);
	await registerXrayRoutes(app);
	await registerAuthRoutes(app);
	await registerEgiszRoutes(app);
	await registerDiaryRoutes(app);
	await registerTemplateRoutes(app);
	await registerOdontogramRoutes(app);
	await registerToothHistoryRoutes(app);
	await registerLabRoutes(app);
	await registerFilesRoutes(app);
	await workspaceProfileRoutes(app);

	if (options.startTelegramWorker !== false) {
		// const telegramOutboxDueWorker = startDenteTelegramOutboxDueWorker({ logger: app.log });
		startBiAnalyticsWorker();
		startSyncEngine(db.$client as any); // assuming db exposes pglite
		startBackupDaemon();
		app.addHook("onClose", async () => {
			// telegramOutboxDueWorker.stop();
			// clearInterval(recallWorkerTimer);
			stopSyncEngine();
			stopBackupDaemon();
		});
	}

	return app;
}

export async function startDenteApiServer() {
	await setupProxyAndTunnels().catch((err) => {
		console.error("[Proxy Boot] Failed to run proxy/tunnel diagnostics:", err);
	});
	const app = await createDenteApiApp();
	const host = process.env.API_HOST ?? "127.0.0.1";
	const port = Number(process.env.API_PORT ?? 4100);

	try {
		await app.listen({ host, port });
	} catch (error) {
		app.log.error(error);
		process.exit(1);
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	await startDenteApiServer();
}

// trigger restart
// trigger restart
