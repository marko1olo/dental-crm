const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/prescriptions");
if (!fs.existsSync(PROOF_DIR)) {
	fs.mkdirSync(PROOF_DIR, { recursive: true });
}

async function getBaseUrl() {
	for (const port of [5176, 5174, 5173, 5175]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/`);
			if (res.ok) {
				console.log(`[Network] Detected live dev server at http://127.0.0.1:${port}`);
				return `http://127.0.0.1:${port}`;
			}
		} catch {}
	}
	return "http://127.0.0.1:5176";
}

function injectStorage(page, theme) {
	const user = {
		id: "doc-1",
		fullName: "Д-р Соколов Андрей Васильевич",
		role: "doctor",
	};
	return page.addInitScript(
		({ initialTheme, usr }) => {
			localStorage.setItem("dente_clinic_token", "prescription-canonical-token");
			localStorage.setItem("dente_staff_token", "prescription-canonical-staff-token");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(usr));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(usr));
			localStorage.setItem("dente_theme_mode", initialTheme);
			localStorage.setItem("dente_theme", initialTheme);
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_doctor_training_completed", "true");
			localStorage.setItem("dente_training_dismissed", "true");
			localStorage.setItem("dente_doctor_shift_active", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
			localStorage.setItem(
				"dente_quest_progress_v2",
				JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }),
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "doctor",
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
		},
		{ initialTheme: theme, usr: user },
	);
}

async function prepareTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = th;
		try { localStorage.setItem("dente_theme_mode", th); } catch (_) {}
		try { localStorage.setItem("theme", th); } catch (_) {}
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
		).forEach((el) => el.remove());
	}, theme);
	await page.waitForTimeout(400);
}

