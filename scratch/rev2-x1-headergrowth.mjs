/**
 * X1 review, second reviewer. ISOLATES THE HEADER GROWTH TO THE GROUP ITSELF.
 *
 * The A/B across dev-server configurations could be argued with. This one cannot:
 * ONE page, ONE module graph, the group's own host detached and re-attached while
 * measuring `.topbar` height. Whatever changes is the group's cost, nothing else.
 *
 * Read-only. Starts nothing.
 *   node scratch/rev2-x1-headergrowth.mjs
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

const report = { at: new Date().toISOString(), runs: [] };
const browser = await chromium.launch({ headless: true });

for (const [vw, vh] of [
	[841, 900],
	[900, 900],
	[1000, 900],
	[1280, 800],
	[1600, 1100],
]) {
	const context = await browser.newContext({ viewport: { width: vw, height: vh }, locale: "ru-RU" });
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

		const result = await page.evaluate(() => {
			const snap = (tag) => {
				const topbar = document.querySelector(".topbar");
				const row = document.querySelector(".top-actions");
				const primary = document.querySelector(".top-actions button.primary-button");
				const r = (el) => {
					if (!el) return null;
					const b = el.getBoundingClientRect();
					return {
						y: Math.round(b.y),
						h: Math.round(b.height),
						w: Math.round(b.width),
						right: Math.round(b.right),
					};
				};
				// A real wrap detector: items whose vertical spans do not overlap are on
				// different visual rows.
				const items = row
					? [...row.children]
							.filter((el) => el.getClientRects().length > 0)
							.map((el) => el.getBoundingClientRect())
							.sort((a, b) => a.top - b.top)
					: [];
				let rows = 0;
				let cursor = -1e9;
				for (const b of items) {
					if (b.top >= cursor - 1) {
						rows += 1;
						cursor = b.bottom;
					}
				}
				return {
					tag,
					topbarH: r(topbar)?.h ?? null,
					topActions: r(row),
					visualRows: rows,
					primary: r(primary),
					primaryOnOwnRow: (() => {
						if (!primary || !row) return null;
						const pb = primary.getBoundingClientRect();
						return ![...row.children].some((el) => {
							if (el === primary || el.getClientRects().length === 0) return false;
							const b = el.getBoundingClientRect();
							return b.bottom > pb.top + 1 && b.top < pb.bottom - 1;
						});
					})(),
					controls: document.querySelectorAll(".dnt-actions__control").length,
					groupW: r(document.querySelector(".dnt-actions__bar"))?.w ?? null,
				};
			};
			const withGroup = snap("with-group");
			const host = document.getElementById("dnt-workspace-actions");
			const parent = host?.parentElement ?? null;
			host?.remove();
			void document.body.offsetHeight;
			const withoutGroup = snap("host-detached");
			// Also emulate absence the way the CSS intends (:empty -> display:none).
			if (parent) parent.style.display = "none";
			void document.body.offsetHeight;
			const mountHidden = snap("mount-display-none");
			if (parent) {
				parent.style.display = "";
				if (host) parent.append(host);
			}
			void document.body.offsetHeight;
			const restored = snap("restored");
			return { withGroup, withoutGroup, mountHidden, restored };
		});
		report.runs.push({ requested: { w: vw, h: vh }, ...result });
	} catch (error) {
		report.runs.push({ requested: { w: vw, h: vh }, error: String(error).slice(0, 200) });
	} finally {
		await context.close();
	}
}

await browser.close();
writeFileSync("scratch/rev2-x1-headergrowth.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log("wrote scratch/rev2-x1-headergrowth.json");
for (const r of report.runs) {
	if (r.error) {
		console.log(`${r.requested.w}: ERROR ${r.error}`);
		continue;
	}
	const g = r.withGroup;
	const d = r.withoutGroup;
	const m = r.mountHidden;
	console.log(
		`${r.requested.w}x${r.requested.h}: topbar with=${g.topbarH} detached=${d.topbarH} mountHidden=${m.topbarH} restored=${r.restored.topbarH} | DELTA=${g.topbarH - m.topbarH}px | rows with=${g.visualRows} without=${m.visualRows} | «Запись» ownRow with=${g.primaryOnOwnRow} without=${m.primaryOnOwnRow} | groupW=${g.groupW} controls=${g.controls}`,
	);
}
