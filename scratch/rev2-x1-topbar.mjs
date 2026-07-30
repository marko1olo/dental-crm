/**
 * X1 review, second reviewer. THE BAND NOBODY MEASURED: 841-1000px.
 *
 * Below 841px the bottom nav exists and the group goes there (builder measured
 * 390x844 and 720x1100). At 1600x1100 the topbar is roomy (builder measured it).
 * Between 841px and ~1000px the bottom nav is gone (`max-width: 840px`), so the
 * group lands in `.top-actions` NEXT TO six existing buttons, at the narrowest
 * width where that can happen. The builder never measured there. Reviewer #1
 * measured 1600x1100 but with the group EMPTY (the dev-server module split), i.e.
 * with the group contributing ZERO width — so their topbar numbers are not a test
 * of the shipped layout either.
 *
 * The builder added `flex-wrap: wrap` to `.top-actions` via `:has()` for exactly
 * this band, blind. If the row wraps, the topbar grows a row and the header eats
 * vertical space — the same regression the builder found and fixed in the bottom
 * nav (64 -> 76px), just relocated to the top.
 *
 * A/B, same server, same code:
 *   control = the dev server's stale double module record => group renders EMPTY
 *             => a faithful stand-in for "topbar without the group".
 *   deduped = one module record => group renders its three buttons (the shipped
 *             design).
 * The delta is the group's real cost to the topbar.
 *
 * Read-only. Starts nothing.
 *   node scratch/rev2-x1-topbar.mjs
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
			right: Math.round(r.right),
			bottom: Math.round(r.bottom),
		};
	};
	const topbar = document.querySelector(".topbar");
	const row = document.querySelector(".top-actions");
	const children = row
		? [...row.children]
				.filter((el) => el.getClientRects().length > 0)
				.map((el) => ({
					tag: el.tagName.toLowerCase(),
					cls: (el.className?.toString?.() || "").slice(0, 46),
					text: (el.textContent || "").trim().slice(0, 18),
					...rect(el),
				}))
		: [];
	// One entry per distinct top edge = one visual row.
	const rows = [...new Set(children.map((c) => c.y))].sort((a, b) => a - b);
	const primary = document.querySelector(".top-actions button.primary-button");
	const primaryBox = primary?.getBoundingClientRect() ?? null;
	const clinicName =
		document.querySelector(".topbar-clinic-name") ??
		document.querySelector(".topbar h1") ??
		document.querySelector(".topbar-title") ??
		topbar?.querySelector("h1, h2, .clinic-name") ??
		null;
	return {
		viewport: { w: window.innerWidth, h: window.innerHeight },
		placement:
			document.getElementById("dnt-workspace-actions")?.dataset.placement ?? null,
		controlCount: document.querySelectorAll(".dnt-actions__control").length,
		navDisplayed: (() => {
			const nav = document.querySelector(".dnt-bottom-nav");
			return nav ? getComputedStyle(nav).display !== "none" : false;
		})(),
		topbar: rect(topbar),
		topbarFlexWrap: row ? getComputedStyle(row).flexWrap : null,
		topActions: rect(row),
		topActionsRowCount: rows.length,
		topActionsRowTops: rows,
		topActionsOverflowsX: row ? row.scrollWidth > row.clientWidth + 1 : null,
		topActionsScrollW: row ? row.scrollWidth : null,
		topActionsClientW: row ? row.clientWidth : null,
		children,
		groupBox: rect(document.querySelector(".dnt-actions__bar")),
		primary: primaryBox
			? {
					...rect(primary),
					centreOwnedBySelf: (() => {
						const cx = primaryBox.left + primaryBox.width / 2;
						const cy = primaryBox.top + primaryBox.height / 2;
						if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight)
							return "offscreen";
						const hit = document.elementFromPoint(cx, cy);
						return hit ? primary === hit || primary.contains(hit) : false;
					})(),
					text: (primary.textContent || "").trim().slice(0, 20),
				}
			: null,
		clinicName: clinicName
			? {
					cls: (clinicName.className?.toString?.() || clinicName.tagName).slice(0, 40),
					text: (clinicName.textContent || "").trim().slice(0, 30),
					...rect(clinicName),
					clipped: clinicName.scrollWidth > clinicName.clientWidth + 1,
				}
			: null,
		docScrollW: document.scrollingElement.scrollWidth,
		horizontalScrollbar: document.scrollingElement.scrollWidth > window.innerWidth + 1,
		// The dead-space stack and the corner inventory, in MY hands, with the
		// controls actually present.
		paddingStack: (() => {
			const out = {};
			let total = 0;
			for (const sel of ["section.workspace", ".work-grid", ".patients-panel", "main.app-shell"]) {
				const el = document.querySelector(sel);
				const v = el ? Math.round(Number.parseFloat(getComputedStyle(el).paddingBottom) * 100) / 100 : null;
				out[sel] = v;
				if (v && sel !== "main.app-shell") total += v;
			}
			out.total = total;
			return out;
		})(),
		trailingBelowLastElement: (() => {
			const panel = document.querySelector(".patients-panel");
			const last = panel?.lastElementChild ?? null;
			const sc = document.scrollingElement;
			return last
				? Math.round(sc.scrollHeight - (last.getBoundingClientRect().bottom + sc.scrollTop))
				: null;
		})(),
		fixedBottomRight: (() => {
			const out = [];
			for (const el of document.querySelectorAll("body *")) {
				const s = getComputedStyle(el);
				if (s.position !== "fixed") continue;
				const r = el.getBoundingClientRect();
				if (r.width < 8 || r.height < 8) continue;
				if (r.bottom < window.innerHeight - 200) continue;
				if (r.right < window.innerWidth - 420) continue;
				out.push({ cls: (el.className?.toString?.() || el.tagName).slice(0, 44), z: s.zIndex });
			}
			return out;
		})(),
	};
};

const report = { at: new Date().toISOString(), runs: [] };
const browser = await chromium.launch({ headless: true });

for (const mode of ["control", "deduped"]) {
	for (const [vw, vh] of [
		[841, 900],
		[900, 900],
		[1000, 900],
		[1280, 800],
		[1600, 1100],
	]) {
		const context = await browser.newContext({
			viewport: { width: vw, height: vh },
			locale: "ru-RU",
		});
		const page = await context.newPage();
		if (mode === "deduped") {
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
			await page.waitForTimeout(5500);
			report.runs.push({ mode, requested: { w: vw, h: vh }, ...(await page.evaluate(MEASURE)) });
		} catch (error) {
			report.runs.push({ mode, requested: { w: vw, h: vh }, error: String(error).slice(0, 200) });
		} finally {
			await context.close();
		}
	}
}

await browser.close();
writeFileSync("scratch/rev2-x1-topbar.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log("wrote scratch/rev2-x1-topbar.json");
for (const r of report.runs) {
	if (r.error) {
		console.log(`${r.mode} ${r.requested.w}: ERROR ${r.error}`);
		continue;
	}
	console.log(
		`${r.mode} ${r.requested.w}x${r.requested.h} placement=${r.placement} controls=${r.controlCount} | topbar h=${r.topbar?.h} | rows=${r.topActionsRowCount} tops=${JSON.stringify(r.topActionsRowTops)} overflowX=${r.topActionsOverflowsX} (${r.topActionsScrollW}/${r.topActionsClientW}) | primary=${r.primary ? r.primary.w + "x" + r.primary.h + " own=" + r.primary.centreOwnedBySelf : "none"} | hscroll=${r.horizontalScrollbar} | pad=${JSON.stringify(r.paddingStack)} trailing=${r.trailingBelowLastElement} | fixedBR=${JSON.stringify(r.fixedBottomRight)}`,
	);
}
