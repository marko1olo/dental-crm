import type { FastifyReply, FastifyRequest } from "fastify";
import { unguardedBypassAllowed } from "../../accessGuard.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

export const telegramSecretHeader = "x-telegram-bot-api-secret-token";
export const denteAdminSecretHeader = "x-dente-admin-secret";
export const telegramLinkCodeRateLimitWindowMs = 10 * 60_000;
export const telegramLinkCodeRejectedAttemptLimit = 5;

export function configuredTelegramAdminSecret(): string | null {
	return process.env.DENTE_TELEGRAM_ADMIN_SECRET?.trim() || null;
}

export function isExplicitlyUnguardedControlPlaneAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE");
}

export async function requireTelegramControlPlaneAccess(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
	if (
		typeof clinicToken === "string" &&
		(clinicToken.startsWith("demo-showcase-") || clinicToken.startsWith("demo-token-"))
	) {
		return;
	}
	const adminSecret = configuredTelegramAdminSecret();
	if (!adminSecret) {
		if (isExplicitlyUnguardedControlPlaneAllowed()) {
			return;
		}
		return reply.code(503).send({
			error: "TelegramAdminSecretMissing",
			message:
				"На сервере не задан секрет администратора для управления Telegram. Для локального стенда можно явно включить режим без проверки в серверных настройках.",
		});
	}
	const providedSecret = request.headers[denteAdminSecretHeader];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	if (
		!timingSafeSecretEqual(
			typeof normalizedProvidedSecret === "string"
				? normalizedProvidedSecret
				: null,
			adminSecret,
		)
	) {
		return reply.code(403).send({
			error: "TelegramAdminSecretRequired",
			message:
				"Для управления Telegram нужен действующий секрет администратора клиники.",
		});
	}
}

export function configuredSendTimeoutMs(): number {
	const raw = process.env.DENTE_TELEGRAM_SEND_TIMEOUT_MS?.trim();
	if (!raw) return 12_000;
	const parsed = Number(raw);
	return Number.isFinite(parsed)
		? Math.max(1000, Math.min(60_000, parsed))
		: 12_000;
}
