import { randomInt } from "node:crypto";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
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
	generatedDocuments,
	patientInvoices,
	patients,
	portalOtpCodes,
	treatmentPlans,
	visitDiaries,
} from "../db/schema.js";
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

// Patient portal sessions are short-lived; the patient re-authenticates via OTP.
const PORTAL_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const PORTAL_TOKEN_KIND = "portal";

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
		// Пять кодов в час на пациента: больше — это уже не забывчивость, а
		// перебор или попытка сжечь баланс шлюза.
		maxPerWindow: readBoundedInt("DENTE_PORTAL_OTP_MAX_PER_WINDOW", 5, 3, 20),
		windowSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_WINDOW_SECONDS",
			3600,
			300,
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
async function findUniquePatientByPhone(rawPhone: string): Promise<{
	id: string;
	organizationId: string;
	phone: string | null;
} | null> {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length < 10) return null;
	const suffix = digits.slice(-10);
	const found = await withSuperuserBypass(async (tx) => {
		return tx
			.select({
				id: patients.id,
				organizationId: patients.organizationId,
				phone: patients.phone,
			})
			.from(patients)
			.where(
				sql`regexp_replace(${patients.phone}, '\\D', '', 'g') LIKE ${`%${suffix}`}`,
			)
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
	// 1. Send OTP
	server.post<{ Body: { phone?: unknown } }>(
		"/auth/send-otp",
		async (request, reply) => {
			const policy = readPortalOtpPolicy();
			const rawPhone =
				typeof request.body?.phone === "string"
					? request.body.phone.trim()
					: "";
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

			const patient = await findUniquePatientByPhone(rawPhone);
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
	server.post<{ Body: { phone?: unknown; code?: unknown } }>(
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
			if (!rawPhone || !code) {
				reply.status(400);
				return {
					error: "PhoneAndCodeRequired",
					message: "Укажите номер телефона и код из SMS.",
				};
			}

			const policy = readPortalOtpPolicy();
			const patient = await findUniquePatientByPhone(rawPhone);
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
				.where(eq(visitDiaries.patientId, patient.id));
			const plans = await db
				.select()
				.from(treatmentPlans)
				.where(eq(treatmentPlans.patientId, patient.id));
			const invoices = await db
				.select()
				.from(patientInvoices)
				.where(eq(patientInvoices.patientId, patient.id));
			const documents = await db
				.select()
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.patientId, patient.id),
						eq(generatedDocuments.status, "issued"),
					),
				);

			return {
				patient,
				visits,
				plans,
				invoices,
				documents,
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
};
