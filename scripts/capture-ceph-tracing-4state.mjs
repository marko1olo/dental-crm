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
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_active_role", "doctor");
		sessionStorage.setItem("dente_unlocked", "true");
	} catch (_) {}
});

const page = await context.newPage();

await page.goto("http://127.0.0.1:5173/?demo=true&patientId=pat-1#orthodontics", {
	waitUntil: "domcontentloaded",
	timeout: 45000,
}).catch(() => {});

await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
await page.waitForSelector('[data-testid="orthodontic-studio-modal"], .ortho-studio-modal', { state: "visible", timeout: 30000 }).catch(() => {});

// Switch to photo & trg tab
await page.evaluate(() => {
	const buttons = Array.from(document.querySelectorAll(".ortho-tab-btn"));
	if (buttons[2]) {
		buttons[2].click();
	}
});
await page.waitForTimeout(600);

// Click "Развернуть трассировку" button
try {
	const expandBtn = page.locator('button:has-text("Развернуть трассировку")').first();
	await expandBtn.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
	if (await expandBtn.isVisible()) {
		await expandBtn.click();
		await page.waitForTimeout(800);
	}
} catch (_) {}

// Hide overlays
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

const states = [
	{
		filename: "09_ceph_tracing_canvas_pc_light_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "light",
	},
	{
		filename: "10_ceph_tracing_canvas_pc_dark_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
	},
];

for (const state of states) {
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

		const buttons = Array.from(document.querySelectorAll(".ortho-tab-btn"));
		if (buttons[2]) {
			buttons[2].click();
		}
	}, { theme: state.theme });

	await page.waitForTimeout(600);

	const filePath = path.join(PROOFS_DIR, state.filename);
	const buffer = await page.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
	fs.writeFileSync(filePath, buffer);

	const stats = statSync(filePath);
	console.log(`[SAVED] ${state.filename} (${Math.round(stats.size / 1024)} KB)`);
}

await context.close();
await browser.close();
console.log("CEPH TRACING PROOFS CAPTURED SUCCESSFULLY");
