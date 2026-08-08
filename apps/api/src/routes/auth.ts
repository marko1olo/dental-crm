import { staffRoleSchema } from "@dental/shared";
import crypto from "crypto";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { unguardedBypassAllowed } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	type TenantDb,
	withSuperuserBypass,
	withTenantCtx,
} from "../db/rls.js";
import {
	auditEvents,
	organizations,
	userInvitations,
	users,
} from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { ADMIN_ROLES, getRequestIdentity } from "../security/identity.js";
import { resetRateLimit } from "../security/rateLimit.js";
import {
	hashCredential,
	signToken,
	verifyCredential,
	verifyToken,
} from "../utils/cryptoHelper.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

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
 *
 * ЧТО БЫЛО И ПОЧЕМУ ЭТО ДЫРА, А НЕ ТЕОРИЯ.
 * Стояло:
 *     if (process.env.NODE_ENV === "production") return false;
 *     return process.env.DENTE_ALLOW_DEMO_LOGIN !== "0";
 * Два независимых дефекта в двух строках.
 *   1. ОТСУТСТВИЕ ПЕРЕМЕННОЙ ВКЛЮЧАЛО БЭКДОР. `!== "0"` истинно, когда
 *      переменной нет вовсе. Небезопасное поведение было поведением по
 *      умолчанию: чтобы закрыть вход, требовалось знать имя переменной и
 *      выставить её — а чтобы открыть, не требовалось ничего.
 *   2. NODE_ENV НЕ ПРИЗНАК БОЯ. `apps/api/package.json` объявляет
 *      `"start": "node dist/server.js"` и режим не задаёт. У заказчика,
 *      поднявшего сервер этой командой, NODE_ENV пуст, первая строка не
 *      срабатывает, и обе защиты промахиваются мимо ровно того случая, ради
 *      которого написаны.
 * Замерено на этом дереве до правки: пустой NODE_ENV, переменная не задана,
 * POST /api/auth/login {"email":"doctor@clinic.com","password":<заведомо
 * неверный>} → 200 с clinicToken и staffToken, роль doctor. Комментарий над
 * функцией при этом уже утверждал, что вход «выключен по умолчанию»: описание
 * разошлось с кодом, и читатель получал ложное спокойствие.
 *
 * ЧТО СТАЛО. Тот же механизм, что у остальных послаблений репозитория
 * (`accessGuard.unguardedBypassAllowed`, уже применён в routes/schedule.ts,
 * routes/settings.ts, routes/imaging.ts, routes/telegram.ts): бэкдор открыт,
 * только если ОДНОВРЕМЕННО названный режим разработки (`development`/`test`)
 * И `DENTE_ALLOW_DEMO_LOGIN=1`. Незаданная переменная, пустой или незнакомый
 * NODE_ENV («staging», «prod», опечатка) не открывают ничего. Направление
 * отказа выбрано осознанно: ошибка в настройке теперь закрывает вход, а не
 * открывает его.
 *
 * ЗАЩЁЛКА С ДВУХ СТОРОН. `server.ts:136-150` отказывает серверу в старте, если
 * при NODE_ENV=production выставлен `DENTE_ALLOW_DEMO_LOGIN=1`. Раньше эта
 * проверка была бесполезна против типового случая — она ловит значение "1",
 * а бэкдор открывался ПУСТОТОЙ. Теперь единственный способ его включить это и
 * есть "1", то есть та самая величина, на которую production-проверка ругается.
 *
 * ВЕРНУТЬ «КАК БЫЛО» — значит вернуть вход без учётных данных в медицинскую
 * систему у заказчика. Разработчику нужен демо-вход: задайте
 * `DENTE_ALLOW_DEMO_LOGIN=1` (это уже делает `apply-dev-env.ps1`), а не
 * возвращайте `!== "0"`.
 */
function demoLoginAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_ALLOW_DEMO_LOGIN");
}

/**
 * Ключ первичной настройки для смены чужих учётных данных.
 * Раньше имел публичный дефолт "dente_admin_setup_key" — любой мог сбросить
 * пароль любой клиники и PIN любого сотрудника. Теперь без переменной окружения
 * эти маршруты просто недоступны (fail closed).
 */
function configuredAdminSetupKey(): string | null {
	return process.env.ADMIN_SETUP_KEY?.trim() || null;
}

/** Постоянная задержка, чтобы неуспешный вход не выдавал существование учётки по таймингу. */
async function authFailureDelay(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 200));
}

interface ClinicLoginBody {
	email?: string;
	password?: string;
}

interface StaffUnlockBody {
	userId?: string;
	pinCode?: string;
}

interface SetupInitBody {
	clinicName?: string;
	email?: string;
	password?: string;
	ownerName?: string;
	ownerPin?: string;
}

/**
 * SaaS-тела auth раньше разбирались как `(request.body as any)`.
 * Схемы ниже повторяют прежние ручные проверки (длина пароля, форма PIN,
 * обязательные поля) через safeParse — тот же узор, что parseSettingsPayload.
 * Сообщения отказов сохранены дословно, чтобы клиент и существующие тесты
 * не меняли контракт.
 */
const authPinSchema = z
	.union([z.string(), z.number()])
	.transform((value) => String(value))
	.refine((value) => /^\d{4,12}$/.test(value), {
		message: "PIN должен состоять из 4–12 цифр.",
	});

const registerBodySchema = z
	.object({
		clinicName: z.string().trim().min(1),
		ownerName: z.string().trim().min(1),
		email: z.string().trim().min(1),
		password: z.string().min(1),
		ownerPin: authPinSchema.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.password.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Пароль должен быть не короче 8 символов.",
			});
		}
	});

const loginBodySchema = z.object({
	email: z.string().trim().min(1),
	password: z.string().min(1),
});

/**
 * Кабинет клиники: POST /api/auth/clinic/login.
 * Bare cast + email.toLowerCase() → 500 на number/object email.
 * Сообщение пустого/битого тела сохранено дословно.
 */
const clinicLoginBodySchema = z.object({
	email: z.string().min(1),
	password: z.string().min(1),
});

/**
 * PIN-разблокировка: POST /api/auth/staff/unlock.
 * Bare cast; number pin допускается (как authPinSchema SaaS), object → 400.
 */
const staffUnlockBodySchema = z.object({
	userId: z.string().min(1),
	pinCode: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.refine((value) => value.length > 0, { message: "required" }),
});

const clinicLoginValidationMessage = "Введите логин и пароль клиники.";
const staffUnlockValidationMessage =
	"Необходимо указать сотрудника и ввести PIN-код.";

/**
 * Admin set-password / set-pin: AUTH first (identity | ADMIN_SETUP_KEY), then body.
 * adminKey is read from the raw object before full schema — credential, not form field.
 * newPassword/newPin: string; pin number OK via union->String (same as unlock).
 */
