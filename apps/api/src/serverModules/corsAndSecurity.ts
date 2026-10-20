import net from "node:net";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { authTokenSecret } from "../security/authSecret.js";
import { getProxyAgent } from "../speech/keyPool.js";
import { ensureSshTunnel } from "../speech/tunnel.js";

/**
 * Проверка конфигурации безопасности на старте (fail fast).
 * Раньше сервер спокойно поднимался без AUTH_TOKEN_SECRET и подписывал токены
 * публичной строкой из репозитория. Теперь в production он не стартует вовсе,
 * а в dev печатает предупреждения о небезопасных послаблениях.
 */
export function assertSecurityConfiguration(): void {
	// Бросит исключение в production, если AUTH_TOKEN_SECRET не задан или слабый.
	authTokenSecret();

	const isProduction = process.env.NODE_ENV === "production";
	const unsafeFlags = [
		"DENTE_CLINICAL_ALLOW_UNGUARDED_READS",
		"DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS",
		"DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
		"DENTE_DEV_ALLOW_HEADER_ORG",
		"DENTE_ALLOW_DEMO_LOGIN",
		"DENTE_ALLOW_DEMO_FIXTURES",
	].filter((name) => process.env[name] === "1");

	if (isProduction) {
		if (unsafeFlags.length > 0) {
			throw new Error(
				`Небезопасные флаги разработки включены в production: ${unsafeFlags.join(", ")}. Отключите их перед запуском.`,
			);
		}
		return;
	}

	const активные = [
		process.env.DENTE_ALLOW_DEMO_LOGIN === "1" ? "демо-вход" : null,
		"код входа в портал пишется в лог сервера, пока у клиники не настроена отправка SMS",
		process.env.DENTE_DEV_ALLOW_HEADER_ORG === "1"
			? "заголовок x-organization-id"
			: null,
		process.env.DENTE_ALLOW_DEMO_FIXTURES === "1"
			? "демо-фикстуры ЕГИСЗ"
			: null,
	].filter(Boolean);
	process.stderr.write(
		`[security] Режим разработки. Активные послабления: ${активные.join(", ")}. ` +
			"В production все они выключены автоматически.\n",
	);
}

export async function checkProxyPortDirectly(
	proxyUrlString: string,
): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const cleanUrl = proxyUrlString.replace(/^socks5h?:\/\//i, "socks5://");
			const url = new URL(
				cleanUrl.includes("://") ? cleanUrl : `socks5://${cleanUrl}`,
			);
			const port = parseInt(url.port || "1080", 10);
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
		process.stderr.write(
			`[Proxy Boot] SSH SOCKS5 tunnel autostart failed: ${err}\n`,
		);
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
				process.stderr.write(
					`[Proxy Boot] Configured proxy ${proxyUrl} is offline. Disabling proxy env variables to force clean direct connections.\n`,
				);
				delete process.env.HTTPS_PROXY;
				delete process.env.HTTP_PROXY;
				delete process.env.PROXY_URL;
			}
		}
	}

	// Register global agent for direct undici fetches
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	(globalThis as any)._dentalProxyAgent = getProxyAgent() || undefined;
}

export function resolveWebOrigins(): (string | RegExp)[] {
	let rawWebOrigin = process.env.WEB_ORIGIN;
	if (!rawWebOrigin) {
		if (process.env.NODE_ENV === "production") {
			throw new Error(
				"WEB_ORIGIN environment variable is required in production",
			);
		}
		rawWebOrigin = "http://127.0.0.1:5173";
	}

	return rawWebOrigin
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
}

export async function registerCorsAndSecurity(app: FastifyInstance) {
	const webOrigins = resolveWebOrigins();

	await app.register(cors, {
		origin: webOrigins,
		// Заголовки авторизации и correlation-id должны явно проходить преflight-проверку.
		allowedHeaders: [
			"content-type",
			"authorization",
			"x-dente-clinic-token",
			"x-dente-staff-token",
			"x-dente-admin-secret",
			"x-organization-id",
			"x-requested-with",
			"x-correlation-id",
			"x-request-id",
			"x-idempotency-key",
			"idempotency-key",
		],
		exposedHeaders: [
			"retry-after",
			"x-ratelimit-limit",
			"x-ratelimit-remaining",
			"x-correlation-id",
			"x-request-id",
			"etag",
			"x-idempotency-key",
			"x-idempotency-status",
			"x-cache-lookup",
		],
		maxAge: 600,
	});

	await app.register(helmet, {
		contentSecurityPolicy: false,
	});
}
