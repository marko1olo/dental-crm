#!/usr/bin/env node
/**
 * scripts/tests/dice-audit.test.mjs — Юнит-тесты для Monte Carlo Reality Audit Engine.
 *
 * Проверяет:
 *  1. Детерминированность PRNG (Mulberry32): одинаковый сид -> идентичный результат.
 *  2. CLI парсер аргументов (--samples, --seed, --list, --strict, --json).
 *  3. Инспекцию строк (чистые кейсы vs обнаружение any, non-null, money division, uppercase).
 *  4. Формат и структуру полного отчета runDiceAudit.
 *  5. Детерминированный прогон аудита по сиду на реальной кодовой базе.
 *
 * Запуск: node --test scripts/tests/dice-audit.test.mjs
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	createPrng,
	inspectLine,
	parseCliArgs,
	runDiceAudit,
} from "../dice-audit.mjs";

test("PRNG Mulberry32: детерминированность генерации по числовому и строковому сиду", () => {
	const rng1 = createPrng(42);
	const rng2 = createPrng(42);

	const seq1 = [rng1(), rng1(), rng1(), rng1()];
	const seq2 = [rng2(), rng2(), rng2(), rng2()];

	assert.deepEqual(seq1, seq2, "Одинаковый числовой сид обязан выдавать идентичную последовательность чисел");

	const rngStr1 = createPrng("dente-seed-2026");
	const rngStr2 = createPrng("dente-seed-2026");

	const seqStr1 = [rngStr1(), rngStr1(), rngStr1()];
	const seqStr2 = [rngStr2(), rngStr2(), rngStr2()];

	assert.deepEqual(seqStr1, seqStr2, "Одинаковый строковый сид обязан выдавать идентичную последовательность чисел");

	// Разные сиды должны выдавать разные числа
	const rngDiff = createPrng(999);
	assert.notEqual(rng1(), rngDiff(), "Разные сиды обязаны выдавать разные псевдослучайные последовательности");
});

test("CLI парсер аргументов: значения по умолчанию и флаги", () => {
	// Значения по умолчанию
	const def = parseCliArgs([]);
	assert.equal(def.samples, 100);
	assert.equal(def.seed, null);
	assert.equal(def.list, "all");
	assert.equal(def.strict, false);
	assert.equal(def.json, false);

	// Передача флагов через пробел
	const opts1 = parseCliArgs(["--samples", "10", "--seed", "test-42", "--list", "doors", "--strict", "--json"]);
	assert.equal(opts1.samples, 10);
	assert.equal(opts1.seed, "test-42");
	assert.equal(opts1.list, "doors");
	assert.equal(opts1.strict, true);
	assert.equal(opts1.json, true);

	// Передача флагов через =
	const opts2 = parseCliArgs(["--samples=35", "--seed=12345", "--list=fields"]);
	assert.equal(opts2.samples, 35);
	assert.equal(opts2.seed, "12345");
	assert.equal(opts2.list, "fields");

	// Короткие флаги
	const opts3 = parseCliArgs(["-n", "7", "-s", "abc", "-l", "ui"]);
	assert.equal(opts3.samples, 7);
	assert.equal(opts3.seed, "abc");
	assert.equal(opts3.list, "ui");
});

test("Инспектор строк inspectLine: чистая строка признается CLEAN", () => {
	const sampleClean = {
		relPath: "packages/shared/src/billing/money.ts",
		lineNum: 42,
		current: "export function formatKopecksToRub(kopecks: bigint): string {",
		before: ["// Вспомогательная утилита", "import { RUB } from './types';"],
		after: ["  const rubles = Number(kopecks) / 100;", "  return `${rubles} ₽`;"],
	};

	const res = inspectLine(sampleClean);
	assert.equal(res.status, "CLEAN");
	assert.equal(res.defects.length, 0);
	assert.equal(res.system.layer.includes("Ядро"), true);
});

test("Инспектор строк inspectLine: выявление запрещенного as any и double cast (Мандат 8be)", () => {
	const sampleAny = {
		relPath: "apps/api/src/routes/billing.ts",
		lineNum: 88,
		current: "const payload = request.body as any;",
		before: [],
		after: [],
	};

	const resAny = inspectLine(sampleAny);
	assert.equal(resAny.status, "DEFECT");
	assert.ok(resAny.defects.some((d) => d.rule === "MANDATE_8be_AS_ANY"));

	const sampleDoubleCast = {
		relPath: "apps/web/src/components/patient.tsx",
		lineNum: 105,
		current: "const safeUser = user as unknown as PatientDto;",
		before: [],
		after: [],
	};

	const resDouble = inspectLine(sampleDoubleCast);
	assert.equal(resDouble.status, "DEFECT");
	assert.ok(resDouble.defects.some((d) => d.rule === "MANDATE_8be_DOUBLE_CAST"));
});

test("Инспектор строк inspectLine: выявление Non-Null assertion (!) (Мандат 8be)", () => {
	const sampleNonNull = {
		relPath: "apps/api/src/routes/diary.ts",
		lineNum: 55,
		current: "const userId = req.user!.id;",
		before: [],
		after: [],
	};

	const res = inspectLine(sampleNonNull);
	assert.equal(res.status, "DEFECT");
	assert.ok(res.defects.some((d) => d.rule === "MANDATE_8be_NON_NULL_ASSERTION"));
});

test("Инспектор строк inspectLine: выявление опасного деления на 100 для сумм (Мандат 8bm)", () => {
	const sampleDiv = {
		relPath: "apps/web/src/components/cashbox/Checkout.tsx",
		lineNum: 120,
		current: "const rubles = item.price / 100;",
		before: [],
		after: [],
	};

	const res = inspectLine(sampleDiv);
	assert.equal(res.status, "DEFECT");
	assert.ok(res.defects.some((d) => d.rule === "MANDATE_8bm_RAW_MONEY_DIVISION"));
});

test("Инспектор строк inspectLine: выявление uppercase на кнопках (Мандат 8am)", () => {
	const sampleUppercase = {
		relPath: "apps/web/src/components/Toolbar.tsx",
		lineNum: 33,
		current: '<button className="h-9 px-4 uppercase bg-teal-600">',
		before: ["<div className='flex gap-2'>"],
		after: ["  <span>Записать</span>", "</button>"],
	};

	const res = inspectLine(sampleUppercase);
	assert.equal(res.status, "DEFECT");
	assert.ok(res.defects.some((d) => d.rule === "MANDATE_8am_UPPERCASE_BAN"));
});

test("Полный прогон runDiceAudit: детерминированность и структура JSON отчета", () => {
	const report1 = runDiceAudit({ samples: 4, seed: "audit-fixed-seed", list: "all" });
	const report2 = runDiceAudit({ samples: 4, seed: "audit-fixed-seed", list: "all" });

	assert.ok(report1.meta);
	assert.equal(report1.meta.seed, "audit-fixed-seed");
	assert.equal(report1.lines.length, 4);

	// Проверяем полную детерминированность по сиду
	assert.deepEqual(report1.lines, report2.lines, "Выборка строк должна совпадать байт-в-байт при одинаковом сиде");
	assert.deepEqual(report1.doors, report2.doors, "Сэмплирование дверей должно совпадать при одинаковом сиде");
	assert.deepEqual(report1.fields, report2.fields, "Сэмплирование полей должно совпадать при одинаковом сиде");
	assert.deepEqual(report1.ui, report2.ui, "Сэмплирование UI контролов должно совпадать при одинаковом сиде");

	// Проверяем наличие 3 вопросов реальности в каждом элементе выборки строк
	for (const line of report1.lines) {
		assert.ok(line.relPath, "relPath обязан присутствовать");
		assert.ok(line.lineNum > 0, "lineNum обязан быть положительным числом");
		assert.ok(line.system.domain, "Вопрос 1: система/домен обязана определяться");
		assert.ok(line.officialDoor, "Вопрос 2: официальная дверь обязана определяться");
		assert.ok(["CLEAN", "DEFECT"].includes(line.status), "Вопрос 3: статус обязан быть CLEAN или DEFECT");
		assert.ok(Array.isArray(line.context.before), "Контекст до строки обязан быть массивом");
		assert.ok(typeof line.context.current === "string", "Текущая строка обязана быть строкой");
		assert.ok(Array.isArray(line.context.after), "Контекст после строки обязан быть массивом");
	}

	// Проверяем структуру summary
	assert.ok(report1.summary.totalSamples > 0);
	assert.ok(report1.summary.realityScorePercent >= 0 && report1.summary.realityScorePercent <= 100);
});

test("Изолированные списки runDiceAudit (--list doors, fields, ui)", () => {
	const reportDoors = runDiceAudit({ samples: 4, seed: 100, list: "doors" });
	assert.equal(reportDoors.lines.length, 0, "При --list doors кубик строк не запускается");
	assert.ok(reportDoors.doors.sampled.length > 0);
	assert.equal(reportDoors.fields, null);
	assert.equal(reportDoors.ui, null);

	const reportFields = runDiceAudit({ samples: 4, seed: 100, list: "fields" });
	assert.equal(reportFields.lines.length, 0);
	assert.equal(reportFields.doors, null);
	assert.ok(reportFields.fields.sampled.length > 0);
	assert.equal(reportFields.ui, null);

	const reportUi = runDiceAudit({ samples: 4, seed: 100, list: "ui" });
	assert.equal(reportUi.lines.length, 0);
	assert.equal(reportUi.doors, null);
	assert.equal(reportFields.doors, null);
	assert.ok(reportUi.ui.sampled.length > 0);
});
