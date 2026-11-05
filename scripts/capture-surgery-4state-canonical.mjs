/**
 * scripts/capture-surgery-4state-canonical.mjs
 * Red Team 4-State Visual Proof Capture for Chairside Surgery & Implant Hub:
 * 1. ☀️ PC Light (1440x900): docs/screenshots/surgery/01_surgery_hub_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900): docs/screenshots/surgery/02_surgery_hub_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844): docs/screenshots/surgery/03_surgery_hub_mobile_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844): docs/screenshots/surgery/04_surgery_hub_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = process.env.CONV_ID || "5ec54ad7-dea8-40ef-9807-2c269111f5fb";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/surgery`;
const OUT_DOCS = path.resolve(__dirname, "../docs/screenshots/surgery");
const OUT_PROOFS = path.resolve(__dirname, "../docs/proofs/surgery");

if (!existsSync(OUT_DOCS)) {
	mkdirSync(OUT_DOCS, { recursive: true });
}
if (!existsSync(OUT_PROOFS)) {
	mkdirSync(OUT_PROOFS, { recursive: true });
}
if (!existsSync(OUT_CONV)) {
	mkdirSync(OUT_CONV, { recursive: true });
}

function saveProofFiles(sourcePath, baseName) {
	const proofPath = path.join(OUT_PROOFS, `${baseName}.png`);
	const docsPath = path.join(OUT_DOCS, `${baseName}.png`);
	const convPath = path.join(OUT_CONV, `${baseName}.png`);
	copyFileSync(sourcePath, proofPath);
	copyFileSync(sourcePath, docsPath);
	copyFileSync(sourcePath, convPath);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-tour-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				[role="alert"],
				.shepherd-element {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
			document
				.querySelectorAll(
					".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']",
				)
				.forEach((el) => el.remove());
		});
	} catch (_) {}
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
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		try {
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
		} catch (_) {}
	}, theme);
	await sleep(400);
}

async function setupPageSession(context, page, role = "doctor") {
	await context.addCookies([
		{
			name: "dente_clinic_token",
			value: "demo-clinic-token",
			domain: "127.0.0.1",
			path: "/",
		},
		{
			name: "dente_staff_token",
			value: "demo-staff-token",
			domain: "127.0.0.1",
			path: "/",
		},
	]);

	await page.addInitScript(
		({ role }) => {
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_clinic_token", "demo-clinic-token");
			localStorage.setItem("dente_staff_token", "demo-staff-token");
			localStorage.setItem("dente_workspace_perspective", role);
			localStorage.setItem("dente_user_role", role);
			localStorage.setItem("dente_active_role", role);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done" }),
			);
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: role,
					onboardingDismissed: true,
					onboardingStep: "done",
				}),
			);
			localStorage.setItem(
				"dente-workspace-profile",
				JSON.stringify({ mode: "clinic", role: role, activeRole: role }),
			);
		},
		{ role },
	);
}

async function waitForRealUI(page) {
	const loginBtn = page.locator('button:has-text("Войти в систему")');
	if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("  [AUTH] Clicking login submit button...");
		await loginBtn.click();
		await sleep(1500);
	}

	const demoBtn = page.locator(".auth-demo-btn");
	if (await demoBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
		console.log("  [AUTH] Clicking demo launch button...");
		await demoBtn.click();
		await sleep(800);
		const adminCard = page
			.locator(".auth-demo-role-card", { hasText: "Главврач" })
			.first();
		if (await adminCard.isVisible().catch(() => false)) {
			await adminCard.click();
			await sleep(400);
		}
		const launchBtn = page
			.locator(".auth-demo-tour-actions button.auth-submit-btn")
			.first();
		if (await launchBtn.isVisible().catch(() => false)) {
			await launchBtn.click();
			await sleep(2000);
		}
	}

	console.log("  Waiting for UI to stabilize...");
	await page.waitForFunction(
		() => {
			const text = document.body.innerText || "";
			return (
				!text.includes("Загрузка системы") &&
				!text.includes("Подготовка модулей") &&
				(document.querySelector(".workspace-shell") ||
					document.querySelector(".topbar") ||
					document.querySelector("#root"))
			);
		},
		{ timeout: 30000 },
	);

	await suppressOverlays(page);
	await sleep(1000);
}

async function ensureSurgeryModal(page, scenario = "implant", toothFdi = 46) {
	let modal = await page.$('[data-testid="chairside-surgery-hub-modal"]');
	if (!modal) {
		console.log("  Modal not visible, dispatching dente:open-surgery...");
		await page.evaluate(
			({ scen, tooth }) => {
				window.dispatchEvent(
					new CustomEvent("dente:open-surgery", {
						detail: { scenario: scen, toothFdi: tooth },
					}),
				);
			},
			{ scen: scenario, tooth: toothFdi },
		);
		await sleep(1200);
	}
	// Select the implant scenario chip to showcase full implantology features
	try {
		const implantChip = page.locator('[data-testid="scenario-chip-implant"]').first();
		if (await implantChip.isVisible({ timeout: 2000 }).catch(() => false)) {
			await implantChip.click();
			await sleep(500);
		}
	} catch (err) {
		console.warn("  Could not click implant chip:", err?.message);
	}
}

async function main() {
	console.log("=== Launching Chrome Playwright for Surgery 4-State Proofs ===");

	const browser = await chromium.launch({
		executablePath:
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--font-render-hinting=none",
		],
	});

	try {
		// -------------------------------------------------------------
		// 1. DESKTOP CONTEXT (1440x900)
		// -------------------------------------------------------------
		console.log("\n[Setup Desktop Context 1440x900]...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const pcPage = await pcContext.newPage();
		await setupPageSession(pcContext, pcPage, "doctor");

		console.log(
			"  Navigating PC to http://127.0.0.1:5173/?demo=true#surgery ...",
		);
		await pcPage.goto("http://127.0.0.1:5173/?demo=true#surgery", {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		});
		await waitForRealUI(pcPage);
		await ensureSurgeryModal(pcPage, "implant", 46);

		// 1.1 01_surgery_hub_pc_light_1440x900.png
		console.log("[Capturing] 01_surgery_hub_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await suppressOverlays(pcPage);
		await sleep(600);

		const pcLightPath = path.join(
			OUT_PROOFS,
			"surgery_pc_light.png",
		);
		await pcPage.screenshot({ path: pcLightPath, fullPage: false });
		saveProofFiles(pcLightPath, "surgery_pc_light");
		saveProofFiles(pcLightPath, "01_surgery_hub_pc_light_1440x900");
		console.log(
			`  [OK] Saved surgery_pc_light.png (${Math.round(statSync(pcLightPath).size / 1024)} KB)`,
		);

		// 1.2 02_surgery_hub_pc_dark_1440x900.png
		console.log("[Capturing] surgery_pc_dark.png...");
		await setTheme(pcPage, "dark");
		await suppressOverlays(pcPage);
		await sleep(600);

		const pcDarkPath = path.join(
			OUT_PROOFS,
			"surgery_pc_dark.png",
		);
		await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
		saveProofFiles(pcDarkPath, "surgery_pc_dark");
		saveProofFiles(pcDarkPath, "02_surgery_hub_pc_dark_1440x900");
		console.log(
			`  [OK] Saved surgery_pc_dark.png (${Math.round(statSync(pcDarkPath).size / 1024)} KB)`,
		);

		await pcContext.close();

		// -------------------------------------------------------------
		// 2. MOBILE CONTEXT (390x844)
		// -------------------------------------------------------------
		console.log("\n[Setup Mobile Context 390x844]...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		const mobilePage = await mobileContext.newPage();
		await setupPageSession(mobileContext, mobilePage, "doctor");

		console.log(
			"  Navigating Mobile to http://127.0.0.1:5173/?demo=true#surgery ...",
		);
		await mobilePage.goto("http://127.0.0.1:5173/?demo=true#surgery", {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		});
		await waitForRealUI(mobilePage);
		await ensureSurgeryModal(mobilePage, "implant", 46);

		// 2.1 03_surgery_hub_mobile_light_390x844.png
		console.log("[Capturing] surgery_mobile_light.png...");
		await setTheme(mobilePage, "light");
		await suppressOverlays(mobilePage);
		await sleep(600);

		const mobileLightPath = path.join(
			OUT_PROOFS,
			"surgery_mobile_light.png",
		);
		await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
		saveProofFiles(mobileLightPath, "surgery_mobile_light");
		saveProofFiles(mobileLightPath, "03_surgery_hub_mobile_light_390x844");
		console.log(
			`  [OK] Saved surgery_mobile_light.png (${Math.round(statSync(mobileLightPath).size / 1024)} KB)`,
		);

		// 2.2 04_surgery_hub_mobile_dark_390x844.png
		console.log("[Capturing] surgery_mobile_dark.png...");
		await setTheme(mobilePage, "dark");
		await suppressOverlays(mobilePage);
		await sleep(600);

		const mobileDarkPath = path.join(
			OUT_PROOFS,
			"surgery_mobile_dark.png",
		);
		await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
		saveProofFiles(mobileDarkPath, "surgery_mobile_dark");
		saveProofFiles(mobileDarkPath, "04_surgery_hub_mobile_dark_390x844");
		console.log(
			`  [OK] Saved surgery_mobile_dark.png (${Math.round(statSync(mobileDarkPath).size / 1024)} KB)`,
		);

		await mobileContext.close();

		console.log("\n=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[Proof] FATAL ERROR:", err);
	process.exit(1);
});
