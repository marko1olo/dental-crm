/**
 * X1 review, reviewer #2. DOES THE GROUP SURVIVE IN-APP NAVIGATION?
 *
 * Every probe in this packet (builder's and both reviewers') reloads the page for
 * each route. That never tests the interesting case: the group's nav container is a
 * FOREIGN node appended into a `<nav>` that `App.tsx` owns and re-renders, and it is
 * only ever (re-)inserted when the placement CHANGES (`useEffect` dep `[placement]`).
 * If React ever replaces that nav, or if the container is lost, the «Голос» item
 * disappears until the window is resized — i.e. never, on a phone.
 *
 * So: navigate by clicking the real bottom-nav links, no reload, and check after each
 * hop. Also toggles the viewport across the 840px boundary to exercise the
 * placement transition and its teardown in both directions.
 *
 * Read-only. Starts nothing.
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

const SNAP = () => {
	const host = document.getElementById("dnt-workspace-actions");
	const nav = document.querySelector(".dnt-bottom-nav");
	return {
		hash: location.hash,
		vw: window.innerWidth,
		hosts: document.querySelectorAll("#dnt-workspace-actions").length,
		placement: host?.dataset.placement ?? null,
		hostConnected: host ? host.isConnected : null,
		navSlots: document.querySelectorAll(".dnt-actions-nav-slot").length,
		navSlotInNav: (() => {
			const s = document.querySelector(".dnt-actions-nav-slot");
			return s && nav ? nav.contains(s) : null;
		})(),
		triggers: document.querySelectorAll(".dnt-actions__trigger").length,
		triggerVisible: (() => {
			const t = document.querySelector(".dnt-actions__trigger");
			return t ? t.getClientRects().length > 0 : null;
		})(),
		controls: document.querySelectorAll(".dnt-actions__control").length,
		navH: nav && getComputedStyle(nav).display !== "none"
			? Math.round(nav.getBoundingClientRect().height)
			: null,
		mountEmpty: (() => {
			const m = document.querySelector(".dnt-actions-mount--header");
			return m ? m.childElementCount === 0 : null;
		})(),
		duplicateHostsInDom: document.querySelectorAll(".dnt-actions").length,
	};
};

const out = { at: new Date().toISOString(), steps: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true,
	locale: "ru-RU",
});
const page = await context.newPage();
await page.route(
	(url) =>
		/\/src\/(workspaceShell\.tsx|components\/VoiceAssistantUI\.tsx|components\/Omnibar\.tsx)/.test(
			url.pathname,
		),
	async (route) => {
		const res = await route.fetch();
		const body = await res.text();
		await route.fulfill({
			response: res,
			body: body.replace(/(workspaceActions\/WorkspaceActions\.tsx)\?t=\d+/g, "$1"),
		});
	},
);
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
await page.goto(`${WEB}/#shift`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
out.steps.push({ step: "initial #shift", ...(await page.evaluate(SNAP)) });

// Click the real bottom-nav links, no reload.
for (const label of ["Записи", "Пациенты", "Приём", "Смена"]) {
	const link = page.locator(`.dnt-bottom-nav a:has-text("${label}")`);
	if ((await link.count()) === 0) {
		out.steps.push({ step: `click ${label}`, error: "link not found" });
		continue;
	}
	await link.first().click();
	await page.waitForTimeout(2500);
	out.steps.push({ step: `clicked ${label}`, ...(await page.evaluate(SNAP)) });
}

// Placement transitions, both directions, no reload.
for (const [w, h] of [
	[1600, 1100],
	[390, 844],
	[1600, 1100],
	[390, 844],
]) {
	await page.setViewportSize({ width: w, height: h });
	await page.waitForTimeout(1600);
	out.steps.push({ step: `resize to ${w}`, ...(await page.evaluate(SNAP)) });
}

// And the sheet still opens after all that churn.
const trig = page.locator(".dnt-actions__trigger");
if ((await trig.count()) > 0) {
	await trig.click();
	await page.waitForTimeout(500);
	out.steps.push({
		step: "open sheet after churn",
		...(await page.evaluate(() => {
			const sheet = document.querySelector(".dnt-actions__sheet");
			const b = sheet?.getBoundingClientRect();
			return {
				sheetHidden: sheet?.hasAttribute("hidden") ?? null,
				sheetBox: b ? { w: Math.round(b.width), h: Math.round(b.height) } : null,
				visibleControls: [...document.querySelectorAll(".dnt-actions__control")].filter(
					(el) => el.getClientRects().length > 0,
				).length,
			};
		})),
	});
}

await context.close();
await browser.close();
writeFileSync("scratch/rev2-x1-spanav.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
for (const s of out.steps) console.log(JSON.stringify(s));
