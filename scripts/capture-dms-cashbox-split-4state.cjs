/**
 * scripts/capture-dms-cashbox-split-4state.cjs
 *
 * Canonical 4-State Visual Proofs Generator for DMS Cashbox Split & Guarantee Letters.
 * Single-Page, Viewport Transition, Zero-Reload Pipeline.
 *
 * Mandates:
 * - 8al: 4-State Visual Proof (PC Light/Dark 1440x900, Mobile Light/Dark 390x844).
 * - 8am: 1 Primary CTA, no uppercase, proper alignment.
 * - 8ze: Apple HIG mobile ergonomics (bottom sheet, 44x44px touch targets).
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5173/?stand=cashbox&demo=true#checkout";
const PROOFS_CASHBOX = path.resolve("docs/proofs/cashbox");
const PROOFS_INSURANCE = path.resolve("docs/proofs/insurance");

for (const d of [PROOFS_CASHBOX, PROOFS_INSURANCE]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			let style = document.getElementById("clean-proof-style");
			if (!style) {
				style = document.createElement("style");
				style.id = "clean-proof-style";
				style.innerHTML = `
					.tour-spotlight-root,
					.tour-backdrop-clickable-zone,
					[data-testid="guided-tour-spotlight-overlay"],
					[data-testid="guided-tour-coach-mark-card"],
					[data-testid="demo-mode-banner"],
					.global-toast-container,
					.sa-toast,
					[data-testid="global-toast"],
					vite-error-overlay {
						display: none !important;
						pointer-events: none !important;
					}
				`;
				document.head.appendChild(style);
			}
			document.querySelectorAll(".sa-toast, [data-testid='global-toast'], .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
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
			document.documentElement.style.colorScheme = "dark";
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.style.colorScheme = "light";
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(500);
}

async function captureProof(page, filename) {
	await suppressOverlays(page);
	await page.waitForTimeout(400);

	const outPathCashbox = path.join(PROOFS_CASHBOX, filename);
	const outPathInsurance = path.join(PROOFS_INSURANCE, filename);

	await page.screenshot({ path: outPathCashbox, fullPage: false, animations: "disabled" });
	fs.copyFileSync(outPathCashbox, outPathInsurance);

	const stat = fs.statSync(outPathCashbox);
	const sizeKb = (stat.size / 1024).toFixed(1);
	console.log(`  -> Captured: ${filename} (${sizeKb} KB)`);
	if (stat.size < 20480) {
		throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 20 KB)`);
	}
}

async function main() {
	console.log("=== Launching browser for DMS Cashbox Split 4-State Proofs ===");

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	};
	if (fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")) {
		launchOptions.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	}
	const browser = await chromium.launch(launchOptions);

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			locale: "ru-RU",
		});

		await context.addInitScript(() => {
			try {
				localStorage.setItem("dente_clinic_token", "demo_clinic_token");
				localStorage.setItem("dente_staff_token", "demo_staff_token");
				localStorage.setItem("dente_active_role", "cashier");
				localStorage.setItem("dente_theme_mode", "light");
				localStorage.setItem("dente_theme", "light");
				localStorage.setItem("theme", "light");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_mode", "true");
				localStorage.setItem("demo_mode", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dente_sidebar_collapsed", "false");
				localStorage.setItem(
					"dente_staff_session",
					JSON.stringify({
						userId: "usr-cashier-01",
						name: "Кассир Воронова С. Н.",
						role: "cashier",
						roleScope: "clinical_director",
					}),
				);
			} catch (_) {}
		});

		const page = await context.newPage();
		console.log(`  -> Navigating to ${WEB_URL}...`);
		await page.goto(WEB_URL, { waitUntil: "commit", timeout: 45000 });

		console.log("  -> Waiting for cashbox modal selector...");
		await page.waitForSelector(
			'[data-testid="cash-register-checkout-modal"], [data-testid="cash-register-studio-modal"]',
			{ state: "visible", timeout: 30000 },
		);

		await suppressOverlays(page);

		console.log("  -> Dispatching dente:cashbox-apply-split...");
		await page.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente:cashbox-apply-split", {
					detail: {
						totalDueRub: 10000,
						dmsRub: 8000,
						patientRub: 2000,
						patientCopayRub: 2000,
						insurerName: "СОГАЗ Мед Страхование",
						letterNumber: "ГП-2026/0481",
						letterId: "letter-demo-1",
						patientMethod: "card",
						patientCardRub: 2000,
						patientCashRub: 0,
					},
				}),
			);
		});
		await page.waitForTimeout(600);
		await suppressOverlays(page);

		// ----------------------------------------------------
		// 1. PC Light (1440x900)
		// ----------------------------------------------------
		console.log("\n--- Phase 1: PC Light (1440x900) ---");
		await setTheme(page, "light");
		await captureProof(page, "01_dms_cashbox_split_pc_light_1440x900.png");

		// ----------------------------------------------------
		// 2. PC Dark (1440x900)
		// ----------------------------------------------------
		console.log("\n--- Phase 2: PC Dark (1440x900) ---");
		await setTheme(page, "dark");
		await captureProof(page, "02_dms_cashbox_split_pc_dark_1440x900.png");

		// ----------------------------------------------------
		// 3. Mobile Light (390x844)
		// ----------------------------------------------------
		console.log("\n--- Phase 3: Mobile Light (390x844) ---");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => window.dispatchEvent(new Event("resize")));
		await page.waitForTimeout(800);
		await setTheme(page, "light");
		await captureProof(page, "03_dms_cashbox_split_mobile_light_390x844.png");

		// ----------------------------------------------------
		// 4. Mobile Dark (390x844)
		// ----------------------------------------------------
		console.log("\n--- Phase 4: Mobile Dark (390x844) ---");
		await setTheme(page, "dark");
		await captureProof(page, "04_dms_cashbox_split_mobile_dark_390x844.png");

		await context.close();
		console.log("\n>>> ALL 4 CANONICAL DMS CASHBOX SPLIT PROOFS CAPTURED SUCCESSFULLY <<<");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
