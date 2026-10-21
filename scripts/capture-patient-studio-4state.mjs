import { mkdirSync, statSync } from "node:fs";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patient-studio";
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureLoggedInAndOnPatients(page, isMobile = false) {
	await sleep(2500);

	// Check for offline/fallback banner button
	try {
		const offlineBtn = await page.$('button:has-text("Перейти в автономный режим")');
		if (offlineBtn) {
			await offlineBtn.click();
			await sleep(1500);
		}
	} catch (_) {}

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
				await sleep(3500);
			}
		}
	}

	await page.evaluate(() => {
		window.location.hash = "patients";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(2000);

	// Check again for fallback button if server slow
	try {
		const offlineBtn = await page.$('button:has-text("Перейти в автономный режим")');
		if (offlineBtn) {
			await offlineBtn.click();
			await sleep(1500);
		}
	} catch (_) {}

	// Click first patient in list (e.g. Смирнова Анна Сергеевна)
	try {
		const patientRow = await page.$(
			'[data-patient-id], [data-testid^="patient-row-"], .patient-row, tr[data-id], div:has-text("Смирнова Анна")'
		);
		if (patientRow) {
			console.log("[Patient] Clicking patient item...");
			await patientRow.click();
			await sleep(1500);
		}
	} catch (_) {}
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
		localStorage.setItem("theme", th);

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
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.head.appendChild(style);
	}, theme);
	await sleep(800);
}

async function capture() {
	console.log("=== Launching Chrome for Patient Studio 4-State Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const states = [
		{ name: "patient_studio_pc_light_1440x900", width: 1440, height: 900, theme: "light", isMobile: false },
		{ name: "patient_studio_pc_dark_1440x900", width: 1440, height: 900, theme: "dark", isMobile: false },
		{ name: "patient_studio_mobile_light_390x844", width: 390, height: 844, theme: "light", isMobile: true },
		{ name: "patient_studio_mobile_dark_390x844", width: 390, height: 844, theme: "dark", isMobile: true },
	];

	for (const state of states) {
		console.log(`[Capture] Starting ${state.name} (${state.width}x${state.height}, ${state.theme})...`);
		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();
		try {
			await page.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "domcontentloaded", timeout: 15000 });
		} catch (e) {
			console.warn("[Capture] goto notice:", e.message);
		}

		await ensureLoggedInAndOnPatients(page, state.isMobile);
		await preparePage(page, state.theme);

		const outPath = `${OUT_DIR}/${state.name}.png`;
		await page.screenshot({ path: outPath, fullPage: false });
		const sz = statSync(outPath).size;
		console.log(`[Capture] Saved: ${outPath} (${sz} bytes)`);

		await context.close();
		await sleep(500);
	}

	await browser.close();
	console.log("=== All 4 Patient Studio states successfully captured! ===");
}

capture().catch((err) => {
	console.error("[Capture] Error:", err);
	process.exit(1);
});
