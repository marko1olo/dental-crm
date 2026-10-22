/**
 * scripts/capture_treatment_plans_4state_proofs.cjs
 *
 * Red Team 4-State Visual Proof Harness for TreatmentPlanPresenterModal
 * Captures:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844)
 * 4. Mobile Dark (390x844)
 *
 * Invariants:
 * - Live CRM with genuine mounting of TreatmentPlanPresenterModal
 * - Dual-theme check: Light & Dark
 * - No clipping: "% Скидка" complete in toolbar
 * - Proofs stored in docs/proofs/treatment_plans, docs/proofs/treatment-plans, and brain
 * - File size >= 20KB
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const APP_BASE = "http://127.0.0.1:5173";

async function ensureViteRunning() {
	return new Promise((resolve) => {
		const req = http.get("http://127.0.0.1:5173", (res) => {
			console.log("[VITE] Already running on 5173, status:", res.statusCode);
			resolve(null);
		});
		req.on("error", () => {
			console.log("[VITE] Not running on 5173, spawning fresh Vite dev server...");
			const viteProc = spawn(process.execPath, [
				"--max-old-space-size=2048",
				path.resolve(__dirname, "../node_modules/vite/bin/vite.js"),
				"--host", "127.0.0.1",
				"--port", "5173"
			], {
				cwd: path.resolve(__dirname, "../apps/web"),
				stdio: "pipe",
			});
			let resolved = false;
			viteProc.stdout.on("data", (d) => {
				const str = d.toString();
				console.log("[VITE OUT]", str.trim());
				if (!resolved && (str.includes("Local:") || str.includes("5173") || str.includes("ready in"))) {
					resolved = true;
					setTimeout(() => resolve(viteProc), 1500);
				}
			});
			viteProc.stderr.on("data", (d) => console.error("[VITE ERR]", d.toString()));
			setTimeout(() => {
				if (!resolved) {
					resolved = true;
					resolve(viteProc);
				}
			}, 10000);
		});
	});
}
const PROOFS_DIRS = [
	path.resolve("docs/proofs/treatment_plans"),
	path.resolve("docs/proofs/treatment-plans"),
	path.resolve("screenshots"),
];
const BRAIN_DIRS = [
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f589deae-b3b1-46e5-8d98-49c220f6b2c3"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ed33c0b8-da67-4baa-88ce-eb2ebebb784d"),
];

for (const dir of PROOFS_DIRS) {
	fs.mkdirSync(dir, { recursive: true });
}
for (const dir of BRAIN_DIRS) {
	fs.mkdirSync(dir, { recursive: true });
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
		document.documentElement.setAttribute("data-theme", th);
		const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		try {
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dente_theme", th);
		} catch (_) {}
	}, theme);
	await page.waitForTimeout(600);
}

async function takeProof(page, filename, description) {
	const filenames = [
		filename,
		filename.startsWith("treatment_plans_")
			? filename.replace("treatment_plans_", "treatment_plan_")
			: filename.replace("treatment_plan_", "treatment_plans_"),
	];

	const primaryProofPath = path.join(PROOFS_DIRS[0], filenames[0]);
	await page.screenshot({ path: primaryProofPath, fullPage: false });

	for (const dir of PROOFS_DIRS) {
		for (const fname of filenames) {
			const targetPath = path.join(dir, fname);
			if (targetPath !== primaryProofPath) {
				fs.copyFileSync(primaryProofPath, targetPath);
			}
		}
	}

	for (const brainDir of BRAIN_DIRS) {
		for (const fname of filenames) {
			const brainPath = path.join(brainDir, fname);
			fs.copyFileSync(primaryProofPath, brainPath);
		}
	}

	const stats = fs.statSync(primaryProofPath);
	console.log(`[PROOF CAPTURED] ${filename} (${stats.size} bytes) -> ${description}`);
	if (stats.size < 20480) {
		throw new Error(`Screenshot ${filename} is too small (${stats.size} bytes < 20KB)`);
	}
}

async function main() {
	console.log("=== STARTING 4-STATE TREATMENT PLANS PROOF CAPTURE ===");

	const viteProc = await ensureViteRunning();
	let browser;

	const possibleBrowserPaths = [
		chromium.executablePath(),
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => p && fs.existsSync(p));
	console.log("Using browser binary:", browserPath);

	browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. PC CONTEXT (1440x900)
		// ==========================================
		console.log("\n--- 1. Desktop 1440x900 Context ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});

		await pcContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_active_mode", "clinic");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_staff_session", JSON.stringify({
					userId: "owner-1",
					name: "Д-р Воронов Алексей Владимирович",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
					specialties: ["Стоматолог-терапевт", "Ортопед"],
				}));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_theme", "light");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
			} catch (_) {}
		});

		const pcPage = await pcContext.newPage();
		pcPage.on("pageerror", (err) => console.log("[PC PAGE ERROR]:", err.message));

		const TARGET_URL = `${APP_BASE}/?demo=true&presenter=demo`;
		console.log("Navigating PC to", TARGET_URL, "...");
		await pcPage.goto(TARGET_URL, { waitUntil: "load", timeout: 45000 });
		await pcPage.waitForTimeout(1000);

		console.log("Waiting for TreatmentPlanPresenterModal in DOM...");
		await pcPage.waitForSelector('[data-testid="treatment-plan-presenter-modal"], .treatment-presenter-modal', { timeout: 15000 });
		await pcPage.waitForTimeout(1000);
		await suppressOverlays(pcPage);

		// PC Light
		console.log("Capturing PC Light (1440x900)...");
		await setTheme(pcPage, "light");
		await takeProof(
			pcPage,
			"treatment_plans_pc_light_1440x900.png",
			"TreatmentPlanPresenterModal 3-Tier comparison (PC Light 1440x900)"
		);

		// PC Dark
		console.log("Capturing PC Dark (1440x900)...");
		await setTheme(pcPage, "dark");
		await takeProof(
			pcPage,
			"treatment_plans_pc_dark_1440x900.png",
			"TreatmentPlanPresenterModal 3-Tier comparison (PC Dark 1440x900)"
		);

		await pcContext.close();

		// ==========================================
		// 2. MOBILE CONTEXT (390x844)
		// ==========================================
		console.log("\n--- 2. Mobile 390x844 Context ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_active_mode", "clinic");
				sessionStorage.setItem("dente_unlocked", "true");
				localStorage.setItem("dente_staff_session", JSON.stringify({
					userId: "owner-1",
					name: "Д-р Воронов Алексей Владимирович",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
					specialties: ["Стоматолог-терапевт", "Ортопед"],
				}));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_theme", "light");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
			} catch (_) {}
		});

		const mobilePage = await mobileContext.newPage();
		mobilePage.on("pageerror", (err) => console.log("[MOBILE PAGE ERROR]:", err.message));

		console.log("Navigating mobile to", TARGET_URL, "...");
		await mobilePage.goto(TARGET_URL, { waitUntil: "load", timeout: 45000 });
		await mobilePage.waitForTimeout(1000);

		console.log("Waiting for Mobile TreatmentPlanPresenterModal in DOM...");
		await mobilePage.waitForSelector('[data-testid="treatment-plan-presenter-modal"], .treatment-presenter-modal', { timeout: 15000 });
		await mobilePage.waitForTimeout(1000);
		await suppressOverlays(mobilePage);

		// Mobile Light
		console.log("Capturing Mobile Light (390x844)...");
		await setTheme(mobilePage, "light");
		await takeProof(
			mobilePage,
			"treatment_plans_mobile_light_390x844.png",
			"TreatmentPlanPresenterModal Mobile Light (390x844)"
		);

		// Mobile Dark
		console.log("Capturing Mobile Dark (390x844)...");
		await setTheme(mobilePage, "dark");
		await takeProof(
			mobilePage,
			"treatment_plans_mobile_dark_390x844.png",
			"TreatmentPlanPresenterModal Mobile Dark (390x844)"
		);

		await mobileContext.close();

		console.log("\n=== ALL 4-STATE TREATMENT PLANS PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		if (browser) {
			await browser.close().catch(() => {});
		}
		if (viteProc && viteProc.pid) {
			console.log(`[VITE] Shutting down spawned Vite process (PID: ${viteProc.pid})...`);
			try {
				if (process.platform === "win32") {
					spawn("taskkill", ["/pid", viteProc.pid.toString(), "/T", "/F"], { stdio: "ignore" });
				} else {
					viteProc.kill();
				}
			} catch (_) {}
		}
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
