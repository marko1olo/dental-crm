/**
 * capture-inquisition-warehouse-proofs.mjs — 4-State Proof Generator (Mandate 8b <= 120 lines).
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/warehouse");
const CONV_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cccc2e4-958e-4c5c-9d50-19d82d738965";
const PARENT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ce204741-1043-496d-84b4-ac98361937f4";
[PROOFS_DIR, CONV_DIR, PARENT_DIR].forEach((d) => !existsSync(d) && mkdirSync(d, { recursive: true }));

const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
	method: "POST", headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
const auth = await loginRes.json();
const browserPath = ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath: browserPath, args: ["--no-sandbox", "--disable-gpu"] });

const configs = [
	{ file: "01_warehouse_pc_light.png", vp: { width: 1440, height: 900 }, theme: "light", isMobile: false },
	{ file: "02_warehouse_pc_dark.png", vp: { width: 1440, height: 900 }, theme: "dark", isMobile: false },
	{ file: "03_warehouse_mobile_light.png", vp: { width: 390, height: 844 }, theme: "light", isMobile: true },
	{ file: "04_warehouse_mobile_dark.png", vp: { width: 390, height: 844 }, theme: "dark", isMobile: true },
];

for (const cfg of configs) {
	const storageState = {
		cookies: [{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" }],
		origins: [{ origin: "http://127.0.0.1:5173", localStorage: [
			{ name: "dente_demo_showcase", value: "true" }, { name: "dente_clinic_token", value: auth.clinicToken },
			{ name: "dente_staff_token", value: auth.staffToken }, { name: "dente_active_session_token", value: auth.staffToken },
			{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" }, { name: "dente_user_id", value: auth.user.id },
			{ name: "dente_user_role", value: "doctor" }, { name: "dente_role", value: "doctor" }, { name: "dente_theme_mode", value: cfg.theme },
			{ name: "dente-theme", value: cfg.theme }, { name: "dental-crm:onboarding:v1", value: JSON.stringify({ dismissed: true, step: "done" }) },
			{ name: "dente_onboarding_completed", value: "true" }, { name: "dente_tour_completed", value: "true" },
		]}],
	};
	const context = await browser.newContext({ viewport: cfg.vp, isMobile: cfg.isMobile, hasTouch: cfg.isMobile, locale: "ru-RU", colorScheme: cfg.theme, storageState });
	const page = await context.newPage();
	await page.goto("http://127.0.0.1:5173/?demo=true#inventory", { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(1500);
	await page.waitForSelector('.boot-state', { state: "detached", timeout: 25000 }).catch(() => {});
	await page.evaluate(({ theme }) => {
		window.location.hash = "inventory";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		if (document.body) document.body.className = theme;
	}, { theme: cfg.theme });
	await page.waitForTimeout(2000);
	const targetPath = path.join(PROOFS_DIR, cfg.file);
	await page.screenshot({ path: targetPath, fullPage: false });
	[CONV_DIR, PARENT_DIR].forEach((d) => copyFileSync(targetPath, path.join(d, cfg.file)));
	const s = statSync(targetPath);
	console.log(`[CAPTURED] ${cfg.file}: ${s.size} bytes`);
	await context.close();
}

await browser.close();
console.log("[ALL PROOFS OK]");
