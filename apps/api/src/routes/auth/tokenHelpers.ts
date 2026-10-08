import { sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { unguardedBypassAllowed } from "../../accessGuard.js";
import { type TenantDb, withSuperuserBypass } from "../../db/rls.js";
import { authTokenSecret } from "../../security/authSecret.js";
import type { AuthPayloadSchema, PreTenantRead } from "./types.js";

/**
 * Секрет подписи токенов. Раньше здесь стоял публичный фолбэк
 * "dente_jwt_secret_demo": зная его, кто угодно мог выпустить себе токен с
 * произвольным organizationId и получить доступ к данным любой клиники.
 */
export const TOKEN_SECRET = () => authTokenSecret();

/**
 * Демо-вход (clinic@example.com / doctor@clinic.com) — это бэкдор в исходниках:
 * пара логинов, зашитых в этот файл, пускает в систему БЕЗ обращения к базе и
 * БЕЗ проверки пароля. `/api/auth/login` выдаёт по ним подписанные clinicToken и
 * staffToken с ролью doctor на организацию 00000000-0000-0000-0000-000000000001
 * — тот самый идентификатор, который ставит сидер (`scripts/seedAuth.ts`,
 * `scripts/migrateStateToDb.ts`), то есть на настоящую клинику заказчика.
 */
export function demoLoginAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_ALLOW_DEMO_LOGIN");
}

/**
 * Ключ первичной настройки для смены чужих учётных данных.
 * Раньше имел публичный дефолт "dente_admin_setup_key" — любой мог сбросить
 * пароль любой клиники и PIN любого сотрудника. Теперь без переменной окружения
 * эти маршруты просто недоступны (fail closed).
 */
export function configuredAdminSetupKey(): string | null {
	return process.env.ADMIN_SETUP_KEY?.trim() || null;
}

/** Постоянная задержка, чтобы неуспешный вход не выдавал существование учётки по таймингу. */
export async function authFailureDelay(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 200));
}

/** Raw body -> plain object for AUTH-first (adminKey) without throw on null/number. */
export function authBodyRecord(value: unknown): Record<string, unknown> {
	if (value !== null && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

export function authAdminKeyFromRecord(
	record: Record<string, unknown>,
): string | null {
	const raw = record.adminKey;
	if (typeof raw === "string") return raw;
	if (typeof raw === "number") return String(raw);
	return null;
}

/** Как parseSettingsPayload: null = тело не прошло схему. */
export function parseAuthPayload<T>(
	schema: AuthPayloadSchema<T>,
	value: unknown,
): T | null {
	const parsed = schema.safeParse(value);
	if (!parsed.success) return null;
	return parsed.data;
}

/**
 * Сообщения SaaS-отказов идут в прежнем порядке ручных if-ов.
 * Zod может вернуть несколько issues сразу — берём первую по старой цепочке.
 */
export function authSchemaMessage(
	error: z.ZodError,
	fallback: string,
	priority: Array<{ match: RegExp | string; message: string }>,
): string {
	const texts = error.issues.map((issue) => issue.message);
	for (const rule of priority) {
		const hit =
			typeof rule.match === "string"
				? texts.some((text) => text.includes(rule.match as string))
				: texts.some((text) => (rule.match as RegExp).test(text));
		if (hit) return rule.message;
	}
	// Обязательные поля (min) без custom-текста → fallback «заполните / введите».
	return fallback;
}

/**
 * Выполняет одно чтение «до арендатора» под обходом и заодно проверяет, что
 * обход в этой транзакции действительно действовал.
 *
 * Лишний запрос делается ТОЛЬКО когда строка не найдена, то есть на неуспешном
 * пути, где и без того стоит `authFailureDelay` в 200 мс. Успешный вход платит
 * ровно один round-trip, как и раньше.
 */
export async function readUnderBypass<T>(
	read: (tx: TenantDb) => Promise<T[]>,
): Promise<PreTenantRead<T>> {
	return withSuperuserBypass(async (tx) => {
		const rows = await read(tx);
		if (rows.length > 0) {
			return { row: rows[0], bypassActive: true };
		}
		const probe = await tx.execute(
			sql`SELECT current_setting('app.superuser_bypass', true) AS flag`,
		);
		const flag =
			(probe as unknown as { rows?: Array<{ flag: string | null }> }).rows?.[0]
				?.flag ?? null;
		return { row: undefined, bypassActive: flag === "on" };
	});
}

/**
 * Ответ на «строку скрыла политика, а не её отсутствие».
 *
 * ДИАГНОСТИЧЕСКАЯ ЧЕСТНОСТЬ. Отвечать 401 «Неверный логин или пароль» на отказ
 * политики нельзя: это не ошибка пользователя, и оператор клиники будет
 * перебирать пароли вместо того, чтобы позвать администратора. Но и наружу
 * подробности отдавать нельзя — устройство защиты чужому знать незачем.
 * Поэтому разделение то же, что у `publicApiErrorMessage` (server.ts): всё
 * техническое уходит в журнал сервера, клиенту — обобщённый текст.
 */
export function replyPreTenantPolicyFailure(
	request: FastifyRequest,
	reply: FastifyReply,
	operation: string,
): FastifyReply {
	request.log.error(
		{ operation, setting: "app.superuser_bypass", url: request.url },
		"[AUTH_RLS_BYPASS_INACTIVE] Запрос «до арендатора» выполнен без действующего обхода RLS: " +
			"пустой результат объясняется политикой защиты строк, а не отсутствием записи. " +
			"Ответ пользователю обобщён намеренно.",
	);
	return reply.code(500).send({
		error: "AuthUnavailable",
		message:
			"Сервер не смог выполнить проверку доступа. Повторите попытку позже и сообщите администратору клиники.",
	});
}
