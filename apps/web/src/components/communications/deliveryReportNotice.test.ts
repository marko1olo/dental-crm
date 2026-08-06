import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	type DispatchReport,
	describeDispatchReport,
	describeReminderReport,
	type ReminderScheduleReport,
} from "./deliveryReportNotice.js";

/**
 * Экран отправки сообщений обязан говорить правду о том, что произошло.
 *
 * ЧТО ЭТИ ПРОВЕРКИ СТЕРЕГУТ. Отчёт сервера о разборе очереди содержит десять
 * счётчиков, а обработчик кнопки читал четыре и вычислял вид итога как
 * `failed > 0 ? "fail" : "done"`. Самый частый отказ в жизни клиники — шлюз
 * недоступен — даёт `failed = 0` и `retried = 5`: пять сообщений взяты из
 * очереди, ни одно не ушло, вид итога «done», и на экране спокойная серая
 * строка «Отправлено: 0 сообщений.» Пять пациентов не узнали о приёме, а
 * клиника прочитала сообщение об успехе. То же с напоминаниями: пациенты без
 * телефона считались в `skippedNoChannel`, но наружу это число не выходило
 * вообще.
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ ЗДЕСЬ, А НЕ В БРАУЗЕРЕ. describeDispatchReport и
 * describeReminderReport — чистые функции без React: отчёт на входе, вид и
 * текст на выходе. Именно поэтому дефект теперь ловится тестом.
 *
 * ГЛАВНОЕ ПРАВИЛО, КОТОРОЕ ЗАКРЕПЛЕНО НИЖЕ: число, означающее «сообщение не
 * дошло до живого человека», не имеет права оказаться в спокойном сером блоке;
 * и наоборот — настоящая удача не имеет права покраснеть.
 */

const cleanDispatch: DispatchReport = {
	claimed: 3,
	sent: 3,
	retried: 0,
	failed: 0,
	suppressed: 0,
	notConfigured: 0,
	deferred: 0,
	releasedStuck: 0,
	awaitingRetry: 0,
	awaitingSchedule: 0,
};

const cleanReminders: ReminderScheduleReport = {
	organizations: 1,
	examined: 5,
	queued: 5,
	alreadyQueued: 0,
	skippedNoChannel: 0,
	skippedNoTemplateData: 0,
	skipped: [],
	problems: [],
};

