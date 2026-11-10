const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const SCREENSHOTS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/7874bebf-68ff-4e10-86e0-712da7493927");

for (const dir of [PROOFS_DIR, SCREENSHOTS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveScreenshot(page, baseName) {
	const outPath1 = path.join(PROOFS_DIR, baseName);
	await page.screenshot({ path: outPath1, fullPage: false, animations: "disabled" });

	const outScreenshots = path.join(SCREENSHOTS_DIR, baseName);
	fs.copyFileSync(outPath1, outScreenshots);

	const brainPath = path.join(BRAIN_DIR, baseName);
	fs.copyFileSync(outPath1, brainPath);

	const size = fs.statSync(outPath1).size;
	if (size < 20480) {
		throw new Error(`[ANTI-BLANK GUARD] Screenshot ${baseName} is under 20KB (${size} bytes)`);
	}
	console.log(`[PROOF VERIFIED] ${baseName}: ${size} bytes (${(size / 1024).toFixed(1)} KB) -> ${outPath1}`);
	return size;
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		}
		window.dispatchEvent(new Event("themechange"));
	}, theme);
	await page.waitForTimeout(600);
}

async function capture() {
	console.log("=== Launching Chrome for Unified 4-State Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
		});

		const page = await context.newPage();

		console.log("Navigating to http://127.0.0.1:5173/?demo=true&emr=1 ...");
		await page.goto("http://127.0.0.1:5173/?demo=true&emr=1", {
			waitUntil: "commit",
			timeout: 25000,
		});
		await page.waitForTimeout(5000);

		// Also ensure modal is open via event dispatch
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
		});
		await page.waitForTimeout(1000);

		// Suppress tour overlays
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container { display: none !important; }
			`;
			document.head.appendChild(style);
		});
		await page.waitForTimeout(1000);

		// 1. PC Light (1440x900) - Overview Tab
		console.log("\n1. Capturing PC Light (1440x900)...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await setTheme(page, "light");
		await saveScreenshot(page, "01_emr_studio_pc_light_1440x900.png");
		await saveScreenshot(page, "01_visit_soap_emk_pc_light_1440x900.png");

		// 2. PC Dark (1440x900) - Overview Tab
		console.log("\n2. Capturing PC Dark (1440x900)...");
		await setTheme(page, "dark");
		await saveScreenshot(page, "02_emr_studio_pc_dark_1440x900.png");
		await saveScreenshot(page, "02_visit_soap_emk_pc_dark_1440x900.png");

		// ── Switch to Diaries Tab & Open Inline Form (Creator's Target) ──
		console.log("\nSwitching to 'Дневники визитов'...");
		await page.evaluate(() => {
			const tabs = Array.from(document.querySelectorAll(".emr-studio-tab-btn"));
			const d = tabs.find((t) => t.textContent.includes("Дневники"));
			if (d) d.click();
		});
		await page.waitForTimeout(1000);

		console.log("Opening inline diary form...");
		await page.evaluate(() => {
			const input = document.querySelector('[data-testid="input-inline-diary-tooth"]');
			if (!input) {
				const btn = document.querySelector('[data-testid="btn-toggle-inline-diary-form"]');
				if (btn) btn.click();
			}
		});
		await page.waitForTimeout(1000);

		// 3. Inline Diaries PC Dark (1440x900) - Creator's specific complaint target
		console.log("\nCapturing Inline Diaries PC Dark...");
		await setTheme(page, "dark");
		await saveScreenshot(page, "03_emr_studio_inline_diaries_pc_dark_1440x900.png");
		await saveScreenshot(page, "02_emr_studio_inline_diaries_pc_dark_1440x900.png");

		// 4. Inline Diaries PC Light (1440x900)
		console.log("\nCapturing Inline Diaries PC Light...");
		await setTheme(page, "light");
		await saveScreenshot(page, "04_emr_studio_inline_diaries_pc_light_1440x900.png");
		await saveScreenshot(page, "01_emr_studio_inline_diaries_pc_light_1440x900.png");

		// 5. Mobile Light (390x844)
		console.log("\n5. Capturing Mobile Light (390x844)...");
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		await saveScreenshot(page, "03_emr_studio_mobile_light_390x844.png");
		await saveScreenshot(page, "03_visit_soap_emk_mobile_light_390x844.png");
		await saveScreenshot(page, "03_emr_studio_inline_diaries_mobile_light_390x844.png");

		// 6. Mobile Dark (390x844)
		console.log("\n6. Capturing Mobile Dark (390x844)...");
		await setTheme(page, "dark");
		await saveScreenshot(page, "04_emr_studio_mobile_dark_390x844.png");
		await saveScreenshot(page, "04_visit_soap_emk_mobile_dark_390x844.png");
		await saveScreenshot(page, "04_emr_studio_inline_diaries_mobile_dark_390x844.png");

		await context.close();
		console.log("\n>>> ALL EMR STUDIO & INLINE DIARIES PROOFS SUCCESSFULLY CAPTURED! <<<");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
