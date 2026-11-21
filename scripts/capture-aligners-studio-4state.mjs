import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/orthodontics");
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

let auth = { clinicToken: "demo_clinic_token", staffToken: "demo_staff_token", user: { id: "demo-doctor", fullName: "Д-р Соколов А. В.", role: "doctor" } };
try {
	const res = await fetch("http://127.0.0.1:4100/api/health", { signal: AbortSignal.timeout(2000) });
	if (res.ok) {
		const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
			signal: AbortSignal.timeout(3000),
		});
		if (loginRes.ok) {
			auth = await loginRes.json();
		}
	}
} catch (_) {}

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

await context.addInitScript(({ cTok, sTok, uid, fn }) => {
	try {
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_clinic_token", cTok);
		localStorage.setItem("dente_staff_token", sTok);
		localStorage.setItem("dente_active_session_token", sTok);
		localStorage.setItem("dente_perspective", "orthodontic");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_role", "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: uid, fullName: fn, role: "doctor" }));
		sessionStorage.setItem("dente_unlocked", "true");
	} catch (_) {}
}, {
	cTok: auth.clinicToken,
	sTok: auth.staffToken,
	uid: auth.user.id,
	fn: auth.user.fullName,
});

const page = await context.newPage();

await page.goto("http://127.0.0.1:5173/?demo=true&patientId=pat-1#orthodontics", {
	waitUntil: "domcontentloaded",
	timeout: 45000,
}).catch(() => {});

await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
await page.waitForSelector('[data-testid="orthodontic-studio-modal"], .ortho-studio-modal', { state: "visible", timeout: 30000 }).catch(() => {});

// Switch to aligners tab
await page.evaluate(() => {
	const buttons = Array.from(document.querySelectorAll(".ortho-tab-btn"));
	if (buttons[1]) {
		buttons[1].click();
	}
});
await page.waitForTimeout(1000);

// Hide distracting overlays
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
		filename: "05_aligners_studio_tracker_pc_light_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "light",
	},
	{
		filename: "06_aligners_studio_tracker_pc_dark_1440x900.png",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
	},
	{
		filename: "07_aligners_studio_tracker_mobile_light_390x844.png",
		viewport: { width: 390, height: 844 },
		theme: "light",
	},
	{
		filename: "08_aligners_studio_tracker_mobile_dark_390x844.png",
		viewport: { width: 390, height: 844 },
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

		// Re-click aligners tab to ensure it stays active across viewport switches
		const buttons = Array.from(document.querySelectorAll(".ortho-tab-btn"));
		if (buttons[1]) {
			buttons[1].click();
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
console.log("ALIGNERS STUDIO PROOFS CAPTURED SUCCESSFULLY");