/** Ни одного латинского слова в тексте для врача: кода ошибки и англицизмов быть не должно. */
const latinRun = /[A-Za-z]{2,}/;
/** Идентификатор арендатора в тексте для человека — прямое нарушение §13. */
const rawUuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("разбор очереди: отчёт сервера превращается в честный текст", () => {
	it("шлюз недоступен: пять взято, ноль ушло — это НЕ успех, и в тексте назван повтор", () => {
		// Ровно тот отчёт, который отдаёт dispatcher.ts при недоступном шлюзе:
		// строка возвращается в очередь со статусом queued, attempts + 1, и итог
		// прохода — "retried", а не "failed".
		const notice = describeDispatchReport({
			...cleanDispatch,
			claimed: 5,
			sent: 0,
			retried: 5,
		});

		assert.equal(
			notice.kind,
			"fail",
			`спокойный серый блок при пяти недоставленных: ${notice.text}`,
		);
		assert.match(notice.text, /Пока не ушло/);
		assert.match(
			notice.text,
			/попроб/i,
			`в тексте нет обещания повторить: ${notice.text}`,
		);
	});

	it("след «взято N» восстановлен: видно, что сообщения брали, а не что их не было", () => {
		const notice = describeDispatchReport({
			...cleanDispatch,
			claimed: 5,
			sent: 0,
			retried: 5,
		});
		// Прежняя версия печатала только «Отправлено: 0 сообщений.» — из такой
		// строки нельзя отличить «взяли пять и ни одно не ушло» от «брать было
		// нечего».
		assert.match(notice.text, /Взято из очереди: 5 сообщений/);
		assert.match(notice.text, /Отправлено: 0 сообщений/);
	});

	it("тихие часы: отложенные сообщения не прячутся в спокойном блоке", () => {
		const notice = describeDispatchReport({
			...cleanDispatch,
			claimed: 4,
			sent: 1,
			deferred: 3,
		});
		assert.equal(
			notice.kind,
			"fail",
			`deferred пропал из текста: ${notice.text}`,
		);
		assert.match(notice.text, /Отложено до утра: 3/);
		assert.match(notice.text, /тихие часы/i);
	});

	it("канал не настроен — это дело администратора, а не осознанный отказ", () => {
		const notConfigured = describeDispatchReport({
			...cleanDispatch,
			claimed: 2,
			sent: 0,
			notConfigured: 2,
		});
		const suppressed = describeDispatchReport({
			...cleanDispatch,
			claimed: 2,
			sent: 0,
			suppressed: 2,
		});

		assert.equal(notConfigured.kind, "fail");
		assert.equal(suppressed.kind, "fail");
		// Раньше оба случая складывались в один счётчик и печатались одной фразой
		// «тихие часы, нет согласия или нет адреса»: незаконченная настройка
		// выглядела как правильно выполненное решение.
		assert.notEqual(notConfigured.text, suppressed.text);
		assert.match(notConfigured.text, /не настроен/);
		assert.match(suppressed.text, /отказал/);
	});

	it("зависшие захваты названы, но сами по себе не делают итог красным", () => {
		const notice = describeDispatchReport({
			...cleanDispatch,
			releasedStuck: 2,
		});
		assert.equal(notice.kind, "done", notice.text);
		assert.match(notice.text, /зависли/);
	});

	it("чистая удача читается спокойно — итог, который краснеет всегда, тоже дефект", () => {
		const notice = describeDispatchReport(cleanDispatch);
		assert.equal(notice.kind, "done");
		assert.match(notice.text, /Отправлено: 3 сообщения/);
		assert.doesNotMatch(notice.text, /не ушло|не настроен|Отложено/);
	});

	describe("второе нажатие после отказа", () => {
		it("взято 0, но пять лежат с выдержкой — спокойного «нечего отправлять» быть не должно", () => {
			const notice = describeDispatchReport({
				...cleanDispatch,
				claimed: 0,
				sent: 0,
				awaitingRetry: 5,
			});
			assert.equal(
				notice.kind,
				"fail",
				`второе нажатие снова врёт: ${notice.text}`,
			);
			assert.match(notice.text, /5 сообщений ждут повторной попытки/);
			// Кнопка «Повторить» в журнале действительно существует и действительно
			// возвращает строку в очередь: обещание, которое интерфейс может сдержать.
			assert.match(notice.text, /Повторить/);
		});

		it("взято 0, а в очереди только назначенное на будущее — это НЕ авария", () => {
			const notice = describeDispatchReport({
				...cleanDispatch,
				claimed: 0,
				sent: 0,
				awaitingSchedule: 4,
			});
			assert.equal(
				notice.kind,
				"done",
				`обычная работа покрашена в красный: ${notice.text}`,
			);
			assert.match(notice.text, /ждут назначенного времени/);
		});

		it("пустая очередь остаётся спокойной и говорит, откуда берутся сообщения", () => {
			const notice = describeDispatchReport({
				...cleanDispatch,
				claimed: 0,
				sent: 0,
			});
			assert.equal(notice.kind, "done");
			assert.match(notice.text, /Поставить напоминания/);
		});

		it("выдержка и расписание вместе: краснеет из-за выдержки, но названы оба остатка", () => {
			const notice = describeDispatchReport({
				...cleanDispatch,
				claimed: 0,
				sent: 0,
				awaitingRetry: 2,
				awaitingSchedule: 7,
			});
			assert.equal(notice.kind, "fail");
			assert.match(notice.text, /2 сообщения ждут повторной попытки/);
			assert.match(notice.text, /Ещё 7 ждут назначенного времени/);
		});
	});

	it("пачка кончилась раньше очереди: остаток назван и не удвоен", () => {
		// batchSize ограничивает проход. Сервер исключает обработанные строки из
		// остатка, поэтому «взято 25, повторим 25» и «кроме этих, ждут 5» — про
		// разные сообщения, а не одно число дважды.
		const notice = describeDispatchReport({
			...cleanDispatch,
			claimed: 25,
			sent: 0,
			retried: 25,
			awaitingRetry: 5,
		});
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Пока не ушло, попробуем ещё раз: 25/);
		assert.match(
			notice.text,
			/Кроме этих, ждут повторной попытки: 5 сообщений/,
		);
	});
});

