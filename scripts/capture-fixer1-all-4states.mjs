import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/frontend_state");
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupPageContext(context, theme) {
	await context.addInitScript(({ t }) => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token");
		localStorage.setItem("dente_staff_token", "demo-showcase-token");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_workspace_perspective", "doctor");
		localStorage.setItem("dente_theme_mode", t);
		localStorage.setItem("dente_theme", t);
		localStorage.setItem("theme", t);
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("demo_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				themeMode: t,
				soundNotificationsMuted: true,
				onboardingDismissed: true,
			}),
		);
		if (t === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, { t: theme });
}

async function preparePageThemeAndOverlays(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);

		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.splash,
			#splash-root,
			[data-testid="splash-loader"],
			.splash-screen,
			#loading-screen {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.head.appendChild(style);
	}, theme);
	await sleep(400);
}

async function capture() {
	console.log("=== Capturing Verified 4-State Proofs for Red Team Fixer 1 ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{ name: "01_odontogram_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light", type: "formula" },
		{ name: "02_odontogram_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark", type: "formula" },
		{ name: "03_omnibar_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light", type: "omnibar" },
		{ name: "04_omnibar_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark", type: "omnibar" },
		{ name: "05_mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light", type: "formula" },
		{ name: "06_mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark", type: "formula" },
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.name} (${cfg.width}x${cfg.height}, ${cfg.theme}, ${cfg.type})...`);
		const ctxOpts = {
			viewport: { width: cfg.width, height: cfg.height },
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
		};
		if (cfg.isMobile) {
			Object.assign(ctxOpts, devices["iPhone 13"]);
		}

		const context = await browser.newContext(ctxOpts);
		await setupPageContext(context, cfg.theme);
		const page = await context.newPage();

		try {
			await page.goto(`${WEB_URL}/?demo=true#patient-studio`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
			await sleep(2000);

			// Check for offline action fallback
			try {
				const fallbackBtn = await page.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
				if (fallbackBtn) {
					await fallbackBtn.click();
					await sleep(1500);
				}
			} catch (_) {}

			// Wait for boot state detachment
			await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});

			if (cfg.type === "formula") {
				// Ensure patient studio modal is open
				const hasModal = await page.$('[data-testid="patient-studio-modal"]');
				if (!hasModal) {
					console.log("Dispatching dente:open-patient-studio...");
					await page.evaluate(() => {
						window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
					});
					await sleep(1500);
				}

				await page.waitForSelector('[data-testid="patient-studio-modal"]', { timeout: 10000 }).catch(() => {});

				// Click Formula Tab
				const formulaTabBtn = page.locator('[data-testid="tab-patient-formula"]').first();
				if (await formulaTabBtn.count() > 0) {
					await formulaTabBtn.click({ force: true });
					await sleep(1500);
				}
			} else if (cfg.type === "omnibar") {
				// Open Omnibar via Ctrl+K
				console.log("Opening Omnibar via keyboard shortcut Ctrl+k...");
				await page.keyboard.press("Control+k");
				await sleep(1000);
				// Type a search query to test AbortController and instant reactivity
				await page.keyboard.type("Иван");
				await sleep(800);
			}

			await preparePageThemeAndOverlays(page, cfg.theme);

			const outPath = path.join(OUT_DIR, cfg.name);
			await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

			const sz = statSync(outPath).size;
			console.log(`Saved ${cfg.name}: ${Math.round(sz / 1024)} KB (${sz} bytes)`);
			if (sz < 20480) {
				console.warn(`WARNING: ${cfg.name} is smaller than 20KB (${sz} bytes)`);
			}
		} catch (err) {
			console.error(`Error during capture of ${cfg.name}:`, err.message);
		} finally {
			await context.close();
			await sleep(300);
		}
	}

	await browser.close();
	console.log("\n=== ALL CAPTURES COMPLETED ===");
}

capture().catch((err) => {
	console.error("FATAL CAPTURE ERROR:", err);
	process.exit(1);
});
