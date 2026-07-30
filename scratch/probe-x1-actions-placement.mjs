/**
 * X1-corner-redesign — the two measurements the packet names, which neither
 * existing probe can still make.
 *
 * WHY A NEW FILE INSTEAD OF REUSING THE OLD ONES, stated plainly because the
 * packet asked for reuse:
 *   - scratch/probe-corner-obstacles.mjs reads `--corner-dock-lift` off the dock
 *     host and feeds it to document.elementsFromPoint. The V1 reviewer already
 *     recorded it exiting 1 with "The provided double value is non-finite"
 *     because the variable stopped being written. At this HEAD the dock host
 *     does not exist at all, so it cannot run by construction.
 *   - scratch/probe-corner-reserve.mjs measures computed padding-bottom and the
 *     inventory of position:fixed corner elements. That one IS reused, unchanged,
 *     as `node scratch/probe-corner-reserve.mjs x1-after`. It does not measure
 *     the trailing dead-space STACK, and it does not hit-test named targets.
 *
 * Answers, with numbers:
 *   1. Trailing dead space at 390x844: the stack of bottom paddings that pushes
 *      the last element away from the viewport bottom
 *      (.patients-panel + .work-grid + .workspace), which the V1 review measured
 *      at ~299 px and charged as still open.
 *   2. At 1600x1100 on #patients: does ANY position:fixed element cover the
 *      centre of <label>Email</label> or of button.primary-button «Запись»?
 *      document.elementFromPoint at the centre of each is the exact check that
 *      caught the regression V1 shipped.
 *   3. Where the group actually rendered: header at wide, bottom nav at narrow.
 *
 * Read-only against the SHARED dev server. Starts nothing, restarts nothing.
 * Writes scratch/x1-actions-<phase>.json (scratch, never staged).
 *
 *   node scratch/probe-x1-actions-placement.mjs after
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PHASE = process.argv[2] || "after";
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
	[720, 1100],
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
		await page.waitForTimeout(4500);

		const result = await page.evaluate(() => {
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
			const describe = (el) => {
				if (!el) return null;
				const s = getComputedStyle(el);
				return {
					tag: el.tagName.toLowerCase(),
					id: el.id || null,
					cls: (el.className?.toString?.() || "").slice(0, 80),
					position: s.position,
					z: s.zIndex,
					box: box(el),
				};
			};

			// ---- 1. trailing dead space: the stack of bottom paddings ----
			const stackSelectors = [
				"section.workspace",
				".work-grid",
				".patients-panel",
				"main.app-shell",
			];
			const paddingStack = {};
			let stackTotal = 0;
			for (const selector of stackSelectors) {
				const el = document.querySelector(selector);
				const value = el ? px(getComputedStyle(el).paddingBottom) : null;
				paddingStack[selector] = value;
				// main.app-shell CONTAINS .workspace; its padding is counted separately
				// because at <=840px it is explicitly zeroed and must be shown to be 0.
				if (value && selector !== "main.app-shell") stackTotal += value;
			}

			// The honest user-visible number: distance from the bottom of the last
			// real content element to the bottom of the scrollable extent.
			const panel = document.querySelector(".patients-panel");
			const lastChild = panel?.lastElementChild ?? null;
			const scroller = document.scrollingElement;
			const trailingBelowLastElement = lastChild
				? Math.round(
						scroller.scrollHeight -
							(lastChild.getBoundingClientRect().bottom + scroller.scrollTop),
					)
				: null;

			// ---- 2. does anything fixed cover a named target's centre? ----
			const targets = [];
			const labelEmail = [...document.querySelectorAll("label")].find(
				(el) => (el.textContent || "").trim().toLowerCase().startsWith("email"),
			);
			// The «Запись» CTA specifically — the button V1 measured at 364x44 and
			// proved un-yieldable. `document.querySelector("button.primary-button")`
			// resolves to the demo banner's «Запустить мастер» instead, which is a
			// different button, so it is scoped to the topbar action row here.
			const primary =
				document.querySelector(".top-actions button.primary-button") ??
				document.querySelector("button.primary-button");
			for (const [name, el] of [
				["label:Email", labelEmail],
				["button.primary-button(Запись)", primary],
			]) {
				if (!el) {
					targets.push({ name, found: false });
					continue;
				}
				// Both targets must be ON SCREEN for a hit test to mean anything. The
				// Email label sits far below the fold on #patients, so it is scrolled
				// into view first; without this the centre is outside the viewport and
				// elementFromPoint returns null, which proves nothing either way.
				el.scrollIntoView({ block: "center", inline: "nearest" });
				const r = el.getBoundingClientRect();
				const cx = r.left + r.width / 2;
				const cy = r.top + r.height / 2;
				const inViewport =
					cx >= 0 && cy >= 0 && cx <= window.innerWidth && cy <= window.innerHeight;
				const hit = inViewport ? document.elementFromPoint(cx, cy) : null;
				const stack = inViewport ? document.elementsFromPoint(cx, cy) : [];
				const fixedAbove = stack
					.filter((node) => getComputedStyle(node).position === "fixed")
					.map((node) => describe(node));
				targets.push({
					name,
					found: true,
					text: (el.textContent || "").trim().slice(0, 40),
					box: box(el),
					centre: { x: Math.round(cx), y: Math.round(cy) },
					inViewport,
					centreOwnedBy: hit ? describe(hit) : null,
					centreOwnedBySelf: hit ? el === hit || el.contains(hit) : null,
					fixedElementsOverCentre: fixedAbove,
				});
			}

			// ---- 3. where did the group actually render? ----
			const host = document.getElementById("dnt-workspace-actions");
			const nav = document.querySelector(".dnt-bottom-nav");
			const navVisible = nav ? getComputedStyle(nav).display !== "none" : false;
			const controls = [...document.querySelectorAll(".dnt-actions__control")].map(
				(el) => ({
					label:
						el.querySelector(".dnt-actions__control-label")?.textContent?.trim() ??
						null,
					hintVisible: (() => {
						const hint = el.querySelector(".dnt-actions__control-hint");
						return hint ? getComputedStyle(hint).display !== "none" : null;
					})(),
					box: box(el),
				}),
			);

			// ---- 4. did the extra nav item break its neighbours' labels? ----
			// The packet's explicit constraint: adding to the bottom nav must not
			// crowd it or break its labels. Measured per item, not asserted.
			const navItems = nav
				? [
						// `.dnt-actions-nav-slot` is display:contents, so the group's own
						// button is a flex item of the nav but NOT a DOM child of it.
						...nav.querySelectorAll(":scope > a, :scope > button, .dnt-actions__trigger"),
					]
						.map((el) => {
							const span = el.querySelector("span");
							const r = el.getBoundingClientRect();
							return {
								tag: el.tagName.toLowerCase(),
								label: span?.textContent?.trim() ?? null,
								w: Math.round(r.width),
								h: Math.round(r.height),
								// getClientRects() on an inline element returns ONE RECT PER LINE
								// BOX. This is the decisive wrap count: lineHeight can compute to
								// "normal", and parseFloat("normal") is NaN, which silently
								// reported null instead of a number in the first run.
								lines: span ? span.getClientRects().length : null,
								spanH: span ? Math.round(span.getBoundingClientRect().height) : null,
								labelClipped: span
									? span.scrollWidth > span.clientWidth + 1
									: null,
								labelW: span ? Math.round(span.getBoundingClientRect().width) : null,
								labelScrollW: span ? span.scrollWidth : null,
							};
						})
				: [];

			// every position:fixed element in the bottom-right quadrant: the corner
			// the packet exists to empty.
			const cornerFixed = [];
			for (const el of document.querySelectorAll("body *")) {
				const s = getComputedStyle(el);
				if (s.position !== "fixed") continue;
				const r = el.getBoundingClientRect();
				if (r.width < 8 || r.height < 8) continue;
				if (r.bottom < window.innerHeight - 200) continue;
				if (r.right < window.innerWidth - 420) continue;
				cornerFixed.push(describe(el));
			}

			return {
				viewport: { w: window.innerWidth, h: window.innerHeight },
				hash: location.hash,
				oldDockHosts: document.querySelectorAll("#dente-corner-dock").length,
				reserveVar: getComputedStyle(document.documentElement)
					.getPropertyValue("--corner-dock-reserve-block")
					.trim(),
				actionsHosts: document.querySelectorAll("#dnt-workspace-actions").length,
				actionsPlacement: host?.dataset.placement ?? null,
				actionsHostPosition: host ? getComputedStyle(host).position : null,
				actionsInsideTopbar: host ? Boolean(host.closest(".topbar")) : null,
				actionsInsideNav: host ? Boolean(host.closest(".dnt-bottom-nav")) : null,
				navTrigger: describe(document.querySelector(".dnt-actions__trigger")),
				navTriggerLabel:
					document
						.querySelector(".dnt-actions__trigger > span")
						?.textContent?.trim() ?? null,
				navItemCount: nav ? nav.querySelectorAll("a").length : null,
				navItems,
				navVisible,
				navBox: box(nav),
				controls,
				controlCount: controls.length,
				targets,
				paddingStack,
				stackTotal,
				trailingBelowLastElement,
				cornerFixed,
			};
		});

		/*
		 * DOES PRESSING «Голос» ACTUALLY SHOW THE PANEL?
		 * The static read above cannot answer it: getComputedStyle on a hint inside a
		 * [hidden] ancestor still reports its OWN display, so "hintVisible: true"
		 * proves nothing about the panel being open. So the trigger is really clicked
		 * and the result measured — this is the whole new interaction on a phone.
		 */
		let interaction = null;
		const trigger = page.locator(".dnt-actions__trigger");
		if ((await trigger.count()) > 0) {
			const before = await page.evaluate(() => {
				const sheet = document.querySelector(".dnt-actions__sheet");
				return { hidden: sheet?.hasAttribute("hidden") ?? null };
			});
			await trigger.click();
			await page.waitForTimeout(400);
			const after = await page.evaluate(() => {
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
				const sheet = document.querySelector(".dnt-actions__sheet");
				const nav = document.querySelector(".dnt-bottom-nav");
				const navBox = nav?.getBoundingClientRect() ?? null;
				const sheetBox = sheet?.getBoundingClientRect() ?? null;
				return {
					hidden: sheet?.hasAttribute("hidden") ?? null,
					sheetDisplay: sheet ? getComputedStyle(sheet).display : null,
					sheetBox: rect(sheet),
					sheetVisibleOnScreen: sheetBox
						? sheetBox.height > 0 &&
							sheetBox.top < window.innerHeight &&
							sheetBox.bottom > 0
						: null,
					// The panel must sit ABOVE the navigation, never on top of it.
					sheetBottomVsNavTop:
						sheetBox && navBox
							? Math.round(navBox.top - sheetBox.bottom)
							: null,
					triggerExpanded: document
						.querySelector(".dnt-actions__trigger")
						?.getAttribute("aria-expanded"),
					// Each action, as the human sees it once the panel is open.
					controls: [...document.querySelectorAll(".dnt-actions__control")].map(
						(el) => {
							const label = el.querySelector(".dnt-actions__control-label");
							const hint = el.querySelector(".dnt-actions__control-hint");
							return {
								label: label?.textContent?.trim() ?? null,
								labelBox: rect(label),
								hint: hint?.textContent?.trim()?.slice(0, 34) ?? null,
								hintBox: rect(hint),
								box: rect(el),
								// centre of the control must belong to the control itself
								centreOwnedBySelf: (() => {
									const r = el.getBoundingClientRect();
									if (r.width < 1 || r.height < 1) return null;
									const hit = document.elementFromPoint(
										r.left + r.width / 2,
										r.top + r.height / 2,
									);
									return hit ? el === hit || el.contains(hit) : false;
								})(),
							};
						},
					),
				};
			});
			interaction = { before, after };
		}

		report.viewports.push({ requested: { w: vw, h: vh }, ...result, interaction });
	} finally {
		await context.close();
	}
}

await browser.close();
const out = `scratch/x1-actions-${PHASE}.json`;
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`wrote ${out}`);
