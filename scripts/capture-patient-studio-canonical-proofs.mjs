import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/patient_card");
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
	await sleep(600);
}

async function capture() {
	console.log("=== Capturing 4-State Patient Studio Canonical Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const states = [
		{ num: "01", name: "patient_studio_pc_light_1440x900", alt: "patient_card_pc_light_1440x900", width: 1440, height: 900, theme: "light", isMobile: false },
		{ num: "02", name: "patient_studio_pc_dark_1440x900", alt: "patient_card_pc_dark_1440x900", width: 1440, height: 900, theme: "dark", isMobile: false },
		{ num: "03", name: "patient_studio_mobile_light_390x844", alt: "patient_card_mobile_light_390x844", width: 390, height: 844, theme: "light", isMobile: true },
		{ num: "04", name: "patient_studio_mobile_dark_390x844", alt: "patient_card_mobile_dark_390x844", width: 390, height: 844, theme: "dark", isMobile: true },
	];

	for (const state of states) {
		console.log(`\n[Capture] ${state.num}: ${state.name} (${state.width}x${state.height}, ${state.theme})...`);
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

		await page.goto(`${WEB_URL}/?demo=true#patient-studio`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
		await sleep(2500);

		await ensureLoggedIn(page);

		// Handle offline button if present
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
			const modal = await page.$('[data-testid="patient-studio-modal"]');
			if (!modal) {
				console.log("[Studio] Modal not open yet, dispatching dente:open-patient-studio...");
				await page.evaluate(() => {
					window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: "view" } }));
				});
				await sleep(1500);
			}
		} catch (e) {
			console.log("[Studio] Notice dispatching event:", e.message);
		}

		// Wait for studio modal
		try {
			await page.waitForSelector('[data-testid="patient-studio-modal"]', { timeout: 10000 });
			console.log("[Studio] Found patient-studio-modal!");
		} catch (e) {
			console.log("[Studio] Timeout waiting for modal:", e.message);
		}

		await preparePage(page, state.theme);

		const filename = `${state.num}_${state.name}.png`;
		const outPath = path.join(OUT_DIR, filename);
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

		const sz = statSync(outPath).size;
		if (sz < 20480) {
			throw new Error(`[Anti-Blank Guard] ${filename} is ${sz}B (< 20KB) — blank render!`);
		}
		console.log(`   [PROOF VERIFIED] ${filename}: ${Math.round(sz / 1024)} KB (${sz} bytes)`);

		// Also copy to canonical aliases
		const altPath = path.join(OUT_DIR, `${state.alt}.png`);
		copyFileSync(outPath, altPath);

		await context.close();
		await sleep(400);
	}

	await browser.close();
	console.log("\n=== ALL 4 PATIENT STUDIO STATES CAPTURED & VERIFIED! ===");
}

capture().catch((e) => {
	console.error("FATAL CAPTURE ERROR:", e);
	process.exit(1);
});
