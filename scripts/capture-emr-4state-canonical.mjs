/**
 * scripts/capture-emr-4state-canonical.mjs
 * Red Team 4-State Visual Proof Capture for EMR & Medical Record Studio Modal:
 * 1. ☀️ PC Light (1440x900): docs/screenshots/emr/01_emr_studio_pc_light_1440x900.png
 * 2. 🌙 PC Dark (1440x900): docs/screenshots/emr/02_emr_studio_pc_dark_1440x900.png
 * 3. 📱 Mobile Light (390x844): docs/screenshots/emr/03_emr_studio_mobile_light_390x844.png
 * 4. 🌙 Mobile Dark (390x844): docs/screenshots/emr/04_emr_studio_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONV_ID = process.env.CONV_ID || "25e34528-ec30-4e83-8f18-0fd75d18cc19";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots/emr`;
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/emr");
const OUT_SCREENSHOTS = path.resolve(__dirname, "../docs/screenshots/emr");

for (const d of [OUT_DOCS, OUT_CONV, OUT_SCREENSHOTS]) {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
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

async function openEmrModal(page) {
	console.log("  [EMR] Opening Medical Record Studio Modal...");
	await page.waitForSelector(".boot-subtitle", { state: "detached", timeout: 25000 }).catch(() => {});
	await page.evaluate(() => {
		if (!document.querySelector(".emr-studio-window, .emr043-modal-window")) {
			window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
			window.location.hash = "medical-card";
		}
	});
	await sleep(1000);

	const modal = page.locator(".emr-studio-window, .emr043-modal-window, .emr-studio-backdrop, .emr043-modal-backdrop").first();
	const isVisible = await modal.isVisible({ timeout: 4000 }).catch(() => false);
	if (!isVisible) {
		console.log("  [EMR] Trying direct event dispatch...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-emr"));
			window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
		});
		await sleep(1000);
	}
	await modal.waitFor({ state: "visible", timeout: 25000 });
	console.log("  [EMR] Modal is visible!");

	const diariesTab = page.locator("button:has-text('Дневники визитов'), button:has-text('Дневники'), button:has-text('4. Дневники визитов')").first();
	if (await diariesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
		await diariesTab.click();
		await sleep(600);
	}
}

async function run() {
	console.log("=== STARTING CANONICAL 4-STATE EMR PROOF CAPTURE ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();
		await setupPageSession(context, page, "doctor");
		console.log("Navigating to http://127.0.0.1:5173/?demo=true#medical-card ...");
		await page.goto("http://127.0.0.1:5173/?demo=true#medical-card", { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitForRealUI(page);
		await openEmrModal(page);
		await suppressOverlays(page);

		const states = [
			{ name: "01_emr_studio_pc_light_1440x900.png", width: 1440, height: 900, theme: "light" },
			{ name: "02_emr_studio_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark" },
			{ name: "03_emr_studio_mobile_light_390x844.png", width: 390, height: 844, theme: "light" },
			{ name: "04_emr_studio_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark" },
		];

		for (const s of states) {
			console.log(`\nCapturing ${s.name} (${s.width}x${s.height}, ${s.theme})...`);
			await page.setViewportSize({ width: s.width, height: s.height });
			await setTheme(page, s.theme);
			await sleep(800);

			const targetFile = path.join(OUT_DOCS, s.name);
			await page.screenshot({ path: targetFile, fullPage: false });
			const convTarget = path.join(OUT_CONV, s.name);
			copyFileSync(targetFile, convTarget);
			copyFileSync(targetFile, path.join(OUT_SCREENSHOTS, s.name));

			const sz = statSync(targetFile).size;
			console.log(`  [SAVED] ${targetFile} (${Math.round(sz / 1024)} KB)`);
		}

		console.log("\n=== ALL 4 STATES CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("CAPTURE FAILED:", err);
	process.exit(1);
});
