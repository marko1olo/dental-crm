/**
 * REVIEWER probe for packet X1-corner-redesign. READ-ONLY against the already
 * running dev server. Starts nothing, restarts nothing, writes only its own JSON.
 *
 * Answers, independently of the builder's probe:
 *  A. Are the three `.dnt-actions__control` residents actually in the DOM? The
 *     builder claims 3 at every viewport. A first re-run found 0.
 *  B. Console/page errors that could explain a missing resident.
 *  C. 120-frame scroll cost: elementsFromPoint / getBoundingClientRect call count
 *     and time inside them (the builder claims 0 / 0 / 0.00 ms).
 *  D. The <label>Email</label> hit test the builder disclosed as NOT DONE, done
 *     properly with scrollIntoViewIfNeeded + settle.
 *  E. Trailing dead space stack, independently.
 *
 *   node scratch/rev-x1-attack.mjs
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

const report = { at: new Date().toISOString(), viewports: [] };
const browser = await chromium.launch({ headless: true });

for (const [vw, vh] of [
	[390, 844],
	[840, 900],
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
	const pageErrors = [];
	page.on("console", (m) => {
		if (m.type() === "error" || m.type() === "warning") {
			consoleErrors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
		}
	});
	page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 400)));
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

		// instrument BEFORE the app has a chance to scroll: count geometry calls
		await page.evaluate(() => {
			window.__revStats = { rects: 0, hits: 0, ms: 0, stacks: [] };
			const t0 = performance.now.bind(performance);
			const wrap = (proto, name, key) => {
				const orig = proto[name];
				proto[name] = function (...args) {
					const s = t0();
					const out = orig.apply(this, args);
					window.__revStats.ms += t0() - s;
					window.__revStats[key] += 1;
					if (window.__revStats.stacks.length < 12) {
						window.__revStats.stacks.push(
							(new Error().stack || "").split("\n").slice(1, 5).join(" | "),
						);
					}
					return out;
				};
			};
			wrap(Element.prototype, "getBoundingClientRect", "rects");
			wrap(Document.prototype, "elementsFromPoint", "hits");
			wrap(Document.prototype, "elementFromPoint", "hits");
		});

		await page.waitForTimeout(9000);

		const settled = await page.evaluate(() => ({ ...window.__revStats, stacks: undefined }));

		// reset counters, then 120 scroll frames
		await page.evaluate(() => {
			window.__revStats.rects = 0;
			window.__revStats.hits = 0;
			window.__revStats.ms = 0;
			window.__revStats.stacks = [];
		});
		await page.evaluate(async () => {
			const scroller = document.scrollingElement;
			for (let i = 0; i < 120; i += 1) {
				scroller.scrollTop = (i % 40) * 24;
				await new Promise((r) => requestAnimationFrame(() => r()));
			}
		});
		const scrollCost = await page.evaluate(() => ({
			rects: window.__revStats.rects,
			hits: window.__revStats.hits,
			ms: Math.round(window.__revStats.ms * 100) / 100,
			sampleStacks: window.__revStats.stacks.slice(0, 6),
		}));
		await page.evaluate(() => {
			document.scrollingElement.scrollTop = 0;
		});
		await page.waitForTimeout(300);

		const dom = await page.evaluate(() => {
			const box = (el) => {
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
				slot: el.dataset.dntSlot,
				childCount: el.childElementCount,
				html: el.innerHTML.slice(0, 120),
				box: box(el),
			}));
			return {
				viewport: { w: window.innerWidth, h: window.innerHeight },
				hash: location.hash,
				hostCount: document.querySelectorAll("#dnt-workspace-actions").length,
				hostPlacement: host?.dataset.placement ?? null,
				hostParent: host?.parentElement?.className ?? null,
				hostBox: box(host),
				hostChildCount: host?.childElementCount ?? null,
				hostHtmlHead: host ? host.outerHTML.slice(0, 400) : null,
				slots,
				controlCount: document.querySelectorAll(".dnt-actions__control").length,
				controlLabels: [
					...document.querySelectorAll(".dnt-actions__control-label"),
				].map((el) => el.textContent?.trim()),
				triggerPresent: Boolean(document.querySelector(".dnt-actions__trigger")),
				navSlotPresent: Boolean(document.querySelector(".dnt-actions-nav-slot")),
				voiceHookMarker: Boolean(document.querySelector(".dnt-actions__control--primary")),
				legacyDictationBtn: document.querySelectorAll(".top-dictation-button").length,
				omnibarLegacyBtn: document.querySelectorAll(".omnibar-trigger-btn").length,
				workspaceSectionPresent: Boolean(document.querySelector("section.workspace")),
				patientsPanelPresent: Boolean(document.querySelector(".patients-panel")),
				paddingStack: {
					workspace: getComputedStyle(
						document.querySelector("section.workspace") ?? document.body,
					).paddingBottom,
					workGrid: document.querySelector(".work-grid")
						? getComputedStyle(document.querySelector(".work-grid")).paddingBottom
						: null,
					patientsPanel: document.querySelector(".patients-panel")
						? getComputedStyle(document.querySelector(".patients-panel")).paddingBottom
						: null,
					appShell: document.querySelector("main.app-shell")
						? getComputedStyle(document.querySelector("main.app-shell")).paddingBottom
						: null,
				},
				reserveVar: getComputedStyle(document.documentElement)
					.getPropertyValue("--corner-dock-reserve-block")
					.trim(),
				oldDockHosts: document.querySelectorAll("#dente-corner-dock").length,
			};
		});

		// D. Email label hit test, done properly
		let emailHit = null;
		const emailLoc = page.locator('label:has-text("Email")').first();
		if ((await emailLoc.count()) > 0) {
			try {
				await emailLoc.scrollIntoViewIfNeeded({ timeout: 5000 });
				await page.waitForTimeout(500);
				emailHit = await page.evaluate(() => {
					const el = [...document.querySelectorAll("label")].find((n) =>
						(n.textContent || "").trim().toLowerCase().startsWith("email"),
					);
					if (!el) return { found: false };
					const r = el.getBoundingClientRect();
					const cx = r.left + r.width / 2;
					const cy = r.top + r.height / 2;
					const inViewport =
						cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
					const hit = inViewport ? document.elementFromPoint(cx, cy) : null;
					const stack = inViewport ? document.elementsFromPoint(cx, cy) : [];
					return {
						found: true,
						rect: {
							x: Math.round(r.x),
							y: Math.round(r.y),
							w: Math.round(r.width),
							h: Math.round(r.height),
						},
						centre: { x: Math.round(cx), y: Math.round(cy) },
						inViewport,
						ownerTag: hit?.tagName?.toLowerCase() ?? null,
						ownerCls: hit ? (hit.className?.toString?.() || "").slice(0, 90) : null,
						ownedBySelf: hit ? el === hit || el.contains(hit) : null,
						fixedOverCentre: stack
							.filter((n) => getComputedStyle(n).position === "fixed")
							.map((n) => ({
								tag: n.tagName.toLowerCase(),
								cls: (n.className?.toString?.() || "").slice(0, 60),
							})),
					};
				});
			} catch (error) {
				emailHit = { found: true, error: String(error).slice(0, 200) };
			}
		}

		// E. click the nav trigger and see what is inside the sheet
		let sheet = null;
		const trig = page.locator(".dnt-actions__trigger");
		if ((await trig.count()) > 0) {
			await trig.click();
			await page.waitForTimeout(600);
			sheet = await page.evaluate(() => {
				const s = document.querySelector(".dnt-actions__sheet");
				const r = s?.getBoundingClientRect();
				return {
					hidden: s?.hasAttribute("hidden") ?? null,
					display: s ? getComputedStyle(s).display : null,
					box: r
						? { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }
						: null,
					bodyHtml:
						document.querySelector(".dnt-actions__sheet-body")?.innerHTML.slice(0, 300) ??
						null,
					controlCount: document.querySelectorAll(".dnt-actions__control").length,
					controlLabels: [
						...document.querySelectorAll(".dnt-actions__control-label"),
					].map((el) => el.textContent?.trim()),
				};
			});
		}

		report.viewports.push({
			requested: { w: vw, h: vh },
			...dom,
			settledGeometryCalls: settled,
			scrollCost,
			emailHit,
			sheet,
			consoleErrors: consoleErrors.slice(0, 25),
			pageErrors,
		});
	} finally {
		await context.close();
	}
}

await browser.close();
writeFileSync("scratch/rev-x1-attack.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log("wrote scratch/rev-x1-attack.json");
