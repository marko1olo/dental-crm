import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import {
	schemaIssuePhrase,
	schemaIssueWords,
	schemaRefusalMessage,
	textReachesOperator,
	type SchemaIssueLike,
} from "../../utils/schemaRefusalWords.js";

/**
 * СЕРВЕР ГОВОРИЛ С КЛИНИКОЙ СЛОВАМИ РАЗБОРЩИКА.
 *
 * ЧТО БЫЛО, замерено запросом в процессе (`app.inject`; дев-сервер на 4100 отдаёт
 * старую сборку и доказательством не считался):
 *
 *   POST /api/billing/payments, пустое тело
 *     → 400 «Оплата не записана. пациент: Required; сумма: Required.»
 *   POST /api/billing/payments, сумма с запятой и способ оплаты по-русски
 *     → 400 «… способ оплаты: Invalid enum value. Expected 'cash' | 'card' |
 *            'bank_transfer' | 'online' | 'insurance' | 'family_wallet' |
 *            'other', received 'нал' …»
 *   POST /api/migration/analyze, пустое тело        → 400 «sourceName: Required»
 *   POST /api/migration/rollback, номер вместо кода
 *     → 400 «runId: Expected string, received number; confirm: Invalid literal
 *            value, expected true»
 *   POST /api/migration/<прогон>/map                → ["vendorProfile: Expected string, received number", …]
 *   POST /api/public/booking/<клиника>/book         → ["Required" × 5]
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ, И ХУЖЕ, ЧЕМ ВЫГЛЯДИТ. Кассир не читал смесь двух
 * языков — он не читал НИЧЕГО. Экраны сотрудников гасят фразу отказа ЦЕЛИКОМ,
 * если в ней есть латинское слово из шести и более знаков
 * (`apps/web/src/AppHelpers.tsx`), а `Required`, `Expected`, `received`,
 * `string`, `number`, `Invalid` попадают под это правило все. На месте
 * объяснения оставалась общая подпись по коду ответа, и человек у стойки с
 * пациентом в очереди не знал, что нажать. В виджете записи с сайта клиники
 * фильтра нет вовсе — там пациент читал слово `Required` буквально.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ.
 *  1. Ни один отказ разбора на семи починенных адресах не содержит НИ ОДНОЙ
 *     латинской буквы.
 *  2. У каждого текста есть ПРИЧИНА и есть ДЕЙСТВИЕ. Проверяются ПРИЗНАКИ того и
 *     другого, а не дословная строка: тест на точное совпадение краснел бы на
 *     любой правке формулировки, и его бы отключили — именно так уже случилось со
 *     сторожем `scripts/smoke-core-route-validation.mjs`, который сравнивает текст
 *     дословно и потому краснеет молча.
 *  3. МАШИННЫЙ КОД В ОТВЕТЕ НЕ ИЗМЕНИЛСЯ. Значения поля `error` проверяются
 *     дословно: интерфейс по ним ветвится, и подменять машинное поле человеческой
 *     фразой значило бы поставить фасад вместо починки.
 *  4. ВСЕ ШЕСТНАДЦАТЬ кодов замечаний `zod` дают человеческий текст, а не только
 *     те, что умеет выдать сегодняшняя схема. Иначе следующее поле с ограничением
 *     длины или кратности вернуло бы английскую фразу, и никто бы не заметил.
 *  5. Копия фильтра клиента внутри сервера СВЕРЯЕТСЯ С ЖИВЫМ ИСХОДНИКОМ
 *     интерфейса. Разъехавшись, они дали бы ровно тот дефект, что здесь чинится:
 *     текст, который сервер считает человеческим, а экран гасит.
 *
 * БЕЗ БАЗЫ. Разбор тела на всех семи адресах происходит ДО первого обращения к
 * базе, поэтому ни одна строка не создаётся и убирать за собой нечего.
 */

/* ── Живой фильтр интерфейса, прочитанный из его исходника прямо сейчас ── */

const appHelpersPath = path.resolve(
	import.meta.dirname,
	"../../../../web/src/AppHelpers.tsx",
);

/**
 * Достаёт правило фильтра из ЖИВОГО исходника интерфейса.
 *
 * Читается файл, а не копия: если в интерфейсе правило изменят, здесь изменится
 * и проверка. Импортировать сам `AppHelpers.tsx` нельзя — это шесть тысяч строк
 * React, тянущих за собой браузерное окружение; а разбирать его исходник
 * достаточно, потому что волатильная часть фильтра ровно одна — это правило.
 */
