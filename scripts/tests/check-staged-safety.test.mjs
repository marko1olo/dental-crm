import assert from "node:assert/strict";
import { test } from "node:test";
import {
	analyzeDiff,
	codeOnly,
	FORBIDDEN_DIFF_PATTERNS,
	FORBIDDEN_TEST_PATTERNS,
	NON_NULL_RE,
	RAW_MONEY_MATH_RE,
} from "../check-staged-safety.mjs";

/** Собирает минимальный unified diff с одной добавленной строкой. */
function diffWith(file, addedLine) {
	return [
		`diff --git a/${file} b/${file}`,
		`--- a/${file}`,
		`+++ b/${file}`,
		"@@ -1,0 +1,1 @@",
		`+${addedLine}`,
	].join("\n");
}

const hits = (file, line) => analyzeDiff(diffWith(file, line)).map((v) => v.pattern.rule);

test("non-null: ловит ВСЕ формы, а не только x!.y (ложные пропуски)", () => {
	for (const line of [
		"eq(users.id, identity.userId!),",
		"const version = buffer[0]!;",
		"return rows[0]!.id;",
		"const c = contract!.id;",
		"const x = getUser()!;",
		"foo(a!, b);",
	]) {
		assert.ok(hits("apps/api/src/a.ts", line).includes("ANTI_BLIND_NON_NULL"), `должен ловить: ${line}`);
	}
});

test("non-null: не даёт ложных срабатываний на легальном коде", () => {
	for (const line of [
		"if (a !== b) return;",
		"if (a != b) return;",
		"if (!user) return;",
		"const ok = !!value;",
		'const msg = "Готово!";',
		"const msg = `Сохранено!`;",
		"const t = 'Внимание!';",
		"const n = x; // важно!",
		"return <b>Готово!</b>;",
		"const a = b ?? c;",
	]) {
		assert.deepEqual(hits("apps/web/src/a.tsx", line), [], `ложное срабатывание: ${line}`);
	}
});

test("non-null: markdown, json и js не проверяются как TypeScript", () => {
	assert.deepEqual(hits("docs/a.md", "ура! x!.y"), []);
	assert.deepEqual(hits("apps/api/src/a.js", "x!.y"), []);
});

test("any: блокировка всех явных форм (: any, as any, as (any), Record<string, any>, type X = any, any[])", () => {
	assert.ok(hits("apps/api/src/a.ts", "const a = b as any;").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/api/src/a.ts", "function run(payload: any) {").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/api/src/a.ts", "const items: any[] = [];").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/api/src/a.ts", "type Box = Promise<any>;").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/web/src/comp.tsx", "const val = (target as any).prop;").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/web/src/comp.tsx", "const fn = <T = any>() => {};").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/web/src/comp.tsx", "const shielded = val as (any);").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/api/src/a.ts", "const map: Record<string, any> = {};").includes("ANTI_BLIND_AS_ANY"));
	assert.ok(hits("apps/api/src/a.ts", "type LooseDto = any;").includes("ANTI_BLIND_AS_ANY"));
});

test("двойные касты: блокировка 'as unknown as', 'as never', 'as any as'", () => {
	assert.ok(hits("apps/api/src/a.ts", "const a = b as unknown as Target;").includes("ANTI_BLIND_DOUBLE_CAST"));
	assert.ok(hits("apps/api/src/a.ts", "const b = c as any as Target;").includes("ANTI_BLIND_DOUBLE_CAST"));
	assert.ok(hits("apps/api/src/a.ts", "const c = x as never;").includes("ANTI_BLIND_DOUBLE_CAST"));
});

