/**
 * scripts/capture-sanpin-4state-canonical.mjs
 * Red Team 4-State Visual Proof Capture for SanPiN & Sterilization Studio Modal:
 * 1. ☀️ PC Light (1440x900): docs/screenshots/sanpin/01_sanpin_studio_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900): docs/screenshots/sanpin/02_sanpin_studio_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844): docs/screenshots/sanpin/03_sanpin_studio_mobile_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844): docs/screenshots/sanpin/04_sanpin_studio_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = process.env.CONV_ID || "c43536bd-66c7-4408-9ccd-c8b0e44c8e31";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/sanpin`;
const OUT_DOCS = path.resolve(__dirname, "../docs/screenshots/sanpin");

if (!existsSync(OUT_DOCS)) {
	mkdirSync(OUT_DOCS, { recursive: true });
}
if (!existsSync(OUT_CONV)) {
	mkdirSync(OUT_CONV, { recursive: true });
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
	try {
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
	} catch (e) {
		console.warn("  [THEME] Retrying setTheme after navigation...", e?.message);
		await sleep(800);
		try {
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
			}, theme);
		} catch (_) {}
	}
	await sleep(400);
}

async function setupPageSession(context, page, role = "doctor", theme = "light") {
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
		({ role, theme }) => {
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
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("theme", theme);
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
		{ role, theme },
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

	console.log("  Waiting for UI or Sanpin modal...");
	try {
		await page.waitForFunction(
			() => {
				const text = document.body.innerText || "";
				return (
					document.querySelector('[data-testid="sanpin-studio-modal"]') ||
					document.querySelector('[data-testid="direct-sanpin-launcher"]') ||
					document.querySelector(".sanpin-studio-backdrop") ||
					(!text.includes("Загрузка системы") &&
						!text.includes("Подготовка модулей") &&
						(document.querySelector(".workspace-shell") ||
							document.querySelector(".topbar") ||
							document.querySelector("#root")))
				);
			},
			{ timeout: 35000 },
		);
	} catch (e) {
		console.warn("  UI wait soft fallback:", e?.message);
	}

	await suppressOverlays(page);
	await sleep(1000);
}

async function openSanpinModal(page) {
	console.log("  [SANPIN] Ensuring Sanpin Studio Modal...");
	let modal = page.locator('[data-testid="sanpin-studio-modal"], .sanpin-studio-backdrop').first();
	let isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
	if (!isVisible) {
		console.log("  [SANPIN] Dispatching dente:open-sanpin...");
		await page.evaluate(() => {
			window.location.hash = "sanpin";
			window.dispatchEvent(new CustomEvent("dente:open-sanpin"));
		});
		await sleep(1000);
	}
	isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
	if (!isVisible) {
		console.log("  [SANPIN] Trying direct event dente:open-autoclave...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-autoclave"));
		});
		await sleep(1000);
	}
	await modal.waitFor({ state: "visible", timeout: 12000 });
	console.log("  [SANPIN] Modal is visible!");
}

async function run() {
	console.log("=== STARTING CANONICAL 4-STATE SANPIN PROOF CAPTURE ===");
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--font-render-hinting=none"],
	});

	try {
		// --- PC LIGHT (1440x900) ---
		{
			console.log("\n[STATE 1/4] Capturing SanPiN PC Light (1440x900)...");
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
			});
			const page = await context.newPage();
			await setupPageSession(context, page, "doctor", "light");
			await page.goto("http://127.0.0.1:5173/?demo=true&sanpin=1#sanpin", { waitUntil: "domcontentloaded", timeout: 45000 });
			await waitForRealUI(page);
			await sleep(600);
			await setTheme(page, "light");
			await openSanpinModal(page);
			await suppressOverlays(page);
			await sleep(500);

			const targetFile = path.join(OUT_DOCS, "01_sanpin_studio_pc_light_1440x900.png");
			await page.screenshot({ path: targetFile, fullPage: false });
			const convTarget = path.join(OUT_CONV, "01_sanpin_studio_pc_light_1440x900.png");
			copyFileSync(targetFile, convTarget);

			const sz = statSync(targetFile).size;
			console.log(`  [SAVED] ${targetFile} (${Math.round(sz / 1024)} KB)`);
			await context.close();
		}

		// --- PC DARK (1440x900) ---
		{
			console.log("\n[STATE 2/4] Capturing SanPiN PC Dark (1440x900)...");
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
			});
			const page = await context.newPage();
			await setupPageSession(context, page, "doctor", "dark");
			await page.goto("http://127.0.0.1:5173/?demo=true&sanpin=1#sanpin", { waitUntil: "domcontentloaded", timeout: 45000 });
			await waitForRealUI(page);
			await sleep(600);
			await setTheme(page, "dark");
			await openSanpinModal(page);
			await suppressOverlays(page);
			await sleep(500);

			const targetFile = path.join(OUT_DOCS, "02_sanpin_studio_pc_dark_1440x900.png");
			await page.screenshot({ path: targetFile, fullPage: false });
			const convTarget = path.join(OUT_CONV, "02_sanpin_studio_pc_dark_1440x900.png");
			copyFileSync(targetFile, convTarget);

			const sz = statSync(targetFile).size;
			console.log(`  [SAVED] ${targetFile} (${Math.round(sz / 1024)} KB)`);
			await context.close();
		}

		// --- MOBILE LIGHT (390x844) ---
		{
			console.log("\n[STATE 3/4] Capturing SanPiN Mobile Light (390x844)...");
			const context = await browser.newContext({
				viewport: { width: 390, height: 844 },
				deviceScaleFactor: 2,
				isMobile: true,
				hasTouch: true,
			});
			const page = await context.newPage();
			await setupPageSession(context, page, "doctor", "light");
			await page.goto("http://127.0.0.1:5173/?demo=true&sanpin=1#sanpin", { waitUntil: "domcontentloaded", timeout: 45000 });
			await waitForRealUI(page);
			await sleep(600);
			await setTheme(page, "light");
			await openSanpinModal(page);
			await suppressOverlays(page);
			await sleep(500);

			const targetFile = path.join(OUT_DOCS, "03_sanpin_studio_mobile_light_390x844.png");
			await page.screenshot({ path: targetFile, fullPage: false });
			const convTarget = path.join(OUT_CONV, "03_sanpin_studio_mobile_light_390x844.png");
			copyFileSync(targetFile, convTarget);

			const sz = statSync(targetFile).size;
			console.log(`  [SAVED] ${targetFile} (${Math.round(sz / 1024)} KB)`);
			await context.close();
		}

		// --- MOBILE DARK (390x844) ---
		{
			console.log("\n[STATE 4/4] Capturing SanPiN Mobile Dark (390x844)...");
			const context = await browser.newContext({
				viewport: { width: 390, height: 844 },
				deviceScaleFactor: 2,
				isMobile: true,
				hasTouch: true,
			});
			const page = await context.newPage();
			await setupPageSession(context, page, "doctor", "dark");
			await page.goto("http://127.0.0.1:5173/?demo=true&sanpin=1#sanpin", { waitUntil: "domcontentloaded", timeout: 45000 });
			await waitForRealUI(page);
			await sleep(600);
			await setTheme(page, "dark");
			await openSanpinModal(page);
			await suppressOverlays(page);
			await sleep(500);

			const targetFile = path.join(OUT_DOCS, "04_sanpin_studio_mobile_dark_390x844.png");
			await page.screenshot({ path: targetFile, fullPage: false });
			const convTarget = path.join(OUT_CONV, "04_sanpin_studio_mobile_dark_390x844.png");
			copyFileSync(targetFile, convTarget);

			const sz = statSync(targetFile).size;
			console.log(`  [SAVED] ${targetFile} (${Math.round(sz / 1024)} KB)`);
			await context.close();
		}

		console.log("\n=== ALL 4 SANPIN STATES CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("CAPTURE SANPIN FAILED:", err);
	process.exit(1);
});
