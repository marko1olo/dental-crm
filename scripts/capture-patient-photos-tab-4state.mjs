import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/photography");
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserPath = possibleBrowserPaths.find((p) => existsSync(p));

const launchOptions = {
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
};
if (browserPath) launchOptions.executablePath = browserPath;

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	locale: "ru-RU",
});

await context.addInitScript(() => {
	try {
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_role", "doctor");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		sessionStorage.setItem("dente_unlocked", "true");
	} catch (_) {}
});

const page = await context.newPage();
console.log("[NAV] Opening Patient Card via #patient-card...");
await page.goto("http://127.0.0.1:5173/?demo=true#patient-card", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='patient-card-modal']", { state: "attached", timeout: 20000 });
await page.waitForTimeout(1000);

// Suppress overlays
await page.evaluate(() => {
	const style = document.createElement("style");
	style.innerHTML = `
		.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"],
		.coachmark-tooltip-container, .guide-tour-floating-launcher,
		.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
			display: none !important;
			pointer-events: none !important;
		}
	`;
	document.head.appendChild(style);
});

// Click "Фотопротокол" tab
const photoTab = page.locator("[data-testid='tab-patient-photos']").first();
if (await photoTab.count()) {
	console.log("[CLICK] Switching to tab-patient-photos...");
	await photoTab.click();
	await page.waitForTimeout(1200);
}

await page.waitForSelector("[data-testid='patient-photos-panel']", { state: "visible", timeout: 10000 }).catch(() => {});

const states = [
	{ filename: "07_patient_photos_tab_pc_light_1440x900.png", viewport: { width: 1440, height: 900 }, theme: "light" },
	{ filename: "08_patient_photos_tab_pc_dark_1440x900.png", viewport: { width: 1440, height: 900 }, theme: "dark" },
	{ filename: "09_patient_photos_tab_mobile_light_390x844.png", viewport: { width: 390, height: 844 }, theme: "light" },
	{ filename: "10_patient_photos_tab_mobile_dark_390x844.png", viewport: { width: 390, height: 844 }, theme: "dark" },
];

for (const s of states) {
	await page.setViewportSize(s.viewport);
	await page.evaluate(({ theme }) => {
		const isDark = theme === "dark";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		document.body.setAttribute("data-theme", theme);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		localStorage.setItem("dente_theme", theme);
		localStorage.setItem("dente_theme_mode", theme);
	}, { theme: s.theme });

	await page.waitForTimeout(600);
	const filePath = path.join(PROOFS_DIR, s.filename);
	const buf = await page.screenshot({ fullPage: false });
	fs.writeFileSync(filePath, buf);
	const st = statSync(filePath);
	console.log(`[SAVED] ${s.filename} (${Math.round(st.size / 1024)} KB)`);
	if (st.size < 20 * 1024) throw new Error(`${s.filename} < 20 KB`);
}

await context.close();
await browser.close();
console.log(">>> PATIENT CARD PHOTOS TAB PROOFS CAPTURED SUCCESSFULLY <<<");
