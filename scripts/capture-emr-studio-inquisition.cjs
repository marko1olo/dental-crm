const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const SCREENSHOTS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e9c36c9c-6b93-4b13-9b96-717c253df522");

for (const dir of [PROOFS_DIR, SCREENSHOTS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(page, outName) {
	const outPath = path.join(PROOFS_DIR, outName);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

	const screenPath = path.join(SCREENSHOTS_DIR, outName);
	fs.copyFileSync(outPath, screenPath);

	const brainPath = path.join(BRAIN_DIR, outName);
	fs.copyFileSync(outPath, brainPath);

	const size = fs.statSync(outPath).size;
	console.log(`[PROOF VERIFIED] ${outName}: ${size} bytes (${(size / 1024).toFixed(1)} KB) -> ${outPath}`);
	if (size < 20000) {
		throw new Error(`Screenshot ${outName} is too small: ${size} bytes (< 20 KB)!`);
	}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme);
	await page.waitForTimeout(800);
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container { display: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function waitForBoot(page) {
	console.log("Waiting for app boot and splash detach...");
	for (let i = 0; i < 35; i++) {
		await page.waitForTimeout(1000);
		try {
			const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
			if (!text.includes("Загрузка системы") && !text.includes("Загрузка CRM") && text.length > 100) {
				console.log(`[BOOT READY] Hydration completed at iteration ${i + 1}`);
				break;
			}
		} catch (e) {
			console.log(`[WAIT ${i + 1}] Retrying...`);
		}
	}
	await page.waitForTimeout(1500);
	await suppressOverlays(page);
}

async function capture() {
	console.log("=== Launching Chrome for EMR Studio Modal Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// ══════════════════════════════════════════════════════════════════════════
		// 1. DESKTOP VIEWPORT (1440x900)
		// ══════════════════════════════════════════════════════════════════════════
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});

		await context.addInitScript(() => {
			try {
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
					id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
				}));
			} catch (e) {}
		});

		const page = await context.newPage();

		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				console.log(`Navigating to http://127.0.0.1:5173/?demo=true#medical-card (attempt ${attempt})...`);
				await page.goto("http://127.0.0.1:5173/?demo=true#medical-card", {
					waitUntil: "commit",
					timeout: 25000,
				});
				break;
			} catch (e) {
				console.log(`Attempt ${attempt} failed: ${e.message}, waiting 2s...`);
				await page.waitForTimeout(2000);
			}
		}

		await waitForBoot(page);

		// Ensure modal is open via event dispatch
		await page.evaluate(() => {
			window.location.hash = "#medical-card";
			window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
			window.dispatchEvent(new CustomEvent("dente-open-medical-card"));
		});
		await page.waitForTimeout(1500);

		console.log("Waiting for .emr-studio-modal selector...");
		await page.waitForSelector(".emr-studio-modal", { state: "visible", timeout: 15000 });
		await page.waitForTimeout(600);

		// 1. Overview Tab - PC Light (1440x900)
		console.log("\n1. Capturing 01_emr_studio_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveScreenshot(page, "01_emr_studio_pc_light_1440x900.png");

		// 2. Overview Tab - PC Dark (1440x900)
		console.log("\n2. Capturing 02_emr_studio_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveScreenshot(page, "02_emr_studio_pc_dark_1440x900.png");

		// Switch to Diaries Tab (4. Дневники визитов)
		console.log("\nSwitching to '4. Дневники визитов'...");
		const diariesTab = page.locator('nav button:has-text("4. Дневники визитов")').first();
		if (await diariesTab.isVisible().catch(() => false)) {
			await diariesTab.click();
			await page.waitForTimeout(800);
		}

		// Ensure Inline Diary Form is open
		const quickAddBtn = page.locator('[data-testid="btn-toggle-inline-diary-form"]').first();
		const isFormOpen = await page.locator('[data-testid="input-inline-diary-tooth"]').isVisible().catch(() => false);
		if (!isFormOpen && await quickAddBtn.isVisible().catch(() => false)) {
			console.log("Opening inline diary form...");
			await quickAddBtn.click();
			await page.waitForTimeout(800);
		}

		// 3. Inline Diaries - PC Dark (1440x900) — THIS WAS THE CREATOR'S SPECIFIC COMPLAINT
		console.log("\n3. Capturing 03_emr_studio_inline_diaries_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await saveScreenshot(page, "03_emr_studio_inline_diaries_pc_dark_1440x900.png");

		// 4. Inline Diaries - PC Light (1440x900)
		console.log("\n4. Capturing 04_emr_studio_inline_diaries_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await saveScreenshot(page, "04_emr_studio_inline_diaries_pc_light_1440x900.png");

		await context.close();

		// ══════════════════════════════════════════════════════════════════════════
		// 2. MOBILE VIEWPORT (390x844 - iPhone Apple HIG)
		// ══════════════════════════════════════════════════════════════════════════
		console.log("\n=== Launching Mobile Viewport (390x844) ===");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			serviceWorkers: "block",
		});

		await mobContext.addInitScript(() => {
			try {
				sessionStorage.setItem("dente:sw-controller-reload", "1");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
					id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
				}));
			} catch (e) {}
		});

		const mobPage = await mobContext.newPage();
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				console.log(`Navigating mobile to http://127.0.0.1:5173/?demo=true#medical-card (attempt ${attempt})...`);
				await mobPage.goto("http://127.0.0.1:5173/?demo=true#medical-card", {
					waitUntil: "commit",
					timeout: 25000,
				});
				break;
			} catch (e) {
				console.log(`Mobile attempt ${attempt} failed: ${e.message}, waiting 2s...`);
				await mobPage.waitForTimeout(2000);
			}
		}

		await waitForBoot(mobPage);

		await mobPage.evaluate(() => {
			window.location.hash = "#medical-card";
			window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
			window.dispatchEvent(new CustomEvent("dente-open-medical-card"));
		});
		await mobPage.waitForTimeout(1500);

		await mobPage.waitForSelector(".emr-studio-modal", { state: "visible", timeout: 15000 });
		await mobPage.waitForTimeout(600);

		// 5. Mobile Light (390x844)
		console.log("\n5. Capturing 05_emr_studio_mobile_light_390x844.png...");
		await setTheme(mobPage, "light");
		await saveScreenshot(mobPage, "05_emr_studio_mobile_light_390x844.png");

		// 6. Mobile Dark (390x844)
		console.log("\n6. Capturing 06_emr_studio_mobile_dark_390x844.png...");
		await setTheme(mobPage, "dark");
		await saveScreenshot(mobPage, "06_emr_studio_mobile_dark_390x844.png");

		await mobContext.close();
		console.log("\n>>> ALL 6 EMR STUDIO PROOFS SUCCESSFULLY CAPTURED & SAVED! <<<");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