async function capture() {
	const baseUrl = await getBaseUrl();
	console.log("[Chrome Playwright] Launching Chrome executable...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. PC Light & Dark (1440x900)
		// ==========================================
		console.log("[1/4] Preparing PC viewport (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
			serviceWorkers: "block",
		});
		const pcPage = await pcContext.newPage();
		await injectStorage(pcPage, "light");

		console.log(`[Navigate] Loading ${baseUrl}/?visit_standalone=1&rx=1...`);
		await pcPage.goto(`${baseUrl}/?visit_standalone=1&rx=1`, { waitUntil: "commit", timeout: 30000 });
		await pcPage.waitForTimeout(2000);
		await prepareTheme(pcPage, "light");

		console.log("Waiting for prescription modal on PC...");
		await pcPage.waitForSelector('[data-testid="prescription-print-modal"]', { state: "visible", timeout: 20000 });
		await pcPage.waitForTimeout(800);

		// Select the 1-click preset if present
		try {
			const presetCard = pcPage.locator('[data-testid^="express-preset-"]').first();
			if (await presetCard.isVisible()) {
				await presetCard.click();
				await pcPage.waitForTimeout(600);
			}
		} catch (_) {}

		console.log("[1/4] Capturing PC Light (1440x900)...");
		await prepareTheme(pcPage, "light");
		const pcLightPath = path.join(PROOF_DIR, "01_prescription_modal_pc_light_1440x900.png");
		await pcPage.screenshot({ path: pcLightPath, fullPage: false });
		fs.copyFileSync(pcLightPath, path.join(PROOF_DIR, "01_prescriptions_pc_light.png"));
		fs.copyFileSync(pcLightPath, path.join(PROOF_DIR, "prescription_pc_light_1440x900.png"));
		fs.copyFileSync(pcLightPath, path.join(PROOF_DIR, "prescriptions_pc_light_1440x900.png"));
		fs.copyFileSync(pcLightPath, path.join(PROOF_DIR, "pc-light-1440x900.png"));

		// PC Dark
		console.log("[2/4] Capturing PC Dark (1440x900)...");
		await prepareTheme(pcPage, "dark");
		const pcDarkPath = path.join(PROOF_DIR, "02_prescription_modal_pc_dark_1440x900.png");
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
		fs.copyFileSync(pcDarkPath, path.join(PROOF_DIR, "02_prescriptions_pc_dark.png"));
		fs.copyFileSync(pcDarkPath, path.join(PROOF_DIR, "prescription_pc_dark_1440x900.png"));
		fs.copyFileSync(pcDarkPath, path.join(PROOF_DIR, "prescriptions_pc_dark_1440x900.png"));
		fs.copyFileSync(pcDarkPath, path.join(PROOF_DIR, "pc-dark-1440x900.png"));
		await pcContext.close();

		// ==========================================
		// 3. Mobile Light & Dark (390x844)
		// ==========================================
		console.log("[3/4] Preparing Mobile viewport (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
			serviceWorkers: "block",
		});
		const mobilePage = await mobileContext.newPage();
		await injectStorage(mobilePage, "light");

		console.log(`[Navigate] Loading ${baseUrl}/?visit_standalone=1&rx=1 on mobile...`);
		await mobilePage.goto(`${baseUrl}/?visit_standalone=1&rx=1`, { waitUntil: "commit", timeout: 30000 });
		await mobilePage.waitForTimeout(2000);
		await prepareTheme(mobilePage, "light");

		console.log("Waiting for prescription modal on mobile...");
		await mobilePage.waitForSelector('[data-testid="prescription-print-modal"]', { state: "visible", timeout: 20000 });
		await mobilePage.waitForTimeout(800);

		// Select the 1-click preset on mobile
		try {
			const mobilePreset = mobilePage.locator('[data-testid^="express-preset-"]').first();
			if (await mobilePreset.isVisible()) {
				await mobilePreset.click();
				await mobilePage.waitForTimeout(600);
			}
		} catch (_) {}

		console.log("[3/4] Capturing Mobile Light (390x844)...");
		await prepareTheme(mobilePage, "light");
		const mobileLightPath = path.join(PROOF_DIR, "03_prescription_modal_mobile_light_390x844.png");
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		fs.copyFileSync(mobileLightPath, path.join(PROOF_DIR, "03_prescriptions_mobile_light.png"));
		fs.copyFileSync(mobileLightPath, path.join(PROOF_DIR, "prescription_mobile_light_390x844.png"));
		fs.copyFileSync(mobileLightPath, path.join(PROOF_DIR, "prescriptions_mobile_light_390x844.png"));
		fs.copyFileSync(mobileLightPath, path.join(PROOF_DIR, "mobile-light-390x844.png"));

		// Mobile Dark
		console.log("[4/4] Capturing Mobile Dark (390x844)...");
		await prepareTheme(mobilePage, "dark");
		const mobileDarkPath = path.join(PROOF_DIR, "04_prescription_modal_mobile_dark_390x844.png");
		await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
		fs.copyFileSync(mobileDarkPath, path.join(PROOF_DIR, "04_prescriptions_mobile_dark.png"));
		fs.copyFileSync(mobileDarkPath, path.join(PROOF_DIR, "prescription_mobile_dark_390x844.png"));
		fs.copyFileSync(mobileDarkPath, path.join(PROOF_DIR, "prescriptions_mobile_dark_390x844.png"));
		fs.copyFileSync(mobileDarkPath, path.join(PROOF_DIR, "mobile-dark-390x844.png"));
		await mobileContext.close();

		console.log("\n[SUCCESS] Captured all 4-state screenshots:");
		const files = [
			pcLightPath,
			pcDarkPath,
			mobileLightPath,
			mobileDarkPath,
		];
		for (const f of files) {
			const stat = fs.statSync(f);
			console.log(`- ${path.basename(f)}: ${(stat.size / 1024).toFixed(1)} KB`);
			if (stat.size < 20 * 1024) {
				throw new Error(`File ${f} is smaller than 20 KB (${stat.size} bytes)!`);
			}
		}
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Screenshot capture failed:", err);
	process.exit(1);
});