const clinicSetPasswordBodySchema = z
	.object({
		organizationId: z.string().min(1).optional(),
		newPassword: z.string().min(1),
		adminKey: z
			.union([z.string(), z.number()])
			.transform((value) => String(value))
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.newPassword.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["newPassword"],
				message: "Новый пароль должен быть не короче 8 символов.",
			});
		}
	});

const staffSetPinBodySchema = z.object({
	userId: z.string().min(1),
	newPin: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.refine((value) => /^\d{4,12}$/.test(value), {
			message: "PIN должен состоять из 4–12 цифр.",
		}),
	adminKey: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.optional(),
});

/**
 * First-run setup: public route; bare cast + destructure number email -> 500.
 * Messages and if-order preserved (required -> password length -> PIN).
 */
const setupInitBodySchema = z
	.object({
		clinicName: z.string().min(1),
		email: z.string().min(1),
		password: z.string().min(1),
		ownerName: z.string().min(1).optional(),
		ownerPin: authPinSchema.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.password.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Пароль должен быть не короче 8 символов.",
			});
		}
	});

/** Raw body -> plain object for AUTH-first (adminKey) without throw on null/number. */
function authBodyRecord(value: unknown): Record<string, unknown> {
	if (value !== null && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

function authAdminKeyFromRecord(
	record: Record<string, unknown>,
): string | null {
	const raw = record.adminKey;
	if (typeof raw === "string") return raw;
	if (typeof raw === "number") return String(raw);
	return null;
}

const createInviteBodySchema = z.object({
	email: z.string().trim().min(1),
	role: z.string().min(1),
});

const acceptInviteBodySchema = z
	.object({
		token: z.string().trim().min(1),
		fullName: z.string().trim().min(1),
		password: z.string().min(1),
		pinCode: authPinSchema,
	})
	.superRefine((data, ctx) => {
		if (data.password.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Пароль должен быть не короче 8 символов.",
			});
		}
	});

const updatePasswordBodySchema = z
	.object({
		oldPassword: z.string().min(1),
		newPassword: z.string().min(1),
	})
	.superRefine((data, ctx) => {
		if (data.newPassword.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["newPassword"],
				message: "Новый пароль должен быть не короче 8 символов.",
			});
		}
	});

const updatePinBodySchema = z.object({
	oldPin: z
		.union([z.string(), z.number()])
		.transform((value) => String(value))
		.refine((value) => value.length > 0, { message: "required" }),
	newPin: authPinSchema,
});

type AuthPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false; error: z.ZodError };
};

