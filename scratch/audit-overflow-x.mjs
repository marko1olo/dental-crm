/**
 * Ищет горизонтальное переполнение на узком экране и виновника —
 * самый глубокий элемент, который реально шире своего контейнера.
 *
 * Горизонтальная прокрутка на телефоне это не косметика: у половины
 * элементов пропадает правый край, а свайп по списку начинает
 * листать страницу вбок.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const WIDTH = Number(process.env.W || 390);
const VIEWS = (process.env.VIEWS || "shift,schedule,patients,visit,documents,finance,analytics,communications,settings,imaging").split(",");

const login = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: WIDTH, height: 900 },
	isMobile: WIDTH < 700,
	hasTouch: WIDTH < 700,
	locale: "ru-RU",
});
const page = await context.newPage();
await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken },
);

const SCAN = (vw) => {
	const docRight = vw;
	const out = [];
	const seen = new Set();
	for (const el of document.querySelectorAll("body *")) {
		const r = el.getBoundingClientRect();
		if (r.width < 1 || r.height < 1) continue;
		const s = getComputedStyle(el);
		if (s.position === "fixed") continue;
		// Элемент вылезает правее окна.
		const over = Math.round(r.right - docRight);
		if (over < 4) continue;
		// Если предок уже прокручивается по горизонтали, это осознанная
		// горизонтальная лента, а не поломка вёрстки.
		let insideScroller = false;
		for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
			const ps = getComputedStyle(n);
			if (ps.overflowX === "auto" || ps.overflowX === "scroll") {
				insideScroller = true;
				break;
			}
		}
		if (insideScroller) continue;
		// Оставляем только самых глубоких: если у элемента есть ребёнок,
		// который тоже вылезает, виноват ребёнок.
		let childOverflows = false;
		for (const c of el.children) {
			const cr = c.getBoundingClientRect();
			if (cr.width >= 1 && cr.right - docRight >= 4) {
				childOverflows = true;
				break;
			}
		}
		if (childOverflows) continue;

		const key = `${el.tagName}|${(el.className?.toString?.() || "").slice(0, 60)}|${over}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({
			over,
			w: Math.round(r.width),
			tag: el.tagName.toLowerCase(),
			cls: (el.className?.toString?.() || "").slice(0, 64),
			parentCls: (el.parentElement?.className?.toString?.() || "").slice(0, 50),
			display: s.display,
			whiteSpace: s.whiteSpace,
			minW: s.minWidth,
			gridCols: s.gridTemplateColumns.slice(0, 60),
			text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 44),
		});
	}
	return out;
};

const all = [];
try {
	for (const view of VIEWS) {
		await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2500);
		const scroll = await page.evaluate(() => ({
			docScrollW: document.documentElement.scrollWidth,
			docClientW: document.documentElement.clientWidth,
			bodyScrollW: document.body.scrollWidth,
		}));
		const found = await page.evaluate(SCAN, WIDTH);
		const horizontal = scroll.docScrollW > scroll.docClientW + 1;
		console.log(
			`\n##### ${view}: страница ${horizontal ? `ПРОКРУЧИВАЕТСЯ вбок (${scroll.docScrollW} > ${scroll.docClientW})` : "без боковой прокрутки"}, виновников ${found.length}`,
		);
		for (const f of found) {
			console.log(`   +${f.over}px  <${f.tag}> ширина ${f.w}  «${f.text}»`);
			console.log(`          class="${f.cls}"`);
			console.log(`          parent="${f.parentCls}" display=${f.display} whiteSpace=${f.whiteSpace} minW=${f.minW}`);
			if (f.gridCols && f.gridCols !== "none") console.log(`          gridCols=${f.gridCols}`);
			all.push({ view, ...f });
		}
	}
} finally {
	await browser.close();
}

console.log(`\nВсего виновников переполнения: ${all.length} на ${VIEWS.length} экранах шириной ${WIDTH}px`);