test("супрессии: блокировка @ts-expect-error, @ts-ignore, @ts-nocheck, biome-ignore, eslint-disable", () => {
	assert.ok(hits("apps/api/src/a.ts", "// @ts-ignore").includes("ANTI_BLIND_SUPPRESSION"));
	assert.ok(hits("apps/api/src/a.ts", "// @ts-expect-error TS2322 fix later").includes("ANTI_BLIND_SUPPRESSION"));
	assert.ok(hits("apps/api/src/a.ts", "// @ts-nocheck").includes("ANTI_BLIND_SUPPRESSION"));
	assert.ok(hits("apps/api/src/a.ts", "/* biome-ignore lint/suspicious/noExplicitAny: suppressed */").includes("ANTI_BLIND_SUPPRESSION"));
	assert.ok(hits("apps/api/src/a.ts", "// eslint-disable-next-line @typescript-eslint/no-explicit-any").includes("ANTI_BLIND_SUPPRESSION"));
});

test("саботаж тестов: блокировка .skip(), .only(), .todo() в тестах", () => {
	assert.ok(hits("apps/api/src/a.test.ts", "it.skip('should pass', () => {});").includes("ANTI_BLIND_TEST_SKIP"));
	assert.ok(hits("apps/api/src/a.test.ts", "test.skip('skipped test', () => {});").includes("ANTI_BLIND_TEST_SKIP"));
	assert.ok(hits("apps/api/src/a.test.ts", "describe.skip('suite', () => {});").includes("ANTI_BLIND_TEST_SKIP"));
	assert.ok(hits("apps/web/src/b.spec.tsx", "it.only('focused', () => {});").includes("ANTI_BLIND_TEST_SKIP"));
	assert.ok(hits("apps/web/src/b.spec.tsx", "test.only('focused test', () => {});").includes("ANTI_BLIND_TEST_SKIP"));
	assert.ok(hits("apps/web/src/b.spec.tsx", "describe.only('focused suite', () => {});").includes("ANTI_BLIND_TEST_SKIP"));
	assert.ok(hits("apps/api/src/a.test.ts", "test.todo('unimplemented test');").includes("ANTI_BLIND_TEST_SKIP"));
	assert.ok(hits("apps/api/src/a.test.ts", "it.todo('stub');").includes("ANTI_BLIND_TEST_SKIP"));

	// Тестовые файлы исключены из правил для боевого кода (например, any в тестах)
	assert.deepEqual(hits("apps/api/src/a.test.ts", "const x: any = 1;"), []);
	assert.deepEqual(hits("scripts/a.mjs", "x as any"), []);
});

test("браузерные окна: блокировка window.alert, window.confirm, window.prompt", () => {
	assert.ok(hits("apps/web/src/a.tsx", "window.alert('Внимание!');").includes("ANTI_BLIND_WINDOW_DIALOG"));
	assert.ok(hits("apps/web/src/a.tsx", "if (window.confirm('Удалить?')) doDelete();").includes("ANTI_BLIND_WINDOW_DIALOG"));
	assert.ok(hits("apps/web/src/a.tsx", "const val = window.prompt('Введите скидку:');").includes("ANTI_BLIND_WINDOW_DIALOG"));
});

test("аппаратный перезапуск: блокировка window.location.reload() и href=", () => {
	assert.ok(hits("apps/web/src/a.tsx", "window.location.reload();").includes("ANTI_BLIND_HARD_RELOAD"));
	assert.ok(hits("apps/web/src/a.tsx", "window.location.href = '/login';").includes("ANTI_BLIND_HARD_RELOAD"));
});

test("потёмкинские тайм-ауты: блокировка setTimeout с захардкоженной задержкой", () => {
	assert.ok(hits("apps/web/src/a.tsx", "setTimeout(() => setDone(true), 1500);").includes("ANTI_BLIND_POTEMKIN_TIMEOUT"));
	assert.ok(hits("apps/api/src/b.ts", "setTimeout(resolve, 1000);").includes("ANTI_BLIND_POTEMKIN_TIMEOUT"));
	assert.ok(hits("apps/web/src/a.tsx", "setTimeout(cb, 2000);").includes("ANTI_BLIND_POTEMKIN_TIMEOUT"));
	assert.ok(hits("apps/web/src/a.tsx", "setTimeout(cb, 3000);").includes("ANTI_BLIND_POTEMKIN_TIMEOUT"));
	assert.ok(hits("apps/web/src/a.tsx", "setTimeout(cb, 5000);").includes("ANTI_BLIND_POTEMKIN_TIMEOUT"));
});