describe("напоминания: пропущенные пациенты обязаны быть названы", () => {
	it("семь поставлено, трое без связи — их имена на экране, и итог не спокойный", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			examined: 10,
			queued: 7,
			skippedNoChannel: 3,
			skipped: [
				{
					patientName: "Орлова Марина Петровна",
					reason: "no_channel",
					appointmentAt: "2026-07-29T11:30:00.000Z",
				},
				{
					patientName: "Гущин Пётр Ильич",
					reason: "no_channel",
					appointmentAt: "2026-07-29T13:00:00.000Z",
				},
				{
					patientName: "Наумова Ольга Сергеевна",
					reason: "no_channel",
					appointmentAt: "2026-07-29T15:45:00.000Z",
				},
			],
		});

		assert.equal(
			notice.kind,
			"fail",
			`трое пациентов пропали молча: ${notice.text}`,
		);
		assert.match(notice.text, /Поставлено напоминаний: 7/);
		// Числа мало: чтобы позвонить, администратору нужно имя.
		assert.match(notice.text, /Орлова Марина Петровна/);
		assert.match(notice.text, /Гущин Пётр Ильич/);
		assert.match(notice.text, /Наумова Ольга Сергеевна/);
		assert.match(notice.text, /позвонить/);
	});

	it("две причины пропуска не сваливаются в одну фразу", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			examined: 4,
			queued: 2,
			skippedNoChannel: 1,
			skippedNoTemplateData: 1,
			skipped: [
				{
					patientName: "Орлова Марина Петровна",
					reason: "no_channel",
					appointmentAt: "2026-07-29T11:30:00.000Z",
				},
				{
					patientName: "Гущин Пётр Ильич",
					reason: "no_template_data",
					appointmentAt: "2026-07-29T13:00:00.000Z",
				},
			],
		});

		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /нет способа связи[\s\S]*Орлова Марина Петровна/);
		assert.match(
			notice.text,
			/не хватает данных о приёме[\s\S]*Гущин Пётр Ильич/,
		);
	});

	it("сервер прислал число, но не прислал имён — число не выдумывается в имена", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			examined: 5,
			queued: 2,
			skippedNoChannel: 3,
		});
		assert.equal(notice.kind, "fail");
		/*
		 * Здесь стояло /3 пациентов/, и ошибка была в ТЕСТЕ, а не в коде.
		 *
		 * По-русски после 2–4 идёт «3 пациента»; «пациентов» — форма для 5 и
		 * больше, а также для 11–14. Модуль склоняет верно через countLabel, а
		 * ожидание было написано во множественном, не применив то самое правило,
		 * которое модуль и реализует. Соседняя проверка ниже ждёт «25 пациентов» —
		 * для 25 это правильно, значит код согласован, и неверна была одна строка.
		 *
		 * Это тот же дефект, который кампания уже дважды видела на экранах:
		 * «Статус не загружены» и «Очередь ожидания не загружены». Поэтому форма не
		 * просто исправлена — добавлено утверждение, что НЕВЕРНАЯ форма
		 * отсутствует, иначе тест принимал бы обе.
		 */
		// Без \b: в JavaScript граница слова определяется по ASCII, кириллица в \w не
		// входит, поэтому /3 пациента\b/ не срабатывает даже на верном тексте.
		// Проверяем целой фразой — она однозначна и заодно проверяет формулировку.
		assert.match(notice.text, /остались 3 пациента /);
		assert.ok(
			!/3 пациентов/.test(notice.text),
			`после 2-4 должно быть «3 пациента», а не «3 пациентов»: ${notice.text}`,
		);
		assert.match(notice.text, /сервер не назвал/);
	});

	it("имён меньше, чем пропусков: об обрезке сказано прямо", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			examined: 30,
			queued: 5,
			skippedNoChannel: 25,
			skipped: [
				{
					patientName: "Орлова Марина Петровна",
					reason: "no_channel",
					appointmentAt: "2026-07-29T11:30:00.000Z",
				},
			],
		});
		assert.match(notice.text, /25 пациентов/);
		assert.match(notice.text, /Названы первые 1/);
	});

	it("«Но не для всех» больше не приписывается к нулю поставленных", () => {
		// БЫЛО: «Поставлено напоминаний: 0. Уже стояли в очереди: 0. Но не для
		// всех: … Ни одно напоминание не отправлено.» — фраза противоречила себе.
		const notice = describeReminderReport({
			...cleanReminders,
			examined: 0,
			queued: 0,
			problems: [
				"Напоминания включены, но нет ни одного активного шаблона с назначением «Подтверждение приёма».",
			],
		});
		assert.equal(notice.kind, "fail");
		assert.doesNotMatch(notice.text, /Но не для всех/);
		assert.match(notice.text, /нет ни одного активного шаблона/);
	});

	it("напоминания выключены: ноль объяснён, а не подан как результат работы", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			organizations: 0,
			examined: 0,
			queued: 0,
		});
		assert.equal(
			notice.kind,
			"fail",
			`нажали кнопку, ничего не произошло, и экран спокоен: ${notice.text}`,
		);
		assert.match(notice.text, /выключены/);
	});

	it("приёмов в окне нет: спокойно, но с объяснением, почему ноль", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			examined: 0,
			queued: 0,
		});
		assert.equal(notice.kind, "done");
		assert.match(notice.text, /Приёмов, о которых пора напоминать, сейчас нет/);
	});

	it("чистая удача остаётся спокойной", () => {
		const notice = describeReminderReport(cleanReminders);
		assert.equal(notice.kind, "done");
		assert.equal(notice.text, "Поставлено напоминаний: 5.");
	});

	it("имена приходят, а счётчики нулевые: имена всё равно не теряются", () => {
		// Расхождение с сервером не должно повторить исходный дефект — молчание.
		const notice = describeReminderReport({
			...cleanReminders,
			skipped: [
				{
					patientName: "Орлова Марина Петровна",
					reason: "no_channel",
					appointmentAt: "2026-07-29T11:30:00.000Z",
				},
			],
		});
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Орлова Марина Петровна/);
	});
});

