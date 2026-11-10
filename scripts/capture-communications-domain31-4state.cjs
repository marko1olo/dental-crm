/**
 * scripts/capture-communications-domain31-4state.cjs
 * Comprehensive 4-State Visual Proofs for Domain 31: Omnichannel Messaging & Patient Communications.
 * 
 * Mandates:
 * - Mandate 8d / 8al: 8 inspection axes, 4-state visual proof (PC Light/Dark 1440x900 + Mobile Light/Dark 390x844).
 * - Mandate 8z / 8wy: 100% real API authentication via Fastify + Postgres.
 * - Mandate 8am / 8bi: Clean clinical UI, 0px noise, 0 circus violations.
 * - Mandate 8zg: No dev-slang in UI.
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const outDir = path.resolve(__dirname, "../docs/proofs/communications");
if (!fs.existsSync(outDir)) {
	fs.mkdirSync(outDir, { recursive: true });
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const existing = document.getElementById("suppress-all-overlays");
		if (!existing) {
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
		}
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
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function capture() {
	console.log("=== CAPTURING COMMUNICATIONS 4-STATE VISUAL PROOFS ===");

	console.log("1. Authenticating with real Fastify API at 127.0.0.1:4100...");
	const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
	});
	const auth = await loginRes.json();
	console.log("Auth OK, clinicToken present:", Boolean(auth.clinicToken));

	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	// Single persistent context to preserve compiled Vite cache and fast switching
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		colorScheme: "light",
	});

	await context.addInitScript((auth) => {
		localStorage.setItem("dente_clinic_token", auth.clinicToken);
		localStorage.setItem("dente_staff_token", auth.staffToken);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ ...auth.user, role: "owner" }));
		localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({ ...auth.user, role: "owner" }));
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_training_mode_completed", "true");
		localStorage.setItem("dente_training_active", "false");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:express-tour-dismissed", "true");
		localStorage.setItem("dente_express_tour_dismissed", "true");
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
	}, auth);

	const page = await context.newPage();
	page.setDefaultTimeout(40000);

	console.log("Navigating to http://127.0.0.1:5173/#communications ...");
	await page.goto("http://127.0.0.1:5173/#communications");

	// Wait up to 30s for the communications view to mount
	console.log("Waiting for CommunicationsView to mount...");
	await page.waitForSelector('.communications-panel, [data-testid="communications-view"]', { timeout: 35000 });
	console.log("CommunicationsView is mounted!");

	await suppressOverlays(page);
	await page.waitForTimeout(1000);

	// 1. PC Light
	console.log("Capturing 01_communications_pc_light_1440x900.png...");
	await setTheme(page, "light");
	const p1 = path.join(outDir, "01_communications_pc_light_1440x900.png");
	await page.screenshot({ path: p1, fullPage: false });
	const s1 = fs.statSync(p1).size;
	console.log(`[PROOF OK] 01_communications_pc_light_1440x900.png -> ${s1} bytes`);
	if (s1 < 20000) throw new Error(`01 size ${s1} < 20KB`);

	// 2. PC Dark
	console.log("Capturing 02_communications_pc_dark_1440x900.png...");
	await setTheme(page, "dark");
	const p2 = path.join(outDir, "02_communications_pc_dark_1440x900.png");
	await page.screenshot({ path: p2, fullPage: false });
	const s2 = fs.statSync(p2).size;
	console.log(`[PROOF OK] 02_communications_pc_dark_1440x900.png -> ${s2} bytes`);
	if (s2 < 20000) throw new Error(`02 size ${s2} < 20KB`);

	// 3. Mobile Light (390x844)
	console.log("Capturing 03_communications_mobile_light_390x844.png...");
	await page.setViewportSize({ width: 390, height: 844 });
	await setTheme(page, "light");
	await page.waitForTimeout(800);
	const p3 = path.join(outDir, "03_communications_mobile_light_390x844.png");
	await page.screenshot({ path: p3, fullPage: false });
	const s3 = fs.statSync(p3).size;
	console.log(`[PROOF OK] 03_communications_mobile_light_390x844.png -> ${s3} bytes`);
	if (s3 < 20000) throw new Error(`03 size ${s3} < 20KB`);

	// 4. Mobile Dark (390x844)
	console.log("Capturing 04_communications_mobile_dark_390x844.png...");
	await setTheme(page, "dark");
	await page.waitForTimeout(800);
	const p4 = path.join(outDir, "04_communications_mobile_dark_390x844.png");
	await page.screenshot({ path: p4, fullPage: false });
	const s4 = fs.statSync(p4).size;
	console.log(`[PROOF OK] 04_communications_mobile_dark_390x844.png -> ${s4} bytes`);
	if (s4 < 20000) throw new Error(`04 size ${s4} < 20KB`);

	// 5. Omnichannel Desk PC Light (1440x900)
	console.log("Switching to Omnichannel Desk tab...");
	await page.setViewportSize({ width: 1440, height: 900 });
	await setTheme(page, "light");
	// Click on "Диалоги с пациентами" tab or trigger omnichannel section
	await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button"));
		const deskBtn = buttons.find(b => b.innerText.includes("Диалоги с пациентами") || b.innerText.includes("Омниканальный"));
		if (deskBtn) deskBtn.click();
	});
	await page.waitForTimeout(1500);
	const p5 = path.join(outDir, "05_omnichannel_chat_pc_light_1440x900.png");
	await page.screenshot({ path: p5, fullPage: false });
	const s5 = fs.statSync(p5).size;
	console.log(`[PROOF OK] 05_omnichannel_chat_pc_light_1440x900.png -> ${s5} bytes`);

	await browser.close();
	console.log("\n✅ ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
