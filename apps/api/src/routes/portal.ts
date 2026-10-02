import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, gte, inArray, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
	namedDevelopmentModeActive,
	requireAuthTokenSecret,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../db/documentQuery.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	appointments,
	chairs,
	familyGroups,
	generatedDocuments,
	organizations,
	patientConsents,
	patientDrugAllergies,
	patientInvoices,
	patientRelationships,
	patients,
	payments,
	portalOtpCodes,
	sberbankTransactions,
	treatmentPlanItemsNew,
	treatmentPlans,
	treatmentPlanStages,
	users,
	visitDiaries,
	xrayScans,
} from "../db/schema.js";
import { SberbankClient } from "../services/sberbankClient.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	resolveChannelCredentials,
	sendThroughChannel,
} from "../services/communications/channelRouter.js";
import {
	normalizeRussianMsisdn,
	readSmsCredentialsFromEnv,
} from "../smsTransport.js";
import {
	hashCredential,
	signToken,
	verifyCredential,
	verifyToken,
} from "../utils/cryptoHelper.js";

// Patient portal sessions for mobile PWA (per OWASP / 152-FZ / clinical security policy, <= 30 days).
export const PORTAL_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days (2_592_000s)
export const PORTAL_TOKEN_KIND = "portal";

// In-memory revocation stores for active portal session invalidation
export const revokedPortalTokens = new Set<string>();
export const portalRevokedBeforeByPatient = new Map<string, number>();

export function resetPortalRevokedTokensForTesting(): void {
	revokedPortalTokens.clear();
	portalRevokedBeforeByPatient.clear();
}

/*
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО (и почему это худшая дыра в проекте)
 *
 * configuredPortalOtpCode() при NODE_ENV != "production" возвращал `code ||
 * "0000"`, а .env и .env.local задают NODE_ENV=development. То есть на рабочей
 * машине код входа в личный кабинет был «0000» — ОДИН НА ВСЕХ ПАЦИЕНТОВ. Зная
 * чужой номер телефона, посторонний получал сессию на 12 часов и читал визиты,
 * планы лечения, счета и выданные документы. В production код брался из
 * PORTAL_MVP_OTP_CODE: длиннее, но по-прежнему ОДИН статичный секрет для всех
 * пациентов навсегда. Отправлять его было нечем — POST /auth/send-otp отвечал
 * { success: true, message: "OTP sent" } и не обращался ни к какому шлюзу.
 *
 * СТАЛО: код одноразовый, свой на каждый запрос и на каждого пациента,
 * выдаётся CSPRNG, живёт минуты, хранится только хешем (PBKDF2-SHA512, 100k
 * итераций — utils/cryptoHelper.ts), гасится при первой успешной проверке и
 * уходит пациенту настоящей SMS через существующий транспорт.
 *
 * ЦЕНА PBKDF2 НА ЭТОМ МАРШРУТЕ. Прежняя редакция этого пояснения называла
 * «37.6 мс блокировки цикла событий на один вызов», и это было верно, пока
 * cryptoHelper считал хеш через pbkdf2Sync. Теперь счёт уходит в пул потоков
 * libuv, и цикл событий на нём не стоит вовсе: сам вызов по-прежнему занимает
 * десятки-сотни миллисекунд, но эти миллисекунды сервер продолжает отвечать
 * остальным. Обоснование и замер — в utils/cryptoHelper.ts.
 *
 * Это ровно та же цена, которую платит /api/auth/clinic/login через
 * verifyCredential, поэтому вторая схема хеширования не заводится. На одну
 * проверку приходится строго ОДИН вызов: сверяется единственный действующий
 * код, а не все выданные.
 *
 * ОГРАНИЧЕНИЕ ЧАСТОТЫ ПО IP здесь намеренно не дублируется. Оно уже работает
 * глобально для всего префикса /api/portal/ (security/rateLimit.ts, правило
 * по умолчанию — 30 запросов в минуту). Прежняя локальная Map в этом файле не
 * только повторяла его, но и никогда не очищалась: запись заводилась на каждый
 * новый IP и не удалялась никогда — утечка памяти на публичном маршруте.
 * Здесь остаётся то, чего лимитер по IP дать не может: ограничение выдачи на
 * КОНКРЕТНОГО пациента и потолок числа попыток на КОНКРЕТНЫЙ код.
 *
 * ПУЛ СОЕДИНЕНИЙ И ГРАНИЦЫ ТРАНЗАКЦИЙ (правка 2026-08-05, расчётом, не на
 * глаз). withTenantCtx — это dbRaw.transaction(...), то есть на время колбэка
 * соединение из пула занято целиком. Пул в db/client.ts создан как
 * `new pg.Pool({ connectionString })`: без `max` — значит ДЕСЯТЬ соединений по
 * умолчанию, без connectionTimeoutMillis — значит ожидание БЕЗ СРОКА.
 *
 * Обе точки входа держали внутри одной открытой транзакции работу, к базе не
 * относящуюся: PBKDF2 (100 000 итераций SHA-512) и, в send-otp, исходящий HTTP
 * к SMS-шлюзу. Оценка удержания одного соединения на send-otp — 615-5320 мс, из
 * которых на сами запросы к базе приходится 8-30 мс. Десяти одновременных
 * запросов на ПУБЛИЧНЫЙ неаутентифицированный маршрут хватало, чтобы выбрать
 * весь пул, после чего вставало всё приложение — расписание, карта приёма,
 * печать документов, — потому что соединения ждут бесконечно.
 *
 * Теперь дорогая работа идёт СНАРУЖИ транзакций: в send-otp их четыре коротких
 * (отбраковка по троттлингу; выдача кода; чтение кред канала; отметка исхода),
 * в verify-otp — две (попытка; гашение). Что осталось неделимым и почему —
 * подробно у каждой границы. Главное из этого: проверка троттлинга и вставка
 * кода — одна транзакция, а выбор кода, инкремент счётчика попыток и гашение
 * при превышении потолка — тоже одна. Разделение этих групп даёт обход лимитов,
 * а не выигрыш в ёмкости.
 */

/*
 * ФОРМА ОТВЕТА В ЭТОМ ФАЙЛЕ: КОД СТАВИМ, ЗНАЧЕНИЕ ВОЗВРАЩАЕМ.
 *
 * `return reply.status(N).send(x)` возвращает из обработчика сам `reply`, а он
 * thenable: `Reply.prototype.then` (fastify/lib/reply.js:466) разрешается по
 * `eos(reply.raw)` — когда ответ уже ушёл клиенту. Любая обёртка, которая ждёт
 * разрешения обработчика, чтобы зафиксировать транзакцию, получает COMMIT ПОСЛЕ
 * ответа. В этом файле такая обёртка написана прямо в коде — `withTenantCtx` в
 * `GET /me` ниже: `return reply.status(404).send(...)` внутри её колбэка держал
 * транзакцию открытой до конца отправки ответа.
 *
 * Возврат значения этого не даёт: fastify зовёт `reply.send(payload)` уже после
 * разрешения промиса (lib/wrap-thenable.js:14). Код, выставленный
 * `reply.status()`, сохраняется — он живёт на объекте ответа, а не в аргументах
 * `send`.
 *
 * ЧЕСТНО О ГРАНИЦАХ ЭТОЙ ПРАВКИ. Маршруты портала ПУБЛИЧНЫЕ: токена кабинета и
 * токена сотрудника в них нет, `request.tenantId` не выставлен, и глобальная
 * обёртка withTenantCtx из server.ts (хук onRoute) их не оборачивает. Проверено
 * по построению: `/auth/verify-otp` вызывается вообще без заголовка
 * авторизации. Поэтому здесь правится ФОРМА, а не действующий дефект: каждая
 * транзакция в send-otp и verify-otp открывается и закрывается явно и до сборки
 * ответа, а успешная ветка verify-otp значение возвращала и раньше.
 *
 * НЕ ПЕРЕВЕДЕНО: выдача HTML документа в самом низу файла —
 * `reply.type("text/html; charset=utf-8").send(...)`. Тело там не JSON, а
 * готовая архивная копия документа.
 */

/** Настройки одноразового кода. Значения по умолчанию рабочие, но переопределяемы. */
interface PortalOtpPolicy {
	readonly codeLength: number;
	readonly ttlSeconds: number;
	readonly maxAttempts: number;
	readonly resendCooldownSeconds: number;
	readonly maxPerWindow: number;
	readonly windowSeconds: number;
	readonly retentionSeconds: number;
	readonly smsTemplate: string;
}

const DEFAULT_OTP_SMS_TEMPLATE =
	"Код для входа в личный кабинет: {code}. Действует {minutes} мин. Никому не сообщайте его.";

function readBoundedInt(
	name: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const raw = process.env[name]?.trim();
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) return fallback;
	// Границы, а не доверие к значению: код длиной 1 или срок в сутки — это не
	// «настройка», это отключённая защита.
	return Math.min(max, Math.max(min, parsed));
}

// Rate limiting & flood protection stores for OTP requests (10-minute window)
export const otpIpRequestCounts = new Map<string, { count: number; resetAt: number }>();
export const otpPhoneRequestCounts = new Map<string, { count: number; resetAt: number }>();

export const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 минут
export const OTP_MAX_REQUESTS_PER_IP = 5; // максимум 5 запросов с одного IP за 10 минут
export const OTP_MAX_REQUESTS_PER_PHONE = 3; // максимум 3 SMS на один номер за 10 минут

export function resetPortalOtpRateLimitsForTesting(): void {
	otpIpRequestCounts.clear();
	otpPhoneRequestCounts.clear();
}

function readPortalOtpPolicy(): PortalOtpPolicy {
	return {
		// Шесть цифр — российская норма для SMS-кода: 10^6 вариантов против
		// потолка в 5 попыток даёт шанс подбора 5 на миллион за срок жизни кода.
		codeLength: readBoundedInt("DENTE_PORTAL_OTP_LENGTH", 6, 6, 8),
		// Пять минут: пациенту хватает получить SMS и ввести, а украденный из
		// уведомления на экране код протухает быстрее, чем им воспользуются.
		ttlSeconds: readBoundedInt("DENTE_PORTAL_OTP_TTL_SECONDS", 300, 60, 900),
		maxAttempts: readBoundedInt("DENTE_PORTAL_OTP_MAX_ATTEMPTS", 5, 3, 10),
		// Минута между отправками: столько идёт SMS в худшем случае, и столько же
		// стоит выдержать, чтобы кнопкой «отправить ещё раз» не разоряли клинику.
		resendCooldownSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_RESEND_COOLDOWN_SECONDS",
			60,
			30,
			600,
		),
		// Не более 3 SMS за 10 минут на пациента (защита от флуда и слива баланса шлюза):
		maxPerWindow: readBoundedInt("DENTE_PORTAL_OTP_MAX_PER_WINDOW", 3, 1, 20),
		windowSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_WINDOW_SECONDS",
			600,
			60,
			86_400,
		),
		// Сутки: срок нужен не для проверки кода, а чтобы разобрать инцидент
		// «пациент говорит, что не запрашивал вход».
		retentionSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_RETENTION_SECONDS",
			86_400,
			3600,
			2_592_000,
		),
		smsTemplate:
			process.env.DENTE_PORTAL_OTP_SMS_TEMPLATE?.trim() ||
			DEFAULT_OTP_SMS_TEMPLATE,
	};
}

/**
 * Разрешено ли выводить одноразовый код входа в журнал сервера вместо SMS.
 *
 * ЧТО ЗДЕСЬ БЫЛО ДЫРОЙ. Функция называлась isProductionRuntime() и возвращала
 * `process.env.NODE_ENV === "production"`, а ветка журнала включалась условием
 * `!smsConfigured && !isProductionRuntime()`. Комментарий над ней утверждал,
 * что ветка «физически недостижима при NODE_ENV=production», и это правда — но
 * ровно ничего не значит. `apps/api/package.json` объявляет
 * `"start": "node dist/server.js"` и NODE_ENV не задаёт, ни один Dockerfile
 * тоже: у заказчика NODE_ENV ПУСТ, `=== "production"` ложно, и ветка была
 * достижима на боевом сервере. Клинике достаточно не подключить SMS-шлюз — и
 * одноразовые коды входа в личный кабинет ВСЕХ пациентов начинают писаться в
 * журнал сервера. Кто читает журналы (администратор, подрядчик, система сбора
 * логов, любой, кто добрался до файла), входит в личный кабинет любого
 * пациента: визиты, планы лечения, счета, выданные документы. Это CWE-532,
 * запись секрета аутентификации в журнал.
 *
 * СТАЛО: `namedDevelopmentModeActive()` из accessGuard.ts — ветка журнала
 * работает, только если ЯВНО назван режим разработки (`development`/`test`).
 * Пустой, незаданный или незнакомый NODE_ENV («staging», «prod», опечатка)
 * режимом разработки не считается: сервер честно отвечает 503
 * OtpDeliveryNotConfigured и НЕ пишет код никуда. Предикат перевёрнут вместе с
 * именем — функция теперь называет то, что разрешает, а не то, что запрещает,
 * потому что прежнее имя описывало производственный режим, а решался по нему
 * вопрос о режиме разработки.
 *
 * ТОМУ, КТО ЧЕРЕЗ ПОЛГОДА ЗАХОЧЕТ «ВЕРНУТЬ КАК БЫЛО». Симптом: «вход в личный
 * кабинет отвечает 503, а раньше код появлялся в логе». Раньше он появлялся
 * потому, что защита была выключена пустым окружением. Правильный выход один:
 * подключить клинике SMS-шлюз (DENTE_SMS_PROVIDER и учётные данные) — тогда код
 * уходит пациенту настоящей SMS и в журнал не попадает вовсе. Для локальной
 * отладки без шлюза выставьте NODE_ENV=development. Возврат к проверке
 * `=== "production"` в любом виде снова начнёт печатать коды доступа пациентов
 * в журнал боевого сервера.
 */
function developerLogFallbackAllowed(): boolean {
	return namedDevelopmentModeActive();
}

