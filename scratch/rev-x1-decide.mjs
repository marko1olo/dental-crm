/**
 * REVIEWER decisive test: is Omnibar mounted (=> the slot mechanism is what fails)
 * or absent (=> the whole subtree is missing)? Read-only, no server changes.
 *   node scratch/rev-x1-decide.mjs
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

async function req(path, init = {}, attempts = 8) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 1500));
		}
	}
	throw last;
}
const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await req("/api/auth/staff/unlock", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: 1600, height: 1100 },
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
await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);

const step1 = await page.evaluate(() => ({
	controls: document.querySelectorAll(".dnt-actions__control").length,
	omnibarInput: document.querySelectorAll(
		'input[placeholder="Поиск по разделам или действиям..."]',
	).length,
	hostChildren: [...document.querySelectorAll(".dnt-actions__slot")].map(
		(el) => `${el.dataset.dntSlot}:${el.childElementCount}`,
	),
	dictationBtn: document.querySelectorAll(".top-dictation-button").length,
}));

await page.keyboard.press("Control+k");
await page.waitForTimeout(1200);
const step2 = await page.evaluate(() => ({
	omnibarInput: document.querySelectorAll(
		'input[placeholder="Поиск по разделам или действиям..."]',
	).length,
	omnibarInputVisible: (() => {
		const el = document.querySelector('input[placeholder="Поиск по разделам или действиям..."]');
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return r.width > 0 && r.height > 0;
	})(),
	bodyHasNavigationHeader: document.body.innerText.includes("НАВИГАЦИЯ")
		|| document.body.innerText.includes("Навигация"),
	controls: document.querySelectorAll(".dnt-actions__control").length,
}));

// Now: is the voice hook alive? VoiceAssistantUI's only DOM output is the slots.
// Look for its help panel by clicking nothing — instead check React devtools hook.
const step3 = await page.evaluate(() => {
	const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
	return { devtoolsHook: Boolean(hook), roots: hook?.getFiberRoots ? [...hook.getFiberRoots(1)].length : null };
});

// Search the whole document for anything VoiceAssistantUI-specific.
const step4 = await page.evaluate(() => ({
	transcript: document.querySelectorAll(".dnt-actions__transcript").length,
	panel: document.querySelectorAll(".dnt-actions__panel").length,
	slotEls: document.querySelectorAll(".dnt-actions__slot").length,
	barEl: document.querySelectorAll(".dnt-actions__bar").length,
	mountEl: document.querySelectorAll(".dnt-actions-mount").length,
	hostOuter: document.getElementById("dnt-workspace-actions")?.outerHTML?.slice(0, 600) ?? null,
	topActionsHtml:
		document.querySelector(".top-actions")?.innerHTML?.replace(/\s+/g, " ").slice(0, 900) ?? null,
}));

await browser.close();
const out = { step1, step2, step3, step4 };
writeFileSync("scratch/rev-x1-decide.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(JSON.stringify(out, null, 2));
