import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/orthodontics");
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserPath = possibleBrowserPaths.find((p) => existsSync(p));

const browser = await chromium.launch({
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const context = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	locale: "ru-RU",
});

await context.addInitScript(() => {
	try {
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_clinic_token", "demo_clinic_token");
		localStorage.setItem("dente_staff_token", "demo_staff_token");
		localStorage.setItem("dente_active_session_token", "demo_staff_token");
		localStorage.setItem("dente_perspective", "orthodontic");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_role", "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doctor", fullName: "Д-р Соколов А. В.", role: "doctor" }));
		sessionStorage.setItem("dente_unlocked", "true");
	} catch (_) {}
});

const page = await context.newPage();

console.log("[NAV] Navigating to http://127.0.0.1:5173/?demo=true#ortho...");
await page.goto("http://127.0.0.1:5173/?demo=true#ortho", {
	waitUntil: "domcontentloaded",
	timeout: 30000,
});

await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);

let modal = await page.$('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]');
if (!modal) {
	console.log("[LAUNCH] Dispatching dente:open-orthodontics...");
	await page.evaluate(() => {
		window.location.hash = "#ortho";
		window.dispatchEvent(new CustomEvent("dente:open-orthodontics"));
		window.dispatchEvent(new CustomEvent("dente:open-ortho-studio"));
	});
	await page.waitForTimeout(1500);
}
await page.waitForSelector('.ortho-studio-modal, [data-testid="orthodontic-studio-modal"]', { state: "visible", timeout: 20000 });

// Hide overlays
await page.addStyleTag({
	content: `
		.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
		.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
		[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
		.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay,
		.sa-toast, [data-testid="global-toast"], .sa-toast--modal-active {
			display: none !important;
			opacity: 0 !important;
			pointer-events: none !important;
			visibility: hidden !important;
		}
	`,
}).catch(() => {});

// 1. PC Light
console.log("[1/4] Capturing PC Light (1440x900)...");
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "light");
	document.documentElement.classList.remove("dark");
	document.documentElement.classList.add("light");
	document.documentElement.style.colorScheme = "light";
	document.body.setAttribute("data-theme", "light");
	document.body.classList.remove("dark");
	document.body.classList.add("light");
	localStorage.setItem("dente_theme", "light");
	document.querySelectorAll('.sa-toast, [data-testid="global-toast"]').forEach((el) => el.remove());
});
await page.waitForTimeout(800);
const pcLightPath = path.join(PROOFS_DIR, "01_orthodontics_studio_pc_light_1440x900.png");
const pcLightBuf = await page.screenshot({ fullPage: false, timeout: 20000 });
fs.writeFileSync(pcLightPath, pcLightBuf);
console.log(`[SAVED] 01_orthodontics_studio_pc_light_1440x900.png (${Math.round(statSync(pcLightPath).size / 1024)} KB)`);

// 2. PC Dark
console.log("[2/4] Capturing PC Dark (1440x900)...");
await page.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "dark");
	document.documentElement.classList.remove("light");
	document.documentElement.classList.add("dark");
	document.documentElement.style.colorScheme = "dark";
	document.body.setAttribute("data-theme", "dark");
	document.body.classList.remove("light");
	document.body.classList.add("dark");
	localStorage.setItem("dente_theme", "dark");
	document.querySelectorAll('.sa-toast, [data-testid="global-toast"]').forEach((el) => el.remove());
});
await page.waitForTimeout(800);
const pcDarkPath = path.join(PROOFS_DIR, "02_orthodontics_studio_pc_dark_1440x900.png");
const pcDarkBuf = await page.screenshot({ fullPage: false, timeout: 20000 });
fs.writeFileSync(pcDarkPath, pcDarkBuf);
console.log(`[SAVED] 02_orthodontics_studio_pc_dark_1440x900.png (${Math.round(statSync(pcDarkPath).size / 1024)} KB)`);

// 3. Mobile Light
console.log("[3/4] Capturing Mobile Light (390x844)...");
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "light");
	document.documentElement.classList.remove("dark");
	document.documentElement.classList.add("light");
	document.documentElement.style.colorScheme = "light";
	document.body.setAttribute("data-theme", "light");
	document.body.classList.remove("dark");
	document.body.classList.add("light");
	localStorage.setItem("dente_theme", "light");
	document.querySelectorAll('.sa-toast, [data-testid="global-toast"]').forEach((el) => el.remove());
});
await page.waitForTimeout(800);
const mobLightPath = path.join(PROOFS_DIR, "03_orthodontics_studio_mobile_light_390x844.png");
const mobLightBuf = await page.screenshot({ fullPage: false, timeout: 20000 });
fs.writeFileSync(mobLightPath, mobLightBuf);
console.log(`[SAVED] 03_orthodontics_studio_mobile_light_390x844.png (${Math.round(statSync(mobLightPath).size / 1024)} KB)`);

// 4. Mobile Dark
console.log("[4/4] Capturing Mobile Dark (390x844)...");
await page.evaluate(() => {
	document.documentElement.setAttribute("data-theme", "dark");
	document.documentElement.classList.remove("light");
	document.documentElement.classList.add("dark");
	document.documentElement.style.colorScheme = "dark";
	document.body.setAttribute("data-theme", "dark");
	document.body.classList.remove("light");
	document.body.classList.add("dark");
	localStorage.setItem("dente_theme", "dark");
	document.querySelectorAll('.sa-toast, [data-testid="global-toast"]').forEach((el) => el.remove());
});
await page.waitForTimeout(800);
const mobDarkPath = path.join(PROOFS_DIR, "04_orthodontics_studio_mobile_dark_390x844.png");
const mobDarkBuf = await page.screenshot({ fullPage: false, timeout: 20000 });
fs.writeFileSync(mobDarkPath, mobDarkBuf);
console.log(`[SAVED] 04_orthodontics_studio_mobile_dark_390x844.png (${Math.round(statSync(mobDarkPath).size / 1024)} KB)`);

await browser.close();

console.log("\n>>> ALL 4 CANONICAL ORTHODONTICS PROOFS CAPTURED SUCCESSFULLY <<<");
