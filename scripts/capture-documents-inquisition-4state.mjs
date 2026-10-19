import { mkdirSync, statSync, existsSync } from "node:fs";
import { chromium } from "playwright";

const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/documents";
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!existsSync(OUT_DOCS)) {
	mkdirSync(OUT_DOCS, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureLoggedInAndOnDocuments(page) {
	await sleep(2500);

	// Bypass overlays and tours
	await page.evaluate(() => {
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
	});

	// If login screen is shown, log in
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
				await sleep(4000);
			}
		}
	}

	// Navigate to #documents
	await page.evaluate(() => {
		window.location.hash = "documents";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(1500);

	try {
		const docBtn = await page.$(
			'[data-view="documents"], a[href="#documents"], [data-testid="nav-documents"], button[title*="Документы"]',
		);
		if (docBtn) {
			await docBtn.click();
			await sleep(1500);
		}
	} catch (_) {}

	// If patient not selected in demo, choose first demo patient
	try {
		const patientSelectBtn = await page.$('[data-testid="btn-select-patient"], .patient-select-item, [data-testid^="patient-row-"]');
		if (patientSelectBtn) {
			await patientSelectBtn.click();
			await sleep(1000);
		}
	} catch (_) {}

	// Explicitly wait for DocumentsView to finish loading (resolving Suspense fallback)
	console.log("[Documents] Waiting for DocumentsView to mount...");
	try {
		await page.waitForFunction(
			() => {
				const hasCatalog = Boolean(document.querySelector('[data-testid="documents-catalog-view"]'));
				const hasMobileHub = Boolean(document.querySelector('[data-testid="mobile-documents-hub"]'));
				const hasDesktopExp = Boolean(document.querySelector('.desktop-documents-experience'));
				const isBusy = Boolean(document.querySelector('#documents[aria-busy="true"]'));
				return (hasCatalog || hasMobileHub || hasDesktopExp) && !isBusy;
			},
			{ timeout: 25000 },
		);
		console.log("[Documents] DocumentsView mounted successfully!");
	} catch (e) {
		console.warn("[Documents] Timeout waiting for DocumentsView selector, proceeding with current DOM state:", e.message);
	}
	await sleep(1200);
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
	await sleep(600);
}

async function capture() {
	console.log("=== Launching Chrome for Red Team Documents 4-State Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const states = [
		{
			filename: "documents_pc_light_1440x900.png",
			width: 1440,
			height: 900,
			theme: "light",
			isMobile: false,
		},
		{
			filename: "documents_pc_dark_1440x900.png",
			width: 1440,
			height: 900,
			theme: "dark",
			isMobile: false,
		},
		{
			filename: "documents_mobile_light_390x844.png",
			width: 390,
			height: 844,
			theme: "light",
			isMobile: true,
		},
		{
			filename: "documents_mobile_dark_390x844.png",
			width: 390,
			height: 844,
			theme: "dark",
			isMobile: true,
		},
	];

	for (const state of states) {
		console.log(
			`[Capture] Starting ${state.filename} (${state.width}x${state.height}, ${state.theme})...`,
		);
		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();
		let loaded = false;
		for (let attempt = 1; attempt <= 5; attempt++) {
			try {
				await page.goto(`${WEB_URL}/?demo=true#documents`, {
					waitUntil: "domcontentloaded",
					timeout: 15000,
				});
				loaded = true;
				break;
			} catch (e) {
				console.warn(`[Capture] goto attempt ${attempt} failed: ${e.message}, retrying in 2s...`);
				await sleep(2000);
			}
		}
		if (!loaded) {
			throw new Error("Failed to load page after 5 attempts");
		}

		await ensureLoggedInAndOnDocuments(page);
		await preparePage(page, state.theme);

		const outPath = `${OUT_DOCS}/${state.filename}`;
		await page.screenshot({ path: outPath, fullPage: false });
		const sz = statSync(outPath).size;
		console.log(`[Capture] Saved: ${outPath} (${sz} bytes)`);

		await context.close();
		await sleep(500);
	}

	await browser.close();
	console.log("[Capture] All 4 states successfully captured!");
}

capture().catch((err) => {
	console.error("[Capture] Error:", err);
	process.exit(1);
});
