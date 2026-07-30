/**
 * V1: WHAT is the corner lifting over? Replicates the obstacle predicate from
 * cornerDockLayout.ts in page context and prints every element the corner sees
 * at the resting footprint and at the lifted footprint.
 *
 * Read-only against the shared dev server. Starts nothing.
 *   node scratch/probe-corner-obstacles.mjs [width] [height]
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const VW = Number(process.argv[2] || 840);
const VH = Number(process.argv[3] || 900);

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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	viewport: { width: VW, height: VH },
	isMobile: VW < 700,
	hasTouch: VW < 700,
	locale: "ru-RU",
});
const page = await context.newPage();
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

const out = await page.evaluate(() => {
	const INTERACTIVE_TAGS = new Set([
		"a",
		"button",
		"details",
		"input",
		"label",
		"select",
		"summary",
		"textarea",
	]);
	const INTERACTIVE_ROLES = new Set([
		"alertdialog",
		"button",
		"checkbox",
		"combobox",
		"dialog",
		"link",
		"menuitem",
		"option",
		"radio",
		"switch",
		"tab",
		"textbox",
	]);
	const MIN = 8;
	const host = document.getElementById("dente-corner-dock");
	const bar = host?.querySelector(".corner-dock__bar");
	if (!host || !bar) return { error: "no dock" };
	const nav = document.querySelector(".dnt-bottom-nav");
	const navVisible = nav && getComputedStyle(nav).display !== "none";
	const lift = Number.parseFloat(
		getComputedStyle(host).getPropertyValue("--corner-dock-lift"),
	);
	const live = bar.getBoundingClientRect();
	const resting = {
		left: live.left,
		right: live.right,
		top: live.top + lift,
		bottom: live.bottom + lift,
	};

	const describe = (el) => {
		const r = el.getBoundingClientRect();
		const tabAttr = el.getAttribute("tabindex");
		const parsed = tabAttr ? Number.parseInt(tabAttr, 10) : Number.NaN;
		const tabIndex = Number.isFinite(parsed)
			? parsed
			: el instanceof HTMLElement
				? el.tabIndex
				: -1;
		const hidden =
			el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true";
		const disabled =
			el.hasAttribute("disabled") ||
			el.getAttribute("aria-disabled") === "true";
		const role = el.getAttribute("role");
		let obstacle = true;
		let why = "";
		if (hidden || disabled) {
			obstacle = false;
			why = "hidden/disabled";
		} else if (r.width < MIN || r.height < MIN) {
			obstacle = false;
			why = "too small";
		} else if (INTERACTIVE_TAGS.has(el.tagName.toLowerCase())) {
			why = `tag ${el.tagName.toLowerCase()}`;
		} else if (role && INTERACTIVE_ROLES.has(role.toLowerCase())) {
			why = `role ${role}`;
		} else if (tabIndex >= 0) {
			why = `tabindex ${tabIndex}`;
		} else {
			obstacle = false;
			why = "not interactive";
		}
		return {
			tag: el.tagName.toLowerCase(),
			cls: (el.className?.toString?.() || "").slice(0, 64),
			role,
			tabIndex,
			pos: getComputedStyle(el).position,
			box: {
				x: Math.round(r.x),
				y: Math.round(r.y),
				w: Math.round(r.width),
				h: Math.round(r.height),
			},
			obstacle,
			why,
		};
	};

	const at = (l) => {
		const rect = {
			left: resting.left,
			right: resting.right,
			top: resting.top - l,
			bottom: resting.bottom - l,
		};
		const points = [
			{ x: rect.left + 1, y: rect.top + 1 },
			{ x: rect.right - 1, y: rect.top + 1 },
			{ x: rect.left + 1, y: rect.bottom - 1 },
			{ x: rect.right - 1, y: rect.bottom - 1 },
			{ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 },
		];
		const seen = new Set();
		const found = [];
		for (const p of points) {
			for (const el of document.elementsFromPoint(p.x, p.y)) {
				if (seen.has(el)) continue;
				seen.add(el);
				if (host.contains(el)) continue;
				if (navVisible && nav?.contains(el)) continue;
				found.push(describe(el));
			}
		}
		return {
			lift: l,
			rect: {
				top: Math.round(rect.top),
				bottom: Math.round(rect.bottom),
				left: Math.round(rect.left),
				right: Math.round(rect.right),
			},
			stackSize: found.length,
			obstacles: found.filter((f) => f.obstacle),
			ignored: found.filter((f) => !f.obstacle),
		};
	};

	return {
		viewport: { w: window.innerWidth, h: window.innerHeight },
		appliedLift: lift,
		resting: {
			top: Math.round(resting.top),
			bottom: Math.round(resting.bottom),
		},
		samples: [at(0), at(lift)],
	};
});

await context.close();
await browser.close();
const file = `scratch/v1-obstacles-${VW}x${VH}.json`;
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`wrote ${file}`);
