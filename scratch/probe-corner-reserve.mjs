/**
 * V1-corner-reserve-regression — real browser measurement of the floating corner.
 *
 * Answers three questions with numbers, not opinion:
 *   F2  how many times the corner reserve lands on nested boxes, and how many
 *       pixels of the viewport that costs (computed padding-bottom, read from
 *       the live page, on BOTH <main class="app-shell"> and .workspace)
 *   F4  cost of the corner layout pass per scroll frame (hit tests, forced
 *       rect reads, ms, frame duration). document.elementsFromPoint has exactly
 *       one caller in apps/web/src (CornerDock.tsx), so the hit-test counter is
 *       attributable to the corner and nothing else.
 *   F1  inventory of every position:fixed element living in the bottom-right
 *       corner, with z-index.
 *
 * Read-only against the SHARED dev server. Starts nothing, restarts nothing.
 *
 *   node scratch/probe-corner-reserve.mjs before
 *   node scratch/probe-corner-reserve.mjs after
 *
 * Writes scratch/v1-corner-<phase>.json (untracked scratch, never staged).
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PHASE = process.argv[2] || "before";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const SCROLL_FRAMES = 120;

async function req(path, init = {}, attempts = 8) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 2000));
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

const report = { phase: PHASE, at: new Date().toISOString(), viewports: [] };
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
		await page.waitForTimeout(4000);

		const geometry = await page.evaluate(() => {
			const px = (v) => {
				const n = Number.parseFloat(v);
				return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
			};
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
			const shell = document.querySelector("main.app-shell");
			const workspace = document.querySelector("section.workspace");
			const nav = document.querySelector(".dnt-bottom-nav");
			const host = document.getElementById("dente-corner-dock");
			const bar = host?.querySelector(".corner-dock__bar") ?? null;
			const navVisible = nav ? getComputedStyle(nav).display !== "none" : false;

			const cornerFixed = [];
			for (const el of document.querySelectorAll("body *")) {
				const s = getComputedStyle(el);
				if (s.position !== "fixed") continue;
				const r = el.getBoundingClientRect();
				if (r.width < 8 || r.height < 8) continue;
				if (r.bottom < window.innerHeight - 200) continue;
				if (r.right < window.innerWidth - 420) continue;
				cornerFixed.push({
					tag: el.tagName.toLowerCase(),
					id: el.id || null,
					cls: (el.className?.toString?.() || "").slice(0, 60),
					role: el.getAttribute("role"),
					z: s.zIndex,
					box: box(el),
				});
			}

			return {
				viewport: { w: window.innerWidth, h: window.innerHeight },
				hash: location.hash,
				dockHosts: document.querySelectorAll("#dente-corner-dock").length,
				reserveVar: getComputedStyle(
					document.documentElement,
				).getPropertyValue("--corner-dock-reserve-block").trim(),
				navClearanceVar: host
					? getComputedStyle(host)
							.getPropertyValue("--corner-dock-bar-clearance")
							.trim()
					: null,
				liftVar: host
					? getComputedStyle(host).getPropertyValue("--corner-dock-lift").trim()
					: null,
				density: host?.dataset.cornerDensity ?? null,
				shell: {
					present: Boolean(shell),
					cls: shell?.className ?? null,
					paddingBottom: shell ? px(getComputedStyle(shell).paddingBottom) : null,
					box: box(shell),
				},
				workspace: {
					present: Boolean(workspace),
					paddingBottom: workspace
						? px(getComputedStyle(workspace).paddingBottom)
						: null,
					overflowY: workspace ? getComputedStyle(workspace).overflowY : null,
					backdropFilter: workspace
						? getComputedStyle(workspace).backdropFilter
						: null,
					scrollHeight: workspace?.scrollHeight ?? null,
					clientHeight: workspace?.clientHeight ?? null,
					box: box(workspace),
				},
				nav: { present: Boolean(nav), visible: navVisible, box: box(nav) },
				dockBar: box(bar),
				cornerFixed,
			};
		});

		// ---- F4: cost of the corner layout pass while scrolling ----
		const scroll = await page.evaluate(async (frames) => {
			// The real scroller, measured rather than assumed: .workspace declares
			// overflow-y:auto but is never height-constrained, so at HEAD it has
			// scrollHeight === clientHeight and the DOCUMENT is what scrolls.
			const extent = (el) =>
				el ? el.scrollHeight - el.clientHeight : -1;
			const candidates = [
				document.querySelector("section.workspace"),
				document.scrollingElement,
			];
			let scroller = null;
			for (const el of candidates) {
				if (extent(el) > extent(scroller)) scroller = el;
			}
			const stats = {
				hits: 0,
				hitMs: 0,
				rects: 0,
				rectMs: 0,
				frames: 0,
				deltas: [],
			};
			const efp = document.elementsFromPoint.bind(document);
			document.elementsFromPoint = (x, y) => {
				const t = performance.now();
				const out = efp(x, y);
				stats.hitMs += performance.now() - t;
				stats.hits += 1;
				return out;
			};
			const gbcr = Element.prototype.getBoundingClientRect;
			Element.prototype.getBoundingClientRect = function patched() {
				const t = performance.now();
				const out = gbcr.call(this);
				stats.rectMs += performance.now() - t;
				stats.rects += 1;
				return out;
			};

			// Idle baseline: the app may read geometry on its own.
			await new Promise((done) => {
				let n = 0;
				const tick = () => {
					n += 1;
					if (n >= 30) return done();
					requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			});
			const idle = { hits: stats.hits, rects: stats.rects };

			let dir = 1;
			let last = performance.now();
			await new Promise((done) => {
				const tick = () => {
					const now = performance.now();
					stats.deltas.push(Math.round((now - last) * 100) / 100);
					last = now;
					stats.frames += 1;
					if (scroller) {
						const max = scroller.scrollHeight - scroller.clientHeight;
						if (max > 8) {
							const next = scroller.scrollTop + dir * 6;
							if (next <= 0 || next >= max) dir = -dir;
							scroller.scrollTop = Math.max(0, Math.min(max, next));
						}
					}
					if (stats.frames >= frames) return done();
					requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			});

			document.elementsFromPoint = efp;
			Element.prototype.getBoundingClientRect = gbcr;

			const scrollHits = stats.hits - idle.hits;
			const scrollRects = stats.rects - idle.rects;
			const sorted = [...stats.deltas].sort((a, b) => a - b);
			const mean =
				Math.round(
					(stats.deltas.reduce((a, b) => a + b, 0) / stats.deltas.length) * 100,
				) / 100;
			return {
				scroller: scroller
					? `${scroller.tagName.toLowerCase()}.${(scroller.className?.toString?.() || "").split(" ")[0] || "-"}`
					: null,
				scrollable: extent(scroller),
				workspaceScrollable: extent(
					document.querySelector("section.workspace"),
				),
				frames: stats.frames,
				idleHitsIn30Frames: idle.hits,
				hits: scrollHits,
				hitsPerFrame: Math.round((scrollHits / stats.frames) * 100) / 100,
				hitMsTotal: Math.round(stats.hitMs * 100) / 100,
				rects: scrollRects,
				rectsPerFrame: Math.round((scrollRects / stats.frames) * 100) / 100,
				rectMsTotal: Math.round(stats.rectMs * 100) / 100,
				frameMeanMs: mean,
				frameP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? null,
				frameMaxMs: sorted[sorted.length - 1] ?? null,
			};
		}, SCROLL_FRAMES);

		report.viewports.push({ requested: { w: vw, h: vh }, geometry, scroll });
	} finally {
		await context.close();
	}
}

await browser.close();
const out = `scratch/v1-corner-${PHASE}.json`;
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`wrote ${out}`);
