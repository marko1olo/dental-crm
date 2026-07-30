/**
 * REVIEWER root-cause test: is the action group empty because the owner module is
 * instantiated TWICE (two `?t=` URLs => two `hostDom` singletons, residents portal
 * into a detached host), or because the slot target genuinely stays null?
 *
 * Read-only. Starts nothing. Patches only the page it drives, never the source.
 *   node scratch/rev-x1-dupmodule.mjs
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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
const page = await context.newPage();

// Record every insertion of a .dnt-actions__control and whether its parent slot is
// connected to the document. Installed BEFORE any app code runs.
await page.addInitScript(() => {
	window.__revIns = [];
	const origAppend = Node.prototype.appendChild;
	const origInsert = Node.prototype.insertBefore;
	const note = (parent, node, how) => {
		try {
			if (!(node instanceof Element)) return;
			const cls = node.className?.toString?.() || "";
			if (!cls.includes("dnt-actions__control")) return;
			window.__revIns.push({
				how,
				nodeCls: cls.slice(0, 60),
				parentCls: (parent.className?.toString?.() || "").slice(0, 60),
				parentSlot: parent.dataset?.dntSlot ?? null,
				parentConnected: parent.isConnected === true,
				parentRootIsDocument: parent.getRootNode?.() === document,
			});
		} catch {
			/* never break the app under test */
		}
	};
	Node.prototype.appendChild = function (node) {
		note(this, node, "appendChild");
		return origAppend.call(this, node);
	};
	Node.prototype.insertBefore = function (node, ref) {
		note(this, node, "insertBefore");
		return origInsert.call(this, node, ref);
	};
});

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
await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);

const insertions = await page.evaluate(() => window.__revIns ?? []);

// module identity: are the two ?t= URLs the same module record?
const identity = await page.evaluate(async () => {
	const a = "/src/components/workspaceActions/WorkspaceActions.tsx?t=1785234135879";
	const b = "/src/components/workspaceActions/WorkspaceActions.tsx?t=1785234960377";
	const c = "/src/components/workspaceActions/WorkspaceActions.tsx";
	try {
		const [ma, mb, mc] = await Promise.all([import(a), import(b), import(c)]);
		return {
			ok: true,
			aEqualsB: ma.WorkspaceActionsSlot === mb.WorkspaceActionsSlot,
			aEqualsC: ma.WorkspaceActionsSlot === mc.WorkspaceActionsSlot,
			bEqualsC: mb.WorkspaceActionsSlot === mc.WorkspaceActionsSlot,
		};
	} catch (error) {
		return { ok: false, error: String(error).slice(0, 200) };
	}
});

const dom = await page.evaluate(() => ({
	controlsInDocument: document.querySelectorAll(".dnt-actions__control").length,
	slotChildren: [...document.querySelectorAll(".dnt-actions__slot")].map(
		(el) => `${el.dataset.dntSlot}:${el.childElementCount}`,
	),
	hostsInDocument: document.querySelectorAll("#dnt-workspace-actions").length,
}));

await browser.close();
const out = { insertions, identity, dom };
writeFileSync("scratch/rev-x1-dupmodule.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(JSON.stringify(out, null, 2));
