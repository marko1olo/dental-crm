/**
 * Для элемента, вылезающего за правый край, печатает цепочку предков с
 * их шириной, режимом раскладки и min-width, а также самого широкого
 * потомка. Так видно, кто задаёт минимальную ширину.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const VIEW = process.env.VIEW || "visit";
const TESTID = process.env.TESTID || "custom-examination-form-catalogs-widget";

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
const page = await (
	await browser.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true, locale: "ru-RU" })
).newPage();
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

try {
	await page.goto(`${WEB}/#${VIEW}`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2800);

	const out = await page.evaluate((testid) => {
		const el = document.querySelector(`[data-testid="${testid}"]`);
		if (!el) return { missing: true };
		const desc = (n) => {
			const s = getComputedStyle(n);
			const r = n.getBoundingClientRect();
			return {
				tag: n.tagName.toLowerCase(),
				cls: (n.className?.toString?.() || "").slice(0, 70),
				x: Math.round(r.x),
				w: Math.round(r.width),
				right: Math.round(r.right),
				scrollW: n.scrollWidth,
				display: s.display,
				minW: s.minWidth,
				overflowX: s.overflowX,
				padding: `${s.paddingLeft}/${s.paddingRight}`,
				gridCols: s.gridTemplateColumns === "none" ? "" : s.gridTemplateColumns.slice(0, 70),
				flex: s.display.includes("flex") ? `wrap=${s.flexWrap} dir=${s.flexDirection}` : "",
			};
		};

		const chain = [];
		for (let n = el; n && n !== document.documentElement; n = n.parentElement) chain.push(desc(n));

		// Самый широкий потомок — он и держит min-content.
		let widest = null;
		for (const c of el.querySelectorAll("*")) {
			const r = c.getBoundingClientRect();
			if (r.width < 1) continue;
			if (!widest || r.width > widest.w) widest = { ...desc(c), text: (c.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) };
		}
		return { chain, widest, minContent: el.scrollWidth };
	}, TESTID);

	if (out.missing) {
		console.log(`элемент [data-testid="${TESTID}"] не найден на #${VIEW}`);
	} else {
		console.log(`цепочка от виновника вверх (экран 390px), scrollWidth виновника = ${out.minContent}:\n`);
		for (const [i, c] of out.chain.entries()) {
			console.log(
				`${String(i).padStart(2)}  <${c.tag}> x=${String(c.x).padStart(4)} w=${String(c.w).padStart(4)} right=${String(c.right).padStart(4)} scrollW=${String(c.scrollW).padStart(4)} display=${c.display} minW=${c.minW} overflowX=${c.overflowX} pad=${c.padding} ${c.flex}`,
			);
			console.log(`      class="${c.cls}"`);
			if (c.gridCols) console.log(`      gridCols=${c.gridCols}`);
		}
		if (out.widest) {
			console.log(`\nсамый широкий потомок: <${out.widest.tag}> ${out.widest.w}px  «${out.widest.text}»`);
			console.log(`      class="${out.widest.cls}"  display=${out.widest.display} minW=${out.widest.minW}`);
			if (out.widest.gridCols) console.log(`      gridCols=${out.widest.gridCols}`);
		}
	}
} finally {
	await browser.close();
}
