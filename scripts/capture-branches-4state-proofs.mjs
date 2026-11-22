import { mkdirSync, statSync } from "node:fs";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/branches";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const configs = [
	{
		filename: "01_branches_header_pc_light_1440x900.png",
		desc: "PC Light 1440x900 (Clinic TopBar & Active Branch Badge)",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		filename: "02_branches_header_pc_dark_1440x900.png",
		desc: "PC Dark 1440x900 (Clinic TopBar & Active Branch Badge)",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		filename: "03_branches_header_mobile_light_390x844.png",
		desc: "Mobile Light 390x844 (Apple HIG TopBar & Branch Badge)",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		filename: "04_branches_header_mobile_dark_390x844.png",
		desc: "Mobile Dark 390x844 (Apple HIG TopBar & Branch Badge)",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

async function capture() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		for (const cfg of configs) {
			console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
			const context = await browser.newContext({
				viewport: cfg.viewport,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				deviceScaleFactor: cfg.isMobile ? 2 : 1,
				colorScheme: cfg.theme,
			});

			await context.addInitScript(({ theme }) => {
				try {
					localStorage.setItem("dente_demo_showcase", "true");
					localStorage.setItem("dente_demo_showcase_mode_v1", "true");
					localStorage.setItem("dente_active_role", "owner");
					localStorage.setItem("dente_active_user_id", "doc-1");
					localStorage.setItem(
						"dental-crm:active-user:v1",
						JSON.stringify({ id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner" }),
					);
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("dente_theme_mode", theme);
					localStorage.setItem("theme", theme);
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem(
						"dental-crm:onboarding:v1",
						JSON.stringify({ dismissed: true, step: "done", completed: true }),
					);
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
					localStorage.setItem(
						"dente-workspace-profile",
						JSON.stringify({
							state: {
								clinicName: "Сеть Клиник ДЕНТЕ Премиум",
								currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
								flags: { disableTour: true },
							},
						}),
					);

					const isDark = theme === "dark";
					document.documentElement.setAttribute("data-theme", theme);
					document.documentElement.classList.toggle("dark", isDark);
					document.documentElement.classList.toggle("light", !isDark);
					document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				} catch (_) {}
			}, { theme: cfg.theme });

			const page = await context.newPage();
			await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
			await page.waitForSelector(".topbar, header", { state: "visible", timeout: 20000 });
			await sleep(1500);

			// Применяем тему и убираем оверлеи
			await page.evaluate((theme) => {
				const isDark = theme === "dark";
				document.documentElement.setAttribute("data-theme", theme);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.body.className = isDark ? "dark" : "light";
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			}, cfg.theme);
			await sleep(500);

			const outPath = `${OUT_DIR}/${cfg.filename}`;
			await page.screenshot({ path: outPath, fullPage: false });
			const size = statSync(outPath).size;
			console.log(`Saved ${outPath} (${size} bytes)`);

			await context.close();
		}
		console.log("\n✅ All 4 states captured with full UI shell!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
