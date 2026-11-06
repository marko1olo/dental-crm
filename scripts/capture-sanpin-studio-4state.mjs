/**
 * scripts/capture-sanpin-studio-4state.mjs
 * Red Team 4-State Visual Proof Capture for SanpinStudioModal:
 * 1. ☀️ PC Light (1440x900) -> docs/proofs/sanpin/01_sanpin_studio_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900) -> docs/proofs/sanpin/02_sanpin_studio_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844) -> docs/proofs/sanpin/03_sanpin_studio_mobile_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844) -> docs/proofs/sanpin/04_sanpin_studio_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = process.env.CONVERSATION_ID || "c5db1ba9-d110-4a0b-b18b-29db63aea1f8";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/sanpin`;
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/sanpin");
const OUT_SCREENSHOTS = path.resolve(__dirname, "../docs/screenshots/sanpin");

for (const dir of [OUT_DOCS, OUT_CONV, OUT_SCREENSHOTS]) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
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
		await loginBtn.click();
		await sleep(1500);
	}

	const demoBtn = page.locator(".auth-demo-btn");
	if (await demoBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
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

	try {
		await page.waitForFunction(
			() => {
				const text = document.body.innerText || "";
				const isLoading = text.includes("Загрузка системы") || text.includes("Подготовка модулей");
				if (isLoading) return false;
				return (
					document.querySelector('[data-testid="sanpin-studio-modal"]') ||
					document.querySelector(".sanpin-studio-backdrop") ||
					document.querySelector(".workspace-shell") ||
					document.querySelector(".topbar") ||
					document.querySelector("nav")
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
	const modal = page.locator('[data-testid="sanpin-studio-modal"], .sanpin-studio-backdrop').first();
	for (let i = 0; i < 10; i++) {
		if (await modal.isVisible().catch(() => false)) return;
		await page.evaluate(() => {
			window.location.hash = "sanpin";
			window.dispatchEvent(new CustomEvent("dente:open-sanpin"));
			window.dispatchEvent(new CustomEvent("dente:open-autoclave"));
			window.dispatchEvent(new CustomEvent("dente:open-sanpin-studio"));
		});
		await sleep(1000);
	}
	await modal.waitFor({ state: "visible", timeout: 20000 });
}

async function captureAndSave(page, filename) {
	const modal = page.locator('[data-testid="sanpin-studio-modal"], .sanpin-studio-backdrop').first();
	const isVisible = await modal.isVisible().catch(() => false);
	if (!isVisible) {
		throw new Error(`Sanpin modal is NOT visible before capturing ${filename}! Refusing to take fake screenshot.`);
	}
	const targetPath = path.join(OUT_DOCS, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	copyFileSync(targetPath, path.join(OUT_CONV, filename));
	copyFileSync(targetPath, path.join(OUT_SCREENSHOTS, filename));
	const sz = statSync(targetPath).size;
	console.log(`  [SAVED] ${filename} (${Math.round(sz / 1024)} KB)`);
	if (sz < 20480) {
		throw new Error(`Screenshot ${filename} is smaller than 20KB (${sz} bytes). Blank screen suspected!`);
	}
}

async function run() {
	console.log("=== STARTING CANONICAL 4-STATE SANPIN STUDIO PROOF CAPTURE ===");
	const browser = await chromium.launch({
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--font-render-hinting=none"],
	});

	try {
		// 1. ☀️ PC Light (1440x900)
		{
			console.log("\n[STATE 1/4] Capturing SanPiN PC Light (1440x900)...");
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
			});
			const page = await context.newPage();
			await setupPageSession(context, page, "doctor", "light");
			await page.goto("http://127.0.0.1:5173/?demo=true&sanpin=1#sanpin", { waitUntil: "commit", timeout: 60000 });
			await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
			await waitForRealUI(page);
			await setTheme(page, "light");
			await openSanpinModal(page);
			await suppressOverlays(page);
			await sleep(600);

			await captureAndSave(page, "01_sanpin_studio_pc_light_1440x900.png");
			await context.close();
		}

		// 2. 🌙 PC Dark (1440x900)
		{
			console.log("\n[STATE 2/4] Capturing SanPiN PC Dark (1440x900)...");
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
			});
			const page = await context.newPage();
			await setupPageSession(context, page, "doctor", "dark");
			await page.goto("http://127.0.0.1:5173/?demo=true&sanpin=1#sanpin", { waitUntil: "commit", timeout: 60000 });
			await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
			await waitForRealUI(page);
			await setTheme(page, "dark");
			await openSanpinModal(page);
			await suppressOverlays(page);
			await sleep(600);

			await captureAndSave(page, "02_sanpin_studio_pc_dark_1440x900.png");
			await context.close();
		}

		// 3. 📱 Mobile Light (390x844) & 4. 🌙 Mobile Dark (390x844)
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
			await page.goto("http://127.0.0.1:5173/?demo=true&sanpin=1#sanpin", { waitUntil: "commit", timeout: 60000 });
			await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
			await waitForRealUI(page);
			await setTheme(page, "light");
			await openSanpinModal(page);
			await suppressOverlays(page);
			await sleep(600);

			await captureAndSave(page, "03_sanpin_studio_mobile_light_390x844.png");

			console.log("\n[STATE 4/4] Capturing SanPiN Mobile Dark (390x844)...");
			await setTheme(page, "dark");
			await suppressOverlays(page);
			await sleep(600);
			await captureAndSave(page, "04_sanpin_studio_mobile_dark_390x844.png");

			await context.close();
		}

		console.log("\n=== ALL 4 SANPIN STUDIO PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("CAPTURE SANPIN STUDIO PROOFS FAILED:", err);
	process.exit(1);
});
