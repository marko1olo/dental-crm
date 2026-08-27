import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateCapacityYieldKopecks,
	calculateChairUtilizationPercent,
	calculateHourlyRevenueKopecks,
	calculateRecallRates,
	classifyChurnRisk,
	formatDoctorGenitive,
	formatKopecksPerHour,
	formatKopecksToRub,
	generatePersonalizedOffer,
	numberOrNull,
	parseWidgetListPayload,
	roleLabel,
	textOr,
	WIDGET_LOAD_ERROR_MESSAGE,
} from "./analyticsWidgetData.js";

/**
 * Виджеты аналитики: три вещи, которые они делали неправильно.
 *
 * 1. `res.json()` вызывался без проверки `res.ok`. Ответ 401 отдаёт корректный
 *    JSON-объект с сообщением, `Array.isArray` давал false, и виджет писал
 *    «Правила повторной записи пусты» — провал запроса выдавался за «данных нет».
 * 2. Пустое тело роняло `res.json()` исключением, которое глотал `catch`, —
 *    получалось то же ложное «пусто».
 * 3. Поля элемента читались без проверки: `rule.creditedRole.toUpperCase()`
 *    бросал TypeError во время отрисовки и ронял весь раздел «Аналитика».
 *
 * Всё это проверяется обычным node:test, потому что решение вынесено в чистые
 * функции: ни fetch, ни DOM.
 */

const identity = (row: Record<string, unknown>) => row;

test("ответ 401 — это ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(
		401,
		JSON.stringify({ message: "Нет доступа" }),
		identity,
	);
	assert.equal(result.ok, false);
	assert.equal(
		result.ok === false && result.message,
		WIDGET_LOAD_ERROR_MESSAGE,
	);
});

test("ответ 500 — это ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(500, "", identity);
	assert.equal(result.ok, false);
});

test("пустое тело на статусе 200 — ошибка, а не пустой список", () => {
	const result = parseWidgetListPayload(200, "", identity);
	assert.equal(result.ok, false);
	assert.equal(
		result.ok === false && result.message,
		WIDGET_LOAD_ERROR_MESSAGE,
	);
});

test("не JSON в теле — ошибка", () => {
	assert.equal(
		parseWidgetListPayload(200, "<html>502</html>", identity).ok,
		false,
	);
});

test("пустой массив — это успешный пустой список", () => {
	const result = parseWidgetListPayload(200, "[]", identity);
	assert.equal(result.ok, true);
	assert.deepEqual(result.ok === true && result.items, []);
});

test("список внутри конверта {data} тоже читается", () => {
	const result = parseWidgetListPayload(
		200,
		JSON.stringify({ success: true, data: [{ id: "1" }] }),
		identity,
	);
	assert.equal(result.ok, true);
	assert.equal(result.ok === true && result.items.length, 1);
});

test("элементы, не являющиеся объектами, до разметки не доходят", () => {
	const result = parseWidgetListPayload(
		200,
		JSON.stringify([null, "строка", 7, { id: "1" }]),
		identity,
	);
	assert.equal(result.ok, true);
	assert.equal(result.ok === true && result.items.length, 1);
});

test("роль переводится по общей карте названий, сокращение ADMIN тоже", () => {
	assert.equal(roleLabel("DOCTOR"), "Врач");
	assert.equal(roleLabel("ADMIN"), "Администратор");
	assert.equal(roleLabel("ADMINISTRATOR"), "Администратор");
	assert.equal(roleLabel("assistant"), "Ассистент");
	assert.equal(roleLabel("OWNER"), "Владелец");
	assert.equal(roleLabel("manager"), "Управляющий");
});

test("пустая роль не роняет виджет и не печатается пустым местом", () => {
	// Именно этот случай ронял весь раздел: `.toUpperCase()` на undefined.
	assert.equal(roleLabel(undefined), "роль не указана");
	assert.equal(roleLabel(""), "роль не указана");
	assert.equal(roleLabel("   "), "роль не указана");
	assert.equal(roleLabel(null), "роль не указана");
	assert.equal(roleLabel(42), "роль не указана");
});

test("незнакомая роль показывается как есть, а не прячется", () => {
	assert.equal(roleLabel("куратор"), "куратор");
});

