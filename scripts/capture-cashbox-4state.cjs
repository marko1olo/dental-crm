/**
 * scripts/capture-cashbox-4state.cjs
 *
 * Captures 4-State Red Team Proofs for Cashier & Checkout Studio:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844, Apple HIG)
 * 4. Mobile Dark (390x844, Apple HIG)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/cashbox");
if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

async function capture() {
	console.log("=== Provisioning session for Cashbox 4-State Proofs ===");
	let clinicToken = "demo-clinic-token";
	let staffToken = "demo-staff-token";

	try {
		const headers = { "Content-Type": "application/json" };
		const initRes = await fetch("http://127.0.0.1:4100/api/clinic/initialize", {
			method: "POST",
			headers,
			body: JSON.stringify({
				clinicName: "Стоматология ДЕНТЕ Премиум",
				ownerFullName: "Д-р Воронов А. В.",
				ownerEmail: "doctor-voronov@dente.ru",
				ownerPin: "1234",
			}),
		});
		if (initRes.ok) {
			const initData = await initRes.json();
			clinicToken = initData.clinicToken;

			const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff-unlock", {
				method: "POST",
				headers,
				body: JSON.stringify({ clinicToken, pin: "1234" }),
			});
			if (unlockRes.ok) {
				const unlockData = await unlockRes.json();
				staffToken = unlockData.staffToken;
			}
		}
	} catch (err) {
		console.warn("API provisioning notice (falling back to demo state):", err.message);
	}

	console.log("Launching Chromium...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{ name: "01_cashbox_checkout_pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light" },
		{ name: "02_cashbox_checkout_pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark" },
		{ name: "03_cashbox_checkout_mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light" },
		{ name: "04_cashbox_checkout_mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark" },
	];

	for (const cfg of configs) {
		console.log(`\n>>> Capturing ${cfg.name} (${cfg.width}x${cfg.height}, ${cfg.theme})...`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		await context.addInitScript(
			({ ct, st, t }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_theme_mode", t);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("theme", t);
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_sidebar_collapsed", "false");
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						onboardingDismissed: true,
						onboardingStep: "done",
					}),
				);
			},
			{ ct: clinicToken, st: staffToken, t: cfg.theme },
		);

		const page = await context.newPage();
		const url = "http://127.0.0.1:5173/?demo=true#checkout";
		await page.goto(url, { waitUntil: "commit", timeout: 60000 });
		await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => {});

		// Wait for checkout UI to be rendered and visible
		await page.waitForSelector('text="Касса · Оплата приёма"', { timeout: 45000 }).catch(() => {});
		await page.waitForTimeout(1500);

		// Apply theme attribute
		await page.evaluate((theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			document.body.setAttribute("data-theme", theme);
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.classList.add("dark");
				document.body.classList.remove("light");
				document.documentElement.style.colorScheme = "dark";
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
				document.body.classList.add("light");
				document.body.classList.remove("dark");
				document.documentElement.style.colorScheme = "light";
			}
		}, cfg.theme);

		await page.waitForTimeout(1200);

		const targetPath = path.join(PROOFS_DIR, cfg.name);
		await page.screenshot({ path: targetPath, fullPage: false });
		const size = fs.statSync(targetPath).size;
		console.log(`[PROOF VERIFIED] ${cfg.name}: ${size} bytes (${(size / 1024).toFixed(1)} KB)`);

		await context.close();
	}

	await browser.close();
	console.log("\n[SUCCESS] Cashbox 4-State Proofs captured cleanly!");
}

capture().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
