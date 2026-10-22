/**
 * scripts/capture_marketing_honest_proofs.cjs
 *
 * Captures 4-State Red Team Visual Proof for Dental Marketing & ROMI Hub:
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 * Output directory: docs/proofs/marketing/
 */

const { chromium, devices } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outDir = path.resolve(__dirname, "../docs/proofs/marketing");
if (!fs.existsSync(outDir)) {
	fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setupContextAuthAndPreferences = async (context, theme) => {
	await context.addInitScript((th) => {
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_session_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_active_user_id", "demo-owner-id");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "demo-owner-id",
			fullName: "Главврач / Владелец",
			role: "owner",
			email: "owner@clinic.com",
		}));
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "owner",
			onboardingDismissed: true,
			onboardingStep: "done",
			theme: th,
		}));
	}, theme);
};

const ensureLoggedInAndOnMarketing = async (page) => {
	await sleep(2000);
	try {
		const hasPassword = await page.$('input[type="password"]');
		if (hasPassword) {
			console.log("[Auth] Found login form, logging in...");
			const inputs = await page.$$("input");
			if (inputs.length >= 2) {
				await inputs[0].click({ clickCount: 3 });
				await inputs[0].type("doctor@clinic.com");
				await inputs[1].click({ clickCount: 3 });
				await inputs[1].type("dente2026");
				await sleep(400);
				const submitBtn = await page.$('button[type="submit"]');
				if (submitBtn) {
					await submitBtn.click();
					await sleep(3500);
				}
			}
		}
	} catch (err) {
		console.log("[Auth note]:", err.message);
	}

	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setSelectedWorkspaceRole("owner");
			window.__useAppStore.getState().setCurrentView("marketing");
		}
		window.location.hash = "marketing";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(2000);
};

const applyThemeAndSuppressOverlays = async (page, theme) => {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);

		// Remove static boot splash if any exists in DOM
		const splash = document.getElementById("boot-splash");
		if (splash) splash.remove();

		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			#boot-splash,
			.boot-state {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation-duration: 0.01ms !important;
				animation-iteration-count: 1 !important;
				transition-duration: 0.01ms !important;
			}
		`;
		document.head.appendChild(style);
	}, theme);
	await sleep(800);
};

const saveAndVerifyShot = async (page, filename) => {
	const filePath = path.join(outDir, filename);
	await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
	const stat = fs.statSync(filePath);
	if (stat.size < 20480) {
		throw new Error(`[BYTE-GUARD FAILED]: ${filename} is only ${stat.size} bytes (<20KB)`);
	}
	console.log(`[PROOF VERIFIED]: ${filename} (${stat.size} bytes)`);
};

async function main() {
	console.log("=== Launching Playwright for Dental Marketing & ROMI 4-State Proofs ===");

	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
		],
	});

	const states = [
		{ name: "pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
		{ name: "pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
		{ name: "mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
		{ name: "mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
	];

	try {
		for (const state of states) {
			console.log(`\n[State] Capturing ${state.name} (${state.width}x${state.height}, ${state.theme}, mobile: ${state.isMobile})...`);

			const contextOptions = {
				viewport: { width: state.width, height: state.height },
			};
			if (state.isMobile) {
				Object.assign(contextOptions, devices["iPhone 13"]);
			}

			const context = await browser.newContext(contextOptions);
			await setupContextAuthAndPreferences(context, state.theme);
			const page = await context.newPage();

			page.on("pageerror", (err) => console.log(`[PAGE ERROR ${state.name}]:`, err.message));
			page.on("console", (msg) => {
				if (msg.type() === "error") console.log(`[CONSOLE ERR ${state.name}]:`, msg.text());
			});

			console.log(`[Nav] Navigating to http://127.0.0.1:5173/?demo=true#marketing ...`);
			await page.goto("http://127.0.0.1:5173/?demo=true#marketing", { waitUntil: "domcontentloaded", timeout: 60000 });
			await ensureLoggedInAndOnMarketing(page);
			await applyThemeAndSuppressOverlays(page, state.theme);

			// Explicitly wait until boot splash & "Загрузка системы..." & "Загрузка CRM" are completely gone
			// AND Marketing View is mounted with its header text
			console.log(`[Wait] Waiting for Marketing View to fully mount...`);
			await page.waitForFunction(() => {
				const text = document.body ? document.body.innerText : "";
				const hasSplash = document.getElementById("boot-splash");
				const hasBoot = document.querySelector(".boot-state");
				const hasLoading = document.querySelector(".loading-state");
				return !hasSplash && !hasBoot && !hasLoading &&
					   !text.includes("Загрузка системы") &&
					   !text.includes("Загрузка CRM") &&
					   (text.includes("Акции и реклама клиники") || document.querySelector("[data-testid='marketing-view']"));
			}, { timeout: 45000 });
			await sleep(1000);

			// Click ROMI tab to showcase comprehensive table & KPIs
			try {
				const romiTab = page.locator('[data-testid="tab-nav-romi"]').first();
				if ((await romiTab.count()) > 0 && (await romiTab.isVisible())) {
					await romiTab.click();
					await sleep(1200);
				}
			} catch (_) {}

			// Sync with CRM if button exists to display real/demo numbers
			try {
				const syncBtn = page.locator('[data-testid="romi-sync-crm-btn"]').first();
				if ((await syncBtn.count()) > 0 && (await syncBtn.isVisible())) {
					await syncBtn.click();
					await sleep(1000);
				}
			} catch (_) {}

			// Final sanity check before capturing screenshot
			await page.waitForFunction(() => {
				const text = document.body ? document.body.innerText : "";
				const hasSplash = document.getElementById("boot-splash");
				const hasLoading = document.querySelector(".loading-state");
				return !hasSplash && !hasLoading && !text.includes("Загрузка CRM") && !text.includes("Загрузка системы");
			}, { timeout: 15000 });
			await sleep(800);

			await saveAndVerifyShot(page, state.name);
			await context.close();
		}

		console.log("\n=======================================================");
		console.log(">>> ALL 4 SCREENSHOTS SUCCESSFULLY CAPTURED & VALIDATED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR capturing marketing proof:", err);
	process.exit(1);
});