test("денежная математика: блокировка ручных float-расчётов денег (/ 100, * 0.01, * .01, * 100)", () => {
	const moneyViolations = [
		"const doctorBonus = doctorWageBaseKopecks * docPct * 0.01;",
		"const feeNet = lineSubtotalKopecks * rate * 0.01;",
		"const rub = priceRub * 100;",
		"const rubles = priceKopecks / 100;",
		"const disc = itemGrossKop * discountPercent * 0.01;",
		"const comm = netBase * commissionPct * 0.01;",
		"const totalDiscount = totalGross * (discountPercent * 0.01);",
		"const fee = amount * 0.01;",
		"const itemCost = price * .01;",
		"const scaledPrice = 0.01 * price;",
		"const altScaledPrice = .01 * price;",
		"const wage = doctorWageBaseKopecks * docPct * .01;",
		"const payout = (doctorWageBaseKopecks * docPct) / 100;",
		"const vat = totalVat * 0.01;",
		"const bill = billAmount * 0.01;",
		"const pay = doctorSalary * 0.01;",
		"const cb = cashback * 0.01;",
		"const roll = payroll * 0.01;",
		"const inv = invoiceKopecks / 100;",
		"const bal = patientBalance / 100;",
	];

	for (const line of moneyViolations) {
		assert.ok(
			hits("apps/api/src/payroll.ts", line).includes("ANTI_BLIND_RAW_MONEY_MATH"),
			`должен блокировать денежный расчёт: ${line}`
		);
	}
});

test("нулевой допуск к ложным срабатываниям: легальные выражения с 0.01 и 100 ПРОПУСКАЮТСЯ", () => {
	const legalLines = [
		// СанПиН 1% выборка контроля стерилизации
		"const sampleCount = batchItemCount * 0.01;",
		"const sampleTrays = traysCount * 0.01;",
		"const sampleCycles = cyclesCount * 20 * 0.01;",
		"const inspectionCount = batchSize * 0.01;",

		// Геометрия рентген-снимков и калиперов (X-Ray / DICOM)
		"const screenWidth = (p2.x - p1.x) * 0.01 * imageWidthPx;",
		"const dxOffset = dx * 0.01 * w;",
		"const normX = point.x * 0.01;",
		"const xRayScale = dx * 0.01 * imageWidthPx;",

		// UI анимации, SVG прогресс-бары, окружности
		"const strokeDashoffset = progressPercent * 0.01 * circumference;",
		"const circleProgress = progressPercent * 0.01;",

		// Графика и лабораторные растворы без денежных корней
		"const pixelScale = totalPixels * 0.01;",
		"const solutionLiters = totalSolutionMl * 0.01;",
		"const generalCount = totalCount * 0.01;",

		// Сетевые и системные параметры
		"const mbps = networkSpeed * 0.01;",
		"const rating = feedbackScore * 0.01;",
		"const privVal = privateValue * 0.01;",
		"const subVal = subnetMask * 0.01;",
		"const traffic = internetTraffic * 0.01;",
	];

	for (const line of legalLines) {
		assert.deepEqual(
			hits("apps/web/src/components/viewer.tsx", line),
			[],
			`ложное срабатывание на легальном выражении: ${line}`
		);
	}
});

test("пустые catch и console.log по-прежнему строго блокируются", () => {
	assert.ok(hits("apps/api/src/a.ts", "try { f(); } catch {}").includes("ANTI_BLIND_EMPTY_CATCH"));
	assert.ok(hits("apps/api/src/a.ts", "try { f(); } catch (err) {}").includes("ANTI_BLIND_EMPTY_CATCH"));
	assert.ok(hits("apps/api/src/a.ts", "console.log('debug');").includes("ANTI_BLIND_CONSOLE_LOG"));
});

