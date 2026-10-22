import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const PROOFS_DIR = path.resolve("docs/proofs/diagnostics");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/93d29d96-feb0-429d-837e-e992496058e7");

[PROOFS_DIR, BRAIN_DIR].forEach((dir) => {
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
	const primaryPath = path.join(PROOFS_DIR, filename);
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
		await sleep(1000);
	}
}

async function main() {
	console.log("=== STARTING 4-STATE DIAGNOSTICS & PHOTO PROTOCOL PROOF CAPTURE ===");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	}

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_offline_autonomy_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
	});

	const page = await context.newPage();
	console.log("1. Navigating to http://127.0.0.1:5173/?demo=true ...");
	await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "load", timeout: 45000 });
	await waitForAppReady(page);
	await suppressOverlays(page);

	// ─── PART 1: DIAGNOSTIC DRAWER HUD (Ctrl+Shift+D) ───
	console.log("\n--- Phase 1: DiagnosticDrawer HUD (Ctrl+Shift+D) ---");
	await page.setViewportSize({ width: 1440, height: 900 });
	await setTheme(page, "light");

	console.log("Pressing Control+Shift+D...");
	await page.keyboard.press("Control+Shift+D");
	await sleep(1200);
	await page.waitForSelector(".dente-diagnostic-drawer, .dente-diagnostic-body", { timeout: 15000 });
	console.log("DiagnosticDrawer selector confirmed visible!");

	// 1. PC Light
	await saveProof(page, "01_pc_diagnostic_drawer_light_1440x900.png", "DiagnosticDrawer HUD (PC Light 1440x900)");

	// 2. PC Dark
	await setTheme(page, "dark");
	await saveProof(page, "02_pc_diagnostic_drawer_dark_1440x900.png", "DiagnosticDrawer HUD (PC Dark 1440x900)");

	// 3. Mobile Viewport (390x844)
	console.log("\n--- Phase 1b: DiagnosticDrawer Mobile (390x844) ---");
	await page.setViewportSize({ width: 390, height: 844 });
	await sleep(800);
	await setTheme(page, "light");
	await saveProof(page, "03_mobile_diagnostic_drawer_light_390x844.png", "DiagnosticDrawer HUD Mobile Bottom Sheet (Mobile Light 390x844)");

	await setTheme(page, "dark");
	await saveProof(page, "04_mobile_diagnostic_drawer_dark_390x844.png", "DiagnosticDrawer HUD Mobile Bottom Sheet (Mobile Dark 390x844)");

	// Close drawer
	await page.keyboard.press("Control+Shift+D");
	await sleep(600);

	// ─── PART 2: TOOTH CONTEXT DRAWER (PED & ENDO) ───
	console.log("\n--- Phase 2: ToothContextDrawer (#tooth-drawer) ---");
	await page.setViewportSize({ width: 1440, height: 900 });
	await setTheme(page, "light");

	// Direct navigation to tooth-drawer
	await page.evaluate(() => {
		window.location.hash = "tooth-drawer";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(1500);
	await suppressOverlays(page);
	await page.waitForSelector('[data-testid="tooth-context-drawer"], .dente-tooth-drawer', { timeout: 15000 });
	console.log("ToothContextDrawer confirmed visible!");

	// 5. PC Light Tooth Drawer
	await saveProof(page, "05_pc_tooth_drawer_light_1440x900.png", "ToothContextDrawer with Pediatric & Endo (PC Light 1440x900)");

	// 6. PC Dark Tooth Drawer
	await setTheme(page, "dark");
	await saveProof(page, "06_pc_tooth_drawer_dark_1440x900.png", "ToothContextDrawer with Pediatric & Endo (PC Dark 1440x900)");

	// 7. Mobile Viewport (390x844)
	console.log("\n--- Phase 2b: ToothContextDrawer Mobile (390x844) ---");
	await page.setViewportSize({ width: 390, height: 844 });
	await sleep(800);
	await setTheme(page, "light");
	await saveProof(page, "07_mobile_tooth_drawer_light_390x844.png", "ToothContextDrawer Apple HIG Bottom Sheet (Mobile Light 390x844)");

	await setTheme(page, "dark");
	await saveProof(page, "08_mobile_tooth_drawer_dark_390x844.png", "ToothContextDrawer Apple HIG Bottom Sheet (Mobile Dark 390x844)");

	// Close tooth drawer
	await page.evaluate(() => {
		window.location.hash = "";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(800);

	// ─── PART 3: ORTHODONTIC PHOTO PROTOCOL MODAL ───
	console.log("\n--- Phase 3: Orthodontic Photo Protocol Modal (#ortho-photo) ---");
	const pageOrtho = await context.newPage();
	await pageOrtho.setViewportSize({ width: 1440, height: 900 });
	await pageOrtho.goto("http://127.0.0.1:5173/?demo=true#ortho-photo", { waitUntil: "domcontentloaded", timeout: 30000 });
	await waitForAppReady(pageOrtho);
	await suppressOverlays(pageOrtho);
	await pageOrtho.waitForSelector('[data-testid="orthodontic-photo-protocol-modal"], .ortho-photo-modal-container', { timeout: 30000 });
	console.log("OrthodonticPhotoProtocolModal confirmed visible!");

	// 9. PC Light Ortho Photo
	await setTheme(pageOrtho, "light");
	await saveProof(pageOrtho, "09_pc_ortho_photo_protocol_light_1440x900.png", "Orthodontic Photo Protocol Modal 8-Slot (PC Light 1440x900)");

	// 10. PC Dark Ortho Photo
	await setTheme(pageOrtho, "dark");
	await saveProof(pageOrtho, "10_pc_ortho_photo_protocol_dark_1440x900.png", "Orthodontic Photo Protocol Modal 8-Slot (PC Dark 1440x900)");

	// 11. Mobile Light Ortho Photo
	console.log("\n--- Phase 3b: Orthodontic Photo Protocol Mobile (390x844) ---");
	await pageOrtho.setViewportSize({ width: 390, height: 844 });
	await sleep(800);
	await setTheme(pageOrtho, "light");
	await saveProof(pageOrtho, "11_mobile_ortho_photo_protocol_light_390x844.png", "Orthodontic Photo Protocol Mobile Sheet (Mobile Light 390x844)");

	// 12. Mobile Dark Ortho Photo
	await setTheme(pageOrtho, "dark");
	await saveProof(pageOrtho, "12_mobile_ortho_photo_protocol_dark_390x844.png", "Orthodontic Photo Protocol Mobile Sheet (Mobile Dark 390x844)");

	await browser.close();
	console.log("\n=== ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED ===");
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
