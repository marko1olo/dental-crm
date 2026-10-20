import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/1e3c39bb-24e7-47ee-ab41-d665a545c6c6";
if (!existsSync(BRAIN_DIR)) {
	mkdirSync(BRAIN_DIR, { recursive: true });
}

const edgePaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = edgePaths.find((p) => existsSync(p));

async function capture() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{
			id: "pc_light",
			filename: "visit_cockpit_pc_light.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
		},
		{
			id: "pc_dark",
			filename: "visit_cockpit_pc_dark.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
		},
		{
			id: "mobile_light",
			filename: "visit_cockpit_mobile_light.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "light",
		},
		{
			id: "mobile_dark",
			filename: "visit_cockpit_mobile_dark.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "dark",
		},
	];

	for (const cfg of configs) {
		console.log(`\n--- Capturing ${cfg.id} (${cfg.width}x${cfg.height}, theme: ${cfg.theme}) ---`);
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		const page = await context.newPage();

		// Set initial localStorage items for theme & bypass onboarding
		await page.addInitScript(({ theme }) => {
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ theme, onboardingDismissed: true }));
			localStorage.setItem("dente_active_view", "visit");
			localStorage.setItem("dente_selected_patient_id", "pat-1");
		}, { theme: cfg.theme });

		await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(3000);

		// If on welcome/onboarding screen, click Demo or Login
		try {
			await page.evaluate(() => {
				const btns = Array.from(document.querySelectorAll("button"));
				const demoBtn = btns.find((b) => {
					const t = b.textContent?.trim() || "";
					return t.includes("Демо") || t.includes("Попробовать");
				});
				if (demoBtn) demoBtn.click();
			});
			await page.waitForTimeout(2000);
		} catch (_) {}

		// Switch to visit view if not already there
		await page.evaluate(() => {
			try {
				// Try switching via store if available
				const appStore = window.__denteAppStore || window.useAppStore;
				if (appStore && typeof appStore.getState === "function") {
					appStore.getState().setCurrentView("visit");
				}
				// Also try clicking visit nav tab
				const navButtons = Array.from(document.querySelectorAll("button, a, [role='tab']"));
				const visitTab = navButtons.find((el) => {
					const t = el.textContent?.trim() || "";
					return t === "Приём" || t === "Текущий прием" || t.includes("Приём");
				});
				if (visitTab && typeof visitTab.click === "function") {
					visitTab.click();
				}
			} catch (_) {}
		});
		await page.waitForTimeout(2000);

		// Apply theme to document
		await page.evaluate(({ theme }) => {
			document.documentElement.setAttribute("data-theme", theme);
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.body.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
				document.body.classList.remove("dark");
			}
		}, { theme: cfg.theme });
		await page.waitForTimeout(1000);

		const targetPath = path.join(BRAIN_DIR, cfg.filename);
		await page.screenshot({ path: targetPath, fullPage: false });
		const stats = statSync(targetPath);
		console.log(`Saved ${cfg.filename}: ${stats.size} bytes (>= 20480: ${stats.size >= 20480})`);

		await context.close();
	}

	await browser.close();
	console.log("\nALL 4 SCREENSHOTS COMPLETED!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
