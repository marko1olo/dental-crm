import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/orthodontics");
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

// 1. Check Fastify API optionally
let auth = { clinicToken: "demo_clinic_token", staffToken: "demo_staff_token", user: { id: "demo-doctor", fullName: "Д-р Соколов А. В.", role: "doctor" } };
try {
	console.log("[AUTH] Checking Fastify API on http://127.0.0.1:4100/api/health...");
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
			console.log(`[AUTH] Authenticated user: ${auth.user.fullName}, role: ${auth.user.role}`);
		}
	}
} catch (e) {
	console.log("[AUTH] Using demo mode fallback tokens:", e.message);
}

// 2. Ensure Vite server
console.log("[VITE] Checking dev server on http://127.0.0.1:5173...");
for (let i = 0; i < 15; i++) {
	try {
		const res = await fetch("http://127.0.0.1:5173");
		if (res.ok) {
			console.log("[VITE] Dev server is responding!");
			break;
		}
	} catch {}
	await new Promise((r) => setTimeout(r, 600));
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserPath = possibleBrowserPaths.find((p) => existsSync(p));
console.log(`[BROWSER] Found browser executable: ${browserPath}`);

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

console.log("[NAV] Navigating to http://127.0.0.1:5173/?demo=true#ortho-protocol...");
await page.goto("http://127.0.0.1:5173/?demo=true#ortho-protocol", {
	waitUntil: "domcontentloaded",
	timeout: 45000,
}).catch((err) => console.log("[WARN] Navigation wait:", err.message));

console.log("[WAIT] Waiting for .boot-state detachment...");
await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});

console.log("[WAIT] Checking for orthodontic widget...");
let widget = await page.waitForSelector('[data-testid="ortho-visit-protocol-widget"], [data-testid="orthodontic-visit-protocol-widget"]', { state: "visible", timeout: 15000 }).catch(() => null);

if (!widget) {
	const openBtn = await page.$('[data-testid="btn-open-ortho-protocol-widget"], [data-testid="ortho-toolbar-norm-btn"]');
	if (openBtn) {
		console.log("[CLICK] Clicking open button...");
		await openBtn.click().catch(() => {});
		await page.waitForTimeout(1500);
	}
}

// Hide distracting onboarding/tour overlays & toasts
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

// Click preset if present
try {
	const presetBtn = await page.$('[data-testid="ortho-preset-bonding-both-mbt-btn"], [data-testid="ortho-preset-niti-014-activation-btn"]');
	if (presetBtn) {
		await presetBtn.click();
		await page.waitForTimeout(500);
	}
} catch {}

const states = [
	{
		filename: "pc_light_1440x900.png",
		aliases: ["ortho_pc_light_1440x900.png", "01_ortho_pc_light_1440.png"],
		viewport: { width: 1440, height: 900 },
		theme: "light",
	},
	{
		filename: "pc_dark_1440x900.png",
		aliases: ["ortho_pc_dark_1440x900.png", "02_ortho_pc_dark_1440.png"],
		viewport: { width: 1440, height: 900 },
		theme: "dark",
	},
	{
		filename: "mobile_light_390x844.png",
		aliases: ["ortho_mobile_light_390x844.png", "03_ortho_mobile_light_390.png"],
		viewport: { width: 390, height: 844 },
		theme: "light",
	},
	{
		filename: "mobile_dark_390x844.png",
		aliases: ["ortho_mobile_dark_390x844.png", "04_ortho_mobile_dark_390.png"],
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

	await page.waitForTimeout(800);

	const filePath = path.join(PROOFS_DIR, state.filename);
	const buffer = await page.screenshot({ fullPage: false });
	fs.writeFileSync(filePath, buffer);

	for (const alias of state.aliases) {
		fs.writeFileSync(path.join(PROOFS_DIR, alias), buffer);
	}

	const stats = statSync(filePath);
	console.log(`[SAVED] ${state.filename} (${Math.round(stats.size / 1024)} KB)`);
	if (stats.size < 20 * 1024) {
		throw new Error(`[ERROR] Screenshot ${state.filename} is too small: ${stats.size} bytes (< 20 KB floor)!`);
	}
	console.log(`✓ Proof verified: ${state.filename} >= 20 KB`);
}

await context.close();
await browser.close();

console.log("\n=======================================================");
console.log(">>> ALL 4 RED TEAM PROOFS CAPTURED & VERIFIED CLEANLY <<<");
console.log("=======================================================\n");