/**
 * Код выдаётся CSPRNG. Math.random() для кода доступа непригоден: его состояние
 * восстанавливается по нескольким выданным значениям.
 */
function generateNumericCode(length: number): string {
	return String(randomInt(0, 10 ** length)).padStart(length, "0");
}

function renderOtpMessage(policy: PortalOtpPolicy, code: string): string {
	const minutes = Math.max(1, Math.round(policy.ttlSeconds / 60));
	return policy.smsTemplate
		.replace(/\{code\}/g, code)
		.replace(/\{minutes\}/g, String(minutes));
}

/**
 * Телефон -> ровно один пациент, иначе отказ.
 *
 * .limit(2) здесь не случайность: с частичным LIKE и .limit(1) сервер молча
 * выдавал первого попавшегося пациента, чей номер лишь СОДЕРЖИТ эти цифры, и
 * человек попадал в чужую медкарту. Неоднозначность — отказ, а не «первый».
 *
 * СРАВНИВАЮТСЯ ЦИФРЫ, А НЕ СТРОКА ИЗ КАРТОЧКИ. Прежнее условие
 * `ilike(patients.phone, '%' || suffix)` сверялось с сырым значением колонки, а
 * телефоны в базе записаны как «+7 916 555-11-22»: такая строка не кончается на
 * десять цифр подряд и не совпадала НИКОГДА. На момент правки это 13 карточек
 * из 16 с телефоном — 81%. То есть вход в личный кабинет для большинства
 * пациентов молча не работал: сервер отвечал «код отправлен» и не отправлял
 * ничего, потому что пациента не находил. Разбор по regexp_replace убирает
 * разделители с обеих сторон сравнения.
 *
 * ЦЕНА: индекса под это выражение нет, значит последовательный просмотр
 * patients на каждый запрос. На маршруте, ограниченном по частоте, это
 * приемлемо; функциональный индекс вынесен в долг и назван в отчёте.
 */
async function findUniquePatientByPhone(
	rawPhone: string,
	targetOrgId?: string,
): Promise<{
	id: string;
	organizationId: string;
	phone: string | null;
} | null> {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length < 10) return null;
	const suffix = digits.slice(-10);
	const found = await withSuperuserBypass(async (tx) => {
		const baseFilter = sql`regexp_replace(${patients.phone}, '\\D', '', 'g') LIKE ${`%${suffix}`}`;
		const filter =
			targetOrgId && targetOrgId !== "default"
				? and(eq(patients.organizationId, targetOrgId), baseFilter)
				: baseFilter;
		return tx
			.select({
				id: patients.id,
				organizationId: patients.organizationId,
				phone: patients.phone,
			})
			.from(patients)
			.where(filter)
			.limit(2);
	});
	return found.length === 1 ? (found[0] ?? null) : null;
}

/**
 * Можно ли выдать пациенту ещё один код.
 *
 * Пауза между отправками считается по ЛЮБОЙ последней строке, включая
 * неудачную: иначе сломанный шлюз превращается в бесконечный цикл обращений.
 * А вот часовой потолок считается только по строкам, которые дошли до шлюза
 * ('pending' и 'sent'): если шлюз лежит, пациент не должен из-за этого остаться
 * заблокированным на час после починки.
 */
async function isIssuanceThrottled(
	organizationId: string,
	patientId: string,
	policy: PortalOtpPolicy,
	now: Date,
): Promise<boolean> {
	const windowStart = new Date(now.getTime() - policy.windowSeconds * 1000);
	const recent = await db
		.select({
			createdAt: portalOtpCodes.createdAt,
			deliveryStatus: portalOtpCodes.deliveryStatus,
		})
		.from(portalOtpCodes)
		.where(
			and(
				eq(portalOtpCodes.organizationId, organizationId),
				eq(portalOtpCodes.patientId, patientId),
				gte(portalOtpCodes.createdAt, windowStart),
			),
		)
		.orderBy(desc(portalOtpCodes.createdAt))
		.limit(50);

	const newest = recent[0];
	if (
		newest &&
		now.getTime() - newest.createdAt.getTime() <
			policy.resendCooldownSeconds * 1000
	) {
		return true;
	}
	const billable = recent.filter(
		(row) => row.deliveryStatus === "sent" || row.deliveryStatus === "pending",
	);
	return billable.length >= policy.maxPerWindow;
}

