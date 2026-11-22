const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_SHIFT = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/shift");

async function captureJournal() {
	console.log("=== Capturing Shift Journal PC Proofs ===");

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const configs = [
		{
			id: "09_shift_journal_pc_light",
			path: path.join(PROOFS_SHIFT, "09_shift_journal_pc_light_1440x900.png"),
			theme: "light",
		},
		{
			id: "10_shift_journal_pc_dark",
			path: path.join(PROOFS_SHIFT, "10_shift_journal_pc_dark_1440x900.png"),
			theme: "dark",
		},
	];

	for (const cfg of configs) {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
		});

		await context.addInitScript(({ t }) => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-cashier");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-cashier");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-cashier");
			localStorage.setItem("dente_active_role", "admin");
			localStorage.setItem("dente_user_role", "admin");
			localStorage.setItem("dente_role", "admin");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_theme_mode", t);
			localStorage.setItem("dente_theme", t);
			localStorage.setItem("theme", t);
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("demo_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
		}, { t: cfg.theme });

		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?stand=shift&demo=true#shift-journal", { waitUntil: "commit", timeout: 30000 });

		await page.waitForTimeout(1500);

		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			document.body.setAttribute("data-theme", th);
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		}, cfg.theme);

		await page.waitForTimeout(500);
		const buffer = await page.screenshot({ fullPage: false });
		fs.writeFileSync(cfg.path, buffer);
		console.log(`[SAVED] ${cfg.path} (${buffer.length} bytes)`);
		await context.close();
	}

	await browser.close();
}

captureJournal().catch(console.error);
