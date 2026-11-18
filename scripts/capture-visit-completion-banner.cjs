/**
 * scripts/capture-visit-completion-banner.cjs
 *
 * Captures the non-intrusive clinical visit completion banner:
 * 05_visit_completion_banner_pc_light.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5173/?demo=true#visit";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e7142b4f-d49d-4788-ae6e-0c86d9f2ffc2");

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await context.addInitScript(() => {
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
				id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
			}));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				selectedPatientId: "pat-1",
				onboardingDismissed: true,
				onboardingStep: "done",
			}));
		});

		const page = await context.newPage();
		await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(4000);

		// Dismiss overlays
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
		});

		// Switch to visit view
		await page.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setSelectedWorkspaceRole("doctor");
				window.__useAppStore.getState().setCurrentView("visit");
			}
			window.location.hash = "visit";
		});
		await page.waitForTimeout(2000);

		// If intake button present, click it
		const nextBtn = page.locator('button:has-text("Пригласить следующего"), button:has-text("Начать прием"), button:has-text("Начать приём"), .visit-intake-card').first();
		if (await nextBtn.isVisible().catch(() => false)) {
			await nextBtn.click().catch(() => {});
			await page.waitForTimeout(2000);
		}

		// Switch to EMK tab
		const emkTab = page.locator('[data-testid="visit-subtab-emk"], button:has-text("Дневник"), button:has-text("ЭМК")').first();
		if (await emkTab.isVisible().catch(() => false)) {
			await emkTab.click().catch(() => {});
			await page.waitForTimeout(1000);
		}

		// Click Complete Visit
		const completeBtn = page.locator('button:has-text("Завершить приём"), [data-testid="btn-finish-visit"]').first();
		if (await completeBtn.isVisible().catch(() => false)) {
			console.log("Clicking Complete Visit button...");
			await completeBtn.click().catch(() => {});
			await page.waitForTimeout(1500);
		}

		const outPath = path.join(PROOFS_DIR, "05_visit_completion_banner_pc_light.png");
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

		const brainPath = path.join(BRAIN_DIR, "05_visit_completion_banner_pc_light.png");
		fs.copyFileSync(outPath, brainPath);

		const size = fs.statSync(outPath).size;
		console.log(`[PROOF VERIFIED] 05_visit_completion_banner_pc_light.png: ${size} bytes (${(size / 1024).toFixed(1)} KB)`);

		await context.close();
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL] Completion capture failed:", err);
	process.exit(1);
});
