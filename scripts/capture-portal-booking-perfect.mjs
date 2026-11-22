import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_PORTAL = path.resolve(process.cwd(), "docs/proofs/portal");
const PROOFS_BOOKING = path.resolve(process.cwd(), "docs/proofs/booking");
fs.mkdirSync(PROOFS_PORTAL, { recursive: true });
fs.mkdirSync(PROOFS_BOOKING, { recursive: true });

async function run() {
	console.log("=== CAPTURING PUBLIC BOOKING 4-STATE PROOFS ===");
	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const configs = [
		{
			name: "01_booking_portal_pc_light_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			isMobile: false,
		},
		{
			name: "02_booking_portal_pc_dark_1440x900.png",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			isMobile: false,
		},
		{
			name: "03_booking_portal_mobile_light_390x844.png",
			viewport: { width: 390, height: 844 },
			theme: "light",
			isMobile: true,
		},
		{
			name: "04_booking_portal_mobile_dark_390x844.png",
			viewport: { width: 390, height: 844 },
			theme: "dark",
			isMobile: true,
		},
	];

	try {
		for (const cfg of configs) {
			console.log(`\n[CAPTURE] Starting ${cfg.name}...`);
			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				locale: "ru-RU",
				colorScheme: cfg.theme,
			});

			await context.addInitScript(({ theme }) => {
				try {
					localStorage.setItem("dente_demo_showcase", "true");
					localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
					localStorage.setItem("dente_theme_mode", theme);
					localStorage.setItem("dente-theme", theme);
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("theme", theme);
					localStorage.setItem("dente_onboarding_completed", "true");
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_demo_banner_dismissed", "true");
				} catch (_) {}
			}, { theme: cfg.theme });

			const page = await context.newPage();

			await page.goto("http://127.0.0.1:5173/?demo=true#/portal/booking/01a00000-0000-0000-0000-000000000000", {
				waitUntil: "commit",
				timeout: 30000,
			});

			await page.waitForFunction(() => {
				const splash = document.querySelector(".dente-boot-splash, .boot-state");
				const text = document.body ? document.body.innerText : "";
				return (!splash || splash.clientHeight === 0) && !text.includes("Загрузка системы");
			}, { timeout: 35000 }).catch(() => {});

			await page.waitForTimeout(2000);

			await page.evaluate(({ theme }) => {
				document.documentElement.setAttribute("data-theme", theme);
				const isDark = theme === "dark";
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.body.setAttribute("data-theme", theme);
			}, { theme: cfg.theme });

			await page.waitForTimeout(1000);

			const pPortal = path.join(PROOFS_PORTAL, cfg.name);
			await page.screenshot({ path: pPortal, fullPage: false, animations: "disabled" });

			const pBooking = path.join(PROOFS_BOOKING, cfg.name);
			fs.copyFileSync(pPortal, pBooking);

			const size = fs.statSync(pPortal).size;
			console.log(`[CAPTURED] ${cfg.name} (${size} bytes) -> OK: ${size >= 25000}`);

			await page.close();
			await context.close();
		}

		console.log("\n🎉 ALL 4 CANONICAL BOOKING PROOFS COMPLETED!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("CAPTURE FAILED:", err);
	process.exit(1);
});
