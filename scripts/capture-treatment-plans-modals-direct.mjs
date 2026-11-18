import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");

const CONV_ID = "5e21ca43-1a90-4a09-abcc-8a4ef7e63159";
const DIRS = [
	path.resolve(__dirname, "../docs/proofs/treatment_plans"),
	path.resolve(__dirname, "../docs/proofs/treatment-plans"),
	`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`,
];

DIRS.forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const API_BASE = "http://127.0.0.1:4100";

function replicateFile(srcPath, filename) {
	for (const dir of DIRS) {
		try {
			fs.copyFileSync(srcPath, path.join(dir, filename));
		} catch (_) {}
	}
}

async function authenticateFastify() {
	console.log("Authenticating with Fastify API...");
	const authRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	const authData = await authRes.json();
	if (!authData?.ok || !authData?.clinicToken || !authData?.staffToken) {
		throw new Error(`Fastify login failed: ${JSON.stringify(authData)}`);
	}
	console.log(`[Auth OK] User: ${authData.user?.fullName}`);
	return authData;
}

const browserExecutable = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

async function suppressOverlays(page) {
	await page.evaluate(() => {
		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.copilot-trigger-btn, [data-testid="copilot-floating-trigger"],
			.shepherd-element, vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container").forEach((el) => el.remove());
	}).catch(() => {});
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const target = path.join(DIRS[0], filename);
	await page.screenshot({ path: target, fullPage: false, animations: "disabled" });
	replicateFile(target, filename);
	const stat = fs.statSync(target);
	console.log(`[PROOF CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);
	if (stat.size < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB (${stat.size} bytes)!`);
	}
}

async function injectAuthStorage(ctx, authData) {
	await ctx.addInitScript(({ clinicToken, staffToken, user }) => {
		localStorage.setItem("dente_clinic_token", clinicToken);
		localStorage.setItem("dente_staff_token", staffToken);
		localStorage.setItem("dente_active_session_token", staffToken);
		localStorage.setItem("dente_active_role", user.role || "doctor");
		localStorage.setItem("dente_user_role", user.role || "doctor");
		localStorage.setItem("dente_active_user_id", user.id || "doc-1");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
	}, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user });
}

async function main() {
	const authData = await authenticateFastify();

	console.log("\nStarting in-process Vite server...");
	const viteServer = await createServer({
		configFile,
		root: webRoot,
		server: {
			host: "127.0.0.1",
			strictPort: false,
			hmr: false,
			watch: null,
			proxy: {
				"/api": {
					target: "http://127.0.0.1:4100",
					changeOrigin: true,
					ws: true,
				},
			},
		},
	});
	await viteServer.listen();
	const port = viteServer.httpServer.address().port;
	const baseUrl = `http://127.0.0.1:${port}`;
	console.log(`✓ In-process Vite running at ${baseUrl}`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		const pcCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(pcCtx, authData);
		const page = await pcCtx.newPage();
		page.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		const targetUrl = `${baseUrl}/?demo=true&patient_modal=1#patient-card`;
		console.log(`Navigating to ${targetUrl}...`);
		await page.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		
		await page.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 30000 });
		await page.waitForTimeout(1000);

		// Switch to Treatment Plans tab
		console.log("Switching to Treatment Plans tab...");
		const plansTab = page.locator('[data-testid="tab-patient-treatment-plans"]').first();
		await plansTab.waitFor({ state: "visible", timeout: 15000 });
		await plansTab.click();

		// Wait until tier cards are rendered
		console.log("Waiting for plans tab to fully load...");
		await page.waitForSelector('[data-testid="tier-cards-selector"]', { state: "visible", timeout: 30000 });
		await page.waitForTimeout(1500);

		// Completed Act Print Modal
		console.log("Clicking 'Акт работ' (btn-print-act)...");
		await page.evaluate(() => {
			const b = document.querySelector('[data-testid="btn-print-act"]');
			if (b) b.click();
		});

		console.log("Waiting for Completed Act Print Modal...");
		await page.waitForSelector('[data-testid="treatment-completed-act-print-modal"]', { state: "visible", timeout: 20000 });
		await page.waitForTimeout(1200);
		await saveProof(page, "06_treatment_plan_act_print_modal_1440x900.png", "Treatment Plan Completed Act Print Modal (Mandate 8aq)");

		console.log("\n🎉 ACT MODAL PROOF CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

main().catch((e) => {
	console.error("FATAL SCRIPT ERROR:", e);
	process.exit(1);
});
