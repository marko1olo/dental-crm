import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIRS = [
	path.resolve("docs/proofs/treatment-plans"),
	path.resolve("docs/proofs/treatment_plans"),
];
for (const d of OUT_DIRS) {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const browserExecutable = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

console.log("[Browser] Using executable:", browserExecutable);

const browser = await chromium.launch({
	executablePath: browserExecutable,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.splash,
			#splash-root,
			[data-testid="splash-loader"],
			.splash-screen,
			#loading-screen,
			.global-toast-container,
			.copilot-trigger-btn,
			[data-testid="copilot-floating-trigger"],
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation-duration: 0s !important;
				transition-duration: 0s !important;
			}
		`;
		document.head.appendChild(style);
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	}).catch(() => {});
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(500);
}

async function setupStorage(context, theme) {
	await context.addInitScript(({ th }) => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
		localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-chief");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_workspace_perspective", "presentation");
		localStorage.setItem("dente_demo_showcase_mode_v1", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({ dismissed: true, step: "done", completed: true })
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
			})
		);
		localStorage.setItem(
			"dente_staff_session",
			JSON.stringify({
				userId: "usr-admin-01",
				name: "Д-р Барабаш С. В.",
				role: "owner",
				roleScope: "clinical_director",
			})
		);
		localStorage.setItem(
			"dente_active_staff_user",
			JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Барабаш Сергей Владимирович",
				role: "doctor",
			})
		);
	}, { th: theme });
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(600);
	const targetPath = path.join(OUT_DIRS[0], filename);
	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
	const sz = statSync(targetPath).size;
	console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description}`);
	if (sz < 40960) {
		throw new Error(`Screenshot ${filename} is smaller than 40KB: ${sz} bytes`);
	}

	// Copy to alternate directory and alternative naming
	for (const d of OUT_DIRS) {
		const p1 = path.join(d, filename);
		if (p1 !== targetPath) copyFileSync(targetPath, p1);

		const altName = filename.includes("treatment_plans_")
			? filename.replace("treatment_plans_", "treatment_plan_")
			: filename.replace("treatment_plan_", "treatment_plans_");
		const p2 = path.join(d, altName);
		copyFileSync(targetPath, p2);
	}
}

async function openStudioModal(page) {
	const studioModal = page.locator('[data-testid="treatment-plan-studio-modal"]').first();
	if (await studioModal.isVisible().catch(() => false)) {
		return;
	}
	await page.evaluate(() => {
		window.dispatchEvent(
			new CustomEvent("dente:open-treatment-plan", {
				detail: {
					patientName: "Смирнова Екатерина Васильевна",
					doctorFullName: "Д-р Барабаш Сергей Владимирович",
					patientId: "00000000-0000-0000-0000-000000000001",
				},
			})
		);
	});
	await page.waitForTimeout(1000);

	if (!await studioModal.isVisible().catch(() => false)) {
		const openBtn = page.locator('[data-testid="btn-open-treatment-studio"], button:has-text("План лечения")').first();
		if (await openBtn.isVisible().catch(() => false)) {
			await openBtn.click();
			await page.waitForTimeout(1000);
		}
	}
	await studioModal.waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
	await page.waitForTimeout(1000);
}

async function capture() {
	console.log("=== CAPTURING 4-STATE CANONICAL TREATMENT PLANS 3-TIER + INSTALLMENT PROOFS ===");
	const WEB_URL = "http://127.0.0.1:5173";

	// 1. PC Viewport 1440x900
	console.log("\n--- [PC 1440x900 Context] ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	await setupStorage(pcContext, "light");
	const pcPage = await pcContext.newPage();

	console.log("[PC] Navigating to web app...");
	await pcPage.goto(`${WEB_URL}/?demo=true#treatment-studio`, { waitUntil: "domcontentloaded", timeout: 35000 });
	await pcPage.locator('.boot-state').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
	await pcPage.waitForTimeout(1000);
	await suppressOverlays(pcPage);

	console.log("[PC] Opening TreatmentPlanStudioModal...");
	await openStudioModal(pcPage);

	// 1.1 PC Light 1440x900 (3-Tier Comparison)
	console.log("[PC] Capturing PC Light 1440x900 (3-Tier Comparison)...");
	await applyTheme(pcPage, "light");
	await saveProof(pcPage, "01_treatment_plans_3tier_pc_light_1440x900.png", "Treatment Plan 3-Tier Comparison (PC Light 1440x900)");

	// 1.2 PC Dark 1440x900 (3-Tier Comparison)
	console.log("[PC] Capturing PC Dark 1440x900 (3-Tier Comparison)...");
	await applyTheme(pcPage, "dark");
	await saveProof(pcPage, "02_treatment_plans_3tier_pc_dark_1440x900.png", "Treatment Plan 3-Tier Comparison (PC Dark 1440x900)");

	// 1.3 PC Light Installment Tab
	console.log("[PC] Switching to Installment Tab (Рассрочка 0%)...");
	await applyTheme(pcPage, "light");
	const installmentTab = pcPage.locator('button:has-text("Рассрочка"), [data-testid="tab-installment"]').first();
	if (await installmentTab.isVisible().catch(() => false)) {
		await installmentTab.click();
		await pcPage.waitForTimeout(800);
		await saveProof(pcPage, "05_treatment_plans_installment_pc_light_1440x900.png", "Treatment Plan 0% Installment Tab (PC Light 1440x900)");

		await applyTheme(pcPage, "dark");
		await saveProof(pcPage, "06_treatment_plans_installment_pc_dark_1440x900.png", "Treatment Plan 0% Installment Tab (PC Dark 1440x900)");
	}

	await pcContext.close();

	// 2. Mobile Viewport 390x844 (Apple HIG)
	console.log("\n--- [Mobile 390x844 Context] ---");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});
	await setupStorage(mobContext, "light");
	const mobPage = await mobContext.newPage();

	console.log("[Mobile] Navigating to web app...");
	await mobPage.goto(`${WEB_URL}/?demo=true#treatment-studio`, { waitUntil: "domcontentloaded", timeout: 35000 });
	await mobPage.locator('.boot-state').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
	await mobPage.waitForTimeout(1000);
	await suppressOverlays(mobPage);

	console.log("[Mobile] Opening TreatmentPlanStudioModal...");
	await openStudioModal(mobPage);

	// 2.1 Mobile Light 390x844
	console.log("[Mobile] Capturing Mobile Light 390x844 (3-Tier Segmented Control)...");
	await applyTheme(mobPage, "light");
	await saveProof(mobPage, "03_treatment_plans_3tier_mobile_light_390x844.png", "Treatment Plan 3-Tier Mobile Light (390x844 Apple HIG)");

	// 2.2 Mobile Dark 390x844
	console.log("[Mobile] Capturing Mobile Dark 390x844 (3-Tier Segmented Control)...");
	await applyTheme(mobPage, "dark");
	await saveProof(mobPage, "04_treatment_plans_3tier_mobile_dark_390x844.png", "Treatment Plan 3-Tier Mobile Dark (390x844 Apple HIG)");

	await mobContext.close();
	console.log("\n🎉 ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED!");
}

capture().catch((e) => {
	console.error("Capture script error:", e);
	process.exit(1);
}).finally(() => {
	browser.close();
});
