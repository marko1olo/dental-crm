import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * НЕИЗВЕСТНУЮ СУММУ НЕЛЬЗЯ ГАСИТЬ НУЛЁМ ДО money().
 *
 * Общая money() (AppHelpers) теперь печатает «не определено» вместо «0 ₽» для
 * значения, которого программа не знает, и это закреплено прямыми вызовами в
 * moneyFormat.test.ts. Но у той правки есть слепое место: если вызывающее место
 * пишет `money(x ?? 0)`, подмена происходит РАНЬШЕ форматирования, и до money()
 * неизвестное просто не доезжает. Экран снова показывает «0 ₽», а проверка
 * функции остаётся зелёной — поэтому одного набора на функцию мало.
 *
 * Что здесь охраняется. Два экрана, где такое `?? 0` стояло на деньгах
 * пациента и было снято:
 *
 *   • ShiftView.tsx — плитка «Оплаты» на главном экране смены. `dashboard` по
 *     типу `Dashboard | null | undefined`, поэтому до загрузки данных плитка
 *     печатала «0 ₽ · долг 0 ₽», и врач читал это как «пациент рассчитался».
 *   • FinancePlanning.tsx — четыре плитки финансовой сводки: план лечения,
 *     оплачено, остаток, вычет.
 *
 * ПРОВЕРКА ПО ТЕКСТУ, А НЕ ПО ОТРИСОВКЕ, — сознательный выбор. Это разметка
 * React с обязательными props и стилями; поднимать её в node:test дороже, чем
 * вся правка, а вопрос ровно один и текстовый: не вернулось ли `?? 0` внутрь
 * вызова денег. Тот же приём уже применяется в проекте
 * (components/workspaceActions/workspaceActionsPlacement.test.ts читает
 * исходники и таблицы стилей через fs).
 *
 * ОСТАЛЬНЫЕ ТАКИЕ ЖЕ МЕСТА СЮДА НЕ ВКЛЮЧЕНЫ НАМЕРЕННО, чтобы охрана не была
 * зелёной по недосмотру:
 *   • components/settings/SettingsPricesTab.tsx:376 —
 *     `money(item.basePriceRub ?? item.priceRub ?? 0)`, чужой пакет этой волны.
 *   • components/reports/ManagerReportsPanel.tsx:729,732 —
 *     `money(summary.receivables.totalPrepaidRub ?? 0)`; там `?? 0` стоит уже
 *     внутри ветки `(… ?? 0) > 0`, то есть до него доезжает только настоящее
 *     число, и снимать его нечего.
 */
const webSrcDir = fileURLToPath(new URL("..", import.meta.url));

/**
 * Блочные комментарии выбрасываются ПЕРЕД поиском.
 *
 * Иначе охрана срабатывает на собственном объяснении: и здесь, и в
 * FinancePlanning.tsx в комментарии дословно приведён снятый вызов
 * `money(поле ?? 0)` — прозе положено называть дефект своим текстом, а
 * проверять надо код. Поймано первым же прогоном: охрана покраснела на
 * комментарии, который сама же и описывает.
 *
 * Строчные `//` оставлены в области поиска: закомментированный вызов денег с
 * нулём — тоже нежелательный образец для следующего автора, а ложное
 * срабатывание на нём очевидно и правится одной строкой.
 */
const withoutBlockComments = (source: string) =>
	source.replace(/\/\*[\s\S]*?\*\//g, "");

const readSource = (relativePath: string) =>
	withoutBlockComments(readFileSync(join(webSrcDir, relativePath), "utf8"));

/**
 * Вызовы денег, у которых прямо внутри скобок стоит `?? 0`.
 *
 * `[^()]*` не заходит за вложенную скобку намеренно: `money(Math.round(x))`
 * охране не интересен, интересен `money(поле ?? 0)`.
 */
const zeroFallbackInMoneyCall = /money\([^()]*\?\?\s*0/g;

const guardedFiles = ["ShiftView.tsx", "FinancePlanning.tsx"];

describe("неизвестная сумма не гасится нулём до money()", () => {
	for (const relativePath of guardedFiles) {
		it(`${relativePath}: внутри money() нет «?? 0»`, () => {
			const source = readSource(relativePath);
			const found = source.match(zeroFallbackInMoneyCall) ?? [];
			assert.deepEqual(
				found,
				[],
				`${relativePath}: неизвестная сумма снова превращается в ноль до форматирования: ${found.join(" | ")}`,
			);
		});
	}

	it("охраняемые файлы действительно печатают деньги", () => {
		// Иначе охрана останется зелёной, если money() из файла просто уедет:
		// пустой файл «?? 0» не содержит тоже.
		for (const relativePath of guardedFiles) {
			const source = readSource(relativePath);
			assert.ok(
				source.includes("money("),
				`${relativePath}: вызовов money() не осталось — охрана потеряла предмет`,
			);
		}
	});

	it("сама охрана видит дефект", () => {
		// Регулярное выражение проверяется на образце, а не на доверии: пустой
		// список совпадений — обычный признак сломанного шаблона.
		const sample = 'money(dashboard?.billingSummary?.totalDueRub ?? 0)';
		assert.deepEqual(sample.match(zeroFallbackInMoneyCall)?.length, 1);
		assert.equal("money(Math.round(remainingDebt))".match(zeroFallbackInMoneyCall), null);
	});
});
