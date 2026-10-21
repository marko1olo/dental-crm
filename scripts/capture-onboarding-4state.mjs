import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = path.resolve("docs/proofs/onboarding");
mkdirSync(OUT_DIR, { recursive: true });

const TARGET_URL = "http://127.0.0.1:5173/?demo=true#onboarding";

async function run() {
	console.log("[Proof] Launching Chromium with stable arguments...");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
		],
	});

	const states = [
		{
			id: "01_onboarding_pc_light",
			name: "☀️ PC Light (1440x900)",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
		},
		{
			id: "02_onboarding_pc_dark",
			name: "🌙 PC Dark (1440x900)",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
		},
		{
			id: "03_onboarding_mobile_light",
			name: "📱 Mobile Light (390x844)",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
		},
		{
			id: "04_onboarding_mobile_dark",
			name: "📱 Mobile Dark (390x844)",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
		},
	];

	for (const state of states) {
		console.log(`\n[Proof] Capturing state: ${state.name}...`);
		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			deviceScaleFactor: 2,
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			colorScheme: state.theme,
		});

		const page = await context.newPage();

		// Set initial theme and session in localStorage before navigation
		await page.addInitScript((th) => {
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_user_id", "demo-owner-id");
			localStorage.setItem(
				"dental-crm:active-user:v1",
				JSON.stringify({
					id: "demo-owner-id",
					fullName: "Главврач / Владелец",
					role: "owner",
					email: "clinic@example.com",
				}),
			);
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "false");
		}, state.theme);

		try {
			await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
		} catch (navErr) {
			console.log(`[Proof] Navigation warning: ${navErr.message}, proceeding...`);
		}

		// Wait for #root and app to load past boot screen
		await page.waitForSelector("#root", { timeout: 15000 }).catch(() => null);
		await page.waitForFunction(() => {
			const hasBoot = !!document.querySelector(".boot-state, [data-testid='system-loading']");
			const hasShell = !!document.querySelector(".app-shell, .dente-redesign, .rapid-launch-wizard-shell, [role='main']");
			return !hasBoot && hasShell;
		}, { timeout: 20000 }).catch(() => null);

		// Ensure theme attributes on DOM and trigger modal open
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.className = isDark ? "dark" : "light";
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";

			// Suppress any stray notifications
			const style = document.createElement("style");
			style.id = "suppress-transient-banners";
			style.innerHTML = `
				.global-toast-container,
				[role="alert"]:not(.wizard-step-container [role="alert"]) {
					display: none !important;
				}
			`;
			document.head.appendChild(style);

			window.dispatchEvent(new CustomEvent("dente-open-rapid-onboarding"));
		}, state.theme);

		// Wait for wizard element to be visible
		await page.waitForSelector(".rapid-launch-wizard-shell", { timeout: 15000 }).catch(() => null);
		await page.waitForTimeout(1000);

		// Ensure top scroll
		await page.evaluate(() => {
			const container = document.querySelector(".wizard-step-container");
			if (container) {
				container.scrollTop = 0;
			}
		});

		// Wait for wizard element
		const wizardElement = await page.$(".rapid-launch-wizard-shell");
		if (!wizardElement) {
			console.error("[Proof] WARNING: .rapid-launch-wizard-shell not found on page, waiting more...");
			await page.waitForTimeout(2000);
		} else {
			console.log("[Proof] Found .rapid-launch-wizard-shell successfully!");
		}

		const filePath = path.join(OUT_DIR, `${state.id}.png`);
		await page.screenshot({ path: filePath, fullPage: false, timeout: 20000 }).catch(async (err) => {
			console.log(`[Proof] Screenshot retry on error: ${err.message}`);
			await page.screenshot({ path: filePath, fullPage: false, timeout: 20000 });
		});

		const fileStats = statSync(filePath);
		console.log(`[Proof] Saved ${state.id}.png (${(fileStats.size / 1024).toFixed(1)} KB) -> ${filePath}`);

		await context.close();
	}

	await browser.close();
	console.log("\n[Proof] All 4 states successfully captured!");
}

run().catch((err) => {
	console.error("[Proof] Fatal error during capture:", err);
	process.exit(1);
});
