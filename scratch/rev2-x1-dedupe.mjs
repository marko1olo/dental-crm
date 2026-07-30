/**
 * X1 review, second reviewer. THE DECIDING EXPERIMENT.
 *
 * Reviewer #1 measured 0 `.dnt-actions__control` in the live page and traced it to
 * the Vite dev server serving TWO urls for one file:
 *   /src/workspaceShell.tsx           -> WorkspaceActions.tsx?t=1785234135879
 *   /src/components/Omnibar.tsx       -> WorkspaceActions.tsx?t=1785234960377
 *   /src/components/VoiceAssistantUI  -> WorkspaceActions.tsx?t=1785234960377
 * Two urls = two ES module records = two module-level `hostDom` singletons.
 *
 * That leaves two mutually exclusive explanations, and the verdict differs:
 *   (A) the committed source is broken;
 *   (B) the committed source is fine and the running dev server's transform cache
 *       is stale (a fresh server or a production build has one module record).
 *
 * This probe decides it WITHOUT restarting anything: it rewrites the served body of
 * the three importers to drop the `?t=NNN` from that one import specifier, so all
 * three resolve to the SAME url and therefore the same module record. Everything
 * else — same server, same code on disk, same login.
 *
 * control  = no rewriting (reproduces reviewer #1)
 * deduped  = rewriting (what a fresh server / production build gives)
 *
 * Read-only: no file in apps/ is touched, nothing is started or restarted.
 *   node scratch/rev2-x1-dedupe.mjs
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

const MEASURE = () => {
	const rect = (el) => {
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return {
			x: Math.round(r.x),
			y: Math.round(r.y),
			w: Math.round(r.width),
			h: Math.round(r.height),
			top: Math.round(r.top),
			bottom: Math.round(r.bottom),
		};
	};
	const host = document.getElementById("dnt-workspace-actions");
	const slots = [...document.querySelectorAll(".dnt-actions__slot")].map((el) => ({
		slot: el.dataset.dntSlot ?? "notice",
		children: el.childElementCount,
	}));
	const controls = [...document.querySelectorAll(".dnt-actions__control")].map((el) => ({
		label: el.querySelector(".dnt-actions__control-label")?.textContent?.trim() ?? null,
		connected: el.isConnected,
		box: rect(el),
		visible: el.getClientRects().length > 0,
	}));
	return {
		viewport: { w: window.innerWidth, h: window.innerHeight },
		hostCount: document.querySelectorAll("#dnt-workspace-actions").length,
		placement: host?.dataset.placement ?? null,
		hostConnected: host ? host.isConnected : null,
		hostInTopbar: host ? Boolean(host.closest(".topbar")) : null,
		hostInNav: host ? Boolean(host.closest(".dnt-bottom-nav")) : null,
		slots,
		controls,
		controlCount: controls.length,
		triggerCount: document.querySelectorAll(".dnt-actions__trigger").length,
		navPresent: Boolean(document.querySelector(".dnt-bottom-nav")),
		topDictation: document.querySelectorAll(".top-dictation-button").length,
	};
};

const report = { at: new Date().toISOString(), runs: [] };
const browser = await chromium.launch({ headless: true });

for (const mode of ["control", "deduped"]) {
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
		const consoleErrors = [];
		page.on("console", (m) => {
			if (m.type() === "error") consoleErrors.push(m.text().slice(0, 220));
		});
		page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 220)}`));
		const rewrites = [];
		if (mode === "deduped") {
			await page.route(
				(url) =>
					/\/src\/(workspaceShell\.tsx|components\/VoiceAssistantUI\.tsx|components\/Omnibar\.tsx)/.test(
						url.pathname,
					),
				async (route) => {
					const res = await route.fetch();
					const body = await res.text();
					const patched = body.replace(
						/(workspaceActions\/WorkspaceActions\.tsx)\?t=\d+/g,
						"$1",
					);
					rewrites.push({
						url: route.request().url().slice(-90),
						changed: patched !== body,
					});
					await route.fulfill({ response: res, body: patched });
				},
			);
		}
		try {
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
			await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
			await page.reload({ waitUntil: "domcontentloaded" });
			await page.waitForTimeout(6000);

			const served = await page.evaluate(async (base) => {
				const out = {};
				for (const f of [
					"/src/workspaceShell.tsx",
					"/src/components/Omnibar.tsx",
					"/src/components/VoiceAssistantUI.tsx",
				]) {
					const text = await fetch(base + f).then((r) => r.text());
					const m = text.match(/workspaceActions\/WorkspaceActions\.tsx[^"']*/);
					out[f] = m ? m[0] : null;
				}
				return out;
			}, WEB);

			const before = await page.evaluate(MEASURE);

			// The interaction, in whichever placement applies.
			let interaction = null;
			if (before.triggerCount > 0) {
				await page.locator(".dnt-actions__trigger").click();
				await page.waitForTimeout(500);
				interaction = await page.evaluate(() => {
					const rect = (el) => {
						if (!el) return null;
						const r = el.getBoundingClientRect();
						return {
							w: Math.round(r.width),
							h: Math.round(r.height),
							top: Math.round(r.top),
							bottom: Math.round(r.bottom),
						};
					};
					const sheet = document.querySelector(".dnt-actions__sheet");
					const nav = document.querySelector(".dnt-bottom-nav");
					return {
						kind: "nav-sheet",
						hidden: sheet?.hasAttribute("hidden") ?? null,
						sheetBox: rect(sheet),
						navBox: rect(nav),
						gapSheetBottomToNavTop:
							sheet && nav
								? Math.round(
										nav.getBoundingClientRect().top -
											sheet.getBoundingClientRect().bottom,
									)
								: null,
						controls: [...document.querySelectorAll(".dnt-actions__control")].map(
							(el) => ({
								label:
									el.querySelector(".dnt-actions__control-label")?.textContent?.trim() ??
									null,
								box: rect(el),
								hintBox: rect(el.querySelector(".dnt-actions__control-hint")),
								centreOwnedBySelf: (() => {
									const r = el.getBoundingClientRect();
									if (r.width < 1 || r.height < 1) return null;
									const hit = document.elementFromPoint(
										r.left + r.width / 2,
										r.top + r.height / 2,
									);
									return hit ? el === hit || el.contains(hit) : false;
								})(),
							}),
						),
					};
				});
			} else if (vw > 1000) {
				// THE GAP THE BUILDER DISCLOSED: «Справка» at wide, on a scrolled page.
				const help = page.locator(
					'.dnt-actions__control[aria-expanded]:has-text("Справка")',
				);
				if ((await help.count()) > 0) {
					await page.evaluate(() => window.scrollTo(0, 600));
					await page.waitForTimeout(300);
					const scrollBefore = await page.evaluate(() => window.scrollY);
					await help.first().click();
					await page.waitForTimeout(600);
					interaction = await page.evaluate((scrollBefore) => {
						const rect = (el) => {
							if (!el) return null;
							const r = el.getBoundingClientRect();
							return {
								x: Math.round(r.x),
								w: Math.round(r.width),
								h: Math.round(r.height),
								top: Math.round(r.top),
								bottom: Math.round(r.bottom),
								right: Math.round(r.right),
							};
						};
						const panel = document.querySelector(".dnt-actions__panel");
						const notice = document.querySelector(".dnt-actions__notice");
						const box = panel?.getBoundingClientRect() ?? null;
						return {
							kind: "header-help-panel",
							scrollBefore,
							scrollAfter: Math.round(window.scrollY),
							panelPresent: Boolean(panel),
							panelBox: rect(panel),
							noticeBox: rect(notice),
							noticePosition: notice ? getComputedStyle(notice).position : null,
							panelFullyInViewport: box
								? box.top >= 0 &&
									box.left >= 0 &&
									box.bottom <= window.innerHeight &&
									box.right <= window.innerWidth
								: null,
							panelClippedByAncestor: (() => {
								if (!panel) return null;
								let node = panel.parentElement;
								const clippers = [];
								while (node && node !== document.documentElement) {
									const s = getComputedStyle(node);
									if (
										s.overflow !== "visible" ||
										s.overflowX !== "visible" ||
										s.overflowY !== "visible"
									) {
										const r = node.getBoundingClientRect();
										clippers.push({
											cls: (node.className?.toString?.() || node.tagName).slice(0, 60),
											overflow: `${s.overflowX}/${s.overflowY}`,
											bottom: Math.round(r.bottom),
											right: Math.round(r.right),
										});
									}
									node = node.parentElement;
								}
								return clippers;
							})(),
							panelCentreOwnedBySelf: (() => {
								if (!box || box.width < 1) return null;
								const cx = box.left + box.width / 2;
								const cy = box.top + Math.min(box.height / 2, 40);
								if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight)
									return "offscreen";
								const hit = document.elementFromPoint(cx, cy);
								return hit ? panel === hit || panel.contains(hit) : false;
							})(),
						};
					}, scrollBefore);
				}
			}

			report.runs.push({
				mode,
				requested: { w: vw, h: vh },
				served,
				rewrites,
				consoleErrors,
				...before,
				interaction,
			});
		} catch (error) {
			report.runs.push({
				mode,
				requested: { w: vw, h: vh },
				error: String(error).slice(0, 300),
				consoleErrors,
			});
		} finally {
			await context.close();
		}
	}
}

await browser.close();
writeFileSync("scratch/rev2-x1-dedupe.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log("wrote scratch/rev2-x1-dedupe.json");
for (const r of report.runs) {
	console.log(
		`${r.mode} ${r.requested.w}x${r.requested.h}: hosts=${r.hostCount} placement=${r.placement} controls=${r.controlCount} trigger=${r.triggerCount} slots=${JSON.stringify(r.slots)} errs=${(r.consoleErrors || []).length}`,
	);
	if (r.interaction) console.log("   interaction:", JSON.stringify(r.interaction).slice(0, 400));
	if (r.served) console.log("   served:", JSON.stringify(r.served));
}
