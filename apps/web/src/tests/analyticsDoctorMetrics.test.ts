import assert from "node:assert/strict";
import test from "node:test";
import {
	EMPTY_BODY_MESSAGE,
	MALFORMED_BODY_MESSAGE,
	MISSING_DATA_MESSAGE,
	UNKNOWN_METRIC_TEXT,
	formatCompletionRate,
	formatMarginCell,
	formatRub,
	metricToneClass,
	parseDashboardPayload,
} from "../pages/analyticsDoctorMetrics.js";

/**
 * Экран аналитики: две вещи, которые он делал неправильно.
 *
 * 1. Печатал «+null ₽» зелёным цветом прибыли и «null%» красным, потому что
 *    сервер честно отдаёт null, а интерфейс объявлял эти поля как `number`.
 *    Типизация такое не ловит: ответ разбирался как `any`, и `npm run typecheck`
 *    был зелёным всё время, пока экран показывал «null».
 *
 * 2. При пустом теле ответа `res.json()` бросал исключение, и его английский
 *    текст оказывался единственным содержимым экрана в русском продукте.
 *
 * Оба случая проверяются здесь как обычные значения, без DOM и без скриншота.
 */

test("прибыль: неизвестное значение — прочерк, нейтральный тон, без валюты и знака", () => {
	for (const unknown of [null, undefined]) {
		const cell = formatMarginCell(unknown);
		assert.equal(cell.text, UNKNOWN_METRIC_TEXT, "неизвестная прибыль обязана печататься прочерком");
		assert.equal(cell.tone, "neutral", "прочерк не бывает ни прибылью, ни убытком");
		// Главный дефект: «+null ₽» зелёным. Ни плюса, ни рубля, ни зелёного.
		assert.ok(!cell.text.includes("+"), "у неизвестной величины нет знака");
		assert.ok(!cell.text.includes("₽"), "у неизвестной величины нет единицы измерения");
		assert.ok(!cell.text.includes("null"), "слово null не должно доезжать до экрана");
		assert.ok(cell.title && cell.title.length > 0, "прочерк обязан объясняться подсказкой");
	}
	assert.equal(metricToneClass(formatMarginCell(null).tone), "text-[var(--muted)]");
});

test("прибыль: NaN и Infinity считаются неизвестными, а не числами", () => {
	assert.equal(formatMarginCell(Number.NaN).text, UNKNOWN_METRIC_TEXT);
	assert.equal(formatMarginCell(Number.POSITIVE_INFINITY).text, UNKNOWN_METRIC_TEXT);
});

test("прибыль: знак и тон берутся из настоящего числа", () => {
	const positive = formatMarginCell(120_000);
	assert.equal(positive.text, "+120,0 тыс. ₽");
	assert.equal(positive.tone, "positive");
	assert.equal(metricToneClass(positive.tone), "text-[var(--ok-fg)]");
	assert.equal(positive.title, undefined, "у посчитанного числа объяснять нечего");

	// Убыток не имеет права печататься со знаком «+».
	const smallLoss = formatMarginCell(-420);
	assert.equal(smallLoss.text, "−420 ₽");
	assert.equal(smallLoss.tone, "negative");
	assert.equal(metricToneClass(smallLoss.tone), "text-[var(--bad-fg)]");

	const bigLoss = formatMarginCell(-5_000);
	assert.equal(bigLoss.text, "−5,0 тыс. ₽");
	assert.equal(bigLoss.tone, "negative");

	// Ноль — посчитанный результат, а не отсутствие данных: прочерком не подменяется.
	const zero = formatMarginCell(0);
	assert.equal(zero.text, "0 ₽");
	assert.equal(zero.tone, "neutral");
});

/* Разряды русская локаль разделяет неразрывным пробелом, в новых ICU — узким. */
const plainMoney = (value: string) => value.replace(/[   ]/g, " ");

