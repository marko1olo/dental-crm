/**
 * Ссылки «подтвердить» и «отменить» в напоминании о приёме.
 *
 * ЗАЧЕМ ЭТО САМОЕ ПОЛЕЗНОЕ, ЧТО МОЖНО ДОБАВИТЬ К НАПОМИНАНИЮ
 * Напоминание уменьшает неявки, но не отвечает на вопрос «придёт ли». Пациент,
 * который не может прийти, обычно просто не отвечает: звонить в клинику
 * неудобно, а промолчать легко. Клиника узнаёт об этом по пустому креслу. Одно
 * касание в SMS меняет исход: подтвердил — администратор не тратит утро на
 * обзвон; отменил — слот освобождается заранее и его можно продать.
 *
 * ПОЧЕМУ КОРОТКИЙ КОД, А НЕ ПОДПИСАННЫЙ ТОКЕН В АДРЕСЕ
 * Первая версия несла HMAC-токен с полезной нагрузкой. Обе причины отказаться
 * выяснились на проверке:
 *
 * 1. Токен получался 300 символов, а Fastify не сопоставляет параметр маршрута
 *    длиннее 100 знаков (maxParamLength по умолчанию). Ссылка отвечала 404 у
 *    КАЖДОГО пациента — и это заметил тест, а не пользователь.
 *
 * 2. Даже с поднятым пределом 300 символов в SMS — это пять лишних сегментов
 *    сверх текста. Кириллица даёт 70 знаков на сегмент, то есть напоминание
 *    стоило бы клинике в шесть раз дороже. Собственный счётчик сегментов в этом
 *    же проекте существует именно для того, чтобы такое замечать.
 *
 * Адрес вида https://clinic.example/api/p/Ab3xK9mQ2T укладывается в сегмент
 * вместе с текстом. Взамен появляется таблица кодов — она же даёт то, чего у
 * самодостаточного токена нет: код можно отозвать, и видно, когда по нему
 * перешли.
 *
 * В коде нет ни имени, ни телефона, ни диагноза: ссылка может попасть в чужие
 * руки вместе с телефоном, и по ней не должно быть видно ничего о пациенте.
 */

import { randomInt } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointmentActionCodes } from "../../db/communicationsSchema.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";

type AppointmentAction = "confirm" | "cancel";

/**
 * Алфавит без похожих знаков: ни 0/O, ни 1/l/I. Ссылку из SMS иногда
 * перенабирают с экрана вручную, и «O» вместо «0» стоит потерянного приёма.
 */
const CODE_ALPHABET =
	"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const CODE_LENGTH = 10;

/**
 * 56^10 ≈ 3·10^17 вариантов. Вместе с ограничением частоты запросов на публичном
 * адресе перебор бессмыслен; randomInt — источник из node:crypto, а не Math.random.
 */
export function generateActionCode(length = CODE_LENGTH): string {
	let code = "";
	for (let index = 0; index < length; index += 1) {
		code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
	}
	return code;
}

/**
 * Срок жизни ссылки: до начала приёма плюс запас на опоздание пациента с
 * ответом. Бессрочная ссылка из прошлогодней SMS не должна отменять сегодняшнюю
 * запись.
 */
export function actionCodeExpiry(
	appointmentStartsAt: Date,
	now = new Date(),
): Date {
	const graceMs = 6 * 60 * 60 * 1000;
	const candidate = new Date(appointmentStartsAt.getTime() + graceMs);
	// Не меньше часа от текущего момента: приём может быть создан задним числом,
	// и ссылка всё равно должна успеть открыться.
	const floor = new Date(now.getTime() + 60 * 60 * 1000);
	return candidate > floor ? candidate : floor;
}

/**
 * Публичный адрес клиники. Без него ссылки не собрать, и это не повод подставить
 * «localhost»: сообщение с нерабочей ссылкой хуже сообщения без неё.
 */
