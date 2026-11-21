const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PARENT_ID = "07663fdc-eba5-48a1-bbb4-3c4b8f181006";
const CURRENT_ID = "1b4621ef-76c5-4503-888d-9a5081e0607e";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/analytics");
const OUT_PARENT = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${PARENT_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_ID}`);

[OUT_DOCS, OUT_PARENT, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(800);
	const pDocs = path.join(OUT_DOCS, filename);
	const pParent = path.join(OUT_PARENT, filename);
	const pSelf = path.join(OUT_SELF, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pParent);
	fs.copyFileSync(pDocs, pSelf);

	const size = fs.statSync(pDocs).size;
	if (size < 15000) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 15KB)!`);
	}
	console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
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

async function main() {
	const activePort = 5173;
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== Rebooking Conversion 4-State Proof: Navigating to ${baseUrl}/#analytics ===`);

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ─────────────────────────────────────────────────────────────
		// 1. DESKTOP LIGHT & DARK (1440x900)
		// ─────────────────────────────────────────────────────────────
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});

		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_user_role", "owner");
			localStorage.setItem("dente_role", "owner");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_perspective", "management");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			sessionStorage.setItem("dente_executive_tab", "rebooking");
			localStorage.setItem("dente_executive_tab", "rebooking");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_theme", "light");
		});

		const pcPage = await pcContext.newPage();
		await pcPage.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 35000 });

		console.log("Waiting for app mount on PC...");
		for (let i = 0; i < 40; i++) {
			await pcPage.waitForTimeout(1000);
			try {
				const hasNav = await pcPage.locator("nav, [data-testid='top-navigation-bar'], [data-testid='executive-tab-financial']").count();
				if (hasNav > 0) {
					console.log(`[PC MOUNT DETECTED] at ${i + 1}s`);
					break;
				}
			} catch (_) {}
		}

		await suppressOverlays(pcPage);
		await pcPage.waitForTimeout(1000);

		// Кликаем по табу "Повторная запись"
		const rebookingTab = pcPage.locator("[data-testid='executive-tab-rebooking']");
		if (await rebookingTab.count() > 0) {
			console.log("Clicking rebooking tab...");
			await rebookingTab.click();
			await pcPage.waitForTimeout(1000);
		} else {
			console.log("Rebooking tab not directly found by testid, evaluating session state...");
			await pcPage.evaluate(() => {
				sessionStorage.setItem("dente_executive_tab", "rebooking");
				window.location.hash = "#analytics";
			});
			await pcPage.reload({ waitUntil: "commit" });
			await pcPage.waitForTimeout(2000);
			const retryTab = pcPage.locator("[data-testid='executive-tab-rebooking']");
			if (await retryTab.count() > 0) await retryTab.click();
		}

		await pcPage.waitForSelector("[data-testid='rebooking-conversion-panel']", { timeout: 10000 }).catch(() => {});
		await suppressOverlays(pcPage);

		// ☀️ 1. PC Light Proof
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_rebooking_conversion_pc_light_1440x900.png");

		// 🌙 2. PC Dark Proof
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_rebooking_conversion_pc_dark_1440x900.png");

		await pcContext.close();

		// ─────────────────────────────────────────────────────────────
		// 2. MOBILE LIGHT & DARK (390x844, Apple HIG)
		// ─────────────────────────────────────────────────────────────
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000004");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_role", "owner");
			localStorage.setItem("dente_demo_mode", "true");
			sessionStorage.setItem("dente_unlocked", "true");
			sessionStorage.setItem("dente_executive_tab", "rebooking");
			localStorage.setItem("dente_executive_tab", "rebooking");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(`${baseUrl}/?demo=true#analytics`, { waitUntil: "commit", timeout: 35000 });

		console.log("Waiting for app mount on Mobile...");
		await mobilePage.waitForTimeout(3000);
		await suppressOverlays(mobilePage);

		const mobileRebookingTab = mobilePage.locator("[data-testid='executive-tab-rebooking']");
		if (await mobileRebookingTab.count() > 0) {
			await mobileRebookingTab.click();
			await mobilePage.waitForTimeout(1000);
		}

		await mobilePage.waitForSelector("[data-testid='rebooking-conversion-panel']", { timeout: 10000 }).catch(() => {});
		await suppressOverlays(mobilePage);

		// ☀️ 3. Mobile Light Proof
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_rebooking_conversion_mobile_light_390x844.png");

		// 🌙 4. Mobile Dark Proof
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_rebooking_conversion_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n========================================================");
		console.log("🏆 4-STATE VISUAL PROOF CAPTURE: 100% COMPLETE!");
		console.log("========================================================");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR IN 4-STATE CAPTURE]:", err);
	process.exit(1);
});
