import assert from "node:assert/strict";
import test from "node:test";

import { latestCalendarDateOnEarth, transformRow } from "./rowTransform.js";

/**
 * ДАТА РОЖДЕНИЯ, ВВЕДЁННАЯ СЕГОДНЯ, НЕ ДОЛЖНА СЧИТАТЬСЯ БУДУЩЕЙ.
 *
 * ЧТО БЫЛО СЛОМАНО. Правило домена сравнивало дату рождения с «сегодня», которое
 * бралось как `new Date().toISOString().slice(0, 10)`, то есть по UTC. У всех
 * российских поясов смещение ПОЛОЖИТЕЛЬНОЕ, поэтому UTC отстаёт от местного
 * календаря каждую ночь: в Самаре до 04:00, на Камчатке половину суток. Оператор,
 * переносящий чужую базу в вечернюю или ночную смену, получал предупреждение
 * «Дата рождения находится в будущем» на СЕГОДНЯШНЕЙ дате — на верных данных.
 *
 * ПОЧЕМУ ТЕСТ НЕ ЗАВИСИТ ОТ ЧАСА ПРОГОНА. Наивный тест «сегодня в Самаре не
 * будущее» краснел бы только в те четыре часа, когда дефект проявляется, и был бы
 * зелёным двадцать часов в сутки — то есть почти всегда бесполезным. Здесь
 * проверяется инвариант, верный в ЛЮБОЙ момент: в мире одновременно существуют
 * разные календарные даты (диапазон поясов — от UTC−11 до UTC+14, то есть 25
 * часов), поэтому хотя бы один пояс всегда показывает дату, отличную от UTC.
 * Тест находит такой пояс сам и требует, чтобы сегодняшняя дата ЛЮБОГО пояса не
 * считалась будущей.
 *
 * Проверка в самом переносе неблокирующая: она советует оператору посмотреть
 * значение, а не отвергает строку. Поэтому цена ложного предупреждения — не
 * потерянные данные, а потерянное доверие к предупреждениям.
 */

const ZONES = [
	"Pacific/Kiritimati", // UTC+14, самые ранние сутки в мире
	"Asia/Kamchatka", // UTC+12
	"Europe/Samara", // UTC+4, пояс по умолчанию в схеме клиник
	"Europe/Moscow", // UTC+3
	"UTC",
	"America/New_York", // UTC−4/−5
	"Pacific/Midway", // UTC−11, самые поздние сутки в мире
];

function calendarDateIn(timeZone: string, at: Date): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(at);
}

function birthDateIssues(birthDate: string): string[] {
	const transformed = transformRow({
		entityKind: "patient",
		columns: ["ФИО", "Дата рождения"],
		row: ["Границев Ночной Поясович", birthDate],
		mapping: [
			{
				sourceColumn: "ФИО",
				targetField: "patient.fullName",
				confidence: 1,
				decidedBy: "deterministic",
				rationale: "",
				sampleValues: [],
			},
			{
				sourceColumn: "Дата рождения",
				targetField: "patient.birthDate",
				confidence: 1,
				decidedBy: "deterministic",
				rationale: "",
				sampleValues: [],
			},
		],
		dateHints: new Map(),
		confidenceThreshold: 0.5,
	});
	return transformed.issues
		.filter((issue) => issue.fieldPath === "birthDate")
		.map((issue) => issue.message);
}

/**
 * ГЛАВНАЯ ПРОВЕРКА — НА ФИКСИРОВАННЫХ МГНОВЕНИЯХ, А НЕ НА «СЕЙЧАС».
 *
 * ЭТО ИСПРАВЛЕНИЕ МОЕЙ ЖЕ ОШИБКИ, и она стоит того, чтобы быть записанной.
 * Первая редакция этого файла проверяла инвариант «сегодня любого пояса не
 * будущее» по текущему моменту — и оказалась ЗЕЛЁНОЙ на возвращённом дефекте.
 * Причина: в момент прогона (UTC 07:xx) пояс, отличавшийся от UTC, был западным
 * (Pacific/Midway), то есть его дата ПОЗАДИ UTC, и старое сравнение с UTC на ней
 * не срабатывало. Дефект проявляется только когда какой-то пояс ВПЕРЕДИ UTC по
 * календарю — то есть примерно половину суток. Проверка, зелёная половину суток,
 * бесполезна, а хуже того — обманчива: именно на такие я и ставлю задачи агентам.
 *
 * Поэтому граница проверяется на ЗАДАННЫХ мгновениях, где расхождение
 * гарантировано, и рядом прямо считается то, что делало прежнее выражение, — так
 * тест доказывает разницу сам, а не полагается на удачный час.
 */
