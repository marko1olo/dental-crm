import { randomInt } from "node:crypto";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireAuthTokenSecret } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	generatedDocuments,
	patientInvoices,
	patients,
	portalOtpCodes,
	treatmentPlans,
	visitDiaries,
} from "../db/schema.js";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../db/documentQuery.js";
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

function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === "production";
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
	const found = await db
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
				typeof request.body?.phone === "string" ? request.body.phone.trim() : "";
			if (!rawPhone) {
				return reply
					.status(400)
					.send({ error: "PhoneRequired", message: "Укажите номер телефона." });
			}

			const smsConfigured = readSmsCredentialsFromEnv() !== null;
			/*
			 * Ветка для разработки. Условия, при которых она допустима, выполнены
			 * все три: она физически недостижима при NODE_ENV=production, код в ней
			 * генерируется на каждый запрос тем же CSPRNG (никаких «0000»), и о её
			 * срабатывании громко пишется в журнал сервера. Код уходит ТОЛЬКО в
			 * журнал — в теле HTTP-ответа его нет даже здесь.
			 */
			const developerLogFallback = !smsConfigured && !isProductionRuntime();

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
				delivery: developerLogFallback ? ("developer_log" as const) : ("sms" as const),
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
					{ requiredEnv: ["DENTE_SMS_PROVIDER", "учётные данные выбранного SMS-провайдера"] },
					"Вход пациента в личный кабинет отклонён: SMS-шлюз не настроен в окружении сервера",
				);
				return reply.status(503).send({
					error: "OtpDeliveryNotConfigured",
					message:
						"Вход в личный кабинет по коду из СМС сейчас не работает: клиника не подключила отправку СМС. Позвоните в клинику — записаться на приём и узнать план лечения можно у администратора.",
				});
			}

			const patient = await findUniquePatientByPhone(rawPhone);
			if (!patient) return reply.status(202).send(neutralAccepted);

			const now = new Date();
			if (
				await isIssuanceThrottled(
					patient.organizationId,
					patient.id,
					policy,
					now,
				)
			) {
				// Тоже нейтральный ответ: 429 именно здесь снова отличал бы
				// существующего пациента от несуществующего.
				return reply.status(202).send(neutralAccepted);
			}

			const code = generateNumericCode(policy.codeLength);
			const codeHash = await hashCredential(code);

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
			const issuedId = inserted[0]?.id;
			if (!issuedId) {
				return reply.status(500).send({
					error: "OtpNotIssued",
					message: "Не удалось выдать код входа. Повторите попытку.",
				});
			}

			if (developerLogFallback) {
				request.log.warn(
					{ portalOtpDeveloperCode: code, patientId: patient.id },
					"РЕЖИМ РАЗРАБОТКИ: SMS-шлюз не настроен, одноразовый код входа в личный кабинет выведен в журнал сервера и никому не отправлен. При NODE_ENV=production эта ветка недостижима.",
				);
				await db
					.update(portalOtpCodes)
					.set({ deliveryStatus: "sent" })
					.where(eq(portalOtpCodes.id, issuedId));
				return reply.status(202).send(neutralAccepted);
			}

			const msisdn = normalizeRussianMsisdn(patient.phone);
			const credentials = await resolveChannelCredentials(
				patient.organizationId,
			);
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
				await db
					.update(portalOtpCodes)
					.set({
						deliveryStatus: "failed",
						deliveryErrorClass: delivery.errorClass,
					})
					.where(eq(portalOtpCodes.id, issuedId));
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
				return reply
					.status(delivery.errorClass === "not_configured" ? 503 : 502)
					.send({
						error: "OtpDeliveryFailed",
						errorClass: delivery.errorClass,
						message: `Не удалось отправить код: ${delivery.errorMessage}`,
					});
			}

			await db
				.update(portalOtpCodes)
				.set({ deliveryStatus: "sent" })
				.where(eq(portalOtpCodes.id, issuedId));
			return reply.status(202).send(neutralAccepted);
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
				typeof request.body?.phone === "string" ? request.body.phone.trim() : "";
			const code =
				typeof request.body?.code === "string" ? request.body.code.trim() : "";
			if (!rawPhone || !code) {
				return reply.status(400).send({
					error: "PhoneAndCodeRequired",
					message: "Укажите номер телефона и код из SMS.",
				});
			}

			const policy = readPortalOtpPolicy();
			const patient = await findUniquePatientByPhone(rawPhone);
			if (!patient) return reply.status(401).send(invalidOtp);

			const now = new Date();
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
			const candidate = active[0];
			if (!candidate) return reply.status(401).send(invalidOtp);

			// Счётчик растёт ДО сверки. Если увеличивать после, оборванное на
			// середине соединение даёт бесплатную попытку, и потолок обходится.
			const counted = await db
				.update(portalOtpCodes)
				.set({ attemptCount: sql`${portalOtpCodes.attemptCount} + 1` })
				.where(eq(portalOtpCodes.id, candidate.id))
				.returning({ attemptCount: portalOtpCodes.attemptCount });
			const attemptNumber = counted[0]?.attemptCount ?? policy.maxAttempts + 1;

			if (attemptNumber > policy.maxAttempts) {
				// Код сжигается целиком: после исчерпания попыток он не примется
				// даже верным. Пауза не помогла бы — перебор продолжился бы после неё.
				await db
					.update(portalOtpCodes)
					.set({ consumedAt: now })
					.where(
						and(
							eq(portalOtpCodes.id, candidate.id),
							isNull(portalOtpCodes.consumedAt),
						),
					);
				return reply.status(401).send(invalidOtp);
			}

			if (!(await verifyCredential(code, candidate.codeHash))) {
				return reply.status(401).send(invalidOtp);
			}

			/*
			 * Однократность обеспечивается условным UPDATE, а не проверкой перед
			 * ним: два одновременных запроса с верным кодом иначе оба прошли бы
			 * проверку «ещё не использован» и оба получили бы сессию. Здесь
			 * выигрывает ровно один — второй не увидит ни одной обновлённой строки.
			 */
			const consumed = await db
				.update(portalOtpCodes)
				.set({ consumedAt: now })
				.where(
					and(
						eq(portalOtpCodes.id, candidate.id),
						isNull(portalOtpCodes.consumedAt),
					),
				)
				.returning({ id: portalOtpCodes.id });
			if (consumed.length !== 1) return reply.status(401).send(invalidOtp);

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
		if (!authHeader?.startsWith("Bearer "))
			return reply.status(401).send({ error: "Unauthorized" });

		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) return reply.status(401).send({ error: "Unauthorized" });

		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
			return reply.status(401).send({ error: "Invalid token" });
		}
		const patientId = payload.sub;
		const organizationId = payload.organizationId as string;

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
		if (!patient) return reply.status(404).send({ error: "Not found" });

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

	// 4. View Document HTML (Protected)
	server.get<{ Params: { documentId: string } }>(
		"/documents/:documentId/html",
		async (request, reply) => {
			const authHeader = request.headers.authorization;
			if (!authHeader?.startsWith("Bearer "))
				return reply.status(401).send({ error: "Unauthorized" });

			const token = authHeader.slice("Bearer ".length).trim();
			if (!token) return reply.status(401).send({ error: "Unauthorized" });

			const payload = verifyToken(token, requireAuthTokenSecret());
			if (
				!payload ||
				payload.kind !== PORTAL_TOKEN_KIND ||
				typeof payload.sub !== "string" ||
				typeof payload.organizationId !== "string"
			) {
				return reply.status(401).send({ error: "Invalid token" });
			}
			const patientId = payload.sub;
			const organizationId = payload.organizationId as string;

			const document = await getDocumentById(
				organizationId,
				request.params.documentId,
			);

			if (!document || document.patientId !== patientId || document.status !== "issued") {
				return reply.status(404).send({ error: "Not found" });
			}

			const issuedSnapshot = readIssuedDocumentSnapshot(document);
			if (!issuedSnapshot) {
				return reply
					.status(409)
					.send({ error: "Архивная копия документа отсутствует" });
			}

			return reply.type("text/html; charset=utf-8").send(issuedSnapshot);
		},
	);
};