/**
 * НИ ОДНО ПОЛЕ ОТЧЁТА НЕ МОЖЕТ БЫТЬ ДЕКОРАТИВНЫМ.
 *
 * Таблицы `ReportVoice` — отображённые типы по `keyof` отчёта, поэтому новое поле
 * без описания не компилируется. Но компилятор не проверяет, что описание
 * действительно что-то говорит: `say: () => null` прошёл бы сборку и вернул нас
 * ровно в исходный дефект. Здесь каждое поле меняется по одному, и текст обязан
 * измениться. Оба словаря заданы как Record по всем ключам отчёта: забыть поле в
 * самой проверке тоже нельзя.
 */
describe("каждое поле отчёта слышно в тексте", () => {
	const dispatchMutations: Record<keyof DispatchReport, DispatchReport> = {
		claimed: { ...cleanDispatch, claimed: 9 },
		sent: { ...cleanDispatch, sent: 1 },
		retried: { ...cleanDispatch, retried: 2 },
		failed: { ...cleanDispatch, failed: 2 },
		suppressed: { ...cleanDispatch, suppressed: 2 },
		notConfigured: { ...cleanDispatch, notConfigured: 2 },
		deferred: { ...cleanDispatch, deferred: 2 },
		releasedStuck: { ...cleanDispatch, releasedStuck: 2 },
		awaitingRetry: { ...cleanDispatch, awaitingRetry: 2 },
		awaitingSchedule: { ...cleanDispatch, awaitingSchedule: 2 },
	};

	const reminderMutations: Record<
		keyof ReminderScheduleReport,
		ReminderScheduleReport
	> = {
		organizations: { ...cleanReminders, organizations: 0 },
		examined: { ...cleanReminders, examined: 0 },
		queued: { ...cleanReminders, queued: 2 },
		alreadyQueued: { ...cleanReminders, alreadyQueued: 2 },
		skippedNoChannel: { ...cleanReminders, skippedNoChannel: 2 },
		skippedNoTemplateData: { ...cleanReminders, skippedNoTemplateData: 2 },
		skipped: {
			...cleanReminders,
			skipped: [
				{
					patientName: "Орлова Марина Петровна",
					reason: "no_channel",
					appointmentAt: "2026-07-29T11:30:00.000Z",
				},
			],
		},
		problems: {
			...cleanReminders,
			problems: [
				"Напоминания поставить не удалось: соединение с базой потеряно.",
			],
		},
	};

	const baselineDispatch = describeDispatchReport(cleanDispatch).text;
	for (const [field, mutated] of Object.entries(dispatchMutations)) {
		it(`разбор очереди: «${field}» меняет текст`, () => {
			assert.notEqual(
				describeDispatchReport(mutated).text,
				baselineDispatch,
				`поле «${field}» не влияет на текст — оно молча выпадает из отчёта`,
			);
		});
	}

	const baselineReminders = describeReminderReport(cleanReminders).text;
	for (const [field, mutated] of Object.entries(reminderMutations)) {
		it(`напоминания: «${field}» меняет текст`, () => {
			assert.notEqual(
				describeReminderReport(mutated).text,
				baselineReminders,
				`поле «${field}» не влияет на текст — оно молча выпадает из отчёта`,
			);
		});
	}

	it("ни в одном итоге нет латиницы и нет идентификатора организации", () => {
		const texts = [
			...Object.values(dispatchMutations).map(
				(report) => describeDispatchReport(report).text,
			),
			...Object.values(reminderMutations).map(
				(report) => describeReminderReport(report).text,
			),
			describeDispatchReport({ ...cleanDispatch, claimed: 0, sent: 0 }).text,
			describeDispatchReport({
				...cleanDispatch,
				claimed: 0,
				sent: 0,
				awaitingRetry: 3,
			}).text,
			describeDispatchReport({
				...cleanDispatch,
				claimed: 0,
				sent: 0,
				awaitingSchedule: 3,
			}).text,
			describeReminderReport({
				...cleanReminders,
				problems: [
					"Напоминания поставить не удалось: соединение с базой потеряно.",
				],
			}).text,
		];
		for (const text of texts) {
			assert.doesNotMatch(
				text,
				latinRun,
				`латинское слово в тексте для врача: ${text}`,
			);
			assert.doesNotMatch(
				text,
				rawUuid,
				`идентификатор организации попал на экран: ${text}`,
			);
		}
	});
});
