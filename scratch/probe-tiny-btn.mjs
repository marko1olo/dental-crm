/**
 * Достаёт разметку и цепочку предков для самых мелких целей нажатия,
 * чтобы найти их в исходниках. Ширина или высота меньше порога.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const LIMIT = Number(process.env.LIMIT || 30);
const VIEWS = (process.env.VIEWS || "visit,schedule,patients,documents").split(",");

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
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true,
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

const SCAN = (limit) => {
	const visible = (el) => {
		const r = el.getBoundingClientRect();
		if (r.width < 1 || r.height < 1) return false;
		for (let n = el; n; n = n.parentElement) {
			const s = getComputedStyle(n);
			if (s.display === "none" || s.visibility === "hidden") return false;
			if (Number.parseFloat(s.opacity) === 0) return false;
		}
		return true;
	};
	const SEL = 'button, a[href], [role="button"], [role="tab"], [role="switch"], input[type="checkbox"], input[type="radio"], summary';
	const out = [];
	for (const el of document.querySelectorAll(SEL)) {
		if (el.hasAttribute("disabled") || !visible(el)) continue;
		const r = el.getBoundingClientRect();
		if (Math.min(r.width, r.height) >= limit) continue;
		const chain = [];
		for (let n = el.parentElement, i = 0; n && i < 3; n = n.parentElement, i += 1) {
			const s = getComputedStyle(n);
			chain.push(
				`<${n.tagName.toLowerCase()} class="${(n.className?.toString?.() || "").slice(0, 44)}"> display=${s.display} tag=${n.tagName}`,
			);
		}
		out.push({
			w: Math.round(r.width),
			h: Math.round(r.height),
			html: el.outerHTML.replace(/\s+/g, " ").slice(0, 230),
			chain,
			// Клик по подписи-обёртке тоже считается попаданием.
			inLabel: !!el.closest("label"),
		});
	}
	return out;
};

try {
	for (const view of VIEWS) {
		await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2600);
		const found = await page.evaluate(SCAN, LIMIT);
		console.log(`\n########## ${view}: ${found.length} находок меньше ${LIMIT}px по короткой стороне ##########`);
		for (const f of found) {
			console.log(`\n  ${f.w}x${f.h}${f.inLabel ? "  (внутри <label> — реальная цель может быть больше)" : ""}`);
			console.log(`  ${f.html}`);
			for (const c of f.chain) console.log(`     ^ ${c}`);
		}
	}
} finally {
	await browser.close();
}
