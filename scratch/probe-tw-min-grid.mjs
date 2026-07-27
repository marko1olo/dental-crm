/**
 * Вставляет на страницу элемент с теми же классами Tailwind, что и в
 * форме записи и в списке сотрудников, и читает вычисленные колонки.
 * Форма записи по умолчанию свёрнута, поэтому проверить её на живом
 * экране нельзя — но правило CSS Tailwind генерирует по исходникам, а
 * не по факту монтирования.
 *
 * Проверяем оба края: на узком контейнере колонка обязана ужаться до
 * его ширины, на широком — остаться прежней многоколоночной раскладкой,
 * то есть min() ничего не сломал на десктопе.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const CASES = [
	{ cls: "grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6", base: 300 },
	{ cls: "grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))]", base: 280 },
];
const WIDTHS = [320, 1100];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 800 }, locale: "ru-RU" })).newPage();
let bad = 0;
try {
	await page.goto(WEB, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2500);
	for (const hostWidth of WIDTHS) {
		const out = await page.evaluate(
			({ cases, hostWidth: hw }) => {
				const host = document.createElement("div");
				host.style.width = `${hw}px`;
				document.body.appendChild(host);
				const res = [];
				for (const c of cases) {
					const el = document.createElement("div");
					el.className = c.cls;
					for (let i = 0; i < 4; i += 1) {
						const kid = document.createElement("div");
						kid.textContent = "проба";
						el.appendChild(kid);
					}
					host.appendChild(el);
					const s = getComputedStyle(el);
					res.push({
						cls: c.cls,
						base: c.base,
						display: s.display,
						cols: s.gridTemplateColumns,
						w: Math.round(el.getBoundingClientRect().width),
					});
					el.remove();
				}
				host.remove();
				return res;
			},
			{ cases: CASES, hostWidth },
		);

		console.log(`\n=== контейнер ${hostWidth}px ===`);
		for (const r of out) {
			const nums = r.cols
				.split(" ")
				.map((t) => Number.parseFloat(t))
				.filter(Number.isFinite);
			const widest = nums.length ? Math.max(...nums) : Number.NaN;
			const fits = Number.isFinite(widest) && widest <= r.w + 1;
			// На широком контейнере колонок должно стать больше одной —
			// иначе min() сломал бы десктопную раскладку.
			const expectCols = hostWidth >= r.base * 2 ? nums.length > 1 : true;
			const ok = r.display === "grid" && r.cols !== "none" && fits && expectCols;
			if (!ok) bad += 1;
			console.log(`  ${ok ? "OK  " : "СБОЙ"} колонок ${nums.length}, самая широкая ${widest}px при контейнере ${r.w}px`);
			console.log(`       ${r.cols}`);
		}
	}
	console.log(`\nсбоев: ${bad}`);
} finally {
	await browser.close();
}
process.exit(bad ? 1 : 0);