test("текст поля: непустая строка или подпись вместо пустоты", () => {
	assert.equal(textOr("  Иванов  ", "нет"), "Иванов");
	assert.equal(textOr("", "нет"), "нет");
	assert.equal(textOr(undefined, "нет"), "нет");
	assert.equal(textOr(123, "нет"), "нет");
});

test("число: numeric-строка из базы читается, мусор к нулю не приводится", () => {
	assert.equal(numberOrNull("42.5"), 42.5);
	assert.equal(numberOrNull(0), 0);
	assert.equal(numberOrNull("н/д"), null);
	assert.equal(numberOrNull(undefined), null);
	assert.equal(numberOrNull(Number.NaN), null);
});

/* ------------------------------------------------------------------ */
/*  Тесты утилизации кресел и точных финансовых расчётов в копейках    */
/* ------------------------------------------------------------------ */

test("калькулятор утилизации кресла корректно считает процент загрузки", () => {
	// 360 минут занято из 720 минут доступно = 50.0%
	assert.equal(calculateChairUtilizationPercent(360, 720), 50);
	// 540 минут занято из 720 минут = 75.0%
	assert.equal(calculateChairUtilizationPercent(540, 720), 75);
	// 0 минут = 0%
	assert.equal(calculateChairUtilizationPercent(0, 720), 0);
	// Защита от деления на 0 и отрицательных чисел
	assert.equal(calculateChairUtilizationPercent(100, 0), 0);
	assert.equal(calculateChairUtilizationPercent(100, -10), 0);
	assert.equal(calculateChairUtilizationPercent(Number.NaN, 720), 0);
	// Ограничение максимума 100%
	assert.equal(calculateChairUtilizationPercent(800, 720), 100);
});

test("выручка на кресло-час в целых копейках считается без потери точности", () => {
	// 100 000 руб (10 000 000 коп) за 120 минут (2 часа) = 50 000 руб/час (5 000 000 коп/час)
	const hourlyKopecks = calculateHourlyRevenueKopecks(10_000_000, 120);
	assert.equal(hourlyKopecks, 5_000_000);
	assert.equal(formatKopecksToRub(hourlyKopecks, false), "50 000 ₽");
	assert.equal(formatKopecksPerHour(hourlyKopecks), "50 000 ₽/час");

	// Проверка capacity yield (выручка на доступный час мощности)
	// 10 000 000 коп на 480 минут смены (8 часов) = 1 250 000 коп/час (12 500 руб/час)
	const capacityYield = calculateCapacityYieldKopecks(10_000_000, 480);
	assert.equal(capacityYield, 1_250_000);
	assert.equal(formatKopecksPerHour(capacityYield), "12 500 ₽/час");

	// Граничные условия
	assert.equal(calculateHourlyRevenueKopecks(0, 120), 0);
	assert.equal(calculateHourlyRevenueKopecks(1000, 0), 0);
	assert.equal(calculateHourlyRevenueKopecks(-500, 120), 0);
});

test("форматирование копеек в рубли работает точно и с разделителями тысяч", () => {
	assert.equal(formatKopecksToRub(14_500_050, true), "145 000,50 ₽");
	assert.equal(formatKopecksToRub(14_500_000, true), "145 000,00 ₽");
	assert.equal(formatKopecksToRub(14_500_000, false), "145 000 ₽");
	assert.equal(formatKopecksToRub(0, true), "0,00 ₽");
	assert.equal(formatKopecksToRub(0, false), "0 ₽");
	assert.equal(formatKopecksToRub(99, true), "0,99 ₽");
});

/* ------------------------------------------------------------------ */
/*  Тесты когортного анализа возвращаемости (Recall 6 / 12 мес)       */
/* ------------------------------------------------------------------ */

