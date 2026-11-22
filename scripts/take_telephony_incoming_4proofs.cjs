/**
 * scripts/take_telephony_incoming_4proofs.cjs
 *
 * 4-STATE VISUAL PROOFS FOR INCOMING CALL POPUP
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844 Apple HIG)
 * 4. 📱 Mobile Dark (390x844 Apple HIG)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const CURRENT_CONV_ID = "a6622ca6-f62e-4c1d-9e90-ea0880b6eedc";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/telephony");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				.workspace-continuity-strip, .copilot-trigger-btn,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		} catch (_) {}
	});
}

async function applyTheme(page, isDark) {
	await page.evaluate((dark) => {
		const mode = dark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", mode);
		localStorage.setItem("dente_theme", mode);
		document.documentElement.setAttribute("data-theme", mode);
		document.body.setAttribute("data-theme", mode);
		document.documentElement.dataset.theme = mode;
		if (dark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.colorScheme = "light";
		}
	}, isDark);
	await page.waitForTimeout(600);
}

function injectStorage(context) {
	return context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-admin");
		localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0001-000000000001");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-admin");
		localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-admin");
		localStorage.setItem("dente_active_user_id", "01a00000-0000-0003-0000-000000000004");
		localStorage.setItem("dente_user_id", "01a00000-0000-0003-0000-000000000004");
		localStorage.setItem("dente_active_role", "administrator");
		localStorage.setItem("dente_user_role", "administrator");
		localStorage.setItem("dente_role", "administrator");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_perspective", "reception");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_showcase_mode_v1", "true");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "01a00000-0000-0003-0000-000000000004", fullName: "Смирнова Екатерина Васильевна", role: "administrator" }));
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({ mode: "clinic", role: "administrator", activeRole: "administrator", hasTelephony: true })
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "administrator",
				onboardingDismissed: true,
			})
		);
	});
}

async function saveProof(page, primaryName, aliasName) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, primaryName);
	const pBrain = path.join(OUT_BRAIN, primaryName);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);

	if (aliasName) {
		fs.copyFileSync(pDocs, path.join(OUT_DOCS, aliasName));
		fs.copyFileSync(pDocs, path.join(OUT_BRAIN, aliasName));
	}

	const size = fs.statSync(pDocs).size;
	console.log(`✅ [PROOFS CAPTURED] ${primaryName} / ${aliasName}: ${(size / 1024).toFixed(1)} KB`);
	if (size < 40960) {
		throw new Error(`[ERROR] File size ${size} < 40KB!`);
	}
}

async function main() {
	console.log(`\n=== 4-State Visual Proofs Capture for Incoming Call Popup ===`);
	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. DESKTOP CONTEXT (1440x900)
		// ==========================================
		console.log("\n🖥️ Desktop Context (1440x900)...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await injectStorage(pcContext);
		const pcPage = await pcContext.newPage();

		console.log("Navigating PC to Incoming Call launcher...");
		await pcPage.goto(`${WEB_BASE}/?demo=true&incoming=1#incoming`, { waitUntil: "commit", timeout: 45000 });
		await pcPage.waitForSelector('[data-testid="incoming-call-popup"]', { state: "visible", timeout: 35000 });
		await pcPage.waitForTimeout(1000);
		await suppressOverlays(pcPage);

		// 1.1 PC Light
		console.log("Saving PC Light...");
		await applyTheme(pcPage, false);
		await saveProof(pcPage, "01_telephony_incoming_call_pc_light_1440x900.png", "05_incoming_call_pc_light_1440x900.png");

		// 1.2 PC Dark
		console.log("Saving PC Dark...");
		await applyTheme(pcPage, true);
		await saveProof(pcPage, "02_telephony_incoming_call_pc_dark_1440x900.png", "06_incoming_call_pc_dark_1440x900.png");

		await pcContext.close();

		// ==========================================
		// 2. MOBILE CONTEXT (390x844 Apple HIG)
		// ==========================================
		console.log("\n📱 Mobile Context (390x844 Apple HIG)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await injectStorage(mobileContext);
		const mobPage = await mobileContext.newPage();

		console.log("Navigating Mobile to Incoming Call launcher...");
		await mobPage.goto(`${WEB_BASE}/?demo=true&incoming=1#incoming`, { waitUntil: "commit", timeout: 45000 });
		await mobPage.waitForSelector('[data-testid="incoming-call-popup"]', { state: "visible", timeout: 35000 });
		await mobPage.waitForTimeout(1000);
		await suppressOverlays(mobPage);

		// 2.1 Mobile Light
		console.log("Saving Mobile Light...");
		await applyTheme(mobPage, false);
		await saveProof(mobPage, "03_telephony_incoming_call_mobile_light_390x844.png", "07_incoming_call_mobile_light_390x844.png");

		// 2.2 Mobile Dark
		console.log("Saving Mobile Dark...");
		await applyTheme(mobPage, true);
		await saveProof(mobPage, "04_telephony_incoming_call_mobile_dark_390x844.png", "08_incoming_call_mobile_dark_390x844.png");

		await mobileContext.close();
		console.log("\n🎉 ALL 4-STATE TELEPHONY INCOMING CALL PROOFS CAPTURED & SAVED!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FAILED:", err);
	process.exit(1);
});
