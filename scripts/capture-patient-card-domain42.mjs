import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patient";
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(OUT_DIR, { recursive: true });

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

async function preparePage(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);

		let style = document.getElementById("suppress-all-overlays");
		if (!style) {
			style = document.createElement("style");
			style.id = "suppress-all-overlays";
			document.head.appendChild(style);
		}
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
			#loading-screen,
			.boot-state,
			.boot-subtitle,
			.global-toast-container,
			[role="alert"] {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
	}, theme);
	await sleep(600);
}

async function captureState(browser, state) {
	console.log(`\n--- Capturing ${state.name} (${state.width}x${state.height}, ${state.theme}) ---`);
	const ctxOpts = {
		viewport: { width: state.width, height: state.height },
		isMobile: state.isMobile,
		hasTouch: state.isMobile,
		deviceScaleFactor: 2,
	};
	if (state.isMobile) {
		Object.assign(ctxOpts, devices["iPhone 13"]);
	}

	const context = await browser.newContext(ctxOpts);
	const page = await context.newPage();

	await page.addInitScript(() => {
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem(
			"dental-crm:active-user:v1",
			JSON.stringify({
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
			}),
		);
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true }));
	});

	await page.goto(`${WEB_URL}/?demo=true#patient-studio`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
	await sleep(2000);

	await ensureLoggedIn(page);

	// Handle offline fallback if present
	try {
		const fallbackBtn = await page.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
		if (fallbackBtn) {
			console.log("[Boot] Clicking offline mode fallback...");
			await fallbackBtn.click();
			await sleep(2000);
		}
	} catch (_) {}

	// Trigger modal open if not already open
	try {
		const modal = await page.$('[data-testid="patient-studio-modal"], [data-testid="patient-card-modal"]');
		if (!modal) {
			console.log("[Studio] Modal not open, dispatching dente:open-patient-studio...");
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
			});
			await sleep(1500);
		}
	} catch (e) {
		console.log("[Studio] Notice dispatching event:", e.message);
	}

	// Try finding patient card or opening
	try {
		const modal = await page.waitForSelector('[data-testid="patient-studio-modal"], [data-testid="patient-card-modal"]', { timeout: 10000 });
		console.log("[Studio] Found patient modal!");
	} catch (e) {
		console.log("[Studio] Waiting for modal failed, clicking patient list row or open button...");
		const openCardBtn = page.locator('button:has-text("В карту"), [data-testid="patient-action-open-card"], [data-testid="btn-open-patient-card"]').first();
		if (await openCardBtn.count() > 0) {
			await openCardBtn.click({ force: true, timeout: 5000 });
			await sleep(1500);
		}
	}

	await preparePage(page, state.theme);
	await sleep(500);

	const outPath = path.join(OUT_DIR, state.file);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
	const size = statSync(outPath).size;
	console.log(`[Captured] ${outPath} (${size} bytes)`);
	if (size < 20480) {
		throw new Error(`Screenshot ${state.file} size (${size} bytes) < 20KB`);
	}

	await context.close();
}

async function run() {
	console.log("=== Capturing All 4-State Patient Card Proofs ===");
	let browser;
	try {
		browser = await chromium.launch({
			headless: true,
			executablePath: browserExecutable,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	} catch (e) {
		console.log("Fallback to bundled chromium:", e.message);
		browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	}

	const states = [
		{ name: "PC Light", file: "01_patient_card_modal_pc_light_1440x900.png", width: 1440, height: 900, theme: "light", isMobile: false },
		{ name: "PC Dark", file: "02_patient_card_modal_pc_dark_1440x900.png", width: 1440, height: 900, theme: "dark", isMobile: false },
		{ name: "Mobile Light", file: "03_patient_card_mobile_light_390x844.png", width: 390, height: 844, theme: "light", isMobile: true },
		{ name: "Mobile Dark", file: "04_patient_card_mobile_dark_390x844.png", width: 390, height: 844, theme: "dark", isMobile: true },
	];

	for (const state of states) {
		await captureState(browser, state);
	}

	await browser.close();
	console.log("\n=== All 4 Proofs Captured Successfully ===");
}

run().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