test("когортный анализ возвращаемости корректно вычисляет проценты и статусы", () => {
	// 100 пациентов, 72 вернулись на 6 мес, 68 на 12 мес -> отличная возвращаемость (ok)
	const cohortGood = calculateRecallRates(100, 72, 68);
	assert.equal(cohortGood.rate6m, 72);
	assert.equal(cohortGood.rate12m, 68);
	assert.equal(cohortGood.healthTone, "ok");

	// 50 пациентов, 26 вернулись на 6 мес (52%) -> требует внимания (warn)
	const cohortWarn = calculateRecallRates(50, 26, 20);
	assert.equal(cohortWarn.rate6m, 52);
	assert.equal(cohortWarn.rate12m, 40);
	assert.equal(cohortWarn.healthTone, "warn");

	// 80 пациентов, 16 вернулись на 6 мес (20%), 8 на 12 мес (10%) -> критический отток (bad)
	const cohortBad = calculateRecallRates(80, 16, 8);
	assert.equal(cohortBad.rate6m, 20);
	assert.equal(cohortBad.rate12m, 10);
	assert.equal(cohortBad.healthTone, "bad");

	// 0 пациентов не вызывает деления на 0
	const cohortZero = calculateRecallRates(0, 0, 0);
	assert.equal(cohortZero.rate6m, 0);
	assert.equal(cohortZero.rate12m, 0);
	assert.equal(cohortZero.healthTone, "bad");
});

/* ------------------------------------------------------------------ */
/*  Тесты классификации риска оттока и генератора предложений         */
/* ------------------------------------------------------------------ */

test("классификация риска оттока делит пациентов по срокам и профилю лечения", () => {
	// Санация: 190 дней (~6.3 мес) -> срок профгигиены
	const risk6m = classifyChurnRisk(190, "sanitation");
	assert.equal(risk6m.band, "due_6m");
	assert.equal(risk6m.badgeTone, "ok");
	assert.match(risk6m.recommendedService, /Air-Flow/);

	// Имплантация: 400 дней (~13 мес) -> пропущен годовой осмотр
	const risk12mImp = classifyChurnRisk(400, "implantation");
	assert.equal(risk12mImp.band, "overdue_12m");
	assert.equal(risk12mImp.badgeTone, "warn");
	assert.match(risk12mImp.recommendedService, /КТ-контроль|остеоинтеграции/);

	// 800 дней (>2 лет) -> критический отток
	const risk24m = classifyChurnRisk(800, "general_therapy");
	assert.equal(risk24m.band, "critical_24m");
	assert.equal(risk24m.badgeTone, "bad");
});

test("генератор персональных предложений формирует корректный текст по 38-ФЗ и ФИО", () => {
	// Пациент после имплантации (год без визита)
	const offerImp = generatePersonalizedOffer({
		patientName: "Смирнова Елена Александровна",
		clinicName: "Дент-Премиум",
		daysSinceLastVisit: 380,
		category: "implantation",
		doctorName: "Барабаш С.В.",
	});

	assert.match(offerImp.messageText, /Елена Александровна/);
	assert.match(offerImp.messageText, /Дент-Премиум/);
	assert.match(offerImp.messageText, /имплантации/);
	assert.match(offerImp.messageText, /Барабаш С\.В\./);
	assert.equal(offerImp.channelSuggestions.includes("whatsapp"), true);

	// Санация: проверка склонения врача («Смирнов А.П.» -> «у д-ра Смирнова А.П.») и отсутствия двойных точек
	const offerDoctorSan = generatePersonalizedOffer({
		patientName: "Барабаш Сергей Владимирович",
		clinicName: "Стоматология Дент-Премиум",
		daysSinceLastVisit: 195,
		category: "sanitation",
		doctorName: "Смирнов А.П.",
	});

	assert.match(offerDoctorSan.messageText, /Сергей Владимирович/);
	assert.match(offerDoctorSan.messageText, /у д-ра Смирнова А\.П\./);
	assert.equal(offerDoctorSan.messageText.includes(".."), false);

	// Женская фамилия
	const offerDocWoman = generatePersonalizedOffer({
		patientName: "Ковалёва Анна Игоревна",
		clinicName: "Стоматология Дент-Премиум",
		daysSinceLastVisit: 215,
		category: "sanitation",
		doctorName: "Ковалёва А.И.",
	});
	assert.match(offerDocWoman.messageText, /у д-ра Ковалёвой А\.И\./);
	assert.equal(offerDocWoman.messageText.includes(".."), false);
});

test("функция formatDoctorGenitive корректно склоняет фамилии врачей", () => {
	assert.equal(formatDoctorGenitive("Смирнов А.П."), "Смирнова А.П.");
	assert.equal(formatDoctorGenitive("Ковалёва А.И."), "Ковалёвой А.И.");
	assert.equal(formatDoctorGenitive("Белый И.С."), "Белого И.С.");
	assert.equal(formatDoctorGenitive(""), "");
});

