import { statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/frontend_state");
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureLoggedIn(page) {
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
				await sleep(500);
				const submitBtn = await page.$('button[type="submit"]');
				if (submitBtn) {
					await submitBtn.click();
					await sleep(3000);
				}
			}
		}
	} catch (e) {
		console.log("[Auth] Notice:", e.message);
	}
}

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

async function run() {
	console.log("=== Capturing Dark Odontogram and Omnibar HUD Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	// 1. Capture 02_odontogram_pc_dark_1440x900.png with formula tab active
	{
		console.log("\n>>> Capturing 02_odontogram_pc_dark_1440x900.png...");
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageContext(context, "dark");
		const page = await context.newPage();

		await page.goto(`${WEB_URL}/?demo=true#patient-studio`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
		await sleep(2500);

		await ensureLoggedIn(page);

		try {
			const fallbackBtn = await page.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
			if (fallbackBtn) {
				await fallbackBtn.click();
				await sleep(2000);
			}
		} catch (_) {}

		await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});

		const modal = await page.$('[data-testid="patient-studio-modal"]');
		if (!modal) {
			console.log("[Studio] Dispatching dente:open-patient-studio...");
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
			});
			await sleep(2000);
		}

		await page.waitForSelector('[data-testid="patient-studio-modal"]', { timeout: 15000 });
		const formulaTab = page.locator('[data-testid="tab-patient-formula"]').first();
		if (await formulaTab.count() > 0) {
			console.log("[Studio] Clicking tab-patient-formula...");
			await formulaTab.click({ force: true });
			await sleep(1500);
		}

		await preparePageThemeAndOverlays(page, "dark");

		const outPath = path.join(OUT_DIR, "02_odontogram_pc_dark_1440x900.png");
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
		const sz = statSync(outPath).size;
		console.log(`Saved 02_odontogram_pc_dark_1440x900.png: ${Math.round(sz / 1024)} KB (${sz} bytes)`);

		await context.close();
	}

	// 2. Capture Omnibar PC Light and PC Dark
	for (const theme of ["light", "dark"]) {
		const filename = theme === "light" ? "03_omnibar_pc_light_1440x900.png" : "04_omnibar_pc_dark_1440x900.png";
		console.log(`\n>>> Capturing ${filename} (${theme})...`);
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageContext(context, theme);
		const page = await context.newPage();

		await page.goto(`${WEB_URL}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
		await sleep(2500);

		await ensureLoggedIn(page);

		try {
			const fallbackBtn = await page.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
			if (fallbackBtn) {
				await fallbackBtn.click();
				await sleep(2000);
			}
		} catch (_) {}

		await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});

		// Open Omnibar via Ctrl+k or event
		await page.keyboard.press("Control+k");
		await sleep(800);

		const searchInput = page.locator('input[placeholder*="Поиск"], input.omnibar-search-input, [data-testid="omnibar-input"], [aria-label*="Поиск"]').first();
		if (await searchInput.count() > 0) {
			await searchInput.click();
			await searchInput.fill("Иван");
			await sleep(1000);
		} else {
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-command-hud"));
			});
			await sleep(800);
		}

		await preparePageThemeAndOverlays(page, theme);

		const outPath = path.join(OUT_DIR, filename);
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
		const sz = statSync(outPath).size;
		console.log(`Saved ${filename}: ${Math.round(sz / 1024)} KB (${sz} bytes)`);

		await context.close();
	}

	await browser.close();
	console.log("\n=== ALL REFINED CAPTURES COMPLETE ===");
}

run().catch((e) => {
	console.error("FATAL ERROR:", e);
	process.exit(1);
});
