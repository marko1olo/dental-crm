/**
 * X1 review, second reviewer. TWO REMAINING GAPS.
 *
 * 1. ROUTE COVERAGE. The packet's REACHABILITY evidence is all on `#patients`.
 *    Reviewer #1 recorded `hostCount: 0, placement: null` on `#schedule` and left it
 *    open. Both matter: the three actions used to be a body-level `position: fixed`
 *    island present on every view; they now live in chrome that a route could omit.
 *
 * 2. THE `notice` SLOT WHILE THE PHONE SHEET IS COLLAPSED. The dictation transcript,
 *    the help panel and the "command done" chip all render into `notice`, which at
 *    narrow lives inside `.dnt-actions__sheet-body`. The sheet is hidden with
 *    `[hidden] { display: none }`, and the owner states in a comment that residents
 *    are deliberately NOT unmounted so "включённый микрофон переживает закрытие
 *    панели". So: is anything rendered into `notice` visible while the sheet is
 *    closed? Proven by injecting a marker node into the slot from the probe (a DOM
 *    write in MY page, no source edit) and measuring it closed vs open.
 *
 * Deduped module graph throughout (see rev2-x1-dedupe.mjs for why).
 * Read-only. Starts nothing.
 *   node scratch/rev2-x1-routes.mjs
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
	headers: {
		"Content-Type": "application/json",
		"x-dente-clinic-token": login.clinicToken,
	},
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const dedupe = async (page) => {
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
};
const seed = async (page) => {
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
};

const report = { at: new Date().toISOString(), routes: [], noticeVisibility: null };
const browser = await chromium.launch({ headless: true });

// ---- 1. route coverage, both placements ----
for (const [vw, vh] of [
	[1600, 1100],
	[390, 844],
]) {
	const context = await browser.newContext({
		viewport: { width: vw, height: vh },
		isMobile: vw < 700,
		hasTouch: vw < 700,
		locale: "ru-RU",
	});
	const page = await context.newPage();
	await dedupe(page);
	await page.goto(WEB, { waitUntil: "domcontentloaded" });
	await seed(page);
	for (const route of ["shift", "schedule", "patients", "visit", "finance", "settings"]) {
		await page.goto(`${WEB}/#${route}`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(5200);
		const r = await page.evaluate(() => {
			const host = document.getElementById("dnt-workspace-actions");
			const controls = [...document.querySelectorAll(".dnt-actions__control")];
			return {
				hash: location.hash,
				topbarPresent: Boolean(document.querySelector(".topbar")),
				topActionsPresent: Boolean(document.querySelector(".top-actions")),
				hostCount: document.querySelectorAll("#dnt-workspace-actions").length,
				placement: host?.dataset.placement ?? null,
				controlCount: controls.length,
				controlsVisible: controls.filter((el) => el.getClientRects().length > 0).length,
				triggerCount: document.querySelectorAll(".dnt-actions__trigger").length,
				navItems: document.querySelectorAll(".dnt-bottom-nav a").length,
				navH: (() => {
					const n = document.querySelector(".dnt-bottom-nav");
					return n && getComputedStyle(n).display !== "none"
						? Math.round(n.getBoundingClientRect().height)
						: null;
				})(),
			};
		});
		report.routes.push({ viewport: `${vw}x${vh}`, ...r });
	}
	await context.close();
}

// ---- 2. is the `notice` slot visible while the phone sheet is collapsed? ----
{
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		locale: "ru-RU",
	});
	const page = await context.newPage();
	await dedupe(page);
	await page.goto(WEB, { waitUntil: "domcontentloaded" });
	await seed(page);
	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(5500);
	const probe = await page.evaluate(() => {
		const slot = document.querySelector(".dnt-actions__notice");
		if (!slot) return { error: "no notice slot" };
		const marker = document.createElement("div");
		marker.id = "rev2-marker";
		marker.textContent = "ЗАПИСЬ ИДЁТ";
		marker.style.height = "40px";
		slot.append(marker);
		void document.body.offsetHeight;
		const read = (tag) => {
			const m = document.getElementById("rev2-marker");
			const sheet = document.querySelector(".dnt-actions__sheet");
			const trig = document.querySelector(".dnt-actions__trigger");
			const b = m.getBoundingClientRect();
			return {
				tag,
				sheetHidden: sheet?.hasAttribute("hidden") ?? null,
				sheetDisplay: sheet ? getComputedStyle(sheet).display : null,
				markerRects: m.getClientRects().length,
				markerBox: { w: Math.round(b.width), h: Math.round(b.height) },
				markerVisibleToUser: m.getClientRects().length > 0 && b.width > 0 && b.height > 0,
				triggerClass: trig?.className ?? null,
				triggerAria: trig?.getAttribute("aria-expanded") ?? null,
			};
		};
		return { collapsed: read("sheet-collapsed") };
	});
	await page.locator(".dnt-actions__trigger").click();
	await page.waitForTimeout(400);
	const opened = await page.evaluate(() => {
		const m = document.getElementById("rev2-marker");
		const sheet = document.querySelector(".dnt-actions__sheet");
		const trig = document.querySelector(".dnt-actions__trigger");
		const b = m ? m.getBoundingClientRect() : null;
		return {
			tag: "sheet-open",
			sheetHidden: sheet?.hasAttribute("hidden") ?? null,
			sheetDisplay: sheet ? getComputedStyle(sheet).display : null,
			markerRects: m ? m.getClientRects().length : null,
			markerBox: b ? { w: Math.round(b.width), h: Math.round(b.height) } : null,
			markerVisibleToUser: m ? m.getClientRects().length > 0 && b.width > 0 && b.height > 0 : null,
			triggerClass: trig?.className ?? null,
			triggerAria: trig?.getAttribute("aria-expanded") ?? null,
		};
	});
	report.noticeVisibility = { ...probe, opened };
	await context.close();
}

await browser.close();
writeFileSync("scratch/rev2-x1-routes.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log("wrote scratch/rev2-x1-routes.json");
for (const r of report.routes) {
	console.log(
		`${r.viewport} ${r.hash.padEnd(10)} topbar=${r.topbarPresent} topActions=${r.topActionsPresent} hosts=${r.hostCount} placement=${r.placement} controls=${r.controlCount}/vis=${r.controlsVisible} trigger=${r.triggerCount} navItems=${r.navItems} navH=${r.navH}`,
	);
}
console.log("noticeVisibility:", JSON.stringify(report.noticeVisibility, null, 1));