export function readPublicBaseUrl(
	env: NodeJS.ProcessEnv = process.env,
): string | null {
	const raw = env.DENTE_PUBLIC_BASE_URL?.trim();
	if (!raw) return null;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
			return null;
		// Ссылка уходит пациенту наружу: путь и параметры из настройки не берём.
		return `${parsed.protocol}//${parsed.host}`;
	} catch {
		return null;
	}
}

export function actionLinkFor(baseUrl: string, code: string): string {
	return `${baseUrl}/api/p/${code}`;
}

export type AppointmentActionLinks = {
	readonly confirmLink: string;
	readonly cancelLink: string;
};

/**
 * Выдаёт (или переиспользует) коды подтверждения и отмены для приёма.
 *
 * Один активный код на пару «приём + действие»: если напоминание отправляется
 * дважды — за сутки и за два часа, — в обоих сообщениях должна быть одна и та же
 * ссылка. Иначе пациент, открывший первое сообщение, попадёт по устаревшему коду.
 *
 * Возвращает null, если публичный адрес клиники не настроен: тогда шаблон с
 * переменной {confirmLink} не отрендерится, и напоминание не уйдёт с пустым
 * местом вместо ссылки.
 */
export async function issueAppointmentActionLinks(
	input: {
		readonly organizationId: string;
		readonly appointmentId: string;
		readonly startsAt: Date;
	},
	now = new Date(),
	env: NodeJS.ProcessEnv = process.env,
): Promise<AppointmentActionLinks | null> {
	const baseUrl = readPublicBaseUrl(env);
	if (!baseUrl) return null;

	const expiresAt = actionCodeExpiry(input.startsAt, now);
	const confirmCode = await issueCode(
		input.organizationId,
		input.appointmentId,
		"confirm",
		expiresAt,
	);
	const cancelCode = await issueCode(
		input.organizationId,
		input.appointmentId,
		"cancel",
		expiresAt,
	);
	if (!confirmCode || !cancelCode) return null;

	return {
		confirmLink: actionLinkFor(baseUrl, confirmCode),
		cancelLink: actionLinkFor(baseUrl, cancelCode),
	};
}

async function issueCode(
	organizationId: string,
	appointmentId: string,
	action: AppointmentAction,
	expiresAt: Date,
): Promise<string | null> {
	const existing = await db
		.select({ code: appointmentActionCodes.code })
		.from(appointmentActionCodes)
		.where(
			and(
				eq(appointmentActionCodes.appointmentId, appointmentId),
				eq(appointmentActionCodes.action, action),
			),
		)
		.limit(1);

	if (existing[0]) {
		// Приём мог быть перенесён — срок ссылки продлевается под новое время,
		// а сам код остаётся тем же, чтобы старое сообщение не перестало работать.
		await db
			.update(appointmentActionCodes)
			.set({ expiresAt })
			.where(eq(appointmentActionCodes.code, existing[0].code));
		return existing[0].code;
	}

	// Столкновение кодов практически невероятно, но несколько попыток дешевле
	// потерянного напоминания.
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const code = generateActionCode();
		const inserted = await db
			.insert(appointmentActionCodes)
			.values({ code, organizationId, appointmentId, action, expiresAt })
			.onConflictDoNothing()
			.returning({ code: appointmentActionCodes.code });
		if (inserted[0]) return inserted[0].code;

		// Конфликт мог случиться и по уникальности пары «приём + действие»:
		// код выдали параллельно, и его нужно просто прочитать.
		const concurrent = await db
			.select({ code: appointmentActionCodes.code })
			.from(appointmentActionCodes)
			.where(
				and(
					eq(appointmentActionCodes.appointmentId, appointmentId),
					eq(appointmentActionCodes.action, action),
				),
			)
			.limit(1);
		if (concurrent[0]) return concurrent[0].code;
	}
	return null;
}

