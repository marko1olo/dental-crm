/**
 * REVIEWER follow-up: are Omnibar and VoiceAssistantUI actually MOUNTED, and if so
 * why are the group's slots empty? Read-only against the running dev server.
 *   node scratch/rev-x1-residents.mjs
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

const out = { at: new Date().toISOString(), runs: [] };
const browser = await chromium.launch({ headless: true });

for (const [vw, vh, hash] of [
	[1600, 1100, "#patients"],
	[1600, 1100, "#schedule"],
	[390, 844, "#patients"],
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
		await page.goto(`${WEB}/${hash}`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(9000);

		const before = await page.evaluate(() => ({
			controls: document.querySelectorAll(".dnt-actions__control").length,
			slotChildren: [...document.querySelectorAll(".dnt-actions__slot")].map(
				(el) => `${el.dataset.dntSlot}:${el.childElementCount}`,
			),
			omnibarDialogPresent: Boolean(document.querySelector(".omnibar-panel, [class*='omnibar']")),
			commandPaletteMarker: document.body.innerHTML.includes("Быстрые действия"),
		}));

		// Omnibar registers a window keydown listener for Cmd/Ctrl+K in an effect.
		// If the dialog opens, Omnibar IS mounted => the slot mechanism is what fails.
		await page.keyboard.press("Control+k");
		await page.waitForTimeout(900);
		const afterCtrlK = await page.evaluate(() => {
			const dialogText = document.body.innerText;
			return {
				omnibarOpened:
					dialogText.includes("Навигация") && dialogText.includes("Быстрые действия"),
				fixedInset0: document.querySelectorAll(".fixed.inset-0").length,
				z9999: [...document.querySelectorAll("div")].filter(
					(el) => getComputedStyle(el).zIndex === "9999",
				).length,
				controls: document.querySelectorAll(".dnt-actions__control").length,
			};
		});
		await page.keyboard.press("Escape");
		await page.waitForTimeout(300);

		// force a resize: does a placement refresh make the residents appear?
		await page.setViewportSize({ width: vw === 1600 ? 1400 : 380, height: vh });
		await page.waitForTimeout(1200);
		const afterResize = await page.evaluate(() => ({
			controls: document.querySelectorAll(".dnt-actions__control").length,
			slotChildren: [...document.querySelectorAll(".dnt-actions__slot")].map(
				(el) => `${el.dataset.dntSlot}:${el.childElementCount}`,
			),
			placement:
				document.getElementById("dnt-workspace-actions")?.dataset.placement ?? null,
		}));

		// how many React roots / is StrictMode on
		const meta = await page.evaluate(async () => {
			const res = await fetch("/src/main.tsx").then((r) => r.text()).catch(() => "");
			return {
				mainHasStrictMode: res.includes("StrictMode"),
				mainSnippet: res.slice(0, 600),
			};
		});

		out.runs.push({ vw, vh, hash, before, afterCtrlK, afterResize, meta });
	} finally {
		await context.close();
	}
}

await browser.close();
writeFileSync("scratch/rev-x1-residents.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log("wrote scratch/rev-x1-residents.json");
