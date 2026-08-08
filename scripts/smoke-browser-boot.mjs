import { chromium } from "playwright";

/*
 * Проверка загрузки рабочего места в НАСТОЯЩЕМ браузере.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ typecheck. Замер 2026-08-08: `tsc -b apps/web --noEmit`
 * давал НОЛЬ ошибок в тот момент, когда приложение не загружалось вообще —
 * белый экран и BootErrorBoundary. Причина была в разорванной цепочке
 * ре-экспорта: TypeScript разрешает её по типам, а ESM в браузере требует
 * фактического `export` из запрошенного модуля. Зелёный компилятор доказывает
 * согласованность типов, а не достижимость кода.
 *
 * ПОЧЕМУ HTTP 200 НЕ ГОДИТСЯ КАК ПРИЗНАК. Сервер отдаёт оболочку index.html
 * успешно даже когда React в неё не отрисовал ничего. Проверяется именно
 * содержимое корневого узла и отсутствие экрана аварийной загрузки.
 */

const URL = process.env.SMOKE_URL ?? "http://127.0.0.1:5173/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

/*
 * Слушатели вешаются ДО перехода. Проверять собранное сразу после навешивания,
 * не дождавшись загрузки, — классическая ошибка: события приходят асинхронно и
 * массив в этот момент пуст независимо от состояния страницы.
 */
page.on("console", (m) => {
	if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => pageErrors.push(`${e.name}: ${e.message}`));
page.on("requestfailed", (r) =>
	failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`),
);

const response = await page.goto(URL, {
	waitUntil: "domcontentloaded",
	timeout: 20000,
});
await page.waitForTimeout(4000);

const rootChildren = await page.evaluate(
	() => document.querySelector("#root")?.children.length ?? -1,
);
const bootError = await page.evaluate(
	() => document.querySelectorAll(".boot-state-error").length,
);
const text = await page.evaluate(() =>
	document.body.innerText.slice(0, 400).trim(),
);

await page.screenshot({ path: "smoke-root.png", fullPage: true });
await browser.close();

const apiFailures = failedRequests.filter((u) => u.includes("/api/"));
const otherFailures = failedRequests.filter((u) => !u.includes("/api/"));

console.log(`HTTP: ${response?.status()}`);
console.log(`Узлов в #root: ${rootChildren}`);
console.log(`Экранов аварийной загрузки: ${bootError}`);
console.log(`Ошибок консоли: ${consoleErrors.length}`);
console.log(`Непойманных исключений: ${pageErrors.length}`);
console.log(
	`Отказов сети: ${failedRequests.length} (к /api/ — ${apiFailures.length}, прочих — ${otherFailures.length})`,
);
console.log(`\n--- видимый текст ---\n${text}`);
if (consoleErrors.length) {
	console.log("\n--- ошибки консоли ---");
	for (const e of consoleErrors.slice(0, 5)) console.log(e.slice(0, 400));
}
if (pageErrors.length) {
	console.log("\n--- непойманные исключения ---");
	for (const e of pageErrors) console.log(e.slice(0, 400));
}
if (otherFailures.length) {
	console.log("\n--- отказы сети вне /api/ ---");
	for (const e of otherFailures.slice(0, 10)) console.log(e);
}

/*
 * Признак успеха — отрисованный корень БЕЗ экрана аварийной загрузки.
 * Непустой корень сам по себе недостаточен: BootErrorBoundary тоже даёт один
 * узел в корне, и по счётчику узлов мёртвое приложение неотличимо от живого.
 */
const ok = rootChildren > 0 && bootError === 0 && pageErrors.length === 0;
console.log(`\nВЕРДИКТ: ${ok ? "рабочее место загружается" : "НЕ ЗАГРУЖАЕТСЯ"}`);
process.exit(ok ? 0 : 1);