test("формат суммы: сокращение считается по модулю, знак стоит впереди", () => {
	// БЫЛО: +5000 печаталось как «5K ₽», а -5000 — как «-5000 ₽».
	assert.equal(plainMoney(formatRub(5_000)), "5,0 тыс. ₽");
	assert.equal(plainMoney(formatRub(-5_000)), "−5,0 тыс. ₽");
	assert.equal(plainMoney(formatRub(2_400_000)), "2,4 млн ₽");
	assert.equal(plainMoney(formatRub(-2_400_000)), "−2,4 млн ₽");
	assert.equal(plainMoney(formatRub(999)), "999 ₽");
	assert.equal(plainMoney(formatRub(0)), "0 ₽");
});

test("формат суммы: округление до целых тысяч больше не врёт", () => {
	/*
	 * БЫЛО: (abs/1000).toFixed(0) давало «1K ₽» для 1 400 и «2K ₽» для 1 500 —
	 * ошибка до половины суммы в плитке «Выручка».
	 */
	assert.equal(plainMoney(formatRub(1_400)), "1,4 тыс. ₽");
	assert.equal(plainMoney(formatRub(1_500)), "1,5 тыс. ₽");
	assert.equal(plainMoney(formatRub(9_900)), "9,9 тыс. ₽");
});

test("формат суммы: копейки видны, латиницы нет", () => {
	// БЫЛО: с переводом оплат на копейки 950,75 печаталось как «950.75 ₽».
	assert.equal(plainMoney(formatRub(950.75)), "950,75 ₽");
	assert.equal(plainMoney(formatRub(0.5)), "0,50 ₽");
	for (const value of [999, 1_500, 2_400_000]) {
		assert.ok(!/[A-Za-z]/.test(formatRub(value)), `латиница в «${formatRub(value)}»`);
	}
});

test("успешность: неизвестное значение не красится красным", () => {
	const cell = formatCompletionRate(null);
	assert.equal(cell.text, UNKNOWN_METRIC_TEXT);
	// Ровно этот дефект: null не проходил ни >= 80, ни >= 60, и попадал в красную ветку.
	assert.notEqual(cell.tone, "negative", "неизвестная величина — не плохая оценка врача");
	assert.equal(cell.tone, "neutral");
	assert.ok(!cell.text.includes("%"), "у неизвестной величины нет процентов");
});

test("успешность: пороги применяются к настоящему числу", () => {
	assert.deepEqual(formatCompletionRate(92), { text: "92 %", tone: "positive" });
	assert.deepEqual(formatCompletionRate(80), { text: "80 %", tone: "positive" });
	assert.deepEqual(formatCompletionRate(79.6), { text: "80 %", tone: "positive" });
	assert.deepEqual(formatCompletionRate(60), { text: "60 %", tone: "warning" });
	assert.deepEqual(formatCompletionRate(59), { text: "59 %", tone: "negative" });
	assert.deepEqual(formatCompletionRate(0), { text: "0 %", tone: "negative" });
	assert.equal(metricToneClass("warning"), "text-[var(--warn-fg)]");
});

/* ---------------------------------------------------------------- */

test("пустое тело ответа не превращается в английское исключение", () => {
	// Воспроизведение второго дефекта: сервер ответил 200 с пустым телом.
	const result = parseDashboardPayload(200, "");
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.message, EMPTY_BODY_MESSAGE);
	assert.ok(
		result.ok === false && !/[A-Za-z]{4,}/.test(result.message),
		"в сообщении не должно быть английских слов вроде Failed to execute 'json' on 'Response'",
	);
});

test("нераспознанное тело не роняет экран", () => {
	const result = parseDashboardPayload(200, "<html>502 Bad Gateway</html>");
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.message, MALFORMED_BODY_MESSAGE);
});

test("русское сообщение сервера доходит до экрана вместо голого кода состояния", () => {
	// БЫЛО: `throw new Error('Ошибка сервера: ' + res.status)` — готовое
	// объяснение из тела ответа (analytics.ts:280-284) выбрасывалось.
	const body = JSON.stringify({
		success: false,
		error: "AnalyticsUnavailable",
		message: "Не удалось построить аналитику. Данные не потеряны, повторите позже.",
	});
	const result = parseDashboardPayload(503, body);
	assert.equal(result.ok, false);
	assert.equal(
		result.ok === false && result.message,
		"Не удалось построить аналитику. Данные не потеряны, повторите позже.",
	);
});