/** Как parseSettingsPayload: null = тело не прошло схему. */
function parseAuthPayload<T>(
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
function authSchemaMessage(
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

/*
 * ЗДЕСЬ СТОЯЛА `requireClinicToken`, И ОНА УДАЛЕНА, А НЕ СШИТА.
 *
 * Она выглядела как общий middleware проверки токена кабинета — с текстами
 * отказов 401 «Необходима авторизация рабочего кабинета клиники» и «Сессия
 * истекла». Ни один маршрут её не вызывал: единственным вхождением имени в
 * `apps/api/src` было само объявление, остальные упоминания — заметки о ней же.
 * Ровно та форма, в которой в этом дереве уже стояла НАСТОЯЩАЯ дыра:
 * `requireScheduleMutationAccess` была так же объявлена, снабжена отказами и не
 * вызывалась, и любой с токеном кабинета писал в сетку приёмов мимо гейта
 * администратора (закрыто 1f4614ea2).
 *
 * ПОЧЕМУ УДАЛЕНА, А НЕ ПОДКЛЮЧЕНА. Сшивать нечего: её единственным действием
 * после проверки подписи была запись `request.clinicOrganizationId`, которую во
 * всём дереве не читал НИКТО — ни один маршрут, ни один сервис (проверено
 * поиском: одна запись, ноль чтений). Проверку подписи токена кабинета делает
 * `security/identity.ts` (`getRequestIdentity` + `requireOrganizationId`) и делает
 * строже: с кэшем разбора на объекте запроса, с меткой `verified` и с отказом
 * непроверенной организации на запись.
 *
 * И ПОДКЛЮЧИТЬ ЕЁ ОБЩИМ MIDDLEWARE БЫЛО НЕЛЬЗЯ: она принимает только
 * `x-dente-clinic-token`, поэтому на маршрутах отчётов и выплат, которые ходят по
 * `x-dente-staff-token`, отвечала бы 401 на верных запросах.
 *
 * Цена бездействия была не нулевой: инженер, проверяющий «есть ли охрана токена
 * кабинета», находил имя поиском и получал ложное спокойствие. Пустое место
 * честнее мёртвой охраны — оно отправляет читателя в identity.ts, где проверка
 * действительно живёт.
 */

/*
 * ОПЕРАЦИИ «ДО АРЕНДАТОРА»
 * ========================
 *
 * После миграций 0157–0160 роль приложения `dental` — NOSUPERUSER/NOBYPASSRLS
 * и владелец таблиц, а RLS стоит в режиме FORCE, то есть распространяется и на
 * владельца. Любой запрос, выполненный без `app.current_tenant`, видит ноль
 * строк, а любая запись отвергается кодом 42501.
 *
 * Часть операций аутентификации арендатора знать НЕ МОЖЕТ по существу: пока
 * организация не найдена по логину или ещё не создана, называть арендатора
 * нечем. Замер под ролью `dental` на живой базе (транзакции откатывались):
 *
 *   SELECT organizations WHERE login_id  без контекста ....... 0 строк
 *   SELECT organizations WHERE login_id  под обходом ......... 1 строка
 *   INSERT organizations                 без контекста ....... 42501
 *   INSERT organizations                 под обходом ......... OK
 *   INSERT organizations                 под current_tenant=<новый id> ... OK
 *   INSERT organizations                 под current_tenant=<чужой id> ... 42501
 *   INSERT users / audit_events          под обходом ......... 42501
 *   INSERT users / audit_events          под current_tenant .. OK
 *
 * Отсюда два разных инструмента, и путать их нельзя:
 *
 *   1. ЧТЕНИЕ, которому арендатор неизвестен → `withSuperuserBypass` вокруг
 *      РОВНО одного запроса. Обход существует только в `USING`, поэтому на
 *      запись он не действует нигде, кроме самой `organizations`.
 *
 *   2. ЗАПИСЬ → `withTenantCtx`. Для создания клиники идентификатор
 *      генерируется ДО вставки и им же выставляется контекст: политика
 *      `organizations` сверяет `id = current_tenant`, поэтому под таким
 *      контекстом можно создать ровно одну строку — ту, что назвали, и никакую
 *      другую. Это строго уже обхода, под которым запись в `organizations`
 *      не ограничена ничем (миграция 0159, PART 4 признаёт это остаточным
 *      риском). Тот же приём выбран для сидера `scripts/migrateStateToDb.ts`.
 *
 * Оборачивать в обход весь маршрут запрещено: под него попали бы соседние
 * запросы, которые обязаны быть изолированы.
 */

/** Результат чтения «до арендатора». */
interface PreTenantRead<T> {
	/** Найденная строка либо undefined. */
	row: T | undefined;
	/**
	 * Был ли обход действительно включён в той же транзакции, где выполнялся
	 * запрос. `false` означает, что пустой результат объясняется политикой RLS,
	 * а не отсутствием записи. Отвечать на это «неверный логин» — ложь.
	 */
	bypassActive: boolean;
}

/**
 * Выполняет одно чтение «до арендатора» под обходом и заодно проверяет, что
 * обход в этой транзакции действительно действовал.
 *
 * Лишний запрос делается ТОЛЬКО когда строка не найдена, то есть на неуспешном
 * пути, где и без того стоит `authFailureDelay` в 200 мс. Успешный вход платит
 * ровно один round-trip, как и раньше.
 */
async function readUnderBypass<T>(
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
function replyPreTenantPolicyFailure(
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

export async function registerAuthRoutes(app: FastifyInstance) {
	// ─── Clinic Workspace Login ───────────────────────────────────────────────────
	app.post(
		"/api/auth/clinic/login",
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: "1 minute",
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const input = parseAuthPayload(clinicLoginBodySchema, request.body);
			if (!input) {
				return reply.code(400).send({
					error: "ValidationError",
					message: clinicLoginValidationMessage,
				});
			}
			const { email, password } = input;

			const loginId = email.toLowerCase().trim();

			const isDemoClinicLogin =
				demoLoginAllowed() &&
				loginId === "clinic@example.com" &&
				password === "dente2026";

			// Look up organization by login ID
			//
			// БЫЛО: ошибка базы гасилась дважды (.catch(() => []) и внешний try/catch),
			// после чего org оставалась пустой и клиника получала 401 «Неверный логин
			// или пароль». Недоступная база выглядела как неправильный пароль: сотрудники
			// перебирали пароли, а авария в логах отличалась от обычной опечатки только
			// строкой AUTH_DB_ERROR. Отказ инфраструктуры должен отвечать 500.
			//
			// ОПЕРАЦИЯ «ДО АРЕНДАТОРА». Организация ищется по логину, то есть до
			// запроса арендатор неизвестен, а политика `organizations` под FORCE RLS
			// отдаёт таким запросам ноль строк (замер: 0 строк без контекста, 1 строка
			// под обходом). Обход накрывает РОВНО этот SELECT: всё остальное в
			// маршруте, включая запись аудита ниже, идёт под контекстом арендатора.
			//
			// Демо-вход сохраняет прежнее поведение: он не обращается к базе и остаётся
			// доступен, если таблиц ещё нет (свежая установка до миграций).
			let org:
				| typeof organizations.$inferSelect
				| Record<string, any>
				| undefined;
			try {
				const lookup = await readUnderBypass((tx) =>
					tx
						.select()
						.from(organizations)
						.where(eq(organizations.loginId, loginId))
						.limit(1),
				);
				if (!lookup.row && !lookup.bypassActive && !isDemoClinicLogin) {
					return replyPreTenantPolicyFailure(
						request,
						reply,
						"clinic-login:lookup-organization",
					);
				}
				org = lookup.row;
			} catch (dbErr) {
				console.error("[AUTH_DB_ERROR]", dbErr);
				if (!isDemoClinicLogin) {
					return reply.code(500).send({
						error: "AuthUnavailable",
						message:
							"Вход временно недоступен: нет связи с базой данных. Повторите попытку позже.",
					});
				}
			}

			if (!org) {
				if (isDemoClinicLogin) {
					org = {
						id: "00000000-0000-0000-0000-000000000001",
						name: "Демо Клиника DENTE",
						passwordHash: null,
					};
				} else {
					await authFailureDelay();
					return reply.code(401).send({
						error: "AuthError",
						message: "Неверный логин или пароль клиники.",
					});
				}
			}

			// FAIL CLOSED: организация без пароля больше не пускает с любым паролем.
			// Раньше отсутствие passwordHash означало "подойдёт что угодно".
			const storedHash = org.passwordHash;
			const isMatch = storedHash
				? await verifyCredential(password, storedHash)
				: isDemoClinicLogin;

			if (!isMatch) {
				await authFailureDelay();
				return reply.code(401).send({
					error: "AuthError",
					message: "Неверный логин или пароль клиники.",
				});
			}

			resetRateLimit(request);

			const token = signToken(
				{ organizationId: org.id, clinicName: org.name },
				TOKEN_SECRET(),
				60 * 60 * 24, // 24h clinic session
			);

			// Запись аудита идёт УЖЕ ПОД АРЕНДАТОРОМ, а не под обходом: в `WITH CHECK`
			// политики audit_events дизъюнкта обхода нет, и вставка под одним лишь
			// `app.superuser_bypass` отвергается кодом 42501 (проверено). Арендатор к
			// этому моменту известен — это org.id, поэтому контекст даёт и права на
			// запись, и границу: чужую организацию сюда записать нельзя.
			await withTenantCtx(org.id, async (tx) => {
				await tx.insert(auditEvents).values({
					organizationId: org.id,
					entityType: "organization",
					entityId: org.id,
					action: "clinic_login_success",
					reason: `Открыт рабочий кабинет: ${org.name}`,
				});
			});

			return reply.send({
				ok: true,
				clinicToken: token,
				clinicProfile: { organizationId: org.id, clinicName: org.name },
			});
		},
	);

	// ─── Staff PIN Unlock ─────────────────────────────────────────────────────────
	app.post(
		"/api/auth/staff/unlock",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const input = parseAuthPayload(staffUnlockBodySchema, request.body);
			if (!input) {
				return reply.code(400).send({
					error: "ValidationError",
					message: staffUnlockValidationMessage,
				});
			}
			const { userId, pinCode } = input;

			// Verify clinic token is present so we know the org context
			const clinicHeader = request.headers["x-dente-clinic-token"];
			const clinicToken = Array.isArray(clinicHeader)
				? clinicHeader[0]
				: clinicHeader;
			const clinicPayload = clinicToken
				? verifyToken(clinicToken, TOKEN_SECRET())
				: null;

			if (!clinicPayload?.organizationId) {
				return reply.code(401).send({
					error: "ClinicAuthRequired",
					message: "Сначала выполните вход в кабинет клиники.",
				});
			}

			const orgId = clinicPayload.organizationId as string;

			const [user] = await withTenantCtx(orgId, async (tx) => {
				return tx
					.select()
					.from(users)
					.where(
						and(
							eq(users.id, userId),
							eq(users.organizationId, orgId),
							eq(users.isActive, true),
						),
					)
					.limit(1);
			});
			if (!user) {
				await authFailureDelay();
				// Единый ответ для "нет сотрудника" и "неверный PIN": иначе endpoint
				// работает как оракул существования сотрудников организации.
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Неверный PIN-код." });
			}

			const storedPinHash = user.pinCodeHash;
			const isMatch = storedPinHash
				? await verifyCredential(pinCode, storedPinHash)
				: false;

			if (!isMatch) {
				await authFailureDelay();
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Неверный PIN-код." });
			}

			resetRateLimit(request);

			const sessionId = crypto.randomUUID();
			await withTenantCtx(orgId, async (tx) => {
				await tx
					.update(users)
					.set({ currentSessionId: sessionId })
					.where(and(eq(users.id, user.id), eq(users.organizationId, orgId)));
			});

			const staffToken = signToken(
				{
					userId: user.id,
					fullName: user.fullName,
					role: user.role,
					organizationId: orgId,
					sessionId,
				},
				TOKEN_SECRET(),
				60 * 60 * 8, // 8h staff session
			);

			await db.insert(auditEvents).values({
				organizationId: orgId,
				actorUserId: user.id,
				entityType: "user",
				entityId: user.id,
				action: "staff_unlock_success",
				reason: `Сотрудник ${user.fullName} начал сессию.`,
			});

			return reply.send({
				ok: true,
				staffToken,
				user: {
					id: user.id,
					fullName: user.fullName,
					role: user.role,
					phone: user.phone,
					email: user.email,
				},
			});
		},
	);

	// ─── Session Status Check ─────────────────────────────────────────────────────
	app.get(
		"/api/auth/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const clinicHeader = request.headers["x-dente-clinic-token"];
			const staffHeader = request.headers["x-dente-staff-token"];
			const clinicToken = Array.isArray(clinicHeader)
				? clinicHeader[0]
				: clinicHeader;
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;

			const clinicPayload = clinicToken
				? verifyToken(clinicToken, TOKEN_SECRET())
				: null;
			const staffPayload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			let activeUser: any = null;
			if (staffPayload?.userId && clinicPayload?.organizationId) {
				const [user] = await db
					.select({ id: users.id, fullName: users.fullName, role: users.role })
					.from(users)
					.where(
						and(
							eq(users.id, staffPayload.userId as string),
							eq(users.isActive, true),
						),
					)
					.limit(1);
				activeUser = user ?? null;
			}

			return reply.send({
				clinicUnlocked: !!clinicPayload,
				staffUnlocked: !!staffPayload,
				organizationId: (clinicPayload?.organizationId as string) ?? null,
				activeUser,
			});
		},
	);

	// ─── Admin: Set/Reset Clinic Password ────────────────────────────────────────
	// БЫЛО: любой запрос с публичным дефолтным ключом "dente_admin_setup_key" мог
	// сбросить пароль ЛЮБОЙ организации по её UUID (полный захват всех клиник).
	// СТАЛО: нужен либо владелец/админ с валидным токеном своей организации,
	// либо настроенный ADMIN_SETUP_KEY (сравнение timing-safe). Без переменной
	// окружения ключевой путь недоступен вовсе.
	app.post(
		"/api/auth/clinic/set-password",
		async (request: FastifyRequest, reply: FastifyReply) => {
			// AUTH first on raw record (adminKey credential), then Zod body for authorized caller.
			// Anonymous always gets the same 403 regardless of body shape (no policy oracle).
			const rawBody = authBodyRecord(request.body);

			const identity = getRequestIdentity(request);
			const isOrgAdmin =
				!!identity.organizationId &&
				!!identity.userId &&
				ADMIN_ROLES.some(
					(role) => role === (identity.role ?? "").toLowerCase(),
				);

			const setupKey = configuredAdminSetupKey();
			const hasValidSetupKey =
				!!setupKey &&
				timingSafeSecretEqual(authAdminKeyFromRecord(rawBody), setupKey);

			if (!isOrgAdmin && !hasValidSetupKey) {
				await authFailureDelay();
				return reply.code(403).send({
					error: "Forbidden",
					message: "Недостаточно прав для смены пароля клиники.",
				});
			}

			const parsed = clinicSetPasswordBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(
					parsed.error,
					"Новый пароль должен быть не короче 8 символов.",
					[
						{
							match: "Новый пароль должен быть не короче 8 символов.",
							message: "Новый пароль должен быть не короче 8 символов.",
						},
					],
				);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const body = parsed.data;

			// Org admin may only reset own org password; setup-key path needs organizationId.
			const targetOrganizationId = isOrgAdmin
				? identity.organizationId!
				: body.organizationId;
			if (!targetOrganizationId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указана организация.",
				});
			}
			if (
				isOrgAdmin &&
				body.organizationId &&
				body.organizationId !== identity.organizationId
			) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Нельзя менять пароль чужой организации.",
				});
			}

			const hash = await hashCredential(body.newPassword);

			// ПУТЬ ADMIN_SETUP_KEY НЕ НЕСЁТ ТОКЕНА, значит арендатора у запроса нет и
			// глобальная обёртка server.ts его не выставляет. Замер: без контекста
			// `UPDATE organizations` затрагивает 0 строк и ошибки не даёт, а следующая
			// за ним запись аудита падает с 42501 — то есть маршрут либо молча не
			// менял пароль, либо отвечал 500 без причины.
			//
			// Контекст выставляется по ЯВНО названной организации. Это не обход:
			// политика сверяет `id = current_tenant`, поэтому под этим контекстом можно
			// изменить ровно ту организацию, которая названа, и никакую другую.
			// Проверка «не чужая организация» для админа сделана выше и не ослаблена.
			const passwordUpdated = await withTenantCtx(
				targetOrganizationId,
				async (tx) => {
					const changed = await tx
						.update(organizations)
						.set({ passwordHash: hash })
						.where(eq(organizations.id, targetOrganizationId))
						.returning({ id: organizations.id });
					if (!changed.length) return false;

					await tx.insert(auditEvents).values({
						organizationId: targetOrganizationId,
						actorUserId: identity.userId ?? null,
						entityType: "organization",
						entityId: targetOrganizationId,
						action: "clinic_password_reset",
						reason: isOrgAdmin
							? "Смена пароля клиники администратором"
							: "Смена пароля клиники ключом установки",
					});
					return true;
				},
			);

			// БЫЛО: ответ «Пароль клиники обновлён.» отправлялся независимо от того,
			// изменилась ли хоть одна строка. Ноль изменённых строк — это ненайденная
			// организация, и говорить об успехе тут нельзя.
			if (!passwordUpdated) {
				return reply.code(404).send({
					error: "OrganizationNotFound",
					message: "Организация не найдена.",
				});
			}

			return reply.send({ ok: true, message: "Пароль клиники обновлён." });
		},
	);

	// ─── Admin: Set Staff PIN ─────────────────────────────────────────────────────
	// БЫЛО: публичный дефолтный ключ + произвольный userId без проверки организации.
	// СТАЛО: только владелец/админ своей организации (или настроенный ADMIN_SETUP_KEY),
	// и целевой сотрудник обязан принадлежать той же организации.
	app.post(
		"/api/auth/staff/set-pin",
		async (request: FastifyRequest, reply: FastifyReply) => {
			// AUTH first on raw record, then Zod body. Anonymous always same 403.
			const rawBody = authBodyRecord(request.body);

			const identity = getRequestIdentity(request);
			const isOrgAdmin =
				!!identity.organizationId &&
				!!identity.userId &&
				ADMIN_ROLES.some(
					(role) => role === (identity.role ?? "").toLowerCase(),
				);

			const setupKey = configuredAdminSetupKey();
			const hasValidSetupKey =
				!!setupKey &&
				timingSafeSecretEqual(authAdminKeyFromRecord(rawBody), setupKey);

			if (!isOrgAdmin && !hasValidSetupKey) {
				await authFailureDelay();
				return reply.code(403).send({
					error: "Forbidden",
					message: "Недостаточно прав для смены PIN сотрудника.",
				});
			}

			const parsed = staffSetPinBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				// Old if-order: userId missing first, then PIN form.
				// Union invalid_type on newPin has no custom text — map by path.
				const userPathHit = parsed.error.issues.some(
					(issue) => issue.path[0] === "userId",
				);
				const pinPathHit = parsed.error.issues.some(
					(issue) => issue.path[0] === "newPin",
				);
				const message = userPathHit
					? "Не указан сотрудник."
					: pinPathHit
						? "PIN должен состоять из 4–12 цифр."
						: authSchemaMessage(parsed.error, "Не указан сотрудник.", [
								{
									match: "PIN должен состоять из 4–12 цифр.",
									message: "PIN должен состоять из 4–12 цифр.",
								},
							]);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const body = parsed.data;

			if (isOrgAdmin) {
				const [target] = await db
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.id, body.userId),
							eq(users.organizationId, identity.organizationId!),
						),
					)
					.limit(1);
				if (!target) {
					return reply.code(404).send({
						error: "UserNotFound",
						message: "Сотрудник не найден в вашей организации.",
					});
				}
			}

			const hash = await hashCredential(body.newPin);
			// Defense-in-depth: never UPDATE staff credentials by bare id.
			// Org-admin path already SELECTed with org; setup-key path may lack identity.organizationId.
			// Bind UPDATE to the target user's organizationId so a concurrent org move cannot widen the write.
			//
			// ПУТЬ ADMIN_SETUP_KEY — операция «до арендатора»: токена нет, значит нет и
			// контекста, а без контекста поиск сотрудника отдавал ноль строк и маршрут
			// отвечал «Сотрудник не найден» на существующего сотрудника. Обход накрывает
			// РОВНО одно чтение одной колонки — организации целевого сотрудника. Сама
			// запись идёт уже под контекстом этой организации: в `WITH CHECK` политики
			// users обхода нет, и под одним лишь обходом UPDATE отвергается (42501).
			let targetOrganizationId = identity.organizationId ?? null;
			if (!targetOrganizationId) {
				const owner = await readUnderBypass((tx) =>
					tx
						.select({ organizationId: users.organizationId })
						.from(users)
						.where(eq(users.id, body.userId))
						.limit(1),
				);
				if (!owner.row && !owner.bypassActive) {
					return replyPreTenantPolicyFailure(
						request,
						reply,
						"staff-set-pin:lookup-user-organization",
					);
				}
				targetOrganizationId = owner.row?.organizationId ?? null;
			}
			if (!targetOrganizationId) {
				return reply.code(404).send({
					error: "UserNotFound",
					message: "Сотрудник не найден в организации.",
				});
			}

			const pinOrganizationId = targetOrganizationId;
			const pinUpdated = await withTenantCtx(pinOrganizationId, async (tx) => {
				const changed = await tx
					.update(users)
					.set({ pinCodeHash: hash })
					.where(
						and(
							eq(users.id, body.userId),
							eq(users.organizationId, pinOrganizationId),
						),
					)
					.returning({ id: users.id });
				if (!changed.length) return false;

				if (identity.organizationId) {
					await tx.insert(auditEvents).values({
						organizationId: identity.organizationId,
						actorUserId: identity.userId ?? null,
						entityType: "user",
						entityId: body.userId,
						action: "staff_pin_reset",
						reason: "Смена PIN-кода сотрудника",
					});
				}
				return true;
			});
			if (!pinUpdated) {
				return reply.code(404).send({
					error: "UserNotFound",
					message: "Сотрудник не найден в организации.",
				});
			}

			return reply.send({ ok: true, message: "PIN сотрудника обновлён." });
		},
	);

	// ─── Initial Clinic Setup (first-run seed credentials) ───────────────────────
	app.post(
		"/api/auth/setup/init",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = setupInitBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				// Old if-order: required -> password length -> PIN form.
				// ownerPin object fails union with invalid_type — map by path after priority.
				let message = authSchemaMessage(
					parsed.error,
					"Укажите название клиники, логин и пароль.",
					[
						{
							match: "Пароль должен быть не короче 8 символов.",
							message: "Пароль должен быть не короче 8 символов.",
						},
						{
							match: "PIN должен состоять из 4–12 цифр.",
							message: "PIN должен состоять из 4–12 цифр.",
						},
					],
				);
				const pinPathOnly =
					message === "Укажите название клиники, логин и пароль." &&
					parsed.error.issues.some((issue) => issue.path[0] === "ownerPin") &&
					!parsed.error.issues.some(
						(issue) =>
							issue.path[0] === "clinicName" ||
							issue.path[0] === "email" ||
							issue.path[0] === "password",
					);
				if (pinPathOnly) {
					message = "PIN должен состоять из 4–12 цифр.";
				}
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { clinicName, email, password, ownerName, ownerPin } = parsed.data;

			const loginId = email.toLowerCase().trim();

			// Check if org with this loginId already exists
			//
			// ОПЕРАЦИЯ «ДО АРЕНДАТОРА»: организации ещё нет, называть арендатора нечем.
			// Без обхода запрос отдавал ноль строк ВСЕГДА, поэтому дубль логина не
			// ловился вовсе и упирался бы в уникальный индекс позже. Обход накрывает
			// ровно этот SELECT одной колонки.
			const duplicate = await readUnderBypass((tx) =>
				tx
					.select({ id: organizations.id })
					.from(organizations)
					.where(eq(organizations.loginId, loginId))
					.limit(1),
			);
			if (!duplicate.row && !duplicate.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"setup-init:check-duplicate-login",
				);
			}
			if (duplicate.row) {
				return reply.code(409).send({
					error: "Conflict",
					message: "Организация с таким логином уже существует.",
				});
			}

			const passwordHash = await hashCredential(password);

			// Хеши считаются ДО транзакции: hashCredential — это pbkdf2, и держать на
			// нём соединение из пула нельзя (пул на 10 соединений, см. db/client.ts).
			//
			// БЫЛО: без ownerPin автоматически ставился PIN "0000" — предсказуемый вход
			// владельца в каждой новой клинике. СТАЛО: генерируется случайный PIN и
			// возвращается один раз в ответе, чтобы владелец сразу его сменил.
			let generatedOwnerPin: string | null = null;
			let ownerPinHash: string | null = null;
			if (ownerName) {
				if (!ownerPin) {
					generatedOwnerPin = String(crypto.randomInt(0, 1_000_000)).padStart(
						6,
						"0",
					);
				}
				ownerPinHash = await hashCredential(ownerPin ?? generatedOwnerPin!);
			}

			// ИДЕНТИФИКАТОР КЛИНИКИ ГЕНЕРИРУЕТСЯ ДО ВСТАВКИ, и им же выставляется
			// контекст арендатора. Курицы и яйца здесь нет: `app.current_tenant` —
			// обычный строковый параметр, он ничем не связан с содержимым таблицы, а
			// политика organizations сверяет `id = current_tenant`. Под таким контекстом
			// создаётся ровно названная строка (замер: с чужим id — 42501), тогда как
			// под обходом запись в organizations не ограничена ничем. Владелец создаётся
			// в ТОЙ ЖЕ транзакции: в WITH CHECK политики users обхода нет, а половинчатой
			// клиники без владельца существовать не должно.
			const organizationId = crypto.randomUUID();
			const created = await withTenantCtx(organizationId, async (tx) => {
				const [organization] = await tx
					.insert(organizations)
					.values({
						id: organizationId,
						name: clinicName,
						loginId,
						passwordHash,
						email,
					})
					.returning();
				if (!organization) return { organization: null, owner: null };

				if (!ownerName || !ownerPinHash) return { organization, owner: null };

				const [ownerUser] = await tx
					.insert(users)
					.values({
						organizationId,
						fullName: ownerName,
						role: "owner",
						pinCodeHash: ownerPinHash,
						isActive: true,
					})
					.returning({ id: users.id });
				return { organization, owner: ownerUser ?? null };
			});

			const org = created.organization;
			if (!org) {
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать организацию.",
				});
			}
			const owner = created.owner;

			const token = signToken(
				{ organizationId: org.id, clinicName: org.name },
				TOKEN_SECRET(),
				60 * 60 * 24,
			);

			return reply.code(201).send({
				ok: true,
				clinicToken: token,
				organizationId: org.id,
				ownerUserId: owner?.id ?? null,
				// Показывается ровно один раз, в базе хранится только хеш.
				generatedOwnerPin,
			});
		},
	);
	// ─── SaaS Registration (New Clinic + Owner) ──────────────────────────────────
	app.post(
		"/api/auth/register",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = registerBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(parsed.error, "Заполните все поля.", [
					{
						match: "Пароль должен быть не короче 8 символов.",
						message: "Пароль должен быть не короче 8 символов.",
					},
					{
						match: "PIN должен состоять из 4–12 цифр.",
						message: "PIN должен состоять из 4–12 цифр.",
					},
				]);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { clinicName, ownerName, email, password, ownerPin } = parsed.data;
			const loginId = email.toLowerCase().trim();

			// Обе проверки дублей — операции «до арендатора»: организации ещё нет.
			// Проверка организации без обхода отдавала ноль строк всегда; соседняя
			// проверка пользователя обход уже использовала.
			const duplicateOrg = await readUnderBypass((tx) =>
				tx
					.select({ id: organizations.id })
					.from(organizations)
					.where(eq(organizations.loginId, loginId))
					.limit(1),
			);
			if (!duplicateOrg.row && !duplicateOrg.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"register:check-duplicate-login",
				);
			}
			if (duplicateOrg.row)
				return reply.code(409).send({
					error: "Conflict",
					message: "Организация с таким логином уже существует.",
				});

			const duplicateUser = await readUnderBypass((tx) =>
				tx
					.select({ id: users.id })
					.from(users)
					.where(eq(users.email, loginId))
					.limit(1),
			);
			if (!duplicateUser.row && !duplicateUser.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"register:check-duplicate-user",
				);
			}
			if (duplicateUser.row)
				return reply.code(409).send({
					error: "Conflict",
					message: "Пользователь с таким email уже существует.",
				});

			// БЫЛО: PIN владельца всегда '0000' — предсказуемый вход в любую свежую клинику.
			// Хеши считаются до транзакции: pbkdf2 не должен держать соединение пула.
			const passwordHash = await hashCredential(password);
			const generatedOwnerPin = ownerPin
				? null
				: String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
			const pinCodeHash = await hashCredential(ownerPin ?? generatedOwnerPin!);

			// Идентификатор клиники известен до вставки, поэтому обход здесь не нужен:
			// контекст арендатора разрешает создать ровно эту строку и никакую другую.
			// Клиника и владелец создаются одной транзакцией — раньше сбой между двумя
			// вставками оставлял организацию без владельца, войти в которую нечем.
			const organizationId = crypto.randomUUID();
			const created = await withTenantCtx(organizationId, async (tx) => {
				const [organization] = await tx
					.insert(organizations)
					.values({
						id: organizationId,
						name: clinicName,
						loginId,
						passwordHash,
						email: loginId,
					})
					.returning();
				if (!organization) return { organization: null, owner: null };

				const [ownerUser] = await tx
					.insert(users)
					.values({
						organizationId,
						fullName: ownerName,
						role: "owner",
						email: loginId,
						passwordHash,
						pinCodeHash,
						isActive: true,
					})
					.returning();
				return { organization, owner: ownerUser ?? null };
			});

			const org = created.organization;
			if (!org)
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать организацию.",
				});
			const user = created.owner;
			if (!user)
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать профиль владельца.",
				});

			resetRateLimit(request);

			const clinicToken = signToken(
				{ organizationId: org.id, clinicName: org.name },
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			const token = signToken(
				{
					userId: user.id,
					fullName: user.fullName,
					role: user.role,
					organizationId: org.id,
				},
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			return reply.code(201).send({
				ok: true,
				clinicToken,
				staffToken: token,
				organizationId: org.id,
				userId: user.id,
				generatedOwnerPin,
			});
		},
	);

	// ─── SaaS User Login (Direct user login) ─────────────────────────────────────
	app.post(
		"/api/auth/login",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = loginBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Введите email и пароль.",
				});
			}
			const { email, password } = parsed.data;
			const loginEmail = email.toLowerCase().trim();
			const isDemoUserLogin =
				demoLoginAllowed() &&
				(loginEmail === "doctor@clinic.com" ||
					loginEmail === "admin@clinic.ru");
			let user: any = null;
			try {
				// Вход по email — операция «до арендатора»: организация станет известна
				// только из найденной строки. Обход накрывает ровно этот SELECT.
				const lookup = await readUnderBypass((tx) =>
					tx
						.select()
						.from(users)
						.where(and(eq(users.email, loginEmail), eq(users.isActive, true)))
						.limit(1),
				);
				if (!lookup.row && !lookup.bypassActive && !isDemoUserLogin) {
					return replyPreTenantPolicyFailure(
						request,
						reply,
						"user-login:lookup-user",
					);
				}
				user = lookup.row ?? null;
			} catch (e) {
				console.warn("[AUTH_USER_DB_WARN]", e);
			}

			// БЫЛО: жёстко зашитые doctor@clinic.com / admin@clinic.ru пускали в систему
			// без пароля, а строка `user.passwordHash ? verify(...) : true` означала,
			// что ЛЮБОЙ пользователь без хеша пароля входит с любым паролем.

			if (!user) {
				if (isDemoUserLogin) {
					user = {
						id: "00000000-0000-0000-0000-000000000002",
						organizationId: "00000000-0000-0000-0000-000000000001",
						fullName: "Доктор И.И. Иванов",
						role: "doctor",
						email: loginEmail,
						passwordHash: null,
					};
				} else {
					await authFailureDelay();
					return reply.code(401).send({
						error: "AuthError",
						message: "Неверный email или пароль.",
					});
				}
			}

			// FAIL CLOSED: нет хеша пароля — вход запрещён (кроме явного демо-режима).
			const isMatch = user.passwordHash
				? await verifyCredential(password, user.passwordHash)
				: isDemoUserLogin;
			if (!isMatch) {
				await authFailureDelay();
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Неверный email или пароль." });
			}

			resetRateLimit(request);

			// Арендатор здесь УЖЕ известен — он записан в найденной учётке, поэтому
			// название клиники читается под контекстом, а не под обходом. Без контекста
			// (как было) запрос молча отдавал ноль строк, и в токен кабинета уезжало
			// слово «Клиника» вместо настоящего названия.
			const [userOrg] = await withTenantCtx(
				user.organizationId as string,
				async (tx) =>
					tx
						.select({ name: organizations.name })
						.from(organizations)
						.where(eq(organizations.id, user.organizationId))
						.limit(1),
			).catch(() => [] as Array<{ name: string }>);

			const clinicToken = signToken(
				{
					organizationId: user.organizationId,
					clinicName: userOrg?.name ?? "Клиника",
				},
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			const staffToken = signToken(
				{
					userId: user.id,
					fullName: user.fullName,
					role: user.role,
					organizationId: user.organizationId,
				},
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			return reply.send({
				ok: true,
				clinicToken,
				staffToken,
				user: {
					id: user.id,
					fullName: user.fullName,
					role: user.role,
					email: user.email,
				},
			});
		},
	);

	// ─── SaaS Create Invite ──────────────────────────────────────────────────────
	app.post(
		"/api/auth/invites/create",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const staffPayload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			/*
			 * БЫЛО: `staffPayload.role !== 'owner' && staffPayload.role !== 'admin'` —
			 * своя пара написаний прямо в условии. Роли `admin` в staffRoleSchema нет
			 * (там owner, doctor, administrator, assistant, manager), поэтому настоящий
			 * администратор клиники получал 403 и приглашать сотрудников мог только
			 * владелец.
			 *
			 * Свой список ролей здесь не заводится: в проекте уже есть единственный
			 * ADMIN_ROLES (security/identity.ts) — «роли, которым разрешены
			 * административные действия», и тем же списком пользуются два соседних
			 * маршрута этого файла (строки ~294 и ~352). Легаси-написание `admin` в нём
			 * оставлено сознательно, и здесь оно тоже сохраняется: два списка одной
			 * правды — ровно та болезнь, которую этот продукт уже проходил.
			 * Сравнение в нижнем регистре, как у соседей.
			 */
			const invitingRole = String(staffPayload?.role ?? "").toLowerCase();
			if (
				!staffPayload?.organizationId ||
				!ADMIN_ROLES.some((allowed) => allowed === invitingRole)
			) {
				return reply.code(403).send({
					error: "Forbidden",
					message:
						"Приглашать сотрудников может владелец клиники или администратор.",
				});
			}
			// AUTH first, then body — same order as set-password/set-pin.
			const parsedBody = createInviteBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply
					.code(400)
					.send({ error: "ValidationError", message: "Укажите email и роль." });
			}
			const { email, role } = parsedBody.data;

			/*
			 * РОЛЬ ПРОВЕРЯЕТСЯ ПО СХЕМЕ, а не принимается как есть. Прежде значение из
			 * тела запроса ложилось в user_invitations.role напрямую, а
			 * /api/auth/invites/accept переносит его в users.role тоже без проверки.
			 * Экран настроек до недавнего исправления отправлял `admin` — роль, которой
			 * нет в схеме, — и она доживала до users.role. Дальше getFilteredAppViews
			 * на незнакомой роли доходит до ветки «вернуть все разделы», и приглашённый
			 * администратор получал права владельца: 14 разделов вместо 9.
			 *
			 * Экранную часть уже починили (59a886a2c, список ролей выведен из схемы), но
			 * сервер обязан отказывать сам: клиент — не место для проверки прав.
			 */
			const parsedRole = staffRoleSchema.safeParse(role);
			if (!parsedRole.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Такой должности в программе нет. Выберите её из списка на экране приглашения.",
				});
			}

			const tokenUuid = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

			await db.insert(userInvitations).values({
				organizationId: staffPayload.organizationId as string,
				email: email.toLowerCase().trim(),
				role: parsedRole.data,
				inviteToken: tokenUuid,
				expiresAt,
				status: "pending",
			});

			return reply.send({
				ok: true,
				inviteLink: `/#/auth/accept-invite?token=${tokenUuid}`,
			});
		},
	);

	// ─── SaaS Accept Invite ──────────────────────────────────────────────────────
	app.post(
		"/api/auth/invites/accept",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = acceptInviteBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(parsed.error, "Заполните все поля.", [
					{
						match: "Пароль должен быть не короче 8 символов.",
						message: "Пароль должен быть не короче 8 символов.",
					},
					{
						match: "PIN должен состоять из 4–12 цифр.",
						message: "PIN должен состоять из 4–12 цифр.",
					},
				]);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { token, fullName, password, pinCode } = parsed.data;

			// ОПЕРАЦИЯ «ДО АРЕНДАТОРА». Приглашение опознаётся по одноразовой ссылке,
			// и никакого токена клиники у приглашённого ещё нет: организация станет
			// известна только из найденной строки. Замер: без контекста этот SELECT
			// отдаёт ноль строк, под обходом — строку. Обход накрывает ровно его.
			const inviteLookup = await readUnderBypass((tx) =>
				tx
					.select()
					.from(userInvitations)
					.where(
						and(
							eq(userInvitations.inviteToken, token),
							eq(userInvitations.status, "pending"),
						),
					)
					.limit(1),
			);
			if (!inviteLookup.row && !inviteLookup.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"invite-accept:lookup-invitation",
				);
			}
			const invite = inviteLookup.row;
			if (!invite || new Date() > invite.expiresAt)
				return reply.code(400).send({
					error: "InvalidToken",
					message: "Приглашение недействительно или истекло.",
				});

			// Хеши считаются до транзакции: pbkdf2 не должен держать соединение пула.
			const passwordHash = await hashCredential(password);
			const pinCodeHash = await hashCredential(pinCode);

			// Дальше арендатор известен (invite.organizationId), и всё идёт под ним, а
			// НЕ под обходом: в WITH CHECK политик user_invitations и users обхода нет,
			// UPDATE под одним лишь обходом отвергается кодом 42501 (проверено).
			// Без контекста было хуже: UPDATE затрагивал ноль строк и приглашённый
			// получал «Приглашение уже использовано» на живое приглашение.
			const accepted = await withTenantCtx(
				invite.organizationId,
				async (tx) => {
					// Приглашение одноразовое: помечаем принятым ДО создания пользователя, чтобы
					// параллельные запросы с одной ссылкой не создали несколько учётных записей.
					const claimed = await tx
						.update(userInvitations)
						.set({ status: "accepted" })
						.where(
							and(
								eq(userInvitations.id, invite.id),
								eq(userInvitations.status, "pending"),
							),
						)
						.returning({ id: userInvitations.id });
					if (!claimed.length)
						return { claimed: false, user: null, clinicName: null };

					const [createdUser] = await tx
						.insert(users)
						.values({
							organizationId: invite.organizationId,
							fullName,
							role: invite.role,
							email: invite.email,
							passwordHash,
							pinCodeHash,
							isActive: true,
						})
						.returning();
					if (!createdUser) {
						// Откатываем пометку, чтобы приглашение не сгорело из-за сбоя вставки.
						await tx
							.update(userInvitations)
							.set({ status: "pending" })
							.where(eq(userInvitations.id, invite.id));
						return { claimed: true, user: null, clinicName: null };
					}

					const [org] = await tx
						.select({ name: organizations.name })
						.from(organizations)
						.where(eq(organizations.id, createdUser.organizationId))
						.limit(1);
					return {
						claimed: true,
						user: createdUser,
						clinicName: org?.name ?? null,
					};
				},
			);

			if (!accepted.claimed) {
				return reply.code(400).send({
					error: "InvalidToken",
					message: "Приглашение уже использовано.",
				});
			}
			const user = accepted.user;
			if (!user) {
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать пользователя.",
				});
			}

			const clinicToken = signToken(
				{
					organizationId: user.organizationId,
					clinicName: accepted.clinicName ?? "Clinic",
				},
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			const staffToken = signToken(
				{
					userId: user.id,
					fullName: user.fullName,
					role: user.role,
					organizationId: user.organizationId,
				},
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			return reply.send({
				ok: true,
				clinicToken,
				staffToken,
				user: {
					id: user.id,
					fullName: user.fullName,
					role: user.role,
					email: user.email,
				},
			});
		},
	);

	// ─── SaaS User Profile: Get Current User ──────────────────────────────────────
	app.get(
		"/api/auth/user/me",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const payload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			if (!payload?.userId)
				return reply
					.code(401)
					.send({ error: "AuthRequired", message: "Требуется авторизация." });

			const [user] = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
					email: users.email,
					organizationId: users.organizationId,
					isActive: users.isActive,
					yandexCalendarId: users.yandexCalendarId,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(
					and(eq(users.id, payload.userId as string), eq(users.isActive, true)),
				)
				.limit(1);

			if (!user)
				return reply
					.code(404)
					.send({ error: "NotFound", message: "Пользователь не найден." });

			return reply.send({ ok: true, user });
		},
	);

	// ─── SaaS User Profile: Update Password ───────────────────────────────────────
	app.post(
		"/api/auth/user/update-password",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const payload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			// AUTH first, then body — same order as set-password.
			if (!payload?.userId)
				return reply
					.code(401)
					.send({ error: "AuthRequired", message: "Требуется авторизация." });
			const parsed = updatePasswordBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(
					parsed.error,
					"Введите старый и новый пароль.",
					[
						{
							match: "Новый пароль должен быть не короче 8 символов.",
							message: "Новый пароль должен быть не короче 8 символов.",
						},
					],
				);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { oldPassword, newPassword } = parsed.data;

			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.id, payload.userId as string))
				.limit(1);
			if (!user || !user.passwordHash)
				return reply.code(401).send({
					error: "AuthError",
					message: "Пользователь не найден или пароль не установлен.",
				});

			if (!(await verifyCredential(oldPassword, user.passwordHash))) {
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Старый пароль неверен." });
			}

			const newPasswordHash = await hashCredential(newPassword);
			await db
				.update(users)
				.set({ passwordHash: newPasswordHash })
				.where(eq(users.id, user.id));

			return reply.send({ ok: true, message: "Пароль успешно изменен." });
		},
	);

	// ─── SaaS User Profile: Update PIN ───────────────────────────────────────────
	app.post(
		"/api/auth/user/update-pin",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const payload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			// AUTH first, then body — same order as set-pin.
			if (!payload?.userId)
				return reply
					.code(401)
					.send({ error: "AuthRequired", message: "Требуется авторизация." });
			const parsed = updatePinBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(
					parsed.error,
					"Введите старый и новый PIN-код.",
					[
						{
							match: "PIN должен состоять из 4–12 цифр.",
							message: "PIN должен состоять из 4–12 цифр.",
						},
					],
				);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { oldPin, newPin } = parsed.data;

			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.id, payload.userId as string))
				.limit(1);
			if (!user || !user.pinCodeHash)
				return reply.code(401).send({
					error: "AuthError",
					message: "Пользователь не найден или PIN не установлен.",
				});

			if (!(await verifyCredential(oldPin, user.pinCodeHash))) {
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Старый PIN-код неверен." });
			}

			const newPinHash = await hashCredential(newPin);
			await db
				.update(users)
				.set({ pinCodeHash: newPinHash })
				.where(eq(users.id, user.id));

			return reply.send({ ok: true, message: "PIN-код успешно изменен." });
		},
	);
}