test("максимальная дата на Земле опережает UTC в заданные мгновения", () => {
	const cases = [
		// UTC 23:00 → в Кирибати (+14) уже следующие сутки, разница ровно один день.
		{
			instant: "2026-07-29T23:00:00.000Z",
			utcDay: "2026-07-29",
			earthDay: "2026-07-30",
		},
		// UTC 10:00 — самая ранняя граница: +14 даёт ровно полночь следующих суток.
		{
			instant: "2026-07-29T10:00:00.000Z",
			utcDay: "2026-07-29",
			earthDay: "2026-07-30",
		},
		// Через границу месяца: 31 июля в UTC — уже 1 августа на востоке.
		{
			instant: "2026-07-31T20:30:00.000Z",
			utcDay: "2026-07-31",
			earthDay: "2026-08-01",
		},
		// Через границу года.
		{
			instant: "2026-12-31T14:00:00.000Z",
			utcDay: "2026-12-31",
			earthDay: "2027-01-01",
		},
		// UTC 09:00 — расхождения ещё нет, обе даты совпадают: проверка не должна
		// «улучшать» ответ там, где улучшать нечего.
		{
			instant: "2026-07-29T09:00:00.000Z",
			utcDay: "2026-07-29",
			earthDay: "2026-07-29",
		},
	];

	for (const { instant, utcDay, earthDay } of cases) {
		const at = new Date(instant);
		// То самое выражение, которое здесь стояло раньше. Считается ЗДЕСЬ, чтобы
		// разница была видна в самом тесте, а не в чьём-то пересказе.
		const oldUtcDay = at.toISOString().slice(0, 10);
		assert.equal(
			oldUtcDay,
			utcDay,
			`контрольное значение UTC для ${instant} посчитано неверно`,
		);
		assert.equal(
			latestCalendarDateOnEarth(at),
			earthDay,
			`в момент ${instant} самая поздняя дата на Земле — ${earthDay}, а прежнее выражение давало ${oldUtcDay}`,
		);
	}
});

test("сегодняшняя дата ЛЮБОГО пояса Земли не считается будущей", () => {
	const now = new Date();
	const utcToday = calendarDateIn("UTC", now);
	const distinct = new Set(ZONES.map((zone) => calendarDateIn(zone, now)));

	// Опора теста: разные календарные даты в мире существуют одновременно всегда.
	// Если это утверждение когда-нибудь станет ложным, тест обязан сказать об этом
	// вслух, а не тихо превратиться в проверку одного UTC.
	assert.ok(
		distinct.size >= 2,
		`ожидались минимум две разные календарные даты по поясам, получено ${JSON.stringify([...distinct])} — тест выродился`,
	);

	for (const zone of ZONES) {
		const localToday = calendarDateIn(zone, now);
		const issues = birthDateIssues(localToday);
		assert.deepEqual(
			issues,
			[],
			`дата ${localToday} — это СЕГОДНЯ в поясе ${zone} (в UTC сейчас ${utcToday}), ` +
				`а перенос назвал её будущей: ${JSON.stringify(issues)}`,
		);
	}
});

test("действительно будущая дата рождения по-прежнему называется будущей", () => {
	const now = new Date();
	// Двое суток вперёд от максимальной даты на Земле: будущее в любом поясе, с
	// запасом на сутки допуска, который правка сознательно оставила.
	const farFuture = calendarDateIn(
		"Pacific/Kiritimati",
		new Date(now.getTime() + 2 * 86_400_000),
	);
	const issues = birthDateIssues(farFuture);
	assert.equal(
		issues.length,
		1,
		`дата ${farFuture} в будущем во всех поясах, предупреждения быть обязано, получено ${JSON.stringify(issues)}`,
	);
	assert.match(
		issues[0] ?? "",
		/в будущем/,
		"предупреждение обязано называть причину словами оператора",
	);
});

test("предупреждение о будущей дате не блокирует перенос строки", () => {
	const now = new Date();
	const farFuture = calendarDateIn(
		"Pacific/Kiritimati",
		new Date(now.getTime() + 2 * 86_400_000),
	);
	const transformed = transformRow({
		entityKind: "patient",
		columns: ["ФИО", "Дата рождения"],
		row: ["Границев Ночной Поясович", farFuture],
		mapping: [
			{
				sourceColumn: "ФИО",
				targetField: "patient.fullName",
				confidence: 1,
				decidedBy: "deterministic",
				rationale: "",
				sampleValues: [],
			},
			{
				sourceColumn: "Дата рождения",
				targetField: "patient.birthDate",
				confidence: 1,
				decidedBy: "deterministic",
				rationale: "",
				sampleValues: [],
			},
		],
		dateHints: new Map(),
		confidenceThreshold: 0.5,
	});
	const blocking = transformed.issues.filter((issue) => issue.blocking);
	assert.deepEqual(
		blocking.map((issue) => issue.message),
		[],
		"подозрительная дата рождения не должна отвергать строку: перенос не место для наведения порядка в чужой базе",
	);
});