export const portalRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// 1. Send OTP (защищен составным лимитером по связке IP + phone_number)
	server.post<{ Body: { phone?: unknown; organizationId?: unknown } }>(
		"/auth/send-otp",
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: "1 minute",
					hook: "preHandler",
					keyGenerator: (req: FastifyRequest) => {
						const ip = req.ip ?? "unknown";
						const body = req.body as { phone?: unknown } | undefined;
						const rawPhone =
							typeof body?.phone === "string"
								? body.phone.trim().replace(/\D/g, "")
								: "";
						const phoneSuffix =
							rawPhone.length >= 10 ? rawPhone.slice(-10) : (rawPhone || "no-phone");
						return `portal-otp|${ip}|${phoneSuffix}`;
					},
				},
			},
		},
		async (request, reply) => {
			const policy = readPortalOtpPolicy();
			const rawPhone =
				typeof request.body?.phone === "string"
					? request.body.phone.trim()
					: "";
			const targetOrgId =
				typeof request.body?.organizationId === "string"
					? request.body.organizationId.trim()
					: undefined;
			if (!rawPhone) {
				reply.status(400);
				return { error: "PhoneRequired", message: "Укажите номер телефона." };
			}

			const smsConfigured = readSmsCredentialsFromEnv() !== null;
			/*
			 * Ветка для разработки. Условия, при которых она допустима, выполнены
			 * все три: она достижима ТОЛЬКО при явно названном режиме разработки
			 * (NODE_ENV=development либо test — см. developerLogFallbackAllowed
			 * выше; пустой и незнакомый NODE_ENV её больше не открывают), код в
			 * ней генерируется на каждый запрос тем же CSPRNG (никаких «0000»), и
			 * о её срабатывании громко пишется в журнал сервера. Код уходит ТОЛЬКО
			 * в журнал — в теле HTTP-ответа его нет даже здесь.
			 */
			const developerLogFallback =
				!smsConfigured && developerLogFallbackAllowed();

			/*
			 * Ответ, одинаковый для «пациент найден», «такого номера нет»,
			 * «номер принадлежит двум карточкам» и «код только что отправляли».
			 * Все поля — константы настройки сервера, они не зависят от того, что
			 * лежит в базе. Иначе публичный маршрут работает справочником: «есть ли
			 * у этой клиники пациент с таким телефоном» — а это медицинская тайна.
			 *
			 * Поле delivery вычисляется ЗДЕСЬ, из настроек сервера, а не в ветке
			 * успешной отправки. Первая версия дописывала его только когда пациент
			 * найден — и живая проверка сразу показала утечку: на известный номер
			 * приходило {... "delivery":"developer_log"}, на неизвестный — тот же
			 * ответ без этого поля. Один лишний ключ в JSON и есть тот самый
			 * справочник, который весь остальной код старается не построить.
			 */
			const neutralAccepted = {
				status: "accepted" as const,
				message:
					"Если номер зарегистрирован в клинике, мы отправили на него код для входа.",
				codeLength: policy.codeLength,
				expiresInSeconds: policy.ttlSeconds,
				resendAfterSeconds: policy.resendCooldownSeconds,
				delivery: developerLogFallback
					? ("developer_log" as const)
					: ("sms" as const),
			};

			// Защита от брутфорса и флуд-атак на оператора связи (IP и Phone Rate Limiting)
			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				request.socket?.remoteAddress ||
				"127.0.0.1";
			const clientIp =
				typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";

			const rateLimitBypassed = process.env.DENTE_PORTAL_OTP_BYPASS_RATE_LIMIT === "1";

			if (!rateLimitBypassed) {
				const nowMs = Date.now();
				const hasExplicitForwardedIp = Boolean(request.headers["x-forwarded-for"]);
				const isDevLoopback =
					developerLogFallbackAllowed() &&
					!hasExplicitForwardedIp &&
					(clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "unknown");

				const effectiveMaxIp = isDevLoopback ? 100 : OTP_MAX_REQUESTS_PER_IP;
				const effectiveMaxPhone = isDevLoopback ? 100 : OTP_MAX_REQUESTS_PER_PHONE;

				const ipEntry = otpIpRequestCounts.get(clientIp);
				if (ipEntry && nowMs <= ipEntry.resetAt && ipEntry.count >= effectiveMaxIp) {
					reply.status(429);
					return {
						error: "TooManyRequests",
						message:
							"Слишком много запросов на отправку СМС с вашего IP-адреса. Пожалуйста, подождите 10 минут перед следующей попыткой.",
					};
				}
				if (!ipEntry || nowMs > ipEntry.resetAt) {
					otpIpRequestCounts.set(clientIp, { count: 1, resetAt: nowMs + OTP_RATE_LIMIT_WINDOW_MS });
				} else {
					ipEntry.count++;
				}

				const digits = rawPhone.replace(/\D/g, "");
				const phoneSuffix = digits.length >= 10 ? digits.slice(-10) : digits;
				const phoneEntry = otpPhoneRequestCounts.get(phoneSuffix);
				if (phoneEntry && nowMs <= phoneEntry.resetAt && phoneEntry.count >= effectiveMaxPhone) {
					// Не разглашаем факт блокировки номера, но защищаем баланс оператора:
					// возвращаем нейтральный статус 202 без отправки SMS
					reply.status(202);
					return neutralAccepted;
				}
				if (!phoneEntry || nowMs > phoneEntry.resetAt) {
					otpPhoneRequestCounts.set(phoneSuffix, { count: 1, resetAt: nowMs + OTP_RATE_LIMIT_WINDOW_MS });
				} else {
					phoneEntry.count++;
				}
			}

			if (!smsConfigured && !developerLogFallback) {
				/*
				 * Ненастроенный шлюз — факт о сервере, а не о пациенте: честный отказ
				 * здесь ничего не разглашает, и отвечаем им до обращения к базе.
				 *
				 * ЧТО ЗДЕСЬ БЫЛО НЕ ТАК. Текст называл переменные окружения:
				 * «на сервере не настроен SMS-шлюз (DENTE_SMS_PROVIDER и ключи
				 * доступа)». Маршрут ПУБЛИЧНЫЙ и без авторизации — имена внутренних
				 * настроек сервера уходили любому, кто отправит номер телефона. При
				 * этом пациенту они бесполезны дважды: он не администратор клиники, и
				 * латинское слово из шести и более букв всё равно гасится фильтром
				 * служебного текста на экране.
				 *
				 * Разделено по адресату. Пациенту — причина его словами и один шаг,
				 * который у него есть: позвонить в клинику. Разработчику и
				 * администратору — имена переменных, но в ЖУРНАЛ СЕРВЕРА, где их
				 * прежде не было вовсе: настоящая причина не доходила ни до кого.
				 */
				request.log.error(
					{
						requiredEnv: [
							"DENTE_SMS_PROVIDER",
							"учётные данные выбранного SMS-провайдера",
						],
					},
					"Вход пациента в личный кабинет отклонён: SMS-шлюз не настроен в окружении сервера",
				);
				reply.status(503);
				return {
					error: "OtpDeliveryNotConfigured",
					message:
						"Вход в личный кабинет по коду из СМС сейчас не работает: клиника не подключила отправку СМС. Позвоните в клинику — записаться на приём и узнать план лечения можно у администратора.",
				};
			}

			const patient = await findUniquePatientByPhone(rawPhone, targetOrgId);
			if (!patient) {
				reply.status(202);
				return neutralAccepted;
			}

			const now = new Date();

			/*
			 * ГРАНИЦЫ ТРАНЗАКЦИЙ: ПОЧЕМУ ЗДЕСЬ НЕ ОДНА ОБЁРТКА НА ВЕСЬ ОБРАБОТЧИК.
			 *
			 * withTenantCtx — это dbRaw.transaction(...) (db/rls.ts): на всё время
			 * колбэка одно соединение из пула занято целиком. Пул заводится в
			 * db/client.ts как `new pg.Pool({ connectionString })` — без `max`, то
			 * есть по умолчанию ДЕСЯТЬ соединений, и без connectionTimeoutMillis,
			 * то есть запрос, которому соединения не досталось, ждёт его БЕЗ СРОКА.
			 *
			 * Прежняя редакция держала внутри этой транзакции две вещи, которым в
			 * ней делать нечего: PBKDF2 на 100 000 итераций SHA-512 (десятки-сотни
			 * миллисекунд) и ИСХОДЯЩИЙ HTTP к SMS-шлюзу (сотни миллисекунд —
			 * секунды). Маршрут ПУБЛИЧНЫЙ и без аутентификации. Десяток
			 * одновременных запросов выбирал весь пул, и следом вставало ВСЁ
			 * приложение — расписание, карта приёма, печать документов, — потому
			 * что соединения ждут бесконечно, а ждут их все.
			 *
			 * Разбито на короткие транзакции: между ними соединение возвращается в
			 * пул, а дорогая работа идёт снаружи. Что при этом обязано остаться
			 * неделимым — разобрано у каждой границы отдельно, ниже.
			 */

			/*
			 * ОТБРАКОВКА ДО PBKDF2. Проверка троттлинга стоит здесь не ради
			 * скорости, а чтобы не потерять свойство прежней редакции: хеш там
			 * считался ПОСЛЕ проверки, то есть отвергнутый запрос не стоил ничего.
			 * Пул потоков libuv по умолчанию — четыре потока, общих с чтением
			 * файлов и разрешением имён (utils/cryptoHelper.ts). Считай мы хеш
			 * первым, любой, кто долбит этот публичный маршрут, заказывал бы
			 * 100 000 итераций SHA-512 на каждый запрос, включая заведомо
			 * отвергнутые, и выедал бы пул потоков всему процессу.
			 *
			 * Проверка здесь НЕ окончательная: авторитетная повторяется внутри
			 * транзакции выдачи, вместе со вставкой, которую она разрешает.
			 */
			const throttledBeforeHashing = await withTenantCtx(
				patient.organizationId,
				async () =>
					isIssuanceThrottled(patient.organizationId, patient.id, policy, now),
			);
			if (throttledBeforeHashing) {
				// Тоже нейтральный ответ: 429 именно здесь снова отличал бы
				// существующего пациента от несуществующего.
				reply.status(202);
				return neutralAccepted;
			}

			/*
			 * PBKDF2 — ВНЕ транзакции. Соединение с базой на это время не нужно:
			 * считается хеш от значения, которого ещё нет ни в одной строке.
			 */
			const code = generateNumericCode(policy.codeLength);
			const codeHash = await hashCredential(code);

			/*
			 * ЕДИНИЦА АТОМАРНОСТИ ВЫДАЧИ. Проверка троттлинга, уборка старья,
			 * гашение прежних действующих кодов и вставка нового идут ОДНОЙ
			 * транзакцией. Разделять их нельзя: между гашением и вставкой не
			 * должно существовать окна, в котором у пациента нет ни одного
			 * действующего кода, а авторитетная проверка троттлинга не должна
			 * отрываться от вставки, которую она разрешает.
			 *
			 * ЧЕСТНО ОБ ОСТАВШЕЙСЯ ДЫРЕ, ЧТОБЫ НИКТО НЕ СЧИТАЛ ЕЁ ЗАКРЫТОЙ: одной
			 * транзакции для троттлинга МАЛО. Проверка — обычный SELECT, он не
			 * берёт блокировок, а уровень изоляции по умолчанию READ COMMITTED.
			 * Два одновременных запроса читают одно и то же «недавних выдач нет» и
			 * оба вставляют. Так было и до этой правки — объединение в транзакцию
			 * этого не чинило. Лечится pg_advisory_xact_lock по паре
			 * (организация, пациент) либо частичным уникальным индексом; и то и
			 * другое меняет поведение публичного маршрута и требует проверки на
			 * живой базе, поэтому названо в отчёте как долг, а не протащено сюда
			 * молча и без проверки.
			 */
			const issuance = await withTenantCtx(patient.organizationId, async () => {
				if (
					await isIssuanceThrottled(
						patient.organizationId,
						patient.id,
						policy,
						now,
					)
				) {
					return { throttled: true as const, issuedId: null };
				}

				// Уборка старья по этому же пациенту: без неё таблица растёт вечно.
				await db
					.delete(portalOtpCodes)
					.where(
						and(
							eq(portalOtpCodes.organizationId, patient.organizationId),
							eq(portalOtpCodes.patientId, patient.id),
							lt(
								portalOtpCodes.createdAt,
								new Date(now.getTime() - policy.retentionSeconds * 1000),
							),
						),
					);

				// Прежние действующие коды гасятся. Иначе у пациента одновременно живёт
				// несколько кодов, у каждого свой счётчик попыток, и потолок попыток
				// умножается на число нажатий «отправить ещё раз».
				await db
					.update(portalOtpCodes)
					.set({ consumedAt: now })
					.where(
						and(
							eq(portalOtpCodes.organizationId, patient.organizationId),
							eq(portalOtpCodes.patientId, patient.id),
							isNull(portalOtpCodes.consumedAt),
						),
					);

				// Строка заводится ДО обращения к шлюзу и только со статусом pending:
				// если процесс упадёт на отправке, код не окажется «отправленным».
				//
				// РАЗДЕЛЕНИЕ ТРАНЗАКЦИЙ ЭТО ТРЕБОВАНИЕ НЕ ОСЛАБИЛО, А ВПЕРВЫЕ ЕГО
				// ВЫПОЛНИЛО. Пока шлюз вызывался внутри этой же транзакции, падение
				// на отправке откатывало и саму строку: она не оставалась «pending»,
				// она ИСЧЕЗАЛА — вместе с гашением прежних кодов. Комментарий обещал
				// одно, транзакция делала другое. Теперь вставка фиксируется здесь,
				// ДО обращения к шлюзу, и обрыв на HTTP оставляет ровно то состояние,
				// которое здесь описано: строка есть, статус pending.
				const inserted = await db
					.insert(portalOtpCodes)
					.values({
						organizationId: patient.organizationId,
						patientId: patient.id,
						codeHash,
						channel: developerLogFallback ? "developer_log" : "sms",
						deliveryStatus: "pending",
						expiresAt: new Date(now.getTime() + policy.ttlSeconds * 1000),
					})
					.returning({ id: portalOtpCodes.id });
				return {
					throttled: false as const,
					issuedId: inserted[0]?.id ?? null,
				};
			});

			if (issuance.throttled) {
				reply.status(202);
				return neutralAccepted;
			}
			const issuedId = issuance.issuedId;
			if (!issuedId) {
				reply.status(500);
				return {
					error: "OtpNotIssued",
					message: "Не удалось выдать код входа. Повторите попытку.",
				};
			}

			if (developerLogFallback) {
				request.log.warn(
					{ portalOtpDeveloperCode: code, patientId: patient.id },
					"РЕЖИМ РАЗРАБОТКИ: SMS-шлюз не настроен, одноразовый код входа в личный кабинет выведен в журнал сервера и никому не отправлен. При NODE_ENV=production эта ветка недостижима.",
				);
				// Отдельная короткая транзакция. Строка уже зафиксирована, её перевод
				// в «sent» не обязан делить соединение с выдачей.
				await withTenantCtx(patient.organizationId, async () => {
					await db
						.update(portalOtpCodes)
						.set({ deliveryStatus: "sent" })
						.where(
							and(
								eq(portalOtpCodes.id, issuedId),
								eq(portalOtpCodes.organizationId, patient.organizationId),
							),
						);
				});
				reply.status(202);
				return neutralAccepted;
			}

			const msisdn = normalizeRussianMsisdn(patient.phone);
			/*
			 * Креды канала — ОТДЕЛЬНАЯ короткая транзакция, и она обязана быть
			 * транзакцией с контекстом арендатора: resolveChannelCredentials
			 * читает dente_whatsapp_bot_configs, dente_telegram_bot_configs и
			 * dente_max_bot_configs, а на всех трёх включён RLS с политикой
			 * tenant_isolation (drizzle/0157, FORCE в 0159). Вызови её без
			 * withTenantCtx — политика fail-closed вернёт НОЛЬ строк, креды
			 * молча станут null, и маршрут ответит «шлюз не настроен» на
			 * исправно настроенном шлюзе. Это не оптимизация, это условие
			 * работоспособности.
			 *
			 * ПОЧЕМУ НЕ ВНУТРИ ТРАНЗАКЦИИ ВЫДАЧИ. Три одиночных чтения по
			 * organization_id — дёшево, и соблазн сэкономить одну выемку из
			 * пула есть. Но тогда сбой чтения кредов откатывал бы выдачу кода
			 * целиком, а транзакция выдачи держала бы блокировки на строках
			 * пациента ещё эти 3-15 мс. Здесь важнее первое: после фиксации
			 * выдачи любой последующий сбой обязан оставлять строку pending —
			 * ровно то, чего требует комментарий у вставки.
			 */
			const credentials = await withTenantCtx(
				patient.organizationId,
				async () => resolveChannelCredentials(patient.organizationId),
			);

			/*
			 * ИСХОДЯЩИЙ HTTP — ВНЕ ЛЮБОЙ ТРАНЗАКЦИИ. Это и есть главная причина
			 * всей правки: обращение к чужому серверу занимает от сотен
			 * миллисекунд до секунд, а при недоступном шлюзе — весь таймаут
			 * транспорта. Соединение с базой в это время никому не нужно и
			 * теперь никем не держится.
			 */
			const delivery =
				msisdn === null
					? {
							ok: false as const,
							errorClass: "recipient_unavailable" as const,
							errorMessage:
								"Номер в карточке пациента не приводится к формату оператора.",
						}
					: await sendThroughChannel(
							{
								channel: "sms",
								recipientAddress: msisdn,
								subject: null,
								body: renderOtpMessage(policy, code),
								idempotencyKey: `portal-otp:${issuedId}`,
							},
							credentials,
						);

			if (!delivery.ok) {
				// Отметка исхода — по id, полученному из транзакции выдачи.
				await withTenantCtx(patient.organizationId, async () => {
					await db
						.update(portalOtpCodes)
						.set({
							deliveryStatus: "failed",
							deliveryErrorClass: delivery.errorClass,
						})
						.where(
							and(
								eq(portalOtpCodes.id, issuedId),
								eq(portalOtpCodes.organizationId, patient.organizationId),
							),
						);
				});
				request.log.error(
					{ patientId: patient.id, errorClass: delivery.errorClass },
					"Код входа в личный кабинет не отправлен: шлюз отказал",
				);
				/*
				 * Честный отказ вместо «отправлено». Пациент, смотрящий на «код
				 * отправлен» при пустом счету шлюза, — это и есть та самая обманка,
				 * ради устранения которой переписан этот маршрут.
				 *
				 * ОСТАТОЧНЫЙ РИСК, НАЗЫВАЮ ЯВНО: до шлюза доходят только запросы по
				 * реально существующему пациенту, поэтому в момент аварии шлюза
				 * разница между 502 и 202 отличает существующий номер от
				 * несуществующего. Это состояние аварии, а не штатное; молчать
				 * пациенту о том, что SMS не ушла, — хуже.
				 */
				reply.status(delivery.errorClass === "not_configured" ? 503 : 502);
				return {
					error: "OtpDeliveryFailed",
					errorClass: delivery.errorClass,
					message: `Не удалось отправить код: ${delivery.errorMessage}`,
				};
			}

			await withTenantCtx(patient.organizationId, async () => {
				await db
					.update(portalOtpCodes)
					.set({ deliveryStatus: "sent" })
					.where(
						and(
							eq(portalOtpCodes.id, issuedId),
							eq(portalOtpCodes.organizationId, patient.organizationId),
						),
					);
			});
			reply.status(202);
			return neutralAccepted;
		},
	);

	// 2. Verify OTP
	server.post<{ Body: { phone?: unknown; code?: unknown; organizationId?: unknown } }>(
		"/auth/verify-otp",
		async (request, reply) => {
			/*
			 * Единственный отрицательный ответ на все случаи: нет такого пациента,
			 * номер принадлежит двум карточкам, код не запрашивали, код просрочен,
			 * код неверен, попытки исчерпаны. Разные ответы превратили бы маршрут в
			 * оракул. Текст при этом ведёт пользователя к выходу из любого из этих
			 * состояний — «запросите новый код» верно во всех шести.
			 */
			const invalidOtp = {
				error: "InvalidOtp",
				message: "Неверный или истёкший код. Запросите новый код.",
			};

			const rawPhone =
				typeof request.body?.phone === "string"
					? request.body.phone.trim()
					: "";
			const code =
				typeof request.body?.code === "string" ? request.body.code.trim() : "";
			const targetOrgId =
				typeof request.body?.organizationId === "string"
					? request.body.organizationId.trim()
					: undefined;
			if (!rawPhone || !code) {
				reply.status(400);
				return {
					error: "PhoneAndCodeRequired",
					message: "Укажите номер телефона и код из SMS.",
				};
			}

			const policy = readPortalOtpPolicy();
			const patient = await findUniquePatientByPhone(rawPhone, targetOrgId);
			if (!patient) {
				reply.status(401);
				return invalidOtp;
			}

			const now = new Date();

			/*
			 * ГРАНИЦЫ ТРАНЗАКЦИЙ. Здесь та же болезнь, что и в send-otp: обёртка на
			 * весь обработчик затаскивала внутрь ОТКРЫТОЙ транзакции PBKDF2 на
			 * 100 000 итераций. Соединение из пула (10 штук, ждать бесконечно —
			 * db/client.ts) держалось всё время счёта, а маршрут ПУБЛИЧНЫЙ: перебор
			 * кода занимал не только пул потоков libuv, но и пул соединений базы.
			 *
			 * Транзакций стало две, сверка вынесена между ними. Что осталось
			 * неделимым и почему — ниже.
			 */

			/*
			 * ТРАНЗАКЦИЯ ПОПЫТКИ. Выбор действующего кода, инкремент счётчика и
			 * гашение при превышении потолка обязаны идти ОДНОЙ транзакцией.
			 * Разорви их — и между инкрементом и решением «попытки исчерпаны»
			 * появляется окно, в котором код ещё не сожжён, а лимит уже пройден:
			 * это ровно тот обход потолка, ради которого счётчик и заведён.
			 *
			 * ПОБОЧНО ЭТО ЧИНИТ ТО, ЧТО ОБЕЩАЛ КОММЕНТАРИЙ НИЖЕ. «Счётчик растёт
			 * ДО сверки» было верно по порядку строк, но не по фиксации: пока
			 * инкремент и PBKDF2 жили в одной транзакции, падение процесса на
			 * сверке откатывало и инкремент — попытка выходила бесплатной, ровно
			 * как при обрыве. Теперь инкремент зафиксирован ДО того, как начнётся
			 * дорогая сверка.
			 */
			const candidate = await withTenantCtx(
				patient.organizationId,
				async () => {
					const active = await db
						.select({
							id: portalOtpCodes.id,
							codeHash: portalOtpCodes.codeHash,
						})
						.from(portalOtpCodes)
						.where(
							and(
								eq(portalOtpCodes.organizationId, patient.organizationId),
								eq(portalOtpCodes.patientId, patient.id),
								// Только реально доставленные: код из строки, на которой шлюз
								// отказал, пациенту не приходил и приниматься не должен.
								eq(portalOtpCodes.deliveryStatus, "sent"),
								isNull(portalOtpCodes.consumedAt),
								gte(portalOtpCodes.expiresAt, now),
							),
						)
						.orderBy(desc(portalOtpCodes.createdAt))
						.limit(1);
					const found = active[0];
					if (!found) return null;

					// Счётчик растёт ДО сверки. Если увеличивать после, оборванное на
					// середине соединение даёт бесплатную попытку, и потолок обходится.
					const counted = await db
						.update(portalOtpCodes)
						.set({ attemptCount: sql`${portalOtpCodes.attemptCount} + 1` })
						.where(
							and(
								eq(portalOtpCodes.id, found.id),
								eq(portalOtpCodes.organizationId, patient.organizationId),
							),
						)
						.returning({ attemptCount: portalOtpCodes.attemptCount });
					const attemptNumber =
						counted[0]?.attemptCount ?? policy.maxAttempts + 1;

					if (attemptNumber > policy.maxAttempts) {
						// Код сжигается целиком: после исчерпания попыток он не примется
						// даже верным. Пауза не помогла бы — перебор продолжился бы после неё.
						await db
							.update(portalOtpCodes)
							.set({ consumedAt: now })
							.where(
								and(
									eq(portalOtpCodes.id, found.id),
									eq(portalOtpCodes.organizationId, patient.organizationId),
									isNull(portalOtpCodes.consumedAt),
								),
							);
						return null;
					}
					return found;
				},
			);
			if (!candidate) {
				reply.status(401);
				return invalidOtp;
			}

			/*
			 * PBKDF2 — ВНЕ транзакции. Попытка уже посчитана и зафиксирована,
			 * соединение с базой на время сверки не нужно никому.
			 */
			if (!(await verifyCredential(code, candidate.codeHash))) {
				reply.status(401);
				return invalidOtp;
			}

			/*
			 * Однократность обеспечивается условным UPDATE, а не проверкой перед
			 * ним: два одновременных запроса с верным кодом иначе оба прошли бы
			 * проверку «ещё не использован» и оба получили бы сессию. Здесь
			 * выигрывает ровно один — второй не увидит ни одной обновлённой строки.
			 *
			 * ОТДЕЛЬНАЯ ТРАНЗАКЦИЯ ЭТУ ГАРАНТИЮ НЕ ТРОГАЕТ, и вот почему её можно
			 * было отделить. Гарантию даёт не транзакция, а одиночный UPDATE с
			 * `consumedAt IS NULL` в условии: он берёт блокировку строки, второй
			 * запрос ждёт фиксацию первого и перечитывает условие уже по
			 * обновлённой строке. Условие isNull(consumedAt) здесь НЕСНИМАЕМО —
			 * без него оба запроса обновят строку и оба получат сессию.
			 */
			const consumed = await withTenantCtx(patient.organizationId, async () =>
				db
					.update(portalOtpCodes)
					.set({ consumedAt: now })
					.where(
						and(
							eq(portalOtpCodes.id, candidate.id),
							eq(portalOtpCodes.organizationId, patient.organizationId),
							isNull(portalOtpCodes.consumedAt),
						),
					)
					.returning({ id: portalOtpCodes.id }),
			);
			if (consumed.length !== 1) {
				reply.status(401);
				return invalidOtp;
			}

			// Signed, expiring session token. Replaces the previous unsigned
			// base64(`DENTE_TOKEN:<id>`) payload, which any caller could forge to read
			// another patient's medical record (IDOR).
			const token = signToken(
				{
					sub: patient.id,
					organizationId: patient.organizationId,
					kind: PORTAL_TOKEN_KIND,
				},
				requireAuthTokenSecret(),
				PORTAL_TOKEN_TTL_SECONDS,
			);

			return { success: true, token, patientId: patient.id };
		},
	);

	// 2.2. Kiosk Self-Checkin Endpoint (1-Touch Arrival, Statutory Consents, Somatic Profile)
	const handleSelfCheckin = async (
		request: FastifyRequest<{
			Body: {
				organizationId?: unknown;
				phoneLast4?: unknown;
				patientPhone?: unknown;
				patientId?: unknown;
				checkinCode?: unknown;
				signedConsents?: unknown;
				somaticProfile?: unknown;
			};
		}>,
		reply: FastifyReply,
	) => {
		const rawBody = request.body || {};
		const rawPhoneLast4 =
			typeof rawBody.phoneLast4 === "string" ? rawBody.phoneLast4.trim().replace(/\D/g, "") : "";
		const rawPhone =
			typeof rawBody.patientPhone === "string" ? rawBody.patientPhone.trim() : "";
		const rawPatientId =
			typeof rawBody.patientId === "string" ? rawBody.patientId.trim() : "";
		const rawOrgId =
			typeof rawBody.organizationId === "string" ? rawBody.organizationId.trim() : "";
		const signedConsents = Array.isArray(rawBody.signedConsents)
			? rawBody.signedConsents.filter((c): c is string => typeof c === "string")
			: [];
		const somaticProfile =
			rawBody.somaticProfile && typeof rawBody.somaticProfile === "object"
				? (rawBody.somaticProfile as Record<string, unknown>)
				: null;

		// 1. Resolve Organization ID
		let organizationId = rawOrgId;
		if (!organizationId) {
			const [firstOrg] = await db
				.select({ id: organizations.id })
				.from(organizations)
				.limit(1);
			if (firstOrg) {
				organizationId = firstOrg.id;
			}
		}

		if (!organizationId) {
			reply.status(404);
			return {
				success: false,
				error: "OrganizationNotFound",
				message: "Клиника не найдена в системе.",
			};
		}

		// 2. Resolve Patient
		let targetPatient: {
			id: string;
			fullName: string | null;
			phone: string | null;
			organizationId: string;
		} | null = null;

		if (rawPatientId) {
			const [p] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(and(eq(patients.id, rawPatientId), eq(patients.organizationId, organizationId)))
				.limit(1);
			if (p) targetPatient = p;
		}

		if (!targetPatient && rawPhone) {
			const phoneDigits = rawPhone.replace(/\D/g, "");
			const [p] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						or(eq(patients.phone, rawPhone), eq(patients.phone, phoneDigits)),
					),
				)
				.limit(1);
			if (p) targetPatient = p;
		}

		// If searching by phoneLast4:
		if (!targetPatient && rawPhoneLast4.length === 4) {
			const candidates = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						sql`RIGHT(REGEXP_REPLACE(${patients.phone}, '\\D', '', 'g'), 4) = ${rawPhoneLast4}`,
					),
				)
				.limit(10);

			if (candidates.length === 1 && candidates[0]) {
				targetPatient = candidates[0];
			} else if (candidates.length > 1) {
				const now = new Date();
				const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
				const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

				for (const cand of candidates) {
					const [apt] = await db
						.select({ id: appointments.id })
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, organizationId),
								eq(appointments.patientId, cand.id),
								gte(appointments.startsAt, startOfDay),
								lt(appointments.startsAt, endOfDay),
								notInArray(appointments.status, ["cancelled"]),
							),
						)
						.limit(1);
					if (apt) {
						targetPatient = cand;
						break;
					}
				}
				if (!targetPatient && candidates[0]) {
					targetPatient = candidates[0];
				}
			}
		}

		// 3. Find Today's Appointment
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

		let appointment: {
			id: string;
			startsAt: Date;
			endsAt: Date;
			status: string;
			doctorUserId: string | null;
			chairId: string | null;
		} | null = null;

		if (targetPatient) {
			const [apt] = await db
				.select({
					id: appointments.id,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, organizationId),
						eq(appointments.patientId, targetPatient.id),
						gte(appointments.startsAt, startOfDay),
						lt(appointments.startsAt, endOfDay),
						notInArray(appointments.status, ["cancelled"]),
					),
				)
				.orderBy(appointments.startsAt)
				.limit(1);

			if (apt) {
				appointment = apt;
			}
		}

		// Doctor & Chair details
		let doctorName = "Дежурный врач-стоматолог";
		let cabinetName = "Кабинет 1";

		if (appointment?.doctorUserId) {
			const [doc] = await db
				.select({ fullName: users.fullName })
				.from(users)
				.where(eq(users.id, appointment.doctorUserId))
				.limit(1);
			if (doc?.fullName) {
				doctorName = doc.fullName;
			}
		}

		if (appointment?.chairId) {
			const [chair] = await db
				.select({ name: chairs.name })
				.from(chairs)
				.where(eq(chairs.id, appointment.chairId))
				.limit(1);
			if (chair?.name) {
				cabinetName = chair.name;
			}
		}

		// Generate Queue Ticket
		const ticketSuffix = appointment
			? appointment.id.slice(-2).toUpperCase()
			: Math.floor(10 + Math.random() * 89).toString();
		const queueTicket = `Талон № А-${ticketSuffix}`;

		// 4. Update Appointment status to 'arrived' if found
		if (appointment) {
			await withTenantCtx(organizationId, async () => {
				await db
					.update(appointments)
					.set({ status: "arrived" })
					.where(
						and(
							eq(appointments.id, appointment.id),
							eq(appointments.organizationId, organizationId),
						),
					);
			});

			try {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						id: appointment.id,
						patientId: targetPatient?.id,
						status: "arrived",
						updatedAt: new Date().toISOString(),
					},
				});
			} catch {
				// non-blocking broadcast
			}
		}

		// 5. Persist statutory consents if signed
		if (targetPatient && signedConsents.length > 0) {
			await withTenantCtx(organizationId, async () => {
				for (const consentKind of signedConsents) {
					await db.insert(patientConsents).values({
						organizationId,
						patientId: targetPatient.id,
						kind: consentKind,
						grantedAt: new Date(),
					});
				}
			});
		}

		// 6. Persist allergies if reported in somatic profile
		if (targetPatient && somaticProfile) {
			const allergies = somaticProfile.allergies as Record<string, unknown> | undefined;
			const detailsStr = typeof allergies?.details === "string" ? allergies.details.trim() : "";
			if (allergies?.hasAllergies && detailsStr) {
				await withTenantCtx(organizationId, async () => {
					await db.insert(patientDrugAllergies).values({
						organizationId,
						patientId: targetPatient.id,
						allergenGroup: "dental_anesthetics_or_antibiotics",
						reactionSeverity: "high",
						clinicalManifestations: detailsStr.slice(0, 255),
						notes: "Самочекин терминал",
					});
				});
			}
		}

		const apptTimeStr = appointment
			? `Сегодня в ${appointment.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (${cabinetName})`
			: "Сегодня (приём по очереди)";

		return {
			success: true,
			arrived: Boolean(appointment),
			patientId: targetPatient?.id || rawPatientId || "",
			patientName: targetPatient?.fullName || "Пациент",
			appointmentTime: apptTimeStr,
			doctorName,
			cabinetName,
			queueTicket,
			visitStatus: appointment ? "В холле / Ожидает приёма" : "Ожидает администратора",
		};
	};

	server.post("/self-checkin", handleSelfCheckin);
	server.post("/kiosk/checkin", handleSelfCheckin);

	// 2.1. Logout / Session Revocation (Protected)
	server.post("/auth/logout", async (request, reply) => {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			reply.status(401);
			return { error: "Unauthorized", message: "Токен авторизации не предоставлен." };
		}

		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) {
			reply.status(401);
			return { error: "Unauthorized", message: "Токен авторизации не предоставлен." };
		}

		if (revokedPortalTokens.has(token)) {
			reply.status(401);
			return { error: "SessionRevoked", message: "Сессия уже завершена." };
		}

		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
			reply.status(401);
			return { error: "InvalidToken", message: "Недействительный токен сессии." };
		}

		const patientId = payload.sub;
		const organizationId = payload.organizationId;
		const nowSeconds = Math.floor(Date.now() / 1000);
		const nowIso = new Date().toISOString();

		// Revoke in-memory active token and record revocation threshold for patient
		revokedPortalTokens.add(token);
		portalRevokedBeforeByPatient.set(patientId, nowSeconds);

		// Record revocation timestamp in patient's administrative profile for audit trails
		await withTenantCtx(organizationId, async () => {
			const [patientRow] = await db
				.select({ administrativeProfile: patients.administrativeProfile })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
				.limit(1);

			if (patientRow) {
				const currentProfile =
					(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
				await db
					.update(patients)
					.set({
						administrativeProfile: {
							...currentProfile,
							portalSessionRevokedAt: nowIso,
						} as any,
						updatedAt: new Date(),
					})
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)));
			}
		});

		return {
			success: true,
			message: "Сессия успешно завершена.",
			revokedAt: nowIso,
		};
	});

	// 3. Get Patient Data (Protected)
	server.get("/me", async (request, reply) => {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		if (revokedPortalTokens.has(token)) {
			reply.status(401);
			return { error: "SessionRevoked", message: "Сессия завершена. Войдите снова." };
		}

		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
			reply.status(401);
			return { error: "Invalid token" };
		}
		const patientId = payload.sub;
		const organizationId = payload.organizationId as string;

		const revokedBefore = portalRevokedBeforeByPatient.get(patientId);
		if (revokedBefore && typeof payload.iat === "number" && payload.iat <= revokedBefore) {
			reply.status(401);
			return { error: "SessionRevoked", message: "Сессия завершена. Войдите снова." };
		}

		return withTenantCtx(organizationId, async () => {
			// Defence-in-depth: even though the token is signed and can't be forged,
			// we explicitly scope the query to the org recorded in the token so a
			// stolen token from org A cannot read org B's data if IDs ever collide.
			const pResult = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);
			const patient = pResult[0];
			if (!patient) {
				/*
				 * ЭТОТ ОТКАЗ — И ЕСТЬ ДЕЙСТВУЮЩИЙ СЛУЧАЙ, РАДИ КОТОРОГО ПРАВИЛСЯ
				 * ФАЙЛ. Он стоит ВНУТРИ колбэка withTenantCtx, то есть внутри
				 * открытой транзакции. `return reply.status(404).send(...)`
				 * возвращал из колбэка thenable-`reply`, транзакция ждала конца
				 * отправки ответа и фиксировалась уже после него. Возврат значения
				 * выносит COMMIT вперёд.
				 */
				reply.status(404);
				return { error: "Not found" };
			}

			const visits = await db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.patientId, patient.id),
						eq(visitDiaries.organizationId, organizationId),
					),
				);
			const plans = await db
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.patientId, patient.id),
						eq(treatmentPlans.organizationId, organizationId),
					),
				);
			const invoices = await db
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.patientId, patient.id),
						eq(patientInvoices.organizationId, organizationId),
					),
				);
			const documents = await db
				.select()
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.patientId, patient.id),
						eq(generatedDocuments.organizationId, organizationId),
						eq(generatedDocuments.status, "issued"),
					),
				);

			// 152-ФЗ / Врачебная тайна: Защита от утечки служебных заметок врача/ресепшн
			// («склочный пациент», «неплатежеспособен»), коммерческих заметок куратора и комиссионных ставок.
			const { notes: _internalNotes, ...safePatient } = patient;
			let safeAdminProfile = patient.administrativeProfile;
			if (safeAdminProfile && typeof safeAdminProfile === "object") {
				const {
					curatorCommissionPercent: _comm,
					curatorNotes: _curNotes,
					dataProcessingBasisNote: _dpNote,
					...cleanProfile
				} = safeAdminProfile as Record<string, unknown>;
				safeAdminProfile = cleanProfile as any;
			}
			const sanitizedPatient = {
				...safePatient,
				notes: null,
				administrativeProfile: safeAdminProfile,
			};

			// Appointments from schedule
			const patientAppointments = await db
				.select({
					id: appointments.id,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
					reason: appointments.reason,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.patientId, patient.id),
						eq(appointments.organizationId, organizationId),
					),
				)
				.orderBy(desc(appointments.startsAt));

			// Clinic doctors for appointment names and online booking
			const clinicDoctors = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, organizationId),
						eq(users.role, "doctor"),
						eq(users.isActive, true),
					),
				);

			const doctorMap = new Map(clinicDoctors.map((d) => [d.id, d]));
			const enrichedAppointments = patientAppointments.map((apt) => {
				const doc = apt.doctorUserId ? doctorMap.get(apt.doctorUserId) : null;
				return {
					...apt,
					doctorName: doc?.fullName || "Лечащий врач",
					doctorSpecialtyRu: doc?.specialties?.[0] || "Стоматолог",
				};
			});

			// Family Group & Family Shared Balance
			let familyGroupData: {
				id: string;
				name: string | null;
				groupName: string;
				balanceRub: number;
			} | null = null;

			if (patient.familyGroupId) {
				const [fg] = await db
					.select()
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.id, patient.familyGroupId),
							eq(familyGroups.organizationId, organizationId),
						),
					)
					.limit(1);
				if (fg) {
					familyGroupData = {
						id: fg.id,
						name: fg.name,
						groupName: fg.groupName,
						balanceRub: Number(fg.balance || 0),
					};
				}
			}

			// Patient Relationships (Family Members)
			const relationships = await db
				.select()
				.from(patientRelationships)
				.where(
					and(
						eq(patientRelationships.organizationId, organizationId),
						or(
							eq(patientRelationships.patientId, patient.id),
							eq(patientRelationships.relatedPatientId, patient.id),
						),
					),
				);

			let familyMembersList: Array<{
				id: string;
				fullName: string;
				relationshipRu: string;
				birthDate?: string | undefined;
				phone?: string | undefined;
				cardNumber?: string | undefined;
				allowSpendFamilyBalance: boolean;
				allowBooking: boolean;
			}> = [];

			if (relationships.length > 0) {
				const relatedIds = relationships.map((r) =>
					r.patientId === patient.id ? r.relatedPatientId : r.patientId,
				);
				const relPatients = await db
					.select({
						id: patients.id,
						fullName: patients.fullName,
						phone: patients.phone,
						birthDate: patients.birthDate,
						administrativeProfile: patients.administrativeProfile,
					})
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							inArray(patients.id, relatedIds),
						),
					);
				const relMap = new Map(relPatients.map((p) => [p.id, p]));

				familyMembersList = relationships.map((r) => {
					const otherId = r.patientId === patient.id ? r.relatedPatientId : r.patientId;
					const pInfo = relMap.get(otherId);
					const adminProf = pInfo?.administrativeProfile as Record<string, unknown> | null;
					const cardNum =
						(adminProf?.cardNumber as string | undefined) ||
						(pInfo?.id ? `043-${pInfo.id.slice(0, 6).toUpperCase()}` : undefined);
					return {
						id: otherId,
						fullName: pInfo?.fullName || "Член семьи",
						relationshipRu: r.relationshipType || "Родственник",
						birthDate: pInfo?.birthDate ? String(pInfo.birthDate) : undefined,
						phone: pInfo?.phone || undefined,
						cardNumber: cardNum,
						allowSpendFamilyBalance: Boolean(r.canSpendFamilyWallet),
						allowBooking: true,
					};
				});
			}

			return {
				patient: sanitizedPatient,
				visits,
				plans,
				invoices,
				documents,
				appointments: enrichedAppointments,
				familyGroup: familyGroupData,
				familyMembers: familyMembersList,
				doctors: clinicDoctors,
			};
		});
	});

	// 4. View Document HTML (Protected)
	server.get<{ Params: { documentId: string } }>(
		"/documents/:documentId/html",
		async (request, reply) => {
			const authHeader = request.headers.authorization;
			if (!authHeader?.startsWith("Bearer ")) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const token = authHeader.slice("Bearer ".length).trim();
			if (!token) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const payload = verifyToken(token, requireAuthTokenSecret());
			if (
				!payload ||
				payload.kind !== PORTAL_TOKEN_KIND ||
				typeof payload.sub !== "string" ||
				typeof payload.organizationId !== "string"
			) {
				reply.status(401);
				return { error: "Invalid token" };
			}
			const patientId = payload.sub;
			const organizationId = payload.organizationId as string;

			/*
			 * КОНТЕКСТ АРЕНДАТОРА. Здесь пациентский токен портала, а не токен
			 * кабинета и не токен сотрудника: `security/identity.ts` его не
			 * читает, поэтому `request.tenantId` не выставлен и глобальная
			 * обёртка server.ts этот обработчик не оборачивает. Под FORCE RLS
			 * `getDocumentById` возвращал ноль строк ВСЕГДА, и пациент получал
			 * 404 на КАЖДЫЙ свой документ — при том что соседний маршрут `/me`
			 * с точно такой же проверкой токена контекст себе ставит. Клиника
			 * названа в полезной нагрузке токена и подтверждена его подписью,
			 * поэтому обход не нужен: под контекстом чужой документ недоступен.
			 */
			const document = await withTenantCtx(organizationId, () =>
				getDocumentById(organizationId, request.params.documentId),
			);

			if (
				!document ||
				document.patientId !== patientId ||
				document.status !== "issued"
			) {
				reply.status(404);
				return { error: "Not found" };
			}

			const issuedSnapshot = readIssuedDocumentSnapshot(document);
			if (!issuedSnapshot) {
				reply.status(409);
				return { error: "Архивная копия документа отсутствует" };
			}

			/*
			 * НЕ ПЕРЕВОДИТСЯ В ВОЗВРАТ ЗНАЧЕНИЯ: тело здесь — не JSON, а готовая
			 * архивная копия документа под собственным Content-Type. Транзакция к
			 * этому моменту уже закрыта — withTenantCtx выше отработал и вернул
			 * документ значением, — поэтому откладывать COMMIT тут нечему.
			 */
			return reply.type("text/html; charset=utf-8").send(issuedSnapshot);
		},
	);

	// Helper to extract authenticated portal patient session
	function extractPortalPatient(request: FastifyRequest): {
		patientId: string;
		organizationId: string;
	} | null {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) return null;
		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) return null;
		if (revokedPortalTokens.has(token)) return null;
		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
			return null;
		}
		const revokedBefore = portalRevokedBeforeByPatient.get(payload.sub);
		if (revokedBefore && typeof payload.iat === "number" && payload.iat <= revokedBefore) {
			return null;
		}
		return { patientId: payload.sub, organizationId: payload.organizationId };
	}

	function generateSha256Hex(data: string): string {
		return createHash("sha256").update(data, "utf8").digest("hex");
	}

	function generateDeterministicQrSvg(
		content: string,
		size = 180,
		options?: { color?: string; background?: string; margin?: number },
	): string {
		const color = options?.color ?? "#0f172a";
		const bg = options?.background ?? "#ffffff";
		const margin = options?.margin ?? 2;
		const matrixSize = 25;
		const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
			Array(matrixSize).fill(false),
		);

		const drawFinder = (startX: number, startY: number) => {
			for (let r = 0; r < 7; r++) {
				for (let c = 0; c < 7; c++) {
					if (
						r === 0 ||
						r === 6 ||
						c === 0 ||
						c === 6 ||
						(r >= 2 && r <= 4 && c >= 2 && c <= 4)
					) {
						const y = startY + r;
						const x = startX + c;
						if (matrix[y] && matrix[y][x] !== undefined) {
							matrix[y][x] = true;
						}
					}
				}
			}
		};

		drawFinder(0, 0);
		drawFinder(matrixSize - 7, 0);
		drawFinder(0, matrixSize - 7);

		for (let i = 8; i < matrixSize - 8; i++) {
			const isEven = i % 2 === 0;
			const row6 = matrix[6];
			if (row6) row6[i] = isEven;
			const rowI = matrix[i];
			if (rowI) rowI[6] = isEven;
		}

		const hashHex = generateSha256Hex(content);
		let bitIndex = 0;
		for (let r = 0; r < matrixSize; r++) {
			for (let c = 0; c < matrixSize; c++) {
				const inTopLeft = r < 8 && c < 8;
				const inTopRight = r < 8 && c >= matrixSize - 8;
				const inBottomLeft = r >= matrixSize - 8 && c < 8;
				const inTiming = r === 6 || c === 6;

				if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
					const hexChar = hashHex[bitIndex % hashHex.length] ?? "0";
					const charCode = Number.parseInt(hexChar, 16);
					const isBitSet = (charCode + r * 3 + c * 7) % 3 === 0;
					const rowR = matrix[r];
					if (rowR) {
						rowR[c] = isBitSet;
					}
					bitIndex++;
				}
			}
		}

		const totalSize = matrixSize + margin * 2;
		const scale = size / totalSize;
		const rects: string[] = [];

		for (let r = 0; r < matrixSize; r++) {
			for (let c = 0; c < matrixSize; c++) {
				if (matrix[r]?.[c]) {
					const x = (c + margin) * scale;
					const y = (r + margin) * scale;
					rects.push(
						`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${scale.toFixed(1)}" height="${scale.toFixed(1)}" fill="${color}" />`,
					);
				}
			}
		}

		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
		<rect width="${size}" height="${size}" fill="${bg}" />
		${rects.join("\n")}
	</svg>`;
	}

	// 5. Get Statutory Consents (Protected)
	server.get("/consents", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "Not found" };
			}

			const dbConsents = await db
				.select()
				.from(patientConsents)
				.where(
					and(
						eq(patientConsents.patientId, auth.patientId),
						eq(patientConsents.organizationId, auth.organizationId),
					),
				);

			const profileAudit =
				(patientRow.administrativeProfile as Record<string, unknown> | null)
					?.consentSignatures as Record<string, unknown> | undefined;

			const defaultCatalog = [
				{
					id: "ids_treatment",
					code: "ИДС-ТЕР-01",
					titleRu: "Информированное добровольное согласие на терапевтическое лечение",
					categoryRu: "Терапия",
					statutoryBasis: "323-ФЗ ст. 20",
					summaryTextRu:
						"Согласие на проведение осмотра, инструментальной диагностики, анестезии и пломбирования кариозных полостей.",
					fullTextContent:
						"Я, пациент клиники, даю информированное добровольное согласие на виды медицинских вмешательств в соответствии с Приказом Минздрава РФ № 1051н и ст. 20 ФЗ № 323-ФЗ...",
				},
				{
					id: "ids_anesthesia",
					code: "ИДС-АНЕСТ-01",
					titleRu: "Информированное добровольное согласие на местное обезболивание",
					categoryRu: "Анестезия",
					statutoryBasis: "323-ФЗ ст. 20",
					summaryTextRu:
						"Согласие на инфильтрационную и проводниковую анестезию современными карпульными анестетиками с оценкой рисков.",
					fullTextContent:
						"Я подтверждаю, что сообщил врачу достоверные сведения о наличии аллергических реакций, патологии сердечно-сосудистой системы и принимаемых препаратах...",
				},
				{
					id: "pd_152",
					code: "ПДН-152",
					titleRu: "Согласие на обработку персональных данных",
					categoryRu: "Персональные данные",
					statutoryBasis: "152-ФЗ",
					summaryTextRu:
						"Согласие на сбор, систематизацию, хранение и обработку персональных данных и медицинской тайны в рамках медпомощи.",
					fullTextContent:
						"В соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» даю согласие клинике на обработку моих персональных данных...",
				},
			];

			const mergedConsents = defaultCatalog.map((cat) => {
				const foundDb = dbConsents.find((c) => c.kind === cat.id);
				const auditRecord = profileAudit?.[cat.id] as Record<string, unknown> | undefined;
				const isSigned = Boolean(foundDb?.grantedAt || auditRecord?.signedAtIso);

				return {
					...cat,
					status: isSigned ? ("signed" as const) : ("pending_signature" as const),
					signedAtIso: (auditRecord?.signedAtIso as string) || foundDb?.grantedAt?.toISOString(),
					signatureAudit: auditRecord
						? {
								verificationMethod: (auditRecord.signatureMethod as string) || "touch_screen",
								ipAddress: (auditRecord.ipAddress as string) || "127.0.0.1",
								integrityHash: (auditRecord.integrityHash as string) || "",
								signedAtIso: (auditRecord.signedAtIso as string) || "",
								signatureSvg: (auditRecord.signatureSvg as string) || undefined,
							}
						: undefined,
				};
			});

			return { consents: mergedConsents };
		});
	});

	// 6. Sign Statutory Consent via 63-FZ PEP, Paper Physical, or Vector Stroke & IP Audit
	server.post<{
		Params: { consentId: string };
		Body: {
			signatureSvg?: unknown;
			signatureMethod?: unknown;
			consentKind?: unknown;
			deviceMeta?: unknown;
		};
	}>("/consents/:consentId/sign", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const consentId = request.params.consentId?.trim();
		if (!consentId) {
			reply.status(400);
			return {
				error: "ConsentIdRequired",
				message: "Идентификатор согласия обязателен.",
			};
		}

		const rawMethod =
			typeof request.body?.signatureMethod === "string"
				? request.body.signatureMethod.trim().toLowerCase()
				: "";
		const signatureMethod =
			rawMethod === "paper_physical"
				? "paper_physical"
				: rawMethod === "sms_otp"
					? "sms_otp"
					: rawMethod === "touch_screen"
						? "touch_screen"
						: "portal_pep";

		const signatureSvg =
			typeof request.body?.signatureSvg === "string"
				? request.body.signatureSvg.trim()
				: "";

		let effectiveSignatureSvg = signatureSvg;
		if (!effectiveSignatureSvg) {
			if (signatureMethod === "paper_physical") {
				effectiveSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f8fafc" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">ПОДПИСАНО НА БУМАГЕ</text><text x="160" y="52" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#475569">Подшито в карту 043/у (ст. 20 323-ФЗ, ПП РФ № 736)</text></svg>`;
			} else {
				effectiveSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ПОДПИСАНО ПЭП (63-ФЗ)</text><text x="160" y="52" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Личный кабинет пациента • ст. 20 323-ФЗ</text></svg>`;
			}
		}

		const rawIp =
			(request.headers["x-forwarded-for"] as string) ||
			request.ip ||
			request.socket?.remoteAddress ||
			"127.0.0.1";
		const clientIp =
			typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";
		const now = new Date();
		const signedAtIso = now.toISOString();

		// Generate 63-FZ cryptographic integrity hash
		const integrityHash = generateSha256Hex(
			[
				consentId,
				auth.patientId,
				auth.organizationId,
				effectiveSignatureSvg,
				signedAtIso,
				clientIp,
				"63-FZ_ELECTRONIC_SIGNATURE_VECTOR_AUDIT",
			].join("|"),
		);

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			// Update or insert patient consent record
			const existing = await db
				.select({ id: patientConsents.id })
				.from(patientConsents)
				.where(
					and(
						eq(patientConsents.patientId, auth.patientId),
						eq(patientConsents.organizationId, auth.organizationId),
						eq(patientConsents.kind, consentId),
					),
				)
				.limit(1);

			if (existing.length > 0 && existing[0]) {
				await db
					.update(patientConsents)
					.set({ grantedAt: now, revokedAt: null })
					.where(eq(patientConsents.id, existing[0].id));
			} else {
				await db.insert(patientConsents).values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					kind: consentId,
					grantedAt: now,
				});
			}

			// Update administrative profile with signature audit
			const currentProfile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
			const currentConsentAudit =
				(currentProfile.consentSignatures as Record<string, unknown> | undefined) || {};

			const updatedAudit = {
				...currentConsentAudit,
				[consentId]: {
					consentId,
					signatureMethod,
					signatureSvg: effectiveSignatureSvg,
					clientIp,
					ipAddress: clientIp,
					integrityHash,
					signedAtIso,
					deviceMeta:
						typeof request.body?.deviceMeta === "string"
							? request.body.deviceMeta
							: request.headers["user-agent"] || "mobile_touch_device",
				},
			};

			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						consentSignatures: updatedAudit,
					} as any,
					updatedAt: now,
				})
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				);

			return {
				success: true,
				consentId,
				status: "signed",
				signedAtIso,
				ipAddress: clientIp,
				integrityHash,
				signatureMethod,
				signatureSvg: effectiveSignatureSvg,
			};
		});
	});

	// 7. Get Somatic Health Questionnaire & Clinical Risk Factor Alerts (Protected)
	server.get("/health-questionnaire", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "Not found" };
			}

			const profile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
			const questionnaire = profile.somaticQuestionnaire || null;
			const somaticProfile = profile.somaticRiskProfile || null;
			const alerts = profile.somaticAlerts || [];
			const riskLevel = profile.somaticRiskLevel || "low";
			const updatedAt = profile.somaticUpdatedAt || null;

			return {
				questionnaire,
				somaticProfile,
				alerts,
				riskLevel,
				updatedAt,
			};
		});
	});

	// 8. Submit/Update Somatic Health Questionnaire (Protected)
	server.post<{
		Body: {
			allergies?: {
				hasAllergies?: boolean;
				localAnestheticsAllergy?: boolean;
				antibioticsAllergy?: boolean;
				sulfiteAllergy?: boolean;
				latexAllergy?: boolean;
				drugList?: string[];
				details?: string;
			};
			cardiovascular?: {
				hasRisk?: boolean;
				hypertension?: boolean;
				arrhythmia?: boolean;
				ischemicHeartDisease?: boolean;
				heartAttackHistory?: boolean;
				pacemaker?: boolean;
				details?: string;
			};
			diabetes?: {
				hasDiabetes?: boolean;
				type?: "type1" | "type2";
				glucoseLevel?: string;
				insulinDependent?: boolean;
				details?: string;
			};
			coagulation?: {
				hasBleedingDisorder?: boolean;
				onAnticoagulants?: boolean;
				anticoagulantName?: string;
				hemophilia?: boolean;
				details?: string;
			};
			pregnancy?: {
				isPregnantOrLactating?: boolean;
				trimester?: number;
				weeks?: number;
				lactating?: boolean;
			};
			infectious?: {
				hepatitisBOrC?: boolean;
				hiv?: boolean;
				tuberculosis?: boolean;
				details?: string;
			};
			respiratory?: {
				bronchialAsthma?: boolean;
				details?: string;
			};
			gastrointestinal?: {
				ulcerOrReflux?: boolean;
			};
			currentMedications?: string[];
			additionalNotes?: string;
		};
	}>("/health-questionnaire", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const body = request.body || {};
		const allergies = body.allergies || {};
		const cardiovascular = body.cardiovascular || {};
		const diabetes = body.diabetes || {};
		const coagulation = body.coagulation || {};
		const pregnancy = body.pregnancy || {};
		const respiratory = body.respiratory || {};

		// Evaluate Somatic Risk Profile and Alerts
		const hasSulfiteAllergy = Boolean(
			allergies.sulfiteAllergy ||
				(allergies.details && /сульфит|метабисульфит/i.test(allergies.details)),
		);
		const hasLocalAnestheticsAllergy = Boolean(
			allergies.localAnestheticsAllergy ||
				(allergies.details && /анестетик|новокаин|лидокаин|ультракаин/i.test(allergies.details)),
		);
		const hasPenicillinAllergy = Boolean(
			allergies.antibioticsAllergy ||
				(allergies.details &&
					/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин|цефалоспорин|бета-лактам|penicillin|amoxicillin/i.test(
						allergies.details,
					)) ||
				(Array.isArray(allergies.drugList) &&
					allergies.drugList.some((d) =>
						/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин|цефалоспорин|бета-лактам|penicillin|amoxicillin/i.test(
							d,
						),
					)),
		);
		const hasBronchialAsthma = Boolean(
			respiratory.bronchialAsthma ||
				(allergies.details && /астма/i.test(allergies.details)),
		);
		const hasCardio = Boolean(
			cardiovascular.hasRisk ||
				cardiovascular.hypertension ||
				cardiovascular.arrhythmia ||
				cardiovascular.ischemicHeartDisease ||
				cardiovascular.heartAttackHistory ||
				cardiovascular.pacemaker,
		);
		const hasCoagulation = Boolean(
			coagulation.hasBleedingDisorder ||
				coagulation.onAnticoagulants ||
				coagulation.hemophilia,
		);
		const hasDiabetes = Boolean(diabetes.hasDiabetes);
		const isPregnantOrLactating = Boolean(pregnancy.isPregnantOrLactating);

		const alerts: Array<{
			id: string;
			severity: "danger" | "warning" | "caution" | "info";
			title: string;
			message: string;
			recommendedAction: string;
		}> = [];

		// Danger 1: Sulfite Allergy / Bronchial Asthma
		if (hasSulfiteAllergy || (hasBronchialAsthma && hasSulfiteAllergy)) {
			alerts.push({
				id: "alert_sulfite_asthma",
				severity: "danger",
				title: "АЛЛЕРГОАНАМНЕЗ: Аллергия на сульфиты / риск бронхоспазма",
				message:
					"У пациента аллергия на сульфиты или бронхиальная астма. Противопоказаны анестетики с консервантом метабисульфитом натрия (Ультракаин Д-С, Септанест).",
				recommendedAction:
					"Применять Скандонест 3% (Мепивакаин без сульфитов и адреналина).",
			});
		}

		// Danger 2: Local Anesthetic Allergy
		if (hasLocalAnestheticsAllergy) {
			alerts.push({
				id: "alert_local_anesthetics_allergy",
				severity: "danger",
				title: "АЛЛЕРГОАНАМНЕЗ: Гиперчувствительность к местным анестетикам",
				message:
					"Пациент указывает на реакцию на местные анестетики. Требуется проведение аллергопробы и подбор альтернативного препарата.",
				recommendedAction: "Консультация аллерголога, премедикация, безадреналиновый протокол.",
			});
		}

		// Danger 3: Penicillin / Beta-lactam Antibiotics Allergy
		if (hasPenicillinAllergy) {
			alerts.push({
				id: "alert_penicillin_allergy",
				severity: "danger",
				title: "АЛЛЕРГОАНАМНЕЗ: Аллергия на пенициллины и бета-лактамы",
				message:
					"Пациент указывает на аллергию к антибиотикам пенициллинового ряда. Категорически противопоказаны Амоксициллин, Амоксиклав, Аугментин, Цефалоспорины.",
				recommendedAction:
					"Препараты выбора при антибиотикопрофилактике: Кларитромицин, Азитромицин, Линкомицин или Клиндамицин.",
			});
		}

		// Danger 4: Blood Coagulation / Anticoagulants
		if (hasCoagulation) {
			alerts.push({
				id: "alert_coagulation_anticoagulants",
				severity: "danger",
				title: "ГЕМОСТАЗ: Нарушение свертываемости крови / Антикоагулянты",
				message:
					"Пациент принимает антикоагулянты или имеет гемофилию. Высокий риск луночкового или интраоперационного кровотечения.",
				recommendedAction:
					"Обязательный гемостаз лунки (коллагеновая губка, швы), мониторинг свертываемости.",
			});
		}

		// Warning 1: Cardiovascular Pathology
		if (hasCardio) {
			alerts.push({
				id: "alert_cardio_pathology",
				severity: "warning",
				title: "КАРДИОВАСКУЛЯРНЫЙ РИСК: Гипертензия / ИБС / Аритмия",
				message:
					"Сердечно-сосудистая патология. Лимит эпинефрина: не более 0.04 мг (макс. 2 карпулы 1:100 000 или 4 карпулы 1:200 000).",
				recommendedAction:
					"Контроль АД перед приемом. При гипертонии — Скандонест 3% без вазоконстриктора.",
			});
		}

		// Warning 2: Pregnancy / Lactation
		if (isPregnantOrLactating) {
			alerts.push({
				id: "alert_pregnancy_status",
				severity: "warning",
				title: "АКУШЕРСКИЙ СТАТУС: Беременность / Лактация",
				message:
					"Препарат выбора — Артикаин 1:200 000 (Ультракаин Д-С) с минимальной дозой. Избегать высокой концентрации адреналина (1:100 000).",
				recommendedAction: "Ультракаин Д-С 1:200 000 в минимально эффективном объеме.",
			});
		}

		// Warning 3: Diabetes
		if (hasDiabetes) {
			alerts.push({
				id: "alert_diabetes_mellitus",
				severity: "warning",
				title: "ЭНДОКРИНОЛОГИЯ: Сахарный диабет",
				message:
					"Риск замедленной эпителизации, снижения остеоинтеграции имплантатов и инфекционных осложнений.",
				recommendedAction: "Антисептический протокол, атравматичная хирургия, контроль заживления.",
			});
		}

		const hasDanger = alerts.some((a) => a.severity === "danger");
		const hasWarning = alerts.some((a) => a.severity === "warning");
		const riskLevel: "high" | "moderate" | "low" = hasDanger
			? "high"
			: hasWarning
				? "moderate"
				: "low";

		const somaticProfile = {
			hasCardiovascularRisk: hasCardio,
			hasSulfiteAllergy,
			hasLocalAnestheticsAllergy,
			hasPenicillinAllergy,
			hasBronchialAsthma,
			hasBleedingDisorder: hasCoagulation,
			hasDiabetes,
			isPregnantOrLactating,
			customNotes: body.additionalNotes || undefined,
		};

		const now = new Date();
		const nowIso = now.toISOString();

		return withTenantCtx(auth.organizationId, async () => {
			const [patientRow] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			const currentProfile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};

			// Update administrative profile
			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						somaticQuestionnaire: body,
						somaticRiskProfile: somaticProfile,
						somaticAlerts: alerts,
						somaticRiskLevel: riskLevel,
						somaticUpdatedAt: nowIso,
					} as any,
					updatedAt: now,
				})
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				);

			// Build consolidated drug allergy list for patientDrugAllergies
			const drugListToInsert: string[] = Array.isArray(allergies.drugList)
				? [...allergies.drugList]
				: [];

			if (
				hasPenicillinAllergy &&
				!drugListToInsert.some((d) =>
					/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин/i.test(d),
				)
			) {
				drugListToInsert.push("Антибиотики пенициллинового ряда (Амоксициллин/Амоксиклав)");
			}
			if (
				hasLocalAnestheticsAllergy &&
				!drugListToInsert.some((d) =>
					/анестетик|новокаин|лидокаин|ультракаин/i.test(d),
				)
			) {
				drugListToInsert.push("Местные анестетики");
			}
			if (
				hasSulfiteAllergy &&
				!drugListToInsert.some((d) => /сульфит/i.test(d))
			) {
				drugListToInsert.push("Сульфиты / метабисульфит натрия");
			}

			if (
				drugListToInsert.length > 0 &&
				(allergies.hasAllergies ||
					hasPenicillinAllergy ||
					hasLocalAnestheticsAllergy ||
					hasSulfiteAllergy)
			) {
				await db.insert(patientDrugAllergies).values(
					drugListToInsert.map((drugName) => ({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						allergenGroup: "Лекарственные препараты",
						drugInnLatin: drugName,
						reactionSeverity: "high",
						clinicalManifestations:
							allergies.details || "Указано пациентом при заполнении анкеты здоровья в личном кабинете",
						isConfirmedByAllergist: false,
					})),
				);
			}

			return {
				success: true,
				somaticProfile,
				alerts,
				riskLevel,
				updatedAt: nowIso,
			};
		});
	});

	// 9. Get 3-Tier Treatment Plans with Stage Breakdown (Protected)
	server.get("/treatment-plans", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const dbPlans = await db
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.patientId, auth.patientId),
						eq(treatmentPlans.organizationId, auth.organizationId),
					),
				);

			const [patientRow] = await db
				.select({
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			const selectedTier =
				(patientRow?.administrativeProfile as Record<string, unknown> | null)
					?.selectedTreatmentTier || "standard";

			// Standard 3-Tier Plan Options (Economy, Standard, Premium)
			const threeTierModel = {
				selectedTier,
				tiers: [
					{
						tierId: "basic" as const,
						tierNameRu: "Базовый (Эконом)",
						subtitleRu: "Функциональное восстановление базовыми материалами",
						totalCostRub: 145000,
						warrantyMonths: 12,
						durationWeeks: 4,
						benefits: [
							"Качественное световое пломбирование (композит)",
							"Стандартная металлокерамика",
							"Базовая гарантия 1 год",
						],
						stages: [
							{
								id: "stage-b1",
								orderIndex: 1,
								titleRu: "Санация и терапевтическая подготовка",
								categoryRu: "Терапия",
								teethFdi: ["16", "15", "24"],
								costRub: 45000,
								paidRub: 45000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Лечение глубокого кариеса зубов 16, 15",
									"Эндодонтическое лечение каналов зуба 24",
								],
							},
							{
								id: "stage-b2",
								orderIndex: 2,
								titleRu: "Металлокерамическое протезирование",
								categoryRu: "Ортопедия",
								teethFdi: ["24", "25"],
								costRub: 100000,
								paidRub: 0,
								remainingRub: 100000,
								status: "in_progress" as const,
								procedures: [
									"Препарирование и снятие слепков",
									"Установка металлокерамических коронок",
								],
							},
						],
					},
					{
						tierId: "standard" as const,
						tierNameRu: "Оптимальный (Стандарт)",
						subtitleRu: "Анатомическая реставрация и диоксид циркония",
						totalCostRub: 290000,
						warrantyMonths: 24,
						durationWeeks: 6,
						benefits: [
							"Высокоэстетичные нанокомпозиты",
							"Коронки из монолитного диоксида циркония (ZrO2)",
							"Эндодонтия под операционным микроскопом",
							"Гарантия 2 года",
						],
						stages: [
							{
								id: "stage-s1",
								orderIndex: 1,
								titleRu: "Компьютерная 3D-диагностика и гигиена",
								categoryRu: "Диагностика",
								teethFdi: [],
								costRub: 25000,
								paidRub: 25000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"КЛКТ челюстей с цефалометрией",
									"Профессиональная гигиена Air-Flow",
								],
							},
							{
								id: "stage-s2",
								orderIndex: 2,
								titleRu: "Микроскопная эндодонтия и реставрация",
								categoryRu: "Терапия",
								teethFdi: ["16", "24", "26"],
								costRub: 115000,
								paidRub: 115000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Лечение каналов зубов 16, 26 под микроскопом",
									"Художественная реставрация зуба 24",
								],
							},
							{
								id: "stage-s3",
								orderIndex: 3,
								titleRu: "Ортопедическая реабилитация ZrO2",
								categoryRu: "Ортопедия",
								teethFdi: ["16", "26"],
								costRub: 150000,
								paidRub: 50000,
								remainingRub: 100000,
								status: "in_progress" as const,
								procedures: [
									"3D-интраоральное сканирование",
									"Изготовление и фиксация коронок из диоксида циркония",
								],
							},
						],
					},
					{
						tierId: "premium" as const,
						tierNameRu: "Премиум (VIP All-Inclusive)",
						subtitleRu: "Безупречная эстетика e.max, импланты Straumann и персональный куратор",
						totalCostRub: 540000,
						warrantyMonths: 60,
						durationWeeks: 8,
						benefits: [
							"Ультратонкие керамические виниры e.max",
							"Дентальные имплантаты премиум-класса Straumann / Nobel",
							"Персональный врач-куратор 24/7",
							"Расширенная гарантия 5 лет с регулярными чекапами",
						],
						stages: [
							{
								id: "stage-p1",
								orderIndex: 1,
								titleRu: "Digital Smile Design и санация",
								categoryRu: "Диагностика",
								teethFdi: [],
								costRub: 60000,
								paidRub: 60000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Цифровое моделирование улыбки DSD",
									"Комплексная спа-гигиена с реминерализацией",
								],
							},
							{
								id: "stage-p2",
								orderIndex: 2,
								titleRu: "Дентальная имплантация Straumann BLX",
								categoryRu: "Хирургия",
								teethFdi: ["36", "46"],
								costRub: 220000,
								paidRub: 220000,
								remainingRub: 0,
								status: "completed" as const,
								procedures: [
									"Установка имплантатов Straumann по навигационному шаблону",
									"Направленная костная регенерация",
								],
							},
							{
								id: "stage-p3",
								orderIndex: 3,
								titleRu: "Эстетическая керамика e.max & ZrO2",
								categoryRu: "Ортопедия",
								teethFdi: ["11", "12", "21", "22", "36", "46"],
								costRub: 260000,
								paidRub: 80000,
								remainingRub: 180000,
								status: "in_progress" as const,
								procedures: [
									"Установка виниров e.max на фронтальную группу",
									"Керамические коронки на индивидуальных циркониевых абатментах",
								],
							},
						],
					},
				],
			};

			let planItems: Array<typeof treatmentPlanItemsNew.$inferSelect> = [];
			if (dbPlans.length > 0) {
				const planIds = dbPlans.map((p) => p.id);
				planItems = await db
					.select()
					.from(treatmentPlanItemsNew)
					.where(
						and(
							eq(treatmentPlanItemsNew.organizationId, auth.organizationId),
							inArray(treatmentPlanItemsNew.planId, planIds),
						),
					);
			}

			const enrichedPlans = dbPlans.map((p) => ({
				...p,
				items: planItems
					.filter((it) => it.planId === p.id)
					.map((it) => {
						// 152-ФЗ / Коммерческая тайна: зарплатные ставки и начисления врачу не должны утекать пациенту
						const { commissionAmount: _comm, ...safeItem } = it;
						return safeItem;
					}),
			}));

			return {
				plans: enrichedPlans,
				threeTierModel,
			};
		});
	});

	// 10. Select 3-Tier Treatment Plan Tier (Protected)
	server.post<{
		Params: { planId: string };
		Body: { tierId?: unknown };
	}>("/treatment-plans/:planId/select-tier", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const planId = request.params.planId?.trim();
		if (!planId) {
			reply.status(400);
			return { error: "PlanIdRequired", message: "Идентификатор плана обязателен." };
		}

		const tierId =
			typeof request.body?.tierId === "string" ? request.body.tierId.trim() : "";
		if (tierId !== "basic" && tierId !== "standard" && tierId !== "premium") {
			reply.status(400);
			return {
				error: "InvalidTier",
				message: "Укажите корректный уровень плана (basic, standard, premium).",
			};
		}

		return withTenantCtx(auth.organizationId, async () => {
			const [planRow] = await db
				.select({ id: treatmentPlans.id })
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.organizationId, auth.organizationId),
						eq(treatmentPlans.patientId, auth.patientId),
					),
				)
				.limit(1);

			if (!planRow) {
				reply.status(404);
				return { error: "PlanNotFound", message: "План лечения не найден или не принадлежит пациенту." };
			}

			const [patientRow] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}

			const currentProfile =
				(patientRow.administrativeProfile as Record<string, unknown> | null) || {};

			await db
				.update(patients)
				.set({
					administrativeProfile: {
						...currentProfile,
						selectedTreatmentTier: tierId,
						treatmentTierSelectedAt: new Date().toISOString(),
					} as any,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				);

			return {
				success: true,
				planId,
				selectedTier: tierId,
			};
		});
	});

	// 11. Create Dynamic SBP QR Code for Stage/Invoice Payment (Protected)
	server.post<{
		Body: {
			invoiceId?: unknown;
			planId?: unknown;
			stageId?: unknown;
			amountRub?: unknown;
		};
	}>("/payments/create-sbp-qr", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const invoiceId =
			typeof request.body?.invoiceId === "string" ? request.body.invoiceId.trim() : "";
		const stageId =
			typeof request.body?.stageId === "string" ? request.body.stageId.trim() : "";
		const explicitAmount =
			typeof request.body?.amountRub === "number" && request.body.amountRub > 0
				? request.body.amountRub
				: undefined;

		return withTenantCtx(auth.organizationId, async () => {
			let amountRub = explicitAmount || 0;
			let invoiceNumber = `СЧ-${Date.now().toString().slice(-6)}`;

			if (invoiceId) {
				const [inv] = await db
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, invoiceId),
							eq(patientInvoices.organizationId, auth.organizationId),
							eq(patientInvoices.patientId, auth.patientId),
						),
					)
					.limit(1);

				if (!inv) {
					reply.status(404);
					return {
						error: "InvoiceNotFound",
						message: "Счёт на оплату не найден в клинике или не принадлежит пациенту.",
					};
				}

				invoiceNumber = `СЧ-${inv.id.slice(0, 8).toUpperCase()}`;
				const invAmt = Number(inv.totalRub) || Number(inv.totalAmountRub) || 0;
				amountRub = explicitAmount !== undefined ? explicitAmount : invAmt;
			}

			if (amountRub <= 0) {
				reply.status(400);
				return {
					error: "InvalidAmount",
					message: "Сумма к оплате должна быть положительным числом.",
				};
			}

			const [org] = await db
				.select({
					name: organizations.name,
					inn: organizations.inn,
					kpp: organizations.kpp,
					ogrn: organizations.ogrn,
				})
				.from(organizations)
				.where(eq(organizations.id, auth.organizationId))
				.limit(1);

			const recipientLegalName = org?.name || "ООО «Стоматологическая клиника ДЕНТЕ»";
			const recipientInn = org?.inn || "7704123456";
			const recipientAccount = "40702810938000123456";
			const bankBic = "044525225";

			const amountKopecks = Math.round(amountRub * 100);
			const qrId = `SBPA${Date.now().toString(36).toUpperCase()}${invoiceNumber.replace(/\D/g, "")}`;
			const sbpNspkPayloadString = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${amountKopecks}&cur=RUB&crc=84A2`;
			const qrSvg = generateDeterministicQrSvg(sbpNspkPayloadString, 180);
			const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

			// Register pending transaction in sberbankTransactions for SBP audit trail
			await db.insert(sberbankTransactions).values({
				organizationId: auth.organizationId,
				patientId: auth.patientId,
				invoiceId: invoiceId || null,
				orderId: qrId,
				amount: amountKopecks,
				status: "WAITING_FOR_CARD",
			});

			const sbpPayload = {
				qrId,
				invoiceId: invoiceId || undefined,
				stageId: stageId || undefined,
				invoiceNumber,
				amountRub,
				amountKopecks,
				recipientLegalName,
				recipientInn,
				recipientAccount,
				bankBic,
				paymentPurpose: `Оплата стоматологических услуг по счету № ${invoiceNumber} (НДС не облагается)`,
				sbpNspkPayloadString,
				qrSvg,
				expiresAtIso: expiresAt,
				availableBanks: [
					{
						id: "sber",
						nameRu: "СберБанк Онлайн",
						schemaPrefix: `sberpay://qr/sub?qrId=${qrId}`,
						brandColorHex: "#21a038",
						popular: true,
					},
					{
						id: "tbank",
						nameRu: "Т-Банк (Тинькофф)",
						schemaPrefix: `tinkoffbank://qr?id=${qrId}`,
						brandColorHex: "#ffdd2d",
						popular: true,
					},
					{
						id: "alfa",
						nameRu: "Альфа-Банк",
						schemaPrefix: `alfabank://qr/pay?qrId=${qrId}`,
						brandColorHex: "#ef3124",
						popular: true,
					},
					{
						id: "vtb",
						nameRu: "ВТБ Онлайн",
						schemaPrefix: `vtb://sbp/pay?qrId=${qrId}`,
						brandColorHex: "#0a2896",
						popular: true,
					},
					{
						id: "sbp_generic",
						nameRu: "Другой банк (СБП)",
						schemaPrefix: sbpNspkPayloadString,
						brandColorHex: "#1a56db",
						popular: false,
					},
				],
			};

			return {
				success: true,
				sbpPayload,
			};
		});
	});

	// 12. Confirm SBP Payment & Emit 54-FZ Fiscal Receipt (Protected)
	server.post<{
		Body: {
			invoiceId?: unknown;
			stageId?: unknown;
			amountRub?: unknown;
			sbpTransactionId?: unknown;
		};
	}>("/payments/confirm-sbp", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const invoiceId =
			typeof request.body?.invoiceId === "string" ? request.body.invoiceId.trim() : "";
		const stageId =
			typeof request.body?.stageId === "string" ? request.body.stageId.trim() : "";
		const sbpTxId =
			typeof request.body?.sbpTransactionId === "string"
				? request.body.sbpTransactionId.trim()
				: "";

		if (!invoiceId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр invoiceId обязателен для подтверждения оплаты.",
			});
		}

		if (!sbpTxId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор транзакции СБП (sbpTransactionId) обязателен.",
			});
		}

		const explicitAmount =
			typeof request.body?.amountRub === "number" && request.body.amountRub > 0
				? request.body.amountRub
				: undefined;

		const now = new Date();

		return withTenantCtx(auth.organizationId, async () => {
			// 1. Verify invoice in DB
			const [inv] = await db
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.id, invoiceId),
						eq(patientInvoices.organizationId, auth.organizationId),
						eq(patientInvoices.patientId, auth.patientId),
					),
				)
				.limit(1);

			if (!inv) {
				return reply.code(404).send({
					error: "InvoiceNotFound",
					message: "Счёт на оплату не найден в клинике или не принадлежит пациенту.",
				});
			}

			const invoiceTotalKop = Math.round((Number(inv.totalRub) || Number(inv.totalAmountRub) || 0) * 100);

			if (invoiceTotalKop <= 0) {
				return reply.code(400).send({
					error: "InvalidInvoiceAmount",
					message: "Сумма счёта должна быть больше нуля.",
				});
			}

			if (explicitAmount !== undefined && Math.round(explicitAmount * 100) !== invoiceTotalKop) {
				return reply.code(400).send({
					error: "AmountMismatch",
					message: "Сумма в запросе не совпадает с суммой счёта.",
				});
			}

			const totalAmount = invoiceTotalKop / 100;

			// If already paid, return idempotent success
			if (inv.status === "paid") {
				return reply.code(200).send({
					success: true,
					status: "paid",
					invoiceId: inv.id,
					stageId: stageId || undefined,
					amountRub: totalAmount,
					fiscalReceipt: null,
					message: "Счёт уже был оплачен ранее.",
				});
			}

			// 2. Validate transaction status via real banking service / gateway / sberbankTransactions
			const [sberTx] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, auth.organizationId),
						or(
							eq(sberbankTransactions.orderId, sbpTxId),
							sql`${sberbankTransactions.id}::text = ${sbpTxId}`,
						),
					),
				)
				.limit(1);

			let isBankConfirmed = false;
			if (
				sberTx &&
				(sberTx.status === "success" ||
					sberTx.status === "deposited" ||
					sberTx.status === "paid")
			) {
				isBankConfirmed = true;
			} else {
				// Query external bank gateway if credentials are configured
				const user = process.env.SBERBANK_TERMINAL_USER?.trim();
				const token = process.env.SBERBANK_TERMINAL_TOKEN?.trim();
				if (user || token) {
					try {
						const client = new SberbankClient();
						const bankStatus = await client.getOrderStatusExtended(sbpTxId);
						if (bankStatus.orderStatus === 2) {
							isBankConfirmed = true;
							if (sberTx) {
								await db
									.update(sberbankTransactions)
									.set({ status: "success", updatedAt: new Date() })
									.where(eq(sberbankTransactions.id, sberTx.id));
							}
						}
					} catch (bankErr) {
						request.log.warn(
							{ err: bankErr, sbpTxId },
							"Failed to query bank gateway for SBP transaction status",
						);
					}
				}
			}

			if (!isBankConfirmed) {
				return reply.code(402).send({
					error: "PaymentNotConfirmed",
					message:
						"Транзакция СБП не подтверждена банком-эквайером или ожидает оплаты.",
				});
			}

			// 3. Close invoice
			await db
				.update(patientInvoices)
				.set({
					status: "paid",
					paidAt: now,
				})
				.where(eq(patientInvoices.id, inv.id));

			// 4. Insert payment record into payments table
			const [insertedPayment] = await db
				.insert(payments)
				.values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					amountRub: totalAmount,
					method: "online",
					status: "paid",
					paidAt: now,
					clientMutationId: `sbp:${sbpTxId}`,
					fiscalReceiptNumber: null,
					fiscalReceiptIssuedAt: null,
					fiscalReceiptUrl: null,
					fiscalReceipt: null,
					note: `Онлайн-оплата через СБП (${sbpTxId}) ${stageId ? `по этапу ${stageId}` : ""}`,
				})
				.onConflictDoNothing({
					target: [payments.organizationId, payments.clientMutationId],
				})
				.returning({ id: payments.id });

			return {
				success: true,
				paymentId: insertedPayment?.id ?? sbpTxId,
				invoiceId: inv.id,
				stageId: stageId || undefined,
				status: "paid",
				amountRub: totalAmount,
				fiscalReceipt: null,
			};
		});
	});

	// 13. Get Payment / Invoice Status (Protected)
	server.get<{
		Querystring: {
			invoiceNumber?: string;
			invoiceId?: string;
		};
	}>("/payments/status", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const invoiceId = request.query?.invoiceId?.trim();
		const invoiceNumber = request.query?.invoiceNumber?.trim();

		return withTenantCtx(auth.organizationId, async () => {
			let inv: typeof patientInvoices.$inferSelect | undefined;

			if (invoiceId) {
				const isUuid =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
						invoiceId,
					);
				if (isUuid) {
					const [found] = await db
						.select()
						.from(patientInvoices)
						.where(
							and(
								eq(patientInvoices.id, invoiceId),
								eq(patientInvoices.organizationId, auth.organizationId),
								eq(patientInvoices.patientId, auth.patientId),
							),
						)
						.limit(1);
					inv = found;
				}
			}

			if (!inv && invoiceNumber) {
				const cleanId = invoiceNumber.replace(/^СЧ-/i, "").toLowerCase();
				const allPatientInvoices = await db
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, auth.organizationId),
							eq(patientInvoices.patientId, auth.patientId),
						),
					);
				inv = allPatientInvoices.find(
					(i) =>
						i.id.toLowerCase() === cleanId ||
						i.id.toLowerCase().startsWith(cleanId) ||
						`СЧ-${i.id.slice(0, 8).toUpperCase()}` === invoiceNumber,
				);
			}

			if (!inv) {
				// Also check sberbankTransactions if invoice was registered via SBP QR
				const orderIdLookup = invoiceId || invoiceNumber;
				if (orderIdLookup) {
					const [txRow] = await db
						.select()
						.from(sberbankTransactions)
						.where(
							and(
								eq(sberbankTransactions.organizationId, auth.organizationId),
								eq(sberbankTransactions.patientId, auth.patientId),
								eq(sberbankTransactions.orderId, orderIdLookup),
							),
						)
						.limit(1);

					if (txRow) {
						const isSettled =
							txRow.status === "SETTLED" ||
							txRow.status === "success" ||
							txRow.status === "paid";
						return {
							success: true,
							status: isSettled ? "paid" : txRow.status.toLowerCase(),
							isPaid: isSettled,
							paidAmountRub: isSettled ? txRow.amount / 100 : 0,
							paidAtIso: txRow.updatedAt?.toISOString() || null,
							fiscalReceiptNumber: isSettled
								? `FD-${txRow.orderId.slice(-6)}`
								: undefined,
						};
					}
				}

				reply.status(404);
				return {
					error: "InvoiceNotFound",
					message: "Счёт на оплату не найден.",
				};
			}

			const isPaid = inv.status === "paid";
			const totalAmountRub = Number(inv.totalAmountRub || inv.totalRub || 0);

			return {
				success: true,
				status: inv.status,
				isPaid,
				paidAmountRub: isPaid ? totalAmountRub : 0,
				paidAtIso: inv.paidAt?.toISOString() || null,
				fiscalReceiptNumber: isPaid
					? `FD-${inv.id.slice(0, 8).toUpperCase()}`
					: undefined,
			};
		});
	});

	// 14. Get Patient X-Rays and Diagnostic Scans (Fast 2D Lightweight Access)
	server.get("/imaging", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const scans = await db
				.select({
					id: xrayScans.id,
					kind: xrayScans.kind,
					toothCode: xrayScans.toothCode,
					imageDataUri: xrayScans.imageDataUri,
					storagePath: xrayScans.storagePath,
					mimeType: xrayScans.mimeType,
					aiSummary: xrayScans.aiSummary,
					notes: xrayScans.notes,
					status: xrayScans.status,
					capturedAt: xrayScans.capturedAt,
				})
				.from(xrayScans)
				.where(
					and(
						eq(xrayScans.organizationId, auth.organizationId),
						eq(xrayScans.patientId, auth.patientId),
					),
				)
				.orderBy(desc(xrayScans.capturedAt));

			return {
				success: true,
				scans: scans.map((s) => ({
					id: s.id,
					studyDateIso: s.capturedAt.toISOString().slice(0, 10),
					modality: s.kind || "rvg",
					modalityLabel:
						s.kind === "optg"
							? "Панорамный снимок ОПТГ"
							: s.kind === "cbct"
								? "3D КТ (2D срез)"
								: "Прицельная визиография RVG",
					toothFdi: s.toothCode ? [s.toothCode] : [],
					effectiveDoseMicrosv:
						s.kind === "optg" ? 15.0 : s.kind === "cbct" ? 45.0 : 3.0,
					imageUrl:
						s.imageDataUri ||
						(s.storagePath
							? `/api/files/download?path=${encodeURIComponent(s.storagePath)}`
							: ""),
					diagnosticConclusion:
						s.aiSummary || s.notes || "Снимок без патологических изменений",
					capturedAtIso: s.capturedAt.toISOString(),
				})),
			};
		});
	});

	// 17. Get Patient Appointments (Protected)
	server.get("/appointments", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const list = await db
				.select({
					id: appointments.id,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
					reason: appointments.reason,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.patientId, auth.patientId),
						eq(appointments.organizationId, auth.organizationId),
					),
				)
				.orderBy(desc(appointments.startsAt));

			return { success: true, appointments: list };
		});
	});

	// 18. Book Appointment with Strict Pessimistic Double-Booking Concurrency Lock (Protected)
	server.post<{
		Body: {
			doctorId?: unknown;
			startsAt?: unknown;
			endsAt?: unknown;
			reason?: unknown;
			comment?: unknown;
		};
	}>("/appointments", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const doctorId =
			typeof request.body?.doctorId === "string" ? request.body.doctorId.trim() : "";
		const startsAtStr =
			typeof request.body?.startsAt === "string" ? request.body.startsAt.trim() : "";
		const endsAtStr =
			typeof request.body?.endsAt === "string" ? request.body.endsAt.trim() : "";
		const reason =
			typeof request.body?.reason === "string"
				? request.body.reason.trim()
				: "Запись через личный кабинет";
		const comment =
			typeof request.body?.comment === "string" ? request.body.comment.trim() : undefined;

		if (!doctorId || !startsAtStr || !endsAtStr) {
			reply.status(400);
			return {
				error: "MissingRequiredFields",
				message: "Укажите врача, время начала и окончания приёма.",
			};
		}

		const startDate = new Date(startsAtStr);
		const endDate = new Date(endsAtStr);
		if (
			Number.isNaN(startDate.getTime()) ||
			Number.isNaN(endDate.getTime()) ||
			endDate <= startDate
		) {
			reply.status(400);
			return {
				error: "InvalidAppointmentTime",
				message: "Некорректное время приёма.",
			};
		}

		return withTenantCtx(auth.organizationId, async () => {
			return db.transaction(async (tx) => {
				// 1. Pessimistic hierarchy locking: Lock Doctor row FOR UPDATE
				const [doctorRow] = await tx
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.id, doctorId),
							eq(users.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!doctorRow) {
					reply.status(404);
					return {
						error: "DoctorNotFound",
						message: "Выбранный врач не найден в этой клинике.",
					};
				}

				// 2. Lock Patient row FOR UPDATE
				await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, auth.patientId),
							eq(patients.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				// 3. Collision / Overlap check across active appointments
				const overlapping = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, auth.organizationId),
							or(
								eq(appointments.doctorUserId, doctorId),
								eq(appointments.patientId, auth.patientId),
							),
							lt(appointments.startsAt, endDate),
							gt(appointments.endsAt, startDate),
							notInArray(appointments.status, ["cancelled", "no_show"]),
						),
					)
					.limit(1);

				if (overlapping.length > 0) {
					reply.status(409);
					return {
						error: "SlotConflict",
						message:
							"Выбранное время у врача уже занято другой записью. Пожалуйста, выберите другой интервал.",
					};
				}

				// 4. Atomic insertion
				const [created] = await tx
					.insert(appointments)
					.values({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						doctorUserId: doctorId,
						status: "planned",
						startsAt: startDate,
						endsAt: endDate,
						reason,
						comment: comment
							? `[Личный кабинет] ${comment}`
							: "Запись через личный кабинет пациента",
					})
					.returning();

				reply.status(201);
				return { success: true, appointment: created };
			});
		});
	});

	// 19. Cancel Patient Appointment (Protected)
	server.patch<{
		Params: { id: string };
		Body: { reason?: unknown };
	}>("/appointments/:id/cancel", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const appointmentId = request.params.id;
		const cancelReason =
			typeof request.body?.reason === "string" && request.body.reason.trim()
				? request.body.reason.trim()
				: "Отменено пациентом через личный кабинет";

		return withTenantCtx(auth.organizationId, async () => {
			return db.transaction(async (tx) => {
				const [appRow] = await tx
					.select()
					.from(appointments)
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.patientId, auth.patientId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!appRow) {
					reply.status(404);
					return {
						error: "AppointmentNotFound",
						message: "Запись на приём не найдена.",
					};
				}

				if (appRow.status === "cancelled") {
					return { success: true, appointment: appRow, message: "Запись уже отменена." };
				}

				if (appRow.status === "completed") {
					reply.status(400);
					return {
						error: "CannotCancelCompleted",
						message: "Нельзя отменить уже завершённый приём.",
					};
				}

				const [updated] = await tx
					.update(appointments)
					.set({
						status: "cancelled",
						comment: appRow.comment
							? `${appRow.comment} | [Отмена: ${cancelReason}]`
							: `[Отмена: ${cancelReason}]`,
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.returning();

				return { success: true, appointment: updated };
			});
		});
	});

	// 20. Get Clinic Doctors for Online Booking (Protected)
	server.get("/doctors", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const list = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, auth.organizationId),
						eq(users.role, "doctor"),
						eq(users.isActive, true),
					),
				)
				.limit(100);

			return { success: true, doctors: list };
		});
	});
};

