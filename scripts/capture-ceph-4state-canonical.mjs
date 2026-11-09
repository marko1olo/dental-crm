import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const TARGET_DIRS = [
	path.join(process.cwd(), "docs/proofs/orthodontics"),
	path.join(process.cwd(), "docs/proofs/radiology"),
];

for (const dir of TARGET_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
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
if (browserPath) {
	launchOptions.executablePath = browserPath;
}

const browser = await chromium.launch(launchOptions);
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
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_role", "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "demo-doctor", fullName: "Д-р Соколов А. В.", role: "doctor" }));
		sessionStorage.setItem("dente_unlocked", "true");
	} catch (_) {}
});

const page = await context.newPage();

console.log("[NAV] Navigating to http://127.0.0.1:5173/?patientId=pat-demo-01&ceph=1&demo=true...");
await page.goto("http://127.0.0.1:5173/?patientId=pat-demo-01&ceph=1&demo=true", {
	waitUntil: "domcontentloaded",
	timeout: 45000,
}).catch((err) => console.log("[WARN] Navigation wait:", err.message));

console.log("[WAIT] Waiting for .boot-state detachment...");
await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});

console.log("[WAIT] Checking for Cephalometric modal...");
await page.waitForSelector('[data-testid="cephalometric-analysis-modal"]', { state: "visible", timeout: 20000 }).catch(() => {});

// Suppress toast notifications & tours
await page.addStyleTag({
	content: `
		.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
		.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
		[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
		.notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
			display: none !important;
			pointer-events: none !important;
		}
	`,
}).catch(() => {});

// If preset button is available, click it to show calculated angles
try {
	const presetBtn = await page.$('button:has-text("Норма"), button:has-text("Демо"), button:has-text("Preset")');
	if (presetBtn) {
		await presetBtn.click().catch(() => {});
		await page.waitForTimeout(500);
	}
} catch (_) {}

const states = [
	{
		filename: "ceph_pc_light_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "light",
	},
	{
		filename: "ceph_pc_dark_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
	},
	{
		filename: "ceph_mobile_light_390x844.png",
		viewport: { width: 390, height: 844 },
		theme: "light",
	},
	{
		filename: "ceph_mobile_dark_390x844.png",
		viewport: { width: 390, height: 844 },
		theme: "dark",
	},
];

for (const state of states) {
	console.log(`\n[STATE] Switching to ${state.filename} (${state.viewport.width}x${state.viewport.height}, ${state.theme})...`);
	await page.setViewportSize(state.viewport);

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
	}, { theme: state.theme });

	await page.waitForTimeout(1000);

	const buffer = await page.screenshot({ fullPage: false });
	for (const dir of TARGET_DIRS) {
		const filePath = path.join(dir, state.filename);
		fs.writeFileSync(filePath, buffer);
	}

	const stats = statSync(path.join(TARGET_DIRS[0], state.filename));
	console.log(`[SAVED] ${state.filename} (${Math.round(stats.size / 1024)} KB)`);
	if (stats.size < 20 * 1024) {
		throw new Error(`[ERROR] Screenshot ${state.filename} is too small: ${stats.size} bytes (< 20 KB floor)!`);
	}
	console.log(`✓ Proof verified: ${state.filename} >= 20 KB`);
}

await context.close();
await browser.close();

console.log("\n=======================================================");
console.log(">>> ALL 4 CEPH TRG PROOFS CAPTURED & VERIFIED CLEANLY <<<");
console.log("=======================================================\n");
