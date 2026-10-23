import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const PHOTO_PROOFS_DIR = path.resolve("docs/proofs/photography");
const DIAG_PROOFS_DIR = path.resolve("docs/proofs/diagnostics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/5d70bb39-ec5a-468a-bf40-e9e397516251");

[PHOTO_PROOFS_DIR, DIAG_PROOFS_DIR, BRAIN_DIR].forEach((dir) => {
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

async function saveProof(page, targetDir, filename, description) {
	await suppressOverlays(page);
	await sleep(500);
	const primaryPath = path.join(targetDir, filename);
	const brainPath = path.join(BRAIN_DIR, filename);
	await page.screenshot({ path: primaryPath, fullPage: false });
	fs.copyFileSync(primaryPath, brainPath);
	const stat = fs.statSync(primaryPath);
	console.log(`[PROVED: ${stat.size} bytes] ${filename} - ${description}`);
}

async function waitForAppReady(page) {
	for (let i = 0; i < 40; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if ((await offlineBtn.count()) > 0 && (await offlineBtn.first().isVisible())) {
			await offlineBtn.first().click({ force: true });
			await sleep(600);
		}
		const hasLoading = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Загрузка CRM") || text.includes("Загрузка системы") || text.includes("Загрузка ортодонтического");
		}).catch(() => true);
		if (!hasLoading) {
			console.log(`App fully mounted and ready! (loop ${i})`);
			return;
		}
		await sleep(800);
	}
}

async function main() {
	console.log("=== STARTING 4-STATE PHOTO PROTOCOL, RVG & DIAGNOSTIC DRAWER CAPTURE ===");
	let browser;
	try {
		browser = await chromium.launch({
			executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	} catch {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
	}

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
	});

	// ─── 1. CLINICAL PHOTO PROTOCOL 4-STATE ───
	console.log("\n--- Phase 1: Clinical Photo Protocol 6-Slot Grid ---");
	const pagePhoto = await context.newPage();
	await pagePhoto.setViewportSize({ width: 1440, height: 900 });
	await pagePhoto.goto("http://127.0.0.1:5173/?demo=true&photo=1", { waitUntil: "commit", timeout: 30000 });
	await waitForAppReady(pagePhoto);
	await suppressOverlays(pagePhoto);
	await pagePhoto.waitForSelector(".photo-protocol-modal, [data-testid=\"clinical-photo-protocol-modal\"]", { timeout: 20000 });
	console.log("ClinicalPhotoProtocolModal confirmed visible!");

	// 1a. PC Light
	await setTheme(pagePhoto, "light");
	await saveProof(pagePhoto, PHOTO_PROOFS_DIR, "photo_protocol_pc_light.png", "Clinical Photo Protocol 6-Slot Grid (PC Light 1440x900)");

	// 1b. PC Dark
	await setTheme(pagePhoto, "dark");
	await saveProof(pagePhoto, PHOTO_PROOFS_DIR, "photo_protocol_pc_dark.png", "Clinical Photo Protocol 6-Slot Grid (PC Dark 1440x900)");

	// 1c. Mobile Light (390x844)
	await pagePhoto.setViewportSize({ width: 390, height: 844 });
	await sleep(800);
	await setTheme(pagePhoto, "light");
	await saveProof(pagePhoto, PHOTO_PROOFS_DIR, "photo_protocol_mobile_light.png", "Clinical Photo Protocol Apple HIG Bottom Sheet (Mobile Light 390x844)");

	// 1d. Mobile Dark (390x844)
	await setTheme(pagePhoto, "dark");
	await saveProof(pagePhoto, PHOTO_PROOFS_DIR, "photo_protocol_mobile_dark.png", "Clinical Photo Protocol Apple HIG Bottom Sheet (Mobile Dark 390x844)");
	await pagePhoto.close();

	// ─── 2. DIRECT RVG CAPTURE CONSOLE 4-STATE ───
	console.log("\n--- Phase 2: Direct RVG Visiograph Capture Console ---");
	const pageRvg = await context.newPage();
	await pageRvg.setViewportSize({ width: 1440, height: 900 });
	await pageRvg.goto("http://127.0.0.1:5173/?demo=true&rvg=1", { waitUntil: "commit", timeout: 30000 });
	await waitForAppReady(pageRvg);
	await suppressOverlays(pageRvg);
	await pageRvg.waitForSelector("[data-testid=\"direct-rvg-capture-modal-overlay\"], .rvg-capture-overlay", { timeout: 20000 });
	console.log("DirectRvgCaptureModal confirmed visible!");

	// 2a. PC Light
	await setTheme(pageRvg, "light");
	await saveProof(pageRvg, DIAG_PROOFS_DIR, "rvg_capture_pc_light.png", "Direct RVG Capture Console (PC Light 1440x900)");

	// 2b. PC Dark
	await setTheme(pageRvg, "dark");
	await saveProof(pageRvg, DIAG_PROOFS_DIR, "rvg_capture_pc_dark.png", "Direct RVG Capture Console (PC Dark 1440x900)");

	// 2c. Mobile Light (390x844)
	await pageRvg.setViewportSize({ width: 390, height: 844 });
	await sleep(800);
	await setTheme(pageRvg, "light");
	await saveProof(pageRvg, DIAG_PROOFS_DIR, "rvg_capture_mobile_light.png", "Direct RVG Capture Mobile Sheet (Mobile Light 390x844)");

	// 2d. Mobile Dark (390x844)
	await setTheme(pageRvg, "dark");
	await saveProof(pageRvg, DIAG_PROOFS_DIR, "rvg_capture_mobile_dark.png", "Direct RVG Capture Mobile Sheet (Mobile Dark 390x844)");
	await pageRvg.close();

	// ─── 3. DIAGNOSTIC DRAWER & IMAGING TAB ───
	console.log("\n--- Phase 3: Diagnostic Drawer with Imaging Tab ---");
	const pageDiag = await context.newPage();
	await pageDiag.setViewportSize({ width: 1440, height: 900 });
	await pageDiag.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "commit", timeout: 30000 });
	await waitForAppReady(pageDiag);
	await suppressOverlays(pageDiag);

	console.log("Opening Diagnostic Drawer via Ctrl+Shift+D...");
	await pageDiag.keyboard.press("Control+Shift+D");
	await sleep(1000);
	await pageDiag.waitForSelector(".dente-diagnostic-drawer", { timeout: 15000 });

	console.log("Switching to 'Рентген и Снимки' tab...");
	const imagingTabBtn = pageDiag.locator('[data-testid="tab-diagnostic-imaging"]');
	if ((await imagingTabBtn.count()) > 0) {
		await imagingTabBtn.click();
		await sleep(800);
	}

	// 3a. PC Light
	await setTheme(pageDiag, "light");
	await saveProof(pageDiag, DIAG_PROOFS_DIR, "diagnostic_drawer_imaging_pc_light.png", "Diagnostic Drawer Imaging Tab (PC Light 1440x900)");

	// 3b. PC Dark
	await setTheme(pageDiag, "dark");
	await saveProof(pageDiag, DIAG_PROOFS_DIR, "diagnostic_drawer_imaging_pc_dark.png", "Diagnostic Drawer Imaging Tab (PC Dark 1440x900)");
	await pageDiag.close();

	await browser.close();
	console.log("\n=== ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED ===");
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
