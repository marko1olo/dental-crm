/**
 * X1 review, reviewer #2. Is `#settings` at 390x844 a MOUNT FLAKE or is the whole
 * workspace shell genuinely absent there? If it is absent, search / microphone /
 * help — which used to be a body-level fixed island on every view — are gone on
 * that view. 15s budget instead of 5.2s, and it reports what IS on screen.
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

const out = { at: new Date().toISOString(), samples: [] };
const browser = await chromium.launch({ headless: true });
for (const [vw, vh] of [
	[390, 844],
	[1600, 1100],
]) {
	const context = await browser.newContext({
		viewport: { width: vw, height: vh },
		isMobile: vw < 700,
		hasTouch: vw < 700,
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
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ onboardingDismissed: true }),
			);
		},
		{ ct: login.clinicToken, st: unlock.staffToken },
	);
	await page.goto(`${WEB}/#settings`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	for (const wait of [5000, 5000, 5000]) {
		await page.waitForTimeout(wait);
		out.samples.push(
			await page.evaluate(
				(elapsed) => ({
					viewport: `${window.innerWidth}x${window.innerHeight}`,
					elapsedMs: elapsed,
					hash: location.hash,
					appShell: Boolean(document.querySelector(".app-shell")),
					topbar: Boolean(document.querySelector(".topbar")),
					workspaceSection: Boolean(document.querySelector("section.workspace")),
					nav: Boolean(document.querySelector(".dnt-bottom-nav")),
					hosts: document.querySelectorAll("#dnt-workspace-actions").length,
					controls: document.querySelectorAll(".dnt-actions__control").length,
					trigger: document.querySelectorAll(".dnt-actions__trigger").length,
					pinScreen: Boolean(document.querySelector('[class*="pin"], [class*="lock-screen"]')),
					bodyTextHead: (document.body.innerText || "").trim().slice(0, 160).replace(/\s+/g, " "),
					rootChildren: [...(document.getElementById("root")?.children ?? [])].map((el) =>
						`${el.tagName.toLowerCase()}.${(el.className?.toString?.() || "").slice(0, 40)}`,
					),
				}),
				wait,
			),
		);
	}
	await context.close();
}
await browser.close();
writeFileSync("scratch/rev2-x1-settings.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
for (const s of out.samples) console.log(JSON.stringify(s));
