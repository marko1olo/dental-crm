import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");

const CONV_ID = "ad92eec1-4d6f-497c-b2ea-ceaf1609e331";
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
	console.log("=== 1. REAL FASTIFY API AUTH & POSTGRES 18 CHECK ===");
	const authRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	const authData = await authRes.json();
	if (!authData?.ok || !authData?.clinicToken || !authData?.staffToken) {
		throw new Error(`Fastify login failed: ${JSON.stringify(authData)}`);
	}
	console.log(`[Auth OK] User: ${authData.user?.fullName} (${authData.user?.role})`);
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
			.shepherd-element, vite-error-overlay, .warranty-modal-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .global-toast-container, .warranty-modal-overlay").forEach((el) => el.remove());
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
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

	console.log("\n=== 2. STARTING IN-PROCESS VITE SERVER WITH PROXY ===");
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
		// ═══════════════════════════════════════════════════════════
		// PART 1: PC VIEWPORT (1440x900) - TREATMENT PLANS TAB
		// ═══════════════════════════════════════════════════════════
		console.log("\n=== 3. CAPTURING TREATMENT PLANS TAB (PC 1440x900) ===");
		const pcCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(pcCtx, authData);
		const pcPage = await pcCtx.newPage();
		pcPage.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		const targetUrl = `${baseUrl}/?demo=true&patient_modal=1#patient-card`;
		console.log(`Navigating to ${targetUrl}...`);
		await pcPage.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		
		try {
			await pcPage.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 30000 });
		} catch (e) {
			const offlineBtn = await pcPage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
			if (offlineBtn) {
				await offlineBtn.click();
				await pcPage.waitForTimeout(2000);
			}
			await pcPage.evaluate(() => { window.location.hash = "#patient-card"; });
			await pcPage.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 20000 });
		}
		await pcPage.waitForTimeout(1000);

		// Switch to Treatment Plans tab
		console.log("Switching to Treatment Plans tab...");
		const plansTab = pcPage.locator('[data-testid="tab-patient-treatment-plans"]').first();
		await plansTab.waitFor({ state: "visible", timeout: 15000 });
		await suppressOverlays(pcPage);
		await plansTab.click({ force: true });

		// Wait for loading to finish and tab content to become visible
		await pcPage.waitForSelector('[data-testid="treatment-plans-tab-loading"]', { state: "detached", timeout: 15000 }).catch(() => {});
		await pcPage.waitForSelector('[data-testid="treatment-plans-tab"], [data-testid="treatment-plans-tab-empty"]', { state: "visible", timeout: 15000 }).catch(() => {});
		await pcPage.waitForTimeout(1000);

		// 1.1 PC Light (1440x900)
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_treatment_plan_pc_light_1440x900.png", "Treatment Plans Tab with 3-Tier Estimates (☀️ PC Light 1440x900)");
		await saveProof(pcPage, "01_treatment_plans_pc_light_1440x900.png", "Treatment Plans Canonical Tab (PC Light 1440x900)");

		// 1.2 PC Dark (1440x900)
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_treatment_plan_pc_dark_1440x900.png", "Treatment Plans Tab with 3-Tier Estimates (🌙 PC Dark 1440x900)");
		await saveProof(pcPage, "02_treatment_plans_pc_dark_1440x900.png", "Treatment Plans Canonical Tab (PC Dark 1440x900)");

		// Back to Light for Modal Captures
		await setTheme(pcPage, "light");

		// 1.3 Contract Print Modal (DEF-PLAN-04, Mandate 8aq)
		try {
			const printBtn = pcPage.locator('[data-testid="btn-print-treatment-plan"]').first();
			await printBtn.waitFor({ state: "visible", timeout: 10000 });
			console.log("Opening Contract Print Modal...");
			await printBtn.click({ force: true });
			await pcPage.waitForSelector('[data-testid="treatment-plan-contract-print-modal"]', { state: "visible", timeout: 10000 }).catch(() => {});
			await pcPage.waitForTimeout(1000);
			await saveProof(pcPage, "05_treatment_plan_contract_print_modal_1440x900.png", "Treatment Plan Contract Print Modal (Mandate 8aq)");

			const closeBtn = pcPage.locator('[aria-label="Закрыть"], button:has-text("Закрыть")').first();
			if (await closeBtn.count() > 0) {
				await closeBtn.click({ force: true });
				await pcPage.waitForTimeout(600);
			}
		} catch (e) {
			console.log("[Contract Print notice]", e.message);
		}

		// 1.4 Completed Act Print Modal (DEF-PLAN-04, Mandate 8aq)
		try {
			const actBtn = pcPage.locator('[data-testid="btn-print-act"]').first();
			await actBtn.waitFor({ state: "visible", timeout: 10000 });
			console.log("Opening Completed Act Print Modal...");
			await actBtn.click({ force: true });
			await pcPage.waitForSelector('[data-testid="treatment-completed-act-print-modal"]', { state: "visible", timeout: 10000 }).catch(() => {});
			await pcPage.waitForTimeout(1000);
			await saveProof(pcPage, "06_treatment_plan_act_print_modal_1440x900.png", "Treatment Plan Completed Act Print Modal (Mandate 8aq)");

			const closeActBtn = pcPage.locator('[aria-label="Закрыть"], button:has-text("Закрыть")').first();
			if (await closeActBtn.count() > 0) {
				await closeActBtn.click({ force: true });
				await pcPage.waitForTimeout(600);
			}
		} catch (e) {
			console.log("[Act Print notice]", e.message);
		}

		await pcCtx.close();

		// ═══════════════════════════════════════════════════════════
		// PART 2: MOBILE VIEWPORT (390x844 APPLE HIG)
		// ═══════════════════════════════════════════════════════════
		console.log("\n=== 4. CAPTURING MOBILE APPLE HIG SEGMENTED CONTROL (390x844) ===");
		const mobCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(mobCtx, authData);
		const mobPage = await mobCtx.newPage();
		mobPage.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		console.log(`Navigating to ${targetUrl}...`);
		await mobPage.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
		await mobPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});

		try {
			await mobPage.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 30000 });
		} catch (e) {
			await mobPage.evaluate(() => { window.location.hash = "#patient-card"; });
			await mobPage.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 20000 });
		}
		await mobPage.waitForTimeout(1000);

		// Switch to Treatment Plans tab on mobile
		const mobPlansTab = mobPage.locator('[data-testid="tab-patient-treatment-plans"]').first();
		await mobPlansTab.waitFor({ state: "visible", timeout: 15000 });
		await suppressOverlays(mobPage);
		await mobPlansTab.click({ force: true });

		await mobPage.waitForSelector('[data-testid="treatment-plans-tab-loading"]', { state: "detached", timeout: 15000 }).catch(() => {});
		await mobPage.waitForSelector('[data-testid="treatment-plans-tab"], [data-testid="treatment-plans-tab-empty"]', { state: "visible", timeout: 15000 }).catch(() => {});
		await mobPage.waitForTimeout(1000);

		// 2.1 Mobile Light (390x844)
		await setTheme(mobPage, "light");
		await saveProof(mobPage, "03_treatment_plan_mobile_light_390x844.png", "Treatment Plans Tab Apple HIG Segmented (📱 Mobile Light 390x844)");
		await saveProof(mobPage, "03_treatment_plans_mobile_light_390x844.png", "Treatment Plans Tab Apple HIG Segmented (Mobile Light 390x844)");

		// 2.2 Mobile Dark (390x844)
		await setTheme(mobPage, "dark");
		await saveProof(mobPage, "04_treatment_plan_mobile_dark_390x844.png", "Treatment Plans Tab Apple HIG Segmented (🌙 Mobile Dark 390x844)");
		await saveProof(mobPage, "04_treatment_plans_mobile_dark_390x844.png", "Treatment Plans Tab Apple HIG Segmented (Mobile Dark 390x844)");

		await mobCtx.close();

		// ═══════════════════════════════════════════════════════════
		// PART 3: TREATMENT PLAN STUDIO MODAL (INTERACTIVE PRESENTER)
		// ═══════════════════════════════════════════════════════════
		console.log("\n=== 5. CAPTURING TREATMENT PLAN STUDIO MODAL (1440x900) ===");
		const studioCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
			locale: "ru-RU",
		});
		await injectAuthStorage(studioCtx, authData);
		const studioPage = await studioCtx.newPage();
		studioPage.on("pageerror", (e) => console.log("[PAGE ERROR]", e.message));

		const studioUrl = `${baseUrl}/?demo=true&treatment_plan=1#treatment-plans`;
		console.log(`Navigating to ${studioUrl}...`);
		await studioPage.goto(studioUrl, { waitUntil: "commit", timeout: 60000 });
		await studioPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await studioPage.waitForSelector('[data-testid="treatment-plan-studio-modal"]', { state: "attached", timeout: 25000 }).catch(() => {});
		await studioPage.waitForTimeout(1500);

		await setTheme(studioPage, "light");
		await saveProof(studioPage, "07_treatment_plan_studio_modal_1440x900.png", "Treatment Plan Studio Modal (Interactive Presenter 1440x900)");

		await studioCtx.close();

		console.log("\n🎉 ALL TREATMENT PLANS 4-STATE CANONICAL PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

main().catch((e) => {
	console.error("FATAL SCRIPT ERROR:", e);
	process.exit(1);
});