export type ResolvedActionCode = {
	readonly code: string;
	readonly organizationId: string;
	readonly appointmentId: string;
	readonly action: AppointmentAction;
	readonly expired: boolean;
	readonly usedAt: Date | null;
};

export async function resolveActionCode(
	rawCode: string,
	now = new Date(),
): Promise<ResolvedActionCode | null> {
	const code = rawCode.trim();
	// Отсекаем заведомо непохожее до обращения к базе: публичный адрес получает
	// и случайный мусор, и попытки перебора.
	if (code.length < 8 || code.length > 32 || !/^[A-Za-z0-9]+$/.test(code))
		return null;

	/*
	 * ОПЕРАЦИЯ «ДО АРЕНДАТОРА» — тот же класс, что вход по логину в routes/auth.ts.
	 * Пациент открывает ссылку из SMS, токена у него нет и быть не может, а
	 * клиника станет известна ТОЛЬКО из найденной строки: код нарочно не несёт
	 * в себе ничего, по чему её можно было бы назвать заранее. Под FORCE RLS
	 * запрос без контекста отдавал ноль строк, и КАЖДАЯ ссылка подтверждения и
	 * отмены отвечала «Ссылка недействительна» — включая только что выданную.
	 *
	 * Обход накрывает РОВНО этот один SELECT. Всё, что делает с ним вызывающий
	 * (routes/publicAppointmentActions.ts), идёт уже под `withTenantCtx` по
	 * organizationId из найденной строки.
	 */
	const [row] = await withSuperuserBypass(async (tx) =>
		tx
			.select()
			.from(appointmentActionCodes)
			.where(eq(appointmentActionCodes.code, code))
			.limit(1),
	);
	if (!row) return null;

	return {
		code: row.code,
		organizationId: row.organizationId,
		appointmentId: row.appointmentId,
		action: row.action === "cancel" ? "cancel" : "confirm",
		expired: row.expiresAt.getTime() < now.getTime(),
		usedAt: row.usedAt,
	};
}

export async function markActionCodeUsed(
	code: string,
	now = new Date(),
): Promise<void> {
	await db
		.update(appointmentActionCodes)
		.set({ usedAt: now })
		.where(eq(appointmentActionCodes.code, code));
}

/**
 * Уборка просроченных кодов. Вызывается фоновым обработчиком: таблица иначе
 * растёт вместе с числом приёмов, а пользы от истёкших кодов нет.
 *
 * ФОРМА — ЦИКЛ ПО АРЕНДАТОРАМ, А НЕ ОДИН ГЛОБАЛЬНЫЙ DELETE. Прежний запрос шёл
 * по всем клиникам сразу и без контекста удалял ноль строк молча: таблица росла
 * вечно. Соблазн обернуть его в обход велик и неверен — под обходом политики не
 * действуют ни для одной строки, а удаление чужих данных одним оператором это
 * ровно то, от чего защищает изоляция. Обход накрывает единственное, чего иначе
 * не узнать, — СПИСОК клиник, у которых есть просроченные коды; само удаление
 * идёт по каждой клинике отдельно, под её собственным контекстом.
 */
export async function purgeExpiredActionCodes(
	olderThan: Date,
): Promise<number> {
	const staleOrganizations = await withSuperuserBypass(async (tx) =>
		tx
			.selectDistinct({ organizationId: appointmentActionCodes.organizationId })
			.from(appointmentActionCodes)
			.where(lt(appointmentActionCodes.expiresAt, olderThan)),
	);

	let removedTotal = 0;
	for (const { organizationId } of staleOrganizations) {
		const removed = await withTenantCtx(organizationId, async (tx) =>
			tx
				.delete(appointmentActionCodes)
				.where(
					and(
						eq(appointmentActionCodes.organizationId, organizationId),
						lt(appointmentActionCodes.expiresAt, olderThan),
					),
				)
				.returning({ code: appointmentActionCodes.code }),
		);
		removedTotal += removed.length;
	}
	return removedTotal;
}
