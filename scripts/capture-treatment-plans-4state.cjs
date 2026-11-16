/**
 * scripts/capture-treatment-plans-4state.cjs
 *
 * 4-STATE CANONICAL RED TEAM VISUAL PROOFS FOR TREATMENT PLAN STUDIO MODAL
 * - ☀️ PC Light (1440x900)
 * - 🌙 PC Dark (1440x900)
 * - 📱 Mobile Light (390x844)
 * - 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PARENT_ID = "8d148d14-84d7-401e-badd-c6ea47afd7f6";
const SELF_ID = "2ad6b6b8-e197-4025-825b-85776906b22a";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/treatment_plans");
const OUT_PARENT = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${PARENT_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SELF_ID}`);

[OUT_DOCS, OUT_PARENT, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function verifyAndSaveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pParent = path.join(OUT_PARENT, filename);
	const pSelf = path.join(OUT_SELF, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	try { fs.copyFileSync(pDocs, pParent); } catch {}
	try { fs.copyFileSync(pDocs, pSelf); } catch {}

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved successfully.`);
	return pDocs;
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.setAttribute("data-theme", th);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme);
	await page.waitForTimeout(600);
}

async function setupPage(context, page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element {
				display: none !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
	});
}

async function capture() {
	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. Desktop Context (1440x900)
		console.log("\n[DESKTOP] Launching PC viewport 1440x900...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			locale: "ru-RU",
			colorScheme: "light",
		});

		await pcContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", "demo-clinic-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-chief");
				localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
				localStorage.setItem("dente_user_id", "doc-1");
				localStorage.setItem("dente_user_name", "Д-р Кузнецов М.С.");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_perspective", "doctor");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
			} catch (_) {}
		});

		const pcPage = await pcContext.newPage();
		await pcPage.goto("http://127.0.0.1:5173/?demo=true&plans=1#treatment-plans", { waitUntil: "commit", timeout: 30000 });
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await pcPage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:open-treatment-plan", {
					detail: {
						patientName: "Волков Дмитрий Андреевич",
						doctorFullName: "Д-р Кузнецов М.С.",
						patientId: "00000000-0000-0000-0000-000000000001",
					},
				})
			);
		});
		await pcPage.waitForSelector('[data-testid="treatment-plan-studio-modal"]', { state: "visible", timeout: 20000 });
		await setupPage(pcContext, pcPage);

		// State 1: PC Light
		console.log("Saving 01_treatment_plans_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await verifyAndSaveProof(pcPage, "01_treatment_plans_pc_light_1440x900.png");

		// State 2: PC Dark
		console.log("Saving 02_treatment_plans_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await verifyAndSaveProof(pcPage, "02_treatment_plans_pc_dark_1440x900.png");

		await pcContext.close();

		// 2. Mobile Context (390x844)
		console.log("\n[MOBILE] Launching Mobile viewport 390x844 (iPhone 14/15)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			locale: "ru-RU",
			colorScheme: "light",
		});

		await mobileContext.addInitScript(() => {
			try {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", "demo-clinic-token");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
				localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-chief");
				localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
				localStorage.setItem("dente_user_id", "doc-1");
				localStorage.setItem("dente_user_name", "Д-р Кузнецов М.С.");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_perspective", "doctor");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
			} catch (_) {}
		});

		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true&plans=1#treatment-plans", { waitUntil: "commit", timeout: 30000 });
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await mobilePage.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:open-treatment-plan", {
					detail: {
						patientName: "Волков Дмитрий Андреевич",
						doctorFullName: "Д-р Кузнецов М.С.",
						patientId: "00000000-0000-0000-0000-000000000001",
					},
				})
			);
		});
		await mobilePage.waitForSelector('[data-testid="treatment-plan-studio-modal"]', { state: "visible", timeout: 20000 });
		await setupPage(mobileContext, mobilePage);

		// State 3: Mobile Light
		console.log("Saving 03_treatment_plans_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await verifyAndSaveProof(mobilePage, "03_treatment_plans_mobile_light_390x844.png");

		// State 4: Mobile Dark
		console.log("Saving 04_treatment_plans_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await verifyAndSaveProof(mobilePage, "04_treatment_plans_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n✅ ALL 4-STATE PROOFS CAPTURED AND VERIFIED!");
	} catch (err) {
		console.error("\n❌ Error during capture:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

capture();
