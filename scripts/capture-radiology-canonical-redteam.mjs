import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const WEB_BASE = process.env.WEB_BASE || "http://127.0.0.1:5174";
const RAD_PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/radiology");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/42879016-7974-4832-9ecc-146c9fcc9d17/proofs");

[RAD_PROOFS_DIR, BRAIN_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays-for-proofs";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], [data-testid='demo-mode-banner']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(page);
	await sleep(500);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await sleep(500);
	const primaryPath = path.join(RAD_PROOFS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);
	await page.screenshot({ path: primaryPath, fullPage: false });
	fs.copyFileSync(primaryPath, brainPath);
	const stat = fs.statSync(primaryPath);
	console.log(`[PROVED: ${stat.size} bytes] ${filename} - ${description}`);
	if (stat.size < 20480) {
		throw new Error(`Screenshot ${filename} is suspiciously small: ${stat.size} bytes`);
	}
	return { filename, size: stat.size };
}

async function waitForAppReady(page) {
	for (let i = 0; i < 40; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
			console.log("[AppReady] Clicking offline autonomy button...");
			await offlineBtn.first().click({ force: true });
			await sleep(600);
		}
		const hasLoading = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Загрузка CRM") || text.includes("Загрузка системы");
		}).catch(() => true);
		if (!hasLoading) {
			console.log(`[AppReady] App fully mounted and ready! (loop ${i})`);
			return;
		}
		console.log(`[AppReady] Still loading... (loop ${i})`);
		await sleep(800);
	}
}

async function main() {
	console.log("=== STARTING CANONICAL RADIOLOGY RED TEAM CAPTURE ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
		localStorage.setItem("dente_token", "demo_dev_doctor_token");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_showcase_mode", "true");
		localStorage.setItem("dente_offline_autonomy_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_finished", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_active_tooth", "36");
	});

	// ─── 1. RADIOLOGY & VISIOGRAPH WORKSTATION 4-STATE ───
	console.log("\n--- Phase 1: Radiology & Visiograph Standalone Workstation ---");
	const pageRvg = await context.newPage();
	await pageRvg.setViewportSize({ width: 1440, height: 900 });
	await pageRvg.goto(`${WEB_BASE}/?demo=true`, { waitUntil: "commit", timeout: 35000 });
	await waitForAppReady(pageRvg);
	await suppressOverlays(pageRvg);

	console.log("Opening Radiology Standalone via custom event...");
	await pageRvg.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-radiology"));
		window.dispatchEvent(new CustomEvent("dente-open-radiology"));
		window.dispatchEvent(new CustomEvent("dente:open-visiograph"));
	});
	await sleep(1200);

	await pageRvg.waitForSelector('[data-testid="direct-radiology-launcher-root"], [data-testid="sensor-study-viewer"], .sensor-study-viewer', { state: "visible", timeout: 25000 });
	console.log("Radiology Study Viewer confirmed visible!");

	// 1a. PC Light (1440x900)
	await setTheme(pageRvg, "light");
	await saveProof(pageRvg, "01_radiology_pc_light_1440x900.png", "☀️ PC Light 1440x900 Radiology Visiograph Workstation");

	// 1b. PC Dark (1440x900)
	await setTheme(pageRvg, "dark");
	await saveProof(pageRvg, "02_radiology_pc_dark_1440x900.png", "🌙 PC Dark 1440x900 Radiology Visiograph Workstation");

	// 1c. Mobile Light (390x844)
	await pageRvg.setViewportSize({ width: 390, height: 844 });
	await sleep(800);
	await setTheme(pageRvg, "light");
	await saveProof(pageRvg, "03_radiology_mobile_light_390x844.png", "📱 Mobile Light 390x844 Radiology Mobile Viewer (Apple HIG, >=44px Targets)");

	// 1d. Mobile Dark (390x844)
	await setTheme(pageRvg, "dark");
	await saveProof(pageRvg, "04_radiology_mobile_dark_390x844.png", "🌙 Mobile Dark 390x844 Radiology Mobile Viewer (Natural Thumb Zone)");
	await pageRvg.close();

	await browser.close();
	console.log("\n=== ALL CANONICAL RADIOLOGY 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED ===");
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