function liveOperatorTextRule(): { source: string; flags: string } {
	const source = readFileSync(appHelpersPath, "utf8");
	const match = source.match(
		/export const technicalWorkflowFailurePattern\s*=\s*\/((?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+)\/([a-z]*)\s*;/,
	);
	assert.ok(
		match,
		`Правило technicalWorkflowFailurePattern не найдено в ${appHelpersPath}. ` +
			"Его переименовали или перенесли — значит сервер сверяется с тем, чего больше нет.",
	);
	return { source: match[1] as string, flags: match[2] as string };
}

const liveRule = liveOperatorTextRule();
const liveOperatorTextPattern = new RegExp(liveRule.source, liveRule.flags);

/**
 * Решение ЖИВОГО интерфейса «показать текст или погасить его целиком».
 *
 * Повторяет `operatorReadableErrorDetail` из `AppHelpers.tsx`: пусто — нет,
 * нет кириллицы — нет, сработало правило — нет.
 */
function liveScreenShowsText(text: string): boolean {
	const message = text.trim();
	if (!message) return false;
	if (!/[А-Яа-яЁё]/.test(message)) return false;
	return !liveOperatorTextPattern.test(message);
}

/* ── Признаки причины и действия ── */

const LATIN = /[A-Za-z]/;

/**
 * Признак ДЕЙСТВИЯ: повелительный глагол, а не констатация отказа.
 *
 * Список — из фраз общего дома `utils/schemaRefusalWords.ts`. Проверяется наличие
 * ЛЮБОГО из них: формулировку менять можно, безглагольный отказ — нельзя.
 */
const NEXT_STEP =
	/заполните|перезаполните|впишите|выберите|перепишите|допишите|сократите|увеличьте|уменьшите|подтвердите|проверьте|обновите|добавьте|уберите|оформите|откройте|повторите/i;

/**
 * Признак ПРИЧИНЫ: сказано, что именно с полем не так.
 *
 * Без причины остаётся «проверьте поля формы» — это код ответа русскими словами,
 * то есть тот же дефект. Такой отказ уже был написан по месту в
 * `routes/telegram.ts` и признан заплатой, а не лечением.
 */
const CAUSE =
	/не заполнен|заполнено|заполнены|не входит|не входят|не принято|короче|длиннее|меньше|больше|не выбрано|не делится|не кратно|не является|не подходит|не по образцу|не так, как|не датой|не тем видом|только одно определённое|не ждёт|раньше допустимой|позже допустимой|не соответствует|не прош(?:ло|ёл|ел|ли)/i;

function assertHumanRefusal(text: string, where: string): void {
	assert.ok(text.trim().length > 0, `${where}: текста для человека нет вовсе`);
	assert.doesNotMatch(
		text,
		LATIN,
		`${where}: в тексте для человека есть латинская буква. Латинское слово из шести знаков ` +
			"гасит фразу на экране ЦЕЛИКОМ, и человек не увидит ничего",
	);
	assert.match(text, CAUSE, `${where}: текст не называет причину`);
	assert.match(text, NEXT_STEP, `${where}: текст не называет следующий шаг`);
	assert.ok(
		liveScreenShowsText(text),
		`${where}: ЖИВОЙ фильтр интерфейса гасит этот текст целиком — человек не увидит ничего. Текст: ${text}`,
	);
}

/* ── Ответы маршрутов ── */

const ADMIN_SECRET = "замок-человеческого-текста-секрет";
const ORGANIZATION = "7d2f7c6a-1111-4b2b-9aa1-2f0d4c8e1234";
const RUN = "00000000-0000-4000-8000-000000000000";

type RouteCase = {
	label: string;
	url: string;
	payload: Record<string, unknown>;
	/** Машинный код ответа ДОСЛОВНО: интерфейс по нему ветвится. */
	machineCode: string;
	/** Конверт `{error:{code,message}}` вместо `{error,message}`. */
	envelope?: boolean;
	authorized?: boolean;
};

const ROUTE_CASES: RouteCase[] = [
	{
		label: "касса, пустое тело оплаты",
		url: "/api/billing/payments",
		payload: {},
		machineCode: "BillingValidationError",
		authorized: true,
	},
	{
		label: "касса, сумма с запятой и способ оплаты своими словами",
		url: "/api/billing/payments",
		payload: { patientId: ORGANIZATION, amountRub: "1500,50", method: "нал", clientMutationId: 12 },
		machineCode: "BillingValidationError",
		authorized: true,
	},
	{
		label: "перенос базы, разбор источника без названия",
		url: "/api/migration/analyze",
		payload: {},
		machineCode: "MigrationValidationError",
		authorized: true,
	},
	{
		label: "перенос базы, откат без подтверждения",
		url: "/api/migration/rollback",
		payload: { runId: 5 },
		machineCode: "MigrationValidationError",
		authorized: true,
	},
	{
		label: "перенос базы, сопоставление колонок с негодными полями",
		url: `/api/migration/${RUN}/map`,
		payload: { allowLlm: "да", vendorProfile: 7 },
		machineCode: "ValidationError",
		envelope: true,
		authorized: true,
	},
	{
		label: "перенос базы, выполнение прогона с негодным полем",
		url: `/api/migration/${RUN}/execute`,
		payload: { dryRun: "нет" },
		machineCode: "ValidationError",
		envelope: true,
		authorized: true,
	},
];

describe("отказ разбора объяснён человеку, а не разборщику", () => {
	let app: FastifyInstance;
	let clinicToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ADMIN_SECRET = ADMIN_SECRET;
		process.env.DENTE_AUTH_TOKEN_SECRET ??= "замок-человеческого-текста-подпись";

		const { registerBillingRoutes } = await import("../../routes/billing.js");
		const { registerMigrationRoutes } = await import("../../routes/migration.js");
		const { registerMigrationRunRoutes } = await import("../../routes/migrationRuns.js");
		const { registerPublicBookingRoutes } = await import("../../routes/publicBooking.js");
		const { authTokenSecret } = await import("../../security/authSecret.js");
		const { signToken } = await import("../../utils/cryptoHelper.js");

		clinicToken = signToken({ organizationId: ORGANIZATION }, authTokenSecret());

		app = Fastify({ logger: false });
		await registerBillingRoutes(app);
		await registerMigrationRoutes(app);
		await registerMigrationRunRoutes(app);
		await app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" });
		await app.ready();
	});

	after(async () => {
		await app?.close();
	});

	for (const routeCase of ROUTE_CASES) {
		test(routeCase.label, async () => {
			const headers: Record<string, string> = { "content-type": "application/json" };
			if (routeCase.authorized) {
				headers["x-dente-admin-secret"] = ADMIN_SECRET;
				headers["x-dente-clinic-token"] = clinicToken;
			}
			const response = await app.inject({
				method: "POST",
				url: routeCase.url,
				headers,
				payload: routeCase.payload,
			});
			assert.equal(response.statusCode, 400, `${routeCase.label}: код ответа изменился`);

			const body = response.json() as Record<string, unknown>;
			const envelope = routeCase.envelope
				? (body.error as { code?: unknown; message?: unknown; details?: unknown })
				: null;

			/*
			 * МАШИННЫЙ КОД ДОСЛОВНО. Интерфейс ветвится по нему, и правка текста для
			 * человека не имеет права его сдвинуть.
			 */
			const machineCode = envelope ? envelope.code : body.error;
			assert.equal(
				machineCode,
				routeCase.machineCode,
				`${routeCase.label}: машинный код ответа изменился — интерфейс по нему ветвится`,
			);

			const message = envelope ? envelope.message : body.message;
			assert.equal(typeof message, "string", `${routeCase.label}: поля message нет`);
			assertHumanRefusal(message as string, routeCase.label);

			/* Список замечаний в конверте — тоже текст для человека. */
			const issues = envelope
				? (envelope.details as { issues?: unknown } | undefined)?.issues
				: undefined;
			if (Array.isArray(issues)) {
				assert.ok(issues.length > 0, `${routeCase.label}: список замечаний пуст`);
				for (const [index, entry] of issues.entries()) {
					assert.equal(typeof entry, "string", `${routeCase.label}: замечание ${index} не строка`);
					assertHumanRefusal(entry as string, `${routeCase.label}, замечание ${index}`);
				}
			}
		});
	}

	/*
	 * Запись с сайта клиники проверяется отдельно: это единственный адрес класса,
	 * обращённый к ПАЦИЕНТУ, и виджет печатает текст без всякого фильтра —
	 * `apps/web/src/pages/PublicBookingWidget.tsx` читает `message`, `error` и
	 * `details[0]`. Значит здесь машинное слово доезжало буквально, а не гасилось.
	 */
	test("запись пациента с сайта клиники", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORGANIZATION}/book`,
			headers: { "content-type": "application/json" },
			payload: {},
		});
		assert.equal(response.statusCode, 400, "запись с сайта: код ответа изменился");

		const body = response.json() as { error?: unknown; message?: unknown; details?: unknown };
		assert.equal(
			body.error,
			"Некорректные данные записи",
			"запись с сайта: значение поля error изменилось",
		);
		assert.equal(typeof body.message, "string", "запись с сайта: поля message нет");
		assertHumanRefusal(body.message as string, "запись с сайта");

		assert.ok(Array.isArray(body.details), "запись с сайта: списка замечаний нет");
		const details = body.details as unknown[];
		assert.ok(details.length > 0, "запись с сайта: список замечаний пуст");
		for (const [index, entry] of details.entries()) {
			assert.equal(typeof entry, "string", `запись с сайта: замечание ${index} не строка`);
			assertHumanRefusal(entry as string, `запись с сайта, замечание ${index}`);
		}
	});
});

/* ── Все шестнадцать кодов замечаний, а не только достижимые сегодня ── */

/**
 * Настоящие замечания настоящего `zod` по каждому коду, который библиотека умеет
 * выдать на данных.
 *
 * Замечания берутся ПРОГОНОМ СХЕМЫ, а не выдумываются: выдуманный объект
 * замечания проверял бы мой перевод против моего же представления о библиотеке.
 * Три кода — `invalid_arguments`, `invalid_return_type`,
 * `invalid_intersection_types` — на данных схемой не воспроизводятся (они про
 * функции и пересечения типов), и для них ниже стоят собранные вручную
 * замечания. Это отмечено честно, а не спрятано.
 */
function zodIssuesFor(schema: z.ZodTypeAny, value: unknown): SchemaIssueLike[] {
	const parsed = schema.safeParse(value);
	assert.equal(parsed.success, false, "схема обязана была отвергнуть это значение");
	return (parsed as { error: { issues: SchemaIssueLike[] } }).error.issues;
}

const LABELS: Record<string, string> = {
	поле: "проверяемое поле",
	amountRub: "сумма оплаты",
	tag: "признак",
	items: "список позиций",
	when: "дата",
	count: "количество",
	name: "название",
};

const REAL_ISSUE_CASES: Array<{ code: string; issues: SchemaIssueLike[] }> = [
	{ code: "invalid_type (значения нет)", issues: zodIssuesFor(z.object({ name: z.string() }), {}) },
	{
		code: "invalid_type (другой вид)",
		issues: zodIssuesFor(z.object({ amountRub: z.number() }), { amountRub: "1500,50" }),
	},
	{
		code: "invalid_literal",
		issues: zodIssuesFor(z.object({ tag: z.literal(true) }), { tag: false }),
	},
	{
		code: "unrecognized_keys",
		issues: zodIssuesFor(z.object({ name: z.string() }).strict(), { name: "а", лишнее: 1 }),
	},
	{
		code: "invalid_union",
		issues: zodIssuesFor(z.object({ name: z.union([z.string(), z.number()]) }), { name: true }),
	},
	{
		code: "invalid_union_discriminator",
		issues: zodIssuesFor(
			z.discriminatedUnion("tag", [
				z.object({ tag: z.literal("первый") }),
				z.object({ tag: z.literal("второй") }),
			]),
			{ tag: "третий" },
		),
	},
	{
		code: "invalid_enum_value",
		issues: zodIssuesFor(z.object({ tag: z.enum(["нал", "карта"]) }), { tag: "чек" }),
	},
	{ code: "invalid_date", issues: zodIssuesFor(z.object({ when: z.date() }), { when: new Date("нет") }) },
	{
		code: "invalid_string (опознавательный номер)",
		issues: zodIssuesFor(z.object({ name: z.string().uuid() }), { name: "не номер" }),
	},
	{
		code: "invalid_string (почта)",
		issues: zodIssuesFor(z.object({ name: z.string().email() }), { name: "не почта" }),
	},
	{
		code: "invalid_string (дата со временем)",
		issues: zodIssuesFor(z.object({ when: z.string().datetime({ offset: true }) }), { when: "вчера" }),
	},
	{
		code: "invalid_string (по образцу)",
		issues: zodIssuesFor(z.object({ name: z.string().regex(/^\d+$/) }), { name: "буквы" }),
	},
	{
		code: "invalid_string (начинается с)",
		issues: zodIssuesFor(z.object({ name: z.string().startsWith("нужно") }), { name: "другое" }),
	},
	{
		code: "too_small (пустой текст)",
		issues: zodIssuesFor(z.object({ name: z.string().min(1) }), { name: "" }),
	},
	{
		code: "too_small (короткий текст)",
		issues: zodIssuesFor(z.object({ name: z.string().min(5) }), { name: "аб" }),
	},
	{
		code: "too_small (пустой список)",
		issues: zodIssuesFor(z.object({ items: z.array(z.string()).min(1) }), { items: [] }),
	},
	{
		code: "too_small (число)",
		issues: zodIssuesFor(z.object({ count: z.number().min(10) }), { count: 3 }),
	},
	{
		code: "too_small (дата)",
		issues: zodIssuesFor(z.object({ when: z.date().min(new Date("2026-01-01")) }), {
			when: new Date("2020-01-01"),
		}),
	},
	{
		code: "too_big (длинный текст)",
		issues: zodIssuesFor(z.object({ name: z.string().max(2) }), { name: "слишком длинно" }),
	},
	{
		code: "too_big (длинный список)",
		issues: zodIssuesFor(z.object({ items: z.array(z.string()).max(1) }), { items: ["а", "б"] }),
	},
	{
		code: "too_big (число)",
		issues: zodIssuesFor(z.object({ count: z.number().max(5) }), { count: 90 }),
	},
	{
		code: "not_multiple_of",
		issues: zodIssuesFor(z.object({ count: z.number().multipleOf(5) }), { count: 7 }),
	},
	{
		code: "not_finite",
		issues: zodIssuesFor(z.object({ count: z.number().finite() }), { count: Number.POSITIVE_INFINITY }),
	},
	{
		code: "custom (без своего текста)",
		issues: zodIssuesFor(
			z.object({ name: z.string() }).superRefine((_value, context) => {
				context.addIssue({ code: z.ZodIssueCode.custom, path: ["name"] });
			}),
			{ name: "а" },
		),
	},
];

/** Коды, которые схемой на данных не воспроизвести — собраны вручную. */
const HAND_BUILT_ISSUE_CASES: Array<{ code: string; issues: SchemaIssueLike[] }> = [
	{
		code: "invalid_arguments (вручную)",
		issues: [{ code: "invalid_arguments", path: ["name"], message: "Invalid function arguments" }],
	},
	{
		code: "invalid_return_type (вручную)",
		issues: [{ code: "invalid_return_type", path: ["name"], message: "Invalid function return type" }],
	},
	{
		code: "invalid_intersection_types (вручную)",
		issues: [
			{
				code: "invalid_intersection_types",
				path: ["name"],
				message: "Intersection results could not be merged",
			},
		],
	},
	{
		code: "неизвестный код будущей версии (вручную)",
		issues: [{ code: "код_которого_ещё_нет", path: ["name"], message: "Something Entirely New" }],
	},
];

describe("перевод накрывает все коды замечаний разборщика", () => {
	for (const issueCase of [...REAL_ISSUE_CASES, ...HAND_BUILT_ISSUE_CASES]) {
		test(issueCase.code, () => {
			assert.ok(issueCase.issues.length > 0, `${issueCase.code}: замечаний не пришло`);
			for (const issue of issueCase.issues) {
				const words = schemaIssueWords(issue, LABELS);
				assert.ok(words.cause.trim().length > 0, `${issueCase.code}: причины нет`);
				assert.ok(words.action.trim().length > 0, `${issueCase.code}: действия нет`);
				assertHumanRefusal(schemaIssuePhrase(issue, LABELS), issueCase.code);
			}
			assertHumanRefusal(
				schemaRefusalMessage({
					issues: issueCase.issues,
					fieldLabels: LABELS,
					retryAction: "действие",
					fallbackMessage: "Поля не заполнены. Заполните их и повторите действие.",
				}),
				`${issueCase.code}, собранный отказ`,
			);
		});
	}

	test("замечаний нет вовсе — отдаётся запасной текст с причиной и действием", () => {
		const fallback = "Ни одно поле не прошло проверку. Проверьте поля формы и повторите действие.";
		assert.equal(
			schemaRefusalMessage({
				issues: [],
				retryAction: "действие",
				fallbackMessage: fallback,
			}),
			fallback,
		);
		assertHumanRefusal(fallback, "запасной текст");
	});

	/*
	 * Латинский ключ схемы НЕ ставится вместо подписи. Прежний код в
	 * `db/pricelistQuery.ts` и `routes/migration.ts` подставлял именно его, и это
	 * гасило фразу целиком: «назвали поле» превращалось в «не сказали ничего».
	 */
	test("поле без русской подписи не называется латинским ключом схемы", () => {
		const issues = zodIssuesFor(z.object({ someLatinFieldName: z.string() }), {});
		for (const issue of issues) {
			assertHumanRefusal(schemaIssuePhrase(issue, {}), "поле без подписи");
		}
	});

	/*
	 * Подпись, которая сама гасится фильтром, к употреблению не годится: словарь
	 * подписей мог бы принести латиницу с собой.
	 */
	test("подпись поля с латинским словом не берётся в текст", () => {
		const issues = zodIssuesFor(z.object({ name: z.string() }), {});
		for (const issue of issues) {
			assertHumanRefusal(
				schemaIssuePhrase(issue, { name: "поле Telegram" }),
				"подпись с латиницей",
			);
		}
	});
});

describe("русский текст автора схемы не переписывается", () => {
	/*
	 * Часть полей уже несёт написанную человеком причину — например
	 * `routes/publicBooking.ts` объявляет «Неверный формат номера телефона».
	 * Переписывать чужую точную формулировку общий перевод не вправе: причину поля
	 * знает только та проверка, что его объявила.
	 */
	test("сообщение автора схемы попадает в текст дословно", () => {
		const authored = "Неверный формат номера телефона";
		const issues = zodIssuesFor(
			z.object({ name: z.string().regex(/^\+\d+$/, authored) }),
			{ name: "нет" },
		);
		const words = schemaIssueWords(issues[0] as SchemaIssueLike, LABELS);
		assert.ok(
			words.cause.includes(authored),
			`причина обязана нести текст автора схемы дословно, получено: ${words.cause}`,
		);
		assertHumanRefusal(schemaIssuePhrase(issues[0] as SchemaIssueLike, LABELS), "текст автора");
	});

	/*
	 * А вот «человеческое» сообщение автора С ЛАТИНСКИМ СЛОВОМ пропускать нельзя:
	 * оно гасится экраном целиком. Такое в дереве есть — `packages/shared`
	 * объявляет «Нужен либо rawText, либо contentBase64.». Перевод обязан заменить
	 * его своим текстом, а не пропустить.
	 */
	test("сообщение автора с латинским словом заменяется, а не пропускается", () => {
		const issues = zodIssuesFor(
			z
				.object({ name: z.string().optional() })
				.refine((value) => Boolean(value.name), { message: "Нужен либо rawText, либо contentBase64." }),
			{},
		);
		for (const issue of issues) {
			const phrase = schemaIssuePhrase(issue, LABELS);
			assert.ok(
				!phrase.includes("rawText"),
				`латинское слово автора схемы просочилось в текст: ${phrase}`,
			);
			assertHumanRefusal(phrase, "текст автора с латиницей");
		}
	});
});

describe("копия фильтра в сервере не разъехалась с живым интерфейсом", () => {
	/*
	 * Сервер решает «пропустить текст автора схемы или перевести его» тем же
	 * правилом, которым интерфейс решает «показать или погасить». Разъехавшись,
	 * они дадут ровно тот дефект, что здесь чинится: текст, который сервер считает
	 * человеческим, а экран гасит. Поэтому копия сверяется с живым исходником, а не
	 * живёт своей жизнью.
	 */
	test("правило совпадает с живым исходником интерфейса", async () => {
		const serverSource = readFileSync(
			path.resolve(import.meta.dirname, "../../utils/schemaRefusalWords.ts"),
			"utf8",
		);
		assert.ok(
			serverSource.includes(liveRule.source),
			"правило фильтра в utils/schemaRefusalWords.ts не совпадает с живым " +
				`${appHelpersPath}. Живое правило: /${liveRule.source}/${liveRule.flags}`,
		);
		assert.ok(
			serverSource.includes(`/${liveRule.flags}`) || liveRule.flags === "",
			`флаги живого правила (${liveRule.flags}) не найдены в копии сервера — под флагом /i ` +
				"правило ловит слова в любом регистре, без него не ловит почти ничего",
		);
	});

	test("решение сервера и решение экрана совпадают на образцах", () => {
		const samples = [
			"Поле «сумма оплаты» не заполнено. Заполните его и повторите запись оплаты.",
			"Оплата не записана. пациент: Required; сумма: Required.",
			"sourceName: Required",
			"Некорректный запрос Telegram. Проверьте обязательные поля.",
			"",
		];
		for (const sample of samples) {
			assert.equal(
				textReachesOperator(sample),
				liveScreenShowsText(sample),
				`сервер и экран разошлись на образце: ${JSON.stringify(sample)}`,
			);
		}
	});
});