test("503 с пустым телом сообщает о сбое, а не о пустом ответе", () => {
	const result = parseDashboardPayload(503, "");
	assert.equal(result.ok, false);
	assert.ok(result.ok === false && result.message.includes("503"));
});

test("401 объясняется доступом, а не кодом", () => {
	const result = parseDashboardPayload(401, "");
	assert.equal(result.ok, false);
	assert.ok(result.ok === false && result.message.includes("доступа"));
});

test("success:false больше не оставляет экран пустым", () => {
	// БЫЛО: `if (mounted && json.success)` — при success:false не выставлялись
	// ни данные, ни ошибка: экран показывал заголовок и пустоту под ним.
	const result = parseDashboardPayload(200, JSON.stringify({ success: false }));
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.message, MISSING_DATA_MESSAGE);
});

test("настоящий ответ сервера разбирается, null остаётся null", () => {
	// Форма взята из apps/api/src/routes/analytics.ts:244-274.
	const body = JSON.stringify({
		success: true,
		data: {
			kpis: {
				totalPatients: 12,
				totalRevenue: 480_000,
				totalAppointments: 34,
				avgRevenuePerPatient: 40_000,
			},
			cohortLtvJson: [{ cohort: "Май", "Month 12": 40_000 }],
			planFunnelJson: [{ name: "Завершены", value: 3, fill: "#10b981" }],
			chairUtilizationJson: [{ name: "Кресло 1", value: 7, fill: "#8b5cf6" }],
			doctorProfitabilityJson: [
				{ name: "Иванова А. П.", revenue: 480_000, margin: null, completionRate: null },
			],
			isEmpty: false,
		},
	});

	const result = parseDashboardPayload(200, body);
	assert.equal(result.ok, true);
	if (!result.ok) return;

	assert.equal(result.data.kpis.totalRevenue, 480_000);
	assert.equal(result.data.isEmpty, false);

	const doctor = result.data.doctorProfitabilityJson[0];
	assert.ok(doctor);
	// Ключевое: null не подменяется нулём. Выдуманный ноль — та же ложь,
	// что и прежние зашитые 35 % маржи.
	assert.equal(doctor.margin, null);
	assert.equal(doctor.completionRate, null);
	assert.equal(formatMarginCell(doctor.margin).text, UNKNOWN_METRIC_TEXT);
	assert.equal(formatCompletionRate(doctor.completionRate).text, UNKNOWN_METRIC_TEXT);
});

test("пустой период отличается от сбоя запроса", () => {
	const body = JSON.stringify({
		success: true,
		data: {
			kpis: { totalPatients: 0, totalRevenue: 0, totalAppointments: 0, avgRevenuePerPatient: 0 },
			cohortLtvJson: [],
			planFunnelJson: [],
			chairUtilizationJson: [],
			doctorProfitabilityJson: [],
			isEmpty: true,
		},
	});
	const result = parseDashboardPayload(200, body);
	assert.equal(result.ok, true);
	assert.equal(result.ok === true && result.data.isEmpty, true);
});

test("отсутствие поля isEmpty вычисляется по содержимому, а не считается заполненным", () => {
	const body = JSON.stringify({
		success: true,
		data: {
			kpis: { totalPatients: 0, totalRevenue: 0, totalAppointments: 0, avgRevenuePerPatient: 0 },
			cohortLtvJson: [],
			planFunnelJson: [],
			chairUtilizationJson: [],
			doctorProfitabilityJson: [],
		},
	});
	const result = parseDashboardPayload(200, body);
	assert.equal(result.ok === true && result.data.isEmpty, true);
});

test("мусор в строке врача не превращается в ноль-показатель", () => {
	const body = JSON.stringify({
		success: true,
		data: {
			kpis: {},
			doctorProfitabilityJson: [{ name: "Врач клиники", revenue: 1000, margin: "35%", completionRate: "85" }],
			isEmpty: false,
		},
	});
	const result = parseDashboardPayload(200, body);
	assert.equal(result.ok, true);
	if (!result.ok) return;
	const doctor = result.data.doctorProfitabilityJson[0];
	assert.ok(doctor);
	// Строка — не число. Приводить её к нулю нельзя: ноль это утверждение.
	assert.equal(doctor.margin, null);
	assert.equal(doctor.completionRate, null);
});
