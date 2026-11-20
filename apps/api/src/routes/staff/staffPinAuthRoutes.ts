import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { verifyCredential } from "../../utils/cryptoHelper.js";
import { resolveOrganizationId } from "./staffHelpers.js";
import { verifyStaffPinBodySchema } from "./staffSchemas.js";

interface PinAttemptRecord {
	attempts: number;
	firstAttemptAt: number;
	lockedUntil?: number;
}

const PIN_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 минута
const PIN_MAX_ATTEMPTS = 5; // 5 попыток
const PIN_LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 минут блокировки

const pinRateLimits = new Map<string, PinAttemptRecord>();

export async function registerStaffPinAuthRoutes(app: FastifyInstance) {
	/**
	 * POST /api/staff/pin-verify — Быстрая проверка ПИН-кода врача/ассистента для кресла/терминала
	 * Защита от брутфорса: не более 5 попыток в минуту с блокировкой на 5 минут при исчерпании.
	 */
	app.post("/api/staff/pin-verify", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const parsed = verifyStaffPinBodySchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры проверки ПИН-кода сотрудника.",
			};
		}

		const rateKey = `${auth.orgId}:${parsed.data.staffId}`;
		const now = Date.now();
		const entry = pinRateLimits.get(rateKey);

		if (entry?.lockedUntil && now < entry.lockedUntil) {
			const remainingSec = Math.ceil((entry.lockedUntil - now) / 1000);
			reply.code(429);
			reply.header("Retry-After", String(remainingSec));
			return {
				error: "RateLimitExceeded",
				message: `Превышен лимит попыток ввода ПИН-кода. Проверка заблокирована на ${remainingSec} сек.`,
				retryAfter: remainingSec,
			};
		}

		const [user] = await db
			.select({
				id: schema.users.id,
				fullName: schema.users.fullName,
				role: schema.users.role,
				pinCodeHash: schema.users.pinCodeHash,
			})
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, parsed.data.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			)
			.limit(1);

		if (!user) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

		if (!user.pinCodeHash) {
			reply.code(400);
			return {
				error: "PinNotConfigured",
				message: "Для данного сотрудника ПИН-код ещё не установлен.",
			};
		}

		const isMatched = await verifyCredential(parsed.data.pinCode, user.pinCodeHash);
		if (!isMatched) {
			if (!entry || now - entry.firstAttemptAt > PIN_RATE_LIMIT_WINDOW_MS) {
				pinRateLimits.set(rateKey, { attempts: 1, firstAttemptAt: now });
			} else {
				entry.attempts += 1;
				if (entry.attempts >= PIN_MAX_ATTEMPTS) {
					entry.lockedUntil = now + PIN_LOCKOUT_DURATION_MS;
					reply.code(429);
					reply.header("Retry-After", String(Math.ceil(PIN_LOCKOUT_DURATION_MS / 1000)));
					return {
						error: "RateLimitExceeded",
						message: "Превышен лимит попыток ввода ПИН-кода. Проверка заблокирована на 5 минут.",
						retryAfter: Math.ceil(PIN_LOCKOUT_DURATION_MS / 1000),
					};
				}
			}

			const currentAttempts = pinRateLimits.get(rateKey)?.attempts ?? 1;
			const remainingAttempts = Math.max(0, PIN_MAX_ATTEMPTS - currentAttempts);

			reply.code(401);
			return {
				error: "InvalidPin",
				message: `Неверный ПИН-код сотрудника. Осталось попыток: ${remainingAttempts}.`,
				remainingAttempts,
			};
		}

		// Успешный вход: сбрасываем счетчик неудач
		pinRateLimits.delete(rateKey);

		return {
			ok: true,
			verified: true,
			staffId: user.id,
			fullName: user.fullName,
			role: user.role,
		};
	});
}
