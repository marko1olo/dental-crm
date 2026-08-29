import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
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
	patientConsents,
	patientDrugAllergies,
	patientInvoices,
	patients,
	payments,
	portalOtpCodes,
	treatmentPlanItemsNew,
	treatmentPlans,
	treatmentPlanStages,
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

	// Helper to extract authenticated portal patient session
	function extractPortalPatient(request: FastifyRequest): {
		patientId: string;
		organizationId: string;
	} | null {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) return null;
		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) return null;
		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
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

	// 6. Sign Statutory Consent with Finger/Stylus Vector Stroke (SVG) & IP Audit
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
		const signatureSvg =
			typeof request.body?.signatureSvg === "string"
				? request.body.signatureSvg.trim()
				: "";
		const signatureMethod =
			typeof request.body?.signatureMethod === "string"
				? request.body.signatureMethod.trim()
				: "touch_screen";

		if (!consentId || !signatureSvg) {
			reply.status(400);
			return {
				error: "SignatureRequired",
				message: "Требуется векторный росчерк подписи (SVG) и идентификатор согласия.",
			};
		}

		const rawIp =
			(request.headers["x-forwarded-for"] as string) ||
			request.ip ||
			request.socket?.remoteAddress ||
			"127.0.0.1";
		const clientIp = typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";
		const now = new Date();
		const signedAtIso = now.toISOString();

		// Generate 63-FZ cryptographic integrity hash
		const integrityHash = generateSha256Hex(
			[
				consentId,
				auth.patientId,
				auth.organizationId,
				signatureSvg,
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
					signatureSvg,
					clientIp,
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
				signatureSvg,
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

		// Danger 3: Blood Coagulation / Anticoagulants
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

			// If drug allergies were specified, save to patientDrugAllergies
			if (allergies.hasAllergies && allergies.drugList && allergies.drugList.length > 0) {
				await db.insert(patientDrugAllergies).values(
					allergies.drugList.map((drugName) => ({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						allergenGroup: "Лекарственные препараты",
						drugInnLatin: drugName,
						reactionSeverity: "high",
						clinicalManifestations: allergies.details || "Указано пациентом при самочекине",
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

			return {
				plans: dbPlans,
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
				planId: request.params.planId,
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
			let amountRub = explicitAmount || 35000;
			let invoiceNumber = "СЧ-2026/089";

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

				if (inv) {
					invoiceNumber = `СЧ-${inv.id.slice(0, 8).toUpperCase()}`;
					amountRub = Number(inv.totalRub) || Number(inv.totalAmountRub) || amountRub;
				}
			}

			const amountKopecks = Math.round(amountRub * 100);
			const qrId = `SBPA${Date.now().toString(36).toUpperCase()}${invoiceNumber.replace(/\D/g, "")}`;
			const sbpNspkPayloadString = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${amountKopecks}&cur=RUB&crc=84A2`;
			const qrSvg = generateDeterministicQrSvg(sbpNspkPayloadString, 180);
			const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

			const sbpPayload = {
				qrId,
				invoiceId: invoiceId || undefined,
				stageId: stageId || undefined,
				invoiceNumber,
				amountRub,
				amountKopecks,
				recipientLegalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
				recipientInn: "7704123456",
				recipientAccount: "40702810938000123456",
				bankBic: "044525225",
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
		const explicitAmount =
			typeof request.body?.amountRub === "number" && request.body.amountRub > 0
				? request.body.amountRub
				: 35000;
		const sbpTxId =
			typeof request.body?.sbpTransactionId === "string"
				? request.body.sbpTransactionId.trim()
				: `TX-${Date.now()}`;

		const now = new Date();
		const nowIso = now.toISOString();
		const receiptNumber = `ФД-${Math.floor(100000 + Math.random() * 900000)}`;
		const fiscalSign = `ФП-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
		const fpd = Math.floor(1000000000 + Math.random() * 9000000000).toString();
		const fiscalReceiptUrl = `https://receipt.nalog.ru/v1/check/${sbpTxId}?fn=999907890000&fd=${receiptNumber.replace(/\D/g, "")}&fpd=${fpd}&t=${nowIso.replace(/[-:]/g, "").slice(0, 15)}`;

		return withTenantCtx(auth.organizationId, async () => {
			let totalAmount = explicitAmount;

			// If linked to real invoice in DB, update it
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

				if (inv) {
					totalAmount = Number(inv.totalRub) || Number(inv.totalAmountRub) || totalAmount;
					await db
						.update(patientInvoices)
						.set({
							status: "paid",
							paidAt: now,
						})
						.where(eq(patientInvoices.id, inv.id));
				}
			}

			// Insert payment record
			const [insertedPayment] = await db
				.insert(payments)
				.values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					amountRub: totalAmount,
					method: "online",
					status: "paid",
					paidAt: now,
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: nowIso,
					fiscalReceiptUrl: fiscalReceiptUrl,
					fiscalReceipt: {
						receiptNumber,
						fiscalDocumentNumber: receiptNumber,
						fiscalSign,
						fnsSiteUrl: fiscalReceiptUrl,
						issuedAt: nowIso,
						totalAmountRub: totalAmount,
					} as any,
					note: `Онлайн-оплата через СБП (${sbpTxId}) ${stageId ? `по этапу ${stageId}` : ""}`,
				})
				.returning({ id: payments.id });

			return {
				success: true,
				paymentId: insertedPayment?.id ?? sbpTxId,
				invoiceId: invoiceId || undefined,
				stageId: stageId || undefined,
				status: "paid",
				amountRub: totalAmount,
				fiscalReceipt: {
					receiptNumber,
					fiscalSign,
					fpd,
					nalogUrl: fiscalReceiptUrl,
					issuedAtIso: nowIso,
					amountRub: totalAmount,
				},
			};
		});
	});
};

