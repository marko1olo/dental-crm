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
 *  6. Валидацию манифестов отказов FAILURE_MANIFESTOS.
 *
 * Запуск: node --test scripts/tests/dice-audit.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	auditDoors,
	auditFields,
	auditTests,
	auditUi,
	createPrng,
	inspectLine,
	isCombatSourceFile,
	parseCliArgs,
	runDiceAudit,
	sampleLines,
} from "../dice-audit.mjs";
import { FAILURE_MANIFESTOS, printFailureManifesto } from "../manifests/failure-manifestos.mjs";

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

test("Инспектор строк inspectLine: выявление скрытого умножения денег на 0.01 / .01 (Мандат 8bm)", () => {
	const sampleMul = {
		relPath: "apps/api/src/routes/payroll.ts",
		lineNum: 45,
		current: "const docBonus = doctorWageBaseKopecks * docPct * 0.01;",
		before: [],
		after: [],
	};

	const res = inspectLine(sampleMul);
	assert.equal(res.status, "DEFECT");
	assert.ok(res.defects.some((d) => d.rule === "MANDATE_8bm_RAW_MONEY_MULTIPLICATION"));

	// Проверка на пропуск легальных выражений (СанПиН 1%, геометрия рентгена, SVG)
	const sampleSanPin = {
		relPath: "apps/api/src/services/sterilization.ts",
		lineNum: 80,
		current: "const sampleSize = batchItemCount * 0.01;",
		before: [],
		after: [],
	};
	assert.equal(inspectLine(sampleSanPin).status, "CLEAN");

	const sampleGeometry = {
		relPath: "apps/web/src/components/imaging/RvgViewer.tsx",
		lineNum: 110,
		current: "const screenDx = dx * 0.01 * imageWidthPx;",
		before: [],
		after: [],
	};
	assert.equal(inspectLine(sampleGeometry).status, "CLEAN");
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

test("E2E CLI execution: --help prints usage and exits with 0", () => {
	const scriptPath = path.resolve("scripts/dice-audit.mjs");
	const res = spawnSync("node", [scriptPath, "--help"], { encoding: "utf8" });
	assert.equal(res.status, 0, "CLI --help обязан выходить с кодом 0");
	assert.ok(res.stdout.includes("Использование:"), "Вывод обязан содержать справку");
	assert.ok(res.stdout.includes("--strict"), "Справка обязана содержать описание флага --strict");
});

test("E2E CLI execution: --json produces valid parseable JSON report", () => {
	const scriptPath = path.resolve("scripts/dice-audit.mjs");
	const res = spawnSync("node", [scriptPath, "--samples", "2", "--seed", "json-test-seed", "--json"], {
		encoding: "utf8",
	});
	assert.equal(res.status, 0, "CLI с --json обязан выходить с кодом 0 при отсутствии --strict");
	const parsed = JSON.parse(res.stdout);
	assert.ok(parsed.meta, "JSON отчет обязан содержать meta");
	assert.equal(parsed.meta.seed, "json-test-seed");
	assert.ok(parsed.summary, "JSON отчет обязан содержать summary");
	assert.equal(parsed.lines.length, 2, "Должно быть ровно 2 сэмпла строк");
});

test("E2E CLI execution: --strict with defects returns Exit Code 1", () => {
	const scriptPath = path.resolve("scripts/dice-audit.mjs");
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-strict-defects-"));
	try {
		const routesDir = path.join(tmpDir, "apps/api/src/routes");
		mkdirSync(routesDir, { recursive: true });
		writeFileSync(
			path.join(routesDir, "brokenMutationRoute.ts"),
			[
				'import type { FastifyInstance } from "fastify";',
				"export async function brokenMutationRoutes(app: FastifyInstance) {",
				'  app.post("/api/broken/pay", async (req, reply) => {',
				'    await db.insert("payments").values({ amount: req.body });',
				'    await db.update("invoices").set({ status: "paid" });',
				"    return reply.send({ ok: true });",
				"  });",
				"}",
			].join("\n"),
			"utf8",
		);

		const res = spawnSync(
			"node",
			[scriptPath, "--root", tmpDir, "--list", "doors", "--samples", "5", "--strict"],
			{ encoding: "utf8" },
		);
		assert.equal(res.status, 1, "При обнаружении дефектов с --strict CLI ОБЯЗАН завершаться с Exit Code 1");
		assert.ok(
			res.stdout.includes("ВЕРДИКТ") || res.stdout.includes("РЕЙТИНГ") || res.stderr.includes("ШЛЮЗ"),
			"Вывод обязан содержать результат проверки или манифест отказа",
		);
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});

test("E2E CLI execution: without --strict returns Exit Code 0 even with warnings", () => {
	const scriptPath = path.resolve("scripts/dice-audit.mjs");
	const res = spawnSync("node", [scriptPath, "--list", "doors", "--samples", "5"], {
		encoding: "utf8",
	});
	assert.equal(res.status, 0, "Без --strict CLI работает в режиме инспекции и выходит с Exit Code 0");
});

test("Мутационное тестирование: намеренно внедренные дефекты гарантированно отлавливаются инспектором", () => {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-mutation-"));
	try {
		const badCode = [
			"// Исходный файл с дефектами для мутационного теста",
			"export function processPayment(req: any) {",
			"  const payload = req.body as any;",
			"  const userId = req.user!.id;",
			"  const rubAmount = req.body.price / 100;",
			"  const bonus = req.body.kopecks * 0.01;",
			'  return <button className="h-9 px-4 uppercase bg-amber-100">Оплатить</button>;',
			"}",
		].join("\n");

		const testFile = path.join(tmpDir, "mutationVictim.tsx");
		writeFileSync(testFile, badCode, "utf8");

		// Проверяем каждую строку отдельно
		const lines = badCode.split("\n");

		// Строка 3: payload = req.body as any;
		const sampleAny = {
			relPath: "apps/web/src/components/mutationVictim.tsx",
			lineNum: 3,
			current: lines[2],
			before: lines.slice(0, 2),
			after: lines.slice(3),
		};
		const resAny = inspectLine(sampleAny);
		assert.equal(resAny.status, "DEFECT", "Слепой 'as any' обязан детектироваться");
		assert.ok(resAny.defects.some((d) => d.rule === "MANDATE_8be_AS_ANY"));

		// Строка 4: userId = req.user!.id;
		const sampleNonNull = {
			relPath: "apps/api/src/routes/mutationVictim.ts",
			lineNum: 4,
			current: lines[3],
			before: lines.slice(0, 3),
			after: lines.slice(4),
		};
		const resNonNull = inspectLine(sampleNonNull);
		assert.equal(resNonNull.status, "DEFECT", "Non-null assertion '!' обязан детектироваться");
		assert.ok(resNonNull.defects.some((d) => d.rule === "MANDATE_8be_NON_NULL_ASSERTION"));

		// Строка 5: rubAmount = req.body.price / 100;
		const sampleDiv = {
			relPath: "apps/api/src/routes/mutationVictim.ts",
			lineNum: 5,
			current: lines[4],
			before: lines.slice(0, 4),
			after: lines.slice(5),
		};
		const resDiv = inspectLine(sampleDiv);
		assert.equal(resDiv.status, "DEFECT", "Деление денег на 100 обязано детектироваться");
		assert.ok(resDiv.defects.some((d) => d.rule === "MANDATE_8bm_RAW_MONEY_DIVISION"));

		// Строка 7: button uppercase
		const sampleUpper = {
			relPath: "apps/web/src/components/mutationVictim.tsx",
			lineNum: 7,
			current: lines[6],
			before: lines.slice(0, 6),
			after: [],
		};
		const resUpper = inspectLine(sampleUpper);
		assert.equal(resUpper.status, "DEFECT", "Капслок на кнопке обязан детектироваться");
		assert.ok(resUpper.defects.some((d) => d.rule === "MANDATE_8am_UPPERCASE_BAN"));

		// Инспекция через sampleLines на синтетическом файле
		const prng = createPrng(12345);
		const samples = sampleLines([testFile], 1, prng, tmpDir);
		assert.equal(samples.length, 1);
		assert.ok(["CLEAN", "DEFECT"].includes(samples[0].status));
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});

test("Глубокий аудит дверей (auditDoors): выявление мутаций без Idempotency-Key и без транзакций", () => {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-doors-"));
	try {
		const routesDir = path.join(tmpDir, "apps/api/src/routes");
		mkdirSync(routesDir, { recursive: true });

		const dirtyRouteCode = [
			'import { FastifyInstance } from "fastify";',
			"export async function dirtyMutationRoutes(fastify: FastifyInstance) {",
			'  fastify.post("/api/invoices/pay", async (req, reply) => {',
			"    const { invoiceId, amount } = req.body as any;",
			"    // Прямой insert без Idempotency-Key и без транзакции",
			'    await db.insert("payments").values({ invoiceId, amount });',
			'    await db.update("invoices").set({ status: "paid" });',
			"    return { success: true };",
			"  });",
			"}",
		].join("\n");

		writeFileSync(path.join(routesDir, "dirtyPaymentRoute.ts"), dirtyRouteCode, "utf8");

		const prng = createPrng(42);
		const doorReport = auditDoors(tmpDir, prng, 1);
		assert.equal(doorReport.totalDoorsFound, 1, "Должна быть найдена 1 мутационная дверь");
		const door = doorReport.sampled[0];
		assert.equal(door.status, "DEFECT", "Дверь без Idempotency-Key и транзакции обязана быть DEFECT");
		assert.equal(door.hasIdempotency, false, "hasIdempotency обязан быть false");
		assert.equal(door.hasTransaction, false, "hasTransaction обязан быть false");
		assert.ok(door.issues.some((iss) => iss.includes("Idempotency-Key")));
		assert.ok(door.issues.some((iss) => iss.includes("db.transaction")));
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});

test("Глубокий аудит полей (auditFields): выявление z.any() и float-numeric колонок", () => {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-fields-"));
	try {
		const schemaDir = path.join(tmpDir, "apps/api/src/db/schema");
		mkdirSync(schemaDir, { recursive: true });

		const dirtySchemaCode = [
			'import { pgTable, serial, numeric, text } from "drizzle-orm/pg-core";',
			'import { z } from "zod";',
			'export const dirtyPaymentsTable = pgTable("dirty_payments", {',
			'  id: serial("id").primaryKey(),',
			'  rubAmount: numeric("rub_amount").notNull(),',
			"});",
			"export const dirtyPayloadSchema = z.object({",
			"  rawPayload: z.any(),",
			"});",
		].join("\n");

		writeFileSync(path.join(schemaDir, "dirtySchema.ts"), dirtySchemaCode, "utf8");

		const prng = createPrng(42);
		const fieldReport = auditFields(tmpDir, prng, 2);
		assert.equal(fieldReport.totalContractsFound, 2, "Должно быть найдено 2 контракта (таблица и схема)");

		const tableContract = fieldReport.sampled.find((c) => c.type === "Drizzle Table");
		assert.ok(tableContract, "Drizzle Table должна присутствовать");
		assert.ok(tableContract.issues.some((iss) => iss.includes("numeric(Rub)")));

		const zodContract = fieldReport.sampled.find((c) => c.type === "Zod Contract Schema");
		assert.ok(zodContract, "Zod Contract Schema должна присутствовать");
		assert.ok(zodContract.issues.some((iss) => iss.includes("z.any()")));
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});

test("Глубокий аудит UI (auditUi): выявление файлов-клонов модалок (*Modal2.tsx)", () => {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-ui-"));
	try {
		const componentsDir = path.join(tmpDir, "apps/web/src/components");
		mkdirSync(componentsDir, { recursive: true });

		const modalCode = [
			'import React from "react";',
			"export function PatientCardModal2() {",
			'  return <button className="h-9 px-4 rounded-lg">Сохранить</button>;',
			"}",
		].join("\n");

		writeFileSync(path.join(componentsDir, "PatientCardModal2.tsx"), modalCode, "utf8");

		const prng = createPrng(42);
		const uiReport = auditUi(tmpDir, prng, 1);
		assert.equal(uiReport.duplicateModalsFound, 1, "Файл-клон PatientCardModal2.tsx обязан быть обнаружен");
		assert.equal(uiReport.duplicateModals[0].rule, "MANDATE_8s_DUPLICATE_CLONE");
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});

test("isCombatSourceFile исключает файлы внутри /tests/ (например moneyChainProof.ts)", () => {
	assert.equal(isCombatSourceFile("apps/api/src/tests/chains/moneyChainProof.ts"), false);
	assert.equal(isCombatSourceFile("apps/api/src/tests/chains/moneyChainProof.ts".replace(/\//g, "\\")), false);
	assert.equal(isCombatSourceFile("apps/api/src/routes/billing.ts"), true);
});

test("Кубик v2: inspectLine ловит catch {} без скобок, .catch(()=>{}), z.any(), @ts-expect-error, any[], as never и NON_NULL_RE", () => {
	const cases = [
		["try { save(); } catch {}", "MANDATE_8zr_EMPTY_CATCH"],
		["fetch('/api/x').catch(() => {});", "MANDATE_8zr_SWALLOWED_PROMISE"],
		["const s = z.object({ a: z.any() });", "MANDATE_8be_ZOD_ANY"],
		["// @ts-expect-error ignore later", "MANDATE_8be_SUPPRESSION_DIRECTIVE"],
		["const list: any[] = [];", "MANDATE_8be_EXPLICIT_ANY"],
		["const x = val as never;", "MANDATE_8be_AS_NEVER"],
		["const first = items[0]!;", "MANDATE_8be_NON_NULL_ASSERTION"],
		["if (process.env.VITEST) return;", "ANTI_GOODHART_TEST_ENV_SNIFF"],
	];
	for (const [line, expectedRule] of cases) {
		const res = inspectLine({ relPath: "apps/api/src/routes/x.ts", lineNum: 10, current: line, before: [], after: [] });
		assert.equal(res.status, "DEFECT", `должен находить дефект в: ${line}`);
		assert.ok(res.defects.some((d) => d.rule === expectedRule), `ожидали ${expectedRule} для: ${line}, получили ${JSON.stringify(res.defects)}`);
	}
});

test("Кубик v2 Список 4 (auditTests / --list tests): выявляет лживые тесты (assert.ok(true), no-assertion, phantom)", () => {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-tests-"));
	try {
		const testsDir = path.join(tmpDir, "packages/shared/src/tests");
		mkdirSync(testsDir, { recursive: true });
		writeFileSync(
			path.join(testsDir, "lying.test.ts"),
			[
				'import assert from "node:assert/strict";',
				'import { it } from "node:test";',
				'it("fake pass", () => { assert.ok(true); });',
				'it("no assert", () => { const a = 1 + 1; void a; });',
			].join("\n"),
			"utf8",
		);
		const report = auditTests(tmpDir, createPrng(7), 5);
		assert.equal(report.totalTestFilesFound, 1);
		assert.equal(report.sampled[0].status, "DEFECT");
		assert.ok(report.sampled[0].findings.some((f) => f.rule === "test-tautology"));
		assert.ok(report.sampled[0].findings.some((f) => f.rule === "test-no-assertion"));

		const cliOpts = parseCliArgs(["--list", "tests"]);
		assert.equal(cliOpts.list, "tests");
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});

test("Реестр манифестов отказов FAILURE_MANIFESTOS: полнота и валидность всех 12 шлюзов", () => {
	const REQUIRED_GATES = [
		"DIFF_SAFETY",
		"ENCODING_UTF8",
		"DYNAMIC_IMPORTS",
		"TYPE_RATCHET",
		"MOCK_DEFAULTS",
		"SINGLE_DOORS",
		"DICE_AUDIT",
		"TYPESCRIPT_COMPILER",
		"MIGRATION_DRIFT",
		"REACT_HOOKS",
		"BUTTON_STYLES",
		"CSS_TOKENS",
		"UNIT_TESTS",
	];

	for (const gateKey of REQUIRED_GATES) {
		const manifesto = FAILURE_MANIFESTOS[gateKey];
		assert.ok(manifesto, `Манифест для шлюза '${gateKey}' обязан существовать`);
		assert.ok(typeof manifesto.title === "string" && manifesto.title.length > 5, `Шлюз ${gateKey}: заголовок title`);
		assert.ok(typeof manifesto.summary === "string" && manifesto.summary.length > 10, `Шлюз ${gateKey}: сводка summary`);
		assert.ok(
			typeof manifesto.clinicalDanger === "string" && manifesto.clinicalDanger.length > 20,
			`Шлюз ${gateKey}: клиническая опасность clinicalDanger`,
		);
		assert.ok(
			typeof manifesto.rottenPatchWarning === "string" && manifesto.rottenPatchWarning.length > 20,
			`Шлюз ${gateKey}: предупреждение rottenPatchWarning`,
		);
		assert.ok(
			Array.isArray(manifesto.remediationSteps) && manifesto.remediationSteps.length >= 3,
			`Шлюз ${gateKey}: шаги исправления remediationSteps (>= 3)`,
		);
	}

	// Проверяем printFailureManifesto на отсутствие рантайм-падений
	// Перехватываем console.error
	const originalError = console.error;
	let errorOutput = "";
	console.error = (...args) => {
		errorOutput += args.join(" ") + "\n";
	};
	try {
		printFailureManifesto("DICE_AUDIT", { details: "Тестовая ошибка" });
		assert.ok(errorOutput.includes("DICE_AUDIT") || errorOutput.includes("MONTE CARLO"));
		assert.ok(errorOutput.includes("Тестовая ошибка"));

		// Проверка неизвестного шлюза (дефолтный манифест)
		errorOutput = "";
		printFailureManifesto("UNKNOWN_GATE_123");
		assert.ok(errorOutput.includes("UNKNOWN_GATE_123"));
	} finally {
		console.error = originalError;
	}
});

test("Hardened auditDoors: выявляет мутацию БД внутри GET-роута и bare db.* рядом с tx.*", () => {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-doors-hardened-"));
	try {
		const routesDir = path.join(tmpDir, "apps/api/src/routes");
		mkdirSync(routesDir, { recursive: true });
		writeFileSync(
			path.join(routesDir, "hardenedViolations.ts"),
			[
				'import { FastifyInstance } from "fastify";',
				"export async function hardenedRoutes(app: FastifyInstance) {",
				'  app.get("/api/leaky-read", async (req, reply) => {',
				"    const orgId = await requireResolvedOrganizationId(req, reply);",
				"    await withTenantCtx(orgId, async (tx) => { await tx.insert(budgets).values({ id: 1 }); });",
				"    return { ok: true };",
				"  });",
				'  app.post("/api/split-tx", async (req, reply) => {',
				"    const orgId = await requireResolvedOrganizationId(req, reply);",
				'    await withTenantCtx(orgId, async (tx) => { await tx.insert(a).values({ x: 1 }); await db.update(b).set({ y: 2 }); });',
				"    return { ok: true };",
				"  });",
				"}",
			].join("\n"),
			"utf8",
		);

		const report = auditDoors(tmpDir, createPrng(9), 10);
		assert.equal(report.totalDoorsFound, 2);
		const getDoor = report.sampled.find((d) => d.routeSignature.includes("/api/leaky-read"));
		const postDoor = report.sampled.find((d) => d.routeSignature.includes("/api/split-tx"));
		assert.equal(getDoor?.status, "DEFECT");
		assert.ok(getDoor?.issues.some((i) => i.includes("GET-роут выполняет мутацию БД")));
		assert.equal(postDoor?.status, "DEFECT");
		assert.ok(postDoor?.issues.some((i) => i.includes("Прямой вызов db.insert/update/delete рядом с tx.*")));
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});

test("Hardened auditFields: различает бонусные баллы/проценты от денежных numeric колонок", () => {
	const tmpDir = mkdtempSync(path.join(os.tmpdir(), "dice-fields-pct-"));
	try {
		const schemaDir = path.join(tmpDir, "apps/api/src/db/schema");
		mkdirSync(schemaDir, { recursive: true });
		writeFileSync(
			path.join(schemaDir, "cleanMetrics.ts"),
			[
				'import { pgTable, uuid, numeric } from "drizzle-orm/pg-core";',
				'export const cleanCommissions = pgTable("clean_commissions", {',
				'  id: uuid("id").primaryKey(),',
				'  amountPoints: numeric("amount_points", { precision: 12, scale: 2 }).notNull(),',
				'  materialCostDeductionPct: numeric("material_cost_deduction_pct", { precision: 5, scale: 2 }).notNull(),',
				"});",
			].join("\n"),
			"utf8",
		);
		const fieldReport = auditFields(tmpDir, createPrng(1), 5);
		assert.equal(fieldReport.totalContractsFound, 1);
		assert.equal(fieldReport.sampled[0]?.status, "CLEAN");
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
});
