const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function run() {
	const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc");
	if (!fs.existsSync(parentBrainDir)) {
		fs.mkdirSync(parentBrainDir, { recursive: true });
	}

	const currentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a34d41e9-d7cd-4897-bf02-c3410f96d582");
	if (!fs.existsSync(currentBrainDir)) {
		fs.mkdirSync(currentBrainDir, { recursive: true });
	}

	console.log("[Playwright] Launching Chrome in iPhone 14 viewport (390x844, scale 2, touch)...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
	});

	// Pre-seed localStorage
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
	});

	const page = await context.newPage();
	const port = process.env.VITE_PORT || "5173";

	console.log(`[Playwright] Navigating to http://127.0.0.1:${port}/?consent=demo#consent...`);
	await page.goto(`http://127.0.0.1:${port}/?consent=demo#consent`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(1500);

	// Remove any guided tour overlay
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
	});

	// Wait for modal container
	console.log("[Playwright] Waiting for .consent-modal-container...");
	await page.waitForSelector(".consent-modal-container", { timeout: 12000 });

	// Ensure method "tablet_stylus" (На экране пальцем) is active
	console.log("[Playwright] Ensuring tablet_stylus (finger signature) tab is active...");
	const tabletTab = await page.$("[data-testid='tab-method-tablet']");
	if (tabletTab) {
		await tabletTab.click();
		await page.waitForTimeout(400);
	}

	// Verify tactical toggles exist and check them if needed
	const toggles = await page.$$(".consent-ios-toggle-card input[type='checkbox']");
	console.log(`[Playwright] Found ${toggles.length} tactical consent toggle cards.`);
	for (const toggle of toggles) {
		const checked = await toggle.isChecked();
		if (!checked) {
			await toggle.click();
			await page.waitForTimeout(200);
		}
	}

	// Draw realistic finger signature on TouchSignaturePad
	console.log("[Playwright] Drawing realistic finger signature on TouchSignaturePad...");
	const svgPad = await page.$("[data-testid='consent-vector-pad-svg']");
	if (svgPad) {
		await svgPad.scrollIntoViewIfNeeded();
		await page.waitForTimeout(300);
		const box = await svgPad.boundingBox();
		if (box) {
			console.log(`[Playwright] TouchSignaturePad bounding box: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
			const startX = box.x + 50;
			const startY = box.y + box.height / 2 + 10;

			// Stroke 1: Capital letter K / flourish
			await page.mouse.move(startX, startY + 15);
			await page.mouse.down();
			await page.mouse.move(startX + 10, startY - 40, { steps: 5 });
			await page.mouse.move(startX + 30, startY - 20, { steps: 4 });
			await page.mouse.move(startX + 50, startY - 45, { steps: 4 });
			await page.mouse.move(startX + 25, startY - 10, { steps: 4 });
			await page.mouse.move(startX + 55, startY + 20, { steps: 5 });
			await page.mouse.up();

			// Stroke 2: cursive script flow
			await page.waitForTimeout(100);
			await page.mouse.move(startX + 65, startY + 5);
			await page.mouse.down();
			await page.mouse.move(startX + 90, startY - 15, { steps: 4 });
			await page.mouse.move(startX + 115, startY + 10, { steps: 4 });
			await page.mouse.move(startX + 140, startY - 20, { steps: 4 });
			await page.mouse.move(startX + 170, startY + 5, { steps: 4 });
			await page.mouse.move(startX + 220, startY - 25, { steps: 6 });
			await page.mouse.move(startX + 255, startY + 20, { steps: 5 });
			await page.mouse.up();
			console.log("[Playwright] Signature drawn successfully!");
		}
	}

	await page.waitForTimeout(500);

	// Function to capture and replicate screenshot
	async function capture(fileName, theme) {
		console.log(`[Playwright] Setting theme to ${theme}...`);
		await page.evaluate((t) => {
			document.documentElement.setAttribute("data-theme", t);
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(t);
			}
			const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(t);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			localStorage.setItem("dente_theme_mode", t);
		}, theme);
		await page.waitForTimeout(800);

		const targetPath = path.join(outDir, fileName);
		const parentPath = path.join(parentBrainDir, fileName);
		const currentPath = path.join(currentBrainDir, fileName);

		await page.screenshot({ path: targetPath, fullPage: false });
		fs.copyFileSync(targetPath, parentPath);
		fs.copyFileSync(targetPath, currentPath);

		const stats = fs.statSync(targetPath);
		console.log(`[PROOF CAPTURED] ${fileName} (${stats.size} bytes) -> saved to docs & brains!`);
		return targetPath;
	}

	// 1. LIGHT MODE PROOF (390x844)
	const lightPath = await capture("proof_mobile_consent_signing_light.png", "light");

	// 2. DARK MODE PROOF (390x844)
	const darkPath = await capture("proof_mobile_consent_signing_dark.png", "dark");

	await browser.close();
	console.log("\n[SUCCESS] Mobile consent signing proofs captured in both Light and Dark modes!");
	console.log(`Light: ${lightPath}`);
	console.log(`Dark: ${darkPath}`);
}

run().catch((err) => {
	console.error("[FATAL] Error running mobile capture:", err);
	process.exit(1);
});
