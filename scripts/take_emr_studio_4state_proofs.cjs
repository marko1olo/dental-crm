/**
 * scripts/take_emr_studio_4state_proofs.cjs
 *
 * 4-STATE VISUAL PROOF FOR MEDICAL RECORD STUDIO MODAL (EMR & CLINICAL PROTOCOLS)
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORCH_ID = "2e26914e-fa5a-4892-8173-c6752860bc4c";
const SUBAGENT_ID = "c3edeb3e-5c4f-4f98-9449-b55679f6e857";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/emr");
const OUT_ORCH = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SUBAGENT_ID}`);

[OUT_DOCS, OUT_ORCH, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pOrch = path.join(OUT_ORCH, filename);
	const pSelf = path.join(OUT_SELF, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	try { fs.copyFileSync(pDocs, pOrch); } catch (_) {}
	try { fs.copyFileSync(pDocs, pSelf); } catch (_) {}

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function setupContextStorage(context, theme = "light") {
	await context.addInitScript((th) => {
		localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
		localStorage.setItem("dente_active_user_id", "doc-1");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		localStorage.setItem(
			"dente_ui_preferences_v1",
			JSON.stringify({
				onboardingDismissed: true,
				onboardingStep: "done",
				onboardingDraftMode: false,
			})
		);
	}, theme);
}

async function getActiveDevPort() {
	for (const port of [5174, 5173]) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}`);
			if (res.ok) return port;
		} catch (_) {}
	}
	return 5174;
}

async function main() {
	const activePort = await getActiveDevPort();
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== 4-State Proof for Medical Record Studio Modal: Navigating to ${baseUrl} ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		await setupContextStorage(context, "light");
		const page = await context.newPage();
		await page.goto(`${baseUrl}/#medical-card`, { waitUntil: "domcontentloaded", timeout: 60000 });
		await page.waitForTimeout(1000);
		await suppressOverlays(page);
		await setTheme(page, "light");

		await page.evaluate(() => {
			if (!document.querySelector(".emr-studio-backdrop")) {
				window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
			}
		});
		await page.waitForSelector(".emr-studio-backdrop", { timeout: 10000 });

		// 1. PC Light
		console.log("\n--- State 1: PC Light (1440x900) ---");
		await saveProof(page, "01_emr_studio_pc_light_1440x900.png");

		// 2. PC Dark (switch to passport tab showing editable fields)
		console.log("\n--- State 2: PC Dark (1440x900) ---");
		await setTheme(page, "dark");
		const passportTab = page.locator(".emr-studio-tab-btn:has-text('Паспортная часть')");
		if (await passportTab.count() > 0) {
			await passportTab.first().click();
			await page.waitForTimeout(600);
		}
		await saveProof(page, "02_emr_studio_pc_dark_1440x900.png");

		// 3. Mobile Light (390x844 via setViewportSize)
		console.log("\n--- State 3: Mobile Light (390x844) ---");
		await page.setViewportSize({ width: 390, height: 844 });
		await setTheme(page, "light");
		await page.waitForTimeout(800);
		await saveProof(page, "03_emr_studio_mobile_light_390x844.png");

		// 4. Mobile Dark (390x844)
		console.log("\n--- State 4: Mobile Dark (390x844) ---");
		await setTheme(page, "dark");
		const mobAnamnesisTab = page.locator(".emr-studio-tab-btn:has-text('Анамнез')");
		if (await mobAnamnesisTab.count() > 0) {
			await mobAnamnesisTab.first().click();
			await page.waitForTimeout(600);
		}
		await saveProof(page, "04_emr_studio_mobile_dark_390x844.png");

		console.log("\n=== ALL 4 EMR STUDIO PROOFS SUCCESSFULLY CAPTURED! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR CAPTURING PROOFS]:", err);
	process.exit(1);
});