test("UPPERCASE и цирковые цвета кнопок строго блокируются", () => {
	assert.ok(hits("apps/web/src/a.tsx", '<button className="uppercase">').includes("ANTI_BLIND_UPPERCASE"));
	assert.ok(hits("apps/web/src/a.tsx", '<button className="bg-amber-100">').includes("ANTI_BLIND_CIRCUS_COLORS"));
	assert.ok(hits("apps/web/src/a.tsx", '<button className="text-yellow-600">').includes("ANTI_BLIND_CIRCUS_COLORS"));
});

test("codeOnly вырезает строковые литералы и хвостовые комментарии", () => {
	assert.equal(codeOnly('const a = "x!"; // y!'), 'const a = ""; ');
	assert.equal(codeOnly("const b = 'price * 100'; // comment"), "const b = ''; ");
	assert.ok(NON_NULL_RE.test(codeOnly("foo(a!)")));
});

test("sanitary baseline: запрет на увеличение лимитов долга (монотонность)", () => {
	const regressionDiff = `
diff --git a/scripts/config/sanitary-baseline.json b/scripts/config/sanitary-baseline.json
--- a/scripts/config/sanitary-baseline.json
+++ b/scripts/config/sanitary-baseline.json
@@ -1,5 +1,5 @@
 {
-  "maxExplicitAny": 0,
+  "maxExplicitAny": 5,
   "maxLinterSuppressions": 0,
   "maxRawFloatDivisions": 0,
   "maxUppercaseButtons": 0
 }
`;
	const violations = analyzeDiff(regressionDiff);
	assert.equal(violations.length, 1);
	assert.equal(violations[0].pattern.rule, "ANTI_BLIND_BASELINE_REGRESSION");

	const cleanDiff = `
diff --git a/scripts/config/sanitary-baseline.json b/scripts/config/sanitary-baseline.json
--- a/scripts/config/sanitary-baseline.json
+++ b/scripts/config/sanitary-baseline.json
@@ -1,5 +1,5 @@
 {
-  "maxExplicitAny": 10,
+  "maxExplicitAny": 8,
   "maxLinterSuppressions": 0
 }
`;
	const cleanViolations = analyzeDiff(cleanDiff);
	assert.equal(cleanViolations.length, 0);
});

test("мультилинейные обходы: блокировка as any и empty catch, разбитых переносом строки", () => {
	const multilineCatchDiff = [
		"diff --git a/apps/api/src/service.ts b/apps/api/src/service.ts",
		"--- a/apps/api/src/service.ts",
		"+++ b/apps/api/src/service.ts",
		"@@ -1,0 +1,4 @@",
		"+try {",
		"+  save();",
		"+} catch (err) {",
		"+}",
	].join("\n");
	const catchHits = analyzeDiff(multilineCatchDiff).map((v) => v.pattern.rule);
	assert.ok(catchHits.includes("ANTI_BLIND_EMPTY_CATCH"), "мультилинейный empty catch обязан блокироваться");

	const multilineAnyDiff = [
		"diff --git a/apps/api/src/service.ts b/apps/api/src/service.ts",
		"--- a/apps/api/src/service.ts",
		"+++ b/apps/api/src/service.ts",
		"@@ -1,0 +1,2 @@",
		"+const x = payload as",
		"+any;",
	].join("\n");
	const anyHits = analyzeDiff(multilineAnyDiff).map((v) => v.pattern.rule);
	assert.ok(anyHits.includes("ANTI_BLIND_AS_ANY"), "мультилинейный 'as \\n any' обязан блокироваться");

	const multilineDoubleCastDiff = [
		"diff --git a/apps/api/src/service.ts b/apps/api/src/service.ts",
		"--- a/apps/api/src/service.ts",
		"+++ b/apps/api/src/service.ts",
		"@@ -1,0 +1,2 @@",
		"+const x = payload as",
		"+unknown as Target;",
	].join("\n");
	const doubleHits = analyzeDiff(multilineDoubleCastDiff).map((v) => v.pattern.rule);
	assert.ok(doubleHits.includes("ANTI_BLIND_DOUBLE_CAST"), "мультилинейный double cast обязан блокироваться");
});
