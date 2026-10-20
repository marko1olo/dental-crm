import { mkdirSync, statSync } from "node:fs";
import { chromium } from "playwright";

const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/documents";
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(OUT_DOCS, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureLoggedInAndOnDocuments(page) {
	await sleep(3500);
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
				await sleep(4500);
			}
		}
	}

	await page.evaluate(() => {
		window.location.hash = "documents";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
	await sleep(2500);

	try {
		const docBtn = await page.$('[data-view="documents"], a[href="#documents"], [data-testid="nav-documents"], button[title*="Документы"]');
		if (docBtn) {
			await docBtn.click();
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
	console.log("=== Launching Chrome for Documents 4-State Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const states = [
		{ name: "documents_catalog_pc_light", width: 1440, height: 900, theme: "light", isMobile: false },
		{ name: "documents_catalog_pc_dark", width: 1440, height: 900, theme: "dark", isMobile: false },
		{ name: "documents_catalog_mobile_light", width: 390, height: 844, theme: "light", isMobile: true },
		{ name: "documents_catalog_mobile_dark", width: 390, height: 844, theme: "dark", isMobile: true },
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
			await page.goto(`${WEB_URL}/?demo=true#documents`, { waitUntil: "load", timeout: 20000 });
		} catch (e) {
			console.warn("[Capture] goto notice:", e.message);
		}

		await ensureLoggedInAndOnDocuments(page);
		await preparePage(page, state.theme);

		const visibleText = await page.evaluate(() => document.body.innerText.slice(0, 300));
		console.log(`[Capture] Body text snippet on ${state.name}:\n${visibleText.replace(/\n+/g, " ")}`);

		const outPath = `${OUT_DOCS}/${state.name}.png`;
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
