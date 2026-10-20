import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/29510b6c-103f-4931-9052-ff72f199f38a";
if (!existsSync(BRAIN_DIR)) {
	mkdirSync(BRAIN_DIR, { recursive: true });
}

const edgePaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = edgePaths.find((p) => existsSync(p));

async function capture() {
	console.log(`Using browser executable: ${executablePath}`);
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{
			id: "pc_light",
			filename: "emk_fdi_pc_light.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
		},
		{
			id: "pc_dark",
			filename: "emk_fdi_pc_dark.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
		},
		{
			id: "mobile_light",
			filename: "emk_fdi_mobile_light.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "light",
		},
		{
			id: "mobile_dark",
			filename: "emk_fdi_mobile_dark.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "dark",
		},
	];

	for (const cfg of configs) {
		console.log(`\n--- Capturing ${cfg.id} (${cfg.width}x${cfg.height}, theme: ${cfg.theme}) ---`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		const page = await context.newPage();

		await page.addInitScript(({ theme }) => {
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
				specialties: ["Стоматолог-терапевт", "Ортопед"]
			}));
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_showcase_active", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ onboardingDismissed: true }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
			localStorage.setItem("dente_onboarding_strip_dismissed", "true");
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("active_staff_user", JSON.stringify({
				id: "01a00000-0000-0000-0000-000000000002",
				fullName: "Д-р Воронов А. В.",
				role: "doctor",
				email: "doctor@clinic.com",
				organizationId: "01a00000-0000-0000-0000-000000000001",
				specialization: "Терапевт",
			}));
		}, { theme: cfg.theme });

		await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch((e) => {
			console.log("boot-state wait note:", e.message);
		});
		await page.waitForSelector(".workspace, .mobile-chairside-container, .tooth-card, .specialty-focus-bar", { timeout: 45000 }).catch((e) => {
			console.log("Selector wait note:", e.message);
		});
		await page.waitForTimeout(3000);

		// If on mobile, switch to step 2 (Осмотр) to show FDI formula quadrants
		if (cfg.isMobile) {
			const step2Btn = page.locator("button:has-text('2. Осмотр')").first();
			if (await step2Btn.isVisible()) {
				console.log("Switching to step 2 (Осмотр)...");
				await step2Btn.click();
				await page.waitForTimeout(1000);
			}
		}

		// Close any floating notification toast if visible
		try {
			const toastClose = page.locator("button[aria-label*='Закрыть'], .toast button, [role='alert'] button").first();
			if (await toastClose.isVisible({ timeout: 500 })) {
				await toastClose.click();
				await page.waitForTimeout(500);
			}
		} catch {
			// ignore
		}

		// Apply theme attribute explicitly to DOM with retry in case of navigation
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				await page.evaluate(({ theme }) => {
					document.documentElement.setAttribute("data-theme", theme);
					if (theme === "dark") {
						document.documentElement.classList.add("dark");
						document.body?.classList.add("dark");
					} else {
						document.documentElement.classList.remove("dark");
						document.body?.classList.remove("dark");
					}
				}, { theme: cfg.theme });
				break;
			} catch {
				await page.waitForTimeout(1500);
			}
		}

		await page.waitForTimeout(1500);

		const targetPath = path.join(BRAIN_DIR, cfg.filename);
		await page.screenshot({ path: targetPath, fullPage: false });
		const docsPath = path.join("C:/Clinic_MVP/dental-crm/docs/proofs/visit", cfg.filename);
		await page.screenshot({ path: docsPath, fullPage: false });
		const stats = statSync(targetPath);
		console.log(`Saved ${cfg.filename}: ${stats.size} bytes (>= 20480: ${stats.size >= 20480})`);

		await context.close();
	}

	await browser.close();
	console.log("\nALL 4 EMK & FDI SCREENSHOTS COMPLETED!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
